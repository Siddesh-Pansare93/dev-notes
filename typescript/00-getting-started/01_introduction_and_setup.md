# Introduction and Setup

## What You'll Learn

- What TypeScript is and why it exists
- How to install TypeScript using npm, yarn, or pnpm
- How to configure your first TypeScript project with `tsconfig.json`
- How to compile and run your first TypeScript file
- Essential compiler options every beginner should know

---

## What is TypeScript?

TypeScript is JavaScript with syntax for types. It's a superset of JavaScript, which means **all valid JavaScript is valid TypeScript**. TypeScript adds optional type annotations that get checked at compile time, then compiles down to plain JavaScript that runs anywhere JS runs.

```typescript
// JavaScript
function greet(name) {
  return "Hello, " + name;
}

// TypeScript - same code with types
function greet(name: string): string {
  return "Hello, " + name;
}

greet("Alice");     // ✅ Works
greet(42);          // ❌ Error: Argument of type 'number' is not assignable to parameter of type 'string'
```

> **Coming from JavaScript:** You don't need to rewrite your code to adopt TypeScript. Start by renaming `.js` files to `.ts`, then gradually add type annotations where they help most.

---

## Why Use TypeScript?

### 1. Catch Errors Before Runtime

```javascript
// JavaScript - this blows up at runtime
const user = { name: "Bob" };
console.log(user.email.toLowerCase()); // TypeError: Cannot read property 'toLowerCase' of undefined
```

```typescript
// TypeScript - caught at compile time
const user = { name: "Bob" };
console.log(user.email.toLowerCase()); // ❌ Property 'email' does not exist on type '{ name: string; }'
```

### 2. Better Editor Support

TypeScript powers IntelliSense (autocomplete, inline docs, go-to-definition) even for plain JavaScript libraries. VS Code uses TypeScript under the hood.

### 3. Self-Documenting Code

```typescript
// Which is clearer?

// JavaScript
function calculateDiscount(price, customerType, promoCode) {
  // ... what types do these accept?
}

// TypeScript
function calculateDiscount(
  price: number,
  customerType: "new" | "returning" | "vip",
  promoCode?: string
): number {
  // crystal clear what goes in and what comes out
}
```

### 4. Refactor with Confidence

Rename a variable or change a function signature — TypeScript instantly tells you every place that needs updating across your entire codebase.

---

## Installation

TypeScript is a Node.js package. You need Node.js installed first (check with `node -v`).

### Using npm (comes with Node.js)

```bash
# Install globally (not recommended for projects)
npm install -g typescript

# Install as a dev dependency (recommended)
npm install --save-dev typescript
```

### Using yarn

```bash
# Global
yarn global add typescript

# Local (recommended)
yarn add --dev typescript
```

### Using pnpm (faster, saves disk space)

```bash
# Global
pnpm add -g typescript

# Local (recommended)
pnpm add -D typescript
```

Verify installation:

```bash
# If installed globally
tsc --version

# If installed locally
npx tsc --version
```

You should see something like `Version 5.9.3`.

> **Best Practice:** Always install TypeScript locally per-project. This ensures everyone on your team uses the same version and avoids "it works on my machine" issues.

---

## Your First TypeScript File

Create a new directory and initialize a Node.js project:

```bash
mkdir my-first-ts-project
cd my-first-ts-project
npm init -y
npm install --save-dev typescript
```

Create `hello.ts`:

```typescript
function greet(name: string): string {
  return `Hello, ${name}!`;
}

const message = greet("TypeScript");
console.log(message);

// Try uncommenting this to see a type error:
// const badMessage = greet(999);
```

Compile it:

```bash
npx tsc hello.ts
```

This creates `hello.js`:

```javascript
function greet(name) {
    return "Hello, ".concat(name, "!");
}
var message = greet("TypeScript");
console.log(message);
```

Run the compiled JavaScript:

```bash
node hello.js
```

Output: `Hello, TypeScript!`

> **Coming from JavaScript:** Notice the types (`string`) disappear in the compiled output. TypeScript types exist only at compile time for checking — they have zero runtime overhead.

---

## Configuring TypeScript with `tsconfig.json`

Instead of passing compiler options on the command line every time, create a `tsconfig.json` file to configure your project.

Generate a starter config:

```bash
npx tsc --init
```

This creates a `tsconfig.json` with sensible defaults and lots of commented-out options. Here's a minimal beginner-friendly config:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

Now organize your project:

```
my-first-ts-project/
├── src/
│   └── hello.ts
├── dist/              (compiled output)
├── package.json
└── tsconfig.json
```

Move `hello.ts` to `src/` and run:

```bash
npx tsc
```

The compiled JavaScript appears in `dist/hello.js`. Run it:

```bash
node dist/hello.js
```

---

## Essential Compiler Options Explained

### `target`

Which JavaScript version to compile to. Modern Node.js supports ES2020+. For browsers, check [caniuse.com](https://caniuse.com/).

```json
"target": "ES2020"  // async/await, optional chaining, nullish coalescing
"target": "ES5"     // ancient browsers (IE11)
```

### `module`

Which module system to use. For Node.js, use `commonjs`. For modern projects with ESM, use `esnext` or `nodenext`.

```json
"module": "commonjs"  // require/module.exports (Node.js default)
"module": "esnext"    // import/export (modern)
```

### `strict`

**Always use this.** It enables all strict type-checking options. You can start with `strict: false` and enable individual checks, but you'll regret it later.

```json
"strict": true
```

This enables:
- `noImplicitAny` — variables must have a type (inferred or explicit)
- `strictNullChecks` — `null` and `undefined` are not valid for every type
- `strictFunctionTypes` — stricter function parameter checking
- `strictPropertyInitialization` — class properties must be initialized
- ...and more

### `outDir` and `rootDir`

Where to put compiled files and where to find source files.

```json
"outDir": "./dist",   // compiled JS goes here
"rootDir": "./src"    // TypeScript source files live here
```

### `esModuleInterop`

Makes importing CommonJS modules easier. Always turn this on.

```json
"esModuleInterop": true
```

Without it:

```typescript
import * as express from "express";  // awkward
```

With it:

```typescript
import express from "express";  // natural
```

### `skipLibCheck`

Skip type checking of library declaration files (`.d.ts`). Speeds up compilation. Usually safe to enable.

```json
"skipLibCheck": true
```

### `forceConsistentCasingInFileNames`

Prevents case-sensitivity bugs (Windows vs. Linux). Always enable.

```json
"forceConsistentCasingInFileNames": true
```

---

## Watch Mode for Development

Recompiling manually every time is tedious. Use watch mode:

```bash
npx tsc --watch
```

Now TypeScript recompiles automatically whenever you save a `.ts` file.

For running the compiled code automatically, combine with `nodemon`:

```bash
npm install --save-dev nodemon

# In package.json "scripts":
"scripts": {
  "dev": "tsc --watch & nodemon dist/hello.js"
}
```

Or use `ts-node` to skip compilation during development:

```bash
npm install --save-dev ts-node

# Run TypeScript directly
npx ts-node src/hello.ts
```

---

## Common Mistakes

### 1. Forgetting to compile

```bash
# ❌ Won't work
node src/hello.ts

# ✅ Compile first, then run
npx tsc
node dist/hello.js

# ✅ Or use ts-node
npx ts-node src/hello.ts
```

### 2. Types in compiled output

TypeScript types are compile-time only. You can't check them at runtime:

```typescript
function process(data: string | number) {
  // ❌ This doesn't work — types are erased
  // if (typeof data === string | number) { ... }

  // ✅ Check actual runtime values
  if (typeof data === "string") {
    console.log(data.toUpperCase());
  } else {
    console.log(data.toFixed(2));
  }
}
```

### 3. Using `any` everywhere

```typescript
// ❌ Defeats the purpose of TypeScript
function doStuff(data: any): any {
  return data.whatever.youWant();  // no type checking
}

// ✅ Use proper types
function doStuff(data: { value: number }): number {
  return data.value * 2;
}
```

### 4. Not using `strict` mode

Start with `"strict": true` from day one. Retrofitting it later is painful.

---

## Practice Exercises

### Exercise 1: Setup and First Project

1. Create a new directory `typescript-practice`
2. Initialize an npm project
3. Install TypeScript locally
4. Generate a `tsconfig.json` with `--init`
5. Create `src/calculator.ts` with a function that adds two numbers (with type annotations)
6. Compile and run it

### Exercise 2: Compiler Options

Modify your `tsconfig.json`:
1. Set `target` to `ES2022`
2. Change `outDir` to `./build`
3. Enable `strict` mode if not already on
4. Add `"sourceMap": true` (generates `.map` files for debugging)
5. Recompile and check that output appears in `build/`

### Exercise 3: Type Errors

Create `src/errors.ts`:

```typescript
function multiply(a: number, b: number): number {
  return a * b;
}

const result1 = multiply(5, 10);
const result2 = multiply("5", 10);  // Should error
const result3 = multiply(5);        // Should error
```

Try to compile. What errors do you see? Fix them.

### Exercise 4: Watch Mode

1. Start `tsc --watch`
2. Modify `src/calculator.ts` to add a `subtract` function
3. Save the file
4. Verify `build/calculator.js` updated automatically without rerunning `tsc`

### Exercise 5: ts-node

1. Install `ts-node` as a dev dependency
2. Run `src/calculator.ts` directly with `npx ts-node src/calculator.ts`
3. Add a `console.log` statement and see it run instantly without manual compilation

---

## Next Steps

You now have TypeScript installed and understand the basic workflow:

1. Write `.ts` files with type annotations
2. Compile with `tsc`
3. Run the generated `.js` files

In the next section, we'll dive into **Basic Types** — the building blocks of TypeScript's type system.
