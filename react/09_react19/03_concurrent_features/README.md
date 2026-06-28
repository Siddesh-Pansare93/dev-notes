# Concurrent React

This section covers React's concurrent rendering model — how React 19 keeps UIs responsive during expensive updates using `useTransition`, `useDeferredValue`, Suspense, and selective hydration. It's aimed at developers who want to build genuinely smooth, non-blocking React applications.

## Table of Contents

- [Concurrent Rendering in React 19](./01_concurrent_rendering.md)
  - The Core Mental Model
  - Concurrent vs Legacy Mode (`createRoot`)
  - `useTransition` — Marking Low-Priority Updates
  - Async `startTransition` (React 19)
  - `useDeferredValue` — Debounce Without Timers
  - Suspense — Declarative Loading States
  - Suspense + `use()` Hook (React 19)
  - Nested Suspense Boundaries
  - Suspense + Transitions = No Unwanted Fallbacks
  - Selective Hydration
  - `startTransition` Without the Hook
  - Practical Patterns (Tab Navigation, Typeahead Search, Optimistic Navigation, Incremental List Rendering)
  - What NOT to Do
  - React 18 vs React 19 Differences

## Learning Path

**Beginner** — Understand the mental model before touching any API:
1. Read the "Core Mental Model" section in [Concurrent Rendering](./01_concurrent_rendering.md) to understand cooperative multitasking vs parallelism
2. Read the "Concurrent vs Legacy Mode" section to confirm you're using `createRoot`

**Intermediate** — Learn the two main concurrent hooks:
3. Study `useTransition` and the urgent vs transition priority distinction
4. Study `useDeferredValue` and when to choose it over `useTransition`
5. Work through the Typeahead Search and Tab Navigation patterns

**Advanced** — Master Suspense integration and React 19 upgrades:
6. Read the Suspense sections — basic mechanics, nested boundaries, and the `use()` hook
7. Study Suspense + Transitions together to eliminate unwanted fallback flashes
8. Read Selective Hydration for SSR-aware concurrent behaviour
9. Review the React 18 vs React 19 differences table, especially async `startTransition` and `useDeferredValue` initial value

## What You'll Learn

- How concurrent rendering works under the hood — interruption, yielding, and resuming
- How `useTransition` separates urgent updates (typing) from low-priority updates (heavy re-renders)
- How to use async functions inside `startTransition` in React 19
- How `useDeferredValue` lets you show stale UI while catching up in the background — without timers
- When to reach for `useTransition` vs `useDeferredValue` depending on who owns the state
- How Suspense boundaries enable declarative, composable loading states
- How the new `use()` hook integrates Promises directly with Suspense
- How nested Suspense boundaries allow independent, parallel loading of UI sections
- How combining `useTransition` with Suspense prevents unwanted loading flash during navigation
- How selective hydration prioritises hydrating components the user is interacting with first
- Common anti-patterns that add complexity without real benefit

## Prerequisites

- Solid understanding of React hooks (`useState`, `useEffect`, `useMemo`, `memo`)
- Familiarity with React 18's `createRoot` API
- Basic knowledge of the JS event loop and what "blocking the main thread" means
- Some exposure to Suspense and `lazy()` for code-splitting (helpful but not required)

## How to Use This Guide

1. **Run the examples locally.** Concurrent features are subtle — the difference between a janky and a smooth UI is felt in the browser, not just read about.
2. **Use the browser profiler.** Open DevTools > Performance and record while interacting. You'll see the yielding behaviour that makes concurrent mode work.
3. **Don't apply these APIs everywhere.** Start with `useTransition` only where you have a genuinely expensive render and user input to keep snappy. Profile first.
4. **Pay attention to the `memo` requirement for `useDeferredValue`.** The deferred value only helps if the component consuming it is memoized — the guide calls this out clearly.
5. **Read the "What NOT to Do" section seriously.** Over-engineering with transitions is a real trap. The guide shows exactly which cases warrant concurrent APIs and which don't.

Concurrent React is one of the most impactful — and most misunderstood — parts of modern React. Work through this carefully and you'll have a clear, practical model for building UIs that stay responsive no matter how heavy the rendering work gets.
