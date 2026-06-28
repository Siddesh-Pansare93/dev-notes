# Interfaces vs Abstract Classes

## What You'll Learn

- The fundamental differences between interfaces and abstract classes in TypeScript
- When to reach for one over the other in backend architecture
- Declaration merging — a unique power of interfaces
- Implementing multiple interfaces on a single class
- Abstract methods and abstract properties
- Interface extending interface and class implementing interface patterns

---

## Quick Comparison Table

| Feature                      | Interface                       | Abstract Class                    |
|------------------------------|---------------------------------|-----------------------------------|
| Can contain implementation?  | No (declaration only)           | Yes (concrete + abstract members) |
| Multiple inheritance?        | Yes (implement many)            | No (extend one)                   |
| Emitted in JavaScript?       | No (erased at compile time)     | Yes (real JS class)               |
| Can have constructor?        | No                              | Yes                               |
| Declaration merging?         | Yes                             | No                                |
| Can have access modifiers?   | No (all members are public)     | Yes                               |
| Can have static members?     | No                              | Yes                               |

---

## Interfaces: Shape Contracts

An interface defines the **shape** of an object. It produces zero JavaScript output — it exists purely for the type checker.

```typescript
interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error): void;
}

interface Closable {
  close(): Promise<void>;
}

// A class can implement multiple interfaces
class FileLogger implements Logger, Closable {
  private fileHandle: any;

  constructor(private filePath: string) {}

  info(message: string, meta?: Record<string, unknown>): void {
    this.write("INFO", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write("WARN", message, meta);
  }

  error(message: string, error?: Error): void {
    this.write("ERROR", message, { stack: error?.stack });
  }

  async close(): Promise<void> {
    // flush and close file handle
    console.log(`Closing log file: ${this.filePath}`);
  }

  private write(level: string, message: string, meta?: Record<string, unknown>): void {
    const entry = `[${level}] ${new Date().toISOString()} ${message} ${JSON.stringify(meta ?? {})}`;
    console.log(entry);
  }
}
```

> **Coming from JS:** JavaScript has no interfaces at all. In JS, you rely on duck typing — if an object has the right methods, it works. TypeScript interfaces formalize this: they let you define the "duck" explicitly so the compiler can check it for you.

---

## Abstract Classes: Partial Implementations

An abstract class can contain both concrete methods (shared logic) and abstract methods (contracts for subclasses). Unlike interfaces, abstract classes **do** appear in the compiled JavaScript.

```typescript
abstract class PaymentProcessor {
  protected readonly createdAt = new Date();

  constructor(protected readonly merchantId: string) {}

  // Abstract — each subclass must implement
  abstract charge(amount: number, currency: string): Promise<PaymentResult>;
  abstract refund(transactionId: string, amount: number): Promise<PaymentResult>;

  // Abstract property
  abstract readonly providerName: string;

  // Concrete — shared across all subclasses
  async chargeWithRetry(
    amount: number,
    currency: string,
    retries = 3
  ): Promise<PaymentResult> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.charge(amount, currency);
      } catch (err) {
        if (attempt === retries) throw err;
        await this.delay(attempt * 1000);
      }
    }
    throw new Error("Unreachable");
  }

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

interface PaymentResult {
  transactionId: string;
  success: boolean;
  message: string;
}

class StripeProcessor extends PaymentProcessor {
  readonly providerName = "Stripe";

  async charge(amount: number, currency: string): Promise<PaymentResult> {
    console.log(`[Stripe] Charging ${amount} ${currency} for merchant ${this.merchantId}`);
    return { transactionId: `stripe_${Date.now()}`, success: true, message: "Charged" };
  }

  async refund(transactionId: string, amount: number): Promise<PaymentResult> {
    console.log(`[Stripe] Refunding ${amount} for txn ${transactionId}`);
    return { transactionId, success: true, message: "Refunded" };
  }
}

class PayPalProcessor extends PaymentProcessor {
  readonly providerName = "PayPal";

  async charge(amount: number, currency: string): Promise<PaymentResult> {
    console.log(`[PayPal] Charging ${amount} ${currency} for merchant ${this.merchantId}`);
    return { transactionId: `pp_${Date.now()}`, success: true, message: "Charged" };
  }

  async refund(transactionId: string, amount: number): Promise<PaymentResult> {
    console.log(`[PayPal] Refunding ${amount} for txn ${transactionId}`);
    return { transactionId, success: true, message: "Refunded" };
  }
}
```

---

## Side-by-Side: When to Use Which

### Use an interface when:

- You only need to define a **shape** (no shared logic).
- A class needs to conform to **multiple** contracts.
- You want zero runtime overhead (interfaces are erased).
- You need **declaration merging** (explained below).

### Use an abstract class when:

- You have **shared implementation** that subclasses should inherit.
- You need **access modifiers** (`protected` helper methods, `private` internals).
- You need a **constructor** that sets up common state.
- You want to use `instanceof` checks at runtime.

```typescript
// Interface approach — no shared logic, just shape
interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
}

// Abstract class approach — shared serialization logic
abstract class SerializingCacheStore {
  abstract getRaw(key: string): Promise<string | null>;
  abstract setRaw(key: string, value: string, ttl?: number): Promise<void>;

  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.getRaw(key);
    return raw ? JSON.parse(raw) : null;
  }

  async setJSON<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.setRaw(key, JSON.stringify(value), ttl);
  }
}
```

> **Coming from JS:** In JavaScript, the only option for shared base behavior is a class (regular or extending another). TypeScript's interfaces let you define contracts without any runtime artifact. Many backend frameworks (NestJS, TypeORM) use both: interfaces for dependency injection tokens and abstract classes for shared base logic.

---

## Declaration Merging

Interfaces with the same name in the same scope automatically merge. This is a unique power of interfaces that abstract classes cannot replicate.

```typescript
// Suppose a library defines this:
interface Request {
  url: string;
  method: string;
}

// Your code can extend it without modifying the original:
interface Request {
  userId?: string;
  correlationId?: string;
}

// The merged result has all four properties:
function handleRequest(req: Request) {
  console.log(req.url);           // from original
  console.log(req.correlationId); // from your extension
}
```

This is heavily used in Express type definitions. The `@types/express` package lets you augment `Request` with your own properties:

```typescript
// In a .d.ts file or at the top of your app:
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
      requestId: string;
    }
  }
}

// Now every Express request handler sees these properties:
app.get("/profile", (req, res) => {
  const userId = req.user?.id; // TypeScript knows about this
  res.json({ userId });
});
```

---

## Implementing Multiple Interfaces

A class can implement as many interfaces as needed. This is TypeScript's answer to multiple inheritance.

```typescript
interface Identifiable {
  readonly id: string;
}

interface Timestamped {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface SoftDeletable {
  deletedAt: Date | null;
  softDelete(): void;
  restore(): void;
}

class UserEntity implements Identifiable, Timestamped, SoftDeletable {
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null = null;

  constructor(
    readonly id: string,
    public name: string,
    public email: string
  ) {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  softDelete(): void {
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  restore(): void {
    this.deletedAt = null;
    this.updatedAt = new Date();
  }
}
```

---

## Interface Extending Interface

Interfaces can extend other interfaces to build up complex contracts from simpler ones.

```typescript
interface Readable {
  read(key: string): Promise<string | null>;
}

interface Writable {
  write(key: string, value: string): Promise<void>;
}

interface Deletable {
  delete(key: string): Promise<boolean>;
}

// Compose smaller interfaces into a larger one
interface FullStore extends Readable, Writable, Deletable {
  exists(key: string): Promise<boolean>;
}

class RedisStore implements FullStore {
  private data = new Map<string, string>();

  async read(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async write(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.data.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.data.has(key);
  }
}
```

---

## The Hybrid Approach

In real backend code, you often see interfaces and abstract classes used together. Define the contract with an interface, then provide a partial implementation with an abstract class.

```typescript
// Contract
interface MessageQueue {
  publish(topic: string, message: unknown): Promise<void>;
  subscribe(topic: string, handler: (msg: unknown) => Promise<void>): void;
  disconnect(): Promise<void>;
}

// Shared base with logging, serialization, and retry logic
abstract class BaseMessageQueue implements MessageQueue {
  constructor(protected readonly connectionUrl: string) {}

  async publish(topic: string, message: unknown): Promise<void> {
    const serialized = JSON.stringify(message);
    console.log(`Publishing to ${topic}: ${serialized.slice(0, 100)}...`);
    await this.doPublish(topic, serialized);
  }

  abstract subscribe(topic: string, handler: (msg: unknown) => Promise<void>): void;
  abstract disconnect(): Promise<void>;

  protected abstract doPublish(topic: string, serialized: string): Promise<void>;
}

// Concrete implementation
class RabbitMQQueue extends BaseMessageQueue {
  subscribe(topic: string, handler: (msg: unknown) => Promise<void>): void {
    console.log(`[RabbitMQ] Subscribed to ${topic}`);
  }

  async disconnect(): Promise<void> {
    console.log("[RabbitMQ] Disconnected");
  }

  protected async doPublish(topic: string, serialized: string): Promise<void> {
    console.log(`[RabbitMQ] Published to ${topic}`);
  }
}

// Code that depends only on the interface — easy to test and swap
function createOrderProcessor(queue: MessageQueue) {
  return {
    async processOrder(order: { id: string; total: number }) {
      await queue.publish("orders", order);
    },
  };
}
```

---

## Mini-Exercise

Design a pluggable authentication system:

1. Create an `AuthProvider` interface with methods: `authenticate(credentials: Credentials): Promise<AuthResult>` and `validateToken(token: string): Promise<boolean>`.
2. Create a `Credentials` type with `{ username: string; password: string }` and an `AuthResult` type with `{ success: boolean; token?: string; error?: string }`.
3. Create an abstract class `BaseAuthProvider` that implements `AuthProvider` and adds a `protected log(message: string)` helper and a concrete `authenticateWithRetry` method.
4. Implement two concrete providers: `DatabaseAuthProvider` and `LdapAuthProvider`, each with their own mock logic.
5. Write a function `loginUser(provider: AuthProvider, creds: Credentials)` that works with any provider.

```typescript
// Your implementation here

// Test it:
const dbAuth = new DatabaseAuthProvider();
const ldapAuth = new LdapAuthProvider();

await loginUser(dbAuth, { username: "alice", password: "secret" });
await loginUser(ldapAuth, { username: "bob", password: "pass123" });
```
