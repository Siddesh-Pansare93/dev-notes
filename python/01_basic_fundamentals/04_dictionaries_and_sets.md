# 04 - Dictionaries and Sets

## Coming from Node.js/TypeScript

Python ka dictionary basically JS ke plain object aur Map ka hybrid hai. Order maintain hoti hai (insertion order, Python 3.7 se guaranteed), methods bohot rich hain, aur ye Python ka sabse zyada use hone wala data structure hai. Sets bhi JS ke `Set` jaise familiar lagenge, bas inme built-in set operations bohot zyada milte hain.

---

## Dictionaries

### Creating Dictionaries

Kya hota hai? Dictionary matlab key-value pairs ka collection — bilkul JS object jaisa, bas banane ke kai tareeke hain.

```python
# Literal syntax (JS objects jaisa hi, bas keys ko quote karna padta hai unless variables ho)
user = {
    "name": "Alice",
    "age": 30,
    "email": "alice@example.com",
}

# dict() constructor
user = dict(name="Alice", age=30, email="alice@example.com")

# List of tuples se
user = dict([("name", "Alice"), ("age", 30)])

# Do lists se, zip use karke
keys = ["name", "age", "email"]
values = ["Alice", 30, "alice@example.com"]
user = dict(zip(keys, values))

# Empty dict
empty = {}
empty = dict()

# Dict comprehension (preview -- 10_comprehensions.md me detail me aayega)
squares = {x: x ** 2 for x in range(6)}  # {0: 0, 1: 1, 2: 4, 3: 9, 4: 16, 5: 25}
```

```javascript
// JS object
let user = { name: "Alice", age: 30 };
// JS Map
let userMap = new Map([["name", "Alice"], ["age", 30]]);
```

### Key Types

Python dict ki key koi bhi **hashable** (immutable) type ho sakti hai. Ye JS object se zyada flexible hai (jo sirf string/symbol keys deta hai), lekin JS Map se kam flexible hai (jo koi bhi type le leta hai).

Socho JS Map jaisa flexible key system, par ek limit ke saath — sirf wahi cheez key ban sakti hai jo change nahi ho sakti (immutable).

```python
d = {
    "string_key": 1,
    42: "integer key",
    (1, 2): "tuple key",          # tuples hashable hote hain
    True: "bool key",             # True == 1, isliye ye key 42 ko overwrite kar dega!
    3.14: "float key",
    frozenset({1, 2}): "set key", # frozenset hashable hai (set nahi hota)
}

# Ye keys NAHI ban sakti (not hashable):
# {[1, 2]: "list key"}         # TypeError: unhashable type: 'list'
# {{}: "dict key"}             # TypeError: unhashable type: 'dict'
# {{1, 2}: "set key"}          # TypeError: unhashable type: 'set'
```

### Accessing Values

Zomato app socho — agar tum menu me koi item search karo jo hai hi nahi, to app crash nahi hoti, bas "not available" dikha deti hai. Python ka `.get()` bhi wahi karta hai — safely value nikaal deta hai, error nahi deta.

```python
user = {"name": "Alice", "age": 30, "email": "alice@example.com"}

# Bracket notation (missing key pe KeyError deta hai)
print(user["name"])           # "Alice"
# print(user["phone"])        # KeyError: 'phone'

# .get() -- safe access with optional default (YE PYTHON KA TAREEKA HAI)
print(user.get("name"))       # "Alice"
print(user.get("phone"))      # None (koi error nahi)
print(user.get("phone", "N/A"))  # "N/A" (custom default)

# Check if key exists
if "name" in user:
    print(user["name"])

# Ye pattern Python me NAHI chahiye (JS me common hai):
# user["name"] if "name" in user else "default"
# Bas ye use karo: user.get("name", "default")
```

```javascript
// JS access patterns
user.name                     // "Alice" (dot notation)
user["name"]                  // "Alice" (bracket notation)
user.phone                    // undefined (koi error nahi)
user?.phone                   // undefined (optional chaining)
user.phone ?? "N/A"          // "N/A" (nullish coalescing)
```

> [!warning]
> Python dict bracket access me missing key pe `KeyError` deta hai. JS object chup-chaap `undefined` de deta hai. Isliye Python me safe access ke liye `.get()` use karo.

### Adding and Modifying

```python
user = {"name": "Alice", "age": 30}

# Add ya update
user["email"] = "alice@example.com"    # naya key add hua
user["age"] = 31                       # existing key update hua

# Ek saath multiple keys update karna
user.update({"age": 32, "city": "NYC", "role": "admin"})

# Dicts merge karna (Python 3.9+)
defaults = {"theme": "dark", "lang": "en", "role": "user"}
overrides = {"lang": "fr", "role": "admin"}
settings = defaults | overrides        # {'theme': 'dark', 'lang': 'fr', 'role': 'admin'}

# In-place merge (Python 3.9+)
defaults |= overrides                  # defaults ko modify kar deta hai

# Pre-3.9 merge
settings = {**defaults, **overrides}   # spread jaisa syntax
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

# Remove karo aur value return karo
age = user.pop("age")              # 30, ab user me "age" nahi hai
phone = user.pop("phone", None)    # None (missing ho to bhi error nahi)

# Sabse last insert hui item remove karke return karo (LIFO)
key, value = user.popitem()        # ("role", "admin"), Python 3.7+ me

# Bina return kiye delete karna
del user["email"]

# Sab clear karna
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

# Key-value pairs (SABSE ZYADA USE HOTA HAI)
for key, value in user.items():
    print(f"{key}: {value}")
# name: Alice
# age: 30
# city: NYC
```

```javascript
// JS iteration
for (let key in obj) { ... }           // for...in (prototype bhi include karta hai, generally avoid karo)
for (let key of Object.keys(obj)) { ... }
for (let value of Object.values(obj)) { ... }
for (let [key, value] of Object.entries(obj)) { ... }
```

### Useful Dict Patterns

```python
# setdefault -- value nikalo, par pehle missing ho to set kar do
cache = {}
cache.setdefault("users", []).append("Alice")
cache.setdefault("users", []).append("Bob")
print(cache)   # {"users": ["Alice", "Bob"]}

# Dicts se counting
words = ["apple", "banana", "apple", "cherry", "banana", "apple"]
counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1
print(counts)  # {'apple': 3, 'banana': 2, 'cherry': 1}

# Dict ko invert karna
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

Kyun zaruri hai? `defaultdict` missing keys ko automatically ek default value ke saath bana deta hai. "Pehle check karo key hai ya nahi, phir initialize karo" wala boilerplate khatam.

Socho tum Swiggy me order group kar rahe ho restaurant-wise. Har naye restaurant ke liye pehle empty list banani padti — lekin `defaultdict` ye kaam khud ba khud kar deta hai.

```python
from collections import defaultdict

# Empty lists auto-create honge
groups = defaultdict(list)
groups["fruits"].append("apple")      # key exist karti hai ya nahi, check karne ki zaroorat nahi
groups["fruits"].append("banana")
groups["vegetables"].append("carrot")
print(dict(groups))
# {'fruits': ['apple', 'banana'], 'vegetables': ['carrot']}

# Zeros auto-create honge (counting ke liye)
counter = defaultdict(int)
for char in "hello world":
    counter[char] += 1                # automatically 0 se start hota hai
print(dict(counter))
# {'h': 1, 'e': 1, 'l': 3, 'o': 2, ' ': 1, 'w': 1, 'r': 1, 'd': 1}

# Sets auto-create honge
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

`Counter` ek specialized dict hai jo cheezein count karne ke liye bana hai. Kaam ka cheez hai bohot.

```python
from collections import Counter

# Elements count karo
words = ["apple", "banana", "apple", "cherry", "banana", "apple"]
count = Counter(words)
print(count)               # Counter({'apple': 3, 'banana': 2, 'cherry': 1})

# String ke characters count karo
char_count = Counter("mississippi")
print(char_count)          # Counter({'s': 4, 'i': 4, 'p': 2, 'm': 1})

# Sabse zyada aane wale elements
print(count.most_common(2))    # [('apple', 3), ('banana', 2)]

# Counters ke saath arithmetic
c1 = Counter("aabbc")
c2 = Counter("abcdd")
print(c1 + c2)            # Counter({'a': 3, 'b': 3, 'c': 2, 'd': 2})
print(c1 - c2)            # Counter({'a': 1, 'b': 1}) (sirf positive counts)
print(c1 & c2)            # Counter({'a': 1, 'b': 1, 'c': 1}) (intersection/min)
print(c1 | c2)            # Counter({'a': 2, 'b': 2, 'c': 1, 'd': 2}) (union/max)

# Total count
print(count.total())      # 6 (Python 3.10+)
print(sum(count.values())) # 6 (pre-3.10)

# Check karo ek Counter dusre ka subset hai ya nahi
c1 = Counter("abc")
c2 = Counter("aabbcc")
# c1 ke saare counts <= c2 ke corresponding counts?
print(all(c1[k] <= c2[k] for k in c1))  # True
```

---

## Sets

Kya hota hai? Sets unique elements ka unordered collection hote hain. JS ke `Set` jaise hi hain, bas Python me built-in operations kaafi zyada rich hain.

### Creating Sets

```python
# Literal syntax
fruits = {"apple", "banana", "cherry"}

# List se (duplicates remove ho jaate hain)
numbers = set([1, 2, 2, 3, 3, 3])      # {1, 2, 3}

# String se
chars = set("hello")                     # {'h', 'e', 'l', 'o'}

# Empty set (NOT {} -- wo to empty dict hai!)
empty = set()

# Frozen set (immutable, dict key ya doosre sets ke andar use ho sakta hai)
immutable = frozenset([1, 2, 3])
```

> [!warning]
> `{}` empty dict banata hai, empty set nahi. Empty set ke liye hamesha `set()` use karo.

### Set Operations

Ye same wahi maths wale Venn diagram concepts hain jo school me padhe the — bas ab Python me directly use kar sakte ho.

```python
a = {1, 2, 3, 4, 5}
b = {4, 5, 6, 7, 8}

# Union (dono me se kisi bhi set ke elements)
a | b                  # {1, 2, 3, 4, 5, 6, 7, 8}
a.union(b)             # same

# Intersection (dono sets me common elements)
a & b                  # {4, 5}
a.intersection(b)      # same

# Difference (a me hai par b me nahi)
a - b                  # {1, 2, 3}
a.difference(b)        # same

# Symmetric difference (kisi ek me hai, dono me nahi)
a ^ b                  # {1, 2, 3, 6, 7, 8}
a.symmetric_difference(b)  # same

# Subset aur superset
{1, 2}.issubset({1, 2, 3})       # True
{1, 2, 3}.issuperset({1, 2})     # True
{1, 2} <= {1, 2, 3}              # True (subset operator)
{1, 2, 3} >= {1, 2}              # True (superset operator)
{1, 2} < {1, 2, 3}               # True (proper subset)

# Disjoint (koi common element nahi)
{1, 2}.isdisjoint({3, 4})        # True
```

```javascript
// JS Set me bohot kam built-in operations hain
let a = new Set([1, 2, 3, 4, 5]);
let b = new Set([4, 5, 6, 7, 8]);

// Union (JS me manually karna padta hai -- ES2025 ke Set methods proposal me naya)
let union = new Set([...a, ...b]);

// Intersection (JS me manually)
let intersection = new Set([...a].filter(x => b.has(x)));

// Difference (JS me manually)
let diff = new Set([...a].filter(x => !b.has(x)));
```

### Modifying Sets

```python
s = {1, 2, 3}

# Single element add karo
s.add(4)               # {1, 2, 3, 4}
s.add(3)               # {1, 2, 3, 4} (duplicate nahi banega, error bhi nahi)

# Multiple elements add karo
s.update([5, 6, 7])    # {1, 2, 3, 4, 5, 6, 7}

# Remove (nahi mila to KeyError deta hai)
s.remove(7)            # {1, 2, 3, 4, 5, 6}
# s.remove(99)         # KeyError

# Discard (nahi mila to bhi error nahi)
s.discard(99)          # error nahi, set waisa hi rahega

# Pop (remove karke koi bhi ek element return karo)
element = s.pop()      # koi ek element remove hoga

# Clear
s.clear()              # set()
```

### Set Use Cases

Real duniya me sets kaam kab aate hain? Deduplication, fast membership check, aur do groups compare karne me — jaise IRCTC waitlist me common passengers dhoondna ho.

```python
# Deduplication
names = ["Alice", "Bob", "Alice", "Charlie", "Bob"]
unique = list(set(names))      # ['Alice', 'Bob', 'Charlie'] (order guarantee nahi)

# Order preserve karte hue deduplicate karna
unique_ordered = list(dict.fromkeys(names))  # ['Alice', 'Bob', 'Charlie']

# Membership testing (O(1), list ke O(n) se kaafi fast)
valid_statuses = {"active", "inactive", "pending"}
if user_status in valid_statuses:
    print("Valid status")

# Common/different elements dhoondna
my_skills = {"python", "javascript", "sql", "docker"}
job_requires = {"python", "java", "sql", "kubernetes"}
matching = my_skills & job_requires          # {'python', 'sql'}
need_to_learn = job_requires - my_skills     # {'java', 'kubernetes'}
bonus_skills = my_skills - job_requires      # {'javascript', 'docker'}

# Do lists se duplicates hatana aur overlap dhoondna
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

# Filtering ke saath
scores = {"alice": 85, "bob": 62, "charlie": 91, "diana": 78}
passing = {name: score for name, score in scores.items() if score >= 70}
# {'alice': 85, 'charlie': 91, 'diana': 78}

# Keys aur values dono transform karna
upper_scores = {name.upper(): score / 100 for name, score in scores.items()}
# {'ALICE': 0.85, 'BOB': 0.62, 'CHARLIE': 0.91, 'DIANA': 0.78}

# Set comprehension
sentence = "the quick brown fox jumps over the lazy dog"
unique_lengths = {len(word) for word in sentence.split()}
# {3, 4, 5} (words ki unique lengths)
```

> [!tip]
> Inka pura detail `10_comprehensions.md` me milega — abhi bas syntax se familiar ho jao.

---

## Nested Dictionaries

```python
# Nested dicts (JS ke nested objects jaise hi)
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

# Nested values access karna
print(company["engineering"]["backend"])     # ["Alice", "Bob"]

# Safe nested access
def safe_get(d, *keys, default=None):
    """Nested dicts me safely navigate karo, JS ke optional chaining jaisa."""
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
| Key types              | Koi bhi hashable type            | Strings/Symbols (obj) ya koi bhi (Map) |
| Ordered                | Haan (3.7+)                      | Guarantee nahi (obj), haan (Map) |
| Missing key access     | `KeyError` ya `.get()`           | `undefined`                      |
| Safe access            | `.get(key, default)`             | `obj?.key ?? default`            |
| Merge                  | `d1 \| d2` ya `{**d1, **d2}`    | `{...o1, ...o2}`                 |
| Delete                 | `del d[key]` ya `d.pop(key)`     | `delete obj.key`                 |
| Iterate k/v            | `for k, v in d.items()`         | `for (let [k,v] of Object.entries(o))` |
| Size                   | `len(d)`                         | `Object.keys(o).length`         |
| Has key                | `key in d`                       | `key in obj` ya `obj.hasOwnProperty(key)` |

---

## Practice Exercises

### Exercise 1: Word Grouper
Ek function likho jo words ko unke pehle letter ke hisaab se group kare.

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

# defaultdict ke bina:
def group_by_first_letter_v2(words):
    groups = {}
    for word in words:
        groups.setdefault(word[0], []).append(word)
    return groups
```
</details>

### Exercise 2: Config Merger
Ek function likho jo do configuration dictionaries ko deep-merge kare (nested dicts recursively merge honi chahiye, replace nahi).

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
Sets use karke ek permission system banao. Role-based permissions wale users diye hain — pata karo ki user kya kar sakta hai aur kya nahi.

```python
role_permissions = {
    "viewer": {"read", "list"},
    "editor": {"read", "list", "create", "update"},
    "admin": {"read", "list", "create", "update", "delete", "manage_users"},
}
# User ke paas multiple roles hain: unki combined permissions nikalo,
# phir check karo ki promotion se unhe kya extra permissions milengi.
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
    """Saare roles ki permissions combine karo."""
    permissions = set()
    for role in roles:
        permissions |= role_permissions.get(role, set())
    return permissions

def promotion_benefits(current_roles, new_role):
    """Ye naya role add karne se kaunsi nayi permissions milengi?"""
    current = get_user_permissions(current_roles)
    with_new = current | role_permissions.get(new_role, set())
    return with_new - current

# User viewer aur editor dono hai
user_roles = ["viewer", "editor"]
user_perms = get_user_permissions(user_roles)
print(f"Current permissions: {user_perms}")
# {'read', 'list', 'create', 'update'}

# Admin banne se kya add hoga?
new_perms = promotion_benefits(user_roles, "admin")
print(f"Admin would add: {new_perms}")
# {'delete', 'manage_users'}

# Specific permission check karo
print(f"Can delete? {'delete' in user_perms}")   # False
print(f"Can read? {'read' in user_perms}")        # True
```
</details>

### Exercise 4: Frequency Analysis
Log entries ki ek list di hai, `Counter` use karke top 3 sabse common error types, total errors, aur har endpoint ka error rate nikalo.

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

# Har endpoint ka error rate
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
Dicts use karke ek simple inventory tracker banao. Items add/remove karna, stock check karna, aur reorder threshold se kam stock wale items dhoondna support hona chahiye.

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
inv.add_stock("Widget", 50)          # aur add karo, price same rehne do
inv.remove_stock("Widget", 20)

print(f"Widget stock: {inv.get_stock('Widget')}")
# Widget stock: {'quantity': 130, 'price': 9.99}

print(f"Low stock items: {inv.low_stock()}")
# Low stock items: {'Gadget': {'quantity': 3, 'price': 24.99}}

print(f"Total inventory value: ${inv.total_value():,.2f}")
# Total inventory value: $1,373.67
```
</details>
