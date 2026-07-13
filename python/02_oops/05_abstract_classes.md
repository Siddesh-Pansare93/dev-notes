# Abstract Classes & Protocols

> Python ke abstract base classes aur structural subtyping — Node.js/TypeScript devs ke liye

---

## ABC (Abstract Base Class) — `abc` Module Se

Python ke ABCs bilkul TypeScript ke `abstract` classes jaise hain. Ye ek contract define karte hain jise subclasses ko MANDATORY follow karna padta hai. Abstract class ko directly instantiate nahi kar sakte.

Socho tum Zomato jaisa payment system bana rahe ho — chahe Stripe ho ya PayPal, sabko charge, refund aur balance check karna hi padega. `PaymentProcessor` ek blueprint hai, koi usse seedha use nahi kar sakta — usko extend karke hi kaam chalega.

```python
from abc import ABC, abstractmethod


class PaymentProcessor(ABC):
    """Abstract base class - isko directly instantiate nahi kar sakte."""

    def __init__(self, merchant_id: str):
        self.merchant_id = merchant_id
        self._transactions: list[dict] = []

    @abstractmethod
    def charge(self, amount: float, currency: str) -> dict:
        """Subclasses ko YE zaroor implement karna hai."""
        ...

    @abstractmethod
    def refund(self, transaction_id: str) -> dict:
        """Subclasses ko YE zaroor implement karna hai."""
        ...

    @abstractmethod
    def get_balance(self) -> float:
        """Subclasses ko YE zaroor implement karna hai."""
        ...

    # Concrete methods (shared implementation) bhi allowed hain
    def log_transaction(self, transaction: dict) -> None:
        """Shared implementation - subclasses ko free mein milta hai."""
        self._transactions.append(transaction)
        print(f"[{self.merchant_id}] Transaction: {transaction}")

    def get_transaction_history(self) -> list[dict]:
        return self._transactions.copy()


# Abstract class ko instantiate nahi kar sakte
# processor = PaymentProcessor("m_123")  # TypeError!


class StripeProcessor(PaymentProcessor):
    """Stripe ke liye concrete implementation."""

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
    """PayPal ke liye concrete implementation."""

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


# Usage - interface ke against code likho, implementation ke against nahi
def process_payment(processor: PaymentProcessor, amount: float) -> dict:
    """Kisi bhi PaymentProcessor implementation ke saath kaam karega."""
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

### Agar Ek Abstract Method Bhool Jao To?

```python
class IncompleteProcessor(PaymentProcessor):
    def charge(self, amount: float, currency: str) -> dict:
        return {}
    # refund() aur get_balance() bhool gaye!


# TypeError INSTANTIATION time pe aayega, definition time pe nahi
# proc = IncompleteProcessor("m_789")
# TypeError: Can't instantiate abstract class IncompleteProcessor
# with abstract methods get_balance, refund
```

> [!warning]
> Yaha bada difference hai TypeScript se. TS mein compile-time pe hi error mil jaata hai agar abstract method miss ho. Python mein class define karte waqt kuch nahi hota — jaise hi tum us class ka object banane ki koshish karoge, tabhi `TypeError` fatega. Matlab bug production tak chhup sakta hai agar us class ko kabhi instantiate hi na kiya ho.

---

## `@abstractmethod` Ke Saath Property, Classmethod, Staticmethod

`@abstractmethod` ko doosre decorators ke saath bhi combine kar sakte ho:

```python
from abc import ABC, abstractmethod


class Cache(ABC):
    """Abstract cache interface."""

    @property
    @abstractmethod
    def size(self) -> int:
        """Cache mein kitne items hain."""
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
        """Factory method jo implement karna zaroori hai."""
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

> [!tip]
> Order yaad rakho: `@classmethod` upar, `@abstractmethod` neeche. Decorators bottom-to-top apply hote hain, isliye ye order zaroori hai warna Python confuse ho jaata hai.

---

## Protocol — Structural Subtyping (Duck Typing)

Ye Python ka **TypeScript interface** wala equivalent hai. Protocol ek structural type define karta hai — jis bhi class ke paas sahi methods/attributes hain wo match ho jaayegi, bina explicitly usse inherit kiye.

Socho IRCTC ka ticket printer hai. Usse farak nahi padta tumhara ticket kaunsi company ne banaya — agar usme `print()` method hai, printer chala dega. Wahi Protocol ka idea hai: "agar duck ki tarah quack karta hai, to duck hi hai" — chahe wo `Duck` class se inherit kare ya na kare.

```python
from typing import Protocol, runtime_checkable


class Renderable(Protocol):
    """Jis bhi object ke paas render() method hai, wo isse match karega.

    Ye STRUCTURAL typing hai - TypeScript interfaces jaisa.
    Koi inheritance zaroori nahi!
    """

    def render(self) -> str:
        ...


class HTMLComponent:
    """Renderable se inherit NAHI karta, lekin structure match karta hai."""

    def __init__(self, tag: str, content: str):
        self.tag = tag
        self.content = content

    def render(self) -> str:
        return f"<{self.tag}>{self.content}</{self.tag}>"


class MarkdownComponent:
    """Ye bhi bina inherit kiye Renderable match karta hai."""

    def __init__(self, level: int, text: str):
        self.level = level
        self.text = text

    def render(self) -> str:
        return f"{'#' * self.level} {self.text}"


class JSONResponse:
    """Renderable match NAHI karta - koi render() method nahi hai."""

    def __init__(self, data: dict):
        self.data = data

    def to_json(self) -> str:
        import json
        return json.dumps(self.data)


# Ye function kisi bhi cheez ko accept karta hai jiske paas render() method ho
def render_page(components: list[Renderable]) -> str:
    """Type checker ko pata hai in objects ke paas render() hai."""
    return "\n".join(c.render() for c in components)


# Ye sab kaam karega - sabke paas render() hai
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
// TypeScript - interfaces bhi isi tarah kaam karte hain (structural typing)
interface Renderable {
  render(): string;
}

class HTMLComponent {
  // "implements Renderable" likhne ki zarurat nahi!
  constructor(private tag: string, private content: string) {}

  render(): string {
    return `<${this.tag}>${this.content}</${this.tag}>`;
  }
}

function renderPage(components: Renderable[]): string {
  return components.map((c) => c.render()).join("\n");
}

// HTMLComponent structurally Renderable ko match karta hai
renderPage([new HTMLComponent("h1", "Hello")]);
```

### Property Wala Protocol

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
    """Protocols ko compose karo - jaise TS mein interfaces extend karte ho."""

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

By default, Protocols sirf static type checkers (jaise mypy) hi check karte hain. `@runtime_checkable` add karo to `isinstance()` checks runtime pe bhi kaam karengi.

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

# Runtime isinstance checks ab kaam karengi!
print(isinstance(user, Serializable))  # True
print(isinstance(raw, Serializable))   # False

# Conditional logic mein use karo
def save(obj: object) -> None:
    if isinstance(obj, Serializable):
        print(f"Saving: {obj.to_json()}")
    else:
        print(f"Cannot serialize {type(obj).__name__}")


save(user)  # Saving: {"name": "Alice", "email": "alice@example.com"}
save(raw)   # Cannot serialize RawData
```

> [!warning]
> **Caveat**: `runtime_checkable` sirf method ka EXISTENCE check karta hai, signature nahi. Parameter types ya return types runtime pe verify nahi hote. Matlab agar tumhare `to_json` method ne wrong type return kiya, `isinstance()` check phir bhi pass ho jaayega.

---

## ABC vs Protocol: Kab Kya Use Karo

| Feature | ABC | Protocol |
|---------|-----|----------|
| Inheritance zaroori? | **Haan** - subclass karna hi padega | **Nahi** - structural matching |
| `isinstance()` checks | Haan (hamesha) | Sirf `@runtime_checkable` ke saath |
| Shared implementation | **Haan** - concrete methods rakh sakte ho | **Nahi** - purely structural |
| Implementation enforce karta hai | **Haan** - instantiation time pe | **Sirf type-check time pe** (mypy) |
| TS equivalent | `abstract class` | `interface` |
| Use case | Frameworks, plugins | APIs, duck typing |

### ABC Kab Use Karo:

1. Jab tumhe **enforce** karna ho ki subclasses specific methods implement karein (instantiation pe fail ho)
2. Jab tumhe **shared implementation** deni ho (concrete methods, abstract methods ke saath)
3. Jab tum ek **framework/plugin system** bana rahe ho jaha classes ko subclass banke register hona hai
4. Jab tumhe reliable **runtime `isinstance()` checks** chahiye

```python
from abc import ABC, abstractmethod


class DatabaseDriver(ABC):
    """ABC use karo: hume shared connection logic + enforced interface chahiye."""

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

### Protocol Kab Use Karo:

1. Jab tumhe **duck typing** chahiye - "quack karta hai to duck hai"
2. Jab tum **library code** likh rahe ho jo kisi bhi shape-matching object ke saath kaam kare
3. Jab tum users ko apni classes se inherit karne ke liye force nahi karna chahte
4. Jab tumhe **TypeScript interfaces** jaisa behaviour chahiye

```python
from typing import Protocol


class Closeable(Protocol):
    """Protocol use karo: close() wala koi bhi object chalega."""

    def close(self) -> None:
        ...


class Flushable(Protocol):
    def flush(self) -> None:
        ...


def cleanup(resource: Closeable) -> None:
    """Files, connections, sockets - close() wala kuch bhi chalega."""
    resource.close()


# Ye sab bina Closeable se inherit kiye kaam karenge:
# - open("file.txt")  (file objects ke paas close() hai)
# - socket.socket()   (sockets ke paas close() hai)
# - sqlite3.connect() (DB connections ke paas close() hai)
```

### ABC Aur Protocol Ko Combine Karna

Ek hi codebase mein dono use kar sakte ho:

```python
from abc import ABC, abstractmethod
from typing import Protocol


# External code ke liye Protocol - inheritance zaroori nahi
class MessageSender(Protocol):
    def send(self, to: str, body: str) -> bool:
        ...


# Apni internal implementation hierarchy ke liye ABC
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


# Ye function send() wali KISI bhi cheez ko accept karega - ABC subclass ho ya na ho
def notify_user(sender: MessageSender, user_email: str, message: str):
    sender.send(user_email, message)


# ABC subclasses ke saath kaam karta hai
notify_user(EmailNotifier({}), "alice@example.com", "Hello!")

# Kisi bhi object ke saath bhi kaam karta hai jiske paas send() ho - inheritance zaroori nahi
class SlackWebhook:
    def send(self, to: str, body: str) -> bool:
        print(f"Slack to #{to}: {body}")
        return True

notify_user(SlackWebhook(), "general", "Deployed v2.0!")
```

---

## Practice Exercises

### Exercise 1: ABC Ke Saath Repository Pattern

Ek abstract `Repository[T]` base class banao:

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

`InMemoryRepository` aur `FileRepository` implement karo. `find_by(predicate)` aur `count()` jaise shared methods ABC pe concrete methods ki tarah add karo.

### Exercise 2: Protocol Ke Saath Plugin System

Ek Protocol-based plugin system banao:

```python
class Plugin(Protocol):
    name: str
    version: str

    def initialize(self, config: dict) -> None: ...
    def execute(self, context: dict) -> dict: ...
    def cleanup(self) -> None: ...
```

3 plugins likho jo is Protocol ko match karein BINA usse inherit kiye. Ek `PluginManager` banao jo `@runtime_checkable` ke saath `isinstance()` use karke plugins discover aur run kare.

### Exercise 3: TypeScript Se Compare Karo

Upar wale `PaymentProcessor` ABC example ka TypeScript equivalent likho, in dono tareeko se:
1. Ek `abstract class`
2. Ek `interface`

Difference note karo:
- Kaunsa approach shared implementation allow karta hai?
- Kaunsa explicit `implements` maangta hai?
- Error detection kaise differ karta hai (compile-time vs runtime)?

### Exercise 4: Event System

ABC aur Protocol dono use karke ek event system banao:

```python
class EventHandler(Protocol):
    def handle(self, event: dict) -> None: ...

class BaseEventBus(ABC):
    @abstractmethod
    def subscribe(self, event_type: str, handler: EventHandler) -> None: ...

    @abstractmethod
    def publish(self, event_type: str, data: dict) -> None: ...
```

`InMemoryEventBus` implement karo aur kai handlers banao. Handlers Protocol use karein (koi inheritance nahi), jabki event bus ABC use kare (shared logic ke liye).

---

## Key Takeaways for Node.js Developers

1. **ABC = TypeScript `abstract class`** - inheritance zaroori hai, instantiation time pe implementation enforce karta hai
2. **Protocol = TypeScript `interface`** - structural typing, inheritance ki zarurat nahi
3. **ABCs mein concrete methods ho sakte hain** - TS ke abstract classes jaisi shared implementation
4. **Protocols mypy se check hote hain** - `isinstance()` support ke liye `@runtime_checkable` add karo
5. **Dono ko combine kar sakte ho** - internal hierarchy ke liye ABC, external consumers ke liye Protocol
6. **Python ki duck typing philosophy** zyada cases mein ABC se zyada Protocol ko prefer karti hai
7. **Missing abstract methods Python mein instantiation time pe fail** hote hain, TypeScript mein compile-time pe
</content>
