# 01 - Variables and Data Types

## Coming from Node.js/TypeScript: What Changes?

In JavaScript/TypeScript, you declare variables with `let`, `const`, or `var`. Python throws all of that away. There are no declaration keywords -- you just assign a value to a name, and it exists.

```python
# Python
name = "Alice"
age = 30
is_active = True
```

```javascript
// JavaScript / TypeScript
let name = "Alice";
let age = 30;
let isActive = true;
```

No semicolons. No declaration keywords. No braces. Welcome to Python.

---

## Variables and Assignment

### Basic Assignment

Python variables are just names that point to objects in memory. There is no separate "declaration" step.

```python
x = 10          # x now refers to the integer object 10
x = "hello"     # x now refers to the string object "hello" (perfectly valid)
```

This is similar to `let` in JS (rebindable), but there is no equivalent to `const`. Every variable can be reassigned.

### Naming Conventions

Python uses `snake_case` for almost everything. This is not just a preference -- it is codified in PEP 8, Python's official style guide.

| Concept          | Python (PEP 8)         | JS/TS Convention       |
|------------------|------------------------|------------------------|
| Variables        | `user_name`            | `userName`             |
| Functions        | `get_user_data()`      | `getUserData()`        |
| Constants        | `MAX_RETRY_COUNT`      | `MAX_RETRY_COUNT`      |
| Classes          | `UserProfile`          | `UserProfile`          |
| Private hint     | `_internal_value`      | `_internalValue` or `#private` |
| Modules/files    | `user_service.py`      | `userService.ts`       |

```python
# Good Python style
first_name = "Alice"
last_login_time = "2024-01-15"
max_connections = 100

# Bad Python style (but it works -- Python won't stop you)
firstName = "Alice"       # camelCase is a JS habit
lastLoginTime = "2024-01-15"
```

### Multiple Assignment

Python supports assigning multiple variables in a single line.

```python
# Assign multiple variables at once
x, y, z = 1, 2, 3

# Same value to multiple variables
a = b = c = 0

# Swap values -- no temp variable needed!
x, y = y, x
```

```javascript
// JS equivalent of multiple assignment
let [x, y, z] = [1, 2, 3];  // destructuring

// Swap in JS requires temp or destructuring
[x, y] = [y, x];
```

The swap trick is idiomatic Python. Under the hood, Python evaluates the entire right side first, creating a tuple, then unpacks it into the left side.

---

## Data Types

### The Core Types

| Python Type | JS/TS Equivalent       | Example                    |
|-------------|------------------------|----------------------------|
| `int`       | `number`               | `42`, `-7`, `1_000_000`    |
| `float`     | `number`               | `3.14`, `-0.5`, `1e10`     |
| `str`       | `string`               | `"hello"`, `'world'`       |
| `bool`      | `boolean`              | `True`, `False`            |
| `None`      | `null` (and `undefined`)| `None`                    |
| `list`      | `Array`                | `[1, 2, 3]`               |
| `dict`      | `Object` / `Map`       | `{"key": "value"}`         |
| `tuple`     | (no equivalent)        | `(1, 2, 3)`               |
| `set`       | `Set`                  | `{1, 2, 3}`               |
| `bytes`     | `Buffer`               | `b"hello"`                 |
| `complex`   | (no equivalent)        | `3 + 4j`                  |

### int -- Arbitrary Precision Integers

Unlike JavaScript's `number` (IEEE 754 double, max safe integer ~9 quadrillion), Python integers have **no size limit**.

```python
# Python handles arbitrarily large integers natively
big = 10 ** 100  # a googol, 101 digits
print(big)
# 10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000

# Underscores for readability (like JS numeric separators)
population = 7_900_000_000
```

```javascript
// JS struggles with big numbers
console.log(Number.MAX_SAFE_INTEGER);  // 9007199254740991
// Need BigInt for larger values
let big = 10n ** 100n;
```

### float -- Floating Point Numbers

Both languages use IEEE 754 doubles, so the same quirks apply.

```python
print(0.1 + 0.2)          # 0.30000000000000004 (same as JS!)
print(0.1 + 0.2 == 0.3)   # False

# Use decimal module for precision-critical work
from decimal import Decimal
print(Decimal("0.1") + Decimal("0.2") == Decimal("0.3"))  # True

# Special float values
float("inf")    # Infinity
float("-inf")   # -Infinity
float("nan")    # NaN

import math
math.isnan(float("nan"))   # True
math.isinf(float("inf"))   # True
```

### str -- Strings

Single quotes and double quotes are interchangeable in Python (unlike JS/TS where convention often prefers one).

```python
name = "Alice"
name = 'Alice'     # identical

# Triple quotes for multiline
message = """
This is a
multiline string.
"""

# Raw strings (no escape processing) -- useful for regex, file paths
path = r"C:\Users\new_folder\test"   # backslashes are literal
```

Strings are covered in depth in `02_strings.md`.

### bool -- Booleans

Python booleans are `True` and `False` (capitalized). They are actually a subclass of `int`.

```python
print(True + True)    # 2
print(True * 10)      # 10
print(False + 1)      # 1
print(isinstance(True, int))  # True

# Truthy/falsy values (similar concept to JS but different rules)
# Falsy in Python: False, 0, 0.0, "", [], {}, set(), None, 0j
# Everything else is truthy

if []:
    print("won't print")   # empty list is falsy

if [0]:
    print("will print")    # non-empty list is truthy, even if it contains 0
```

```javascript
// JS falsy: false, 0, -0, 0n, "", null, undefined, NaN
// Key difference: empty array [] is TRUTHY in JS but FALSY in Python... wait:
// Actually, [] is truthy in JS! And falsy in Python.
if ([]) console.log("prints in JS!");  // This DOES print in JS
```

**Key difference:** In JS, `[]` and `{}` are truthy. In Python, empty containers (`[]`, `{}`, `set()`, `""`) are all falsy.

### None -- The Absence of Value

Python has `None` where JS has both `null` and `undefined`. Python unified this into a single concept.

```python
result = None

# Always use 'is' to check for None, not ==
if result is None:
    print("No result")

if result is not None:
    print("Got a result")
```

```javascript
// JS has two "nothing" values
let a = null;       // intentional absence
let b = undefined;  // not yet assigned / missing
let c;              // implicitly undefined
```

**Why `is` instead of `==`?** The `is` operator checks identity (same object in memory). There is exactly one `None` object in Python, so `is` is the correct and faster check. Using `==` could be fooled by objects that override `__eq__`.

---

## Dynamic Typing

Both Python and JavaScript are dynamically typed -- you can reassign a variable to a different type.

```python
x = 42          # int
x = "hello"     # now a str
x = [1, 2, 3]   # now a list
```

### The `type()` Function

Use `type()` to check a value's type at runtime. This is like `typeof` in JS, but returns a type object rather than a string.

```python
print(type(42))          # <class 'int'>
print(type(3.14))        # <class 'float'>
print(type("hello"))     # <class 'str'>
print(type(True))        # <class 'bool'>
print(type(None))        # <class 'NoneType'>
print(type([1, 2]))      # <class 'list'>
print(type({"a": 1}))    # <class 'dict'>

# Check if something is a specific type
print(type(42) == int)            # True
print(isinstance(42, int))       # True (preferred -- handles inheritance)
print(isinstance(True, int))     # True (bool is a subclass of int)
print(isinstance(True, bool))    # True
```

```javascript
// JS typeof comparison
typeof 42         // "number"
typeof "hello"    // "string"
typeof true       // "boolean"
typeof null       // "object"  <-- the famous JS bug
typeof undefined  // "undefined"
typeof []         // "object"
typeof {}         // "object"
// Arrays need Array.isArray([])
```

### Type Hints (Python's Answer to TypeScript)

Python 3.5+ supports type hints. They look like TypeScript annotations but are **not enforced at runtime** by default.

```python
# Type hints -- informational only at runtime
name: str = "Alice"
age: int = 30
scores: list[int] = [90, 85, 92]
user: dict[str, str] = {"name": "Alice", "role": "admin"}

def greet(name: str) -> str:
    return f"Hello, {name}"

# This will NOT raise an error at runtime!
age: int = "not a number"   # Python doesn't care at runtime
```

```typescript
// TypeScript -- enforced at compile time
let name: string = "Alice";
let age: number = 30;
let scores: number[] = [90, 85, 92];

// This WOULD raise a compile-time error in TS
// let age: number = "not a number";
```

To get TS-like checking, you run a separate tool like `mypy` or `pyright` on your Python code (covered more in the functions chapter).

---

## Type Coercion -- Python Is Stricter

This is one of the biggest differences. JavaScript is infamous for loose type coercion. Python refuses to mix types implicitly in most cases.

```python
# Python -- explicit is better than implicit
print("Age: " + str(30))    # Must explicitly convert int to str
print("Age: " + 30)         # TypeError: can only concatenate str to str

print(1 + 1.5)              # 2.5 (int + float works, int is promoted)
print(1 + True)             # 2 (bool is a subclass of int)

# No implicit conversion to bool in comparisons
print(1 == True)             # True (because True == 1)
print(1 == "1")              # False (no coercion!)
print(0 == False)            # True (because False == 0)
print(0 == "")               # False (no coercion!)
print("" == False)           # False (no coercion!)
```

```javascript
// JS -- the wild west of type coercion
console.log("Age: " + 30);       // "Age: 30" (auto-converts)
console.log(1 + "1");            // "11" (string wins)
console.log(1 - "1");            // 0 (now it converts to number)
console.log(1 == "1");           // true (loose equality coerces)
console.log(0 == "");            // true
console.log("" == false);        // true
console.log([] == false);        // true
console.log(null == undefined);  // true
```

**Bottom line:** Python does not have `===` because `==` already behaves strictly (no type coercion). You will never need `===` in Python.

### Explicit Type Conversion

```python
# Converting between types
int("42")         # 42
int(3.9)          # 3 (truncates, does NOT round)
float("3.14")     # 3.14
str(42)           # "42"
bool(0)           # False
bool("")          # False
bool("hello")     # True
bool(1)           # True
list("hello")     # ['h', 'e', 'l', 'l', 'o']
```

---

## Constants Convention

Python has no `const` keyword. The convention is to use `UPPER_SNAKE_CASE` to signal that a value should not be changed.

```python
# Constants by convention (nothing actually prevents reassignment)
MAX_CONNECTIONS = 100
DATABASE_URL = "postgresql://localhost:5432/mydb"
PI = 3.14159265358979
API_VERSION = "v2"

# These are just variables. Python trusts you not to reassign them.
MAX_CONNECTIONS = 200   # Python won't stop you, but linters will warn
```

```javascript
// JS enforces const
const MAX_CONNECTIONS = 100;
MAX_CONNECTIONS = 200;  // TypeError: Assignment to constant variable
```

If you want enforced immutability, you can use `Final` from the `typing` module (checked by type checkers like mypy, but still not enforced at runtime).

```python
from typing import Final

MAX_CONNECTIONS: Final = 100
# mypy will flag reassignment, but Python itself won't prevent it
```

---

## Numeric Operations

```python
# Standard arithmetic
10 + 3      # 13
10 - 3      # 7
10 * 3      # 30
10 / 3      # 3.3333... (always returns float!)
10 // 3     # 3 (floor/integer division -- no JS equivalent operator)
10 % 3      # 1 (modulo)
10 ** 3     # 1000 (exponentiation -- like JS **)

# Division difference from JS:
# Python: / always returns float, // returns int (floor division)
# JS: / returns whatever the math gives you

print(10 / 2)    # 5.0 (float in Python!)
print(10 // 2)   # 5 (int)
```

```javascript
// JS division
10 / 3           // 3.3333...
Math.floor(10/3) // 3 (Python's // equivalent)
10 % 3           // 1
10 ** 3          // 1000
```

### Augmented Assignment

```python
x = 10
x += 5     # x = 15
x -= 3     # x = 12
x *= 2     # x = 24
x /= 4     # x = 6.0 (note: becomes float!)
x //= 2    # x = 3.0
x **= 3    # x = 27.0
x %= 5     # x = 2.0

# NO increment/decrement operators!
# x++   SyntaxError
# x--   SyntaxError
x += 1   # use this instead
```

---

## Identity vs Equality

```python
a = [1, 2, 3]
b = [1, 2, 3]
c = a

# == checks value equality
print(a == b)    # True (same contents)

# 'is' checks identity (same object in memory)
print(a is b)    # False (different objects)
print(a is c)    # True (c points to same object as a)

# Python caches small integers (-5 to 256) and some strings
x = 256
y = 256
print(x is y)    # True (cached)

x = 257
y = 257
print(x is y)    # False (not cached -- implementation detail, don't rely on this)
```

```javascript
// JS reference comparison
let a = [1, 2, 3];
let b = [1, 2, 3];
console.log(a === b);  // false (different objects)
// JS has no built-in deep equality for arrays/objects
```

---

## Summary: Key Differences Cheat Sheet

| Feature                     | Python                           | JavaScript/TypeScript            |
|-----------------------------|----------------------------------|----------------------------------|
| Variable declaration        | `x = 10`                         | `let x = 10` / `const x = 10`   |
| Constants                   | `MAX = 10` (convention only)     | `const MAX = 10` (enforced)      |
| Naming convention           | `snake_case`                     | `camelCase`                      |
| Boolean values              | `True`, `False`                  | `true`, `false`                  |
| Null/undefined              | `None` (one value)               | `null` + `undefined` (two)       |
| Null check                  | `x is None`                      | `x === null`                     |
| Type checking               | `type(x)`, `isinstance(x, int)` | `typeof x`, `x instanceof Class` |
| String + number             | `TypeError` (must convert)       | Auto-coerces to string           |
| Equality                    | `==` (strict, no coercion)       | `===` (strict) / `==` (loose)    |
| Identity                    | `is`                             | `===` for primitives             |
| Integer division            | `//`                             | `Math.floor(a/b)`               |
| Exponentiation              | `**`                             | `**`                             |
| Increment                   | `x += 1` (no `x++`)             | `x++` or `x += 1`               |

---

## Practice Exercises

### Exercise 1: Variable Basics
Create variables for a user profile: name (str), age (int), balance (float), is_premium (bool), and referral_code (None). Print each with its type.

```python
# Your code here
```

<details>
<summary>Solution</summary>

```python
name = "Alice"
age = 28
balance = 1542.75
is_premium = True
referral_code = None

print(f"name: {name} -> {type(name)}")
print(f"age: {age} -> {type(age)}")
print(f"balance: {balance} -> {type(balance)}")
print(f"is_premium: {is_premium} -> {type(is_premium)}")
print(f"referral_code: {referral_code} -> {type(referral_code)}")
```
</details>

### Exercise 2: Type Coercion Detective
Predict the output of each line, then run it to check. Mark which ones would behave differently in JavaScript.

```python
print(type(True + 1))
print("hello" * 3)
print(10 / 3)
print(10 // 3)
print(bool(""))
print(bool("0"))
print(bool([]))
print(bool([0]))
print(1 == True)
print(1 == "1")
print(None == False)
```

<details>
<summary>Solution</summary>

```python
print(type(True + 1))   # <class 'int'> -> 2. JS: number (same idea)
print("hello" * 3)      # "hellohellohello". JS: NaN ("hello" * 3)!
print(10 / 3)           # 3.3333... JS: same
print(10 // 3)          # 3. JS: no // operator, need Math.floor()
print(bool(""))          # False. JS: same (empty string is falsy)
print(bool("0"))         # True! JS: also true ("0" is truthy in JS too)
print(bool([]))          # False! JS: true (empty array is truthy in JS!)
print(bool([0]))         # True. JS: true
print(1 == True)         # True. JS: 1 == true is true, 1 === true is false
print(1 == "1")          # False! JS: 1 == "1" is true (coercion)
print(None == False)     # False! JS: null == false is false too actually
```
</details>

### Exercise 3: Swap and Unpack
Given the variables below, swap `a` and `b` without a temp variable, then unpack the tuple into individual variables.

```python
a = "first"
b = "second"

# Swap a and b (one line)
# your code here

coordinates = (41.8781, -87.6298, "Chicago")
# Unpack into lat, lng, city
# your code here
```

<details>
<summary>Solution</summary>

```python
a = "first"
b = "second"

a, b = b, a
print(a, b)  # "second" "first"

coordinates = (41.8781, -87.6298, "Chicago")
lat, lng, city = coordinates
print(f"{city} is at ({lat}, {lng})")
# "Chicago is at (41.8781, -87.6298)"
```
</details>

### Exercise 4: Constants and Calculations
Define constants for a circle calculator. Calculate and print the area and circumference of a circle with radius 5. Use floor division to also give the integer-only area.

```python
# Define PI as a constant
# Calculate area (pi * r^2) and circumference (2 * pi * r)
# Print the float area, integer-only area (using //), and circumference
```

<details>
<summary>Solution</summary>

```python
PI = 3.14159265358979
RADIUS = 5

area = PI * RADIUS ** 2
circumference = 2 * PI * RADIUS
area_int = PI * RADIUS ** 2 // 1  # floor division by 1 truncates to int-like float

print(f"Area: {area}")              # 78.53981633974475
print(f"Area (floor): {area_int}")  # 78.0
print(f"Area (int): {int(area)}")   # 78
print(f"Circumference: {circumference}")  # 31.4159265358979
```
</details>

### Exercise 5: Type Conversion Pipeline
Write a function-like block that takes a string `"42.7"` and converts it through every numeric type: str -> float -> int -> bool -> int. Print each step.

```python
value = "42.7"
# Convert through each type and print the result and type at each step
```

<details>
<summary>Solution</summary>

```python
value = "42.7"
print(f"Start:    {value!r:>10} ({type(value).__name__})")

as_float = float(value)
print(f"-> float: {as_float!r:>10} ({type(as_float).__name__})")

as_int = int(as_float)  # Note: int("42.7") would raise ValueError!
print(f"-> int:   {as_int!r:>10} ({type(as_int).__name__})")

as_bool = bool(as_int)
print(f"-> bool:  {as_bool!r:>10} ({type(as_bool).__name__})")

back_to_int = int(as_bool)
print(f"-> int:   {back_to_int!r:>10} ({type(back_to_int).__name__})")

# Output:
# Start:      '42.7' (str)
# -> float:     42.7 (float)
# -> int:         42 (int)
# -> bool:      True (bool)
# -> int:          1 (int)
```
</details>
