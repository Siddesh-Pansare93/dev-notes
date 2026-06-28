# Design Patterns in TypeScript

## What You'll Learn

- Six essential design patterns implemented with proper TypeScript typing
- Singleton: managing shared resources with a private constructor
- Factory: creating objects without specifying exact classes
- Strategy: swapping algorithms at runtime
- Observer: building event-driven systems
- Repository: abstracting data access
- Decorator: wrapping and extending behavior

Each pattern is shown with a real-world backend use case.

---

## 1. Singleton Pattern

**Purpose:** Ensure a class has exactly one instance throughout the application lifetime. Common for database connections, configuration managers, and loggers.

```typescript
class DatabasePool {
  private static instance: DatabasePool | null = null;
  private connections: number = 0;
  private readonly maxConnections: number;

  // Private constructor — no one can call `new DatabasePool()` from outside
  private constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly database: string,
    maxConnections: number
  ) {
    this.maxConnections = maxConnections;
  }

  static create(config: {
    host: string;
    port: number;
    database: string;
    maxConnections?: number;
  }): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool(
        config.host,
        config.port,
        config.database,
        config.maxConnections ?? 10
      );
    }
    return DatabasePool.instance;
  }

  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      throw new Error("DatabasePool not initialized. Call create() first.");
    }
    return DatabasePool.instance;
  }

  async getConnection(): Promise<{ id: number; release: () => void }> {
    if (this.connections >= this.maxConnections) {
      throw new Error("Connection pool exhausted");
    }
    this.connections++;
    const connId = this.connections;

    return {
      id: connId,
      release: () => {
        this.connections--;
      },
    };
  }

  get activeConnections(): number {
    return this.connections;
  }

  // For testing: reset the singleton
  static resetInstance(): void {
    DatabasePool.instance = null;
  }
}

// Usage
DatabasePool.create({ host: "localhost", port: 5432, database: "myapp" });

// Anywhere else in your codebase:
const pool = DatabasePool.getInstance();
const conn = await pool.getConnection();
console.log(`Connection #${conn.id}, active: ${pool.activeConnections}`);
conn.release();
```

> **Coming from JS:** Singletons in JS are often just module-level variables (since ES modules are cached). The TypeScript private-constructor pattern adds an extra guarantee: the type system prevents accidental second instantiation, even within the same module.

---

## 2. Factory Pattern

**Purpose:** Create objects without exposing instantiation logic. The caller specifies *what* it wants, not *how* to build it.

```typescript
// --- Product interfaces ---
interface EmailTransport {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

class SmtpTransport implements EmailTransport {
  constructor(
    private host: string,
    private port: number,
    private secure: boolean
  ) {}

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`[SMTP ${this.host}:${this.port}] To: ${to} | Subject: ${subject}`);
  }
}

class SesTransport implements EmailTransport {
  constructor(
    private region: string,
    private accessKeyId: string
  ) {}

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`[SES ${this.region}] To: ${to} | Subject: ${subject}`);
  }
}

class SendGridTransport implements EmailTransport {
  constructor(private apiKey: string) {}

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`[SendGrid] To: ${to} | Subject: ${subject}`);
  }
}

// --- Factory ---
interface EmailConfig {
  provider: "smtp" | "ses" | "sendgrid";
  smtp?: { host: string; port: number; secure: boolean };
  ses?: { region: string; accessKeyId: string };
  sendgrid?: { apiKey: string };
}

class EmailTransportFactory {
  static create(config: EmailConfig): EmailTransport {
    switch (config.provider) {
      case "smtp": {
        const { host, port, secure } = config.smtp!;
        return new SmtpTransport(host, port, secure);
      }
      case "ses": {
        const { region, accessKeyId } = config.ses!;
        return new SesTransport(region, accessKeyId);
      }
      case "sendgrid": {
        return new SendGridTransport(config.sendgrid!.apiKey);
      }
      default:
        throw new Error(`Unknown email provider: ${config.provider}`);
    }
  }
}

// Usage — caller does not know or care which class is instantiated
const transport = EmailTransportFactory.create({
  provider: "ses",
  ses: { region: "us-east-1", accessKeyId: "AKIA..." },
});

await transport.sendEmail("user@example.com", "Welcome", "Hello!");
```

---

## 3. Strategy Pattern

**Purpose:** Define a family of interchangeable algorithms. The client picks a strategy at runtime without changing its own code.

```typescript
// Strategy interface
interface CompressionStrategy {
  readonly name: string;
  compress(data: Buffer): Promise<Buffer>;
  decompress(data: Buffer): Promise<Buffer>;
}

// Concrete strategies
class GzipStrategy implements CompressionStrategy {
  readonly name = "gzip";

  async compress(data: Buffer): Promise<Buffer> {
    console.log(`[gzip] Compressing ${data.length} bytes`);
    // In real code: zlib.gzipSync(data)
    return data;
  }

  async decompress(data: Buffer): Promise<Buffer> {
    console.log(`[gzip] Decompressing ${data.length} bytes`);
    return data;
  }
}

class BrotliStrategy implements CompressionStrategy {
  readonly name = "brotli";

  async compress(data: Buffer): Promise<Buffer> {
    console.log(`[brotli] Compressing ${data.length} bytes`);
    return data;
  }

  async decompress(data: Buffer): Promise<Buffer> {
    console.log(`[brotli] Decompressing ${data.length} bytes`);
    return data;
  }
}

class NoCompressionStrategy implements CompressionStrategy {
  readonly name = "none";

  async compress(data: Buffer): Promise<Buffer> {
    return data;
  }

  async decompress(data: Buffer): Promise<Buffer> {
    return data;
  }
}

// Context class that uses a strategy
class FileStorageService {
  private strategy: CompressionStrategy;

  constructor(strategy?: CompressionStrategy) {
    this.strategy = strategy ?? new NoCompressionStrategy();
  }

  setCompression(strategy: CompressionStrategy): void {
    console.log(`Switching compression to: ${strategy.name}`);
    this.strategy = strategy;
  }

  async store(filename: string, data: Buffer): Promise<void> {
    const compressed = await this.strategy.compress(data);
    console.log(
      `Storing ${filename}: ${data.length}B -> ${compressed.length}B (${this.strategy.name})`
    );
    // write to disk / S3 / etc.
  }

  async retrieve(filename: string): Promise<Buffer> {
    // read raw bytes from storage...
    const raw = Buffer.from("stored-data");
    return this.strategy.decompress(raw);
  }
}

// Usage — swap algorithms without touching FileStorageService
const storage = new FileStorageService(new GzipStrategy());
await storage.store("report.csv", Buffer.from("id,name\n1,Alice"));

storage.setCompression(new BrotliStrategy());
await storage.store("archive.json", Buffer.from('{"large": true}'));
```

> **Coming from JS:** In JavaScript, you would pass functions or plain objects. The Strategy pattern in TypeScript adds a named interface so the compiler enforces that every strategy implements `compress` and `decompress` with the correct signatures.

---

## 4. Observer Pattern

**Purpose:** Build an event system where objects subscribe to events and react when those events occur. This is the backbone of event-driven backend architectures.

```typescript
// Generic, type-safe event emitter
type Listener<T> = (data: T) => void | Promise<void>;

class TypedEventEmitter<EventMap extends Record<string, unknown>> {
  private listeners = new Map<keyof EventMap, Set<Listener<any>>>();

  on<K extends keyof EventMap>(event: K, listener: Listener<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Return an unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  async emit<K extends keyof EventMap>(event: K, data: EventMap[K]): Promise<void> {
    const handlers = this.listeners.get(event);
    if (!handlers) return;

    const promises = [...handlers].map((handler) => handler(data));
    await Promise.all(promises);
  }

  removeAllListeners(event?: keyof EventMap): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Define the event map for an order system
interface OrderEvents {
  "order:created": { orderId: string; userId: string; total: number };
  "order:paid": { orderId: string; paymentId: string };
  "order:shipped": { orderId: string; trackingNumber: string };
  "order:cancelled": { orderId: string; reason: string };
}

// Create the emitter
const orderBus = new TypedEventEmitter<OrderEvents>();

// Subscribers — each handles a specific concern
orderBus.on("order:created", async (data) => {
  console.log(`[Inventory] Reserving stock for order ${data.orderId}`);
});

orderBus.on("order:created", async (data) => {
  console.log(`[Email] Sending confirmation to user ${data.userId}`);
});

orderBus.on("order:paid", async (data) => {
  console.log(`[Fulfillment] Preparing order ${data.orderId}, payment ${data.paymentId}`);
});

const unsubscribe = orderBus.on("order:cancelled", async (data) => {
  console.log(`[Refund] Processing refund for ${data.orderId}: ${data.reason}`);
});

// Emit events
await orderBus.emit("order:created", {
  orderId: "ORD-001",
  userId: "user-42",
  total: 99.99,
});

await orderBus.emit("order:paid", {
  orderId: "ORD-001",
  paymentId: "PAY-555",
});

// Unsubscribe the cancellation handler
unsubscribe();
```

> **Coming from JS:** Node.js has `EventEmitter` built in, but it is untyped — `emitter.emit("typo", data)` silently does nothing. This typed version catches wrong event names and wrong payload shapes at compile time.

---

## 5. Repository Pattern

**Purpose:** Abstract data access behind a clean interface. Business logic never talks to the database directly — it talks to a repository.

```typescript
// Entity
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

// Generic repository interface
interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, "id">): Promise<T>;
  update(id: ID, updates: Partial<T>): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
}

// In-memory implementation (for development/testing)
class InMemoryProductRepository implements Repository<Product> {
  private products = new Map<string, Product>();
  private counter = 0;

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) ?? null;
  }

  async findAll(filter?: Partial<Product>): Promise<Product[]> {
    let results = [...this.products.values()];

    if (filter) {
      results = results.filter((product) =>
        Object.entries(filter).every(
          ([key, value]) => product[key as keyof Product] === value
        )
      );
    }

    return results;
  }

  async create(entity: Omit<Product, "id">): Promise<Product> {
    const id = `prod-${++this.counter}`;
    const product: Product = { id, ...entity };
    this.products.set(id, product);
    return product;
  }

  async update(id: string, updates: Partial<Product>): Promise<Product | null> {
    const existing = this.products.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.products.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.products.delete(id);
  }
}

// PostgreSQL implementation (production) — same interface, different storage
class PostgresProductRepository implements Repository<Product> {
  constructor(private readonly pool: any) {} // pg.Pool in real code

  async findById(id: string): Promise<Product | null> {
    const { rows } = await this.pool.query(
      "SELECT * FROM products WHERE id = $1",
      [id]
    );
    return rows[0] ?? null;
  }

  async findAll(filter?: Partial<Product>): Promise<Product[]> {
    if (!filter || Object.keys(filter).length === 0) {
      const { rows } = await this.pool.query("SELECT * FROM products");
      return rows;
    }
    const conditions = Object.keys(filter)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(" AND ");
    const { rows } = await this.pool.query(
      `SELECT * FROM products WHERE ${conditions}`,
      Object.values(filter)
    );
    return rows;
  }

  async create(entity: Omit<Product, "id">): Promise<Product> {
    const { rows } = await this.pool.query(
      `INSERT INTO products (name, price, category, in_stock)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [entity.name, entity.price, entity.category, entity.inStock]
    );
    return rows[0];
  }

  async update(id: string, updates: Partial<Product>): Promise<Product | null> {
    const setClauses = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(", ");
    const { rows } = await this.pool.query(
      `UPDATE products SET ${setClauses} WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updates)]
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      "DELETE FROM products WHERE id = $1",
      [id]
    );
    return rowCount > 0;
  }
}

// Service layer — works with either implementation
class ProductService {
  constructor(private readonly repo: Repository<Product>) {}

  async getAffordableProducts(maxPrice: number): Promise<Product[]> {
    const all = await this.repo.findAll({ inStock: true });
    return all.filter((p) => p.price <= maxPrice);
  }
}

// In tests: new ProductService(new InMemoryProductRepository())
// In production: new ProductService(new PostgresProductRepository(pool))
```

---

## 6. Decorator Pattern

**Purpose:** Wrap an object to add behavior without modifying the original class. Each decorator implements the same interface and delegates to the wrapped instance.

```typescript
interface HttpClient {
  request(url: string, options?: RequestInit): Promise<Response>;
}

// Base implementation
class FetchHttpClient implements HttpClient {
  async request(url: string, options?: RequestInit): Promise<Response> {
    return fetch(url, options);
  }
}

// Decorator: adds logging
class LoggingHttpClient implements HttpClient {
  constructor(
    private readonly inner: HttpClient,
    private readonly logger: { info: (msg: string) => void }
  ) {}

  async request(url: string, options?: RequestInit): Promise<Response> {
    const start = Date.now();
    this.logger.info(`HTTP ${options?.method ?? "GET"} ${url}`);

    const response = await this.inner.request(url, options);

    this.logger.info(
      `HTTP ${options?.method ?? "GET"} ${url} -> ${response.status} (${Date.now() - start}ms)`
    );
    return response;
  }
}

// Decorator: adds retry logic
class RetryHttpClient implements HttpClient {
  constructor(
    private readonly inner: HttpClient,
    private readonly maxRetries: number = 3,
    private readonly baseDelay: number = 1000
  ) {}

  async request(url: string, options?: RequestInit): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.inner.request(url, options);
        if (response.status >= 500 && attempt < this.maxRetries) {
          throw new Error(`Server error: ${response.status}`);
        }
        return response;
      } catch (err) {
        lastError = err as Error;
        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

// Decorator: adds auth header
class AuthHttpClient implements HttpClient {
  constructor(
    private readonly inner: HttpClient,
    private readonly getToken: () => Promise<string>
  ) {}

  async request(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getToken();
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return this.inner.request(url, { ...options, headers });
  }
}

// Stack decorators — order matters!
const logger = { info: (msg: string) => console.log(`[HTTP] ${msg}`) };

const client: HttpClient = new LoggingHttpClient(
  new RetryHttpClient(
    new AuthHttpClient(
      new FetchHttpClient(),
      async () => "my-jwt-token"
    ),
    3
  ),
  logger
);

// Single call goes through: Logging -> Retry -> Auth -> Fetch
await client.request("https://api.example.com/data");
```

> **Coming from JS:** The decorator *pattern* (wrapping objects) works in any language. Do not confuse it with TypeScript/ES *decorator syntax* (`@decorator`), which is a related but different feature for annotating classes and methods. The wrapping pattern shown here is more explicit and does not require experimental flags.

---

## Mini-Exercise

Combine three patterns to build a mini backend service:

1. **Repository pattern:** Create a `TaskRepository` interface and an `InMemoryTaskRepository` for a `Task` entity (`{ id: string; title: string; status: "pending" | "done" }`).
2. **Observer pattern:** Create a `TaskEventBus` with events: `"task:created"`, `"task:completed"`.
3. **Singleton pattern:** Make `TaskEventBus` a singleton.
4. **Wire them together:** Create a `TaskService` that uses the repository to store tasks and emits events through the bus when tasks are created or completed.

```typescript
// Your implementation here

// Test it:
const bus = TaskEventBus.getInstance();
bus.on("task:created", (task) => console.log(`New task: ${task.title}`));
bus.on("task:completed", (task) => console.log(`Done: ${task.title}`));

const service = new TaskService(new InMemoryTaskRepository());

const task = await service.createTask("Write unit tests");
await service.completeTask(task.id);
```
