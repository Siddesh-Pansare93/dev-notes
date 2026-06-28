# State Management

Master global state in React using Zustand — a lightweight, TypeScript-friendly library that eliminates prop drilling and unnecessary re-renders without the ceremony of Redux. This section is for developers who understand React fundamentals and want a pragmatic, production-ready approach to shared state.

## Table of Contents

### Part 1 — Getting Started with Zustand
1. [Introduction to Zustand](./01_zustand_intro.md) — why Zustand beats Context and Redux, your first store, optimized selectors, async actions, middleware basics, and real-world store patterns (auth, cart, todos)

### Part 2 — Store Architecture
2. [Creating Stores](./02_creating_stores.md) — single stores, multiple independent stores, the slices pattern for large apps, nested slice architecture, file structure strategies

### Part 3 — TypeScript Integration
3. [Zustand with TypeScript](./03_zustand_typescript.md) — proper store typing, typing devtools/persist/immer middleware (including the double `()()` signature), type-safe selectors, generic store creators, utility types

### Part 4 — Advanced Patterns
4. [Advanced Patterns](./04_advanced_patterns.md) — subscriptions with `subscribeWithSelector`, state persistence and migration, Immer for immutable updates, devtools with named actions, custom middleware, context pattern for multiple store instances

---

## Learning Path

### Beginner — Build your first stores
1. Start with [Introduction to Zustand](./01_zustand_intro.md) — understand why Zustand exists and how selectors keep re-renders efficient
2. Move to [Creating Stores](./02_creating_stores.md), chapters: Simple Single Store and Multiple Independent Stores

### Intermediate — Type-safe, scalable architecture
3. Work through [Zustand with TypeScript](./03_zustand_typescript.md) — learn the middleware type signature and how to separate State vs Actions types
4. Return to [Creating Stores](./02_creating_stores.md), chapters: Slices Pattern and File Organization

### Advanced — Production-grade techniques
5. Complete [Advanced Patterns](./04_advanced_patterns.md) — subscriptions, persistence with migration support, Immer, custom middleware, and the context pattern for scoped store instances

---

## What You'll Learn

- Why Zustand solves Context's re-render problem and Redux's boilerplate problem
- Creating stores with actions co-located alongside state
- Using selectors to subscribe only to the slice of state a component needs
- Handling async actions (API calls, loading states, error handling) inside stores
- Organizing stores for small, medium, and large apps — single store, multiple stores, slices pattern
- Typing stores and middleware correctly with TypeScript (including devtools, persist, and immer)
- Persisting state to localStorage or sessionStorage, with partial persistence and version migration
- Writing subscriptions that react to state changes outside of React components
- Using Immer middleware to write clean, mutation-style updates on complex nested state
- Building custom middleware for cross-cutting concerns like logging and performance monitoring
- Scoping independent store instances using the context pattern

---

## Prerequisites

Before starting this section, you should be comfortable with:

- **React fundamentals** — components, props, and `useState`
- **React hooks** — `useEffect`, `useContext`, and `useRef`
- **TypeScript basics** — interfaces, generics, and union types
- **Async JavaScript** — `async/await` and `fetch`

A working understanding of why prop drilling and Context re-renders become painful in real apps will help you appreciate Zustand's design immediately.

---

## How to Use This Guide

1. **Follow the order on your first read.** Each file builds on the previous — the intro covers concepts that the TypeScript and advanced chapters expand on.
2. **Type everything from day one.** The TypeScript chapter shows the correct middleware signatures that trip people up; read it before reaching for `any`.
3. **Build alongside the examples.** The stores in these files — auth, cart, todos, settings — are intentionally real-world. Drop them into a side project as you go.
4. **Start simple, add complexity only when needed.** A single file with one store is the right starting point. Graduate to slices only when the store grows.
5. **Use the devtools.** Install the Redux DevTools browser extension and wire up the devtools middleware from chapter 1. Time-travel debugging makes store behavior immediately obvious.

---

Good state management is invisible — users never think about it, and your components stay clean. Zustand keeps it that way.
