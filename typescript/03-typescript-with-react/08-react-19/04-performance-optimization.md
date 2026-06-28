# Performance Optimization

React 19 focuses on automating performance optimizations that were previously a manual, error-prone process.

## The React Compiler (formerly React Forget)

The most anticipated feature of React 19 is the React Compiler. It is an optional (but highly recommended) build-time tool that understands React semantics.

### What it does: Automatic Memoization

In React 18, you manually add `useMemo`, `useCallback`, and `React.memo` to prevent unnecessary re-renders.

```tsx
// React 18
import { useMemo, useCallback } from 'react';

function ItemList({ items, onSelect }) {
  // Manual memoization
  const sortedItems = useMemo(() => items.sort(), [items]);
  
  const handleClick = useCallback((id) => {
    onSelect(id);
  }, [onSelect]);

  return (
    <ul>
      {sortedItems.map(item => (
        <Item key={item.id} item={item} onClick={() => handleClick(item.id)} />
      ))}
    </ul>
  );
}
```

With the React Compiler enabled in React 19, you write plain JavaScript. The compiler automatically memoizes values and functions!

```tsx
// React 19 with Compiler enabled
function ItemList({ items, onSelect }) {
  const sortedItems = items.sort();
  
  const handleClick = (id) => {
    onSelect(id);
  };

  return (
    <ul>
      {sortedItems.map(item => (
        <Item key={item.id} item={item} onClick={() => handleClick(item.id)} />
      ))}
    </ul>
  );
}
```

The compiler guarantees that `ItemList` and its children only re-render if `items` or `onSelect` actually change semantically, without you managing the dependency arrays.

### When Manual Optimization is Needed

While the compiler handles 90% of cases, you might still need to optimize manually when:

1. **Working around bugs in the compiler**
2. **Highly complex reference-equality requirements**
3. **Optimizing deeply nested or complex external libraries**
4. **When the compiler is turned off**

In those cases, `useMemo` and `useCallback` still work identically to React 18.

## Profiling with React DevTools

When debugging performance issues:

1. Open the "Profiler" tab in the React DevTools extension.
2. Hit "Record", interact with your app, and stop recording.
3. Check the "Commit" view to see which components re-rendered and how long they took.
4. If a component re-renders unexpectedly, use the "Why did this render?" feature.

With React Compiler, you should see significantly fewer re-renders in the flame graph.

## Code Splitting

Code splitting is crucial for reducing your initial Javascript bundle size.

### Using `React.lazy`

For client components that are not needed immediately (e.g., modals, tabs below the fold), lazy load them:

```tsx
import { lazy, Suspense, useState } from 'react';

// The chunk is loaded only when <HeavyChart /> is rendered
const HeavyChart = lazy(() => import('./HeavyChart'));

export default function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>View Analytics</button>
      
      {showChart && (
        <Suspense fallback={<div>Loading Analytics...</div>}>
          <HeavyChart />
        </Suspense>
      )}
    </div>
  );
}
```

By combining React 19 Server Components (which send 0 bytes of JS) and `React.lazy` for Client Components, you can achieve lightning-fast Time to Interactive (TTI) scores.