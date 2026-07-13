# 03 - Lists and Tuples

## Node.js/TypeScript se aane walon ke liye

Python ki lists basically JavaScript arrays hi hain — ordered, mutable, aur heterogeneous collections. Same cheez jo tum JS mein use karte ho. Lekin Python mein do extra cheezein milti hain: **tuples** (immutable lists, jinka JS mein koi seedha equivalent nahi hai) aur ek **slicing system** jo sequences ke saath kaam karne ka tarika hi badal dega.

---

## Lists = JavaScript Arrays

### List Banana

Zomato ka cart socho — items add karo, remove karo, order change karo. Python list bilkul yehi karti hai.

```python
# Lists banana
numbers = [1, 2, 3, 4, 5]
mixed = [1, "hello", True, 3.14, None]      # heterogeneous (JS jaisa hi)
empty = []
nested = [[1, 2], [3, 4], [5, 6]]

# Doosre iterables se
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

### Elements Access Karna

```python
fruits = ["apple", "banana", "cherry", "date", "elderberry"]

# Indexing
fruits[0]          # "apple"
fruits[2]          # "cherry"
fruits[-1]         # "elderberry" (last element)
fruits[-2]         # "date" (second to last)

# Slicing (naya list return karta hai)
fruits[1:3]        # ["banana", "cherry"]
fruits[:3]         # ["apple", "banana", "cherry"]
fruits[2:]         # ["cherry", "date", "elderberry"]
fruits[::2]        # ["apple", "cherry", "elderberry"] (har 2nd)
fruits[::-1]       # reversed list

# Length
len(fruits)        # 5
```

```javascript
// JS
fruits[0]                    // "apple"
fruits[fruits.length - 1]   // "elderberry" (negative indexing nahi hoti)
fruits.at(-1)                // "elderberry" (ES2022)
fruits.slice(1, 3)           // ["banana", "cherry"]
fruits.length                // 5
```

> [!tip]
> `fruits[-1]` jaisi negative indexing Python ka superpower hai — JS mein tumhe `.length - 1` calculate karna padta hai ya `.at(-1)` use karna padta hai. Python mein seedha `-1` likh do, kaam khatam.

---

## List Methods: Python vs JavaScript

### Elements Add Karna

```python
fruits = ["apple", "banana"]

# End mein add
fruits.append("cherry")           # ["apple", "banana", "cherry"]

# Specific index pe add
fruits.insert(1, "blueberry")     # ["apple", "blueberry", "banana", "cherry"]

# Multiple elements end mein add
fruits.extend(["date", "elderberry"])  # har element ko append karta hai
# YA
fruits += ["fig", "grape"]             # same effect

# GOTCHA: append vs extend
fruits.append(["kiwi", "lemon"])       # yeh poori LIST ko ek hi element ki tarah add karta hai!
# ["apple", ..., ["kiwi", "lemon"]]
```

```javascript
// JS equivalents
fruits.push("cherry");                 // append
fruits.splice(1, 0, "blueberry");     // index pe insert
fruits.push(...["date", "elderberry"]); // extend (spread)
fruits = fruits.concat(["fig"]);       // concat naya array return karta hai
```

> [!warning]
> `append` aur `extend` ka confusion sabse common Python mistake hai. `append(["kiwi", "lemon"])` puri list ko ek single nested item bana dega — tumhe `extend` chahiye tha agar individual items add karne the. UPI app mein galat amount daal dena jaisa hi embarrassing bug hai yeh.

### Elements Remove Karna

```python
fruits = ["apple", "banana", "cherry", "banana", "date"]

# Value se remove karo (pehla occurrence)
fruits.remove("banana")       # ["apple", "cherry", "banana", "date"]
# Agar nahi mila to ValueError aayega!

# Index se remove karo aur value return karo
last = fruits.pop()           # "date" ko remove aur return karta hai
second = fruits.pop(1)        # "cherry" ko remove aur return karta hai

# Index se remove (kuch return nahi karta)
del fruits[0]                 # "apple" remove hota hai

# Slice remove karo
del fruits[1:3]               # index 1 aur 2 wale elements remove

# Sab clear karo
fruits.clear()                # []
```

```javascript
// JS equivalents
let idx = fruits.indexOf("banana");
if (idx !== -1) fruits.splice(idx, 1);  // value se remove

fruits.pop()                  // last remove aur return
fruits.splice(1, 1)           // index 1 pe remove
fruits.length = 0             // clear (ya fruits = [])
```

### Search Karna

```python
fruits = ["apple", "banana", "cherry", "banana"]

# Membership check
"banana" in fruits             # True
"mango" not in fruits          # True

# Index dhoondo
fruits.index("banana")        # 1 (pehla occurrence)
fruits.index("banana", 2)     # 3 (index 2 se search shuru)
# fruits.index("mango")       # ValueError! Pehle 'in' se check kar lo

# Kitni baar aaya, count karo
fruits.count("banana")        # 2
```

```javascript
// JS equivalents
fruits.includes("banana")     // true
fruits.indexOf("banana")      // 1 (agar nahi mila to -1, error nahi)
// Koi built-in count nahi -- filter().length use karna padta hai
fruits.filter(f => f === "banana").length  // 2
```

### Sorting

Sabse jaruri baat yaad rakhna: `sort()` list ko **badal deta hai** (in-place), aur `sorted()` ek **naya** list return karta hai, original waisa hi rehta hai.

```python
numbers = [3, 1, 4, 1, 5, 9, 2, 6]

# In place sort (list badal jaati hai)
numbers.sort()                 # [1, 1, 2, 3, 4, 5, 6, 9]
numbers.sort(reverse=True)     # [9, 6, 5, 4, 3, 2, 1, 1]

# Naya sorted list return karo (original waisa hi rehta hai)
original = [3, 1, 4, 1, 5]
new_sorted = sorted(original)           # [1, 1, 3, 4, 5]
print(original)                          # [3, 1, 4, 1, 5] -- ye change nahi hua!

# Key function se sort
words = ["banana", "apple", "cherry", "date"]
words.sort(key=len)                      # ["date", "apple", "banana", "cherry"]
words.sort(key=str.lower)                # case-insensitive sort

# Complex objects ko sort karna
users = [
    {"name": "Charlie", "age": 25},
    {"name": "Alice", "age": 30},
    {"name": "Bob", "age": 20},
]
users.sort(key=lambda u: u["age"])       # age se sort
sorted_by_name = sorted(users, key=lambda u: u["name"])  # naya list, name se sorted

# Multi-key sorting
from operator import itemgetter
users.sort(key=itemgetter("age", "name"))  # pehle age, phir name se sort
```

```javascript
// JS sort
numbers.sort((a, b) => a - b);           // ascending
numbers.sort((a, b) => b - a);           // descending
// JS sort in-place hi karta hai, sorted() jaisa kuch nahi hai
let newSorted = [...numbers].sort((a, b) => a - b);  // copy + sort

words.sort((a, b) => a.length - b.length);  // length se sort
users.sort((a, b) => a.age - b.age);        // age se sort
```

**Key difference:** Python ka `sort()` stable hota hai (equal elements apna relative order maintain karte hain). JS ka `sort()` bhi modern engines mein stable hai, lekin ES2019 se pehle yeh guarantee nahi tha.

### Reverse Karna

```python
numbers = [1, 2, 3, 4, 5]

# In place
numbers.reverse()              # [5, 4, 3, 2, 1]

# Naya list
reversed_list = list(reversed(numbers))   # naya reversed list
reversed_list = numbers[::-1]             # slicing approach
```

---

## List Slicing — Detail Mein

Slicing kisi bhi sequence pe kaam karti hai (lists, tuples, strings). Syntax hai `sequence[start:stop:step]`.

```python
nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

# Basic slicing
nums[2:5]          # [2, 3, 4]
nums[:4]           # [0, 1, 2, 3]
nums[6:]           # [6, 7, 8, 9]
nums[:]            # [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] (shallow copy!)

# Step
nums[::2]          # [0, 2, 4, 6, 8] (har 2nd)
nums[1::2]         # [1, 3, 5, 7, 9] (index 1 se shuru, har 2nd)
nums[::3]          # [0, 3, 6, 9]

# Negative step (direction reverse ho jaati hai)
nums[::-1]         # [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
nums[7:2:-1]       # [7, 6, 5, 4, 3]

# Slice assignment (list ke portion ko modify karna)
nums[2:5] = [20, 30, 40]     # index 2, 3, 4 ke elements replace
nums[2:5] = [20, 30, 40, 50] # length bhi change kar sakte ho!
nums[2:2] = [99, 98]         # kuch remove kiye bina insert karna (empty slice)
```

> [!info]
> `nums[:]` ek shallow copy return karta hai — original list se koi link nahi rehta (upar wale level pe). Yeh cheez neeche "Copying Lists" section mein aur detail mein aayegi.

### Slice Objects

```python
# Slice ko reusable object ki tarah store kar sakte ho
first_three = slice(None, 3)     # [:3] ke barabar
every_other = slice(None, None, 2)  # [::2] ke barabar

nums = [0, 1, 2, 3, 4, 5]
nums[first_three]      # [0, 1, 2]
nums[every_other]      # [0, 2, 4]
```

---

## Unpacking (Destructuring)

Python ki unpacking JS destructuring jaisi hi hai, bas kuch extra tricks ke saath.

```python
# Basic unpacking
a, b, c = [1, 2, 3]
print(a, b, c)          # 1 2 3

# Swap
a, b = b, a

# _ se values ignore karo
first, _, third = [1, 2, 3]    # _ convention hai "mujhe iski parwaah nahi" ke liye

# * se extended unpacking (JS ke ...rest jaisa)
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
// JS mein rest beech mein nahi rakh sakte: [first, ...middle, last] invalid hai!
```

**Yahan Python jeet gaya:** `*` operator kahin bhi laga sakte ho (shuru mein, beech mein, end mein), jabki JS ka `...rest` sirf last element hi ho sakta hai.

---

## Tuples — Immutable Lists

Tuples ordered, immutable sequences hain. Inhe list samjho jo banne ke baad kabhi badal nahi sakti. JavaScript mein iska koi direct equivalent nahi hai.

Socho ek train ticket — jaise ek IRCTC PNR pe passenger ka naam, seat number, aur coach ek baar book hone ke baad fix ho jaate hain, waise hi tuple ke elements fix ho jaate hain creation ke baad.

### Tuple Banana

```python
# Parentheses se banate hain (ya sirf commas se bhi)
point = (3, 4)
rgb = (255, 128, 0)
single = (42,)           # single-element tuple ke liye trailing comma ZARURI hai!
not_a_tuple = (42)        # yeh sirf integer 42 hai parentheses mein

# Jab ambiguity na ho, parentheses optional hain
point = 3, 4              # yeh bhi tuple hai
a, b = 1, 2               # tuple unpacking

# Doosre iterables se
tuple([1, 2, 3])           # (1, 2, 3)
tuple("hello")             # ('h', 'e', 'l', 'l', 'o')

# Empty tuple
empty = ()
empty = tuple()
```

> [!warning]
> `(42,)` aur `(42)` mein farak yaad rakhna. Comma nahi lagaya to Python usse tuple nahi mानेगा, sirf ek number samjhega — yeh gotcha bahut logon ko lagta hai.

### Tuples Kyun Use Karein?

1. **Immutability ki guarantee:** Ek baar ban gaya to badal nahi sakta. Us data ke liye useful jo modify nahi hona chahiye.
2. **Dictionary keys:** Tuples dict keys ban sakte hain (lists nahi ban sakti — woh hashable nahi hoti).
3. **Function returns:** Functions naturally multiple values ke liye tuple return karte hain.
4. **Performance:** Lists se thoda fast, memory bhi kam leta hai.
5. **Intent signal:** Tuple use karke tum doosre developers ko batate ho "yeh data fixed hai."

```python
# Dict keys ki tarah tuples (lists se TypeError aata)
locations = {
    (40.7128, -74.0060): "New York",
    (51.5074, -0.1278): "London",
    (35.6762, 139.6503): "Tokyo",
}
print(locations[(40.7128, -74.0060)])  # "New York"

# Multiple return values
def get_user():
    return "Alice", 30, "admin"   # tuple return hota hai

name, age, role = get_user()       # tuple ko unpack karo

# Immutability
point = (3, 4)
# point[0] = 5   # TypeError: 'tuple' object does not support item assignment
```

### Tuple Methods

Tuples ke sirf do methods hain (kyunki woh immutable hain):

```python
t = (1, 2, 3, 2, 4, 2)
t.count(2)         # 3
t.index(2)         # 1 (pehla occurrence)
```

### Tuple vs List: Kab Kya Use Karein

| **List** use karo jab...                    | **Tuple** use karo jab...                |
|-------------------------------------------|----------------------------------------|
| Collection change hone wala hai            | Data fixed/constant hai                |
| Append, remove, sort chahiye             | Function se multiple values return karni hain |
| Homogeneous data (users ki list, etc.)    | Heterogeneous fixed structure (record) |
| Order matter karta hai aur change ho sakta hai | Dictionary key ki tarah use karna hai |
| Similar cheezon ki sequence hai            | Related values ka named group hai      |

```python
# List: similar cheezon ka collection (change hoga)
shopping_cart = ["apple", "bread", "milk"]
shopping_cart.append("eggs")

# Tuple: fixed record (change nahi hoga)
http_response = (200, "OK", {"Content-Type": "text/html"})
database_row = ("Alice", 30, "alice@example.com")
```

### Named Tuples — Naam Wale Tuples

Structured data ke liye, named tuples tumhe named fields dete hain (ek lightweight class ya TypeScript interface jaisa).

```python
from collections import namedtuple

# Named tuple type define karo
Point = namedtuple("Point", ["x", "y"])
User = namedtuple("User", "name age email")  # string syntax bhi chalti hai

# Instances banao
p = Point(3, 4)
print(p.x, p.y)         # 3 4
print(p[0], p[1])       # 3 4 (abhi bhi indexable hai)

user = User("Alice", 30, "alice@example.com")
print(user.name)         # "Alice"
print(user.age)          # 30

# Immutable
# p.x = 5   # AttributeError

# Dict mein convert karo
print(user._asdict())   # {'name': 'Alice', 'age': 30, 'email': 'alice@example.com'}

# Modified copy banao
older_user = user._replace(age=31)
```

```typescript
// Sabse close TS equivalent
interface Point { x: number; y: number; }
interface User { name: string; age: number; email: string; }
// Lekin ye mutable hain aur sirf types hain, runtime constructs nahi
```

Aur zyada features ke liye, `typing.NamedTuple` use karo (modern style):

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

## List Comprehensions (Jhalak)

List comprehensions ko detail mein `10_comprehensions.md` mein cover kiya gaya hai, lekin yeh itni fundamental cheez hai ki ek quick preview yahan de rahe hain.

```python
# Transformation se list banao
squares = [x ** 2 for x in range(10)]          # [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

# Filter ke saath
evens = [x for x in range(20) if x % 2 == 0]  # [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]

# Transform aur filter dono
words = ["hello", "world", "hi", "python"]
long_upper = [w.upper() for w in words if len(w) > 3]  # ['HELLO', 'WORLD', 'PYTHON']
```

```javascript
// JS equivalents
let squares = Array.from({length: 10}, (_, i) => i ** 2);
// ya: [...Array(10)].map((_, i) => i ** 2);

let evens = [...Array(20).keys()].filter(x => x % 2 === 0);

let longUpper = words.filter(w => w.length > 3).map(w => w.toUpperCase());
```

---

## Common List Operations

### Lists Copy Karna

```python
original = [1, 2, [3, 4]]

# Shallow copy (3 tarike)
copy1 = original.copy()
copy2 = original[:]
copy3 = list(original)

# Teeno shallow copies banate hain -- nested objects shared rehte hain!
copy1[2].append(5)
print(original)       # [1, 2, [3, 4, 5]] -- original bhi affect hua!

# Deep copy
import copy
deep = copy.deepcopy(original)
deep[2].append(6)
print(original)       # [1, 2, [3, 4, 5]] -- original affect NAHI hua
```

```javascript
// JS shallow copy
let copy1 = [...original];
let copy2 = original.slice();
// JS deep copy
let deep = structuredClone(original);
```

> [!warning]
> Yeh sabse bada gotcha hai jo har Python beginner ko lagta hai. Shallow copy sirf **top-level** elements ki nayi list banati hai — andar ki nested lists/dicts wahi purani wali hi rehti hain, shared reference. Socho tumne Swiggy order ka "copy" banaya, lekin address wahi purana object hai — usmein change karoge to original order ka address bhi badal jaayega. Nested data ke liye hamesha `copy.deepcopy()` use karo.

### Nested Lists Flatten Karna

```python
nested = [[1, 2], [3, 4], [5, 6]]

# Ek level ki nesting
flat = [item for sublist in nested for item in sublist]
# [1, 2, 3, 4, 5, 6]

# Kisi bhi depth ke liye itertools use karo
import itertools
flat = list(itertools.chain.from_iterable(nested))

# Bahut deeply nested ke liye, recursive approach
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
nested.flat()       // ek level
nested.flat(Infinity)  // kisi bhi depth tak
```

### Lists Zip Karna

```python
names = ["Alice", "Bob", "Charlie"]
ages = [30, 25, 35]
cities = ["NYC", "LA", "Chicago"]

# zip corresponding elements ko combine karta hai
combined = list(zip(names, ages))
# [('Alice', 30), ('Bob', 25), ('Charlie', 35)]

# Teen lists ke saath
combined = list(zip(names, ages, cities))
# [('Alice', 30, 'NYC'), ('Bob', 25, 'LA'), ('Charlie', 35, 'Chicago')]

# Useful patterns
for name, age in zip(names, ages):
    print(f"{name} is {age}")

# Enumerate -- index + value dono milte hain (JS ke entries() jaisa)
for i, name in enumerate(names):
    print(f"{i}: {name}")

for i, name in enumerate(names, start=1):  # counting 1 se shuru
    print(f"{i}. {name}")
```

```javascript
// JS mein built-in zip nahi hai
// entries() enumerate jaisa hi hai
for (let [i, name] of names.entries()) {
    console.log(`${i}: ${name}`);
}
```

---

## Methods Comparison Table

| Operation              | Python                           | JavaScript                          |
|------------------------|-----------------------------------|--------------------------------------|
| End mein add           | `lst.append(x)`                  | `arr.push(x)`                       |
| Beginning mein add     | `lst.insert(0, x)`              | `arr.unshift(x)`                    |
| Last remove            | `lst.pop()`                      | `arr.pop()`                         |
| First remove           | `lst.pop(0)`                     | `arr.shift()`                       |
| Index se remove        | `lst.pop(i)` ya `del lst[i]`   | `arr.splice(i, 1)`                 |
| Value se remove        | `lst.remove(x)`                 | `arr.splice(arr.indexOf(x), 1)`    |
| Extend                 | `lst.extend([1,2])`             | `arr.push(...[1,2])`               |
| Concatenate            | `lst1 + lst2`                   | `arr1.concat(arr2)` / `[...a,...b]` |
| Index dhoondo          | `lst.index(x)`                  | `arr.indexOf(x)`                    |
| Membership check       | `x in lst`                      | `arr.includes(x)`                   |
| Count                  | `lst.count(x)`                  | `arr.filter(e=>e===x).length`      |
| Sort (in place)        | `lst.sort()`                    | `arr.sort()`                        |
| Sort (naya)            | `sorted(lst)`                   | `[...arr].sort()`                   |
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
Numbers 1-10 ki list se shuru karo. Saare even numbers hatao, bache huye odds ko double karo, aur result ko reverse karo. Kam se kam lines mein karo.

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
Ek 3x3 matrix banao (list of lists), phir functions likho jo: (a) specific row de, (b) specific column de, (c) diagonal de, (d) matrix ko transpose kare.

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
Student tuples (name, grade, gpa) ki list banao. Functions likho jo: highest GPA wala student dhoondein, ek given GPA threshold se upar wale saare students dein, aur average GPA calculate karein. Bonus points ke liye named tuples use karo.

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
Do utility functions likho: (a) `interleave` jo do lists ko alternately merge kare, aur (b) `chunk` jo ek list ko n-size ke groups mein split kare.

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
    # Agar lists ki length alag hai to bache hue elements handle karo
    longer = a if len(a) > len(b) else b
    result.extend(longer[min(len(a), len(b)):])
    return result

# Zyada Pythonic version:
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
Ek function likho jo list ko `k` positions se rotate kare. Positive `k` right rotate karega, negative left. `collections.deque` use kiye bina karo.

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
    k = k % len(lst)  # k > len(lst) wala case handle karo
    return lst[-k:] + lst[:-k] if k else lst[:]

print(rotate([1, 2, 3, 4, 5], 2))    # [4, 5, 1, 2, 3]
print(rotate([1, 2, 3, 4, 5], -2))   # [3, 4, 5, 1, 2]
print(rotate([1, 2, 3, 4, 5], 7))    # [4, 5, 1, 2, 3] (7 % 5 = 2)
print(rotate([1, 2, 3, 4, 5], 0))    # [1, 2, 3, 4, 5]
```
</details>

## Key Takeaways

- Python lists JS arrays jaisi hi hain, lekin negative indexing (`fruits[-1]`) aur powerful slicing (`[start:stop:step]`) extra milta hai.
- `append` vs `extend` ka farak yaad rakho — `append` poori list ko ek element bana deta hai, `extend` har element ko alag se add karta hai.
- `sort()` list ko in-place modify karta hai, `sorted()` naya list return karta hai — original untouched rehta hai.
- Unpacking mein `*` operator kahin bhi (start, middle, end) laga sakte ho — JS ke `...rest` se zyada flexible hai.
- Tuples immutable hain — dict keys ban sakte hain, function se multiple values return karne ke liye best hain, aur "yeh data fixed hai" wala intent signal karte hain.
- Named tuples (`namedtuple` ya `typing.NamedTuple`) tumhe TypeScript interface jaisa readable, structured data dete hain — lekin runtime pe bhi kaam karte hain.
- Shallow copy (`.copy()`, `[:]`, `list()`) sirf top-level copy karti hai — nested lists/dicts shared reference rehte hain. Deep copy ke liye `copy.deepcopy()` use karo.
