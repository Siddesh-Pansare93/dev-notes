# Testing React with TypeScript

A practical guide to testing modern React applications using React Testing Library, Mock Service Worker (MSW), and Playwright — written with TypeScript throughout. This section is for developers who want to write tests that are maintainable, meaningful, and closely mirror how real users interact with their apps.

## Table of Contents

- [React Testing Best Practices](./01_react_testing.md)
  - Setup: Vitest + React Testing Library + MSW + Playwright
  - Testing Library philosophy and querying by role
  - Simulating user interactions with `userEvent`
  - Testing custom hooks with `renderHook` and `act`
  - Mocking network requests with MSW
  - E2E testing with Playwright
  - React 19 considerations (`use` hook, Server Actions)
  - Best practices and common anti-patterns

## Learning Path

### Beginner
Start here if you are new to testing React components or coming from a Jest + Enzyme background.

1. Read the **Setup Instructions** section in [React Testing Best Practices](./01_react_testing.md) to get Vitest, RTL, and MSW installed and configured
2. Study **Testing Library Best Practices** — understand why you query by role and not by class or test ID
3. Work through **Example 1 and 2** — rendering a component and simulating a click event

### Intermediate
You know the basics of RTL and want to handle real-world async scenarios and API mocking.

1. Read **Testing Hooks** — use `renderHook` and `waitFor` to test both synchronous and async custom hooks (Examples 3 and 4)
2. Read **Mocking API Calls with MSW** — intercept network requests at the network level so your components behave exactly as they would in production (Examples 5, 6, and 7)

### Advanced
You are building production-grade test suites and need E2E coverage and React 19 patterns.

1. Read **E2E Testing with Playwright** — write cross-browser tests for form submission and visual regression (Examples 8, 9, and 10)
2. Read **React 19 Considerations** — understand how to test components using the `use` hook and Server Actions
3. Work through the **Practice Exercises** at the end of the file to solidify all three layers: unit, integration, and E2E

## What You'll Learn

- How to configure Vitest with jsdom and React Testing Library for a TypeScript project
- Querying the DOM by role, label, and text so your tests double as accessibility checks
- Simulating realistic user interactions (typing, clicking, tabbing) with `userEvent`
- Testing custom React hooks in isolation using `renderHook` and `act`
- Handling async state, loading indicators, and data-fetching patterns in tests
- Intercepting HTTP requests at the network level with MSW instead of brittle module mocks
- Overriding MSW handlers per test to simulate error states and edge cases
- Writing E2E tests with Playwright for multi-step flows, form submission, and visual snapshots
- Recognising and avoiding the most common testing anti-patterns (testing implementation details, over-mocking)
- Adapting your test strategy for React 19 features

## Prerequisites

Before starting this section you should be comfortable with:

- **TypeScript fundamentals** — interfaces, generics, and type annotations (covered in the earlier chapters of this course)
- **React hooks** — `useState`, `useEffect`, and custom hooks; know how component lifecycles work
- **Basic async JavaScript** — Promises, `async/await`, and how `fetch` works
- **React with TypeScript** — how to type props, events, and refs (covered in earlier sections of `03-typescript-with-react`)

You do not need prior experience with any testing library; this guide starts from installation.

## How to Use This Guide

1. **Set up first, read second.** Run the install commands in the Setup Instructions section before reading further — having a working environment makes the examples click much faster.
2. **Run every example yourself.** Copy each code snippet into a real project file and watch the test pass (or fail deliberately). Reading tests without running them is far less effective.
3. **Follow the user-centric mindset.** When writing your own tests, always ask: "What would a user see or do here?" If the answer involves internal state or component structure, you are likely testing the wrong thing.
4. **Layer your tests intentionally.** Use unit tests (RTL + Vitest) for component logic and hooks, MSW integration tests for data-fetching flows, and Playwright E2E tests only for critical user journeys. Not everything needs all three layers.
5. **Use the practice exercises.** The three exercises at the end of the file — a controlled form, a debounced hook with fake timers, and a Playwright multi-step wizard — cover the most common real-world scenarios you will encounter.

Confidence in your tests means confidence in every deploy — start small, stay consistent, and your test suite will become your best safety net.
