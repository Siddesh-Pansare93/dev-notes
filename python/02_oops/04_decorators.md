# Decorators

> Python decorators for Node.js/TypeScript developers

---

## What Are Decorators?

Decorators are **higher-order functions** that modify or enhance other functions or classes. If you have used higher-order functions in JavaScript (middleware in Express, HOCs in React, or TS decorators), you already understand the core concept.

```python
# A decorator is just a function that takes a function and returns a function
def my_decorator(func):
    def wrapper(*args, **kwargs):
        print("Before the function call")
        result = func(*args, **kwargs)
        print("After the function call")
        return result
    return wrapper
```

```typescript
// TypeScript/JavaScript equivalent concept
function myDecorator(fn: Function) {
  return function (...args: any[]) {
    console.log("Before the function call");
    const result = fn(...args);
    console.log("After the function call");
    return result;
  };
}
```

---

## The `@` Syntax Sugar

The `@` symbol is just syntactic sugar for wrapping a function with a decorator.

```python
# These two are EXACTLY the same:

# With @ syntax
@my_decorator
def say_hello(name: str) -> str:
    return f"Hello, {name}!"

# Without @ syntax (what it actually does)
def say_hello(name: str) -> str:
    return f"Hello, {name}!"
say_hello = my_decorator(say_hello)
```

TypeScript has experimental decorators (stage 3 proposal), but they work differently - they are primarily for classes, methods, and properties, not standalone functions.

---

## Function Decorators: Wrapping Functions

### Timing Decorator

```python
import time
from functools import wraps


def timer(func):
    """Measure execution time of a function."""
    @wraps(func)  # preserves the original function's name and docstring
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper


@timer
def fetch_users(count: int) -> list[str]:
    """Fetch users from database."""
    time.sleep(0.1)  # simulate DB call
    return [f"user_{i}" for i in range(count)]


users = fetch_users(100)
# fetch_users took 0.1004s

# Thanks to @wraps, metadata is preserved
print(fetch_users.__name__)  # fetch_users (not 'wrapper')
print(fetch_users.__doc__)   # Fetch users from database.
```

### Retry Decorator

```python
import time
from functools import wraps


def retry(max_attempts: int = 3, delay: float = 1.0, backoff: float = 2.0):
    """Retry a function on failure with exponential backoff.

    This is a decorator FACTORY - it returns a decorator.
    Compare with: npm packages like 'async-retry' or 'p-retry'.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            current_delay = delay
            last_exception = None

            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_attempts:
                        print(
                            f"Attempt {attempt}/{max_attempts} failed: {e}. "
                            f"Retrying in {current_delay}s..."
                        )
                        time.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        print(f"All {max_attempts} attempts failed.")

            raise last_exception
        return wrapper
    return decorator


@retry(max_attempts=3, delay=0.5, backoff=2.0)
def call_external_api(url: str) -> dict:
    """Call an unreliable external API."""
    import random
    if random.random() < 0.7:
        raise ConnectionError(f"Failed to connect to {url}")
    return {"status": "ok", "data": [1, 2, 3]}


# Will retry up to 3 times with exponential backoff
try:
    result = call_external_api("https://api.example.com/data")
    print(result)
except ConnectionError:
    print("Service unavailable after all retries")
```

```typescript
// TypeScript equivalent - you'd typically use a library
import pRetry from "p-retry";

async function callExternalApi(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed");
  return response.json();
}

// No decorator syntax - wrap manually
const reliableApi = () =>
  pRetry(() => callExternalApi("https://api.example.com"), { retries: 3 });
```

### Caching Decorator

```python
from functools import wraps


def cache(max_size: int = 128):
    """Simple LRU-like cache decorator.

    Python also has @functools.lru_cache built-in!
    """
    def decorator(func):
        _cache: dict = {}
        _order: list = []

        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create a hashable key from the arguments
            key = (args, tuple(sorted(kwargs.items())))

            if key in _cache:
                print(f"Cache hit for {func.__name__}{args}")
                return _cache[key]

            result = func(*args, **kwargs)

            if len(_cache) >= max_size:
                oldest = _order.pop(0)
                del _cache[oldest]

            _cache[key] = result
            _order.append(key)
            return result

        wrapper.cache_clear = lambda: (_cache.clear(), _order.clear())
        wrapper.cache_info = lambda: {
            "size": len(_cache),
            "max_size": max_size,
        }
        return wrapper
    return decorator


@cache(max_size=50)
def expensive_computation(n: int) -> int:
    """Simulate expensive work."""
    print(f"Computing for {n}...")
    return sum(i * i for i in range(n))


print(expensive_computation(1000))  # Computing for 1000... -> 332833500
print(expensive_computation(1000))  # Cache hit -> 332833500
print(expensive_computation.cache_info())  # {'size': 1, 'max_size': 50}
```

**Pro tip**: Python has a built-in caching decorator:

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def fibonacci(n: int) -> int:
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(100))  # instant - thanks to caching
print(fibonacci.cache_info())
# CacheInfo(hits=98, misses=101, maxsize=128, currsize=101)
```

---

## `@property` - Getter/Setter like JS `get`/`set`

`@property` is Python's equivalent of JavaScript's `get` and `set` accessors. It lets you access computed values like attributes.

```python
class Circle:
    def __init__(self, radius: float):
        self._radius = radius

    @property
    def radius(self) -> float:
        """The radius of the circle."""
        return self._radius

    @radius.setter
    def radius(self, value: float) -> None:
        if value < 0:
            raise ValueError("Radius cannot be negative")
        self._radius = value

    @property
    def diameter(self) -> float:
        """Computed property - no setter means read-only."""
        return self._radius * 2

    @property
    def area(self) -> float:
        """Computed property."""
        import math
        return math.pi * self._radius ** 2

    @property
    def circumference(self) -> float:
        import math
        return 2 * math.pi * self._radius


c = Circle(5)
print(c.radius)          # 5 (looks like attribute access, calls getter)
print(c.diameter)        # 10 (computed on the fly)
print(c.area)            # 78.54... (computed)

c.radius = 10            # calls setter with validation
print(c.area)            # 314.15...

c.radius = -1            # ValueError: Radius cannot be negative

c.diameter = 20          # AttributeError: can't set attribute (no setter defined)
```

```typescript
// TypeScript equivalent
class Circle {
  private _radius: number;

  constructor(radius: number) {
    this._radius = radius;
  }

  get radius(): number {
    return this._radius;
  }

  set radius(value: number) {
    if (value < 0) throw new Error("Radius cannot be negative");
    this._radius = value;
  }

  get diameter(): number {
    return this._radius * 2;
  }

  get area(): number {
    return Math.PI * this._radius ** 2;
  }
}
```

### Real-World Example: User Model with Properties

```python
class User:
    def __init__(self, first_name: str, last_name: str, email: str):
        self.first_name = first_name
        self.last_name = last_name
        self._email = email
        self._is_active = True

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def email(self) -> str:
        return self._email

    @email.setter
    def email(self, value: str) -> None:
        if "@" not in value:
            raise ValueError(f"Invalid email: {value}")
        self._email = value.lower().strip()

    @property
    def is_active(self) -> bool:
        return self._is_active

    @property
    def display_name(self) -> str:
        status = "active" if self._is_active else "inactive"
        return f"{self.full_name} <{self.email}> [{status}]"

    def deactivate(self) -> None:
        self._is_active = False


user = User("Alice", "Smith", "Alice@Example.COM")
print(user.email)        # alice@example.com (setter normalized it? No - __init__ assigned directly)
user.email = "  ALICE@GMAIL.COM  "
print(user.email)        # alice@gmail.com (setter normalized)
print(user.full_name)    # Alice Smith
print(user.display_name) # Alice Smith <alice@gmail.com> [active]
```

---

## `@staticmethod` vs Static Methods in JS

Static methods belong to the class, not instances. They do not receive `self` or `cls`.

```python
class MathUtils:
    @staticmethod
    def clamp(value: float, min_val: float, max_val: float) -> float:
        """Clamp a value between min and max."""
        return max(min_val, min(value, max_val))

    @staticmethod
    def lerp(a: float, b: float, t: float) -> float:
        """Linear interpolation between a and b."""
        return a + (b - a) * t

    @staticmethod
    def is_close(a: float, b: float, tolerance: float = 1e-9) -> bool:
        return abs(a - b) < tolerance


# Call on the class directly (no instance needed)
print(MathUtils.clamp(150, 0, 100))  # 100
print(MathUtils.lerp(0, 100, 0.5))   # 50.0

# Also works on instances (but unusual)
utils = MathUtils()
print(utils.clamp(150, 0, 100))  # 100
```

```typescript
// TypeScript equivalent
class MathUtils {
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
  }

  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}
```

---

## `@classmethod` - No Direct JS Equivalent

Class methods receive the **class itself** as the first argument (`cls`), not an instance. This is commonly used for **factory methods** and **alternative constructors**.

```python
import json
from datetime import datetime


class Event:
    def __init__(self, name: str, timestamp: datetime, metadata: dict | None = None):
        self.name = name
        self.timestamp = timestamp
        self.metadata = metadata or {}

    @classmethod
    def from_dict(cls, data: dict) -> "Event":
        """Factory: create Event from a dictionary."""
        return cls(
            name=data["name"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            metadata=data.get("metadata", {}),
        )

    @classmethod
    def from_json(cls, json_string: str) -> "Event":
        """Factory: create Event from JSON string."""
        data = json.loads(json_string)
        return cls.from_dict(data)

    @classmethod
    def now(cls, name: str, **metadata) -> "Event":
        """Factory: create Event with current timestamp."""
        return cls(name=name, timestamp=datetime.now(), metadata=metadata)

    def __repr__(self) -> str:
        return f"Event('{self.name}', {self.timestamp.isoformat()})"


# Multiple ways to create an Event
e1 = Event("click", datetime.now())
e2 = Event.from_dict({"name": "pageview", "timestamp": "2024-01-15T10:30:00"})
e3 = Event.from_json('{"name": "signup", "timestamp": "2024-01-15T11:00:00"}')
e4 = Event.now("api_call", endpoint="/users", method="GET")

print(e1)  # Event('click', 2024-01-15T...)
print(e2)  # Event('pageview', 2024-01-15T10:30:00)
print(e3)  # Event('signup', 2024-01-15T11:00:00)
```

### Why `cls` instead of the class name?

Because `@classmethod` works correctly with inheritance - `cls` refers to the actual class being called:

```python
class BaseModel:
    @classmethod
    def create(cls, **kwargs) -> "BaseModel":
        print(f"Creating {cls.__name__}")
        instance = cls.__new__(cls)
        for key, value in kwargs.items():
            setattr(instance, key, value)
        return instance


class UserModel(BaseModel):
    pass


class ProductModel(BaseModel):
    pass


# cls is UserModel, not BaseModel!
user = UserModel.create(name="Alice", role="admin")
print(type(user))  # <class 'UserModel'>

product = ProductModel.create(name="Widget", price=9.99)
print(type(product))  # <class 'ProductModel'>
```

```typescript
// TypeScript doesn't have classmethod, but you can use static methods
// However, they don't automatically know the subclass:
class BaseModel {
  static create(data: Record<string, unknown>): BaseModel {
    // Always returns BaseModel, not the subclass
    // You'd need generics and factory patterns to work around this
    return Object.assign(new this(), data);
  }
}
```

### `@staticmethod` vs `@classmethod`

| Feature | `@staticmethod` | `@classmethod` |
|---------|----------------|----------------|
| First argument | None | `cls` (the class) |
| Can access class | Only by name | Via `cls` parameter |
| Works with inheritance | Hardcoded to one class | Automatically uses subclass |
| Use case | Utility functions | Factory methods, alternate constructors |

```python
class Config:
    _defaults = {"debug": False, "log_level": "INFO"}

    def __init__(self, **overrides):
        self.settings = {**self._defaults, **overrides}

    @staticmethod
    def validate_log_level(level: str) -> bool:
        """Static: doesn't need class or instance."""
        return level in ("DEBUG", "INFO", "WARNING", "ERROR")

    @classmethod
    def for_development(cls) -> "Config":
        """Classmethod: factory that creates a pre-configured instance."""
        return cls(debug=True, log_level="DEBUG")

    @classmethod
    def for_production(cls) -> "Config":
        return cls(debug=False, log_level="WARNING")


dev_config = Config.for_development()
prod_config = Config.for_production()
print(dev_config.settings)   # {'debug': True, 'log_level': 'DEBUG'}
print(prod_config.settings)  # {'debug': False, 'log_level': 'WARNING'}
```

---

## Writing Custom Decorators with `functools.wraps`

Always use `@functools.wraps` in your decorators. Without it, the decorated function loses its name, docstring, and other metadata.

### Decorator without arguments

```python
from functools import wraps


def log_calls(func):
    """Log every call to the decorated function."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        args_str = ", ".join([repr(a) for a in args])
        kwargs_str = ", ".join([f"{k}={v!r}" for k, v in kwargs.items()])
        all_args = ", ".join(filter(None, [args_str, kwargs_str]))
        print(f"-> {func.__name__}({all_args})")

        result = func(*args, **kwargs)

        print(f"<- {func.__name__} returned {result!r}")
        return result
    return wrapper


@log_calls
def add(a: int, b: int) -> int:
    return a + b


add(3, 5)
# -> add(3, 5)
# <- add returned 8
```

### Decorator with arguments (decorator factory)

```python
from functools import wraps


def require_role(*allowed_roles: str):
    """Decorator factory that checks user role before executing."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Simulate getting current user (in real code, from request context)
            current_user = kwargs.get("current_user", {})
            user_role = current_user.get("role", "anonymous")

            if user_role not in allowed_roles:
                raise PermissionError(
                    f"Role '{user_role}' not allowed. "
                    f"Required: {allowed_roles}"
                )
            return func(*args, **kwargs)
        return wrapper
    return decorator


@require_role("admin", "moderator")
def delete_user(user_id: str, current_user: dict) -> str:
    return f"Deleted user {user_id}"


@require_role("admin")
def reset_database(current_user: dict) -> str:
    return "Database reset"


# Works for admin
print(delete_user("u123", current_user={"role": "admin"}))
# "Deleted user u123"

# Fails for regular user
try:
    delete_user("u123", current_user={"role": "user"})
except PermissionError as e:
    print(e)  # Role 'user' not allowed. Required: ('admin', 'moderator')
```

### Stacking Decorators

Decorators can be stacked. They apply bottom-up (the one closest to the function runs first).

```python
@timer
@log_calls
@retry(max_attempts=3, delay=0.1)
def fetch_data(url: str) -> dict:
    """Fetch data from URL."""
    import random
    if random.random() < 0.5:
        raise ConnectionError("timeout")
    return {"data": "success"}


# Execution order:
# 1. timer starts timing
# 2. log_calls logs the call
# 3. retry handles failures
# 4. fetch_data actually runs
```

### Class-Based Decorator

You can also implement decorators as classes using `__call__`:

```python
class Throttle:
    """Class-based decorator - throttle function calls."""

    def __init__(self, min_interval: float):
        self.min_interval = min_interval
        self.last_call = 0.0

    def __call__(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            import time
            now = time.time()
            elapsed = now - self.last_call
            if elapsed < self.min_interval:
                wait = self.min_interval - elapsed
                print(f"Throttled: waiting {wait:.2f}s")
                time.sleep(wait)
            self.last_call = time.time()
            return func(*args, **kwargs)
        return wrapper


@Throttle(min_interval=2.0)
def send_notification(message: str) -> None:
    print(f"Sent: {message}")


send_notification("Hello")    # Sent: Hello
send_notification("World")    # Throttled: waiting 1.98s -> Sent: World
```

---

## Built-in Decorators Overview

| Decorator | Purpose | JS Equivalent |
|-----------|---------|---------------|
| `@property` | Getter/setter | `get`/`set` |
| `@staticmethod` | Static method | `static` |
| `@classmethod` | Class-level factory method | No direct equivalent |
| `@abstractmethod` | Require implementation in subclass | `abstract` in TS |
| `@functools.wraps` | Preserve function metadata | N/A |
| `@functools.lru_cache` | Memoize function results | Manual or lodash `_.memoize` |
| `@functools.cached_property` | Lazy computed property | Getter with manual cache |
| `@functools.total_ordering` | Auto-generate comparison methods | N/A |
| `@dataclasses.dataclass` | Auto-generate class boilerplate | N/A |
| `@typing.override` | Mark method as override | `override` keyword in TS |

---

## Practice Exercises

### Exercise 1: Validation Decorator

Create a `@validate_types` decorator that checks function argument types at runtime:

```python
@validate_types
def create_user(name: str, age: int, email: str) -> dict:
    return {"name": name, "age": age, "email": email}

create_user("Alice", 30, "alice@example.com")  # Works
create_user("Alice", "thirty", "alice@example.com")  # TypeError!
```

Hint: Use `func.__annotations__` to get type hints.

### Exercise 2: Caching with TTL

Create a `@cache_with_ttl(seconds=60)` decorator that:
- Caches function results
- Expires cache entries after the TTL
- Has `.cache_clear()` and `.cache_info()` methods
- Works with keyword arguments

### Exercise 3: Express-Style Middleware

Create a decorator system that mimics Express.js middleware:

```python
@middleware(auth_required=True, roles=["admin"])
@middleware(rate_limit=100, window=60)
@middleware(log_request=True)
def handle_request(request: dict) -> dict:
    return {"status": 200, "data": request.get("body")}
```

### Exercise 4: Property with Validation

Create a reusable `validated_property` descriptor/decorator that adds type checking and custom validation:

```python
class User:
    name = validated_property(str, min_length=1, max_length=100)
    age = validated_property(int, min_value=0, max_value=150)
    email = validated_property(str, pattern=r"^[\w.]+@[\w.]+\.\w+$")
```

---

## Key Takeaways for Node.js Developers

1. **Decorators are just higher-order functions** - if you understand middleware or HOCs, you understand decorators
2. **`@` is syntactic sugar** for `func = decorator(func)`
3. **Always use `@functools.wraps`** to preserve function metadata
4. **`@property`** = JavaScript `get`/`set` but with decorator syntax
5. **`@classmethod`** is unique to Python - factory methods that know which class they are on
6. **`@staticmethod`** = TypeScript `static` but without access to `cls`
7. **Decorators compose** - stack them for cross-cutting concerns like logging, caching, auth
8. **Python decorators are runtime** - TypeScript decorators are compile-time metadata (different purpose)
