# Introduction to Generics

## What You'll Learn

- What generics are and why they're essential for reusable code
- How to write generic functions
- How to create generic interfaces and types
- Basic generic constraints to restrict type parameters
- Common patterns you'll see in real codebases

---

## What Are Generics?

Generics let you write code that works with **multiple types** while maintaining type safety. Instead of writing the same function for `string`, `number`, `boolean`, etc., you write it once with a **type parameter**.

Think of generics as "type variables" — placeholders for types that get filled in when the function is called.

### The Problem Generics Solve

Without generics, you'd either lose type safety or write duplicate code:

```typescript
// ❌ Option 1: Use any (no type safety)
function getFirstItemAny(arr: any[]): any {
  return arr[0];
}

const num = getFirstItemAny([1, 2, 3]);  // num is any, not number
const str = getFirstItemAny(["a", "b"]); // str is any, not string
num.toUpperCase();  // No error, but crashes at runtime

// ❌ Option 2: Write duplicate functions
function getFirstNumber(arr: number[]): number {
  return arr[0];
}

function getFirstString(arr: string[]): string {
  return arr[0];
}

function getFirstBoolean(arr: boolean[]): boolean {
  return arr[0];
}
// ... this is tedious and doesn't scale
```

### The Solution: Generics

```typescript
// ✅ Generic function - works with any type
function getFirstItem<T>(arr: T[]): T {
  return arr[0];
}

const num = getFirstItem([1, 2, 3]);       // num is number
const str = getFirstItem(["a", "b"]);      // str is string
const bool = getFirstItem([true, false]);  // bool is boolean

num.toUpperCase();  // ❌ Error caught: number has no toUpperCase
```

> **Coming from JavaScript:** In JS, you'd write one function that accepts any array. Generics give you the same flexibility with compile-time type checking.

---

## Generic Function Syntax

The basic syntax uses angle brackets `<T>` to declare a type parameter:

```typescript
function identity<T>(arg: T): T {
  return arg;
}

// TypeScript infers T = number
const num = identity(42);

// TypeScript infers T = string
const str = identity("hello");

// You can also specify explicitly
const bool = identity<boolean>(true);
```

### Why Use `T`?

`T` stands for "Type" and is the convention for a single type parameter. You can use any valid identifier:

```typescript
// Common conventions
function map<T, U>(arr: T[], fn: (item: T) => U): U[] {
  return arr.map(fn);
}

function pair<K, V>(key: K, value: V): [K, V] {
  return [key, value];
}
```

- `T`, `U`, `V` — generic types (T = Type, U/V = next letters)
- `K`, `V` — Key/Value pairs (maps, dictionaries)
- `E` — Element (arrays, lists)
- `R` — Result/Return type

---

## Generic Functions in Practice

### Wrapping Values

```typescript
function wrapInArray<T>(value: T): T[] {
  return [value];
}

const nums = wrapInArray(42);        // number[]
const strs = wrapInArray("hello");   // string[]
const objs = wrapInArray({ id: 1 }); // { id: number }[]
```

### Array Operations

```typescript
function lastItem<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

const lastNum = lastItem([1, 2, 3]);      // number | undefined
const lastStr = lastItem(["a", "b", "c"]); // string | undefined
```

### Type Transformation

```typescript
function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

toArray(5);           // number[]
toArray([5, 10]);     // number[]
toArray("hello");     // string[]
toArray(["a", "b"]);  // string[]
```

### Multiple Type Parameters

```typescript
function merge<T, U>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}

const merged = merge(
  { name: "Alice" },
  { age: 30 }
);
// merged has type { name: string } & { age: number }
// which simplifies to { name: string; age: number }

console.log(merged.name);  // ✅ OK
console.log(merged.age);   // ✅ OK
```

---

## Generic Interfaces

Interfaces can also use type parameters:

```typescript
interface Box<T> {
  value: T;
}

const numberBox: Box<number> = { value: 42 };
const stringBox: Box<string> = { value: "hello" };
const userBox: Box<{ id: number; name: string }> = {
  value: { id: 1, name: "Alice" }
};
```

### Generic API Response

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

const userResponse: ApiResponse<User> = {
  success: true,
  data: { id: 1, name: "Alice", email: "alice@example.com" },
  message: "User fetched successfully",
  timestamp: Date.now()
};

const usersResponse: ApiResponse<User[]> = {
  success: true,
  data: [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" }
  ],
  message: "Users fetched successfully",
  timestamp: Date.now()
};
```

### Generic Key-Value Store

```typescript
interface KeyValueStore<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
}

class StringNumberMap implements KeyValueStore<string, number> {
  private store = new Map<string, number>();

  get(key: string): number | undefined {
    return this.store.get(key);
  }

  set(key: string, value: number): void {
    this.store.set(key, value);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }
}
```

---

## Generic Type Aliases

```typescript
type Result<T> = { success: true; data: T } | { success: false; error: string };

function divide(a: number, b: number): Result<number> {
  if (b === 0) {
    return { success: false, error: "Division by zero" };
  }
  return { success: true, data: a / b };
}

const result = divide(10, 2);
if (result.success) {
  console.log(result.data);  // Type is number
} else {
  console.log(result.error); // Type is string
}
```

---

## Generic Constraints

Sometimes you need to restrict what types `T` can be. Use the `extends` keyword:

### Constraint Example

```typescript
// ❌ This doesn't work - T might not have a length property
function logLength<T>(item: T): void {
  console.log(item.length);  // Error: Property 'length' does not exist on type 'T'
}

// ✅ Constrain T to types that have a length property
interface HasLength {
  length: number;
}

function logLength2<T extends HasLength>(item: T): void {
  console.log(item.length);  // ✅ OK now
}

logLength2("hello");        // string has length
logLength2([1, 2, 3]);      // array has length
logLength2({ length: 10 }); // object with length property
logLength2(42);             // ❌ Error: number doesn't have length
```

### Constraining to Object Keys

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: "Alice", email: "alice@example.com" };

const name = getProperty(user, "name");   // Type is string
const id = getProperty(user, "id");       // Type is number
const email = getProperty(user, "email"); // Type is string

getProperty(user, "age");  // ❌ Error: "age" is not a key of user
```

> **Coming from JavaScript:** In JS, you'd just write `obj[key]` and hope the key exists. TypeScript ensures the key is valid at compile time.

### Extending Multiple Constraints

```typescript
interface Identifiable {
  id: number;
}

interface Timestamped {
  createdAt: Date;
}

function logEntity<T extends Identifiable & Timestamped>(entity: T): void {
  console.log(`Entity ${entity.id} created at ${entity.createdAt}`);
}

logEntity({ id: 1, createdAt: new Date() });  // ✅ OK
logEntity({ id: 1 });                          // ❌ Error: missing createdAt
```

---

## Real-World Generic Patterns

### Pagination Helper

```typescript
interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function paginate<T>(
  allItems: T[],
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  const total = allItems.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const data = allItems.slice(start, start + pageSize);

  return { data, page, pageSize, total, totalPages };
}

const users = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Charlie" }
];

const page1 = paginate(users, 1, 2);
// PaginatedResponse<{ id: number; name: string }>
```

### Generic Filter Function

```typescript
function filter<T>(arr: T[], predicate: (item: T) => boolean): T[] {
  return arr.filter(predicate);
}

const numbers = [1, 2, 3, 4, 5];
const evens = filter(numbers, n => n % 2 === 0);  // number[]

const users = [
  { id: 1, name: "Alice", isActive: true },
  { id: 2, name: "Bob", isActive: false }
];
const activeUsers = filter(users, u => u.isActive);
// { id: number; name: string; isActive: boolean }[]
```

### Promise Wrappers

```typescript
async function fetchData<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();
  return data as T;  // Unsafe cast - you'd validate this in real code
}

interface User {
  id: number;
  name: string;
}

const user = await fetchData<User>("/api/user/1");
// user has type User
```

---

## Common Mistakes

### 1. Forgetting to Constrain When Needed

```typescript
// ❌ Error: T might not have toUpperCase
function shout<T>(value: T): string {
  return value.toUpperCase();
}

// ✅ Constrain to string
function shout2<T extends string>(value: T): string {
  return value.toUpperCase();
}

// ✅ Or just use string directly (no need for generic here)
function shout3(value: string): string {
  return value.toUpperCase();
}
```

### 2. Overusing Generics

```typescript
// ❌ Unnecessary generic
function addNumbers<T>(a: T, b: T): T {
  return (a as any) + (b as any);
}

// ✅ Just use number
function addNumbers2(a: number, b: number): number {
  return a + b;
}
```

Only use generics when you need to preserve type relationships across parameters or return values.

### 3. Not Providing Enough Context

```typescript
// ⚠️ TypeScript can't infer T here
function createArray<T>(): T[] {
  return [];
}

const arr = createArray();  // any[] - not helpful

// ✅ Provide context
const arr2 = createArray<number>();  // number[]

// ✅ Or use a parameter so T can be inferred
function createArrayFrom<T>(item: T): T[] {
  return [item];
}

const arr3 = createArrayFrom(42);  // number[] - inferred
```

---

## Practice Exercises

### Exercise 1: Generic Functions

Write these generic functions:

1. `swap<T, U>(tuple: [T, U]): [U, T]` — swaps tuple elements
2. `first<T>(arr: T[]): T | undefined` — returns first element or undefined
3. `pluck<T, K extends keyof T>(arr: T[], key: K): T[K][]` — extracts property from array of objects

### Exercise 2: Generic Interfaces

Create a generic interface `Pair<T, U>` with properties `first: T` and `second: U`. Then create instances:

1. A pair of numbers
2. A pair where first is string and second is number
3. A pair of objects

### Exercise 3: Constrained Generics

Write a function `sortByProperty<T>(arr: T[], key: keyof T): T[]` that sorts an array of objects by a given property. Constraint: the property value must be comparable (number or string).

### Exercise 4: Real-World Generic

Create a `Cache<K, V>` class with:
- `set(key: K, value: V, ttl?: number): void`
- `get(key: K): V | undefined`
- `has(key: K): boolean`
- `delete(key: K): boolean`

Implement basic caching logic (you can skip TTL expiration logic).

### Exercise 5: Type Inference Challenge

What types are inferred for `result` in each case?

```typescript
function identity<T>(value: T): T {
  return value;
}

const result1 = identity(42);
const result2 = identity("hello");
const result3 = identity([1, 2, 3]);
const result4 = identity({ id: 1, name: "Alice" });
```

---

## Next Steps

You now understand the basics of generics — one of TypeScript's most powerful features. In the next section, we'll explore **Everyday Types** like union types, literal types, type aliases, and type assertions that you'll use constantly in real codebases.
