# Async Patterns

## Advanced Asyncio Patterns (with Promise Equivalents)

Now that you understand the basics of Python async, let's dive into the patterns you'll use daily. Each pattern is mapped to its JavaScript/Promise equivalent.

---

## `asyncio.gather()` = `Promise.all()`

Run multiple coroutines concurrently and wait for all to complete:

```python
import asyncio

async def fetch_user(user_id: int) -> dict:
    await asyncio.sleep(0.5)
    return {"id": user_id, "name": f"User {user_id}"}

async def fetch_orders(user_id: int) -> list:
    await asyncio.sleep(0.3)
    return [{"order_id": i, "user_id": user_id} for i in range(3)]

async def fetch_preferences(user_id: int) -> dict:
    await asyncio.sleep(0.2)
    return {"theme": "dark", "lang": "en"}

async def main():
    # All three run concurrently -- total time ~0.5s (not 1.0s)
    user, orders, prefs = await asyncio.gather(
        fetch_user(1),
        fetch_orders(1),
        fetch_preferences(1),
    )
    print(user, orders, prefs)

asyncio.run(main())
```

```javascript
// JavaScript equivalent
const [user, orders, prefs] = await Promise.all([
  fetchUser(1),
  fetchOrders(1),
  fetchPreferences(1),
]);
```

### Handling Errors in gather

```python
async def might_fail(n: int) -> int:
    if n == 3:
        raise ValueError("I don't like 3")
    await asyncio.sleep(0.1)
    return n * 2

# Default: first exception cancels everything
async def main():
    try:
        results = await asyncio.gather(
            might_fail(1), might_fail(2), might_fail(3), might_fail(4)
        )
    except ValueError as e:
        print(f"One failed: {e}")  # Other tasks are cancelled

# return_exceptions=True: like Promise.allSettled()
async def main_safe():
    results = await asyncio.gather(
        might_fail(1), might_fail(2), might_fail(3), might_fail(4),
        return_exceptions=True,
    )
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            print(f"Task {i} failed: {result}")
        else:
            print(f"Task {i} succeeded: {result}")

asyncio.run(main_safe())
# Task 0 succeeded: 2
# Task 1 succeeded: 4
# Task 2 failed: I don't like 3
# Task 3 succeeded: 8
```

```javascript
// Promise.allSettled equivalent
const results = await Promise.allSettled([
  mightFail(1),
  mightFail(2),
  mightFail(3),
  mightFail(4),
]);
results.forEach((r, i) => {
  if (r.status === "fulfilled") console.log(`Task ${i}: ${r.value}`);
  else console.log(`Task ${i} failed: ${r.reason}`);
});
```

---

## `asyncio.wait()` -- More Control Over Completion

`asyncio.wait()` gives you fine-grained control over when to proceed:

```python
import asyncio

async def task(name: str, duration: float) -> str:
    await asyncio.sleep(duration)
    return f"{name} done"

async def main():
    tasks = {
        asyncio.create_task(task("fast", 0.5)),
        asyncio.create_task(task("medium", 1.0)),
        asyncio.create_task(task("slow", 2.0)),
    }

    # Wait for first to complete (like Promise.race)
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)

    for t in done:
        print(f"Completed: {t.result()}")
    print(f"Still pending: {len(pending)}")

    # Wait for all remaining
    done2, _ = await asyncio.wait(pending)
    for t in done2:
        print(f"Completed: {t.result()}")

asyncio.run(main())
```

### return_when options:

| `asyncio.wait()` option | JS Equivalent |
|---|---|
| `FIRST_COMPLETED` | `Promise.race()` |
| `FIRST_EXCEPTION` | No direct equivalent |
| `ALL_COMPLETED` | `Promise.all()` |

---

## `asyncio.create_task()` -- Background Tasks

Creating tasks is like not awaiting a promise immediately -- the work starts right away:

```python
import asyncio

async def send_email(to: str, subject: str) -> None:
    await asyncio.sleep(2)
    print(f"Email sent to {to}: {subject}")

async def handle_signup(username: str) -> dict:
    # Create user in database
    user = {"username": username, "id": 42}

    # Fire-and-forget: send welcome email in background
    task = asyncio.create_task(send_email(username, "Welcome!"))

    # Return immediately without waiting for email
    return user

async def main():
    user = await handle_signup("alice")
    print(f"User created: {user}")

    # Give background task time to complete
    await asyncio.sleep(3)

asyncio.run(main())
```

```javascript
// JavaScript equivalent -- fire-and-forget
async function handleSignup(username) {
  const user = { username, id: 42 };

  // Don't await -- runs in background
  sendEmail(username, "Welcome!").catch(console.error);

  return user;
}
```

> **Warning**: If the event loop exits before a task completes, the task is cancelled. Always ensure tasks finish or handle cancellation.

---

## Task Groups (Python 3.11+) -- Structured Concurrency

Task groups ensure all tasks complete (or are cancelled on error). This is the modern, safer way to manage concurrent tasks:

```python
import asyncio

async def fetch(url: str) -> str:
    await asyncio.sleep(0.5)
    if "bad" in url:
        raise ValueError(f"Bad URL: {url}")
    return f"Data from {url}"

async def main():
    results = []

    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(fetch("https://api.example.com/a"))
        task2 = tg.create_task(fetch("https://api.example.com/b"))
        task3 = tg.create_task(fetch("https://api.example.com/c"))

    # If all succeed, results are available via task.result()
    print(task1.result())
    print(task2.result())
    print(task3.result())

# If ANY task raises, ALL other tasks are cancelled
# and an ExceptionGroup is raised
async def main_with_error():
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(fetch("https://good.com"))
            tg.create_task(fetch("https://bad.com"))  # This will fail
            tg.create_task(fetch("https://also-good.com"))
    except* ValueError as eg:
        # except* handles ExceptionGroup (Python 3.11+)
        for exc in eg.exceptions:
            print(f"Handled: {exc}")

asyncio.run(main_with_error())
```

### ExceptionGroup handling (Python 3.11+)

```python
# except* is new syntax for handling groups of exceptions
async def main():
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(might_fail_with_value_error())
            tg.create_task(might_fail_with_type_error())
            tg.create_task(might_fail_with_runtime_error())
    except* ValueError as eg:
        print(f"Value errors: {eg.exceptions}")
    except* TypeError as eg:
        print(f"Type errors: {eg.exceptions}")
    # RuntimeError would propagate up
```

---

## `asyncio.Queue` -- Producer/Consumer

Async queues are the primary way to implement producer/consumer patterns:

```python
import asyncio
import random

async def producer(queue: asyncio.Queue, name: str) -> None:
    for i in range(5):
        item = f"{name}-item-{i}"
        await asyncio.sleep(random.uniform(0.1, 0.5))
        await queue.put(item)
        print(f"  Produced: {item}")
    await queue.put(None)  # Sentinel to signal done

async def consumer(queue: asyncio.Queue, name: str) -> None:
    while True:
        item = await queue.get()
        if item is None:
            queue.task_done()
            break
        print(f"  Consumed by {name}: {item}")
        await asyncio.sleep(random.uniform(0.2, 0.4))
        queue.task_done()

async def main():
    queue: asyncio.Queue[str | None] = asyncio.Queue(maxsize=3)

    producers = [
        asyncio.create_task(producer(queue, "P1")),
        asyncio.create_task(producer(queue, "P2")),
    ]

    consumers = [
        asyncio.create_task(consumer(queue, "C1")),
        asyncio.create_task(consumer(queue, "C2")),
    ]

    # Wait for producers to finish
    await asyncio.gather(*producers)

    # Send sentinel for each consumer
    for _ in consumers:
        await queue.put(None)

    # Wait for consumers to finish
    await asyncio.gather(*consumers)

    print("All done!")

asyncio.run(main())
```

```javascript
// JavaScript doesn't have a built-in async queue
// You'd typically use a library or build one with promises
class AsyncQueue {
  constructor() {
    this.items = [];
    this.waiters = [];
  }

  async put(item) {
    if (this.waiters.length > 0) {
      this.waiters.shift()(item);
    } else {
      this.items.push(item);
    }
  }

  async get() {
    if (this.items.length > 0) {
      return this.items.shift();
    }
    return new Promise((resolve) => this.waiters.push(resolve));
  }
}
```

### Queue Types

```python
# Standard FIFO queue
queue = asyncio.Queue(maxsize=100)

# Priority queue -- lowest priority number first
priority_queue = asyncio.PriorityQueue()
await priority_queue.put((1, "high priority"))
await priority_queue.put((10, "low priority"))
await priority_queue.put((5, "medium priority"))

item = await priority_queue.get()  # (1, "high priority")

# LIFO queue (stack)
lifo_queue = asyncio.LifoQueue()
```

---

## Synchronization Primitives

### `asyncio.Lock`

```python
import asyncio

class SharedCounter:
    def __init__(self) -> None:
        self.value = 0
        self._lock = asyncio.Lock()

    async def increment(self) -> None:
        async with self._lock:  # Only one coroutine at a time
            current = self.value
            await asyncio.sleep(0.01)  # Simulate work
            self.value = current + 1

async def main():
    counter = SharedCounter()

    # Without lock, this would have race conditions
    tasks = [counter.increment() for _ in range(100)]
    await asyncio.gather(*tasks)

    print(f"Final value: {counter.value}")  # 100 (correct with lock)

asyncio.run(main())
```

### `asyncio.Semaphore` -- Concurrency Limiter

```python
import asyncio
import aiohttp

async def fetch_with_limit(
    sem: asyncio.Semaphore,
    session: aiohttp.ClientSession,
    url: str,
) -> str:
    async with sem:  # Only N concurrent requests
        async with session.get(url) as response:
            return await response.text()

async def main():
    # Limit to 10 concurrent requests (like a connection pool)
    sem = asyncio.Semaphore(10)

    urls = [f"https://example.com/page/{i}" for i in range(100)]

    async with aiohttp.ClientSession() as session:
        tasks = [fetch_with_limit(sem, session, url) for url in urls]
        results = await asyncio.gather(*tasks)

    print(f"Fetched {len(results)} pages")

asyncio.run(main())
```

```javascript
// JavaScript equivalent -- p-limit library
import pLimit from "p-limit";

const limit = pLimit(10);

const tasks = urls.map((url) => limit(() => fetch(url).then((r) => r.text())));

const results = await Promise.all(tasks);
```

### `asyncio.Event` -- Signal Between Coroutines

```python
import asyncio

async def waiter(event: asyncio.Event, name: str) -> None:
    print(f"{name} waiting for event...")
    await event.wait()
    print(f"{name} got the event!")

async def setter(event: asyncio.Event) -> None:
    print("Preparing...")
    await asyncio.sleep(2)
    print("Setting event!")
    event.set()  # All waiters proceed

async def main():
    event = asyncio.Event()

    await asyncio.gather(
        waiter(event, "W1"),
        waiter(event, "W2"),
        waiter(event, "W3"),
        setter(event),
    )

asyncio.run(main())
# W1 waiting for event...
# W2 waiting for event...
# W3 waiting for event...
# Preparing...
# Setting event!
# W1 got the event!
# W2 got the event!
# W3 got the event!
```

---

## Timeouts

### `asyncio.wait_for()` -- Timeout for a Single Coroutine

```python
import asyncio

async def slow_operation() -> str:
    await asyncio.sleep(10)
    return "done"

async def main():
    try:
        result = await asyncio.wait_for(slow_operation(), timeout=2.0)
    except asyncio.TimeoutError:
        print("Operation timed out!")

asyncio.run(main())
```

### `asyncio.timeout()` -- Context Manager Timeout (Python 3.11+)

```python
import asyncio

async def main():
    async with asyncio.timeout(2.0):
        result = await slow_operation()
        print(result)  # Won't reach this if it takes > 2s

    # More flexible: timeout_at for absolute deadline
    loop = asyncio.get_event_loop()
    deadline = loop.time() + 5.0

    async with asyncio.timeout_at(deadline):
        r1 = await step1()  # Takes 2s
        r2 = await step2()  # Takes 2s
        r3 = await step3()  # Only 1s left before deadline!

asyncio.run(main())
```

```javascript
// JavaScript equivalent using AbortController
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 2000);

try {
  const result = await fetch(url, { signal: controller.signal });
} catch (e) {
  if (e.name === "AbortError") {
    console.log("Timed out!");
  }
} finally {
  clearTimeout(timeoutId);
}
```

---

## Async Iterators and Async Generators

### Async Iterator Protocol

```python
class AsyncCountdown:
    def __init__(self, start: int) -> None:
        self.current = start

    def __aiter__(self):
        return self

    async def __anext__(self) -> int:
        if self.current <= 0:
            raise StopAsyncIteration  # Note: StopASYNCIteration
        await asyncio.sleep(0.5)
        value = self.current
        self.current -= 1
        return value

async def main():
    async for num in AsyncCountdown(5):
        print(num)  # 5, 4, 3, 2, 1 (with 0.5s delays)

asyncio.run(main())
```

### Async Generators (the easy way)

```python
async def async_range(start: int, stop: int):
    for i in range(start, stop):
        await asyncio.sleep(0.1)
        yield i

# Async generator expressions
async def get_items():
    return [1, 2, 3, 4, 5]

# Process with async for
async def main():
    async for item in async_range(0, 10):
        print(item)

asyncio.run(main())
```

### Real-World: Streaming Data Processing

```python
import asyncio
import json

async def stream_events(url: str):
    """Async generator that yields events from a server-sent events stream."""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            async for line in response.content:
                line = line.decode().strip()
                if line.startswith("data:"):
                    yield json.loads(line[5:])

async def process_stream():
    async for event in stream_events("https://api.example.com/events"):
        if event["type"] == "message":
            await handle_message(event)
        elif event["type"] == "error":
            await handle_error(event)
```

---

## `async with` -- Async Context Managers

```python
import asyncio

class AsyncDatabase:
    async def __aenter__(self):
        print("Connecting to database...")
        await asyncio.sleep(0.5)
        self.connected = True
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        print("Disconnecting from database...")
        await asyncio.sleep(0.2)
        self.connected = False
        return False

    async def query(self, sql: str) -> list:
        await asyncio.sleep(0.1)
        return [{"id": 1}, {"id": 2}]

async def main():
    async with AsyncDatabase() as db:
        results = await db.query("SELECT * FROM users")
        print(results)

asyncio.run(main())
```

### Using `asynccontextmanager`

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def managed_session():
    session = aiohttp.ClientSession()
    try:
        yield session
    finally:
        await session.close()

async def main():
    async with managed_session() as session:
        async with session.get("https://example.com") as resp:
            print(await resp.text())
```

---

## Common Patterns: Putting It All Together

### Pattern: Retry with Backoff

```python
import asyncio
import random

async def retry_async(
    coro_func,
    *args,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    exceptions: tuple = (Exception,),
):
    """Retry an async function with exponential backoff."""
    for attempt in range(max_retries):
        try:
            return await coro_func(*args)
        except exceptions as e:
            if attempt == max_retries - 1:
                raise
            delay = min(base_delay * (2 ** attempt) + random.uniform(0, 1), max_delay)
            print(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay:.1f}s")
            await asyncio.sleep(delay)

# Usage
async def flaky_api_call(url: str) -> dict:
    # Simulating a flaky API
    if random.random() < 0.7:
        raise ConnectionError("Server unavailable")
    return {"status": "ok"}

async def main():
    result = await retry_async(
        flaky_api_call,
        "https://api.example.com",
        max_retries=5,
        exceptions=(ConnectionError,),
    )
    print(result)
```

### Pattern: Fan-Out / Fan-In

```python
import asyncio

async def process_batch(items: list[str], concurrency: int = 10) -> list[dict]:
    """Process items with controlled concurrency."""
    sem = asyncio.Semaphore(concurrency)
    results: list[dict] = []

    async def process_one(item: str) -> dict:
        async with sem:
            await asyncio.sleep(0.1)  # Simulate work
            return {"item": item, "processed": True}

    tasks = [asyncio.create_task(process_one(item)) for item in items]
    results = await asyncio.gather(*tasks)
    return list(results)
```

### Pattern: Worker Pool

```python
import asyncio
from typing import Any, Callable, Coroutine

async def worker_pool(
    work_items: list[Any],
    worker: Callable[[Any], Coroutine],
    num_workers: int = 5,
) -> list[Any]:
    """Process items using a fixed-size worker pool."""
    queue: asyncio.Queue = asyncio.Queue()
    results: list = []

    # Fill the queue
    for item in work_items:
        await queue.put(item)

    async def worker_task(worker_id: int):
        while True:
            try:
                item = queue.get_nowait()
            except asyncio.QueueEmpty:
                break
            result = await worker(item)
            results.append(result)
            queue.task_done()

    # Launch workers
    workers = [asyncio.create_task(worker_task(i)) for i in range(num_workers)]
    await asyncio.gather(*workers)

    return results

# Usage
async def process_url(url: str) -> str:
    await asyncio.sleep(0.5)  # Simulate HTTP request
    return f"Processed: {url}"

async def main():
    urls = [f"https://example.com/{i}" for i in range(20)]
    results = await worker_pool(urls, process_url, num_workers=5)
    print(f"Processed {len(results)} URLs")

asyncio.run(main())
```

---

## Practice Exercises

### Exercise 1: Rate-Limited Fetcher
Build an async function that fetches URLs with rate limiting:
- Maximum N concurrent requests (use Semaphore)
- Maximum M requests per second (use a token bucket or sleep)
- Retry failed requests up to 3 times with backoff
- Return results in original order

### Exercise 2: Async Pipeline with Queue
Build a multi-stage processing pipeline using asyncio.Queue:
- Stage 1: Producer generates raw data items
- Stage 2: 3 transformer workers clean/transform data
- Stage 3: 2 loader workers save processed data
- Each stage connected by a queue
- Graceful shutdown when producer is done

### Exercise 3: Timeout Patterns
Write functions that demonstrate:
1. Individual task timeout using `asyncio.wait_for()`
2. Overall deadline for multiple tasks using `asyncio.timeout()`
3. "First successful result" -- like `Promise.any()` (hint: use `asyncio.wait()` with `FIRST_COMPLETED` and cancel the rest)

### Exercise 4: Async Event System
Build an async event emitter:
- `on(event_name, async_handler)` -- register handler
- `emit(event_name, data)` -- trigger all handlers concurrently
- `once(event_name, async_handler)` -- handler fires only once
- `wait_for(event_name, timeout)` -- wait for an event to fire

### Exercise 5: Async Context Manager Stack
Build a service that manages multiple async resources:
- Database connection (async connect/disconnect)
- Cache connection (async connect/disconnect)
- HTTP session (async open/close)
- Use `AsyncExitStack` to manage all resources
- Provide a `get_service()` context manager that sets up all resources and tears them down properly
