# UI Component Libraries

Build polished, production-ready React UIs with shadcn/ui — a copy-paste component collection built on Radix UI primitives and Tailwind CSS that gives you full code ownership and effortless customization. This section is for React developers who want to ship accessible, well-designed interfaces without starting from scratch.

## Table of Contents

### Part 1: Getting Started
1. [Shadcn Setup](./01_shadcn_setup.md) — Installation, path aliases, Vite config, and adding your first components
2. [Shadcn Components](./02_shadcn_components.md) — Buttons, Cards, Dialogs, Alerts, Badges, Avatars, Dropdowns, Tabs, Accordions, and Sheets

### Part 2: Forms and Data Entry
3. [Forms](./03_forms.md) — React Hook Form with Zod validation, Controller integration, dynamic field arrays, multi-step forms, and server-side error handling

### Part 3: Styling and Design Systems
4. [Theming](./04_theming.md) — CSS variables, dark mode, custom themes, and Tailwind CSS customization

## Learning Path

**Beginner** — Start here if you are new to shadcn/ui:
- Chapter 1: Shadcn Setup — get your project running with shadcn/ui
- Chapter 2: Shadcn Components — learn the core components and how to combine them

**Intermediate** — Once you are comfortable with the components:
- Chapter 3: Forms — build validated, type-safe forms with React Hook Form and Zod
- Chapter 4: Theming — take control of your design system with CSS variables and dark mode

**Advanced** — Apply everything together:
- Re-read Chapter 2 with a focus on the component composition example at the end
- Revisit Chapter 3 for multi-step forms and server-side validation patterns
- Use Chapter 4 to build a cohesive theme for a full application

## What You'll Learn

- How shadcn/ui differs from traditional component libraries (you own the code)
- Setting up shadcn/ui with Vite, TypeScript, Tailwind CSS, and path aliases
- Using and customizing the most common components: Button, Card, Dialog, Alert, Badge, Avatar, Dropdown Menu, Tabs, Accordion, and Sheet
- Building accessible, keyboard-navigable UI patterns using Radix UI primitives under the hood
- Integrating React Hook Form with shadcn/ui form components for type-safe forms
- Writing Zod validation schemas that power both TypeScript types and runtime validation
- Handling dynamic form fields with `useFieldArray` and multi-step forms with step-level validation
- Propagating server-side errors back into form state with `setError`
- Theming with CSS custom properties so all components respond to a single token change
- Implementing dark mode with a custom `ThemeProvider` and a mode-toggle button

## Prerequisites

Before starting this section, you should be comfortable with:

- **React fundamentals** — JSX, props, state, and functional components
- **TypeScript basics** — types, interfaces, and generics (the components rely on TypeScript heavily)
- **Tailwind CSS** — how utility classes work; you do not need to be an expert, but you should understand `className` usage
- **React hooks** — `useState`, `useEffect`, and custom hooks (React Hook Form builds on these)
- It helps to have read the earlier React sections in this knowledge base, particularly state management and data fetching, since forms often submit data to an API

## How to Use This Guide

1. **Follow the order in Part 1 first.** The setup chapter is short but essential — skipping it means broken imports and path alias errors later.
2. **Copy the code examples into a real project.** shadcn/ui is a copy-paste library by design; the best way to learn it is to run the CLI commands and see the generated files in your codebase.
3. **Treat each component section as a reference.** Chapter 2 covers many components — do not try to memorize them all. Read it once, then come back when you need a specific component.
4. **Work through the forms chapter incrementally.** Start with the basic form, then add Zod validation, then try the dynamic fields example. Each section builds on the previous one.
5. **Use the Best Practices tables.** Each chapter ends with do/don't lists and pattern tables — these summarize the most common mistakes and save you debugging time.

Master these tools and you will spend less time wrestling with UI details and more time building features that matter — keep going, you are building the kind of skills that show up immediately in production code.
