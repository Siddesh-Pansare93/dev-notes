# 06 - Functions

## Coming from Node.js/TypeScript

Functions in Python are first-class objects, just like in JavaScript. The big differences: `def` instead of `function`, indentation instead of braces, and Python's parameter system is far more powerful -- with keyword arguments, `*args`, `**kwargs`, and positional-only parameters.

---

## Defining Functions

### Basic Syntax

```python
def greet(name):
    """Return a greeting string."""    # docstring (like JSDoc)
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
- `def` keyword instead of `function`
- Colon `:` after the signature
- Indentation defines the body
- **Docstrings** (triple-quoted first line) serve as built-in documentation
- No braces, no semicolons

### Docstrings

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

# Access the docstring
print(calculate_bmi.__doc__)
help(calculate_bmi)          # formatted display
```

---

## Parameters and Arguments

### Positional and Keyword Arguments

Python distinguishes between positional and keyword arguments. This does not exist in JavaScript.

```python
def create_user(name, age, city="Unknown"):
    return {"name": name, "age": age, "city": city}

# Positional arguments (order matters)
create_user("Alice", 30, "NYC")

# Keyword arguments (order doesn't matter)
create_user(age=30, name="Alice", city="NYC")

# Mix positional and keyword
create_user("Alice", 30, city="NYC")

# RULE: positional args must come before keyword args
# create_user(name="Alice", 30)   # SyntaxError!
```

```javascript
// JS doesn't have keyword arguments. The pattern is:
function createUser(name, age, city = "Unknown") {
    return { name, age, city };
}
// Or with an options object:
function createUser({ name, age, city = "Unknown" }) {
    return { name, age, city };
}
createUser({ name: "Alice", age: 30, city: "NYC" });
```

### Default Parameters

```python
def connect(host="localhost", port=5432, timeout=30, ssl=False):
    print(f"Connecting to {host}:{port} (timeout={timeout}, ssl={ssl})")

# Skip some defaults using keyword arguments
connect(ssl=True)                          # all defaults except ssl
connect("prod-server", ssl=True)           # change host and ssl
connect(port=3306, host="db.example.com")  # any order for keyword args

# GOTCHA: Mutable default arguments!
def add_item(item, lst=[]):     # BUG! Default list is shared across calls
    lst.append(item)
    return lst

print(add_item("a"))    # ['a']
print(add_item("b"))    # ['a', 'b'] -- unexpected! Same list!

# The fix: use None as sentinel
def add_item(item, lst=None):
    if lst is None:
        lst = []
    lst.append(item)
    return lst
```

```javascript
// JS has the same default parameter syntax
function connect(host = "localhost", port = 5432) { ... }
// JS doesn't have the mutable default bug since defaults are evaluated each call
```

**Critical difference:** In Python, default values are evaluated ONCE when the function is defined, not each time it is called. Mutable defaults (lists, dicts, sets) are a classic Python gotcha.

### *args -- Variable Positional Arguments

Like JavaScript's rest parameters (`...args`), but Python uses `*`.

```python
def sum_all(*numbers):
    """Accept any number of positional arguments."""
    print(type(numbers))     # <class 'tuple'>
    return sum(numbers)

print(sum_all(1, 2, 3))          # 6
print(sum_all(1, 2, 3, 4, 5))    # 15

# Combine with regular parameters
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

This has NO JavaScript equivalent. It collects all extra keyword arguments into a dictionary.

```python
def create_element(tag, **attributes):
    """Create an HTML element with arbitrary attributes."""
    print(type(attributes))  # <class 'dict'>
    attrs = " ".join(f'{k}="{v}"' for k, v in attributes.items())
    return f"<{tag} {attrs}></{tag}>" if attrs else f"<{tag}></{tag}>"

print(create_element("div", id="main", class_="container"))
# <div id="main" class_="container"></div>

print(create_element("input", type="text", name="email", required="true"))
# <input type="text" name="email" required="true"></input>
```

### Combining All Parameter Types

```python
# The full parameter order:
def full_example(
    pos_only,        # positional-only (before /)
    /,               # separator: everything before is positional-only
    normal,          # normal (positional or keyword)
    *,               # separator: everything after is keyword-only
    kw_only,         # keyword-only (after *)
    **kwargs         # remaining keyword args
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

Force callers to use keyword syntax by placing parameters after `*`.

```python
def fetch(url, *, method="GET", headers=None, timeout=30):
    """Parameters after * MUST be passed as keywords."""
    print(f"{method} {url} (timeout={timeout})")

fetch("https://api.example.com")                          # OK
fetch("https://api.example.com", method="POST")            # OK
# fetch("https://api.example.com", "POST")                 # TypeError!
```

### Unpacking Arguments

```python
# Unpack a list/tuple as positional args
def add(a, b, c):
    return a + b + c

numbers = [1, 2, 3]
print(add(*numbers))    # 6 (same as add(1, 2, 3))

# Unpack a dict as keyword args
config = {"host": "localhost", "port": 5432, "ssl": True}
# connect(**config)  # same as connect(host="localhost", port=5432, ssl=True)

# Combine
args = [1, 2]
kwargs = {"c": 3}
print(add(*args, **kwargs))  # 6
```

```javascript
// JS spread
const numbers = [1, 2, 3];
add(...numbers);  // JS only has positional spread
```

---

## Return Values

### Single and Multiple Returns

```python
# Single return
def double(x):
    return x * 2

# No return statement (or bare return) returns None
def greet(name):
    print(f"Hello, {name}")
    # implicitly returns None

result = greet("Alice")
print(result)    # None

# Multiple return values (actually returns a tuple)
def divide(a, b):
    quotient = a // b
    remainder = a % b
    return quotient, remainder    # returns a tuple

q, r = divide(17, 5)            # unpack the tuple
print(f"17 / 5 = {q} remainder {r}")

result = divide(17, 5)          # or keep as tuple
print(result)                    # (3, 2)
print(type(result))              # <class 'tuple'>

# Return a dict for named results (common pattern)
def analyze_text(text):
    words = text.split()
    return {
        "word_count": len(words),
        "char_count": len(text),
        "avg_word_length": sum(len(w) for w in words) / len(words) if words else 0,
    }
```

```javascript
// JS can only return one value. Multiple returns use objects/arrays:
function divide(a, b) {
    return { quotient: Math.floor(a / b), remainder: a % b };
}
const { quotient, remainder } = divide(17, 5);
```

---

## Lambda Functions

Lambdas are anonymous, single-expression functions. They are more limited than JS arrow functions.

```python
# Lambda syntax: lambda parameters: expression
double = lambda x: x * 2
add = lambda x, y: x + y
greet = lambda name: f"Hello, {name}!"

print(double(5))       # 10
print(add(3, 4))       # 7

# Lambdas are most useful as inline callbacks
numbers = [5, 2, 8, 1, 9]
sorted(numbers, key=lambda x: -x)            # [9, 8, 5, 2, 1]

users = [{"name": "Bob", "age": 25}, {"name": "Alice", "age": 30}]
sorted(users, key=lambda u: u["name"])        # sorted by name

# Lambda limitations (vs JS arrow functions):
# - Only a SINGLE expression (no statements, no multiple lines)
# - No assignments, no if/else statements (but conditional expressions work)
# - No type hints

# This is NOT valid:
# bad = lambda x: if x > 0: return x  # SyntaxError

# But conditional expressions are valid:
absolute = lambda x: x if x >= 0 else -x
```

```javascript
// JS arrow functions are more flexible
const double = x => x * 2;              // single expression
const process = x => {                  // multi-line with statements
    if (x > 0) return x;
    return -x;
};
```

**Rule of thumb:** If a lambda does not fit on one line or is hard to read, use `def` instead.

---

## Type Hints

Python type hints look like TypeScript annotations but are NOT enforced at runtime. They are for documentation and static analysis tools (mypy, pyright).

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"

def add(a: int, b: int) -> int:
    return a + b

def process_items(items: list[str], limit: int = 10) -> dict[str, int]:
    return {item: len(item) for item in items[:limit]}

# Optional (can be None)
from typing import Optional
def find_user(user_id: int) -> Optional[dict]:      # dict or None
    pass

# Python 3.10+ union syntax
def find_user(user_id: int) -> dict | None:          # same as above
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

# These are just hints -- Python does NOT check them at runtime!
greet(42)    # No error at runtime, just returns "Hello, 42!"
```

```typescript
// TypeScript -- enforced at compile time
function greet(name: string): string {
    return `Hello, ${name}!`;
}
greet(42);   // Compile error!
```

---

## Closures and Scope

Closures work similarly in Python and JavaScript, with a few differences.

### LEGB Scope Rule

Python resolves names using LEGB: Local, Enclosing, Global, Built-in.

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

```python
def make_multiplier(factor):
    """Return a function that multiplies by factor."""
    def multiply(x):
        return x * factor    # factor is captured from enclosing scope
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)
print(double(5))    # 10
print(triple(5))    # 15

# Closure with state
def make_counter(start=0):
    count = start
    def increment():
        nonlocal count       # needed to modify enclosing variable
        count += 1
        return count
    return increment

counter = make_counter()
print(counter())    # 1
print(counter())    # 2
print(counter())    # 3
```

### nonlocal and global

```python
# Without nonlocal, you cannot MODIFY an enclosing variable
def outer():
    count = 0
    def inner():
        # count += 1         # UnboundLocalError! Python thinks count is local
        nonlocal count        # tells Python to look in enclosing scope
        count += 1
        return count
    return inner

# global keyword (generally avoided)
total = 0
def add_to_total(n):
    global total              # modifies the global variable
    total += n

add_to_total(5)
print(total)    # 5
```

```javascript
// JS closures work similarly but without the nonlocal issue
function makeCounter() {
    let count = 0;
    return () => ++count;    // can modify count directly
}
```

---

## First-Class Functions

Functions are objects in Python. They can be passed around, stored in variables, and inspected.

```python
# Assign to variable
def shout(text):
    return text.upper()

yell = shout           # no parentheses -- assigning the function itself
print(yell("hello"))   # "HELLO"

# Pass as argument
def apply_twice(func, value):
    return func(func(value))

print(apply_twice(shout, "hello"))   # "HELLO" (already upper, so no visible change)
print(apply_twice(lambda x: x + "!", "hello"))  # "hello!!"

# Store in data structures
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
print(shout.__doc__)             # None (we didn't add a docstring)

# Higher-order functions
numbers = [1, -2, 3, -4, 5]
positives = list(filter(lambda x: x > 0, numbers))   # [1, 3, 5]
doubled = list(map(lambda x: x * 2, numbers))         # [2, -4, 6, -8, 10]

from functools import reduce
total = reduce(lambda a, b: a + b, numbers)            # 3

# But prefer comprehensions over map/filter in Python:
positives = [x for x in numbers if x > 0]             # more Pythonic
doubled = [x * 2 for x in numbers]                     # more Pythonic
```

---

## Decorators (Brief Introduction)

Decorators are functions that wrap other functions. They are heavily used in Python frameworks (Flask, Django, FastAPI).

```python
import time

def timer(func):
    """Decorator that times function execution."""
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} took {end - start:.4f} seconds")
        return result
    return wrapper

@timer
def slow_function(n):
    """Simulate a slow operation."""
    total = sum(range(n))
    return total

result = slow_function(10_000_000)
# slow_function took 0.2345 seconds

# @timer is equivalent to:
# slow_function = timer(slow_function)
```

```javascript
// JS decorators (Stage 3 proposal, or TypeScript experimental)
// Python decorators are a well-established language feature
```

---

## Summary: Functions Comparison

| Feature                  | Python                           | JavaScript                       |
|--------------------------|----------------------------------|----------------------------------|
| Define function          | `def func():`                    | `function func() {}` / `() => {}` |
| Lambda                   | `lambda x: x * 2`               | `x => x * 2`                     |
| Default params           | `def f(x=10):`                   | `function f(x = 10) {}`          |
| Rest params              | `def f(*args):`                  | `function f(...args) {}`          |
| Keyword args             | `f(key=value)`                   | `f({key: value})` (convention)    |
| **kwargs                 | `def f(**kwargs):`               | No equivalent                     |
| Keyword-only             | `def f(*, key):`                 | No equivalent                     |
| Multiple returns         | `return a, b` (tuple)            | `return {a, b}` (object)         |
| Type hints               | `def f(x: int) -> str:`         | TypeScript: `(x: number): string` |
| Docstrings               | `"""docs"""`                     | `/** JSDoc */`                    |
| Closure modification     | Needs `nonlocal`                 | Direct access                     |
| Decorators               | `@decorator`                     | TC39 Stage 3 proposal             |

---

## Practice Exercises

### Exercise 1: Flexible Calculator
Write a `calculate` function that takes two numbers and a variable number of operations to apply sequentially.

```python
def calculate(a, b, *operations):
    pass

print(calculate(10, 3, "add"))              # 13
print(calculate(10, 3, "add", "multiply"))  # 30 (10+3=13, 13*3=39... hmm)
# Define the behavior clearly and implement it
```

<details>
<summary>Solution</summary>

```python
def calculate(initial, *operations, **constants):
    """
    Apply operations sequentially to an initial value.
    Operations are (operator, operand) tuples or just operator strings
    that use the 'by' constant.
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
Write a decorator `retry` that re-runs a function up to `n` times if it raises an exception, with an optional delay between retries.

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
        @functools.wraps(func)   # preserves __name__, __doc__
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
Create a `pipe` function that composes multiple functions left-to-right (like Unix pipes or RxJS pipe).

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
    """Create a pipeline of functions, applied left to right."""
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
Write a `memoize` decorator that caches function results based on arguments. Handle both positional and keyword arguments.

```python
def memoize(func):
    pass

@memoize
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(100))  # should be fast with memoization
```

<details>
<summary>Solution</summary>

```python
import functools

def memoize(func):
    cache = {}

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Create a hashable key from args and kwargs
        key = (args, tuple(sorted(kwargs.items())))
        if key not in cache:
            cache[key] = func(*args, **kwargs)
        return cache[key]

    wrapper.cache = cache          # expose cache for inspection
    wrapper.cache_clear = cache.clear  # allow clearing
    return wrapper

@memoize
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(100))   # 354224848179261915075 (instant!)
print(f"Cache size: {len(fibonacci.cache)}")  # 101

# Note: Python has this built-in!
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
Build a simple event emitter class using functions as first-class citizens. Support `on`, `off`, `emit`, and `once`.

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
        return self   # allow chaining

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
        for callback in self._listeners[event][:]:  # copy list to allow modification
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
emitter.emit("connect")     # (nothing -- once handler removed)
emitter.emit("data", {"user": "Alice"})  # Received: {'user': 'Alice'}
emitter.emit("error", "timeout")          # Error: timeout

emitter.off("data", on_data)
emitter.emit("data", "ignored")           # (nothing)
```
</details>
