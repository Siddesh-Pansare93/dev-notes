# SOLID Principles in TypeScript

## What You'll Learn

- All five SOLID principles with clear explanations
- A BAD example (violating the principle) and a GOOD example (following it) for each
- All examples in a TypeScript backend context
- How NestJS leverages each principle in its architecture

---

## 1. Single Responsibility Principle (SRP)

**"A class should have only one reason to change."**

Each class should do one thing and do it well. If a class handles user validation, database queries, and email sending, a change to email logic forces you to touch a class that also manages data access.

### BAD: One class does everything

```typescript
class UserManager {
  async createUser(data: { name: string; email: string; password: string }) {
    // Validation logic
    if (!data.email.includes("@")) {
      throw new Error("Invalid email");
    }
    if (data.password.length < 8) {
      throw new Error("Password too short");
    }

    // Password hashing
    const hashedPassword = await this.hashPassword(data.password);

    // Database insertion
    const user = await this.insertIntoDatabase({
      name: data.name,
      email: data.email,
      password: hashedPassword,
    });

    // Send welcome email
    await this.sendEmail(
      data.email,
      "Welcome!",
      `Hello ${data.name}, welcome to our platform.`
    );

    // Audit logging
    await this.writeAuditLog("USER_CREATED", user.id);

    return user;
  }

  private async hashPassword(password: string): Promise<string> {
    return `hashed_${password}`;
  }

  private async insertIntoDatabase(data: any): Promise<any> {
    return { id: "user-1", ...data };
  }

  private async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`Sending email to ${to}`);
  }

  private async writeAuditLog(action: string, userId: string): Promise<void> {
    console.log(`[AUDIT] ${action} ${userId}`);
  }
}
```

This class has **four reasons to change**: validation rules, database schema, email provider, or audit format.

### GOOD: Each class has one responsibility

```typescript
class UserValidator {
  validate(data: { email: string; password: string }): void {
    if (!data.email.includes("@")) throw new Error("Invalid email");
    if (data.password.length < 8) throw new Error("Password too short");
  }
}

class PasswordHasher {
  async hash(password: string): Promise<string> {
    return `hashed_${password}`; // bcrypt in real code
  }
}

class UserRepository {
  async create(data: { name: string; email: string; password: string }): Promise<User> {
    return { id: "user-1", ...data };
  }
}

class EmailService {
  async sendWelcome(user: User): Promise<void> {
    console.log(`Sending welcome email to ${user.email}`);
  }
}

class AuditLogger {
  async log(action: string, entityId: string): Promise<void> {
    console.log(`[AUDIT] ${action} ${entityId}`);
  }
}

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

class UserService {
  constructor(
    private validator: UserValidator,
    private hasher: PasswordHasher,
    private repo: UserRepository,
    private email: EmailService,
    private audit: AuditLogger
  ) {}

  async createUser(data: { name: string; email: string; password: string }): Promise<User> {
    this.validator.validate(data);
    const hashedPassword = await this.hasher.hash(data.password);
    const user = await this.repo.create({ ...data, password: hashedPassword });
    await this.email.sendWelcome(user);
    await this.audit.log("USER_CREATED", user.id);
    return user;
  }
}
```

> **NestJS connection:** NestJS enforces SRP by splitting your application into Controllers (HTTP handling), Services (business logic), and Repositories (data access). Each `@Injectable()` service should own a single concern.

---

## 2. Open/Closed Principle (OCP)

**"Software entities should be open for extension, but closed for modification."**

You should be able to add new behavior without changing existing code.

### BAD: Adding a new payment method requires modifying existing code

```typescript
class PaymentService {
  async processPayment(method: string, amount: number): Promise<void> {
    if (method === "credit_card") {
      console.log(`Processing credit card payment: $${amount}`);
      // credit card logic...
    } else if (method === "paypal") {
      console.log(`Processing PayPal payment: $${amount}`);
      // paypal logic...
    } else if (method === "crypto") {
      // Every new payment method means editing this class
      console.log(`Processing crypto payment: $${amount}`);
    }
    // Next developer adds another else-if here...
  }
}
```

### GOOD: New payment methods are added by creating new classes

```typescript
interface PaymentMethod {
  readonly name: string;
  process(amount: number): Promise<PaymentReceipt>;
}

interface PaymentReceipt {
  transactionId: string;
  amount: number;
  method: string;
}

class CreditCardPayment implements PaymentMethod {
  readonly name = "credit_card";

  async process(amount: number): Promise<PaymentReceipt> {
    console.log(`Processing credit card: $${amount}`);
    return { transactionId: `cc_${Date.now()}`, amount, method: this.name };
  }
}

class PayPalPayment implements PaymentMethod {
  readonly name = "paypal";

  async process(amount: number): Promise<PaymentReceipt> {
    console.log(`Processing PayPal: $${amount}`);
    return { transactionId: `pp_${Date.now()}`, amount, method: this.name };
  }
}

// Adding crypto means creating a new file — zero changes to existing code
class CryptoPayment implements PaymentMethod {
  readonly name = "crypto";

  async process(amount: number): Promise<PaymentReceipt> {
    console.log(`Processing crypto: $${amount}`);
    return { transactionId: `crypto_${Date.now()}`, amount, method: this.name };
  }
}

// PaymentService is CLOSED for modification — it never changes
class PaymentService {
  private methods = new Map<string, PaymentMethod>();

  register(method: PaymentMethod): void {
    this.methods.set(method.name, method);
  }

  async processPayment(methodName: string, amount: number): Promise<PaymentReceipt> {
    const method = this.methods.get(methodName);
    if (!method) throw new Error(`Unknown payment method: ${methodName}`);
    return method.process(amount);
  }
}

// Registration
const service = new PaymentService();
service.register(new CreditCardPayment());
service.register(new PayPalPayment());
service.register(new CryptoPayment());
```

> **NestJS connection:** NestJS modules are open for extension. You add features by creating new modules and importing them — you never modify the framework's core. Guard, Interceptor, and Pipe classes follow OCP: you create new ones rather than modifying existing ones.

---

## 3. Liskov Substitution Principle (LSP)

**"Subtypes must be substitutable for their base types without breaking the program."**

If code works with a base class, it must continue to work correctly with any subclass.

### BAD: Subclass breaks the base class contract

```typescript
class Bird {
  fly(): string {
    return "Flying!";
  }

  eat(): string {
    return "Eating!";
  }
}

class Penguin extends Bird {
  // Violates LSP: code that calls bird.fly() will get a runtime error
  override fly(): string {
    throw new Error("Penguins cannot fly!");
  }
}

function makeBirdFly(bird: Bird): void {
  // This crashes when bird is a Penguin — LSP violation
  console.log(bird.fly());
}

makeBirdFly(new Penguin()); // BOOM: Error
```

### GOOD: Model capabilities correctly so substitution is always safe

```typescript
interface Animal {
  eat(): string;
}

interface Flyable {
  fly(): string;
}

interface Swimmable {
  swim(): string;
}

class Eagle implements Animal, Flyable {
  eat(): string {
    return "Eagle eating fish";
  }
  fly(): string {
    return "Eagle soaring";
  }
}

class PenguinBird implements Animal, Swimmable {
  eat(): string {
    return "Penguin eating krill";
  }
  swim(): string {
    return "Penguin swimming";
  }
}

// Functions accept exactly the capabilities they need
function makeFly(flyer: Flyable): void {
  console.log(flyer.fly()); // Always safe — anything passed here CAN fly
}

function makeSwim(swimmer: Swimmable): void {
  console.log(swimmer.swim());
}

makeFly(new Eagle());        // Works
makeSwim(new PenguinBird()); // Works
// makeFly(new PenguinBird()); // Compile error — PenguinBird is not Flyable
```

A more backend-relevant example:

```typescript
// BAD: ReadOnlyCache extends Cache but throws on write operations
abstract class Cache {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string): Promise<void>;
  abstract delete(key: string): Promise<void>;
}

class ReadOnlyCache extends Cache {
  async get(key: string): Promise<string | null> { return null; }
  async set(): Promise<void> { throw new Error("Read-only cache!"); } // LSP violation
  async delete(): Promise<void> { throw new Error("Read-only cache!"); }
}

// GOOD: Separate interfaces for read and write
interface ReadableCache {
  get(key: string): Promise<string | null>;
}

interface WritableCache extends ReadableCache {
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

class FullCache implements WritableCache {
  private store = new Map<string, string>();
  async get(key: string) { return this.store.get(key) ?? null; }
  async set(key: string, value: string) { this.store.set(key, value); }
  async delete(key: string) { this.store.delete(key); }
}

class SnapshotCache implements ReadableCache {
  constructor(private snapshot: Map<string, string>) {}
  async get(key: string) { return this.snapshot.get(key) ?? null; }
}

// Functions that only read accept ReadableCache — both implementations work safely
async function lookupUser(cache: ReadableCache, userId: string) {
  return cache.get(`user:${userId}`);
}
```

> **NestJS connection:** NestJS guards return `boolean | Promise<boolean>`. Every guard substitutes into the framework's pipeline identically. If a guard threw instead of returning `false`, it would break LSP and cause unexpected behavior in the middleware chain.

---

## 4. Interface Segregation Principle (ISP)

**"Clients should not be forced to depend on interfaces they do not use."**

### BAD: One fat interface forces implementors to provide methods they do not need

```typescript
interface Worker {
  code(): void;
  test(): void;
  deploy(): void;
  attendMeeting(): void;
  writeDocumentation(): void;
  reviewPullRequest(): void;
}

// A junior dev is forced to implement deploy(), which they should not do
class JuniorDeveloper implements Worker {
  code() { console.log("Writing code"); }
  test() { console.log("Writing tests"); }
  deploy() { throw new Error("Not authorized to deploy"); } // Forced empty/broken impl
  attendMeeting() { console.log("In standup"); }
  writeDocumentation() { console.log("Updating docs"); }
  reviewPullRequest() { throw new Error("Not authorized to approve PRs"); }
}
```

### GOOD: Small, focused interfaces — implementors pick only what they need

```typescript
interface Coder {
  code(): void;
}

interface Tester {
  test(): void;
}

interface Deployer {
  deploy(): void;
}

interface MeetingAttendee {
  attendMeeting(): void;
}

interface DocumentationWriter {
  writeDocumentation(): void;
}

interface CodeReviewer {
  reviewPullRequest(): void;
}

class JuniorDeveloper implements Coder, Tester, MeetingAttendee {
  code() { console.log("Writing code"); }
  test() { console.log("Writing tests"); }
  attendMeeting() { console.log("In standup"); }
}

class SeniorDeveloper implements Coder, Tester, Deployer, CodeReviewer, MeetingAttendee {
  code() { console.log("Architecting solution"); }
  test() { console.log("Writing integration tests"); }
  deploy() { console.log("Deploying to production"); }
  reviewPullRequest() { console.log("Reviewing PR"); }
  attendMeeting() { console.log("Leading standup"); }
}

// Functions declare exactly the capability they need
function runDeployment(deployer: Deployer): void {
  deployer.deploy();
}

// runDeployment(new JuniorDeveloper()); // Compile error — JuniorDeveloper is not a Deployer
runDeployment(new SeniorDeveloper());    // Works
```

A backend-specific example:

```typescript
// BAD: One massive service interface
interface DatabaseService {
  query(sql: string): Promise<any[]>;
  insert(table: string, data: any): Promise<void>;
  update(table: string, id: string, data: any): Promise<void>;
  delete(table: string, id: string): Promise<void>;
  createBackup(): Promise<string>;
  restoreBackup(backupId: string): Promise<void>;
  runMigrations(): Promise<void>;
  getConnectionStats(): { active: number; idle: number };
}

// GOOD: Segregated interfaces
interface QueryRunner {
  query(sql: string): Promise<any[]>;
}

interface DataWriter {
  insert(table: string, data: any): Promise<void>;
  update(table: string, id: string, data: any): Promise<void>;
  delete(table: string, id: string): Promise<void>;
}

interface BackupManager {
  createBackup(): Promise<string>;
  restoreBackup(backupId: string): Promise<void>;
}

interface MigrationRunner {
  runMigrations(): Promise<void>;
}

// A reporting service only needs to read — it depends on QueryRunner
class ReportingService {
  constructor(private db: QueryRunner) {}

  async generateReport(): Promise<any[]> {
    return this.db.query("SELECT * FROM sales WHERE date > NOW() - INTERVAL '30 days'");
  }
}

// An admin controller needs backup capabilities
class AdminController {
  constructor(private backups: BackupManager) {}

  async triggerBackup(): Promise<string> {
    return this.backups.createBackup();
  }
}
```

> **NestJS connection:** NestJS uses many small, focused interfaces: `CanActivate` for guards, `NestInterceptor` for interceptors, `PipeTransform` for pipes, `ExceptionFilter` for error handling. Each has exactly one method. You never implement a god interface — you pick the precise capability your class provides.

---

## 5. Dependency Inversion Principle (DIP)

**"High-level modules should not depend on low-level modules. Both should depend on abstractions."**

### BAD: High-level business logic depends directly on low-level implementations

```typescript
import Redis from "ioredis";
import nodemailer from "nodemailer";

class OrderService {
  private redis = new Redis("redis://localhost:6379");
  private mailer = nodemailer.createTransport({ host: "smtp.gmail.com" });

  async placeOrder(order: { userId: string; items: string[] }): Promise<void> {
    // Directly coupled to Redis
    await this.redis.set(`order:${order.userId}`, JSON.stringify(order));

    // Directly coupled to nodemailer and Gmail
    await this.mailer.sendMail({
      to: `${order.userId}@example.com`,
      subject: "Order Placed",
      text: "Your order has been placed",
    });
  }
}
// Problems:
// - Cannot test without a real Redis and SMTP server
// - Cannot swap Redis for Memcached or Gmail for SendGrid
// - OrderService knows about transport-level details
```

### GOOD: Depend on abstractions, inject implementations

```typescript
// Abstractions (high-level defines what it needs)
interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
}

interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}

// High-level module depends only on abstractions
class OrderService {
  constructor(
    private cache: CacheStore,
    private email: EmailSender
  ) {}

  async placeOrder(order: { userId: string; items: string[] }): Promise<void> {
    await this.cache.set(`order:${order.userId}`, JSON.stringify(order));
    await this.email.send(
      `${order.userId}@example.com`,
      "Order Placed",
      "Your order has been placed"
    );
  }
}

// Low-level modules implement the abstractions
class RedisCacheStore implements CacheStore {
  constructor(private readonly connectionUrl: string) {}

  async get(key: string): Promise<string | null> {
    console.log(`[Redis] GET ${key}`);
    return null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    console.log(`[Redis] SET ${key} (TTL: ${ttl ?? "none"})`);
  }
}

class NodemailerEmailSender implements EmailSender {
  async send(to: string, subject: string, body: string): Promise<void> {
    console.log(`[Nodemailer] Sending to ${to}: ${subject}`);
  }
}

// For testing: simple fakes with no external dependencies
class FakeCacheStore implements CacheStore {
  private store = new Map<string, string>();

  async get(key: string) { return this.store.get(key) ?? null; }
  async set(key: string, value: string) { this.store.set(key, value); }
}

class FakeEmailSender implements EmailSender {
  sent: { to: string; subject: string; body: string }[] = [];

  async send(to: string, subject: string, body: string) {
    this.sent.push({ to, subject, body });
  }
}

// Production wiring
const orderService = new OrderService(
  new RedisCacheStore("redis://localhost:6379"),
  new NodemailerEmailSender()
);

// Test wiring — no Redis, no SMTP, no network
const fakeEmail = new FakeEmailSender();
const testService = new OrderService(new FakeCacheStore(), fakeEmail);

await testService.placeOrder({ userId: "user-1", items: ["item-a"] });
console.log(fakeEmail.sent); // [{ to: "user-1@example.com", ... }]
```

> **NestJS connection:** DIP is the core of NestJS. Every `@Injectable()` service declares its dependencies as constructor parameters (abstractions). The IoC container resolves and injects the concrete implementations. You configure this in modules with `providers` — swap implementations by changing the module configuration, not the service code. Custom providers (`useClass`, `useFactory`, `useValue`) make this explicit.

---

## How SOLID Principles Connect

| Principle | Key Question | NestJS Feature |
|-----------|-------------|----------------|
| **SRP** | Does this class have one reason to change? | Controllers, Services, Repositories |
| **OCP** | Can I add features without editing existing code? | Guards, Interceptors, Pipes |
| **LSP** | Can I substitute a subclass safely? | Custom providers, testing fakes |
| **ISP** | Does this interface force unused methods? | `CanActivate`, `PipeTransform`, etc. |
| **DIP** | Do high-level modules depend on abstractions? | `@Inject()`, IoC container, modules |

---

## Mini-Exercise

Refactor the following code to follow all five SOLID principles:

```typescript
// BAD: Violates all SOLID principles
class NotificationManager {
  async notify(
    userId: string,
    type: "email" | "sms" | "push",
    message: string
  ): Promise<void> {
    // Fetches user from database (SRP violation — data access + notification)
    const user = await this.fetchUser(userId);

    // Giant switch for each type (OCP violation — must modify to add types)
    if (type === "email") {
      console.log(`Sending email to ${user.email}: ${message}`);
    } else if (type === "sms") {
      console.log(`Sending SMS to ${user.phone}: ${message}`);
    } else if (type === "push") {
      console.log(`Sending push to ${user.deviceToken}: ${message}`);
    }

    // Logging (SRP violation — logging mixed with business logic)
    console.log(`[LOG] Notification sent: ${type} to ${userId}`);

    // Analytics (SRP violation — analytics mixed in)
    console.log(`[ANALYTICS] notification_sent ${type} ${userId}`);
  }

  private async fetchUser(userId: string) {
    return {
      id: userId,
      email: "user@test.com",
      phone: "+1234567890",
      deviceToken: "token-abc",
    };
  }
}
```

Your refactored solution should have:

1. A `UserRepository` (SRP — separate data access).
2. A `NotificationChannel` interface with small, focused methods (ISP).
3. Concrete channel classes: `EmailChannel`, `SmsChannel`, `PushChannel` (OCP — add new channels without modifying existing code).
4. A `NotificationService` that depends on abstractions, not concretions (DIP).
5. All channels should be safely substitutable for `NotificationChannel` (LSP).
6. Separate `AuditLogger` and `AnalyticsTracker` classes (SRP).

```typescript
// Your refactored implementation here

// Test it:
const notificationService = new NotificationService(
  new UserRepository(),
  [new EmailChannel(), new SmsChannel(), new PushChannel()],
  new AuditLogger(),
  new AnalyticsTracker()
);

await notificationService.notify("user-1", "email", "Welcome!");
await notificationService.notifyAll("user-1", "System maintenance tonight.");
```
