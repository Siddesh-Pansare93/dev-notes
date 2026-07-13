# Classes & Basics

> Python classes, Node.js/TypeScript developer ke liye — same duniya, thoda alag rules

---

## `class` Keyword

Python aur TypeScript dono `class` keyword use karte hain, lekin uske baad cheezein jaldi alag ho jaati hain.

```python
# Python
class User:
    pass  # empty class (TS mein {} body jaisa)
```

```typescript
// TypeScript
class User {}
```

---

## `__init__` vs `constructor()`

Python mein constructor ka kaam `__init__` karta hai. Sabse bada fark ye hai — Python mein tumhe har method ke first parameter mein explicitly `self` pass karna padta hai.

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

Kya alag hai:
- Python mein properties ko pehle "declare" karne ki koi zarurat nahi. Bas `__init__` ke andar `self.name = name` likho, attribute ban gaya — jitna simple utna hi.
- TypeScript mein class body mein pehle type declare karna padta hai (ya constructor parameter mein `public name: string` shorthand use karo).
- `__init__` technically ek "initializer" hai, actual constructor nahi. Real constructor `__new__` hota hai, jise tumhe shayad hi kabhi touch karna pade.

---

## `self` vs `this`

Ye JS/TS developers ke liye sabse bada mindset shift hai.

| Aspect | Python `self` | JS/TS `this` |
|--------|--------------|--------------|
| Explicitly pass karna padta hai? | **Haan** — har method ka first param | Nahi — implicit hota hai |
| Naam fix hai? | Convention `self` hai, but koi bhi naam chalega | `this` hi hona chahiye |
| Binding ka jhanjhat? | Kabhi nahi — hamesha explicit | Haan — `this` kho sakta hai (arrow functions, `.bind()`) |
| Closures mein? | Koi confusion nahi | Bugs ka famous source |

```python
# Python - self explicit hai
class Timer:
    def __init__(self):
        self.seconds = 0

    def tick(self):
        self.seconds += 1

    def get_time(self):
        return f"{self.seconds} seconds"
```

```typescript
// TypeScript - this implicit hai aur tricky ho sakta hai
class Timer {
  seconds = 0;

  tick() {
    this.seconds += 1;
  }

  // Agar timer.tick ko callback ki tarah pass kiya, `this` kho jaata hai!
  // Fix ke liye: tick = () => { this.seconds += 1; }
  getTime() {
    return `${this.seconds} seconds`;
  }
}
```

Kyunki `self` explicit hai, Python mein JavaScript wala "lost `this`" problem kabhi hota hi nahi:

```python
timer = Timer()
# Reference ki tarah pass karne pe bhi ye theek se chalega
fn = timer.tick  # bound method - self already capture ho gaya
fn()             # perfectly kaam karega, self.seconds ho jayega 1
```

```typescript
const timer = new Timer();
const fn = timer.tick; // KHATRA: `this` kho gaya
fn(); // TypeError ya NaN - this.seconds undefined hai
```

Socho ek dabbawala ki tarah — Python ka `self` us dabbe pe hamesha customer ka naam likha hota hai, chahe wo kitni bhi haath se guzre, delivery sahi jagah hi hoti hai. JS ka `this` uss dabbe jaisa hai jispe naam nahi likha — beech mein kisi ne uthaya to pata hi nahi chalta kiska hai.

---

## Instance Variables vs Class Variables

Python mein **instance variables** (har object ka apna) aur **class variables** (sab instances mein shared) ka bahut saaf farak hai. Yahi cheez naye logon ko confuse karti hai.

```python
# Python
class HTTPClient:
    # Class variable - SAARE instances mein shared
    default_timeout = 30
    base_headers = {"Content-Type": "application/json"}
    _instances = []  # dhyan rakho: mutable class vars sab mein shared hote hain!

    def __init__(self, base_url: str):
        # Instance variable - har instance ka apna
        self.base_url = base_url
        self.session_id = None
        HTTPClient._instances.append(self)

    def get_timeout(self):
        return self.default_timeout  # instance ke through class var read ho raha hai


# Dono instances default_timeout share karte hain
client1 = HTTPClient("https://api.example.com")
client2 = HTTPClient("https://api.staging.com")

print(client1.default_timeout)  # 30
print(client2.default_timeout)  # 30

# Class variable change karo to sab instances pe asar padta hai
HTTPClient.default_timeout = 60
print(client1.default_timeout)  # 60
print(client2.default_timeout)  # 60

# LEKIN: instance ke through assign karoge to naya INSTANCE variable ban jayega jo class var ko shadow karega
client1.default_timeout = 10
print(client1.default_timeout)  # 10 (instance var)
print(client2.default_timeout)  # 60 (abhi bhi class var)
```

```typescript
// TypeScript mein iske liye static use karte hain
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

> [!warning]
> Mutable class variables (lists, dicts) bugs ka bahut common source hain:

```python
# BUG: saare instances SAME list share kar rahe hain
class Task:
    tags = []  # class variable - shared!

    def __init__(self, name: str):
        self.name = name

t1 = Task("build")
t2 = Task("test")
t1.tags.append("urgent")
print(t2.tags)  # ['urgent'] -- oops! t2 ko t1 ka tag bhi dikh raha hai

# FIX: mutable data ke liye instance variable use karo
class Task:
    def __init__(self, name: str):
        self.name = name
        self.tags = []  # instance variable - har instance ki apni alag list
```

Socho ek Swiggy delivery bag ki tarah — agar sab riders ek hi shared bag use karein (class variable), to ek rider ka order dusre mein mix ho jayega. Har rider ka apna bag hona chahiye (instance variable), tabhi order sahi customer tak jayega.

---

## Methods

Python mein methods bas class ke andar define ki hui functions hain. Instance methods ka first parameter hamesha `self` hota hai.

```python
class TaskQueue:
    def __init__(self):
        self.tasks: list[dict] = []
        self._processed = 0

    def add_task(self, task_name: str, priority: int = 0) -> None:
        """Queue mein ek task add karo."""
        self.tasks.append({"name": task_name, "priority": priority})

    def process_next(self) -> dict | None:
        """Sabse high priority task process karo aur return karo."""
        if not self.tasks:
            return None
        # Priority ke hisaab se sort karo (highest pehle) aur pop karo
        self.tasks.sort(key=lambda t: t["priority"], reverse=True)
        task = self.tasks.pop(0)
        self._processed += 1
        return task

    def get_stats(self) -> dict:
        """Queue ke stats return karo."""
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

Python ka `__str__` JavaScript ke `toString()` jaisa hai. Ye control karta hai ki jab tum object ko print karo ya string mein convert karo to kya dikhega.

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

Ek `__repr__` bhi hota hai, jo developers/debugging ke liye hota hai. Jab tum Python REPL mein object ka naam type karte ho, to `__repr__` hi call hota hai. Ek accha rule: `__repr__` aisa string return kare jisse object dobara banaya ja sake.

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
print(p)       # (3, 4)         -- __str__ use hua
print(repr(p)) # Point(x=3, y=4) -- __repr__ use hua
print([p])     # [Point(x=3, y=4)] -- lists items ke liye __repr__ use karti hain
```

---

## Privacy Convention: Underscores vs `#private`

Python mein koi TRUE private field nahi hota (jaan-boojh ke design kiya gaya hai — "hum sab consenting adults hain"). Iski jagah naming conventions use hote hain.

### Single underscore `_` - "Protected" / Internal

```python
class DatabaseConnection:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self._pool = []          # convention: "ise bahar se mat chhuo"
        self._retry_count = 3    # lekin kuch bhi tumhe rokta nahi

    def _create_connection(self):
        """Internal method - underscore prefix se signal milta hai."""
        pass

    def connect(self):
        """Public method."""
        self._create_connection()
```

`_single_underscore` ka matlab hai: "Ye internal hai. Access kar SAKTE ho, lekin karna NAHI CHAHIYE." Ye purely ek convention hai. Linters aur IDEs warn kar sakte hain, lekin Python tumhe kabhi rokega nahi.

### Double underscore `__` - Name Mangling

```python
class PaymentProcessor:
    def __init__(self, api_key: str):
        self.__api_key = api_key  # name-mangled

    def process(self, amount: float):
        return self.__validate_and_charge(amount)

    def __validate_and_charge(self, amount: float):
        # Iss method ka naam mangle ho jayega
        return f"Charged {amount} with key {self.__api_key}"


processor = PaymentProcessor("sk_secret_123")

# Direct access fail hoga
# print(processor.__api_key)  # AttributeError!

# Lekin Python sirf naam mangle karta hai - tum abhi bhi access kar sakte ho
print(processor._PaymentProcessor__api_key)  # sk_secret_123

# Ye name mangling hai, TRUE privacy nahi
```

### TypeScript/JavaScript se comparison

```typescript
// TypeScript - true compile-time privacy
class PaymentProcessor {
  private apiKey: string; // sirf TS compile-time
  #secretKey: string; // JS runtime private field (ES2022)

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey;
    this.#secretKey = secretKey;
  }
}

const p = new PaymentProcessor("key", "secret");
// p.apiKey;     // TS error (lekin JS runtime mein accessible)
// p.#secretKey; // True runtime error - access nahi ho sakta
```

| Mechanism | Language | Enforcement |
|-----------|----------|-------------|
| `_name` | Python | Sirf convention |
| `__name` | Python | Name mangling (kamzor) |
| `private` | TypeScript | Sirf compile-time |
| `#name` | JavaScript | True runtime privacy |

> [!tip]
> UPI PIN ki tarah socho — `_underscore` ek soft warning hai jaise app "are you sure?" poochta hai. `#private` field ek hard lock hai jaise biometric lock — koi bypass hi nahi kar sakta.

---

## Instantiation: `new` Keyword Nahi

Python mein instance banane ke liye class ko function ki tarah call karte ho. `new` keyword ki koi zarurat nahi.

```python
# Python - `new` nahi chahiye
user = User("alice", "alice@example.com")
client = HTTPClient("https://api.example.com")
queue = TaskQueue()
```

```typescript
// TypeScript - `new` zaruri hai
const user = new User("alice", "alice@example.com");
const client = new HTTPClient("https://api.example.com");
const queue = new TaskQueue();
```

Isse Python classes factory functions jaisi feel deti hain, aur iska matlab hai ki tum class ko function se (ya function ko class se) swap kar sakte ho bina calling code change kiye.

---

## Sab Kuch Ek Saath: Real-World Example

```python
class Logger:
    """Ek simple logger - basic winston/pino setup jaisa."""

    # Class variables
    LOG_LEVELS = {"DEBUG": 0, "INFO": 1, "WARN": 2, "ERROR": 3}
    _default_level = "INFO"

    def __init__(self, name: str, level: str | None = None):
        self.name = name
        self.level = level or Logger._default_level
        self._entries: list[dict] = []

    def _should_log(self, level: str) -> bool:
        """Check karo ki message ka level minimum threshold pura karta hai ya nahi."""
        return self.LOG_LEVELS.get(level, 0) >= self.LOG_LEVELS.get(self.level, 0)

    def _format_message(self, level: str, message: str) -> str:
        """Log message ko format karo."""
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
        """Stored log entries retrieve karo, optionally level se filter karke."""
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

Ek `ConfigManager` class banao jo:
- `__init__` mein `environment` string le ("development", "staging", "production")
- Ek class variable `_defaults` dict rakhe jisme default config values hon
- `get(key)`, `set(key, value)`, aur `get_all()` methods ho
- Ek `__str__` ho jo environment aur overrides ki count dikhaye
- Internal methods ke liye `_` prefix use kare

Apna solution TypeScript mein kaise likhoge, uske saath compare karo.

### Exercise 2: Shopping Cart

Ek `ShoppingCart` class banao jo:
- Items ko `name`, `price`, `quantity` wale dicts ki list mein store kare
- `add_item(name, price, quantity=1)` method rakhe
- `remove_item(name)` method rakhe
- `get_total()` rakhe jo total price calculate kare
- `__str__` rakhe jo items ki count aur total dikhaye
- Ek class variable rakhe jo track kare kitne carts ban chuke hain

### Exercise 3: TypeScript Se Compare Karo

Apni `ShoppingCart` class ka TypeScript version likho. Notice karo:
1. Kitni zyada lines likhni padi?
2. Kahan explicit type declarations likhni padi jo Python khud infer kar leta tha?
3. "Total carts created" wale class variable ko TS mein kaise handle karoge?

---

## Key Takeaways

1. **`self` explicit hai** — ab `this` binding confusion, arrow function workarounds, ya `.bind()` calls ki zarurat nahi
2. **`new` keyword nahi chahiye** — class ko direct call karke instantiate karo
3. **Property declarations nahi chahiye** — bas `__init__` mein assign karo
4. **Class variables shared hote hain** — mutable wale (lists, dicts) se savdhaan raho
5. **Privacy ek convention hai** — `_underscore` ka matlab "please mat karo", `__double` ka matlab "name-mangled hai lekin phir bhi accessible"
6. **`__str__`** = `toString()`, **`__repr__`** = developer-facing representation
