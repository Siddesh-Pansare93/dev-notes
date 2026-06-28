# Migrating to React 19

A practical, no-nonsense guide to upgrading your existing React codebase to React 19. This section covers every breaking change, common pitfall, and the step-by-step checklist you need to move confidently from React 18 to React 19.

## Table of Contents

- [Migration Guide](./01_migration_guide.md)
  - Breaking Changes — `forwardRef`, removed APIs, Context syntax, `useRef` types, PropTypes
  - Deprecated APIs Still in Transition — test utilities, `useReducer` behavior
  - New Root API Error Handling — `onCaughtError`, `onUncaughtError`, `onRecoverableError`
  - Official Codemods — what they handle and what they miss
  - Updating Dependencies — compatibility table for major ecosystem packages
  - Common Migration Pitfalls — TypeScript ref errors, `useFormState` rename, StrictMode surprises
  - Step-by-Step Migration Checklist — 9-step upgrade process
  - Next.js Pages Router to App Router — migration mapping

## Learning Path

**Beginner — upgrading a small or personal project:**
1. Start with "The Short Version" in the migration guide — run the codemod and see what breaks
2. Read the Breaking Changes section to understand the `forwardRef` removal
3. Follow the Step-by-Step Migration Checklist from top to bottom

**Intermediate — upgrading a production app:**
1. Read the full Breaking Changes section before touching anything
2. Study the Deprecated APIs section to know what still works but needs eventual attention
3. Read Common Migration Pitfalls in full — especially the TypeScript ref typing and `useFormState` rename
4. Audit your dependency compatibility table before upgrading
5. Work through the checklist methodically, starting with React 18.3 as a stepping stone

**Advanced — migrating a large codebase or library:**
1. Read the forwardRef and TypeScript sections carefully — complex generic types need manual review
2. Study the StrictMode double-invocation pitfall and React Compiler memo behavior changes
3. Review the New Root API error handling callbacks and integrate with your error reporting
4. If using Next.js, read the Pages Router to App Router migration section last

## What You'll Learn

- Why `forwardRef` was removed and how to refactor components to pass `ref` as a plain prop
- How to update TypeScript types for refs, including `useImperativeHandle` patterns
- Which long-deprecated APIs (`ReactDOM.render`, `ReactDOM.hydrate`, PropTypes) are now fully removed
- The new simplified Context provider syntax (`<MyContext value={...}>` instead of `<MyContext.Provider>`)
- How to rename `useFormState` to `useActionState` and simplify pending state tracking
- How to run the official React 19 codemod and what it handles automatically versus what needs manual fixes
- How to check ecosystem dependency compatibility before upgrading (Next.js, testing libraries, UI kits)
- How to use the new `onCaughtError` / `onUncaughtError` error reporting callbacks in `createRoot`
- Which parts of your React 18 code require zero changes (class components, hooks, event handlers)

## Prerequisites

- Comfortable with React 18 hooks and component patterns — you should know `useRef`, `useContext`, `useEffect`, and `useState` well
- Familiarity with TypeScript in React projects (the biggest migration pain points involve TS types)
- Basic understanding of the React 18 root API (`createRoot`, `hydrateRoot`) — if you're still on `ReactDOM.render`, read React 18 migration notes first
- Node.js and npm/npx available in your terminal for running codemods

## How to Use This Guide

1. **Upgrade to React 18.3 first** — React 18.3 adds deprecation warnings for everything React 19 removes. Fix those warnings before touching your React version number.
2. **Run the codemod on a branch** — `npx codemod@latest react/19/migration-recipe` handles most mechanical changes. Commit the codemod output separately so you can review the diff cleanly.
3. **Use the checklist as your source of truth** — the Step-by-Step Migration Checklist in the guide is ordered by dependency. Do not skip steps or reorder them.
4. **Fix TypeScript errors before runtime errors** — TypeScript will surface most breaking changes at compile time. Get a clean build first, then run the app.
5. **Enable StrictMode during development** — React 19 + StrictMode will expose hidden mutations in render that were previously silent. Treat every new StrictMode warning as a real bug, not noise.

Migration is one of those tasks that looks intimidating on paper but goes smoothly when done methodically — most React 18 codebases that follow best practices will have very few manual changes to make.
