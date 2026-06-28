# Basic Types

## What You'll Learn

- All primitive types: `string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`
- How to type arrays and tuples
- Object type annotations and optional properties
- Special types: `any`, `unknown`, `never`, `void`
- How type inference works and when to use explicit annotations

---

## Primitive Types

TypeScript has seven primitive types, mirroring JavaScript's runtime types.

### String

```typescript
let username: string = "Alice";
let greeting: string = 'Hello';
let template: string = `Welcome, ${username}!`;

username = 42;  // ❌ Error: Type 'number' is not assignable to type 'string'
```

> **Coming from JavaScript:** In JS, you can reassign variables to any type. TypeScript locks the type based on your annotation (or inference).

### Number

```typescript
let age: number = 30;
let price: number = 19.99;
let hex: number = 0xf00d;
let binary: number = 0b1010;
let octal: number = 0o744;

age = "30";  // ❌ Error: Type 'string' is not assignable to type 'number'
```

There's no separate type for integers vs. floats. Everything is `number`.

### Boolean

```typescript
let isActive: boolean = true;
let hasPermission: boolean = false;

isActive = 1;  // ❌ Error: Type 'number' is not assignable to type 'boolean'
```

Watch out for truthy/falsy confusion:

```typescript
let value = 0;

// ❌ This is wrong - value is number, not boolean
// let isEmpty: boolean = value;

// ✅ Explicit boolean conversion
let isEmpty: boolean = value === 0;
let isTruthy: boolean = !!value;
```

### Null and Undefined

```typescript
let nothing: null = null;
let notDefined: undefined = undefined;
```

With `strictNullChecks` enabled (part of `strict` mode), `null` and `undefined` are **not** assignable to other types:

```typescript
let name: string = "Bob";
name = null;       // ❌ Error: Type 'null' is not assignable to type 'string'
name = undefined;  // ❌ Error: Type 'undefined' is not assignable to type 'string'

// ✅ Explicitly allow null/undefined
let name2: string | null = "Bob";
name2 = null;  // OK now
```

> **Coming from JavaScript:** In JS, `null` and `undefined` can sneak into any variable. TypeScript forces you to handle them explicitly, eliminating the billion-dollar mistake (null reference errors).

### Symbol (Rarely Used)

```typescript
let sym: symbol = Symbol("unique");
let sym2: symbol = Symbol("unique");

console.log(sym === sym2);  // false - each symbol is unique
```

Symbols are used for unique object keys, but you won't need them often as a beginner.

### BigInt (For Huge Numbers)

```typescript
let big: bigint = 100n;
let huge: bigint = BigInt(9007199254740991);

let mixed = big + 10;  // ❌ Error: Cannot mix BigInt and number
let ok = big + 10n;    // ✅ OK
```

Use `bigint` for integers larger than `Number.MAX_SAFE_INTEGER` (2^53 - 1).

---

## Arrays

Two equivalent syntaxes:

```typescript
// ✅ Style 1: Type[]
let numbers: number[] = [1, 2, 3, 4, 5];
let names: string[] = ["Alice", "Bob", "Charlie"];

// ✅ Style 2: Array<Type> (generic syntax)
let numbers2: Array<number> = [1, 2, 3];
let names2: Array<string> = ["Alice", "Bob"];
```

Most developers prefer `Type[]` because it's shorter.

### Mixed Type Arrays (Union Types)

```typescript
let mixed: (string | number)[] = [1, "two", 3, "four"];

mixed.push(5);        // ✅ OK
mixed.push("six");    // ✅ OK
mixed.push(true);     // ❌ Error: Type 'boolean' is not assignable
```

### Multidimensional Arrays

```typescript
let matrix: number[][] = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
];

let grid: string[][] = [
  ["A1", "A2"],
  ["B1", "B2"]
];
```

---

## Tuples

Tuples are fixed-length arrays where each position has a specific type. They're great for representing pairs, coordinates, or any fixed-structure data.

```typescript
// [latitude, longitude]
let coordinates: [number, number] = [40.7128, -74.0060];

// [id, name, isActive]
let user: [number, string, boolean] = [1, "Alice", true];

// ❌ Wrong order
let badUser: [number, string, boolean] = ["Alice", 1, true];  // Error

// ❌ Wrong length
let shortUser: [number, string, boolean] = [1, "Alice"];  // Error
```

### Optional Tuple Elements

```typescript
let http: [number, string, string?] = [200, "OK"];
let http2: [number, string, string?] = [404, "Not Found", "Page does not exist"];
```

### Tuple with Rest Elements

```typescript
let scores: [string, ...number[]] = ["Math", 95, 87, 92, 88];
//           ^ first element is string, rest are numbers
```

> **Coming from JavaScript:** In JS, you'd use a plain array `[40.7128, -74.0060]` and just remember the order. TypeScript enforces the structure at compile time.

---

## Objects

### Inline Type Annotations

```typescript
let user: { name: string; age: number; email: string } = {
  name: "Alice",
  age: 30,
  email: "alice@example.com"
};

user.age = 31;          // ✅ OK
user.phone = "555-1234"; // ❌ Error: Property 'phone' does not exist
```

### Optional Properties

```typescript
let user: { name: string; age: number; email?: string } = {
  name: "Bob",
  age: 25
  // email is optional
};

if (user.email) {
  console.log(user.email.toLowerCase());  // Safe - checked for undefined
}
```

### Readonly Properties

```typescript
let config: { readonly apiUrl: string; timeout: number } = {
  apiUrl: "https://api.example.com",
  timeout: 5000
};

config.timeout = 10000;     // ✅ OK
config.apiUrl = "https://..."; // ❌ Error: Cannot assign to 'apiUrl' because it is a read-only property
```

### Index Signatures (Dynamic Keys)

```typescript
let scores: { [student: string]: number } = {
  "Alice": 95,
  "Bob": 87,
  "Charlie": 92
};

scores["David"] = 88;  // ✅ OK
scores["Eve"] = "A+";  // ❌ Error: Type 'string' is not assignable to type 'number'
```

---

## Special Types

### `any` — The Escape Hatch

`any` disables all type checking. Use it sparingly.

```typescript
let anything: any = "hello";
anything = 42;
anything = { foo: "bar" };
anything.nonExistentMethod();  // No error, but will crash at runtime

// ❌ Don't do this
function doStuff(data: any) {
  return data.whatever();  // No safety
}
```

When is `any` acceptable?
- Migrating JavaScript to TypeScript incrementally
- Working with truly dynamic data (JSON from an API you don't control)
- Prototyping quickly (but refactor to proper types later)

> **Coming from JavaScript:** `any` is basically JavaScript. The whole point of TypeScript is to avoid `any`.

### `unknown` — The Safe `any`

`unknown` is like `any`, but forces you to check the type before using it.

```typescript
let value: unknown = "hello";

value.toUpperCase();  // ❌ Error: Object is of type 'unknown'

// ✅ Must narrow the type first
if (typeof value === "string") {
  console.log(value.toUpperCase());  // OK now
}
```

Use `unknown` for data you don't trust (API responses, user input):

```typescript
async function fetchData(url: string): Promise<unknown> {
  const response = await fetch(url);
  return response.json();  // We don't know what shape this is
}

const data = await fetchData("/api/user");

// ❌ Can't use data directly
// console.log(data.name);

// ✅ Validate first
if (typeof data === "object" && data !== null && "name" in data) {
  console.log((data as { name: string }).name);
}
```

### `void` — No Return Value

```typescript
function logMessage(message: string): void {
  console.log(message);
  // No return statement, or returns undefined
}

function save(): void {
  localStorage.setItem("key", "value");
  return;  // OK
  // return 42;  // ❌ Error: Type 'number' is not assignable to type 'void'
}
```

### `never` — This Never Returns

`never` represents values that never occur. It's used for functions that throw errors or run infinite loops.

```typescript
function throwError(message: string): never {
  throw new Error(message);
  // Function never reaches the end
}

function infiniteLoop(): never {
  while (true) {
    // ... runs forever
  }
}
```

`never` is also the type of impossible values:

```typescript
function handleValue(value: string | number) {
  if (typeof value === "string") {
    console.log(value.toUpperCase());
  } else if (typeof value === "number") {
    console.log(value.toFixed(2));
  } else {
    // value is type 'never' here - we've exhausted all possibilities
    const exhaustive: never = value;
  }
}
```

---

## Type Inference

TypeScript can infer types from values, so you don't always need explicit annotations.

```typescript
// ✅ Inferred as string
let message = "Hello";

// ✅ Inferred as number
let count = 42;

// ✅ Inferred as boolean
let isActive = true;

// ✅ Inferred as number[]
let numbers = [1, 2, 3, 4, 5];

// ✅ Inferred as (string | number)[]
let mixed = [1, "two", 3];
```

### When Inference Isn't Enough

```typescript
// ⚠️ Inferred as any[] - too vague
let items = [];

items.push("hello");  // Still any[]
items.push(42);       // Still any[]

// ✅ Explicitly annotate
let items2: string[] = [];
items2.push("hello");  // OK
items2.push(42);       // ❌ Error
```

### Function Return Type Inference

```typescript
// ✅ Return type inferred as number
function add(a: number, b: number) {
  return a + b;
}

// ✅ But explicit is clearer for public APIs
function subtract(a: number, b: number): number {
  return a - b;
}
```

Best practice: Infer types for local variables, but explicitly annotate function parameters and return types for clarity.

---

## Common Mistakes

### 1. Using `String` instead of `string`

```typescript
// ❌ Wrong - String is the JavaScript object wrapper
let name: String = "Alice";

// ✅ Correct - string is the primitive type
let name2: string = "Alice";
```

Same for `Number`, `Boolean`, `Object`. Always use lowercase primitives.

### 2. Forgetting `strictNullChecks`

Without `strict` mode, this compiles but crashes at runtime:

```typescript
function greet(name: string) {
  return name.toUpperCase();
}

greet(null);  // ❌ Runtime error: Cannot read property 'toUpperCase' of null
```

With `strict` mode, it's caught at compile time:

```typescript
greet(null);  // ❌ Compile error: Argument of type 'null' is not assignable to parameter of type 'string'
```

### 3. Confusing Tuples and Arrays

```typescript
// This is an array of numbers
let arr: number[] = [1, 2];
arr.push(3);  // ✅ OK - arrays can grow

// This is a tuple
let tuple: [number, number] = [1, 2];
tuple.push(3);  // ⚠️ TypeScript allows this (unfortunately), but you shouldn't do it
console.log(tuple);  // [1, 2, 3] - breaks the tuple contract
```

### 4. Overusing `any`

```typescript
// ❌ Defeats the purpose of TypeScript
function processData(data: any): any {
  return data.map((x: any) => x.value);
}

// ✅ Use proper types
function processData2(data: Array<{ value: number }>): number[] {
  return data.map(x => x.value);
}
```

---

## Practice Exercises

### Exercise 1: Primitive Types

Create a `user.ts` file and define variables with explicit type annotations:

1. `firstName` (string)
2. `lastName` (string)
3. `age` (number)
4. `isStudent` (boolean)
5. `graduationYear` (number or null)

Try assigning wrong types to each and see the errors.

### Exercise 2: Arrays and Tuples

1. Create an array of numbers representing test scores
2. Create a tuple representing a book: `[title, author, year, isAvailable]`
3. Create an array of the tuples from step 2 (a book catalog)

### Exercise 3: Objects

Define a `product` object with:
- `id` (number)
- `name` (string)
- `price` (number)
- `description` (optional string)
- `tags` (array of strings)

Try adding a property that doesn't exist. Try omitting a required property.

### Exercise 4: Unknown vs Any

Write two functions:

```typescript
function parseJsonAny(jsonString: string): any {
  return JSON.parse(jsonString);
}

function parseJsonUnknown(jsonString: string): unknown {
  return JSON.parse(jsonString);
}
```

Call both functions and try using the returned values. Notice the difference in type safety.

### Exercise 5: Type Inference Challenge

Determine what type TypeScript infers for each variable (don't run the code, just analyze):

```typescript
let a = 42;
let b = "hello";
let c = [1, 2, 3];
let d = [1, "two", 3];
let e = { name: "Alice", age: 30 };
let f = true;
let g;  // What type is this?
```

Then verify by hovering over variables in your editor.

---

## Next Steps

You now understand TypeScript's basic type system. In the next section, we'll explore **Functions and Interfaces** — how to type function signatures, parameters, and create reusable type structures.
