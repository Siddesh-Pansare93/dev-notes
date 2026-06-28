# Migrating to React 19

React 19 has fewer breaking changes than React 18 did. The biggest shifts are the removal of long-deprecated APIs and behavior changes around `ref`, `forwardRef`, and `Context`. If you're on React 18 and following best practices, most of these won't touch you.

---

## The Short Version

```bash
npm install react@19 react-dom@19
npx codemod@latest react/19/migration-recipe
```

Then fix what breaks. This guide explains what breaks and why.

---

## Breaking Changes

### 1. `forwardRef` Is Gone — Refs Are Now Props

The biggest ergonomic change. `forwardRef` is removed in React 19. Refs are now passed as regular props.

```jsx
// React 18: forwardRef wrapper required
import { forwardRef } from 'react';

const Input = forwardRef(function Input({ label, ...props }, ref) {
  return (
    <div>
      <label>{label}</label>
      <input ref={ref} {...props} />
    </div>
  );
});

// Usage
function Form() {
  const inputRef = useRef(null);
  return <Input ref={inputRef} label="Name" />;
}

// React 19: ref is just a prop
function Input({ label, ref, ...props }) {
  return (
    <div>
      <label>{label}</label>
      <input ref={ref} {...props} />
    </div>
  );
}

// Usage — identical from the caller's side
function Form() {
  const inputRef = useRef(null);
  return <Input ref={inputRef} label="Name" />;
}
```

The codemod handles this automatically for most cases. Manually check:
- Components that used `forwardRef` with complex generics in TypeScript
- Library code that exposed `forwardRef` components — update the type signatures
- Any use of `React.forwardRef` as a type (change to `React.FC` or function signature)

**TypeScript migration:**

```tsx
// React 18
import { forwardRef, ForwardRefRenderFunction } from 'react';

interface InputProps {
  label: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label }, ref) {
    return <input ref={ref} aria-label={label} />;
  }
);

// React 19
interface InputProps {
  label: string;
  ref?: React.Ref<HTMLInputElement>;
}

function Input({ label, ref }: InputProps) {
  return <input ref={ref} aria-label={label} />;
}
```

### 2. `ReactDOM.render` and `ReactDOM.hydrate` — Removed

These were deprecated in React 18. They're removed in React 19.

```jsx
// React 17 / React 18 (deprecated)
import ReactDOM from 'react-dom';
ReactDOM.render(<App />, document.getElementById('root'));
ReactDOM.hydrate(<App />, document.getElementById('root'));

// React 19
import { createRoot, hydrateRoot } from 'react-dom/client';
createRoot(document.getElementById('root')).render(<App />);
hydrateRoot(document.getElementById('root'), <App />);
```

If you're already on React 18 and following the migration guide, you already made this change.

### 3. `act` Import Change

```jsx
// React 18
import { act } from 'react-dom/test-utils';

// React 19 — import from 'react' directly
import { act } from 'react';
```

### 4. Context API — No More `Context.Provider` Wrapper

The `Context.Provider` syntax still works but is deprecated. Use the Context object directly as the provider:

```jsx
const ThemeContext = createContext('light');

// React 18 (still works in 19, but deprecated)
<ThemeContext.Provider value="dark">
  {children}
</ThemeContext.Provider>

// React 19 — Context is the provider
<ThemeContext value="dark">
  {children}
</ThemeContext>
```

This is a minor syntax change. The codemod handles it.

### 5. `useRef` Requires an Argument

```jsx
// React 18: initial value was optional
const ref = useRef();       // type: MutableRefObject<undefined>
const ref2 = useRef(null);  // type: MutableRefObject<null>

// React 19: TypeScript types tightened — must pass null for DOM refs
const ref = useRef<HTMLDivElement>(null);  // correct
const ref = useRef<HTMLDivElement>();      // TypeScript error in React 19 types
```

### 6. Removed Prop Types Warning Infrastructure

`propTypes` and `defaultProps` on function components are removed (they were deprecated in React 18.3). TypeScript / JSDoc is the replacement.

```jsx
// React 18 (deprecated but worked)
function Button({ label, size }) { ... }
Button.propTypes = {
  label: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};
Button.defaultProps = {
  size: 'md',
};

// React 19 — use TypeScript
interface ButtonProps {
  label: string;
  size?: 'sm' | 'md' | 'lg';
}
function Button({ label, size = 'md' }: ButtonProps) { ... }
```

`defaultProps` on class components still work in React 19.

### 7. String Refs — Removed

Already removed in React 17. If you're on React 18, you won't have these.

```jsx
// Removed long ago
<div ref="myDiv" />  // ❌ not a thing anymore
```

---

## Deprecated APIs — Still Working, Will Break Later

### `useReducer` Signature Change

```jsx
// Old: third argument (initializer function) is non-standard
// React 19 aligns the behavior — if you were relying on the old behavior, check your reducers

// The API itself isn't deprecated, but lazy initialization behavior changed subtly:
// Old: useReducer(reducer, initArg, init) — init(initArg) called on mount
// New: same, but lazy init is now consistent with StrictMode double-invoke
```

### `react-dom/test-utils` Utilities

Several test utilities moved:

```jsx
// React 18
import { act, renderHook } from 'react-dom/test-utils';
import { render, fireEvent } from '@testing-library/react';

// React 19
import { act } from 'react';                    // moved to react package
import { renderHook } from 'react-dom';          // moved (or use @testing-library/react)
```

---

## New Root API Behavior Changes

If you're using `createRoot` (React 18+), behavior in React 19 is the same but with tighter error handling:

```jsx
const root = createRoot(container);
root.render(<App />);

// React 19: errors thrown during render that aren't caught by an ErrorBoundary
// now call the new error reporting callbacks:
const root = createRoot(container, {
  onCaughtError(error, errorInfo) {
    // Error caught by ErrorBoundary
    logErrorToService(error, errorInfo.componentStack);
  },
  onUncaughtError(error, errorInfo) {
    // Error NOT caught — would have called window.onerror
    reportCriticalError(error);
  },
  onRecoverableError(error, errorInfo) {
    // Hydration mismatch or other recoverable error
    console.warn('Recoverable error:', error);
  },
});
```

These replace the old `onError` in `hydrateRoot` options and the `window.onerror` catch-all pattern.

---

## Codemods

React 19 ships an official codemod that handles the mechanical changes:

```bash
# Run the full React 19 migration recipe
npx codemod@latest react/19/migration-recipe

# Or run individual transforms:
npx codemod@latest react/19/replace-string-ref
npx codemod@latest react/19/replace-act-import
npx codemod@latest react/19/replace-use-form-state     # useFormState → useActionState
npx codemod@latest react/19/prop-types-typescript      # removes propTypes, adds TS
```

**The codemod does NOT handle:**
- `forwardRef` in TypeScript with complex generic types — review manually
- Third-party library types that expose `ForwardRefExoticComponent` — wait for library updates
- Custom renderers — these have a separate migration path

---

## Updating Dependencies

Before updating React, audit your dependencies:

```bash
# Check what needs updating
npx npm-check-updates -u --filter react,react-dom
npx npm-check-updates -u --filter "@types/react,@types/react-dom"

# Check peer deps
npm ls react
```

### Major Dependencies and Their React 19 Status

| Package | React 19 Support |
|---|---|
| Next.js 15+ | Full support, App Router recommended |
| Remix 2.x | Full support |
| React Router v7 | Full support |
| React Testing Library 16+ | Full support |
| Framer Motion 11+ | Full support |
| React Hook Form 7.50+ | Full support |
| TanStack Query v5+ | Full support |
| TanStack Router v1+ | Full support |
| Storybook 8+ | Full support |
| MUI 6+ | Full support |
| Chakra UI 3+ | Full support |
| Radix UI 2+ | Full support |

```bash
# Update types (critical — React 19 types changed significantly)
npm install @types/react@19 @types/react-dom@19
```

---

## Common Migration Pitfalls

### Pitfall 1: TypeScript Errors from Ref Typing

After removing `forwardRef`, ref types often need adjustment:

```tsx
// Before (React 18)
type ButtonHandle = {
  focus: () => void;
  click: () => void;
};

const Button = forwardRef<ButtonHandle, ButtonProps>(
  function Button(props, ref) {
    useImperativeHandle(ref, () => ({
      focus: () => buttonRef.current?.focus(),
      click: () => buttonRef.current?.click(),
    }));
    const buttonRef = useRef<HTMLButtonElement>(null);
    return <button ref={buttonRef} {...props} />;
  }
);

// After (React 19) — useImperativeHandle still works, ref is just a prop now
type ButtonHandle = {
  focus: () => void;
  click: () => void;
};

function Button({ ref, ...props }: ButtonProps & { ref?: React.Ref<ButtonHandle> }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  useImperativeHandle(ref, () => ({
    focus: () => buttonRef.current?.focus(),
    click: () => buttonRef.current?.click(),
  }));
  
  return <button ref={buttonRef} {...props} />;
}
```

### Pitfall 2: Library Components Still Using forwardRef

`forwardRef` still exists as a compatibility shim in React 19, but the types are deprecated. Libraries will emit TypeScript deprecation warnings until they update. This is cosmetic — it still works.

```tsx
// Your consuming code — no change needed for library forwardRef components
const inputRef = useRef<HTMLInputElement>(null);
return <ThirdPartyInput ref={inputRef} />;  // still works
```

### Pitfall 3: `useFormState` Renamed to `useActionState`

```jsx
// React 18 / react-dom (old name)
import { useFormState } from 'react-dom';
const [state, action] = useFormState(serverAction, initialState);

// React 19 (new name, new package)
import { useActionState } from 'react';
const [state, action, isPending] = useActionState(serverAction, initialState);
```

Differences beyond the rename:
- Moved from `react-dom` to `react`
- Returns `isPending` as a third value (replaces needing `useTransition`)
- `isPending` starts `false`, goes `true` during action execution

The codemod handles the rename but you'll need to update code that manually tracked pending state:

```jsx
// Before (using useFormState + useTransition)
import { useFormState } from 'react-dom';
import { useTransition } from 'react';

const [state, action] = useFormState(serverAction, {});
const [isPending, startTransition] = useTransition();
const wrappedAction = (formData) => startTransition(() => action(formData));

// After
import { useActionState } from 'react';
const [state, action, isPending] = useActionState(serverAction, {});
```

### Pitfall 4: StrictMode Double-Invocation Surprises

React 19 + StrictMode double-invokes more lifecycle phases during development. Code that had hidden side effects in render will break more visibly. This is intentional:

```jsx
// ❌ This breaks in StrictMode React 19 (hidden mutation during render)
function Component() {
  const cache = {};
  
  // cache is populated during first invoke, returned during second invoke
  // but it's a different cache object → inconsistent
  if (!cache.result) {
    cache.result = expensiveOperation();  // mutation during render
  }
  
  return <div>{cache.result}</div>;
}

// ✅ Use proper caching
import { cache } from 'react';  // or useMemo
const getExpensiveResult = cache(() => expensiveOperation());

function Component() {
  const result = getExpensiveResult();  // cached, no mutation in render
  return <div>{result}</div>;
}
```

### Pitfall 5: Custom Hooks That Return Functions Now Get Different Memo Behavior

With the React Compiler, functions returned from custom hooks may be differently memoized than manual `useCallback` implementations. If a custom hook returns a callback that consumers memoize against, verify the behavior:

```jsx
// Custom hook that returns a callback
function useSearch() {
  const [results, setResults] = useState([]);
  
  // React Compiler will decide when to memoize this
  const search = async (query) => {
    const data = await fetchResults(query);
    setResults(data);
  };
  
  return { results, search };
}

// Consumer — if they depended on search reference stability, verify
function SearchPage() {
  const { results, search } = useSearch();
  
  useEffect(() => {
    search('initial');
  }, [search]);  // if search reference is stable, effect runs once — verify this
}
```

---

## Step-by-Step Migration Checklist

```
[ ] 1. Upgrade to React 18.3 first (adds deprecation warnings for React 19 removals)
        npm install react@18.3 react-dom@18.3

[ ] 2. Fix all React 18.3 deprecation warnings in console
        - Remove forwardRef where you control the component
        - Move away from propTypes / defaultProps on function components
        - Replace ReactDOM.render with createRoot
        - Replace ReactDOM.hydrate with hydrateRoot

[ ] 3. Run the codemod
        npx codemod@latest react/19/migration-recipe

[ ] 4. Upgrade React
        npm install react@19 react-dom@19 @types/react@19 @types/react-dom@19

[ ] 5. Fix TypeScript errors
        - Update forwardRef generic types
        - Fix useRef<T> to useRef<T>(null) for DOM refs
        - Update Context.Provider to Context

[ ] 6. Update test utilities
        - Change `import { act } from 'react-dom/test-utils'` to `import { act } from 'react'`
        - Update any renderHook imports

[ ] 7. Update major dependencies
        - Check peer dep compatibility for React 19
        - Update @testing-library/react if below v16

[ ] 8. Enable StrictMode and fix issues
        - Run in dev mode and check console for double-invoke issues
        - Fix any mutations during render

[ ] 9. (Optional) Enable React Compiler
        npm install babel-plugin-react-compiler
        - Remove manual useMemo/useCallback where compiler handles it
        - Add eslint-plugin-react-compiler to catch violations
```

---

## Migrating from Pages Router to App Router (Next.js)

Not strictly React 19, but usually done together:

```
pages/
  _app.jsx        → app/layout.jsx (Server Component)
  _document.jsx   → app/layout.jsx (merge <html>, <head> here)
  index.jsx       → app/page.jsx
  api/[route].js  → app/api/[route]/route.js (Route Handlers)

getServerSideProps → async Server Component (direct fetch/DB)
getStaticProps    → async Server Component with static caching
getStaticPaths    → generateStaticParams()
```

```jsx
// Before (pages/blog/[slug].jsx)
export async function getServerSideProps({ params }) {
  const post = await db.posts.findUnique({ where: { slug: params.slug } });
  return { props: { post } };
}
export default function BlogPost({ post }) {
  return <article>{post.title}</article>;
}

// After (app/blog/[slug]/page.jsx)
export default async function BlogPost({ params }) {
  const post = await db.posts.findUnique({ where: { slug: params.slug } });
  return <article>{post.title}</article>;
}
```

---

## What Doesn't Need to Change

- Class components — still fully supported, no plans to remove
- `useEffect`, `useRef`, `useState`, `useContext` — unchanged
- Error boundaries (class-based) — still the way to catch render errors
- `createPortal` — unchanged
- All event handling — unchanged
- `Suspense` with `lazy()` — unchanged
- `useReducer` — unchanged (minor lazy init behavior alignment)
