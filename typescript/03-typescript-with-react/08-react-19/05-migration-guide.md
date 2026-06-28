# React 19 Migration Guide

Upgrading to React 19 is designed to be smoother than past major versions, but there are a few breaking changes, deprecated APIs, and new patterns to adopt.

## Step 1: Upgrading Dependencies

To start migrating, update your `package.json`:

```bash
npm install react@19 react-dom@19
npm install --save-dev @types/react@19 @types/react-dom@19
```

If you are using a framework like Next.js, Remix, or Vite, ensure your framework version explicitly supports React 19 (e.g., Next.js 15).

## Step 2: Breaking Changes & Deprecations

React 19 removes several long-deprecated APIs to improve performance and bundle size.

### Removed: `defaultProps` for Functional Components
`defaultProps` are removed from functional components. Instead, use ES6 default parameters:

```tsx
// React 18:
function Card({ title, content }) { ... }
Card.defaultProps = { title: 'Untitled' };

// React 19:
function Card({ title = 'Untitled', content }: { title?: string, content: string }) { ... }
```

### Removed: `propTypes`
The `propTypes` runtime validation is no longer supported in React 19. If you still rely on them, use TypeScript for static type checking or libraries like `zod` for runtime validation.

### Changed: `forwardRef`
While `forwardRef` still works, it's unnecessary in React 19. You should refactor components to accept `ref` as a standard prop.

```tsx
// React 18
const MyButton = forwardRef((props, ref) => <button ref={ref} {...props} />);

// React 19
function MyButton({ ref, ...props }: { ref: React.Ref<HTMLButtonElement> }) {
  return <button ref={ref} {...props} />;
}
```

### Context as a Provider
You no longer need `.Provider` for Context.

```tsx
// React 18
<ThemeContext.Provider value="dark">...</ThemeContext.Provider>

// React 19
<ThemeContext value="dark">...</ThemeContext>
```

### Hook Name Changes
- `useFormState` (React 18 canary/experimental) is now `useActionState` in stable React 19.

## Step 3: Using Codemods

React provides official codemods to automatically fix deprecations across your entire codebase.

Run the React 19 codemods via `npx`:

```bash
# Example: Automatically update forwardRef syntax
npx react-codemod@latest remove-forward-ref src/

# Example: Automatically remove defaultProps
npx react-codemod@latest remove-default-props src/
```

## Step 4: Adopting New Features Incrementally

You don't need to rewrite your entire app to Server Components or Actions overnight. React 19 is fully backward compatible with standard React 18 functional components and hooks.

1. **Keep existing Client Components:** Your `useState` and `useEffect` components will work fine.
2. **Start with Form Actions:** Find a simple form and refactor it from an `onSubmit` handler to a `<form action={submitAction}>`. Use `useActionState` instead of tracking loading/error state manually.
3. **Replace Context Providers:** Do a simple find-and-replace for `.Provider`.
4. **Try the React Compiler:** If your build tool supports it, enable the React Compiler in a small section of your app and monitor performance.

## Testing Strategy During Migration

When migrating to React 19, ensure your test suite covers both the old and new patterns.

1. **Verify Suspense Boundaries:** Ensure your end-to-end tests wait for Suspense fallbacks to resolve.
2. **Test Server Actions:** If using Server Actions, write integration tests that directly call the exported server action functions, passing `FormData`.
3. **Typescript Strict Mode:** Enable `strict: true` in your `tsconfig.json`. React 19 relies heavily on proper typing, especially with Server Components and the `use` API.

Congratulations! You are now fully prepared to leverage React 19's powerful features.