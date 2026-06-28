# 05 - Control Flow

## Coming from Node.js/TypeScript

The logic is the same, but the syntax is radically different. No braces, no parentheses around conditions, and indentation is not optional -- it IS the block structure. Python also has some unique features like `elif`, `else` on loops, the walrus operator, and `match-case`.

---

## if / elif / else

### Basic Syntax

```python
age = 25

if age >= 18:
    print("Adult")
elif age >= 13:
    print("Teenager")
else:
    print("Child")
```

```javascript
// JS equivalent
if (age >= 18) {
    console.log("Adult");
} else if (age >= 13) {
    console.log("Teenager");
} else {
    console.log("Child");
}
```

Key differences:
- **No parentheses** around the condition (they are allowed but not idiomatic)
- **Colon** `:` after the condition
- **Indentation** defines the block (4 spaces is standard, not tabs)
- `elif` not `else if`

### Truthy and Falsy Values

```python
# Falsy values in Python:
# False, 0, 0.0, 0j, "", [], (), {}, set(), None, range(0)

# Common patterns
name = ""
if name:
    print(f"Hello, {name}")
else:
    print("Name is empty")

items = []
if not items:
    print("List is empty")

# Check for None specifically
value = None
if value is None:
    print("No value provided")

# Don't do this:
if value == None:     # works but is wrong style
    pass
```

### Combining Conditions

```python
age = 25
has_id = True
is_member = False

# and, or, not (not &&, ||, !)
if age >= 18 and has_id:
    print("Can enter")

if is_member or age >= 21:
    print("Gets discount")

if not is_member:
    print("Consider joining")

# Chained comparisons (unique to Python!)
x = 15
if 10 <= x <= 20:           # equivalent to: 10 <= x and x <= 20
    print("In range")

if 0 < x < 100:
    print("Positive and under 100")

# Multiple comparisons
a, b, c = 5, 5, 5
if a == b == c:              # all three are equal
    print("All equal")
```

```javascript
// JS equivalent of chained comparison
if (10 <= x && x <= 20) { ... }
// No shorthand in JS
```

### Ternary Expression

```python
# Python: value_if_true if condition else value_if_false
age = 20
status = "adult" if age >= 18 else "minor"
print(status)    # "adult"

# Can be nested (but avoid for readability)
score = 85
grade = "A" if score >= 90 else "B" if score >= 80 else "C" if score >= 70 else "F"

# Use in f-strings
print(f"You are {'eligible' if age >= 18 else 'not eligible'}")

# Use in function arguments
print(max(0, value) if value is not None else 0)
```

```javascript
// JS ternary
let status = age >= 18 ? "adult" : "minor";
```

**Note:** The Python ternary reads like English: "adult IF age >= 18 ELSE minor". The JS ternary puts the condition first.

---

## for Loops

### Iterating Over Sequences

Python's `for` loop is like JS's `for...of`. There is NO traditional C-style `for(i=0; i<n; i++)` in Python.

```python
# Iterate over a list
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(fruit)

# Iterate over a string
for char in "hello":
    print(char)

# Iterate over a dict
user = {"name": "Alice", "age": 30}
for key in user:                    # iterates over keys
    print(f"{key}: {user[key]}")

for key, value in user.items():     # iterates over key-value pairs
    print(f"{key}: {value}")

# Iterate over a set
for item in {1, 2, 3}:
    print(item)
```

```javascript
// JS for...of
for (let fruit of fruits) { ... }
for (let char of "hello") { ... }
for (let [key, value] of Object.entries(user)) { ... }
```

### range() -- Generating Number Sequences

`range()` replaces C-style for loops. It generates numbers lazily (does not create a list in memory).

```python
# range(stop) -- 0 to stop-1
for i in range(5):
    print(i)          # 0, 1, 2, 3, 4

# range(start, stop) -- start to stop-1
for i in range(2, 7):
    print(i)          # 2, 3, 4, 5, 6

# range(start, stop, step)
for i in range(0, 20, 3):
    print(i)          # 0, 3, 6, 9, 12, 15, 18

# Counting down
for i in range(10, 0, -1):
    print(i)          # 10, 9, 8, 7, 6, 5, 4, 3, 2, 1

# Common pattern: iterate with index
fruits = ["apple", "banana", "cherry"]
for i in range(len(fruits)):
    print(f"{i}: {fruits[i]}")

# Better: use enumerate!
for i, fruit in enumerate(fruits):
    print(f"{i}: {fruit}")

for i, fruit in enumerate(fruits, start=1):
    print(f"{i}. {fruit}")      # 1. apple, 2. banana, 3. cherry
```

```javascript
// JS equivalents
for (let i = 0; i < 5; i++) { ... }
for (let i = 2; i < 7; i++) { ... }
for (let i = 0; i < 20; i += 3) { ... }
for (let i = 10; i > 0; i--) { ... }
fruits.forEach((fruit, i) => console.log(`${i}: ${fruit}`));
```

### Useful Iteration Tools

```python
# zip -- iterate over multiple sequences in parallel
names = ["Alice", "Bob", "Charlie"]
scores = [95, 87, 92]

for name, score in zip(names, scores):
    print(f"{name}: {score}")

# zip with different lengths (stops at shortest)
for a, b in zip([1, 2, 3], ["a", "b"]):
    print(a, b)    # prints 1 a and 2 b only

# zip_longest to pad with a fill value
from itertools import zip_longest
for a, b in zip_longest([1, 2, 3], ["a", "b"], fillvalue="?"):
    print(a, b)    # 1 a, 2 b, 3 ?

# reversed -- iterate backwards
for fruit in reversed(fruits):
    print(fruit)

# sorted -- iterate in sorted order
for fruit in sorted(fruits):
    print(fruit)

for fruit in sorted(fruits, key=len, reverse=True):
    print(fruit)    # longest first
```

---

## while Loops

```python
# Basic while
count = 0
while count < 5:
    print(count)
    count += 1

# Input validation loop
while True:
    response = input("Enter 'yes' or 'no': ")
    if response in ("yes", "no"):
        break
    print("Invalid input, try again.")

# Countdown
import time
countdown = 5
while countdown > 0:
    print(countdown)
    countdown -= 1
    # time.sleep(1)   # uncomment for real countdown
print("Go!")
```

### break and continue

```python
# break -- exit the loop immediately
for num in range(100):
    if num > 10:
        break
    print(num)         # 0 through 10

# continue -- skip to next iteration
for num in range(10):
    if num % 2 == 0:
        continue
    print(num)         # 1, 3, 5, 7, 9

# Real-world example: processing lines
lines = ["# comment", "data1", "", "data2", "# another comment", "data3"]
for line in lines:
    if not line or line.startswith("#"):
        continue
    print(f"Processing: {line}")
```

### else on Loops (Unique to Python!)

The `else` clause on a loop runs when the loop completes **without** hitting a `break`. This is one of Python's most misunderstood features.

```python
# else runs when the loop finishes normally (no break)
for n in range(2, 10):
    for x in range(2, n):
        if n % x == 0:
            print(f"{n} = {x} * {n // x}")
            break
    else:
        # This runs if the inner for loop did NOT break
        print(f"{n} is prime")

# Output:
# 2 is prime
# 3 is prime
# 4 = 2 * 2
# 5 is prime
# 6 = 2 * 3
# 7 is prime
# 8 = 2 * 4
# 9 = 3 * 3

# Search pattern: find an item or take a default action
items = ["apple", "banana", "cherry"]
target = "mango"

for item in items:
    if item == target:
        print(f"Found {target}!")
        break
else:
    print(f"{target} not found.")   # prints "mango not found."

# Think of it as "for...else" = "for...no-break"
```

```javascript
// JS has no equivalent. You'd use a flag variable:
let found = false;
for (let item of items) {
    if (item === target) {
        console.log(`Found ${target}!`);
        found = true;
        break;
    }
}
if (!found) {
    console.log(`${target} not found.`);
}
```

---

## match-case (Python 3.10+)

Structural pattern matching. More powerful than JS `switch` -- it can match patterns, destructure, and bind variables.

### Basic Usage

```python
status_code = 404

match status_code:
    case 200:
        print("OK")
    case 301 | 302:                    # OR pattern
        print("Redirect")
    case 404:
        print("Not Found")
    case 500:
        print("Server Error")
    case _:                             # default (like JS default:)
        print(f"Unknown status: {status_code}")
```

```javascript
// JS switch
switch (statusCode) {
    case 200:
        console.log("OK");
        break;                          // must remember break!
    case 301:
    case 302:
        console.log("Redirect");
        break;
    case 404:
        console.log("Not Found");
        break;
    default:
        console.log(`Unknown: ${statusCode}`);
}
```

**Key differences from JS switch:**
- No `break` needed (no fall-through)
- `_` is the wildcard/default (like `default:`)
- `|` for multiple values (instead of stacking `case` statements)

### Pattern Matching with Destructuring

This is where `match-case` truly shines compared to JS switch.

```python
# Match on structure
def process_command(command):
    match command.split():
        case ["quit"]:
            print("Quitting...")
        case ["go", direction]:
            print(f"Going {direction}")
        case ["pick", "up", item]:
            print(f"Picking up {item}")
        case ["attack", *targets]:
            print(f"Attacking: {', '.join(targets)}")
        case _:
            print(f"Unknown command: {command}")

process_command("quit")             # Quitting...
process_command("go north")         # Going north
process_command("pick up sword")    # Picking up sword
process_command("attack dragon goblin")  # Attacking: dragon, goblin

# Match on type and structure
def describe(value):
    match value:
        case int(n) if n > 0:
            print(f"Positive integer: {n}")
        case int(n):
            print(f"Non-positive integer: {n}")
        case str(s) if len(s) > 10:
            print(f"Long string: {s[:10]}...")
        case str(s):
            print(f"Short string: {s}")
        case [x, y]:
            print(f"Two-element list: {x}, {y}")
        case {"name": name, "age": age}:
            print(f"Person: {name}, age {age}")
        case _:
            print(f"Something else: {value}")

describe(42)                          # Positive integer: 42
describe(-5)                          # Non-positive integer: -5
describe("hello")                     # Short string: hello
describe("a very long string here")   # Long string: a very lon...
describe([1, 2])                      # Two-element list: 1, 2
describe({"name": "Alice", "age": 30, "extra": "ignored"})  # Person: Alice, age 30
```

### Guards

```python
# Add conditions to patterns with 'if'
def classify_age(age):
    match age:
        case n if n < 0:
            return "Invalid"
        case n if n < 13:
            return "Child"
        case n if n < 18:
            return "Teenager"
        case n if n < 65:
            return "Adult"
        case _:
            return "Senior"
```

---

## The Walrus Operator `:=` (Python 3.8+)

The walrus operator assigns a value to a variable as part of an expression. It is like assignment within a condition.

```python
# Without walrus operator
line = input("Enter something: ")
while line != "quit":
    print(f"You said: {line}")
    line = input("Enter something: ")

# With walrus operator -- avoids code duplication
while (line := input("Enter something: ")) != "quit":
    print(f"You said: {line}")

# In if statements
import re
text = "My phone is 555-1234"
if match := re.search(r"\d{3}-\d{4}", text):
    print(f"Found phone: {match.group()}")

# In list comprehensions (filter and use computed value)
data = [1, 5, 12, 3, 8, 15, 2]
# Get values where the square root is > 3
import math
results = [
    (x, sqrt)
    for x in data
    if (sqrt := math.sqrt(x)) > 3
]
print(results)  # [(12, 3.464...), (15, 3.872...)]

# Reading a file in chunks
# with open("large_file.txt") as f:
#     while chunk := f.read(8192):
#         process(chunk)
```

```javascript
// JS doesn't have a walrus operator, but you can assign in conditions:
let match;
if (match = text.match(/\d{3}-\d{4}/)) {
    console.log(`Found: ${match[0]}`);
}
// But this is generally discouraged in JS
```

---

## Comprehensions as Control Flow (Brief)

List comprehensions combine loops and conditions into expressions. Full coverage in `10_comprehensions.md`.

```python
# Filter + transform in one line
numbers = range(20)
even_squares = [x ** 2 for x in numbers if x % 2 == 0]
# [0, 4, 16, 36, 64, 100, 144, 196, 256, 324]

# Conditional expression in comprehension
labels = ["even" if x % 2 == 0 else "odd" for x in range(5)]
# ['even', 'odd', 'even', 'odd', 'even']
```

---

## Common Patterns

### Early Return Instead of Deep Nesting

```python
# Bad: deep nesting
def process_order(order):
    if order is not None:
        if order.get("items"):
            if order.get("payment"):
                if order["payment"].get("verified"):
                    return "Processing order"
    return "Invalid order"

# Good: early returns (guard clauses)
def process_order(order):
    if order is None:
        return "Invalid order"
    if not order.get("items"):
        return "Invalid order"
    if not order.get("payment"):
        return "Invalid order"
    if not order["payment"].get("verified"):
        return "Invalid order"
    return "Processing order"
```

### Dictionary Dispatch (Alternative to Long if/elif)

```python
# Instead of long if/elif chains:
def handle_action_if(action, data):
    if action == "create":
        return create_item(data)
    elif action == "read":
        return read_item(data)
    elif action == "update":
        return update_item(data)
    elif action == "delete":
        return delete_item(data)
    else:
        raise ValueError(f"Unknown action: {action}")

# Use a dict dispatch:
def handle_action(action, data):
    handlers = {
        "create": create_item,
        "read": read_item,
        "update": update_item,
        "delete": delete_item,
    }
    handler = handlers.get(action)
    if handler is None:
        raise ValueError(f"Unknown action: {action}")
    return handler(data)
```

```javascript
// JS equivalent
const handlers = {
    create: createItem,
    read: readItem,
    update: updateItem,
    delete: deleteItem,
};
const handler = handlers[action];
if (!handler) throw new Error(`Unknown action: ${action}`);
return handler(data);
```

### Loop with Index Tracking

```python
# Find all indices of a value
def find_all_indices(lst, target):
    return [i for i, val in enumerate(lst) if val == target]

nums = [1, 3, 5, 3, 7, 3, 9]
print(find_all_indices(nums, 3))  # [1, 3, 5]
```

---

## Summary: Control Flow Cheat Sheet

| Feature               | Python                              | JavaScript                        |
|-----------------------|-------------------------------------|-----------------------------------|
| If/else               | `if x: ... elif: ... else:`         | `if (x) { } else if { } else { }` |
| Ternary               | `a if cond else b`                  | `cond ? a : b`                    |
| And/Or/Not            | `and`, `or`, `not`                  | `&&`, `\|\|`, `!`                 |
| For loop              | `for x in iterable:`               | `for (let x of iterable) { }`    |
| Range loop            | `for i in range(n):`               | `for (let i = 0; i < n; i++) { }` |
| While loop            | `while cond:`                       | `while (cond) { }`               |
| Break/continue        | Same keywords                       | Same keywords                     |
| Loop else             | `for/while ... else:`               | No equivalent                     |
| Switch                | `match value: case ...:`            | `switch (value) { case ...: }`   |
| Chained comparison    | `10 <= x <= 20`                     | `10 <= x && x <= 20`             |
| Walrus operator       | `if (n := len(a)) > 10:`            | No direct equivalent              |
| Enumerate             | `for i, x in enumerate(lst):`       | `for (let [i, x] of arr.entries())` |

---

## Practice Exercises

### Exercise 1: FizzBuzz
Classic FizzBuzz: print numbers 1-30. For multiples of 3, print "Fizz". For multiples of 5, print "Buzz". For both, print "FizzBuzz". Do it three ways: (a) if/elif, (b) match-case, (c) one-liner list comprehension.

<details>
<summary>Solution</summary>

```python
# (a) Classic if/elif
for n in range(1, 31):
    if n % 15 == 0:
        print("FizzBuzz")
    elif n % 3 == 0:
        print("Fizz")
    elif n % 5 == 0:
        print("Buzz")
    else:
        print(n)

# (b) match-case
for n in range(1, 31):
    match (n % 3, n % 5):
        case (0, 0):
            print("FizzBuzz")
        case (0, _):
            print("Fizz")
        case (_, 0):
            print("Buzz")
        case _:
            print(n)

# (c) One-liner
print('\n'.join("FizzBuzz" if i%15==0 else "Fizz" if i%3==0 else "Buzz" if i%5==0 else str(i) for i in range(1,31)))
```
</details>

### Exercise 2: Number Guesser
Simulate a number guessing game. Pick a random number 1-100. Give the user 7 guesses with "too high"/"too low" hints. Use a while loop with break and the loop's else clause.

```python
import random
# Your code here
```

<details>
<summary>Solution</summary>

```python
import random

target = random.randint(1, 100)
max_guesses = 7

print("Guess a number between 1 and 100!")
for attempt in range(1, max_guesses + 1):
    guess = int(input(f"Guess {attempt}/{max_guesses}: "))
    if guess == target:
        print(f"Correct! You got it in {attempt} {'guess' if attempt == 1 else 'guesses'}!")
        break
    elif guess < target:
        print("Too low!")
    else:
        print("Too high!")
else:
    # Only runs if the loop completed without break (no correct guess)
    print(f"Out of guesses! The number was {target}.")
```
</details>

### Exercise 3: Pattern Matching Router
Use match-case to implement a simple URL router. Parse paths like `/users/123/posts` into handler calls.

```python
def route(path):
    """Route a URL path to the appropriate handler."""
    parts = path.strip("/").split("/")
    # Use match-case to handle:
    # /                  -> home page
    # /users             -> list users
    # /users/<id>        -> get specific user
    # /users/<id>/posts  -> get user's posts
    # anything else      -> 404
    pass
```

<details>
<summary>Solution</summary>

```python
def route(path):
    parts = path.strip("/").split("/") if path.strip("/") else []

    match parts:
        case []:
            return "Home page"
        case ["users"]:
            return "List all users"
        case ["users", user_id] if user_id.isdigit():
            return f"Get user #{user_id}"
        case ["users", user_id, "posts"] if user_id.isdigit():
            return f"Get posts for user #{user_id}"
        case ["users", user_id, "posts", post_id] if user_id.isdigit() and post_id.isdigit():
            return f"Get post #{post_id} for user #{user_id}"
        case ["api", "v1" | "v2" as version, *rest]:
            return f"API {version} route: /{'/'.join(rest)}"
        case _:
            return f"404 Not Found: {path}"

print(route("/"))                        # Home page
print(route("/users"))                   # List all users
print(route("/users/123"))               # Get user #123
print(route("/users/123/posts"))         # Get posts for user #123
print(route("/users/123/posts/456"))     # Get post #456 for user #123
print(route("/api/v2/data/export"))      # API v2 route: /data/export
print(route("/unknown/path"))            # 404 Not Found: /unknown/path
```
</details>

### Exercise 4: Walrus Operator Practice
Refactor the following code to use the walrus operator where it improves readability.

```python
# Refactor these:
import re

# 1. Check length and use it
data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
n = len(data)
if n > 5:
    print(f"Large dataset: {n} items")

# 2. Check regex match and use groups
text = "Contact: alice@example.com"
match = re.search(r"(\w+)@(\w+\.\w+)", text)
if match:
    print(f"User: {match.group(1)}, Domain: {match.group(2)}")

# 3. Filter with computed values
numbers = [10, 20, 35, 40, 55, 60, 75]
# Get numbers where their hex representation starts with '0x3'
```

<details>
<summary>Solution</summary>

```python
import re

# 1. Walrus in if
data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
if (n := len(data)) > 5:
    print(f"Large dataset: {n} items")

# 2. Walrus with regex
text = "Contact: alice@example.com"
if match := re.search(r"(\w+)@(\w+\.\w+)", text):
    print(f"User: {match.group(1)}, Domain: {match.group(2)}")

# 3. Walrus in comprehension
numbers = [10, 20, 35, 40, 55, 60, 75]
hex_filtered = [
    (n, h)
    for n in numbers
    if (h := hex(n)).startswith("0x3")
]
print(hex_filtered)  # [(53, '0x35'), (55, '0x37')]
# Wait, 53 and 55 aren't in our list. Let's check:
# hex(10)='0xa', hex(20)='0x14', hex(35)='0x23', hex(40)='0x28',
# hex(55)='0x37', hex(60)='0x3c', hex(75)='0x4b'
# So: [(55, '0x37'), (60, '0x3c')]
print(hex_filtered)
```
</details>

### Exercise 5: State Machine
Implement a simple traffic light state machine using a while loop and match-case. The light cycles: green (3 ticks) -> yellow (1 tick) -> red (3 ticks) -> green. Run for 15 ticks.

<details>
<summary>Solution</summary>

```python
def traffic_light_simulation(total_ticks):
    state = "green"
    ticks_in_state = 0
    durations = {"green": 3, "yellow": 1, "red": 3}

    for tick in range(1, total_ticks + 1):
        ticks_in_state += 1

        # Display
        symbols = {"green": "🟢", "yellow": "🟡", "red": "🔴"}
        remaining = durations[state] - ticks_in_state
        print(f"Tick {tick:2d}: {state:6s} (remaining: {remaining})")

        # Transition
        if ticks_in_state >= durations[state]:
            ticks_in_state = 0
            match state:
                case "green":
                    state = "yellow"
                case "yellow":
                    state = "red"
                case "red":
                    state = "green"

traffic_light_simulation(15)
# Tick  1: green  (remaining: 2)
# Tick  2: green  (remaining: 1)
# Tick  3: green  (remaining: 0)
# Tick  4: yellow (remaining: 0)
# Tick  5: red    (remaining: 2)
# Tick  6: red    (remaining: 1)
# Tick  7: red    (remaining: 0)
# Tick  8: green  (remaining: 2)
# ...
```
</details>
