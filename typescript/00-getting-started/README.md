# Getting Started with TypeScript

> A comprehensive introduction to TypeScript for JavaScript developers

## Overview

This section is designed for **complete beginners** transitioning from JavaScript to TypeScript. You'll learn the fundamentals step-by-step, from setup to migration strategies, with practical examples and exercises throughout.

---

## Prerequisites

Before starting, you should have:

- **1+ years of JavaScript experience** (ES6+ features like arrow functions, destructuring, classes)
- **Node.js installed** (v16 or higher recommended)
- **A code editor** (VS Code recommended for the best TypeScript experience)
- **Basic command-line knowledge** (navigating directories, running npm commands)

---

## What You'll Learn

By the end of this section, you'll be able to:

- Set up TypeScript projects from scratch with proper configuration
- Understand and use all basic TypeScript types
- Write type-safe functions and interfaces
- Use generics for reusable code
- Apply everyday TypeScript patterns (unions, literals, type aliases)
- Migrate existing JavaScript projects to TypeScript incrementally

---

## Learning Path

Work through these files **in order**. Each builds on concepts from the previous one.

### 1. [Introduction and Setup](./01_introduction_and_setup.md)

**Time:** 30-45 minutes

Learn what TypeScript is, why it exists, and how to set up your first project.

**Topics:**
- What is TypeScript and why use it
- Installation (npm, yarn, pnpm)
- Your first TypeScript file
- `tsconfig.json` configuration
- Essential compiler options
- Watch mode and development workflow

**Key Takeaway:** TypeScript is JavaScript with type annotations that get checked at compile time, not runtime.

---

### 2. [Basic Types](./02_basic_types.md)

**Time:** 45-60 minutes

Master TypeScript's type system fundamentals — the building blocks of everything else.

**Topics:**
- Primitive types (`string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`)
- Arrays and tuples
- Object type annotations
- Special types (`any`, `unknown`, `never`, `void`)
- Type inference vs explicit annotations

**Key Takeaway:** TypeScript's type system mirrors JavaScript's runtime types, with additional safety mechanisms.

---

### 3. [Functions and Interfaces](./03_functions_and_interfaces.md)

**Time:** 60-75 minutes

Learn to type function signatures and create reusable type structures.

**Topics:**
- Function parameter and return type annotations
- Optional and default parameters
- Rest parameters
- Interfaces for object shapes
- Interface extension
- `type` vs `interface` (when to use which)

**Key Takeaway:** Interfaces define contracts for object shapes; use them to build type-safe APIs.

---

### 4. [Introduction to Generics](./04_generics_intro.md)

**Time:** 60-75 minutes

Discover how to write reusable, type-safe code that works with multiple types.

**Topics:**
- What generics are and why they exist
- Generic functions
- Generic interfaces and type aliases
- Basic generic constraints (`extends`)
- Common generic patterns

**Key Takeaway:** Generics are "type variables" that preserve type relationships between parameters and return values.

---

### 5. [Everyday Types](./05_everyday_types.md)

**Time:** 60-75 minutes

Master the patterns you'll use daily in real-world TypeScript code.

**Topics:**
- Union types for "either/or" scenarios
- Literal types for exact values
- Type aliases for naming complex types
- Discriminated unions (tagged unions)
- Type assertions and non-null assertions
- Combining patterns for real-world use cases

**Key Takeaway:** Union types + literal types + discriminated unions = type-safe, maintainable domain logic.

---

### 6. [From JavaScript to TypeScript](./06_from_js_to_ts.md)

**Time:** 60-90 minutes

Learn how to migrate existing JavaScript projects to TypeScript incrementally.

**Topics:**
- Migration strategies (3-phase approach)
- Using `allowJs` and `checkJs`
- `@ts-check` comments in JavaScript
- Converting files incrementally
- Common migration patterns (React, Express, Node.js)
- Handling third-party libraries
- Gradual strictness (loose → strict)

**Key Takeaway:** You don't need to rewrite everything at once — TypeScript supports gradual adoption.

---

## Study Tips

### For Visual Learners
- Type out every code example yourself (don't copy-paste)
- Hover over variables in VS Code to see inferred types
- Use the TypeScript Playground (https://www.typescriptlang.org/play) to experiment

### For Hands-On Learners
- Do **all** the practice exercises at the end of each section
- Build a small project alongside the tutorials (to-do list, blog API, etc.)
- Try breaking the code intentionally to see what errors TypeScript produces

### For Analytical Learners
- Read the "Coming from JavaScript" callouts carefully
- Compare TypeScript patterns to how you'd solve the same problem in JavaScript
- Study the "Common Mistakes" sections to understand pitfalls

---

## Recommended Study Schedule

### Fast Track (1 week, ~2 hours/day)
- **Day 1:** Introduction and Setup + Basic Types
- **Day 2:** Functions and Interfaces
- **Day 3:** Introduction to Generics
- **Day 4:** Everyday Types
- **Day 5:** From JavaScript to TypeScript
- **Day 6-7:** Build a small project applying everything learned

### Standard Track (2 weeks, ~1 hour/day)
- **Week 1:** One section every 2 days, with practice exercises
- **Week 2:** Complete "From JS to TS" + build a project

### Relaxed Track (4 weeks, ~30 min/day)
- **Week 1:** Introduction, Setup, Basic Types
- **Week 2:** Functions and Interfaces
- **Week 3:** Generics and Everyday Types
- **Week 4:** Migration strategies + practice project

---

## Practice Projects

After completing the sections, build one of these projects to cement your learning:

### 1. **Task Manager API** (Backend)
- Express server with TypeScript
- CRUD operations for tasks
- Type-safe request/response handling
- Validation with interfaces

**Skills practiced:** Functions, interfaces, type aliases, generics

### 2. **Simple Blog Frontend** (React)
- TypeScript + React components
- Typed props and state
- API integration with typed responses
- Custom hooks with generics

**Skills practiced:** Interfaces, generics, union types, React patterns

### 3. **Type-Safe Configuration Manager**
- Load config from JSON/YAML
- Validate config shape with interfaces
- Provide type-safe access to config values
- Handle missing/optional values

**Skills practiced:** Interfaces, optional properties, type guards, unknown type

---

## Common Questions

### "Do I need to learn advanced types before using TypeScript?"

No! This "Getting Started" section covers everything needed for daily TypeScript development. Advanced types (mapped types, conditional types, etc.) are in the **01-Foundations** section for when you're ready.

### "Should I enable strict mode from day 1?"

**Yes**, if starting a new project. **No**, if migrating existing JavaScript — use gradual strictness as described in section 6.

### "What if I get stuck?"

- Re-read the section slowly
- Try the code examples in the TypeScript Playground
- Consult the official TypeScript docs: https://www.typescriptlang.org/docs
- Check the "Common Mistakes" section — your issue might be listed

### "How much JavaScript do I need to know?"

You should be comfortable with:
- Variables (`let`, `const`)
- Functions (regular and arrow functions)
- Objects and arrays
- Classes (basic understanding)
- `async`/`await` and Promises
- ES6 modules (`import`/`export`)

---

## Next Steps After Completion

Once you've finished this section, you're ready for:

### [01 — Foundations](../01-foundations/)
Advanced type system deep dive — unions, intersections, mapped types, conditional types, utility types.

### [02 — OOP in TypeScript](../02-oops-in-typescript/)
Classes, inheritance, abstract classes, design patterns, SOLID principles.

### [03 — TypeScript with React](../03-typescript-with-react/)
Type-safe frontend development with React components, hooks, context, and API layers.

### [04 — TypeScript with Express](../04-typescript-with-express/)
Backend TypeScript with Express, middleware, validation, project architecture.

### [05 — NestJS Deep Dive](../05-nestjs/)
Production-grade backend framework with dependency injection, decorators, microservices.

---

## Quick Reference

### Most Common Types

```typescript
// Primitives
let str: string = "hello";
let num: number = 42;
let bool: boolean = true;

// Arrays
let nums: number[] = [1, 2, 3];
let strs: Array<string> = ["a", "b"];

// Objects
let user: { id: number; name: string } = { id: 1, name: "Alice" };

// Functions
function add(a: number, b: number): number {
  return a + b;
}

// Unions
let id: number | string = 123;

// Literals
let status: "pending" | "approved" | "rejected";

// Interfaces
interface User {
  id: number;
  name: string;
  email?: string;
}

// Generics
function identity<T>(value: T): T {
  return value;
}
```

---

## Additional Resources

- **Official TypeScript Docs:** https://www.typescriptlang.org/docs
- **TypeScript Playground:** https://www.typescriptlang.org/play
- **Type Challenges (Practice):** https://github.com/type-challenges/type-challenges
- **DefinitelyTyped (Type Definitions):** https://github.com/DefinitelyTyped/DefinitelyTyped

---

**Ready to start?** Begin with [01 — Introduction and Setup](./01_introduction_and_setup.md)!
