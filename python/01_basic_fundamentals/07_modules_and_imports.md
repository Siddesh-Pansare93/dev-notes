# 07 - Modules and Imports

## Node.js/TypeScript se aa rahe ho? Yeh samjho

JavaScript ne `require()` (CommonJS) se `import/export` (ES Modules) tak ka safar tay kiya hai. Python ka import system usse zyada simple aur consistent hai, though iske apne quirks hai. Sabse badi baat: Python ki standard library itni bharipuri hai ki common kaamon ke liye `pip install` karne ki zarurat kam hi padti hai — jaise Zomato apne app mein khud hi payment, delivery tracking, sab kuch bana ke deta hai, alag se third-party integrate karne ki zarurat nahi.

---

## Import Basics

**Kya hota hai?** Import matlab ek file ka code doosri file mein use karna — bilkul waisa hi jaise tum Swiggy app mein "payments" module ko "checkout" screen mein use karte ho, poora payment gateway dobara likhne ki zarurat nahi.

### import ke Styles

```python
# 1. Poora module import karo
import os
print(os.getcwd())

# 2. Specific cheez import karo
from os.path import join, exists
print(join("/home", "user", "file.txt"))

# 3. Alias ke saath import
import numpy as np
import pandas as pd
from collections import defaultdict as dd

# 4. Sab kuch import karna (generally AVOID karo)
from os.path import *    # namespace pollute karta hai, pata nahi chalta kahan se aaya
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

### JavaScript se Key Differences

| Python                        | JavaScript                           |
|-------------------------------|--------------------------------------|
| `import os`                   | `import * as os from 'os'`           |
| `from os import getcwd`       | `import { getcwd } from 'os'`       |
| `from os import getcwd as cwd` | `import { getcwd as cwd } from 'os'` |
| `import json`                 | `const json = require('json')` (install ki zarurat nahi!) |
| No default exports            | `export default` / `import x from`   |
| No `export` keyword           | `export function ...`                |

**Python mein, module level pe define ki gayi har cheez automatically "exported" hoti hai.** Koi `export` keyword nahi hota. Convention se, `_` se shuru hone wale naam "private" maane jaate hain.

> [!info]
> JS mein tumhe explicitly `export` likhna padta hai, warna cheez file ke bahar nahi jaati. Python mein ulta hai — sab kuch by default accessible hai, aur underscore sirf ek "please isko mत chhedo" wala sign board hai, koi lock nahi.

---

## Apne Khud ke Modules Banana

**Kyun zaruri hai?** Jaise hi project badhta hai, ek hi `main.py` mein sab kuch thoos ke rakhna mushkil ho jaata hai — bilkul waisa jaise ek hi Zomato outlet mein kitchen, billing aur delivery sab ek room mein karne ki koshish karoge. Alag files (modules) banake responsibilities split karna zaruri hai.

### Module Matlab Sirf Ek .py File

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

_internal_cache = {}     # underscore prefix = "convention se private"
```

```python
# main.py
import utils
print(utils.slugify("Hello World"))

from utils import slugify, truncate, PI
print(slugify("Hello World"))
print(PI)

# _internal_cache accessible hai but private signal diya hai
# utils._internal_cache  # kaam karega but karna nahi chahiye
```

---

## Packages (Modules ki Directories)

**Kya hota hai?** Package basically ek folder hai jisme related modules ikattha rakhe jaate hain — jaise ek Swiggy ke "database" department mein connection, models aur queries teeno alag files hain, but sab ek hi folder ke andar organized hain.

### __init__.py

Ek directory Python package tab banti hai jab usme `__init__.py` ho. Yeh Node.js ke `index.js` jaisa hai — ek entry point jo bata deta hai "yahan se andar aao."

```
my_project/
    main.py
    database/
        __init__.py        # 'database' ko package banata hai
        connection.py
        models.py
        queries.py
```

```python
# database/__init__.py
# Empty bhi ho sakta hai, ya convenience ke liye re-export kar sakte ho:
from .connection import connect, disconnect
from .models import User, Post
from .queries import find_user, create_user

# Ab users seedha yeh kar sakte hain:
# from database import connect, User, find_user
# Iski jagah yeh likhne ke bajaye:
# from database.connection import connect
# from database.models import User
```

```javascript
// JS equivalent: database/index.js
export { connect, disconnect } from './connection.js';
export { User, Post } from './models.js';
export { findUser, createUser } from './queries.js';
```

Socho ek Swiggy ka backend hai jisme `database` folder hai — `__init__.py` ek receptionist ki tarah kaam karta hai jo bahar se aane wale requests ko seedha sahi jagah bhej deta hai, tumhe har baar `database.connection.connect` type ki lambi chain nahi likhni padti.

### Relative vs Absolute Imports

```python
# database/queries.py

# Absolute import (project root se)
from database.models import User
from database.connection import get_db

# Relative import (current package ke relative)
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

**Python ke relative imports** dots use karte hain: `.` matlab current package, `..` matlab parent package. Yeh sirf packages ke andar kaam karte hain (directly-run scripts mein nahi).

> [!warning]
> Agar tum ek script ko directly `python queries.py` se chalane ki koshish karoge jisme relative import (`.models`) hai, toh error milega. Relative imports sirf tab kaam karte hain jab file kisi package ke part ke roop mein import ho rahi ho, standalone script ke roop mein nahi.

---

## Module Search Path

**Kya hota hai?** Jab tum `import xyz` likhte ho, Python ko pata kaise chalta hai `xyz` kahan dhundhe? Bilkul IRCTC ki tarah, jo pehle tumhare nearest station check karta hai, phir zone, phir poora network — order fix hai. Python bhi in jagahon pe order se dhundta hai:

1. Chal rahi script ki directory
2. `PYTHONPATH` environment variable mein di gayi directories
3. Standard library directories
4. `site-packages` (jahan pip packages install karta hai)

```python
import sys
print(sys.path)   # poora search path dikhata hai

# Isko modify kar sakte ho (but generally nahi karna chahiye)
sys.path.append("/path/to/my/modules")
```

```javascript
// JS equivalents
// NODE_PATH environment variable
// node_modules directories (upar ki taraf search hoti hai)
// require.resolve.paths('module')
```

### Common Import Errors

```python
# ModuleNotFoundError: No module named 'requests'
# -> pip install requests

# ImportError: cannot import name 'xyz' from 'module'
# -> spelling check karo, check karo ki naam us module mein exist karta hai ya nahi

# Circular imports
# a.py, b.py se import karta hai, b.py, a.py se import karta hai
# Solutions:
# 1. Import ko us function ke andar move karo jisko zarurat hai
# 2. Circle todne ke liye restructure karo
# 3. Sirf type hints ke liye TYPE_CHECKING use karo

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .models import User    # sirf type checking ke liye import, runtime pe nahi
```

> [!tip]
> Circular imports bilkul waisa hi hai jaise do dost ek dusre ko "pehle tum bolo" keh ke wait kar rahe hon — koi shuru hi nahi karta. Fix simple hai: kisi ek ko import ko function ke andar daal do, taaki woh sirf tabhi chale jab actually zarurat ho, module load hote hi nahi.

---

## Standard Library: Python Ka Superpower

**Kyun zaruri hai?** Node.js mein zyaadatar kaam ke liye tum npm pe jaake package dhundte ho. Python ki standard library Node.js ke muqable bohot bhari hai — jo cheezein Node mein npm packages maangti hain, woh Python mein built-in hoti hain, jaise ek all-in-one Flipkart warehouse jahan tumhe har cheez already stock mein mil jaati hai.

### os aur sys -- System aur OS Operations

```python
import os
import sys

# Current directory
os.getcwd()                          # process.cwd() jaisa

# Environment variables
os.environ.get("HOME")              # process.env.HOME jaisa
os.environ.get("API_KEY", "default")

# Path operations (naye code ke liye pathlib prefer karo)
os.path.join("dir", "subdir", "file.txt")
os.path.exists("/some/path")
os.path.isfile("/some/path")
os.path.isdir("/some/path")
os.path.basename("/path/to/file.txt")    # "file.txt"
os.path.dirname("/path/to/file.txt")     # "/path/to"
os.path.splitext("file.txt")            # ("file", ".txt")

# System info
sys.argv                # command line arguments (process.argv jaisa)
sys.platform            # "linux", "darwin", "win32"
sys.version             # Python version string
sys.exit(1)             # exit code ke saath (process.exit(1) jaisa)
```

### pathlib -- Modern Path Handling

`pathlib` `os.path` ka modern replacement hai. Yeh object-oriented approach use karta hai.

```python
from pathlib import Path

# Paths banao
home = Path.home()                    # /home/username
cwd = Path.cwd()                     # current working directory
config = Path("/etc") / "myapp" / "config.yml"   # / operator paths joins karta hai!

# Path operations
p = Path("/home/user/documents/report.pdf")
p.name          # "report.pdf"
p.stem          # "report"
p.suffix        # ".pdf"
p.parent        # Path("/home/user/documents")
p.parts         # ('/', 'home', 'user', 'documents', 'report.pdf')

# Existence check karo
p.exists()
p.is_file()
p.is_dir()

# Files read/write karo
content = Path("config.yml").read_text()
Path("output.txt").write_text("hello")

# Glob (files dhundo)
for py_file in Path(".").glob("**/*.py"):
    print(py_file)

# Directory contents list karo
for item in Path(".").iterdir():
    print(item)

# Directories banao
Path("new/nested/dir").mkdir(parents=True, exist_ok=True)
```

```javascript
// JS equivalent (requires 'path' module)
const path = require('path');
path.join('/home', 'user', 'file.txt');
path.basename('/path/to/file.txt');
path.extname('file.txt');
// Built-in glob nahi hai -- 'glob' package chahiye
```

`Path("/etc") / "myapp" / "config.yml"` dekh ke thoda ajeeb lagega — `/` operator se paths join ho rahe hain! Yeh Python ka operator overloading hai, string concatenation nahi. IRCTC ke ticket path jaisa socho: `station / platform / seat` — har `/` ek level neeche le jaata hai.

### json -- JSON Handling

```python
import json

# JSON string -> Python dict parse karo
data = json.loads('{"name": "Alice", "age": 30}')
print(data["name"])    # "Alice"

# Python dict -> JSON string
json_str = json.dumps(data)
json_str = json.dumps(data, indent=2)           # pretty print
json_str = json.dumps(data, sort_keys=True)     # sorted keys

# JSON file read karo
with open("config.json") as f:
    config = json.load(f)                       # note: load (loads nahi)

# JSON file write karo
with open("output.json", "w") as f:
    json.dump(data, f, indent=2)                # note: dump (dumps nahi)
```

```javascript
// JS equivalents
JSON.parse('{"name": "Alice"}');
JSON.stringify(data);
JSON.stringify(data, null, 2);    // pretty print
// File reading ke liye fs module chahiye
```

**Naming convention:** `loads`/`dumps` **s**trings ke saath kaam karte hain. `load`/`dump` **f**iles ke saath kaam karte hain. Yaad rakhne ka tarika: extra "s" = string.

### datetime -- Date aur Time

```python
from datetime import datetime, date, time, timedelta

# Current time
now = datetime.now()                    # local time
utc_now = datetime.utcnow()            # UTC time (3.12 mein deprecated)
from datetime import timezone
utc_now = datetime.now(timezone.utc)    # preferred tarika

# Specific dates banao
birthday = datetime(1990, 6, 15, 14, 30)
today = date.today()

# String mein format karo
now.strftime("%Y-%m-%d %H:%M:%S")      # "2024-01-15 14:30:00"
now.strftime("%B %d, %Y")              # "January 15, 2024"
now.isoformat()                         # "2024-01-15T14:30:00.123456"

# String se parse karo
dt = datetime.strptime("2024-01-15", "%Y-%m-%d")
dt = datetime.fromisoformat("2024-01-15T14:30:00")

# Time arithmetic
tomorrow = now + timedelta(days=1)
last_week = now - timedelta(weeks=1)
duration = tomorrow - now               # timedelta object
print(duration.total_seconds())         # 86400.0
```

```javascript
// JS Date badnaam hi hai apni takleef ke liye
new Date();
new Date().toISOString();
// Zyadatar JS devs date-fns ya dayjs use karte hain. Python ki datetime built-in hai.
```

### collections -- Advanced Data Structures

```python
from collections import (
    namedtuple,      # lists_and_tuples mein cover hua
    defaultdict,     # dictionaries mein cover hua
    Counter,         # dictionaries mein cover hua
    deque,           # double-ended queue
    OrderedDict,     # insertion-ordered dict (Python 3.7 ke baad kam zarurat)
)

# deque -- dono ends se efficient append/pop
from collections import deque

dq = deque([1, 2, 3])
dq.appendleft(0)        # [0, 1, 2, 3]
dq.append(4)            # [0, 1, 2, 3, 4]
dq.popleft()             # 0
dq.rotate(2)             # right ki taraf 2 se rotate karo

# Fixed-size deque (purana automatically drop hota hai)
recent = deque(maxlen=3)
for i in range(5):
    recent.append(i)
print(recent)            # deque([2, 3, 4], maxlen=3)
```

`deque(maxlen=3)` ko ek "last 3 orders" wali Swiggy notification list jaisa socho — naya order aate hi sabse purana automatically hat jaata hai, tumhe manually delete nahi karna padta.

### itertools -- Iteration Tools

```python
import itertools

# chain -- iterables ko concatenate karo
list(itertools.chain([1, 2], [3, 4], [5]))     # [1, 2, 3, 4, 5]

# product -- Cartesian product
list(itertools.product("AB", "12"))
# [('A', '1'), ('A', '2'), ('B', '1'), ('B', '2')]

# permutations aur combinations
list(itertools.permutations("ABC", 2))
# [('A','B'), ('A','C'), ('B','A'), ('B','C'), ('C','A'), ('C','B')]

list(itertools.combinations("ABCD", 2))
# [('A','B'), ('A','C'), ('A','D'), ('B','C'), ('B','D'), ('C','D')]

# groupby (sorted input chahiye)
data = [("A", 1), ("A", 2), ("B", 3), ("B", 4)]
for key, group in itertools.groupby(data, key=lambda x: x[0]):
    print(f"{key}: {list(group)}")
# A: [('A', 1), ('A', 2)]
# B: [('B', 3), ('B', 4)]

# islice -- ek iterator ko slice karo
list(itertools.islice(range(1000000), 5))  # [0, 1, 2, 3, 4]

# count, cycle, repeat -- infinite iterators
counter = itertools.count(start=10, step=2)  # 10, 12, 14, 16, ...
cycler = itertools.cycle(["red", "green", "blue"])  # hamesha repeat hota rahega
```

### Baaki Zaruri Standard Library Modules

```python
# re -- Regular expressions
import re
match = re.search(r"\d+", "age: 30")
if match:
    print(match.group())    # "30"

# copy -- Deep aur shallow copying
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

# dataclasses -- Structured data (aage cover hoga)
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

**Kya hota hai?** Ek hi file kabhi standalone script ki tarah chalti hai, kabhi doosri file mein import hoke helper ki tarah kaam karti hai. Python ke paas is do-mode behavior ko handle karne ke liye chand smart patterns hain.

### if __name__ == "__main__"

Yeh Python ka tarika hai check karne ka ki file directly run ho rahi hai ya import ki gayi hai.

```python
# utils.py
def helper():
    return "I'm a helper"

def main():
    """Yeh sirf tab chalega jab file directly execute ki jaaye."""
    print(helper())
    print("Running utils.py directly")

if __name__ == "__main__":
    main()

# Jab import kiya jaaye: __name__ == "utils"  (module ka naam)
# Jab directly run kiya jaaye: __name__ == "__main__"
```

```javascript
// JS equivalent
// CommonJS
if (require.main === module) {
    main();
}
// ES Modules -- koi clean equivalent nahi, workarounds chahiye
```

Socho `utils.py` ek dabbawala hai jo do mode mein kaam karta hai — agar tum usse "seedha jaao" bolo (`python utils.py`), toh woh apna kaam khud shuru kar dega. Agar koi doosra module usse "bulata" hai (`import utils`), toh woh chup chap sirf apne functions available karwa deta hai, khud kuch print nahi karta.

### Module-Level Configuration

```python
# config.py
import os

# Module-level code sirf EK BAAR chalta hai jab pehli baar import ho
DEBUG = os.environ.get("DEBUG", "false").lower() == "true"
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///db.sqlite3")
MAX_RETRIES = int(os.environ.get("MAX_RETRIES", "3"))

print(f"Config loaded. DEBUG={DEBUG}")  # pehle import pe ek baar print hota hai
```

### Lazy Imports

```python
# Heavy modules ke liye, function ke andar import karo
def process_data(data):
    import pandas as pd     # sirf tab import hoga jab function call ho
    df = pd.DataFrame(data)
    return df.describe()

# Useful hai:
# - Startup time kam karne ke liye
# - Optional dependencies ke liye
# - Circular imports todne ke liye
```

---

## Third-Party Packages (pip)

**Kya hota hai?** Standard library sab kuch nahi de sakti — kabhi kabhi tumhe koi third-party library chahiye hoti hai, bilkul waise hi jaise Zomato apna delivery khud nahi karta, kabhi third-party logistics partner use karta hai. Python mein iske liye `pip` hai — Node.js ke `npm` jaisa package manager.

```bash
# Packages install karo (npm install jaisa)
pip install requests
pip install flask sqlalchemy

# Specific version install karo
pip install requests==2.31.0
pip install "requests>=2.28,<3.0"

# Requirements file se install karo (package.json dependencies jaisa)
pip install -r requirements.txt

# Requirements file banao
pip freeze > requirements.txt

# Uninstall karo
pip uninstall requests

# Installed list dekho
pip list
```

```
# requirements.txt (package.json jaisa but simpler)
requests==2.31.0
flask>=2.3.0
sqlalchemy~=2.0
python-dotenv
```

```bash
# Virtual environments (node_modules isolation jaisa)
python -m venv venv           # banao
source venv/bin/activate      # activate karo (Linux/Mac)
venv\Scripts\activate         # activate karo (Windows)
deactivate                    # deactivate karo
```

> [!tip]
> Virtual environment ko socho apne project ka apna alag "kitchen" jaisa — jaise har Zomato restaurant ka apna kitchen hota hai, ek doosre ki ingredients mix nahi hoti. `venv` bina, saare projects ke packages global system pe mix ho jaate hain aur version clashes ho sakte hain.

---

## Summary: Import Comparison

| Task                       | Python                            | JavaScript                        |
|----------------------------|-----------------------------------|-----------------------------------|
| Module import               | `import os`                       | `import * as os from 'os'`        |
| Specific import             | `from os import path`             | `import { path } from 'os'`      |
| Alias ke saath import       | `import numpy as np`              | `import np from 'numpy'`          |
| Relative import              | `from .utils import helper`       | `import { helper } from './utils'`|
| Package entry point         | `__init__.py`                     | `index.js`                        |
| Main check                  | `if __name__ == "__main__":`      | `if (require.main === module)`    |
| Package manager              | `pip`                             | `npm` / `yarn` / `pnpm`          |
| Dependencies file            | `requirements.txt` / `pyproject.toml` | `package.json`               |
| Lock file                   | `requirements.txt` (pinned)       | `package-lock.json`              |
| Isolation                    | `venv` / `virtualenv`             | `node_modules` (per project)      |

---

## Practice Exercises

### Exercise 1: Ek Mini Package Banao
`mathtools` naam ka package banao jisme teen modules hon: `basic.py` (add, subtract, multiply, divide), `stats.py` (mean, median, mode), aur `__init__.py` jo sab kuch re-export kare. Fir usse ek main script se use karo.

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
# ya: import mathtools; mathtools.add(1, 2)

print(add(10, 5))                    # 15
print(mean([1, 2, 3, 4, 5]))        # 3.0
print(median([1, 3, 5, 7, 9]))      # 5
```
</details>

### Exercise 2: Standard Library Scavenger Hunt
Bina koi package install kiye, ek script likho jo:
1. 16 characters ka random password generate kare
2. Usse SHA-256 se hash kare
3. Current date ko "January 15, 2024" format mein le
4. Ek UUID banaye
5. Ek nested dictionary ko JSON ke roop mein pretty-print kare

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

# Better: cryptographic randomness ke liye secrets module use karo
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
`pathlib` use karke, ek script likho jo ek directory path le aur uski structure ko tree jaisa dikhaye, saath mein file sizes aur extension filter bhi de.

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
    """Extension filter ke saath directory tree dikhao."""
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
            continue  # hidden files skip karo

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
    """Directory contents ka summary do."""
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

## Key Takeaways

- Python mein koi `export` keyword nahi hota — module level pe define ki har cheez automatically accessible hai; `_` prefix sirf "private by convention" hai.
- `import x` poora module import karta hai, `from x import y` specific cheez, aur `as` se alias milta hai — `from x import *` avoid karo.
- Directory ko package banane ke liye `__init__.py` chahiye — yeh Node.js ke `index.js` jaisa entry point hai.
- Relative imports (`.` current package, `..` parent) sirf packages ke andar kaam karte hain, standalone scripts mein nahi.
- Circular imports fix karne ke teen tarike: import ko function ke andar daalo, code restructure karo, ya sirf type hints ke liye `TYPE_CHECKING` use karo.
- Standard library (`os`, `pathlib`, `json`, `datetime`, `collections`, `itertools`) itni powerful hai ki bohot saare common kaamon ke liye pip install ki zarurat hi nahi padti.
- `if __name__ == "__main__":` batata hai ki file directly run ho rahi hai ya kahin se import ki gayi hai.
- `pip` + `venv` mila ke Python ka `npm` + `node_modules` jaisa isolation dete hain — har project ka apna alag environment.
