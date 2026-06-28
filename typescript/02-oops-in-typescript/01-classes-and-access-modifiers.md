# Classes and Access Modifiers

## What You'll Learn

- How TypeScript access modifiers (`public`, `private`, `protected`, `readonly`) enforce encapsulation at compile time
- Parameter properties: the shorthand constructor pattern that eliminates boilerplate
- Static members and methods for class-level shared state
- Getters and setters for controlled property access
- An introduction to the `abstract` keyword for base class contracts

---

## Access Modifiers

TypeScript provides four modifiers that control visibility and mutability of class members.

### public (default)

Every member is `public` by default. You rarely need to write it explicitly, but it can improve readability when other modifiers are present.

### private

A `private` member is only accessible within the class that declares it.

```typescript
class DatabaseConnection {
  private connectionString: string;
  private pool: any; // simplified for example

  constructor(connectionString: string) {
    this.connectionString = connectionString;
    this.pool = null;
  }

  async connect(): Promise<void> {
    // Only this class can touch connectionString and pool
    this.pool = await this.createPool(this.connectionString);
    console.log("Connected to database");
  }

  private async createPool(connStr: string): Promise<any> {
    // Internal implementation detail — no outside caller can invoke this
    return { active: true, connStr };
  }

  async query(sql: string): Promise<any[]> {
    if (!this.pool) throw new Error("Not connected");
    // execute against pool...
    return [];
  }
}

const db = new DatabaseConnection("postgres://localhost:5432/mydb");
// db.connectionString; // Error: Property 'connectionString' is private
// db.createPool();     // Error: Property 'createPool' is private
```

> **Coming from JS:** JavaScript now has native `#private` fields (e.g., `#connectionString`). TypeScript's `private` keyword is compile-time only — it disappears in the emitted JS. If you need runtime privacy, use `#` syntax instead. TypeScript supports both.

### protected

A `protected` member is accessible within the declaring class **and** its subclasses, but not from outside.

```typescript
class BaseRepository<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  protected buildSelectQuery(conditions: Record<string, unknown>): string {
    const where = Object.keys(conditions)
      .map((key) => `${key} = $${key}`)
      .join(" AND ");
    return `SELECT * FROM ${this.tableName} WHERE ${where}`;
  }
}

class UserRepository extends BaseRepository<{ id: string; name: string }> {
  constructor() {
    super("users");
  }

  async findByEmail(email: string) {
    // Can access protected members from the parent
    const sql = this.buildSelectQuery({ email });
    console.log(sql); // SELECT * FROM users WHERE email = $email
    // execute query...
  }
}

const repo = new UserRepository();
// repo.tableName;          // Error: Property 'tableName' is protected
// repo.buildSelectQuery(); // Error: Property 'buildSelectQuery' is protected
```

### readonly

A `readonly` member can only be assigned in the constructor or at declaration. It cannot be reassigned afterwards.

```typescript
class ServerConfig {
  readonly port: number;
  readonly host: string;
  readonly environment: string;

  constructor(port: number, host: string, environment: string) {
    this.port = port;
    this.host = host;
    this.environment = environment;
  }
}

const config = new ServerConfig(3000, "0.0.0.0", "production");
// config.port = 4000; // Error: Cannot assign to 'port' because it is a read-only property
```

---

## Parameter Properties (Shorthand Constructor)

Writing `this.x = x` for every constructor argument is tedious. TypeScript offers **parameter properties**: prefix a constructor parameter with an access modifier and TypeScript declares + assigns the property automatically.

```typescript
// BEFORE: verbose
class UserService {
  private userRepo: UserRepository;
  private logger: Logger;
  private cacheEnabled: boolean;

  constructor(userRepo: UserRepository, logger: Logger, cacheEnabled: boolean) {
    this.userRepo = userRepo;
    this.logger = logger;
    this.cacheEnabled = cacheEnabled;
  }
}

// AFTER: parameter properties — identical behavior, far less boilerplate
class UserService {
  constructor(
    private userRepo: UserRepository,
    private logger: Logger,
    private cacheEnabled: boolean
  ) {}

  async getUser(id: string) {
    this.logger.info(`Fetching user ${id}`);
    return this.userRepo.findById(id);
  }
}
```

> **Coming from JS:** This syntax does not exist in JavaScript. It is pure TypeScript sugar. When you read NestJS code and see constructors full of `private readonly someService: SomeService`, this is what is happening — the parameter is simultaneously declared, typed, and assigned.

You can combine modifiers:

```typescript
class AppConfig {
  constructor(
    public readonly port: number,
    public readonly host: string,
    private readonly dbUrl: string,
    protected readonly jwtSecret: string
  ) {}
}
```

---

## Static Members and Methods

Static members belong to the class itself, not to instances. They are useful for utility methods, shared configuration, or singleton-like access.

```typescript
class ConfigManager {
  private static instance: ConfigManager | null = null;
  private config: Map<string, string> = new Map();

  // Private constructor prevents direct instantiation
  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  static readonly DEFAULT_PORT = 3000;
  static readonly DEFAULT_HOST = "localhost";

  set(key: string, value: string): void {
    this.config.set(key, value);
  }

  get(key: string): string | undefined {
    return this.config.get(key);
  }

  getOrDefault(key: string, fallback: string): string {
    return this.config.get(key) ?? fallback;
  }
}

// Usage
const cfg = ConfigManager.getInstance();
cfg.set("PORT", "8080");

console.log(ConfigManager.DEFAULT_PORT); // 3000
console.log(cfg.get("PORT"));           // "8080"
```

> **Coming from JS:** `static` works identically in JavaScript classes. TypeScript adds `static readonly` for compile-time immutability and allows static members to have access modifiers.

---

## Getters and Setters

Getters and setters let you intercept property access with logic while keeping the calling syntax clean.

```typescript
class TokenBucket {
  private _tokens: number;
  private readonly maxTokens: number;
  private lastRefill: number;

  constructor(maxTokens: number) {
    this.maxTokens = maxTokens;
    this._tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  get tokens(): number {
    this.refill();
    return this._tokens;
  }

  set tokens(value: number) {
    if (value < 0) throw new Error("Tokens cannot be negative");
    if (value > this.maxTokens) throw new Error(`Tokens cannot exceed ${this.maxTokens}`);
    this._tokens = value;
  }

  get isEmpty(): boolean {
    return this.tokens === 0;
  }

  consume(): boolean {
    if (this.tokens > 0) {
      this._tokens--;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = Math.floor(elapsed); // 1 token per second
    if (newTokens > 0) {
      this._tokens = Math.min(this.maxTokens, this._tokens + newTokens);
      this.lastRefill = now;
    }
  }
}

const limiter = new TokenBucket(10);
console.log(limiter.tokens);   // reads via getter — triggers refill logic
console.log(limiter.isEmpty);  // false
```

> **Coming from JS:** Getters and setters (`get`/`set`) work exactly the same in JS classes. The TypeScript bonus: the getter's return type is inferred and enforced, and you can give the getter and setter different access modifiers (e.g., a `public get` with a `protected set`).

---

## The `abstract` Keyword (Introduction)

An `abstract` class cannot be instantiated directly. It serves as a base class that defines a contract — subclasses must implement the abstract members.

```typescript
abstract class BaseNotificationService {
  abstract readonly channel: string;

  abstract send(to: string, message: string): Promise<boolean>;

  // Concrete method — shared by all subclasses
  async sendBatch(recipients: string[], message: string): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    for (const to of recipients) {
      const ok = await this.send(to, message);
      results.set(to, ok);
    }
    return results;
  }
}

class EmailNotificationService extends BaseNotificationService {
  readonly channel = "email";

  async send(to: string, message: string): Promise<boolean> {
    console.log(`Sending email to ${to}: ${message}`);
    // actual SMTP logic...
    return true;
  }
}

// const base = new BaseNotificationService(); // Error: Cannot create an instance of an abstract class
const emailService = new EmailNotificationService();
await emailService.sendBatch(["a@b.com", "c@d.com"], "Hello!");
```

We will cover abstract classes in much more depth in the next file when comparing them to interfaces.

---

## Mini-Exercise

Build a `CacheManager` class with the following requirements:

1. A `private` `Map<string, { value: unknown; expiresAt: number }>` to store cached entries.
2. A `readonly` `defaultTtl` (time-to-live in milliseconds) set via the constructor using **parameter properties**.
3. A `static` method `createWithDefaults()` that returns a `CacheManager` with a 60-second TTL.
4. A `set(key, value, ttl?)` method that stores an entry (use `defaultTtl` if `ttl` is not provided).
5. A `get(key)` method that returns the value if it exists and has not expired, or `undefined` otherwise.
6. A getter `size` that returns the number of non-expired entries.

```typescript
// Your implementation here

// Test it:
const cache = CacheManager.createWithDefaults();
cache.set("user:1", { name: "Alice" });
cache.set("temp", "gone soon", 100); // 100ms TTL

console.log(cache.get("user:1")); // { name: "Alice" }
console.log(cache.size);          // 2

setTimeout(() => {
  console.log(cache.get("temp")); // undefined (expired)
  console.log(cache.size);        // 1
}, 200);
```
