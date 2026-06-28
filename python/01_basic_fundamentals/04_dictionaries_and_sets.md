# 04 - Dictionaries and Sets

## Coming from Node.js/TypeScript

Python dictionaries are a hybrid of JS plain objects and Maps. They are ordered (insertion order preserved since Python 3.7), have rich built-in methods, and are the workhorse data structure of Python. Sets will feel familiar from JS `Set`, but with more built-in set operations.

---

## Dictionaries

### Creating Dictionaries

```python
# Literal syntax (like JS objects, but keys must be quoted unless variables)
user = {
    "name": "Alice",
    "age": 30,
    "email": "alice@example.com",
}

# dict() constructor
user = dict(name="Alice", age=30, email="alice@example.com")

# From list of tuples
user = dict([("name", "Alice"), ("age", 30)])

# From two lists using zip
keys = ["name", "age", "email"]
values = ["Alice", 30, "alice@example.com"]
user = dict(zip(keys, values))

# Empty dict
empty = {}
empty = dict()

# Dict comprehension (preview -- covered in 10_comprehensions.md)
squares = {x: x ** 2 for x in range(6)}  # {0: 0, 1: 1, 2: 4, 3: 9, 4: 16, 5: 25}
```

```javascript
// JS object
let user = { name: "Alice", age: 30 };
// JS Map
let userMap = new Map([["name", "Alice"], ["age", 30]]);
```

### Key Types

Python dict keys can be any **hashable** (immutable) type. This is more flexible than JS objects (string/symbol keys only) but less flexible than JS Maps (any key type).

```python
d = {
    "string_key": 1,
    42: "integer key",
    (1, 2): "tuple key",          # tuples are hashable
    True: "bool key",             # True == 1, so this overwrites key 42!
    3.14: "float key",
    frozenset({1, 2}): "set key", # frozenset is hashable (set is not)
}

# These CANNOT be keys (not hashable):
# {[1, 2]: "list key"}         # TypeError: unhashable type: 'list'
# {{}: "dict key"}             # TypeError: unhashable type: 'dict'
# {{1, 2}: "set key"}          # TypeError: unhashable type: 'set'
```

### Accessing Values

```python
user = {"name": "Alice", "age": 30, "email": "alice@example.com"}

# Bracket notation (raises KeyError if missing)
print(user["name"])           # "Alice"
# print(user["phone"])        # KeyError: 'phone'

# .get() -- safe access with optional default (THE PYTHON WAY)
print(user.get("name"))       # "Alice"
print(user.get("phone"))      # None (no error)
print(user.get("phone", "N/A"))  # "N/A" (custom default)

# Check if key exists
if "name" in user:
    print(user["name"])

# This pattern is NOT needed in Python (but common in JS):
# user["name"] if "name" in user else "default"
# Just use: user.get("name", "default")
```

```javascript
// JS access patterns
user.name                     // "Alice" (dot notation)
user["name"]                  // "Alice" (bracket notation)
user.phone                    // undefined (no error)
user?.phone                   // undefined (optional chaining)
user.phone ?? "N/A"          // "N/A" (nullish coalescing)
```

**Key difference:** Python dicts raise `KeyError` on missing keys with bracket access. JS objects silently return `undefined`. Use `.get()` in Python for safe access.

### Adding and Modifying

```python
user = {"name": "Alice", "age": 30}

# Add or update
user["email"] = "alice@example.com"    # adds new key
user["age"] = 31                       # updates existing key

# Update multiple keys at once
user.update({"age": 32, "city": "NYC", "role": "admin"})

# Merge dicts (Python 3.9+)
defaults = {"theme": "dark", "lang": "en", "role": "user"}
overrides = {"lang": "fr", "role": "admin"}
settings = defaults | overrides        # {'theme': 'dark', 'lang': 'fr', 'role': 'admin'}

# In-place merge (Python 3.9+)
defaults |= overrides                  # modifies defaults

# Pre-3.9 merge
settings = {**defaults, **overrides}   # spread-like syntax
```

```javascript
// JS equivalents
user.email = "alice@example.com";
Object.assign(user, { age: 32, city: "NYC" });
let settings = { ...defaults, ...overrides };  // spread
```

### Removing

```python
user = {"name": "Alice", "age": 30, "email": "alice@example.com", "role": "admin"}

# Remove and return value
age = user.pop("age")              # 30, user no longer has "age"
phone = user.pop("phone", None)    # None (no error if missing)

# Remove and return last inserted item (LIFO)
key, value = user.popitem()        # ("role", "admin") in Python 3.7+

# Delete without returning
del user["email"]

# Clear all
user.clear()
```

### Iterating

```python
user = {"name": "Alice", "age": 30, "city": "NYC"}

# Keys (default iteration)
for key in user:
    print(key)               # name, age, city

for key in user.keys():      # explicit, same result
    print(key)

# Values
for value in user.values():
    print(value)             # Alice, 30, NYC

# Key-value pairs (MOST COMMON)
for key, value in user.items():
    print(f"{key}: {value}")
# name: Alice
# age: 30
# city: NYC
```

```javascript
// JS iteration
for (let key in obj) { ... }           // for...in (includes prototype, generally avoid)
for (let key of Object.keys(obj)) { ... }
for (let value of Object.values(obj)) { ... }
for (let [key, value] of Object.entries(obj)) { ... }
```

### Useful Dict Patterns

```python
# setdefault -- get value, but set it first if missing
cache = {}
cache.setdefault("users", []).append("Alice")
cache.setdefault("users", []).append("Bob")
print(cache)   # {"users": ["Alice", "Bob"]}

# Counting with dicts
words = ["apple", "banana", "apple", "cherry", "banana", "apple"]
counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1
print(counts)  # {'apple': 3, 'banana': 2, 'cherry': 1}

# Inverting a dict
original = {"a": 1, "b": 2, "c": 3}
inverted = {v: k for k, v in original.items()}
print(inverted)  # {1: 'a', 2: 'b', 3: 'c'}

# Grouping
from collections import defaultdict
students = [("Alice", "A"), ("Bob", "B"), ("Charlie", "A"), ("Diana", "B")]
by_grade = defaultdict(list)
for name, grade in students:
    by_grade[grade].append(name)
print(dict(by_grade))  # {'A': ['Alice', 'Charlie'], 'B': ['Bob', 'Diana']}
```

---

## defaultdict and Counter

### defaultdict

`defaultdict` auto-creates missing keys with a default value. Eliminates the need for "check if key exists, if not initialize it" boilerplate.

```python
from collections import defaultdict

# Auto-create empty lists
groups = defaultdict(list)
groups["fruits"].append("apple")      # no need to check if key exists
groups["fruits"].append("banana")
groups["vegetables"].append("carrot")
print(dict(groups))
# {'fruits': ['apple', 'banana'], 'vegetables': ['carrot']}

# Auto-create zeros (for counting)
counter = defaultdict(int)
for char in "hello world":
    counter[char] += 1                # starts at 0 automatically
print(dict(counter))
# {'h': 1, 'e': 1, 'l': 3, 'o': 2, ' ': 1, 'w': 1, 'r': 1, 'd': 1}

# Auto-create sets
index = defaultdict(set)
docs = [("python", "doc1"), ("python", "doc2"), ("java", "doc1")]
for tag, doc in docs:
    index[tag].add(doc)
print(dict(index))
# {'python': {'doc1', 'doc2'}, 'java': {'doc1'}}

# Nested defaultdict
tree = defaultdict(lambda: defaultdict(list))
tree["US"]["cities"].append("NYC")
tree["US"]["cities"].append("LA")
tree["UK"]["cities"].append("London")
```

### Counter

`Counter` is a specialized dict for counting things. It is incredibly useful.

```python
from collections import Counter

# Count elements
words = ["apple", "banana", "apple", "cherry", "banana", "apple"]
count = Counter(words)
print(count)               # Counter({'apple': 3, 'banana': 2, 'cherry': 1})

# Count characters in a string
char_count = Counter("mississippi")
print(char_count)          # Counter({'s': 4, 'i': 4, 'p': 2, 'm': 1})

# Most common elements
print(count.most_common(2))    # [('apple', 3), ('banana', 2)]

# Arithmetic with Counters
c1 = Counter("aabbc")
c2 = Counter("abcdd")
print(c1 + c2)            # Counter({'a': 3, 'b': 3, 'c': 2, 'd': 2})
print(c1 - c2)            # Counter({'a': 1, 'b': 1}) (only positive counts)
print(c1 & c2)            # Counter({'a': 1, 'b': 1, 'c': 1}) (intersection/min)
print(c1 | c2)            # Counter({'a': 2, 'b': 2, 'c': 1, 'd': 2}) (union/max)

# Total count
print(count.total())      # 6 (Python 3.10+)
print(sum(count.values())) # 6 (pre-3.10)

# Check if one is a subset of another
c1 = Counter("abc")
c2 = Counter("aabbcc")
# All counts in c1 <= corresponding counts in c2?
print(all(c1[k] <= c2[k] for k in c1))  # True
```

---

## Sets

Sets are unordered collections of unique elements. They are like JS `Set`, but with much richer built-in operations.

### Creating Sets

```python
# Literal syntax
fruits = {"apple", "banana", "cherry"}

# From a list (removes duplicates)
numbers = set([1, 2, 2, 3, 3, 3])      # {1, 2, 3}

# From a string
chars = set("hello")                     # {'h', 'e', 'l', 'o'}

# Empty set (NOT {} -- that's an empty dict!)
empty = set()

# Frozen set (immutable, can be used as dict key or in other sets)
immutable = frozenset([1, 2, 3])
```

### Set Operations

```python
a = {1, 2, 3, 4, 5}
b = {4, 5, 6, 7, 8}

# Union (elements in either set)
a | b                  # {1, 2, 3, 4, 5, 6, 7, 8}
a.union(b)             # same

# Intersection (elements in both sets)
a & b                  # {4, 5}
a.intersection(b)      # same

# Difference (elements in a but not in b)
a - b                  # {1, 2, 3}
a.difference(b)        # same

# Symmetric difference (elements in either but not both)
a ^ b                  # {1, 2, 3, 6, 7, 8}
a.symmetric_difference(b)  # same

# Subset and superset
{1, 2}.issubset({1, 2, 3})       # True
{1, 2, 3}.issuperset({1, 2})     # True
{1, 2} <= {1, 2, 3}              # True (subset operator)
{1, 2, 3} >= {1, 2}              # True (superset operator)
{1, 2} < {1, 2, 3}               # True (proper subset)

# Disjoint (no common elements)
{1, 2}.isdisjoint({3, 4})        # True
```

```javascript
// JS Set has much fewer built-in operations
let a = new Set([1, 2, 3, 4, 5]);
let b = new Set([4, 5, 6, 7, 8]);

// Union (manual in JS -- new in ES2025 with Set methods proposal)
let union = new Set([...a, ...b]);

// Intersection (manual in JS)
let intersection = new Set([...a].filter(x => b.has(x)));

// Difference (manual in JS)
let diff = new Set([...a].filter(x => !b.has(x)));
```

### Modifying Sets

```python
s = {1, 2, 3}

# Add single element
s.add(4)               # {1, 2, 3, 4}
s.add(3)               # {1, 2, 3, 4} (no duplicate, no error)

# Add multiple elements
s.update([5, 6, 7])    # {1, 2, 3, 4, 5, 6, 7}

# Remove (raises KeyError if not found)
s.remove(7)            # {1, 2, 3, 4, 5, 6}
# s.remove(99)         # KeyError

# Discard (no error if not found)
s.discard(99)          # no error, set unchanged

# Pop (remove and return arbitrary element)
element = s.pop()      # removes some element

# Clear
s.clear()              # set()
```

### Set Use Cases

```python
# Deduplication
names = ["Alice", "Bob", "Alice", "Charlie", "Bob"]
unique = list(set(names))      # ['Alice', 'Bob', 'Charlie'] (order may vary)

# Preserve order while deduplicating
unique_ordered = list(dict.fromkeys(names))  # ['Alice', 'Bob', 'Charlie']

# Membership testing (O(1) vs O(n) for lists)
valid_statuses = {"active", "inactive", "pending"}
if user_status in valid_statuses:
    print("Valid status")

# Finding common/different elements
my_skills = {"python", "javascript", "sql", "docker"}
job_requires = {"python", "java", "sql", "kubernetes"}
matching = my_skills & job_requires          # {'python', 'sql'}
need_to_learn = job_requires - my_skills     # {'java', 'kubernetes'}
bonus_skills = my_skills - job_requires      # {'javascript', 'docker'}

# Removing duplicates from two lists and finding overlap
list1 = [1, 2, 3, 4, 5, 5]
list2 = [4, 5, 6, 7, 8, 8]
common = set(list1) & set(list2)             # {4, 5}
all_unique = set(list1) | set(list2)         # {1, 2, 3, 4, 5, 6, 7, 8}
```

---

## Dict and Set Comprehensions

```python
# Dict comprehension
names = ["alice", "bob", "charlie"]
name_lengths = {name: len(name) for name in names}
# {'alice': 5, 'bob': 3, 'charlie': 7}

# With filtering
scores = {"alice": 85, "bob": 62, "charlie": 91, "diana": 78}
passing = {name: score for name, score in scores.items() if score >= 70}
# {'alice': 85, 'charlie': 91, 'diana': 78}

# Transforming keys and values
upper_scores = {name.upper(): score / 100 for name, score in scores.items()}
# {'ALICE': 0.85, 'BOB': 0.62, 'CHARLIE': 0.91, 'DIANA': 0.78}

# Set comprehension
sentence = "the quick brown fox jumps over the lazy dog"
unique_lengths = {len(word) for word in sentence.split()}
# {3, 4, 5} (the unique word lengths)
```

---

## Nested Dictionaries

```python
# Nested dicts (like nested JS objects)
company = {
    "engineering": {
        "backend": ["Alice", "Bob"],
        "frontend": ["Charlie", "Diana"],
    },
    "marketing": {
        "content": ["Eve"],
        "seo": ["Frank", "Grace"],
    },
}

# Access nested values
print(company["engineering"]["backend"])     # ["Alice", "Bob"]

# Safe nested access
def safe_get(d, *keys, default=None):
    """Safely navigate nested dicts, like optional chaining in JS."""
    for key in keys:
        if isinstance(d, dict):
            d = d.get(key, default)
        else:
            return default
    return d

print(safe_get(company, "engineering", "backend"))     # ["Alice", "Bob"]
print(safe_get(company, "sales", "team"))              # None
print(safe_get(company, "sales", "team", default=[]))  # []
```

```javascript
// JS optional chaining
company?.engineering?.backend          // ["Alice", "Bob"]
company?.sales?.team                   // undefined
company?.sales?.team ?? []             // []
```

---

## Summary: Key Differences

| Feature                | Python Dict                      | JS Object / Map                  |
|------------------------|----------------------------------|----------------------------------|
| Key types              | Any hashable type                | Strings/Symbols (obj) or any (Map) |
| Ordered                | Yes (3.7+)                       | Not guaranteed (obj), yes (Map)  |
| Missing key access     | `KeyError` or `.get()`           | `undefined`                      |
| Safe access            | `.get(key, default)`             | `obj?.key ?? default`            |
| Merge                  | `d1 \| d2` or `{**d1, **d2}`    | `{...o1, ...o2}`                 |
| Delete                 | `del d[key]` or `d.pop(key)`     | `delete obj.key`                 |
| Iterate k/v            | `for k, v in d.items()`         | `for (let [k,v] of Object.entries(o))` |
| Size                   | `len(d)`                         | `Object.keys(o).length`         |
| Has key                | `key in d`                       | `key in obj` or `obj.hasOwnProperty(key)` |

---

## Practice Exercises

### Exercise 1: Word Grouper
Write a function that groups words by their first letter.

```python
words = ["apple", "avocado", "banana", "blueberry", "cherry", "cranberry", "apricot"]
# Expected: {'a': ['apple', 'avocado', 'apricot'], 'b': ['banana', 'blueberry'], 'c': ['cherry', 'cranberry']}
```

<details>
<summary>Solution</summary>

```python
from collections import defaultdict

def group_by_first_letter(words):
    groups = defaultdict(list)
    for word in words:
        groups[word[0]].append(word)
    return dict(groups)

words = ["apple", "avocado", "banana", "blueberry", "cherry", "cranberry", "apricot"]
print(group_by_first_letter(words))

# Without defaultdict:
def group_by_first_letter_v2(words):
    groups = {}
    for word in words:
        groups.setdefault(word[0], []).append(word)
    return groups
```
</details>

### Exercise 2: Config Merger
Write a function that deep-merges two configuration dictionaries (nested dicts should be merged recursively, not replaced).

```python
defaults = {
    "database": {"host": "localhost", "port": 5432, "name": "mydb"},
    "cache": {"enabled": True, "ttl": 300},
    "debug": False,
}
overrides = {
    "database": {"host": "prod-server", "ssl": True},
    "cache": {"ttl": 600},
    "debug": True,
}
# Expected: database.host="prod-server", database.port=5432, database.ssl=True, etc.
```

<details>
<summary>Solution</summary>

```python
def deep_merge(base, override):
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result

defaults = {
    "database": {"host": "localhost", "port": 5432, "name": "mydb"},
    "cache": {"enabled": True, "ttl": 300},
    "debug": False,
}
overrides = {
    "database": {"host": "prod-server", "ssl": True},
    "cache": {"ttl": 600},
    "debug": True,
}

merged = deep_merge(defaults, overrides)
print(merged)
# {
#   'database': {'host': 'prod-server', 'port': 5432, 'name': 'mydb', 'ssl': True},
#   'cache': {'enabled': True, 'ttl': 600},
#   'debug': True
# }
```
</details>

### Exercise 3: Set Operations for Permissions
Model a permission system using sets. Given users with role-based permissions, determine what a user can and cannot do.

```python
role_permissions = {
    "viewer": {"read", "list"},
    "editor": {"read", "list", "create", "update"},
    "admin": {"read", "list", "create", "update", "delete", "manage_users"},
}
# User has multiple roles: find their combined permissions,
# then check what additional permissions they'd get from a promotion.
```

<details>
<summary>Solution</summary>

```python
role_permissions = {
    "viewer": {"read", "list"},
    "editor": {"read", "list", "create", "update"},
    "admin": {"read", "list", "create", "update", "delete", "manage_users"},
}

def get_user_permissions(roles):
    """Combine permissions from all roles."""
    permissions = set()
    for role in roles:
        permissions |= role_permissions.get(role, set())
    return permissions

def promotion_benefits(current_roles, new_role):
    """What new permissions would adding this role grant?"""
    current = get_user_permissions(current_roles)
    with_new = current | role_permissions.get(new_role, set())
    return with_new - current

# User is a viewer and editor
user_roles = ["viewer", "editor"]
user_perms = get_user_permissions(user_roles)
print(f"Current permissions: {user_perms}")
# {'read', 'list', 'create', 'update'}

# What would admin add?
new_perms = promotion_benefits(user_roles, "admin")
print(f"Admin would add: {new_perms}")
# {'delete', 'manage_users'}

# Check specific permission
print(f"Can delete? {'delete' in user_perms}")   # False
print(f"Can read? {'read' in user_perms}")        # True
```
</details>

### Exercise 4: Frequency Analysis
Given a list of log entries, use Counter to find the top 3 most common error types, the total number of errors, and error rate per endpoint.

```python
logs = [
    {"endpoint": "/api/users", "status": 200},
    {"endpoint": "/api/users", "status": 500, "error": "DatabaseError"},
    {"endpoint": "/api/orders", "status": 404, "error": "NotFound"},
    {"endpoint": "/api/users", "status": 200},
    {"endpoint": "/api/orders", "status": 500, "error": "DatabaseError"},
    {"endpoint": "/api/auth", "status": 401, "error": "Unauthorized"},
    {"endpoint": "/api/users", "status": 500, "error": "DatabaseError"},
    {"endpoint": "/api/orders", "status": 200},
    {"endpoint": "/api/auth", "status": 401, "error": "Unauthorized"},
    {"endpoint": "/api/auth", "status": 200},
]
```

<details>
<summary>Solution</summary>

```python
from collections import Counter, defaultdict

logs = [
    {"endpoint": "/api/users", "status": 200},
    {"endpoint": "/api/users", "status": 500, "error": "DatabaseError"},
    {"endpoint": "/api/orders", "status": 404, "error": "NotFound"},
    {"endpoint": "/api/users", "status": 200},
    {"endpoint": "/api/orders", "status": 500, "error": "DatabaseError"},
    {"endpoint": "/api/auth", "status": 401, "error": "Unauthorized"},
    {"endpoint": "/api/users", "status": 500, "error": "DatabaseError"},
    {"endpoint": "/api/orders", "status": 200},
    {"endpoint": "/api/auth", "status": 401, "error": "Unauthorized"},
    {"endpoint": "/api/auth", "status": 200},
]

# Top 3 error types
error_types = Counter(log["error"] for log in logs if "error" in log)
print("Top 3 errors:", error_types.most_common(3))
# [('DatabaseError', 3), ('Unauthorized', 2), ('NotFound', 1)]

# Total errors
total_errors = sum(error_types.values())
total_requests = len(logs)
print(f"Error rate: {total_errors}/{total_requests} ({total_errors/total_requests:.1%})")
# Error rate: 6/10 (60.0%)

# Error rate per endpoint
endpoint_stats = defaultdict(lambda: {"total": 0, "errors": 0})
for log in logs:
    ep = log["endpoint"]
    endpoint_stats[ep]["total"] += 1
    if "error" in log:
        endpoint_stats[ep]["errors"] += 1

for ep, stats in sorted(endpoint_stats.items()):
    rate = stats["errors"] / stats["total"]
    print(f"{ep}: {stats['errors']}/{stats['total']} ({rate:.0%} error rate)")
# /api/auth: 2/3 (67% error rate)
# /api/orders: 2/3 (67% error rate)
# /api/users: 2/4 (50% error rate)
```
</details>

### Exercise 5: Inventory System
Build a simple inventory tracker using dicts. Support adding items, removing items, checking stock, and finding items below a reorder threshold.

```python
class Inventory:
    def __init__(self):
        pass

    def add_stock(self, item, quantity, price): pass
    def remove_stock(self, item, quantity): pass
    def get_stock(self, item): pass
    def low_stock(self, threshold=5): pass
    def total_value(self): pass
```

<details>
<summary>Solution</summary>

```python
class Inventory:
    def __init__(self):
        self.items = {}

    def add_stock(self, item, quantity, price=None):
        if item in self.items:
            self.items[item]["quantity"] += quantity
            if price is not None:
                self.items[item]["price"] = price
        else:
            if price is None:
                raise ValueError(f"Price required for new item: {item}")
            self.items[item] = {"quantity": quantity, "price": price}

    def remove_stock(self, item, quantity):
        if item not in self.items:
            raise KeyError(f"Item not in inventory: {item}")
        if self.items[item]["quantity"] < quantity:
            raise ValueError(f"Insufficient stock for {item}")
        self.items[item]["quantity"] -= quantity
        if self.items[item]["quantity"] == 0:
            del self.items[item]

    def get_stock(self, item):
        return self.items.get(item, {"quantity": 0, "price": 0})

    def low_stock(self, threshold=5):
        return {
            item: info
            for item, info in self.items.items()
            if info["quantity"] <= threshold
        }

    def total_value(self):
        return sum(
            info["quantity"] * info["price"]
            for info in self.items.values()
        )

# Usage
inv = Inventory()
inv.add_stock("Widget", 100, 9.99)
inv.add_stock("Gadget", 3, 24.99)
inv.add_stock("Widget", 50)          # add more, keep same price
inv.remove_stock("Widget", 20)

print(f"Widget stock: {inv.get_stock('Widget')}")
# Widget stock: {'quantity': 130, 'price': 9.99}

print(f"Low stock items: {inv.low_stock()}")
# Low stock items: {'Gadget': {'quantity': 3, 'price': 24.99}}

print(f"Total inventory value: ${inv.total_value():,.2f}")
# Total inventory value: $1,373.67
```
</details>
