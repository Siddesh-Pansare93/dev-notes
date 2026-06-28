# 07 - Modules and Imports

## Coming from Node.js/TypeScript

JavaScript has gone through `require()` (CommonJS) to `import/export` (ES Modules). Python's import system is simpler and more consistent, though it has its own quirks. The biggest win: Python's massive standard library means you rarely need to `pip install` for common tasks.

---

## Import Basics

### import Styles

```python
# 1. Import entire module
import os
print(os.getcwd())

# 2. Import specific items
from os.path import join, exists
print(join("/home", "user", "file.txt"))

# 3. Import with alias
import numpy as np
import pandas as pd
from collections import defaultdict as dd

# 4. Import everything (generally AVOID)
from os.path import *    # pollutes namespace, hard to track origins
```

```javascript
// JS CommonJS
const os = require('os');
const { join, resolve } = require('path');

// JS ES Modules
import os from 'os';
import { join, resolve } from 'path';
import * as path from 'path';
import path from 'path';     // default export
```

### Key Differences from JavaScript

| Python                        | JavaScript                           |
|-------------------------------|--------------------------------------|
| `import os`                   | `import * as os from 'os'`           |
| `from os import getcwd`       | `import { getcwd } from 'os'`       |
| `from os import getcwd as cwd` | `import { getcwd as cwd } from 'os'` |
| `import json`                 | `const json = require('json')` (no install needed!) |
| No default exports            | `export default` / `import x from`   |
| No `export` keyword           | `export function ...`                |

**In Python, everything defined at module level is automatically "exported."** There is no `export` keyword. By convention, names starting with `_` are private.

---

## Creating Your Own Modules

### A Module Is Just a .py File

```
my_project/
    main.py
    utils.py
    config.py
```

```python
# utils.py
def slugify(text):
    return text.lower().replace(" ", "-")

def truncate(text, length=100):
    if len(text) <= length:
        return text
    return text[:length - 3] + "..."

PI = 3.14159

_internal_cache = {}     # underscore prefix = "private by convention"
```

```python
# main.py
import utils
print(utils.slugify("Hello World"))

from utils import slugify, truncate, PI
print(slugify("Hello World"))
print(PI)

# _internal_cache is accessible but signaled as private
# utils._internal_cache  # works but you shouldn't
```

---

## Packages (Directories of Modules)

### __init__.py

A directory becomes a Python package when it contains `__init__.py`. This is like `index.js` in Node.js.

```
my_project/
    main.py
    database/
        __init__.py        # makes 'database' a package
        connection.py
        models.py
        queries.py
```

```python
# database/__init__.py
# Can be empty, or can re-export for convenience:
from .connection import connect, disconnect
from .models import User, Post
from .queries import find_user, create_user

# Now users can do:
# from database import connect, User, find_user
# Instead of:
# from database.connection import connect
# from database.models import User
```

```javascript
// JS equivalent: database/index.js
export { connect, disconnect } from './connection.js';
export { User, Post } from './models.js';
export { findUser, createUser } from './queries.js';
```

### Relative vs Absolute Imports

```python
# database/queries.py

# Absolute import (from project root)
from database.models import User
from database.connection import get_db

# Relative import (relative to current package)
from .models import User                    # same directory
from .connection import get_db              # same directory
from ..utils import slugify                 # parent directory
from ..config import DATABASE_URL           # parent directory
```

```javascript
// JS relative imports
import { User } from './models.js';
import { getDb } from './connection.js';
import { slugify } from '../utils.js';
```

**Python relative imports** use dots: `.` is current package, `..` is parent package. These only work inside packages (not in directly-run scripts).

---

## Module Search Path

When you write `import something`, Python searches these locations in order:

1. The directory of the running script
2. Directories in `PYTHONPATH` environment variable
3. Standard library directories
4. `site-packages` (where pip installs packages)

```python
import sys
print(sys.path)   # shows the full search path

# You can modify it (but generally shouldn't)
sys.path.append("/path/to/my/modules")
```

```javascript
// JS equivalents
// NODE_PATH environment variable
// node_modules directories (searched upward)
// require.resolve.paths('module')
```

### Common Import Errors

```python
# ModuleNotFoundError: No module named 'requests'
# -> pip install requests

# ImportError: cannot import name 'xyz' from 'module'
# -> check spelling, check if the name exists in that module

# Circular imports
# a.py imports from b.py, b.py imports from a.py
# Solutions:
# 1. Move the import inside the function that needs it
# 2. Restructure to eliminate the circle
# 3. Use TYPE_CHECKING for type hints only

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .models import User    # only imported for type checking, not at runtime
```

---

## The Standard Library: Python's Superpower

Python's standard library is enormous compared to Node.js's. Many things that require npm packages in Node are built into Python.

### os and sys -- System and OS Operations

```python
import os
import sys

# Current directory
os.getcwd()                          # like process.cwd()

# Environment variables
os.environ.get("HOME")              # like process.env.HOME
os.environ.get("API_KEY", "default")

# Path operations (prefer pathlib for new code)
os.path.join("dir", "subdir", "file.txt")
os.path.exists("/some/path")
os.path.isfile("/some/path")
os.path.isdir("/some/path")
os.path.basename("/path/to/file.txt")    # "file.txt"
os.path.dirname("/path/to/file.txt")     # "/path/to"
os.path.splitext("file.txt")            # ("file", ".txt")

# System info
sys.argv                # command line arguments (like process.argv)
sys.platform            # "linux", "darwin", "win32"
sys.version             # Python version string
sys.exit(1)             # exit with code (like process.exit(1))
```

### pathlib -- Modern Path Handling

`pathlib` is the modern replacement for `os.path`. It uses an object-oriented approach.

```python
from pathlib import Path

# Create paths
home = Path.home()                    # /home/username
cwd = Path.cwd()                     # current working directory
config = Path("/etc") / "myapp" / "config.yml"   # / operator joins paths!

# Path operations
p = Path("/home/user/documents/report.pdf")
p.name          # "report.pdf"
p.stem          # "report"
p.suffix        # ".pdf"
p.parent        # Path("/home/user/documents")
p.parts         # ('/', 'home', 'user', 'documents', 'report.pdf')

# Check existence
p.exists()
p.is_file()
p.is_dir()

# Read/write files
content = Path("config.yml").read_text()
Path("output.txt").write_text("hello")

# Glob (find files)
for py_file in Path(".").glob("**/*.py"):
    print(py_file)

# List directory contents
for item in Path(".").iterdir():
    print(item)

# Create directories
Path("new/nested/dir").mkdir(parents=True, exist_ok=True)
```

```javascript
// JS equivalent (requires 'path' module)
const path = require('path');
path.join('/home', 'user', 'file.txt');
path.basename('/path/to/file.txt');
path.extname('file.txt');
// No built-in glob -- need 'glob' package
```

### json -- JSON Handling

```python
import json

# Parse JSON string -> Python dict
data = json.loads('{"name": "Alice", "age": 30}')
print(data["name"])    # "Alice"

# Python dict -> JSON string
json_str = json.dumps(data)
json_str = json.dumps(data, indent=2)           # pretty print
json_str = json.dumps(data, sort_keys=True)     # sorted keys

# Read JSON file
with open("config.json") as f:
    config = json.load(f)                       # note: load (not loads)

# Write JSON file
with open("output.json", "w") as f:
    json.dump(data, f, indent=2)                # note: dump (not dumps)
```

```javascript
// JS equivalents
JSON.parse('{"name": "Alice"}');
JSON.stringify(data);
JSON.stringify(data, null, 2);    // pretty print
// File reading requires fs module
```

**Naming convention:** `loads`/`dumps` work with **s**trings. `load`/`dump` work with **f**iles.

### datetime -- Date and Time

```python
from datetime import datetime, date, time, timedelta

# Current time
now = datetime.now()                    # local time
utc_now = datetime.utcnow()            # UTC time (deprecated in 3.12)
from datetime import timezone
utc_now = datetime.now(timezone.utc)    # preferred way

# Create specific dates
birthday = datetime(1990, 6, 15, 14, 30)
today = date.today()

# Format to string
now.strftime("%Y-%m-%d %H:%M:%S")      # "2024-01-15 14:30:00"
now.strftime("%B %d, %Y")              # "January 15, 2024"
now.isoformat()                         # "2024-01-15T14:30:00.123456"

# Parse from string
dt = datetime.strptime("2024-01-15", "%Y-%m-%d")
dt = datetime.fromisoformat("2024-01-15T14:30:00")

# Time arithmetic
tomorrow = now + timedelta(days=1)
last_week = now - timedelta(weeks=1)
duration = tomorrow - now               # timedelta object
print(duration.total_seconds())         # 86400.0
```

```javascript
// JS Date is notoriously painful
new Date();
new Date().toISOString();
// Most JS devs use date-fns or dayjs. Python's datetime is built-in.
```

### collections -- Advanced Data Structures

```python
from collections import (
    namedtuple,      # covered in lists_and_tuples
    defaultdict,     # covered in dictionaries
    Counter,         # covered in dictionaries
    deque,           # double-ended queue
    OrderedDict,     # insertion-ordered dict (less needed since Python 3.7)
)

# deque -- efficient append/pop from both ends
from collections import deque

dq = deque([1, 2, 3])
dq.appendleft(0)        # [0, 1, 2, 3]
dq.append(4)            # [0, 1, 2, 3, 4]
dq.popleft()             # 0
dq.rotate(2)             # rotate right by 2

# Fixed-size deque (auto-drops oldest)
recent = deque(maxlen=3)
for i in range(5):
    recent.append(i)
print(recent)            # deque([2, 3, 4], maxlen=3)
```

### itertools -- Iteration Tools

```python
import itertools

# chain -- concatenate iterables
list(itertools.chain([1, 2], [3, 4], [5]))     # [1, 2, 3, 4, 5]

# product -- Cartesian product
list(itertools.product("AB", "12"))
# [('A', '1'), ('A', '2'), ('B', '1'), ('B', '2')]

# permutations and combinations
list(itertools.permutations("ABC", 2))
# [('A','B'), ('A','C'), ('B','A'), ('B','C'), ('C','A'), ('C','B')]

list(itertools.combinations("ABCD", 2))
# [('A','B'), ('A','C'), ('A','D'), ('B','C'), ('B','D'), ('C','D')]

# groupby (requires sorted input)
data = [("A", 1), ("A", 2), ("B", 3), ("B", 4)]
for key, group in itertools.groupby(data, key=lambda x: x[0]):
    print(f"{key}: {list(group)}")
# A: [('A', 1), ('A', 2)]
# B: [('B', 3), ('B', 4)]

# islice -- slice an iterator
list(itertools.islice(range(1000000), 5))  # [0, 1, 2, 3, 4]

# count, cycle, repeat -- infinite iterators
counter = itertools.count(start=10, step=2)  # 10, 12, 14, 16, ...
cycler = itertools.cycle(["red", "green", "blue"])  # repeats forever
```

### Other Essential Standard Library Modules

```python
# re -- Regular expressions
import re
match = re.search(r"\d+", "age: 30")
if match:
    print(match.group())    # "30"

# copy -- Deep and shallow copying
import copy
deep_copy = copy.deepcopy(nested_object)

# functools -- Higher-order function tools
from functools import lru_cache, partial, reduce

# math -- Mathematical functions
import math
math.sqrt(16)     # 4.0
math.ceil(3.2)    # 4
math.floor(3.8)   # 3
math.pi           # 3.14159...

# random -- Random number generation
import random
random.randint(1, 100)
random.choice(["a", "b", "c"])
random.shuffle(my_list)
random.sample(range(100), 10)   # 10 unique random numbers

# hashlib -- Hashing
import hashlib
hashlib.sha256(b"hello").hexdigest()

# uuid -- Unique identifiers
import uuid
str(uuid.uuid4())    # "550e8400-e29b-41d4-a716-446655440000"

# typing -- Type hints
from typing import Optional, Union, Any, Callable

# dataclasses -- Structured data (covered later)
from dataclasses import dataclass

# enum -- Enumerations
from enum import Enum

# argparse -- CLI argument parsing
import argparse

# logging -- Structured logging
import logging

# unittest / pytest -- Testing
import unittest

# http.server -- Quick HTTP server
# python -m http.server 8000
```

---

## Module Patterns

### if __name__ == "__main__"

This is Python's equivalent of checking if a file is being run directly vs imported.

```python
# utils.py
def helper():
    return "I'm a helper"

def main():
    """This runs only when the file is executed directly."""
    print(helper())
    print("Running utils.py directly")

if __name__ == "__main__":
    main()

# When imported: __name__ == "utils"  (the module name)
# When run directly: __name__ == "__main__"
```

```javascript
// JS equivalent
// CommonJS
if (require.main === module) {
    main();
}
// ES Modules -- no clean equivalent, need workarounds
```

### Module-Level Configuration

```python
# config.py
import os

# Module-level code runs ONCE when first imported
DEBUG = os.environ.get("DEBUG", "false").lower() == "true"
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///db.sqlite3")
MAX_RETRIES = int(os.environ.get("MAX_RETRIES", "3"))

print(f"Config loaded. DEBUG={DEBUG}")  # prints once on first import
```

### Lazy Imports

```python
# For heavy modules, import inside the function
def process_data(data):
    import pandas as pd     # only imported when function is called
    df = pd.DataFrame(data)
    return df.describe()

# Useful for:
# - Reducing startup time
# - Optional dependencies
# - Breaking circular imports
```

---

## Third-Party Packages (pip)

```bash
# Install packages (like npm install)
pip install requests
pip install flask sqlalchemy

# Install specific version
pip install requests==2.31.0
pip install "requests>=2.28,<3.0"

# Install from requirements file (like package.json dependencies)
pip install -r requirements.txt

# Create requirements file
pip freeze > requirements.txt

# Uninstall
pip uninstall requests

# List installed
pip list
```

```
# requirements.txt (like package.json but simpler)
requests==2.31.0
flask>=2.3.0
sqlalchemy~=2.0
python-dotenv
```

```bash
# Virtual environments (like node_modules isolation)
python -m venv venv           # create
source venv/bin/activate      # activate (Linux/Mac)
venv\Scripts\activate         # activate (Windows)
deactivate                    # deactivate
```

---

## Summary: Import Comparison

| Task                       | Python                            | JavaScript                        |
|----------------------------|-----------------------------------|-----------------------------------|
| Import module              | `import os`                       | `import * as os from 'os'`        |
| Import specific            | `from os import path`             | `import { path } from 'os'`      |
| Import with alias          | `import numpy as np`              | `import np from 'numpy'`          |
| Relative import            | `from .utils import helper`       | `import { helper } from './utils'`|
| Package entry point        | `__init__.py`                     | `index.js`                        |
| Main check                 | `if __name__ == "__main__":`      | `if (require.main === module)`    |
| Package manager            | `pip`                             | `npm` / `yarn` / `pnpm`          |
| Dependencies file          | `requirements.txt` / `pyproject.toml` | `package.json`               |
| Lock file                  | `requirements.txt` (pinned)       | `package-lock.json`              |
| Isolation                  | `venv` / `virtualenv`             | `node_modules` (per project)      |

---

## Practice Exercises

### Exercise 1: Create a Mini Package
Create a `mathtools` package with three modules: `basic.py` (add, subtract, multiply, divide), `stats.py` (mean, median, mode), and `__init__.py` that re-exports everything. Then use it from a main script.

<details>
<summary>Solution</summary>

```python
# mathtools/__init__.py
from .basic import add, subtract, multiply, divide
from .stats import mean, median, mode

# mathtools/basic.py
def add(a, b): return a + b
def subtract(a, b): return a - b
def multiply(a, b): return a * b
def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b

# mathtools/stats.py
def mean(numbers):
    if not numbers:
        raise ValueError("Cannot compute mean of empty sequence")
    return sum(numbers) / len(numbers)

def median(numbers):
    if not numbers:
        raise ValueError("Cannot compute median of empty sequence")
    sorted_nums = sorted(numbers)
    n = len(sorted_nums)
    mid = n // 2
    if n % 2 == 0:
        return (sorted_nums[mid - 1] + sorted_nums[mid]) / 2
    return sorted_nums[mid]

def mode(numbers):
    if not numbers:
        raise ValueError("Cannot compute mode of empty sequence")
    from collections import Counter
    counts = Counter(numbers)
    max_count = max(counts.values())
    modes = [k for k, v in counts.items() if v == max_count]
    return modes[0] if len(modes) == 1 else modes

# main.py
from mathtools import add, mean, median
# or: import mathtools; mathtools.add(1, 2)

print(add(10, 5))                    # 15
print(mean([1, 2, 3, 4, 5]))        # 3.0
print(median([1, 3, 5, 7, 9]))      # 5
```
</details>

### Exercise 2: Standard Library Scavenger Hunt
Without installing any packages, write a script that:
1. Generates a random password of 16 characters
2. Hashes it with SHA-256
3. Gets the current date formatted as "January 15, 2024"
4. Creates a UUID
5. Pretty-prints a nested dictionary as JSON

<details>
<summary>Solution</summary>

```python
import random
import string
import hashlib
from datetime import datetime
import uuid
import json

# 1. Random password
chars = string.ascii_letters + string.digits + string.punctuation
password = "".join(random.choices(chars, k=16))
print(f"Password: {password}")

# Better: use secrets module for cryptographic randomness
import secrets
secure_password = "".join(secrets.choice(chars) for _ in range(16))
print(f"Secure password: {secure_password}")

# 2. SHA-256 hash
hashed = hashlib.sha256(password.encode()).hexdigest()
print(f"SHA-256: {hashed}")

# 3. Formatted date
now = datetime.now()
formatted = now.strftime("%B %d, %Y")
print(f"Date: {formatted}")

# 4. UUID
unique_id = str(uuid.uuid4())
print(f"UUID: {unique_id}")

# 5. Pretty JSON
data = {
    "user": {
        "name": "Alice",
        "credentials": {
            "password_hash": hashed,
            "uuid": unique_id,
        },
        "created": formatted,
    }
}
print(json.dumps(data, indent=2))
```
</details>

### Exercise 3: Path Explorer
Using `pathlib`, write a script that takes a directory path and produces a tree-like output of its structure, showing file sizes and filtering by extension.

```python
from pathlib import Path

def show_tree(directory, extension=None, indent=0):
    pass

# show_tree(Path("."), extension=".py")
```

<details>
<summary>Solution</summary>

```python
from pathlib import Path

def show_tree(directory, extension=None, indent=0, max_depth=5):
    """Display directory tree with optional extension filter."""
    directory = Path(directory)
    if not directory.is_dir():
        print(f"Not a directory: {directory}")
        return

    if indent > max_depth:
        return

    prefix = "    " * indent
    items = sorted(directory.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))

    for item in items:
        if item.name.startswith("."):
            continue  # skip hidden files

        if item.is_dir():
            print(f"{prefix}[DIR]  {item.name}/")
            show_tree(item, extension, indent + 1, max_depth)
        elif extension is None or item.suffix == extension:
            size = item.stat().st_size
            if size < 1024:
                size_str = f"{size}B"
            elif size < 1024 * 1024:
                size_str = f"{size / 1024:.1f}KB"
            else:
                size_str = f"{size / (1024*1024):.1f}MB"
            print(f"{prefix}       {item.name} ({size_str})")

def summary(directory, extension=None):
    """Summarize directory contents."""
    directory = Path(directory)
    pattern = f"**/*{extension}" if extension else "**/*"
    files = [f for f in directory.glob(pattern) if f.is_file()]
    total_size = sum(f.stat().st_size for f in files)

    print(f"\nSummary for: {directory.resolve()}")
    print(f"Total files: {len(files)}")
    print(f"Total size: {total_size / 1024:.1f} KB")
    if files:
        extensions = set(f.suffix for f in files)
        print(f"Extensions found: {', '.join(sorted(extensions))}")

# Usage
# show_tree(".", extension=".py")
# summary(".", extension=".py")
```
</details>
