# Clean Code in React

Writing React that works is just the starting point — writing React that is readable, maintainable, and scalable is the real skill. This section covers the principles, patterns, and practices that separate production-quality code from code that works-but-haunts-you-later, and is aimed at developers who want to level up from "it works" to "it's genuinely well built."

## Table of Contents

### Part 1 — Structure and Design
1. [Component Design Principles](./01_component_design.md) — Single responsibility, prop design, composition, state co-location, and the patterns that keep components small and testable
2. [File and Folder Organization](./02_organization.md) — Feature-based project structure, barrel exports, path aliases, naming conventions, and module architecture that scales

### Part 2 — Reliability
3. [Error Handling](./03_error_handling.md) — Error boundaries, async error patterns, API error strategies, form validation, toast notifications, and error logging with Sentry
4. [Testing React Applications](./04_testing.md) — Vitest + React Testing Library setup, component and hook testing, integration tests, mocking APIs, and coverage strategies

### Part 3 — Optimization
5. [Performance Optimization](./05_performance.md) — React.memo, useMemo/useCallback, code splitting, lazy loading, virtual scrolling, bundle optimization, and Core Web Vitals

## Learning Path

**Beginner** — Start here if you are still building intuition for how to structure React code:
- Chapter 1: Component Design Principles (focus on SRP, small components, and prop design)
- Chapter 2: File and Folder Organization (feature-based structure, naming conventions)
- Chapter 3: Error Handling (error boundaries and basic async patterns)

**Intermediate** — You know the basics but want your codebase to feel professional:
- Chapter 1: Component Design (composition patterns, derived state, conditional rendering)
- Chapter 2: Organization (barrel exports, path aliases, full feature module pattern)
- Chapter 3: Error Handling (API interceptors, TanStack Query error handling, toast patterns)
- Chapter 4: Testing (component testing, hook testing, mocking)

**Advanced** — You are optimizing production apps and want measurable improvements:
- Chapter 4: Testing (integration tests, coverage strategy, testing complex async flows)
- Chapter 5: Performance Optimization (memoization strategies, code splitting, virtual scrolling, Web Vitals monitoring)
- Revisit Chapter 1 and 2 with a refactoring lens — apply patterns to an existing codebase

## What You'll Learn

- How to apply the Single Responsibility Principle to React components with real before/after examples
- Composition over configuration using compound component patterns
- How to structure a feature-based project that scales from side project to production app
- Barrel exports, path aliases, and import organization that eliminates relative import chaos
- React Error Boundaries — when they catch errors, when they don't, and how to layer them
- Async error handling patterns including a reusable `useAsync` hook
- Handling API errors centrally via Axios interceptors and TanStack Query
- Form validation with React Hook Form + Zod and mapping server errors to fields
- User-friendly error messages and empty state components
- Error logging with a custom service and Sentry integration
- Writing component tests with React Testing Library that test behavior, not implementation
- Testing custom hooks with `renderHook`
- Mocking API calls and modules in Vitest
- `React.memo`, `useMemo`, and `useCallback` — when to use them, when they hurt more than help
- Code splitting with `React.lazy` and `Suspense` for faster initial loads
- Virtual scrolling for large lists and image optimization techniques
- Reading React Profiler output to find real bottlenecks

## Prerequisites

- Comfortable with React fundamentals: components, props, state, and `useEffect`
- Basic TypeScript — interfaces, generics, and type inference
- Familiarity with hooks (`useState`, `useEffect`, `useContext`, `useRef`)
- Some experience fetching data in React (REST APIs or similar)
- Node.js and npm installed for running examples and tests

## How to Use This Guide

1. **Read in order the first time.** The chapters build on each other — component design shapes how you organize files, which shapes how you write tests and catch errors. Following the sequence gives you the full picture.
2. **Run the examples.** Every section has concrete TypeScript code with bad-vs-good comparisons. Type them out, break them, and experiment — reading alone won't make the patterns stick.
3. **Apply one pattern at a time to real code.** After finishing a chapter, pick one pattern (e.g., extracting logic to a custom hook, or adding an error boundary) and apply it to a project you already have. Real application beats synthetic exercises.
4. **Use the anti-pattern lists as code review checklists.** Each chapter ends with a "do / don't" or anti-patterns section — these are great to reference when reviewing your own PRs or a teammate's code.
5. **Return to the performance chapter last.** Premature optimization is a trap. Build clean, well-organized, tested code first, then profile and optimize where data shows it matters.

Clean, well-structured React code is a skill you build incrementally — every pattern you internalize makes the next one easier to recognize and apply, so keep at it.
