# TypeScript Foundations

A deep-dive into the TypeScript type system — beyond syntax and into the mental models that make you productive. This section is for developers who already write JavaScript and want to understand *why* TypeScript works the way it does, not just how to silence the compiler.

## Table of Contents

1. [Type System Deep Dive](./01-type-system-deep-dive.md) — Unions, intersections, discriminated unions, narrowing, `never`, `unknown`
2. [Advanced Types](./02-advanced-types.md) — Mapped types, conditional types, template literal types, `infer`, recursive types
3. [Generics Mastery](./03-generics-mastery.md) — Generic functions, constraints, defaults, generic interfaces and real-world patterns
4. [Utility Types and Type Gymnastics](./04-utility-types-and-type-gymnastics.md) — Built-in utilities, combining them, custom utility types, DTO patterns

## Learning Path

### Beginner — build a solid foundation
Start here if TypeScript still feels like "JavaScript with annotations." These chapters teach you to think in types.

1. **Chapter 1** — Type System Deep Dive: unions, intersections, and discriminated unions are the building blocks for everything else
2. **Chapter 3** — Generics Mastery (first half): generic functions and constraints will immediately make your daily code better
3. **Chapter 4** — Utility Types: `Partial`, `Required`, `Pick`, `Omit`, and `Readonly` are used in virtually every TypeScript project

### Intermediate — write types that work for you
Once the basics click, these topics let you model complex domains with precision.

1. **Chapter 1** — Narrowing section: custom type guards and exhaustiveness checking with `never`
2. **Chapter 2** — Mapped types and conditional types: the mechanics behind most utility types
3. **Chapter 3** — Generic interfaces, classes, and real-world patterns (repository, event emitter, builder)

### Advanced — type-level programming
For when you want to build reusable type utilities and encode business rules in the type system itself.

1. **Chapter 2** — Template literal types, `infer`, and recursive types
2. **Chapter 4** — Custom utility types: DTOs from entities, form state types, API contract types
3. **Chapter 2** — Combining techniques: auto-typed API clients from route definitions

## What You'll Learn

- Model real domain logic with union and intersection types
- Use discriminated unions to make impossible states unrepresentable
- Narrow types safely with `typeof`, `instanceof`, `in`, and custom type guards
- Use `never` for compile-time exhaustiveness checking so adding a new variant never silently breaks a switch
- Know when `unknown` is safer than `any` — and when `any` is genuinely acceptable
- Write mapped types that transform existing types programmatically (zero runtime cost)
- Apply conditional types to branch logic at the type level
- Use template literal types to enforce string shapes — typed routes, events, env vars
- Extract types from compound structures with the `infer` keyword
- Build recursive types like `DeepPartial`, `DeepReadonly`, and `JSONValue`
- Write generic functions and classes that preserve type relationships across call sites
- Apply built-in utility types (`Partial`, `Required`, `Pick`, `Omit`, `ReturnType`, `Parameters`, and more) fluently
- Compose multiple utility types to derive DTO types, form state, and API contracts from a single source of truth

## Prerequisites

- Comfortable writing modern JavaScript (ES2020+): destructuring, spread, async/await, modules
- Basic familiarity with TypeScript syntax: type annotations, interfaces, simple generics
- Node.js installed locally to run `.ts` files via `ts-node` or `npx tsx`

No prior experience with advanced types or type-level programming required — this section builds that from scratch.

## How to Use This Guide

1. **Read the chapters in order.** Each one builds on concepts introduced before it. Generics make much more sense after you understand narrowing; utility types make much more sense after you understand mapped types.
2. **Run every code snippet.** Copy examples into a TypeScript playground (typescriptlang.org/play) or a local file. Hover over types and read the inferred shapes — that feedback loop is where the learning actually happens.
3. **Do the mini-exercises.** Every chapter ends with a short exercise that applies the concepts to a realistic scenario. Don't skip them; they expose gaps before you hit them in production code.
4. **Return to Chapter 1 after Chapter 2.** Mapped and conditional types look very different once you understand what `keyof`, `infer`, and `extends` actually do. A second read of the type system chapter will land much harder.
5. **Keep a cheat sheet.** As you go, write down the patterns you reach for most — the discriminated union template, the `assertNever` helper, your go-to utility type combos. You'll reference it constantly.

The goal is not to memorize type syntax — it's to reach the point where the type system feels like a collaborator, not an obstacle. Dive in.
