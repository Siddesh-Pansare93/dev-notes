# Core Hooks

The five hooks every React developer must master — covering state, side effects, shared data, DOM access, and performance optimization. This section is written with TypeScript throughout and is aimed at developers who know basic React syntax and want to build real, production-quality components.

## Table of Contents

1. [useState — Managing Component State](./01_useState.md)
2. [useEffect — Side Effects and Lifecycle](./02_useEffect.md)
3. [useContext — Sharing Data Across Components](./03_useContext.md)
4. [useRef — DOM Access and Mutable Values](./04_useRef.md)
5. [useMemo and useCallback — Performance Optimization](./05_useMemo_useCallback.md)

## Learning Path

### Beginner
Start here if you are new to React hooks or coming from class components.

1. **useState** — understand state, functional updates, and immutability
2. **useEffect** — learn the dependency array and why cleanup functions matter
3. **useContext** — share data without prop drilling

### Intermediate
Pick these up once you are comfortable managing state and effects.

4. **useRef** — access DOM nodes imperatively and persist values across renders without triggering re-renders
5. **useMemo and useCallback** — know when (and when not) to optimize

### Advanced
Circle back to all five hooks with a focus on correctness at scale.

- Race conditions in `useEffect` (AbortController and ignore-flag patterns)
- Lazy initial state in `useState`
- Memoization strategies paired with `React.memo`
- Custom hooks built on top of these primitives (covered in the next section)

## What You'll Learn

- Declaring and updating state for primitive values, objects, and arrays
- Writing functional updater functions to avoid stale state bugs
- Controlling when effects run using the dependency array
- Handling async data fetching inside `useEffect` without causing race conditions
- Cleaning up subscriptions, timers, and event listeners properly
- Passing data deep into a component tree with Context without prop drilling
- Reading and mutating DOM nodes with `useRef`
- Storing mutable values that survive re-renders without causing them
- Caching expensive calculations with `useMemo`
- Stabilizing callback references with `useCallback` to prevent unnecessary child re-renders
- Combining `React.memo`, `useMemo`, and `useCallback` for a complete optimization strategy
- Profiling render performance with the React DevTools Profiler

## Prerequisites

- Comfortable writing TypeScript (interfaces, generics, union types)
- Understand what JSX compiles to and how a component function is called
- Know how props flow from parent to child
- Familiarity with `async/await` and the Fetch API

## How to Use This Guide

1. **Read in order the first time.** Each hook builds on the previous one — `useCallback` only makes sense once you understand how re-renders are triggered by state and props.
2. **Type out the code examples yourself.** Copy-paste teaches nothing; typing forces you to read every character and notice TypeScript annotations.
3. **Pay attention to the "Common Mistakes" sections.** Stale state, missing dependencies, and infinite loops are the bugs every React developer hits — knowing them in advance saves hours.
4. **Do the practice exercises.** They are small but deliberately combine multiple concepts (e.g., `useState` + `useEffect` + cleanup), which is how the hooks appear in real apps.
5. **Profile before you optimize.** The performance section includes a `Profiler` wrapper — use it in the DevTools before reaching for `useMemo` or `useCallback`. Premature memoization adds complexity without benefit.

Hooks are the foundation everything else in React is built on — nail these five and the rest of the ecosystem will make immediate sense.
