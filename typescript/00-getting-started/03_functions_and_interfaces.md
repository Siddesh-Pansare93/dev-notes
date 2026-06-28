# Functions and Interfaces

## What You'll Learn

- How to type function parameters and return values
- Optional and default parameters in TypeScript
- Rest parameters and function overloads
- What interfaces are and when to use them
- The difference between `type` and `interface` (and when to use which)

---

## Function Types

In JavaScript, functions can accept any arguments and return anything. TypeScript lets you specify exactly what goes in and what comes out.

### Basic Function Typing

```typescript
// Function declaration
function add(a: number, b: number): number {
  return a + b;
}

// Function expression
const subtract = function(a: number, b: number): number {
  return a - b;
};

// Arrow function
const multiply = (a: number, b: number): number => {
  return a * b;
};

// Concise arrow function
const divide = (a: number, b: number): number => a / b;
```

> **Coming from JavaScript:** You're already writing functions the same way — just add type annotations to parameters and return values.

### Return Type Inference

TypeScript can infer return types, but explicit annotations make your intent clearer:

```typescript
// ✅ Return type inferred as number
function square(n: number) {
  return n * n;
}

// ✅ Explicit - better for public APIs
function cube(n: number): number {
  return n * n * n;
}
```

**Best practice:** Always annotate return types for exported functions. Infer for private helpers.

### Void Return Type

For functions that don't return a value:

```typescript
function logMessage(message: string): void {
  console.log(message);
}

function saveToDatabase(data: object): void {
  // Save data...
  // No return statement
}
```

---

## Optional Parameters

Use `?` to make a parameter optional. Optional parameters must come after required ones.

```typescript
function greet(name: string, greeting?: string): string {
  if (greeting) {
    return `${greeting}, ${name}!`;
  }
  return `Hello, ${name}!`;
}

console.log(greet("Alice"));              // "Hello, Alice!"
console.log(greet("Bob", "Good morning")); // "Good morning, Bob!"
```

Optional parameters are automatically typed as `Type | undefined`:

```typescript
function buildUrl(base: string, path?: string): string {
  // path is string | undefined
  if (path) {
    return `${base}/${path}`;
  }
  return base;
}
```

---

## Default Parameters

Default parameters provide a fallback value when the argument is `undefined` (or omitted).

```typescript
function createUser(name: string, role: string = "member"): object {
  return { name, role };
}

console.log(createUser("Alice"));              // { name: "Alice", role: "member" }
console.log(createUser("Bob", "admin"));       // { name: "Bob", role: "admin" }
console.log(createUser("Charlie", undefined)); // { name: "Charlie", role: "member" }
```

TypeScript infers the type from the default value:

```typescript
function greet(name: string, greeting = "Hello") {
  // greeting is inferred as string
  return `${greeting}, ${name}!`;
}
```

> **Coming from JavaScript:** Default parameters work the same as ES6, but TypeScript ensures type safety.

---

## Rest Parameters

Collect multiple arguments into an array:

```typescript
function sum(...numbers: number[]): number {
  return numbers.reduce((total, n) => total + n, 0);
}

console.log(sum(1, 2, 3));        // 6
console.log(sum(10, 20, 30, 40)); // 100
```

Rest parameters must be the last parameter:

```typescript
function logWithPrefix(prefix: string, ...messages: string[]): void {
  messages.forEach(msg => console.log(`${prefix}: ${msg}`));
}

logWithPrefix("INFO", "Server started", "Port 3000");
// INFO: Server started
// INFO: Port 3000
```

---

## Function Types as Variables

You can define a variable that holds a function with a specific signature:

```typescript
let calculate: (a: number, b: number) => number;

calculate = (a, b) => a + b;      // ✅ OK
calculate = (a, b) => a * b;      // ✅ OK
calculate = (a) => a;              // ❌ Error: wrong number of parameters
calculate = (a, b) => `${a + b}`;  // ❌ Error: wrong return type
```

This is useful for callback parameters:

```typescript
function processData(
  data: number[],
  callback: (item: number) => number
): number[] {
  return data.map(callback);
}

const doubled = processData([1, 2, 3], x => x * 2);        // [2, 4, 6]
const squared = processData([1, 2, 3], x => x * x);        // [1, 4, 9]
```

---

## Interfaces for Object Types

Interfaces define the shape of objects. They're like contracts — any object matching the structure satisfies the interface.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  isActive: true
};

// ❌ Missing properties
const badUser: User = {
  id: 2,
  name: "Bob"
  // Error: Property 'email' is missing
};

// ❌ Extra properties
const badUser2: User = {
  id: 3,
  name: "Charlie",
  email: "charlie@example.com",
  isActive: true,
  role: "admin"  // Error: Object literal may only specify known properties
};
```

### Optional Properties in Interfaces

```typescript
interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;  // Optional
  tags?: string[];       // Optional
}

const product1: Product = {
  id: 1,
  name: "Laptop",
  price: 999.99
  // description and tags are optional
};

const product2: Product = {
  id: 2,
  name: "Mouse",
  price: 29.99,
  description: "Wireless mouse",
  tags: ["electronics", "accessories"]
};
```

### Readonly Properties

```typescript
interface Config {
  readonly apiUrl: string;
  readonly timeout: number;
  retries: number;  // Not readonly
}

const config: Config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3
};

config.retries = 5;      // ✅ OK
config.timeout = 10000;  // ❌ Error: Cannot assign to 'timeout' because it is a read-only property
```

---

## Interface for Functions

Interfaces can describe function signatures:

```typescript
interface MathOperation {
  (a: number, b: number): number;
}

const add: MathOperation = (a, b) => a + b;
const multiply: MathOperation = (a, b) => a * b;
```

But for simple function types, the inline syntax is clearer:

```typescript
// ✅ More common and readable
let add: (a: number, b: number) => number;
```

---

## Extending Interfaces

Interfaces can extend other interfaces to build up complex types:

```typescript
interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

interface User extends Timestamped {
  id: number;
  name: string;
  email: string;
}

const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  createdAt: new Date(),
  updatedAt: new Date()
};
```

You can extend multiple interfaces:

```typescript
interface Identifiable {
  id: number;
}

interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

interface SoftDeletable {
  deletedAt: Date | null;
}

interface BaseEntity extends Identifiable, Timestamped, SoftDeletable {
  // Now has id, createdAt, updatedAt, deletedAt
}
```

---

## Type Aliases vs Interfaces

### Type Alias

```typescript
type User = {
  id: number;
  name: string;
  email: string;
};
```

### Interface

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}
```

They look very similar for object types. Here's when to use which:

### Use `interface` when:

1. **Defining object shapes** (most common case)
2. **You might extend it later** (interfaces are open, can be extended)
3. **Working with classes** (classes can `implement` interfaces)

```typescript
interface Animal {
  name: string;
}

// ✅ Declaration merging (same interface declared twice merges)
interface Animal {
  age: number;
}

const dog: Animal = {
  name: "Buddy",
  age: 5  // Both properties required
};
```

### Use `type` when:

1. **Union types**
2. **Intersection types**
3. **Primitive types, tuples, or mapped types**
4. **You want to prevent extension**

```typescript
// ✅ Union - can't do this with interface
type Status = "pending" | "approved" | "rejected";

// ✅ Union of objects
type Response = SuccessResponse | ErrorResponse;

// ✅ Tuple
type Coordinate = [number, number];

// ✅ Intersection
type Admin = User & { permissions: string[] };
```

### Comparison Table

| Feature | `interface` | `type` |
|---------|-------------|--------|
| Object shapes | ✅ | ✅ |
| Unions | ❌ | ✅ |
| Intersections | ✅ (via `extends`) | ✅ |
| Primitives/Tuples | ❌ | ✅ |
| Declaration merging | ✅ | ❌ |
| `implements` with classes | ✅ | ✅ (for object types) |
| Computed properties | ❌ | ✅ |

**Rule of thumb:** Use `interface` by default for objects. Use `type` for unions, tuples, and advanced type manipulation.

---

## Practical Examples

### API Response Interface

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: number;
}

interface User {
  id: number;
  name: string;
  email: string;
}

const response: ApiResponse<User> = {
  success: true,
  data: {
    id: 1,
    name: "Alice",
    email: "alice@example.com"
  },
  message: "User fetched successfully",
  timestamp: Date.now()
};
```

### Configuration with Defaults

```typescript
interface ServerConfig {
  host: string;
  port: number;
  ssl?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
}

function createServer(config: ServerConfig): void {
  const {
    host,
    port,
    ssl = false,
    logLevel = "info"
  } = config;

  console.log(`Starting server on ${host}:${port}`);
  console.log(`SSL: ${ssl}, Log level: ${logLevel}`);
}

createServer({ host: "localhost", port: 3000 });
createServer({ host: "0.0.0.0", port: 8080, ssl: true, logLevel: "debug" });
```

### Function with Interface Parameter

```typescript
interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

function fetchUsers(options: PaginationOptions): Promise<User[]> {
  const { page, pageSize, sortBy = "id", sortOrder = "asc" } = options;
  
  // Build query with validated parameters
  const offset = (page - 1) * pageSize;
  console.log(`Fetching page ${page}, ${pageSize} items, sorted by ${sortBy} ${sortOrder}`);
  
  // ... fetch logic
  return Promise.resolve([]);
}

fetchUsers({ page: 1, pageSize: 20 });
fetchUsers({ page: 2, pageSize: 50, sortBy: "name", sortOrder: "desc" });
```

---

## Common Mistakes

### 1. Overusing `any` in function signatures

```typescript
// ❌ No type safety
function processUser(user: any): any {
  return user.name.toUpperCase();  // Will crash if user.name is undefined
}

// ✅ Type-safe
interface User {
  name: string;
}

function processUser2(user: User): string {
  return user.name.toUpperCase();
}
```

### 2. Forgetting optional parameters come last

```typescript
// ❌ Error: Required parameter cannot follow optional parameter
function greet(greeting?: string, name: string): string {
  return `${greeting}, ${name}`;
}

// ✅ Correct order
function greet2(name: string, greeting?: string): string {
  return `${greeting || "Hello"}, ${name}`;
}
```

### 3. Confusing interface extension with intersection

```typescript
// ✅ Interface extension
interface A {
  a: string;
}

interface B extends A {
  b: number;
}

// ✅ Type intersection
type C = A & { c: boolean };
```

Both work, but `extends` is clearer for interfaces.

### 4. Not handling optional properties

```typescript
interface User {
  name: string;
  email?: string;
}

function sendEmail(user: User): void {
  // ❌ email might be undefined
  console.log(user.email.toLowerCase());

  // ✅ Check first
  if (user.email) {
    console.log(user.email.toLowerCase());
  }
}
```

---

## Practice Exercises

### Exercise 1: Function Types

Write functions with proper type annotations:

1. `calculateTax(amount: number, rate: number): number` — returns the tax amount
2. `formatCurrency(amount: number, currency?: string): string` — default currency is "USD"
3. `logErrors(...errors: string[]): void` — logs all error messages

### Exercise 2: Interfaces

Define interfaces for:

1. A blog post with `id`, `title`, `content`, `author`, `publishedAt`, and optional `tags`
2. A shopping cart item with `productId`, `name`, `price`, `quantity`
3. Extend the cart item interface to create an `OrderItem` that also has `orderId` and `orderDate`

### Exercise 3: Optional vs Default Parameters

Implement a `createUser` function:

```typescript
function createUser(
  name: string,
  email: string,
  role?: string,
  isActive: boolean = true
): User {
  // Return a user object
}
```

Call it with different combinations of arguments.

### Exercise 4: Type vs Interface

For each scenario, decide whether to use `type` or `interface`:

1. A shape for a user object
2. A union type for payment methods: `"credit_card" | "paypal" | "crypto"`
3. A coordinate tuple `[number, number]`
4. A base entity that other interfaces will extend

### Exercise 5: Callback Functions

Write a `retry` function that takes a callback and retries it on failure:

```typescript
function retry(
  fn: () => Promise<any>,
  maxAttempts: number = 3
): Promise<any> {
  // Implement retry logic
}
```

Use it to retry a fake API call that randomly fails.

---

## Next Steps

You now understand how to type functions and define object shapes with interfaces. In the next section, we'll explore **Generics** — how to write reusable, type-safe code that works with multiple types.
