# TypeScript with React

A hands-on guide to writing type-safe React applications using TypeScript — covering the patterns, utilities, and idioms that make components robust, self-documenting, and a pleasure to refactor. Aimed at developers who know React and want to graduate from basic typing to writing genuinely ergonomic TypeScript.

## Table of Contents

### Part 1 — Typing Components

1. [Props Patterns](./01_props_patterns.md) — interfaces vs types, optional/default props, children, discriminated unions, compound components, extending HTML elements
2. [Generics](./02_generics.md) — generic list, table, card, modal, and form components; generic hooks; type constraints with `extends`

### Part 2 — Events and Built-in Types

3. [Event Handlers](./03_event_handlers.md) — typing `onChange`, `onSubmit`, `onClick`, keyboard and focus events across HTML elements
4. [Utility Types](./04_utility_types.md) — `Partial`, `Pick`, `Omit`, `Record`, `Readonly`, `Extract`, `Exclude`, `ReturnType`, `Parameters`, and React-specific utility types

## Learning Path

**Beginner** — new to TypeScript in React
1. Chapter 1 (Props Patterns) — basic interfaces, optional props, string literal unions
2. Chapter 3 (Event Handlers) — type every common DOM event correctly
3. Chapter 4 (Utility Types) — learn `Partial`, `Pick`, `Omit`, and `Record` first

**Intermediate** — comfortable with basic typing, want sharper patterns
1. Chapter 1 (Props Patterns) — discriminated unions, render props, compound components
2. Chapter 2 (Generics) — build a generic `List`, `DataFetcher`, and `Select`
3. Chapter 4 (Utility Types) — combine utility types, use React-specific types like `ComponentProps`

**Advanced** — ready for the deep end
1. Chapter 2 (Generics) — generic form with validation, polymorphic components, `<T extends keyof U>` patterns
2. Chapter 4 (Utility Types) — `DeepPartial`, conditional types, `MakeOptional`/`MakeRequired` custom helpers, discriminated union state machines

## What You'll Learn

- When to use `interface` vs `type` for component props, and why it matters
- How to type children precisely — `ReactNode`, `ReactElement`, typed render props
- Discriminated unions for components whose props vary by variant or `type` field
- How to extend native HTML element props so your wrappers accept all native attributes
- Writing generic components (`List<T>`, `Table<T>`, `Modal<T>`) that work with any data shape
- Typing all common React event handlers — form, mouse, keyboard, focus, drag
- The full suite of TypeScript utility types and when to reach for each one
- React-specific utility types: `ComponentProps`, `ComponentPropsWithoutRef`, `forwardRef`
- Advanced patterns: `DeepPartial`, polymorphic `as` prop, type inference from generics

## Prerequisites

- Solid understanding of React fundamentals — components, props, hooks, context
- Basic TypeScript familiarity — you can write an interface, use `string | number`, and understand what a type error means
- Some experience with `useState` and `useEffect` in TypeScript is helpful but not required

## How to Use This Guide

1. **Start with props** — Chapter 1 is the foundation everything else builds on; do not skip it even if you feel comfortable with TypeScript basics.
2. **Type your events early** — Chapter 3 is short and solves a very common pain point; read it alongside Chapter 1 on your first pass.
3. **Build something generic** — the concepts in Chapter 2 only click once you apply them; try rewriting one of your own list or table components as a generic after reading.
4. **Keep Chapter 4 as a reference** — the utility types chapter is dense; skim it once for awareness, then return to specific sections as you encounter the need in real code.
5. **Follow the "Next Steps" links** inside each file — each chapter links forward to the next logical topic and sideways to related sections in the broader knowledge base.

TypeScript and React are a natural pairing once you internalize a handful of core patterns — the rest falls into place from there.
