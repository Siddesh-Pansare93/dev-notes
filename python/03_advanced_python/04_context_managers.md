# Context Managers

## Python's Resource Management Pattern

Context managers are Python's answer to resource cleanup. JavaScript/TypeScript doesn't have a direct equivalent (the closest is `try/finally`, or the newer `using` declaration in TC39/TypeScript 5.2+). In Python, you'll use context managers constantly -- for files, database connections, locks, temporary resources, and more.

---

## The `with` Statement

```python
# Python -- context manager handles cleanup automatically
with open("data.txt", "r") as f:
    content = f.read()
# f is automatically closed here, even if an exception occurred

# Without context manager -- you must handle cleanup yourself
f = open("data.txt", "r")
try:
    content = f.read()
finally:
    f.close()
```

```javascript
// JavaScript -- no built-in equivalent
// Option 1: try/finally
const f = fs.openSync("data.txt", "r");
try {
  const content = fs.readFileSync(f, "utf-8");
} finally {
  fs.closeSync(f);
}

// Option 2: Node.js fs/promises with convenience methods
const content = await fs.promises.readFile("data.txt", "utf-8");

// Option 3: TypeScript 5.2+ using declaration (TC39 Explicit Resource Management)
{
  using f = openFile("data.txt");
  const content = f.read();
} // f[Symbol.dispose]() called automatically
```

### Why Context Managers Matter

```python
# Problem: what if an exception occurs between open and close?
f = open("data.txt")
data = f.read()        # What if this throws?
process(data)          # Or this?
f.close()              # This line might never run!

# Solution: with statement guarantees cleanup
with open("data.txt") as f:
    data = f.read()
    process(data)
# f.close() is ALWAYS called -- even on exceptions
```

---

## The Protocol: `__enter__` and `__exit__`

A context manager is any object that implements `__enter__` and `__exit__`:

```python
class ManagedResource:
    def __init__(self, name: str) -> None:
        self.name = name
        print(f"Creating {name}")

    def __enter__(self):
        """Called when entering the 'with' block. Return value is bound to 'as' variable."""
        print(f"Acquiring {self.name}")
        return self  # This becomes the 'as' variable

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Called when exiting the 'with' block.

        Args:
            exc_type: Exception class (or None if no exception)
            exc_val:  Exception instance (or None)
            exc_tb:   Traceback (or None)

        Returns:
            True to suppress the exception, False/None to propagate it.
        """
        print(f"Releasing {self.name}")
        return False  # Don't suppress exceptions

# Usage
with ManagedResource("database") as db:
    print(f"Using {db.name}")
    # ... do work ...
# Output:
# Creating database
# Acquiring database
# Using database
# Releasing database
```

### Exception Handling in `__exit__`

```python
class SafeTransaction:
    def __init__(self, connection):
        self.conn = connection

    def __enter__(self):
        self.conn.begin()
        return self.conn

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            # An exception occurred -- rollback
            print(f"Rolling back due to: {exc_val}")
            self.conn.rollback()
            return False  # Re-raise the exception
        else:
            # No exception -- commit
            self.conn.commit()
            return False

# Suppressing exceptions
class SuppressErrors:
    def __init__(self, *exceptions):
        self.exceptions = exceptions

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None and issubclass(exc_type, self.exceptions):
            print(f"Suppressed: {exc_val}")
            return True  # Suppress the exception
        return False

with SuppressErrors(FileNotFoundError, PermissionError):
    open("nonexistent_file.txt")  # FileNotFoundError is suppressed
print("Continues normally")
```

---

## `@contextmanager` Decorator

Writing `__enter__` and `__exit__` is verbose. The `@contextmanager` decorator from `contextlib` lets you write a context manager as a simple generator function:

```python
from contextlib import contextmanager

@contextmanager
def managed_resource(name: str):
    # __enter__ equivalent: code before yield
    print(f"Acquiring {name}")
    resource = {"name": name, "active": True}

    try:
        yield resource  # This value becomes the 'as' variable
    finally:
        # __exit__ equivalent: code after yield (always runs)
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

# Timer context manager
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

# Temporary directory that auto-cleans
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
    # Work in temporary directory
    with open("temp_data.txt", "w") as f:
        f.write("temporary data")
# Directory and all files are deleted automatically

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

# Change and restore environment variable
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
# Original value is restored
```

---

## Multiple Context Managers

```python
# Multiple context managers in one with statement
with open("input.txt") as infile, open("output.txt", "w") as outfile:
    for line in infile:
        outfile.write(line.upper())

# Multiline syntax (Python 3.10+) -- uses parentheses
with (
    open("input.txt") as infile,
    open("output.txt", "w") as outfile,
    open("log.txt", "a") as logfile,
):
    for line in infile:
        outfile.write(line.upper())
        logfile.write(f"Processed: {line}")

# Pre-3.10: use backslash continuation
with open("input.txt") as infile, \
     open("output.txt", "w") as outfile:
    pass
```

---

## Async Context Managers

For async resources (database connections, HTTP sessions, etc.), Python has `async with`:

```python
import asyncio

class AsyncResource:
    async def __aenter__(self):
        print("Async acquiring resource")
        await asyncio.sleep(0.1)  # Simulate async setup
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        print("Async releasing resource")
        await asyncio.sleep(0.1)  # Simulate async cleanup
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

The `contextlib` module provides several useful context manager helpers:

### `suppress` -- Ignore Specific Exceptions

```python
from contextlib import suppress

# Instead of try/except/pass
try:
    os.remove("temp.txt")
except FileNotFoundError:
    pass

# Use suppress
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

# Capture stdout to a string
f = io.StringIO()
with redirect_stdout(f):
    print("This goes to the string buffer")
    print("So does this")

captured = f.getvalue()
print(f"Captured: {captured!r}")

# Redirect stdout to a file
with open("output.log", "w") as f:
    with redirect_stdout(f):
        print("This goes to the file")

# Suppress stdout entirely
with redirect_stdout(io.StringIO()):
    noisy_function()  # Output is discarded
```

### `ExitStack` -- Dynamic Context Managers

When you need a variable number of context managers:

```python
from contextlib import ExitStack

# Open a dynamic number of files
def merge_files(input_paths: list[str], output_path: str) -> None:
    with ExitStack() as stack:
        # Open all input files
        files = [stack.enter_context(open(p)) for p in input_paths]

        # Open output file
        output = stack.enter_context(open(output_path, "w"))

        # Process all files
        for f in files:
            output.write(f.read())
    # ALL files are closed automatically when ExitStack exits

# Register arbitrary cleanup callbacks
with ExitStack() as stack:
    resource = acquire_resource()
    stack.callback(release_resource, resource)  # Called on exit

    temp_dir = create_temp_dir()
    stack.callback(cleanup_temp_dir, temp_dir)

    # Do work...
# Both cleanup callbacks run in reverse order
```

### `AsyncExitStack` -- Async version

```python
from contextlib import AsyncExitStack

async def process_batch(urls: list[str]):
    async with AsyncExitStack() as stack:
        session = await stack.enter_async_context(aiohttp.ClientSession())

        connections = []
        for url in urls:
            conn = await stack.enter_async_context(connect(url))
            connections.append(conn)

        # Work with all connections
        results = await asyncio.gather(*(c.fetch() for c in connections))
    # All connections and session closed
```

### `closing` -- Add close() cleanup to objects

```python
from contextlib import closing
from urllib.request import urlopen

# urlopen returns a response that should be closed
with closing(urlopen("https://example.com")) as page:
    content = page.read()
# page.close() is called automatically
```

### `nullcontext` -- No-op context manager

```python
from contextlib import nullcontext

# Useful for optional context managers
def process(filepath: str, verbose: bool = False):
    # Use timer only when verbose
    cm = timer("processing") if verbose else nullcontext()
    with cm:
        with open(filepath) as f:
            return f.read()
```

---

## Custom Context Managers: Common Patterns

### Lock Management

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

    # Or simply use the lock itself (Lock IS a context manager)
    def increment(self) -> None:
        with self._lock:  # threading.Lock supports 'with' natively
            self._value += 1
```

### Indentation / Nesting Tracker

```python
@contextmanager
def indent(level: int = 1, char: str = "  "):
    """Context manager for indented printing."""
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

```python
import os
import tempfile
from contextlib import contextmanager

@contextmanager
def atomic_write(filepath: str, mode: str = "w"):
    """Write to a temp file, then atomically rename to target.

    Ensures the file is never left in a partially-written state.
    """
    dir_name = os.path.dirname(filepath) or "."
    fd, tmp_path = tempfile.mkstemp(dir=dir_name)
    try:
        with os.fdopen(fd, mode) as f:
            yield f
        # Only replace the original if writing succeeded
        os.replace(tmp_path, filepath)
    except Exception:
        os.unlink(tmp_path)  # Clean up temp file on failure
        raise

# Usage
with atomic_write("config.json") as f:
    import json
    json.dump({"key": "value"}, f, indent=2)
# If json.dump fails, the original config.json is untouched
```

---

## Comparison with JavaScript/TypeScript Patterns

| Python | JavaScript/TypeScript |
|---|---|
| `with open(f) as file:` | `try { ... } finally { file.close() }` |
| `with lock:` | No built-in equivalent |
| `@contextmanager` | No equivalent (custom cleanup logic in finally) |
| `async with session:` | `try { ... } finally { await session.close() }` |
| `with suppress(Error):` | `try { ... } catch(e) {}` |
| `ExitStack` | No equivalent |
| `with timer():` | `console.time()` / `console.timeEnd()` |
| `__enter__`/`__exit__` | `Symbol.dispose` (TS 5.2+) |

The `using` declaration (TypeScript 5.2+ / TC39 Stage 3) is the closest JavaScript gets:

```typescript
// TypeScript 5.2+
class Resource implements Disposable {
  [Symbol.dispose]() {
    console.log("Cleaned up");
  }
}

{
  using resource = new Resource();
  // ... use resource ...
} // Symbol.dispose called automatically
```

---

## Practice Exercises

### Exercise 1: Timer Context Manager
Create a `Timer` context manager (class-based) that:
- Records start time on enter
- Prints elapsed time on exit
- Stores the elapsed time as an attribute
- Works with a label parameter

```python
with Timer("my operation") as t:
    time.sleep(1)
print(f"Took {t.elapsed:.2f}s")
```

### Exercise 2: Database Transaction
Write a `Transaction` context manager using `@contextmanager` that:
- Begins a transaction on enter
- Commits on successful exit
- Rolls back on exception
- Logs all operations
- Re-raises exceptions after rollback

### Exercise 3: Temporary Config Override
Create a `config_override` context manager that:
- Takes a config dict and override key-value pairs
- Applies overrides on enter
- Restores original values on exit (even if exception occurs)
- Handles keys that didn't exist before (removes them on exit)

### Exercise 4: Retry Context Manager
Build a `retry` context manager that re-runs the block up to N times if specific exceptions occur:
```python
with retry(max_attempts=3, exceptions=(ConnectionError, TimeoutError)):
    response = make_api_call()
```
Hint: This is tricky with a standard context manager. Consider using `@contextmanager` with a callback pattern or a different approach.

### Exercise 5: Resource Pool
Implement a `ResourcePool` context manager:
- Initialize with a list of resources (e.g., database connections)
- `with pool.acquire() as resource:` gets an available resource
- Resource is returned to the pool on exit
- If no resources available, wait (or raise an error)
- Thread-safe using a lock
