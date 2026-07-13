# 04 - Node.js/TypeScript to Python Cheatsheet

> **Quick reference guide hai yeh.** Isko bookmark kar lo. Python ke shuru ke hafton mein baar-baar yahan wapas aaoge.

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
name = "Alice"          # Sab variables 'let' jaise hi hote hain
age = 30                # No const keyword! Convention: UPPER_CASE for constants

# Python convention for constants (not enforced)
MAX_RETRIES = 3
API_BASE_URL = "https://api.example.com"

# Type-annotated (TypeScript jaisa lagta hai, lekin runtime pe enforce nahi hota)
name: str = "Alice"
age: int = 30
```

**Key difference:** Python mein `const` hota hi nahi. Convention se `UPPER_SNAKE_CASE` use karte hain. Agar enforcement chahiye, to `mypy` ke saath `Final` use karo:

```python
from typing import Final
MAX_RETRIES: Final = 3  # mypy will flag reassignment
```

---

## Data Types

Socho ek second — JS mein `typeof null` "object" bolta hai (famous bug), aur Python mein sab kuch saaf-saaf, clearly typed feel hota hai. Table dekho:

| JavaScript/TypeScript | Python | Notes |
|---|---|---|
| `string` | `str` | |
| `number` | `int`, `float` | Python integer aur float ko alag rakhta hai |
| `boolean` | `bool` | `True`/`False` (capitalized!) |
| `null` | `None` | |
| `undefined` | N/A | Python mein undefined jaisi cheez hoti hi nahi |
| `Array` | `list` | |
| `Object` / `{}` | `dict` | |
| `Set` | `set` | |
| `Map` | `dict` | Python dicts bhi ordered hote hain (3.7+) |
| `Symbol` | N/A | Koi equivalent nahi |
| `bigint` | `int` | Python ke ints by default arbitrary precision hote hain |
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
isinstance(42, (int, float)) # True - ek saath multiple types check kar sakte ho
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
greeting = f"Hello, {name}!"                   # f-string (template literal jaisa)
multi = """line 1
line 2
line 3"""
"hello".upper()                                # "HELLO"
"ell" in "hello"                               # True ('in' operator use karo)
"hello world".split(" ")                       # ["hello", "world"]
"  hello  ".strip()                            # "hello"
"hello"[1:3]                                   # "el" (slicing)
"hello".index("l")                             # 2 (na mile to error deta hai)
"hello".find("l")                              # 2 (na mile to -1 return karta hai)
"ha" * 3                                       # "hahaha"
"hello".replace("l", "r", 1)                   # "herlo" (teesra arg = count)
"hello".replace("l", "r")                      # "herro" (by default sab replace!)
"hello".startswith("hel")                      # True
"hello"[0]                                     # "h"
len("hello")                                   # 5 (function hai, property nahi!)
```

### f-strings vs Template Literals

JS ke template literals se seedha connect ho jaoge — bas backtick ki jagah `f` prefix aata hai.

```javascript
// JavaScript template literals
const name = "Alice";
const age = 30;
console.log(`${name} is ${age} years old`);
console.log(`2 + 2 = ${2 + 2}`);
console.log(`Items: ${items.join(", ")}`);
```

```python
# Python f-strings (f prefix lagate hain)
name = "Alice"
age = 30
print(f"{name} is {age} years old")
print(f"2 + 2 = {2 + 2}")
print(f"Items: {', '.join(items)}")

# f-strings formatting bhi karte hain
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
# Python - int aur float alag hote hain
x = 42                    # int
y = 3.14                  # float
big = 999999999999999999999999  # int (arbitrary precision, BigInt ki zaroorat hi nahi!)

int("42")                 # 42
float("3.14")             # 3.14
import math
math.floor(3.7)           # 3
math.ceil(3.2)            # 4
round(3.5)                # 4 (built-in, lekin banker's rounding use karta hai!)
abs(-5)                   # 5 (built-in)
max(1, 2, 3)              # 3 (built-in)
min(1, 2, 3)              # 1 (built-in)
import random
random.random()           # 0.0 to 1.0
isinstance(42, int)       # True

# Python extras
10 // 3                   # 3 (integer division)
10 % 3                    # 1 (modulo, JS jaisa hi)
2 ** 10                   # 1024 (exponent, JS bhi ** use karta hai)
```

> [!tip]
> `round(3.5)` Python mein 4 nahi hamesha "banker's rounding" follow karta hai — matlab `round(2.5)` 2 deta hai, 3 nahi. Yeh ek chota sa gotcha hai jo interviews mein bhi poochha jata hai.

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
None                     # null jaisa (koi undefined nahi hota!)

# Falsy values: False, 0, 0.0, "", [], {}, set(), (), None, 0j
# Truthy: everything else

bool("")       # False
bool([])       # False  <-- Empty list Python mein FALSY hai!
bool({})       # False  <-- Empty dict bhi FALSY hai!
bool(0)        # False
bool(None)     # False
bool("0")      # True   <-- Non-empty string, JS jaisa hi
```

### Critical Difference: Empty Collections

Yahan ek bada trap hai — JS mein empty array/object truthy hote hain, Python mein bilkul ulta.

```javascript
// JavaScript
if ([]) console.log("runs!");      // Runs! Empty array is truthy
if ({}) console.log("runs!");      // Runs! Empty object is truthy
```

```python
# Python
if []:
    print("never runs!")    # Nahi chalega! Empty list falsy hai
if {}:
    print("never runs!")    # Nahi chalega! Empty dict falsy hai

# Yeh actually kaafi useful hai:
items = get_items()
if items:                   # "khaali nahi hai" check karne ka Pythonic tareeka
    process(items)

# Iske bajaye verbose wala:
if len(items) > 0:          # Chalega, lekin Pythonic nahi hai
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
if value is None:  pass      # None ke liye hamesha 'is' use karo, kabhi == nahi
if value is not None:  pass

# Built-in optional chaining nahi hai. Common patterns:
name = user and user.profile and user.profile.name  # Short-circuit
# Ya getattr use karo:
name = getattr(getattr(user, 'profile', None), 'name', None)

# Nullish coalescing bhi nahi hai. 'or' use karo (lekin savdhan -- yeh saare falsy pakad leta hai!)
port = config.get("port") or 3000     # 0 bhi pakad lega! Careful raho
port = config.get("port", 3000)       # Better: dict.get() with default
```

> [!warning]
> `or` ke saath default value dena tabhi safe hai jab value kabhi `0`, `""`, ya `False` na ho. Nahi to `dict.get(key, default)` use karo — Zomato ka discount `0%` bhi ho sakta hai, aur `or` usse bhi "empty" samajh ke default laga dega!

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
len(arr)                       # 5 (function hai, property nahi)
arr.append(6)                  # [1,2,3,4,5,6]
arr.pop()                      # 6, arr = [1,2,3,4,5]
arr.insert(0, 0)               # [0,1,2,3,4,5] (unshift jaisa kuch nahi)
arr.pop(0)                     # 0 (index pe pop, shift jaisa)
3 in arr                       # True ('in' operator use karo)
arr.index(3)                   # 2
arr[1:3]                       # [2, 3] (slicing)
del arr[1:3]                   # index 1-2 ke items hata do
arr + [6, 7]                   # [1,2,3,4,5,6,7] (naya list banta hai)
arr.reverse()                  # mutates!
arr.sort()                     # mutates!
arr.copy()                     # shallow copy (ya arr[:] ya list(arr))

# Functional equivalents (Python mein pattern alag hai!)
[x * 2 for x in arr]                    # [2, 4, 6, 8, 10]  -- list comprehension!
[x for x in arr if x > 2]               # [3, 4, 5]         -- filtered comprehension
sum(arr)                                 # 15 (sum ke liye built-in)
from functools import reduce
reduce(lambda acc, x: acc + x, arr, 0)  # 15 (Python mein kam use hota hai)
next(x for x in arr if x > 3)           # 4 (find jaisa)
next((i for i, x in enumerate(arr) if x > 3), -1)  # 3 (findIndex jaisa)
all(x > 0 for x in arr)                 # True (every jaisa)
any(x > 4 for x in arr)                 # True (some jaisa)
for x in arr: print(x)                  # forEach jaisa
# Built-in flat() nahi hai, lekin: [item for sub in nested for item in sub]
```

### List Comprehensions (Python's Superpower)

Yeh Python ki sabse best cheezon mein se ek hai, JS mein iska direct equivalent hai hi nahi. Socho ek line mein `map` + `filter` dono ho jaaye — bilkul waise hi jaise ek Swiggy order mein "veg only" filter aur "price sort" dono ek saath laga do.

```javascript
// JavaScript
const squares = [1,2,3,4,5].map(x => x ** 2);                    // [1,4,9,16,25]
const evens = [1,2,3,4,5].filter(x => x % 2 === 0);              // [2, 4]
const evenSquares = [1,2,3,4,5].filter(x => x % 2 === 0).map(x => x ** 2);  // [4, 16]
```

```python
# Python - list comprehensions idiomatic aur fast dono hain
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

arr[2:5]      # [2, 3, 4]       -- arr.slice(2, 5) jaisa
arr[:3]       # [0, 1, 2]       -- pehle 3 items
arr[7:]       # [7, 8, 9]       -- index 7 se end tak
arr[-3:]      # [7, 8, 9]       -- last 3 items
arr[:-2]      # [0,1,2,3,4,5,6,7]  -- last 2 chhod ke sab
arr[::2]      # [0, 2, 4, 6, 8]    -- har 2nd item
arr[::-1]     # [9,8,7,6,5,4,3,2,1,0]  -- reversed!

# Strings pe bhi kaam karta hai
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
# user.name                    # ERROR! Dicts mein dot notation nahi chalta
user.get("phone")              # None (error nahi aata, JS ke ?. jaisa)
user.get("phone", "N/A")      # "N/A" (default ke saath)
user["phone"] = "555-1234"    # Key add karo
del user["phone"]              # Key remove karo
user.pop("phone", None)        # Remove aur return karo (default agar missing ho)
"name" in user                 # True
user.keys()                    # dict_keys(["name", "age", "email"])
user.values()                  # dict_values(["Alice", 30, "alice@example.com"])
user.items()                   # dict_items([("name","Alice"), ("age",30), ...])
{**user, "age": 31}           # Spread/merge (** instead of ...)
user | {"age": 31}             # Merge operator (Python 3.9+)
```

### Key Differences

```javascript
// JavaScript: dot notation se property access
user.name;                // "Alice"
user.missing;             // undefined (silent)
```

```python
# Python: bracket access strings ke saath (dot notation attributes ke liye hai)
user["name"]              # "Alice"
user["missing"]           # KeyError! (exception raise karta hai)
user.get("missing")       # None (safe access)
user.get("missing", "default")  # "default"
```

> [!warning]
> Yeh sabse zyada bites karne wala gotcha hai — JS mein `user.missing` chup-chaap `undefined` de deta hai, lekin Python mein `user["missing"]` seedha crash kara dega. Habit banao: jab bhi key exist karne ka guarantee nahi hai, `.get()` use karo.

### Iterating Over Dicts

```javascript
// JavaScript
for (const key of Object.keys(user)) { }
for (const [key, value] of Object.entries(user)) { }
```

```python
# Python
for key in user:                    # By default keys pe iterate karta hai
    print(key)

for key, value in user.items():     # Key-value pairs
    print(f"{key}: {value}")

for value in user.values():         # Sirf values
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
s.discard(2)              # missing ho to bhi error nahi
s.remove(2)               # missing ho to error
3 in s                    # True
len(s)                    # 3

# Python sets ke powerful operations hote hain
a = {1, 2, 3}
b = {2, 3, 4}
a | b       # {1, 2, 3, 4}  -- union
a & b       # {2, 3}         -- intersection
a - b       # {1}            -- difference
a ^ b       # {1, 4}         -- symmetric difference
```

### Tuples (Immutable Lists -- No Direct JS Equivalent)

Socho tuple ko ek "sealed cover" ki tarah — ek baar values daal di, ab koi change nahi kar sakta.

```python
# Tuple: ek immutable list
point = (10, 20)
rgb = (255, 128, 0)
single = (42,)            # Single-element tuple ke liye comma zaroori hai

x, y = point              # Unpacking (destructuring jaisa)
point[0]                   # 10
len(point)                 # 2
# point[0] = 5            # TypeError! Tuples immutable hote hain

# Common uses:
# - Function se multiple values return karna
# - Dictionary keys (lists dict key nahi ban sakti)
# - Aisa data jo change nahi hona chahiye
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

# *args ke saath (rest parameters)
def add(*numbers):
    return sum(numbers)

# Call
greet("Alice")                 # "Hello, Alice!"
greet("Alice", "Hi")           # "Hi, Alice!"
greet("Alice", greeting="Hi")  # "Hi, Alice!" - keyword argument
greet(greeting="Hi", name="Alice")  # "Hi, Alice!" - keywords ke saath kisi bhi order mein
add(1, 2, 3, 4)               # 10
```

### Keyword Arguments (Python Exclusive Feature)

Yeh Python ka ek badiya feature hai jiska JS mein koi direct equivalent nahi — jaise IRCTC form mein fields kisi bhi order mein bhar do, naam se pehchaane jaate hain.

```python
# Python mein keyword arguments hote hain -- bahut powerful, JS mein equivalent nahi
def create_user(name, age, email, active=True, role="user"):
    return {"name": name, "age": age, "email": email, "active": active, "role": role}

# Yeh sab chalega:
create_user("Alice", 30, "a@b.com")
create_user("Alice", 30, "a@b.com", role="admin")
create_user(name="Alice", email="a@b.com", age=30)  # Kisi bhi order mein!
create_user("Alice", 30, "a@b.com", active=False, role="admin")
```

JavaScript mein iske liye aam taur pe options object use karte ho:

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
# Python - **kwargs baaki bache huye keyword arguments pakad leta hai
def config(host, port, **kwargs):
    print(host, port, kwargs)

config(host="localhost", port=8080, debug=True, workers=4)
# localhost 8080 {'debug': True, 'workers': 4}
```

### Multiple Return Values

```javascript
// JavaScript - array ya object return karo
function divmod(a, b) {
  return [Math.floor(a / b), a % b];
}
const [quotient, remainder] = divmod(17, 5);
```

```python
# Python - tuple return karo (zyada natural lagta hai)
def divmod_custom(a, b):
    return a // b, a % b     # Tuple return karta hai

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
# Python lambda (arrow functions se kaafi limited hai)
double = lambda x: x * 2
add = lambda a, b: a + b
# Multi-line lambda NAHI hota! def use karo:
def greet(name):
    msg = f"Hello, {name}!"
    return msg

# Used in higher-order functions
list(map(lambda x: x * 2, [1, 2, 3]))      # [2, 4, 6]
list(filter(lambda x: x > 1, [1, 2, 3]))    # [2, 3]
sorted([3, 1, 2], key=lambda x: x)          # [1, 2, 3]

# LEKIN -- Pythonic tareeka map/filter nahi, list comprehension hai:
[x * 2 for x in [1, 2, 3]]          # [2, 4, 6]  -- preferred!
[x for x in [1, 2, 3] if x > 1]     # [2, 3]     -- preferred!
```

**Key rule:** Python lambdas sirf single-expression ke liye hote hain. Isse zyada complex kuch chahiye to `def` use karo. Pythonistas `map`/`filter` se zyada list comprehensions ko prefer karte hain.

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

# Dict "destructuring" -- direct equivalent nahi hai, lekin:
user = {"name": "Alice", "age": 30}
name, age = user["name"], user["age"]             # Manual
name, age = user.values()                          # Agar order pe bharosa hai (3.7+)

# Variables swap karo (elegant!)
a, b = b, a

# Nested unpacking
(a, b), c = [1, 2], 3

# Ignore karne ke liye underscore (JS ke _ jaisa)
first, _, third = [1, 2, 3]         # Second value ignore karo
first, *_ = [1, 2, 3, 4, 5]         # Baaki sab ignore karo
```

> [!info]
> Python mein JS jaisi built-in dict destructuring nahi hoti. Complex cases ke liye dataclasses ya named tuples try karo.

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
add(*args)                               # 6 (list unpack)

kwargs = {"a": 1, "b": 2, "c": 3}
add(**kwargs)                            # 6 (dict unpack)
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
# Python (koi braces nahi -- indentation hi syntax hai!)
if x > 0:
    print("positive")
elif x < 0:               # elif, "else if" nahi
    print("negative")
else:
    print("zero")

# Ternary (English jaisa padhta hai)
status = "adult" if age >= 18 else "minor"

# Match statement (Python 3.10+, switch jaisa)
match color:
    case "red":    return "#ff0000"
    case "green":  return "#00ff00"
    case _:        return "#000000"    # _ default hai
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
# Python (symbols nahi, poore words!)
x and y         # AND
x or y          # OR
not x           # NOT
# Nullish coalescing nahi hai; use karo: x if x is not None else y
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
# For loop (range = traditional for loop jaisa)
for i in range(10): pass         # 0 se 9 tak
for i in range(2, 10): pass      # 2 se 9 tak
for i in range(0, 10, 2): pass   # 0, 2, 4, 6, 8

# For...of ka equivalent (default behavior!)
for item in array: pass

# Index ke saath (entries() jaisa)
for i, item in enumerate(array): pass

# Dict keys pe iterate
for key in my_dict: pass

# Dict key-value pairs pe iterate
for key, value in my_dict.items(): pass

# While
while condition: pass

# Do-while nahi hai! Yeh use karo:
while True:
    # ... kuch karo ...
    if not condition:
        break

# forEach nahi hai, bas for-in use karo (yeh khud forEach hi hai)
for item in array:
    print(item)

# Zip (multiple arrays saath mein iterate karo)
for name, age in zip(names, ages):
    print(f"{name} is {age}")
```

### Loop Extras

```python
# Python loop extras jo JS mein nahi hote

# for-else (agar loop bina break ke complete ho jaaye to chalta hai)
for item in items:
    if item == target:
        print("Found!")
        break
else:
    print("Not found!")  # Sirf tab chalega jab break na hua ho

# Start index ke saath enumerate
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
except json.JSONDecodeError as e:      # specific exception catch karo
    print(f"Invalid JSON: {e}")
except Exception as e:                  # general exception catch karo
    raise                               # Re-raise (throw without args jaisa)
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
| `throw error` | `raise` (current exception re-raise) |
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

    def speak(self):                        # self explicit hota hai (this jaisa)
        return f"{self._name} says {self.sound}"

    @property                               # getter
    def info(self):
        return f"{self._name} ({self.sound})"

    @staticmethod
    def create(name, sound):
        return Animal(name, sound)

class Dog(Animal):                          # Inheritance: (Parent), extends nahi
    def __init__(self, name):
        super().__init__(name, "Woof")      # super().__init__() likhna padta hai, sirf super() nahi

    def fetch(self, item):
        return f"{self.speak()} and fetches {item}"

dog = Dog("Rex")                            # 'new' keyword nahi chahiye!
dog.speak()        # "Rex says Woof"
```

### Key Differences

| JavaScript | Python |
|---|---|
| `new Dog("Rex")` | `Dog("Rex")` (no `new`) |
| `this.name` | `self.name` (explicit `self` parameter) |
| `constructor()` | `__init__(self)` |
| `#private` | `_convention` (enforced nahi) or `__name_mangling` |
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

# math_utils.py (export keyword ki zaroorat nahi -- sab kuch accessible hai)
def add(a, b):
    return a + b

PI = 3.14159

class Logger:
    pass

# Importing
from math_utils import add, PI           # Named import
from math_utils import Logger            # Class import
import math_utils                        # Poora module import
from math_utils import add as addition   # Alias

# Standard library imports
import os                                # Jaise: import fs from 'fs'
import json                              # Jaise: import JSON (JS mein built-in)
from pathlib import Path                 # stdlib se named import
from datetime import datetime, timedelta

# Third-party imports
import requests                          # Jaise: import axios from 'axios'
from flask import Flask, jsonify         # Named imports
```

### Module Structure

```
# Node.js project          # Python project
my-app/                     my_app/              # Underscore, dash nahi!
  src/                        __init__.py         # Package banata hai (index.js jaisa)
    index.js                  main.py
    utils/                    utils/
      index.js                  __init__.py       # Packages ke liye zaroori
      helpers.js                helpers.py
  package.json              pyproject.toml
```

```python
# Python __init__.py re-export kar sakta hai (index.js barrel files jaisa)

# utils/__init__.py
from .helpers import format_date, validate_email

# Ab tum yeh kar sakte ho:
from utils import format_date
# Iske bajaye:
from utils.helpers import format_date
```

---

## Async/Await

Idhar aake bahut logon ko lagta hai "yeh to `fetch` jaisa hi hoga" — thoda sa hai, par Python mein event loop khud shuru karna padta hai. Socho jaise Zomato app khud background mein request bhejta rehta hai, lekin Python mein tumhe explicitly `asyncio.run()` bol ke "loop start karo" kehna padta hai.

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
import httpx  # Third-party HTTP client (fetch jaisa)

async def fetch_user(user_id: int):
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"/api/users/{user_id}")
            user = response.json()
            return user
    except Exception as e:
        print(f"Failed: {e}")
        raise

# asyncio.gather (Promise.all jaisa)
users, posts = await asyncio.gather(
    fetch_users(),
    fetch_posts()
)

# Async code chalane ke liye event loop chahiye
asyncio.run(fetch_user(1))  # Async ka entry point

# Top-level await nahi hota (except REPL mein python -m asyncio ke saath)
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
1 == "1"          # False (type coercion kabhi nahi hota!)
# Python mein === nahi hai -- == already === ki tarah behave karta hai

None == None      # True (lekin None ke liye 'is' use karo)
None is None      # True (preferred!)

float('nan') == float('nan')  # False (JS jaisa hi)
import math
math.isnan(float('nan'))       # True

# Collection comparison -- REFERENCES nahi, VALUES compare karta hai!
[1, 2] == [1, 2]    # True!  (JS ke ulta)
[1, 2] is [1, 2]    # False  ('is' identity/reference check karta hai)
```

### Identity vs Equality

```python
# Python mein do comparison concepts hote hain:
# == : value equality (JS ke === jaisa, lekin collections ke liye values compare karta hai)
# is : identity (memory mein same object, JS ke primitives ke === jaisa)

a = [1, 2, 3]
b = [1, 2, 3]
c = a

a == b    # True  (same values)
a is b    # False (alag objects)
a is c    # True  (same object)

# Rule: 'is' sirf None, True, False ke liye use karo
if x is None: pass     # Correct
if x == None: pass     # Chalega, lekin Pythonic nahi hai
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
print("Name:", name, "Age:", age)        # Args ke beech auto-space
print(f"Name: {name}, Age: {age}")
print("Error!", file=sys.stderr)         # stderr pe print karo
import warnings
warnings.warn("Warning!")

# Pretty printing (console.dir jaisa)
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

# Ya timeit use karo
import timeit
timeit.timeit(lambda: sum(range(1000)), number=10000)

# print() extras
print("Hello", end="")          # Newline nahi
print("a", "b", "c", sep="-")   # "a-b-c"
```

---

## Type Annotations

Python type hints TypeScript se kaafi milte-julte hain, lekin yeh runtime pe enforce NAHI hote. Check karne ke liye `mypy` jaisa tool chahiye (TypeScript ke `tsc` jaisa).

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
maybe_null: Optional[str] = None         # Python 3.9 aur usse pehle

def greet(name: str, age: int | None = None) -> str:
    return f"Hello, {name}!"

# TypedDict (dict ke shape ke liye interface jaisa)
from typing import TypedDict

class User(TypedDict):
    name: str
    age: int
    email: str  # Optional ke liye NotRequired[str] use karo (Python 3.11+)

# Literal type (strings ke union jaisa)
from typing import Literal
Status = Literal["active", "inactive"]

# dataclass use karke (interface + class ke sabse kareeb)
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
# Python indentation use karta hai, braces nahi
if True:
    print("yes")       # MUST be indented (4 spaces convention)
    if True:
        print("nested") # Aur zyada indentation
    print("back")       # Wapas pehle level pe

# Tabs aur spaces mix karna = error!
# Hamesha 4 spaces use karo (editor configure kar lo)
```

### 2. No Semicolons

```python
# Semicolons ki zaroorat nahi (use kar sakte ho, lekin mat karo)
x = 1
y = 2
# NOT: x = 1; y = 2;  (chalega, lekin ugly hai)
```

### 3. Mutable Default Arguments

Yeh sabse famous Python interview gotcha hai — socho jaise ek shared Google Doc sabko de diya, aur sabki changes usi ek copy mein save ho rahi hain.

```python
# DANGER: Mutable default arguments calls ke beech share hote hain!
def add_item(item, items=[]):  # BUG!
    items.append(item)
    return items

add_item("a")  # ["a"]
add_item("b")  # ["a", "b"]  -- ruko, yeh kya hua?!

# FIX: None ko default banao
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

### 4. Variable Scope

```python
# Python mein function scope hota hai (var jaisa), block scope nahi (let/const jaisa)
if True:
    x = 10
print(x)  # 10 -- x abhi bhi accessible hai! (JS ke let/const ke ulta)

for i in range(5):
    pass
print(i)  # 4 -- loop variable leak ho jaata hai! (JS ke let ke ulta)
```

### 5. String Methods Don't Mutate

```python
# Strings immutable hain (JS jaisa hi, lekin yaad rakhne layak)
name = "alice"
name.upper()     # "ALICE" return karta hai, name ko change NAHI karta
name             # Abhi bhi "alice"
name = name.upper()  # Reassign karna zaroori hai
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

Har one-liner ko JavaScript se Python mein convert karo:

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

# 2. Chained ternary (ya if/elif use karo)
label = "A" if score >= 90 else "B" if score >= 80 else "C"

# 3. Dict .get() with defaults
host = config.get("host", "localhost")
port = config.get("port", 3000)

# 4. Optional chaining nahi hai -- nested get ya try/except use karo
city = (user or {}).get("address", {}).get("city", "Unknown")
# Ya zyada Pythonic tareeka:
try:
    city = user["address"]["city"]
except (KeyError, TypeError):
    city = "Unknown"

# 5. sorted() naya list banata hai (mutate nahi karta)
sorted_items = sorted(items, key=lambda x: x["price"])

# 6. Dict merge
merged = {**defaults, **overrides}
# Ya Python 3.9+:
merged = defaults | overrides
```

</details>

---

**Next:** [05 - Your First Python Script](./05_first_python_script.md) -- Python scripts likhna, chalana, aur samajhna, REPL, aur `__name__` guard.
