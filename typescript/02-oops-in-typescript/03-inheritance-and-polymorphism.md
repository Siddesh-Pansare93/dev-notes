# Inheritance and Polymorphism

## What You'll Learn

- Method overriding with the `override` keyword and why it matters
- Using `super` to call parent class constructors and methods
- The mixins pattern in TypeScript for composing behaviors
- Why composition is often preferred over inheritance, with concrete examples
- Polymorphism in action: passing subclasses where a base type is expected

---

## Method Overriding with `override`

TypeScript 4.3 introduced the `override` keyword. It explicitly marks a method as overriding a parent method — and the compiler will error if the parent method does not exist or changes signature.

```typescript
abstract class BaseNotificationService {
  abstract send(to: string, message: string): Promise<boolean>;

  formatMessage(message: string): string {
    return `[${new Date().toISOString()}] ${message}`;
  }

  async sendBatch(recipients: string[], message: string): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    for (const to of recipients) {
      const success = await this.send(to, message);
      results.set(to, success);
    }
    return results;
  }
}

class EmailNotificationService extends BaseNotificationService {
  constructor(private smtpHost: string) {
    super();
  }

  // override ensures this method actually exists on the parent
  override async send(to: string, message: string): Promise<boolean> {
    const formatted = this.formatMessage(message);
    console.log(`[EMAIL -> ${to}] via ${this.smtpHost}: ${formatted}`);
    return true;
  }

  // override on a concrete parent method — customize formatting for email
  override formatMessage(message: string): string {
    return `<html><body><p>${super.formatMessage(message)}</p></body></html>`;
  }
}

class SmsNotificationService extends BaseNotificationService {
  constructor(private twilioSid: string) {
    super();
  }

  override async send(to: string, message: string): Promise<boolean> {
    const formatted = this.formatMessage(message);
    // SMS has a 160-char limit
    const truncated = formatted.slice(0, 160);
    console.log(`[SMS -> ${to}] ${truncated}`);
    return true;
  }
}

class PushNotificationService extends BaseNotificationService {
  constructor(private firebaseProjectId: string) {
    super();
  }

  override async send(to: string, message: string): Promise<boolean> {
    console.log(`[PUSH -> ${to}] project=${this.firebaseProjectId}: ${message}`);
    return true;
  }

  // Override sendBatch to use Firebase's batch API instead of looping
  override async sendBatch(
    recipients: string[],
    message: string
  ): Promise<Map<string, boolean>> {
    console.log(`[PUSH BATCH] Sending to ${recipients.length} devices at once`);
    const results = new Map<string, boolean>();
    recipients.forEach((r) => results.set(r, true));
    return results;
  }
}
```

Enable `noImplicitOverride` in your `tsconfig.json` to require the `override` keyword on all overriding methods. This catches typos and accidental overrides.

```json
{
  "compilerOptions": {
    "noImplicitOverride": true
  }
}
```

> **Coming from JS:** JavaScript has no `override` keyword. In JS, if you misspell a method name while trying to override it, you silently create a new method and the parent's version still runs. TypeScript's `override` keyword eliminates this entire class of bugs.

---

## The `super` Keyword

`super` refers to the parent class. Use it to call the parent constructor and to invoke parent methods from an overriding method.

```typescript
class BaseMiddleware {
  protected order: number;

  constructor(protected name: string) {
    this.order = 0;
  }

  async handle(req: any, res: any, next: () => Promise<void>): Promise<void> {
    console.log(`[${this.name}] Processing request`);
    await next();
  }
}

class AuthMiddleware extends BaseMiddleware {
  constructor(private jwtSecret: string) {
    // super() must be called before accessing `this`
    super("AuthMiddleware");
    this.order = 1; // now `this` is safe to use
  }

  override async handle(req: any, res: any, next: () => Promise<void>): Promise<void> {
    const token = req.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      res.status = 401;
      return;
    }

    req.user = { id: "user-123", role: "admin" }; // simplified verification

    // Call parent's handle to get the logging behavior, then continue
    await super.handle(req, res, next);
  }
}

class RateLimitMiddleware extends BaseMiddleware {
  private requestCounts = new Map<string, number>();

  constructor(private maxRequests: number, private windowMs: number) {
    super("RateLimitMiddleware");
    this.order = 0;
  }

  override async handle(req: any, res: any, next: () => Promise<void>): Promise<void> {
    const ip = req.ip ?? "unknown";
    const count = (this.requestCounts.get(ip) ?? 0) + 1;
    this.requestCounts.set(ip, count);

    if (count > this.maxRequests) {
      res.status = 429;
      return;
    }

    await super.handle(req, res, next);
  }
}
```

---

## The Mixins Pattern

TypeScript only supports single inheritance (one `extends`). Mixins let you compose multiple behaviors into a class without deep inheritance hierarchies.

```typescript
// A "Constructor" type that mixins build on
type Constructor<T = {}> = new (...args: any[]) => T;

// Mixin: adds timestamp tracking
function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    createdAt = new Date();
    updatedAt = new Date();

    touch() {
      this.updatedAt = new Date();
    }
  };
}

// Mixin: adds soft-delete capability
function SoftDeletable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    deletedAt: Date | null = null;
    isDeleted = false;

    softDelete() {
      this.deletedAt = new Date();
      this.isDeleted = true;
    }

    restore() {
      this.deletedAt = null;
      this.isDeleted = false;
    }
  };
}

// Mixin: adds validation
function Validatable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    errors: string[] = [];

    validate(): boolean {
      this.errors = [];
      // subclass fills in actual rules
      return this.errors.length === 0;
    }

    addError(message: string) {
      this.errors.push(message);
    }
  };
}

// Compose mixins onto a base class
class BaseEntity {
  constructor(public id: string) {}
}

// Apply all three mixins
class UserEntity extends Timestamped(SoftDeletable(Validatable(BaseEntity))) {
  constructor(
    id: string,
    public name: string,
    public email: string
  ) {
    super(id);
  }

  override validate(): boolean {
    super.validate();
    if (!this.email.includes("@")) this.addError("Invalid email");
    if (this.name.length < 2) this.addError("Name too short");
    return this.errors.length === 0;
  }
}

const user = new UserEntity("1", "Alice", "alice@example.com");
user.touch();        // from Timestamped
user.softDelete();   // from SoftDeletable
user.validate();     // from Validatable (overridden)
console.log(user.createdAt, user.isDeleted, user.errors);
```

> **Coming from JS:** Mixins work in plain JavaScript too (they are just functions returning classes). TypeScript adds type safety on top — the compiler knows exactly which methods and properties each mixin adds, giving you full autocomplete and error checking.

---

## Composition Over Inheritance

Deep inheritance hierarchies become brittle. Composition — giving a class instances of other classes to delegate work to — is more flexible.

```typescript
// BAD: Deep inheritance hierarchy
// BaseService -> AuthenticatedService -> LoggedService -> CachedService -> UserService
// What if you want logging without auth? Caching without logging?

// GOOD: Composition — each concern is a separate, injectable collaborator
interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
}

interface LoggerService {
  info(message: string): void;
  error(message: string, err?: Error): void;
}

interface AuthService {
  verifyToken(token: string): Promise<{ userId: string } | null>;
}

class UserService {
  constructor(
    private readonly cache: CacheService,
    private readonly logger: LoggerService,
    private readonly auth: AuthService,
    private readonly userRepo: UserRepository
  ) {}

  async getUserById(id: string, token: string): Promise<User | null> {
    // Auth: delegated to AuthService
    const session = await this.auth.verifyToken(token);
    if (!session) throw new Error("Unauthorized");

    // Cache: delegated to CacheService
    const cached = await this.cache.get<User>(`user:${id}`);
    if (cached) {
      this.logger.info(`Cache hit for user:${id}`);
      return cached;
    }

    // Data access: delegated to repository
    const user = await this.userRepo.findById(id);
    if (user) {
      await this.cache.set(`user:${id}`, user, 300);
    }

    this.logger.info(`Fetched user:${id} from database`);
    return user;
  }
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserRepository {
  findById(id: string): Promise<User | null>;
}
```

The key advantages:

- **Testable:** Mock any dependency independently.
- **Flexible:** Swap Redis cache for Memcached cache without touching `UserService`.
- **Clear:** Each class has one job.

---

## Polymorphism in Action

Polymorphism means treating different concrete types through a common interface. The caller does not need to know the specific subclass.

```typescript
// The base contract
abstract class NotificationChannel {
  abstract readonly type: string;
  abstract send(to: string, message: string): Promise<boolean>;
}

class EmailChannel extends NotificationChannel {
  readonly type = "email";
  override async send(to: string, message: string): Promise<boolean> {
    console.log(`Email to ${to}: ${message}`);
    return true;
  }
}

class SmsChannel extends NotificationChannel {
  readonly type = "sms";
  override async send(to: string, message: string): Promise<boolean> {
    console.log(`SMS to ${to}: ${message}`);
    return true;
  }
}

class SlackChannel extends NotificationChannel {
  readonly type = "slack";
  override async send(to: string, message: string): Promise<boolean> {
    console.log(`Slack to ${to}: ${message}`);
    return true;
  }
}

// The dispatcher works with the base type — it does not care about concrete classes
class NotificationDispatcher {
  private channels: NotificationChannel[] = [];

  register(channel: NotificationChannel): void {
    this.channels.push(channel);
  }

  async notifyAll(to: string, message: string): Promise<void> {
    const results = await Promise.allSettled(
      this.channels.map((ch) => ch.send(to, message))
    );

    results.forEach((result, i) => {
      const channel = this.channels[i];
      if (result.status === "rejected") {
        console.error(`${channel.type} failed: ${result.reason}`);
      }
    });
  }

  async notifyByType(type: string, to: string, message: string): Promise<boolean> {
    const channel = this.channels.find((ch) => ch.type === type);
    if (!channel) throw new Error(`No channel registered for type: ${type}`);
    return channel.send(to, message);
  }
}

// Usage — polymorphism lets us treat all channels uniformly
const dispatcher = new NotificationDispatcher();
dispatcher.register(new EmailChannel());
dispatcher.register(new SmsChannel());
dispatcher.register(new SlackChannel());

await dispatcher.notifyAll("user-42", "Your order has shipped!");
await dispatcher.notifyByType("slack", "#alerts", "Server CPU > 90%");
```

> **Coming from JS:** Polymorphism works in JS through duck typing — if it has a `send` method, it works. TypeScript makes this explicit and safe: `NotificationChannel[]` guarantees every element has `type` and `send`. You get autocomplete, refactoring support, and compile-time errors if a new channel forgets to implement `send`.

---

## Middleware Chain: A Practical Polymorphism Example

```typescript
interface MiddlewareContext {
  request: { path: string; headers: Record<string, string>; body?: unknown };
  response: { status: number; body?: unknown };
  state: Record<string, unknown>;
}

type NextFunction = () => Promise<void>;

interface Middleware {
  handle(ctx: MiddlewareContext, next: NextFunction): Promise<void>;
}

class LoggingMiddleware implements Middleware {
  async handle(ctx: MiddlewareContext, next: NextFunction): Promise<void> {
    const start = Date.now();
    console.log(`--> ${ctx.request.path}`);
    await next();
    console.log(`<-- ${ctx.request.path} ${ctx.response.status} (${Date.now() - start}ms)`);
  }
}

class CorsMiddleware implements Middleware {
  constructor(private allowedOrigins: string[]) {}

  async handle(ctx: MiddlewareContext, next: NextFunction): Promise<void> {
    const origin = ctx.request.headers["origin"];
    if (origin && this.allowedOrigins.includes(origin)) {
      ctx.state["cors-origin"] = origin;
    }
    await next();
  }
}

class AuthMiddleware implements Middleware {
  async handle(ctx: MiddlewareContext, next: NextFunction): Promise<void> {
    const token = ctx.request.headers["authorization"];
    if (!token) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return; // short-circuit: do not call next()
    }
    ctx.state["userId"] = "user-123";
    await next();
  }
}

// Pipeline runner — works with any Middleware implementation
class MiddlewarePipeline {
  private middlewares: Middleware[] = [];

  use(mw: Middleware): this {
    this.middlewares.push(mw);
    return this;
  }

  async execute(ctx: MiddlewareContext): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index < this.middlewares.length) {
        const mw = this.middlewares[index++];
        await mw.handle(ctx, next);
      }
    };

    await next();
  }
}

// Usage
const pipeline = new MiddlewarePipeline()
  .use(new LoggingMiddleware())
  .use(new CorsMiddleware(["https://myapp.com"]))
  .use(new AuthMiddleware());

const ctx: MiddlewareContext = {
  request: { path: "/api/users", headers: { authorization: "Bearer xyz" } },
  response: { status: 200 },
  state: {},
};

await pipeline.execute(ctx);
```

---

## Mini-Exercise

Build a notification system:

1. Create an abstract class `NotificationSender` with:
   - An abstract `readonly channel: string` property.
   - An abstract `send(to: string, subject: string, body: string): Promise<boolean>` method.
   - A concrete `sendWithFallback(to: string, subject: string, body: string, fallback: NotificationSender): Promise<boolean>` method that tries `this.send()` first and falls back to the other sender on failure.

2. Implement three concrete subclasses: `EmailSender`, `SmsSender`, and `WebhookSender`. Each should log what it does and return `true`. Make `SmsSender.send()` randomly fail 50% of the time.

3. Create a `NotificationRouter` that:
   - Accepts an array of `NotificationSender` in its constructor.
   - Has a `route(channel: string, to: string, subject: string, body: string)` method that finds the right sender by channel and calls `send`.
   - Has a `broadcast(to: string, subject: string, body: string)` method that sends via all channels.

```typescript
// Your implementation here

// Test it:
const router = new NotificationRouter([
  new EmailSender(),
  new SmsSender(),
  new WebhookSender("https://hooks.example.com/notify"),
]);

await router.route("email", "alice@test.com", "Hello", "Welcome aboard!");
await router.broadcast("bob@test.com", "Alert", "System update scheduled.");
```
