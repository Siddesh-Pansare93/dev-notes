# Advanced Concurrent Features

React 19 builds on the concurrent renderer from React 18, enhancing handling of async operations, hydration, and streaming rendering.

## `useTransition` and Async Transitions

`useTransition` allows you to mark a state update as a "transition," meaning it is non-urgent. This keeps the UI responsive during expensive renders.

In React 19, `useTransition` fully supports **async functions**, which is perfect for Server Actions.

```tsx
import { useState, useTransition } from 'react';
import { updateProfile } from './actions';

export default function Profile() {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');

  const handleSubmit = () => {
    // startTransition now accepts async functions!
    startTransition(async () => {
      await updateProfile(name);
      // Wait for server action, show isPending state
    });
  };

  return (
    <div>
      <input value={name} onChange={e => setName(e.target.value)} />
      <button onClick={handleSubmit} disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}
```

## `Suspense` Boundaries

React Suspense is no longer just for code splitting with `React.lazy`. In React 19, Suspense integrates natively with data fetching in Server Components and the new `use()` API.

```tsx
import { Suspense } from 'react';

// Suspends while the promise resolves
async function ExpensiveData() {
  const data = await fetch('/api/heavy-data').then(res => res.json());
  return <div>{data.message}</div>;
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading heavy component...</div>}>
      <ExpensiveData />
    </Suspense>
  );
}
```

### The `use` API for Reading Promises Conditionally
Previously, you couldn't put hooks in loops or `if` statements. `use` is a special API that breaks this rule, resolving promises and context natively:

```tsx
import { use, Suspense } from 'react';

function UserComments({ commentsPromise }: { commentsPromise: Promise<any[]> }) {
  // Reads the promise and suspends the component
  const comments = use(commentsPromise);
  
  return (
    <ul>
      {comments.map((c: any) => <li key={c.id}>{c.text}</li>)}
    </ul>
  );
}
```

## Streaming SSR

Server-Side Rendering (SSR) is deeply integrated into React 19. Streaming SSR allows you to send HTML down to the client in chunks (streams) as they are generated.

Using `<Suspense>` boundaries acts as markers for where streaming should occur.

```html
<!-- HTML Stream 1 -->
<div>
  <h1>Page Load Fast!</h1>
  <div id="suspense-boundary-1"><!-- React places fallback UI here --></div>
</div>

<!-- HTML Stream 2 (Arrives milliseconds later) -->
<script>
  // React replaces fallback UI with resolved DataComponent HTML
  $RC(1, "resolved HTML content...");
</script>
```

## Error Boundaries in React 19

With more async code directly inside components, Error Boundaries are crucial for catching rejected promises or data fetching errors.

```tsx
'use client'; // Error boundaries are typically Client Components
import { Component, ErrorInfo, ReactNode } from "react";

class ErrorBoundary extends Component<{children: ReactNode, fallback: ReactNode}, {hasError: boolean}> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Caught by ErrorBoundary", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

Wrap your Suspense trees to gracefully handle failed data fetches:

```tsx
<ErrorBoundary fallback={<div>Oops, failed to load data.</div>}>
  <Suspense fallback={<div>Loading data...</div>}>
    <MyAsyncServerComponent />
  </Suspense>
</ErrorBoundary>
```