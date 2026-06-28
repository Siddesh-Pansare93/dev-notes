# Concurrent Rendering in React 19

Concurrent rendering lets React interrupt, pause, and resume rendering work. The practical result: the UI stays responsive during expensive updates. React 19 polishes the concurrent APIs that shipped as opt-in in React 18 and makes them easier to use correctly.

---

## The Core Mental Model

In synchronous (legacy) React, once rendering starts it runs to completion — blocking the main thread. In concurrent mode, React can pause a render mid-way, hand control back to the browser for a frame, then resume. This enables:

- Keeping animations smooth during heavy re-renders
- Not blocking typing/clicking while a slow component re-renders
- Showing stale UI while new UI loads (instead of showing nothing/spinner)

Concurrent rendering is **not parallelism** — React is still single-threaded. It's cooperative multitasking within the JS event loop.

```
Synchronous rendering:
  [Expensive render ─────────────────────] [Browser paint] [Next frame]
  ← user input is blocked during this →

Concurrent rendering:
  [Chunk 1][yield][Chunk 2][yield][Chunk 3] [Browser paint] [Next frame]
              ↑ browser handles input here
```

---

## Concurrent vs Legacy Mode

### React 18+ (Concurrent by Default)

If you use `createRoot`, you're in concurrent mode. There's no flag to flip.

```jsx
// React 17 (legacy mode)
import ReactDOM from 'react-dom';
ReactDOM.render(<App />, document.getElementById('root'));

// React 18+ (concurrent mode)
import { createRoot } from 'react-dom/client';
createRoot(document.getElementById('root')).render(<App />);
```

The concurrent APIs (`useTransition`, `useDeferredValue`, `Suspense` for data) only work with `createRoot`. If you're on `ReactDOM.render`, upgrade first.

---

## `useTransition` — Marking Low-Priority Updates

`useTransition` lets you mark a state update as non-urgent. React will process urgent updates (typing, clicking) first, then process the transition.

### Signature

```jsx
const [isPending, startTransition] = useTransition();
```

- `startTransition(fn)` — wrap the low-priority state update inside `fn`
- `isPending` — true while the transition is being processed

### Before (React 17) vs After (React 18/19)

```jsx
// React 17: heavy filter blocks typing
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  function handleChange(e) {
    setQuery(e.target.value);
    setResults(computeHeavyFilter(e.target.value));  // blocks UI
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      <ResultList results={results} />
    </>
  );
}

// React 18/19: typing stays snappy
import { useState, useTransition } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    setQuery(e.target.value);  // urgent — updates immediately
    startTransition(() => {
      setResults(computeHeavyFilter(e.target.value));  // can be interrupted
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending && <span>Filtering...</span>}
      <ResultList results={results} />
    </>
  );
}
```

### useTransition with Async (React 19)

React 19 extends `startTransition` to handle async functions natively. The transition stays pending until the async work resolves.

```jsx
// React 18: can't await in startTransition
function TabSwitcher() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();

  function selectTab(next) {
    startTransition(() => {
      setTab(next);
      // can't use await here in React 18
    });
  }
}

// React 19: async startTransition
function TabSwitcher() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();

  async function selectTab(next) {
    startTransition(async () => {  // async function supported
      const data = await fetchTabData(next);
      setTab(next);
      setData(data);
      // isPending stays true until this entire async function resolves
    });
  }

  return (
    <div>
      {['home', 'about', 'posts'].map(t => (
        <button
          key={t}
          onClick={() => selectTab(t)}
          style={{ opacity: isPending ? 0.7 : 1 }}
        >
          {t}
        </button>
      ))}
      {isPending ? <Spinner /> : <TabContent tab={tab} />}
    </div>
  );
}
```

### What Can Go Inside startTransition

```jsx
// ✅ State updates — the primary use case
startTransition(() => {
  setTab('profile');
  setData(newData);  // multiple updates batch together
});

// ✅ React 19: async operations
startTransition(async () => {
  const data = await fetchProfile(userId);
  setProfile(data);
});

// ❌ Side effects — these still run immediately
startTransition(() => {
  console.log('this runs right now');
  localStorage.setItem('tab', 'profile');  // immediate
  setTab('profile');  // deferred
});
```

### Transition Priority vs Urgent Priority

React has two priority levels for state updates:
- **Urgent**: user input events (typing, clicking) — must respond immediately
- **Transition**: everything else wrapped in `startTransition`

If a new urgent update arrives while a transition is processing, React abandons the in-progress transition render and handles the urgent update first. The transition rerenders afterwards with fresh state.

```jsx
// User types 'a' → 'ab' → 'abc' rapidly
// React processes each keypress urgently (updates `query` immediately)
// The transition (filtering results) gets interrupted and restarted
// with 'abc' rather than completing stale renders for 'a' and 'ab'
```

---

## `useDeferredValue` — Debounce Without Timers

`useDeferredValue` creates a deferred copy of a value that lags behind the real value during rendering. When the real value updates, React shows the deferred (stale) UI while re-rendering with the new value in the background.

### Signature

```jsx
const deferredValue = useDeferredValue(value);
```

### When to Use This vs `useTransition`

- `useTransition`: you control the state update — wrap it yourself
- `useDeferredValue`: you receive the value as a prop (or from external state you don't control)

```jsx
// useTransition — you own the state setter
function Parent() {
  const [value, setValue] = useState('');
  const [isPending, startTransition] = useTransition();

  return <input onChange={e => startTransition(() => setValue(e.target.value))} />;
}

// useDeferredValue — value comes from outside
function SlowList({ query }) {  // prop from parent
  const deferredQuery = useDeferredValue(query);
  // renders with deferredQuery (possibly stale) while catching up to query
  return <HeavyList filter={deferredQuery} />;
}
```

### Full Example

```jsx
import { useState, useDeferredValue, memo } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  
  const isStale = query !== deferredQuery;

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {/* Input always reflects latest query */}
      {/* Results render with deferred query — stale until caught up */}
      <div style={{ opacity: isStale ? 0.7 : 1 }}>
        <ResultList query={deferredQuery} />
      </div>
    </div>
  );
}

// memo is important here — prevents re-render when deferredQuery hasn't changed
const ResultList = memo(function ResultList({ query }) {
  const results = computeExpensiveResults(query);
  return <ul>{results.map(r => <li key={r.id}>{r.name}</li>)}</ul>;
});
```

Without `memo`, `ResultList` would re-render on every parent render anyway (defeating the point). The deferred value only helps if the deferred component is memoized.

---

## Suspense — Declarative Loading States

Suspense lets you declaratively define loading UI for components that aren't ready yet. In React 19, it works with data fetching via RSC and the `use()` hook, not just lazy imports.

### Basic Mechanics

```jsx
import { Suspense } from 'react';

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SlowComponent />   {/* "suspends" while loading */}
    </Suspense>
  );
}
```

When `SlowComponent` suspends (throws a Promise), React catches it, renders the `fallback`, and re-renders `SlowComponent` when the promise resolves.

### Suspense with lazy()

```jsx
import { lazy, Suspense } from 'react';

// Bundle-splits HeavyEditor into a separate chunk
const HeavyEditor = lazy(() => import('./HeavyEditor'));

function App() {
  const [editing, setEditing] = useState(false);
  return (
    <div>
      <button onClick={() => setEditing(true)}>Edit</button>
      {editing && (
        <Suspense fallback={<div>Loading editor...</div>}>
          <HeavyEditor />
        </Suspense>
      )}
    </div>
  );
}
```

### Suspense with `use()` Hook (React 19)

The new `use()` hook reads a Promise and suspends until it resolves:

```jsx
'use client';
import { use, Suspense } from 'react';

function UserProfile({ userPromise }) {
  const user = use(userPromise);  // suspends if promise is pending
  return <div>{user.name}</div>;
}

function Page() {
  const userPromise = fetchUser(123);  // start fetch — don't await
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

### Nested Suspense Boundaries

Each Suspense boundary is independent. Inner boundaries resolve without waiting for outer ones:

```jsx
function Dashboard() {
  return (
    <Suspense fallback={<DashboardShell />}>
      <Header />                           {/* fast */}
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />                   {/* slow query */}
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <OrdersTable />                    {/* independent slow query */}
      </Suspense>
    </Suspense>
  );
}
```

If `RevenueChart` takes 2s and `OrdersTable` takes 500ms, the table shows after 500ms without waiting for the chart.

### Suspense + Transitions = No Unwanted Fallbacks

Without transitions, navigating between Suspense-wrapped routes shows the fallback (spinner) for a split second. With `useTransition`, React waits for the new content to be ready before swapping:

```jsx
function Router() {
  const [page, setPage] = useState('home');
  const [isPending, startTransition] = useTransition();

  function navigate(next) {
    startTransition(() => {
      setPage(next);
      // React keeps showing current page (not spinner) while next page loads
    });
  }

  return (
    <div>
      <nav>
        <button onClick={() => navigate('home')}>Home</button>
        <button onClick={() => navigate('profile')}>Profile</button>
      </nav>
      {isPending && <TopLoadingBar />}
      <Suspense fallback={<PageSkeleton />}>
        <PageContent page={page} />
      </Suspense>
    </div>
  );
}
```

---

## Selective Hydration

In SSR with `hydrateRoot`, React doesn't have to hydrate the entire app at once. Suspense boundaries create hydration chunks that React prioritizes based on user interaction.

```jsx
// Server sends HTML for all three sections
// Client hydrates them independently based on priority

function App() {
  return (
    <>
      <Header />                        {/* hydrated first — no Suspense */}
      <Suspense fallback={<NavSkeleton />}>
        <Navigation />                  {/* hydrated when user hovers near it */}
      </Suspense>
      <Suspense fallback={<ContentSkeleton />}>
        <MainContent />                 {/* hydrated when visible */}
      </Suspense>
    </>
  );
}
```

If a user clicks on `Navigation` before it's hydrated, React immediately prioritizes hydrating `Navigation` over `MainContent`. This is automatic — you don't configure it.

---

## `startTransition` Without the Hook

For cases outside a component (global state managers, router libraries), there's a standalone `startTransition`:

```jsx
import { startTransition } from 'react';

// In a Redux action, Zustand subscriber, or event listener
document.addEventListener('popstate', () => {
  startTransition(() => {
    setCurrentPath(window.location.pathname);
  });
});
```

---

## Practical Patterns

### Pattern 1: Tab Navigation

```jsx
import { useState, useTransition, Suspense, lazy } from 'react';

const tabs = {
  home: lazy(() => import('./HomeTab')),
  posts: lazy(() => import('./PostsTab')),
  settings: lazy(() => import('./SettingsTab')),
};

export function TabbedLayout() {
  const [activeTab, setActiveTab] = useState('home');
  const [isPending, startTransition] = useTransition();

  const TabComponent = tabs[activeTab];

  return (
    <div>
      <div className="tab-bar">
        {Object.keys(tabs).map(tab => (
          <button
            key={tab}
            onClick={() => startTransition(() => setActiveTab(tab))}
            aria-current={activeTab === tab ? 'page' : undefined}
            style={{ opacity: isPending ? 0.6 : 1 }}
          >
            {tab}
          </button>
        ))}
      </div>
      <Suspense fallback={<TabSkeleton />}>
        <TabComponent />
      </Suspense>
    </div>
  );
}
```

### Pattern 2: Typeahead Search

```jsx
import { useState, useDeferredValue, memo } from 'react';

export function TypeaheadSearch({ allItems }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type to filter..."
      />
      <FilteredList items={allItems} query={deferredQuery} />
    </div>
  );
}

const FilteredList = memo(function FilteredList({ items, query }) {
  const filtered = query
    ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <ul>
      {filtered.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  );
});
```

### Pattern 3: Optimistic Navigation with Transition

```jsx
'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function NavLink({ href, children }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick(e) {
    e.preventDefault();
    startTransition(() => {
      router.push(href);
      // isPending is true while the new page's RSC payload loads
    });
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      style={{ opacity: isPending ? 0.7 : 1 }}
    >
      {children}
    </a>
  );
}
```

### Pattern 4: Incremental List Rendering

For very large lists, defer rendering chunks:

```jsx
import { useState, useDeferredValue, useMemo } from 'react';

function LargeList({ items }) {
  const [showAll, setShowAll] = useState(false);
  const deferredShowAll = useDeferredValue(showAll);

  const visibleItems = useMemo(
    () => deferredShowAll ? items : items.slice(0, 50),
    [items, deferredShowAll]
  );

  return (
    <div>
      <ul>
        {visibleItems.map(item => <li key={item.id}>{item.name}</li>)}
      </ul>
      {!deferredShowAll && (
        <button onClick={() => setShowAll(true)}>
          Show all {items.length} items
        </button>
      )}
    </div>
  );
}
```

---

## What NOT to Do

### Don't Wrap Everything in Transitions

```jsx
// ❌ Over-engineering — simple counter needs no transition
function Counter() {
  const [count, setCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  return (
    <button onClick={() => startTransition(() => setCount(c => c + 1))}>
      {count}
    </button>
  );
}

// ✅ Transitions are for genuinely expensive renders
```

### Don't Use Deferred Value for Everything

`useDeferredValue` adds complexity. Only use it when:
1. You receive the value as a prop (can't control the update)
2. The component rendering with that value is genuinely slow
3. You've verified with profiling that it helps

### `isPending` Is Not a Loading State for Network Requests

```jsx
// ❌ Misconception: isPending doesn't mean "network request in flight"
const [isPending, startTransition] = useTransition();

startTransition(() => {
  setTab('posts');  // isPending = true only while React re-renders
  // it's not tracking any fetch
});

// ✅ For network loading states, use Suspense or useActionState
```

---

## React 18 vs React 19 Differences

| Feature | React 18 | React 19 |
|---|---|---|
| `startTransition` callback | sync only | async supported |
| `useTransition` in Server Components | N/A | N/A (still client only) |
| `use()` hook | not available | reads Promises and Context |
| Suspense + data | only with libraries (Relay, SWR) | works with `use()` natively |
| `useDeferredValue` initial value | always deferred from first render | accepts `initialValue` param |

### `useDeferredValue` with Initial Value (React 19)

```jsx
// React 18: on first render, deferredQuery = query (no initial value option)
const deferredQuery = useDeferredValue(query);

// React 19: provide different initial value for first render
const deferredQuery = useDeferredValue(query, '');
// First render: deferredQuery = '' (show empty state, not expensive full list)
// Subsequent renders: deferred as usual
```
