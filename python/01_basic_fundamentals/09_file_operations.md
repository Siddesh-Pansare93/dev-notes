# 09 - File Operations

## Node.js/TypeScript se aa rahe ho?

Node.js mein file operations ke liye `fs` module hai — callbacks, promises, ya sync variants, teeno options milte hain aur decide khud karna padta hai kaunsa use karein. Python ka approach seedha-saadha hai: by default synchronous, aur `with` statement automatic cleanup de deta hai — soch mat, bas likho. Aur `pathlib` module ek object-oriented path API deta hai jo Node ke `path` module se kaafi cleaner hai.

---

## Files Kholna (Opening Files)

### The open() Function

**Kya hota hai?** Socho file ek dabba hai jise tumne khola — kaam ho jaye toh band bhi karna padta hai, warna resource leak ho jaata hai (jaise fridge ka darwaza khula chhod dena). Python isko automate kar deta hai taaki tumhe yaad na rakhna pade.

```python
# Basic file opening
file = open("data.txt", "r")    # read ke liye khola
content = file.read()
file.close()                     # MANUALLY band karna zaruri hai

# PYTHON WALA TARIKA: 'with' statement (context manager) use karo
with open("data.txt", "r") as file:
    content = file.read()
# Block khatam hote hi file khud-ba-khud band ho jaati hai
# Exception aaye tab bhi!
```

```javascript
// Node.js equivalent
const fs = require('fs');

// Sync
const content = fs.readFileSync('data.txt', 'utf-8');

// Async (callback)
fs.readFile('data.txt', 'utf-8', (err, data) => { ... });

// Async (promise)
const data = await fs.promises.readFile('data.txt', 'utf-8');
```

> [!tip]
> `with` statement ko dabbawala samjho — tiffin deliver karke wapas dabba collect karna uska responsibility hai, tumhe yaad rakhne ki zarurat nahi. Yahi cheez `with` file close karne ke liye karta hai.

### File Modes

Jab bhi `open()` karte ho, ek mode batana padta hai — matlab file ke saath karna kya hai: sirf padhna hai, likhna hai, ya purane content ke aage jodna hai.

| Mode   | Kya karta hai                          | JS Equivalent              |
|--------|--------------------------------------|----------------------------|
| `"r"`  | Read (default). File na ho toh error.    | `readFile`                 |
| `"w"`  | Write. File banata hai ya purani mita deta hai.    | `writeFile`                |
| `"a"`  | Append. File na ho toh bana deta hai.       | `appendFile`               |
| `"x"`  | Exclusive create. File pehle se ho toh error.   | `writeFile` with `wx` flag |
| `"r+"` | Read aur write (file exist karni chahiye).    | `open` with `r+`          |
| `"w+"` | Read aur write (purana content mit jaata hai).          | `open` with `w+`          |
| `"a+"` | Read aur append.                     | `open` with `a+`          |
| `"b"`  | Binary mode (kisi bhi upar wale mode ke saath jod do).      | No encoding option         |
| `"t"`  | Text mode (default).                 | Specify `'utf-8'`         |

```python
# Text mode (default)
with open("data.txt", "r") as f:       # text padho
    pass

# Binary mode
with open("image.png", "rb") as f:     # binary padho
    pass

with open("output.bin", "wb") as f:    # binary likho
    pass

# Explicit encoding (cross-platform ke liye zaruri!)
with open("data.txt", "r", encoding="utf-8") as f:
    content = f.read()
```

---

## Files Padhna (Reading Files)

Python file padhne ke teen tarike deta hai — poori file ek saath, ek line, ya sab lines ek list mein. Kaunsa use karna hai, ye depend karta hai file kitni badi hai.

### read() -- Poori File Ek Saath Padho

```python
with open("data.txt", "r", encoding="utf-8") as f:
    content = f.read()          # poori file ek hi string mein
    print(content)

# Limited characters padho
with open("data.txt", "r") as f:
    first_100 = f.read(100)    # pehle 100 characters
    next_100 = f.read(100)     # agle 100 characters
```

### readline() -- Ek Line Padho

```python
with open("data.txt", "r") as f:
    first_line = f.readline()       # \n bhi saath aata hai
    second_line = f.readline()
    # File khatam hone par "" return karta hai
```

### readlines() -- Saari Lines Ko List Mein Padho

```python
with open("data.txt", "r") as f:
    lines = f.readlines()          # strings ki list, har ek ke saath \n

# Newlines hatao
with open("data.txt", "r") as f:
    lines = [line.rstrip("\n") for line in f.readlines()]

# Ya isi ke barabar:
with open("data.txt", "r") as f:
    lines = f.read().splitlines()   # splitlines() line endings apne aap hata deta hai
```

### Lines Pe Iterate Karna (SABSE BADHIYA TARIKA)

Bade files ke liye seedha iterate karo. Ye ek time mein ek hi line padhta hai — memory efficient hai, jaise Swiggy ek order ek time process karta hai, poora din ka load ek saath memory mein nahi rakhta.

```python
# Memory-efficient line iteration
with open("large_file.txt", "r") as f:
    for line in f:                 # f khud iterable hai!
        line = line.rstrip("\n")
        process(line)

# Line numbers ke saath
with open("data.txt", "r") as f:
    for line_num, line in enumerate(f, start=1):
        print(f"{line_num}: {line.rstrip()}")

# Condition match karne wali lines collect karo
with open("server.log", "r") as f:
    errors = [line for line in f if "ERROR" in line]
```

```javascript
// Node.js line-by-line reading (zyada complex)
const readline = require('readline');
const fs = require('fs');
const rl = readline.createInterface({
    input: fs.createReadStream('data.txt'),
});
for await (const line of rl) {
    console.log(line);
}
```

### pathlib Shortcut

```python
from pathlib import Path

# One-liner file reading
content = Path("data.txt").read_text(encoding="utf-8")
lines = Path("data.txt").read_text().splitlines()
binary_data = Path("image.png").read_bytes()
```

---

## Files Likhna (Writing Files)

### write() -- String Likho

```python
# Write (banata hai ya overwrite karta hai)
with open("output.txt", "w", encoding="utf-8") as f:
    f.write("Hello, World!\n")
    f.write("Second line\n")

# write() likhe gaye characters ki count return karta hai
with open("output.txt", "w") as f:
    chars_written = f.write("Hello")    # 5
```

### writelines() -- Multiple Strings Likho

```python
lines = ["First line\n", "Second line\n", "Third line\n"]

with open("output.txt", "w") as f:
    f.writelines(lines)     # ye newlines ADD NAHI karta -- tumhe khud dalna padega!

# Common pattern: newlines add karo
data = ["apple", "banana", "cherry"]
with open("output.txt", "w") as f:
    f.writelines(f"{item}\n" for item in data)
```

### File Mein print() Karna

```python
# print ka file parameter use karo
with open("output.txt", "w") as f:
    print("Hello, World!", file=f)
    print("Second line", file=f)
    print(f"Value: {42}", file=f)
    # print khud newlines add kar deta hai
```

### Append Karna

```python
# Existing file mein append karo
with open("log.txt", "a") as f:
    f.write(f"[{datetime.now()}] New log entry\n")
```

### pathlib Shortcut

```python
from pathlib import Path

# One-liner file writing
Path("output.txt").write_text("Hello, World!\n", encoding="utf-8")
Path("data.bin").write_bytes(b"\x00\x01\x02")
```

---

## `with` Statement (Context Managers)

**Kyun zaruri hai?** Kabhi socha hai agar file padhte waqt beech mein exception aa jaaye toh kya hoga? Bina `with` ke, `file.close()` call hi nahi hoga aur file khuli reh jaayegi. `with` statement cleanup guarantee karta hai, chahe kuch bhi ho jaaye. Aur ye sirf files ke liye nahi hai -- context manager protocol implement karne wali kisi bhi cheez ke saath kaam karta hai.

```python
# File (sabse common use)
with open("file.txt") as f:
    data = f.read()
# f.close() apne aap call ho jaata hai

# Ek saath multiple files
with open("input.txt") as infile, open("output.txt", "w") as outfile:
    for line in infile:
        outfile.write(line.upper())

# Python 3.10+ mein bahut saari files ke liye parenthesized syntax
with (
    open("file1.txt") as f1,
    open("file2.txt") as f2,
    open("output.txt", "w") as out,
):
    pass

# Apna khud ka context manager banana
class Timer:
    def __enter__(self):
        import time
        self.start = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        import time
        self.elapsed = time.time() - self.start
        print(f"Elapsed: {self.elapsed:.4f}s")
        return False  # exceptions ko suppress mat karo

with Timer() as t:
    # kuch kaam karo
    sum(range(1_000_000))
# Prints: Elapsed: 0.0312s

# Ya contextlib use karo simpler context managers ke liye
from contextlib import contextmanager

@contextmanager
def timer(label=""):
    import time
    start = time.time()
    yield
    elapsed = time.time() - start
    print(f"{label} took {elapsed:.4f}s")

with timer("Processing"):
    sum(range(1_000_000))
```

```javascript
// JS mein 'with' jaisa resource-management direct equivalent nahi hai.
// Sabse kareeb try/finally hai:
const file = fs.openSync('file.txt', 'r');
try {
    // file use karo
} finally {
    fs.closeSync(file);
}

// Ya newer Symbol.dispose (TC39 stage 3):
// using file = openFile('file.txt');
```

---

## pathlib.Path vs os.path

`pathlib` paths handle karne ka modern, object-oriented tarika hai — string concatenation ki jagah `/` operator se paths bante hain, jo padhne mein bhi zyada natural lagta hai. Naye code mein `os.path` se better isse hi prefer karo.

```python
from pathlib import Path
import os

# Paths banana
# os.path wala tarika:
path = os.path.join("home", "user", "documents", "file.txt")

# pathlib wala tarika:
path = Path("home") / "user" / "documents" / "file.txt"

# Common operations comparison
filepath = Path("/home/user/documents/report.pdf")

# Parts nikalo
filepath.name          # "report.pdf"       vs os.path.basename()
filepath.stem          # "report"            vs os.path.splitext()[0]
filepath.suffix        # ".pdf"              vs os.path.splitext()[1]
filepath.parent        # Path("/home/user/documents")
filepath.parents[1]    # Path("/home/user")
filepath.parts         # ('/', 'home', 'user', 'documents', 'report.pdf')

# Properties check karo
filepath.exists()      # bool               vs os.path.exists()
filepath.is_file()     # bool               vs os.path.isfile()
filepath.is_dir()      # bool               vs os.path.isdir()
filepath.stat().st_size  # file size in bytes

# Resolve aur absolute
filepath.resolve()     # symlinks resolve karke absolute path
filepath.absolute()    # absolute path
filepath.is_absolute() # bool

# Extension badalna
filepath.with_suffix(".docx")    # Path("/home/user/documents/report.docx")
filepath.with_name("summary.pdf")  # Path("/home/user/documents/summary.pdf")

# Directory operations
Path("new_dir").mkdir(exist_ok=True)
Path("nested/deep/dir").mkdir(parents=True, exist_ok=True)

# Glob
list(Path(".").glob("*.py"))           # current dir ke saare .py files
list(Path(".").glob("**/*.py"))        # recursively saare .py files
list(Path(".").rglob("*.py"))          # **/*.py jaisa hi hai

# Delete
Path("file.txt").unlink(missing_ok=True)   # file delete karo
Path("empty_dir").rmdir()                   # empty directory delete karo
# Non-empty directories ke liye:
import shutil
shutil.rmtree("dir_with_contents")
```

```javascript
// Node.js path module
const path = require('path');
path.join('home', 'user', 'file.txt');
path.basename('/path/to/file.txt');
path.extname('file.txt');
path.dirname('/path/to/file.txt');
path.resolve('relative/path');
// Node mein built-in glob nahi hai -- 'glob' ya 'fast-glob' package chahiye
```

---

## JSON File Operations

### JSON Padhna Aur Likhna

```python
import json

# JSON file padho
with open("config.json", "r") as f:
    config = json.load(f)          # file -> dict

# JSON file likho
data = {
    "name": "Alice",
    "age": 30,
    "hobbies": ["reading", "coding"],
    "address": {
        "city": "NYC",
        "state": "NY",
    },
}

with open("output.json", "w") as f:
    json.dump(data, f, indent=2)    # dict -> file (pretty printed)

# String operations (bina file ke)
json_string = json.dumps(data, indent=2)          # dict -> string
parsed = json.loads(json_string)                   # string -> dict

# Special types handle karo (datetime, custom objects)
from datetime import datetime

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

data_with_date = {"name": "Alice", "created": datetime.now()}
json.dumps(data_with_date, cls=DateTimeEncoder, indent=2)
```

```javascript
// JS JSON (concepts almost identical)
JSON.parse(jsonString)
JSON.stringify(data)
JSON.stringify(data, null, 2)  // pretty print

// File operations ke liye fs chahiye:
const data = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
fs.writeFileSync('output.json', JSON.stringify(data, null, 2));
```

### JSON Lines (JSONL) Format

JSONL samjho ek IRCTC ki waiting list jaisa — har row apne aap mein complete record hai, ek ke baad ek, bina kisi bade array bracket ke. Isliye bade datasets ke liye line-by-line process karna easy ho jaata hai.

```python
# JSONL likho (ek line mein ek JSON object)
records = [
    {"id": 1, "name": "Alice"},
    {"id": 2, "name": "Bob"},
    {"id": 3, "name": "Charlie"},
]

with open("data.jsonl", "w") as f:
    for record in records:
        f.write(json.dumps(record) + "\n")

# JSONL padho (bade files ke liye memory efficient)
with open("data.jsonl", "r") as f:
    for line in f:
        record = json.loads(line)
        print(record)
```

---

## CSV File Operations

Excel sheet jaisi files ke liye — jaise Flipkart apna order data CSV mein export karta hai, taaki tum Excel ya kisi bhi tool mein khol sako.

```python
import csv

# CSV padho
with open("data.csv", "r") as f:
    reader = csv.reader(f)
    header = next(reader)       # pehli row
    for row in reader:
        print(row)              # strings ki list

# CSV ko dictionaries ki tarah padho
with open("data.csv", "r") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row["name"], row["age"])

# CSV likho
with open("output.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["name", "age", "city"])       # header
    writer.writerow(["Alice", 30, "NYC"])
    writer.writerows([                              # multiple rows
        ["Bob", 25, "LA"],
        ["Charlie", 35, "Chicago"],
    ])

# Dicts se CSV likho
with open("output.csv", "w", newline="") as f:
    fieldnames = ["name", "age", "city"]
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerow({"name": "Alice", "age": 30, "city": "NYC"})
```

---

## Binary Files Ke Saath Kaam Karna

Text files ke alawa, images, PDFs, ya audio jaise files bhi handle karni padti hain — inhe `"b"` mode mein kholte hain, taaki Python inko string ki tarah decode karne ki koshish na kare aur raw bytes hi mile.

```python
# Binary file padho
with open("image.png", "rb") as f:
    data = f.read()
    print(f"File size: {len(data)} bytes")
    print(f"PNG header: {data[:8]}")

# Binary file likho
with open("copy.png", "wb") as f:
    f.write(data)

# File copy karo
import shutil
shutil.copy2("source.txt", "destination.txt")    # metadata preserve karta hai
shutil.copytree("source_dir", "dest_dir")         # poori directory copy karo

# Bade file ko chunks mein padho (memory efficient)
CHUNK_SIZE = 8192
with open("large_file.bin", "rb") as f:
    while chunk := f.read(CHUNK_SIZE):
        process(chunk)
```

---

## Temporary Files

Socho ek room service ka disposable cup — kaam ho gaya, khud-ba-khud clean ho jaata hai, tumhe manually fenkna nahi padta. Temporary files bhi isi tarah kaam karte hain: process khatam hote hi khud disappear ho jaate hain.

```python
import tempfile

# Temporary file banao (close hote hi auto-deleted)
with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
    f.write("temporary data")
    temp_path = f.name
    print(f"Temp file: {temp_path}")

# Temporary directory banao
with tempfile.TemporaryDirectory() as tmpdir:
    temp_file = Path(tmpdir) / "data.txt"
    temp_file.write_text("hello")
    print(f"Temp dir: {tmpdir}")
# Block khatam hote hi directory aur uska content auto-delete ho jaata hai
```

---

## Common File Patterns

### File Ko Process Aur Transform Karna

```python
def transform_file(input_path, output_path, transform_fn):
    """File padho, har line transform karo, naye file mein likho."""
    with open(input_path, "r") as infile, open(output_path, "w") as outfile:
        for line in infile:
            outfile.write(transform_fn(line))

# Usage: har line ko uppercase karo
transform_file("input.txt", "output.txt", str.upper)

# Usage: har line pe number lagao
def add_line_numbers(line, counter=[0]):
    counter[0] += 1
    return f"{counter[0]:4d}: {line}"
transform_file("input.txt", "numbered.txt", add_line_numbers)
```

### Safe File Writing (Atomic Write)

> [!warning]
> Agar UPI transaction beech mein crash ho jaaye toh ya toh poora paisa cut hoga ya bilkul nahi — half-transaction nahi hoti. File writing mein bhi yahi guarantee chahiye hoti hai kabhi-kabhi, taaki crash hone par file corrupt na ho.

```python
import tempfile
import os
from pathlib import Path

def safe_write(filepath, content):
    """File ko atomically likho (crash hone par corrupt nahi hogi)."""
    filepath = Path(filepath)
    # Same directory mein temp file banao
    fd, tmp_path = tempfile.mkstemp(dir=filepath.parent)
    try:
        with os.fdopen(fd, "w") as f:
            f.write(content)
        # Atomic rename (same filesystem par)
        os.replace(tmp_path, filepath)
    except:
        os.unlink(tmp_path)
        raise
```

### File Watcher (Simple)

```python
import time
from pathlib import Path

def watch_file(filepath, callback, interval=1.0):
    """File mein changes dekho aur modify hone par callback call karo."""
    filepath = Path(filepath)
    last_modified = filepath.stat().st_mtime if filepath.exists() else 0

    print(f"Watching {filepath}...")
    while True:
        try:
            current_modified = filepath.stat().st_mtime
            if current_modified != last_modified:
                last_modified = current_modified
                callback(filepath)
        except FileNotFoundError:
            pass
        time.sleep(interval)

# Usage:
# watch_file("config.json", lambda p: print(f"{p} changed!"))
```

---

## Summary: File Operations Comparison

| Operation              | Python                              | Node.js                              |
|------------------------|-------------------------------------|--------------------------------------|
| Read file              | `open("f").read()` / `Path("f").read_text()` | `fs.readFileSync("f", "utf-8")` |
| Write file             | `open("f","w").write(s)`            | `fs.writeFileSync("f", s)`          |
| Append                 | `open("f","a").write(s)`            | `fs.appendFileSync("f", s)`         |
| Auto-close             | `with open("f") as f:`             | `try/finally` or `using`             |
| Read lines             | `for line in f:` / `f.readlines()` | `readline` module                    |
| Path join              | `Path("a") / "b"`                  | `path.join("a", "b")`               |
| File exists            | `Path("f").exists()`               | `fs.existsSync("f")`                |
| File name              | `Path("f").name`                   | `path.basename("f")`                |
| Extension              | `Path("f").suffix`                 | `path.extname("f")`                 |
| Glob                   | `Path(".").glob("*.py")`           | `require('glob').glob("*.py")`       |
| JSON read              | `json.load(f)`                     | `JSON.parse(fs.readFileSync(f))`     |
| JSON write             | `json.dump(data, f)`               | `fs.writeFileSync(f, JSON.stringify(d))` |
| Delete file            | `Path("f").unlink()`               | `fs.unlinkSync("f")`                |
| Make directory          | `Path("d").mkdir(parents=True)`    | `fs.mkdirSync("d", {recursive:true})` |

---

## Practice Exercises

### Exercise 1: Log File Analyzer
Ek function likho jo log file padhe aur summary return kare: total lines, error count, sabse common error, aur time range.

```python
# Sample log format:
# 2024-01-15 10:30:00 INFO User logged in
# 2024-01-15 10:30:05 ERROR Database connection failed
# 2024-01-15 10:30:10 WARNING Slow query detected
```

<details>
<summary>Solution</summary>

```python
from collections import Counter
from datetime import datetime
from pathlib import Path

def analyze_log(filepath):
    levels = Counter()
    errors = []
    timestamps = []

    with open(filepath, "r") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue

            parts = line.split(maxsplit=3)
            if len(parts) < 4:
                continue

            date_str, time_str, level, message = parts

            try:
                ts = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
                timestamps.append(ts)
            except ValueError:
                pass

            levels[level] += 1
            if level == "ERROR":
                errors.append(message)

    error_types = Counter(errors)
    total = sum(levels.values())

    return {
        "total_lines": total,
        "levels": dict(levels),
        "error_count": levels.get("ERROR", 0),
        "most_common_error": error_types.most_common(1)[0] if error_types else None,
        "time_range": {
            "start": min(timestamps).isoformat() if timestamps else None,
            "end": max(timestamps).isoformat() if timestamps else None,
        },
    }

# Test log file banao aur analyze karo
test_log = """2024-01-15 10:30:00 INFO Server started
2024-01-15 10:30:05 ERROR Database connection failed
2024-01-15 10:30:10 WARNING Slow query detected
2024-01-15 10:30:15 INFO User logged in
2024-01-15 10:30:20 ERROR Database connection failed
2024-01-15 10:30:25 ERROR File not found
2024-01-15 10:30:30 INFO Request processed
"""

Path("test.log").write_text(test_log)
result = analyze_log("test.log")

import json
print(json.dumps(result, indent=2))
Path("test.log").unlink()  # cleanup
```
</details>

### Exercise 2: Config File Manager
Ek config file manager banao jo JSON config files ko read, write, aur update kare, nested keys ke liye dot-notation access ke saath.

```python
class Config:
    def __init__(self, filepath): pass
    def get(self, dotted_key, default=None): pass
    def set(self, dotted_key, value): pass
    def save(self): pass

# config.get("database.host")  -> config["database"]["host"] padhta hai
# config.set("database.port", 3306)
# config.save()
```

<details>
<summary>Solution</summary>

```python
import json
from pathlib import Path

class Config:
    def __init__(self, filepath):
        self.filepath = Path(filepath)
        if self.filepath.exists():
            self.data = json.loads(self.filepath.read_text())
        else:
            self.data = {}

    def get(self, dotted_key, default=None):
        keys = dotted_key.split(".")
        current = self.data
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return default
        return current

    def set(self, dotted_key, value):
        keys = dotted_key.split(".")
        current = self.data
        for key in keys[:-1]:
            if key not in current or not isinstance(current[key], dict):
                current[key] = {}
            current = current[key]
        current[keys[-1]] = value

    def delete(self, dotted_key):
        keys = dotted_key.split(".")
        current = self.data
        for key in keys[:-1]:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return False
        if keys[-1] in current:
            del current[keys[-1]]
            return True
        return False

    def save(self):
        self.filepath.write_text(json.dumps(self.data, indent=2))

    def __repr__(self):
        return f"Config({json.dumps(self.data, indent=2)})"

# Usage
config = Config("app_config.json")
config.set("database.host", "localhost")
config.set("database.port", 5432)
config.set("database.credentials.user", "admin")
config.set("database.credentials.password", "secret")
config.set("app.debug", True)
config.set("app.name", "MyApp")

print(config.get("database.host"))                # "localhost"
print(config.get("database.credentials.user"))    # "admin"
print(config.get("missing.key", "default"))       # "default"

config.save()
print(config)

# Cleanup
Path("app_config.json").unlink(missing_ok=True)
```
</details>

### Exercise 3: File Deduplicator
Ek script likho jo kisi directory mein duplicate files dhoonde (content hash se, naam se nahi). Duplicates report karo aur kitni space bach sakti hai wo bhi batao.

<details>
<summary>Solution</summary>

```python
import hashlib
from pathlib import Path
from collections import defaultdict

def hash_file(filepath, chunk_size=8192):
    """File ka SHA-256 hash calculate karo."""
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(chunk_size):
            sha256.update(chunk)
    return sha256.hexdigest()

def find_duplicates(directory, pattern="*"):
    """Directory mein duplicate files dhoondo."""
    directory = Path(directory)
    hash_map = defaultdict(list)

    # Pehla pass: size ke hisaab se group karo (quick filter)
    size_map = defaultdict(list)
    for filepath in directory.rglob(pattern):
        if filepath.is_file():
            size_map[filepath.stat().st_size].append(filepath)

    # Doosra pass: sirf unhi files ko hash karo jinke size duplicate hain
    for size, files in size_map.items():
        if len(files) < 2:
            continue
        for filepath in files:
            file_hash = hash_file(filepath)
            hash_map[file_hash].append(filepath)

    # Sirf actual duplicates ko filter karo
    duplicates = {
        hash_val: files
        for hash_val, files in hash_map.items()
        if len(files) > 1
    }

    return duplicates

def report_duplicates(duplicates):
    """Duplicate files ki report print karo."""
    if not duplicates:
        print("No duplicate files found.")
        return

    total_waste = 0
    for hash_val, files in duplicates.items():
        size = files[0].stat().st_size
        waste = size * (len(files) - 1)
        total_waste += waste

        print(f"\nDuplicates (hash: {hash_val[:12]}..., size: {size:,} bytes):")
        for f in files:
            print(f"  {f}")
        print(f"  Could save: {waste:,} bytes by removing {len(files) - 1} copies")

    print(f"\nTotal potential savings: {total_waste:,} bytes ({total_waste / 1024:.1f} KB)")

# Usage:
# duplicates = find_duplicates("/path/to/directory")
# report_duplicates(duplicates)
```
</details>

## Key Takeaways

- `open()` ke saath `with` statement use karo -- file automatically close ho jaayegi, exception aaye tab bhi.
- Bade files ke liye seedha `for line in f:` se iterate karo -- `readlines()` se poori file memory mein mat load karo.
- `pathlib.Path` ko `os.path` se prefer karo -- cleaner, object-oriented, aur one-liner shortcuts (`read_text()`, `write_text()`) deta hai.
- Cross-platform text files ke liye hamesha `encoding="utf-8"` explicitly specify karo.
- JSON ke liye `json.load`/`json.dump`, CSV ke liye `csv.reader`/`csv.DictReader`, aur binary chunks ke liye `f.read(CHUNK_SIZE)` use karo.
- Crash-safe writes ke liye atomic write pattern use karo (temp file likho, phir `os.replace` se rename karo) -- jaise UPI transaction, half-complete file nahi hona chahiye.
