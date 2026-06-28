# Iterators and Generators

## The Lazy Evaluation Powerhouse

Python's iterator protocol and generators are one of its most powerful features. JavaScript adopted generators from Python (the `function*` syntax), so the concepts will be familiar -- but Python's ecosystem around iteration is far richer.

---

## The Iterator Protocol

In Python, any object that implements `__iter__()` and `__next__()` is an iterator. This is analogous to JavaScript's `Symbol.iterator` protocol.

```python
class Countdown:
    """An iterator that counts down from n to 1."""

    def __init__(self, start: int) -> None:
        self.current = start

    def __iter__(self):
        return self

    def __next__(self) -> int:
        if self.current <= 0:
            raise StopIteration  # Signal "no more items"
        value = self.current
        self.current -= 1
        return value

# Usage
for num in Countdown(5):
    print(num)  # 5, 4, 3, 2, 1

# Manual iteration
counter = Countdown(3)
print(next(counter))  # 3
print(next(counter))  # 2
print(next(counter))  # 1
print(next(counter))  # raises StopIteration
```

```javascript
// JavaScript equivalent
class Countdown {
  constructor(start) {
    this.current = start;
  }

  [Symbol.iterator]() {
    return this;
  }

  next() {
    if (this.current <= 0) {
      return { done: true, value: undefined };
    }
    return { done: false, value: this.current-- };
  }
}

for (const num of new Countdown(5)) {
  console.log(num); // 5, 4, 3, 2, 1
}
```

### Iterable vs Iterator

An important distinction:

```python
# Iterable: has __iter__(), returns an iterator
# Iterator: has __iter__() AND __next__()

class NumberRange:
    """Iterable (not itself an iterator) -- can be iterated multiple times."""

    def __init__(self, start: int, end: int) -> None:
        self.start = start
        self.end = end

    def __iter__(self):
        """Return a new iterator each time."""
        return NumberRangeIterator(self.start, self.end)

class NumberRangeIterator:
    """The actual iterator."""

    def __init__(self, start: int, end: int) -> None:
        self.current = start
        self.end = end

    def __iter__(self):
        return self

    def __next__(self) -> int:
        if self.current >= self.end:
            raise StopIteration
        value = self.current
        self.current += 1
        return value

nums = NumberRange(1, 4)
print(list(nums))  # [1, 2, 3]
print(list(nums))  # [1, 2, 3]  -- works again because __iter__ makes a new iterator
```

---

## Generators with `yield`

Generators are the easy way to create iterators. Instead of writing a class with `__iter__` and `__next__`, you write a function with `yield`.

```python
def countdown(n: int):
    """Generator function -- returns a generator iterator."""
    while n > 0:
        yield n
        n -= 1

# Usage -- identical to using any iterator
for num in countdown(5):
    print(num)  # 5, 4, 3, 2, 1

# It's lazy -- values are produced one at a time
gen = countdown(3)
print(next(gen))  # 3
print(next(gen))  # 2
print(next(gen))  # 1
print(next(gen))  # StopIteration
```

```javascript
// JavaScript equivalent
function* countdown(n) {
  while (n > 0) {
    yield n;
    n--;
  }
}

for (const num of countdown(5)) {
  console.log(num);
}
```

### How Generators Work Under the Hood

When you call a generator function, it does NOT execute the body. It returns a generator object. The body only executes when you call `next()`:

```python
def demo():
    print("Start")
    yield 1
    print("After first yield")
    yield 2
    print("After second yield")
    yield 3
    print("End")

gen = demo()        # Nothing prints yet!
print(next(gen))    # Prints "Start", then yields 1
print(next(gen))    # Prints "After first yield", then yields 2
print(next(gen))    # Prints "After second yield", then yields 3
# next(gen)         # Would print "End", then raise StopIteration
```

### Real-World Generator Examples

```python
# Reading a large file line by line (memory efficient)
def read_lines(filepath: str):
    with open(filepath) as f:
        for line in f:
            yield line.strip()

# Processing only what you need
for line in read_lines("huge_file.txt"):
    if "ERROR" in line:
        print(line)
        break  # Stop early -- no need to read rest of file

# Generating unique IDs
def id_generator(prefix: str = ""):
    counter = 0
    while True:
        counter += 1
        yield f"{prefix}{counter:06d}"

ids = id_generator("USR-")
print(next(ids))  # USR-000001
print(next(ids))  # USR-000002

# Pagination
def paginate(items: list, page_size: int):
    for i in range(0, len(items), page_size):
        yield items[i:i + page_size]

all_users = list(range(100))
for page in paginate(all_users, 10):
    print(f"Page with {len(page)} items: {page[0]}..{page[-1]}")
```

---

## Generator Expressions

Generator expressions are like list comprehensions but lazy. They use parentheses instead of brackets:

```python
# List comprehension -- creates entire list in memory
squares_list = [x**2 for x in range(1_000_000)]  # ~8MB memory

# Generator expression -- produces values on demand
squares_gen = (x**2 for x in range(1_000_000))    # ~100 bytes memory

# Use generators when you just need to iterate
total = sum(x**2 for x in range(1_000_000))  # Parentheses optional in function call

# More examples
even_numbers = (x for x in range(100) if x % 2 == 0)
upper_names = (name.upper() for name in names)
```

```javascript
// JavaScript doesn't have generator expressions
// Closest equivalent: using a generator function
function* squaresGen(n) {
  for (let i = 0; i < n; i++) yield i ** 2;
}
```

### When to Use Which

```python
# Use LIST when you need:
# - Random access (items[5])
# - Length (len(items))
# - Multiple iterations
# - Small data
results = [transform(x) for x in data]

# Use GENERATOR when you need:
# - Single pass iteration
# - Large/infinite data
# - Memory efficiency
# - Pipeline processing
results = (transform(x) for x in huge_data)
```

---

## `yield from`: Delegating Generators

`yield from` delegates iteration to another iterable. It's cleaner than looping and yielding each item individually.

```python
# Without yield from
def flatten(nested: list[list[int]]):
    for sublist in nested:
        for item in sublist:
            yield item

# With yield from -- cleaner
def flatten(nested: list[list[int]]):
    for sublist in nested:
        yield from sublist

print(list(flatten([[1, 2], [3, 4], [5, 6]])))
# [1, 2, 3, 4, 5, 6]

# Composing generators
def evens(n: int):
    yield from (x for x in range(n) if x % 2 == 0)

def odds(n: int):
    yield from (x for x in range(n) if x % 2 != 0)

def all_numbers(n: int):
    yield from evens(n)
    yield from odds(n)

print(list(all_numbers(10)))
# [0, 2, 4, 6, 8, 1, 3, 5, 7, 9]

# Recursive generator -- tree traversal
def walk_tree(node):
    yield node.value
    for child in node.children:
        yield from walk_tree(child)
```

```javascript
// JavaScript equivalent
function* flatten(nested) {
  for (const sublist of nested) {
    yield* sublist; // yield* is like yield from
  }
}
```

---

## The `itertools` Module

`itertools` is Python's standard library module for efficient iterator operations. It's a functional programmer's toolkit for working with sequences.

### Combining Iterables

```python
import itertools

# chain -- concatenate iterables (like [...a, ...b] but lazy)
combined = itertools.chain([1, 2], [3, 4], [5, 6])
print(list(combined))  # [1, 2, 3, 4, 5, 6]

# chain.from_iterable -- flatten one level
nested = [[1, 2], [3, 4], [5, 6]]
flat = itertools.chain.from_iterable(nested)
print(list(flat))  # [1, 2, 3, 4, 5, 6]

# zip_longest -- zip but don't stop at shortest
from itertools import zip_longest
a = [1, 2, 3]
b = ["a", "b"]
print(list(zip_longest(a, b, fillvalue="-")))
# [(1, 'a'), (2, 'b'), (3, '-')]
```

### Infinite Iterators

```python
# count -- infinite counter (0, 1, 2, 3, ...)
for i in itertools.count(start=10, step=2):
    if i > 20:
        break
    print(i)  # 10, 12, 14, 16, 18, 20

# cycle -- repeat an iterable forever
colors = itertools.cycle(["red", "green", "blue"])
for _, color in zip(range(7), colors):
    print(color)  # red, green, blue, red, green, blue, red

# repeat -- repeat a value n times (or forever)
zeros = itertools.repeat(0, times=5)
print(list(zeros))  # [0, 0, 0, 0, 0]
```

### Slicing and Filtering

```python
# islice -- slice an iterator (like array.slice() but for iterables)
first_five = itertools.islice(range(100), 5)
print(list(first_five))  # [0, 1, 2, 3, 4]

middle = itertools.islice(range(100), 10, 15)
print(list(middle))  # [10, 11, 12, 13, 14]

# takewhile -- take items while condition is true
nums = [1, 3, 5, 2, 4, 6]
small = itertools.takewhile(lambda x: x < 5, nums)
print(list(small))  # [1, 3]

# dropwhile -- skip items while condition is true
large = itertools.dropwhile(lambda x: x < 5, nums)
print(list(large))  # [5, 2, 4, 6]

# filterfalse -- opposite of filter
evens = itertools.filterfalse(lambda x: x % 2, range(10))
print(list(evens))  # [0, 2, 4, 6, 8]
```

### Grouping

```python
# groupby -- group consecutive items by key
# IMPORTANT: data must be sorted by the key first!
data = [
    {"dept": "eng", "name": "Alice"},
    {"dept": "eng", "name": "Bob"},
    {"dept": "sales", "name": "Charlie"},
    {"dept": "sales", "name": "Diana"},
    {"dept": "eng", "name": "Eve"},
]

# Sort first!
data.sort(key=lambda x: x["dept"])

for dept, members in itertools.groupby(data, key=lambda x: x["dept"]):
    print(f"{dept}: {[m['name'] for m in members]}")
# eng: ['Alice', 'Bob', 'Eve']
# sales: ['Charlie', 'Diana']
```

### Combinatorics

```python
# product -- cartesian product (nested loops)
colors = ["red", "blue"]
sizes = ["S", "M", "L"]
for combo in itertools.product(colors, sizes):
    print(combo)
# ('red', 'S'), ('red', 'M'), ('red', 'L'),
# ('blue', 'S'), ('blue', 'M'), ('blue', 'L')

# permutations -- all orderings
print(list(itertools.permutations([1, 2, 3])))
# [(1,2,3), (1,3,2), (2,1,3), (2,3,1), (3,1,2), (3,2,1)]

# combinations -- choose r items (no repeats)
print(list(itertools.combinations([1, 2, 3, 4], 2)))
# [(1,2), (1,3), (1,4), (2,3), (2,4), (3,4)]

# combinations_with_replacement
print(list(itertools.combinations_with_replacement([1, 2, 3], 2)))
# [(1,1), (1,2), (1,3), (2,2), (2,3), (3,3)]
```

### Accumulating

```python
# accumulate -- running totals (like Array.reduce but yields each step)
import operator

running_sum = itertools.accumulate([1, 2, 3, 4, 5])
print(list(running_sum))  # [1, 3, 6, 10, 15]

running_max = itertools.accumulate([3, 1, 4, 1, 5, 9], max)
print(list(running_max))  # [3, 3, 4, 4, 5, 9]

running_product = itertools.accumulate([1, 2, 3, 4], operator.mul)
print(list(running_product))  # [1, 2, 6, 24]
```

---

## Memory Comparison: Lists vs Generators

```python
import sys

# List: stores all items in memory
big_list = [x for x in range(1_000_000)]
print(f"List size: {sys.getsizeof(big_list):,} bytes")  # ~8,448,728 bytes

# Generator: stores only the recipe
big_gen = (x for x in range(1_000_000))
print(f"Generator size: {sys.getsizeof(big_gen):,} bytes")  # ~200 bytes

# range object: even more efficient (stores start, stop, step only)
big_range = range(1_000_000)
print(f"Range size: {sys.getsizeof(big_range):,} bytes")  # 48 bytes
```

### Processing Large Files

```python
# BAD: reads entire file into memory
def count_errors_bad(filepath: str) -> int:
    with open(filepath) as f:
        lines = f.readlines()  # All in memory!
    return sum(1 for line in lines if "ERROR" in line)

# GOOD: generator-based, line by line
def count_errors_good(filepath: str) -> int:
    with open(filepath) as f:
        return sum(1 for line in f if "ERROR" in line)

# GOOD: pipeline of generators for complex processing
def process_log(filepath: str):
    with open(filepath) as f:
        lines = (line.strip() for line in f)
        error_lines = (line for line in lines if "ERROR" in line)
        parsed = (parse_log_line(line) for line in error_lines)
        recent = (entry for entry in parsed if entry["timestamp"] > cutoff)
        yield from recent
```

---

## Infinite Generators

```python
# Fibonacci sequence
def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

# Use with islice to take what you need
from itertools import islice
first_ten = list(islice(fibonacci(), 10))
print(first_ten)  # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

# Prime number generator (Sieve-style)
def primes():
    yield 2
    candidate = 3
    found: list[int] = [2]
    while True:
        if all(candidate % p != 0 for p in found):
            found.append(candidate)
            yield candidate
        candidate += 2

# First 20 primes
print(list(islice(primes(), 20)))

# Sensor data simulation
import random
import time

def sensor_readings(sensor_id: str):
    """Simulate infinite stream of sensor data."""
    while True:
        yield {
            "sensor_id": sensor_id,
            "temperature": round(20 + random.gauss(0, 2), 2),
            "humidity": round(50 + random.gauss(0, 5), 2),
            "timestamp": time.time(),
        }
```

---

## Generator `.send()`, `.throw()`, and `.close()`

Generators in Python are actually coroutines -- they can receive values too:

```python
def accumulator():
    """Generator that accumulates values sent to it."""
    total = 0
    while True:
        value = yield total
        if value is None:
            break
        total += value

acc = accumulator()
next(acc)           # Prime the generator (advance to first yield) -> 0
print(acc.send(10)) # 10
print(acc.send(20)) # 30
print(acc.send(5))  # 35
acc.close()         # Clean shutdown

# Running average
def running_average():
    total = 0.0
    count = 0
    average = 0.0
    while True:
        value = yield average
        total += value
        count += 1
        average = total / count

avg = running_average()
next(avg)               # Prime it -> 0.0
print(avg.send(10))     # 10.0
print(avg.send(20))     # 15.0
print(avg.send(30))     # 20.0
```

---

## Practice Exercises

### Exercise 1: Basic Generator
Write a generator `chunked(iterable, size)` that yields chunks of a given size from any iterable. Example:
```python
list(chunked([1, 2, 3, 4, 5, 6, 7], 3))
# [[1, 2, 3], [4, 5, 6], [7]]
```

### Exercise 2: Flatten Deeply Nested
Write a generator `deep_flatten(data)` that recursively flattens arbitrarily nested lists:
```python
list(deep_flatten([1, [2, [3, [4]], 5], [6, 7]]))
# [1, 2, 3, 4, 5, 6, 7]
```

### Exercise 3: Iterator Class
Build a `FileLineIterator` class that:
- Takes a file path in `__init__`
- Implements the iterator protocol
- Yields non-empty, stripped lines
- Properly closes the file when iteration is done (or on garbage collection)

### Exercise 4: Pipeline Processing
Given a list of raw log strings like `"2024-01-15 ERROR: Connection timeout"`, build a processing pipeline using generators:
1. Parse each line into a dict with `date`, `level`, `message`
2. Filter for ERROR level only
3. Group consecutive errors (use a window of 5 seconds)
4. Yield groups as lists

### Exercise 5: itertools Challenges
1. Generate all possible RGB color combinations where each channel is a multiple of 51 (0, 51, 102, 153, 204, 255). Use `itertools.product`.
2. Given a list of numbers, find all unique pairs that sum to a target value. Use `itertools.combinations`.
3. Implement a round-robin scheduler: given multiple task queues, yield one task from each queue in turn. Use `itertools.cycle` and `itertools.chain`.

### Exercise 6: Memory Challenge
Write two versions of a function that processes a CSV file with 1M rows:
- Version 1: Load everything into a list, then process
- Version 2: Use generators for lazy processing
Compare their memory usage using `sys.getsizeof()` or the `tracemalloc` module.
