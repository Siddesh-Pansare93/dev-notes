# React 19 New Features

React 19 introduces a powerful set of primitives that fundamentally change how you handle async operations, form submissions, and UI feedback — eliminating much of the manual state wiring you wrote in React 18. This section is for developers who already know React and want to understand what changed, why it matters, and how to adopt it confidently.

## Table of Contents

### Part 1 — Async Actions and State Management
1. [Actions and useActionState](./01_actions_and_useactionstate.md)

### Part 2 — Optimistic UI Patterns
2. [useOptimistic Hook](./02_useoptimistic_hook.md)

## Learning Path

### Beginner
Start here if you are comfortable with React hooks but new to React 19:
1. **Actions and useActionState** — learn the Actions pattern, how `useActionState` replaces manual `isPending`/`error` state, and how async transitions work
2. **useOptimistic Hook** — understand why optimistic UI matters and how React 19 makes it trivial to implement

### Intermediate
If you already grasp the basics, focus on the deeper sections inside each file:
- TypeScript integration patterns for `useActionState` and `useOptimistic`
- Combining both hooks together for full-featured async flows
- Real-world examples (comment posting, like buttons, cart updates)

### Advanced
For experienced engineers evaluating adoption and performance:
- Anti-patterns and what to avoid when migrating from React 18
- Performance considerations around async transitions and batching
- Sequential request ordering and error boundary integration

## What You'll Learn

- How the **Actions pattern** works and why React 19 introduced it
- Using `useActionState` to automatically track pending state, errors, and results from async operations
- How `useOptimistic` lets you show the final UI state immediately before a server response arrives
- The difference between the React 18 approach (manual `useState` + `try/catch`) and the React 19 approach
- Handling **error reversion** when an optimistic update fails
- Writing **TypeScript-safe** async form handlers with the new hooks
- Real-world use cases: form submissions, like/unlike toggles, counter increments, cart operations
- Best practices and anti-patterns for both hooks

## Prerequisites

Before diving in, you should be comfortable with:
- React hooks (`useState`, `useEffect`, `useRef`)
- Async/await and Promises in JavaScript
- Basic TypeScript generics (helpful but not required)
- React 18 patterns — the content contrasts old and new approaches, so familiarity with the old way helps you appreciate the improvements

## How to Use This Guide

1. **Read in order** — `useActionState` is foundational; `useOptimistic` builds on it, and the two are often used together
2. **Run the code examples** — every section includes working TypeScript snippets; paste them into a React 19 sandbox to see the behavior live
3. **Compare old vs new** — each file includes a React 18 vs React 19 comparison block; read both sides to understand what React 19 is abstracting away
4. **Do the exercises** — both files end with practice exercises; completing them will solidify the mental model far faster than just reading
5. **Check the anti-patterns** — knowing what not to do is as important as knowing the happy path; the anti-patterns sections flag common mistakes to avoid during migration

React 19's new primitives make async UI feel effortless — once these patterns click, you will wonder how you ever managed loading states by hand.
