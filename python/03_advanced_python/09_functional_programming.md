# Functional Programming in Python

## Ek Practical Tareeka

Dekho, Python ek multi-paradigm language hai — JavaScript mein jaise functional programming ka boom hai (especially React/frontend pe), Python wahan thoda balanced approach leta hai. Guido van Rossum ne Python ki philosophy aise banai: "kya zaruri hai ek hi obvious tareeka ho kuch karne ka," aur wo tareeka usually FP aur OOP ka mix hota hai.

Node.js/TS developer ho to tumhe FP ke concepts familiar lagenge, bas "Pythonic" tareeke se unhe use karna JavaScript se bilkul alag hota hai. Chalo dekh lete hain kya farak hai.

---

## `map()`, `filter()` vs Array Methods

### `map()` — Sab ko Same Transform Karo

Socho `map()` ek Zomato delivery batch jaisa hai — tumhe sabke orders ko same tareeke se process karna hai (jaise sab ko discount dena), bas turant result nahi milta, lazy evaluation hota hai.

```python
# Python map() ek iterator return karta hai (lazy)
numbers = [1, 2, 3, 4, 5]
doubled = map(lambda x: x * 2, numbers)
print(type(doubled))     # <class 'map'>
print(list(doubled))     # [2, 4, 6, 8, 10]

# Lekin Pythonic tareeka list comprehension hai:
doubled = [x * 2 for x in numbers]  # Ye preferred hai!
```

```javascript
// JavaScript -- method directly array par chalti hai
const doubled = [1, 2, 3, 4, 5].map((x) => x * 2);
// [2, 4, 6, 8, 10]
```

### `filter()` — Sirf Zaruri Cheezein Nikalo

`filter()` ka kaam simple hai — ek condition function do, wo har item pe check karega, aur sirf jo `True` return karein wahi bache rahenge. Socho ek bouncer jo IRCTC ticket counter par khada hai — sirf 18+ adults ko hi ticket deta hai.

```python
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# Python filter()
evens = filter(lambda x: x % 2 == 0, numbers)
print(list(evens))  # [2, 4, 6, 8, 10]

# Pythonic tareeka: list comprehension with condition
evens = [x for x in numbers if x % 2 == 0]  # Ye preferred hai!
```

```javascript
// JavaScript
const evens = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((x) => x % 2 === 0);
```

### Chaining (Map + Filter) — JavaScript Style Nahi Chalta

JavaScript mein `.filter().map()` chaining bohot aam hai, lekin Python mein aisa direct nahi. Python ka tareeka alag hi hota hai.

```python
# JavaScript style chaining Python mein nahi chalti:
# numbers.filter(x => x > 3).map(x => x * 2)  // Possible nahi hai Python mein

# Option 1: map/filter ko nest karo (ugly, matlab avoid karo!)
result = list(map(lambda x: x * 2, filter(lambda x: x > 3, numbers)))

# Option 2: List comprehension (clean, Pythonic!)
result = [x * 2 for x in numbers if x > 3]

# Complex transformations bhi comprehension se hi best hai
users = [
    {"name": "Alice", "age": 30},
    {"name": "Bob", "age": 17},
    {"name": "Charlie", "age": 25},
]

# Adult users ke names nikalo, uppercase mein
adult_names = [
    user["name"].upper()
    for user in users
    if user["age"] >= 18
]
# ['ALICE', 'CHARLIE']
```

```javascript
// JavaScript equivalent (simple chaining)
const adultNames = users
  .filter((u) => u.age >= 18)
  .map((u) => u.name.toUpperCase());
```

### Kab `map()`/`filter()` Use Karein vs Comprehensions

```python
# Zyadatar cases mein comprehension use karo (Pythonic standard)
result = [f(x) for x in items if condition(x)]

# map() use karo jab tera paas already ek named function hai (thoda cleaner)
result = list(map(str, numbers))       # vs [str(x) for x in numbers]
result = list(map(int, string_list))   # vs [int(x) for x in string_list]

# map() use karo lazy evaluation ke liye (bade dataset pe)
# Jab tujhe poora list ek saath nahi chahiye
processed = map(expensive_transform, huge_dataset)
for item in processed:
    if should_stop(item):
        break  # Baaki items compute nahi honge
```

> [!tip]
> Rule of thumb: Agar tera paas already ek named function hai (jaise `str`, `int`), to `map()` use kar. Baaki sab cases mein list comprehension likho — zyada readable aur Pythonic hoti hai.

---

## `functools.reduce()` vs `Array.reduce()`

Jante ho kya? Python ne `reduce()` ko builtins se nikaal kar `functools` mein daal diya, kyunki Guido ko lagta tha ki explicit loops ke muqble ye kam readable nahi hoti. JavaScript mein `reduce()` roz ka kaam hai, lekin Python mein ye "last resort" jaisa treat hota hai.

```python
from functools import reduce

numbers = [1, 2, 3, 4, 5]

# reduce use karke sum nikalo
total = reduce(lambda acc, x: acc + x, numbers)      # 15
total = reduce(lambda acc, x: acc + x, numbers, 0)   # 15 (initial value ke saath)

# Lekin Pythonic tareeka to ye hai:
total = sum(numbers)  # Bas built-in use kar!

# Reduce flatten karne ke liye (lists ko combine karna)
nested = [[1, 2], [3, 4], [5, 6]]
flat = reduce(lambda acc, x: acc + x, nested, [])
# [1, 2, 3, 4, 5, 6]

# Pythonic tareeka:
flat = [item for sublist in nested for item in sublist]

# Ya phir itertools use kar
from itertools import chain
flat = list(chain.from_iterable(nested))
```

```javascript
// JavaScript -- reduce array ka core method hai, bahut use hota hai
const total = [1, 2, 3, 4, 5].reduce((acc, x) => acc + x, 0);

const flat = [
  [1, 2],
  [3, 4],
  [5, 6],
].reduce((acc, x) => [...acc, ...x], []);
// Ya sirf .flat() use kar
```

### Kab Reduce Sach Mein Kaam Aata Hai

```python
from functools import reduce
from operator import mul

# Product nikalne ke liye (sum/max/min ke baad ye hi common case hai)
import math
product = math.prod([1, 2, 3, 4, 5])  # 120 (Python 3.8+)

# Ya reduce se
product = reduce(mul, [1, 2, 3, 4, 5])  # 120

# Complex aggregations ka case
data = [
    {"category": "A", "value": 10},
    {"category": "B", "value": 20},
    {"category": "A", "value": 30},
    {"category": "B", "value": 40},
]

# Ek to groupby approach (jyada clear)
from collections import defaultdict
totals = defaultdict(int)
for item in data:
    totals[item["category"]] += item["value"]
# {'A': 40, 'B': 60}

# Ye reduce se kahin zyada readable aur simple hai
```

---

## `lambda` vs Arrow Functions

Python ka `lambda` JavaScript ke arrow functions ke muqble jaan-boojh kar limited hai — sirf ek single expression, multi-line nahi, koi statements nahi.

```python
# Python lambda: SIRF EK expression chalti hai
double = lambda x: x * 2
add = lambda x, y: x + y
greet = lambda name: f"Hello, {name}"

# Multi-line, statements? Bilkul nahi allowed
# Ye nahi chalega:
# bad = lambda x:
#     result = x * 2
#     return result

# Kuch bhi complex ho to def use kar
def transform(x):
    intermediate = x * 2
    if intermediate > 10:
        return intermediate - 5
    return intermediate
```

```javascript
// JavaScript arrow functions: multi-line ho sakte hain
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
# Sorting mein key functions
users = [("Alice", 30), ("Bob", 25), ("Charlie", 35)]
sorted_by_age = sorted(users, key=lambda u: u[1])

# Inline callbacks
from functools import reduce
result = reduce(lambda a, b: a if a > b else b, numbers)

# defaultdict ke liye default factory
from collections import defaultdict
counter = defaultdict(lambda: 0)

# Zyadatar cases mein Python named functions prefer karta hai (ya operator module)
from operator import itemgetter, attrgetter
sorted_by_age = sorted(users, key=itemgetter(1))  # Lambda se cleaner
```

---

## `functools.partial` — Partial Application / Pre-filling Arguments

`functools.partial` ek naya function banata hai jisme kuch arguments pehle se fill kiye hote hain. Bilkul JavaScript ke `.bind()` jaisa hota hai, bas ye kisi bhi callable ke saath kaam karti hai. Socho Swiggy ka "reorder" button — restaurant aur dish pehle se fix hai, sirf quantity decide karna baaki reh jaata hai.

```python
from functools import partial

def power(base: int, exponent: int) -> int:
    return base ** exponent

# Specialized versions bana
square = partial(power, exponent=2)
cube = partial(power, exponent=3)

print(square(5))   # 25
print(cube(3))     # 27

# Practical example: pre-configured functions
import json

# JSON ko always pretty-print karo (indent + sorted keys)
pretty_json = partial(json.dumps, indent=2, sort_keys=True)
print(pretty_json({"b": 2, "a": 1}))

# Logging prefix ke saath
import logging
debug = partial(print, "[DEBUG]")
error = partial(print, "[ERROR]")

debug("Starting process")   # [DEBUG] Starting process
error("Something failed")   # [ERROR] Something failed

# Map ke saath use karna
from functools import partial

def multiply(x: int, factor: int) -> int:
    return x * factor

triple_all = partial(map, partial(multiply, factor=3))
print(list(triple_all([1, 2, 3, 4])))  # [3, 6, 9, 12]
```

```javascript
// JavaScript equivalent: .bind() ya wrapper functions
const square = (x) => power(x, 2);
// ya
const square = power.bind(null, undefined, 2); // positional args se awkward

// JS mein usually closure hi use hota hai
const createMultiplier = (factor) => (x) => x * factor;
const triple = createMultiplier(3);
```

---

## `operator` Module — Python Operators as Functions

`operator` module Python operators ke function versions deta hai. Ye bahut `lambda` calls ko replace kar deta hai — zyada readable bhi aur faster bhi.

```python
import operator

# Lambda ke bajaye
numbers = [3, 1, 4, 1, 5, 9, 2, 6]

# Sorting
sorted(numbers)                              # Default ascending
sorted(numbers, key=operator.neg)            # Descending (negate karo)

# Arithmetic operators function ke taur pe
operator.add(2, 3)       # 5   -- lambda a, b: a + b jaisa
operator.mul(4, 5)       # 20  -- lambda a, b: a * b jaisa
operator.sub(10, 3)      # 7
operator.truediv(10, 3)  # 3.333...

# reduce ke saath
from functools import reduce
product = reduce(operator.mul, [1, 2, 3, 4, 5])  # 120

# Item getters (sorting aur extracting ke liye bahut acha)
users = [
    {"name": "Alice", "age": 30},
    {"name": "Bob", "age": 25},
    {"name": "Charlie", "age": 35},
]

# Age se sort karo
sorted_users = sorted(users, key=operator.itemgetter("age"))

# Names extract karo
get_name = operator.itemgetter("name")
names = list(map(get_name, users))  # ['Alice', 'Bob', 'Charlie']

# Multiple keys bhi use kar sakte ho
get_name_age = operator.itemgetter("name", "age")
print(get_name_age(users[0]))  # ('Alice', 30)

# Attribute getter (objects ke liye, dicts nahi)
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float

points = [Point(3, 1), Point(1, 4), Point(2, 2)]
sorted_by_x = sorted(points, key=operator.attrgetter("x"))

# Method caller (strings par strip() call karna, etc)
lines = ["  hello  ", "  world  ", "  foo  "]
stripped = list(map(operator.methodcaller("strip"), lines))
# ['hello', 'world', 'foo']
```

---

## Higher-Order Functions — Functions Within Functions

Higher-order functions matlab wo functions jo function ko argument mein lete hain ya function return karte hain. Ye FP ka core concept hai.

```python
from typing import Callable

# Function jo function return kare
def make_multiplier(factor: int) -> Callable[[int], int]:
    def multiplier(x: int) -> int:
        return x * factor
    return multiplier

double = make_multiplier(2)
triple = make_multiplier(3)
print(double(5))   # 10
print(triple(5))   # 15

# Function jo function lele argument mein
def apply_twice(func: Callable[[int], int], value: int) -> int:
    return func(func(value))

print(apply_twice(double, 3))  # 12 (3 * 2 = 6, 6 * 2 = 12)

# Functions ko combine karna (composition)
def compose(*funcs: Callable) -> Callable:
    """Right to left: compose(f, g, h)(x) = f(g(h(x)))"""
    def composed(x):
        result = x
        for func in reversed(funcs):
            result = func(result)
        return result
    return composed

# Functions ko left to right chain karna (pipe)
def pipe(*funcs: Callable) -> Callable:
    """Left to right: pipe(f, g, h)(x) = h(g(f(x)))"""
    def piped(x):
        result = x
        for func in funcs:
            result = func(result)
        return result
    return piped

# Practical use case
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

## `itertools` — Lazy, Composable Building Blocks

`itertools` lazy, composable building blocks deta hai — LEGO blocks jaisa jinka use karke tum apna pipeline bana sakte ho, bina poora data memory mein load kiye. Iska matlab? Bade datasets par woh bahut fast aur efficient hai.

```python
import itertools
from functools import reduce
from operator import add

# starmap -- map jaisa, bas tuples unpack kare
pairs = [(2, 3), (4, 5), (6, 7)]
products = list(itertools.starmap(lambda a, b: a * b, pairs))
# [6, 20, 42]

# Functional pipeline itertools ke saath
data = range(1, 101)

# Pipeline: evens nikalo, square karo, first 10 lo, sum karo
pipeline = itertools.islice(
    (x ** 2 for x in data if x % 2 == 0),
    10,
)
result = sum(pipeline)
print(result)  # 4 + 16 + 36 + 64 + 100 + 144 + 196 + 256 + 324 + 400 = 1540

# tee -- ek iterator ko split karke do independent iterators banao
data = iter(range(10))
iter1, iter2 = itertools.tee(data, 2)
# iter1 aur iter2 ko independently consume kar sakte ho

# Pairwise comparisons (Python 3.10+)
numbers = [1, 3, 5, 2, 8, 4]
pairs = itertools.pairwise(numbers)
# (1,3), (3,5), (5,2), (2,8), (8,4)

diffs = [b - a for a, b in itertools.pairwise(numbers)]
# [2, 2, -3, 6, -4]
```

---

## Immutability Patterns

Python by default immutable nahi hai (Haskell ki tarah nahi, ya TypeScript ke `readonly` ki tarah). Lekin agar tujhe immutability enforce karni hai, to tareeke hain.

### Tuples (Immutable Lists)

```python
# Tuple immutable hoti hai
point = (3.0, 4.0)
# point[0] = 5.0  # Ye error de gaa: TypeError

# NamedTuples readable immutable records banate hain
from typing import NamedTuple

class Point(NamedTuple):
    x: float
    y: float

p = Point(3.0, 4.0)
print(p.x, p.y)        # 3.0 4.0
# p.x = 5.0            # AttributeError

# Modified copy banao (original unchanged)
p2 = p._replace(x=5.0)  # Point(x=5.0, y=4.0)
```

### Frozenset (Immutable Set)

```python
# Regular set -- mutable
s = {1, 2, 3}
s.add(4)  # OK, modify kar sakte ho

# Frozenset -- immutable
fs = frozenset({1, 2, 3})
# fs.add(4)  # AttributeError

# Dictionary key ya set mein use kar sakte ho (hashable hote hain)
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

# Modified copy banao
from dataclasses import replace
config2 = replace(config, port=9090)  # Naya Config, port changed
```

```typescript
// TypeScript equivalent
interface Config {
  readonly host: string;
  readonly port: number;
  readonly debug: boolean;
}
// Ya: Readonly<Config>
```

### MappingProxyType (Dict ka Read-Only View)

> [!warning]
> `MappingProxyType` sirf ek "view" hai — original dict change hone par ye bhi change ho jaata hai. Ye asli immutability nahi hai, sirf read-only access.

```python
from types import MappingProxyType

data = {"key": "value", "count": 42}
frozen_data = MappingProxyType(data)

print(frozen_data["key"])      # "value"
# frozen_data["key"] = "new"   # TypeError

# Note: Ye ek VIEW hai -- original dict change hone par ye bhi change hota hai
data["key"] = "changed"
print(frozen_data["key"])      # "changed"
```

---

## Python Mein Functional vs OOP — Kab Kya Use Karein

### Pythonic Balance

Python pure functional ya pure OOP nahi hai. Python community ka consensus kuch aisa hai:

```python
# FUNCTIONAL style: data ko transform karna
# Use jab: data pipelines, transformations, filtering

# Good -- list comprehension (functional-ish, Pythonic)
active_users = [u for u in users if u.is_active]
user_names = [u.name.upper() for u in active_users]

# Good -- generator pipeline bade data ke liye
def process_log(filepath):
    with open(filepath) as f:
        lines = (line.strip() for line in f)
        parsed = (parse_line(line) for line in lines)
        errors = (entry for entry in parsed if entry["level"] == "ERROR")
        yield from errors

# OOP style: entities ko model karna + behavior define karna
# Use jab: domain objects, services, complex state

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

### Guidelines Table

| Kab Functional? | Kab OOP? |
|---|---|
| Data transform karte waqt | Domain entities model karte waqt |
| Stateless operations | State manage karte waqt |
| Pipelines / workflows | Complex behaviors |
| Simple scripts | Bade applications |
| Collections process karte waqt | Dependency injection |

```python
# AVOID: Over-functional Python (bilkul nahi Pythonic)
result = reduce(
    lambda acc, x: {**acc, x[0]: x[1]},
    map(
        lambda item: (item["name"], item["value"]),
        filter(lambda item: item["active"], data)
    ),
    {}
)

# PREFER: Readable Pythonic code
result = {
    item["name"]: item["value"]
    for item in data
    if item["active"]
}

# AVOID: Unnecessary classes
class Adder:
    @staticmethod
    def add(a, b):
        return a + b

# PREFER: Sirf ek function
def add(a, b):
    return a + b
```

> [!info]
> Agar lagta hai ki tum Python ko JavaScript ki tarah likh rahe ho (chained map/filter/reduce), to rukh ja — 99% chance hai ki ek simple list comprehension available hai.

---

## Real Example: Functional Data Pipeline

Chalo Flipkart ke sales data ko process karte hain, functional patterns use karke. Isse samjh aayega ki practical mein kaise use hote hain ye concepts.

```python
"""
Sales data ko process karna functional programming patterns se.
Pythonic way: comprehensions + itertools + named functions.
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

# 1. Filter: sales jinki total $50 se zyada hai
big_sales = [s for s in sales if s.total > 50]

# 2. Map: product names nikalo
product_names = [s.product for s in sales]

# 3. Unique products (set comprehension)
unique_products = {s.product for s in sales}

# 4. Total revenue (built-in sum + generator)
total_revenue = sum(s.total for s in sales)

# 5. Group by product aur sum karo
sorted_sales = sorted(sales, key=attrgetter("product"))
revenue_by_product = {
    product: sum(s.total for s in group)
    for product, group in groupby(sorted_sales, key=attrgetter("product"))
}

# 6. Pipeline: Top product revenue se
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
Har ek ko (a) `map`/`filter`/`reduce` se aur (b) comprehensions se likho:

1. 1 se 50 tak saare odd numbers ka square nikalo
2. Strings ki list se, un strings ki lengths nikalo jo "a" se start karti hain (case-insensitive)
3. List of lists ko flatten karke saare even numbers ka sum nikalo
4. Dicts ki list (jisme "name" aur "score" ho) di gayi hai, jinka score 70 se zyada hai unka average score nikalo

### Exercise 2: Compose aur Pipe
`compose()` aur `pipe()` functions implement karo. Phir ek text processing pipeline banao:
1. Whitespace strip karo
2. Lowercase mein convert karo
3. Spaces ko hyphens se replace karo
4. Non-alphanumeric characters remove karo (hyphens ko chhod ke)
5. 50 characters tak truncate karo

Test: `"  Hello, World!  This is a TEST... #Python  "`

### Exercise 3: Immutable Data Transformations
Ek immutable `BankAccount` banao frozen dataclass se:
- Fields: `owner`, `balance`, `transaction_history` (tuple of floats)
- `deposit(amount)` — naya BankAccount return kare updated balance/history ke saath
- `withdraw(amount)` — naya BankAccount return kare (ya raise kare agar balance kam ho)
- `__add__` implement karo do accounts merge karne ke liye
- Saare operations pure hone chahiye (koi side effects nahi, mutations nahi)

### Exercise 4: Functional Error Handling
Ek `Result` type implement karo (Rust ka Result ya fp-ts ka Either):
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
- Operations ka ek chain banao: parse string -> validate -> transform -> format
- Har step alag error type se fail kar sakta hai

### Exercise 5: Lazy Evaluation Pipeline
Ek `LazyPipeline` class banao:
- Ek iterable input mein accept kare
- `.map(func)`, `.filter(pred)`, `.take(n)`, `.skip(n)` methods rakhe
- Saare operations lazy hon (generators internally)
- `.collect()` result ko list mein materialize kare
- `.reduce(func, initial)` pipeline ko fold karke consume kare

```python
result = (
    LazyPipeline(range(1_000_000))
    .filter(lambda x: x % 2 == 0)
    .map(lambda x: x ** 2)
    .take(10)
    .collect()
)
# Fast aur memory-efficient hona chahiye
```

## Key Takeaways

- Python mein `map()`/`filter()` ke bajaye list comprehensions Pythonic tareeka hain — zyada readable aur idiomatic.
- `reduce()` zaruri pad jaye to `functools` se import karo, lekin pehle `sum()`, `math.prod()` jaise built-ins check kar.
- `lambda` sirf single expression ke liye hai — complex ho to `def` use kar.
- `functools.partial` JavaScript ke `.bind()` jaisa hai — arguments pre-fill karke specialized functions ban sakte ho.
- `operator` module lambdas ka clean, fast alternative deta hai — especially sorting/extracting ke liye perfect.
- `itertools` lazy, memory-efficient pipelines banata hai — bade datasets ke liye zaruri.
- Immutability enforce karne ke liye tuples, frozensets, aur frozen dataclasses use kar.
- Python na purely functional hai na purely OOP — data transformation ke liye functional, domain modeling ke liye OOP.
