# Context Managers

## Python Ka Resource Management Pattern

Socho tumne Zomato se order kiya — restaurant order accept karta hai, khana banata hai, aur phir *chahe order sahi jaye ya cancel ho jaye*, kitchen ko cleanup toh karna hi padta hai (gas band karo, table saaf karo). Context managers Python mein bilkul yehi karte hain — resource cleanup guarantee karte hain, chahe kuch bhi ho jaye beech mein.

JavaScript/TypeScript mein iska koi direct equivalent nahi hai (sabse paas wala hai `try/finally`, ya phir naya `using` declaration jo TC39/TypeScript 5.2+ mein aaya hai). Python mein tum context managers baar-baar use karoge -- files, database connections, locks, temporary resources, aur bahut kuch ke liye.

> [!info]
> Context manager ka matlab bas itna hai: "setup + guaranteed cleanup", ek hi package mein. Jaise dabbawala pickup aur delivery dono guarantee karta hai -- beech mein traffic mile ya na mile.

---

## `with` Statement

```python
# Python -- context manager cleanup khud handle karta hai
with open("data.txt", "r") as f:
    content = f.read()
# f yahan automatically close ho jaata hai, exception aaye tab bhi

# Context manager ke bina -- cleanup tumhe khud karna padega
f = open("data.txt", "r")
try:
    content = f.read()
finally:
    f.close()
```

```javascript
// JavaScript -- koi built-in equivalent nahi
// Option 1: try/finally
const f = fs.openSync("data.txt", "r");
try {
  const content = fs.readFileSync(f, "utf-8");
} finally {
  fs.closeSync(f);
}

// Option 2: Node.js fs/promises ke convenience methods
const content = await fs.promises.readFile("data.txt", "utf-8");

// Option 3: TypeScript 5.2+ using declaration (TC39 Explicit Resource Management)
{
  using f = openFile("data.txt");
  const content = f.read();
} // f[Symbol.dispose]() automatically call hota hai
```

### Context Managers Zaruri Kyun Hain?

Socho tum ek IRCTC booking process kar rahe ho — payment cut gaya lekin beech mein server crash ho gaya. Agar refund/rollback ka mechanism guaranteed na ho, toh paisa fasa reh jaata hai. Wahi problem yahan hai:

```python
# Problem: agar open aur close ke beech exception aa jaye toh?
f = open("data.txt")
data = f.read()        # Yeh throw kar sakta hai?
process(data)          # Ya yeh?
f.close()              # Yeh line kabhi run hi na ho!

# Solution: with statement cleanup guarantee karta hai
with open("data.txt") as f:
    data = f.read()
    process(data)
# f.close() HAMESHA call hota hai -- exception pe bhi
```

---

## Protocol: `__enter__` aur `__exit__`

Koi bhi object jo `__enter__` aur `__exit__` implement karta hai, wo context manager ban jaata hai. Socho ek dabbawala — pickup pe "enter" hota hai (dabba utha lo), delivery ke baad "exit" hota hai (dabba wapas kar do), chahe raaste mein traffic mile ya na mile.

```python
class ManagedResource:
    def __init__(self, name: str) -> None:
        self.name = name
        print(f"Creating {name}")

    def __enter__(self):
        """'with' block mein enter karte waqt call hota hai. Return value 'as' variable mein bind hota hai."""
        print(f"Acquiring {self.name}")
        return self  # Yeh 'as' variable ban jaata hai

    def __exit__(self, exc_type, exc_val, exc_tb):
        """'with' block se exit karte waqt call hota hai.

        Args:
            exc_type: Exception class (ya None agar exception nahi aaya)
            exc_val:  Exception instance (ya None)
            exc_tb:   Traceback (ya None)

        Returns:
            True -> exception ko suppress karo, False/None -> aage propagate karo.
        """
        print(f"Releasing {self.name}")
        return False  # Exception ko suppress mat karo


> [!warning]
> `__exit__` se `True` return karne ka matlab hai exception "khaa liya" -- wo aage propagate hi nahi hoga. Jab tak jaan-boojh kar suppress nahi karna, hamesha `False` (ya kuch bhi na return karo, `None` default hota hai) return karo, warna bugs silently chup jaayenge.

# Usage
with ManagedResource("database") as db:
    print(f"Using {db.name}")
    # ... kaam karo ...
# Output:
# Creating database
# Acquiring database
# Using database
# Releasing database
```

### `__exit__` Mein Exception Handling

```python
class SafeTransaction:
    def __init__(self, connection):
        self.conn = connection

    def __enter__(self):
        self.conn.begin()
        return self.conn

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            # Exception aaya -- rollback karo
            print(f"Rolling back due to: {exc_val}")
            self.conn.rollback()
            return False  # Exception ko re-raise karo
        else:
            # Koi exception nahi -- commit karo
            self.conn.commit()
            return False

# Exceptions ko suppress karna
class SuppressErrors:
    def __init__(self, *exceptions):
        self.exceptions = exceptions

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None and issubclass(exc_type, self.exceptions):
            print(f"Suppressed: {exc_val}")
            return True  # Exception suppress karo
        return False

with SuppressErrors(FileNotFoundError, PermissionError):
    open("nonexistent_file.txt")  # FileNotFoundError suppress ho jaayega
print("Continues normally")
```

---

## `@contextmanager` Decorator

`__enter__` aur `__exit__` likhna kaafi verbose lagta hai. `contextlib` ka `@contextmanager` decorator tumhe ek simple generator function se hi context manager banane deta hai -- shortcut samajh lo.

> [!tip]
> Yaad rakhne ka tareeka: `yield` se **pehle** ka code `__enter__` hai, `yield` ke **baad** ka code `__exit__` hai. Aur `yield` ko hamesha `try/finally` ke andar rakho, warna exception aane pe cleanup wala part skip ho jaayega.

```python
from contextlib import contextmanager

@contextmanager
def managed_resource(name: str):
    # __enter__ ke barabar: yield se pehle wala code
    print(f"Acquiring {name}")
    resource = {"name": name, "active": True}

    try:
        yield resource  # Yeh value 'as' variable ban jaati hai
    finally:
        # __exit__ ke barabar: yield ke baad wala code (hamesha chalta hai)
        resource["active"] = False
        print(f"Releasing {name}")

with managed_resource("database") as db:
    print(f"Using {db['name']}, active={db['active']}")
# Output:
# Acquiring database
# Using database, active=True
# Releasing database
```

### Real-World Examples

```python
from contextlib import contextmanager
import time
import os
import tempfile

# Timer context manager -- jaise koi Swiggy delivery ka time track kare
@contextmanager
def timer(label: str = "Block"):
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        print(f"{label}: {elapsed:.4f}s")

with timer("Data processing"):
    data = [x**2 for x in range(1_000_000)]

# Temporary directory jo khud-ba-khud clean ho jaati hai
@contextmanager
def temp_workspace():
    original_dir = os.getcwd()
    with tempfile.TemporaryDirectory() as tmpdir:
        os.chdir(tmpdir)
        try:
            yield tmpdir
        finally:
            os.chdir(original_dir)

with temp_workspace() as workspace:
    # Temporary directory mein kaam karo
    with open("temp_data.txt", "w") as f:
        f.write("temporary data")
# Directory aur saari files automatically delete ho jaati hain

# Database connection pool
@contextmanager
def get_db_connection(pool):
    conn = pool.acquire()
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    else:
        conn.commit()
    finally:
        pool.release(conn)

# Environment variable change karo aur restore karo
@contextmanager
def env_var(key: str, value: str):
    old_value = os.environ.get(key)
    os.environ[key] = value
    try:
        yield
    finally:
        if old_value is None:
            del os.environ[key]
        else:
            os.environ[key] = old_value

with env_var("DEBUG", "true"):
    assert os.environ["DEBUG"] == "true"
# Original value restore ho jaati hai
```

---

## Multiple Context Managers

```python
# Ek hi with statement mein multiple context managers
with open("input.txt") as infile, open("output.txt", "w") as outfile:
    for line in infile:
        outfile.write(line.upper())

# Multiline syntax (Python 3.10+) -- parentheses use karta hai
with (
    open("input.txt") as infile,
    open("output.txt", "w") as outfile,
    open("log.txt", "a") as logfile,
):
    for line in infile:
        outfile.write(line.upper())
        logfile.write(f"Processed: {line}")

# 3.10 se pehle: backslash continuation use karo
with open("input.txt") as infile, \
     open("output.txt", "w") as outfile:
    pass
```

---

## Async Context Managers

Async resources ke liye (database connections, HTTP sessions, waghera), Python mein `async with` hota hai.

```python
import asyncio

class AsyncResource:
    async def __aenter__(self):
        print("Async acquiring resource")
        await asyncio.sleep(0.1)  # Async setup simulate karo
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        print("Async releasing resource")
        await asyncio.sleep(0.1)  # Async cleanup simulate karo
        return False

async def main():
    async with AsyncResource() as resource:
        print("Using async resource")

asyncio.run(main())
```

### Async contextmanager

```python
from contextlib import asynccontextmanager
import aiohttp

@asynccontextmanager
async def http_session():
    session = aiohttp.ClientSession()
    try:
        yield session
    finally:
        await session.close()

async def fetch_data():
    async with http_session() as session:
        async with session.get("https://api.example.com/data") as resp:
            return await resp.json()

# Database transaction example
@asynccontextmanager
async def transaction(pool):
    conn = await pool.acquire()
    tx = conn.transaction()
    await tx.start()
    try:
        yield conn
    except Exception:
        await tx.rollback()
        raise
    else:
        await tx.commit()
    finally:
        await pool.release(conn)
```

---

## `contextlib` Utilities

`contextlib` module mein kai useful context manager helpers milte hain.

### `suppress` -- Specific Exceptions Ignore Karo

```python
from contextlib import suppress

# try/except/pass ki jagah
try:
    os.remove("temp.txt")
except FileNotFoundError:
    pass

# suppress use karo
with suppress(FileNotFoundError):
    os.remove("temp.txt")

# Multiple exception types
with suppress(FileNotFoundError, PermissionError):
    os.remove("temp.txt")
```

### `redirect_stdout` / `redirect_stderr`

```python
from contextlib import redirect_stdout, redirect_stderr
import io

# stdout ko string buffer mein capture karo
f = io.StringIO()
with redirect_stdout(f):
    print("This goes to the string buffer")
    print("So does this")

captured = f.getvalue()
print(f"Captured: {captured!r}")

# stdout ko file mein redirect karo
with open("output.log", "w") as f:
    with redirect_stdout(f):
        print("This goes to the file")

# stdout poora suppress karo
with redirect_stdout(io.StringIO()):
    noisy_function()  # Output discard ho jaata hai
```

### `ExitStack` -- Dynamic Context Managers

Jab tumhe pata na ho kitne context managers chahiye honge, tab kaam aata hai.

```python
from contextlib import ExitStack

# Dynamic number ki files open karo
def merge_files(input_paths: list[str], output_path: str) -> None:
    with ExitStack() as stack:
        # Saari input files open karo
        files = [stack.enter_context(open(p)) for p in input_paths]

        # Output file open karo
        output = stack.enter_context(open(output_path, "w"))

        # Saari files process karo
        for f in files:
            output.write(f.read())
    # ExitStack exit hote hi SAARI files automatically close

# Arbitrary cleanup callbacks register karo
with ExitStack() as stack:
    resource = acquire_resource()
    stack.callback(release_resource, resource)  # Exit pe call hoga

    temp_dir = create_temp_dir()
    stack.callback(cleanup_temp_dir, temp_dir)

    # Kaam karo...
# Dono cleanup callbacks reverse order mein chalte hain
```

### `AsyncExitStack` -- Async Version

```python
from contextlib import AsyncExitStack

async def process_batch(urls: list[str]):
    async with AsyncExitStack() as stack:
        session = await stack.enter_async_context(aiohttp.ClientSession())

        connections = []
        for url in urls:
            conn = await stack.enter_async_context(connect(url))
            connections.append(conn)

        # Saare connections ke saath kaam karo
        results = await asyncio.gather(*(c.fetch() for c in connections))
    # Saare connections aur session close
```

### `closing` -- Objects Mein close() Cleanup Add Karo

```python
from contextlib import closing
from urllib.request import urlopen

# urlopen jo response deta hai use close karna chahiye
with closing(urlopen("https://example.com")) as page:
    content = page.read()
# page.close() automatically call ho jaata hai
```

### `nullcontext` -- No-op Context Manager

```python
from contextlib import nullcontext

# Optional context managers ke liye useful
def process(filepath: str, verbose: bool = False):
    # Timer sirf verbose mode mein use karo
    cm = timer("processing") if verbose else nullcontext()
    with cm:
        with open(filepath) as f:
            return f.read()
```

---

## Custom Context Managers: Common Patterns

### Lock Management

Socho ek hi UPI account se do log ek saath paisa nikalne ki koshish kar rahe hain -- lock lagana zaruri hai taaki race condition na ho.

```python
import threading
from contextlib import contextmanager

class ThreadSafeCounter:
    def __init__(self) -> None:
        self._value = 0
        self._lock = threading.Lock()

    @contextmanager
    def locked(self):
        self._lock.acquire()
        try:
            yield self
        finally:
            self._lock.release()

    # Ya seedha lock hi use karo (Lock khud ek context manager hai)
    def increment(self) -> None:
        with self._lock:  # threading.Lock 'with' natively support karta hai
            self._value += 1
```

### Indentation / Nesting Tracker

```python
@contextmanager
def indent(level: int = 1, char: str = "  "):
    """Indented printing ke liye context manager."""
    prefix = char * level

    original_print = __builtins__["print"] if isinstance(__builtins__, dict) else print

    def indented_print(*args, **kwargs):
        original_print(prefix, *args, **kwargs)

    import builtins
    old_print = builtins.print
    builtins.print = indented_print
    try:
        yield
    finally:
        builtins.print = old_print
```

### Atomic File Write

Jaise koi bank transaction "all or nothing" hota hai -- ya toh poora ho, ya bilkul na ho, beech mein kuch nahi. Atomic write bhi wahi guarantee deta hai file ke liye.

```python
import os
import tempfile
from contextlib import contextmanager

@contextmanager
def atomic_write(filepath: str, mode: str = "w"):
    """Temp file mein likho, phir target pe atomically rename karo.

    Guarantee karta hai ki file kabhi bhi half-written state mein nahi rahegi.
    """
    dir_name = os.path.dirname(filepath) or "."
    fd, tmp_path = tempfile.mkstemp(dir=dir_name)
    try:
        with os.fdopen(fd, mode) as f:
            yield f
        # Original file ko sirf tab replace karo jab writing successful ho
        os.replace(tmp_path, filepath)
    except Exception:
        os.unlink(tmp_path)  # Failure pe temp file clean karo
        raise

# Usage
with atomic_write("config.json") as f:
    import json
    json.dump({"key": "value"}, f, indent=2)
# Agar json.dump fail ho jaaye, toh original config.json untouched rehta hai
```

---

## JavaScript/TypeScript Patterns Se Comparison

| Python | JavaScript/TypeScript |
|---|---|
| `with open(f) as file:` | `try { ... } finally { file.close() }` |
| `with lock:` | Koi built-in equivalent nahi |
| `@contextmanager` | Koi equivalent nahi (custom cleanup logic finally mein) |
| `async with session:` | `try { ... } finally { await session.close() }` |
| `with suppress(Error):` | `try { ... } catch(e) {}` |
| `ExitStack` | Koi equivalent nahi |
| `with timer():` | `console.time()` / `console.timeEnd()` |
| `__enter__`/`__exit__` | `Symbol.dispose` (TS 5.2+) |

`using` declaration (TypeScript 5.2+ / TC39 Stage 3) JavaScript mein sabse close cheez hai:

```typescript
// TypeScript 5.2+
class Resource implements Disposable {
  [Symbol.dispose]() {
    console.log("Cleaned up");
  }
}

{
  using resource = new Resource();
  // ... resource use karo ...
} // Symbol.dispose automatically call hota hai
```

---

## Practice Exercises

### Exercise 1: Timer Context Manager
Ek `Timer` context manager (class-based) banao jo:
- Enter pe start time record kare
- Exit pe elapsed time print kare
- Elapsed time ko attribute ke roop mein store kare
- Label parameter ke saath kaam kare

```python
with Timer("my operation") as t:
    time.sleep(1)
print(f"Took {t.elapsed:.2f}s")
```

### Exercise 2: Database Transaction
`@contextmanager` use karke ek `Transaction` context manager likho jo:
- Enter pe transaction begin kare
- Successful exit pe commit kare
- Exception pe rollback kare
- Saari operations log kare
- Rollback ke baad exception ko re-raise kare

### Exercise 3: Temporary Config Override
Ek `config_override` context manager banao jo:
- Ek config dict aur override key-value pairs le
- Enter pe overrides apply kare
- Exit pe original values restore kare (exception aane pe bhi)
- Un keys ko handle kare jo pehle exist hi nahi karti thi (exit pe unhe remove kare)

### Exercise 4: Retry Context Manager
Ek `retry` context manager banao jo specific exceptions aane pe block ko N baar tak re-run kare:
```python
with retry(max_attempts=3, exceptions=(ConnectionError, TimeoutError)):
    response = make_api_call()
```
Hint: Yeh standard context manager ke saath thoda tricky hai. `@contextmanager` ke saath callback pattern, ya koi alag approach try karo.

### Exercise 5: Resource Pool
Ek `ResourcePool` context manager implement karo:
- Resources ki ek list se initialize karo (jaise database connections)
- `with pool.acquire() as resource:` ek available resource deta hai
- Exit pe resource pool mein wapas chala jaata hai
- Agar koi resource available na ho, wait karo (ya error raise karo)
- Lock use karke thread-safe banao
