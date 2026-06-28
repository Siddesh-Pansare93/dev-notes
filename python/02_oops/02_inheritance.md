# Inheritance

> Python inheritance for Node.js/TypeScript developers

---

## Single Inheritance

Python uses parentheses instead of `extends`. The concept is the same.

```python
# Python
class Animal:
    def __init__(self, name: str, sound: str):
        self.name = name
        self.sound = sound

    def speak(self) -> str:
        return f"{self.name} says {self.sound}"


class Dog(Animal):  # Dog inherits from Animal
    def __init__(self, name: str):
        super().__init__(name, "Woof")

    def fetch(self, item: str) -> str:
        return f"{self.name} fetches the {item}"
```

```typescript
// TypeScript
class Animal {
  constructor(public name: string, public sound: string) {}

  speak(): string {
    return `${this.name} says ${this.sound}`;
  }
}

class Dog extends Animal {
  constructor(name: string) {
    super(name, "Woof");
  }

  fetch(item: string): string {
    return `${this.name} fetches the ${item}`;
  }
}
```

### Real-World Example: HTTP Errors

```python
class AppError(Exception):
    """Base error for our application."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

    def to_dict(self) -> dict:
        return {
            "error": self.__class__.__name__,
            "message": self.message,
            "status_code": self.status_code,
        }

    def __str__(self) -> str:
        return f"{self.__class__.__name__}({self.status_code}): {self.message}"


class NotFoundError(AppError):
    def __init__(self, resource: str, resource_id: str):
        super().__init__(
            message=f"{resource} with id '{resource_id}' not found",
            status_code=404,
        )
        self.resource = resource
        self.resource_id = resource_id


class ValidationError(AppError):
    def __init__(self, field: str, reason: str):
        super().__init__(
            message=f"Validation failed for '{field}': {reason}",
            status_code=422,
        )
        self.field = field
        self.reason = reason


class AuthenticationError(AppError):
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message=message, status_code=401)


class PermissionError(AppError):
    def __init__(self, action: str, resource: str):
        super().__init__(
            message=f"Not authorized to {action} on {resource}",
            status_code=403,
        )


# Usage
try:
    raise NotFoundError("User", "abc-123")
except AppError as e:
    print(e)            # NotFoundError(404): User with id 'abc-123' not found
    print(e.to_dict())  # {'error': 'NotFoundError', 'message': '...', 'status_code': 404}
```

```typescript
// TypeScript equivalent (you've probably written this many times!)
class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, resourceId: string) {
    super(`${resource} with id '${resourceId}' not found`, 404);
  }
}
```

---

## `super().__init__()` vs `super()`

In Python 3, `super()` works without arguments (in Python 2 you needed `super(ClassName, self)`). You must explicitly call `super().__init__()` -- it is NOT called automatically.

```python
class Base:
    def __init__(self):
        print("Base init")
        self.base_value = 42


class Child(Base):
    def __init__(self):
        # If you forget super().__init__(), base_value won't exist!
        super().__init__()
        print("Child init")
        self.child_value = 100


c = Child()
# Output:
# Base init
# Child init
print(c.base_value)   # 42
print(c.child_value)  # 100
```

This is the same as TypeScript where you must call `super()` before using `this` in a subclass constructor. The difference: TypeScript enforces this at compile time; Python only fails at runtime if you try to use an attribute that was never set.

```python
# Forgetting super().__init__() - silent bug
class BrokenChild(Base):
    def __init__(self):
        # Forgot super().__init__()
        self.child_value = 100

c = BrokenChild()
print(c.child_value)  # 100 - works fine
print(c.base_value)   # AttributeError: 'BrokenChild' has no attribute 'base_value'
```

---

## Method Overriding

Override a parent method by defining a method with the same name. No `override` keyword needed (though Python 3.12+ has `typing.override` decorator for static type checkers).

```python
from typing import override  # Python 3.12+


class BaseRepository:
    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        self._data: dict[str, dict] = {}

    def find_by_id(self, id: str) -> dict | None:
        return self._data.get(id)

    def save(self, id: str, document: dict) -> dict:
        self._data[id] = document
        return document

    def delete(self, id: str) -> bool:
        if id in self._data:
            del self._data[id]
            return True
        return False


class CachedRepository(BaseRepository):
    def __init__(self, collection_name: str, cache_ttl: int = 300):
        super().__init__(collection_name)
        self._cache: dict[str, dict] = {}
        self._cache_ttl = cache_ttl

    @override  # Optional: tells type checkers this is intentional
    def find_by_id(self, id: str) -> dict | None:
        # Check cache first
        if id in self._cache:
            print(f"Cache hit for {id}")
            return self._cache[id]
        # Fall back to parent implementation
        result = super().find_by_id(id)
        if result is not None:
            self._cache[id] = result
        return result

    @override
    def save(self, id: str, document: dict) -> dict:
        # Invalidate cache and delegate to parent
        self._cache.pop(id, None)
        return super().save(id, document)

    def clear_cache(self) -> None:
        """New method - not in parent."""
        self._cache.clear()


repo = CachedRepository("users")
repo.save("u1", {"name": "Alice", "email": "alice@example.com"})
repo.find_by_id("u1")  # fetches from _data
repo.find_by_id("u1")  # Cache hit for u1
```

---

## Multiple Inheritance

**This is a major difference from JavaScript/TypeScript.** Python supports multiple inheritance natively. JS does not.

```python
class JSONSerializable:
    def to_json(self) -> str:
        import json
        return json.dumps(self.__dict__, default=str)

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if not k.startswith("_")}


class Loggable:
    def log(self, message: str) -> None:
        print(f"[{self.__class__.__name__}] {message}")

    def log_state(self) -> None:
        print(f"[{self.__class__.__name__}] State: {self.__dict__}")


class Validatable:
    def validate(self) -> list[str]:
        """Override this in subclasses to add validation rules."""
        return []

    def is_valid(self) -> bool:
        return len(self.validate()) == 0


# Multiple inheritance: Order class inherits from ALL three
class Order(JSONSerializable, Loggable, Validatable):
    def __init__(self, order_id: str, customer: str, amount: float):
        self.order_id = order_id
        self.customer = customer
        self.amount = amount
        self.status = "pending"

    def validate(self) -> list[str]:
        errors = []
        if not self.order_id:
            errors.append("order_id is required")
        if self.amount <= 0:
            errors.append("amount must be positive")
        if not self.customer:
            errors.append("customer is required")
        return errors


order = Order("ORD-001", "Alice", 99.99)

# Methods from JSONSerializable
print(order.to_json())
# {"order_id": "ORD-001", "customer": "Alice", "amount": 99.99, "status": "pending"}

# Methods from Loggable
order.log("Order created")
# [Order] Order created

# Methods from Validatable
print(order.is_valid())  # True
print(order.validate())  # []

bad_order = Order("", "", -10)
print(bad_order.validate())  # ['order_id is required', 'amount must be positive', 'customer is required']
```

In TypeScript, you would need to use mixins, composition, or interfaces to achieve this:

```typescript
// TypeScript - no multiple inheritance, use interfaces + mixins
interface JSONSerializable {
  toJSON(): string;
  toDict(): Record<string, unknown>;
}

interface Loggable {
  log(message: string): void;
}

// You'd need to implement each interface manually or use a mixin pattern
// which is significantly more boilerplate
```

---

## Method Resolution Order (MRO) - C3 Linearization

When a class inherits from multiple parents, Python needs to decide which method to call when there is a conflict. It uses the **C3 linearization algorithm** to create a deterministic order.

```python
class A:
    def greet(self):
        return "Hello from A"

class B(A):
    def greet(self):
        return "Hello from B"

class C(A):
    def greet(self):
        return "Hello from C"

class D(B, C):
    pass  # inherits greet from... which one?


d = D()
print(d.greet())  # "Hello from B" - B comes before C in D's definition

# See the full MRO
print(D.__mro__)
# (<class 'D'>, <class 'B'>, <class 'C'>, <class 'A'>, <class 'object'>)

# Or more readable
print(D.mro())
# [<class 'D'>, <class 'B'>, <class 'C'>, <class 'A'>, <class 'object'>]
```

The MRO follows this logic:
1. The class itself comes first
2. Then parents in the order listed: `class D(B, C)` means B before C
3. Each class appears only once
4. A class always appears before its parents
5. The base `object` class is always last

### The Diamond Problem

```python
class Base:
    def __init__(self):
        print("Base.__init__")

class Left(Base):
    def __init__(self):
        print("Left.__init__")
        super().__init__()

class Right(Base):
    def __init__(self):
        print("Right.__init__")
        super().__init__()

class Diamond(Left, Right):
    def __init__(self):
        print("Diamond.__init__")
        super().__init__()


d = Diamond()
# Output:
# Diamond.__init__
# Left.__init__
# Right.__init__
# Base.__init__    <-- called only ONCE thanks to MRO!

print(Diamond.__mro__)
# (Diamond, Left, Right, Base, object)
```

`super()` in Python follows the MRO, not just the immediate parent. This is why `Base.__init__` is called only once even though both `Left` and `Right` inherit from it. This is called **cooperative multiple inheritance**.

---

## `isinstance()` and `issubclass()` vs `instanceof`

```python
class Animal:
    pass

class Dog(Animal):
    pass

class Cat(Animal):
    pass


dog = Dog()
cat = Cat()

# isinstance checks if an object is an instance of a class (or its subclasses)
print(isinstance(dog, Dog))     # True
print(isinstance(dog, Animal))  # True  (Dog is a subclass of Animal)
print(isinstance(dog, Cat))     # False

# Check against multiple types (like union type check)
print(isinstance(dog, (Dog, Cat)))  # True (is it Dog OR Cat?)

# issubclass checks class relationships (not instances)
print(issubclass(Dog, Animal))    # True
print(issubclass(Dog, Cat))       # False
print(issubclass(Dog, object))    # True (everything inherits from object)
```

```typescript
// TypeScript/JavaScript equivalent
const dog = new Dog();

console.log(dog instanceof Dog);    // true
console.log(dog instanceof Animal); // true
console.log(dog instanceof Cat);    // false

// No built-in multi-type instanceof in JS
// You'd need: dog instanceof Dog || dog instanceof Cat
```

### Practical example: Error handling

```python
try:
    process_request()
except NotFoundError as e:
    return {"status": 404, "error": e.message}
except (ValidationError, AuthenticationError) as e:
    # Handle multiple error types
    return {"status": e.status_code, "error": e.message}
except AppError as e:
    # Catch all app errors (isinstance check under the hood)
    return {"status": e.status_code, "error": e.message}
```

---

## Mixins Pattern

Mixins are classes designed to be "mixed in" to other classes via multiple inheritance. They add functionality without being standalone. This is a common Python pattern that replaces interface + implementation in TypeScript.

```python
import time
from datetime import datetime


class TimestampMixin:
    """Adds created_at and updated_at tracking."""

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)

    def init_timestamps(self):
        self.created_at = datetime.now()
        self.updated_at = datetime.now()

    def touch(self):
        """Update the updated_at timestamp."""
        self.updated_at = datetime.now()


class SoftDeleteMixin:
    """Adds soft-delete functionality instead of hard deletes."""

    def init_soft_delete(self):
        self.deleted_at: datetime | None = None
        self.is_deleted = False

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = datetime.now()

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None


class AuditMixin:
    """Tracks who created/modified a record."""

    def init_audit(self):
        self.created_by: str | None = None
        self.updated_by: str | None = None

    def set_creator(self, user_id: str):
        self.created_by = user_id

    def set_updater(self, user_id: str):
        self.updated_by = user_id


# Compose mixins into a model
class UserModel(TimestampMixin, SoftDeleteMixin, AuditMixin):
    def __init__(self, user_id: str, name: str, email: str):
        self.user_id = user_id
        self.name = name
        self.email = email
        # Initialize mixins
        self.init_timestamps()
        self.init_soft_delete()
        self.init_audit()

    def __str__(self) -> str:
        status = "DELETED" if self.is_deleted else "ACTIVE"
        return f"User({self.user_id}, {self.name}, {status})"


user = UserModel("u1", "Alice", "alice@example.com")
user.set_creator("admin")
print(user)              # User(u1, Alice, ACTIVE)
print(user.created_at)   # 2025-01-15 10:30:00.123456

user.soft_delete()
print(user)              # User(u1, Alice, DELETED)
print(user.deleted_at)   # 2025-01-15 10:30:01.654321

user.restore()
print(user)              # User(u1, Alice, ACTIVE)
```

### Mixin Best Practices

1. Mixins should be **small and focused** - one responsibility each
2. Name them with a `Mixin` suffix for clarity
3. Mixins should NOT have their own `__init__` that requires arguments (use init methods instead, or use `**kwargs` with cooperative `super()` calls)
4. They should not depend on each other
5. List mixins before the base class: `class Foo(MixinA, MixinB, BaseClass)`

---

## Practice Exercises

### Exercise 1: Plugin System

Create a plugin system with inheritance:

```python
class BasePlugin:
    """Base class for all plugins."""
    name: str = "unnamed"
    version: str = "0.0.0"

    def initialize(self) -> None: ...
    def execute(self, data: dict) -> dict: ...
    def cleanup(self) -> None: ...
```

Create three plugins: `TransformPlugin`, `ValidationPlugin`, `LoggingPlugin`. Each should override the methods. Create a `PluginManager` class that can register, execute, and manage plugins.

### Exercise 2: Multiple Inheritance - Middleware Chain

Build a middleware system using mixins:
- `CORSMixin` - adds CORS headers to response
- `AuthMixin` - validates auth tokens
- `RateLimitMixin` - tracks request counts
- `RequestHandler(CORSMixin, AuthMixin, RateLimitMixin)` - combines all

Test the MRO and verify each mixin's methods are accessible.

### Exercise 3: Error Hierarchy

Build a comprehensive error hierarchy for an API:
- `AppError(Exception)` - base with `status_code`, `message`, `to_dict()`
- `ClientError(AppError)` - 4xx errors
- `ServerError(AppError)` - 5xx errors
- Specific errors: `NotFoundError`, `ConflictError`, `BadRequestError`, `InternalError`, `ServiceUnavailableError`

Each should have sensible defaults and be usable in try/except blocks with `isinstance` checks. Write the equivalent TypeScript error hierarchy and compare the number of lines.

### Exercise 4: Inspect MRO

Given this class hierarchy, predict the MRO before running it:

```python
class A:
    def who(self): return "A"

class B(A):
    def who(self): return "B"

class C(A):
    def who(self): return "C"

class D(B):
    pass

class E(C):
    def who(self): return "E"

class F(D, E):
    pass

# What is F.__mro__?
# What does F().who() return?
```

---

## Key Takeaways for Node.js Developers

1. **`class Child(Parent)`** instead of `class Child extends Parent`
2. **`super().__init__()`** must be called explicitly (like `super()` in TS constructors)
3. **Multiple inheritance is real** - Python supports it natively with MRO
4. **MRO determines method lookup order** - left to right in the parent list
5. **Mixins replace interfaces + implementation** - more powerful than TS interfaces
6. **`isinstance()` and `issubclass()`** replace `instanceof` with more flexibility
7. **No `override` keyword enforced at runtime** - use `typing.override` for static checking
