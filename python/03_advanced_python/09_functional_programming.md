# Functional Programming in Python

## Ek Practical Approach

Python multi-paradigm language hai. JavaScript mein jahan functional programming (FP) ka bolbala hai (especially React/frontend mein), wahan Python thoda balanced approach leta hai. Python ki philosophy hai "there should be one -- and preferably only one -- obvious way to do it," aur wo tareeka usually FP aur OOP ka mix hota hai.

Node.js/TS dev hone ke naate, tumhe yahan FP ke concepts familiar lagenge, lekin unhe "Pythonic" tareeke se use karna JavaScript wale tareeke se alag hai.

---

## `map()`, `filter()` vs Array Methods

### `map()`

Socho `map()` ek Zomato delivery batch jaisa hai — sabko ek jaisa operation apply karna hai (jaise sab orders pe discount lagana), bas result turant nahi milta, lazy hota hai.

```python
# Python map() returns an iterator (lazy)
numbers = [1, 2, 3, 4, 5]
doubled = map(lambda x: x * 2, numbers)
print(type(doubled))     # <class 'map'>
print(list(doubled))     # [2, 4, 6, 8, 10]

# But the Pythonic way is a list comprehension:
doubled = [x * 2 for x in numbers]  # Preferred!
```

```javascript
// JavaScript -- method on array
const doubled = [1, 2, 3, 4, 5].map((x) => x * 2);
// [2, 4, 6, 8, 10]
```

### `filter()`

`filter()` ka kaam simple hai — ek predicate function do, wo har item pe check karega, aur sirf jo `True` return karein wahi bache rahenge. Socho ek bouncer jo entry gate pe khada hai — sirf condition match karne walon ko andar jaane deta hai.

```python
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# Python filter()
evens = filter(lambda x: x % 2 == 0, numbers)
print(list(evens))  # [2, 4, 6, 8, 10]

# Pythonic way: list comprehension with condition
evens = [x for x in numbers if x % 2 == 0]  # Preferred!
```

```javascript
// JavaScript
const evens = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((x) => x % 2 === 0);
```

### Chaining (Map + Filter)

JS mein `.filter().map()` chaining bahut common hai, but Python mein aisa direct chaining nahi chalta — yahan list comprehension hi king hai.

```python
# JavaScript-style chaining doesn't work in Python:
# numbers.filter(x => x > 3).map(x => x * 2)  // Not a thing in Python

# Python: nest map/filter (ugly, avoid this)
result = list(map(lambda x: x * 2, filter(lambda x: x > 3, numbers)))

# Pythonic: list comprehension (clean!)
result = [x * 2 for x in numbers if x > 3]

# Complex transformations -- still use comprehensions
users = [
    {"name": "Alice", "age": 30},
    {"name": "Bob", "age": 17},
    {"name": "Charlie", "age": 25},
]

# Get names of adults, uppercased
adult_names = [
    user["name"].upper()
    for user in users
    if user["age"] >= 18
]
# ['ALICE', 'CHARLIE']
```

```javascript
// JavaScript equivalent (chaining)
const adultNames = users
  .filter((u) => u.age >= 18)
  .map((u) => u.name.toUpperCase());
```

### Kab `map()`/`filter()` Use Karein vs Comprehensions

```python
# Use comprehensions for most cases (Pythonic standard)
result = [f(x) for x in items if condition(x)]

# Use map() when you already have a named function (slightly cleaner)
result = list(map(str, numbers))       # vs [str(x) for x in numbers]
result = list(map(int, string_list))   # vs [int(x) for x in string_list]

# Use map() for lazy evaluation (big data)
# When you don't need the whole list at once
processed = map(expensive_transform, huge_dataset)
for item in processed:
    if should_stop(item):
        break  # Stops computing remaining items
```

> [!tip]
> Rule of thumb: agar tumhare paas already ek named function hai (jaise `str`, `int`), to `map()` use karo. Baaki sab cases mein comprehension likho — zyada readable hoti hai.

---

## `functools.reduce()` vs `Array.reduce()`

Python ne `reduce()` ko builtins se nikaal kar `functools` mein daal diya, kyunki Guido van Rossum (Python ka creator) ko lagta hai ki explicit loops ke muqable ye kam readable hai. JS mein `reduce()` roz ka kaam hai, Python mein ye "last resort" jaisa treat hota hai.

```python
from functools import reduce

numbers = [1, 2, 3, 4, 5]

# Sum using reduce
total = reduce(lambda acc, x: acc + x, numbers)      # 15
total = reduce(lambda acc, x: acc + x, numbers, 0)   # 15 (with initial value)

# But the Pythonic way is:
total = sum(numbers)  # Just use the built-in!

# Reduce for flattening
nested = [[1, 2], [3, 4], [5, 6]]
flat = reduce(lambda acc, x: acc + x, nested, [])
# [1, 2, 3, 4, 5, 6]

# Pythonic way:
flat = [item for sublist in nested for item in sublist]

# Or use itertools
from itertools import chain
flat = list(chain.from_iterable(nested))
```

```javascript
// JavaScript -- reduce is a core array method, used frequently
const total = [1, 2, 3, 4, 5].reduce((acc, x) => acc + x, 0);

const flat = [
  [1, 2],
  [3, 4],
  [5, 6],
].reduce((acc, x) => [...acc, ...x], []);
// Or: .flat()
```

### Kab Reduce Sahi Tool Hai

```python
from functools import reduce
from operator import mul

# Product of all numbers (no built-in for this before Python 3.8)
import math
product = math.prod([1, 2, 3, 4, 5])  # 120 (Python 3.8+)

# Or with reduce
product = reduce(mul, [1, 2, 3, 4, 5])  # 120

# Building complex aggregations
data = [
    {"category": "A", "value": 10},
    {"category": "B", "value": 20},
    {"category": "A", "value": 30},
    {"category": "B", "value": 40},
]

# Group and sum by category
from collections import defaultdict
totals = defaultdict(int)
for item in data:
    totals[item["category"]] += item["value"]
# {'A': 40, 'B': 60}

# This is much clearer than reduce for this use case
```

---

## `lambda` vs Arrow Functions

Python ka `lambda` JavaScript arrow functions ke muqable jaan-boojh kar limited hai — sirf ek single expression, koi multi-line, koi statements nahi.

```python
# Python lambda: SINGLE expression only
double = lambda x: x * 2
add = lambda x, y: x + y
greet = lambda name: f"Hello, {name}"

# NO multi-line, NO statements
# This does NOT work:
# bad = lambda x:
#     result = x * 2
#     return result

# For anything complex, use def
def transform(x):
    intermediate = x * 2
    if intermediate > 10:
        return intermediate - 5
    return intermediate
```

```javascript
// JavaScript arrow functions: can be multi-line
const double = (x) => x * 2;
const add = (x, y) => x + y;

// Multi-line arrow function
const transform = (x) => {
  const intermediate = x * 2;
  if (intermediate > 10) return intermediate - 5;
  return intermediate;
};
```

### Python Mein Lambda Kab Use Hota Hai

```python
# Sorting key functions
users = [("Alice", 30), ("Bob", 25), ("Charlie", 35)]
sorted_by_age = sorted(users, key=lambda u: u[1])

# Inline callbacks
from functools import reduce
result = reduce(lambda a, b: a if a > b else b, numbers)

# Default factory for defaultdict
from collections import defaultdict
counter = defaultdict(lambda: 0)

# In most cases, Python prefers named functions or operator module
from operator import itemgetter, attrgetter
sorted_by_age = sorted(users, key=itemgetter(1))  # Cleaner than lambda
```

---

## `functools.partial` -- Partial Application

`functools.partial` ek naya function banata hai jisme kuch arguments pehle se fill kiye hote hain. Bilkul JavaScript ke `.bind()` jaisa, bas ye kisi bhi callable ke saath kaam karta hai. Socho Swiggy ka "reorder same item" button — restaurant aur item pehle se fix hai, sirf quantity poochta hai.

```python
from functools import partial

def power(base: int, exponent: int) -> int:
    return base ** exponent

# Create specialized versions
square = partial(power, exponent=2)
cube = partial(power, exponent=3)

print(square(5))   # 25
print(cube(3))     # 27

# More practical: pre-configuring functions
import json

# Pretty-print JSON by default
pretty_json = partial(json.dumps, indent=2, sort_keys=True)
print(pretty_json({"b": 2, "a": 1}))

# Pre-configured logging
import logging
debug = partial(print, "[DEBUG]")
error = partial(print, "[ERROR]")

debug("Starting process")   # [DEBUG] Starting process
error("Something failed")   # [ERROR] Something failed

# With map
from functools import partial

def multiply(x: int, factor: int) -> int:
    return x * factor

triple_all = partial(map, partial(multiply, factor=3))
print(list(triple_all([1, 2, 3, 4])))  # [3, 6, 9, 12]
```

```javascript
// JavaScript equivalent: .bind() or wrapper functions
const square = (x) => power(x, 2);
// or
const square = power.bind(null, undefined, 2); // awkward with positional args

// More common in JS: closure
const createMultiplier = (factor) => (x) => x * factor;
const triple = createMultiplier(3);
```

---

## The `operator` Module

`operator` module Python operators ke function-versions deta hai. Ye bahut saare `lambda` calls ko replace kar deta hai — zyada readable bhi aur zyada fast bhi.

```python
import operator

# Instead of lambda
numbers = [3, 1, 4, 1, 5, 9, 2, 6]

# Sorting
sorted(numbers)                              # Default ascending
sorted(numbers, key=operator.neg)            # Descending (negate for reverse)

# Arithmetic operators as functions
operator.add(2, 3)       # 5   -- same as lambda a, b: a + b
operator.mul(4, 5)       # 20  -- same as lambda a, b: a * b
operator.sub(10, 3)      # 7
operator.truediv(10, 3)  # 3.333...

# With reduce
from functools import reduce
product = reduce(operator.mul, [1, 2, 3, 4, 5])  # 120

# Item getters (great for sorting and extracting)
users = [
    {"name": "Alice", "age": 30},
    {"name": "Bob", "age": 25},
    {"name": "Charlie", "age": 35},
]

# Sort by age
sorted_users = sorted(users, key=operator.itemgetter("age"))

# Extract names
get_name = operator.itemgetter("name")
names = list(map(get_name, users))  # ['Alice', 'Bob', 'Charlie']

# Multiple keys
get_name_age = operator.itemgetter("name", "age")
print(get_name_age(users[0]))  # ('Alice', 30)

# Attribute getter (for objects, not dicts)
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

points = [Point(3, 1), Point(1, 4), Point(2, 2)]
sorted_by_x = sorted(points, key=operator.attrgetter("x"))

# Method caller
lines = ["  hello  ", "  world  ", "  foo  "]
stripped = list(map(operator.methodcaller("strip"), lines))
# ['hello', 'world', 'foo']
```

---

## Higher-Order Functions

Higher-order functions matlab wo functions jo function ko argument mein lete hain ya function return karte hain:

```python
from typing import Callable

# Function that returns a function
def make_multiplier(factor: int) -> Callable[[int], int]:
    def multiplier(x: int) -> int:
        return x * factor
    return multiplier

double = make_multiplier(2)
triple = make_multiplier(3)
print(double(5))   # 10
print(triple(5))   # 15

# Function that takes a function
def apply_twice(func: Callable[[int], int], value: int) -> int:
    return func(func(value))

print(apply_twice(double, 3))  # 12 (3 * 2 = 6, 6 * 2 = 12)

# Composing functions
def compose(*funcs: Callable) -> Callable:
    """Compose functions right to left: compose(f, g, h)(x) = f(g(h(x)))"""
    def composed(x):
        result = x
        for func in reversed(funcs):
            result = func(result)
        return result
    return composed

# Pipe functions left to right
def pipe(*funcs: Callable) -> Callable:
    """Pipe functions left to right: pipe(f, g, h)(x) = h(g(f(x)))"""
    def piped(x):
        result = x
        for func in funcs:
            result = func(result)
        return result
    return piped

# Usage
process = pipe(
    str.strip,
    str.lower,
    lambda s: s.replace(" ", "_"),
)

print(process("  Hello World  "))  # "hello_world"
```

```javascript
// JavaScript equivalents
const makeMultiplier = (factor) => (x) => x * factor;
const double = makeMultiplier(2);

// Compose with reduce
const compose =
  (...fns) =>
  (x) =>
    fns.reduceRight((acc, fn) => fn(acc), x);

const pipe =
  (...fns) =>
  (x) =>
    fns.reduce((acc, fn) => fn(acc), x);
```

---

## itertools as a Functional Programming Toolkit

`itertools` lazy, composable building blocks deta hai — jaise LEGO blocks jinhe joड़ के tum apna pipeline bana sakte ho, bina poora data memory mein load kiye.

```python
import itertools
from functools import reduce
from operator import add

# starmap -- like map but unpacks tuples
pairs = [(2, 3), (4, 5), (6, 7)]
products = list(itertools.starmap(lambda a, b: a * b, pairs))
# [6, 20, 42]

# Functional pipeline with itertools
data = range(1, 101)

# Pipeline: take evens, square them, take first 10, sum them
pipeline = itertools.islice(
    (x ** 2 for x in data if x % 2 == 0),
    10,
)
result = sum(pipeline)
print(result)  # 4 + 16 + 36 + 64 + 100 + 144 + 196 + 256 + 324 + 400 = 1540

# tee -- split an iterator into multiple independent iterators
data = iter(range(10))
iter1, iter2 = itertools.tee(data, 2)
# iter1 and iter2 can be consumed independently

# Pairwise comparisons (Python 3.10+)
numbers = [1, 3, 5, 2, 8, 4]
pairs = itertools.pairwise(numbers)
# (1,3), (3,5), (5,2), (2,8), (8,4)

diffs = [b - a for a, b in itertools.pairwise(numbers)]
# [2, 2, -3, 6, -4]
```

---

## Immutability Patterns

Python by default immutable nahi hai (Haskell ki tarah nahi, ya TS ke `readonly` ki tarah bhi nahi). Lekin immutability enforce karne ke tareeke hain.

### Tuples (Immutable Lists)

```python
# tuple is immutable
point = (3.0, 4.0)
# point[0] = 5.0  # TypeError: 'tuple' does not support item assignment

# Named tuples for readable immutable records
from typing import NamedTuple

class Point(NamedTuple):
    x: float
    y: float

p = Point(3.0, 4.0)
print(p.x, p.y)        # 3.0 4.0
# p.x = 5.0            # AttributeError: can't set attribute

# Create modified copies
p2 = p._replace(x=5.0)  # Point(x=5.0, y=4.0)
```

### Frozenset (Immutable Set)

```python
# Regular set -- mutable
s = {1, 2, 3}
s.add(4)  # OK

# Frozenset -- immutable
fs = frozenset({1, 2, 3})
# fs.add(4)  # AttributeError: 'frozenset' has no attribute 'add'

# Can be used as dict key or in other sets (hashable)
cache: dict[frozenset[str], str] = {}
cache[frozenset({"a", "b"})] = "result"
```

### Frozen Dataclasses

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Config:
    host: str
    port: int
    debug: bool = False

config = Config(host="localhost", port=8080)
# config.port = 9090  # FrozenInstanceError!

# Create modified copy with dataclasses.replace
from dataclasses import replace
config2 = replace(config, port=9090)  # New Config with port=9090
```

```typescript
// TypeScript equivalent
interface Config {
  readonly host: string;
  readonly port: number;
  readonly debug: boolean;
}
// Or: Readonly<Config>
```

### MappingProxyType (Immutable Dict View)

> [!warning]
> `MappingProxyType` sirf ek "view" hai — original dict change hone par ye bhi change ho jaata hai. Ye actual immutability nahi deta, bas read-only access deta hai.

```python
from types import MappingProxyType

data = {"key": "value", "count": 42}
frozen_data = MappingProxyType(data)

print(frozen_data["key"])      # "value"
# frozen_data["key"] = "new"   # TypeError: 'mappingproxy' does not support item assignment

# Note: it's a VIEW -- changes to original dict ARE reflected
data["key"] = "changed"
print(frozen_data["key"])      # "changed"
```

---

## Python Mein Functional vs OOP Kab Use Karein

### Pythonic Balance

Python ki philosophy pure functional ya pure OOP nahi hai. Community consensus kuch aisa hai:

```python
# FUNCTIONAL style: transforming data
# Use for: data pipelines, transformations, filtering

# Good -- list comprehension (functional-ish, Pythonic)
active_users = [u for u in users if u.is_active]
user_names = [u.name.upper() for u in active_users]

# Good -- generator pipeline for large data
def process_log(filepath):
    with open(filepath) as f:
        lines = (line.strip() for line in f)
        parsed = (parse_line(line) for line in lines)
        errors = (entry for entry in parsed if entry["level"] == "ERROR")
        yield from errors

# OOP style: modeling entities with behavior
# Use for: domain objects, services, complex state

class UserService:
    def __init__(self, db: Database, cache: Cache):
        self.db = db
        self.cache = cache

    def get_user(self, user_id: int) -> User:
        cached = self.cache.get(f"user:{user_id}")
        if cached:
            return cached
        user = self.db.find_user(user_id)
        self.cache.set(f"user:{user_id}", user)
        return user
```

### Guidelines

| Kab Functional Use Karein | Kab OOP Use Karein |
|---|---|
| Data transform karte waqt | Domain entities model karte waqt |
| Stateless operations | State manage karte waqt |
| Pipelines / workflows | Complex behaviors |
| Simple scripts | Large applications |
| Collections process karte waqt | Dependency injection |

```python
# AVOID: over-functional Python (not Pythonic)
result = reduce(
    lambda acc, x: {**acc, x[0]: x[1]},
    map(
        lambda item: (item["name"], item["value"]),
        filter(lambda item: item["active"], data)
    ),
    {}
)

# PREFER: readable Pythonic code
result = {
    item["name"]: item["value"]
    for item in data
    if item["active"]
}

# AVOID: unnecessary classes
class Adder:
    @staticmethod
    def add(a, b):
        return a + b

# PREFER: just a function
def add(a, b):
    return a + b
```

> [!info]
> Agar tumhe lag raha hai ki tum Python ko JavaScript ki tarah likh rahe ho (chained map/filter/reduce), to ruk jao — 99% chance hai ki ek clean list comprehension available hai.

---

## Complete Example: Functional Data Pipeline

Chalo ek real example dekhte hain — jaise Flipkart ke sales data ko process karna hai, functional patterns use karke.

```python
"""
Process sales data using functional programming patterns.
Shows the Pythonic way: comprehensions + itertools + named functions.
"""

from dataclasses import dataclass
from datetime import date
from itertools import groupby
from operator import attrgetter
from functools import reduce
from typing import Iterator

@dataclass(frozen=True)
class Sale:
    date: date
    product: str
    quantity: int
    price: float

    @property
    def total(self) -> float:
        return self.quantity * self.price

# Sample data
sales: list[Sale] = [
    Sale(date(2024, 1, 15), "Widget", 10, 9.99),
    Sale(date(2024, 1, 15), "Gadget", 5, 24.99),
    Sale(date(2024, 1, 16), "Widget", 8, 9.99),
    Sale(date(2024, 1, 16), "Doohickey", 3, 49.99),
    Sale(date(2024, 1, 17), "Gadget", 12, 24.99),
    Sale(date(2024, 1, 17), "Widget", 15, 9.99),
]

# Functional operations (Pythonic style)

# 1. Filter: sales over $50 total
big_sales = [s for s in sales if s.total > 50]

# 2. Map: extract product names
product_names = [s.product for s in sales]

# 3. Unique products (set comprehension)
unique_products = {s.product for s in sales}

# 4. Total revenue (built-in sum with generator)
total_revenue = sum(s.total for s in sales)

# 5. Group by product and sum
sorted_sales = sorted(sales, key=attrgetter("product"))
revenue_by_product = {
    product: sum(s.total for s in group)
    for product, group in groupby(sorted_sales, key=attrgetter("product"))
}

# 6. Pipeline: find the top product by revenue
top_product = max(revenue_by_product.items(), key=lambda x: x[1])
print(f"Top product: {top_product[0]} (${top_product[1]:.2f})")

# 7. Daily summary (functional pipeline)
def daily_summary(sales: list[Sale]) -> dict[date, float]:
    sorted_by_date = sorted(sales, key=attrgetter("date"))
    return {
        day: sum(s.total for s in group)
        for day, group in groupby(sorted_by_date, key=attrgetter("date"))
    }

print(daily_summary(sales))
```

---

## Practice Exercises

### Exercise 1: Comprehension vs Functional
Har ek ko (a) `map`/`filter`/`reduce` se aur (b) comprehensions se dobara likho:

1. 1 se 50 tak ke saare odd numbers ka square nikalo
2. Strings ki list se, un strings ki lengths nikalo jo "a" se start hoti hain (case-insensitive)
3. List of lists ko flatten karke saare even numbers ka sum nikalo
4. "name" aur "score" wale dicts ki list di gayi hai, jinka score 70 se zyada hai unka average score nikalo

### Exercise 2: Compose and Pipe
`compose()` aur `pipe()` functions implement karo. Fir ek text processing pipeline banao:
1. Whitespace strip karo
2. Lowercase mein convert karo
3. Spaces ko hyphens se replace karo
4. Koi bhi non-alphanumeric characters remove karo (hyphens ko chhod ke)
5. 50 characters tak truncate karo

Test karo: `"  Hello, World!  This is a TEST... #Python  "`

### Exercise 3: Immutable Data Transformations
Ek immutable `BankAccount` banao frozen dataclass use karke:
- `owner`, `balance`, `transaction_history` (floats ka tuple) fields hon
- `deposit(amount)` ek NAYA BankAccount return kare updated balance/history ke saath
- `withdraw(amount)` ek NAYA BankAccount return kare (ya raise kare agar balance kam ho)
- `__add__` implement karo do accounts merge karne ke liye
- Saare operations pure hone chahiye (koi side effects nahi, koi mutation nahi)

### Exercise 4: Functional Error Handling
Ek `Result` type implement karo (Rust ke Result ya fp-ts ke Either jaisa):
```python
@dataclass(frozen=True)
class Ok(Generic[T]):
    value: T

@dataclass(frozen=True)
class Err(Generic[E]):
    error: E

Result = Ok[T] | Err[E]
```
- `map`, `flat_map` (bind), aur `unwrap_or` methods implement karo
- Ek chain of operations banao: parse string -> validate -> transform -> format
- Har step alag error type ke saath fail ho sakta hai

### Exercise 5: Lazy Evaluation Pipeline
Ek `LazyPipeline` class banao jo:
- Ek iterable input mein accept kare
- `.map(func)`, `.filter(pred)`, `.take(n)`, `.skip(n)` methods rakhe
- Saare operations lazy hon (generators ka use karte hue internally)
- `.collect()` result ko list ke roop mein materialize kare
- `.reduce(func, initial)` pipeline ko ek fold ke saath consume kare

```python
result = (
    LazyPipeline(range(1_000_000))
    .filter(lambda x: x % 2 == 0)
    .map(lambda x: x ** 2)
    .take(10)
    .collect()
)
# Should be fast and memory-efficient
```

## Key Takeaways

- Python mein `map()`/`filter()` ke bajaye list comprehensions Pythonic tareeka hain — zyada readable aur idiomatic.
- `reduce()` explicit karna pade to `functools` se import karo, lekin pehle `sum()`, `math.prod()` jaise built-ins check karo.
- `lambda` sirf single expression ke liye hai — kuch bhi complex ho to `def` use karo.
- `functools.partial` JS ke `.bind()` jaisa hai — arguments pre-fill karke specialized functions banata hai.
- `operator` module lambdas ka clean, fast alternative deta hai — especially sorting/extracting ke liye.
- `itertools` lazy, memory-efficient pipelines banane ke liye best hai — bade datasets ke liye zaruri.
- Immutability enforce karne ke liye tuples, frozensets, aur frozen dataclasses use karo.
- Python na purely functional hai na purely OOP — data transformation ke liye functional, domain modeling ke liye OOP use karo.
