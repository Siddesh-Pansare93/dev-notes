# 10 - Comprehensions

## Node.js/TypeScript se aa rahe ho toh

Comprehensions Python ki sabse khaas cheezon mein se ek hain. Concise, readable (ek baar seekh lo toh), aur usually equivalent loops se fast bhi. JavaScript mein iska koi direct equivalent nahi hai -- sabse paas wali cheez `.map()`, `.filter()`, aur `.reduce()` ko chain karna hai, lekin comprehensions usse zyada powerful aur efficient hain.

---

## List Comprehensions

### Basic Syntax

Socho ek second ke liye -- agar koi tumse keh de "mujhe har number ka square chahiye, ek list ke andar" -- normally tum for loop likhoge, `.append()` karoge. Python mein ye sab ek line mein ho jata hai.

```
[expression for item in iterable]
[expression for item in iterable if condition]
```

```python
# Squares ki ek list banao
squares = [x ** 2 for x in range(10)]
# [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

# Condition ke saath (filter jaisa)
even_squares = [x ** 2 for x in range(10) if x % 2 == 0]
# [0, 4, 16, 36, 64]

# Strings transform karna
names = ["alice", "bob", "charlie"]
upper_names = [name.upper() for name in names]
# ['ALICE', 'BOB', 'CHARLIE']

# Expression part mein ternary jaisa conditional
labels = ["even" if x % 2 == 0 else "odd" for x in range(5)]
# ['even', 'odd', 'even', 'odd', 'even']
```

```javascript
// JS equivalents (zyada verbose)
const squares = [...Array(10)].map((_, x) => x ** 2);
const evenSquares = [...Array(10)].map((_, x) => x).filter(x => x % 2 === 0).map(x => x ** 2);
const upperNames = names.map(name => name.toUpperCase());
const labels = [...Array(5)].map((_, x) => x % 2 === 0 ? "even" : "odd");
```

### Comprehensions map/filter se better kyun hain?

```python
# 1. Single pass (koi intermediate array nahi banta)
# Python comprehension: EK hi iteration
result = [x ** 2 for x in range(1000) if x % 2 == 0]

# JS map+filter: DO iterations + DO intermediate arrays
# result = Array.from({length: 1000}, (_, i) => i)
#     .filter(x => x % 2 === 0)    // pehla pass
#     .map(x => x ** 2);           // dusra pass

# 2. Complex transformations ke liye zyada readable
users = [
    {"name": "Alice", "age": 30, "active": True},
    {"name": "Bob", "age": 17, "active": True},
    {"name": "Charlie", "age": 25, "active": False},
    {"name": "Diana", "age": 22, "active": True},
]

# Python: ek clean expression
adult_active_names = [
    user["name"].upper()
    for user in users
    if user["active"] and user["age"] >= 18
]
# ['ALICE', 'DIANA']

# JS: operations ki chain
# const result = users
#     .filter(u => u.active && u.age >= 18)
#     .map(u => u.name.toUpperCase());
```

> [!tip]
> Zomato ka use case socho -- "sirf wahi restaurants dikhao jo open hain aur jinka rating 4+ hai, aur unke naam capital mein chahiye." Yehi filter + map ka combo comprehension mein ek line mein ho jata hai, do alag passes ki zaroorat nahi.

### Function Calls ke saath Comprehension

```python
# Comprehensions ke andar functions call karna
import os

# Sabhi .py files ki sizes nikalo
file_sizes = {
    f.name: f.stat().st_size
    for f in Path(".").glob("*.py")
}

# Data parse aur validate karna
raw_data = ["42", "hello", "73", "", "99", "abc"]
valid_numbers = [int(s) for s in raw_data if s.isdigit()]
# [42, 73, 99]

# Error handling ke saath process karna (helper function use karke)
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

Ye bilkul list comprehension jaisa hi hai, bas ab tumhe key aur value dono chahiye -- socho UPI transaction history ko naam se amount ka lookup table banana.

```
{key_expr: value_expr for item in iterable}
{key_expr: value_expr for item in iterable if condition}
```

```python
# Ek list se dict banao
names = ["alice", "bob", "charlie"]
name_lengths = {name: len(name) for name in names}
# {'alice': 5, 'bob': 3, 'charlie': 7}

# Dict ko invert karna (key <-> value swap)
original = {"a": 1, "b": 2, "c": 3}
inverted = {v: k for k, v in original.items()}
# {1: 'a', 2: 'b', 3: 'c'}

# Dict filter karna
scores = {"alice": 85, "bob": 62, "charlie": 91, "diana": 78}
passing = {name: score for name, score in scores.items() if score >= 70}
# {'alice': 85, 'charlie': 91, 'diana': 78}

# Keys aur values dono transform karna
config = {"MAX_RETRIES": "3", "TIMEOUT": "30", "DEBUG": "true"}
typed_config = {
    k.lower(): int(v) if v.isdigit() else v == "true"
    for k, v in config.items()
}
# {'max_retries': 3, 'timeout': 30, 'debug': True}

# Ek lookup table banana
words = ["hello", "world", "python", "code"]
first_letter_lookup = {word[0]: word for word in words}
# {'h': 'hello', 'w': 'world', 'p': 'python', 'c': 'code'}
# Note: agar multiple words ka pehla letter same ho, toh last wala jeet jayega
```

```javascript
// JS equivalent (Object.fromEntries ya reduce use karke)
const nameLengths = Object.fromEntries(names.map(n => [n, n.length]));
const inverted = Object.fromEntries(Object.entries(original).map(([k,v]) => [v,k]));
const passing = Object.fromEntries(
    Object.entries(scores).filter(([_, score]) => score >= 70)
);
```

---

## Set Comprehensions

### Basic Syntax

Jab tumhe sirf unique values chahiye (duplicates ka koi matlab nahi), curly braces use karo -- bas key:value nahi, sirf expression.

```
{expression for item in iterable}
{expression for item in iterable if condition}
```

```python
# Unique word lengths
sentence = "the quick brown fox jumps over the lazy dog"
word_lengths = {len(word) for word in sentence.split()}
# {3, 4, 5}

# Unique pehle characters
first_chars = {word[0] for word in sentence.split()}
# {'t', 'q', 'b', 'f', 'j', 'o', 'l', 'd'}

# Unique even squares
even_squares = {x ** 2 for x in range(-10, 11) if x % 2 == 0}
# {0, 4, 16, 36, 64, 100}

# Do strings mein common letters dhundo
common = {c for c in "hello" if c in "world"}
# {'l', 'o'}
```

```javascript
// JS equivalent
const wordLengths = new Set(sentence.split(' ').map(w => w.length));
```

---

## Nested Comprehensions

### Nested Loops se Flat Output

```python
# 2D list ko flatten karna
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat = [num for row in matrix for num in row]
# [1, 2, 3, 4, 5, 6, 7, 8, 9]

# Reading order: bilkul nested for loops jaisi
# for row in matrix:
#     for num in row:
#         flat.append(num)

# Sabhi combinations
colors = ["red", "green", "blue"]
sizes = ["S", "M", "L"]
combinations = [(color, size) for color in colors for size in sizes]
# [('red', 'S'), ('red', 'M'), ('red', 'L'), ('green', 'S'), ...]

# Cartesian product with condition
pairs = [(x, y) for x in range(5) for y in range(5) if x != y]
# saare (x, y) pairs jahan x != y
```

> [!info]
> Reading order thoda confusing lag sakta hai shuru mein -- yaad rakho, `for` clauses left se right, upar se neeche wale nested loop jaise hi chalte hain. Pehla `for` sabse bahar wala loop hai.

### Nested Output (2D Structures banana)

```python
# 2D matrix banana
matrix = [[0 for col in range(4)] for row in range(3)]
# [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]

# Identity matrix
identity = [[1 if i == j else 0 for j in range(4)] for i in range(4)]
# [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]

# Matrix transpose karna
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

### Common Gotcha: Nested List banana

```python
# GALAT: saari rows ek hi inner list share kar rahi hain!
bad_matrix = [[0] * 4] * 3
bad_matrix[0][0] = 1
print(bad_matrix)
# [[1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0]]  -- saari rows badal gayi!

# SAHI: comprehension use karo
good_matrix = [[0] * 4 for _ in range(3)]
good_matrix[0][0] = 1
print(good_matrix)
# [[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]  -- sirf pehli row badli
```

> [!warning]
> `[[0] * 4] * 3` ek hi list ko 3 baar reference karta hai -- ye Python ka classic gotcha hai. JS mein bhi agar tum `Array(3).fill(Array(4).fill(0))` karte, wahi problem aati -- same reference sab jagah copy ho jata hai.

---

## Generator Expressions

Generator expressions dikhte toh list comprehensions jaise hain, lekin square brackets `[]` ki jagah round parentheses `()` use karte hain. Ye values lazily produce karte hain -- ek-ek karke, poori list memory mein banaye bina.

### Basic Syntax

```python
# List comprehension (poori list memory mein banti hai)
squares_list = [x ** 2 for x in range(1_000_000)]   # ~8MB memory

# Generator expression (values on demand banti hain)
squares_gen = (x ** 2 for x in range(1_000_000))     # almost no memory
print(type(squares_gen))   # <class 'generator'>

# Generator ko consume karna
print(next(squares_gen))   # 0
print(next(squares_gen))   # 1
print(next(squares_gen))   # 4

# For loop mein use karna
for square in squares_gen:     # jahan chhoda tha wahin se continue karta hai
    if square > 100:
        break
    print(square)

# Directly function calls mein use karna (extra parentheses ki zarurat nahi)
total = sum(x ** 2 for x in range(1_000_000))         # efficient!
any_negative = any(x < 0 for x in numbers)
all_positive = all(x > 0 for x in numbers)
max_length = max(len(word) for word in words)
csv_line = ",".join(str(x) for x in [1, 2, 3])
```

> [!tip]
> Generator ko dabbawala ki tarah socho -- wo har tiffin ek baar mein deliver karta hai, sabko ek saath collect karke godown mein store nahi karta. List comprehension pura godown bana deti hai; generator sirf agla tiffin deta hai jab maanga jaye.

### Kab Generator use karo, Kab List

```python
# LIST comprehension use karo jab:
# - Tumhe multiple baar iterate karna hai
# - Random access (indexing) chahiye
# - Length pata karni hai
# - Data comfortably memory mein fit ho jata hai

results = [process(item) for item in data]
print(len(results))
print(results[5])
for r in results:
    pass
for r in results:    # dobara iterate kar sakte ho
    pass

# GENERATOR expression use karo jab:
# - Tumhe sirf ek baar iterate karna hai
# - Data bahut bada hai
# - Kisi doosre function mein feed kar rahe ho (sum, max, any, etc.)
# - Memory efficient rehna chahte ho

total = sum(process(item) for item in huge_dataset)   # O(1) memory
```

### Generator Memory Comparison

```python
import sys

# List: saari values store karti hai
list_comp = [x ** 2 for x in range(1000)]
print(sys.getsizeof(list_comp))   # ~8856 bytes

# Generator: sirf "recipe" store karta hai
gen_expr = (x ** 2 for x in range(1000))
print(sys.getsizeof(gen_expr))    # ~200 bytes (size chahe kuch bhi ho, constant!)

# 10 million items ke liye:
# List: ~80MB
# Generator: ~200 bytes
```

---

## Performance: Comprehensions vs Loops

Comprehensions usually regular for loops se 10-30% fast hoti hain kyunki ye bytecode level pe optimize hoti hain.

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
# Typical result: Comprehension 1.2-1.5x fast hoti hai

# Kyun? Comprehensions:
# 1. Baar-baar .append() method lookup avoid karti hain
# 2. CPython mein C level pe optimized hain
# 3. Har iteration ke liye naya function scope nahi banati
```

### map/filter vs Comprehensions

```python
# map + filter with lambdas (function call overhead ki wajah se slower)
result_map = list(map(lambda x: x ** 2, filter(lambda x: x % 2 == 0, data)))

# Comprehension (faster aur zyada readable)
result_comp = [x ** 2 for x in data if x % 2 == 0]

# map with built-in function (comprehension se fast ho sakta hai)
result_map = list(map(str, data))          # thoda faster
result_comp = [str(x) for x in data]       # thoda slower lekin zyada readable
```

---

## Readability Guidelines

### Good: Clear aur Concise

```python
# Simple transformation
prices_with_tax = [price * 1.08 for price in prices]

# Simple filter
adults = [user for user in users if user.age >= 18]

# Simple filter + transform
adult_names = [user.name for user in users if user.age >= 18]

# Pairs se dict
word_counts = {word: text.count(word) for word in set(text.split())}
```

### Bad: Zyada Complex

```python
# BAHUT COMPLEX -- iski jagah regular loop use karo
result = [
    (user.name, sum(t.amount for t in user.transactions if t.date > cutoff))
    for user in users
    if user.active
    and user.region in allowed_regions
    and any(t.amount > 100 for t in user.transactions)
]

# BEHTAR: isko todo
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

# YA loop use karo
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

- **Ek `for` aur zero/ek `if`:** Comprehension perfect hai
- **Do `for` clauses:** Chalega agar logic simple hai (jaise flattening)
- **Teen ya zyada clauses, ya complex conditions:** Regular loop use karo
- **Agar `try/except` chahiye:** Regular loop (ya helper function) use karo
- **Agar colleague ko dobara padhna pade samajhne ke liye:** Ye zyada complex hai

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

# Parse karo, invalid filter karo, department se group karo
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

Socho Flipkart ka product API response aaya hai, aur tumhe usme se sirf popular items nikaalne hain -- exactly wahi kaam yaha ho raha hai.

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

# Popular Python articles nikalo
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

# Ek tag index banao
tag_index = {}
for article in api_response["results"]:
    for tag in article["tags"]:
        tag_index.setdefault(tag, []).append(article["title"])
# {'python': ['Python Basics', 'Python OOP', 'Python Web'], ...}

# Ya comprehension + defaultdict ke saath
from collections import defaultdict
tag_index = defaultdict(list)
{
    tag_index[tag].append(article["title"])
    for article in api_response["results"]
    for tag in article["tags"]
}
# Actually ye kaam nahi karega kyunki dict comp ko key:value syntax chahiye.
# Side-effect operations ke liye loop hi use karo!

# Unique tags, frequency ke hisaab se sorted
from collections import Counter
all_tags = [tag for article in api_response["results"] for tag in article["tags"]]
tag_freq = Counter(all_tags).most_common()
# [('python', 3), ('tutorial', 1), ('javascript', 1), ...]
```

> [!warning]
> Upar wala dict comprehension jo `tag_index[tag].append(...)` kar raha hai -- ye galat pattern hai. Dict/set comprehensions sirf naya collection banane ke liye hain, side-effects (jaise `.append()`) ke liye nahi. Aisa lage toh seedha regular loop likho.

### File System Operations

```python
from pathlib import Path

# Sabhi Python files aur unki sizes dhundo
py_files = {
    f.name: f.stat().st_size
    for f in Path(".").rglob("*.py")
    if f.is_file()
}

# Files ko extension se group karo
from collections import defaultdict
files_by_ext = defaultdict(list)
for f in Path(".").rglob("*"):
    if f.is_file():
        files_by_ext[f.suffix].append(f.name)

# Bade files dhundo (>1MB)
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
Ye JS snippets ko Python comprehensions mein rewrite karo.

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
unique_names = {u["name"] for u in users}   # set return karta hai
unique_names_list = list({u["name"] for u in users})  # list ke roop mein
```
</details>

### Exercise 2: Data Wrangling
Ye raw data diya hai, comprehensions use karke: (a) valid emails nikaalo, (b) domain se lookup banao, (c) multiple users wale domains dhundo.

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

# (a) Valid emails nikaalo
valid_users = [
    user for user in raw_users
    if user["email"] and "@" in user["email"]
]
print(f"Valid users: {[u['name'] for u in valid_users]}")
# ['Alice', 'Charlie', 'Eve', 'Frank']

# (b) Domain se lookup
by_domain = defaultdict(list)
for user in valid_users:
    domain = user["email"].split("@")[1]
    by_domain[domain].append(user["name"])
by_domain = dict(by_domain)
print(f"By domain: {by_domain}")
# {'gmail.com': ['Alice', 'Eve'], 'company.com': ['Charlie', 'Frank']}

# (c) Multiple users wale domains
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
Ye matrix operations sirf comprehensions se implement karo (numpy nahi).

```python
def matrix_add(a, b): pass          # element-wise addition
def matrix_multiply(a, b): pass     # matrix multiplication
def matrix_scalar(m, scalar): pass  # scalar se multiply
def matrix_map(m, func): pass       # har element pe function apply karo
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
Generators use karke ek data processing pipeline banao jo numbers ki ek badi sequence padhe, filter kare, transform kare, aur aggregate kare -- sab kuch bina sabkuch memory mein load kiye.

```python
def generate_data(n):
    """Ek bada data source simulate karo."""
    import random
    for _ in range(n):
        yield random.randint(1, 1000)

# Ek pipeline banao jo:
# 1. Sirf even numbers le
# 2. Unko square kare
# 3. Sirf wahi rakhe jo > 10000 hain
# 4. Sum aur count return kare bina saari intermediate values store kiye
```

<details>
<summary>Solution</summary>

```python
import random

def generate_data(n):
    """Ek bada data source simulate karo."""
    for _ in range(n):
        yield random.randint(1, 1000)

# Generator pipeline -- har step lazy hai
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

# Memory usage: input size chahe kuch bhi ho, O(1)!
# Ek time pe sirf ek number memory mein hota hai.

# Alternative: single-pass aggregation ke liye reduce use karo
from functools import reduce

data = generate_data(1_000_000)
pipeline = (
    x ** 2
    for x in data
    if x % 2 == 0 and (x ** 2) > 10000
)

# Lekin ye x**2 do baar compute karta hai. Walrus operator use karo:
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
Har problem ek single comprehension mein solve karo (multi-line nahi, intermediate variables nahi). Ye practice ke liye hain -- production code mein readability hi jeetegi.

```python
# 1. List of lists of lists ko flatten karo: [[[1,2],[3]],[[4],[5,6]]] -> [1,2,3,4,5,6]
# 2. 100 tak sabhi prime numbers dhundo
# 3. Ek dict banao jo string ke har char ko uske count se map kare (Counter use kiye bina)
# 4. Ek dictionary of lists ko transpose karo:
#    {"a": [1, 2, 3], "b": [4, 5, 6]} -> [{a:1, b:4}, {a:2, b:5}, {a:3, b:6}]
# 5. Pascal's triangle generate karo (pehli n rows)
```

<details>
<summary>Solution</summary>

```python
# 1. Nested list of lists ko flatten karo
data = [[[1, 2], [3]], [[4], [5, 6]]]
flat = [x for outer in data for inner in outer for x in inner]
print(flat)  # [1, 2, 3, 4, 5, 6]

# 2. 100 tak primes (Sieve jaisa comprehension se)
primes = [n for n in range(2, 101) if all(n % d != 0 for d in range(2, int(n**0.5) + 1))]
print(primes)  # [2, 3, 5, 7, 11, 13, ...]

# 3. Character count Counter ke bina
text = "mississippi"
char_count = {c: text.count(c) for c in set(text)}
print(char_count)  # {'m': 1, 'i': 4, 's': 4, 'p': 2}

# 4. Dict of lists ko transpose karo
d = {"a": [1, 2, 3], "b": [4, 5, 6]}
transposed = [{k: v[i] for k, v in d.items()} for i in range(len(next(iter(d.values()))))]
print(transposed)  # [{'a': 1, 'b': 4}, {'a': 2, 'b': 5}, {'a': 3, 'b': 6}]

# 5. Pascal's triangle (n rows) -- ye "single comprehension" ke liye thoda stretch hai
n = 6
pascal = [[1] if i == 0 else [1] + [prev[j-1] + prev[j] for j in range(1, i)] + [1] for i, prev in [(0, [])] + [(i, None) for i in range(1, n)]]
# Ye bahut ugly hai. reduce ke saath behtar approach:
from functools import reduce
pascal = reduce(lambda tri, _: tri + [[1] + [tri[-1][j] + tri[-1][j+1] for j in range(len(tri[-1])-1)] + [1]], range(n-1), [[1]])
print(pascal)
# [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1], [1, 5, 10, 10, 5, 1]]

# Pascal's triangle ke liye honest best approach:
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

## Key Takeaways

- List/dict/set comprehensions ek line mein loop + filter + transform kar dete hain -- JS ke `.map().filter()` chains se zyada efficient (single pass) aur readable.
- Generator expressions `()` use karte hain, lazy hote hain, aur bade datasets ke liye memory bachate hain -- `sum()`, `any()`, `all()` jaise functions ke saath directly use karo.
- `[[0]*4]*3` wala trap yaad rakho -- shared reference ka gotcha, comprehension se hi 2D structures banao.
- Rule of thumb: ek `for` + ek `if` tak comprehension theek hai; usse zyada complex ho toh regular loop ya helper function likho.
- Dict/set comprehensions sirf naya collection banane ke liye hain -- side-effects (jaise `.append()`) ke liye loop hi use karo.
