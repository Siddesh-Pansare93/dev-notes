# 02 - Strings

## Coming from Node.js/TypeScript

Strings in Python will feel familiar in many ways -- they are immutable sequences of characters in both languages. But Python's string handling is richer out of the box: f-strings rival template literals, slicing has no JS equivalent, and the standard library's string methods are extensive.

---

## String Basics

### Creating Strings

```python
# Single or double quotes -- no difference in Python
name = "Alice"
name = 'Alice'

# Use the other quote type to include quotes
message = "It's a beautiful day"
html = '<div class="container">Hello</div>'

# Escaping works too
escaped = "She said \"hello\""
escaped = 'It\'s fine'
```

```javascript
// JS also allows single/double, plus backticks for template literals
let name = "Alice";
let name2 = 'Alice';
let message = `Hello ${name}`;  // template literal
```

### Multiline Strings

```python
# Triple quotes (single or double) for multiline
story = """
Once upon a time,
in a land far away,
there lived a Python developer.
"""

# Also works with single quotes
story = '''
Same thing,
different quotes.
'''

# Note: the string includes the newlines and leading whitespace
print(repr(story))
# '\nOnce upon a time,\nin a land far away,\nthere lived a Python developer.\n'
```

```javascript
// JS uses backticks for multiline
let story = `
Once upon a time,
in a land far away,
there lived a JS developer.
`;
```

### Raw Strings

Prefix with `r` to disable escape sequence processing. Essential for regex patterns and Windows paths.

```python
# Normal string -- \n is a newline
print("hello\nworld")
# hello
# world

# Raw string -- \n is literal backslash + n
print(r"hello\nworld")
# hello\nworld

# Great for regex
import re
pattern = r"\d{3}-\d{3}-\d{4}"   # no need to double-escape

# Great for Windows paths
path = r"C:\Users\Alice\Documents\new_file.txt"
```

```javascript
// JS has no raw strings. You must double-escape:
let pattern = "\\d{3}-\\d{3}-\\d{4}";
// Or use String.raw with template literals:
let path = String.raw`C:\Users\Alice\Documents`;
```

---

## String Formatting

### f-strings (Python 3.6+) -- The Go-To Choice

f-strings are Python's answer to JS template literals. They are fast, readable, and powerful.

```python
name = "Alice"
age = 30
balance = 1234.5678

# Basic interpolation
print(f"Hello, {name}!")                    # Hello, Alice!

# Expressions inside braces
print(f"{name} will be {age + 5} in 5 years")  # Alice will be 35 in 5 years

# Calling methods
print(f"Name uppercase: {name.upper()}")    # Name uppercase: ALICE

# Format specifiers
print(f"Balance: ${balance:.2f}")           # Balance: $1234.57
print(f"Balance: ${balance:,.2f}")          # Balance: $1,234.57
print(f"Padded: {age:05d}")                 # Padded: 00030
print(f"Left aligned: {name:<20}|")         # Left aligned: Alice               |
print(f"Right aligned: {name:>20}|")        # Right aligned:                Alice|
print(f"Centered: {name:^20}|")             # Centered:        Alice        |
print(f"Percentage: {0.756:.1%}")           # Percentage: 75.6%

# Debugging with = (Python 3.8+)
x = 42
print(f"{x = }")           # x = 42
print(f"{x * 2 = }")       # x * 2 = 84
print(f"{name = !r}")      # name = 'Alice' (shows repr)

# Multiline f-strings
user_info = (
    f"Name: {name}\n"
    f"Age: {age}\n"
    f"Balance: ${balance:,.2f}"
)
```

```javascript
// JS template literals
console.log(`Hello, ${name}!`);
console.log(`${name} will be ${age + 5} in 5 years`);
// JS has no built-in format specifiers -- need toFixed(), etc.
console.log(`Balance: $${balance.toFixed(2)}`);
```

### .format() Method

Older style, still useful when you need to reuse a template or when f-strings are not available.

```python
# Positional arguments
print("Hello, {}! You are {} years old.".format("Alice", 30))

# Named arguments
print("Hello, {name}! You are {age} years old.".format(name="Alice", age=30))

# Numbered arguments (can reuse)
print("{0} loves {1}. {0} also loves {2}.".format("Alice", "Python", "coffee"))

# Format specifiers work the same way
print("Balance: ${:,.2f}".format(1234.5678))

# Useful for reusable templates
template = "Dear {name},\n\nYour order #{order_id} has been {status}."
print(template.format(name="Alice", order_id=1234, status="shipped"))
print(template.format(name="Bob", order_id=5678, status="delivered"))
```

### % Formatting (Legacy)

You will see this in older codebases. Know how to read it, but prefer f-strings for new code.

```python
name = "Alice"
age = 30
print("Hello, %s! You are %d years old." % (name, age))
print("Balance: $%.2f" % 1234.5678)
# %s = string, %d = integer, %f = float, %r = repr
```

---

## String Methods Comparison

### Case Methods

```python
s = "hello world"
s.upper()          # "HELLO WORLD"
s.lower()          # "hello world"
s.title()          # "Hello World"
s.capitalize()     # "Hello world" (only first char)
s.swapcase()       # "HELLO WORLD"

"Hello".isupper()  # False
"HELLO".isupper()  # True
"hello".islower()  # True
"Hello World".istitle()  # True
```

```javascript
// JS equivalents
s.toUpperCase()    // "HELLO WORLD"
s.toLowerCase()    // "hello world"
// No built-in title(), capitalize(), swapcase(), isupper(), etc.
```

### Search Methods

```python
s = "hello world, hello python"

s.find("hello")        # 0 (first occurrence index)
s.find("hello", 1)     # 13 (start searching from index 1)
s.find("xyz")          # -1 (not found)
s.rfind("hello")       # 13 (last occurrence)
s.index("hello")       # 0 (like find, but raises ValueError if not found)

s.count("hello")       # 2
s.startswith("hello")  # True
s.endswith("python")   # True

"hello" in s           # True (membership test)
"xyz" in s             # False
```

```javascript
// JS equivalents
s.indexOf("hello")     // 0
s.indexOf("hello", 1)  // 13
s.indexOf("xyz")       // -1
s.lastIndexOf("hello") // 13
// No built-in count() -- need regex or loop
s.startsWith("hello")  // true
s.endsWith("python")   // true
s.includes("hello")    // true
```

### Modification Methods (Return New Strings)

```python
s = "  hello world  "
s.strip()              # "hello world" (removes leading/trailing whitespace)
s.lstrip()             # "hello world  "
s.rstrip()             # "  hello world"
s.strip("hd ")         # "ello worl" (strip specific chars)

"hello world".replace("world", "Python")    # "hello Python"
"a-b-c-d".replace("-", "_", 2)             # "a_b_c-d" (limit replacements)

"hello".center(20)         # "       hello        "
"hello".center(20, "-")    # "-------hello--------"
"hello".ljust(20, ".")     # "hello..............."
"hello".rjust(20, ".")     # "...............hello"
"42".zfill(6)              # "000042"
```

```javascript
// JS equivalents
s.trim()               // "hello world"
s.trimStart()          // "hello world  "
s.trimEnd()            // "  hello world"

"hello world".replace("world", "Python")  // "hello Python"
"hello world".replaceAll("l", "L")        // "heLLo worLd"

s.padStart(20)         // "       hello        " (pad left)
s.padEnd(20)           // "hello               " (pad right)
```

### Split and Join

```python
# Split
"a,b,c,d".split(",")          # ['a', 'b', 'c', 'd']
"a,b,c,d".split(",", 2)       # ['a', 'b', 'c,d'] (max 2 splits)
"hello world".split()          # ['hello', 'world'] (splits on any whitespace)
"a\nb\nc".splitlines()         # ['a', 'b', 'c']

# Join (note: it's a STRING method, not a list method!)
",".join(["a", "b", "c"])     # "a,b,c"
" -> ".join(["step1", "step2", "step3"])  # "step1 -> step2 -> step3"
"".join(["h", "e", "l", "l", "o"])        # "hello"

# Must join strings -- numbers need conversion
", ".join(str(x) for x in [1, 2, 3])  # "1, 2, 3"
```

```javascript
// JS equivalents
"a,b,c,d".split(",")          // ['a', 'b', 'c', 'd']
["a", "b", "c"].join(",")     // "a,b,c"  (it's an ARRAY method in JS)
```

**Key difference:** In Python, `join()` is a string method called on the separator. In JS, `join()` is an array method called on the array.

### Validation Methods

```python
"hello".isalpha()      # True (all alphabetic)
"12345".isdigit()      # True (all digits)
"abc123".isalnum()     # True (all alphanumeric)
"   ".isspace()        # True (all whitespace)
"hello".isascii()      # True (all ASCII characters)
"Hello World".istitle() # True (title case)
```

JS has no built-in equivalents for these -- you would use regex.

---

## String Slicing

This is one of Python's superpowers. JS has nothing quite like it.

### Basic Slicing: `s[start:stop:step]`

```python
s = "Hello, World!"

# Single character access (same as JS)
s[0]           # 'H'
s[7]           # 'W'
s[-1]          # '!' (last char)
s[-2]          # 'd' (second to last)

# Slicing: s[start:stop] -- start inclusive, stop exclusive
s[0:5]         # 'Hello'
s[7:12]        # 'World'

# Omit start or stop
s[:5]          # 'Hello' (from beginning)
s[7:]          # 'World!' (to end)
s[:]           # 'Hello, World!' (copy entire string)

# Negative indices in slices
s[-6:]         # 'orld!' (last 6 chars)
s[:-6]         # 'Hello, ' (all except last 6)

# Step parameter
s[::2]         # 'Hlo ol!' (every 2nd char)
s[1::2]        # 'el,Wrd' (every 2nd char starting from index 1)

# REVERSE a string (iconic Python one-liner)
s[::-1]        # '!dlroW ,olleH'
"racecar"[::-1]  # 'racecar' (palindrome check!)
```

```javascript
// JS equivalents (limited)
s.charAt(0)          // 'H'
s[0]                 // 'H'
s.slice(0, 5)        // 'Hello'
s.slice(7)           // 'World!'
s.slice(-6)          // 'orld!'
// No step parameter, no easy reverse
s.split('').reverse().join('')  // '!dlroW ,olleH' (verbose!)
```

### Slicing Is Safe

Python slicing never throws an index error, even with out-of-range indices.

```python
s = "hello"
s[0:100]       # 'hello' (gracefully stops at end)
s[50:100]      # '' (empty string, no error)
s[-100:3]      # 'hel' (gracefully starts at beginning)
```

```javascript
// JS slice is similarly forgiving
"hello".slice(0, 100)  // "hello"
```

However, single index access will throw:
```python
s = "hello"
s[50]          # IndexError: string index out of range
```

---

## String Immutability

Strings are immutable in both Python and JavaScript. You cannot change a character in place.

```python
s = "hello"
# s[0] = "H"   # TypeError: 'str' object does not support item assignment

# Create a new string instead
s = "H" + s[1:]       # "Hello"
s = s.replace("h", "H")  # "Hello"
```

---

## Useful String Patterns

### Checking and Cleaning User Input

```python
user_input = "  Alice Smith  "

# Clean and validate
cleaned = user_input.strip()
if cleaned and cleaned.replace(" ", "").isalpha():
    first, last = cleaned.split(maxsplit=1)
    print(f"First: {first}, Last: {last}")
```

### Building Strings Efficiently

```python
# BAD: String concatenation in a loop (creates new string each time)
result = ""
for i in range(1000):
    result += str(i)     # O(n^2) -- slow for large n

# GOOD: Use join()
result = "".join(str(i) for i in range(1000))  # O(n)

# GOOD: Use a list and join at the end
parts = []
for i in range(1000):
    parts.append(str(i))
result = "".join(parts)
```

```javascript
// JS has the same issue but modern engines optimize it better
// Still, Array.join() is preferred for large concatenations
let parts = [];
for (let i = 0; i < 1000; i++) parts.push(String(i));
let result = parts.join("");
```

### Multi-line String Formatting with textwrap

```python
import textwrap

# dedent removes common leading whitespace
message = textwrap.dedent("""\
    Dear {name},

    Your account balance is ${balance:.2f}.
    Thank you for being a customer.

    Regards,
    The Team
""").format(name="Alice", balance=1234.56)

print(message)
```

### String Translation Table

```python
# Replace multiple characters at once
table = str.maketrans("aeiou", "12345")
"hello world".translate(table)  # "h2ll4 w4rld"

# Remove specific characters
remove_table = str.maketrans("", "", "aeiou")
"hello world".translate(remove_table)  # "hll wrld"
```

---

## Encoding and Bytes

```python
# Strings are Unicode (like JS)
s = "Hello, "  # Unicode string
print(len(s))                  # 8

# Encode to bytes
b = s.encode("utf-8")         # b'Hello, \xe4\xb8\x96\xe7\x95\x8c'
print(type(b))                 # <class 'bytes'>
print(len(b))                  # 12 (UTF-8 uses 3 bytes per CJK char)

# Decode back to string
s2 = b.decode("utf-8")        # "Hello, "
```

```javascript
// JS string encoding
let encoder = new TextEncoder();
let bytes = encoder.encode("Hello");
let decoder = new TextDecoder();
let str = decoder.decode(bytes);
```

---

## Summary: Methods Comparison Table

| Operation           | Python                        | JavaScript                    |
|---------------------|-------------------------------|-------------------------------|
| Template string     | `f"Hello {name}"`             | `` `Hello ${name}` ``         |
| Uppercase           | `s.upper()`                   | `s.toUpperCase()`             |
| Lowercase           | `s.lower()`                   | `s.toLowerCase()`             |
| Trim whitespace     | `s.strip()`                   | `s.trim()`                    |
| Trim left           | `s.lstrip()`                  | `s.trimStart()`               |
| Trim right          | `s.rstrip()`                  | `s.trimEnd()`                 |
| Find substring      | `s.find("x")`                 | `s.indexOf("x")`             |
| Contains            | `"x" in s`                    | `s.includes("x")`            |
| Starts with         | `s.startswith("x")`           | `s.startsWith("x")`          |
| Ends with           | `s.endswith("x")`             | `s.endsWith("x")`            |
| Replace             | `s.replace("a", "b")`         | `s.replace("a", "b")`        |
| Replace all         | `s.replace("a", "b")`         | `s.replaceAll("a", "b")`     |
| Split               | `s.split(",")`                 | `s.split(",")`                |
| Join                | `",".join(list)`               | `array.join(",")`             |
| Repeat              | `s * 3`                        | `s.repeat(3)`                 |
| Slice               | `s[1:4]`                       | `s.slice(1, 4)`               |
| Reverse             | `s[::-1]`                      | `s.split('').reverse().join('')` |
| Pad left            | `s.rjust(10, "0")`            | `s.padStart(10, "0")`        |
| Pad right           | `s.ljust(10, "0")`            | `s.padEnd(10, "0")`          |
| Character at        | `s[i]`                         | `s[i]` or `s.charAt(i)`      |
| Length              | `len(s)`                       | `s.length`                    |

**Note:** Python's `replace()` replaces ALL occurrences by default (like JS `replaceAll()`). JS `replace()` only replaces the first occurrence unless you use a regex with the `g` flag.

---

## Practice Exercises

### Exercise 1: String Formatter
Write a function that takes a person's name and balance, and returns a formatted receipt line like: `"Alice.............$1,234.57"` (total width 30 characters).

```python
# Your code here
def format_receipt_line(name, balance):
    pass
```

<details>
<summary>Solution</summary>

```python
def format_receipt_line(name, balance):
    price_str = f"${balance:,.2f}"
    dots_needed = 30 - len(name) - len(price_str)
    return f"{name}{'.' * dots_needed}{price_str}"

# Or using string formatting tricks
def format_receipt_line_v2(name, balance):
    price_str = f"${balance:,.2f}"
    return f"{name}{price_str:.>{ 30 - len(name)}}"

print(format_receipt_line("Alice", 1234.57))
# Alice.............$1,234.57
print(format_receipt_line("Bob", 42.0))
# Bob......................$42.00
```
</details>

### Exercise 2: Palindrome Checker
Write a function that checks if a string is a palindrome, ignoring case and non-alphanumeric characters. Test with `"A man, a plan, a canal: Panama"`.

```python
def is_palindrome(s):
    pass
```

<details>
<summary>Solution</summary>

```python
def is_palindrome(s):
    cleaned = "".join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]

print(is_palindrome("A man, a plan, a canal: Panama"))  # True
print(is_palindrome("racecar"))                          # True
print(is_palindrome("hello"))                            # False
print(is_palindrome("Was it a car or a cat I saw?"))     # True
```
</details>

### Exercise 3: Word Frequency Counter
Given a sentence, count the frequency of each word (case-insensitive) and print them sorted by frequency (highest first).

```python
text = "the quick brown fox jumps over the lazy dog the fox the"
# Expected output:
# the: 4
# fox: 2
# quick: 1
# brown: 1
# ...
```

<details>
<summary>Solution</summary>

```python
text = "the quick brown fox jumps over the lazy dog the fox the"

words = text.lower().split()
freq = {}
for word in words:
    freq[word] = freq.get(word, 0) + 1

# Sort by frequency (descending), then alphabetically
for word, count in sorted(freq.items(), key=lambda x: (-x[1], x[0])):
    print(f"{word}: {count}")

# Or use collections.Counter (the Pythonic way)
from collections import Counter
freq = Counter(text.lower().split())
for word, count in freq.most_common():
    print(f"{word}: {count}")
```
</details>

### Exercise 4: Slug Generator
Write a function that converts a title into a URL slug: lowercase, spaces to hyphens, remove non-alphanumeric characters (except hyphens), collapse multiple hyphens.

```python
def slugify(title):
    pass

print(slugify("Hello, World! This is a Test"))
# hello-world-this-is-a-test

print(slugify("  Multiple   Spaces   Here  "))
# multiple-spaces-here

print(slugify("Special $#@! Characters"))
# special-characters
```

<details>
<summary>Solution</summary>

```python
def slugify(title):
    # Lowercase
    slug = title.lower().strip()
    # Replace spaces with hyphens
    slug = slug.replace(" ", "-")
    # Keep only alphanumeric and hyphens
    slug = "".join(c for c in slug if c.isalnum() or c == "-")
    # Collapse multiple hyphens
    while "--" in slug:
        slug = slug.replace("--", "-")
    # Remove leading/trailing hyphens
    slug = slug.strip("-")
    return slug

print(slugify("Hello, World! This is a Test"))     # hello-world-this-is-a-test
print(slugify("  Multiple   Spaces   Here  "))     # multiple-spaces-here
print(slugify("Special $#@! Characters"))           # special-characters
print(slugify("Python 3.12 -- What's New?"))        # python-312-whats-new
```
</details>

### Exercise 5: Caesar Cipher
Implement a Caesar cipher that shifts letters by `n` positions. Handle uppercase, lowercase, and leave non-letters unchanged. Include both encrypt and decrypt.

```python
def caesar_encrypt(text, shift):
    pass

def caesar_decrypt(text, shift):
    pass
```

<details>
<summary>Solution</summary>

```python
def caesar_encrypt(text, shift):
    result = []
    for char in text:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            shifted = (ord(char) - base + shift) % 26 + base
            result.append(chr(shifted))
        else:
            result.append(char)
    return "".join(result)

def caesar_decrypt(text, shift):
    return caesar_encrypt(text, -shift)

encrypted = caesar_encrypt("Hello, World!", 3)
print(encrypted)                               # Khoor, Zruog!
print(caesar_decrypt(encrypted, 3))            # Hello, World!

# ROT13 is a special case
print(caesar_encrypt("Hello", 13))             # Uryyb
print(caesar_encrypt("Uryyb", 13))             # Hello (self-inverse!)
```
</details>
