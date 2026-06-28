# React Server Components

React Server Components (RSC) are a first-class React primitive introduced with React 19 that fundamentally changes where and how rendering happens. This section covers everything from the mental model behind RSC to practical patterns for building production applications with server/client boundaries.

## Table of Contents

- [Server vs Client Components](./01_server_vs_client.md) — differences, capabilities, decision framework, and real-world composition patterns
- [RSC Deep Dive](./01_rsc_deep_dive.md) — the rendering model, wire format, serialization rules, caching, streaming with Suspense, and common pitfalls

## Learning Path

### Beginner
1. Start with **Server vs Client Components** — read the Introduction and Key Differences sections to build the core mental model
2. Study the Comparison Table and Decision Tree in the same file
3. Work through the Basic Examples for both component types

### Intermediate
1. Read the Component Boundaries and Data Flow Patterns sections in **Server vs Client Components**
2. Move to **RSC Deep Dive** — focus on The Rendering Model, The Two Directives, and Data Fetching in Server Components
3. Study the Server/Client Boundary and Composition section, especially the children pattern and island architecture

### Advanced
1. Read the Serialization section in **RSC Deep Dive** — understand what can and cannot cross the boundary, the function problem, and passing Promises with `use()`
2. Study Suspense and Streaming integration
3. Read RSC in Next.js App Router — caching behavior, `revalidatePath`, `revalidateTag`
4. Review the Common Pitfalls section to avoid the mistakes everyone makes first

## What You'll Learn

- Why Server Components exist and what problems they solve compared to traditional React SSR
- The exact capabilities and limitations of each component type (hooks, async/await, browser APIs, DB access)
- How the RSC wire format works and why client-side navigation with RSC feels like a SPA
- How to draw server/client boundaries correctly — and why pushing `'use client'` deep into the tree matters for bundle size
- The children pattern for placing Server Components inside Client Component wrappers
- How to pass data across the boundary — serializable props, Server Actions as the solution to the function problem
- Parallel data fetching with `Promise.all` and request deduplication with React's `cache()`
- Streaming slow components independently using `<Suspense>` without blocking the rest of the page
- Next.js App Router conventions — static vs dynamic caching, ISR, `revalidatePath`, `revalidateTag`
- How Context providers, third-party libraries, and browser-only APIs fit into the RSC model

## Prerequisites

- Solid understanding of React fundamentals — components, props, state, and the component lifecycle
- Familiarity with React hooks: `useState`, `useEffect`, `useContext`, `useRef`
- Basic knowledge of async JavaScript — Promises, `async/await`
- Some exposure to Next.js or another React framework is helpful but not required
- Understanding of what SSR (server-side rendering) means and why it exists

## How to Use This Guide

1. **Read in order the first time.** The Server vs Client file establishes the conceptual foundation. The RSC Deep Dive builds on it with internals and advanced patterns — skipping ahead will make the deeper material harder to follow.
2. **Run the code examples yourself.** The composition and boundary rules are easiest to internalize by triggering the build errors intentionally, then fixing them.
3. **Use the decision tree as a quick reference.** When you're unsure whether a component should be server or client, return to the decision tree in the Server vs Client file until the judgment becomes second nature.
4. **Pay close attention to the pitfalls.** The Common Pitfalls section in the Deep Dive covers mistakes that are non-obvious and genuinely common — Context providers needing client wrappers, server-only leaks, and the `'use client'` SSR misunderstanding are all real gotchas.
5. **Re-read the serialization rules when something breaks at the boundary.** Most RSC runtime errors in production trace back to a non-serializable prop or an import that crosses the wrong direction — the serialization section is your debugging checklist.

The shift from traditional React to RSC is a genuine mental model change, not just new API surface. Give it time, build something real with it, and it will click.
