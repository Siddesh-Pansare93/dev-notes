# Generics Mastery

## What You'll Learn

- Generic functions: writing once, using with any type, losing nothing
- Generic constraints with `extends`: restricting what types are accepted
- Default type parameters: sensible defaults that reduce boilerplate
- Generic interfaces and classes: building reusable data structures
- Real-world patterns: repository, event emitter, API wrapper, builder

---

## Generic Functions

Generics let you write a function that works with *any* type while preserving the relationship between inputs and outputs.

### The problem generics solve

```typescript
// Without generics: you lose type information
function firstElement(arr: unknown[]): unknown {
  return arr[0];
}
const item = firstElement(["a", "b", "c"]); // unknown — useless

// With generics: the type flows through
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}
const str = first(["a", "b", "c"]);   // string
const num = first([1, 2, 3]);          // number
const user = first(users);             // User
```

### Multiple type parameters

```typescript
function mapEntries<K extends string, V, R>(
  record: Record<K, V>,
  transform: (value: V, key: K) => R
): Record<K, R> {
  const result = {} as Record<K, R>;
  for (const key in record) {
    result[key] = transform(record[key], key);
  }
  return result;
}

const prices = { apple: 1.2, banana: 0.5, cherry: 2.0 };
const formatted = mapEntries(prices, (price) => `$${price.toFixed(2)}`);
// Record<"apple" | "banana" | "cherry", string>
// { apple: "$1.20", banana: "$0.50", cherry: "$2.00" }
```

### Type inference in practice

TypeScript infers generic types from arguments. You almost never need to specify them manually:

```typescript
function merge<A extends object, B extends object>(a: A, b: B): A & B {
  return { ...a, ...b };
}

// All types inferred — no angle brackets needed
const config = merge(
  { host: "localhost", port: 3000 },
  { debug: true, logLevel: "info" as const }
);
// { host: string; port: number; debug: boolean; logLevel: "info" }
```

> **Coming from JS:** In JavaScript, utility functions like `merge` or `map` lose all type information — you pass in typed data and get back `any` or `object`. Generics are what let TypeScript "remember" the exact types you passed in and carry them through to the output.

---

## Constraints with `extends`

Unconstrained generics accept anything. Constraints narrow what is allowed and unlock property access.

### Basic property constraints

```typescript
// T must have an id property
function groupById<T extends { id: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.id, item); // .id is safe because of the constraint
  }
  return map;
}

// Works with any object that has an id: string
const userMap = groupById(users);     // Map<string, User>
const orderMap = groupById(orders);   // Map<string, Order>
// groupById([1, 2, 3]);              // Error: number doesn't have .id
```

### `keyof` constraint — type-safe property access

```typescript
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

const emails = pluck(users, "email");  // string[]
const roles = pluck(users, "role");    // ("admin" | "member" | "viewer")[]
// pluck(users, "nonexistent");        // Error: not a key of User
```

### Multiple constraints

```typescript
interface Serializable {
  serialize(): string;
}

interface Identifiable {
  id: string;
}

// T must satisfy both interfaces
function persistEntity<T extends Serializable & Identifiable>(entity: T): void {
  const key = `entity:${entity.id}`;
  const data = entity.serialize();
  cache.set(key, data);
}
```

### Constraining one parameter based on another

```typescript
function setProperty<T extends object, K extends keyof T>(
  obj: T,
  key: K,
  value: T[K]
): void {
  obj[key] = value;
}

const user = { name: "Alice", age: 30, active: true };
setProperty(user, "name", "Bob");    // ok: string matches string
setProperty(user, "age", 31);        // ok: number matches number
// setProperty(user, "age", "old");  // Error: string not assignable to number
// setProperty(user, "fake", 1);     // Error: "fake" not in keyof user
```

---

## Default Type Parameters

Like default function arguments, but for types:

```typescript
interface PaginatedResponse<T, M = { page: number; totalPages: number }> {
  data: T[];
  meta: M;
}

// Uses default meta type
type UserList = PaginatedResponse<User>;
// { data: User[]; meta: { page: number; totalPages: number } }

// Custom meta
type CursorUserList = PaginatedResponse<User, { cursor: string; hasMore: boolean }>;
// { data: User[]; meta: { cursor: string; hasMore: boolean } }
```

Another practical example — configurable logging:

```typescript
type LogEntry<
  TLevel extends string = "debug" | "info" | "warn" | "error",
  TContext extends Record<string, unknown> = Record<string, unknown>
> = {
  level: TLevel;
  message: string;
  timestamp: Date;
  context: TContext;
};

// Default: accepts any log level and any context
type GenericLog = LogEntry;

// Strict: only specific levels and typed context
type AuditLog = LogEntry<"info" | "warn", { userId: string; action: string }>;
```

> **Coming from JS:** Default type parameters are the reason you can use `Promise<void>` without specifying every generic in complex library types. They let you expose a simple API for common cases while keeping the full power available for advanced users.

---

## Generic Interfaces and Classes

### Generic Repository Pattern

This is the most common use of generic classes in backend TypeScript:

```typescript
interface Entity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Repository<T extends Entity> {
  findById(id: string): Promise<T | null>;
  findMany(filter: Partial<T>, options?: QueryOptions): Promise<T[]>;
  create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T>;
  update(id: string, data: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>): Promise<T>;
  delete(id: string): Promise<void>;
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: "asc" | "desc";
}

// One implementation serves every entity type
class PostgresRepository<T extends Entity> implements Repository<T> {
  constructor(private tableName: string) {}

  async findById(id: string): Promise<T | null> {
    const rows = await db.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    return (rows[0] as T) ?? null;
  }

  async findMany(filter: Partial<T>, options?: QueryOptions): Promise<T[]> {
    // Build query from filter — implementation details omitted
    const { where, values } = buildWhereClause(filter);
    const sql = `SELECT * FROM ${this.tableName} ${where} LIMIT $${values.length + 1}`;
    return db.query(sql, [...values, options?.limit ?? 100]) as Promise<T[]>;
  }

  async create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T> {
    const now = new Date();
    const id = generateId();
    const entity = { ...data, id, createdAt: now, updatedAt: now } as unknown as T;
    await db.insert(this.tableName, entity);
    return entity;
  }

  async update(id: string, data: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>): Promise<T> {
    const updated = { ...data, updatedAt: new Date() };
    await db.update(this.tableName, id, updated);
    return this.findById(id) as Promise<T>;
  }

  async delete(id: string): Promise<void> {
    await db.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
  }
}

// Concrete repositories with full type safety
interface User extends Entity {
  email: string;
  name: string;
  role: "admin" | "member";
}

interface Order extends Entity {
  userId: string;
  total: number;
  status: "pending" | "paid" | "shipped" | "delivered";
}

const userRepo = new PostgresRepository<User>("users");
const orderRepo = new PostgresRepository<Order>("orders");

// Fully typed — create() requires email, name, role but not id/createdAt/updatedAt
await userRepo.create({ email: "alice@example.com", name: "Alice", role: "admin" });

// findMany filter is Partial<User> — only valid User fields allowed
await orderRepo.findMany({ status: "pending", userId: "user_123" });
```

### Typed Event Emitter

```typescript
type EventMap = Record<string, unknown>;

class TypedEventEmitter<Events extends EventMap> {
  private listeners = new Map<keyof Events, Set<Function>>();

  on<E extends keyof Events>(event: E, handler: (payload: Events[E]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  emit<E extends keyof Events>(event: E, payload: Events[E]): void {
    this.listeners.get(event)?.forEach((handler) => handler(payload));
  }
}

// Define your event contract
interface AppEvents {
  "user:login": { userId: string; ip: string; timestamp: Date };
  "user:logout": { userId: string };
  "order:created": { orderId: string; total: number };
  "order:shipped": { orderId: string; trackingNumber: string };
  "system:error": { error: Error; context: string };
}

const bus = new TypedEventEmitter<AppEvents>();

// Full autocomplete on event names and payload shapes
bus.on("user:login", (payload) => {
  // payload is { userId: string; ip: string; timestamp: Date }
  console.log(`${payload.userId} logged in from ${payload.ip}`);
});

bus.emit("order:created", { orderId: "ord_123", total: 99.99 });

// bus.emit("order:created", { orderId: "ord_123" });
// Error: missing 'total' property

// bus.emit("nonexistent", {});
// Error: "nonexistent" is not a key of AppEvents
```

### Generic API Response Wrapper

```typescript
interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    totalPages?: number;
    requestId: string;
    duration: number;
  };
}

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Generic fetch wrapper that returns typed responses
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const body = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: body.code ?? "UNKNOWN",
          message: body.message ?? response.statusText,
          details: body.details,
        },
      };
    }

    return {
      success: true,
      data: body.data as T,
      meta: body.meta,
    };
  } catch (err) {
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: err instanceof Error ? err.message : "Unknown error",
      },
    };
  }
}

// Usage — T is inferred or specified
const result = await apiFetch<User[]>("/users?role=admin");
if (result.success) {
  result.data.forEach((user) => console.log(user.email)); // User[]
} else {
  console.error(result.error.code); // typed error
}
```

> **Coming from JS:** Without generics, you'd write `fetchUsers()`, `fetchOrders()`, `fetchProducts()` — three functions with identical logic but different return types. Generics let you write the fetch logic once and parameterize only the type, which the compiler then tracks through every call site.

---

## Generic Builder Pattern

A builder that accumulates type information as you chain methods:

```typescript
class QueryBuilder<T extends Entity, Selected extends keyof T = keyof T> {
  private conditions: string[] = [];
  private selectedFields: string[] = [];
  private limitValue?: number;

  constructor(private table: string) {}

  select<K extends keyof T>(...fields: K[]): QueryBuilder<T, K> {
    this.selectedFields = fields as string[];
    return this as unknown as QueryBuilder<T, K>;
  }

  where<K extends keyof T>(field: K, op: "=" | "!=" | ">" | "<", value: T[K]): this {
    this.conditions.push(`${String(field)} ${op} '${value}'`);
    return this;
  }

  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  async execute(): Promise<Pick<T, Selected>[]> {
    const fields = this.selectedFields.length > 0
      ? this.selectedFields.join(", ")
      : "*";
    const where = this.conditions.length > 0
      ? `WHERE ${this.conditions.join(" AND ")}`
      : "";
    const limit = this.limitValue ? `LIMIT ${this.limitValue}` : "";
    const sql = `SELECT ${fields} FROM ${this.table} ${where} ${limit}`;
    return db.query(sql) as Promise<Pick<T, Selected>[]>;
  }
}

// The return type narrows as you chain
const results = await new QueryBuilder<User>("users")
  .select("id", "email", "role")  // narrows Selected to "id" | "email" | "role"
  .where("role", "=", "admin")
  .limit(10)
  .execute();
// Promise<Pick<User, "id" | "email" | "role">[]>
// Each result has only { id, email, role } — nothing else
```

---

## Common Pitfalls

### Unnecessary generics

```typescript
// Bad: T is used only once, provides no value
function badLog<T>(message: T): void {
  console.log(message);
}

// Good: just use the concrete type
function goodLog(message: string): void {
  console.log(message);
}
```

The rule: if a type parameter appears only once in the signature, you probably do not need it.

### Over-constraining

```typescript
// Too restrictive — forces callers to pass the full type
function badFetch<T extends { id: string; name: string; email: string }>(entity: T): T {
  return entity;
}

// Better — constrain only what you need
function goodFetch<T extends { id: string }>(entity: T): T {
  return entity;
}
```

---

## Mini-Exercise

1. Write a generic `retry<T>` function that:
   - Takes an `() => Promise<T>` and a `maxAttempts: number`
   - Returns `Promise<T>`
   - Retries the function up to `maxAttempts` times on failure
   - The return type should correctly be `Promise<T>` for any `T`

2. Build a `TypedMap<Schema>` class where `Schema` is a record type:
   ```typescript
   const map = new TypedMap<{ user: User; token: string; count: number }>();
   map.set("user", someUser);  // ok
   map.set("token", 123);      // Error: number not assignable to string
   map.get("count");            // returns number
   map.get("invalid");          // Error: not a valid key
   ```
   Implement `get`, `set`, `has`, and `delete` with full type safety.

3. Create a generic `pipe` function that chains two functions together:
   ```typescript
   function pipe<A, B, C>(fn1: (a: A) => B, fn2: (b: B) => C): (a: A) => C
   ```
   Then extend it to support three functions. Verify that passing incompatible functions produces a type error.
