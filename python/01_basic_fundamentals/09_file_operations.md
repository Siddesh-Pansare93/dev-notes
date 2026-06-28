# 09 - File Operations

## Coming from Node.js/TypeScript

In Node.js, file operations use the `fs` module with callbacks, promises, or sync variants. Python's approach is simpler: synchronous by default, with the `with` statement providing automatic cleanup. The `pathlib` module gives you an object-oriented path API that is cleaner than Node's `path` module.

---

## Opening Files

### The open() Function

```python
# Basic file opening
file = open("data.txt", "r")    # open for reading
content = file.read()
file.close()                     # MUST close manually

# THE PYTHON WAY: use 'with' statement (context manager)
with open("data.txt", "r") as file:
    content = file.read()
# File is automatically closed when the block exits
# Even if an exception occurs!
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

### File Modes

| Mode   | Description                          | JS Equivalent              |
|--------|--------------------------------------|----------------------------|
| `"r"`  | Read (default). Error if no file.    | `readFile`                 |
| `"w"`  | Write. Creates or truncates file.    | `writeFile`                |
| `"a"`  | Append. Creates if not exists.       | `appendFile`               |
| `"x"`  | Exclusive create. Error if exists.   | `writeFile` with `wx` flag |
| `"r+"` | Read and write (file must exist).    | `open` with `r+`          |
| `"w+"` | Read and write (truncates).          | `open` with `w+`          |
| `"a+"` | Read and append.                     | `open` with `a+`          |
| `"b"`  | Binary mode (add to any above).      | No encoding option         |
| `"t"`  | Text mode (default).                 | Specify `'utf-8'`         |

```python
# Text mode (default)
with open("data.txt", "r") as f:       # read text
    pass

# Binary mode
with open("image.png", "rb") as f:     # read binary
    pass

with open("output.bin", "wb") as f:    # write binary
    pass

# Explicit encoding (important for cross-platform!)
with open("data.txt", "r", encoding="utf-8") as f:
    content = f.read()
```

---

## Reading Files

### read() -- Read Entire File

```python
with open("data.txt", "r", encoding="utf-8") as f:
    content = f.read()          # entire file as one string
    print(content)

# Read limited number of characters
with open("data.txt", "r") as f:
    first_100 = f.read(100)    # first 100 characters
    next_100 = f.read(100)     # next 100 characters
```

### readline() -- Read One Line

```python
with open("data.txt", "r") as f:
    first_line = f.readline()       # includes the \n
    second_line = f.readline()
    # Returns "" when file is exhausted
```

### readlines() -- Read All Lines into a List

```python
with open("data.txt", "r") as f:
    lines = f.readlines()          # list of strings, each with \n

# Remove newlines
with open("data.txt", "r") as f:
    lines = [line.rstrip("\n") for line in f.readlines()]

# Or equivalently:
with open("data.txt", "r") as f:
    lines = f.read().splitlines()   # splitlines() strips line endings
```

### Iterating Over Lines (THE BEST WAY)

For large files, iterate directly. This reads one line at a time -- memory efficient.

```python
# Memory-efficient line iteration
with open("large_file.txt", "r") as f:
    for line in f:                 # f is iterable!
        line = line.rstrip("\n")
        process(line)

# With line numbers
with open("data.txt", "r") as f:
    for line_num, line in enumerate(f, start=1):
        print(f"{line_num}: {line.rstrip()}")

# Collect lines that match a condition
with open("server.log", "r") as f:
    errors = [line for line in f if "ERROR" in line]
```

```javascript
// Node.js line-by-line reading (more complex)
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

## Writing Files

### write() -- Write a String

```python
# Write (creates or overwrites)
with open("output.txt", "w", encoding="utf-8") as f:
    f.write("Hello, World!\n")
    f.write("Second line\n")

# Write returns the number of characters written
with open("output.txt", "w") as f:
    chars_written = f.write("Hello")    # 5
```

### writelines() -- Write Multiple Strings

```python
lines = ["First line\n", "Second line\n", "Third line\n"]

with open("output.txt", "w") as f:
    f.writelines(lines)     # does NOT add newlines -- you must include them!

# Common pattern: add newlines
data = ["apple", "banana", "cherry"]
with open("output.txt", "w") as f:
    f.writelines(f"{item}\n" for item in data)
```

### print() to a File

```python
# Use print's file parameter
with open("output.txt", "w") as f:
    print("Hello, World!", file=f)
    print("Second line", file=f)
    print(f"Value: {42}", file=f)
    # print automatically adds newlines
```

### Appending

```python
# Append to existing file
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

## The `with` Statement (Context Managers)

The `with` statement guarantees cleanup. It is not just for files -- it works with anything that implements the context manager protocol.

```python
# File (most common use)
with open("file.txt") as f:
    data = f.read()
# f.close() is called automatically

# Multiple files at once
with open("input.txt") as infile, open("output.txt", "w") as outfile:
    for line in infile:
        outfile.write(line.upper())

# Python 3.10+ parenthesized syntax for many files
with (
    open("file1.txt") as f1,
    open("file2.txt") as f2,
    open("output.txt", "w") as out,
):
    pass

# Creating your own context manager
class Timer:
    def __enter__(self):
        import time
        self.start = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        import time
        self.elapsed = time.time() - self.start
        print(f"Elapsed: {self.elapsed:.4f}s")
        return False  # don't suppress exceptions

with Timer() as t:
    # do some work
    sum(range(1_000_000))
# Prints: Elapsed: 0.0312s

# Or use contextlib for simpler context managers
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
// JS has no direct equivalent of 'with' for resource management.
// Closest is try/finally:
const file = fs.openSync('file.txt', 'r');
try {
    // use file
} finally {
    fs.closeSync(file);
}

// Or the newer Symbol.dispose (TC39 stage 3):
// using file = openFile('file.txt');
```

---

## pathlib.Path vs os.path

`pathlib` is the modern, object-oriented way to handle paths. Prefer it over `os.path` in new code.

```python
from pathlib import Path
import os

# Creating paths
# os.path way:
path = os.path.join("home", "user", "documents", "file.txt")

# pathlib way:
path = Path("home") / "user" / "documents" / "file.txt"

# Common operations comparison
filepath = Path("/home/user/documents/report.pdf")

# Get parts
filepath.name          # "report.pdf"       vs os.path.basename()
filepath.stem          # "report"            vs os.path.splitext()[0]
filepath.suffix        # ".pdf"              vs os.path.splitext()[1]
filepath.parent        # Path("/home/user/documents")
filepath.parents[1]    # Path("/home/user")
filepath.parts         # ('/', 'home', 'user', 'documents', 'report.pdf')

# Check properties
filepath.exists()      # bool               vs os.path.exists()
filepath.is_file()     # bool               vs os.path.isfile()
filepath.is_dir()      # bool               vs os.path.isdir()
filepath.stat().st_size  # file size in bytes

# Resolve and absolute
filepath.resolve()     # absolute path with symlinks resolved
filepath.absolute()    # absolute path
filepath.is_absolute() # bool

# Change extension
filepath.with_suffix(".docx")    # Path("/home/user/documents/report.docx")
filepath.with_name("summary.pdf")  # Path("/home/user/documents/summary.pdf")

# Directory operations
Path("new_dir").mkdir(exist_ok=True)
Path("nested/deep/dir").mkdir(parents=True, exist_ok=True)

# Glob
list(Path(".").glob("*.py"))           # all .py in current dir
list(Path(".").glob("**/*.py"))        # all .py recursively
list(Path(".").rglob("*.py"))          # same as **/*.py

# Delete
Path("file.txt").unlink(missing_ok=True)   # delete file
Path("empty_dir").rmdir()                   # delete empty directory
# For non-empty directories:
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
// Node has no built-in glob -- need 'glob' or 'fast-glob' package
```

---

## JSON File Operations

### Reading and Writing JSON

```python
import json

# Read JSON file
with open("config.json", "r") as f:
    config = json.load(f)          # file -> dict

# Write JSON file
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

# String operations (no file)
json_string = json.dumps(data, indent=2)          # dict -> string
parsed = json.loads(json_string)                   # string -> dict

# Handle special types (datetime, custom objects)
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
// JS JSON (almost identical concepts)
JSON.parse(jsonString)
JSON.stringify(data)
JSON.stringify(data, null, 2)  // pretty print

// File operations need fs:
const data = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
fs.writeFileSync('output.json', JSON.stringify(data, null, 2));
```

### JSON Lines (JSONL) Format

```python
# Write JSONL (one JSON object per line)
records = [
    {"id": 1, "name": "Alice"},
    {"id": 2, "name": "Bob"},
    {"id": 3, "name": "Charlie"},
]

with open("data.jsonl", "w") as f:
    for record in records:
        f.write(json.dumps(record) + "\n")

# Read JSONL (memory efficient for large files)
with open("data.jsonl", "r") as f:
    for line in f:
        record = json.loads(line)
        print(record)
```

---

## CSV File Operations

```python
import csv

# Read CSV
with open("data.csv", "r") as f:
    reader = csv.reader(f)
    header = next(reader)       # first row
    for row in reader:
        print(row)              # list of strings

# Read CSV as dictionaries
with open("data.csv", "r") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row["name"], row["age"])

# Write CSV
with open("output.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["name", "age", "city"])       # header
    writer.writerow(["Alice", 30, "NYC"])
    writer.writerows([                              # multiple rows
        ["Bob", 25, "LA"],
        ["Charlie", 35, "Chicago"],
    ])

# Write CSV from dicts
with open("output.csv", "w", newline="") as f:
    fieldnames = ["name", "age", "city"]
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerow({"name": "Alice", "age": 30, "city": "NYC"})
```

---

## Working with Binary Files

```python
# Read binary file
with open("image.png", "rb") as f:
    data = f.read()
    print(f"File size: {len(data)} bytes")
    print(f"PNG header: {data[:8]}")

# Write binary file
with open("copy.png", "wb") as f:
    f.write(data)

# Copy a file
import shutil
shutil.copy2("source.txt", "destination.txt")    # preserves metadata
shutil.copytree("source_dir", "dest_dir")         # copy entire directory

# Read binary in chunks (memory efficient for large files)
CHUNK_SIZE = 8192
with open("large_file.bin", "rb") as f:
    while chunk := f.read(CHUNK_SIZE):
        process(chunk)
```

---

## Temporary Files

```python
import tempfile

# Create a temporary file (auto-deleted when closed)
with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
    f.write("temporary data")
    temp_path = f.name
    print(f"Temp file: {temp_path}")

# Create a temporary directory
with tempfile.TemporaryDirectory() as tmpdir:
    temp_file = Path(tmpdir) / "data.txt"
    temp_file.write_text("hello")
    print(f"Temp dir: {tmpdir}")
# Directory and contents are auto-deleted when block exits
```

---

## Common File Patterns

### Process and Transform a File

```python
def transform_file(input_path, output_path, transform_fn):
    """Read a file, transform each line, write to new file."""
    with open(input_path, "r") as infile, open(output_path, "w") as outfile:
        for line in infile:
            outfile.write(transform_fn(line))

# Usage: uppercase every line
transform_file("input.txt", "output.txt", str.upper)

# Usage: number every line
def add_line_numbers(line, counter=[0]):
    counter[0] += 1
    return f"{counter[0]:4d}: {line}"
transform_file("input.txt", "numbered.txt", add_line_numbers)
```

### Safe File Writing (Atomic Write)

```python
import tempfile
import os
from pathlib import Path

def safe_write(filepath, content):
    """Write to a file atomically (won't corrupt on crash)."""
    filepath = Path(filepath)
    # Write to temp file in same directory
    fd, tmp_path = tempfile.mkstemp(dir=filepath.parent)
    try:
        with os.fdopen(fd, "w") as f:
            f.write(content)
        # Atomic rename (on same filesystem)
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
    """Watch a file for changes and call callback when modified."""
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
Write a function that reads a log file and returns a summary: total lines, error count, most common error, and the time range.

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

# Create a test log file and analyze it
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
Build a config file manager that supports reading, writing, and updating JSON config files with dot-notation access for nested keys.

```python
class Config:
    def __init__(self, filepath): pass
    def get(self, dotted_key, default=None): pass
    def set(self, dotted_key, value): pass
    def save(self): pass

# config.get("database.host")  -> reads config["database"]["host"]
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
Write a script that finds duplicate files in a directory (by content hash, not name). Report the duplicates and how much space could be saved.

<details>
<summary>Solution</summary>

```python
import hashlib
from pathlib import Path
from collections import defaultdict

def hash_file(filepath, chunk_size=8192):
    """Compute SHA-256 hash of a file."""
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(chunk_size):
            sha256.update(chunk)
    return sha256.hexdigest()

def find_duplicates(directory, pattern="*"):
    """Find duplicate files in a directory."""
    directory = Path(directory)
    hash_map = defaultdict(list)

    # First pass: group by size (quick filter)
    size_map = defaultdict(list)
    for filepath in directory.rglob(pattern):
        if filepath.is_file():
            size_map[filepath.stat().st_size].append(filepath)

    # Second pass: hash only files with duplicate sizes
    for size, files in size_map.items():
        if len(files) < 2:
            continue
        for filepath in files:
            file_hash = hash_file(filepath)
            hash_map[file_hash].append(filepath)

    # Filter to only actual duplicates
    duplicates = {
        hash_val: files
        for hash_val, files in hash_map.items()
        if len(files) > 1
    }

    return duplicates

def report_duplicates(duplicates):
    """Print a report of duplicate files."""
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
