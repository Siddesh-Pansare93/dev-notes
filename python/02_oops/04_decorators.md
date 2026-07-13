# Decorators

> Python decorators, Node.js/TypeScript developers ke liye

---

## Decorators Hote Kya Hain?

Decorators basically **higher-order functions** hain jo doosre functions ya classes ko modify/enhance karte hain. Agar tumne JavaScript mein higher-order functions use kiye hain — Express ke middleware, React ke HOCs, ya TS decorators — toh core concept tumhe already pata hai. Bas naam alag hai.

```python
# Decorator ek function hi hai jo function leta hai aur function return karta hai
def my_decorator(func):
    def wrapper(*args, **kwargs):
        print("Before the function call")
        result = func(*args, **kwargs)
        print("After the function call")
        return result
    return wrapper
```

```typescript
// TypeScript/JavaScript mein wahi concept
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

## `@` Syntax Sugar

`@` symbol sirf syntactic sugar hai — kisi function ko decorator se wrap karne ka shortcut.

```python
# Ye dono EXACTLY same hain:

# @ syntax ke saath
@my_decorator
def say_hello(name: str) -> str:
    return f"Hello, {name}!"

# @ syntax ke bina (actually ye hi hota hai peeche)
def say_hello(name: str) -> str:
    return f"Hello, {name}!"
say_hello = my_decorator(say_hello)
```

TypeScript mein experimental decorators hain (stage 3 proposal), lekin unka kaam alag tarike se hota hai — wo mainly classes, methods, aur properties ke liye hain, standalone functions ke liye nahi.

---

## Function Decorators: Functions Ko Wrap Karna

### Timing Decorator

Socho tumhe pata karna hai ki koi function kitna time le raha hai — jaise Zomato app mein "order fetch" API kitni der lagi. Decorator se ye ek hi jagah handle ho jayega, har function mein baar-baar timer code likhne ki zarurat nahi.

```python
import time
from functools import wraps


def timer(func):
    """Function ka execution time measure karta hai."""
    @wraps(func)  # original function ka naam aur docstring preserve karta hai
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} took {elapsed:.4f}s")
        return result
    return wrapper


@timer
def fetch_users(count: int) -> list[str]:
    """Database se users fetch karta hai."""
    time.sleep(0.1)  # DB call simulate kar rahe hain
    return [f"user_{i}" for i in range(count)]


users = fetch_users(100)
# fetch_users took 0.1004s

# @wraps ki wajah se metadata safe rehta hai
print(fetch_users.__name__)  # fetch_users ('wrapper' nahi)
print(fetch_users.__doc__)   # Database se users fetch karta hai.
```

> [!tip]
> `@wraps` na lagao toh `fetch_users.__name__` "wrapper" print hoga, actual naam nahi. Debugging aur logging ke liye ye pain create karta hai — isliye har decorator mein `@wraps` daalna habit bana lo.

### Retry Decorator

Ye wala decorator un cases ke liye hai jahan external API flaky ho — jaise koi third-party payment gateway jo kabhi-kabhi timeout kar jaata hai. Instead of manually try-catch-retry likhne ke, ek decorator bana lo aur reuse karo.

```python
import time
from functools import wraps


def retry(max_attempts: int = 3, delay: float = 1.0, backoff: float = 2.0):
    """Failure par exponential backoff ke saath function retry karta hai.

    Ye ek decorator FACTORY hai - ye decorator return karta hai.
    Compare karo npm packages jaise 'async-retry' ya 'p-retry' se.
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
    """Ek unreliable external API ko call karta hai."""
    import random
    if random.random() < 0.7:
        raise ConnectionError(f"Failed to connect to {url}")
    return {"status": "ok", "data": [1, 2, 3]}


# 3 baar tak exponential backoff ke saath retry karega
try:
    result = call_external_api("https://api.example.com/data")
    print(result)
except ConnectionError:
    print("Service unavailable after all retries")
```

```typescript
// TypeScript equivalent - generally ek library use karoge
import pRetry from "p-retry";

async function callExternalApi(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed");
  return response.json();
}

// Decorator syntax nahi hai - manually wrap karna padega
const reliableApi = () =>
  pRetry(() => callExternalApi("https://api.example.com"), { retries: 3 });
```

### Caching Decorator

Socho ek second ke liye — agar tumhare paas ek expensive calculation hai jo baar-baar same input ke saath call ho rahi hai (jaise Swiggy ka "nearby restaurants" calculation same location ke liye), toh kyun har baar re-compute karna? Cache kar do, result seedha return karo.

```python
from functools import wraps


def cache(max_size: int = 128):
    """Simple LRU-jaisa cache decorator.

    Python mein already built-in @functools.lru_cache bhi hai!
    """
    def decorator(func):
        _cache: dict = {}
        _order: list = []

        @wraps(func)
        def wrapper(*args, **kwargs):
            # Arguments se ek hashable key banao
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
    """Expensive kaam simulate karta hai."""
    print(f"Computing for {n}...")
    return sum(i * i for i in range(n))


print(expensive_computation(1000))  # Computing for 1000... -> 332833500
print(expensive_computation(1000))  # Cache hit -> 332833500
print(expensive_computation.cache_info())  # {'size': 1, 'max_size': 50}
```

> [!tip]
> Ye sab manually likhne ki zarurat nahi — Python ka built-in caching decorator use karo:

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def fibonacci(n: int) -> int:
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(100))  # instant - caching ki wajah se
print(fibonacci.cache_info())
# CacheInfo(hits=98, misses=101, maxsize=128, currsize=101)
```

---

## `@property` — JS ke `get`/`set` Jaisa

`@property` Python mein JavaScript ke `get` aur `set` accessors ka hi version hai. Isse tum computed values ko attribute jaise access kar paate ho — bina function call `()` likhe.

```python
class Circle:
    def __init__(self, radius: float):
        self._radius = radius

    @property
    def radius(self) -> float:
        """Circle ka radius."""
        return self._radius

    @radius.setter
    def radius(self, value: float) -> None:
        if value < 0:
            raise ValueError("Radius cannot be negative")
        self._radius = value

    @property
    def diameter(self) -> float:
        """Computed property - setter nahi hai matlab read-only hai."""
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
print(c.radius)          # 5 (attribute jaisa dikhta hai, actually getter call hota hai)
print(c.diameter)        # 10 (on the fly compute hota hai)
print(c.area)            # 78.54... (compute)

c.radius = 10            # setter call hota hai validation ke saath
print(c.area)            # 314.15...

c.radius = -1            # ValueError: Radius cannot be negative

c.diameter = 20          # AttributeError: can't set attribute (setter defined nahi hai)
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

### Real-World Example: Properties Wala User Model

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
print(user.email)        # alice@example.com (setter ne normalize kiya? Nahi - __init__ ne directly assign kiya)
user.email = "  ALICE@GMAIL.COM  "
print(user.email)        # alice@gmail.com (is baar setter ne normalize kiya)
print(user.full_name)    # Alice Smith
print(user.display_name) # Alice Smith <alice@gmail.com> [active]
```

> [!warning]
> Upar `__init__` mein `self._email = email` seedha assign hua hai — setter (`self.email = email`) ke through nahi gaya, isliye pehla print bina lowercase-strip ke aa sakta hai. Real code mein aksar `__init__` mein bhi setter use karna better hota hai (`self.email = email`) taaki validation hamesha lage.

---

## `@staticmethod` vs JS Ke Static Methods

Static methods class ke hote hain, instance ke nahi. Inhe `self` ya `cls` kuch bhi automatically nahi milta.

```python
class MathUtils:
    @staticmethod
    def clamp(value: float, min_val: float, max_val: float) -> float:
        """Value ko min aur max ke beech clamp karta hai."""
        return max(min_val, min(value, max_val))

    @staticmethod
    def lerp(a: float, b: float, t: float) -> float:
        """a aur b ke beech linear interpolation."""
        return a + (b - a) * t

    @staticmethod
    def is_close(a: float, b: float, tolerance: float = 1e-9) -> bool:
        return abs(a - b) < tolerance


# Class par directly call karo (instance ki zarurat nahi)
print(MathUtils.clamp(150, 0, 100))  # 100
print(MathUtils.lerp(0, 100, 0.5))   # 50.0

# Instance par bhi kaam karta hai (par unusual hai)
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

## `@classmethod` — Direct JS Equivalent Nahi Hai

Class methods ko first argument mein **class khud** milti hai (`cls`), instance nahi. Ye commonly **factory methods** aur **alternative constructors** ke liye use hota hai.

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
        """Factory: dictionary se Event banao."""
        return cls(
            name=data["name"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            metadata=data.get("metadata", {}),
        )

    @classmethod
    def from_json(cls, json_string: str) -> "Event":
        """Factory: JSON string se Event banao."""
        data = json.loads(json_string)
        return cls.from_dict(data)

    @classmethod
    def now(cls, name: str, **metadata) -> "Event":
        """Factory: current timestamp ke saath Event banao."""
        return cls(name=name, timestamp=datetime.now(), metadata=metadata)

    def __repr__(self) -> str:
        return f"Event('{self.name}', {self.timestamp.isoformat()})"


# Event banane ke multiple tarike
e1 = Event("click", datetime.now())
e2 = Event.from_dict({"name": "pageview", "timestamp": "2024-01-15T10:30:00"})
e3 = Event.from_json('{"name": "signup", "timestamp": "2024-01-15T11:00:00"}')
e4 = Event.now("api_call", endpoint="/users", method="GET")

print(e1)  # Event('click', 2024-01-15T...)
print(e2)  # Event('pageview', 2024-01-15T10:30:00)
print(e3)  # Event('signup', 2024-01-15T11:00:00)
```

### Class Name Ki Jagah `cls` Kyun?

Kyunki `@classmethod` inheritance ke saath sahi kaam karta hai — `cls` hamesha us actual class ko point karta hai jispe call hua hai, na ki hardcoded parent class ko.

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


# cls yahan UserModel hai, BaseModel nahi!
user = UserModel.create(name="Alice", role="admin")
print(type(user))  # <class 'UserModel'>

product = ProductModel.create(name="Widget", price=9.99)
print(type(product))  # <class 'ProductModel'>
```

```typescript
// TypeScript mein classmethod nahi hota, static methods use kar sakte ho
// Lekin wo automatically subclass nahi jaante:
class BaseModel {
  static create(data: Record<string, unknown>): BaseModel {
    // Hamesha BaseModel return karega, subclass nahi
    // Iske liye generics aur factory patterns lagane padenge
    return Object.assign(new this(), data);
  }
}
```

### `@staticmethod` vs `@classmethod`

| Feature | `@staticmethod` | `@classmethod` |
|---------|----------------|----------------|
| First argument | Kuch nahi | `cls` (class) |
| Class access | Sirf naam se | `cls` parameter se |
| Inheritance ke saath | Ek hi class ke liye hardcoded | Automatically subclass use karta hai |
| Use case | Utility functions | Factory methods, alternate constructors |

```python
class Config:
    _defaults = {"debug": False, "log_level": "INFO"}

    def __init__(self, **overrides):
        self.settings = {**self._defaults, **overrides}

    @staticmethod
    def validate_log_level(level: str) -> bool:
        """Static: class ya instance dono ki zarurat nahi."""
        return level in ("DEBUG", "INFO", "WARNING", "ERROR")

    @classmethod
    def for_development(cls) -> "Config":
        """Classmethod: pre-configured instance banane wali factory."""
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

## `functools.wraps` Ke Saath Custom Decorators Likhna

Apne decorators mein hamesha `@functools.wraps` use karo. Iske bina decorated function apna naam, docstring, aur baaki metadata kho deta hai.

### Bina Arguments Wala Decorator

```python
from functools import wraps


def log_calls(func):
    """Decorated function ki har call ko log karta hai."""
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

### Arguments Wala Decorator (Decorator Factory)

Ye pattern Express-style middleware jaisa hai — jahan tum middleware ko config (jaise allowed roles) ke saath pass karte ho.

```python
from functools import wraps


def require_role(*allowed_roles: str):
    """Decorator factory jo function chalane se pehle user role check karta hai."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Current user simulate kar rahe hain (real code mein request context se aata hai)
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


# Admin ke liye kaam karega
print(delete_user("u123", current_user={"role": "admin"}))
# "Deleted user u123"

# Regular user ke liye fail hoga
try:
    delete_user("u123", current_user={"role": "user"})
except PermissionError as e:
    print(e)  # Role 'user' not allowed. Required: ('admin', 'moderator')
```

### Decorators Ko Stack Karna

Decorators ko stack kiya ja sakta hai — jaise UPI transaction mein multiple layers of checks lagti hain (fraud check, balance check, OTP). Ye bottom-up apply hote hain — jo function ke sabse paas hai, wo pehle chalta hai.

```python
@timer
@log_calls
@retry(max_attempts=3, delay=0.1)
def fetch_data(url: str) -> dict:
    """URL se data fetch karta hai."""
    import random
    if random.random() < 0.5:
        raise ConnectionError("timeout")
    return {"data": "success"}


# Execution order:
# 1. timer timing start karta hai
# 2. log_calls call log karta hai
# 3. retry failures handle karta hai
# 4. fetch_data actually chalta hai
```

### Class-Based Decorator

Decorators ko class ke roop mein bhi bana sakte ho — `__call__` method use karke.

```python
class Throttle:
    """Class-based decorator - function calls ko throttle karta hai."""

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

## Built-in Decorators Ka Overview

| Decorator | Kaam | JS Equivalent |
|-----------|---------|---------------|
| `@property` | Getter/setter | `get`/`set` |
| `@staticmethod` | Static method | `static` |
| `@classmethod` | Class-level factory method | Direct equivalent nahi |
| `@abstractmethod` | Subclass mein implementation zaruri karna | `abstract` in TS |
| `@functools.wraps` | Function metadata preserve karna | N/A |
| `@functools.lru_cache` | Function results memoize karna | Manual ya lodash `_.memoize` |
| `@functools.cached_property` | Lazy computed property | Getter with manual cache |
| `@functools.total_ordering` | Comparison methods auto-generate karna | N/A |
| `@dataclasses.dataclass` | Class boilerplate auto-generate karna | N/A |
| `@typing.override` | Method ko override mark karna | `override` keyword in TS |

---

## Practice Exercises

### Exercise 1: Validation Decorator

Ek `@validate_types` decorator banao jo runtime pe function arguments ke types check kare:

```python
@validate_types
def create_user(name: str, age: int, email: str) -> dict:
    return {"name": name, "age": age, "email": email}

create_user("Alice", 30, "alice@example.com")  # Chalega
create_user("Alice", "thirty", "alice@example.com")  # TypeError!
```

Hint: `func.__annotations__` use karo type hints get karne ke liye.

### Exercise 2: TTL Wala Caching

Ek `@cache_with_ttl(seconds=60)` decorator banao jo:
- Function results cache kare
- TTL ke baad cache entries expire kare
- `.cache_clear()` aur `.cache_info()` methods provide kare
- Keyword arguments ke saath bhi kaam kare

### Exercise 3: Express-Style Middleware

Ek decorator system banao jo Express.js ke middleware jaisa behave kare:

```python
@middleware(auth_required=True, roles=["admin"])
@middleware(rate_limit=100, window=60)
@middleware(log_request=True)
def handle_request(request: dict) -> dict:
    return {"status": 200, "data": request.get("body")}
```

### Exercise 4: Validation Wali Property

Ek reusable `validated_property` descriptor/decorator banao jo type checking aur custom validation add kare:

```python
class User:
    name = validated_property(str, min_length=1, max_length=100)
    age = validated_property(int, min_value=0, max_value=150)
    email = validated_property(str, pattern=r"^[\w.]+@[\w.]+\.\w+$")
```

---

## Key Takeaways

1. **Decorators sirf higher-order functions hain** - agar middleware ya HOCs samajh aate hain, toh decorators bhi samajh aa jayenge
2. **`@` sirf syntactic sugar hai** `func = decorator(func)` ke liye
3. **Hamesha `@functools.wraps` use karo** taaki function metadata preserve rahe
4. **`@property`** = JavaScript `get`/`set` but decorator syntax ke saath
5. **`@classmethod`** Python mein unique hai - factory methods jo jaante hain kis class par hain
6. **`@staticmethod`** = TypeScript `static` but `cls` access ke bina
7. **Decorators compose hote hain** - inhe stack karo logging, caching, auth jaise cross-cutting concerns ke liye
8. **Python decorators runtime pe chalte hain** - TypeScript decorators compile-time metadata hain (alag purpose)
