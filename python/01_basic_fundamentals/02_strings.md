# 02 - Strings

## Node.js/TypeScript se aa rahe ho? Yeh samjho

Strings Python mein bahut had tak familiar lagenge — dono languages mein yeh immutable sequences of characters hote hain. Lekin Python ka string handling thoda zyada powerful hai out of the box: f-strings, template literals ko takkar dete hain, slicing ka toh JS mein koi jawab hi nahi hai, aur standard library ke string methods bhi kaafi extensive hain.

---

## String Basics

### Strings Banana

```python
# Single ya double quotes -- Python mein koi farak nahi padta
name = "Alice"
name = 'Alice'

# Doosra quote type use karo agar quotes include karne hain
message = "It's a beautiful day"
html = '<div class="container">Hello</div>'

# Escaping bhi kaam karti hai
escaped = "She said \"hello\""
escaped = 'It\'s fine'
```

```javascript
// JS mein single/double dono chalte hain, plus backticks for template literals
let name = "Alice";
let name2 = 'Alice';
let message = `Hello ${name}`;  // template literal
```

### Multiline Strings

```python
# Triple quotes (single ya double) multiline ke liye
story = """
Once upon a time,
in a land far away,
there lived a Python developer.
"""

# Single quotes ke saath bhi chalta hai
story = '''
Same thing,
different quotes.
'''

# Note: string mein newlines aur leading whitespace bhi include hote hain
print(repr(story))
# '\nOnce upon a time,\nin a land far away,\nthere lived a Python developer.\n'
```

```javascript
// JS multiline ke liye backticks use karta hai
let story = `
Once upon a time,
in a land far away,
there lived a JS developer.
`;
```

### Raw Strings

`r` prefix laga do to escape sequence processing band ho jaati hai. Regex patterns aur Windows paths ke liye yeh must hai.

```python
# Normal string -- \n newline hai
print("hello\nworld")
# hello
# world

# Raw string -- \n literal backslash + n hai
print(r"hello\nworld")
# hello\nworld

# Regex ke liye zabardast
import re
pattern = r"\d{3}-\d{3}-\d{4}"   # double-escape karne ki zarurat nahi

# Windows paths ke liye zabardast
path = r"C:\Users\Alice\Documents\new_file.txt"
```

```javascript
// JS mein raw strings hoti hi nahi. Double-escape karna padta hai:
let pattern = "\\d{3}-\\d{3}-\\d{4}";
// Ya String.raw ke saath template literals use karo:
let path = String.raw`C:\Users\Alice\Documents`;
```

---

## String Formatting

**Kyun zaruri hai?** Har baar `"Name: " + name + ", Age: " + str(age)` jaisa concatenation likhna thakaau hai aur bugs ka ghar hai (type mismatch, missing spaces, etc). Python mein values ko string ke andar "inject" karne ke teen tareeke hain — neeche best se worst order mein.

### f-strings (Python 3.6+) -- Sabse Pehli Pasand

f-strings Python ka jawab hain JS ke template literals ka. Yeh fast, readable aur powerful hain.

```python
name = "Alice"
age = 30
balance = 1234.5678

# Basic interpolation
print(f"Hello, {name}!")                    # Hello, Alice!

# Braces ke andar expressions bhi chal jaate hain
print(f"{name} will be {age + 5} in 5 years")  # Alice will be 35 in 5 years

# Method call bhi kar sakte ho
print(f"Name uppercase: {name.upper()}")    # Name uppercase: ALICE

# Format specifiers
print(f"Balance: ${balance:.2f}")           # Balance: $1234.57
print(f"Balance: ${balance:,.2f}")          # Balance: $1,234.57
print(f"Padded: {age:05d}")                 # Padded: 00030
print(f"Left aligned: {name:<20}|")         # Left aligned: Alice               |
print(f"Right aligned: {name:>20}|")        # Right aligned:                Alice|
print(f"Centered: {name:^20}|")             # Centered:        Alice        |
print(f"Percentage: {0.756:.1%}")           # Percentage: 75.6%

# Debugging ke liye = (Python 3.8+) -- bada kaam ka trick
x = 42
print(f"{x = }")           # x = 42
print(f"{x * 2 = }")       # x * 2 = 84
print(f"{name = !r}")      # name = 'Alice' (repr dikhata hai)

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
// JS mein built-in format specifiers nahi hain -- toFixed() jaisi cheezein use karni padti hain
console.log(`Balance: $${balance.toFixed(2)}`);
```

### .format() Method

Purana style hai, lekin abhi bhi kaam ka hai jab template reuse karna ho ya f-strings available na ho.

```python
# Positional arguments
print("Hello, {}! You are {} years old.".format("Alice", 30))

# Named arguments
print("Hello, {name}! You are {age} years old.".format(name="Alice", age=30))

# Numbered arguments (reuse kar sakte ho)
print("{0} loves {1}. {0} also loves {2}.".format("Alice", "Python", "coffee"))

# Format specifiers waise hi kaam karte hain
print("Balance: ${:,.2f}".format(1234.5678))

# Reusable templates ke liye kaafi useful
template = "Dear {name},\n\nYour order #{order_id} has been {status}."
print(template.format(name="Alice", order_id=1234, status="shipped"))
print(template.format(name="Bob", order_id=5678, status="delivered"))
```

### % Formatting (Legacy)

Purane codebases mein yeh dikhega. Padhna aana chahiye, lekin naye code ke liye f-strings hi use karo.

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
s.capitalize()     # "Hello world" (sirf pehla character)
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
// title(), capitalize(), swapcase(), isupper() jaise built-in methods nahi hain
```

### Search Methods

```python
s = "hello world, hello python"

s.find("hello")        # 0 (pehli occurrence ka index)
s.find("hello", 1)     # 13 (index 1 se search shuru)
s.find("xyz")          # -1 (nahi mila)
s.rfind("hello")       # 13 (aakhri occurrence)
s.index("hello")       # 0 (find jaisa hi, par na mile toh ValueError deta hai)

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
// count() built-in nahi hai -- regex ya loop lagana padta hai
s.startsWith("hello")  // true
s.endsWith("python")   // true
s.includes("hello")    // true
```

### Modification Methods (Naya String Return Karte Hain)

```python
s = "  hello world  "
s.strip()              # "hello world" (leading/trailing whitespace hataata hai)
s.lstrip()             # "hello world  "
s.rstrip()             # "  hello world"
s.strip("hd ")         # "ello worl" (specific characters strip karo)

"hello world".replace("world", "Python")    # "hello Python"
"a-b-c-d".replace("-", "_", 2)             # "a_b_c-d" (replacements limit karo)

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

s.padStart(20)         // "       hello        " (left pad)
s.padEnd(20)           // "hello               " (right pad)
```

### Split aur Join

```python
# Split
"a,b,c,d".split(",")          # ['a', 'b', 'c', 'd']
"a,b,c,d".split(",", 2)       # ['a', 'b', 'c,d'] (max 2 splits)
"hello world".split()          # ['hello', 'world'] (kisi bhi whitespace pe split)
"a\nb\nc".splitlines()         # ['a', 'b', 'c']

# Join (note: yeh STRING method hai, list method nahi!)
",".join(["a", "b", "c"])     # "a,b,c"
" -> ".join(["step1", "step2", "step3"])  # "step1 -> step2 -> step3"
"".join(["h", "e", "l", "l", "o"])        # "hello"

# Sirf strings hi join ho sakti hain -- numbers ko convert karna padega
", ".join(str(x) for x in [1, 2, 3])  # "1, 2, 3"
```

```javascript
// JS equivalents
"a,b,c,d".split(",")          // ['a', 'b', 'c', 'd']
["a", "b", "c"].join(",")     // "a,b,c"  (JS mein yeh ARRAY method hai)
```

**Yaad rakhna:** Python mein `join()` string method hai jo separator pe call hota hai — `separator.join(list)`. JS mein `join()` array method hai jo array pe call hota hai — `list.join(separator)`. Order bilkul ulta hai dono mein, isi wajah se shuru mein log confuse hote hain. Ek baar zubaani yaad kar lo: "Python mein pehle separator, phir list" — bas.

### Validation Methods

```python
"hello".isalpha()      # True (sab alphabetic)
"12345".isdigit()      # True (sab digits)
"abc123".isalnum()     # True (sab alphanumeric)
"   ".isspace()        # True (sab whitespace)
"hello".isascii()      # True (sab ASCII characters)
"Hello World".istitle() # True (title case)
```

JS mein inka koi built-in equivalent nahi hai -- regex use karna padega.

---

## String Slicing

Yeh Python ka asli superpower hai. JS mein iske jaisa kuch bhi nahi hai.

### Basic Slicing: `s[start:stop:step]`

```python
s = "Hello, World!"

# Single character access (JS jaisa hi)
s[0]           # 'H'
s[7]           # 'W'
s[-1]          # '!' (last char)
s[-2]          # 'd' (second to last)

# Slicing: s[start:stop] -- start inclusive, stop exclusive
s[0:5]         # 'Hello'
s[7:12]        # 'World'

# start ya stop chhod bhi sakte ho
s[:5]          # 'Hello' (shuru se)
s[7:]          # 'World!' (end tak)
s[:]           # 'Hello, World!' (poora string ka copy)

# Slices mein negative indices
s[-6:]         # 'orld!' (aakhri 6 characters)
s[:-6]         # 'Hello, ' (aakhri 6 chhodkar sab)

# Step parameter
s[::2]         # 'Hlo ol!' (har 2nd character)
s[1::2]        # 'el,Wrd' (index 1 se har 2nd character)

# String ko REVERSE karo (iconic Python one-liner)
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
// step parameter nahi hai, reverse karna bhi easy nahi
s.split('').reverse().join('')  // '!dlroW ,olleH' (verbose!)
```

### Slicing Safe Hai

Python slicing kabhi index error nahi deti, chahe indices out-of-range hi kyun na hon. Bilkul waise hi jaise IRCTC pe agar 200 tak seat maango aur train mein sirf 50 hi hain, toh IRCTC crash nahi karta, jitni hain utni de deta hai.

```python
s = "hello"
s[0:100]       # 'hello' (gracefully end pe ruk jaata hai)
s[50:100]      # '' (empty string, koi error nahi)
s[-100:3]      # 'hel' (gracefully shuru se start karta hai)
```

```javascript
// JS ka slice bhi similarly forgiving hai
"hello".slice(0, 100)  // "hello"
```

Lekin single index access error zaroor dega:
```python
s = "hello"
s[50]          # IndexError: string index out of range
```

---

## String Immutability

Strings dono, Python aur JavaScript mein immutable hain. Kisi character ko in-place change nahi kar sakte.

```python
s = "hello"
# s[0] = "H"   # TypeError: 'str' object does not support item assignment

# Iske bajaye naya string banao
s = "H" + s[1:]       # "Hello"
s = s.replace("h", "H")  # "Hello"
```

---

## Useful String Patterns

### User Input Check Aur Clean Karna

```python
user_input = "  Alice Smith  "

# Clean aur validate karo
cleaned = user_input.strip()
if cleaned and cleaned.replace(" ", "").isalpha():
    first, last = cleaned.split(maxsplit=1)
    print(f"First: {first}, Last: {last}")
```

### Strings Efficiently Banana

```python
# BAD: Loop mein string concatenation (har baar naya string banta hai)
result = ""
for i in range(1000):
    result += str(i)     # O(n^2) -- bade n ke liye slow

# GOOD: join() use karo
result = "".join(str(i) for i in range(1000))  # O(n)

# GOOD: List banao aur end mein join karo
parts = []
for i in range(1000):
    parts.append(str(i))
result = "".join(parts)
```

```javascript
// JS mein bhi yahi problem hai, lekin modern engines isko behtar optimize karte hain
// Phir bhi, bade concatenations ke liye Array.join() hi preferred hai
let parts = [];
for (let i = 0; i < 1000; i++) parts.push(String(i));
let result = parts.join("");
```

### textwrap Se Multi-line String Formatting

```python
import textwrap

# dedent common leading whitespace hata deta hai
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
# Ek saath multiple characters replace karo
table = str.maketrans("aeiou", "12345")
"hello world".translate(table)  # "h2ll4 w4rld"

# Specific characters hatao
remove_table = str.maketrans("", "", "aeiou")
"hello world".translate(remove_table)  # "hll wrld"
```

---

## Encoding Aur Bytes

**Kya hota hai?** Strings insaano ke padhne ke liye hote hain, bytes computer/network ke liye. Bilkul jaise UPI app mein tumhe "₹500 sent to Ramesh" saaf-saaf dikhta hai, lekin backend mein wahi transaction encoded bytes ke form mein server tak travel karta hai. Encode karo string ko bytes mein bhejne ke liye, decode karo bytes ko wapas readable string banane ke liye.

```python
# Strings Unicode hote hain (JS jaisa hi)
s = "Hello, "  # Unicode string
print(len(s))                  # 8

# Bytes mein encode karo
b = s.encode("utf-8")         # b'Hello, \xe4\xb8\x96\xe7\x95\x8c'
print(type(b))                 # <class 'bytes'>
print(len(b))                  # 12 (UTF-8 CJK character ke liye 3 bytes use karta hai)

# Wapas string mein decode karo
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

> [!info]
> Python ka `replace()` default mein SAARI occurrences replace karta hai (JS ke `replaceAll()` jaisa). JS ka `replace()` sirf pehli occurrence replace karta hai, jab tak `g` flag wali regex use na karo.

---

## Practice Exercises

### Exercise 1: String Formatter
Ek function likho jo person ka naam aur balance leke aisi formatted receipt line return kare: `"Alice.............$1,234.57"` (total width 30 characters).

```python
# Yahan apna code likho
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

# Ya string formatting tricks use karke
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
Ek function likho jo check kare ki string palindrome hai ya nahi, case aur non-alphanumeric characters ignore karke. Test karo `"A man, a plan, a canal: Panama"` se.

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
Ek sentence diya hai, har word ki frequency count karo (case-insensitive) aur unhe frequency ke hisaab se sort karke print karo (sabse zyada pehle).

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

# Frequency ke hisaab se sort karo (descending), phir alphabetically
for word, count in sorted(freq.items(), key=lambda x: (-x[1], x[0])):
    print(f"{word}: {count}")

# Ya collections.Counter use karo (Pythonic tareeka)
from collections import Counter
freq = Counter(text.lower().split())
for word, count in freq.most_common():
    print(f"{word}: {count}")
```
</details>

### Exercise 4: Slug Generator
Ek function likho jo title ko URL slug mein convert kare: lowercase, spaces ko hyphens mein, non-alphanumeric characters hatao (hyphens ke alawa), multiple hyphens ko collapse karo. Bilkul waise, jaise Flipkart product URL banata hai — `iphone-15-pro-max` type.

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
    # Lowercase karo
    slug = title.lower().strip()
    # Spaces ko hyphens se replace karo
    slug = slug.replace(" ", "-")
    # Sirf alphanumeric aur hyphens rakho
    slug = "".join(c for c in slug if c.isalnum() or c == "-")
    # Multiple hyphens collapse karo
    while "--" in slug:
        slug = slug.replace("--", "-")
    # Leading/trailing hyphens hatao
    slug = slug.strip("-")
    return slug

print(slugify("Hello, World! This is a Test"))     # hello-world-this-is-a-test
print(slugify("  Multiple   Spaces   Here  "))     # multiple-spaces-here
print(slugify("Special $#@! Characters"))           # special-characters
print(slugify("Python 3.12 -- What's New?"))        # python-312-whats-new
```
</details>

### Exercise 5: Caesar Cipher
Ek Caesar cipher implement karo jo letters ko `n` positions se shift kare. Uppercase, lowercase handle karo, aur non-letters ko as-it-is chhod do. Encrypt aur decrypt dono include karo.

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

# ROT13 ek special case hai
print(caesar_encrypt("Hello", 13))             # Uryyb
print(caesar_encrypt("Uryyb", 13))             # Hello (self-inverse!)
```
</details>
