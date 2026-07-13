# Advanced Decorators

## Basics se Aage

Simple decorators toh dekh hi liye. Ab dekhte hain woh advanced patterns jo Python decorators ko language ka sabse powerful metaprogramming feature banate hain. JavaScript/TypeScript mein experimental decorators hain (Stage 3), lekin Python ke decorators zyada mature hain aur har jagah use hote hain.

---

## Quick Refresher

```python
import functools

def my_decorator(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print("Before")
        result = func(*args, **kwargs)
        print("After")
        return result
    return wrapper

@my_decorator
def greet(name: str) -> str:
    return f"Hello, {name}"

# @decorator yeh syntax sugar hai iske liye:
# greet = my_decorator(greet)
```

```typescript
// TypeScript decorator (alag mechanism, class-focused)
function Log(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log("Before");
    const result = original.apply(this, args);
    console.log("After");
    return result;
  };
}

class Greeter {
  @Log
  greet(name: string): string {
    return `Hello, ${name}`;
  }
}
```

> **Key difference**: Python decorators kisi bhi function (ya class) pe kaam karte hain. TypeScript decorators mostly class members ke liye hote hain. Python decorators bas plain functions hain jo ek function lete hain aur ek function return karte hain — koi special syntax ya protocol nahi chahiye.

---

## Decorator Factories (Arguments wale Decorators)

Jab tumhe decorator ko parameters dene ho, ek outer function add kar do — bilkul jaise Zomato ka "apply coupon" flow hota hai: pehle coupon code do (`@discount("FIRST50")`), phir woh actual order pe apply hota hai.

```python
import functools
import time

# Decorator BINA arguments ke
def timer(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        print(f"{func.__name__}: {time.perf_counter() - start:.4f}s")
        return result
    return wrapper

# Decorator WITH arguments (decorator factory)
def timer_with_label(label: str = "", threshold: float = 0.0):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            result = func(*args, **kwargs)
            elapsed = time.perf_counter() - start
            if elapsed >= threshold:
                name = label or func.__name__
                print(f"[SLOW] {name}: {elapsed:.4f}s")
            return result
        return wrapper
    return decorator

# Usage
@timer_with_label(label="Database Query", threshold=0.5)
def query_db(sql: str) -> list:
    time.sleep(0.7)
    return [{"id": 1}]

# Bina arguments ke, par parentheses ke saath
@timer_with_label()
def fast_function():
    pass
```

Socho `timer_with_label` teen-level ka function hai: outer function config leta hai (`label`, `threshold`), woh andar `decorator` return karta hai jo actual function leta hai, aur woh `wrapper` return karta hai jo asal mein chalta hai. Confusing lage toh bas yaad rakho — **jitni bar `()` lagti hai, utna ek naya layer**.

### Flexible Decorator: With ya Without Arguments, Dono Chalega

```python
import functools

def flexible_decorator(func=None, *, retries=3, delay=1.0):
    """@flexible_decorator ya @flexible_decorator(retries=5) — dono chalega."""

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < retries - 1:
                        time.sleep(delay)
            raise last_exception

        return wrapper

    if func is not None:
        # Bina arguments ke call hua: @flexible_decorator
        return decorator(func)
    else:
        # Arguments ke saath call hua: @flexible_decorator(retries=5)
        return decorator

# Dono chalega:
@flexible_decorator
def api_call_v1():
    pass

@flexible_decorator(retries=5, delay=2.0)
def api_call_v2():
    pass
```

Trick simple hai — check karo `func` diya gaya hai ya nahi. Agar diya hai, matlab kisi ne bina `()` ke decorator lagaya (`@flexible_decorator`), toh seedha decorate kar do. Agar `func=None` hai, matlab kisi ne `()` ke saath call kiya, toh `decorator` function wapas bhej do jo Python khud call karega.

---

## `functools.wraps` aur Yeh Kyun Zaruri Hai

`@functools.wraps` ke bina, decorator original function ka metadata chura leta hai — matlab tumhara function apni "identity" khho deta hai:

```python
def bad_decorator(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

def good_decorator(func):
    @functools.wraps(func)  # Original function ka metadata preserve karta hai
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@bad_decorator
def my_func():
    """My docstring."""
    pass

print(my_func.__name__)    # "wrapper" (galat!)
print(my_func.__doc__)     # None (gayab!)

@good_decorator
def my_func():
    """My docstring."""
    pass

print(my_func.__name__)    # "my_func" (sahi!)
print(my_func.__doc__)     # "My docstring." (preserved!)
print(my_func.__wrapped__)  # Original function (wraps ne add kiya)
```

**Hamesha `@functools.wraps` use karo** — yeh `__name__`, `__qualname__`, `__doc__`, `__dict__`, `__module__`, aur `__annotations__` copy karta hai, aur `__wrapped__` add karta hai jisse original function tak access mil jaata hai.

> [!warning]
> Agar `wraps` bhool gaye toh debugging mein pareeshani hogi — stack traces, `help()`, aur IDE tooltips sab galat function ka naam dikhayenge. Chota sa decorator likha aur `functools.wraps` bhool gaye — yeh sabse common Python mistake hai.

---

## Multiple Decorators Stack Karna

Decorators bottom-up execute hote hain (function ke sabse paas wala pehle), lekin unke wrapper functions top-down chalte hain. Isko samjho jaise gift wrapping — pehle innermost layer lagta hai, phir uske upar aur layers, lekin jab gift kholte ho (call karte ho), toh sabse bahar wali layer pehle khulti hai.

```python
def bold(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return f"<b>{func(*args, **kwargs)}</b>"
    return wrapper

def italic(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return f"<i>{func(*args, **kwargs)}</i>"
    return wrapper

def underline(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return f"<u>{func(*args, **kwargs)}</u>"
    return wrapper

@bold
@italic
@underline
def greet(name: str) -> str:
    return f"Hello, {name}"

print(greet("World"))
# <b><i><u>Hello, World</u></i></b>

# Yeh iske equivalent hai:
# greet = bold(italic(underline(greet)))
# Wrapping order: underline sabse pehle wrap hota hai, phir italic, phir bold
# Lekin call karne pe: bold ka wrapper pehle chalta hai -> italic ka -> underline ka -> original
```

### Real-World Stacking

```python
@app.route("/api/users", methods=["POST"])  # Flask route
@login_required                              # Auth check
@validate_json(schema=user_schema)           # Input validation
@rate_limit(calls=100, period=60)            # Rate limiting
def create_user():
    ...
```

Yeh bilkul Express.js ke middleware chain jaisa hai — request pehle rate limiter se guzarti hai, phir validation, phir auth, tab jaake actual handler tak pahunchti hai.

---

## Class-Based Decorators

Jab decorator ko **state** yaad rakhni ho (jaise kitni baar call hua), toh function ke bajaye ek class use karo jisme `__call__` method ho.

```python
class CountCalls:
    """Decorator jo track karta hai function kitni baar call hua."""

    def __init__(self, func):
        functools.update_wrapper(self, func)
        self.func = func
        self.count = 0

    def __call__(self, *args, **kwargs):
        self.count += 1
        print(f"{self.func.__name__} called {self.count} times")
        return self.func(*args, **kwargs)

@CountCalls
def process_item(item: str) -> str:
    return item.upper()

process_item("hello")  # "process_item called 1 times"
process_item("world")  # "process_item called 2 times"
print(process_item.count)  # 2
```

Yahan `CountCalls("process_item")` khud ek object ban jaata hai jo function ki jagah rakh leta hai — aur kyunki object hai, isme apna state (`self.count`) rakh sakta hai. Function-based decorators mein state rakhne ke liye closure ya global variable chahiye hota, class-based decorator mein yeh naturally milta hai.

### Class Decorator with Arguments

```python
class Retry:
    """Configurable retry logic wala decorator class."""

    def __init__(self, max_attempts: int = 3, exceptions: tuple = (Exception,)):
        self.max_attempts = max_attempts
        self.exceptions = exceptions

    def __call__(self, func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(1, self.max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except self.exceptions as e:
                    last_exception = e
                    print(f"Attempt {attempt}/{self.max_attempts} failed: {e}")
            raise last_exception

        return wrapper

@Retry(max_attempts=5, exceptions=(ConnectionError, TimeoutError))
def connect_to_service():
    ...
```

Yahan `Retry(max_attempts=5, ...)` pehle ek object banata hai (config store karke), aur phir Python us object ko `func` ke saath call karta hai — jo `__call__` method trigger karta hai.

---

## `functools.lru_cache` aur `@cache` — Memoization

### `@functools.cache` (Python 3.9+)

Simple unbounded cache — socho jaise Swiggy ek baar restaurant ka menu fetch karke rakh leta hai, baar baar server ko hit nahi karta:

```python
import functools

@functools.cache
def fibonacci(n: int) -> int:
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Cache ke bina: fibonacci(35) seconds leta hai (exponential time)
# Cache ke saath: fibonacci(35) instant hai (linear time, har value ek hi baar compute hoti hai)
print(fibonacci(100))  # Instant!

# Cache info
print(fibonacci.cache_info())
# CacheInfo(hits=98, misses=101, maxsize=None, currsize=101)

# Cache clear karo
fibonacci.cache_clear()
```

### `@functools.lru_cache` — Bounded Cache

```python
@functools.lru_cache(maxsize=128)  # Sirf last 128 results rakho
def expensive_computation(x: int, y: int) -> int:
    """Same args ke saath sirf pehli call compute karti hai; baaki cached milti hain."""
    time.sleep(1)  # Expensive kaam simulate kar rahe hain
    return x ** y

# Pehli call: slow (compute hoti hai)
result1 = expensive_computation(2, 10)  # 1 second lagega

# Same args ke saath dusri call: instant (cached)
result2 = expensive_computation(2, 10)  # Instant!

# IMPORTANT: Arguments hashable hone chahiye (list, dict nahi chalenge)
# Yeh ERROR dega:
# @functools.lru_cache
# def bad(data: list) -> int:  # list hashable nahi hai
#     return sum(data)
```

```javascript
// JavaScript equivalent -- manual memoization
function memoize(fn) {
  const cache = new Map();
  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}
```

### `@functools.cached_property`

Ek baar compute karo, phir property ki tarah cache kar do:

```python
import functools

class DataAnalyzer:
    def __init__(self, data: list[float]) -> None:
        self.data = data

    @functools.cached_property
    def mean(self) -> float:
        """Sirf ek baar compute hota hai, phir cache."""
        print("Computing mean...")
        return sum(self.data) / len(self.data)

    @functools.cached_property
    def std_dev(self) -> float:
        """Yeh bhi sirf ek baar compute hota hai."""
        print("Computing std_dev...")
        variance = sum((x - self.mean) ** 2 for x in self.data) / len(self.data)
        return variance ** 0.5

analyzer = DataAnalyzer([1, 2, 3, 4, 5])
print(analyzer.mean)      # "Computing mean..." phir 3.0
print(analyzer.mean)      # 3.0 (dobara compute nahi hoga!)
print(analyzer.std_dev)   # "Computing std_dev..." phir 1.414...
```

```typescript
// TypeScript mein built-in cached_property nahi hai
// Sabse close approach: manual lazy getter
class DataAnalyzer {
  private _mean?: number;

  get mean(): number {
    if (this._mean === undefined) {
      this._mean = this.data.reduce((a, b) => a + b) / this.data.length;
    }
    return this._mean;
  }
}
```

---

## Real-World Decorator Patterns

### Retry with Exponential Backoff

IRCTC ya kisi bhi flaky API ko call karte waqt yeh pattern bohot common hai — fail ho toh thoda ruko, phir try karo, aur har baar wait time double karte jao:

```python
import functools
import time
import random

def retry(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exceptions: tuple = (Exception,),
    backoff_factor: float = 2.0,
):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts:
                        raise

                    delay = min(
                        base_delay * (backoff_factor ** (attempt - 1)),
                        max_delay,
                    )
                    # Thundering herd rokne ke liye jitter add karo
                    delay *= (0.5 + random.random())
                    print(f"Attempt {attempt} failed: {e}. "
                          f"Retrying in {delay:.1f}s...")
                    time.sleep(delay)

        return wrapper
    return decorator

@retry(max_attempts=5, exceptions=(ConnectionError, TimeoutError))
def fetch_data(url: str) -> dict:
    ...
```

### Timing / Performance Logging

```python
import functools
import time
import logging

logger = logging.getLogger(__name__)

def timed(func=None, *, log_level=logging.DEBUG, threshold_ms: float = 0):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                return func(*args, **kwargs)
            finally:
                elapsed_ms = (time.perf_counter() - start) * 1000
                if elapsed_ms >= threshold_ms:
                    logger.log(
                        log_level,
                        "%s took %.2fms",
                        func.__qualname__,
                        elapsed_ms,
                    )
        return wrapper

    if func is not None:
        return decorator(func)
    return decorator

@timed
def fast_operation():
    pass

@timed(threshold_ms=100, log_level=logging.WARNING)
def potentially_slow():
    time.sleep(0.2)
```

### Authorization / Permission Check

```python
import functools
from typing import Callable

def require_permission(*permissions: str):
    """User ke permissions check karta hai execute karne se pehle."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Current user nikaalo (maan lo pehla arg ya context se aayega)
            user = kwargs.get("user") or (args[0] if args else None)
            if user is None:
                raise PermissionError("No user provided")

            missing = set(permissions) - set(user.get("permissions", []))
            if missing:
                raise PermissionError(
                    f"Missing permissions: {', '.join(missing)}"
                )
            return func(*args, **kwargs)
        return wrapper
    return decorator

@require_permission("admin", "write")
def delete_record(user: dict, record_id: int) -> None:
    print(f"Deleted record {record_id}")

# Chal jaayega
admin = {"name": "Alice", "permissions": ["admin", "write", "read"]}
delete_record(user=admin, record_id=42)

# Fail hoga
viewer = {"name": "Bob", "permissions": ["read"]}
delete_record(user=viewer, record_id=42)  # PermissionError!
```

Yeh bilkul waisa hai jaise Zomato admin panel mein "sirf restaurant owner hi menu delete kar sakta hai" — role check pehle, kaam baad mein.

### Rate Limiting

UPI transactions ki tarah — ek limit ke baad "try again later" bol dena padta hai:

```python
import functools
import time
from collections import deque

def rate_limit(calls: int, period: float):
    """`period` seconds mein max `calls` invocations allow karo."""
    def decorator(func):
        timestamps: deque = deque()

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            now = time.monotonic()

            # Window ke bahar wale timestamps hatao
            while timestamps and timestamps[0] <= now - period:
                timestamps.popleft()

            if len(timestamps) >= calls:
                wait = period - (now - timestamps[0])
                raise RuntimeError(
                    f"Rate limit exceeded. Try again in {wait:.1f}s"
                )

            timestamps.append(now)
            return func(*args, **kwargs)

        return wrapper
    return decorator

@rate_limit(calls=5, period=60.0)
def api_request(endpoint: str) -> dict:
    return {"endpoint": endpoint, "status": "ok"}
```

### Input Validation

```python
import functools
from typing import get_type_hints

def validate_types(func):
    """Decorator jo runtime pe check karta hai arguments type hints se match karte hain ya nahi."""
    hints = get_type_hints(func)

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Parameter names nikaalo
        import inspect
        sig = inspect.signature(func)
        bound = sig.bind(*args, **kwargs)
        bound.apply_defaults()

        for param_name, value in bound.arguments.items():
            if param_name in hints and param_name != "return":
                expected = hints[param_name]
                if not isinstance(value, expected):
                    raise TypeError(
                        f"Argument '{param_name}' expected {expected.__name__}, "
                        f"got {type(value).__name__}"
                    )
        return func(*args, **kwargs)

    return wrapper

@validate_types
def create_user(name: str, age: int, email: str) -> dict:
    return {"name": name, "age": age, "email": email}

create_user("Alice", 30, "alice@example.com")  # OK
create_user("Alice", "thirty", "alice@example.com")  # TypeError!
```

---

## Classes ko Decorate Karna

Decorators sirf functions pe nahi, poori classes pe bhi lag sakte hain.

```python
import functools
import dataclasses

def add_repr(cls):
    """Kisi bhi class mein __repr__ method add kar do."""
    def __repr__(self):
        attrs = ", ".join(f"{k}={v!r}" for k, v in self.__dict__.items())
        return f"{cls.__name__}({attrs})"
    cls.__repr__ = __repr__
    return cls

@add_repr
class User:
    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age

print(User("Alice", 30))  # User(name='Alice', age=30)

# Singleton pattern
def singleton(cls):
    """Class ka sirf ek hi instance ban paye, yeh ensure karta hai."""
    instances = {}

    @functools.wraps(cls)
    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]

    return get_instance

@singleton
class Database:
    def __init__(self, url: str):
        self.url = url
        print(f"Connecting to {url}")

db1 = Database("postgresql://localhost/mydb")  # "Connecting to..."
db2 = Database("postgresql://localhost/mydb")  # Koi output nahi -- same instance
print(db1 is db2)  # True

# Registry pattern
registry: dict[str, type] = {}

def register(cls):
    """Class ko ek global registry mein register kar do."""
    registry[cls.__name__] = cls
    return cls

@register
class UserHandler:
    pass

@register
class OrderHandler:
    pass

print(registry)  # {'UserHandler': <class 'UserHandler'>, 'OrderHandler': ...}
```

`singleton` pattern bilkul database connection pool jaisa concept hai — poori app mein ek hi `Database` object rahe, baar baar naya connection na bane.

---

## Async Decorators

```python
import functools
import asyncio
import time

def async_timer(func):
    """Async functions ke liye timer decorator."""
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = await func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__}: {elapsed:.4f}s")
        return result
    return wrapper

def async_retry(max_attempts: int = 3, delay: float = 1.0):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts:
                        raise
                    await asyncio.sleep(delay)
        return wrapper
    return decorator

@async_timer
@async_retry(max_attempts=3, delay=0.5)
async def fetch_data(url: str) -> dict:
    await asyncio.sleep(0.5)
    return {"url": url}
```

> [!tip]
> Async function ko decorate karte waqt wrapper bhi `async def` hona chahiye aur andar `await func(...)` karna hoga — normal decorator lagaoge toh coroutine object return hoga, actual result nahi.

---

## Practice Exercises

### Exercise 1: Debug Decorator
Ek `@debug` decorator banao jo:
- Entry pe function ka naam, arguments (unke types ke saath), aur keyword arguments log kare
- Exit pe return value (uske type ke saath) log kare
- Koi exception aaye toh usko log kare
- Execution time dikhaye
- Ek optional `verbose` flag ho jisse zyada/kam detail mile

### Exercise 2: Cache with Expiry
`@timed_cache(ttl_seconds=60)` decorator banao jo:
- `lru_cache` jaisa result cache kare
- TTL ke baad entries automatically expire ho jayein
- `cache_info()` method ho jo hits, misses, aur size dikhaye
- `cache_clear()` method ho
- Thread-safe ho

### Exercise 3: Decorator Stack
Yeh decorators banao aur stack karo:
- `@validate_args` -- type hints ke against argument types validate kare
- `@log_calls` -- har call ko args aur result ke saath log kare
- `@retry(n)` -- exception aane pe retry kare
- `@cache` -- results cache kare

Chaaron ko ek function pe apply karo aur verify karo ki saath mein sahi kaam karte hain. Optimal order pe socho.

### Exercise 4: Class Decorator
`@auto_init` class decorator banao jo class annotations se `__init__` automatically generate kare:
```python
@auto_init
class Point:
    x: float
    y: float
    label: str = "origin"

p = Point(1.0, 2.0)           # Chalega
p = Point(1.0, 2.0, "A")      # Chalega
print(p.x, p.y, p.label)      # 1.0 2.0 A
```
(Haan, yeh basically wahi kaam hai jo `@dataclass` karta hai -- lekin khud banao taaki samajh aaye kaise kaam karta hai.)

### Exercise 5: Middleware-Style Decorator
Express.js se inspired `@middleware` system banao:
```python
@middleware(before=log_request, after=log_response, on_error=handle_error)
def handle_request(request):
    return {"status": 200, "body": "OK"}
```
before/after/on_error hooks optional callables hone chahiye jinko call ke baare mein context milta ho.

## Key Takeaways
- Decorator factory matlab ek extra outer function jo config leta hai aur asli decorator return karta hai — jitni `()` lagti hain, utne layers.
- `@functools.wraps` hamesha lagao, warna function apna naam, docstring, aur metadata kho deta hai.
- Multiple decorators bottom-up wrap hote hain, top-down execute hote hain — order matter karta hai.
- State rakhni ho toh class-based decorator (`__call__` ke saath) use karo, function-based decorator mein state rakhna awkward hota hai.
- `functools.cache` / `lru_cache` / `cached_property` — expensive computation ko baar baar repeat karne se bachate hain, bas arguments hashable hone chahiye.
- Retry, rate-limit, auth-check, aur logging jaise cross-cutting concerns decorators mein daal do — business logic clean rehti hai.
- Decorators sirf functions pe nahi, classes pe bhi lag sakte hain (singleton, registry, auto-repr jaise patterns).
- Async functions ke liye wrapper bhi `async def` hona chahiye, warna coroutine hi return hoga, actual value nahi.
