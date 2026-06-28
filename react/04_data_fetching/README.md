# Data Fetching & Async

Master server state management in React using TanStack Query (React Query) — from basic data fetching to advanced patterns like infinite scroll, optimistic updates, and Suspense integration. This section is for React developers who want to move beyond manual `useEffect`/`useState` fetching and build apps that handle data reliably and efficiently.

## Table of Contents

1. [TanStack Query Intro](./01_tanstack_intro.md) — Why React Query, setup, QueryClient, useQuery basics, pagination, infinite queries, custom hooks, error handling
2. [useQuery In Depth](./02_useQuery.md) — Query keys, enabled queries, query states, stale time, background refetching, placeholders
3. [useMutation](./03_useMutation.md) — Creating, updating, and deleting data; lifecycle callbacks; cache invalidation; optimistic updates; mutate vs mutateAsync
4. [Axios Integration](./04_axios_integration.md) — Axios instance setup, interceptors, authentication headers, request cancellation, TypeScript API patterns
5. [Advanced Patterns](./05_patterns.md) — Offset & cursor pagination, infinite scroll with IntersectionObserver, parallel queries, dependent queries, prefetching, Suspense mode, invalidation strategies

## Learning Path

### Beginner — Get async data on screen

Read in order:
1. Chapter 1 — TanStack Query Intro (understand what problem it solves and set up QueryClientProvider)
2. Chapter 2 — useQuery In Depth (learn query keys, loading/error states, and stale-time configuration)
3. Chapter 3 — useMutation (handle form submissions, POST/PUT/DELETE, and invalidate stale data)

### Intermediate — Production-grade patterns

Continue with:
4. Chapter 4 — Axios Integration (replace raw `fetch` with a typed Axios instance and interceptors)
5. Chapter 5, sections 1–4 — Pagination, Infinite Scroll, Parallel Queries, Dependent Queries

### Advanced — Performance and UX polish

Complete the section with:
5. Chapter 5, sections 5–9 — Prefetching, Optimistic Updates, Suspense Mode, Query Invalidation Strategies, Global Configuration

## What You'll Learn

- Why TanStack Query eliminates the `useEffect` + `useState` data-fetching boilerplate
- How to set up `QueryClient` and `QueryClientProvider` with sensible global defaults
- Query keys as cache identifiers — hierarchical key design for clean invalidation
- Fetching with `useQuery`: loading states, error states, background refetching, `staleTime`, `enabled`
- Writing data with `useMutation`: lifecycle callbacks (`onMutate`, `onSuccess`, `onError`, `onSettled`)
- Optimistic updates — instant UI feedback with cache snapshots and automatic rollback
- Integrating Axios: creating a reusable instance, request/response interceptors, auth token injection, request cancellation
- Pagination strategies: offset-based vs cursor-based, `keepPreviousData` to avoid flash
- Infinite scroll with `useInfiniteQuery` and the IntersectionObserver API
- Running multiple queries in parallel with `useQueries` and chaining dependent queries with `enabled`
- Prefetching on hover or in route loaders for zero-wait navigation
- Suspense mode with `useSuspenseQuery` and pairing with `ErrorBoundary` for declarative UI
- TypeScript patterns: typing query responses, mutation variables, and error shapes

## Prerequisites

Before starting this section you should be comfortable with:

- React hooks — `useState`, `useEffect`, `useRef`, `useContext`
- Async JavaScript — Promises, `async/await`, `fetch`
- Basic TypeScript — interfaces, generics, and type assertions
- React component architecture covered in earlier React sections

You do not need prior experience with any data-fetching library.

## How to Use This Guide

1. **Follow the beginner path first.** The intro chapter explains the mental model. If you skip it, later patterns (optimistic updates, cache invalidation) will feel like magic rather than logic.
2. **Run the code examples as you read.** Spin up a small Vite + React project, paste the snippets, and watch the DevTools panel — seeing cache states update in real time makes the concepts stick.
3. **Install React Query DevTools.** Every example is easier to understand when you can see query keys, cache entries, and fetch timestamps live in the browser.
4. **Focus on query keys.** They are the core concept. When something doesn't invalidate as expected, the answer is almost always in how the key is structured.
5. **Come back to Chapter 5 as needed.** The advanced patterns chapter is a reference — read it once for awareness, then return to specific sections (prefetching, Suspense) when you hit those use cases in real projects.

Data fetching is where most React apps spend most of their complexity budget — master it here and the rest of your component code gets dramatically simpler.
