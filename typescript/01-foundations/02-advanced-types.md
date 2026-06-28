# Advanced Types

## What You'll Learn

- Mapped types: transforming existing types into new ones programmatically
- Conditional types: branching logic at the type level with `extends`
- Template literal types: string manipulation that the compiler enforces
- The `infer` keyword: extracting types from within other types
- Recursive types: modeling nested and self-referential structures

---

## Mapped Types

Mapped types iterate over the keys of an existing type and produce a new type. Think of them as `Array.map()` but for type definitions.

### The syntax

```typescript
type MappedType<T> = {
  [K in keyof T]: SomeTransformation<T[K]>;
};
```

### Making all properties nullable

```typescript
type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  bio: string;
}

// Form state where any field can be cleared
type EditableProfile = Nullable<UserProfile>;
// { name: string | null; email: string | null; avatarUrl: string | null; bio: string | null }
```

### Modifier manipulation

You can add or remove `readonly` and `?` modifiers:

```typescript
// Make every property required and mutable (strip readonly and optional)
type Mutable<T> = {
  -readonly [K in keyof T]-?: T[K];
};

interface FrozenConfig {
  readonly apiUrl: string;
  readonly timeout?: number;
  readonly retries?: number;
}

type WritableConfig = Mutable<FrozenConfig>;
// { apiUrl: string; timeout: number; retries: number }
```

### Key remapping with `as`

Introduced in TS 4.1, this lets you transform key names during mapping:

```typescript
// Create getter methods for each property
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
}

type ConfigGetters = Getters<DatabaseConfig>;
// { getHost: () => string; getPort: () => number; getDatabase: () => string }
```

Filter out keys by remapping to `never`:

```typescript
// Keep only string-valued properties
type StringPropertiesOnly<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

interface MixedEntity {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  isActive: boolean;
  slug: string;
}

type StringFields = StringPropertiesOnly<MixedEntity>;
// { name: string; email: string; slug: string }
```

> **Coming from JS:** Mapped types replace the runtime patterns where you'd `Object.keys(obj).reduce(...)` to transform object shapes. The difference: this happens at compile time with zero runtime cost, and every consumer of the transformed type gets full autocomplete.

---

## Conditional Types

Conditional types follow the pattern `T extends U ? X : Y`. They are `if/else` at the type level.

### Basic branching

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">; // true
type B = IsString<42>;       // false
```

### Distributive behavior over unions

When `T` is a union, the conditional distributes over each member:

```typescript
type NonNullableCustom<T> = T extends null | undefined ? never : T;

type Input = string | null | number | undefined;
type Clean = NonNullableCustom<Input>;
// Distributes: (string extends null | undefined ? never : string) | (null extends ...) | ...
// Result: string | number
```

### Practical: extracting return types of async functions

```typescript
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type A = UnwrapPromise<Promise<User>>;    // User
type B = UnwrapPromise<Promise<string[]>>; // string[]
type C = UnwrapPromise<number>;            // number (not a promise, returned as-is)
```

### Narrowing function signatures

```typescript
// Only accept objects that have a specific method
type HasSerialize<T> = T extends { serialize(): string } ? T : never;

interface CacheableUser {
  id: string;
  name: string;
  serialize(): string;
}

interface TransientSession {
  token: string;
}

function cacheEntity<T>(entity: HasSerialize<T>): void {
  // ...
}
```

---

## Template Literal Types

TypeScript can manipulate strings at the type level. This is not a toy feature — it enables typed routing, event systems, and API contracts.

### Typed route parameters

```typescript
// Extract parameter names from a route pattern
type ExtractRouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type UserRouteParams = ExtractRouteParams<"/users/:userId/posts/:postId">;
// "userId" | "postId"

type RouteHandler<T extends string> = (
  params: Record<ExtractRouteParams<T>, string>
) => Response;

const handleUserPost: RouteHandler<"/users/:userId/posts/:postId"> = (params) => {
  // params is { userId: string; postId: string } — fully typed
  const { userId, postId } = params;
  return new Response(`User ${userId}, Post ${postId}`);
};
```

### Typed event emitter keys

```typescript
type EventName<T extends string> = `${T}:${"created" | "updated" | "deleted"}`;

type UserEvents = EventName<"user">;
// "user:created" | "user:updated" | "user:deleted"

type OrderEvents = EventName<"order">;
// "order:created" | "order:updated" | "order:deleted"

type AllEvents = UserEvents | OrderEvents;
```

### Built-in string manipulation types

```typescript
type Upper = Uppercase<"hello">;       // "HELLO"
type Lower = Lowercase<"HELLO">;       // "hello"
type Cap   = Capitalize<"hello">;      // "Hello"
type Uncap = Uncapitalize<"Hello">;    // "hello"

// Practical: convert camelCase keys to SCREAMING_SNAKE_CASE for env vars
// (simplified — real conversion would need more recursion)
type EnvVarName<T extends string> = Uppercase<T>;

type DbHostEnv = EnvVarName<"databaseHost">; // "DATABASEHOST"
```

### CSS-style typed utilities

```typescript
type CSSUnit = "px" | "em" | "rem" | "vh" | "vw" | "%";
type CSSValue = `${number}${CSSUnit}`;

function setWidth(element: HTMLElement, width: CSSValue) {
  element.style.width = width;
}

setWidth(document.body, "100vw");   // ok
setWidth(document.body, "16px");    // ok
// setWidth(document.body, "wide"); // Error
```

> **Coming from JS:** In JavaScript, route params are parsed at runtime with regex and you get back untyped strings. Template literal types let TypeScript parse the route pattern *at compile time* and give you a typed params object. Typos in param names become compile errors.

---

## The `infer` Keyword

`infer` declares a type variable *inside* a conditional type that TypeScript will figure out for you. It extracts types from compound structures.

### Extracting function parameter types

```typescript
type FirstArg<T> = T extends (first: infer A, ...rest: any[]) => any ? A : never;

type Handler = (req: Request, res: Response) => void;
type ReqType = FirstArg<Handler>; // Request
```

### Extracting array element types

```typescript
type ElementOf<T> = T extends (infer E)[] ? E : never;

type Item = ElementOf<string[]>;  // string
type User = ElementOf<User[]>;    // User
```

### Extracting deeply nested types

```typescript
type ApiEnvelope<T> = {
  data: T;
  meta: { requestId: string; duration: number };
};

type UnwrapEnvelope<T> = T extends ApiEnvelope<infer D> ? D : never;

type UserListResponse = ApiEnvelope<{ users: User[]; total: number }>;
type Payload = UnwrapEnvelope<UserListResponse>;
// { users: User[]; total: number }
```

### Multiple `infer` positions

```typescript
type ParseRoute<T extends string> =
  T extends `${infer Method} ${infer Path}`
    ? { method: Method; path: Path }
    : never;

type Route = ParseRoute<"GET /api/users">;
// { method: "GET"; path: "/api/users" }
```

### Extracting constructor instance type

```typescript
type InstanceOf<T> = T extends new (...args: any[]) => infer I ? I : never;

class UserService {
  findAll(): User[] { return []; }
}

type Svc = InstanceOf<typeof UserService>; // UserService
```

---

## Recursive Types

Types that reference themselves. Essential for modeling trees, nested configs, and deep transformations.

### DeepPartial — the classic

```typescript
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object
    ? T[K] extends Function
      ? T[K]                    // don't recurse into functions
      : DeepPartial<T[K]>      // recurse into nested objects
    : T[K];
};

interface AppConfig {
  server: {
    host: string;
    port: number;
    ssl: {
      cert: string;
      key: string;
      ca: string[];
    };
  };
  database: {
    host: string;
    port: number;
    credentials: {
      username: string;
      password: string;
    };
  };
  features: {
    enableBeta: boolean;
    maxUploadSize: number;
  };
}

// Override any subset of config at any depth
function mergeConfig(base: AppConfig, overrides: DeepPartial<AppConfig>): AppConfig {
  // deep merge implementation
  return deepMerge(base, overrides) as AppConfig;
}

// Valid: override only the nested ssl.cert
mergeConfig(defaultConfig, {
  server: {
    ssl: {
      cert: "/new/path/cert.pem",
    },
  },
});
```

### DeepReadonly

```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? T[K] extends Function
      ? T[K]
      : DeepReadonly<T[K]>
    : T[K];
};

type FrozenConfig = DeepReadonly<AppConfig>;
// Every nested property is readonly — no accidental mutation anywhere
```

### JSON-safe types

```typescript
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

// Recursive: JSONValue references itself in both array and object forms.
// This precisely models what JSON.parse can return.

function safeJsonParse(raw: string): JSONValue {
  return JSON.parse(raw) as JSONValue;
}
```

### Typed deep property access paths

```typescript
type PathKeys<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]:
        | `${Prefix}${K}`
        | PathKeys<T[K], `${Prefix}${K}.`>;
    }[keyof T & string]
  : never;

type ConfigPaths = PathKeys<AppConfig>;
// "server" | "server.host" | "server.port" | "server.ssl" | "server.ssl.cert" | ...

function getConfigValue(config: AppConfig, path: ConfigPaths): unknown {
  return path.split(".").reduce((obj: any, key) => obj[key], config);
}
```

> **Coming from JS:** Recursive types look intimidating, but they solve the same problems you have been solving with recursive runtime functions — like `lodash.get` or deep clone. The difference is the compiler tracks the recursion and gives you autocomplete at every nesting level.

---

## Combining Techniques

Real-world types often combine mapped, conditional, template literal, and recursive types together.

### Auto-typed API client from route definitions

```typescript
interface ApiRoutes {
  "GET /users": { response: User[]; query: { role?: string } };
  "GET /users/:id": { response: User; params: { id: string } };
  "POST /users": { response: User; body: { name: string; email: string } };
  "PUT /users/:id": { response: User; params: { id: string }; body: Partial<User> };
  "DELETE /users/:id": { response: void; params: { id: string } };
}

type ExtractMethod<T extends string> = T extends `${infer M} ${string}` ? M : never;
type ExtractPath<T extends string> = T extends `${string} ${infer P}` ? P : never;

type RoutesForMethod<M extends string> = {
  [K in keyof ApiRoutes as ExtractMethod<K & string> extends M ? ExtractPath<K & string> : never]: ApiRoutes[K];
};

type GetRoutes = RoutesForMethod<"GET">;
// { "/users": { response: User[]; query: { role?: string } }; "/users/:id": { response: User; params: { id: string } } }
```

---

## Mini-Exercise

1. Create a `DeepNullable<T>` recursive mapped type that makes every property at every nesting level `T[K] | null`, but leaves functions untouched.

2. Create a conditional type `IsArray<T>` that returns `true` if `T` is any array type, `false` otherwise. Verify it works with `string[]`, `readonly number[]`, and `never[]`.

3. Using template literal types, create a type `CrudEndpoints<Resource extends string>` that generates:
   - `"GET /resources"`
   - `"GET /resources/:id"`
   - `"POST /resources"`
   - `"PUT /resources/:id"`
   - `"DELETE /resources/:id"`

   where `resources` is the pluralized input (just append "s" — don't worry about irregular plurals). So `CrudEndpoints<"user">` produces `"GET /users"`, `"GET /users/:id"`, etc.

4. Using `infer`, create `UnwrapArray<T>` that extracts the element type from `T[]`, the element type from `Promise<T[]>`, and returns `T` unchanged if it is neither. Test with `Promise<User[]>`, `string[]`, and `number`.
