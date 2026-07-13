# 01 - Variables and Data Types

## Node.js/TypeScript se aa rahe ho? Yeh sab badalne wala hai

JS/TS mein tum `let`, `const`, ya `var` se variable declare karte ho. Python mein yeh sab drama hi nahi hai. Koi declaration keyword nahi -- bas ek naam ko value assign karo, aur woh exist karne lagta hai. Bilkul waise jaise Zomato pe naya order create karte waqt tumhe koi "order declare karo" wala step nahi hota -- bas order daalo, ho gaya.

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

Python mein variables sirf naam hote hain jo memory mein pade objects ko point karte hain. Koi alag se "declaration" step nahi hota -- seedha assign karo.

```python
x = 10          # x ab integer object 10 ko point kar raha hai
x = "hello"     # x ab string object "hello" ko point kar raha hai (bilkul valid hai)
```

Yeh JS ke `let` jaisa hai (rebind kar sakte ho), lekin `const` ka koi equivalent nahi hai. Har variable reassign ho sakta hai -- Python mein "pakka wala" variable jaisi cheez hai hi nahi.

### Naming Conventions

Python mein har jagah `snake_case` use hota hai. Yeh sirf pasand ki baat nahi hai -- PEP 8 mein, jo Python ka official style guide hai, likha hua hai.

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

# Bad Python style (chalega, lekin Python tumhe rokega nahi)
firstName = "Alice"       # camelCase toh JS ki aadat hai
lastLoginTime = "2024-01-15"
```

> [!tip]
> Agar tum Python code mein camelCase likh rahe ho, toh samajh lo ki tumhari JS ki purani aadat abhi tak gayi nahi hai. Snake_case pe switch kar lo, warna code review mein taane sunoge.

### Multiple Assignment

Python mein ek hi line mein multiple variables assign kar sakte ho.

```python
# Ek saath multiple variables assign karo
x, y, z = 1, 2, 3

# Same value multiple variables ko
a = b = c = 0

# Swap values -- temp variable ki zarurat hi nahi!
x, y = y, x
```

```javascript
// JS mein multiple assignment ka equivalent
let [x, y, z] = [1, 2, 3];  // destructuring

// JS mein swap ke liye temp variable ya destructuring chahiye
[x, y] = [y, x];
```

Yeh swap wala trick Python mein bahut idiomatic hai. Peeche kya hota hai -- Python pehle poora right side evaluate karke ek tuple bana leta hai, phir usse left side mein unpack kar deta hai. Bilkul waise jaise ek dabbawala pehle sab dabbe collect karta hai, phir ek saath sahi ghar pe deliver karta hai.

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

JavaScript ke `number` (IEEE 754 double, max safe integer ~90 lakh crore) ke ulat, Python ke integers ki **koi size limit hi nahi** hai.

```python
# Python bade se bade integers ko bina kisi drama ke handle karta hai
big = 10 ** 100  # ek googol, 101 digits
print(big)
# 10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000

# Readability ke liye underscores (JS ke numeric separators jaise)
population = 7_900_000_000
```

```javascript
// JS bade numbers ke saath struggle karta hai
console.log(Number.MAX_SAFE_INTEGER);  // 9007199254740991
// Bade values ke liye BigInt chahiye
let big = 10n ** 100n;
```

Socho India ki population count kar rahe ho, ya kisi crypto exchange mein satoshi jaise chhote-chhote units mein bade transactions -- Python mein overflow ka tension hi nahi hai.

### float -- Floating Point Numbers

Dono languages IEEE 754 doubles use karte hain, isliye same quirks dono mein milte hain.

```python
print(0.1 + 0.2)          # 0.30000000000000004 (JS jaisa hi!)
print(0.1 + 0.2 == 0.3)   # False

# Precision-critical kaam (jaise paisa) ke liye decimal module use karo
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

> [!warning]
> Agar UPI ya Paytm jaisa payment system bana rahe ho aur paison ka calculation float se kar rahe ho, toh rounding errors se product manager ki gaali padegi. Wahan `Decimal` use karo, `float` nahi.

### str -- Strings

Python mein single quotes aur double quotes bilkul interchangeable hain (JS/TS ke ulat, jahan aksar ek convention follow karte hain).

```python
name = "Alice"
name = 'Alice'     # dono same hain

# Multiline ke liye triple quotes
message = """
This is a
multiline string.
"""

# Raw strings (escape processing nahi hota) -- regex, file paths ke liye useful
path = r"C:\Users\new_folder\test"   # backslashes literal rehte hain
```

Strings ke baare mein detail mein `02_strings.md` mein padhenge.

### bool -- Booleans

Python ke booleans `True` aur `False` hain (capital letter se shuru). Yeh asal mein `int` ke subclass hain.

```python
print(True + True)    # 2
print(True * 10)      # 10
print(False + 1)      # 1
print(isinstance(True, int))  # True

# Truthy/falsy values (JS jaisa concept, par rules alag hain)
# Python mein falsy: False, 0, 0.0, "", [], {}, set(), None, 0j
# Baaki sab truthy hai

if []:
    print("yeh print nahi hoga")   # empty list falsy hai

if [0]:
    print("yeh print hoga")    # non-empty list truthy hai, chahe andar 0 ho
```

```javascript
// JS falsy: false, 0, -0, 0n, "", null, undefined, NaN
// Bada difference: JS mein [] TRUTHY hai, Python mein FALSY...
if ([]) console.log("JS mein print hota hai!");  // Yeh sach mein print karega
```

**Key difference:** JS mein `[]` aur `{}` truthy hote hain. Python mein empty containers (`[]`, `{}`, `set()`, `""`) sab falsy hote hain.

### None -- The Absence of Value

Python mein `None` hai, jahan JS mein `null` aur `undefined` dono hote hain. Python ne isse ek hi concept mein unify kar diya hai -- ek hi "kuch nahi hai" ka signal.

```python
result = None

# None check karne ke liye hamesha 'is' use karo, == nahi
if result is None:
    print("Kuch nahi mila")

if result is not None:
    print("Result mil gaya")
```

```javascript
// JS mein "kuch nahi" ke do version
let a = null;       // jaan-boojh kar khaali chhoda
let b = undefined;  // abhi assign nahi hua / missing
let c;              // implicitly undefined
```

**`is` kyun, `==` kyun nahi?** `is` operator identity check karta hai (memory mein same object hai ya nahi). Python mein `None` ka exactly ek hi object hota hai, isliye `is` sahi aur fast check hai. `==` use karoge toh koi object jisne `__eq__` override kiya ho, tumhe dhokha de sakta hai.

---

## Dynamic Typing

Python aur JavaScript dono dynamically typed hain -- ek variable ko different type mein reassign kar sakte ho.

```python
x = 42          # int
x = "hello"     # ab str
x = [1, 2, 3]   # ab list
```

### The `type()` Function

Kisi value ka type runtime pe check karne ke liye `type()` use karo. Yeh JS ke `typeof` jaisa hi hai, bas yeh string ke bajaye type object return karta hai.

```python
print(type(42))          # <class 'int'>
print(type(3.14))        # <class 'float'>
print(type("hello"))     # <class 'str'>
print(type(True))        # <class 'bool'>
print(type(None))        # <class 'NoneType'>
print(type([1, 2]))      # <class 'list'>
print(type({"a": 1}))    # <class 'dict'>

# Kisi specific type ka check
print(type(42) == int)            # True
print(isinstance(42, int))       # True (preferred -- inheritance bhi handle karta hai)
print(isinstance(True, int))     # True (bool, int ka subclass hai)
print(isinstance(True, bool))    # True
```

```javascript
// JS typeof comparison
typeof 42         // "number"
typeof "hello"    // "string"
typeof true       // "boolean"
typeof null       // "object"  <-- JS ka famous bug
typeof undefined  // "undefined"
typeof []         // "object"
typeof {}         // "object"
// Arrays check karne ke liye Array.isArray([]) chahiye
```

### Type Hints (Python ka TypeScript wala jawab)

Python 3.5+ mein type hints support hote hain. Yeh dekhne mein TypeScript annotations jaise lagte hain, lekin default mein **runtime pe enforce nahi hote**.

```python
# Type hints -- runtime pe sirf informational hain
name: str = "Alice"
age: int = 30
scores: list[int] = [90, 85, 92]
user: dict[str, str] = {"name": "Alice", "role": "admin"}

def greet(name: str) -> str:
    return f"Hello, {name}"

# Yeh runtime pe koi error NAHI dega!
age: int = "not a number"   # Python ko koi farak nahi padta
```

```typescript
// TypeScript -- compile time pe enforce hota hai
let name: string = "Alice";
let age: number = 30;
let scores: number[] = [90, 85, 92];

// Yeh TS mein compile-time error dega
// let age: number = "not a number";
```

TS jaisa checking chahiye toh alag se `mypy` ya `pyright` jaisa tool chalana padega (functions wale chapter mein aur detail mein dekhenge).

---

## Type Coercion -- Python Zyada Strict Hai

Yeh sabse bada difference hai. JavaScript apni loose type coercion ke liye badnaam hai. Python zyadatar cases mein types ko implicitly mix karne se saaf mana kar deta hai.

```python
# Python -- explicit hamesha behtar hai implicit se
print("Age: " + str(30))    # int ko str mein explicitly convert karna padega
print("Age: " + 30)         # TypeError: can only concatenate str to str

print(1 + 1.5)              # 2.5 (int + float chal jaata hai, int promote hota hai)
print(1 + True)             # 2 (bool, int ka subclass hai)

# Comparisons mein implicit conversion nahi hoti
print(1 == True)             # True (kyunki True == 1)
print(1 == "1")              # False (koi coercion nahi!)
print(0 == False)            # True (kyunki False == 0)
print(0 == "")               # False (koi coercion nahi!)
print("" == False)           # False (koi coercion nahi!)
```

```javascript
// JS -- type coercion ka wild west
console.log("Age: " + 30);       // "Age: 30" (auto-convert ho gaya)
console.log(1 + "1");            // "11" (string jeet gaya)
console.log(1 - "1");            // 0 (ab number mein convert ho gaya)
console.log(1 == "1");           // true (loose equality coerce karti hai)
console.log(0 == "");            // true
console.log("" == false);        // true
console.log([] == false);        // true
console.log(null == undefined);  // true
```

**Bottom line:** Python mein `===` hai hi nahi kyunki `==` pehle se hi strict behave karta hai (koi type coercion nahi). Python mein tumhe kabhi `===` ki zarurat hi nahi padegi.

### Explicit Type Conversion

```python
# Types ke beech convert karna
int("42")         # 42
int(3.9)          # 3 (truncate karta hai, round NAHI karta)
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

Python mein `const` keyword hai hi nahi. Convention yeh hai ki `UPPER_SNAKE_CASE` use karo, taaki signal mile ki yeh value change nahi honi chahiye -- bilkul ek unwritten office rule jaisa, jise sab follow karte hain par koi force nahi karta.

```python
# Convention se constants (asal mein reassignment ko koi rokta nahi)
MAX_CONNECTIONS = 100
DATABASE_URL = "postgresql://localhost:5432/mydb"
PI = 3.14159265358979
API_VERSION = "v2"

# Yeh sirf variables hain. Python tumpe bharosa karta hai ki tum inhe reassign nahi karoge.
MAX_CONNECTIONS = 200   # Python rokega nahi, par linters warning zaroor denge
```

```javascript
// JS const enforce karta hai
const MAX_CONNECTIONS = 100;
MAX_CONNECTIONS = 200;  // TypeError: Assignment to constant variable
```

Agar tumhe enforced immutability chahiye, toh `typing` module se `Final` use kar sakte ho (type checkers jaise mypy check karte hain, lekin runtime pe abhi bhi enforce nahi hota).

```python
from typing import Final

MAX_CONNECTIONS: Final = 100
# mypy reassignment pe flag karega, lekin Python khud nahi rokega
```

---

## Numeric Operations

```python
# Standard arithmetic
10 + 3      # 13
10 - 3      # 7
10 * 3      # 30
10 / 3      # 3.3333... (hamesha float return karta hai!)
10 // 3     # 3 (floor/integer division -- JS mein koi equivalent operator nahi)
10 % 3      # 1 (modulo)
10 ** 3     # 1000 (exponentiation -- JS ke ** jaisa)

# JS se division ka difference:
# Python: / hamesha float deta hai, // int deta hai (floor division)
# JS: / jo bhi math se aaye, wahi deta hai

print(10 / 2)    # 5.0 (Python mein float!)
print(10 // 2)   # 5 (int)
```

```javascript
// JS division
10 / 3           // 3.3333...
Math.floor(10/3) // 3 (Python ke // ka equivalent)
10 % 3           // 1
10 ** 3          // 1000
```

### Augmented Assignment

```python
x = 10
x += 5     # x = 15
x -= 3     # x = 12
x *= 2     # x = 24
x /= 4     # x = 6.0 (note: float ban gaya!)
x //= 2    # x = 3.0
x **= 3    # x = 27.0
x %= 5     # x = 2.0

# Koi increment/decrement operator nahi hai!
# x++   SyntaxError
# x--   SyntaxError
x += 1   # iske bajaye yeh use karo
```

---

## Identity vs Equality

```python
a = [1, 2, 3]
b = [1, 2, 3]
c = a

# == value equality check karta hai
print(a == b)    # True (contents same hain)

# 'is' identity check karta hai (memory mein same object)
print(a is b)    # False (alag objects hain)
print(a is c)    # True (c, a ke jaise hi object ko point karta hai)

# Python chhote integers (-5 se 256) aur kuch strings ko cache karta hai
x = 256
y = 256
print(x is y)    # True (cached)

x = 257
y = 257
print(x is y)    # False (cached nahi -- yeh implementation detail hai, ispar bharosa mat karo)
```

```javascript
// JS reference comparison
let a = [1, 2, 3];
let b = [1, 2, 3];
console.log(a === b);  // false (alag objects)
// JS mein arrays/objects ke liye built-in deep equality hai hi nahi
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
Ek user profile ke liye variables banao: name (str), age (int), balance (float), is_premium (bool), aur referral_code (None). Har ek ko uske type ke saath print karo.

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
Har line ka output guess karo, phir chalake check karo. Mark karo ki kaunse JavaScript mein alag behave karenge.

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
Neeche diye variables ke saath, `a` aur `b` ko bina temp variable ke swap karo, phir tuple ko individual variables mein unpack karo.

```python
a = "first"
b = "second"

# a aur b ko swap karo (ek line mein)
# your code here

coordinates = (41.8781, -87.6298, "Chicago")
# lat, lng, city mein unpack karo
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
Ek circle calculator ke liye constants define karo. Radius 5 wale circle ka area aur circumference calculate karke print karo. Floor division use karke integer-only area bhi do.

```python
# PI ko ek constant define karo
# Area (pi * r^2) aur circumference (2 * pi * r) calculate karo
# Float area, integer-only area (// use karke), aur circumference print karo
```

<details>
<summary>Solution</summary>

```python
PI = 3.14159265358979
RADIUS = 5

area = PI * RADIUS ** 2
circumference = 2 * PI * RADIUS
area_int = PI * RADIUS ** 2 // 1  # floor division by 1 se int-like float milta hai

print(f"Area: {area}")              # 78.53981633974475
print(f"Area (floor): {area_int}")  # 78.0
print(f"Area (int): {int(area)}")   # 78
print(f"Circumference: {circumference}")  # 31.4159265358979
```
</details>

### Exercise 5: Type Conversion Pipeline
Ek code block likho jo string `"42.7"` ko har numeric type se pass kare: str -> float -> int -> bool -> int. Har step print karo.

```python
value = "42.7"
# Har type ke through convert karo aur har step ka result aur type print karo
```

<details>
<summary>Solution</summary>

```python
value = "42.7"
print(f"Start:    {value!r:>10} ({type(value).__name__})")

as_float = float(value)
print(f"-> float: {as_float!r:>10} ({type(as_float).__name__})")

as_int = int(as_float)  # Note: int("42.7") ValueError degi!
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
