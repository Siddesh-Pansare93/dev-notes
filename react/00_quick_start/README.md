# React Quick Start

Get your first React + TypeScript project up and running in minutes — this section covers everything from scaffolding a project with Vite to writing your first type-safe components and organizing your codebase the way professionals do.

## Table of Contents

| # | File | What It Covers |
|---|------|----------------|
| 1 | [Setup](./01_setup.md) | Project creation with Vite, TypeScript config, Tailwind CSS, essential libraries, VS Code extensions |
| 2 | [Project Structure](./02_project_structure.md) | Folder layout, file naming conventions, feature-based organization, path aliases, index exports |
| 3 | [First Component](./03_first_component.md) | Functional components, JSX rules, typed props, event handling, conditional rendering, list rendering, composition |

## Learning Path

### Beginner
Start here if you have never used React or TypeScript before.

1. **Chapter 1 — Setup**: Bootstrap a Vite + React + TypeScript project, install Tailwind CSS, and verify the dev server runs
2. **Chapter 3 — First Component**: Learn JSX syntax, write your first typed component, pass props, handle events, and render lists

### Intermediate
You know JavaScript and have seen some React — tighten up your workflow.

1. **Chapter 1 — Setup** (skim): Focus on the TypeScript config, path aliases, and essential library installs (Zustand, TanStack Query, React Router)
2. **Chapter 2 — Project Structure**: Learn the feature-based folder layout and `index.ts` barrel export pattern
3. **Chapter 3 — First Component**: Solidify JSX best practices, proper event typing, and component composition patterns

### Advanced
You are migrating an existing project or establishing conventions for a team.

1. **Chapter 2 — Project Structure**: Deep-dive the feature module pattern, co-located tests, environment variable management, and `@/` path alias setup in both `tsconfig.json` and `vite.config.ts`
2. **Chapter 3 — First Component**: Review the anti-patterns and best practices sections as a team checklist

## What You'll Learn

- Scaffold a modern React + TypeScript project with Vite in under two minutes
- Configure TypeScript in strict mode for maximum type safety
- Set up Tailwind CSS and understand the PostCSS pipeline
- Install and wire up the essential React ecosystem: React Router, TanStack Query, Zustand, and Axios
- Organize source files using a feature-based folder structure that scales beyond toy apps
- Name files consistently — PascalCase components, `use`-prefixed hooks, `.types.ts` type files
- Configure `@/` path aliases so imports stay readable as the project grows
- Write functional components with typed props using TypeScript interfaces
- Understand JSX rules: single root element, self-closing tags, `className` vs `class`, curly brace expressions
- Handle DOM events with correct React event types (`React.MouseEvent`, `React.FormEvent`)
- Compose complex UIs from small, single-responsibility components
- Render lists correctly with stable `key` props
- Apply conditional rendering using ternary operators and the `&&` short-circuit pattern

## Prerequisites

- Basic JavaScript (ES6+): arrow functions, destructuring, modules, `async/await`
- Familiarity with HTML and CSS at a beginner level
- Node.js 16 or higher installed (`node --version` to check)
- A code editor — VS Code is assumed throughout the examples

No prior React or TypeScript experience is required.

## How to Use This Guide

1. **Read linearly the first time.** The three chapters build on each other — setup, then structure, then components. Skipping ahead means missing context.
2. **Type everything by hand.** Resist copy-pasting. Typing code examples forces you to read each token and builds muscle memory for JSX and TypeScript syntax.
3. **Keep a running project open.** Create a Vite project in chapter 1 and build the examples from chapters 2 and 3 inside it — seeing changes in the browser cements the concepts.
4. **Pause on the anti-pattern sections.** Chapter 3 lists common mistakes (mutating props, missing list keys, conditional hook calls) — these explain a large share of real-world React bugs.
5. **Follow the "Next Steps" links at the bottom of each file.** They point into the core hooks section, which picks up exactly where this quick start leaves off.

The best React developers write small, focused components and let the folder structure do the heavy lifting — start with these habits on day one.
