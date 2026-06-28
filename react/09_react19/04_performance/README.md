# React 19 Performance

This section covers how React 19 changes the performance landscape — from the React Compiler's automatic memoization to profiling, bundle splitting, and avoiding common re-render traps. It's aimed at React developers who want to write fast, efficient apps without over-engineering them.

## Table of Contents

- [Performance Optimization](./01_performance_optimization.md)
  - React Compiler — automatic memoization explained
  - React 18 vs React 19: manual vs automatic era
  - Profiling with React DevTools and the `Profiler` component
  - Bundle splitting with `React.lazy` and `Suspense`
  - Avoiding unnecessary re-renders (context, state colocation, keys)
  - React 19-specific wins: batching, `use()`, ref cleanup
  - Measuring Core Web Vitals
  - Decision tree: when to optimize
  - Common anti-patterns to avoid

## Learning Path

**Beginner** — Start here if you're new to React performance:
1. Read the "React 18 vs React 19: Manual vs Automatic Memoization" section to understand what changed and why
2. Study "Avoiding Unnecessary Re-renders" — context splitting, state colocation, and stable references are fundamentals that apply regardless of React version
3. Learn how to use "Profiling" with React DevTools so you can measure before you optimize

**Intermediate** — If you're comfortable with `memo`, `useMemo`, and `useCallback`:
1. Dive into the "React Compiler" section to understand what it automates and where its limits are
2. Study "Bundle Splitting and Lazy Loading" for real-world code-splitting patterns
3. Explore "React 19 Specific Optimizations" — automatic batching, the `use()` hook, and ref cleanup functions

**Advanced** — For developers tuning production apps:
1. Use the "Decision Tree: Do I Need to Optimize This?" as your mental checklist
2. Integrate "Core Web Vitals" measurement into your analytics pipeline
3. Audit your codebase for the "Common Anti-Patterns" — especially `useMemo` overuse and context bloat

## What You'll Learn

- How the React Compiler automatically applies memoization at build time and when to trust it
- The difference between writing idiomatic React 19 code vs the defensive `memo`/`useMemo`/`useCallback` patterns from React 18
- How to profile real apps using the React DevTools flame graph and the `Profiler` component
- Code-splitting strategies using `React.lazy`, `Suspense`, and route-level splitting in Next.js
- Why context is a silent re-render trigger and how to split contexts by update frequency
- State colocation — keeping state close to where it's used to minimize render scope
- React 19's extended automatic batching and how `use()` eliminates render waterfalls
- How ref cleanup functions in React 19 replace `useEffect` for DOM observer patterns
- How to measure Core Web Vitals (LCP, CLS, FID) from within your React app
- Which "optimizations" are actually anti-patterns (memoizing cheap operations, deriving state in effects)

## Prerequisites

Before starting this section you should be comfortable with:
- React hooks: `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`
- How React's rendering model works — what triggers a re-render and how React reconciles the tree
- Basic familiarity with `React.memo` and why props referential equality matters
- JavaScript module bundling concepts (what a chunk is, why bundle size matters)

A working knowledge of React 18's Concurrent Mode and Suspense will help with the streaming and `use()` content, but is not strictly required.

## How to Use This Guide

1. **Profile before you optimize.** The file opens with profiling tools for a reason — never guess at bottlenecks. Open the React DevTools Profiler, record an interaction, and let the flame graph tell you where time is actually spent.
2. **Check whether you have the compiler first.** If your project runs Next.js 15+ or has `babel-plugin-react-compiler` installed, most manual memoization is already handled. Enable `eslint-plugin-react-compiler` to catch violations that would prevent the compiler from optimizing a component.
3. **Copy the decision tree.** The "Do I Need to Optimize This?" decision tree at the end of the file is a practical checklist — bookmark it and run through it before adding any `useMemo` or `memo`.
4. **Run the anti-patterns section as an audit.** The four anti-patterns (memoizing cheap operations, `memo` with unstable props, deriving state in effects, misusing `useLayoutEffect`) are the most common mistakes — scan your existing code against each one.
5. **Connect optimizations to user experience.** Every optimization should map to a visible improvement: a smoother scroll, faster page transition, or lower Largest Contentful Paint score. If you can't measure the user impact, question whether the optimization is worth the complexity.

Fast React apps come from understanding the rendering model deeply — once you do, you'll reach for optimization tools far less often, and with far more precision when you do.
