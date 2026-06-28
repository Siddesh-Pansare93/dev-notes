# 10 - Comprehensions

## Coming from Node.js/TypeScript

Comprehensions are one of Python's most distinctive features. They are concise, readable (once you learn them), and often faster than equivalent loops. JavaScript has NO direct equivalent -- the closest is chaining `.map()`, `.filter()`, and `.reduce()`, but comprehensions are more powerful and more efficient.

---

## List Comprehensions

### Basic Syntax

```
[expression for item in iterable]
[expression for item in iterable if condition]
```

```python
# Create a list of squares
squares = [x ** 2 for x in range(10)]
# [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

# With a condition (filter)
even_squares = [x ** 2 for x in range(10) if x % 2 == 0]
# [0, 4, 16, 36, 64]

# Transform strings
names = ["alice", "bob", "charlie"]
upper_names = [name.upper() for name in names]
# ['ALICE', 'BOB', 'CHARLIE']

# With conditional expression (ternary) in the expression part
labels = ["even" if x % 2 == 0 else "odd" for x in range(5)]
# ['even', 'odd', 'even', 'odd', 'even']
```

```javascript
// JS equivalents (more verbose)
const squares = [...Array(10)].map((_, x) => x ** 2);
const evenSquares = [...Array(10)].map((_, x) => x).filter(x => x % 2 === 0).map(x => x ** 2);
const upperNames = names.map(name => name.toUpperCase());
const labels = [...Array(5)].map((_, x) => x % 2 === 0 ? "even" : "odd");
```

### Why Comprehensions Beat map/filter

```python
# 1. Single pass (no intermediate arrays)
# Python comprehension: ONE iteration
result = [x ** 2 for x in range(1000) if x % 2 == 0]

# JS map+filter: TWO iterations + TWO intermediate arrays
# result = Array.from({length: 1000}, (_, i) => i)
#     .filter(x => x % 2 === 0)    // first pass
#     .map(x => x ** 2);           // second pass

# 2. More readable for complex transformations
users = [
    {"name": "Alice", "age": 30, "active": True},
    {"name": "Bob", "age": 17, "active": True},
    {"name": "Charlie", "age": 25, "active": False},
    {"name": "Diana", "age": 22, "active": True},
]

# Python: one clear expression
adult_active_names = [
    user["name"].upper()
    for user in users
    if user["active"] and user["age"] >= 18
]
# ['ALICE', 'DIANA']

# JS: chain of operations
# const result = users
#     .filter(u => u.active && u.age >= 18)
#     .map(u => u.name.toUpperCase());
```

### Comprehension with Function Calls

```python
# Call functions in comprehensions
import os

# Get sizes of all .py files
file_sizes = {
    f.name: f.stat().st_size
    for f in Path(".").glob("*.py")
}

# Parse and validate data
raw_data = ["42", "hello", "73", "", "99", "abc"]
valid_numbers = [int(s) for s in raw_data if s.isdigit()]
# [42, 73, 99]

# Process with error handling (using a helper)
def safe_int(s):
    try:
        return int(s)
    except ValueError:
        return None

numbers = [n for s in raw_data if (n := safe_int(s)) is not None]
# [42, 73, 99]
```

---

## Dict Comprehensions

### Basic Syntax

```
{key_expr: value_expr for item in iterable}
{key_expr: value_expr for item in iterable if condition}
```

```python
# Create a dict from a list
names = ["alice", "bob", "charlie"]
name_lengths = {name: len(name) for name in names}
# {'alice': 5, 'bob': 3, 'charlie': 7}

# Invert a dict
original = {"a": 1, "b": 2, "c": 3}
inverted = {v: k for k, v in original.items()}
# {1: 'a', 2: 'b', 3: 'c'}

# Filter a dict
scores = {"alice": 85, "bob": 62, "charlie": 91, "diana": 78}
passing = {name: score for name, score in scores.items() if score >= 70}
# {'alice': 85, 'charlie': 91, 'diana': 78}

# Transform keys and values
config = {"MAX_RETRIES": "3", "TIMEOUT": "30", "DEBUG": "true"}
typed_config = {
    k.lower(): int(v) if v.isdigit() else v == "true"
    for k, v in config.items()
}
# {'max_retries': 3, 'timeout': 30, 'debug': True}

# Create a lookup table
words = ["hello", "world", "python", "code"]
first_letter_lookup = {word[0]: word for word in words}
# {'h': 'hello', 'w': 'world', 'p': 'python', 'c': 'code'}
# Note: if multiple words share a first letter, last one wins
```

```javascript
// JS equivalent (using Object.fromEntries or reduce)
const nameLengths = Object.fromEntries(names.map(n => [n, n.length]));
const inverted = Object.fromEntries(Object.entries(original).map(([k,v]) => [v,k]));
const passing = Object.fromEntries(
    Object.entries(scores).filter(([_, score]) => score >= 70)
);
```

---

## Set Comprehensions

### Basic Syntax

```
{expression for item in iterable}
{expression for item in iterable if condition}
```

```python
# Unique word lengths
sentence = "the quick brown fox jumps over the lazy dog"
word_lengths = {len(word) for word in sentence.split()}
# {3, 4, 5}

# Unique first characters
first_chars = {word[0] for word in sentence.split()}
# {'t', 'q', 'b', 'f', 'j', 'o', 'l', 'd'}

# Unique even squares
even_squares = {x ** 2 for x in range(-10, 11) if x % 2 == 0}
# {0, 4, 16, 36, 64, 100}

# Find common letters between two strings
common = {c for c in "hello" if c in "world"}
# {'l', 'o'}
```

```javascript
// JS equivalent
const wordLengths = new Set(sentence.split(' ').map(w => w.length));
```

---

## Nested Comprehensions

### Flat Output from Nested Loops

```python
# Flatten a 2D list
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat = [num for row in matrix for num in row]
# [1, 2, 3, 4, 5, 6, 7, 8, 9]

# Reading order: same as nested for loops
# for row in matrix:
#     for num in row:
#         flat.append(num)

# All combinations
colors = ["red", "green", "blue"]
sizes = ["S", "M", "L"]
combinations = [(color, size) for color in colors for size in sizes]
# [('red', 'S'), ('red', 'M'), ('red', 'L'), ('green', 'S'), ...]

# Cartesian product with condition
pairs = [(x, y) for x in range(5) for y in range(5) if x != y]
# all (x, y) pairs where x != y
```

### Nested Output (Creating 2D Structures)

```python
# Create a 2D matrix
matrix = [[0 for col in range(4)] for row in range(3)]
# [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]

# Identity matrix
identity = [[1 if i == j else 0 for j in range(4)] for i in range(4)]
# [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]

# Transpose a matrix
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
transposed = [[row[i] for row in matrix] for i in range(len(matrix[0]))]
# [[1, 4, 7], [2, 5, 8], [3, 6, 9]]

# Multiplication table
mult_table = [[i * j for j in range(1, 6)] for i in range(1, 6)]
# [[1, 2, 3, 4, 5],
#  [2, 4, 6, 8, 10],
#  [3, 6, 9, 12, 15],
#  [4, 8, 12, 16, 20],
#  [5, 10, 15, 20, 25]]
```

### Common Gotcha: Nested List Creation

```python
# WRONG: all rows share the same inner list!
bad_matrix = [[0] * 4] * 3
bad_matrix[0][0] = 1
print(bad_matrix)
# [[1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0]]  -- all rows changed!

# RIGHT: use a comprehension
good_matrix = [[0] * 4 for _ in range(3)]
good_matrix[0][0] = 1
print(good_matrix)
# [[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]  -- only first row changed
```

---

## Generator Expressions

Generator expressions look like list comprehensions but use parentheses `()` instead of brackets `[]`. They produce values lazily -- one at a time, without building the entire list in memory.

### Basic Syntax

```python
# List comprehension (creates entire list in memory)
squares_list = [x ** 2 for x in range(1_000_000)]   # ~8MB of memory

# Generator expression (creates values on demand)
squares_gen = (x ** 2 for x in range(1_000_000))     # almost no memory
print(type(squares_gen))   # <class 'generator'>

# Consume the generator
print(next(squares_gen))   # 0
print(next(squares_gen))   # 1
print(next(squares_gen))   # 4

# Use in a for loop
for square in squares_gen:     # continues from where we left off
    if square > 100:
        break
    print(square)

# Use directly in function calls (no extra parentheses needed)
total = sum(x ** 2 for x in range(1_000_000))         # efficient!
any_negative = any(x < 0 for x in numbers)
all_positive = all(x > 0 for x in numbers)
max_length = max(len(word) for word in words)
csv_line = ",".join(str(x) for x in [1, 2, 3])
```

### When to Use Generators vs Lists

```python
# Use a LIST comprehension when:
# - You need to iterate multiple times
# - You need random access (indexing)
# - You need to know the length
# - The data fits comfortably in memory

results = [process(item) for item in data]
print(len(results))
print(results[5])
for r in results:
    pass
for r in results:    # can iterate again
    pass

# Use a GENERATOR expression when:
# - You only need to iterate once
# - The data is very large
# - You are feeding into another function (sum, max, any, etc.)
# - You want to be memory efficient

total = sum(process(item) for item in huge_dataset)   # O(1) memory
```

### Generator Memory Comparison

```python
import sys

# List: stores all values
list_comp = [x ** 2 for x in range(1000)]
print(sys.getsizeof(list_comp))   # ~8856 bytes

# Generator: stores only the recipe
gen_expr = (x ** 2 for x in range(1000))
print(sys.getsizeof(gen_expr))    # ~200 bytes (constant regardless of size!)

# For 10 million items:
# List: ~80MB
# Generator: ~200 bytes
```

---

## Performance: Comprehensions vs Loops

Comprehensions are typically 10-30% faster than equivalent for loops because they are optimized at the bytecode level.

```python
import time

data = list(range(1_000_000))

# Loop approach
start = time.perf_counter()
result_loop = []
for x in data:
    if x % 2 == 0:
        result_loop.append(x ** 2)
loop_time = time.perf_counter() - start

# Comprehension approach
start = time.perf_counter()
result_comp = [x ** 2 for x in data if x % 2 == 0]
comp_time = time.perf_counter() - start

print(f"Loop: {loop_time:.4f}s")
print(f"Comprehension: {comp_time:.4f}s")
print(f"Speedup: {loop_time / comp_time:.2f}x")
# Typical result: Comprehension is 1.2-1.5x faster

# Why? Comprehensions:
# 1. Avoid repeated .append() method lookups
# 2. Are optimized at the C level in CPython
# 3. Don't create a new function scope for each iteration
```

### map/filter vs Comprehensions

```python
# map + filter with lambdas (slower due to function call overhead)
result_map = list(map(lambda x: x ** 2, filter(lambda x: x % 2 == 0, data)))

# Comprehension (faster and more readable)
result_comp = [x ** 2 for x in data if x % 2 == 0]

# map with a built-in function (can be faster than comprehension)
result_map = list(map(str, data))          # slightly faster
result_comp = [str(x) for x in data]       # slightly slower but more readable
```

---

## Readability Guidelines

### Good: Clear and Concise

```python
# Simple transformation
prices_with_tax = [price * 1.08 for price in prices]

# Simple filter
adults = [user for user in users if user.age >= 18]

# Simple filter + transform
adult_names = [user.name for user in users if user.age >= 18]

# Dict from pairs
word_counts = {word: text.count(word) for word in set(text.split())}
```

### Bad: Too Complex

```python
# TOO COMPLEX -- use a regular loop instead
result = [
    (user.name, sum(t.amount for t in user.transactions if t.date > cutoff))
    for user in users
    if user.active
    and user.region in allowed_regions
    and any(t.amount > 100 for t in user.transactions)
]

# BETTER: break it down
def get_recent_total(user, cutoff):
    return sum(t.amount for t in user.transactions if t.date > cutoff)

active_users = [
    u for u in users
    if u.active and u.region in allowed_regions
]

result = [
    (user.name, get_recent_total(user, cutoff))
    for user in active_users
    if any(t.amount > 100 for t in user.transactions)
]

# OR use a loop
result = []
for user in users:
    if not user.active or user.region not in allowed_regions:
        continue
    if not any(t.amount > 100 for t in user.transactions):
        continue
    total = get_recent_total(user, cutoff)
    result.append((user.name, total))
```

### Rule of Thumb

- **One `for` and zero/one `if`:** Comprehension is great
- **Two `for` clauses:** Acceptable if the logic is simple (like flattening)
- **Three or more clauses, or complex conditions:** Use a regular loop
- **If you need `try/except`:** Use a regular loop (or a helper function)
- **If a colleague would need to read it twice:** It is too complex

---

## Real-World Examples

### Data Processing Pipeline

```python
# Raw CSV data
raw_rows = [
    "Alice,30,Engineering",
    "Bob,,Marketing",         # missing age
    "Charlie,25,Engineering",
    "",                        # empty row
    "Diana,28,Marketing",
    "Eve,invalid,Sales",      # invalid age
]

def parse_row(row):
    parts = row.split(",")
    if len(parts) != 3:
        return None
    name, age_str, dept = parts
    try:
        age = int(age_str) if age_str else None
    except ValueError:
        age = None
    return {"name": name, "age": age, "dept": dept}

# Parse, filter invalid, group by department
parsed = [r for row in raw_rows if row and (r := parse_row(row)) is not None]
# [{'name': 'Alice', 'age': 30, 'dept': 'Engineering'}, ...]

with_ages = [r for r in parsed if r["age"] is not None]

by_dept = {}
for dept in {r["dept"] for r in with_ages}:
    by_dept[dept] = [r for r in with_ages if r["dept"] == dept]

avg_ages = {
    dept: sum(r["age"] for r in people) / len(people)
    for dept, people in by_dept.items()
}
print(avg_ages)
# {'Engineering': 27.5, 'Marketing': 28.0}
```

### API Response Transformation

```python
# Simulated API response
api_response = {
    "results": [
        {"id": 1, "title": "Python Basics", "tags": ["python", "tutorial"], "views": 1500},
        {"id": 2, "title": "JS Advanced", "tags": ["javascript", "advanced"], "views": 800},
        {"id": 3, "title": "Python OOP", "tags": ["python", "oop"], "views": 2200},
        {"id": 4, "title": "CSS Grid", "tags": ["css", "layout"], "views": 500},
        {"id": 5, "title": "Python Web", "tags": ["python", "web", "flask"], "views": 3100},
    ]
}

# Extract popular Python articles
popular_python = [
    {
        "title": article["title"],
        "views": article["views"],
        "tag_count": len(article["tags"]),
    }
    for article in api_response["results"]
    if "python" in article["tags"] and article["views"] > 1000
]
# [{'title': 'Python Basics', 'views': 1500, 'tag_count': 2},
#  {'title': 'Python OOP', 'views': 2200, 'tag_count': 2},
#  {'title': 'Python Web', 'views': 3100, 'tag_count': 3}]

# Create a tag index
tag_index = {}
for article in api_response["results"]:
    for tag in article["tags"]:
        tag_index.setdefault(tag, []).append(article["title"])
# {'python': ['Python Basics', 'Python OOP', 'Python Web'], ...}

# Or with comprehension + defaultdict
from collections import defaultdict
tag_index = defaultdict(list)
{
    tag_index[tag].append(article["title"])
    for article in api_response["results"]
    for tag in article["tags"]
}
# Actually this doesn't work because dict comp needs key:value syntax.
# Stick with the loop for side-effect operations!

# Unique tags sorted by frequency
from collections import Counter
all_tags = [tag for article in api_response["results"] for tag in article["tags"]]
tag_freq = Counter(all_tags).most_common()
# [('python', 3), ('tutorial', 1), ('javascript', 1), ...]
```

### File System Operations

```python
from pathlib import Path

# Find all Python files and their sizes
py_files = {
    f.name: f.stat().st_size
    for f in Path(".").rglob("*.py")
    if f.is_file()
}

# Group files by extension
from collections import defaultdict
files_by_ext = defaultdict(list)
for f in Path(".").rglob("*"):
    if f.is_file():
        files_by_ext[f.suffix].append(f.name)

# Find large files (>1MB)
large_files = [
    (f, f.stat().st_size)
    for f in Path(".").rglob("*")
    if f.is_file() and f.stat().st_size > 1_000_000
]
```

---

## Summary: Comprehension Types

| Type            | Syntax                                    | Result Type   |
|-----------------|-------------------------------------------|---------------|
| List            | `[expr for x in iter if cond]`           | `list`        |
| Dict            | `{k: v for x in iter if cond}`           | `dict`        |
| Set             | `{expr for x in iter if cond}`           | `set`         |
| Generator       | `(expr for x in iter if cond)`           | `generator`   |

### Quick Reference: JS -> Python

| JS Pattern                               | Python Comprehension                     |
|------------------------------------------|------------------------------------------|
| `arr.map(x => x * 2)`                   | `[x * 2 for x in arr]`                  |
| `arr.filter(x => x > 0)`                | `[x for x in arr if x > 0]`             |
| `arr.filter(f).map(g)`                   | `[g(x) for x in arr if f(x)]`           |
| `arr.flat()`                             | `[x for sub in arr for x in sub]`       |
| `arr.flatMap(f)`                         | `[y for x in arr for y in f(x)]`        |
| `arr.reduce((acc,x) => acc+x, 0)`       | `sum(x for x in arr)`                   |
| `arr.some(x => x > 0)`                  | `any(x > 0 for x in arr)`               |
| `arr.every(x => x > 0)`                 | `all(x > 0 for x in arr)`               |
| `arr.find(x => x > 0)`                  | `next((x for x in arr if x > 0), None)` |
| `Object.fromEntries(arr.map(...))`       | `{k: v for k, v in ...}`                |
| `new Set(arr.map(x => x.id))`           | `{x.id for x in arr}`                   |

---

## Practice Exercises

### Exercise 1: Comprehension Converter
Rewrite each of these JS snippets as Python comprehensions.

```javascript
// 1. const doubled = numbers.map(x => x * 2);
// 2. const evens = numbers.filter(x => x % 2 === 0);
// 3. const pairs = arr1.flatMap(a => arr2.map(b => [a, b]));
// 4. const lookup = users.reduce((acc, u) => ({...acc, [u.id]: u}), {});
// 5. const uniqueNames = [...new Set(users.map(u => u.name))];
```

<details>
<summary>Solution</summary>

```python
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
users = [
    {"id": 1, "name": "Alice"},
    {"id": 2, "name": "Bob"},
    {"id": 3, "name": "Alice"},
]

# 1. map
doubled = [x * 2 for x in numbers]

# 2. filter
evens = [x for x in numbers if x % 2 == 0]

# 3. flatMap
arr1, arr2 = [1, 2], ["a", "b"]
pairs = [(a, b) for a in arr1 for b in arr2]

# 4. reduce to lookup
lookup = {u["id"]: u for u in users}

# 5. unique values from mapped property
unique_names = {u["name"] for u in users}   # returns a set
unique_names_list = list({u["name"] for u in users})  # as list
```
</details>

### Exercise 2: Data Wrangling
Given this raw data, use comprehensions to: (a) extract valid emails, (b) create a lookup by domain, (c) find domains with multiple users.

```python
raw_users = [
    {"name": "Alice", "email": "alice@gmail.com"},
    {"name": "Bob", "email": ""},
    {"name": "Charlie", "email": "charlie@company.com"},
    {"name": "Diana", "email": "invalid-email"},
    {"name": "Eve", "email": "eve@gmail.com"},
    {"name": "Frank", "email": "frank@company.com"},
    {"name": "Grace", "email": None},
]
```

<details>
<summary>Solution</summary>

```python
from collections import defaultdict

raw_users = [
    {"name": "Alice", "email": "alice@gmail.com"},
    {"name": "Bob", "email": ""},
    {"name": "Charlie", "email": "charlie@company.com"},
    {"name": "Diana", "email": "invalid-email"},
    {"name": "Eve", "email": "eve@gmail.com"},
    {"name": "Frank", "email": "frank@company.com"},
    {"name": "Grace", "email": None},
]

# (a) Extract valid emails
valid_users = [
    user for user in raw_users
    if user["email"] and "@" in user["email"]
]
print(f"Valid users: {[u['name'] for u in valid_users]}")
# ['Alice', 'Charlie', 'Eve', 'Frank']

# (b) Lookup by domain
by_domain = defaultdict(list)
for user in valid_users:
    domain = user["email"].split("@")[1]
    by_domain[domain].append(user["name"])
by_domain = dict(by_domain)
print(f"By domain: {by_domain}")
# {'gmail.com': ['Alice', 'Eve'], 'company.com': ['Charlie', 'Frank']}

# (c) Domains with multiple users
multi_user_domains = {
    domain: users
    for domain, users in by_domain.items()
    if len(users) > 1
}
print(f"Multi-user domains: {multi_user_domains}")
# {'gmail.com': ['Alice', 'Eve'], 'company.com': ['Charlie', 'Frank']}
```
</details>

### Exercise 3: Matrix Operations with Comprehensions
Implement these matrix operations using only comprehensions (no numpy).

```python
def matrix_add(a, b): pass          # element-wise addition
def matrix_multiply(a, b): pass     # matrix multiplication
def matrix_scalar(m, scalar): pass  # multiply by scalar
def matrix_map(m, func): pass       # apply function to each element
```

<details>
<summary>Solution</summary>

```python
def matrix_add(a, b):
    return [
        [a[i][j] + b[i][j] for j in range(len(a[0]))]
        for i in range(len(a))
    ]

def matrix_multiply(a, b):
    return [
        [
            sum(a[i][k] * b[k][j] for k in range(len(b)))
            for j in range(len(b[0]))
        ]
        for i in range(len(a))
    ]

def matrix_scalar(m, scalar):
    return [[val * scalar for val in row] for row in m]

def matrix_map(m, func):
    return [[func(val) for val in row] for row in m]

# Test
A = [[1, 2], [3, 4]]
B = [[5, 6], [7, 8]]

print("Add:", matrix_add(A, B))
# [[6, 8], [10, 12]]

print("Multiply:", matrix_multiply(A, B))
# [[19, 22], [43, 50]]

print("Scalar:", matrix_scalar(A, 3))
# [[3, 6], [9, 12]]

print("Map (square):", matrix_map(A, lambda x: x ** 2))
# [[1, 4], [9, 16]]
```
</details>

### Exercise 4: Generator Pipeline
Create a data processing pipeline using generators that reads a large sequence of numbers, filters them, transforms them, and aggregates -- all without loading everything into memory.

```python
def generate_data(n):
    """Simulate a large data source."""
    import random
    for _ in range(n):
        yield random.randint(1, 1000)

# Create a pipeline that:
# 1. Takes only even numbers
# 2. Squares them
# 3. Keeps only those > 10000
# 4. Returns the sum and count without storing all intermediate values
```

<details>
<summary>Solution</summary>

```python
import random

def generate_data(n):
    """Simulate a large data source."""
    for _ in range(n):
        yield random.randint(1, 1000)

# Generator pipeline -- each step is lazy
data = generate_data(1_000_000)                    # 1M random numbers
evens = (x for x in data if x % 2 == 0)           # lazy filter
squared = (x ** 2 for x in evens)                  # lazy transform
large = (x for x in squared if x > 10000)          # lazy filter

# Single-pass aggregation
total = 0
count = 0
for value in large:
    total += value
    count += 1

print(f"Count: {count}")
print(f"Sum: {total}")
print(f"Average: {total / count:.2f}" if count else "No values")

# Memory usage: O(1) regardless of input size!
# Only one number exists in memory at a time.

# Alternative: use reduce for single-pass aggregation
from functools import reduce

data = generate_data(1_000_000)
pipeline = (
    x ** 2
    for x in data
    if x % 2 == 0 and (x ** 2) > 10000
)

# But this computes x**2 twice. Use walrus operator:
data = generate_data(1_000_000)
pipeline = (
    sq
    for x in data
    if x % 2 == 0 and (sq := x ** 2) > 10000
)

total, count = reduce(
    lambda acc, x: (acc[0] + x, acc[1] + 1),
    pipeline,
    (0, 0),
)
print(f"Count: {count}, Sum: {total}")
```
</details>

### Exercise 5: Comprehension Golf
Solve each problem in a single comprehension (no multi-line, no intermediate variables). These are for practice -- in production code, readability wins.

```python
# 1. Flatten a list of lists of lists: [[[1,2],[3]],[[4],[5,6]]] -> [1,2,3,4,5,6]
# 2. Find all prime numbers up to 100
# 3. Create a dict mapping each char in a string to its count (without Counter)
# 4. Transpose a dictionary of lists:
#    {"a": [1, 2, 3], "b": [4, 5, 6]} -> [{a:1, b:4}, {a:2, b:5}, {a:3, b:6}]
# 5. Generate Pascal's triangle (first n rows)
```

<details>
<summary>Solution</summary>

```python
# 1. Flatten nested list of lists
data = [[[1, 2], [3]], [[4], [5, 6]]]
flat = [x for outer in data for inner in outer for x in inner]
print(flat)  # [1, 2, 3, 4, 5, 6]

# 2. Primes up to 100 (Sieve-ish via comprehension)
primes = [n for n in range(2, 101) if all(n % d != 0 for d in range(2, int(n**0.5) + 1))]
print(primes)  # [2, 3, 5, 7, 11, 13, ...]

# 3. Character count without Counter
text = "mississippi"
char_count = {c: text.count(c) for c in set(text)}
print(char_count)  # {'m': 1, 'i': 4, 's': 4, 'p': 2}

# 4. Transpose dict of lists
d = {"a": [1, 2, 3], "b": [4, 5, 6]}
transposed = [{k: v[i] for k, v in d.items()} for i in range(len(next(iter(d.values()))))]
print(transposed)  # [{'a': 1, 'b': 4}, {'a': 2, 'b': 5}, {'a': 3, 'b': 6}]

# 5. Pascal's triangle (n rows) -- this one is a stretch for "single comprehension"
n = 6
pascal = [[1] if i == 0 else [1] + [prev[j-1] + prev[j] for j in range(1, i)] + [1] for i, prev in [(0, [])] + [(i, None) for i in range(1, n)]]
# That's too ugly. Better approach with reduce:
from functools import reduce
pascal = reduce(lambda tri, _: tri + [[1] + [tri[-1][j] + tri[-1][j+1] for j in range(len(tri[-1])-1)] + [1]], range(n-1), [[1]])
print(pascal)
# [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1], [1, 5, 10, 10, 5, 1]]

# The honest best approach for Pascal's triangle:
def pascal_triangle(n):
    triangle = [[1]]
    for i in range(1, n):
        prev = triangle[-1]
        row = [1] + [prev[j] + prev[j+1] for j in range(len(prev)-1)] + [1]
        triangle.append(row)
    return triangle
print(pascal_triangle(6))
```
</details>
