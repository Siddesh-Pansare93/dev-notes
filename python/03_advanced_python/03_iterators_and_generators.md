# Iterators aur Generators

## Lazy Evaluation ka Powerhouse

Dekho, Python ka iterator protocol aur generators uske sabse powerful features mein se ek hain. JavaScript ne bhi generators Python se hi copy kiye hain (`function*` syntax), toh concepts tumhe familiar lagenge — lekin Python ka pura ecosystem iteration ke around bahut zyada rich hai.

---

## Iterator Protocol

Python mein koi bhi object jo `__iter__()` aur `__next__()` implement karta hai, wo iterator hota hai. Bilkul JavaScript ke `Symbol.iterator` protocol jaisa hi.

Socho ek vending machine — har baar button dabao, ek item bahar aata hai, jab tak stock khatam na ho jaaye. Wahi `__next__()` ka kaam hai — har call pe agla item do, aur jab kuch bacha na ho toh bata do "bas, khatam, aur kuch nahi hai".

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

### Iterable vs Iterator — Difference Kya Hai?

Ye ek important distinction hai jo starting mein confuse karta hai, bilkul zor se:

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

Samjho aise: **Iterable** ek Netflix ka show list hai — jab bhi dekhna ho, fresh se play kar sakte ho. **Iterator** wo cursor hai jo abhi kaunsa episode chal raha hai, wo track karta hai. `NumberRange` har baar ek naya `NumberRangeIterator` banata hai, isliye tum `list(nums)` do baar chala sakte ho aur dono baar same result milega — bilkul jaise show ko phir se shuru se play karna.

---

## Generators with `yield`

Generators, iterators banane ka ek super easy tarika hain. `__iter__` aur `__next__` wali poori class likhne ki jagah, bas ek function likho jisme `yield` keyword ho jaaye.

Ye bilkul dabbawala jaisa hai — wo ek saath sab dabbe deliver nahi karta, ek-ek karke deta hai, jab tumhe chahiye tab. `yield` bhi wahi karta hai — value deta hai, pause ho jaata hai function, aur jab agli baar `next()` call ho, wahin se exactly aage badhta hai.

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

### Generators Andar Se Kaise Kaam Karte Hain?

Ye samjhna zaroori hai — jab tum generator function call karte ho, wo body ko execute NAHI karta bilkul. Sirf ek generator object return hota hai. Asli kaam tabhi shuru hota hai jab tum `next()` call karo:

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

> [!tip]
> Ye samjhna bilkul zaruri hai — `demo()` ko call karna sirf ek "recipe" bana raha hai, khaana bana nahi raha. Actual kaam har `next()` call pe hota hai, ek step aage badha kar.

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

`read_lines` wala example dekho — agar file mein lakhon lines hain aur tumhe "ERROR" milte hi ruk jaana hai, toh generator poori file ko memory mein load hi nahi karega. Bilkul Swiggy order tracking jaisa — tumhe pura delivery history nahi chahiye, bas "abhi kahan hai" — wahi ek update chahiye hoti hai.

---

## Generator Expressions

Generator expressions, list comprehensions jaisi hi syntax hain, lekin lazy hote hain. Square brackets `[]` ki jagah round brackets `()` use hote hain:

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

### Kab Kaunsa Use Karein?

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

> [!info]
> Simple rule: agar tumhe data ko baar-baar access karna hai ya index se pick karna hai (`items[5]` jaisa), list rakho. Agar bas ek baar se seedha guzarna hai (loop karke process karna hai), generator use karo — RAM bahut zyada bachega.

---

## `yield from`: Generators Ko Delegate Karna

`yield from` matlab ek generator apne iteration ko kisi doosre iterable ko delegate kar deta hai. Har item ko manually loop mein yield karne se ye zyada clean aur readable hota hai.

```python
# Without yield from
def flatten(nested: list[list[int]]):
    for sublist in nested:
        for item in sublist:
            yield item

# With yield from -- much cleaner
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

`yield from` ka use case bilkul team lead jaisa hota hai jo apna kaam khud nahi karta, kisi junior developer ko delegate kar deta hai, aur junior ka output seedha aage forward ho jaata hai. Tree traversal wala recursive example dekho — perfect analogy hai company ke org chart traverse karne ka, jahan har manager apne reports ko recursively "yield from" karta hai.

---

## `itertools` Module

`itertools` Python ki standard library ka ek powerful module hai jo efficient iterator operations ke liye banaya gaya hai. Ye bilkul ek functional programmer ka toolkit hai sequences ke saath kaam karne ke liye.

### Iterables Ko Combine Karna

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

`cycle` ko IRCTC ke waiting list token system jaisa socho — red, green, blue baar-baar repeat hote rehte hain, jaise round-robin token allocation hota hai. Bas ek bahut zaroori baatdhyan rakhna — `count` aur `cycle` bina `break` ke infinite chalte rehenge. Real dabba, khaali nahi hota kabhi!

### Slicing aur Filtering

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

> [!warning]
> `groupby` sirf **consecutive** (lagatar aane wale) items ko group karta hai — SQL ke `GROUP BY` jaisa poora scan karke group nahi karta. Isliye sort karna zaruri hai pehle, warna galat groups milenge. Agar "eng" beech mein phir se aa jaaye, toh do alag groups ban jaayenge, ek group nahi.

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

Ye `product` wala example bilkul Flipkart pe T-shirt select karne jaisa hai — agar 2 colors aur 3 sizes hain, toh total combinations 2×3 = 6 banti hain, exactly jaise dropdown mein har color-size ka pair dikhta hai.

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

Ye bilkul tumhare UPI wallet ka running balance jaisa hai — har transaction ke baad ek naya total dikhta hai, sirf final balance nahi. Har step visible hota hai.

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

Numbers dekho — list **8 MB** khaati hai, generator sirf **200 bytes**! Ye farak bohot bada hai. Socho aise: list ek pura tiffin box hai jisme sab kuch pehle se pack hai, generator ek recipe card hai jo batata hai "kaise banana hai", jab zarurat ho tab bana lo.

### Bade Files Process Karna

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

`process_log` wala pipeline dekho — ye Zomato order pipeline jaisa hai: order aata hai → restaurant ko forward hota hai → cook hota hai → deliver hota hai. Har stage apna kaam karke agli stage ko pass kar deti hai, poora batch ek saath process nahi hota. Isse memory bahut zyada bachta hai aur code bhi readable rehta hai.

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

> [!warning]
> Infinite generators ko kabhi seedha `list()` mein wrap mat karna — RAM khatam ho jaayega aur program hang ho jaayega. Hamesha `islice` ya kisi `break` condition ke saath use karo, jaise upar `fibonacci()` aur `primes()` mein dikhaya hai.

`sensor_readings` wala example socho ek smart AC ka temperature sensor jo continuously data bhejta rehta hai — kabhi rukta nahi, jab tak tum khud "bas, enough" na bolo.

---

## Generator `.send()`, `.throw()`, aur `.close()`

Python ke generators actually coroutines hote hain — inme values bhi bheji ja sakti hain, sirf values nikali nahi jaathin:

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

> [!tip]
> `.send()` use karne se pehle generator ko "prime" karna zaruri hai — matlab ek baar `next()` call karke usse pehle `yield` tak pahunchana. Bina prime kiye `.send()` call karoge toh error milega. Isko aise socho — pehle "hello, main tayyar hoon" sun lo, tabhi conversation aage badhega.

---

## Practice Exercises

### Exercise 1: Basic Generator
`chunked(iterable, size)` naam ka generator likho jo kisi bhi iterable se diye gaye size ke chunks yield kare. Example:
```python
list(chunked([1, 2, 3, 4, 5, 6, 7], 3))
# [[1, 2, 3], [4, 5, 6], [7]]
```

### Exercise 2: Flatten Deeply Nested
`deep_flatten(data)` naam ka generator likho jo arbitrarily nested lists ko recursively flatten kare:
```python
list(deep_flatten([1, [2, [3, [4]], 5], [6, 7]]))
# [1, 2, 3, 4, 5, 6, 7]
```

### Exercise 3: Iterator Class
`FileLineIterator` class banao jo:
- `__init__` mein ek file path le
- Iterator protocol implement kare
- Non-empty, stripped lines yield kare
- Iteration khatam hone (ya garbage collection) pe file ko properly close kare

### Exercise 4: Pipeline Processing
Raw log strings ki list di gayi hai jaise `"2024-01-15 ERROR: Connection timeout"`, generators use karke ek processing pipeline banao:
1. Har line ko `date`, `level`, `message` wale dict mein parse karo
2. Sirf ERROR level ke liye filter karo
3. Consecutive errors ko group karo (5 second ki window use karke)
4. Groups ko lists ke roop mein yield karo

### Exercise 5: itertools Challenges
1. Saare possible RGB color combinations generate karo jahan har channel 51 ka multiple ho (0, 51, 102, 153, 204, 255). `itertools.product` use karo.
2. Numbers ki ek list di gayi hai, unique pairs dhundo jo ek target value tak sum karte hon. `itertools.combinations` use karo.
3. Ek round-robin scheduler implement karo: multiple task queues di gayi hain, har queue se baari-baari ek task yield karo. `itertools.cycle` aur `itertools.chain` use karo.

### Exercise 6: Memory Challenge
Ek function ke do versions likho jo 1M rows wali CSV file process kare:
- Version 1: Sab kuch ek list mein load karo, phir process karo
- Version 2: Lazy processing ke liye generators use karo
Dono ka memory usage compare karo `sys.getsizeof()` ya `tracemalloc` module use karke.

## Key Takeaways

- Iterator protocol matlab `__iter__()` + `__next__()` — JavaScript ke `Symbol.iterator` jaisa hi hai.
- Iterable ek naya iterator return karta hai har baar, isliye baar-baar loop chal sakta hai; iterator ek baar mein hi khatam ho jaata hai.
- `yield` wale generator functions lazy hote hain — body tabhi chalti hai jab `next()` call ho.
- Generator expressions `(x for x in ...)` list comprehensions se kam memory leti hain, kyunki values on-demand banti hain.
- `yield from` delegation ke liye best hai — nested loops ya recursive generators mein khaas kaam aata hai.
- `itertools` module ke saath chain, cycle, islice, groupby, product, accumulate jaise powerful tools milte hain — bina memory waste kiye.
- Infinite generators (fibonacci, primes, sensor data) hamesha `islice` ya break condition ke saath use karo.
- Generators actual coroutines hain — `.send()` se value bhej sakte ho, bas pehle unhe "prime" karna mat bhoolna.
