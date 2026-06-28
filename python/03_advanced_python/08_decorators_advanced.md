# Advanced Decorators

## Beyond the Basics

You've seen simple decorators. Now let's explore the advanced patterns that make Python decorators one of the language's most powerful metaprogramming features. JavaScript/TypeScript has experimental decorators (Stage 3), but Python's are more mature and widely used.

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

# @decorator is syntax sugar for:
# greet = my_decorator(greet)
```

```typescript
// TypeScript decorator (different mechanism, class-focused)
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

> **Key difference**: Python decorators work on any function (or class). TypeScript decorators are primarily for class members. Python decorators are just functions that take a function and return a function -- no special syntax or protocol.

---

## Decorator Factories (Decorators with Arguments)

When you need a decorator that takes parameters, you add an outer function:

```python
import functools
import time

# Decorator WITHOUT arguments
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

# Without arguments but with parentheses
@timer_with_label()
def fast_function():
    pass
```

### Flexible Decorator: Works With or Without Arguments

```python
import functools

def flexible_decorator(func=None, *, retries=3, delay=1.0):
    """Can be used as @flexible_decorator or @flexible_decorator(retries=5)."""

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
        # Called without arguments: @flexible_decorator
        return decorator(func)
    else:
        # Called with arguments: @flexible_decorator(retries=5)
        return decorator

# Both work:
@flexible_decorator
def api_call_v1():
    pass

@flexible_decorator(retries=5, delay=2.0)
def api_call_v2():
    pass
```

---

## `functools.wraps` and Why It Matters

Without `@functools.wraps`, the decorator replaces the original function's metadata:

```python
def bad_decorator(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

def good_decorator(func):
    @functools.wraps(func)  # Preserves original function's metadata
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@bad_decorator
def my_func():
    """My docstring."""
    pass

print(my_func.__name__)    # "wrapper" (wrong!)
print(my_func.__doc__)     # None (lost!)

@good_decorator
def my_func():
    """My docstring."""
    pass

print(my_func.__name__)    # "my_func" (correct!)
print(my_func.__doc__)     # "My docstring." (preserved!)
print(my_func.__wrapped__)  # Original function (added by wraps)
```

**Always use `@functools.wraps`** -- it copies `__name__`, `__qualname__`, `__doc__`, `__dict__`, `__module__`, and `__annotations__`, and adds `__wrapped__` to access the original function.

---

## Stacking Multiple Decorators

Decorators execute bottom-up (closest to the function first), but their wrapper functions execute top-down:

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

# This is equivalent to:
# greet = bold(italic(underline(greet)))
# Execution order: underline wraps first, italic wraps second, bold wraps third
# But when called: bold's wrapper runs first -> italic's -> underline's -> original
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

---

## Class-Based Decorators

Use a class with `__call__` when your decorator needs to maintain state:

```python
class CountCalls:
    """Decorator that counts how many times a function is called."""

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

### Class Decorator with Arguments

```python
class Retry:
    """Decorator class with configurable retry logic."""

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

---

## `functools.lru_cache` and `@cache` -- Memoization

### `@functools.cache` (Python 3.9+)

Simple unbounded cache:

```python
import functools

@functools.cache
def fibonacci(n: int) -> int:
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Without cache: fibonacci(35) takes seconds (exponential time)
# With cache: fibonacci(35) is instant (linear time, each value computed once)
print(fibonacci(100))  # Instant!

# Cache info
print(fibonacci.cache_info())
# CacheInfo(hits=98, misses=101, maxsize=None, currsize=101)

# Clear cache
fibonacci.cache_clear()
```

### `@functools.lru_cache` -- Bounded Cache

```python
@functools.lru_cache(maxsize=128)  # Keep last 128 results
def expensive_computation(x: int, y: int) -> int:
    """Only first call with given args computes; rest are cached."""
    time.sleep(1)  # Simulate expensive work
    return x ** y

# First call: slow (computes)
result1 = expensive_computation(2, 10)  # Takes 1 second

# Second call with same args: instant (cached)
result2 = expensive_computation(2, 10)  # Instant!

# IMPORTANT: Arguments must be hashable (no lists, dicts)
# This will ERROR:
# @functools.lru_cache
# def bad(data: list) -> int:  # list is not hashable
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

Compute once, cache as property:

```python
import functools

class DataAnalyzer:
    def __init__(self, data: list[float]) -> None:
        self.data = data

    @functools.cached_property
    def mean(self) -> float:
        """Computed only once, then cached."""
        print("Computing mean...")
        return sum(self.data) / len(self.data)

    @functools.cached_property
    def std_dev(self) -> float:
        """Also computed only once."""
        print("Computing std_dev...")
        variance = sum((x - self.mean) ** 2 for x in self.data) / len(self.data)
        return variance ** 0.5

analyzer = DataAnalyzer([1, 2, 3, 4, 5])
print(analyzer.mean)      # "Computing mean..." then 3.0
print(analyzer.mean)      # 3.0 (no recomputation!)
print(analyzer.std_dev)   # "Computing std_dev..." then 1.414...
```

```typescript
// TypeScript doesn't have built-in cached_property
// Closest approach: manual lazy getter
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
                    # Add jitter to prevent thundering herd
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
    """Decorator that checks user permissions before executing."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Get current user (assume first arg or from context)
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

# Works
admin = {"name": "Alice", "permissions": ["admin", "write", "read"]}
delete_record(user=admin, record_id=42)

# Fails
viewer = {"name": "Bob", "permissions": ["read"]}
delete_record(user=viewer, record_id=42)  # PermissionError!
```

### Rate Limiting

```python
import functools
import time
from collections import deque

def rate_limit(calls: int, period: float):
    """Allow max `calls` invocations per `period` seconds."""
    def decorator(func):
        timestamps: deque = deque()

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            now = time.monotonic()

            # Remove timestamps outside the window
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
    """Decorator that validates argument types match type hints at runtime."""
    hints = get_type_hints(func)

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Get parameter names
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

## Decorating Classes

Decorators can also be applied to entire classes:

```python
import functools
import dataclasses

def add_repr(cls):
    """Add a __repr__ method to any class."""
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
    """Ensure only one instance of a class exists."""
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
db2 = Database("postgresql://localhost/mydb")  # No output -- same instance
print(db1 is db2)  # True

# Registry pattern
registry: dict[str, type] = {}

def register(cls):
    """Register a class in a global registry."""
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

---

## Async Decorators

```python
import functools
import asyncio
import time

def async_timer(func):
    """Timer decorator for async functions."""
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

---

## Practice Exercises

### Exercise 1: Debug Decorator
Create a `@debug` decorator that:
- Logs function name, arguments (with types), and keyword arguments on entry
- Logs the return value (with type) on exit
- Logs any exception raised
- Shows execution time
- Has an optional `verbose` flag for more/less detail

### Exercise 2: Cache with Expiry
Build a `@timed_cache(ttl_seconds=60)` decorator that:
- Caches results like `lru_cache`
- Automatically expires entries after TTL
- Has a `cache_info()` method showing hits, misses, and size
- Has a `cache_clear()` method
- Is thread-safe

### Exercise 3: Decorator Stack
Create these decorators and stack them:
- `@validate_args` -- validates argument types against type hints
- `@log_calls` -- logs every call with args and result
- `@retry(n)` -- retries on exception
- `@cache` -- caches results

Apply all four to a function and verify they work correctly together. Think about the optimal order.

### Exercise 4: Class Decorator
Create a `@auto_init` class decorator that automatically generates `__init__` from class annotations:
```python
@auto_init
class Point:
    x: float
    y: float
    label: str = "origin"

p = Point(1.0, 2.0)           # Works
p = Point(1.0, 2.0, "A")      # Works
print(p.x, p.y, p.label)      # 1.0 2.0 A
```
(Yes, this is essentially what `@dataclass` does -- but build it yourself to understand it.)

### Exercise 5: Middleware-Style Decorator
Build a `@middleware` system inspired by Express.js:
```python
@middleware(before=log_request, after=log_response, on_error=handle_error)
def handle_request(request):
    return {"status": 200, "body": "OK"}
```
The before/after/on_error hooks should be optional callables that receive context about the call.
