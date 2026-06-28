# React Testing

A dense, practical guide to testing React applications the right way — covering React Testing Library, async patterns, mocking strategies, custom hooks, context providers, and the Vitest vs Jest ecosystem. Written for developers who already know React and want confident, maintainable test suites.

## Table of Contents

### Part 1 — Foundations

- [React Testing — Comprehensive Reference](./01_react_testing.md)
  - Testing philosophy: behavior over implementation
  - The React testing pyramid (unit → component → integration → E2E)
  - React Testing Library core: `render`, queries, `userEvent`, `within`

### Part 2 — Async & Mocking

- [Async Testing Patterns](./01_react_testing.md#4-async-testing)
  - `waitFor`, `findBy*`, and `act()` — when to use each
  - Avoiding act() warnings
- [Mocking Strategies](./01_react_testing.md#5-mocking)
  - `jest.mock()` / `vi.mock()` module mocks
  - MSW (Mock Service Worker) for network interception

### Part 3 — Advanced Patterns

- [Component Testing Patterns](./01_react_testing.md#6-component-testing-patterns)
  - Custom hooks with `renderHook`
  - Context providers and error boundaries
- [React Query & SWR Integration Testing](./01_react_testing.md#7-testing-react-query--swr-integrations)
- [Custom Render with Providers](./01_react_testing.md#8-custom-render-with-providers-wrapper-pattern)
- [Snapshot Testing](./01_react_testing.md#9-snapshot-testing)
- [Vitest vs Jest](./01_react_testing.md#10-vitest-vs-jest)
- [Common Mistakes & How to Fix Them](./01_react_testing.md#11-common-mistakes)
- [Full Integration Test Example](./01_react_testing.md#12-full-integration-test-example)

## Learning Path

### Beginner — Get your first tests passing

1. Start with **Testing Philosophy** — understand what to test and what to skip before writing a single line
2. Read **RTL Core** — learn `render`, query priority (`getByRole` first), and `userEvent` vs `fireEvent`
3. Study **Async Testing** — `findBy*` for elements that appear, `waitFor` for assertions that need time

### Intermediate — Write tests you trust

4. Learn **Mocking with MSW** — intercept network requests at the right layer; avoid mocking axios/fetch directly
5. Practice **Component Testing Patterns** — test custom hooks with `renderHook`, providers with real or fake context values
6. Build a **Custom Render Wrapper** — one `render` utility that wraps all your providers, used across every test file

### Advanced — Scale and maintain a test suite

7. Understand **React Query / SWR Testing** — fresh `QueryClient` per test, MSW for responses, no cache bleed
8. Review **Vitest vs Jest** — know the differences, migrate confidently, handle module hoisting with `vi.hoisted()`
9. Study **Common Mistakes** — eight specific anti-patterns with before/after examples
10. Read the **Full Integration Test** — see all pieces combined into a checkout flow covering success, validation, and error states

## What You'll Learn

- The single rule that makes tests survive refactors: test behavior, not implementation
- RTL query priority — why `getByRole` beats `getByTestId` every time
- When to use `getBy`, `queryBy`, and `findBy` (and never confuse them again)
- How `userEvent.setup()` simulates real pointer/keyboard sequences vs `fireEvent`'s single synthetic dispatch
- Setting up MSW in a Node test environment and overriding handlers per test
- Why MSW is superior to mocking `axios` or `fetch` directly
- Testing custom hooks in isolation with `renderHook` and `act`
- Wrapping components in real or controlled providers without repeating setup code
- Keeping React Query and SWR caches isolated between tests
- The difference between inline and file snapshots, and when each makes sense
- The Vitest API (`vi.*`) as a drop-in Jest replacement — and where it diverges
- Eight common testing mistakes with concrete fixes

## Prerequisites

- Solid understanding of React: components, hooks (`useState`, `useEffect`, `useContext`), and the component lifecycle
- Familiarity with JavaScript async/await and Promises
- Basic knowledge of a test runner (Jest or Vitest) — you should be able to write and run a simple `it()` block
- Some exposure to React Router and data fetching (React Query or SWR) is helpful for the advanced sections but not required

## How to Use This Guide

1. **Don't skim the philosophy section.** The mental model in section 1 (behavior over implementation) is the foundation everything else builds on. Skipping it leads to the mistakes catalogued in section 11.
2. **Install the tools as you read.** Open a real project alongside this guide and apply each pattern immediately — RTL, `@testing-library/jest-dom`, `msw`, and `userEvent` are all covered with working setup code.
3. **Use the Quick Reference at the end.** The query decision tree and async decision tree at the bottom of the file are worth bookmarking — they answer the two questions that come up in every test you write.
4. **When you hit a flaky or confusing test, check section 11 first.** Most React testing pain points — missing `await`, over-mocking, index-based queries, unnecessary `act()` — are covered there with clear before/after examples.
5. **Run the full integration test example yourself.** Copy it into a project, make it pass, then break it deliberately to see how RTL's error messages guide you back to the fix.

Testing is a skill that compounds — every well-structured test you write makes the next one faster to write and easier to read. Start with one component, get it right, then let that pattern ripple through your codebase.
