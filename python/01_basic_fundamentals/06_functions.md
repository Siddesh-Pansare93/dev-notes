# 06 - Functions

## Node.js/TypeScript se aane walon ke liye

Python mein functions bhi first-class objects hote hain, bilkul JavaScript ki tarah. Bade differences ye hain: `function` ki jagah `def`, braces ki jagah indentation, aur Python ka parameter system JS se kaafi zyada powerful hai — keyword arguments, `*args`, `**kwargs`, aur positional-only parameters ke saath.

---

## Functions Define Karna

### Basic Syntax

```python
def greet(name):
    """Return a greeting string."""    # docstring (JSDoc jaisa)
    return f"Hello, {name}!"

result = greet("Alice")
print(result)    # Hello, Alice!
```

```javascript
// JS equivalents
function greet(name) {
    return `Hello, ${name}!`;
}

const greet = (name) => `Hello, ${name}!`;
```

Key differences:
- `function` ki jagah `def` keyword
- Signature ke baad colon `:`
- Body indentation se define hoti hai
- **Docstrings** (triple-quote wali pehli line) built-in documentation ka kaam karti hain
- Na braces, na semicolons

### Docstrings

Socho docstring ek chhota sa README hai jo function ke andar hi baitha hai — koi bhi `help()` maar ke dekh sakta hai function kya karta hai, bina code padhe.

```python
def calculate_bmi(weight_kg, height_m):
    """
    Calculate Body Mass Index (BMI).

    Args:
        weight_kg: Weight in kilograms.
        height_m: Height in meters.

    Returns:
        The BMI as a float.

    Raises:
        ValueError: If height is zero or negative.
    """
    if height_m <= 0:
        raise ValueError("Height must be positive")
    return weight_kg / (height_m ** 2)

# Docstring ko access karna
print(calculate_bmi.__doc__)
help(calculate_bmi)          # formatted display
```

---

## Parameters aur Arguments

### Positional aur Keyword Arguments

Python positional aur keyword arguments mein farak karta hai. Ye cheez JavaScript mein exist hi nahi karti.

Zomato pe order karte waqt socho — kabhi tum bolte ho "2 pizza, extra cheese, address ye hai" (order matters), aur kabhi app khud pooch leta hai "address kya hai? cheese chahiye?" (naam se bata do, order nahi matter karta). Python mein bhi arguments aise hi kaam karte hain.

```python
def create_user(name, age, city="Unknown"):
    return {"name": name, "age": age, "city": city}

# Positional arguments (order matter karta hai)
create_user("Alice", 30, "NYC")

# Keyword arguments (order matter nahi karta)
create_user(age=30, name="Alice", city="NYC")

# Positional aur keyword mix kar sakte ho
create_user("Alice", 30, city="NYC")

# RULE: positional args, keyword args se pehle aane chahiye
# create_user(name="Alice", 30)   # SyntaxError!
```

```javascript
// JS mein keyword arguments nahi hote. Pattern kuch aisa hota hai:
function createUser(name, age, city = "Unknown") {
    return { name, age, city };
}
// Ya options object ke saath:
function createUser({ name, age, city = "Unknown" }) {
    return { name, age, city };
}
createUser({ name: "Alice", age: 30, city: "NYC" });
```

### Default Parameters

```python
def connect(host="localhost", port=5432, timeout=30, ssl=False):
    print(f"Connecting to {host}:{port} (timeout={timeout}, ssl={ssl})")

# Keyword arguments use karke kuch defaults skip karo
connect(ssl=True)                          # baaki sab default, sirf ssl badla
connect("prod-server", ssl=True)           # host aur ssl badla
connect(port=3306, host="db.example.com")  # keyword args kisi bhi order mein

# GOTCHA: Mutable default arguments!
def add_item(item, lst=[]):     # BUG! Default list saare calls mein shared hai
    lst.append(item)
    return lst

print(add_item("a"))    # ['a']
print(add_item("b"))    # ['a', 'b'] -- yahi to problem hai! Wahi list use ho rahi!

# Fix: None ko sentinel ki tarah use karo
def add_item(item, lst=None):
    if lst is None:
        lst = []
    lst.append(item)
    return lst
```

```javascript
// JS mein default parameter syntax same hai
function connect(host = "localhost", port = 5432) { ... }
// JS mein mutable default wala bug nahi aata kyunki defaults har call pe fresh evaluate hote hain
```

> [!warning]
> **Critical difference:** Python mein default values sirf ONE BAAR evaluate hoti hain — jab function define hota hai, har call pe nahi. Isliye mutable defaults (list, dict, set) ek classic Python gotcha hai. Isko yaad rakhna, ye interview mein bhi puchha jaata hai.

### *args -- Variable Positional Arguments

JavaScript ke rest parameters (`...args`) jaisa hi hai, bas Python `*` use karta hai.

Socho ek dabbawala jo pata nahi kitne dabbe uthaata hai — 1 ho ya 10, function sabko handle kar lega.

```python
def sum_all(*numbers):
    """Kitne bhi positional arguments accept karo."""
    print(type(numbers))     # <class 'tuple'>
    return sum(numbers)

print(sum_all(1, 2, 3))          # 6
print(sum_all(1, 2, 3, 4, 5))    # 15

# Regular parameters ke saath combine karo
def log(level, *messages):
    for msg in messages:
        print(f"[{level}] {msg}")

log("ERROR", "File not found", "Permission denied")
# [ERROR] File not found
# [ERROR] Permission denied
```

```javascript
// JS rest parameters
function sumAll(...numbers) {
    return numbers.reduce((a, b) => a + b, 0);
}
```

### **kwargs -- Variable Keyword Arguments

Iska JavaScript mein koi equivalent hi NAHI hai. Ye saare extra keyword arguments ko ek dictionary mein collect kar leta hai — jaise koi form jisme jitne fields chaho utne bhar do.

```python
def create_element(tag, **attributes):
    """Arbitrary attributes ke saath HTML element banao."""
    print(type(attributes))  # <class 'dict'>
    attrs = " ".join(f'{k}="{v}"' for k, v in attributes.items())
    return f"<{tag} {attrs}></{tag}>" if attrs else f"<{tag}></{tag}>"

print(create_element("div", id="main", class_="container"))
# <div id="main" class_="container"></div>

print(create_element("input", type="text", name="email", required="true"))
# <input type="text" name="email" required="true"></input>
```

### Sab Parameter Types Ko Combine Karna

```python
# Poora parameter order:
def full_example(
    pos_only,        # positional-only (/ se pehle)
    /,               # separator: isse pehle sab positional-only
    normal,          # normal (positional ya keyword)
    *,               # separator: iske baad sab keyword-only
    kw_only,         # keyword-only (* ke baad)
    **kwargs         # bache hue keyword args
):
    pass

# Common pattern: regular + *args + **kwargs
def flexible(required, *args, option=False, **kwargs):
    print(f"required: {required}")
    print(f"args: {args}")
    print(f"option: {option}")
    print(f"kwargs: {kwargs}")

flexible("hello", 1, 2, 3, option=True, extra="data", debug=False)
# required: hello
# args: (1, 2, 3)
# option: True
# kwargs: {'extra': 'data', 'debug': False}
```

### Keyword-Only Arguments

`*` ke baad parameters rakh kar caller ko force karo ki wo keyword syntax hi use kare.

```python
def fetch(url, *, method="GET", headers=None, timeout=30):
    """* ke baad wale parameters ko keyword se hi pass karna hoga."""
    print(f"{method} {url} (timeout={timeout})")

fetch("https://api.example.com")                          # OK
fetch("https://api.example.com", method="POST")            # OK
# fetch("https://api.example.com", "POST")                 # TypeError!
```

### Arguments Unpack Karna

```python
# List/tuple ko positional args ki tarah unpack karo
def add(a, b, c):
    return a + b + c

numbers = [1, 2, 3]
print(add(*numbers))    # 6 (add(1, 2, 3) jaisa hi)

# Dict ko keyword args ki tarah unpack karo
config = {"host": "localhost", "port": 5432, "ssl": True}
# connect(**config)  # connect(host="localhost", port=5432, ssl=True) jaisa hi

# Combine bhi kar sakte ho
args = [1, 2]
kwargs = {"c": 3}
print(add(*args, **kwargs))  # 6
```

```javascript
// JS spread
const numbers = [1, 2, 3];
add(...numbers);  // JS mein sirf positional spread hota hai
```

---

## Return Values

### Single aur Multiple Returns

```python
# Single return
def double(x):
    return x * 2

# Return statement nahi hai (ya bare return) to None return hota hai
def greet(name):
    print(f"Hello, {name}")
    # implicitly None return hota hai

result = greet("Alice")
print(result)    # None

# Multiple return values (asal mein ek tuple return hota hai)
def divide(a, b):
    quotient = a // b
    remainder = a % b
    return quotient, remainder    # ek tuple return karta hai

q, r = divide(17, 5)            # tuple unpack karo
print(f"17 / 5 = {q} remainder {r}")

result = divide(17, 5)          # ya tuple hi rehne do
print(result)                    # (3, 2)
print(type(result))              # <class 'tuple'>

# Named results ke liye dict return karo (common pattern)
def analyze_text(text):
    words = text.split()
    return {
        "word_count": len(words),
        "char_count": len(text),
        "avg_word_length": sum(len(w) for w in words) / len(words) if words else 0,
    }
```

```javascript
// JS sirf ek value return kar sakta hai. Multiple returns ke liye objects/arrays use hote hain:
function divide(a, b) {
    return { quotient: Math.floor(a / b), remainder: a % b };
}
const { quotient, remainder } = divide(17, 5);
```

---

## Lambda Functions

Lambdas anonymous, single-expression functions hote hain. Ye JS arrow functions se zyada limited hote hain.

```python
# Lambda syntax: lambda parameters: expression
double = lambda x: x * 2
add = lambda x, y: x + y
greet = lambda name: f"Hello, {name}!"

print(double(5))       # 10
print(add(3, 4))       # 7

# Lambdas sabse zyada useful inline callbacks ki tarah hote hain
numbers = [5, 2, 8, 1, 9]
sorted(numbers, key=lambda x: -x)            # [9, 8, 5, 2, 1]

users = [{"name": "Bob", "age": 25}, {"name": "Alice", "age": 30}]
sorted(users, key=lambda u: u["name"])        # naam se sort

# Lambda limitations (JS arrow functions ke muqable):
# - Sirf EK expression (koi statements nahi, multiple lines nahi)
# - Koi assignments nahi, koi if/else statements nahi (par conditional expressions chalte hain)
# - Koi type hints nahi

# Ye VALID nahi hai:
# bad = lambda x: if x > 0: return x  # SyntaxError

# Par conditional expressions valid hain:
absolute = lambda x: x if x >= 0 else -x
```

```javascript
// JS arrow functions zyada flexible hote hain
const double = x => x * 2;              // single expression
const process = x => {                  // multi-line with statements
    if (x > 0) return x;
    return -x;
};
```

> [!tip]
> **Rule of thumb:** Agar lambda ek line mein fit nahi ho raha ya padhna mushkil ho raha hai, to `def` use karo.

---

## Type Hints

Python type hints dikhte to TypeScript annotations jaise hain, par ye runtime pe enforce NAHI hote. Ye sirf documentation aur static analysis tools (mypy, pyright) ke liye hain.

Isko aise socho — TypeScript ek strict security guard hai jo galat entry ko gate pe hi rok deta hai, jabki Python type hints sirf ek board hai jisme likha hai "yahan cycle chalane ki permission nahi" — par koi rok nahi raha, tum chahe to chala hi sakte ho.

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"

def add(a: int, b: int) -> int:
    return a + b

def process_items(items: list[str], limit: int = 10) -> dict[str, int]:
    return {item: len(item) for item in items[:limit]}

# Optional (None bhi ho sakta hai)
from typing import Optional
def find_user(user_id: int) -> Optional[dict]:      # dict ya None
    pass

# Python 3.10+ union syntax
def find_user(user_id: int) -> dict | None:          # upar wale jaisa hi
    pass

# Complex types
from typing import Callable, Any

def apply_transform(
    data: list[dict[str, Any]],
    transform: Callable[[dict], dict],
    *,
    filter_fn: Callable[[dict], bool] | None = None,
) -> list[dict[str, Any]]:
    if filter_fn:
        data = [item for item in data if filter_fn(item)]
    return [transform(item) for item in data]

# Ye sirf hints hain -- Python inko runtime pe check NAHI karta!
greet(42)    # Runtime pe koi error nahi, bas "Hello, 42!" return hoga
```

```typescript
// TypeScript -- compile time pe enforce hota hai
function greet(name: string): string {
    return `Hello, ${name}!`;
}
greet(42);   // Compile error!
```

---

## Closures aur Scope

Closures Python aur JavaScript dono mein similar kaam karte hain, bas kuch differences hain.

### LEGB Scope Rule

Python names resolve karne ke liye LEGB use karta hai: Local, Enclosing, Global, Built-in.

```python
x = "global"          # Global scope

def outer():
    x = "enclosing"   # Enclosing scope

    def inner():
        x = "local"   # Local scope
        print(x)      # "local"

    inner()
    print(x)           # "enclosing"

outer()
print(x)               # "global"
```

### Closures

Closure ko UPI jaisa socho — ek baar QR generate hua (function banaya), usme merchant ka ID already "capture" ho chuka hai. Baad mein jab bhi scan karo, wo ID uske saath hi rehta hai.

```python
def make_multiplier(factor):
    """Ek aisa function return karo jo factor se multiply kare."""
    def multiply(x):
        return x * factor    # factor enclosing scope se capture hua hai
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)
print(double(5))    # 10
print(triple(5))    # 15

# State ke saath closure
def make_counter(start=0):
    count = start
    def increment():
        nonlocal count       # enclosing variable modify karne ke liye zaruri
        count += 1
        return count
    return increment

counter = make_counter()
print(counter())    # 1
print(counter())    # 2
print(counter())    # 3
```

### nonlocal aur global

```python
# nonlocal ke bina, enclosing variable ko MODIFY nahi kar sakte
def outer():
    count = 0
    def inner():
        # count += 1         # UnboundLocalError! Python soch raha hai count local hai
        nonlocal count        # Python ko bolo enclosing scope mein dhoondho
        count += 1
        return count
    return inner

# global keyword (generally avoid karna chahiye)
total = 0
def add_to_total(n):
    global total              # global variable ko modify karta hai
    total += n

add_to_total(5)
print(total)    # 5
```

```javascript
// JS closures similar kaam karte hain, bas nonlocal wali dikkat nahi hoti
function makeCounter() {
    let count = 0;
    return () => ++count;    // count ko directly modify kar sakte ho
}
```

---

## First-Class Functions

Python mein functions bhi objects hain. Inhe idhar-udhar pass kiya ja sakta hai, variables mein store kiya ja sakta hai, aur inspect bhi kiya ja sakta hai.

```python
# Variable mein assign karo
def shout(text):
    return text.upper()

yell = shout           # koi parentheses nahi -- function khud assign ho raha hai
print(yell("hello"))   # "HELLO"

# Argument ki tarah pass karo
def apply_twice(func, value):
    return func(func(value))

print(apply_twice(shout, "hello"))   # "HELLO" (already upper hai, to koi visible change nahi)
print(apply_twice(lambda x: x + "!", "hello"))  # "hello!!"

# Data structures mein store karo
operations = {
    "+": lambda a, b: a + b,
    "-": lambda a, b: a - b,
    "*": lambda a, b: a * b,
    "/": lambda a, b: a / b if b != 0 else float("inf"),
}

print(operations["+"](10, 5))   # 15
print(operations["*"](10, 5))   # 50

# Function attributes
print(shout.__name__)            # "shout"
print(shout.__doc__)             # None (humne docstring nahi daali)

# Higher-order functions
numbers = [1, -2, 3, -4, 5]
positives = list(filter(lambda x: x > 0, numbers))   # [1, 3, 5]
doubled = list(map(lambda x: x * 2, numbers))         # [2, -4, 6, -8, 10]

from functools import reduce
total = reduce(lambda a, b: a + b, numbers)            # 3

# Par Python mein map/filter se zyada comprehensions prefer karo:
positives = [x for x in numbers if x > 0]             # zyada Pythonic
doubled = [x * 2 for x in numbers]                     # zyada Pythonic
```

---

## Decorators (Chhota Introduction)

Decorators aise functions hain jo dusre functions ko "wrap" karte hain. Python frameworks (Flask, Django, FastAPI) mein inka bahut use hota hai.

Isko aise socho — jaise Swiggy pe order ke upar "packaging charge" automatically add ho jata hai, bina tumhe order dobara likhne ke. Decorator bhi original function ke around ek extra layer chadha deta hai.

```python
import time

def timer(func):
    """Decorator jo function ka execution time measure karta hai."""
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} took {end - start:.4f} seconds")
        return result
    return wrapper

@timer
def slow_function(n):
    """Ek slow operation simulate karo."""
    total = sum(range(n))
    return total

result = slow_function(10_000_000)
# slow_function took 0.2345 seconds

# @timer iske equivalent hai:
# slow_function = timer(slow_function)
```

```javascript
// JS decorators (Stage 3 proposal, ya TypeScript experimental)
// Python decorators ek well-established language feature hai
```

---

## Summary: Functions Comparison

| Feature                  | Python                           | JavaScript                       |
|--------------------------|----------------------------------|----------------------------------|
| Function define karna     | `def func():`                    | `function func() {}` / `() => {}` |
| Lambda                   | `lambda x: x * 2`               | `x => x * 2`                     |
| Default params           | `def f(x=10):`                   | `function f(x = 10) {}`          |
| Rest params              | `def f(*args):`                  | `function f(...args) {}`          |
| Keyword args             | `f(key=value)`                   | `f({key: value})` (convention)    |
| **kwargs                 | `def f(**kwargs):`               | Equivalent nahi hai               |
| Keyword-only             | `def f(*, key):`                 | Equivalent nahi hai               |
| Multiple returns         | `return a, b` (tuple)            | `return {a, b}` (object)         |
| Type hints               | `def f(x: int) -> str:`         | TypeScript: `(x: number): string` |
| Docstrings               | `"""docs"""`                     | `/** JSDoc */`                    |
| Closure modification     | `nonlocal` chahiye                | Direct access                     |
| Decorators               | `@decorator`                     | TC39 Stage 3 proposal             |

---

## Practice Exercises

### Exercise 1: Flexible Calculator
Ek `calculate` function likho jo do numbers aur operations ki variable list le, aur unhe sequentially apply kare.

```python
def calculate(a, b, *operations):
    pass

print(calculate(10, 3, "add"))              # 13
print(calculate(10, 3, "add", "multiply"))  # 30 (10+3=13, 13*3=39... hmm)
# Behavior clearly define karo aur implement karo
```

<details>
<summary>Solution</summary>

```python
def calculate(initial, *operations, **constants):
    """
    Initial value pe operations ko sequentially apply karo.
    Operations ya to (operator, operand) tuples hain, ya sirf operator strings
    jo 'by' constant use karte hain.
    """
    ops = {
        "add": lambda a, b: a + b,
        "subtract": lambda a, b: a - b,
        "multiply": lambda a, b: a * b,
        "divide": lambda a, b: a / b if b != 0 else float("inf"),
        "power": lambda a, b: a ** b,
    }

    result = initial
    for op in operations:
        if isinstance(op, tuple):
            name, operand = op
        else:
            raise ValueError(f"Operations must be (name, operand) tuples, got: {op}")
        if name not in ops:
            raise ValueError(f"Unknown operation: {name}")
        result = ops[name](result, operand)

    return result

print(calculate(10, ("add", 5)))                          # 15
print(calculate(10, ("add", 5), ("multiply", 2)))         # 30
print(calculate(2, ("power", 10), ("subtract", 24)))      # 1000
print(calculate(100, ("divide", 3), ("multiply", 3)))     # 99.999...
```
</details>

### Exercise 2: Retry Decorator
Ek `retry` decorator likho jo function ko exception aane par `n` baar tak re-run kare, retries ke beech optional delay ke saath.

```python
def retry(max_attempts=3, delay=0):
    pass

@retry(max_attempts=3, delay=1)
def flaky_api_call():
    import random
    if random.random() < 0.7:
        raise ConnectionError("Server unavailable")
    return {"data": "success"}
```

<details>
<summary>Solution</summary>

```python
import time
import functools

def retry(max_attempts=3, delay=0):
    def decorator(func):
        @functools.wraps(func)   # __name__, __doc__ ko preserve karta hai
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    print(f"Attempt {attempt}/{max_attempts} failed: {e}")
                    if attempt < max_attempts and delay > 0:
                        time.sleep(delay)
            raise last_exception
        return wrapper
    return decorator

@retry(max_attempts=3, delay=0.5)
def flaky_api_call():
    import random
    if random.random() < 0.7:
        raise ConnectionError("Server unavailable")
    return {"data": "success"}

try:
    result = flaky_api_call()
    print(f"Success: {result}")
except ConnectionError as e:
    print(f"All attempts failed: {e}")
```
</details>

### Exercise 3: Function Pipeline
Ek `pipe` function banao jo multiple functions ko left-to-right compose kare (Unix pipes ya RxJS pipe jaisa).

```python
def pipe(*functions):
    pass

# Usage:
process = pipe(
    str.strip,
    str.lower,
    lambda s: s.replace(" ", "_"),
    lambda s: s[:20],
)
print(process("  Hello World  "))  # "hello_world"
```

<details>
<summary>Solution</summary>

```python
from functools import reduce

def pipe(*functions):
    """Functions ka ek pipeline banao, left to right apply hoga."""
    def pipeline(value):
        return reduce(lambda v, f: f(v), functions, value)
    return pipeline

# Usage
process = pipe(
    str.strip,
    str.lower,
    lambda s: s.replace(" ", "_"),
    lambda s: s[:20],
)

print(process("  Hello World  "))       # "hello_world"
print(process("  PYTHON IS GREAT  "))   # "python_is_great"

# Numeric pipeline
transform = pipe(
    lambda x: x * 2,
    lambda x: x + 10,
    lambda x: x ** 2,
    str,
)
print(transform(5))    # "400" (5*2=10, 10+10=20, 20^2=400, str="400")
```
</details>

### Exercise 4: Memoize Decorator
Ek `memoize` decorator likho jo function ke results ko arguments ke basis pe cache kare. Positional aur keyword dono arguments handle karo.

```python
def memoize(func):
    pass

@memoize
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(100))  # memoization ke saath fast hona chahiye
```

<details>
<summary>Solution</summary>

```python
import functools

def memoize(func):
    cache = {}

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # args aur kwargs se ek hashable key banao
        key = (args, tuple(sorted(kwargs.items())))
        if key not in cache:
            cache[key] = func(*args, **kwargs)
        return cache[key]

    wrapper.cache = cache          # inspection ke liye cache expose karo
    wrapper.cache_clear = cache.clear  # clear karne ki suvidha
    return wrapper

@memoize
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(100))   # 354224848179261915075 (instant!)
print(f"Cache size: {len(fibonacci.cache)}")  # 101

# Note: Python mein ye built-in hi milta hai!
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

print(fib(100))
print(fib.cache_info())  # CacheInfo(hits=98, misses=101, maxsize=None, currsize=101)
```
</details>

### Exercise 5: Event Emitter
Functions ko first-class citizens ki tarah use karke ek simple event emitter class banao. `on`, `off`, `emit`, aur `once` support karo.

```python
class EventEmitter:
    def __init__(self): pass
    def on(self, event, callback): pass
    def off(self, event, callback): pass
    def once(self, event, callback): pass
    def emit(self, event, *args, **kwargs): pass
```

<details>
<summary>Solution</summary>

```python
from collections import defaultdict
import functools

class EventEmitter:
    def __init__(self):
        self._listeners = defaultdict(list)

    def on(self, event, callback):
        self._listeners[event].append(callback)
        return self   # chaining allow karne ke liye

    def off(self, event, callback):
        self._listeners[event] = [
            cb for cb in self._listeners[event] if cb != callback
        ]
        return self

    def once(self, event, callback):
        @functools.wraps(callback)
        def wrapper(*args, **kwargs):
            self.off(event, wrapper)
            return callback(*args, **kwargs)
        self.on(event, wrapper)
        return self

    def emit(self, event, *args, **kwargs):
        for callback in self._listeners[event][:]:  # list copy taaki modification allow ho
            callback(*args, **kwargs)
        return self

# Usage
emitter = EventEmitter()

def on_data(data):
    print(f"Received: {data}")

def on_error(error):
    print(f"Error: {error}")

emitter.on("data", on_data)
emitter.on("error", on_error)
emitter.once("connect", lambda: print("Connected!"))

emitter.emit("connect")     # Connected!
emitter.emit("connect")     # (kuch nahi -- once handler already remove ho chuka)
emitter.emit("data", {"user": "Alice"})  # Received: {'user': 'Alice'}
emitter.emit("error", "timeout")          # Error: timeout

emitter.off("data", on_data)
emitter.emit("data", "ignored")           # (kuch nahi)
```
</details>
