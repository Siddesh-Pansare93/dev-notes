# Everyday Types

## What You'll Learn

- Union types for "either/or" scenarios
- Literal types for exact values
- Type aliases to name complex types
- Type assertions when you know better than TypeScript
- Non-null assertion operator and when to use it
- How to combine these patterns in real-world code

---

## Union Types

Union types let a value be **one of several types**. Use the `|` (pipe) operator to combine types.

```typescript
let id: number | string;

id = 123;      // ✅ OK
id = "abc123"; // ✅ OK
id = true;     // ❌ Error: Type 'boolean' is not assignable
```

### Function Parameters with Unions

```typescript
function formatId(id: number | string): string {
  // TypeScript doesn't know which type id is yet
  // id.toFixed(2);  // ❌ Error: toFixed doesn't exist on string
  // id.toUpperCase();  // ❌ Error: toUpperCase doesn't exist on number

  // ✅ Use type narrowing
  if (typeof id === "number") {
    return id.toFixed(0);  // id is number here
  } else {
    return id.toUpperCase();  // id is string here
  }
}

console.log(formatId(123));      // "123"
console.log(formatId("abc123")); // "ABC123"
```

> **Coming from JavaScript:** In JS, you'd just call methods and handle errors at runtime. TypeScript forces you to check which type you have before accessing type-specific methods.

### Union of Object Types

```typescript
interface Cat {
  meow(): void;
  purr(): void;
}

interface Dog {
  bark(): void;
  wagTail(): void;
}

type Pet = Cat | Dog;

function playWithPet(pet: Pet) {
  // pet.meow();  // ❌ Error: meow doesn't exist on Dog
  
  // ✅ Check which type it is
  if ("meow" in pet) {
    pet.meow();  // pet is Cat here
    pet.purr();
  } else {
    pet.bark();  // pet is Dog here
    pet.wagTail();
  }
}
```

### Arrays with Union Types

```typescript
// Array where each element can be string OR number
let mixed: (string | number)[] = [1, "two", 3, "four"];

// ⚠️ Be careful with this - too flexible
mixed.push(true);  // ❌ Error: boolean not allowed
```

---

## Literal Types

Literal types narrow a value to an **exact constant**. Instead of accepting any string, accept only specific strings.

### String Literals

```typescript
let status: "pending" | "approved" | "rejected";

status = "pending";   // ✅ OK
status = "approved";  // ✅ OK
status = "rejected";  // ✅ OK
status = "cancelled"; // ❌ Error: not in the allowed values
```

### Numeric Literals

```typescript
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;

function rollDice(): DiceRoll {
  return (Math.floor(Math.random() * 6) + 1) as DiceRoll;
}

let roll: DiceRoll = 3;  // ✅ OK
roll = 7;                // ❌ Error
```

### Boolean Literals (Less Common)

```typescript
let success: true = true;
success = false;  // ❌ Error: Type 'false' is not assignable to type 'true'

// More common pattern - use boolean for true or false
type ComparisonResult = -1 | 0 | 1;

function compare(a: string, b: string): ComparisonResult {
  if (a === b) return 0;
  return a > b ? 1 : -1;
}
```

### Combining Literals with Primitives

```typescript
type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
type Port = number;

interface ServerConfig {
  host: string;
  port: Port;
  logLevel: LogLevel;
}

const config: ServerConfig = {
  host: "localhost",
  port: 3000,
  logLevel: "debug"
};
```

---

## Type Aliases

Type aliases let you name any type, making complex types reusable and readable.

### Basic Type Alias

```typescript
type ID = number | string;

let userId: ID = 123;
let productId: ID = "prod_456";
```

### Object Type Alias

```typescript
type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "member" | "viewer";
};

const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  role: "admin"
};
```

### Function Type Alias

```typescript
type MathOperation = (a: number, b: number) => number;

const add: MathOperation = (a, b) => a + b;
const multiply: MathOperation = (a, b) => a * b;
```

### Union Type Alias

```typescript
type Status = "pending" | "approved" | "rejected";
type ID = number | string;
type Result<T> = { success: true; data: T } | { success: false; error: string };

function processPayment(id: ID): Result<{ transactionId: string }> {
  if (Math.random() > 0.5) {
    return { success: true, data: { transactionId: "txn_123" } };
  } else {
    return { success: false, error: "Payment failed" };
  }
}
```

---

## Discriminated Unions (Tagged Unions)

A powerful pattern combining unions with literal types. Each member has a common property (the "discriminant") that identifies which type it is.

```typescript
interface SuccessResponse {
  status: "success";
  data: { id: number; name: string };
}

interface ErrorResponse {
  status: "error";
  error: { code: string; message: string };
}

type ApiResponse = SuccessResponse | ErrorResponse;

function handleResponse(response: ApiResponse) {
  // TypeScript knows which type based on the discriminant
  if (response.status === "success") {
    console.log(response.data.name);  // ✅ OK - response is SuccessResponse
  } else {
    console.log(response.error.message);  // ✅ OK - response is ErrorResponse
  }
}
```

This pattern is everywhere in TypeScript:

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; sideLength: number }
  | { kind: "rectangle"; width: number; height: number };

function calculateArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.sideLength ** 2;
    case "rectangle":
      return shape.width * shape.height;
  }
}
```

---

## Type Assertions

Sometimes **you know more than TypeScript** about a value's type. Type assertions let you override the inferred type.

### `as` Syntax (Preferred)

```typescript
const input = document.getElementById("username") as HTMLInputElement;
input.value = "Alice";  // ✅ OK - TypeScript knows it's an input element

// Without assertion, getElementById returns HTMLElement | null
const input2 = document.getElementById("username");
// input2.value = "Alice";  // ❌ Error: value doesn't exist on HTMLElement
```

### Angle Bracket Syntax (Avoid in TSX/React)

```typescript
const input = <HTMLInputElement>document.getElementById("username");
// Same as above, but conflicts with JSX syntax
```

### Asserting to More Specific Types

```typescript
interface User {
  id: number;
  name: string;
}

const response: unknown = await fetch("/api/user").then(r => r.json());

// ❌ Can't use response directly - it's unknown
// console.log(response.name);

// ✅ Assert to User type (you validated this somehow)
const user = response as User;
console.log(user.name);
```

### Double Assertions (Dangerous)

```typescript
const num = 42;

// ❌ Error: Can't directly assert number to string
// const str = num as string;

// ⚠️ You can force it with double assertion (AVOID THIS)
const str = num as unknown as string;
// This compiles but will break at runtime
```

### When to Use Assertions

- Working with DOM APIs where TypeScript can't know the exact element type
- Deserializing JSON where you validated the shape
- Interacting with poorly-typed third-party libraries

**Never use assertions to silence legitimate errors** — fix the root cause instead.

---

## Non-Null Assertion Operator (`!`)

The `!` operator tells TypeScript "I guarantee this is not `null` or `undefined`."

```typescript
function getUser(id: number): { name: string } | null {
  // ... fetch user
  return { name: "Alice" };
}

const user = getUser(1);

// ❌ Error: Object is possibly null
// console.log(user.name);

// ✅ Option 1: Check for null
if (user) {
  console.log(user.name);
}

// ✅ Option 2: Use optional chaining
console.log(user?.name);

// ⚠️ Option 3: Non-null assertion (use sparingly)
console.log(user!.name);  // "I promise user is not null"
```

### When to Use `!`

```typescript
const input = document.getElementById("username")!;
// You know for certain this element exists in your HTML
input.value = "Alice";

const config = process.env.API_KEY!;
// Your build fails if API_KEY is missing, so it's always there at runtime
```

**Rule:** Only use `!` if you're **100% certain** the value exists. Otherwise, check properly.

---

## Combining Patterns

### Real-World Example: API Responses

```typescript
type ApiStatus = "idle" | "loading" | "success" | "error";

interface ApiState<T> {
  status: ApiStatus;
  data: T | null;
  error: string | null;
}

interface User {
  id: number;
  name: string;
  email: string;
}

let userState: ApiState<User> = {
  status: "idle",
  data: null,
  error: null
};

async function fetchUser(id: number) {
  userState = { status: "loading", data: null, error: null };

  try {
    const response = await fetch(`/api/users/${id}`);
    const data = await response.json() as User;
    userState = { status: "success", data, error: null };
  } catch (err) {
    userState = { status: "error", data: null, error: (err as Error).message };
  }
}
```

### Type Guards with Discriminated Unions

```typescript
type LoadingState = { status: "loading" };
type SuccessState<T> = { status: "success"; data: T };
type ErrorState = { status: "error"; error: string };

type AsyncState<T> = LoadingState | SuccessState<T> | ErrorState;

function renderUser(state: AsyncState<User>) {
  switch (state.status) {
    case "loading":
      return "Loading...";
    case "success":
      return `Welcome, ${state.data.name}!`;  // TypeScript knows data exists
    case "error":
      return `Error: ${state.error}`;  // TypeScript knows error exists
  }
}
```

---

## Common Mistakes

### 1. Overusing `any` instead of `unknown`

```typescript
// ❌ No type safety
function parseJson(json: string): any {
  return JSON.parse(json);
}

const data = parseJson('{"name": "Alice"}');
console.log(data.naem);  // Typo - no error, crashes at runtime

// ✅ Use unknown and validate
function parseJson2(json: string): unknown {
  return JSON.parse(json);
}

const data2 = parseJson2('{"name": "Alice"}');
// console.log(data2.name);  // ❌ Error: data2 is unknown

if (typeof data2 === "object" && data2 !== null && "name" in data2) {
  console.log((data2 as { name: string }).name);
}
```

### 2. Forgetting to Narrow Union Types

```typescript
function logValue(value: string | number) {
  // ❌ Error: toFixed doesn't exist on string
  // console.log(value.toFixed(2));

  // ✅ Narrow the type first
  if (typeof value === "number") {
    console.log(value.toFixed(2));
  } else {
    console.log(value);
  }
}
```

### 3. Using Non-Null Assertion Carelessly

```typescript
function getConfig() {
  return Math.random() > 0.5 ? { apiUrl: "https://..." } : null;
}

// ⚠️ Dangerous - might crash
const config = getConfig()!;
console.log(config.apiUrl);

// ✅ Safe
const config2 = getConfig();
if (config2) {
  console.log(config2.apiUrl);
}
```

### 4. Widening Literal Types Unintentionally

```typescript
// ❌ type is string, not "GET"
let method = "GET";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
// const m: HttpMethod = method;  // Error

// ✅ Use as const
let method2 = "GET" as const;  // type is "GET"
const m2: HttpMethod = method2;  // ✅ OK
```

---

## Practice Exercises

### Exercise 1: Union Types

Create a function `processInput(input: string | number | boolean): string` that:
- If input is string, returns it uppercase
- If input is number, returns it formatted with 2 decimals
- If input is boolean, returns "yes" or "no"

### Exercise 2: Literal Types

Define a type `TrafficLight` with values `"red" | "yellow" | "green"`. Write a function `getAction(light: TrafficLight): string` that returns what a driver should do.

### Exercise 3: Type Aliases

Create type aliases for:
1. A user with id, name, email, and optional phone
2. A status type with "pending", "processing", "completed", "failed"
3. A result type that's either `{ ok: true; value: T }` or `{ ok: false; error: string }`

### Exercise 4: Discriminated Unions

Model a payment system with:
- `CreditCardPayment` with `{ method: "credit_card"; cardNumber: string; cvv: string }`
- `PayPalPayment` with `{ method: "paypal"; email: string }`
- `CryptoPayment` with `{ method: "crypto"; wallet: string; currency: string }`

Write a `processPayment` function that handles all three.

### Exercise 5: Type Assertions and Guards

Fetch data from an API (mock it) that returns `unknown`. Assert it to a `User` type and safely access properties using:
1. Type assertion
2. Type guard (`typeof`, `in` operator)
3. Optional chaining

---

## Next Steps

You now have a solid grasp of TypeScript's everyday types — unions, literals, type aliases, and assertions. In the final section, **From JS to TS**, we'll cover migration strategies, gradual adoption, and how to convert existing JavaScript projects to TypeScript.
