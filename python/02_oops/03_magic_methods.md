# Magic Methods (Dunder Methods)

> Python ka operator overloading aur protocols — Node.js/TypeScript developers ke liye

---

## Magic Methods hote kya hain?

Socho tumhare paas ek object hai aur tum use `+` se add karna chahte ho, ya `print()` karke usko sundar dikhana chahte ho, ya `for` loop mein daal ke iterate karna chahte ho. Python isko possible banata hai **magic methods** (jinhe **dunder methods** bhi bolte hain — "double underscore") ke through. Ye special methods hote hain jo double underscore se ghire hote hain, jaise `__init__`, `__str__`, `__add__`. Ye define karte hain ki tumhara object Python ke built-in operations ke saath kaise behave karega.

JavaScript mein bhi kuch aise concepts hain (`Symbol.iterator`, `Symbol.toPrimitive`, `toString()`), lekin Python isko bahut aage le jaata hai. Tum lagbhag har operator aur built-in function ko customize kar sakte ho.

```python
# Jab tum ye likhte ho...          Python actually ye call karta hai...
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

> [!info]
> Ye saare methods Python khud call karta hai, tum inhe seedha kabhi nahi bulaate. Tum bas inhe **define** karte ho apni class ke andar, aur Python operator dekh ke sahi method dhoond leta hai — bilkul waise jaise Zomato app "Order" button dabane pe backend mein sahi API khud call kar deta hai, tumhe manually endpoint hit nahi karna padta.

---

## `__str__` aur `__repr__` - Display Representations

Ye classes wali basics file mein bhi dekhe the. Yahan thoda deeper samjhte hain.

```python
class Money:
    def __init__(self, amount: float, currency: str = "USD"):
        self.amount = amount
        self.currency = currency

    def __str__(self) -> str:
        """Human-readable. print() aur str() ke liye use hota hai."""
        symbols = {"USD": "$", "EUR": "€", "GBP": "£"}
        symbol = symbols.get(self.currency, self.currency)
        return f"{symbol}{self.amount:,.2f}"

    def __repr__(self) -> str:
        """Developer-readable. REPL aur containers ke andar use hota hai."""
        return f"Money(amount={self.amount}, currency='{self.currency}')"


price = Money(1299.99, "USD")
print(price)        # $1,299.99       (__str__ call hua)
print(repr(price))  # Money(amount=1299.99, currency='USD')  (__repr__ call hua)
print([price])      # [Money(amount=1299.99, currency='USD')] (lists __repr__ use karti hain)
print(f"Price: {price}")  # Price: $1,299.99  (f-strings __str__ use karti hain)
```

**Yaad rakhne wali baat:**
- `__str__` = end users / display ke liye — jaise Swiggy app pe order summary dikhta hai
- `__repr__` = developers / debugging ke liye. Ideally aisi valid Python honi chahiye jisse object wapas banaya ja sake
- Agar ek hi define karna hai to `__repr__` define karo. `__str__` missing ho to Python `__repr__` pe fallback kar leta hai

---

## Comparison Operators: `__eq__`, `__lt__`, `__gt__`, waghera

JavaScript mein tum `==` ya `<` ka behavior objects ke liye customize nahi kar sakte. Python mein kar sakte ho — bilkul apne rules ke hisaab se.

```python
class Version:
    """Semantic version comparison - npm ke 'semver' package jaisa."""

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
print(v1 != v2)  # True (yeh __eq__ se auto-derive hota hai)

# Ab versions sort bhi kar sakte ho!
versions = [Version("2.0.0"), Version("1.0.0"), Version("1.5.0"), Version("0.9.0")]
versions.sort()
print(versions)  # [Version('0.9.0'), Version('1.0.0'), Version('1.5.0'), Version('2.0.0')]
```

> [!warning]
> Jab operand ka type unsupported ho, to `NotImplementedError` raise mat karo — `NotImplemented` **return** karo. Isse Python doosre operand pe reverse operation try karne ka mauka deta hai (jaise `a < b` fail ho to `b > a` try karega). Ye ek chhota sa difference hai jo bahut confusion bacha deta hai.

**Shortcut**: `functools.total_ordering` use karo — sirf `__eq__` aur ek comparison method define karo, baaki Python khud fill kar dega:

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

    # __le__, __gt__, __ge__ auto-generate ho jaate hain!
```

```typescript
// TypeScript - tum == ya < ko override nahi kar sakte
// Explicit compare methods hi banane padenge:
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
    // -1, 0, ya 1 return karo
    if (this.major !== other.major) return this.major - other.major;
    if (this.minor !== other.minor) return this.minor - other.minor;
    return this.patch - other.patch;
  }
}

// Aur sorting ke liye callback dena padega:
versions.sort((a, b) => a.compareTo(b));
```

---

## Container Protocols: `__len__`, `__getitem__`, `__setitem__`

Ye tumhare objects ko list, dict ya doosre containers ki tarah behave karvate hain.

```python
class TimeSeries:
    """Ek time series data structure - simplified pandas Series jaisa."""

    def __init__(self, name: str):
        self.name = name
        self._timestamps: list[str] = []
        self._values: list[float] = []

    def add(self, timestamp: str, value: float) -> None:
        self._timestamps.append(timestamp)
        self._values.append(value)

    def __len__(self) -> int:
        """len(series) data points ki count deta hai."""
        return len(self._values)

    def __getitem__(self, index: int | str) -> float | "TimeSeries":
        """series[0] ya series["2024-01-01"] value return karta hai."""
        if isinstance(index, int):
            return self._values[index]
        elif isinstance(index, str):
            # Timestamp se lookup
            idx = self._timestamps.index(index)
            return self._values[idx]
        elif isinstance(index, slice):
            # Slicing support: series[1:3]
            result = TimeSeries(f"{self.name}[slice]")
            for ts, val in zip(
                self._timestamps[index], self._values[index]
            ):
                result.add(ts, val)
            return result
        raise TypeError(f"Invalid index type: {type(index)}")

    def __setitem__(self, index: int | str, value: float) -> None:
        """series[0] = 42 ya series["2024-01-01"] = 42."""
        if isinstance(index, int):
            self._values[index] = value
        elif isinstance(index, str):
            try:
                idx = self._timestamps.index(index)
                self._values[idx] = value
            except ValueError:
                # Naya timestamp - add kar do
                self.add(index, value)

    def __contains__(self, timestamp: str) -> bool:
        """'in' operator support: '2024-01-01' in series."""
        return timestamp in self._timestamps

    def __repr__(self) -> str:
        return f"TimeSeries('{self.name}', points={len(self)})"


# Usage - bilkul built-in collection jaisa feel hota hai!
metrics = TimeSeries("cpu_usage")
metrics.add("2024-01-01", 45.2)
metrics.add("2024-01-02", 62.8)
metrics.add("2024-01-03", 38.1)
metrics.add("2024-01-04", 71.5)

print(len(metrics))              # 4
print(metrics[0])                # 45.2
print(metrics["2024-01-02"])     # 62.8
print("2024-01-03" in metrics)   # True

metrics["2024-01-01"] = 50.0     # timestamp se update
print(metrics[0])                # 50.0

# Slicing bhi chalti hai
subset = metrics[1:3]
print(subset)                    # TimeSeries('cpu_usage[slice]', points=2)
```

```typescript
// TypeScript - custom classes ke saath obj[key] kaam karvana possible nahi
// Explicit methods hi banane padenge:
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
  // ts[0] ya ts["2024-01-01"] syntax use karne ka koi tareeka nahi
}
```

---

## Operator Overloading: `__add__`, `__mul__`, waghera

**Ye JavaScript/TypeScript mein bilkul possible nahi hai.** Python mein tum define kar sakte ho ki `+`, `-`, `*`, `/` waghera tumhare objects ke liye kya matlab rakhte hain.

Socho — jaise UPI app mein do wallets ko `+` se add karna ho, ya cart mein price `*` se multiply karna ho — Python mein ye seedha operator se ho sakta hai, JS mein tumhe har baar method call karna padega.

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
        """3 * v (reverse multiplication - jab scalar left side pe ho)"""
        return self.__mul__(scalar)

    def __neg__(self) -> "Vector":
        """-v (negation)"""
        return Vector(-self.x, -self.y)

    def __abs__(self) -> float:
        """abs(v) magnitude return karta hai"""
        return (self.x ** 2 + self.y ** 2) ** 0.5

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Vector):
            return NotImplemented
        return self.x == other.x and self.y == other.y

    def __repr__(self) -> str:
        return f"Vector({self.x}, {self.y})"

    def __str__(self) -> str:
        return f"({self.x}, {self.y})"


# Ye seedha maths jaisa padhta hai!
v1 = Vector(3, 4)
v2 = Vector(1, 2)

print(v1 + v2)      # (4, 6)
print(v1 - v2)      # (2, 2)
print(v1 * 3)       # (9, 12)
print(3 * v1)       # (9, 12)  -- __rmul__ ki wajah se
print(-v1)          # (-3, -4)
print(abs(v1))      # 5.0
print(v1 == Vector(3, 4))  # True
```

`__rmul__` ka kaam samjho: jab tum `v1 * 3` likhte ho, Python `v1.__mul__(3)` call karta hai — kaam ho jaata hai. Lekin jab tum `3 * v1` likhte ho, Python pehle `int.__mul__(v1)` try karta hai, jo fail hota hai (int ko Vector ka pata nahi), phir Python fallback karta hai `v1.__rmul__(3)` pe. Isiliye `__rmul__` bina iska "reverse" define kiye `3 * v1` kabhi kaam nahi karega.

Ek aur practical example - safe arithmetic wali Money class:

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


# Clean, readable financial calculations - jaise Swiggy ka bill breakdown
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

## `__call__` - Instance ko Callable banana

`__call__` ki wajah se tum object ko function ki tarah use kar sakte ho. Ye stateful functions, middleware patterns aur strategy patterns ke liye kaafi useful hai.

```python
class RateLimiter:
    """Ek callable rate limiter - function ki tarah use karo."""

    def __init__(self, max_calls: int, period_seconds: float):
        self.max_calls = max_calls
        self.period = period_seconds
        self._calls: list[float] = []

    def __call__(self, func_name: str = "unknown") -> bool:
        """Check karta hai ki call allowed hai ya nahi. Use: limiter('endpoint_name')"""
        import time
        now = time.time()
        # Expired entries hata do
        self._calls = [t for t in self._calls if now - t < self.period]

        if len(self._calls) >= self.max_calls:
            print(f"Rate limit exceeded for '{func_name}'")
            return False

        self._calls.append(now)
        return True


# Function jaisa use karo!
limiter = RateLimiter(max_calls=3, period_seconds=10)

print(limiter("api/users"))    # True
print(limiter("api/users"))    # True
print(limiter("api/users"))    # True
print(limiter("api/users"))    # Rate limit exceeded for 'api/users' -> False
```

Ek aur example - validator factory (socho jaise Flipkart pe checkout se pehle form validate hota hai):

```python
class Validator:
    """Ek composable validator jo function ki tarah call ho sakta hai."""

    def __init__(self, name: str):
        self.name = name
        self._rules: list[tuple[callable, str]] = []

    def add_rule(self, check: callable, message: str) -> "Validator":
        self._rules.append((check, message))
        return self  # chaining allow karne ke liye

    def __call__(self, value) -> tuple[bool, list[str]]:
        """Value validate karo. Returns (is_valid, errors)."""
        errors = []
        for check, message in self._rules:
            if not check(value):
                errors.append(message)
        return (len(errors) == 0, errors)


# Validators banao
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

# Function jaisa use karo!
valid, errors = email_validator("alice@example.com")
print(valid, errors)  # True []

valid, errors = email_validator("not-an-email")
print(valid, errors)  # False ['Must contain @']
```

```typescript
// TypeScript - __call__ ka koi equivalent nahi
// Regular function ya explicit method wali class use karni padegi
class RateLimiter {
  check(funcName: string): boolean {
    // ...
  }
}
// limiter("api/users") ki jagah limiter.check("api/users") likhna padega
```

---

## `__iter__` aur `__next__` - Iterator Protocol

Ye JavaScript ke `Symbol.iterator` aur iterator protocol jaisa hi hai, bas Python ka syntax kaafi clean hai.

```python
class DateRange:
    """Dates pe iterate karo - ek date range generator jaisa."""

    def __init__(self, start: str, end: str):
        from datetime import datetime
        self.start = datetime.strptime(start, "%Y-%m-%d")
        self.end = datetime.strptime(end, "%Y-%m-%d")

    def __iter__(self):
        """Jab iteration start hota hai tab call hota hai. Iterator (self) return karo."""
        from datetime import datetime
        self._current = self.start
        return self

    def __next__(self) -> str:
        """Har iteration ke liye call hota hai. Next value return karo ya StopIteration raise karo."""
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


# for loops mein use karo
for date in DateRange("2024-01-01", "2024-01-05"):
    print(date)
# 2024-01-01
# 2024-01-02
# 2024-01-03
# 2024-01-04
# 2024-01-05

# List comprehension ke saath bhi
dates = [d for d in DateRange("2024-06-01", "2024-06-07")]

# 'in' operator use karo
print("2024-01-03" in DateRange("2024-01-01", "2024-01-05"))  # True

# len() use karo
print(len(DateRange("2024-01-01", "2024-01-31")))  # 31
```

```typescript
// TypeScript equivalent, Symbol.iterator use karke
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

// Usage similar hai
for (const date of new DateRange("2024-01-01", "2024-01-05")) {
  console.log(date);
}
```

Ek aur practical example - paginated API results (jaise IRCTC pe train list page-by-page load hoti hai):

```python
class PaginatedResults:
    """Paginated API results pe transparently iterate karo."""

    def __init__(self, fetch_page: callable, page_size: int = 25):
        self._fetch_page = fetch_page
        self._page_size = page_size

    def __iter__(self):
        self._page = 0
        self._buffer: list = []
        self._exhausted = False
        return self

    def __next__(self):
        # Buffer khaali ho to refill karo
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


# Paginated API simulate karo
def fake_api(page: int, size: int) -> list[dict]:
    all_users = [{"id": i, "name": f"User {i}"} for i in range(73)]
    start = page * size
    return all_users[start : start + size]


# SAARE pages pe seamlessly iterate karo
for user in PaginatedResults(fake_api, page_size=25):
    if user["id"] % 20 == 0:
        print(user)  # har 20th user print karega
```

---

## `__hash__` - Hashable Objects

Objects ko sets ya dict keys mein use karne ke liye unka hashable hona zaruri hai.

> [!warning]
> By default, agar tum `__eq__` define karte ho, Python `__hash__` ko `None` set kar deta hai (matlab object unhashable ho jaata hai). Isliye jab bhi `__eq__` likho, sath mein `__hash__` bhi likhne ke baare mein socho — warna set/dict mein daalte hi `TypeError: unhashable type` mil jayega.

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
        """__eq__ ke saath consistent hona chahiye:
        agar a == b, to hash(a) == hash(b) hona chahiye"""
        return hash((self.lat, self.lng))

    def __repr__(self) -> str:
        return f"Coordinate({self.lat}, {self.lng})"


# Ab inhe sets aur dict keys mein use kar sakte ho
visited = {
    Coordinate(40.7128, -74.0060),  # NYC
    Coordinate(51.5074, -0.1278),   # London
    Coordinate(40.7128, -74.0060),  # NYC dubara - deduped!
}
print(len(visited))  # 2 (NYC sirf ek baar aayega)

# Dict keys ki tarah use karo
distances: dict[Coordinate, float] = {
    Coordinate(40.7128, -74.0060): 0.0,
    Coordinate(51.5074, -0.1278): 5570.0,
}
print(distances[Coordinate(40.7128, -74.0060)])  # 0.0
```

---

## Complete Reference Table

| Magic Method | Kis se trigger hota hai | JS Equivalent |
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
| `__call__` | `obj()` | Koi equivalent nahi |
| `__eq__` | `obj == other` | Koi equivalent nahi (`==` override nahi ho sakta) |
| `__lt__` | `obj < other` | Koi equivalent nahi |
| `__add__` | `obj + other` | Koi equivalent nahi |
| `__mul__` | `obj * other` | Koi equivalent nahi |
| `__hash__` | `hash(obj)`, sets, dict keys | Koi direct equivalent nahi |
| `__bool__` | `bool(obj)`, `if obj:` | Truthy/falsy (customize nahi ho sakta) |
| `__enter__`/`__exit__` | `with obj:` | Koi equivalent nahi (try/finally) |
| `__del__` | Object garbage collect hone par | `FinalizationRegistry` |

---

## Practice Exercises

### Exercise 1: Matrix Class

`Matrix` class banao in magic methods ke saath:

```python
m1 = Matrix([[1, 2], [3, 4]])
m2 = Matrix([[5, 6], [7, 8]])

print(m1 + m2)        # Matrix addition
print(m1 * 3)         # Scalar multiplication
print(m1[0][1])       # Element access -> 2
print(len(m1))        # Rows ki count -> 2
print(m1 == Matrix([[1, 2], [3, 4]]))  # True
print(repr(m1))       # Matrix([[1, 2], [3, 4]])
for row in m1:        # Rows pe iterate karo
    print(row)
```

### Exercise 2: JSONPath Query Object

Ek `Config` class banao jo `__getitem__` se nested access support kare:

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
print(len(config))                        # top-level keys ki count
print("database" in config)              # True
config["server.debug"] = True            # nested values set karo
```

### Exercise 3: Chainable Query Builder

Ek `Query` class banao jo `__call__`, `__str__` aur method chaining use kare:

```python
q = Query("users")
result = q.where(age__gt=18).where(active=True).select("name", "email").limit(10)
print(result)
# SELECT name, email FROM users WHERE age > 18 AND active = true LIMIT 10

# Callable banao "execute" karne ke liye
rows = result()  # ek string return karega jo bata rahi hai kaunsi query execute ho rahi hai
```

### Exercise 4: Unit Converter

Measurement classes banao jo arithmetic aur comparison support karein:

```python
d1 = Distance(100, "m")
d2 = Distance(0.5, "km")

print(d1 + d2)      # 600.0 m
print(d1 < d2)      # True
print(d2 - d1)      # 400.0 m
print(d1 * 3)       # 300.0 m
```

---

## Key Takeaways

1. **Magic methods Python ka superpower hain** - inse tum custom objects ko bilkul built-in types jaisa behave karva sakte ho
2. **Operator overloading JS mein impossible hai** - `+`, `-`, `*`, `==`, `<` sab Python mein customize ho sakte hain
3. **`__iter__`/`__next__`** Python ka `Symbol.iterator` wala version hai, bas zyada straightforward
4. **`__call__`** ka JS mein koi equivalent nahi - isse instances function ki tarah act kar sakte hain (middleware, validators ke liye zabardast)
5. **`__getitem__`/`__setitem__`** Proxy jaisa behavior clean API ke saath de deta hai
6. **Magic methods se hamesha `NotImplemented` return karo** (`raise NotImplementedError` nahi) jab other operand ka type unsupported ho - isse Python reverse operation try kar leta hai
7. **Agar `__eq__` define kiya hai to `__hash__` bhi socho** - custom equality wale objects ko sets/dicts mein kaam karne ke liye custom hashing chahiye hoti hai
