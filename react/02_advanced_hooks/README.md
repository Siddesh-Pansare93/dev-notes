# Advanced React Hooks

Go beyond the basics with React's most powerful hooks — covering complex state management with `useReducer`, building reusable logic through custom hooks, and mastering React 19's new form and optimistic update APIs. This section is for developers who are comfortable with `useState` and `useEffect` and are ready to write cleaner, more scalable React code.

## Table of Contents

1. [useReducer — Complex State Logic](./01_useReducer.md)
2. [Custom Hooks — Reusable Logic](./02_custom_hooks.md)
3. [useActionState — React 19 Form Actions](./03_useActionState.md)
4. [useOptimistic — Optimistic UI Updates](./04_useOptimistic.md)
5. [useFormStatus — Form Submission State](./05_useFormStatus.md)

## Learning Path

### Beginner Track
Start here if you know the basics but haven't used reducers or custom hooks yet.

1. **Chapter 1** — `useReducer`: understand the reducer pattern and when it beats `useState`
2. **Chapter 2** — Custom Hooks: extract and share logic across components

### Intermediate Track
Once you're comfortable with reducers and custom hooks, move into React 19's new primitives.

3. **Chapter 3** — `useActionState`: manage form action state the React 19 way
4. **Chapter 5** — `useFormStatus`: read pending/submission state inside form children

### Advanced Track
Apply everything together with optimistic UI patterns.

5. **Chapter 4** — `useOptimistic`: make your app feel instant by updating the UI before the server responds

## What You'll Learn

- When and why to reach for `useReducer` over `useState` for complex or multi-step state
- How to model state transitions with discriminated union action types in TypeScript
- How to combine `useReducer` with the Context API to build lightweight global state
- What custom hooks are and how to compose them for reusable, testable logic
- How to build common hooks: `useLocalStorage`, `useDebounce`, `useFetch`, `useToggle`, `useMediaQuery`, `useWindowSize`, `usePrevious`, `useInterval`, and `useForm`
- How React 19's `useActionState` and `useFormStatus` replace manual loading/error state patterns for forms
- How `useOptimistic` lets you show expected results immediately and automatically revert on server error
- Patterns for optimistic updates: boolean toggles, form submissions, list additions, and real-time messaging

## Prerequisites

Before starting this section, you should be comfortable with:

- **React fundamentals** — components, props, JSX
- **Core hooks** — `useState`, `useEffect`, `useRef`, `useContext`, `useCallback`, `useMemo`
- **TypeScript basics** — interfaces, generics, union types
- **Async JavaScript** — `async/await`, `fetch`, `Promise`

If you haven't covered those, start with the React Fundamentals section first.

## How to Use This Guide

1. **Read in order the first time.** Chapters 1 and 2 build the mental model that makes Chapters 3-5 click. Skipping ahead works for reference, but understanding the progression matters.
2. **Type the code examples yourself.** Muscle memory for TypeScript types — especially discriminated unions and generic hooks — comes from typing, not reading.
3. **Use the custom hooks chapter as a reference library.** After reading it once, bookmark it. When you find yourself repeating logic in components, check here first before writing something new.
4. **Run the practice exercise in Chapter 4.** Building a comment system with optimistic updates is the best way to internalize when and how to use `useOptimistic`.
5. **Apply one new hook per feature.** Resist rewriting everything at once. Pick a single component in a real project and refactor it using what you've learned — that's where it sticks.

Keep at it — once `useReducer` and custom hooks feel natural, you'll find yourself writing React code that's dramatically easier to test, reuse, and reason about.
