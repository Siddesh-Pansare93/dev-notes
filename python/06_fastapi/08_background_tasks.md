# 08 - Background Tasks and Task Queues

## Overview

In Node.js, you might use `setTimeout`, `setImmediate`, or Bull/BullMQ for background work. FastAPI has a built-in `BackgroundTasks` system for simple cases, and you can use Celery for heavy-duty task processing.

### Comparison

| Use Case | Node.js | FastAPI |
|---|---|---|
| Simple fire-and-forget | `setTimeout(() => {...}, 0)` or `setImmediate` | `BackgroundTasks` |
| Job queues | Bull / BullMQ / Agenda | Celery / arq / dramatiq |
| Scheduled tasks | node-cron / Agenda | Celery Beat / APScheduler |
| Worker processes | Separate Node process | Celery workers |

---

## FastAPI BackgroundTasks

### The Simplest Case

```python
from fastapi import FastAPI, BackgroundTasks

app = FastAPI()

def send_email(email: str, subject: str, body: str):
    """This runs in the background after the response is sent."""
    # Simulate slow email sending
    import time
    time.sleep(5)
    print(f"Email sent to {email}: {subject}")

@app.post("/register")
def register_user(
    email: str,
    background_tasks: BackgroundTasks,  # FastAPI injects this
):
    # Create user immediately
    user = {"email": email, "id": 1}

    # Schedule email to be sent AFTER the response
    background_tasks.add_task(send_email, email, "Welcome!", "Thanks for signing up")

    # Response is sent immediately -- doesn't wait for email
    return {"message": "User registered", "user": user}
```

### Node.js Equivalent

```javascript
app.post('/register', async (req, res) => {
  const user = await createUser(req.body.email);

  // Fire and forget -- don't await
  sendEmail(req.body.email, 'Welcome!', 'Thanks for signing up')
    .catch(err => console.error('Email failed:', err));

  res.json({ message: 'User registered', user });
});
```

The key difference: FastAPI's `BackgroundTasks` is more structured and guaranteed to run after the response is sent, whereas the Node.js approach just starts a Promise that runs concurrently.

---

## Multiple Background Tasks

```python
@app.post("/orders")
def create_order(
    order_data: OrderCreate,
    background_tasks: BackgroundTasks,
):
    order = save_order(order_data)

    # Queue multiple tasks -- they run in order
    background_tasks.add_task(send_order_confirmation, order.id, order.email)
    background_tasks.add_task(update_inventory, order.items)
    background_tasks.add_task(notify_warehouse, order.id)
    background_tasks.add_task(track_analytics, "order_created", order.id)

    return {"order_id": order.id, "status": "created"}
```

### Background Tasks with Dependencies

Background tasks work seamlessly with FastAPI's dependency injection:

```python
def write_audit_log(message: str, user_id: int):
    with open("audit.log", "a") as f:
        f.write(f"[{datetime.now()}] User {user_id}: {message}\n")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    # ... verify token, return user
    return user

@app.delete("/posts/{post_id}")
def delete_post(
    post_id: int,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404)

    db.delete(post)
    db.commit()

    # Background task runs after response, using data from the request
    background_tasks.add_task(
        write_audit_log,
        f"Deleted post {post_id}: {post.title}",
        current_user["id"],
    )

    return {"message": "Post deleted"}
```

### Background Tasks in Dependencies

You can also add background tasks from within dependencies:

```python
def audit_dependency(
    background_tasks: BackgroundTasks,
    request: Request,
):
    """Dependency that automatically logs all requests."""
    background_tasks.add_task(
        log_request,
        method=request.method,
        path=request.url.path,
        timestamp=datetime.now(),
    )

@app.get("/users", dependencies=[Depends(audit_dependency)])
def list_users():
    return []
```

---

## When BackgroundTasks Is NOT Enough

`BackgroundTasks` has limitations:
1. Tasks run in the same process as the web server
2. If the server crashes, pending tasks are lost
3. No retry logic
4. No task monitoring or status tracking
5. No distributed execution across multiple workers
6. Not suitable for CPU-intensive tasks

### Decision Guide

| Scenario | Solution |
|---|---|
| Send a welcome email after registration | BackgroundTasks |
| Write an audit log entry | BackgroundTasks |
| Process a 2GB video file | Celery |
| Generate a complex report | Celery |
| Retry failed API calls with backoff | Celery |
| Schedule daily data cleanup | Celery Beat |
| Train an ML model | Celery |
| Send a notification | BackgroundTasks |
| Resize an uploaded image | Depends on size -- BackgroundTasks for small, Celery for large |

---

## Celery: Production Task Queue

Celery is the standard Python task queue. Think of it as BullMQ for Python, but more mature and feature-rich.

### Architecture

```
FastAPI App  -->  Redis/RabbitMQ (Broker)  -->  Celery Workers
    |                                              |
    |  (Enqueue task)                              |  (Execute task)
    |                                              |
    v                                              v
  Response                                     Task Result
  (immediate)                                  (stored in backend)
```

Compare with BullMQ in Node.js:

```
Express App  -->  Redis (Queue)  -->  Bull Workers
```

### Setup

```bash
pip install celery[redis]  # Celery with Redis broker
# or
pip install celery[rabbitmq]  # Celery with RabbitMQ broker
```

### Celery Configuration

```python
# celery_app.py
from celery import Celery

celery_app = Celery(
    "worker",
    broker="redis://localhost:6379/0",     # Message broker (like Bull's Redis connection)
    backend="redis://localhost:6379/1",    # Result storage
)

# Configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    task_track_started=True,
    task_acks_late=True,       # Acknowledge after task completes (reliability)
    worker_prefetch_multiplier=1,
)
```

### Defining Tasks

```python
# tasks.py
from celery_app import celery_app
import time

@celery_app.task(bind=True, max_retries=3)
def send_email_task(self, to: str, subject: str, body: str):
    """
    Like a Bull job processor:
    queue.process(async (job) => { await sendEmail(job.data); });
    """
    try:
        # Simulate email sending
        time.sleep(2)
        print(f"Email sent to {to}: {subject}")
        return {"status": "sent", "to": to}
    except Exception as exc:
        # Retry with exponential backoff (like Bull's backoff option)
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)

@celery_app.task
def process_image(image_path: str, operations: list[str]):
    """Heavy image processing task."""
    time.sleep(10)  # Simulate processing
    return {"processed": image_path, "operations": operations}

@celery_app.task
def generate_report(report_type: str, params: dict):
    """Generate a complex report."""
    time.sleep(30)
    return {"report_url": f"/reports/{report_type}_123.pdf"}
```

### Using Celery Tasks in FastAPI

```python
# main.py
from fastapi import FastAPI
from tasks import send_email_task, process_image, generate_report

app = FastAPI()

@app.post("/register")
def register(email: str):
    user = create_user(email)

    # Enqueue the task (like queue.add('send-email', data) in Bull)
    task = send_email_task.delay(email, "Welcome!", "Thanks for signing up")

    return {
        "user_id": user.id,
        "email_task_id": task.id,  # Task ID for tracking
    }

@app.post("/images/process")
def process_uploaded_image(image_path: str):
    # Enqueue heavy processing
    task = process_image.delay(image_path, ["resize", "compress", "watermark"])

    return {
        "task_id": task.id,
        "status": "processing",
        "check_url": f"/tasks/{task.id}",
    }

@app.get("/tasks/{task_id}")
def get_task_status(task_id: str):
    """Check task status (like Bull's job.getState())."""
    from celery.result import AsyncResult
    result = AsyncResult(task_id)

    response = {
        "task_id": task_id,
        "status": result.status,  # PENDING, STARTED, SUCCESS, FAILURE, RETRY
    }

    if result.ready():
        response["result"] = result.result
    elif result.failed():
        response["error"] = str(result.result)

    return response
```

### Running Celery Workers

```bash
# Start a Celery worker (like starting a Bull worker process)
celery -A celery_app worker --loglevel=info

# Start multiple workers
celery -A celery_app worker --loglevel=info --concurrency=4

# Start with specific queues
celery -A celery_app worker -Q emails,reports --loglevel=info
```

### BullMQ Comparison

```javascript
// BullMQ (Node.js)
const emailQueue = new Queue('emails');

// Producer
await emailQueue.add('welcome-email', {
  to: 'user@example.com',
  subject: 'Welcome!',
});

// Consumer (separate process)
const worker = new Worker('emails', async (job) => {
  await sendEmail(job.data.to, job.data.subject);
}, { connection: redis });
```

```python
# Celery (Python) -- equivalent
# Producer (in FastAPI)
send_email_task.delay("user@example.com", "Welcome!")

# Consumer: just start the worker
# celery -A celery_app worker
```

---

## Task Scheduling with Celery Beat

Celery Beat is like node-cron but integrated with the task queue.

```python
# celery_app.py (add to configuration)
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    # Run every 30 minutes
    "cleanup-expired-tokens": {
        "task": "tasks.cleanup_expired_tokens",
        "schedule": 30.0 * 60,  # seconds
    },

    # Run daily at midnight
    "generate-daily-report": {
        "task": "tasks.generate_daily_report",
        "schedule": crontab(hour=0, minute=0),
    },

    # Run every Monday at 9am
    "send-weekly-digest": {
        "task": "tasks.send_weekly_digest",
        "schedule": crontab(hour=9, minute=0, day_of_week=1),
    },
}
```

```python
# tasks.py
@celery_app.task
def cleanup_expired_tokens():
    """Remove expired tokens from database."""
    count = delete_expired_tokens()
    return {"deleted": count}

@celery_app.task
def generate_daily_report():
    """Generate daily analytics report."""
    report = compile_analytics()
    return {"report_id": report.id}
```

```bash
# Start the scheduler (in addition to workers)
celery -A celery_app beat --loglevel=info

# Or combine worker + beat in one process (dev only)
celery -A celery_app worker --beat --loglevel=info
```

### Node.js Equivalent

```javascript
// node-cron
const cron = require('node-cron');

cron.schedule('0 0 * * *', async () => {
  await generateDailyReport();
});

// Or Agenda.js
agenda.define('daily report', async (job) => {
  await generateDailyReport();
});
await agenda.every('24 hours', 'daily report');
```

---

## Lightweight Alternative: arq

For simpler use cases, `arq` is a lightweight alternative to Celery (async-first, Redis-only).

```bash
pip install arq
```

```python
# tasks.py
import arq

async def send_email(ctx, to: str, subject: str):
    """Task function."""
    print(f"Sending email to {to}: {subject}")

class WorkerSettings:
    functions = [send_email]
    redis_settings = arq.connections.RedisSettings()

# In FastAPI
from arq import create_pool

@app.post("/register")
async def register(email: str):
    redis = await create_pool()
    await redis.enqueue_job("send_email", email, "Welcome!")
    return {"status": "registered"}
```

```bash
# Run worker
arq tasks.WorkerSettings
```

---

## Practice Exercises

### Exercise 1: Email Notification System
Build an API with BackgroundTasks that:
- `POST /users` -- creates a user and sends a welcome email in the background
- `POST /users/{id}/reset-password` -- triggers a background task to "send" a reset email
- Log all "sent" emails to a file instead of actually sending them
- Return immediately in all cases

### Exercise 2: File Processing Pipeline
Create an endpoint `POST /files/process` that:
- Accepts a file upload
- Saves the file immediately
- Adds background tasks to: calculate file hash, count lines (if text), get word count
- Returns the file ID immediately
- Create `GET /files/{id}/status` that shows processing results

### Exercise 3: Task Status Tracking
Implement a simple in-memory task tracking system:
- `POST /tasks` -- creates a long-running background task
- `GET /tasks/{task_id}` -- returns task status (pending/running/complete/failed)
- Use a shared dict to track task states
- Simulate tasks that take 5-10 seconds

### Exercise 4: Celery Setup (if Redis is available)
Set up a basic Celery worker with:
- A task that generates a "report" (creates a text file)
- A FastAPI endpoint that enqueues the task
- A status endpoint to check if the report is ready
- Retry logic for simulated failures

### Exercise 5: Scheduled Cleanup
Create a system that:
- Stores temporary data with expiration timestamps
- `POST /temp-data` -- stores data with a TTL
- `GET /temp-data/{key}` -- retrieves data if not expired
- Runs a background cleanup every 60 seconds that removes expired data
- Use either `BackgroundTasks` triggered periodically or Celery Beat
