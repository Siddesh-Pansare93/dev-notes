# Async Patterns

## Advanced Asyncio Patterns (JS Promise ke saath comparison)

Basics toh ho gaye, ab aate hain us part pe jo tum roz use karoge. Har pattern ko uske JavaScript/Promise wale cousin ke saath side-by-side dikhaya hai — kyunki tum Node se aa rahe ho, isse concept turant click karega.

---

## `asyncio.gather()` = `Promise.all()`

Socho tumhe ek user ka profile page banana hai — user info, uske orders, aur uski preferences, teeno alag-alag APIs se aa rahe hain. Ek ke baad ek `await` karoge toh time ka sara bazaar ud jaayega — 0.5s + 0.3s + 0.2s = 1 second! Better hai teeno ko ek saath fire karo aur jab sab aa jaayein tab aage badho. Bilkul `Promise.all()` jaisa, exactly.

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
    # Teeno concurrently chalenge -- total time ~0.5s (1.0s nahi, bas sabse badhay wala time)
    user, orders, prefs = await asyncio.gather(
        fetch_user(1),
        fetch_orders(1),
        fetch_preferences(1),
    )
    print(user, orders, prefs)

asyncio.run(main())
```

```javascript
// JavaScript mein bilkul same
const [user, orders, prefs] = await Promise.all([
  fetchUser(1),
  fetchOrders(1),
  fetchPreferences(1),
]);
```

### gather() mein errors kaise handle karein

Default behavior thoda strict hai — agar ek bhi coroutine fail hua, baaki sab cancel ho jaate hain. Bilkul `Promise.all()` mein hota hai ek reject hote hi poora khel khatam.

```python
async def might_fail(n: int) -> int:
    if n == 3:
        raise ValueError("I don't like 3")
    await asyncio.sleep(0.1)
    return n * 2

# Default: pehli exception aate hi baaki sab cancel
async def main():
    try:
        results = await asyncio.gather(
            might_fail(1), might_fail(2), might_fail(3), might_fail(4)
        )
    except ValueError as e:
        print(f"One failed: {e}")  # Baaki tasks cancel ho gaye

# return_exceptions=True: Promise.allSettled() jaisa behavior
async def main_safe():
    results = await asyncio.gather(
        might_fail(1), might_fail(2), might_fail(3), might_fail(4),
        return_exceptions=True,  # Errors ko results mein include kar do
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

Yaani agar tumhe chahiye ki ek fail ho toh baaki continue karte rahein (jaise Zomato checkout pe payment fail ho par cart items dikhte rahein), toh `return_exceptions=True` laga do.

```javascript
// Promise.allSettled() -- JavaScript mein
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

## `asyncio.wait()` -- Completion pe zyada control

`gather()` sab kuch ek saath dikhata hai. Lekin kabhi-kabhi tumhe sirf "pehla jo complete ho jaaye, uska result de do" chahiye hota hai — jaise Swiggy pe agar 3 delivery partners ko notify kiya aur jo pehle accept kare wahi assign ho jaaye. Uske liye `asyncio.wait()` use karo.

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

    # Sabse pehla complete hone ka wait karo (Promise.race jaisa)
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)

    for t in done:
        print(f"Completed: {t.result()}")
    print(f"Still pending: {len(pending)}")

    # Baaki bache huye sab ka wait karo
    done2, _ = await asyncio.wait(pending)
    for t in done2:
        print(f"Completed: {t.result()}")

asyncio.run(main())
```

### `return_when` ke options:

| `asyncio.wait()` option | JS Equivalent |
|---|---|
| `FIRST_COMPLETED` | `Promise.race()` |
| `FIRST_EXCEPTION` | Direct equivalent nahi hai |
| `ALL_COMPLETED` | `Promise.all()` |

---

## `asyncio.create_task()` -- Background Tasks

Yeh bilkul waise hai jaise JS mein tum kisi promise ko `await` nahi karte — kaam turant background mein shuru ho jaata hai, tumhe uska result abhi nahi chahiye.

```python
import asyncio

async def send_email(to: str, subject: str) -> None:
    await asyncio.sleep(2)
    print(f"Email sent to {to}: {subject}")

async def handle_signup(username: str) -> dict:
    # Database mein user create karo
    user = {"username": username, "id": 42}

    # Fire-and-forget: welcome email background mein bhejo
    task = asyncio.create_task(send_email(username, "Welcome!"))

    # Email ka wait kiye bina turant return kar do
    return user

async def main():
    user = await handle_signup("alice")
    print(f"User created: {user}")

    # Background task ko complete hone ka time do
    await asyncio.sleep(3)

asyncio.run(main())
```

Bilkul waise hi jaise Zomato pe signup ke baad tumhe "Welcome to Zomato!" wala email milta hai — signup response turant aata hai, email peeche se aata rehta hai.

```javascript
// JavaScript equivalent -- fire-and-forget
async function handleSignup(username) {
  const user = { username, id: 42 };

  // Await mat karo -- background mein chalega
  sendEmail(username, "Welcome!").catch(console.error);

  return user;
}
```

> [!warning]
> Agar event loop khatam ho gaya (`asyncio.run()` return kar gaya) usse pehle task poora nahi hua, toh task cancel ho jaata hai. Hamesha ensure karo ki tasks complete ho jaayein ya unki cancellation handle karo.

---

## Task Groups (Python 3.11+) -- Structured Concurrency

Task groups guarantee dete hain — ya toh sab tasks complete honge, ya error aane par sab cancel ho jaayenge. Yeh concurrent tasks manage karne ka modern aur safer tareeka hai `gather()` se zyada robust aur predictable.

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

    # Agar sab succeed hue, toh result task.result() se milega
    print(task1.result())
    print(task2.result())
    print(task3.result())

# Agar KOI bhi ek task raise kare, toh baaki SAB cancel ho jaayenge
# aur ExceptionGroup raise hoga
async def main_with_error():
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(fetch("https://good.com"))
            tg.create_task(fetch("https://bad.com"))  # Yeh fail hoga
            tg.create_task(fetch("https://also-good.com"))
    except* ValueError as eg:
        # except* ExceptionGroup handle karta hai (Python 3.11+)
        for exc in eg.exceptions:
            print(f"Handled: {exc}")

asyncio.run(main_with_error())
```

### ExceptionGroup handling (Python 3.11+)

Naya `except*` syntax ek saath multiple exceptions ko group karke handle karne deta hai — jab ek TaskGroup ke andar alag-alag tasks alag-alag type ki errors throw karein.

```python
# except* syntax multiple exceptions ka group handle karne ke liye
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
    # RuntimeError upar propagate ho jaayega
```

---

## `asyncio.Queue` -- Producer/Consumer

Async queues producer/consumer pattern implement karne ka standard tareeka hain. Socho ek dabbawala system — producers (restaurants) dabbe queue mein daal rahe hain, consumers (delivery partners) uthake deliver kar rahe hain. Dono apni speed pe chalte hain, queue beech mein buffer ka kaam karti hai.

```python
import asyncio
import random

async def producer(queue: asyncio.Queue, name: str) -> None:
    for i in range(5):
        item = f"{name}-item-{i}"
        await asyncio.sleep(random.uniform(0.1, 0.5))
        await queue.put(item)  # Queue mein item dal do
        print(f"  Produced: {item}")
    await queue.put(None)  # Sentinel -- signal ki kaam khatam

async def consumer(queue: asyncio.Queue, name: str) -> None:
    while True:
        item = await queue.get()  # Queue se uthao
        if item is None:
            queue.task_done()
            break
        print(f"  Consumed by {name}: {item}")
        await asyncio.sleep(random.uniform(0.2, 0.4))
        queue.task_done()  # Bata do ki kaam ho gaya

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

    # Producers ke khatam hone ka wait karo
    await asyncio.gather(*producers)

    # Har consumer ke liye sentinel bhejo
    for _ in consumers:
        await queue.put(None)

    # Consumers ke khatam hone ka wait karo
    await asyncio.gather(*consumers)

    print("All done!")

asyncio.run(main())
```

```javascript
// JavaScript mein built-in async queue nahi hai
// Ya toh library use karoge, ya khud promises se banaoge
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

### Queue ke Types

```python
# Standard FIFO queue -- pehle aaya, pehle gaya (bilkul dabbawaala system)
queue = asyncio.Queue(maxsize=100)

# Priority queue -- sabse chhota priority number pehle (urgent orders pehle)
priority_queue = asyncio.PriorityQueue()
await priority_queue.put((1, "high priority"))
await priority_queue.put((10, "low priority"))
await priority_queue.put((5, "medium priority"))

item = await priority_queue.get()  # (1, "high priority") milega pehle

# LIFO queue (stack) -- last aaya, pehle gaya
lifo_queue = asyncio.LifoQueue()
```

---

## Synchronization Primitives

### `asyncio.Lock`

Jaise UPI transaction ke time do requests ek hi account balance ko ek saath modify na kar paayein, waise hi async code mein bhi shared data ko ek time pe sirf ek coroutine touch kare — iske liye Lock use hota hai.

```python
import asyncio

class SharedCounter:
    def __init__(self) -> None:
        self.value = 0
        self._lock = asyncio.Lock()

    async def increment(self) -> None:
        async with self._lock:  # Ek time pe sirf ek coroutine
            current = self.value
            await asyncio.sleep(0.01)  # Kaam simulate kar rahe hain
            self.value = current + 1

async def main():
    counter = SharedCounter()

    # Lock ke bina yahan race condition aati
    tasks = [counter.increment() for _ in range(100)]
    await asyncio.gather(*tasks)

    print(f"Final value: {counter.value}")  # Lock ke saath sahi 100 aayega

asyncio.run(main())
```

### `asyncio.Semaphore` -- Concurrency Limiter

Semaphore matlab "ek time pe sirf N logo ko andar jaane do" — jaise IRCTC ke Tatkal window jisme ek saath sirf limited requests process hoti hain baaki queue mein lagti hain. API rate limits respect karne ke liye yeh bahut kaam aata hai.

```python
import asyncio
import aiohttp

async def fetch_with_limit(
    sem: asyncio.Semaphore,
    session: aiohttp.ClientSession,
    url: str,
) -> str:
    async with sem:  # Sirf N concurrent requests
        async with session.get(url) as response:
            return await response.text()

async def main():
    # Sirf 10 concurrent requests (connection pool jaisa)
    sem = asyncio.Semaphore(10)

    urls = [f"https://example.com/page/{i}" for i in range(100)]

    async with aiohttp.ClientSession() as session:
        tasks = [fetch_with_limit(sem, session, url) for url in urls]
        results = await asyncio.gather(*tasks)

    print(f"Fetched {len(results)} pages")

asyncio.run(main())
```

```javascript
// JavaScript equivalent -- p-limit library use karo
import pLimit from "p-limit";

const limit = pLimit(10);

const tasks = urls.map((url) => limit(() => fetch(url).then((r) => r.text())));

const results = await Promise.all(tasks);
```

### `asyncio.Event` -- Coroutines ke beech Signal

Event ek simple flag hai — jab tak set nahi hota, sab waiters ruke rehte hain. Set hote hi sab ek saath aage badh jaate hain. Jaise ek group order Zomato pe tab tak place nahi hota jab tak sab members apna order confirm na kar dein.

```python
import asyncio

async def waiter(event: asyncio.Event, name: str) -> None:
    print(f"{name} waiting for event...")
    await event.wait()  # Yahan ruk gaya, event signal ka wait kar raha hai
    print(f"{name} got the event!")

async def setter(event: asyncio.Event) -> None:
    print("Preparing...")
    await asyncio.sleep(2)
    print("Setting event!")
    event.set()  # Sab waiters aage badh jaayenge

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

### `asyncio.wait_for()` -- Ek Single Coroutine ke liye Timeout

Agar koi operation itna slow ho jaaye ki user ka experience kharab ho, toh usse ek time limit ke baad hi cancel kar do — jaise koi payment gateway 10 second se zyada respond na kare toh "timeout, retry karo" dikha do.

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

Yeh naya aur zyada flexible tareeka hai — poore block ke liye ek deadline set kar sakte ho.

```python
import asyncio

async def main():
    # Ek deadline set karo is block ke liye
    async with asyncio.timeout(2.0):
        result = await slow_operation()
        print(result)  # Agar 2s se zyada laga toh yahan tak nahi pahunchega

    # Aur flexible: timeout_at ek absolute deadline ke liye
    loop = asyncio.get_event_loop()
    deadline = loop.time() + 5.0

    async with asyncio.timeout_at(deadline):
        r1 = await step1()  # 2s lagte hain
        r2 = await step2()  # 2s lagte hain
        r3 = await step3()  # Deadline se pehle sirf 1s bacha hai!

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

## Async Iterators aur Async Generators

### Async Iterator Protocol

`__aiter__` aur `__anext__` implement karke tum khud ka async iterable bana sakte ho — jaise koi custom object jo `async for` ke saath loop ho sake.

```python
class AsyncCountdown:
    def __init__(self, start: int) -> None:
        self.current = start

    def __aiter__(self):
        return self

    async def __anext__(self) -> int:
        if self.current <= 0:
            raise StopAsyncIteration  # Note: StopAsyncIteration (async version)
        await asyncio.sleep(0.5)
        value = self.current
        self.current -= 1
        return value

async def main():
    async for num in AsyncCountdown(5):
        print(num)  # 5, 4, 3, 2, 1 (0.5s delay ke saath)

asyncio.run(main())
```

### Async Generators (aasan tareeka)

Zyadatar cases mein tumhe apna khud ka `__aiter__`/`__anext__` likhne ki zarurat nahi — `yield` use karke seedha async generator bana lo, jaise normal generators mein karte ho.

```python
async def async_range(start: int, stop: int):
    for i in range(start, stop):
        await asyncio.sleep(0.1)
        yield i  # Yield karke aage ke cycle ka wait karo

# Async generator expressions
async def get_items():
    return [1, 2, 3, 4, 5]

# async for ke saath process karo
async def main():
    async for item in async_range(0, 10):
        print(item)

asyncio.run(main())
```

### Real-World: Streaming Data Processing

Yeh pattern tab kaam aata hai jab server-sent events ya kisi live stream se data continuously aa raha ho — jaise stock price updates ya live order tracking.

```python
import asyncio
import json

async def stream_events(url: str):
    """Async generator jo server-sent events stream se events yield karta hai."""
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

Jaise normal `with` statement resource ko clean-up karta hai (file close, connection close), waise hi `async with` async resources ke liye same kaam karta hai — connect/disconnect dono `await` ho sakte hain.

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
        return False  # Exceptions ko propagate karo

    async def query(self, sql: str) -> list:
        await asyncio.sleep(0.1)
        return [{"id": 1}, {"id": 2}]

async def main():
    async with AsyncDatabase() as db:
        results = await db.query("SELECT * FROM users")
        print(results)

asyncio.run(main())
```

### `asynccontextmanager` use karke

Poori class banane ke bajaye, ek simple generator function se bhi async context manager bana sakte ho — decorator lagao aur `yield` se resource de do.

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def managed_session():
    session = aiohttp.ClientSession()
    try:
        yield session  # `async with` block mein session available hoga
    finally:
        await session.close()  # Cleanup guaranteed

async def main():
    async with managed_session() as session:
        async with session.get("https://example.com") as resp:
            print(await resp.text())
```

---

## Common Patterns: Sab Kuch Ek Saath

### Pattern: Retry with Backoff

Flaky APIs (jo kabhi-kabhi fail ho jaate hain) ke saath kaam karte waqt turant retry karna sahi nahi — thoda ruk ke, badhte hue delay ke saath retry karo. Yeh "exponential backoff" kehlata hai, aur payment gateways, external APIs sab jagah use hota hai.

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
    """Ek async function ko exponential backoff ke saath retry karo."""
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
    # Ek flaky API simulate kar rahe hain
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

Bahut saare items ko process karna hai lekin controlled concurrency ke saath — semaphore ke saath fan-out karo (spread karo) aur `gather()` se fan-in (results wapas ikattha) karo.

```python
import asyncio

async def process_batch(items: list[str], concurrency: int = 10) -> list[dict]:
    """Items ko controlled concurrency ke saath process karo."""
    sem = asyncio.Semaphore(concurrency)
    results: list[dict] = []

    async def process_one(item: str) -> dict:
        async with sem:  # Semaphore se sirf N items ek saath process honge
            await asyncio.sleep(0.1)  # Kaam simulate kar rahe hain
            return {"item": item, "processed": True}

    tasks = [asyncio.create_task(process_one(item)) for item in items]
    results = await asyncio.gather(*tasks)
    return list(results)
```

### Pattern: Worker Pool

Yeh bilkul restaurant kitchen jaisa hai — orders (work items) ek queue mein aate hain, aur fixed number ke workers (chefs) usme se utha-utha ke process karte rehte hain jab tak queue khali na ho jaaye.

```python
import asyncio
from typing import Any, Callable, Coroutine

async def worker_pool(
    work_items: list[Any],
    worker: Callable[[Any], Coroutine],
    num_workers: int = 5,
) -> list[Any]:
    """Fixed-size worker pool use karke items process karo."""
    queue: asyncio.Queue = asyncio.Queue()
    results: list = []

    # Queue bharo
    for item in work_items:
        await queue.put(item)

    async def worker_task(worker_id: int):
        while True:
            try:
                item = queue.get_nowait()  # Kya koi item hai queue mein?
            except asyncio.QueueEmpty:
                break
            result = await worker(item)
            results.append(result)
            queue.task_done()  # Bata do ki item process ho gaya

    # N workers launch karo
    workers = [asyncio.create_task(worker_task(i)) for i in range(num_workers)]
    await asyncio.gather(*workers)

    return results

# Usage
async def process_url(url: str) -> str:
    await asyncio.sleep(0.5)  # HTTP request simulate kar rahe hain
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
Ek async function banao jo URLs fetch kare rate limiting ke saath:
- Maximum N concurrent requests (Semaphore use karo)
- Maximum M requests per second (token bucket ya sleep use karo)
- Fail hui requests ko max 3 baar backoff ke saath retry karo
- Results original order mein return karo

### Exercise 2: Async Pipeline with Queue
`asyncio.Queue` use karke ek multi-stage processing pipeline banao:
- Stage 1: Producer raw data items generate karta hai
- Stage 2: 3 transformer workers data clean/transform karte hain
- Stage 3: 2 loader workers processed data save karte hain
- Har stage ek queue se connected ho
- Producer khatam hone par graceful shutdown ho

### Exercise 3: Timeout Patterns
Aise functions likho jo demonstrate karein:
1. `asyncio.wait_for()` use karke individual task timeout
2. `asyncio.timeout()` use karke multiple tasks ke liye overall deadline
3. "Pehla successful result" -- `Promise.any()` jaisa (hint: `asyncio.wait()` ko `FIRST_COMPLETED` ke saath use karo aur baaki cancel kar do)

### Exercise 4: Async Event System
Ek async event emitter banao:
- `on(event_name, async_handler)` -- handler register karo
- `emit(event_name, data)` -- sab handlers ko concurrently trigger karo
- `once(event_name, async_handler)` -- handler sirf ek baar fire ho
- `wait_for(event_name, timeout)` -- kisi event ke fire hone ka wait karo

### Exercise 5: Async Context Manager Stack
Ek service banao jo multiple async resources manage kare:
- Database connection (async connect/disconnect)
- Cache connection (async connect/disconnect)
- HTTP session (async open/close)
- Sab resources manage karne ke liye `AsyncExitStack` use karo
- Ek `get_service()` context manager provide karo jo sab resources set up kare aur properly teardown bhi kare
