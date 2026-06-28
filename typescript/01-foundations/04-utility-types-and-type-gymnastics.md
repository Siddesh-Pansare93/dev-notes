# Utility Types and Type Gymnastics

## What You'll Learn

- Every built-in utility type — what it does, when to use it, and how it works internally
- Combining utility types to build complex type transformations
- Writing your own custom utility types for real project needs
- Practical patterns: DTOs from entities, form state types, API contracts

---

## Built-In Utility Types — The Complete Reference

### `Partial<T>` — make all properties optional

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
}

// PATCH endpoint — every field is optional
async function updateUser(id: string, updates: Partial<User>): Promise<User> {
  return db.users.update(id, updates);
}

await updateUser("u_1", { name: "Alice" });         // ok
await updateUser("u_1", { role: "admin" });          // ok
await updateUser("u_1", {});                         // ok (no-op)
// await updateUser("u_1", { fake: true });           // Error
```

How it works: `type Partial<T> = { [K in keyof T]?: T[K] }`

### `Required<T>` — make all properties required

```typescript
interface Options {
  timeout?: number;
  retries?: number;
  baseUrl?: string;
}

// Internal config after merging with defaults — nothing is optional anymore
type ResolvedOptions = Required<Options>;
// { timeout: number; retries: number; baseUrl: string }

function createClient(opts?: Options): ResolvedOptions {
  return {
    timeout: opts?.timeout ?? 5000,
    retries: opts?.retries ?? 3,
    baseUrl: opts?.baseUrl ?? "https://api.example.com",
  };
}
```

### `Readonly<T>` — make all properties readonly

```typescript
interface AppState {
  currentUser: User | null;
  theme: "light" | "dark";
  notifications: Notification[];
}

function getState(): Readonly<AppState> {
  return store.getState();
}

const state = getState();
// state.theme = "dark"; // Error: Cannot assign to 'theme' because it is a read-only property
```

### `Pick<T, K>` — select a subset of properties

```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  sku: string;
  inventory: number;
  createdAt: Date;
  updatedAt: Date;
}

// What the product card component actually needs
type ProductCard = Pick<Product, "id" | "name" | "price">;
// { id: string; name: string; price: number }

// What the search index stores
type SearchableProduct = Pick<Product, "id" | "name" | "description" | "sku">;
```

### `Omit<T, K>` — exclude properties

```typescript
// Creation payload — exclude auto-generated fields
type CreateProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;
// { name: string; description: string; price: number; sku: string; inventory: number }

// Public API response — exclude internal fields
type PublicProduct = Omit<Product, "inventory" | "sku">;
```

> **Coming from JS:** `Pick` and `Omit` are the type-level equivalents of destructuring and spreading. Instead of `const { id, createdAt, ...rest } = product` to remove fields at runtime, `Omit<Product, "id" | "createdAt">` removes them at the type level with zero runtime cost.

### `Record<K, V>` — construct an object type

```typescript
type HttpStatus = 200 | 201 | 400 | 401 | 403 | 404 | 500;

const statusMessages: Record<HttpStatus, string> = {
  200: "OK",
  201: "Created",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  500: "Internal Server Error",
};

// Dynamic lookup tables
type FeatureFlag = "darkMode" | "betaSearch" | "newCheckout" | "aiAssist";
type FeatureConfig = Record<FeatureFlag, { enabled: boolean; rolloutPercent: number }>;

const features: FeatureConfig = {
  darkMode: { enabled: true, rolloutPercent: 100 },
  betaSearch: { enabled: true, rolloutPercent: 25 },
  newCheckout: { enabled: false, rolloutPercent: 0 },
  aiAssist: { enabled: true, rolloutPercent: 10 },
};
// If you add a new FeatureFlag, the compiler forces you to add its config
```

### `Extract<T, U>` — keep union members that match

```typescript
type AllEvents =
  | { type: "user:login"; userId: string }
  | { type: "user:logout"; userId: string }
  | { type: "order:created"; orderId: string }
  | { type: "order:cancelled"; orderId: string; reason: string }
  | { type: "system:error"; error: Error };

// Extract only user-related events
type UserEvent = Extract<AllEvents, { type: `user:${string}` }>;
// { type: "user:login"; userId: string } | { type: "user:logout"; userId: string }

// Extract events that have an orderId
type OrderEvent = Extract<AllEvents, { orderId: string }>;
```

### `Exclude<T, U>` — remove union members that match

```typescript
type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type NonNullPrimitive = Exclude<Primitive, null | undefined>;
// string | number | boolean | symbol | bigint

// Remove specific event types
type NonSystemEvent = Exclude<AllEvents, { type: `system:${string}` }>;
```

### `ReturnType<T>` — extract function return type

```typescript
function createConnection(config: DatabaseConfig) {
  return {
    query: (sql: string) => Promise.resolve([]),
    close: () => Promise.resolve(),
    isConnected: true,
    config,
  };
}

// Extract the type without manually defining it
type Connection = ReturnType<typeof createConnection>;
// { query: (sql: string) => Promise<never[]>; close: () => Promise<void>; isConnected: boolean; config: DatabaseConfig }
```

### `Parameters<T>` — extract function parameter types as a tuple

```typescript
function sendNotification(
  userId: string,
  channel: "email" | "sms" | "push",
  message: string,
  options?: { priority: "low" | "high"; ttl: number }
): Promise<void> {
  // ...
}

type NotificationArgs = Parameters<typeof sendNotification>;
// [userId: string, channel: "email" | "sms" | "push", message: string, options?: { priority: "low" | "high"; ttl: number }]

// Useful for wrapping functions
function queueNotification(...args: Parameters<typeof sendNotification>): void {
  notificationQueue.push(args);
}
```

### `Awaited<T>` — unwrap Promise types (including nested)

```typescript
type A = Awaited<Promise<string>>;              // string
type B = Awaited<Promise<Promise<number>>>;     // number (unwraps recursively)
type C = Awaited<string>;                        // string (non-promise passes through)

// Practical: get the resolved type of an async function
async function fetchDashboardData() {
  const [users, orders, metrics] = await Promise.all([
    fetchUsers(),
    fetchOrders(),
    fetchMetrics(),
  ]);
  return { users, orders, metrics };
}

type DashboardData = Awaited<ReturnType<typeof fetchDashboardData>>;
// { users: User[]; orders: Order[]; metrics: Metrics }
```

### `NonNullable<T>` — remove null and undefined

```typescript
type MaybeUser = User | null | undefined;
type DefiniteUser = NonNullable<MaybeUser>; // User

// Common pattern: after a null check, the type is already narrowed
// But NonNullable is useful in generic contexts:
function assertDefined<T>(value: T, message?: string): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message ?? "Expected value to be defined");
  }
  return value as NonNullable<T>;
}

const user = assertDefined(await userRepo.findById(id), `User ${id} not found`);
// user is NonNullable<User | null> = User
```

### `ConstructorParameters<T>` — extract constructor argument types

```typescript
class HttpClient {
  constructor(
    private baseUrl: string,
    private headers: Record<string, string>,
    private timeout: number = 5000
  ) {}
}

type HttpClientArgs = ConstructorParameters<typeof HttpClient>;
// [baseUrl: string, headers: Record<string, string>, timeout?: number]

// Factory function with the same signature
function createHttpClient(...args: ConstructorParameters<typeof HttpClient>): HttpClient {
  return new HttpClient(...args);
}
```

> **Coming from JS:** `ReturnType`, `Parameters`, and `ConstructorParameters` let you derive types from existing functions instead of maintaining separate type definitions. When the function signature changes, every derived type updates automatically. This is the "single source of truth" principle applied to types.

---

## Combining Utility Types

The real power comes from composition. Each utility type is a building block.

### DTO types from entities

```typescript
interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: "admin" | "member";
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Public response — strip sensitive and internal fields
type UserDTO = Omit<UserEntity, "passwordHash" | "deletedAt">;

// Creation input — strip auto-generated fields and password hash, add plain password
type CreateUserInput = Omit<UserEntity, "id" | "passwordHash" | "createdAt" | "updatedAt" | "deletedAt" | "lastLoginAt"> & {
  password: string;
};
// { email: string; name: string; role: "admin" | "member"; password: string }

// Update input — same as creation but everything optional
type UpdateUserInput = Partial<CreateUserInput>;

// Admin view — everything except passwordHash
type AdminUserView = Omit<UserEntity, "passwordHash"> & {
  orderCount: number;
  totalSpent: number;
};

// List view — minimal fields for table display
type UserListItem = Pick<UserEntity, "id" | "name" | "email" | "role" | "lastLoginAt">;
```

### Form state types

```typescript
interface FormField<T> {
  value: T;
  error: string | null;
  touched: boolean;
  dirty: boolean;
}

// Convert any interface into a form state
type FormState<T> = {
  [K in keyof T]: FormField<T[K]>;
};

type UserFormState = FormState<CreateUserInput>;
// {
//   email: FormField<string>;
//   name: FormField<string>;
//   role: FormField<"admin" | "member">;
//   password: FormField<string>;
// }

// Extract just the values from form state (for submission)
type FormValues<T extends Record<string, FormField<unknown>>> = {
  [K in keyof T]: T[K]["value"];
};

// Check if any field has an error
type FormErrors<T> = {
  [K in keyof T]: string | null;
};

function getFormErrors<T>(state: FormState<T>): FormErrors<T> {
  const errors = {} as FormErrors<T>;
  for (const key in state) {
    errors[key] = state[key].error;
  }
  return errors;
}
```

### Read-only API responses, mutable internal state

```typescript
// Internal mutable state
interface CartState {
  items: Array<{ productId: string; quantity: number; price: number }>;
  couponCode: string | null;
  shippingMethod: "standard" | "express" | "overnight";
}

// What the API returns — deeply frozen
type CartResponse = Readonly<CartState> & {
  readonly subtotal: number;
  readonly tax: number;
  readonly total: number;
};

// What the update endpoint accepts — only certain fields are writable
type CartUpdate = Partial<Pick<CartState, "couponCode" | "shippingMethod">>;
```

---

## Building Custom Utility Types

### `Mutable<T>` — the inverse of Readonly

```typescript
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

interface FrozenConfig {
  readonly host: string;
  readonly port: number;
}

type WritableConfig = Mutable<FrozenConfig>;
// { host: string; port: number }
```

### `OptionalKeys<T>` and `RequiredKeys<T>` — extract key categories

```typescript
type OptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

type RequiredKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

interface Mixed {
  id: string;
  name: string;
  bio?: string;
  avatar?: string;
}

type ReqKeys = RequiredKeys<Mixed>; // "id" | "name"
type OptKeys = OptionalKeys<Mixed>; // "bio" | "avatar"
```

### `PickByType<T, V>` — select properties by value type

```typescript
type PickByType<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

interface MixedEntity {
  id: string;
  name: string;
  email: string;
  age: number;
  score: number;
  isActive: boolean;
  createdAt: Date;
}

type StringFields = PickByType<MixedEntity, string>;
// { id: string; name: string; email: string }

type NumericFields = PickByType<MixedEntity, number>;
// { age: number; score: number }

type DateFields = PickByType<MixedEntity, Date>;
// { createdAt: Date }
```

### `OmitByType<T, V>` — the inverse

```typescript
type OmitByType<T, V> = {
  [K in keyof T as T[K] extends V ? never : K]: T[K];
};

type WithoutDates = OmitByType<MixedEntity, Date>;
// { id: string; name: string; email: string; age: number; score: number; isActive: boolean }
```

### `StrictOmit<T, K>` — Omit that errors on invalid keys

The built-in `Omit` silently ignores keys that do not exist on `T`. This is usually not what you want:

```typescript
// Built-in Omit doesn't catch this typo:
type Broken = Omit<User, "emial">; // no error — "emial" is silently ignored

// StrictOmit catches it:
type StrictOmit<T, K extends keyof T> = Omit<T, K>;

// type Fixed = StrictOmit<User, "emial">; // Error: "emial" is not assignable to keyof User
type Fixed = StrictOmit<User, "email">;     // works correctly
```

### `Rename<T, From, To>` — rename a property

```typescript
type Rename<T, From extends keyof T, To extends string> =
  Omit<T, From> & { [K in To]: T[From] };

type UserWithUsername = Rename<User, "name", "username">;
// { id: string; email: string; role: ...; username: string }
```

> **Coming from JS:** In JavaScript, you rename fields with destructuring: `const { name: username, ...rest } = user`. Custom utility types let you do the same transformation at the type level, so your renamed types stay in sync with the original without manual maintenance.

### `DeepRequired<T>` — Required at every depth

```typescript
type DeepRequired<T> = {
  [K in keyof T]-?: T[K] extends object
    ? T[K] extends Function
      ? T[K]
      : DeepRequired<T[K]>
    : T[K];
};

interface PartialConfig {
  server?: {
    host?: string;
    port?: number;
    ssl?: {
      enabled?: boolean;
      cert?: string;
    };
  };
  features?: {
    darkMode?: boolean;
  };
}

type FullConfig = DeepRequired<PartialConfig>;
// Every nested property is required — no undefined anywhere
```

### `Diff<A, B>` — properties in A but not in B

```typescript
type Diff<A, B> = Omit<A, keyof B>;

interface BaseUser {
  id: string;
  name: string;
  email: string;
}

interface AdminUser extends BaseUser {
  permissions: string[];
  department: string;
  accessLevel: number;
}

type AdminOnlyFields = Diff<AdminUser, BaseUser>;
// { permissions: string[]; department: string; accessLevel: number }
```

---

## Advanced Compositions

### Merge two types (B overrides A)

```typescript
type Merge<A, B> = Omit<A, keyof B> & B;

interface DefaultSettings {
  theme: "light" | "dark";
  language: string;
  notifications: boolean;
  fontSize: number;
}

interface UserOverrides {
  theme: "light" | "dark" | "system"; // extended options
  fontSize: "small" | "medium" | "large"; // different type entirely
}

type EffectiveSettings = Merge<DefaultSettings, UserOverrides>;
// {
//   language: string;
//   notifications: boolean;
//   theme: "light" | "dark" | "system";        <- from UserOverrides
//   fontSize: "small" | "medium" | "large";    <- from UserOverrides
// }
```

### Typed environment variables

```typescript
type EnvVars = {
  DATABASE_URL: string;
  PORT: `${number}`;
  NODE_ENV: "development" | "production" | "test";
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
  REDIS_URL?: string;
  SENTRY_DSN?: string;
};

type RequiredEnv = Pick<EnvVars, RequiredKeys<EnvVars>>;
type OptionalEnv = Pick<EnvVars, OptionalKeys<EnvVars>>;

function getRequiredEnv<K extends keyof RequiredEnv>(key: K): RequiredEnv[K] {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value as RequiredEnv[K];
}

function getOptionalEnv<K extends keyof OptionalEnv>(key: K): OptionalEnv[K] | undefined {
  return process.env[key] as OptionalEnv[K] | undefined;
}

const dbUrl = getRequiredEnv("DATABASE_URL");    // string (guaranteed)
const redis = getOptionalEnv("REDIS_URL");       // string | undefined
// getRequiredEnv("NONEXISTENT");                // Error: not a key
```

### API contract from route handlers

```typescript
// Define route handler functions first
const handlers = {
  getUser: async (id: string): Promise<UserDTO> => { /* ... */ },
  listUsers: async (filters: { role?: string; page?: number }): Promise<UserDTO[]> => { /* ... */ },
  createUser: async (input: CreateUserInput): Promise<UserDTO> => { /* ... */ },
  deleteUser: async (id: string): Promise<void> => { /* ... */ },
} as const;

// Derive the full API contract from the handler implementations
type ApiContract = {
  [K in keyof typeof handlers]: {
    input: Parameters<(typeof handlers)[K]>[0];
    output: Awaited<ReturnType<(typeof handlers)[K]>>;
  };
};

// ApiContract is now:
// {
//   getUser: { input: string; output: UserDTO };
//   listUsers: { input: { role?: string; page?: number }; output: UserDTO[] };
//   createUser: { input: CreateUserInput; output: UserDTO };
//   deleteUser: { input: string; output: void };
// }

// Use the contract to type a client SDK
function createApiClient<T extends Record<string, { input: any; output: any }>>(
  contract: T
): {
  [K in keyof T]: (input: T[K]["input"]) => Promise<T[K]["output"]>;
} {
  // implementation using fetch
  return {} as any;
}
```

---

## Real-World Pattern: Typed ORM Query Results

```typescript
interface Schema {
  users: UserEntity;
  orders: OrderEntity;
  products: ProductEntity;
}

type TableName = keyof Schema;

// Select specific columns and get back a typed result
type SelectResult<
  T extends TableName,
  Cols extends keyof Schema[T]
> = Pick<Schema[T], Cols>;

// Simulated query builder result typing
function select<T extends TableName, C extends keyof Schema[T]>(
  table: T,
  ...columns: C[]
): Promise<SelectResult<T, C>[]> {
  // build and execute SQL
  return db.query(`SELECT ${columns.join(", ")} FROM ${table}`) as any;
}

// Usage
const results = await select("users", "id", "email", "name");
// Pick<UserEntity, "id" | "email" | "name">[]

const products = await select("products", "id", "name", "price");
// Pick<ProductEntity, "id" | "name" | "price">[]

// select("users", "nonexistent"); // Error: not a key of UserEntity
// select("fakeable", "id");       // Error: not a key of Schema
```

---

## Mini-Exercise

1. Using only built-in utility types (`Pick`, `Omit`, `Partial`, `Required`, and `&`), define the following types from a single `OrderEntity`:

   ```typescript
   interface OrderEntity {
     id: string;
     userId: string;
     items: Array<{ productId: string; quantity: number; unitPrice: number }>;
     status: "draft" | "confirmed" | "shipped" | "delivered" | "cancelled";
     shippingAddress: string;
     billingAddress: string;
     notes?: string;
     createdAt: Date;
     updatedAt: Date;
   }
   ```

   - `CreateOrderInput` — everything except `id`, `status`, `createdAt`, `updatedAt` (status defaults server-side)
   - `UpdateOrderInput` — only `shippingAddress`, `billingAddress`, `notes`, and all optional
   - `OrderSummary` — only `id`, `status`, `createdAt`, and add a computed `totalAmount: number`
   - `AdminOrderView` — the full entity plus `userName: string` and `userEmail: string`

2. Build a custom `PickRequired<T, K>` that picks specific keys from `T` and makes them required (even if they were optional in `T`):
   ```typescript
   type PickRequired<T, K extends keyof T> = /* your implementation */;
   ```

3. Create a `FunctionPropertyNames<T>` type that extracts only the keys of `T` whose values are functions. Then create `FunctionProperties<T>` that returns an object with only those keys. Test it against a class-like interface that has both data and method properties.

4. Build a `Promisify<T>` type that takes a record of synchronous functions and wraps all their return types in `Promise`:
   ```typescript
   type SyncApi = {
     getUser: (id: string) => User;
     deleteUser: (id: string) => void;
     listUsers: () => User[];
   };
   type AsyncApi = Promisify<SyncApi>;
   // {
   //   getUser: (id: string) => Promise<User>;
   //   deleteUser: (id: string) => Promise<void>;
   //   listUsers: () => Promise<User[]>;
   // }
   ```
