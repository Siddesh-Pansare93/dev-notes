# React Development Guide

A comprehensive guide to modern React development with TypeScript, covering core concepts, hooks, state management, and clean code practices.

**Status**: ✅ **Complete** - All 35 tutorials have been created and are ready to use!

## What You'll Learn

- **React 19 Features**: Latest hooks and patterns including Actions, useOptimistic, and useActionState
- **Core Hooks**: useState, useEffect, useContext, useReducer, and more
- **State Management**: Zustand for simple, scalable state management
- **Data Fetching**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui for beautiful, accessible components
- **TypeScript**: Type-safe React development with best practices
- **Clean Code**: Writing maintainable, testable React applications

## Learning Path

### 00. Quick Start
- [Getting Started with React + TypeScript](./00_quick_start/01_setup.md)
- [Project Structure Best Practices](./00_quick_start/02_project_structure.md)
- [Your First Component](./00_quick_start/03_first_component.md)

### 01. Core Hooks
- [useState - Managing Component State](./01_core_hooks/01_useState.md)
- [useEffect - Side Effects and Lifecycle](./01_core_hooks/02_useEffect.md)
- [useContext - Sharing Data](./01_core_hooks/03_useContext.md)
- [useRef - DOM Access and Mutable Values](./01_core_hooks/04_useRef.md)
- [useMemo and useCallback - Performance Optimization](./01_core_hooks/05_useMemo_useCallback.md)

### 02. Advanced Hooks
- [useReducer - Complex State Logic](./02_advanced_hooks/01_useReducer.md)
- [Custom Hooks - Reusable Logic](./02_advanced_hooks/02_custom_hooks.md)
- [useActionState - Form Actions (React 19)](./02_advanced_hooks/03_useActionState.md)
- [useOptimistic - Optimistic Updates (React 19)](./02_advanced_hooks/04_useOptimistic.md)
- [useFormStatus - Form Pending State](./02_advanced_hooks/05_useFormStatus.md)

### 03. State Management with Zustand
- [Introduction to Zustand](./03_state_management/01_zustand_intro.md)
- [Creating Stores](./03_state_management/02_creating_stores.md)
- [TypeScript with Zustand](./03_state_management/03_zustand_typescript.md)
- [Advanced Patterns](./03_state_management/04_advanced_patterns.md)

### 04. Data Fetching with TanStack Query
- [Introduction to TanStack Query](./04_data_fetching/01_tanstack_intro.md)
- [useQuery - Fetching Data](./04_data_fetching/02_useQuery.md)
- [useMutation - Updating Data](./04_data_fetching/03_useMutation.md)
- [Axios Integration](./04_data_fetching/04_axios_integration.md)
- [Query Patterns and Best Practices](./04_data_fetching/05_patterns.md)

### 05. UI Libraries
- [Setting Up shadcn/ui](./05_ui_libraries/01_shadcn_setup.md)
- [Using shadcn Components](./05_ui_libraries/02_shadcn_components.md)
- [Building Forms with shadcn](./05_ui_libraries/03_forms.md)
- [Theming and Customization](./05_ui_libraries/04_theming.md)

### 06. TypeScript Patterns
- [Component Props Patterns](./06_typescript_patterns/01_props_patterns.md)
- [Generics in Components](./06_typescript_patterns/02_generics.md)
- [Type-Safe Event Handlers](./06_typescript_patterns/03_event_handlers.md)
- [Utility Types for React](./06_typescript_patterns/04_utility_types.md)

### 07. Clean Code Practices
- [Component Design Principles](./07_clean_code/01_component_design.md)
- [File and Folder Organization](./07_clean_code/02_organization.md)
- [Error Handling Patterns](./07_clean_code/03_error_handling.md)
- [Testing React Components](./07_clean_code/04_testing.md)
- [Performance Best Practices](./07_clean_code/05_performance.md)

## Prerequisites

- Basic JavaScript/TypeScript knowledge
- Understanding of HTML and CSS
- Node.js and npm installed
- Familiarity with ES6+ features (arrow functions, destructuring, modules)

## Recommended Setup

```bash
# Create a new React + TypeScript project with Vite
npm create vite@latest my-app -- --template react-ts

# Navigate to project
cd my-app

# Install dependencies
npm install

# Install additional tools
npm install zustand @tanstack/react-query axios
npm install -D tailwindcss postcss autoprefixer

# Start development server
npm run dev
```

## Key Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Library | 19.x |
| TypeScript | Type Safety | 5.x |
| Vite | Build Tool | 5.x |
| Zustand | State Management | 4.x |
| TanStack Query | Data Fetching | 5.x |
| Axios | HTTP Client | 1.x |
| shadcn/ui | UI Components | Latest |
| Tailwind CSS | Styling | 3.x |

## Learning Tips

1. **Build as You Learn**: Create a small project while going through tutorials
2. **Type Everything**: Practice TypeScript from day one
3. **Use DevTools**: Install React DevTools browser extension
4. **Read Official Docs**: React.dev has excellent documentation
5. **Practice Hooks**: Master hooks before moving to state management libraries

## Project Ideas

- **Todo App**: Practice hooks and local state
- **Weather Dashboard**: Data fetching with TanStack Query
- **E-commerce Cart**: State management with Zustand
- **Blog Platform**: Full CRUD with forms and validation
- **Social Feed**: Optimistic updates and infinite scroll

## Resources

- [React Official Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [TanStack Query Docs](https://tanstack.com/query)
- [shadcn/ui](https://ui.shadcn.com)

---

**Ready to start?** Begin with [Getting Started](./00_quick_start/01_setup.md)
