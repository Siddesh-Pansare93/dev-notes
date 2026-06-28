# Chapter 21 — Production Node.js: Background Jobs, WebSockets, Email, and Monitoring

> Revision notes for experienced JS developers. These are the patterns that separate hobby projects from production systems that handle real load, real failures, and real users at 3am.

---

## 🗺️ The Big Picture

Every non-trivial production app eventually needs four things beyond basic CRUD:

1. **Jobs that run outside the HTTP request cycle** — email sending, PDF generation, image resizing
2. **Real-time bidirectional communication** — live dashboards, chat, collaborative editing
3. **Reliable email delivery** — not `console.log("sent email")` in dev and a prayer in prod
4. **Visibility into what the system is actually doing** — logs, metrics, error tracking, health checks

These aren't nice-to-haves. A system without them will fall over and you won't know why until a user reports it.

---

## 🔥 PART 1 — Background Job Queues with BullMQ

### Why Queues Exist (The Real Reason)

The naive approach: user clicks "Send Invoice" → your route handler calls `sendEmail()` → HTTP response blocked for 800ms → if SMTP server is down, user gets 500 → invoice never sent.

The queue approach: user clicks "Send Invoice" → job pushed to queue → HTTP responds in 5ms → worker picks up job → retries on failure → user gets email.

```
Without queue:
HTTP Request ──► Route Handler ──► sendEmail() ──► Response
                                        │
                                   [blocks 800ms]
                                   [fails if SMTP down]
                                   [no retry]

With queue:
HTTP Request ──► Route Handler ──► enqueue(job) ──► Response (5ms)
                                                          │
                Worker (separate process) ◄──── Redis ◄──┘
                        │
                   sendEmail()
                        │
                   [retry on fail]
                   [exponential backoff]
                   [dead letter queue]
```

**Here's the trap most devs fall into:** Using `setTimeout` or `setInterval` in Node.js as a "job queue." This loses all jobs on restart, can't scale across processes, has no retry, no monitoring, and no persistence. It's not a queue — it's a memory leak with a timer.

### BullMQ Setup

BullMQ needs Redis. Redis is the persistence layer — jobs survive process restarts.

```bash
npm install bullmq ioredis
```

```typescript
// lib/redis.ts
import { Redis } from 'ioredis'

// BullMQ needs a dedicated Redis connection — do NOT share with your cache/session Redis
// because BullMQ uses blocking commands that mess with connection pooling
export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null, // REQUIRED by BullMQ — it manages retries itself
  enableReadyCheck: false,    // REQUIRED by BullMQ
})
```

```typescript
// queues/email.queue.ts
import { Queue } from 'bullmq'
import { redisConnection } from '../lib/redis'

export interface EmailJobData {
  to: string
  subject: string
  templateId: string
  variables: Record<string, string>
  userId?: string
}

export const emailQueue = new Queue<EmailJobData>('email', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,        // First retry after 2s, then 4s, then 8s
    },
    removeOnComplete: {
      age: 24 * 3600,     // Keep completed jobs for 24h (for auditing)
      count: 1000,        // But cap at 1000 jobs to avoid memory blow-up
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days — you need to investigate
    },
  },
})
```

**Here's the trap most devs fall into:** Setting `removeOnComplete: true` (remove immediately). You lose your audit trail. Set it to a time/count limit instead so you can inspect what ran.

### Job Processors — Workers

The Worker is a separate process (or at minimum, a separate module) that consumes jobs. In production, workers run in separate Node processes — they can crash independently of your HTTP server.

```typescript
// workers/email.worker.ts
import { Worker, Job } from 'bullmq'
import { redisConnection } from '../lib/redis'
import { EmailJobData } from '../queues/email.queue'
import { sendTransactionalEmail } from '../lib/email'
import { logger } from '../lib/logger'

const emailWorker = new Worker<EmailJobData>(
  'email',
  async (job: Job<EmailJobData>) => {
    const childLogger = logger.child({
      jobId: job.id,
      jobName: job.name,
      userId: job.data.userId,
    })

    childLogger.info({ to: job.data.to }, 'Processing email job')

    await job.updateProgress(10) // Useful for long jobs with UI progress bars

    const result = await sendTransactionalEmail({
      to: job.data.to,
      subject: job.data.subject,
      templateId: job.data.templateId,
      variables: job.data.variables,
    })

    await job.updateProgress(100)
    childLogger.info({ messageId: result.messageId }, 'Email sent successfully')

    return { messageId: result.messageId, sentAt: new Date().toISOString() }
  },
  {
    connection: redisConnection,
    concurrency: 5,          // Process 5 emails in parallel per worker instance
    limiter: {
      max: 100,              // Max 100 jobs per...
      duration: 60_000,      // ...60 seconds (rate limiting)
    },
  }
)

// Event listeners for monitoring
emailWorker.on('completed', (job, result) => {
  logger.info({ jobId: job.id, result }, 'Email job completed')
})

emailWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error: error.message, stack: error.stack }, 'Email job failed')
  // After max attempts, job goes to failed state — alert here
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    // Send to dead letter queue, alert on-call, etc.
    alertOncall(`Email job ${job.id} permanently failed: ${error.message}`)
  }
})

emailWorker.on('stalled', (jobId) => {
  // Worker crashed mid-job — BullMQ detects stalled jobs and re-queues them
  logger.warn({ jobId }, 'Email job stalled — worker likely crashed')
})

// Graceful shutdown — CRITICAL for Kubernetes/Docker
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — gracefully closing email worker')
  await emailWorker.close()  // Finishes current jobs, stops accepting new ones
  process.exit(0)
})
```

### Enqueuing Jobs from Your API

```typescript
// routes/invoices.ts
import { emailQueue } from '../queues/email.queue'
import { Router } from 'express'

const router = Router()

router.post('/invoices/:id/send', async (req, res) => {
  const invoice = await db.invoice.findUnique({ where: { id: req.params.id } })
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

  // Enqueue — do NOT await the email sending itself
  const job = await emailQueue.add(
    'send-invoice',
    {
      to: invoice.recipientEmail,
      subject: `Invoice #${invoice.number}`,
      templateId: 'invoice',
      variables: { invoiceNumber: invoice.number, amount: invoice.amount },
      userId: req.user.id,
    },
    {
      // Job-level overrides
      priority: 1,            // Lower number = higher priority
      delay: 0,               // Send immediately
      jobId: `invoice-${invoice.id}`, // Idempotency — prevents duplicate jobs
    }
  )

  res.json({ success: true, jobId: job.id })
})
```

**Idempotency tip:** Setting `jobId` to a deterministic value prevents duplicate jobs if your API endpoint is called twice (e.g., user double-clicks). BullMQ will reject duplicate job IDs.

### Delayed Jobs and Recurring Jobs

```typescript
// Send a re-engagement email 24 hours after signup
await emailQueue.add(
  'onboarding-day1',
  { to: user.email, templateId: 'onboarding-d1', variables: { name: user.name } },
  { delay: 24 * 60 * 60 * 1000 } // 24h in ms
)

// Recurring jobs with cron syntax — runs at 9am every Monday
import { QueueScheduler } from 'bullmq' // Needed for delayed/recurring jobs

const weeklyReportQueue = new Queue('reports', { connection: redisConnection })

await weeklyReportQueue.add(
  'weekly-summary',
  { reportType: 'weekly' },
  {
    repeat: {
      cron: '0 9 * * 1', // 9am every Monday
      tz: 'America/New_York',
    },
  }
)
```

**Here's the trap most devs fall into:** Forgetting `QueueScheduler`. Without it, delayed and repeatable jobs won't fire. `QueueScheduler` is the background process that polls Redis for due jobs and moves them to the active queue.

```typescript
// Start this alongside your worker
import { QueueScheduler } from 'bullmq'

const emailScheduler = new QueueScheduler('email', { connection: redisConnection })
```

### BullMQ Dashboard (Bull Board)

```typescript
// admin/bull-board.ts
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { emailQueue } from '../queues/email.queue'
import { reportsQueue } from '../queues/reports.queue'

export function setupBullBoard(app: Express) {
  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath('/admin/queues')

  createBullBoard({
    queues: [
      new BullMQAdapter(emailQueue),
      new BullMQAdapter(reportsQueue),
    ],
    serverAdapter,
  })

  // Protect with auth middleware — this shows all job data including email addresses
  app.use('/admin/queues', requireAdminAuth, serverAdapter.getRouter())
}
```

### Job Type Comparison

| Job Type | Use Case | Key Options |
|---|---|---|
| Immediate | Send email after signup | `delay: 0`, `attempts: 3` |
| Delayed | Onboarding drip sequence | `delay: 86400000` |
| Recurring | Daily reports, cleanup | `repeat: { cron: '...' }` |
| Rate-limited | External API sync | `limiter: { max: 10, duration: 1000 }` |
| High-priority | Password reset email | `priority: 1` |
| Idempotent | Exactly-once processing | `jobId: 'deterministic-id'` |

---

## 🔥 PART 2 — Real-Time with WebSockets (Socket.io)

### Setup with Express — Share the HTTP Server

This is the part most tutorials get wrong. Socket.io attaches to the HTTP server, not Express. You need to share the same HTTP server instance.

```typescript
// server.ts
import express from 'express'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'

const app = express()
const httpServer = createServer(app)  // Wrap Express in HTTP server

const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'], // Websocket first, fallback to long-polling
  pingTimeout: 60000,    // How long to wait before considering client disconnected
  pingInterval: 25000,   // How often to send ping to keep connection alive
})

// Start the HTTP server — NOT app.listen()
httpServer.listen(3000, () => {
  console.log('Server running on port 3000')
})

export { io }
```

**Here's the trap most devs fall into:** Calling `app.listen()` instead of `httpServer.listen()`. `app.listen()` creates a NEW HTTP server internally, separate from your Socket.io server. WebSocket connections will fail or use polling only.

### Authentication Middleware

Never trust `socket.handshake.query.userId`. Verify a JWT.

```typescript
// middleware/socket-auth.ts
import { Socket } from 'socket.io'
import { verify } from 'jsonwebtoken'
import { db } from '../lib/db'

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
) {
  try {
    // Token can come from:
    // 1. Query param: socket.connect({ query: { token: '...' } })
    // 2. Auth handshake: socket.connect({ auth: { token: '...' } })  <-- preferred
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token as string

    if (!token) {
      return next(new Error('Authentication token missing'))
    }

    const payload = verify(token, process.env.JWT_SECRET!) as { userId: string }

    // Attach user to socket for use in event handlers
    socket.data.userId = payload.userId
    socket.data.user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, role: true },
    })

    next()
  } catch (err) {
    next(new Error('Invalid or expired token'))
  }
}

// Apply globally
io.use(socketAuthMiddleware)
```

### Namespaces and Rooms

```
Namespace = channel by feature domain (/chat, /notifications, /dashboard)
Room      = sub-channel within a namespace (roomId, userId, orgId)

io (default namespace /)
├── /chat namespace
│   ├── room: "general"
│   ├── room: "team-42"
│   └── room: "user-123"    ← private messages
└── /dashboard namespace
    ├── room: "org-1"
    └── room: "org-2"
```

```typescript
// namespaces/chat.ts
import { io } from '../server'

const chatNs = io.of('/chat')
chatNs.use(socketAuthMiddleware)

chatNs.on('connection', (socket) => {
  const userId = socket.data.userId

  socket.on('join-room', async (roomId: string) => {
    // Authorization check — can this user join this room?
    const membership = await db.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
    })
    if (!membership) {
      socket.emit('error', { message: 'Not authorized to join room' })
      return
    }

    await socket.join(roomId)
    socket.to(roomId).emit('user-joined', { userId, name: socket.data.user.name })
  })

  socket.on('send-message', async (data: { roomId: string; content: string }) => {
    // Save to DB first — then emit. Never emit without persisting.
    const message = await db.message.create({
      data: {
        content: data.content,
        roomId: data.roomId,
        authorId: userId,
      },
      include: { author: { select: { id: true, name: true } } },
    })

    // Emit to everyone in room INCLUDING sender
    chatNs.to(data.roomId).emit('new-message', message)
  })

  socket.on('disconnect', (reason) => {
    logger.info({ userId, reason }, 'Socket disconnected')
    // reason: 'transport close' | 'server namespace disconnect' | 'ping timeout'
  })
})
```

### Scaling Horizontally — Redis Adapter

One Node process can handle ~10k concurrent WebSocket connections. For more, you scale to multiple processes. The problem: if user A is on process 1 and user B is on process 2, `io.to(roomId).emit()` on process 1 only reaches sockets on process 1.

The Redis adapter syncs broadcasts across all processes via Redis pub/sub.

```typescript
// server.ts
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

const pubClient = createClient({ url: process.env.REDIS_URL })
const subClient = pubClient.duplicate() // Redis pub/sub needs two connections

await Promise.all([pubClient.connect(), subClient.connect()])

io.adapter(createAdapter(pubClient, subClient))

// Now io.to(roomId).emit() works across ALL Node processes
```

```
Process 1 (port 3000)              Process 2 (port 3001)
    Socket A (room "general")           Socket B (room "general")
         │                                    │
         └────────────────┬───────────────────┘
                          │
                     Redis Pub/Sub
                          │
                  io.to("general").emit()
                  → publishes to Redis
                  → all processes receive
                  → each emits to its own sockets in the room
```

**Here's the trap most devs fall into:** Running multiple Node processes behind a load balancer without sticky sessions AND without the Redis adapter. Without sticky sessions, the WebSocket upgrade handshake fails because HTTP and WebSocket requests land on different processes. Either use sticky sessions OR the Redis adapter (sticky sessions + Redis adapter = belt and suspenders).

### Common Real-Time Patterns

**Live Dashboard Updates:**
```typescript
// Server: push updates when data changes
async function updateDashboardMetrics(orgId: string) {
  const metrics = await computeMetrics(orgId)
  io.of('/dashboard').to(`org-${orgId}`).emit('metrics-update', metrics)
}

// Client
const socket = io('/dashboard', { auth: { token: getJwt() } })
socket.emit('subscribe', { orgId: currentOrg.id })
socket.on('metrics-update', (metrics) => updateCharts(metrics))
```

**Presence (who's online):**
```typescript
// Use Redis Set to track online users — survives process restart
socket.on('connection', async () => {
  await redis.sadd(`online:org:${socket.data.user.orgId}`, socket.data.userId)
  io.to(`org-${socket.data.user.orgId}`).emit('user-online', socket.data.userId)
})

socket.on('disconnect', async () => {
  await redis.srem(`online:org:${socket.data.user.orgId}`, socket.data.userId)
  io.to(`org-${socket.data.user.orgId}`).emit('user-offline', socket.data.userId)
})
```

### Emit Method Comparison

| Method | Who receives it |
|---|---|
| `socket.emit(...)` | Only this socket (current client) |
| `socket.to(room).emit(...)` | All in room EXCEPT sender |
| `io.to(room).emit(...)` | All in room INCLUDING sender |
| `socket.broadcast.emit(...)` | All connected sockets EXCEPT sender |
| `io.emit(...)` | ALL connected sockets (use with caution) |
| `io.of('/ns').to(room).emit(...)` | All in room in that namespace |

---

## 🔥 PART 3 — Email

### SMTP vs. API-Based Sending

| Approach | Pros | Cons | Use when |
|---|---|---|---|
| SMTP (Nodemailer) | Works with any SMTP server | No delivery tracking, harder to scale, Gmail has limits | Dev/testing, low-volume internal tools |
| SendGrid/Mailgun API | Delivery tracking, webhooks, reputation management, templates | External dependency | All production apps |
| Resend (resend.com) | React Email native, clean API, great DX | Newer, smaller ecosystem | New projects, especially with React Email |

### Nodemailer (Dev or Self-Hosted SMTP)

```typescript
// lib/email/nodemailer.ts
import nodemailer from 'nodemailer'

// For dev — use Mailpit or Ethereal.email (fake SMTP that captures emails)
export const devTransport = nodemailer.createTransport({
  host: 'localhost',
  port: 1025, // Mailpit default
  secure: false,
  ignoreTLS: true,
})

// For production SMTP
export const prodTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // Use STARTTLS (port 587), not SSL (port 465)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,          // Connection pool — reuse connections for throughput
  maxConnections: 5,   // Up to 5 simultaneous SMTP connections
  maxMessages: 100,    // Reconnect after 100 messages (SMTP server limits)
})

export const transport = process.env.NODE_ENV === 'production' ? prodTransport : devTransport
```

### Resend (Preferred for New Projects)

```typescript
// lib/email/resend.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendTransactionalEmail(opts: {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}) {
  const { data, error } = await resend.emails.send({
    from: opts.from || `no-reply@${process.env.EMAIL_DOMAIN}`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    reply_to: opts.replyTo,
    tags: opts.tags,
  })

  if (error) {
    throw new Error(`Resend API error: ${error.message}`)
  }

  return data
}
```

### Email Templates with React Email

React Email lets you write email templates as React components and renders them to HTML. The killer feature: type-safe templates, component reuse, and you can preview them in the browser.

```bash
npm install @react-email/components @react-email/render react
```

```tsx
// emails/templates/invoice.tsx
import {
  Html, Head, Body, Container, Section,
  Text, Button, Hr, Img, Tailwind
} from '@react-email/components'

interface InvoiceEmailProps {
  recipientName: string
  invoiceNumber: string
  amount: string
  dueDate: string
  paymentUrl: string
  companyLogo: string
}

export function InvoiceEmail({
  recipientName,
  invoiceNumber,
  amount,
  dueDate,
  paymentUrl,
  companyLogo,
}: InvoiceEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto my-8 max-w-xl bg-white rounded-lg p-8">
            <Img src={companyLogo} alt="Company" width={120} />
            <Hr className="my-6" />
            <Text className="text-xl font-semibold text-gray-900">
              Invoice #{invoiceNumber}
            </Text>
            <Text className="text-gray-600">Hi {recipientName},</Text>
            <Text className="text-gray-600">
              Your invoice for <strong>{amount}</strong> is due on {dueDate}.
            </Text>
            <Section className="my-6 text-center">
              <Button
                href={paymentUrl}
                className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium"
              >
                Pay Invoice
              </Button>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
```

```typescript
// lib/email/render.ts
import { render } from '@react-email/render'
import { InvoiceEmail } from '../../emails/templates/invoice'

export async function renderInvoiceEmail(props: InvoiceEmailProps): Promise<string> {
  return render(<InvoiceEmail {...props} />, {
    pretty: process.env.NODE_ENV === 'development', // Pretty HTML in dev for debugging
  })
}
```

```typescript
// workers/email.worker.ts — putting it all together
async function processEmailJob(job: Job<EmailJobData>) {
  let html: string

  switch (job.data.templateId) {
    case 'invoice':
      html = await renderInvoiceEmail(job.data.variables as InvoiceEmailProps)
      break
    case 'welcome':
      html = await renderWelcomeEmail(job.data.variables as WelcomeEmailProps)
      break
    default:
      throw new Error(`Unknown template: ${job.data.templateId}`)
  }

  return sendTransactionalEmail({
    to: job.data.to,
    subject: job.data.subject,
    html,
  })
}
```

**Here's the trap most devs fall into:** Sending email synchronously inside a request handler. Even with a fast API like Resend (50-200ms), you're adding latency to every request, and any network hiccup causes a 500 that fails the whole operation. Always use a queue.

### Email Queue Full Flow

```
API Route
  │
  ├── Validate request
  ├── Save to DB (idempotency)
  └── emailQueue.add(job) ──► Redis
                                  │
              Worker (separate process)
                  │
                  ├── render React Email → HTML
                  ├── call Resend/SendGrid API
                  ├── on success: update DB record, log
                  └── on failure: retry with backoff
                              ↓ (after max retries)
                         Dead letter queue → alert
```

---

## 🔥 PART 4 — Monitoring and Logging

### Structured Logging with Pino

Pino is the fastest Node.js logger. It outputs JSON by default, which is what log aggregators (Datadog, CloudWatch, Loki) expect.

```typescript
// lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // In dev: pretty-print for humans. In prod: raw JSON for machines.
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
  // Redact sensitive fields — they never appear in logs
  redact: {
    paths: ['*.password', '*.token', '*.creditCard', 'req.headers.authorization'],
    censor: '[REDACTED]',
  },
  base: {
    env: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
  },
})
```

**Why Pino over Winston?** Pino is 5-10x faster because it uses worker threads to serialize JSON — log serialization is offloaded and doesn't block the event loop. Winston blocks. In high-traffic apps, slow logging is a real bottleneck.

### Request Logging with pino-http

```typescript
// middleware/request-logger.ts
import pinoHttp from 'pino-http'
import { logger } from '../lib/logger'
import { v4 as uuid } from 'uuid'

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] as string || uuid(),
  // Customize what gets logged
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id,   // Attach user context
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  // Don't log health check endpoints — they're noisy
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/metrics',
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error'
    if (res.statusCode >= 400) return 'warn'
    return 'info'
  },
})
```

### Child Loggers for Context

```typescript
// Always use child loggers — they attach context without repeating yourself
async function processOrder(orderId: string, userId: string) {
  const log = logger.child({ orderId, userId, operation: 'processOrder' })

  log.info('Starting order processing')

  try {
    const order = await db.order.findUnique({ where: { id: orderId } })
    log.info({ itemCount: order.items.length }, 'Order fetched')

    await chargeCard(order)
    log.info({ amount: order.total }, 'Payment processed')

    await fulfillOrder(order)
    log.info('Order fulfilled')
  } catch (err) {
    log.error({ err }, 'Order processing failed')
    throw err
  }
}

// Output (JSON in prod):
// {"level":30,"orderId":"ord_123","userId":"usr_456","operation":"processOrder","msg":"Starting order processing"}
// {"level":30,"orderId":"ord_123","userId":"usr_456","operation":"processOrder","itemCount":3,"msg":"Order fetched"}
```

### Prometheus Metrics with prom-client

Prometheus scrapes your `/metrics` endpoint on a schedule. Grafana dashboards query Prometheus. This is the standard observability stack.

```typescript
// lib/metrics.ts
import promClient from 'prom-client'

// Collect default Node.js metrics: heap, GC, event loop lag, etc.
promClient.collectDefaultMetrics({ prefix: 'myapp_' })

// HTTP request duration histogram — the most important metric
export const httpRequestDuration = new promClient.Histogram({
  name: 'myapp_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  // Bucket boundaries: <50ms, <100ms, <250ms, <500ms, <1s, <2.5s, >2.5s
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5],
})

// Active WebSocket connections
export const activeWebSockets = new promClient.Gauge({
  name: 'myapp_websocket_active_connections',
  help: 'Number of active WebSocket connections',
  labelNames: ['namespace'],
})

// Business metrics — not just infrastructure
export const emailsSent = new promClient.Counter({
  name: 'myapp_emails_sent_total',
  help: 'Total emails sent',
  labelNames: ['template', 'status'], // status: 'success' | 'failed'
})

export const jobQueueSize = new promClient.Gauge({
  name: 'myapp_job_queue_size',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue_name'],
})

// Expose metrics endpoint
export function setupMetrics(app: Express) {
  app.get('/metrics', async (req, res) => {
    // Restrict to internal network only — don't expose to public
    if (!isInternalRequest(req)) {
      return res.status(403).end()
    }
    res.set('Content-Type', promClient.register.contentType)
    res.send(await promClient.register.metrics())
  })
}
```

```typescript
// middleware/prometheus.ts — HTTP instrumentation
export function prometheusMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on('finish', () => {
    // Normalize route: /users/123 → /users/:id
    // Without this, you get a separate metric series per user ID — cardinality explosion
    const route = req.route?.path || req.path.replace(/\/[0-9a-f-]{8,}/gi, '/:id')

    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      (Date.now() - start) / 1000
    )
  })

  next()
}
```

**Here's the trap most devs fall into:** High-cardinality labels. Never use `userId`, `requestId`, or any unbounded value as a Prometheus label. Each unique label combination is a separate time series. 100k users × 10 routes = 1M time series → Prometheus OOM crashes.

### Health Check Endpoint

A proper health check tells your load balancer, Kubernetes liveness/readiness probes, and uptime monitors what's actually healthy.

```typescript
// routes/health.ts
import { Router } from 'express'
import { db } from '../lib/db'
import { redisConnection } from '../lib/redis'
import { emailQueue } from '../queues/email.queue'

const router = Router()

router.get('/health', async (req, res) => {
  const startTime = Date.now()

  const checks = await Promise.allSettled([
    // DB check — actually query, don't just check connection
    db.$queryRaw`SELECT 1`.then(() => ({ status: 'ok', latencyMs: Date.now() - startTime })),

    // Redis check
    redisConnection.ping().then(() => ({ status: 'ok' })),

    // Queue check — is it responsive?
    emailQueue.getJobCounts('waiting', 'active', 'failed').then((counts) => ({
      status: counts.failed > 100 ? 'degraded' : 'ok',
      counts,
    })),
  ])

  const [dbResult, redisResult, queueResult] = checks

  const response = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || 'unknown',
    services: {
      database: dbResult.status === 'fulfilled' ? dbResult.value : { status: 'error', error: (dbResult.reason as Error).message },
      redis: redisResult.status === 'fulfilled' ? redisResult.value : { status: 'error', error: (redisResult.reason as Error).message },
      emailQueue: queueResult.status === 'fulfilled' ? queueResult.value : { status: 'error', error: (queueResult.reason as Error).message },
    },
  }

  const isHealthy = checks.every((c) => c.status === 'fulfilled')
  const hasDegraded = Object.values(response.services).some((s) => s.status === 'degraded')

  if (!isHealthy) {
    response.status = 'error'
    return res.status(503).json(response)
  }

  if (hasDegraded) {
    response.status = 'degraded'
    return res.status(200).json(response) // 200 so LB keeps routing traffic, but alerts fire
  }

  res.status(200).json(response)
})

// Liveness probe — is the process alive? (simpler than readiness)
router.get('/health/live', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export default router
```

**Liveness vs Readiness:**
- `/health/live` — Is the process alive? (Can it respond at all?) Kubernetes restarts the pod if this fails.
- `/health/ready` — Is it ready to receive traffic? (DB connected, cache warm?) Kubernetes stops routing traffic if this fails but doesn't restart.

### Error Tracking with Sentry

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  integrations: [
    nodeProfilingIntegration(), // Performance profiling
  ],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod
  profilesSampleRate: 0.1,
})

// Setup in Express — MUST be first middleware
export function setupSentryRequestHandler(app: Express) {
  app.use(Sentry.Handlers.requestHandler())
  app.use(Sentry.Handlers.tracingHandler())
}

// MUST be after routes but before your error handler
export function setupSentryErrorHandler(app: Express) {
  app.use(Sentry.Handlers.errorHandler({
    shouldHandleError: (error) => {
      // Only capture 5xx errors — don't fill Sentry with 404s
      return !error.status || error.status >= 500
    },
  }))
}
```

```typescript
// Capturing errors with context
try {
  await processPayment(order)
} catch (err) {
  Sentry.withScope((scope) => {
    scope.setUser({ id: userId, email: userEmail })
    scope.setTag('orderId', orderId)
    scope.setContext('order', {
      amount: order.total,
      itemCount: order.items.length,
      currency: order.currency,
    })
    scope.setLevel('error')
    Sentry.captureException(err)
  })
  throw err // Re-throw after capturing
}
```

```typescript
// In BullMQ workers — capture failed job context
emailWorker.on('failed', (job, error) => {
  Sentry.withScope((scope) => {
    scope.setTag('queue', 'email')
    scope.setTag('jobId', job?.id || 'unknown')
    scope.setContext('job', {
      name: job?.name,
      data: job?.data,
      attemptsMade: job?.attemptsMade,
    })
    Sentry.captureException(error)
  })
})
```

**Source Maps:** In production you build TypeScript → JavaScript. Stack traces point to compiled JS lines, not your TS source. Fix:

```typescript
// sentry.init({ ...
  integrations: [
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
})

// Build: upload source maps to Sentry after deployment
// npx @sentry/cli releases files <version> upload-sourcemaps ./dist
```

### Full Observability Stack

```
Your Node.js App
      │
      ├── /metrics ──────────────► Prometheus ──► Grafana dashboards
      │                                               (latency p99, error rate, queue depth)
      │
      ├── stdout (JSON logs) ─────► Loki / CloudWatch / Datadog Logs
      │                               (search by userId, orderId, request-id)
      │
      ├── Sentry SDK ─────────────► Sentry.io
      │                               (error tracking, performance, source maps)
      │
      └── /health ────────────────► Uptime monitors + K8s probes
                                    (PagerDuty alert if 503)
```

### Key Metrics to Alert On

| Metric | Alert Threshold | Why |
|---|---|---|
| `http_request_duration_seconds{p99}` | > 1s | Latency regression |
| `http_requests_total{status_code=~"5.."}` | > 1% of traffic | Error rate spike |
| `job_queue_size{queue="email"}` | > 500 | Queue backup — workers down? |
| `job_failed_total` | Any non-zero | Jobs permanently failing |
| `websocket_active_connections` | > 8000 per pod | Approaching connection limit |
| `nodejs_heap_used_bytes` | > 80% of limit | Memory leak growing |
| `nodejs_event_loop_delay_seconds{p99}` | > 100ms | Event loop blocked |

---

## 🔥 Putting It All Together — Production Startup

```typescript
// server.ts — production-grade startup sequence
import 'express-async-errors' // Make async errors propagate to Express error handler
import { logger } from './lib/logger'
import { db } from './lib/db'
import { redisConnection } from './lib/redis'

async function start() {
  // 1. Verify external dependencies before accepting traffic
  try {
    await db.$connect()
    logger.info('Database connected')

    await redisConnection.ping()
    logger.info('Redis connected')
  } catch (err) {
    logger.fatal({ err }, 'Failed to connect to dependencies — exiting')
    process.exit(1)
  }

  // 2. Setup Express, Socket.io, middleware
  const { app, httpServer, io } = createApp()
  setupBullBoard(app)
  setupMetrics(app)

  // 3. Start workers in same process (for small apps) or separate processes
  const { emailWorker } = await startWorkers()

  // 4. Start HTTP server
  const port = parseInt(process.env.PORT || '3000')
  httpServer.listen(port, () => {
    logger.info({ port }, 'HTTP server started')
  })

  // 5. Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully')

    // Stop accepting new connections
    httpServer.close()

    // Finish in-flight jobs
    await emailWorker.close()

    // Close DB and Redis
    await db.$disconnect()
    await redisConnection.quit()

    logger.info('Shutdown complete')
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

start().catch((err) => {
  console.error('Failed to start:', err)
  process.exit(1)
})
```

---

## 🔥 Interview-Ready Summary

**Q: Why use BullMQ over a simple `setTimeout` approach?**
Persistence (jobs survive restarts), retry with backoff, rate limiting, priority, monitoring, distributed processing across multiple workers, and dead letter queuing. `setTimeout` is none of those things.

**Q: How do you scale Socket.io beyond one process?**
Redis adapter (`@socket.io/redis-adapter`) for broadcast sync + sticky sessions or a load balancer that routes WebSocket connections by `sessionId`. The adapter uses Redis pub/sub to fan out events across all Node processes.

**Q: Why is high-cardinality a problem in Prometheus?**
Each unique label combination creates a time series. Unbounded labels (userId, requestId) create millions of time series → memory exhaustion → Prometheus crashes. Always normalize labels (route → path template, not actual path with IDs).

**Q: Pino vs Winston vs Morgan?**
Pino for structured JSON logging (fastest, async). Morgan for basic request logging (deprecated pattern — use pino-http). Winston for legacy projects — slower, but supports more transports out of the box.

**Q: What's the difference between Sentry `captureException` and letting the Sentry error handler catch it?**
`captureException` lets you attach custom context (scope, tags, user) before capturing. The error handler captures automatically but with less context. Use `captureException` when you can catch and re-throw, use the error handler as a safety net for everything else.
