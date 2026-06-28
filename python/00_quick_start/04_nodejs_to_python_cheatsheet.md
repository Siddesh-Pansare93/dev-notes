# 04 - Node.js/TypeScript to Python Cheatsheet

> **Quick reference guide.** Bookmark this file. You'll come back to it constantly during your first weeks with Python.

---

## Table of Contents

1. [Variables & Constants](#variables--constants)
2. [Data Types](#data-types)
3. [Strings](#strings)
4. [Numbers](#numbers)
5. [Booleans, None, Truthiness](#booleans-none-truthiness)
6. [Arrays/Lists](#arrayslists)
7. [Objects/Dicts](#objectsdicts)
8. [Sets & Tuples (No JS Equivalent)](#sets--tuples)
9. [Functions](#functions)
10. [Arrow Functions / Lambda](#arrow-functions--lambda)
11. [Destructuring / Unpacking](#destructuring--unpacking)
12. [Spread / Splat Operators](#spread--splat-operators)
13. [Conditionals & Ternary](#conditionals--ternary)
14. [Loops](#loops)
15. [Error Handling](#error-handling)
16. [Classes](#classes)
17. [Modules & Imports](#modules--imports)
18. [Async/Await](#asyncawait)
19. [Equality & Comparison](#equality--comparison)
20. [Console / Print](#console--print)
21. [Type Annotations](#type-annotations)
22. [Common Gotchas](#common-gotchas)
23. [Practice Exercises](#practice-exercises)

---

## Variables & Constants

```javascript
// JavaScript / TypeScript
let name = "Alice";           // Mutable
const age = 30;               // Immutable binding
var legacy = "don't use";     // Function-scoped (avoid)

// TypeScript
let name: string = "Alice";
const age: number = 30;
```

```python
# Python
name = "Alice"          # All variables are like 'let'
age = 30                # No const keyword! Convention: UPPER_CASE for constants

# Python convention for constants (not enforced)
MAX_RETRIES = 3
API_BASE_URL = "https://api.example.com"

# Type-annotated (like TypeScript, but not enforced at runtime)
name: str = "Alice"
age: int = 30
```

**Key difference:** Python has no `const`. Use `UPPER_SNAKE_CASE` by convention. If you want enforcement, use tools like `mypy` with `Final`:

```python
from typing import Final
MAX_RETRIES: Final = 3  # mypy will flag reassignment
```

---

## Data Types

| JavaScript/TypeScript | Python | Notes |
|---|---|---|
| `string` | `str` | |
| `number` | `int`, `float` | Python separates integer and float |
| `boolean` | `bool` | `True`/`False` (capitalized!) |
| `null` | `None` | |
| `undefined` | N/A | Python has no undefined |
| `Array` | `list` | |
| `Object` / `{}` | `dict` | |
| `Set` | `set` | |
| `Map` | `dict` | Python dicts ARE ordered (3.7+) |
| `Symbol` | N/A | No equivalent |
| `bigint` | `int` | Python ints are arbitrary precision by default |
| `Tuple` (TS) | `tuple` | Immutable list |

```javascript
// JavaScript - checking types
typeof "hello"      // "string"
typeof 42           // "number"
typeof true         // "boolean"
typeof null         // "object" (famous bug)
typeof undefined    // "undefined"
Array.isArray([])   // true
```

```python
# Python - checking types
type("hello")       # <class 'str'>
type(42)            # <class 'int'>
type(True)          # <class 'bool'>
type(None)          # <class 'NoneType'>
type([])            # <class 'list'>

isinstance("hello", str)     # True
isinstance(42, (int, float)) # True - can check multiple types
```

---

## Strings

```javascript
// JavaScript
const name = "Alice";
const greeting = `Hello, ${name}!`;            // Template literal
const multi = `line 1
line 2
line 3`;
"hello".toUpperCase();                         // "HELLO"
"hello".includes("ell");                       // true
"hello world".split(" ");                      // ["hello", "world"]
"  hello  ".trim();                            // "hello"
"hello".slice(1, 3);                           // "el"
"hello".indexOf("l");                          // 2
"ha".repeat(3);                                // "hahaha"
"hello".replace("l", "r");                     // "herlo" (first only)
"hello".replaceAll("l", "r");                  // "herro"
"hello".startsWith("hel");                     // true
"hello"[0];                                    // "h"
"hello".length;                                // 5
```

```python
# Python
name = "Alice"
greeting = f"Hello, {name}!"                   # f-string (like template literal)
multi = """line 1
line 2
line 3"""
"hello".upper()                                # "HELLO"
"ell" in "hello"                               # True (use 'in' operator)
"hello world".split(" ")                       # ["hello", "world"]
"  hello  ".strip()                            # "hello"
"hello"[1:3]                                   # "el" (slicing)
"hello".index("l")                             # 2 (raises error if not found)
"hello".find("l")                              # 2 (returns -1 if not found)
"ha" * 3                                       # "hahaha"
"hello".replace("l", "r", 1)                   # "herlo" (third arg = count)
"hello".replace("l", "r")                      # "herro" (all by default!)
"hello".startswith("hel")                      # True
"hello"[0]                                     # "h"
len("hello")                                   # 5 (function, not property!)
```

### f-strings vs Template Literals

```javascript
// JavaScript template literals
const name = "Alice";
const age = 30;
console.log(`${name} is ${age} years old`);
console.log(`2 + 2 = ${2 + 2}`);
console.log(`Items: ${items.join(", ")}`);
```

```python
# Python f-strings (prefix with f)
name = "Alice"
age = 30
print(f"{name} is {age} years old")
print(f"2 + 2 = {2 + 2}")
print(f"Items: {', '.join(items)}")

# f-strings can also do formatting
print(f"{3.14159:.2f}")        # "3.14"
print(f"{1000000:,}")          # "1,000,000"
print(f"{name!r}")             # "'Alice'" (repr)
print(f"{'hello':>20}")        # "               hello" (right-align)
```

---

## Numbers

```javascript
// JavaScript - everything is a float
const x = 42;            // number
const y = 3.14;          // number
const big = 9007199254740991n; // BigInt

parseInt("42");           // 42
parseFloat("3.14");       // 3.14
Number("42");             // 42
Math.floor(3.7);          // 3
Math.ceil(3.2);           // 4
Math.round(3.5);          // 4
Math.abs(-5);             // 5
Math.max(1, 2, 3);        // 3
Math.min(1, 2, 3);        // 1
Math.random();            // 0.0 to 1.0
Number.isInteger(42);     // true
```

```python
# Python - int and float are separate
x = 42                    # int
y = 3.14                  # float
big = 999999999999999999999999  # int (arbitrary precision, no BigInt needed!)

int("42")                 # 42
float("3.14")             # 3.14
import math
math.floor(3.7)           # 3
math.ceil(3.2)            # 4
round(3.5)                # 4 (built-in, but uses banker's rounding!)
abs(-5)                   # 5 (built-in)
max(1, 2, 3)              # 3 (built-in)
min(1, 2, 3)              # 1 (built-in)
import random
random.random()           # 0.0 to 1.0
isinstance(42, int)       # True

# Python extras
10 // 3                   # 3 (integer division)
10 % 3                    # 1 (modulo, same as JS)
2 ** 10                   # 1024 (exponent, JS uses ** too)
```

---

## Booleans, None, Truthiness

```javascript
// JavaScript
true, false
null
undefined

// Falsy values: false, 0, "", null, undefined, NaN, 0n
// Truthy: everything else (including [], {}, "0")

!!""     // false
!![]     // true  <-- Watch out! Empty array is truthy in JS
!!{}     // true  <-- Empty object is truthy in JS
!!0      // false
!!null   // false
```

```python
# Python
True, False              # Capitalized!
None                     # null equivalent (no undefined!)

# Falsy values: False, 0, 0.0, "", [], {}, set(), (), None, 0j
# Truthy: everything else

bool("")       # False
bool([])       # False  <-- Empty list is FALSY in Python!
bool({})       # False  <-- Empty dict is FALSY in Python!
bool(0)        # False
bool(None)     # False
bool("0")      # True   <-- Non-empty string, same as JS
```

### Critical Difference: Empty Collections

```javascript
// JavaScript
if ([]) console.log("runs!");      // Runs! Empty array is truthy
if ({}) console.log("runs!");      // Runs! Empty object is truthy
```

```python
# Python
if []:
    print("never runs!")    # Doesn't run! Empty list is falsy
if {}:
    print("never runs!")    # Doesn't run! Empty dict is falsy

# This is actually super useful:
items = get_items()
if items:                   # Pythonic way to check "not empty"
    process(items)

# Instead of the verbose:
if len(items) > 0:          # Works but not Pythonic
    process(items)
```

### None Checking

```javascript
// JavaScript
if (value === null) { }
if (value == null) { }      // Catches both null and undefined
if (value != null) { }

// Optional chaining
const name = user?.profile?.name;
const result = callback?.();

// Nullish coalescing
const port = config.port ?? 3000;
```

```python
# Python
if value is None:  pass      # Always use 'is' for None, never ==
if value is not None:  pass

# No optional chaining built-in. Common patterns:
name = user and user.profile and user.profile.name  # Short-circuit
# Or use getattr:
name = getattr(getattr(user, 'profile', None), 'name', None)

# No nullish coalescing. Use 'or' (but careful -- it catches all falsy!)
port = config.get("port") or 3000     # Catches 0 too! Be careful
port = config.get("port", 3000)       # Better: dict.get() with default
```

---

## Arrays/Lists

```javascript
// JavaScript Arrays
const arr = [1, 2, 3, 4, 5];
arr.length;                    // 5
arr.push(6);                   // [1,2,3,4,5,6]
arr.pop();                     // 6, arr = [1,2,3,4,5]
arr.unshift(0);                // [0,1,2,3,4,5]
arr.shift();                   // 0, arr = [1,2,3,4,5]
arr.includes(3);               // true
arr.indexOf(3);                // 2
arr.slice(1, 3);               // [2, 3]
arr.splice(1, 2);              // removes 2 items at index 1
arr.concat([6, 7]);            // [1,2,3,4,5,6,7]
arr.reverse();                 // mutates!
arr.sort();                    // mutates!
[...arr];                      // shallow copy

// Functional methods
arr.map(x => x * 2);          // [2, 4, 6, 8, 10]
arr.filter(x => x > 2);       // [3, 4, 5]
arr.reduce((sum, x) => sum + x, 0);  // 15
arr.find(x => x > 3);         // 4
arr.findIndex(x => x > 3);    // 3
arr.every(x => x > 0);        // true
arr.some(x => x > 4);         // true
arr.forEach(x => console.log(x));
arr.flat();                    // flatten
```

```python
# Python Lists
arr = [1, 2, 3, 4, 5]
len(arr)                       # 5 (function, not property)
arr.append(6)                  # [1,2,3,4,5,6]
arr.pop()                      # 6, arr = [1,2,3,4,5]
arr.insert(0, 0)               # [0,1,2,3,4,5] (no unshift)
arr.pop(0)                     # 0 (pop at index, like shift)
3 in arr                       # True (use 'in' operator)
arr.index(3)                   # 2
arr[1:3]                       # [2, 3] (slicing)
del arr[1:3]                   # removes items at index 1-2
arr + [6, 7]                   # [1,2,3,4,5,6,7] (creates new list)
arr.reverse()                  # mutates!
arr.sort()                     # mutates!
arr.copy()                     # shallow copy (or arr[:] or list(arr))

# Functional equivalents (Python uses different patterns!)
[x * 2 for x in arr]                    # [2, 4, 6, 8, 10]  -- list comprehension!
[x for x in arr if x > 2]               # [3, 4, 5]         -- filtered comprehension
sum(arr)                                 # 15 (built-in for sum)
from functools import reduce
reduce(lambda acc, x: acc + x, arr, 0)  # 15 (less common in Python)
next(x for x in arr if x > 3)           # 4 (like find)
next((i for i, x in enumerate(arr) if x > 3), -1)  # 3 (like findIndex)
all(x > 0 for x in arr)                 # True (like every)
any(x > 4 for x in arr)                 # True (like some)
for x in arr: print(x)                  # Like forEach
# No built-in flat(), but: [item for sub in nested for item in sub]
```

### List Comprehensions (Python's Superpower)

This is one of Python's best features with no direct JS equivalent:

```javascript
// JavaScript
const squares = [1,2,3,4,5].map(x => x ** 2);                    // [1,4,9,16,25]
const evens = [1,2,3,4,5].filter(x => x % 2 === 0);              // [2, 4]
const evenSquares = [1,2,3,4,5].filter(x => x % 2 === 0).map(x => x ** 2);  // [4, 16]
```

```python
# Python - list comprehensions are idiomatic and fast
squares = [x ** 2 for x in [1,2,3,4,5]]                    # [1,4,9,16,25]
evens = [x for x in [1,2,3,4,5] if x % 2 == 0]            # [2, 4]
even_squares = [x ** 2 for x in [1,2,3,4,5] if x % 2 == 0] # [4, 16]

# Nested comprehension (flat map)
matrix = [[1,2], [3,4], [5,6]]
flat = [num for row in matrix for num in row]               # [1,2,3,4,5,6]

# Dict comprehension
squares_dict = {x: x**2 for x in range(5)}                 # {0:0, 1:1, 2:4, 3:9, 4:16}

# Set comprehension
unique_lengths = {len(word) for word in ["hi", "hello", "hey"]}  # {2, 5, 3}
```

### Slicing (Python's Other Superpower)

```python
# Python slicing: arr[start:stop:step]
arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

arr[2:5]      # [2, 3, 4]       -- like arr.slice(2, 5)
arr[:3]       # [0, 1, 2]       -- first 3 items
arr[7:]       # [7, 8, 9]       -- from index 7 to end
arr[-3:]      # [7, 8, 9]       -- last 3 items
arr[:-2]      # [0,1,2,3,4,5,6,7]  -- everything except last 2
arr[::2]      # [0, 2, 4, 6, 8]    -- every 2nd item
arr[::-1]     # [9,8,7,6,5,4,3,2,1,0]  -- reversed!

# Works on strings too
"Hello, World!"[7:12]   # "World"
"Hello"[::-1]            # "olleH"
```

---

## Objects/Dicts

```javascript
// JavaScript Objects
const user = {
  name: "Alice",
  age: 30,
  email: "alice@example.com"
};

user.name;                     // "Alice"
user["name"];                  // "Alice"
user.phone;                    // undefined (no error)
user.phone = "555-1234";       // Add property
delete user.phone;             // Remove property
"name" in user;                // true
Object.keys(user);             // ["name", "age", "email"]
Object.values(user);           // ["Alice", 30, "alice@example.com"]
Object.entries(user);          // [["name","Alice"], ["age",30], ...]
{ ...user, age: 31 };          // Spread/merge
```

```python
# Python Dicts
user = {
    "name": "Alice",
    "age": 30,
    "email": "alice@example.com"
}

user["name"]                   # "Alice"
# user.name                    # ERROR! Dicts don't support dot notation
user.get("phone")              # None (no error, like ?. in JS)
user.get("phone", "N/A")      # "N/A" (with default)
user["phone"] = "555-1234"    # Add key
del user["phone"]              # Remove key
user.pop("phone", None)        # Remove and return (with default if missing)
"name" in user                 # True
user.keys()                    # dict_keys(["name", "age", "email"])
user.values()                  # dict_values(["Alice", 30, "alice@example.com"])
user.items()                   # dict_items([("name","Alice"), ("age",30), ...])
{**user, "age": 31}           # Spread/merge (** instead of ...)
user | {"age": 31}             # Merge operator (Python 3.9+)
```

### Key Differences

```javascript
// JavaScript: property access with dot notation
user.name;                // "Alice"
user.missing;             // undefined (silent)
```

```python
# Python: bracket access with strings (dot notation is for attributes)
user["name"]              # "Alice"
user["missing"]           # KeyError! (raises exception)
user.get("missing")       # None (safe access)
user.get("missing", "default")  # "default"
```

### Iterating Over Dicts

```javascript
// JavaScript
for (const key of Object.keys(user)) { }
for (const [key, value] of Object.entries(user)) { }
```

```python
# Python
for key in user:                    # Iterates keys by default
    print(key)

for key, value in user.items():     # Key-value pairs
    print(f"{key}: {value}")

for value in user.values():         # Values only
    print(value)
```

---

## Sets & Tuples

### Sets (Same Concept as JS Set)

```javascript
// JavaScript Set
const s = new Set([1, 2, 3, 2, 1]);  // Set {1, 2, 3}
s.add(4);
s.delete(2);
s.has(3);         // true
s.size;           // 3
```

```python
# Python set
s = {1, 2, 3, 2, 1}      # {1, 2, 3}  -- literal syntax!
s.add(4)
s.discard(2)              # remove without error if missing
s.remove(2)               # remove with error if missing
3 in s                    # True
len(s)                    # 3

# Python sets have powerful operations
a = {1, 2, 3}
b = {2, 3, 4}
a | b       # {1, 2, 3, 4}  -- union
a & b       # {2, 3}         -- intersection
a - b       # {1}            -- difference
a ^ b       # {1, 4}         -- symmetric difference
```

### Tuples (Immutable Lists -- No Direct JS Equivalent)

```python
# Tuple: an immutable list
point = (10, 20)
rgb = (255, 128, 0)
single = (42,)            # Note the comma for single-element tuple

x, y = point              # Unpacking (like destructuring)
point[0]                   # 10
len(point)                 # 2
# point[0] = 5            # TypeError! Tuples are immutable

# Common uses:
# - Returning multiple values from a function
# - Dictionary keys (lists can't be dict keys)
# - Data that shouldn't change
```

---

## Functions

```javascript
// JavaScript
function greet(name, greeting = "Hello") {
  return `${greeting}, ${name}!`;
}

// With rest parameters
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}

// Call
greet("Alice");                // "Hello, Alice!"
greet("Alice", "Hi");          // "Hi, Alice!"
sum(1, 2, 3, 4);              // 10
```

```python
# Python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

# With *args (rest parameters)
def add(*numbers):
    return sum(numbers)

# Call
greet("Alice")                 # "Hello, Alice!"
greet("Alice", "Hi")           # "Hi, Alice!"
greet("Alice", greeting="Hi")  # "Hi, Alice!" - keyword argument
greet(greeting="Hi", name="Alice")  # "Hi, Alice!" - any order with keywords
add(1, 2, 3, 4)               # 10
```

### Keyword Arguments (Python Exclusive Feature)

```python
# Python has keyword arguments -- very powerful, no JS equivalent
def create_user(name, age, email, active=True, role="user"):
    return {"name": name, "age": age, "email": email, "active": active, "role": role}

# All these work:
create_user("Alice", 30, "a@b.com")
create_user("Alice", 30, "a@b.com", role="admin")
create_user(name="Alice", email="a@b.com", age=30)  # Any order!
create_user("Alice", 30, "a@b.com", active=False, role="admin")
```

In JavaScript, you'd typically use an options object for this:

```javascript
// JavaScript workaround for keyword arguments
function createUser(name, age, email, { active = true, role = "user" } = {}) {
  return { name, age, email, active, role };
}

createUser("Alice", 30, "a@b.com", { role: "admin" });
```

### **kwargs (Keyword Rest Parameters)

```javascript
// JavaScript - rest with objects
function config({ host, port, ...rest }) {
  console.log(host, port, rest);
}
```

```python
# Python - **kwargs captures remaining keyword arguments
def config(host, port, **kwargs):
    print(host, port, kwargs)

config(host="localhost", port=8080, debug=True, workers=4)
# localhost 8080 {'debug': True, 'workers': 4}
```

### Multiple Return Values

```javascript
// JavaScript - return an array or object
function divmod(a, b) {
  return [Math.floor(a / b), a % b];
}
const [quotient, remainder] = divmod(17, 5);
```

```python
# Python - return a tuple (more natural)
def divmod_custom(a, b):
    return a // b, a % b     # Returns a tuple

quotient, remainder = divmod_custom(17, 5)  # Unpacking
```

---

## Arrow Functions / Lambda

```javascript
// JavaScript arrow functions
const double = (x) => x * 2;
const add = (a, b) => a + b;
const greet = (name) => {
  const msg = `Hello, ${name}!`;
  return msg;
};

// Used in higher-order functions
[1, 2, 3].map(x => x * 2);
[1, 2, 3].filter(x => x > 1);
[3, 1, 2].sort((a, b) => a - b);
```

```python
# Python lambda (MUCH more limited than arrow functions)
double = lambda x: x * 2
add = lambda a, b: a + b
# NO multi-line lambdas! Use def instead:
def greet(name):
    msg = f"Hello, {name}!"
    return msg

# Used in higher-order functions
list(map(lambda x: x * 2, [1, 2, 3]))      # [2, 4, 6]
list(filter(lambda x: x > 1, [1, 2, 3]))    # [2, 3]
sorted([3, 1, 2], key=lambda x: x)          # [1, 2, 3]

# BUT -- Pythonic way is list comprehensions, not map/filter:
[x * 2 for x in [1, 2, 3]]          # [2, 4, 6]  -- preferred!
[x for x in [1, 2, 3] if x > 1]     # [2, 3]     -- preferred!
```

**Key rule:** Python lambdas are single-expression only. For anything more complex, just use `def`. Pythonistas prefer list comprehensions over `map`/`filter`.

---

## Destructuring / Unpacking

```javascript
// JavaScript destructuring
const [a, b, c] = [1, 2, 3];
const [first, ...rest] = [1, 2, 3, 4, 5];
const { name, age } = { name: "Alice", age: 30 };
const { name: userName, age: userAge } = user;
const { x, ...remaining } = { x: 1, y: 2, z: 3 };

// Nested
const { address: { city } } = user;

// Default values
const { port = 3000 } = config;

// Function parameter destructuring
function greet({ name, age }) {
  return `${name} is ${age}`;
}
```

```python
# Python unpacking
a, b, c = [1, 2, 3]                  # Same!
first, *rest = [1, 2, 3, 4, 5]       # rest = [2, 3, 4, 5]  (* instead of ...)
*start, last = [1, 2, 3, 4, 5]       # start = [1, 2, 3, 4], last = 5

# Dict "destructuring" -- no direct equivalent, but:
user = {"name": "Alice", "age": 30}
name, age = user["name"], user["age"]             # Manual
name, age = user.values()                          # If you trust order (3.7+)

# Swap variables (elegant!)
a, b = b, a

# Nested unpacking
(a, b), c = [1, 2], 3

# Underscore for ignored values (like _ in JS)
first, _, third = [1, 2, 3]         # Ignore second value
first, *_ = [1, 2, 3, 4, 5]         # Ignore rest
```

> **Note:** Python doesn't have built-in dict destructuring like JS. For complex cases, consider using dataclasses or named tuples.

---

## Spread / Splat Operators

```javascript
// JavaScript spread (...)
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5];           // [1, 2, 3, 4, 5]
const merged = { ...obj1, ...obj2 };    // Object merge
Math.max(...arr1);                      // 3
function foo(...args) { }               // Rest params
```

```python
# Python splat (* and **)
arr1 = [1, 2, 3]
arr2 = [*arr1, 4, 5]                    # [1, 2, 3, 4, 5]
merged = {**obj1, **obj2}               # Dict merge
max(*arr1)                              # 3
def foo(*args): pass                    # Rest params (positional)
def bar(**kwargs): pass                 # Rest params (keyword)

# Function call unpacking
def add(a, b, c):
    return a + b + c

args = [1, 2, 3]
add(*args)                               # 6 (unpacks list)

kwargs = {"a": 1, "b": 2, "c": 3}
add(**kwargs)                            # 6 (unpacks dict)
```

---

## Conditionals & Ternary

```javascript
// JavaScript
if (x > 0) {
  console.log("positive");
} else if (x < 0) {
  console.log("negative");
} else {
  console.log("zero");
}

// Ternary
const status = age >= 18 ? "adult" : "minor";

// Switch
switch (color) {
  case "red":    return "#ff0000";
  case "green":  return "#00ff00";
  default:       return "#000000";
}
```

```python
# Python (no braces -- indentation matters!)
if x > 0:
    print("positive")
elif x < 0:               # elif, not else if
    print("negative")
else:
    print("zero")

# Ternary (reads like English)
status = "adult" if age >= 18 else "minor"

# Match statement (Python 3.10+, like switch)
match color:
    case "red":    return "#ff0000"
    case "green":  return "#00ff00"
    case _:        return "#000000"    # _ is default
```

### Logical Operators

```javascript
// JavaScript
x && y          // AND
x || y          // OR
!x              // NOT
x ?? y          // Nullish coalescing
```

```python
# Python (words, not symbols!)
x and y         # AND
x or y          # OR
not x           # NOT
# No nullish coalescing; use: x if x is not None else y
```

---

## Loops

```javascript
// JavaScript
// For loop
for (let i = 0; i < 10; i++) { }

// For...of (iterate values)
for (const item of array) { }

// For...of with index
for (const [i, item] of array.entries()) { }

// For...in (iterate keys -- rarely used on arrays)
for (const key in object) { }

// While
while (condition) { }

// Do-while
do { } while (condition);

// forEach
array.forEach((item, index) => { });
```

```python
# Python
# For loop (range = like traditional for loop)
for i in range(10): pass         # 0 to 9
for i in range(2, 10): pass      # 2 to 9
for i in range(0, 10, 2): pass   # 0, 2, 4, 6, 8

# For...of equivalent (default behavior!)
for item in array: pass

# With index (like entries())
for i, item in enumerate(array): pass

# Iterate dict keys
for key in my_dict: pass

# Iterate dict key-value pairs
for key, value in my_dict.items(): pass

# While
while condition: pass

# No do-while! Use:
while True:
    # ... do stuff ...
    if not condition:
        break

# No forEach, just use for-in (it IS forEach)
for item in array:
    print(item)

# Zip (iterate multiple arrays together)
for name, age in zip(names, ages):
    print(f"{name} is {age}")
```

### Loop Extras

```python
# Python loop extras that JS doesn't have

# for-else (runs if loop completes without break)
for item in items:
    if item == target:
        print("Found!")
        break
else:
    print("Not found!")  # Only runs if no break occurred

# Enumerate with start index
for i, item in enumerate(items, start=1):
    print(f"{i}. {item}")      # 1. first, 2. second, ...

# Zip longest
from itertools import zip_longest
for a, b in zip_longest([1, 2], [10, 20, 30], fillvalue=0):
    print(a, b)  # (1,10), (2,20), (0,30)
```

---

## Error Handling

```javascript
// JavaScript
try {
  const data = JSON.parse(text);
  processData(data);
} catch (error) {
  if (error instanceof SyntaxError) {
    console.error("Invalid JSON:", error.message);
  } else {
    throw error;  // Re-throw
  }
} finally {
  cleanup();
}

// Custom error
class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

throw new NotFoundError("User not found");
```

```python
# Python
import json

try:
    data = json.loads(text)
    process_data(data)
except json.JSONDecodeError as e:      # catch specific exception
    print(f"Invalid JSON: {e}")
except Exception as e:                  # catch general exception
    raise                               # Re-raise (like throw without args)
finally:
    cleanup()

# Custom exception
class NotFoundError(Exception):
    def __init__(self, message, status_code=404):
        super().__init__(message)
        self.status_code = status_code

raise NotFoundError("User not found")
```

### Comparison Table

| JavaScript | Python |
|---|---|
| `try { }` | `try:` |
| `catch (e) { }` | `except Exception as e:` |
| `finally { }` | `finally:` |
| `throw new Error(msg)` | `raise Exception(msg)` |
| `throw error` | `raise` (re-raise current) |
| `error instanceof TypeError` | `except TypeError:` or `isinstance(e, TypeError)` |
| `Error` | `Exception` |
| `TypeError` | `TypeError` |
| `RangeError` | `ValueError` / `IndexError` |
| `SyntaxError` | `SyntaxError` |

---

## Classes

```javascript
// JavaScript / TypeScript
class Animal {
  #name;              // Private field

  constructor(name, sound) {
    this.#name = name;
    this.sound = sound;
  }

  speak() {
    return `${this.#name} says ${this.sound}`;
  }

  get info() {
    return `${this.#name} (${this.sound})`;
  }

  static create(name, sound) {
    return new Animal(name, sound);
  }
}

class Dog extends Animal {
  constructor(name) {
    super(name, "Woof");
  }

  fetch(item) {
    return `${this.speak()} and fetches ${item}`;
  }
}

const dog = new Dog("Rex");
dog.speak();       // "Rex says Woof"
```

```python
# Python
class Animal:
    def __init__(self, name, sound):       # constructor
        self._name = name                   # Convention: _ prefix = "private"
        self.sound = sound

    def speak(self):                        # self is explicit (like this)
        return f"{self._name} says {self.sound}"

    @property                               # getter
    def info(self):
        return f"{self._name} ({self.sound})"

    @staticmethod
    def create(name, sound):
        return Animal(name, sound)

class Dog(Animal):                          # Inheritance: (Parent) not extends
    def __init__(self, name):
        super().__init__(name, "Woof")      # super().__init__() not super()

    def fetch(self, item):
        return f"{self.speak()} and fetches {item}"

dog = Dog("Rex")                            # No 'new' keyword!
dog.speak()        # "Rex says Woof"
```

### Key Differences

| JavaScript | Python |
|---|---|
| `new Dog("Rex")` | `Dog("Rex")` (no `new`) |
| `this.name` | `self.name` (explicit `self` parameter) |
| `constructor()` | `__init__(self)` |
| `#private` | `_convention` (not enforced) or `__name_mangling` |
| `extends Parent` | `class Child(Parent):` |
| `super()` | `super().__init__()` |
| `static method()` | `@staticmethod` decorator |
| `get prop()` | `@property` decorator |

---

## Modules & Imports

```javascript
// JavaScript / TypeScript

// Named exports
// math.js
export function add(a, b) { return a + b; }
export const PI = 3.14159;

// Default export
// logger.js
export default class Logger { }

// Importing
import { add, PI } from './math.js';
import Logger from './logger.js';
import * as math from './math.js';
import { add as addition } from './math.js';
```

```python
# Python

# math_utils.py (no export keyword needed -- everything is accessible)
def add(a, b):
    return a + b

PI = 3.14159

class Logger:
    pass

# Importing
from math_utils import add, PI           # Named import
from math_utils import Logger            # Import class
import math_utils                        # Import whole module
from math_utils import add as addition   # Alias

# Standard library imports
import os                                # Like: import fs from 'fs'
import json                              # Like: import JSON (built-in in JS)
from pathlib import Path                 # Named import from stdlib
from datetime import datetime, timedelta

# Third-party imports
import requests                          # Like: import axios from 'axios'
from flask import Flask, jsonify         # Named imports
```

### Module Structure

```
# Node.js project          # Python project
my-app/                     my_app/              # Underscore, not dash!
  src/                        __init__.py         # Makes it a package (like index.js)
    index.js                  main.py
    utils/                    utils/
      index.js                  __init__.py       # Required for packages
      helpers.js                helpers.py
  package.json              pyproject.toml
```

```python
# Python __init__.py can re-export (like index.js barrel files)

# utils/__init__.py
from .helpers import format_date, validate_email

# Now you can do:
from utils import format_date
# Instead of:
from utils.helpers import format_date
```

---

## Async/Await

```javascript
// JavaScript
async function fetchUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`);
    const user = await response.json();
    return user;
  } catch (error) {
    console.error("Failed:", error);
    throw error;
  }
}

// Promise.all
const [users, posts] = await Promise.all([
  fetchUsers(),
  fetchPosts()
]);

// Top-level await (ES modules)
const config = await loadConfig();
```

```python
# Python
import asyncio
import httpx  # Third-party HTTP client (like fetch)

async def fetch_user(user_id: int):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"/api/users/{user_id}")
            user = response.json()
            return user
    except Exception as e:
        print(f"Failed: {e}")
        raise

# asyncio.gather (like Promise.all)
users, posts = await asyncio.gather(
    fetch_users(),
    fetch_posts()
)

# Running async code (you need an event loop)
asyncio.run(fetch_user(1))  # Entry point for async

# No top-level await (except in REPL with python -m asyncio)
```

### Key Async Differences

| JavaScript | Python |
|---|---|
| `async function fn()` | `async def fn():` |
| `await promise` | `await coroutine` |
| `Promise.all([...])` | `asyncio.gather(...)` |
| `Promise.race([...])` | `asyncio.wait(tasks, return_when=FIRST_COMPLETED)` |
| Top-level await | `asyncio.run(main())` |
| `setTimeout(fn, ms)` | `await asyncio.sleep(seconds)` |
| `new Promise((resolve) => ...)` | `asyncio.Future()` (rarely needed) |
| Event loop is implicit | `asyncio.run()` starts the loop |

---

## Equality & Comparison

```javascript
// JavaScript
1 == "1"         // true  (loose equality, type coercion)
1 === "1"        // false (strict equality)
null == undefined // true
null === undefined // false
NaN === NaN      // false (!)

// Object comparison
[1, 2] === [1, 2]   // false (reference comparison)
```

```python
# Python
1 == "1"          # False (no type coercion ever!)
# No === in Python -- == already behaves like ===

None == None      # True (but use 'is' for None)
None is None      # True (preferred!)

float('nan') == float('nan')  # False (same as JS)
import math
math.isnan(float('nan'))       # True

# Collection comparison -- compares VALUES, not references!
[1, 2] == [1, 2]    # True!  (unlike JS)
[1, 2] is [1, 2]    # False  ('is' checks identity/reference)
```

### Identity vs Equality

```python
# Python has two comparison concepts:
# == : value equality (like === in JS, but compares values for collections)
# is : identity (same object in memory, like === for primitives in JS)

a = [1, 2, 3]
b = [1, 2, 3]
c = a

a == b    # True  (same values)
a is b    # False (different objects)
a is c    # True  (same object)

# Rule: Use 'is' only for None, True, False
if x is None: pass     # Correct
if x == None: pass     # Works but not Pythonic
```

---

## Console / Print

```javascript
// JavaScript
console.log("Hello");
console.log("Name:", name, "Age:", age);
console.log(`Name: ${name}, Age: ${age}`);
console.error("Error!");
console.warn("Warning!");
console.table([{a: 1}, {a: 2}]);
console.time("timer");
console.timeEnd("timer");
console.dir(obj, { depth: null });
JSON.stringify(obj, null, 2);
```

```python
# Python
print("Hello")
print("Name:", name, "Age:", age)        # Auto-spaces between args
print(f"Name: {name}, Age: {age}")
print("Error!", file=sys.stderr)         # Print to stderr
import warnings
warnings.warn("Warning!")

# Pretty printing (like console.dir)
from pprint import pprint
pprint(obj)

# JSON formatting
import json
print(json.dumps(obj, indent=2))

# Timing
import time
start = time.time()
# ... code ...
print(f"Took: {time.time() - start:.3f}s")

# Or use timeit
import timeit
timeit.timeit(lambda: sum(range(1000)), number=10000)

# print() extras
print("Hello", end="")          # No newline
print("a", "b", "c", sep="-")   # "a-b-c"
```

---

## Type Annotations

Python type hints are very similar to TypeScript, but they are NOT enforced at runtime. You need tools like `mypy` to check them (like `tsc` for TypeScript).

```typescript
// TypeScript
let name: string = "Alice";
let age: number = 30;
let active: boolean = true;
let items: string[] = ["a", "b"];
let user: { name: string; age: number } = { name: "Alice", age: 30 };
let maybeNull: string | null = null;

function greet(name: string, age?: number): string {
  return `Hello, ${name}!`;
}

interface User {
  name: string;
  age: number;
  email?: string;
}

type Status = "active" | "inactive";
```

```python
# Python type hints
name: str = "Alice"
age: int = 30
active: bool = True
items: list[str] = ["a", "b"]
user: dict[str, str | int] = {"name": "Alice", "age": 30}
maybe_null: str | None = None            # Python 3.10+
maybe_null: Optional[str] = None         # Python 3.9 and earlier

def greet(name: str, age: int | None = None) -> str:
    return f"Hello, {name}!"

# TypedDict (like interface for dict shapes)
from typing import TypedDict

class User(TypedDict):
    name: str
    age: int
    email: str  # Use NotRequired[str] for optional (Python 3.11+)

# Literal type (like union of strings)
from typing import Literal
Status = Literal["active", "inactive"]

# Using dataclass (closest to interface + class)
from dataclasses import dataclass

@dataclass
class User:
    name: str
    age: int
    email: str = ""     # Default value
```

---

## Common Gotchas

### 1. Indentation Is Syntax

```python
# Python uses indentation, not braces
if True:
    print("yes")       # MUST be indented (4 spaces convention)
    if True:
        print("nested") # More indentation
    print("back")       # Back to first level

# Mixing tabs and spaces = error!
# Always use 4 spaces (configure your editor)
```

### 2. No Semicolons

```python
# No semicolons needed (you CAN use them, but don't)
x = 1
y = 2
# NOT: x = 1; y = 2;  (works but ugly)
```

### 3. Mutable Default Arguments

```python
# DANGER: Mutable default arguments are shared between calls!
def add_item(item, items=[]):  # BUG!
    items.append(item)
    return items

add_item("a")  # ["a"]
add_item("b")  # ["a", "b"]  -- Wait, what?!

# FIX: Use None as default
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

### 4. Variable Scope

```python
# Python has function scope (like var), not block scope (like let/const)
if True:
    x = 10
print(x)  # 10 -- x is still accessible! (unlike JS with let/const)

for i in range(5):
    pass
print(i)  # 4 -- loop variable leaks! (unlike JS with let)
```

### 5. String Methods Don't Mutate

```python
# Strings are immutable (same as JS, but worth noting)
name = "alice"
name.upper()     # Returns "ALICE", does NOT change name
name             # Still "alice"
name = name.upper()  # Must reassign
```

---

## Practice Exercises

### Exercise 1: Convert This JavaScript to Python

```javascript
// Convert this JavaScript to Python:
const users = [
  { name: "Alice", age: 30, active: true },
  { name: "Bob", age: 25, active: false },
  { name: "Charlie", age: 35, active: true },
];

const activeUsers = users
  .filter(u => u.active)
  .map(u => u.name.toUpperCase());

console.log(`Active users: ${activeUsers.join(", ")}`);
// Expected: "Active users: ALICE, CHARLIE"
```

<details>
<summary>Solution</summary>

```python
users = [
    {"name": "Alice", "age": 30, "active": True},
    {"name": "Bob", "age": 25, "active": False},
    {"name": "Charlie", "age": 35, "active": True},
]

active_users = [u["name"].upper() for u in users if u["active"]]

print(f"Active users: {', '.join(active_users)}")
# Active users: ALICE, CHARLIE
```

</details>

### Exercise 2: Convert This Async JavaScript to Python

```javascript
// Convert this to Python:
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch ${url}: ${error.message}`);
    return null;
  }
}

async function main() {
  const urls = [
    "https://api.example.com/users",
    "https://api.example.com/posts"
  ];
  const results = await Promise.all(urls.map(url => fetchData(url)));
  console.log("Results:", results);
}

main();
```

<details>
<summary>Solution</summary>

```python
import asyncio
import httpx

async def fetch_data(url: str):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
        return None

async def main():
    urls = [
        "https://api.example.com/users",
        "https://api.example.com/posts",
    ]
    results = await asyncio.gather(*(fetch_data(url) for url in urls))
    print("Results:", results)

asyncio.run(main())
```

</details>

### Exercise 3: Convert This Class

```javascript
// Convert this to Python:
class TaskManager {
  #tasks = [];

  addTask(title, priority = "medium") {
    const task = {
      id: this.#tasks.length + 1,
      title,
      priority,
      done: false,
    };
    this.#tasks.push(task);
    return task;
  }

  completeTask(id) {
    const task = this.#tasks.find(t => t.id === id);
    if (!task) throw new Error(`Task ${id} not found`);
    task.done = true;
    return task;
  }

  get pendingTasks() {
    return this.#tasks.filter(t => !t.done);
  }

  get summary() {
    const done = this.#tasks.filter(t => t.done).length;
    return `${done}/${this.#tasks.length} tasks completed`;
  }
}

const manager = new TaskManager();
manager.addTask("Learn Python", "high");
manager.addTask("Build API");
manager.completeTask(1);
console.log(manager.pendingTasks);
console.log(manager.summary);
```

<details>
<summary>Solution</summary>

```python
class TaskManager:
    def __init__(self):
        self._tasks = []

    def add_task(self, title, priority="medium"):
        task = {
            "id": len(self._tasks) + 1,
            "title": title,
            "priority": priority,
            "done": False,
        }
        self._tasks.append(task)
        return task

    def complete_task(self, task_id):
        task = next((t for t in self._tasks if t["id"] == task_id), None)
        if task is None:
            raise ValueError(f"Task {task_id} not found")
        task["done"] = True
        return task

    @property
    def pending_tasks(self):
        return [t for t in self._tasks if not t["done"]]

    @property
    def summary(self):
        done = sum(1 for t in self._tasks if t["done"])
        return f"{done}/{len(self._tasks)} tasks completed"


manager = TaskManager()
manager.add_task("Learn Python", "high")
manager.add_task("Build API")
manager.complete_task(1)
print(manager.pending_tasks)
print(manager.summary)
```

</details>

### Exercise 4: Quick Conversions

Convert each one-liner from JavaScript to Python:

```javascript
// 1. Template literal
const msg = `Hello, ${name}! You are ${age} years old.`;

// 2. Ternary
const label = score >= 90 ? "A" : score >= 80 ? "B" : "C";

// 3. Destructuring + default
const { host = "localhost", port = 3000 } = config;

// 4. Optional chaining + nullish coalescing
const city = user?.address?.city ?? "Unknown";

// 5. Array spread + sort
const sorted = [...items].sort((a, b) => a.price - b.price);

// 6. Object spread merge
const merged = { ...defaults, ...overrides };
```

<details>
<summary>Solutions</summary>

```python
# 1. f-string
msg = f"Hello, {name}! You are {age} years old."

# 2. Chained ternary (or use if/elif)
label = "A" if score >= 90 else "B" if score >= 80 else "C"

# 3. Dict .get() with defaults
host = config.get("host", "localhost")
port = config.get("port", 3000)

# 4. No optional chaining -- use nested get or try/except
city = (user or {}).get("address", {}).get("city", "Unknown")
# Or more Pythonic:
try:
    city = user["address"]["city"]
except (KeyError, TypeError):
    city = "Unknown"

# 5. sorted() creates a new list (doesn't mutate)
sorted_items = sorted(items, key=lambda x: x["price"])

# 6. Dict merge
merged = {**defaults, **overrides}
# Or Python 3.9+:
merged = defaults | overrides
```

</details>

---

**Next:** [05 - Your First Python Script](./05_first_python_script.md) -- Write, run, and understand Python scripts, the REPL, and the `__name__` guard.
