# Functional Programming in Python

## A Pragmatic Approach

Python is a multi-paradigm language. Unlike JavaScript where functional programming (FP) has become the dominant style (especially in React/frontend), Python takes a more balanced approach. Python's philosophy is "there should be one -- and preferably only one -- obvious way to do it," and that way is often a mix of FP and OOP.

As a Node.js/TS developer, you'll recognize many FP concepts here, but the "Pythonic" way of using them is different from the JavaScript way.

---

## `map()`, `filter()` vs Array Methods

### `map()`

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

### When to Use `map()`/`filter()` vs Comprehensions

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

---

## `functools.reduce()` vs `Array.reduce()`

Python moved `reduce()` out of builtins into `functools` because Guido van Rossum (Python's creator) finds it less readable than explicit loops.

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

### When Reduce IS the Right Tool

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

Python's `lambda` is intentionally limited compared to JavaScript arrow functions:

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

### Lambda Use Cases in Python

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

`functools.partial` creates a new function with some arguments pre-filled. It's like `.bind()` in JavaScript but for any callable.

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

The `operator` module provides function versions of Python operators. It replaces many `lambda` calls with more readable and faster alternatives.

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

Functions that take or return functions:

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

`itertools` provides lazy, composable building blocks:

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

Python isn't immutable by default (unlike Haskell or even TS with `readonly`). But you can enforce immutability:

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

## When to Use Functional vs OOP in Python

### The Pythonic Balance

Python's philosophy isn't purely functional or purely OOP. Here's the community consensus:

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

| Use Functional When | Use OOP When |
|---|---|
| Transforming data | Modeling domain entities |
| Stateless operations | Managing state |
| Pipelines / workflows | Complex behaviors |
| Simple scripts | Large applications |
| Processing collections | Dependency injection |

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

---

## Complete Example: Functional Data Pipeline

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
Rewrite each using (a) `map`/`filter`/`reduce` and (b) comprehensions:

1. Get the square of all odd numbers from 1 to 50
2. From a list of strings, get the lengths of strings that start with "a" (case-insensitive)
3. Flatten a list of lists and sum all the even numbers
4. Given a list of dicts with "name" and "score", get the average score of people who scored above 70

### Exercise 2: Compose and Pipe
Implement `compose()` and `pipe()` functions. Then build a text processing pipeline:
1. Strip whitespace
2. Convert to lowercase
3. Replace spaces with hyphens
4. Remove any non-alphanumeric characters (except hyphens)
5. Truncate to 50 characters

Test with: `"  Hello, World!  This is a TEST... #Python  "`

### Exercise 3: Immutable Data Transformations
Create an immutable `BankAccount` using a frozen dataclass:
- Has `owner`, `balance`, `transaction_history` (tuple of floats)
- `deposit(amount)` returns a NEW BankAccount with updated balance/history
- `withdraw(amount)` returns a NEW BankAccount (or raises if insufficient)
- Implement `__add__` to merge two accounts
- All operations must be pure (no side effects, no mutation)

### Exercise 4: Functional Error Handling
Implement a `Result` type (like Rust's Result or fp-ts Either):
```python
@dataclass(frozen=True)
class Ok(Generic[T]):
    value: T

@dataclass(frozen=True)
class Err(Generic[E]):
    error: E

Result = Ok[T] | Err[E]
```
- Implement `map`, `flat_map` (bind), and `unwrap_or` methods
- Build a chain of operations: parse string -> validate -> transform -> format
- Each step can fail with a different error type

### Exercise 5: Lazy Evaluation Pipeline
Build a `LazyPipeline` class that:
- Accepts an iterable as input
- Has `.map(func)`, `.filter(pred)`, `.take(n)`, `.skip(n)` methods
- All operations are lazy (using generators internally)
- `.collect()` materializes the result as a list
- `.reduce(func, initial)` consumes the pipeline with a fold

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
