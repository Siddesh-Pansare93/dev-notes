# TypeScript with React

This section teaches you how to use TypeScript effectively inside a React codebase — from typing components and hooks to building fully type-safe APIs, generic UI primitives, and production-grade React 19 apps. It is designed for developers who know React in JavaScript and want to level up with TypeScript.

## Table of Contents

### Part 1 — Core Typing Patterns
1. [Typing Components, Props, and State](./01-typing-components-props-state.md)
2. [Hooks with TypeScript](./02-hooks-with-typescript.md)
3. [Context and Reducers](./03-context-and-reducers.md)

### Part 2 — Advanced Component Design
4. [Generic Components and Higher-Order Components](./04-generic-components-and-hocs.md)
5. [API Layer and Type-Safe Fetching](./05-api-layer-and-type-safe-fetching.md)
6. [React Fiber Architecture Internals](./06-react-fiber-architecture-internals.md)

### Part 3 — Testing, Data, and Modern React
7. [Testing React](./06-testing-react/README.md)
   - [React Testing Fundamentals](./06-testing-react/01_react_testing.md)
8. [Drizzle ORM with React](./07-drizzle/README.md)
9. [React 19](./08-react-19/README.md)
   - [React 19 New Features](./08-react-19/01-react-19-new-features.md)
   - [Server Components Deep Dive](./08-react-19/02-server-components-deep-dive.md)
   - [Advanced Concurrent Features](./08-react-19/03-advanced-concurrent-features.md)
   - [Performance Optimization](./08-react-19/04-performance-optimization.md)
   - [Migration Guide](./08-react-19/05-migration-guide.md)

---

## Learning Path

### Beginner — Get Typed Up Fast
Start here if you are new to TypeScript in a React project.

1. [Typing Components, Props, and State](./01-typing-components-props-state.md) — the foundation
2. [Hooks with TypeScript](./02-hooks-with-typescript.md) — type `useState`, `useRef`, `useEffect`, and custom hooks
3. [Context and Reducers](./03-context-and-reducers.md) — type-safe global state without a library

### Intermediate — Write Reusable, Robust Code
Once the basics feel natural, tackle these.

4. [Generic Components and HOCs](./04-generic-components-and-hocs.md) — build components that adapt to any data shape
5. [API Layer and Type-Safe Fetching](./05-api-layer-and-type-safe-fetching.md) — connect your UI to the network without losing type safety
6. [Testing React](./06-testing-react/README.md) — test typed components and hooks with confidence

### Advanced — Internals, Data, and the Cutting Edge
For developers who want to go deep.

7. [React Fiber Architecture Internals](./06-react-fiber-architecture-internals.md) — understand the rendering engine
8. [Drizzle ORM with React](./07-drizzle/README.md) — end-to-end type safety from database schema to UI
9. [React 19](./08-react-19/README.md) — Server Components, Actions, concurrent features, and migration

---

## What You'll Learn

- Why `React.FC` fell out of favor and how to write modern, plain-function components
- Typing props with interfaces, optional fields, discriminated unions, and polymorphic components
- Correctly typed `useState`, `useReducer`, `useRef`, `useCallback`, and custom hooks
- Building type-safe Context providers and reducers that eliminate `any` from global state
- Creating generic `<List>`, `<DataTable>`, and `<Select>` components that adapt to any data type
- Higher-Order Components (`withAuth`, `withLoading`) and the render props pattern with full types
- Structuring an API layer with typed fetch wrappers, Zod schema validation, and error handling
- How React Fiber schedules, reconciles, and commits work under the hood
- Writing unit and integration tests for typed components and hooks
- Using Drizzle ORM for end-to-end type safety from database to React UI
- React 19 features: Server Components, Actions, `use()`, optimistic updates, and concurrent rendering

---

## Prerequisites

- Comfortable with React fundamentals — components, props, state, hooks, and the component lifecycle
- Basic TypeScript knowledge — types, interfaces, unions, and generics at an introductory level (see the earlier TypeScript sections in this repo if needed)
- Node.js installed and familiarity with a modern React project setup (Vite or Next.js)

---

## How to Use This Guide

1. **Follow the numbered order** the first time through. Each chapter builds on patterns introduced in previous ones — generic components make more sense after you have typed basic props.
2. **Type along in a real project.** Open a side project or a fresh Vite + React + TypeScript scaffold and apply each pattern as you read it. Passive reading will not make the types stick.
3. **Pay attention to the "Coming from JS" callouts.** They translate familiar JavaScript habits into their TypeScript equivalents and explain the reasoning behind each change.
4. **Read the React Fiber chapter when you hit confusing behavior** — stale closures, unexpected re-renders, or batching surprises make much more sense after understanding the internals.
5. **Use the React 19 section as a reference** as you adopt newer APIs. Read it top-to-bottom once, then return to individual pages when you need them in a project.

---

You now have a clear, structured path from typing your first component to shipping a type-safe, modern React application — keep going, the types are worth it.
