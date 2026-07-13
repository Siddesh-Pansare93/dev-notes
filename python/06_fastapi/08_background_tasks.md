# 08 - Background Tasks and Task Queues

## Overview

Node.js mein tum `setTimeout`, `setImmediate`, ya Bull/BullMQ use karte ho background work ke liye. FastAPI bhi similar ek built-in `BackgroundTasks` system deta hai simple cases ke liye, aur agar heavy-duty kaam ho to Celery ka use kar sakte ho.

Socho Zomato order ka example — jab tum order dete ho, to response immediately aa jaata hai ("Order received!"), lekin background mein saath-saath confirmation email, SMS, warehouse notification sab chalta rehta hai. Yehi concept hai BackgroundTasks ka.

### Comparison

| Use Case | Node.js | FastAPI |
|---|---|---|
| Simple fire-and-forget | `setTimeout(() => {...}, 0)` or `setImmediate` | `BackgroundTasks` |
| Job queues | Bull / BullMQ / Agenda | Celery / arq / dramatiq |
| Scheduled tasks | node-cron / Agenda | Celery Beat / APScheduler |
| Worker processes | Separate Node process | Celery workers |

---

## FastAPI BackgroundTasks

### Sabse Simple Case

Kyun zaruri hai BackgroundTasks? Socho ek second ke liye — kisi user ko welcome email bhejne mein 5 seconds lag sakte hain. Agar tum us puri 5 seconds user ko wait karaoge, to user experience bekar hoega. Isliye hum response turant bhej dete hain aur email background mein bhejte hain.

```python
from fastapi import FastAPI, BackgroundTasks

app = FastAPI()

def send_email(email: str, subject: str, body: str):
    """Yeh function response bhej dene ke baad background mein chalega."""
    # Email send karne mein thoda time lagane ke liye simulate karte hain
    import time
    time.sleep(5)
    print(f"Email sent to {email}: {subject}")

@app.post("/register")
def register_user(
    email: str,
    background_tasks: BackgroundTasks,  # FastAPI automatically inject kar deta hai
):
    # User immediately create kar do
    user = {"email": email, "id": 1}

    # Email bhejne ka kaam schedule kar do -- response ke BAAD chalega
    background_tasks.add_task(send_email, email, "Welcome!", "Thanks for signing up")

    # Response turant chala gaya -- email ke baad ke wait nahin karega
    return {"message": "User registered", "user": user}
```

### Node.js ke saath Comparison

```javascript
app.post('/register', async (req, res) => {
  const user = await createUser(req.body.email);

  // Fire and forget -- await nahin karenege
  sendEmail(req.body.email, 'Welcome!', 'Thanks for signing up')
    .catch(err => console.error('Email failed:', err));

  res.json({ message: 'User registered', user });
});
```

FastAPI ka BackgroundTasks zyada structured hota hai — guaranteed rehta hai task response ke baad chalega. Node.js approach mein to Promise concurrent chalti hai, guarantee nahin hoti.

---

## Multiple Background Tasks

Real-world mein to multiple kaam hote hain ek saath. Jab Swiggy mein order dete ho:
1. Order database mein save hota hai
2. Restaurant ko notification jaata hai
3. Delivery partner ko alert milta hai
4. Analytics track hote hain
5. Customer ko email/SMS jaata hai

Sab kuch background mein chalti hain:

```python
@app.post("/orders")
def create_order(
    order_data: OrderCreate,
    background_tasks: BackgroundTasks,
):
    order = save_order(order_data)

    # Multiple tasks queue kar do -- ye order mein chalenge
    background_tasks.add_task(send_order_confirmation, order.id, order.email)
    background_tasks.add_task(update_inventory, order.items)
    background_tasks.add_task(notify_warehouse, order.id)
    background_tasks.add_task(track_analytics, "order_created", order.id)

    return {"order_id": order.id, "status": "created"}
```

### Background Tasks with Dependencies

FastAPI ka dependency injection background tasks ke saath perfectly kaam karta hai:

```python
def write_audit_log(message: str, user_id: int):
    with open("audit.log", "a") as f:
        f.write(f"[{datetime.now()}] User {user_id}: {message}\n")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    # ... token verify kar aur user return kar
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

    # Post delete karne ke baad audit log background mein likho
    background_tasks.add_task(
        write_audit_log,
        f"Deleted post {post_id}: {post.title}",
        current_user["id"],
    )

    return {"message": "Post deleted"}
```

### Background Tasks in Dependencies

Tumhe dependencies ke andar se bhi background tasks add kar sakte ho:

```python
def audit_dependency(
    background_tasks: BackgroundTasks,
    request: Request,
):
    """Yeh dependency automatically sab requests log kar dega."""
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

## Kab BackgroundTasks Kaafi Nahin Hota?

`BackgroundTasks` ke kuch limitations hain:

1. **Process mein hi chalte hain** — Agar server crash ho gaya, to pending tasks udte hain
2. **No retry logic** — Agar task fail ho jaye to automatic retry nahin hota
3. **Monitoring nahin** — Task ka status check nahin kar sakte ho
4. **Scale nahin ho sakte** — Ek server se zyada workers nahin chal sakte
5. **CPU-intensive nahin** — Heavy processing ke liye suitabl nahin (jaise video encoding ya ML model training)

Tum socho Flipkart ka example — agar koi 2GB video process karna ho (upload, compress, watermark), to ek hi server mein 1000 users ka request aaye to server hang ho jayega. Isliye large-scale applications Celery jaisa task queue use karte hain.

### Decision Guide

| Scenario | Solution |
|---|---|
| Welcome email registration ke baad | BackgroundTasks |
| Audit log entry write karna | BackgroundTasks |
| 2GB video file process karna | Celery |
| Complex report generate karna | Celery |
| Failed API calls ko retry karna | Celery |
| Daily cleanup schedule karna | Celery Beat |
| ML model training | Celery |
| Notification send karna | BackgroundTasks |
| Image resize (chota file) | BackgroundTasks |
| Image resize (bada file) | Celery |

---

## Celery: Production-Grade Task Queue

Celery Python ka BullMQ jaisa hai, bas zyada mature aur powerful. Production systems mein Celery use hota hai.

### Architecture

Kya hota hai? Tum ek task enqueue karte ho, wo Redis/RabbitMQ ke through separate workers tak jaata hai aur woh process karte hain:

```
FastAPI App  -->  Redis/RabbitMQ (Broker)  -->  Celery Workers
    |                                              |
    |  (Task enqueue)                             |  (Task execute)
    |                                              |
    v                                              v
  Response                                     Task Result
  (immediate)                                  (stored)
```

Node.js ke BullMQ jaisa:

```
Express App  -->  Redis (Queue)  -->  Bull Workers
```

### Setup

```bash
pip install celery[redis]  # Redis ke saath
# ya
pip install celery[rabbitmq]  # RabbitMQ ke saath
```

### Celery Configuration

```python
# celery_app.py
from celery import Celery

celery_app = Celery(
    "worker",
    broker="redis://localhost:6379/0",     # Message broker (Bull ka Redis jaisa)
    backend="redis://localhost:6379/1",    # Result storage
)

# Configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    task_track_started=True,
    task_acks_late=True,       # Task complete hone ke baad acknowledge karega (reliable)
    worker_prefetch_multiplier=1,
)
```

### Tasks Define Karna

```python
# tasks.py
from celery_app import celery_app
import time

@celery_app.task(bind=True, max_retries=3)
def send_email_task(self, to: str, subject: str, body: str):
    """
    Bull worker jaisa:
    queue.process(async (job) => { await sendEmail(job.data); });
    """
    try:
        # Email send karne mein time laga raha hai
        time.sleep(2)
        print(f"Email sent to {to}: {subject}")
        return {"status": "sent", "to": to}
    except Exception as exc:
        # Fail ho gaya to retry karo exponential backoff ke saath (Bull jaisa)
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)

@celery_app.task
def process_image(image_path: str, operations: list[str]):
    """Heavy image processing task."""
    time.sleep(10)  # Processing simulate kar rahe hain
    return {"processed": image_path, "operations": operations}

@celery_app.task
def generate_report(report_type: str, params: dict):
    """Complex report generate karna."""
    time.sleep(30)
    return {"report_url": f"/reports/{report_type}_123.pdf"}
```

### FastAPI mein Celery Tasks Use Karna

```python
# main.py
from fastapi import FastAPI
from tasks import send_email_task, process_image, generate_report

app = FastAPI()

@app.post("/register")
def register(email: str):
    user = create_user(email)

    # Task queue mein enqueue karo (Bull ka `queue.add()` jaisa)
    task = send_email_task.delay(email, "Welcome!", "Thanks for signing up")

    return {
        "user_id": user.id,
        "email_task_id": task.id,  # Task ID tracking ke liye
    }

@app.post("/images/process")
def process_uploaded_image(image_path: str):
    # Heavy processing enqueue karo
    task = process_image.delay(image_path, ["resize", "compress", "watermark"])

    return {
        "task_id": task.id,
        "status": "processing",
        "check_url": f"/tasks/{task.id}",
    }

@app.get("/tasks/{task_id}")
def get_task_status(task_id: str):
    """Task ka status check karo (Bull ka `job.getState()` jaisa)."""
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

### Celery Workers Chalana

```bash
# Celery worker start karo (Bull worker process jaisa)
celery -A celery_app worker --loglevel=info

# Multiple workers start karo
celery -A celery_app worker --loglevel=info --concurrency=4

# Specific queues ko handle karne ke liye
celery -A celery_app worker -Q emails,reports --loglevel=info
```

### BullMQ ke Saath Comparison

```javascript
// BullMQ (Node.js)
const emailQueue = new Queue('emails');

// Producer
await emailQueue.add('welcome-email', {
  to: 'user@example.com',
  subject: 'Welcome!',
});

// Consumer (alag process mein)
const worker = new Worker('emails', async (job) => {
  await sendEmail(job.data.to, job.data.subject);
}, { connection: redis });
```

```python
# Celery (Python) -- exactly wahi kaam
# Producer (FastAPI mein)
send_email_task.delay("user@example.com", "Welcome!")

# Consumer: bas worker start kar do
# celery -A celery_app worker
```

---

## Task Scheduling with Celery Beat

Celery Beat node-cron jaisa hai, bas task queue ke saath integrate. Cron jobs ke liye perfect.

```python
# celery_app.py (configuration mein add kar do)
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    # Har 30 minutes mein
    "cleanup-expired-tokens": {
        "task": "tasks.cleanup_expired_tokens",
        "schedule": 30.0 * 60,  # seconds mein
    },

    # Har din midnight mein
    "generate-daily-report": {
        "task": "tasks.generate_daily_report",
        "schedule": crontab(hour=0, minute=0),
    },

    # Har Monday ko 9am mein
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
    """Database se expired tokens delete kar do."""
    count = delete_expired_tokens()
    return {"deleted": count}

@celery_app.task
def generate_daily_report():
    """Daily analytics report banao."""
    report = compile_analytics()
    return {"report_id": report.id}
```

```bash
# Scheduler start karo (workers ke alawa)
celery -A celery_app beat --loglevel=info

# Ya ek hi process mein combine kar do (sirf development mein)
celery -A celery_app worker --beat --loglevel=info
```

### Node.js Equivalent

```javascript
// node-cron
const cron = require('node-cron');

cron.schedule('0 0 * * *', async () => {
  await generateDailyReport();
});

// Ya Agenda.js
agenda.define('daily report', async (job) => {
  await generateDailyReport();
});
await agenda.every('24 hours', 'daily report');
```

---

## Lightweight Alternative: arq

Agar Celery thoda heavy lage to `arq` hai — lighter, async-first, aur Redis-only.

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

# FastAPI mein
from arq import create_pool

@app.post("/register")
async def register(email: str):
    redis = await create_pool()
    await redis.enqueue_job("send_email", email, "Welcome!")
    return {"status": "registered"}
```

```bash
# Worker start karo
arq tasks.WorkerSettings
```

---

## Practice Exercises

### Exercise 1: Email Notification System
Ek API banao BackgroundTasks ke saath:
- `POST /users` -- user create karo aur background mein welcome email bhejo
- `POST /users/{id}/reset-password` -- background task trigger karo password reset email ke liye
- Sab "sent" emails ek file mein log karo (actually send mat karo)
- Har case mein turant response bhej do

### Exercise 2: File Processing Pipeline
`POST /files/process` endpoint banao jo:
- File accept kare
- File turant save kare
- Background tasks add kare: file hash calculate, lines count (text files), word count
- File ID turant return kare
- `GET /files/{id}/status` endpoint banao jo processing results dikhaye

### Exercise 3: Task Status Tracking
Simple in-memory task tracking system implement karo:
- `POST /tasks` -- long-running background task create karo
- `GET /tasks/{task_id}` -- task status return karo (pending/running/complete/failed)
- Shared dict use karke task states track karo
- 5-10 seconds lagne wale tasks simulate karo

### Exercise 4: Celery Setup (agar Redis available hai)
Basic Celery worker setup kar:
- Ek task jo "report" generate kare (text file banaye)
- FastAPI endpoint jo task enqueue kare
- Status endpoint jo check kare report ready hai ya nahin
- Simulated failures ke liye retry logic add kar

### Exercise 5: Scheduled Cleanup
Ek system banao jo:
- Temporary data expiration timestamp ke saath store kare
- `POST /temp-data` -- data store kare TTL ke saath
- `GET /temp-data/{key}` -- data retrieve kare agar expire na hua ho
- Har 60 seconds mein background cleanup chalaye jo expired data remove kare
- BackgroundTasks ya Celery Beat use kar sakte ho

---

## Key Takeaways

> [!tip]
> **BackgroundTasks** simple fire-and-forget tasks ke liye perfect — welcome emails, audit logs, notifications. Lekin guarantee nahin ki task complete hoga, process crash ho to kaam udte hain.

> [!warning]
> **Heavy processing ke liye Celery zaruri hai** — video encoding, ML training, large file processing. BackgroundTasks se server hang ho jayega.

> [!info]
> **Celery + Redis** production-grade queuing ka standard — BullMQ ka Python equivalent. Task retry, monitoring, distributed workers — sab milta hai.

> [!tip]
> **Celery Beat** scheduled tasks ke liye — daily reports, cleanup jobs, maintenance tasks.

> [!info]
> **arq** lightweight alternative — sirf Redis chahiye, async-first, simple use cases ke liye perfect.
