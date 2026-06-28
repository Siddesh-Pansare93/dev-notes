# 03 - Lists and Tuples

## Coming from Node.js/TypeScript

Python lists are essentially JavaScript arrays. Same concept: ordered, mutable, heterogeneous collections. But Python adds tuples (immutable lists with no real JS equivalent) and a slicing system that will change how you think about working with sequences.

---

## Lists = JavaScript Arrays

### Creating Lists

```python
# Creating lists
numbers = [1, 2, 3, 4, 5]
mixed = [1, "hello", True, 3.14, None]      # heterogeneous (like JS)
empty = []
nested = [[1, 2], [3, 4], [5, 6]]

# From other iterables
from_range = list(range(5))                   # [0, 1, 2, 3, 4]
from_string = list("hello")                   # ['h', 'e', 'l', 'l', 'o']
from_tuple = list((1, 2, 3))                  # [1, 2, 3]
```

```javascript
// JS equivalents
let numbers = [1, 2, 3, 4, 5];
let fromRange = Array.from({length: 5}, (_, i) => i);  // [0, 1, 2, 3, 4]
let fromString = Array.from("hello");                   // ['h', 'e', 'l', 'l', 'o']
```

### Accessing Elements

```python
fruits = ["apple", "banana", "cherry", "date", "elderberry"]

# Indexing
fruits[0]          # "apple"
fruits[2]          # "cherry"
fruits[-1]         # "elderberry" (last element)
fruits[-2]         # "date" (second to last)

# Slicing (returns new list)
fruits[1:3]        # ["banana", "cherry"]
fruits[:3]         # ["apple", "banana", "cherry"]
fruits[2:]         # ["cherry", "date", "elderberry"]
fruits[::2]        # ["apple", "cherry", "elderberry"] (every 2nd)
fruits[::-1]       # reversed list

# Length
len(fruits)        # 5
```

```javascript
// JS
fruits[0]                    // "apple"
fruits[fruits.length - 1]   // "elderberry" (no negative indexing)
fruits.at(-1)                // "elderberry" (ES2022)
fruits.slice(1, 3)           // ["banana", "cherry"]
fruits.length                // 5
```

---

## List Methods: Python vs JavaScript

### Adding Elements

```python
fruits = ["apple", "banana"]

# Add to end
fruits.append("cherry")           # ["apple", "banana", "cherry"]

# Add at specific index
fruits.insert(1, "blueberry")     # ["apple", "blueberry", "banana", "cherry"]

# Add multiple elements to end
fruits.extend(["date", "elderberry"])  # appends each element
# OR
fruits += ["fig", "grape"]             # same effect

# GOTCHA: append vs extend
fruits.append(["kiwi", "lemon"])       # adds the LIST as a single element!
# ["apple", ..., ["kiwi", "lemon"]]
```

```javascript
// JS equivalents
fruits.push("cherry");                 // append
fruits.splice(1, 0, "blueberry");     // insert at index
fruits.push(...["date", "elderberry"]); // extend (spread)
fruits = fruits.concat(["fig"]);       // concat returns new array
```

### Removing Elements

```python
fruits = ["apple", "banana", "cherry", "banana", "date"]

# Remove by value (first occurrence)
fruits.remove("banana")       # ["apple", "cherry", "banana", "date"]
# Raises ValueError if not found!

# Remove by index and return the value
last = fruits.pop()           # removes and returns "date"
second = fruits.pop(1)        # removes and returns "cherry"

# Remove by index (no return)
del fruits[0]                 # removes "apple"

# Remove a slice
del fruits[1:3]               # removes elements at index 1 and 2

# Clear all elements
fruits.clear()                # []
```

```javascript
// JS equivalents
let idx = fruits.indexOf("banana");
if (idx !== -1) fruits.splice(idx, 1);  // remove by value

fruits.pop()                  // remove and return last
fruits.splice(1, 1)           // remove at index 1
fruits.length = 0             // clear (or fruits = [])
```

### Searching

```python
fruits = ["apple", "banana", "cherry", "banana"]

# Check membership
"banana" in fruits             # True
"mango" not in fruits          # True

# Find index
fruits.index("banana")        # 1 (first occurrence)
fruits.index("banana", 2)     # 3 (search starting from index 2)
# fruits.index("mango")       # ValueError! Always check 'in' first

# Count occurrences
fruits.count("banana")        # 2
```

```javascript
// JS equivalents
fruits.includes("banana")     // true
fruits.indexOf("banana")      // 1 (-1 if not found, no error)
// No built-in count -- need filter().length
fruits.filter(f => f === "banana").length  // 2
```

### Sorting

```python
numbers = [3, 1, 4, 1, 5, 9, 2, 6]

# Sort in place (modifies the list)
numbers.sort()                 # [1, 1, 2, 3, 4, 5, 6, 9]
numbers.sort(reverse=True)     # [9, 6, 5, 4, 3, 2, 1, 1]

# Return a new sorted list (original unchanged)
original = [3, 1, 4, 1, 5]
new_sorted = sorted(original)           # [1, 1, 3, 4, 5]
print(original)                          # [3, 1, 4, 1, 5] -- unchanged!

# Sort with a key function
words = ["banana", "apple", "cherry", "date"]
words.sort(key=len)                      # ["date", "apple", "banana", "cherry"]
words.sort(key=str.lower)                # case-insensitive sort

# Sort complex objects
users = [
    {"name": "Charlie", "age": 25},
    {"name": "Alice", "age": 30},
    {"name": "Bob", "age": 20},
]
users.sort(key=lambda u: u["age"])       # sort by age
sorted_by_name = sorted(users, key=lambda u: u["name"])  # new list, sorted by name

# Multi-key sorting
from operator import itemgetter
users.sort(key=itemgetter("age", "name"))  # sort by age, then name
```

```javascript
// JS sort
numbers.sort((a, b) => a - b);           // ascending
numbers.sort((a, b) => b - a);           // descending
// JS sort mutates in place and has no built-in sorted()
let newSorted = [...numbers].sort((a, b) => a - b);  // copy + sort

words.sort((a, b) => a.length - b.length);  // sort by length
users.sort((a, b) => a.age - b.age);        // sort by age
```

**Key difference:** Python's `sort()` is stable (equal elements maintain their relative order). JS's `sort()` is also stable in modern engines, but this was not guaranteed before ES2019.

### Reversing

```python
numbers = [1, 2, 3, 4, 5]

# In place
numbers.reverse()              # [5, 4, 3, 2, 1]

# New list
reversed_list = list(reversed(numbers))   # new reversed list
reversed_list = numbers[::-1]             # slicing approach
```

---

## List Slicing In Depth

Slicing works on any sequence (lists, tuples, strings). The syntax is `sequence[start:stop:step]`.

```python
nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

# Basic slicing
nums[2:5]          # [2, 3, 4]
nums[:4]           # [0, 1, 2, 3]
nums[6:]           # [6, 7, 8, 9]
nums[:]            # [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] (shallow copy!)

# Step
nums[::2]          # [0, 2, 4, 6, 8] (every 2nd)
nums[1::2]         # [1, 3, 5, 7, 9] (every 2nd starting at 1)
nums[::3]          # [0, 3, 6, 9]

# Negative step (reverses direction)
nums[::-1]         # [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
nums[7:2:-1]       # [7, 6, 5, 4, 3]

# Slice assignment (modifying a portion of the list)
nums[2:5] = [20, 30, 40]     # replace elements at indices 2, 3, 4
nums[2:5] = [20, 30, 40, 50] # can even change the length!
nums[2:2] = [99, 98]         # insert without removing (empty slice)
```

### Slice Objects

```python
# You can store a slice as a reusable object
first_three = slice(None, 3)     # equivalent to [:3]
every_other = slice(None, None, 2)  # equivalent to [::2]

nums = [0, 1, 2, 3, 4, 5]
nums[first_three]      # [0, 1, 2]
nums[every_other]      # [0, 2, 4]
```

---

## Unpacking (Destructuring)

Python's unpacking is like JS destructuring, with some extra tricks.

```python
# Basic unpacking
a, b, c = [1, 2, 3]
print(a, b, c)          # 1 2 3

# Swap
a, b = b, a

# Ignore values with _
first, _, third = [1, 2, 3]    # _ is convention for "don't care"

# Extended unpacking with * (like JS ...rest)
first, *rest = [1, 2, 3, 4, 5]
print(first)             # 1
print(rest)              # [2, 3, 4, 5]

*beginning, last = [1, 2, 3, 4, 5]
print(beginning)         # [1, 2, 3, 4]
print(last)              # 5

first, *middle, last = [1, 2, 3, 4, 5]
print(first)             # 1
print(middle)            # [2, 3, 4]
print(last)              # 5

# Nested unpacking
(a, b), (c, d) = [1, 2], [3, 4]
print(a, b, c, d)       # 1 2 3 4
```

```javascript
// JS destructuring
let [a, b, c] = [1, 2, 3];
let [first, ...rest] = [1, 2, 3, 4, 5];
// JS cannot put rest in the middle: [first, ...middle, last] is invalid!
```

**Python wins here:** The `*` operator can go anywhere (beginning, middle, end), whereas JS's `...rest` can only be the last element.

---

## Tuples -- Immutable Lists

Tuples are ordered, immutable sequences. Think of them as lists that cannot be changed after creation. JavaScript has no direct equivalent.

### Creating Tuples

```python
# Created with parentheses (or just commas)
point = (3, 4)
rgb = (255, 128, 0)
single = (42,)           # MUST have trailing comma for single-element tuple!
not_a_tuple = (42)        # this is just the integer 42 in parentheses

# Parentheses are optional when unambiguous
point = 3, 4              # also a tuple
a, b = 1, 2               # tuple unpacking

# From other iterables
tuple([1, 2, 3])           # (1, 2, 3)
tuple("hello")             # ('h', 'e', 'l', 'l', 'o')

# Empty tuple
empty = ()
empty = tuple()
```

### Why Use Tuples?

1. **Immutability guarantees:** Once created, it cannot change. Useful for data that should not be modified.
2. **Dictionary keys:** Tuples can be used as dict keys (lists cannot -- they are not hashable).
3. **Function returns:** Functions naturally return tuples for multiple values.
4. **Performance:** Slightly faster than lists, smaller memory footprint.
5. **Signal intent:** Using a tuple tells other developers "this data is fixed."

```python
# Tuples as dict keys (lists would cause TypeError)
locations = {
    (40.7128, -74.0060): "New York",
    (51.5074, -0.1278): "London",
    (35.6762, 139.6503): "Tokyo",
}
print(locations[(40.7128, -74.0060)])  # "New York"

# Multiple return values
def get_user():
    return "Alice", 30, "admin"   # returns a tuple

name, age, role = get_user()       # unpack the tuple

# Immutability
point = (3, 4)
# point[0] = 5   # TypeError: 'tuple' object does not support item assignment
```

### Tuple Methods

Tuples have only two methods (because they are immutable):

```python
t = (1, 2, 3, 2, 4, 2)
t.count(2)         # 3
t.index(2)         # 1 (first occurrence)
```

### Tuple vs List: When to Use Which

| Use a **list** when...                    | Use a **tuple** when...                |
|-------------------------------------------|----------------------------------------|
| The collection will change                | The data is fixed/constant             |
| You need append, remove, sort             | Returning multiple values from a func  |
| Homogeneous data (list of users, etc.)    | Heterogeneous fixed structure (record) |
| Order matters and may change              | Using as a dictionary key              |
| Sequence of similar things                | Named group of related values          |

```python
# List: collection of similar things (will change)
shopping_cart = ["apple", "bread", "milk"]
shopping_cart.append("eggs")

# Tuple: fixed record (won't change)
http_response = (200, "OK", {"Content-Type": "text/html"})
database_row = ("Alice", 30, "alice@example.com")
```

### Named Tuples -- Tuples with Names

For structured data, named tuples give you named fields (like a lightweight class or a TypeScript interface).

```python
from collections import namedtuple

# Define a named tuple type
Point = namedtuple("Point", ["x", "y"])
User = namedtuple("User", "name age email")  # string syntax also works

# Create instances
p = Point(3, 4)
print(p.x, p.y)         # 3 4
print(p[0], p[1])       # 3 4 (still indexable)

user = User("Alice", 30, "alice@example.com")
print(user.name)         # "Alice"
print(user.age)          # 30

# Immutable
# p.x = 5   # AttributeError

# Convert to dict
print(user._asdict())   # {'name': 'Alice', 'age': 30, 'email': 'alice@example.com'}

# Create modified copy
older_user = user._replace(age=31)
```

```typescript
// Closest TS equivalent
interface Point { x: number; y: number; }
interface User { name: string; age: number; email: string; }
// But these are mutable and just types, not runtime constructs
```

For more features, use `typing.NamedTuple` (modern style):

```python
from typing import NamedTuple

class Point(NamedTuple):
    x: float
    y: float
    label: str = "origin"   # default values

p = Point(3.0, 4.0)
print(p.label)       # "origin"
```

---

## List Comprehensions (Preview)

List comprehensions are covered in depth in `10_comprehensions.md`, but here is a quick preview since they are so fundamental.

```python
# Create a list from a transformation
squares = [x ** 2 for x in range(10)]          # [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

# With a filter
evens = [x for x in range(20) if x % 2 == 0]  # [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]

# Transform and filter
words = ["hello", "world", "hi", "python"]
long_upper = [w.upper() for w in words if len(w) > 3]  # ['HELLO', 'WORLD', 'PYTHON']
```

```javascript
// JS equivalents
let squares = Array.from({length: 10}, (_, i) => i ** 2);
// or: [...Array(10)].map((_, i) => i ** 2);

let evens = [...Array(20).keys()].filter(x => x % 2 === 0);

let longUpper = words.filter(w => w.length > 3).map(w => w.toUpperCase());
```

---

## Common List Operations

### Copying Lists

```python
original = [1, 2, [3, 4]]

# Shallow copy (3 ways)
copy1 = original.copy()
copy2 = original[:]
copy3 = list(original)

# All three create shallow copies -- nested objects are shared!
copy1[2].append(5)
print(original)       # [1, 2, [3, 4, 5]] -- original was affected!

# Deep copy
import copy
deep = copy.deepcopy(original)
deep[2].append(6)
print(original)       # [1, 2, [3, 4, 5]] -- original NOT affected
```

```javascript
// JS shallow copy
let copy1 = [...original];
let copy2 = original.slice();
// JS deep copy
let deep = structuredClone(original);
```

### Flattening Nested Lists

```python
nested = [[1, 2], [3, 4], [5, 6]]

# One level of nesting
flat = [item for sublist in nested for item in sublist]
# [1, 2, 3, 4, 5, 6]

# Using itertools for any depth
import itertools
flat = list(itertools.chain.from_iterable(nested))

# For deeply nested, recursive approach
def flatten(lst):
    result = []
    for item in lst:
        if isinstance(item, list):
            result.extend(flatten(item))
        else:
            result.append(item)
    return result

deeply_nested = [1, [2, [3, [4, [5]]]]]
print(flatten(deeply_nested))   # [1, 2, 3, 4, 5]
```

```javascript
// JS flat
nested.flat()       // one level
nested.flat(Infinity)  // any depth
```

### Zipping Lists

```python
names = ["Alice", "Bob", "Charlie"]
ages = [30, 25, 35]
cities = ["NYC", "LA", "Chicago"]

# zip combines corresponding elements
combined = list(zip(names, ages))
# [('Alice', 30), ('Bob', 25), ('Charlie', 35)]

# With three lists
combined = list(zip(names, ages, cities))
# [('Alice', 30, 'NYC'), ('Bob', 25, 'LA'), ('Charlie', 35, 'Chicago')]

# Useful patterns
for name, age in zip(names, ages):
    print(f"{name} is {age}")

# Enumerate -- get index + value (like entries() in JS)
for i, name in enumerate(names):
    print(f"{i}: {name}")

for i, name in enumerate(names, start=1):  # start counting from 1
    print(f"{i}. {name}")
```

```javascript
// JS has no built-in zip
// entries() is similar to enumerate
for (let [i, name] of names.entries()) {
    console.log(`${i}: ${name}`);
}
```

---

## Methods Comparison Table

| Operation              | Python                           | JavaScript                          |
|------------------------|----------------------------------|-------------------------------------|
| Add to end             | `lst.append(x)`                  | `arr.push(x)`                       |
| Add to beginning       | `lst.insert(0, x)`              | `arr.unshift(x)`                    |
| Remove last            | `lst.pop()`                      | `arr.pop()`                         |
| Remove first           | `lst.pop(0)`                     | `arr.shift()`                       |
| Remove at index        | `lst.pop(i)` or `del lst[i]`   | `arr.splice(i, 1)`                 |
| Remove by value        | `lst.remove(x)`                 | `arr.splice(arr.indexOf(x), 1)`    |
| Extend                 | `lst.extend([1,2])`             | `arr.push(...[1,2])`               |
| Concatenate            | `lst1 + lst2`                   | `arr1.concat(arr2)` / `[...a,...b]` |
| Find index             | `lst.index(x)`                  | `arr.indexOf(x)`                    |
| Check membership       | `x in lst`                      | `arr.includes(x)`                   |
| Count                  | `lst.count(x)`                  | `arr.filter(e=>e===x).length`      |
| Sort (in place)        | `lst.sort()`                    | `arr.sort()`                        |
| Sort (new)             | `sorted(lst)`                   | `[...arr].sort()`                   |
| Reverse (in place)     | `lst.reverse()`                 | `arr.reverse()`                     |
| Length                 | `len(lst)`                      | `arr.length`                        |
| Shallow copy           | `lst.copy()` / `lst[:]`        | `[...arr]` / `arr.slice()`         |
| Clear                  | `lst.clear()`                   | `arr.length = 0`                    |
| Map                    | `[f(x) for x in lst]`          | `arr.map(f)`                        |
| Filter                 | `[x for x in lst if cond]`     | `arr.filter(f)`                     |
| Reduce                 | `functools.reduce(f, lst)`      | `arr.reduce(f)`                     |
| Any/Some               | `any(cond for x in lst)`       | `arr.some(f)`                       |
| All/Every              | `all(cond for x in lst)`       | `arr.every(f)`                      |
| Min/Max                | `min(lst)` / `max(lst)`        | `Math.min(...arr)` / `Math.max(...arr)` |
| Sum                    | `sum(lst)`                      | `arr.reduce((a,b)=>a+b, 0)`       |
| Flatten (1 level)      | `[x for s in lst for x in s]` | `arr.flat()`                        |

---

## Practice Exercises

### Exercise 1: List Manipulation
Start with a list of numbers 1-10. Remove all even numbers, double the remaining odds, and reverse the result. Do this in as few lines as possible.

```python
numbers = list(range(1, 11))
# Expected: [18, 14, 10, 6, 2]
```

<details>
<summary>Solution</summary>

```python
numbers = list(range(1, 11))
result = [x * 2 for x in numbers if x % 2 != 0][::-1]
print(result)  # [18, 14, 10, 6, 2]
```
</details>

### Exercise 2: Matrix Operations
Create a 3x3 matrix (list of lists), then write functions to: (a) get a specific row, (b) get a specific column, (c) get the diagonal, (d) transpose the matrix.

```python
matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
]

def get_row(m, r): pass
def get_col(m, c): pass
def get_diagonal(m): pass
def transpose(m): pass
```

<details>
<summary>Solution</summary>

```python
matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
]

def get_row(m, r):
    return m[r]

def get_col(m, c):
    return [row[c] for row in m]

def get_diagonal(m):
    return [m[i][i] for i in range(len(m))]

def transpose(m):
    return [list(row) for row in zip(*m)]

print(get_row(matrix, 1))      # [4, 5, 6]
print(get_col(matrix, 0))      # [1, 4, 7]
print(get_diagonal(matrix))    # [1, 5, 9]
print(transpose(matrix))       # [[1, 4, 7], [2, 5, 8], [3, 6, 9]]
```
</details>

### Exercise 3: Tuple Records
Create a list of student tuples (name, grade, gpa). Write functions to find the student with the highest GPA, all students above a given GPA threshold, and the average GPA. Use named tuples for bonus points.

```python
students = [
    ("Alice", "Senior", 3.9),
    ("Bob", "Junior", 3.2),
    ("Charlie", "Senior", 3.7),
    ("Diana", "Sophomore", 3.95),
    ("Eve", "Junior", 3.5),
]
```

<details>
<summary>Solution</summary>

```python
from collections import namedtuple

Student = namedtuple("Student", "name grade gpa")

students = [
    Student("Alice", "Senior", 3.9),
    Student("Bob", "Junior", 3.2),
    Student("Charlie", "Senior", 3.7),
    Student("Diana", "Sophomore", 3.95),
    Student("Eve", "Junior", 3.5),
]

def highest_gpa(students):
    return max(students, key=lambda s: s.gpa)

def above_threshold(students, threshold):
    return [s for s in students if s.gpa >= threshold]

def average_gpa(students):
    return sum(s.gpa for s in students) / len(students)

print(highest_gpa(students))
# Student(name='Diana', grade='Sophomore', gpa=3.95)

print(above_threshold(students, 3.5))
# [Student(name='Alice',...), Student(name='Charlie',...), Student(name='Diana',...), Student(name='Eve',...)]

print(f"Average GPA: {average_gpa(students):.2f}")
# Average GPA: 3.65
```
</details>

### Exercise 4: Interleave and Chunk
Write two utility functions: (a) `interleave` that merges two lists alternately, and (b) `chunk` that splits a list into groups of n.

```python
def interleave(a, b): pass
# interleave([1,2,3], ['a','b','c']) -> [1, 'a', 2, 'b', 3, 'c']

def chunk(lst, n): pass
# chunk([1,2,3,4,5,6,7], 3) -> [[1,2,3], [4,5,6], [7]]
```

<details>
<summary>Solution</summary>

```python
def interleave(a, b):
    result = []
    for pair in zip(a, b):
        result.extend(pair)
    # Handle remaining elements if lists are different lengths
    longer = a if len(a) > len(b) else b
    result.extend(longer[min(len(a), len(b)):])
    return result

# More Pythonic version:
def interleave_v2(a, b):
    from itertools import zip_longest
    result = []
    sentinel = object()
    for x, y in zip_longest(a, b, fillvalue=sentinel):
        if x is not sentinel:
            result.append(x)
        if y is not sentinel:
            result.append(y)
    return result

def chunk(lst, n):
    return [lst[i:i + n] for i in range(0, len(lst), n)]

print(interleave([1, 2, 3], ['a', 'b', 'c']))
# [1, 'a', 2, 'b', 3, 'c']

print(interleave([1, 2, 3, 4], ['a', 'b']))
# [1, 'a', 2, 'b', 3, 4]

print(chunk([1, 2, 3, 4, 5, 6, 7], 3))
# [[1, 2, 3], [4, 5, 6], [7]]
```
</details>

### Exercise 5: List Rotation
Write a function that rotates a list by `k` positions. Positive `k` rotates right, negative rotates left. Do it without using `collections.deque`.

```python
def rotate(lst, k): pass

print(rotate([1, 2, 3, 4, 5], 2))   # [4, 5, 1, 2, 3]
print(rotate([1, 2, 3, 4, 5], -2))  # [3, 4, 5, 1, 2]
```

<details>
<summary>Solution</summary>

```python
def rotate(lst, k):
    if not lst:
        return lst
    k = k % len(lst)  # handle k > len(lst)
    return lst[-k:] + lst[:-k] if k else lst[:]

print(rotate([1, 2, 3, 4, 5], 2))    # [4, 5, 1, 2, 3]
print(rotate([1, 2, 3, 4, 5], -2))   # [3, 4, 5, 1, 2]
print(rotate([1, 2, 3, 4, 5], 7))    # [4, 5, 1, 2, 3] (7 % 5 = 2)
print(rotate([1, 2, 3, 4, 5], 0))    # [1, 2, 3, 4, 5]
```
</details>
