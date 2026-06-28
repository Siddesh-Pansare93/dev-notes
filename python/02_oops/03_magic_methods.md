# Magic Methods (Dunder Methods)

> Python's operator overloading and protocols for Node.js/TypeScript developers

---

## What Are Magic Methods?

Magic methods (also called **dunder methods** - "double underscore") are special methods surrounded by double underscores like `__init__`, `__str__`, `__add__`. They let you define how your objects behave with built-in Python operations.

JavaScript has a few similar concepts (`Symbol.iterator`, `Symbol.toPrimitive`, `toString()`), but Python takes this MUCH further. You can customize almost every operator and built-in function.

```python
# When you write this...          Python actually calls this...
len(obj)                        # obj.__len__()
str(obj)                        # obj.__str__()
repr(obj)                       # obj.__repr__()
obj[key]                        # obj.__getitem__(key)
obj[key] = value                # obj.__setitem__(key, value)
obj == other                    # obj.__eq__(other)
obj + other                     # obj.__add__(other)
obj()                           # obj.__call__()
for x in obj:                   # obj.__iter__() and __next__()
```

---

## `__str__` and `__repr__` - Display Representations

You saw these in the classes basics file. Here is the deeper picture.

```python
class Money:
    def __init__(self, amount: float, currency: str = "USD"):
        self.amount = amount
        self.currency = currency

    def __str__(self) -> str:
        """Human-readable. Used by print() and str()."""
        symbols = {"USD": "$", "EUR": "€", "GBP": "£"}
        symbol = symbols.get(self.currency, self.currency)
        return f"{symbol}{self.amount:,.2f}"

    def __repr__(self) -> str:
        """Developer-readable. Used in REPL and inside containers."""
        return f"Money(amount={self.amount}, currency='{self.currency}')"


price = Money(1299.99, "USD")
print(price)        # $1,299.99       (calls __str__)
print(repr(price))  # Money(amount=1299.99, currency='USD')  (calls __repr__)
print([price])      # [Money(amount=1299.99, currency='USD')] (lists use __repr__)
print(f"Price: {price}")  # Price: $1,299.99  (f-strings use __str__)
```

**Rule of thumb:**
- `__str__` = for end users / display
- `__repr__` = for developers / debugging. Ideally should be valid Python that could recreate the object
- If you only define one, define `__repr__`. Python falls back to `__repr__` when `__str__` is missing.

---

## Comparison Operators: `__eq__`, `__lt__`, `__gt__`, etc.

In JavaScript, you cannot customize `==` or `<` behavior for objects. In Python, you can.

```python
class Version:
    """Semantic version comparison - like the 'semver' npm package."""

    def __init__(self, version_string: str):
        parts = version_string.split(".")
        self.major = int(parts[0])
        self.minor = int(parts[1]) if len(parts) > 1 else 0
        self.patch = int(parts[2]) if len(parts) > 2 else 0

    def _as_tuple(self) -> tuple[int, int, int]:
        return (self.major, self.minor, self.patch)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Version):
            return NotImplemented
        return self._as_tuple() == other._as_tuple()

    def __lt__(self, other: "Version") -> bool:
        if not isinstance(other, Version):
            return NotImplemented
        return self._as_tuple() < other._as_tuple()

    def __le__(self, other: "Version") -> bool:
        if not isinstance(other, Version):
            return NotImplemented
        return self._as_tuple() <= other._as_tuple()

    def __gt__(self, other: "Version") -> bool:
        if not isinstance(other, Version):
            return NotImplemented
        return self._as_tuple() > other._as_tuple()

    def __ge__(self, other: "Version") -> bool:
        if not isinstance(other, Version):
            return NotImplemented
        return self._as_tuple() >= other._as_tuple()

    def __repr__(self) -> str:
        return f"Version('{self.major}.{self.minor}.{self.patch}')"

    def __str__(self) -> str:
        return f"{self.major}.{self.minor}.{self.patch}"


v1 = Version("1.2.3")
v2 = Version("1.3.0")
v3 = Version("1.2.3")

print(v1 == v3)  # True
print(v1 < v2)   # True
print(v2 > v1)   # True
print(v1 != v2)  # True (auto-derived from __eq__)

# Now you can sort versions!
versions = [Version("2.0.0"), Version("1.0.0"), Version("1.5.0"), Version("0.9.0")]
versions.sort()
print(versions)  # [Version('0.9.0'), Version('1.0.0'), Version('1.5.0'), Version('2.0.0')]
```

**Shortcut**: Use `functools.total_ordering` to only define `__eq__` and one comparison method, and Python fills in the rest:

```python
from functools import total_ordering

@total_ordering
class Version:
    # ... same __init__ ...

    def __eq__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return self._as_tuple() == other._as_tuple()

    def __lt__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return self._as_tuple() < other._as_tuple()

    # __le__, __gt__, __ge__ are auto-generated!
```

```typescript
// TypeScript - you can't override == or <
// You'd need explicit compare methods:
class Version {
  constructor(
    public major: number,
    public minor: number,
    public patch: number
  ) {}

  equals(other: Version): boolean {
    return (
      this.major === other.major &&
      this.minor === other.minor &&
      this.patch === other.patch
    );
  }

  compareTo(other: Version): number {
    // return -1, 0, or 1
    if (this.major !== other.major) return this.major - other.major;
    if (this.minor !== other.minor) return this.minor - other.minor;
    return this.patch - other.patch;
  }
}

// And sorting requires a callback:
versions.sort((a, b) => a.compareTo(b));
```

---

## Container Protocols: `__len__`, `__getitem__`, `__setitem__`

These let your objects behave like lists, dicts, or other containers.

```python
class TimeSeries:
    """A time series data structure - like a simplified pandas Series."""

    def __init__(self, name: str):
        self.name = name
        self._timestamps: list[str] = []
        self._values: list[float] = []

    def add(self, timestamp: str, value: float) -> None:
        self._timestamps.append(timestamp)
        self._values.append(value)

    def __len__(self) -> int:
        """len(series) returns the number of data points."""
        return len(self._values)

    def __getitem__(self, index: int | str) -> float | "TimeSeries":
        """series[0] or series["2024-01-01"] returns the value."""
        if isinstance(index, int):
            return self._values[index]
        elif isinstance(index, str):
            # Lookup by timestamp
            idx = self._timestamps.index(index)
            return self._values[idx]
        elif isinstance(index, slice):
            # Support slicing: series[1:3]
            result = TimeSeries(f"{self.name}[slice]")
            for ts, val in zip(
                self._timestamps[index], self._values[index]
            ):
                result.add(ts, val)
            return result
        raise TypeError(f"Invalid index type: {type(index)}")

    def __setitem__(self, index: int | str, value: float) -> None:
        """series[0] = 42 or series["2024-01-01"] = 42."""
        if isinstance(index, int):
            self._values[index] = value
        elif isinstance(index, str):
            try:
                idx = self._timestamps.index(index)
                self._values[idx] = value
            except ValueError:
                # New timestamp - add it
                self.add(index, value)

    def __contains__(self, timestamp: str) -> bool:
        """Support 'in' operator: '2024-01-01' in series."""
        return timestamp in self._timestamps

    def __repr__(self) -> str:
        return f"TimeSeries('{self.name}', points={len(self)})"


# Usage - feels just like a built-in collection!
metrics = TimeSeries("cpu_usage")
metrics.add("2024-01-01", 45.2)
metrics.add("2024-01-02", 62.8)
metrics.add("2024-01-03", 38.1)
metrics.add("2024-01-04", 71.5)

print(len(metrics))              # 4
print(metrics[0])                # 45.2
print(metrics["2024-01-02"])     # 62.8
print("2024-01-03" in metrics)   # True

metrics["2024-01-01"] = 50.0     # update via timestamp
print(metrics[0])                # 50.0

# Slicing works too
subset = metrics[1:3]
print(subset)                    # TimeSeries('cpu_usage[slice]', points=2)
```

```typescript
// TypeScript - no way to make obj[key] work with custom classes
// You'd need explicit methods:
class TimeSeries {
  private timestamps: string[] = [];
  private values: number[] = [];

  get(index: number): number {
    return this.values[index];
  }

  getByTimestamp(ts: string): number {
    const idx = this.timestamps.indexOf(ts);
    return this.values[idx];
  }

  get length(): number {
    return this.values.length;
  }
  // No way to use ts[0] or ts["2024-01-01"] syntax
}
```

---

## Operator Overloading: `__add__`, `__mul__`, etc.

**This is completely impossible in JavaScript/TypeScript.** Python lets you define what `+`, `-`, `*`, `/`, etc. mean for your objects.

```python
class Vector:
    """2D vector with full operator support."""

    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

    def __add__(self, other: "Vector") -> "Vector":
        """v1 + v2"""
        if not isinstance(other, Vector):
            return NotImplemented
        return Vector(self.x + other.x, self.y + other.y)

    def __sub__(self, other: "Vector") -> "Vector":
        """v1 - v2"""
        if not isinstance(other, Vector):
            return NotImplemented
        return Vector(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar: float) -> "Vector":
        """v * 3 (scalar multiplication)"""
        if not isinstance(scalar, (int, float)):
            return NotImplemented
        return Vector(self.x * scalar, self.y * scalar)

    def __rmul__(self, scalar: float) -> "Vector":
        """3 * v (reverse multiplication - when scalar is on the left)"""
        return self.__mul__(scalar)

    def __neg__(self) -> "Vector":
        """-v (negation)"""
        return Vector(-self.x, -self.y)

    def __abs__(self) -> float:
        """abs(v) returns magnitude"""
        return (self.x ** 2 + self.y ** 2) ** 0.5

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Vector):
            return NotImplemented
        return self.x == other.x and self.y == other.y

    def __repr__(self) -> str:
        return f"Vector({self.x}, {self.y})"

    def __str__(self) -> str:
        return f"({self.x}, {self.y})"


# This reads like math!
v1 = Vector(3, 4)
v2 = Vector(1, 2)

print(v1 + v2)      # (4, 6)
print(v1 - v2)      # (2, 2)
print(v1 * 3)       # (9, 12)
print(3 * v1)       # (9, 12)  -- thanks to __rmul__
print(-v1)          # (-3, -4)
print(abs(v1))      # 5.0
print(v1 == Vector(3, 4))  # True
```

Another practical example - a Money class with safe arithmetic:

```python
class Money:
    def __init__(self, amount: float, currency: str = "USD"):
        self.amount = round(amount, 2)
        self.currency = currency

    def __add__(self, other: "Money") -> "Money":
        if not isinstance(other, Money):
            return NotImplemented
        if self.currency != other.currency:
            raise ValueError(
                f"Cannot add {self.currency} and {other.currency}"
            )
        return Money(self.amount + other.amount, self.currency)

    def __sub__(self, other: "Money") -> "Money":
        if not isinstance(other, Money):
            return NotImplemented
        if self.currency != other.currency:
            raise ValueError(
                f"Cannot subtract {self.currency} and {other.currency}"
            )
        return Money(self.amount - other.amount, self.currency)

    def __mul__(self, factor: float) -> "Money":
        if not isinstance(factor, (int, float)):
            return NotImplemented
        return Money(self.amount * factor, self.currency)

    def __rmul__(self, factor: float) -> "Money":
        return self.__mul__(factor)

    def __truediv__(self, divisor: float) -> "Money":
        if not isinstance(divisor, (int, float)):
            return NotImplemented
        return Money(self.amount / divisor, self.currency)

    def __lt__(self, other: "Money") -> bool:
        if not isinstance(other, Money) or self.currency != other.currency:
            return NotImplemented
        return self.amount < other.amount

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        return self.amount == other.amount and self.currency == other.currency

    def __repr__(self) -> str:
        return f"Money({self.amount}, '{self.currency}')"

    def __str__(self) -> str:
        return f"${self.amount:,.2f}" if self.currency == "USD" else f"{self.amount:,.2f} {self.currency}"


# Clean, readable financial calculations
subtotal = Money(29.99) + Money(49.99) + Money(12.50)
tax = subtotal * 0.08
total = subtotal + tax
discount = total * 0.10
final = total - discount

print(f"Subtotal: {subtotal}")  # Subtotal: $92.48
print(f"Tax:      {tax}")       # Tax:      $7.40
print(f"Total:    {total}")     # Total:    $99.88
print(f"Discount: {discount}")  # Discount: $9.99
print(f"Final:    {final}")     # Final:    $89.89
```

---

## `__call__` - Making Instances Callable

`__call__` lets you use an object like a function. This is useful for stateful functions, middleware patterns, and strategy patterns.

```python
class RateLimiter:
    """A callable rate limiter - use it like a function."""

    def __init__(self, max_calls: int, period_seconds: float):
        self.max_calls = max_calls
        self.period = period_seconds
        self._calls: list[float] = []

    def __call__(self, func_name: str = "unknown") -> bool:
        """Check if a call is allowed. Use: limiter('endpoint_name')"""
        import time
        now = time.time()
        # Remove expired entries
        self._calls = [t for t in self._calls if now - t < self.period]

        if len(self._calls) >= self.max_calls:
            print(f"Rate limit exceeded for '{func_name}'")
            return False

        self._calls.append(now)
        return True


# Use it like a function!
limiter = RateLimiter(max_calls=3, period_seconds=10)

print(limiter("api/users"))    # True
print(limiter("api/users"))    # True
print(limiter("api/users"))    # True
print(limiter("api/users"))    # Rate limit exceeded for 'api/users' -> False
```

Another example - a validator factory:

```python
class Validator:
    """A composable validator that can be called like a function."""

    def __init__(self, name: str):
        self.name = name
        self._rules: list[tuple[callable, str]] = []

    def add_rule(self, check: callable, message: str) -> "Validator":
        self._rules.append((check, message))
        return self  # allow chaining

    def __call__(self, value) -> tuple[bool, list[str]]:
        """Validate a value. Returns (is_valid, errors)."""
        errors = []
        for check, message in self._rules:
            if not check(value):
                errors.append(message)
        return (len(errors) == 0, errors)


# Build validators
email_validator = Validator("email")
email_validator.add_rule(
    lambda v: isinstance(v, str), "Must be a string"
).add_rule(
    lambda v: "@" in v, "Must contain @"
).add_rule(
    lambda v: "." in v.split("@")[-1], "Must have a domain"
).add_rule(
    lambda v: len(v) <= 254, "Too long"
)

# Use it like a function!
valid, errors = email_validator("alice@example.com")
print(valid, errors)  # True []

valid, errors = email_validator("not-an-email")
print(valid, errors)  # False ['Must contain @']
```

```typescript
// TypeScript - no __call__ equivalent
// You'd use a regular function or a class with an explicit method
class RateLimiter {
  check(funcName: string): boolean {
    // ...
  }
}
// limiter.check("api/users") instead of limiter("api/users")
```

---

## `__iter__` and `__next__` - Iterator Protocol

This maps to JavaScript's `Symbol.iterator` and the iterator protocol, but Python's syntax is much cleaner.

```python
class DateRange:
    """Iterate over dates - like a date range generator."""

    def __init__(self, start: str, end: str):
        from datetime import datetime
        self.start = datetime.strptime(start, "%Y-%m-%d")
        self.end = datetime.strptime(end, "%Y-%m-%d")

    def __iter__(self):
        """Called when iteration starts. Return the iterator (self)."""
        from datetime import datetime
        self._current = self.start
        return self

    def __next__(self) -> str:
        """Called for each iteration. Return next value or raise StopIteration."""
        from datetime import timedelta
        if self._current > self.end:
            raise StopIteration
        result = self._current.strftime("%Y-%m-%d")
        self._current += timedelta(days=1)
        return result

    def __len__(self) -> int:
        return (self.end - self.start).days + 1

    def __contains__(self, date_str: str) -> bool:
        from datetime import datetime
        date = datetime.strptime(date_str, "%Y-%m-%d")
        return self.start <= date <= self.end


# Use in for loops
for date in DateRange("2024-01-01", "2024-01-05"):
    print(date)
# 2024-01-01
# 2024-01-02
# 2024-01-03
# 2024-01-04
# 2024-01-05

# Use with list comprehension
dates = [d for d in DateRange("2024-06-01", "2024-06-07")]

# Use 'in' operator
print("2024-01-03" in DateRange("2024-01-01", "2024-01-05"))  # True

# Use len()
print(len(DateRange("2024-01-01", "2024-01-31")))  # 31
```

```typescript
// TypeScript equivalent using Symbol.iterator
class DateRange {
  constructor(private start: string, private end: string) {}

  *[Symbol.iterator]() {
    let current = new Date(this.start);
    const end = new Date(this.end);
    while (current <= end) {
      yield current.toISOString().split("T")[0];
      current.setDate(current.getDate() + 1);
    }
  }
}

// Usage is similar
for (const date of new DateRange("2024-01-01", "2024-01-05")) {
  console.log(date);
}
```

A more practical example - paginated API results:

```python
class PaginatedResults:
    """Iterate over paginated API results transparently."""

    def __init__(self, fetch_page: callable, page_size: int = 25):
        self._fetch_page = fetch_page
        self._page_size = page_size

    def __iter__(self):
        self._page = 0
        self._buffer: list = []
        self._exhausted = False
        return self

    def __next__(self):
        # Refill buffer if empty
        if not self._buffer:
            if self._exhausted:
                raise StopIteration
            items = self._fetch_page(self._page, self._page_size)
            if not items or len(items) < self._page_size:
                self._exhausted = True
            if not items:
                raise StopIteration
            self._buffer = list(items)
            self._page += 1

        return self._buffer.pop(0)


# Simulate paginated API
def fake_api(page: int, size: int) -> list[dict]:
    all_users = [{"id": i, "name": f"User {i}"} for i in range(73)]
    start = page * size
    return all_users[start : start + size]


# Iterate over ALL pages seamlessly
for user in PaginatedResults(fake_api, page_size=25):
    if user["id"] % 20 == 0:
        print(user)  # prints every 20th user
```

---

## `__hash__` - Hashable Objects

For objects to be used in sets or as dict keys, they need to be hashable. By default, if you define `__eq__`, Python sets `__hash__` to `None` (making the object unhashable).

```python
class Coordinate:
    def __init__(self, lat: float, lng: float):
        self.lat = round(lat, 6)
        self.lng = round(lng, 6)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Coordinate):
            return NotImplemented
        return self.lat == other.lat and self.lng == other.lng

    def __hash__(self) -> int:
        """Must be consistent with __eq__:
        if a == b, then hash(a) == hash(b)"""
        return hash((self.lat, self.lng))

    def __repr__(self) -> str:
        return f"Coordinate({self.lat}, {self.lng})"


# Now you can use them in sets and as dict keys
visited = {
    Coordinate(40.7128, -74.0060),  # NYC
    Coordinate(51.5074, -0.1278),   # London
    Coordinate(40.7128, -74.0060),  # NYC again - deduped!
}
print(len(visited))  # 2 (NYC only appears once)

# Use as dict keys
distances: dict[Coordinate, float] = {
    Coordinate(40.7128, -74.0060): 0.0,
    Coordinate(51.5074, -0.1278): 5570.0,
}
print(distances[Coordinate(40.7128, -74.0060)])  # 0.0
```

---

## Complete Reference Table

| Magic Method | Triggered By | JS Equivalent |
|-------------|-------------|---------------|
| `__init__` | `MyClass()` | `constructor()` |
| `__str__` | `str(obj)`, `print(obj)` | `toString()` |
| `__repr__` | `repr(obj)`, REPL | `[Symbol.toPrimitive]` (loosely) |
| `__len__` | `len(obj)` | `.length` property |
| `__getitem__` | `obj[key]` | Proxy handler (loosely) |
| `__setitem__` | `obj[key] = val` | Proxy handler (loosely) |
| `__delitem__` | `del obj[key]` | `delete obj[key]` |
| `__contains__` | `x in obj` | `.includes()` / `.has()` |
| `__iter__` | `for x in obj` | `[Symbol.iterator]()` |
| `__next__` | `next(obj)` | `.next()` on iterator |
| `__call__` | `obj()` | No equivalent |
| `__eq__` | `obj == other` | No equivalent (can't override `==`) |
| `__lt__` | `obj < other` | No equivalent |
| `__add__` | `obj + other` | No equivalent |
| `__mul__` | `obj * other` | No equivalent |
| `__hash__` | `hash(obj)`, sets, dict keys | No direct equivalent |
| `__bool__` | `bool(obj)`, `if obj:` | Truthy/falsy (not customizable) |
| `__enter__`/`__exit__` | `with obj:` | No equivalent (try/finally) |
| `__del__` | Object garbage collected | `FinalizationRegistry` |

---

## Practice Exercises

### Exercise 1: Matrix Class

Create a `Matrix` class with these magic methods:

```python
m1 = Matrix([[1, 2], [3, 4]])
m2 = Matrix([[5, 6], [7, 8]])

print(m1 + m2)        # Matrix addition
print(m1 * 3)         # Scalar multiplication
print(m1[0][1])       # Element access -> 2
print(len(m1))        # Number of rows -> 2
print(m1 == Matrix([[1, 2], [3, 4]]))  # True
print(repr(m1))       # Matrix([[1, 2], [3, 4]])
for row in m1:        # Iterate over rows
    print(row)
```

### Exercise 2: JSONPath Query Object

Create a `Config` class that supports nested access via `__getitem__`:

```python
config = Config({
    "database": {
        "host": "localhost",
        "port": 5432,
        "credentials": {"user": "admin", "password": "secret"}
    },
    "server": {"port": 3000}
})

print(config["database.host"])           # localhost
print(config["database.credentials.user"])  # admin
print(len(config))                        # number of top-level keys
print("database" in config)              # True
config["server.debug"] = True            # set nested values
```

### Exercise 3: Chainable Query Builder

Create a `Query` class that uses `__call__`, `__str__`, and method chaining:

```python
q = Query("users")
result = q.where(age__gt=18).where(active=True).select("name", "email").limit(10)
print(result)
# SELECT name, email FROM users WHERE age > 18 AND active = true LIMIT 10

# Make it callable to "execute"
rows = result()  # returns a string describing the query being executed
```

### Exercise 4: Unit Converter

Create measurement classes that support arithmetic and comparison:

```python
d1 = Distance(100, "m")
d2 = Distance(0.5, "km")

print(d1 + d2)      # 600.0 m
print(d1 < d2)      # True
print(d2 - d1)      # 400.0 m
print(d1 * 3)       # 300.0 m
```

---

## Key Takeaways for Node.js Developers

1. **Magic methods are Python's superpower** - they let you make custom objects behave exactly like built-in types
2. **Operator overloading is impossible in JS** - `+`, `-`, `*`, `==`, `<` can all be customized in Python
3. **`__iter__`/`__next__`** is Python's version of `Symbol.iterator` but more straightforward
4. **`__call__`** has no JS equivalent - it lets instances act as functions (great for middleware, validators)
5. **`__getitem__`/`__setitem__`** replaces Proxy-like behavior with a clean API
6. **Always return `NotImplemented`** (not `raise NotImplementedError`) from magic methods when the other operand type is unsupported - this lets Python try the reverse operation
7. **If you define `__eq__`, consider `__hash__`** - objects with custom equality need custom hashing to work in sets/dicts
