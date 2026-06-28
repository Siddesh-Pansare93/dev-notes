# Abstract Classes & Protocols

> Python's abstract base classes and structural subtyping for Node.js/TypeScript developers

---

## ABC (Abstract Base Class) from `abc` Module

Python's ABCs are similar to TypeScript's `abstract` classes. They define a contract that subclasses MUST fulfill. You cannot instantiate an abstract class directly.

```python
from abc import ABC, abstractmethod


class PaymentProcessor(ABC):
    """Abstract base class - cannot be instantiated directly."""

    def __init__(self, merchant_id: str):
        self.merchant_id = merchant_id
        self._transactions: list[dict] = []

    @abstractmethod
    def charge(self, amount: float, currency: str) -> dict:
        """Subclasses MUST implement this."""
        ...

    @abstractmethod
    def refund(self, transaction_id: str) -> dict:
        """Subclasses MUST implement this."""
        ...

    @abstractmethod
    def get_balance(self) -> float:
        """Subclasses MUST implement this."""
        ...

    # Concrete methods (shared implementation) are allowed too
    def log_transaction(self, transaction: dict) -> None:
        """Shared implementation - subclasses inherit this."""
        self._transactions.append(transaction)
        print(f"[{self.merchant_id}] Transaction: {transaction}")

    def get_transaction_history(self) -> list[dict]:
        return self._transactions.copy()


# Cannot instantiate abstract class
# processor = PaymentProcessor("m_123")  # TypeError!


class StripeProcessor(PaymentProcessor):
    """Concrete implementation for Stripe."""

    def __init__(self, merchant_id: str, api_key: str):
        super().__init__(merchant_id)
        self._api_key = api_key
        self._balance = 0.0

    def charge(self, amount: float, currency: str) -> dict:
        transaction = {
            "id": f"ch_{id(self)}",
            "amount": amount,
            "currency": currency,
            "provider": "stripe",
            "status": "succeeded",
        }
        self._balance += amount
        self.log_transaction(transaction)
        return transaction

    def refund(self, transaction_id: str) -> dict:
        refund = {
            "id": f"re_{id(self)}",
            "original": transaction_id,
            "status": "refunded",
        }
        self.log_transaction(refund)
        return refund

    def get_balance(self) -> float:
        return self._balance


class PayPalProcessor(PaymentProcessor):
    """Concrete implementation for PayPal."""

    def __init__(self, merchant_id: str, client_id: str, secret: str):
        super().__init__(merchant_id)
        self._client_id = client_id
        self._secret = secret
        self._balance = 0.0

    def charge(self, amount: float, currency: str) -> dict:
        transaction = {
            "id": f"PAY-{id(self)}",
            "amount": amount,
            "currency": currency,
            "provider": "paypal",
            "status": "completed",
        }
        self._balance += amount
        self.log_transaction(transaction)
        return transaction

    def refund(self, transaction_id: str) -> dict:
        return {"id": f"REF-{id(self)}", "original": transaction_id, "status": "refunded"}

    def get_balance(self) -> float:
        return self._balance


# Usage - program to the interface
def process_payment(processor: PaymentProcessor, amount: float) -> dict:
    """Works with ANY PaymentProcessor implementation."""
    print(f"Processing ${amount:.2f} via {processor.__class__.__name__}")
    return processor.charge(amount, "USD")


stripe = StripeProcessor("m_123", "sk_test_xxx")
paypal = PayPalProcessor("m_456", "client_xxx", "secret_xxx")

process_payment(stripe, 99.99)
process_payment(paypal, 49.99)
```

```typescript
// TypeScript equivalent
abstract class PaymentProcessor {
  protected transactions: Array<Record<string, unknown>> = [];

  constructor(public merchantId: string) {}

  abstract charge(amount: number, currency: string): Record<string, unknown>;
  abstract refund(transactionId: string): Record<string, unknown>;
  abstract getBalance(): number;

  // Concrete method
  logTransaction(transaction: Record<string, unknown>): void {
    this.transactions.push(transaction);
  }
}

class StripeProcessor extends PaymentProcessor {
  constructor(merchantId: string, private apiKey: string) {
    super(merchantId);
  }

  charge(amount: number, currency: string) {
    // implementation
    return {};
  }
  refund(transactionId: string) {
    return {};
  }
  getBalance() {
    return 0;
  }
}
```

### What Happens if You Forget an Abstract Method?

```python
class IncompleteProcessor(PaymentProcessor):
    def charge(self, amount: float, currency: str) -> dict:
        return {}
    # Forgot refund() and get_balance()!


# TypeError is raised at INSTANTIATION time, not definition time
# proc = IncompleteProcessor("m_789")
# TypeError: Can't instantiate abstract class IncompleteProcessor
# with abstract methods get_balance, refund
```

---

## `@abstractmethod` with Properties, Class Methods, and Static Methods

You can combine `@abstractmethod` with other decorators:

```python
from abc import ABC, abstractmethod


class Cache(ABC):
    """Abstract cache interface."""

    @property
    @abstractmethod
    def size(self) -> int:
        """Number of items in the cache."""
        ...

    @abstractmethod
    def get(self, key: str) -> object | None:
        ...

    @abstractmethod
    def set(self, key: str, value: object, ttl: int | None = None) -> None:
        ...

    @abstractmethod
    def delete(self, key: str) -> bool:
        ...

    @classmethod
    @abstractmethod
    def create(cls, config: dict) -> "Cache":
        """Factory method that must be implemented."""
        ...


class MemoryCache(Cache):
    def __init__(self):
        self._store: dict[str, object] = {}

    @property
    def size(self) -> int:
        return len(self._store)

    def get(self, key: str) -> object | None:
        return self._store.get(key)

    def set(self, key: str, value: object, ttl: int | None = None) -> None:
        self._store[key] = value

    def delete(self, key: str) -> bool:
        return self._store.pop(key, None) is not None

    @classmethod
    def create(cls, config: dict) -> "MemoryCache":
        cache = cls()
        if "initial_data" in config:
            for k, v in config["initial_data"].items():
                cache.set(k, v)
        return cache


cache = MemoryCache.create({"initial_data": {"theme": "dark"}})
print(cache.get("theme"))  # dark
print(cache.size)          # 1
```

---

## Protocol - Structural Subtyping (Duck Typing)

This is the Python equivalent of **TypeScript interfaces**. Protocols define a structural type - any class that has the right methods/attributes matches, WITHOUT explicitly inheriting from it.

```python
from typing import Protocol, runtime_checkable


class Renderable(Protocol):
    """Any object with a render() method matches this Protocol.

    This is STRUCTURAL typing - like TypeScript interfaces.
    No inheritance required!
    """

    def render(self) -> str:
        ...


class HTMLComponent:
    """Does NOT inherit from Renderable, but matches its structure."""

    def __init__(self, tag: str, content: str):
        self.tag = tag
        self.content = content

    def render(self) -> str:
        return f"<{self.tag}>{self.content}</{self.tag}>"


class MarkdownComponent:
    """Also matches Renderable without inheriting from it."""

    def __init__(self, level: int, text: str):
        self.level = level
        self.text = text

    def render(self) -> str:
        return f"{'#' * self.level} {self.text}"


class JSONResponse:
    """Does NOT match Renderable - no render() method."""

    def __init__(self, data: dict):
        self.data = data

    def to_json(self) -> str:
        import json
        return json.dumps(self.data)


# This function accepts anything with a render() method
def render_page(components: list[Renderable]) -> str:
    """Type checker knows these objects have render()."""
    return "\n".join(c.render() for c in components)


# All these work - they have render()
page = render_page([
    HTMLComponent("h1", "Hello World"),
    MarkdownComponent(2, "Subtitle"),
    HTMLComponent("p", "Some content"),
])
print(page)
# <h1>Hello World</h1>
# ## Subtitle
# <p>Some content</p>
```

```typescript
// TypeScript - interfaces work the same way (structural typing)
interface Renderable {
  render(): string;
}

class HTMLComponent {
  // No "implements Renderable" needed!
  constructor(private tag: string, private content: string) {}

  render(): string {
    return `<${this.tag}>${this.content}</${this.tag}>`;
  }
}

function renderPage(components: Renderable[]): string {
  return components.map((c) => c.render()).join("\n");
}

// HTMLComponent matches Renderable structurally
renderPage([new HTMLComponent("h1", "Hello")]);
```

### Protocol with Properties

```python
from typing import Protocol


class HasName(Protocol):
    @property
    def name(self) -> str:
        ...


class HasAge(Protocol):
    @property
    def age(self) -> int:
        ...


class Identifiable(HasName, HasAge, Protocol):
    """Compose protocols - like extending interfaces in TypeScript."""

    @property
    def id(self) -> str:
        ...


class User:
    def __init__(self, id: str, name: str, age: int):
        self._id = id
        self._name = name
        self._age = age

    @property
    def id(self) -> str:
        return self._id

    @property
    def name(self) -> str:
        return self._name

    @property
    def age(self) -> int:
        return self._age


def greet(entity: HasName) -> str:
    return f"Hello, {entity.name}!"


def verify_age(entity: HasAge) -> bool:
    return entity.age >= 18


def get_display(entity: Identifiable) -> str:
    return f"[{entity.id}] {entity.name} (age {entity.age})"


user = User("u1", "Alice", 30)
print(greet(user))       # Hello, Alice!
print(verify_age(user))  # True
print(get_display(user)) # [u1] Alice (age 30)
```

---

## `runtime_checkable` Protocol

By default, Protocols are only checked by static type checkers (like mypy). Add `@runtime_checkable` to enable `isinstance()` checks at runtime.

```python
from typing import Protocol, runtime_checkable


@runtime_checkable
class Serializable(Protocol):
    def to_dict(self) -> dict:
        ...

    def to_json(self) -> str:
        ...


class UserDTO:
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email

    def to_dict(self) -> dict:
        return {"name": self.name, "email": self.email}

    def to_json(self) -> str:
        import json
        return json.dumps(self.to_dict())


class RawData:
    def __init__(self, data: bytes):
        self.data = data


user = UserDTO("Alice", "alice@example.com")
raw = RawData(b"hello")

# Runtime isinstance checks work!
print(isinstance(user, Serializable))  # True
print(isinstance(raw, Serializable))   # False

# Use in conditional logic
def save(obj: object) -> None:
    if isinstance(obj, Serializable):
        print(f"Saving: {obj.to_json()}")
    else:
        print(f"Cannot serialize {type(obj).__name__}")


save(user)  # Saving: {"name": "Alice", "email": "alice@example.com"}
save(raw)   # Cannot serialize RawData
```

**Caveat**: `runtime_checkable` only checks method EXISTENCE, not signatures. It does not verify parameter types or return types at runtime.

---

## ABC vs Protocol: When to Use Which

| Feature | ABC | Protocol |
|---------|-----|----------|
| Inheritance required? | **Yes** - must subclass | **No** - structural matching |
| `isinstance()` checks | Yes (always) | Only with `@runtime_checkable` |
| Shared implementation | **Yes** - can have concrete methods | **No** - purely structural |
| Enforces implementation | **Yes** - at instantiation time | **Only at type-check time** (mypy) |
| TS equivalent | `abstract class` | `interface` |
| Use case | Frameworks, plugins | APIs, duck typing |

### Use ABC When:

1. You want to **enforce** that subclasses implement specific methods (fail at instantiation)
2. You want to provide **shared implementation** (concrete methods alongside abstract ones)
3. You are building a **framework/plugin system** where classes must register as subclasses
4. You need reliable **runtime `isinstance()` checks**

```python
from abc import ABC, abstractmethod


class DatabaseDriver(ABC):
    """Use ABC: we want shared connection logic + enforced interface."""

    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self._connected = False

    def connect(self) -> None:
        """Shared implementation."""
        self._connected = True
        self._do_connect()
        print(f"Connected to {self.connection_string}")

    @abstractmethod
    def _do_connect(self) -> None:
        """Driver-specific connection logic."""
        ...

    @abstractmethod
    def execute(self, query: str, params: tuple = ()) -> list[dict]:
        ...

    @abstractmethod
    def close(self) -> None:
        ...
```

### Use Protocol When:

1. You want **duck typing** - "if it quacks like a duck"
2. You are writing **library code** that should work with any object matching a shape
3. You do NOT want to force users to inherit from your classes
4. You want behavior similar to **TypeScript interfaces**

```python
from typing import Protocol


class Closeable(Protocol):
    """Use Protocol: any object with close() should work."""

    def close(self) -> None:
        ...


class Flushable(Protocol):
    def flush(self) -> None:
        ...


def cleanup(resource: Closeable) -> None:
    """Works with files, connections, sockets - anything with close()."""
    resource.close()


# All of these work without inheriting from Closeable:
# - open("file.txt")  (file objects have close())
# - socket.socket()   (sockets have close())
# - sqlite3.connect() (DB connections have close())
```

### Combining ABC and Protocol

You can use both in the same codebase:

```python
from abc import ABC, abstractmethod
from typing import Protocol


# Protocol for external code - no inheritance required
class MessageSender(Protocol):
    def send(self, to: str, body: str) -> bool:
        ...


# ABC for your internal implementation hierarchy
class BaseNotifier(ABC):
    def __init__(self, config: dict):
        self.config = config

    @abstractmethod
    def send(self, to: str, body: str) -> bool:
        ...

    def send_batch(self, recipients: list[str], body: str) -> dict[str, bool]:
        """Shared batch implementation."""
        return {to: self.send(to, body) for to in recipients}


class EmailNotifier(BaseNotifier):
    def send(self, to: str, body: str) -> bool:
        print(f"Email to {to}: {body}")
        return True


class SMSNotifier(BaseNotifier):
    def send(self, to: str, body: str) -> bool:
        print(f"SMS to {to}: {body}")
        return True


# This function accepts ANYTHING with send() - ABC subclass or not
def notify_user(sender: MessageSender, user_email: str, message: str):
    sender.send(user_email, message)


# Works with ABC subclasses
notify_user(EmailNotifier({}), "alice@example.com", "Hello!")

# Also works with any object that has send() - no inheritance needed
class SlackWebhook:
    def send(self, to: str, body: str) -> bool:
        print(f"Slack to #{to}: {body}")
        return True

notify_user(SlackWebhook(), "general", "Deployed v2.0!")
```

---

## Practice Exercises

### Exercise 1: Repository Pattern with ABC

Create an abstract `Repository[T]` base class:

```python
class Repository(ABC, Generic[T]):
    @abstractmethod
    def find_by_id(self, id: str) -> T | None: ...

    @abstractmethod
    def find_all(self) -> list[T]: ...

    @abstractmethod
    def save(self, entity: T) -> T: ...

    @abstractmethod
    def delete(self, id: str) -> bool: ...
```

Implement `InMemoryRepository` and `FileRepository`. Add shared methods like `find_by(predicate)` and `count()` as concrete methods on the ABC.

### Exercise 2: Plugin System with Protocols

Create a Protocol-based plugin system:

```python
class Plugin(Protocol):
    name: str
    version: str

    def initialize(self, config: dict) -> None: ...
    def execute(self, context: dict) -> dict: ...
    def cleanup(self) -> None: ...
```

Write 3 plugins that match this Protocol WITHOUT inheriting from it. Create a `PluginManager` that discovers and runs plugins using `isinstance()` with `@runtime_checkable`.

### Exercise 3: Compare with TypeScript

Write the TypeScript equivalent of the `PaymentProcessor` ABC example above using:
1. An `abstract class`
2. An `interface`

Note the differences:
- Which approach allows shared implementation?
- Which requires explicit `implements`?
- How does error detection differ (compile-time vs runtime)?

### Exercise 4: Event System

Build an event system using both ABC and Protocol:

```python
class EventHandler(Protocol):
    def handle(self, event: dict) -> None: ...

class BaseEventBus(ABC):
    @abstractmethod
    def subscribe(self, event_type: str, handler: EventHandler) -> None: ...

    @abstractmethod
    def publish(self, event_type: str, data: dict) -> None: ...
```

Implement `InMemoryEventBus` and create several handlers. The handlers should use Protocol (no inheritance), while the event bus uses ABC (shared logic).

---

## Key Takeaways for Node.js Developers

1. **ABC = TypeScript `abstract class`** - requires inheritance, enforces implementation at instantiation
2. **Protocol = TypeScript `interface`** - structural typing, no inheritance needed
3. **ABCs can have concrete methods** - shared implementation like abstract classes in TS
4. **Protocols are checked by mypy** - add `@runtime_checkable` for `isinstance()` support
5. **You can combine both** - ABC for your internal hierarchy, Protocol for external consumers
6. **Python's duck typing philosophy** favors Protocol over ABC in most cases
7. **Missing abstract methods fail at instantiation** in Python vs compile-time in TypeScript
