# Type System Deep Dive

## What You'll Learn

- How union and intersection types compose to model real domain logic
- Literal types and discriminated unions for exhaustive, type-safe branching
- Every narrowing technique: `typeof`, `instanceof`, `in`, and custom type guards
- The `never` type as a tool for compile-time exhaustiveness checks
- Why `unknown` exists and when `any` is actually acceptable

---

## Union and Intersection Types

Unions (`|`) say "one of these." Intersections (`&`) say "all of these at once." You already use unions constantly (`string | null`), but the real power is in combining them with interfaces.

```typescript
// Intersection: merge capabilities
type Timestamped = { createdAt: Date; updatedAt: Date };
type SoftDeletable = { deletedAt: Date | null };

type BaseEntity = Timestamped & SoftDeletable;

// Every entity now carries audit fields
interface User extends BaseEntity {
  id: string;
  email: string;
  role: "admin" | "member" | "viewer";
}
```

Intersections are not just for flat merging. They compose middleware-style layers:

```typescript
type WithPagination = { page: number; pageSize: number; total: number };
type WithSorting = { sortBy: string; sortOrder: "asc" | "desc" };

type PaginatedRequest = WithPagination & WithSorting;

function buildQuery(params: PaginatedRequest) {
  // params has page, pageSize, total, sortBy, sortOrder — all typed
  const offset = (params.page - 1) * params.pageSize;
  return { offset, limit: params.pageSize, order: [params.sortBy, params.sortOrder] };
}
```

> **Coming from JS:** In JavaScript you'd spread objects together and hope the keys don't clash. With intersections, the compiler catches conflicting property types at definition time, not at 2 AM in production.

---

## Literal Types

Literal types narrow a value to an exact constant. They are the foundation of discriminated unions.

```typescript
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

function request(method: HttpMethod, url: string, body?: unknown): Promise<Response> {
  // method is not just string — it's one of exactly five values
  return fetch(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Numeric literals work too
type HttpSuccessCode = 200 | 201 | 204;
type HttpErrorCode = 400 | 401 | 403 | 404 | 500;
type HttpStatusCode = HttpSuccessCode | HttpErrorCode;
```

Watch out for the widening trap:

```typescript
// This widens to string, not "GET"
let method = "GET";
// request(method, "/api/users"); // Error: string is not assignable to HttpMethod

// Fix 1: const declaration
const method1 = "GET"; // type is "GET"

// Fix 2: as const assertion
let method2 = "GET" as const; // type is "GET"

// Fix 3: explicit annotation
let method3: HttpMethod = "GET";
```

---

## Discriminated Unions

This is the single most useful pattern in TypeScript for modeling domain logic. A shared literal field (the "discriminant") lets the compiler narrow the full union member.

```typescript
// API response modeling — the real-world use case you'll use daily
type ApiResponse<T> =
  | { status: "success"; data: T; timestamp: number }
  | { status: "error"; error: { code: string; message: string }; retryable: boolean }
  | { status: "loading" }
  | { status: "idle" };

function handleUserResponse(response: ApiResponse<User>) {
  switch (response.status) {
    case "success":
      // TypeScript knows: response has .data (User) and .timestamp
      console.log(`Fetched ${response.data.email} at ${response.timestamp}`);
      break;

    case "error":
      // TypeScript knows: response has .error and .retryable
      if (response.retryable) {
        scheduleRetry();
      }
      logger.error(response.error.code, response.error.message);
      break;

    case "loading":
      showSpinner();
      break;

    case "idle":
      // nothing to do
      break;
  }
}
```

A more complex example — payment processing:

```typescript
type PaymentEvent =
  | { type: "charge.created"; amount: number; currency: string; customerId: string }
  | { type: "charge.succeeded"; chargeId: string; receiptUrl: string }
  | { type: "charge.failed"; chargeId: string; failureCode: string; failureMessage: string }
  | { type: "refund.created"; chargeId: string; amount: number; reason: string }
  | { type: "dispute.opened"; chargeId: string; amount: number; evidence_due_by: Date };

async function processWebhook(event: PaymentEvent): Promise<void> {
  switch (event.type) {
    case "charge.created":
      await db.charges.insert({
        amount: event.amount,
        currency: event.currency,
        customerId: event.customerId,
      });
      break;

    case "charge.succeeded":
      await notifyCustomer(event.receiptUrl);
      break;

    case "charge.failed":
      await alertOpsTeam(event.failureCode, event.failureMessage);
      break;

    case "refund.created":
      await db.refunds.insert({ chargeId: event.chargeId, amount: event.amount });
      break;

    case "dispute.opened":
      await createDisputeTask(event.chargeId, event.evidence_due_by);
      break;
  }
}
```

> **Coming from JS:** You have probably written `if (response.type === 'error')` a thousand times. The difference is that TypeScript *proves* you handled every case and gives you autocomplete on the fields that exist for that specific case. No more `response.data` when it's actually an error.

---

## Type Narrowing

TypeScript tracks control flow to narrow types automatically. Here are all the techniques.

### `typeof` — primitives only

```typescript
function formatValue(value: string | number | boolean): string {
  if (typeof value === "string") {
    return value.toUpperCase(); // narrowed to string
  }
  if (typeof value === "number") {
    return value.toFixed(2); // narrowed to number
  }
  return value ? "Yes" : "No"; // narrowed to boolean
}
```

### `instanceof` — class hierarchies

```typescript
class DatabaseError extends Error {
  constructor(public query: string, message: string) {
    super(message);
  }
}

class ValidationError extends Error {
  constructor(public fields: Record<string, string>) {
    super("Validation failed");
  }
}

function handleServiceError(error: DatabaseError | ValidationError | Error) {
  if (error instanceof DatabaseError) {
    logger.error("DB query failed", { query: error.query }); // .query accessible
  } else if (error instanceof ValidationError) {
    logger.warn("Validation", { fields: error.fields }); // .fields accessible
  } else {
    logger.error("Unknown error", { message: error.message });
  }
}
```

### `in` operator — checking for property existence

```typescript
type WebSocketMessage =
  | { channel: string; data: unknown }
  | { error: string; code: number };

function processMessage(msg: WebSocketMessage) {
  if ("error" in msg) {
    // narrowed to the error variant
    console.error(`[${msg.code}] ${msg.error}`);
    return;
  }
  // narrowed to the data variant
  routeToChannel(msg.channel, msg.data);
}
```

### Custom Type Guards — the power tool

When built-in narrowing is not enough, write a function that returns `paramName is Type`:

```typescript
interface AuthenticatedRequest {
  user: { id: string; permissions: string[] };
  headers: Record<string, string>;
  body: unknown;
}

interface AnonymousRequest {
  headers: Record<string, string>;
  body: unknown;
}

type IncomingRequest = AuthenticatedRequest | AnonymousRequest;

function isAuthenticated(req: IncomingRequest): req is AuthenticatedRequest {
  return "user" in req && req.user !== null && typeof req.user.id === "string";
}

function handleRequest(req: IncomingRequest) {
  if (isAuthenticated(req)) {
    // req is AuthenticatedRequest — full access to req.user
    if (req.user.permissions.includes("admin")) {
      return handleAdminRequest(req);
    }
  }
  return handlePublicRequest(req);
}
```

Type guards for filtering arrays — one of the most common real uses:

```typescript
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function isOk<T>(result: Result<T>): result is { ok: true; value: T } {
  return result.ok;
}

const results: Result<User>[] = await Promise.all(userIds.map(fetchUser));

// Without type guard: (Result<User>)[]
// With type guard: { ok: true; value: User }[]
const users = results.filter(isOk).map((r) => r.value);
```

---

## The `never` Type

`never` is the type of values that *cannot exist*. It is the bottom type. Its killer feature: exhaustiveness checking.

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rectangle"; width: number; height: number }
  | { kind: "triangle"; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "rectangle":
      return shape.width * shape.height;
    case "triangle":
      return (shape.base * shape.height) / 2;
    default:
      // If you add a new shape to the union and forget a case,
      // this line will produce a compile error
      const _exhaustive: never = shape;
      return _exhaustive;
  }
}
```

Build a reusable helper for this pattern:

```typescript
function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${JSON.stringify(value)}`);
}

// Usage in any switch
function handleEvent(event: PaymentEvent): void {
  switch (event.type) {
    case "charge.created": /* ... */ break;
    case "charge.succeeded": /* ... */ break;
    case "charge.failed": /* ... */ break;
    case "refund.created": /* ... */ break;
    case "dispute.opened": /* ... */ break;
    default:
      assertNever(event); // compile error if a case is missing
  }
}
```

---

## `unknown` vs `any`

`any` disables the type checker. `unknown` forces you to narrow before use.

```typescript
// any: the escape hatch — type checker is silent
function dangerousParseAny(raw: string): any {
  return JSON.parse(raw);
}
const data1 = dangerousParseAny('{"x":1}');
data1.whatever.you.want; // no error, no safety, runtime explosion

// unknown: the safe alternative — must narrow before use
function safeParse(raw: string): unknown {
  return JSON.parse(raw);
}
const data2 = safeParse('{"x":1}');
// data2.x; // Error: Object is of type 'unknown'

// You must narrow first
if (typeof data2 === "object" && data2 !== null && "x" in data2) {
  console.log((data2 as { x: number }).x);
}
```

A practical pattern — typed JSON parsing with validation:

```typescript
interface Config {
  port: number;
  host: string;
  debug: boolean;
}

function isConfig(value: unknown): value is Config {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.port === "number" &&
    typeof obj.host === "string" &&
    typeof obj.debug === "boolean"
  );
}

function loadConfig(filePath: string): Config {
  const raw: unknown = JSON.parse(readFileSync(filePath, "utf-8"));
  if (!isConfig(raw)) {
    throw new Error(`Invalid config file: ${filePath}`);
  }
  return raw; // narrowed to Config
}
```

> **Coming from JS:** `JSON.parse` returns `any` by default. In strict TypeScript codebases, wrap it to return `unknown` and validate the shape. Libraries like Zod automate this, but understanding the underlying narrowing is essential.

---

## When `any` is acceptable

There are legitimate uses:

```typescript
// 1. Migration: gradually typing a large JS codebase
// @ts-expect-error — temporary during migration
const legacyModule: any = require("./legacy-untyped-module");

// 2. Generic constraints where the type truly doesn't matter
type AnyFunction = (...args: any[]) => any;

// 3. Third-party library types that are wrong or missing
declare module "poorly-typed-lib" {
  export function doStuff(input: any): any;
}
```

The rule: every `any` in your codebase should be either temporary (with a tracking comment) or at a boundary you control.

---

## Mini-Exercise

Build a `Result` type and processor for a notification system:

1. Define a discriminated union `NotificationResult` with four variants:
   - `sent` with `messageId: string` and `channel: "email" | "sms" | "push"`
   - `queued` with `queuePosition: number` and `estimatedDelivery: Date`
   - `failed` with `errorCode: string` and `retryable: boolean`
   - `rate_limited` with `retryAfterMs: number`

2. Write a function `processNotificationResult(result: NotificationResult): string` that handles every variant and returns a human-readable status message. Use `assertNever` in the default case.

3. Write a custom type guard `isRetryable(result: NotificationResult): result is ...` that narrows to only the variants where a retry makes sense (`failed` with `retryable: true`, or `rate_limited`).

4. Given an array of `NotificationResult[]`, filter to only retryable results with full type safety.
