# Classes & Basics

> Python classes for Node.js/TypeScript developers

---

## The `class` Keyword

Both Python and TypeScript use the `class` keyword, but the similarities diverge quickly after that.

```python
# Python
class User:
    pass  # empty class (like {} body in TS)
```

```typescript
// TypeScript
class User {}
```

---

## `__init__` vs `constructor()`

Python uses `__init__` as its constructor method. The biggest difference: Python requires you to explicitly pass `self` as the first parameter.

```python
# Python
class User:
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email
```

```typescript
// TypeScript
class User {
  name: string;
  email: string;

  constructor(name: string, email: string) {
    this.name = name;
    this.email = email;
  }
}
```

Key differences:
- Python does NOT require you to declare properties before assigning them. You just do `self.name = name` inside `__init__` and the attribute exists.
- TypeScript requires you to declare the type of each property in the class body before using it in the constructor (or use the `public name: string` shorthand in the constructor parameters).
- `__init__` is technically an initializer, not a constructor. The actual constructor is `__new__`, which you rarely need to touch.

---

## `self` vs `this`

This is one of the biggest conceptual shifts for JS/TS developers.

| Aspect | Python `self` | JS/TS `this` |
|--------|--------------|--------------|
| Passed explicitly? | **Yes** - first param of every method | No - implicit |
| Name required? | Convention is `self`, but any name works | Must be `this` |
| Binding issues? | Never - always explicit | Yes - `this` can be lost (arrow functions, `.bind()`) |
| In closures? | No binding confusion | Notorious source of bugs |

```python
# Python - self is explicit
class Timer:
    def __init__(self):
        self.seconds = 0

    def tick(self):
        self.seconds += 1

    def get_time(self):
        return f"{self.seconds} seconds"
```

```typescript
// TypeScript - this is implicit and can be tricky
class Timer {
  seconds = 0;

  tick() {
    this.seconds += 1;
  }

  // If you pass timer.tick as a callback, `this` is lost!
  // You'd need: tick = () => { this.seconds += 1; }
  getTime() {
    return `${this.seconds} seconds`;
  }
}
```

Because `self` is explicit, Python NEVER has the "lost `this`" problem that plagues JavaScript:

```python
timer = Timer()
# This works fine even when passed as a reference
fn = timer.tick  # bound method - self is captured
fn()             # works perfectly, self.seconds becomes 1
```

```typescript
const timer = new Timer();
const fn = timer.tick; // DANGER: `this` is lost
fn(); // TypeError or NaN - this.seconds is undefined
```

---

## Instance Variables vs Class Variables

Python has a clear distinction between **instance variables** (per-object) and **class variables** (shared across all instances). This catches many newcomers off guard.

```python
# Python
class HTTPClient:
    # Class variable - shared across ALL instances
    default_timeout = 30
    base_headers = {"Content-Type": "application/json"}
    _instances = []  # careful: mutable class vars are shared!

    def __init__(self, base_url: str):
        # Instance variable - unique to each instance
        self.base_url = base_url
        self.session_id = None
        HTTPClient._instances.append(self)

    def get_timeout(self):
        return self.default_timeout  # reads class var via instance


# Both instances share default_timeout
client1 = HTTPClient("https://api.example.com")
client2 = HTTPClient("https://api.staging.com")

print(client1.default_timeout)  # 30
print(client2.default_timeout)  # 30

# Changing the class variable affects all instances
HTTPClient.default_timeout = 60
print(client1.default_timeout)  # 60
print(client2.default_timeout)  # 60

# BUT: assigning via instance creates an INSTANCE variable that shadows it
client1.default_timeout = 10
print(client1.default_timeout)  # 10 (instance var)
print(client2.default_timeout)  # 60 (still class var)
```

```typescript
// TypeScript equivalent uses static
class HTTPClient {
  static defaultTimeout = 30;
  static baseHeaders = { "Content-Type": "application/json" };

  baseUrl: string;
  sessionId: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
}
```

**WARNING**: Mutable class variables (lists, dicts) are a common bug source:

```python
# BUG: all instances share the SAME list
class Task:
    tags = []  # class variable - shared!

    def __init__(self, name: str):
        self.name = name

t1 = Task("build")
t2 = Task("test")
t1.tags.append("urgent")
print(t2.tags)  # ['urgent'] -- oops! t2 sees t1's tag

# FIX: use instance variables for mutable data
class Task:
    def __init__(self, name: str):
        self.name = name
        self.tags = []  # instance variable - each instance gets its own list
```

---

## Methods

Methods in Python are just functions defined inside a class. The first parameter is always `self` for instance methods.

```python
class TaskQueue:
    def __init__(self):
        self.tasks: list[dict] = []
        self._processed = 0

    def add_task(self, task_name: str, priority: int = 0) -> None:
        """Add a task to the queue."""
        self.tasks.append({"name": task_name, "priority": priority})

    def process_next(self) -> dict | None:
        """Process and return the highest priority task."""
        if not self.tasks:
            return None
        # Sort by priority (highest first) and pop
        self.tasks.sort(key=lambda t: t["priority"], reverse=True)
        task = self.tasks.pop(0)
        self._processed += 1
        return task

    def get_stats(self) -> dict:
        """Return queue statistics."""
        return {
            "pending": len(self.tasks),
            "processed": self._processed,
        }


queue = TaskQueue()
queue.add_task("deploy", priority=10)
queue.add_task("write tests", priority=5)
queue.add_task("fix bug", priority=8)

print(queue.process_next())  # {'name': 'deploy', 'priority': 10}
print(queue.get_stats())     # {'pending': 2, 'processed': 1}
```

```typescript
// TypeScript equivalent
class TaskQueue {
  private tasks: Array<{ name: string; priority: number }> = [];
  private processed = 0;

  addTask(taskName: string, priority = 0): void {
    this.tasks.push({ name: taskName, priority });
  }

  processNext(): { name: string; priority: number } | null {
    if (this.tasks.length === 0) return null;
    this.tasks.sort((a, b) => b.priority - a.priority);
    const task = this.tasks.shift()!;
    this.processed++;
    return task;
  }

  getStats() {
    return { pending: this.tasks.length, processed: this.processed };
  }
}
```

---

## `__str__` - String Representation

Python's `__str__` is equivalent to JavaScript's `toString()`. It controls what you see when you print an object or convert it to a string.

```python
class APIResponse:
    def __init__(self, status: int, body: dict, elapsed_ms: float):
        self.status = status
        self.body = body
        self.elapsed_ms = elapsed_ms

    def __str__(self) -> str:
        return f"APIResponse(status={self.status}, elapsed={self.elapsed_ms}ms)"


response = APIResponse(200, {"data": "ok"}, 42.5)
print(response)          # APIResponse(status=200, elapsed=42.5ms)
print(f"Got: {response}")  # Got: APIResponse(status=200, elapsed=42.5ms)
```

```typescript
// TypeScript equivalent
class APIResponse {
  constructor(
    public status: number,
    public body: Record<string, unknown>,
    public elapsedMs: number
  ) {}

  toString(): string {
    return `APIResponse(status=${this.status}, elapsed=${this.elapsedMs}ms)`;
  }
}
```

There is also `__repr__`, which is meant for developers/debugging. When you type an object name in the Python REPL, it calls `__repr__`. A good rule: `__repr__` should ideally return a string that could recreate the object.

```python
class Point:
    def __init__(self, x: float, y: float):
        self.x = x
        self.y = y

    def __str__(self) -> str:
        return f"({self.x}, {self.y})"

    def __repr__(self) -> str:
        return f"Point(x={self.x}, y={self.y})"


p = Point(3, 4)
print(p)       # (3, 4)         -- uses __str__
print(repr(p)) # Point(x=3, y=4) -- uses __repr__
print([p])     # [Point(x=3, y=4)] -- lists use __repr__ for items
```

---

## Privacy Convention: Underscores vs `#private`

Python has NO true private fields (by design - "we're all consenting adults here"). Instead it uses naming conventions.

### Single underscore `_` - "Protected" / Internal

```python
class DatabaseConnection:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self._pool = []          # convention: "don't touch this from outside"
        self._retry_count = 3    # but nothing actually stops you

    def _create_connection(self):
        """Internal method - signaled by underscore prefix."""
        pass

    def connect(self):
        """Public method."""
        self._create_connection()
```

`_single_underscore` means: "This is internal. You CAN access it, but you SHOULDN'T." It is purely a convention. Linters and IDEs may warn you, but Python will not stop you.

### Double underscore `__` - Name Mangling

```python
class PaymentProcessor:
    def __init__(self, api_key: str):
        self.__api_key = api_key  # name-mangled

    def process(self, amount: float):
        return self.__validate_and_charge(amount)

    def __validate_and_charge(self, amount: float):
        # This method name gets mangled
        return f"Charged {amount} with key {self.__api_key}"


processor = PaymentProcessor("sk_secret_123")

# Direct access fails
# print(processor.__api_key)  # AttributeError!

# But Python just mangles the name - you CAN still access it
print(processor._PaymentProcessor__api_key)  # sk_secret_123

# This is name mangling, NOT true privacy
```

### Comparison with TypeScript/JavaScript

```typescript
// TypeScript - true compile-time privacy
class PaymentProcessor {
  private apiKey: string; // TS compile-time only
  #secretKey: string; // JS runtime private field (ES2022)

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey;
    this.#secretKey = secretKey;
  }
}

const p = new PaymentProcessor("key", "secret");
// p.apiKey;     // TS error (but accessible at runtime in JS)
// p.#secretKey; // True runtime error - cannot access
```

| Mechanism | Language | Enforcement |
|-----------|----------|-------------|
| `_name` | Python | Convention only |
| `__name` | Python | Name mangling (weak) |
| `private` | TypeScript | Compile-time only |
| `#name` | JavaScript | True runtime privacy |

---

## Instantiation: No `new` Keyword

In Python, you create instances by calling the class like a function. No `new` keyword needed.

```python
# Python - no `new`
user = User("alice", "alice@example.com")
client = HTTPClient("https://api.example.com")
queue = TaskQueue()
```

```typescript
// TypeScript - requires `new`
const user = new User("alice", "alice@example.com");
const client = new HTTPClient("https://api.example.com");
const queue = new TaskQueue();
```

This makes Python classes feel more like factory functions, and it means you can swap a class for a function (or vice versa) without changing the calling code.

---

## Putting It All Together: Real-World Example

```python
class Logger:
    """A simple logger - comparable to a basic winston/pino setup."""

    # Class variables
    LOG_LEVELS = {"DEBUG": 0, "INFO": 1, "WARN": 2, "ERROR": 3}
    _default_level = "INFO"

    def __init__(self, name: str, level: str | None = None):
        self.name = name
        self.level = level or Logger._default_level
        self._entries: list[dict] = []

    def _should_log(self, level: str) -> bool:
        """Check if message level meets minimum threshold."""
        return self.LOG_LEVELS.get(level, 0) >= self.LOG_LEVELS.get(self.level, 0)

    def _format_message(self, level: str, message: str) -> str:
        """Format a log message."""
        from datetime import datetime
        timestamp = datetime.now().isoformat()
        return f"[{timestamp}] [{level}] [{self.name}] {message}"

    def debug(self, message: str) -> None:
        if self._should_log("DEBUG"):
            formatted = self._format_message("DEBUG", message)
            self._entries.append({"level": "DEBUG", "message": formatted})
            print(formatted)

    def info(self, message: str) -> None:
        if self._should_log("INFO"):
            formatted = self._format_message("INFO", message)
            self._entries.append({"level": "INFO", "message": formatted})
            print(formatted)

    def error(self, message: str) -> None:
        if self._should_log("ERROR"):
            formatted = self._format_message("ERROR", message)
            self._entries.append({"level": "ERROR", "message": formatted})
            print(formatted)

    def get_entries(self, level: str | None = None) -> list[dict]:
        """Retrieve stored log entries, optionally filtered by level."""
        if level is None:
            return self._entries.copy()
        return [e for e in self._entries if e["level"] == level]

    def __str__(self) -> str:
        return f"Logger(name='{self.name}', level='{self.level}', entries={len(self._entries)})"

    def __repr__(self) -> str:
        return f"Logger(name='{self.name}', level='{self.level}')"


# Usage
logger = Logger("api-server", level="DEBUG")
logger.info("Server starting on port 3000")
logger.debug("Loading configuration from .env")
logger.error("Failed to connect to database")

print(logger)  # Logger(name='api-server', level='DEBUG', entries=3)
print(logger.get_entries("ERROR"))
```

---

## Practice Exercises

### Exercise 1: Config Manager

Create a `ConfigManager` class that:
- Takes an `environment` string ("development", "staging", "production") in `__init__`
- Has a class variable `_defaults` dict with default config values
- Has `get(key)`, `set(key, value)`, and `get_all()` methods
- Has a `__str__` that shows environment and number of overrides
- Uses `_` prefix for internal methods

Compare your solution with how you would write it in TypeScript.

### Exercise 2: Shopping Cart

Create a `ShoppingCart` class that:
- Stores items as a list of dicts with `name`, `price`, `quantity`
- Has `add_item(name, price, quantity=1)` method
- Has `remove_item(name)` method
- Has `get_total()` that computes the total price
- Has `__str__` that shows number of items and total
- Uses a class variable to track how many carts have been created

### Exercise 3: Compare with TypeScript

Write the TypeScript version of your `ShoppingCart` class. Note:
1. How many more lines did you need?
2. Where did you need explicit type declarations that Python inferred?
3. How would you handle the "total carts created" class variable in TS?

---

## Key Takeaways for Node.js Developers

1. **`self` is explicit** - no more `this` binding confusion, arrow function workarounds, or `.bind()` calls
2. **No `new` keyword** - instantiate by calling the class directly
3. **No property declarations** - just assign in `__init__`
4. **Class variables are shared** - watch out for mutable ones (lists, dicts)
5. **Privacy is a convention** - `_underscore` means "please don't", `__double` means "name-mangled but still accessible"
6. **`__str__`** = `toString()`, **`__repr__`** = developer-facing representation
