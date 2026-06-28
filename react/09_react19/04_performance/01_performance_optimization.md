# React 19 Performance Optimization

React 19's biggest performance story is the React Compiler — it eliminates the need for manual memoization in most cases. But understanding when the compiler helps (and when it doesn't) still requires knowing how React's rendering model works.

---

## React Compiler — The Big Change

### What It Does

The React Compiler (previously "React Forget") is a build-time transform that automatically adds memoization. It analyzes your components, identifies what values can change and when, and wraps expensive computations and callbacks with the equivalent of `useMemo`/`useCallback` — without you writing them.

```jsx
// What you write (React 19 with Compiler)
function ProductCard({ product, onAddToCart }) {
  const discountedPrice = product.price * 0.9;
  return (
    <div>
      <h2>{product.name}</h2>
      <p>${discountedPrice.toFixed(2)}</p>
      <button onClick={() => onAddToCart(product.id)}>Add</button>
    </div>
  );
}

// What the compiler generates (conceptually)
function ProductCard({ product, onAddToCart }) {
  const discountedPrice = useMemo(
    () => product.price * 0.9,
    [product.price]
  );
  const handleAdd = useCallback(
    () => onAddToCart(product.id),
    [onAddToCart, product.id]
  );
  return (
    <div>
      <h2>{product.name}</h2>
      <p>${discountedPrice.toFixed(2)}</p>
      <button onClick={handleAdd}>Add</button>
    </div>
  );
}
```

The compiler does this analysis statically — it understands React's rules (pure components, no mutations during render) and applies memoization where it's safe and beneficial.

### Enabling the Compiler

```bash
npm install babel-plugin-react-compiler
# or with Next.js
npm install next@latest  # Next.js 15+ includes it
```

```js
// babel.config.js
module.exports = {
  plugins: [
    ['babel-plugin-react-compiler', {
      compilationMode: 'annotation',  // opt-in per file
      // or 'all' to compile everything
    }]
  ]
};

// next.config.js (Next.js 15+)
module.exports = {
  experimental: {
    reactCompiler: true,
  }
};
```

### What the Compiler Can and Cannot Optimize

```jsx
// ✅ Compiler handles these automatically
function Component({ items, filter }) {
  // Derived values — memoized by compiler
  const filtered = items.filter(i => i.category === filter);
  const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));
  
  // Callbacks — memoized with correct deps
  const handleClick = (id) => console.log('clicked', id);

  return <List items={sorted} onClick={handleClick} />;
}

// ❌ Compiler cannot optimize (breaks rules of React)
function BadComponent({ items }) {
  // Mutation during render — compiler skips this component
  items.sort();  // mutates prop

  // Side effect during render
  document.title = 'Updated';

  // Conditional hook
  if (someCondition) {
    useEffect(() => {});
  }
}
```

The compiler emits a warning and skips components it can't safely optimize. Use `eslint-plugin-react-compiler` to catch violations:

```bash
npm install eslint-plugin-react-compiler
```

```js
// .eslintrc
{
  "plugins": ["react-compiler"],
  "rules": {
    "react-compiler/react-compiler": "error"
  }
}
```

---

## React 18 vs React 19: Manual vs Automatic Memoization

### React 18 — The Manual Era

```jsx
// React 18: you manage memoization yourself
import { memo, useMemo, useCallback } from 'react';

const ExpensiveList = memo(function ExpensiveList({ items, onSelect }) {
  return (
    <ul>
      {items.map(item => (
        <ExpensiveItem key={item.id} item={item} onSelect={onSelect} />
      ))}
    </ul>
  );
});

function Parent({ rawItems, userId }) {
  // Without these, ExpensiveList re-renders on every Parent render
  const processedItems = useMemo(
    () => processItems(rawItems),
    [rawItems]
  );

  const handleSelect = useCallback(
    (id) => selectItem(userId, id),
    [userId]
  );

  return <ExpensiveList items={processedItems} onSelect={handleSelect} />;
}
```

### React 19 with Compiler — The Automatic Era

```jsx
// React 19 + Compiler: write natural code
function ExpensiveList({ items, onSelect }) {
  // Compiler memoizes this component automatically
  return (
    <ul>
      {items.map(item => (
        <ExpensiveItem key={item.id} item={item} onSelect={onSelect} />
      ))}
    </ul>
  );
}

function Parent({ rawItems, userId }) {
  // Compiler sees these are derived from stable inputs → memoizes
  const processedItems = processItems(rawItems);
  const handleSelect = (id) => selectItem(userId, id);
  
  return <ExpensiveList items={processedItems} onSelect={handleSelect} />;
}
```

### When You Still Need `memo`/`useMemo`/`useCallback`

- **Before React Compiler is enabled** in your project
- **Components that violate React rules** (compiler skips them)
- **Performance-critical hot paths** where you want explicit control
- **Third-party components** that don't go through your compiler

---

## Profiling — Finding Real Problems

Don't optimize without data. React DevTools Profiler is the right tool.

### React DevTools Profiler

1. Install React DevTools browser extension
2. Open DevTools → Profiler tab
3. Click Record → interact with your app → Stop
4. Examine the flame graph

**Reading the Flame Graph:**
- Width = time spent rendering
- Color = fast (green) → slow (yellow/red)
- Grayed out = component didn't re-render this commit

**What to Look For:**
- Components re-rendering when props haven't changed (missing memoization)
- Very wide bars on components that should be fast
- Re-renders cascading down a tree from a parent state change

### Why Did This Render?

Enable "Record why each component rendered" in DevTools Profiler settings. It shows you:
```
<ExpensiveList> rendered because:
  - props changed: onSelect
```

This tells you exactly what's causing re-renders.

### `Profiler` Component for Programmatic Measurement

```jsx
import { Profiler } from 'react';

function onRenderCallback(
  id,           // component tree identifier
  phase,        // 'mount' | 'update' | 'nested-update'
  actualDuration,    // time spent rendering
  baseDuration,      // estimated time without memoization
  startTime,
  commitTime
) {
  // Log or send to your analytics
  if (actualDuration > 16) {  // over one frame (60fps)
    console.warn(`Slow render: ${id} took ${actualDuration.toFixed(1)}ms`);
  }
}

function App() {
  return (
    <Profiler id="ProductGrid" onRender={onRenderCallback}>
      <ProductGrid />
    </Profiler>
  );
}
```

---

## Bundle Splitting and Lazy Loading

### `React.lazy` + `Suspense`

```jsx
import { lazy, Suspense } from 'react';

// Each of these becomes a separate JS chunk
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));

// Heavy third-party components
const RichTextEditor = lazy(() => import('./RichTextEditor'));
const MapView = lazy(() => import('./MapView'));
const DataGrid = lazy(() => import('./DataGrid'));

function App() {
  const [page, setPage] = useState('dashboard');

  const pageComponents = { Dashboard, Reports, Settings };
  const PageComponent = pageComponents[page];

  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageComponent />
    </Suspense>
  );
}
```

### Named Exports with `lazy`

```jsx
// ❌ lazy requires a default export
const { Chart } = lazy(() => import('./charts'));  // doesn't work

// ✅ Wrap in a re-export or use a default
const Chart = lazy(() =>
  import('./charts').then(module => ({ default: module.Chart }))
);
```

### Preloading Components

Start loading a chunk before the user navigates to it:

```jsx
// Preload when user hovers over a button
const HeavyModal = lazy(() => import('./HeavyModal'));

// Trigger preload without rendering
const preloadHeavyModal = () => import('./HeavyModal');

function TriggerButton() {
  return (
    <button
      onMouseEnter={preloadHeavyModal}  // preload on hover
      onClick={() => setShowModal(true)}
    >
      Open Modal
    </button>
  );
}
```

### Route-Level Splitting (Next.js App Router)

In Next.js App Router, each `page.jsx` is automatically split. For additional splitting within a page:

```jsx
// app/dashboard/page.jsx
import { lazy, Suspense } from 'react';

// Split the chart library (large) from the initial page load
const RevenueChart = lazy(() => import('./RevenueChart'));

export default function DashboardPage() {
  return (
    <div>
      <QuickStats />         {/* in initial bundle */}
      <RecentOrders />       {/* in initial bundle */}
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />     {/* separate chunk, loaded after initial paint */}
      </Suspense>
    </div>
  );
}
```

---

## Avoiding Unnecessary Re-renders

Even with the React Compiler, understanding the causes of re-renders is fundamental.

### Context — The Silent Re-render Trigger

Every consumer of a Context re-renders when the context value changes, even if the specific part they use didn't change.

```jsx
// ❌ Single context with everything — any update rerenders all consumers
const AppContext = createContext();

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [cart, setCart] = useState([]);

  // Any state change creates a new object → all consumers re-render
  return (
    <AppContext.Provider value={{ user, setUser, theme, setTheme, cart, setCart }}>
      {children}
    </AppContext.Provider>
  );
}

// ✅ Split contexts by update frequency
const UserContext = createContext();
const ThemeContext = createContext();
const CartContext = createContext();

// ThemeContext consumers don't re-render when cart changes
```

### Stabilize Object and Array Values

```jsx
// ❌ New object on every render
function Parent() {
  return <Child config={{ maxItems: 10, sortBy: 'date' }} />;
  //                    ↑ new object reference each render
}

// ✅ Constant outside component
const CHILD_CONFIG = { maxItems: 10, sortBy: 'date' };
function Parent() {
  return <Child config={CHILD_CONFIG} />;
}

// ✅ Or useMemo when config depends on props
function Parent({ userId }) {
  const config = useMemo(() => ({ maxItems: 10, userId }), [userId]);
  return <Child config={config} />;
}
```

### State Colocation

Keep state as close to where it's used as possible. State high in the tree causes wide re-renders.

```jsx
// ❌ Tooltip state in root causes full re-render
function App() {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  // 10,000-node tree re-renders when tooltip toggles
  return (
    <div>
      <HugeTree />
      <Tooltip visible={tooltipVisible} onToggle={setTooltipVisible} />
    </div>
  );
}

// ✅ Tooltip manages its own state
function App() {
  return (
    <div>
      <HugeTree />
      <Tooltip />  {/* state lives here */}
    </div>
  );
}
function Tooltip() {
  const [visible, setVisible] = useState(false);
  return <div onMouseEnter={() => setVisible(true)}>...</div>;
}
```

### Key for Resetting Components

Use `key` to force-unmount and remount a component (reset state) instead of complex cleanup logic:

```jsx
// ❌ Complex useEffect to reset state when userId changes
function UserProfile({ userId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    setError(null);
    fetchUser(userId).then(setData).catch(setError);
  }, [userId]);
}

// ✅ key handles this automatically
function App({ userId }) {
  return <UserProfile key={userId} userId={userId} />;
  // When userId changes, React destroys and recreates UserProfile
  // All state resets naturally
}
```

---

## React 19 Specific Optimizations

### Automatic Batching (Extended from React 18)

React 18 introduced automatic batching for all async operations. React 19 extends this to more edge cases. Multiple state updates in any context batch into a single re-render:

```jsx
// React 17: each setState triggered a separate render
setTimeout(() => {
  setA(1);  // render
  setB(2);  // render
  // 2 renders
}, 1000);

// React 18+: batched into one render
setTimeout(() => {
  setA(1);
  setB(2);
  // 1 render
}, 1000);
```

### `use()` Hook — Replace `useEffect` Data Fetching

```jsx
// React 18: data fetching with useEffect causes render waterfalls
'use client';
function UserData({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);
  
  if (!user) return <Spinner />;
  return <div>{user.name}</div>;
}
// Render 1: component mounts, no data, shows Spinner
// Effect fires → fetch starts
// Render 2: data arrives, shows user
// Problem: fetch starts after first render (waterfall)

// React 19: with RSC + Suspense, fetch starts before render
// Server Component:
async function UserData({ userId }) {
  const user = await fetchUser(userId);  // fetch before render
  return <div>{user.name}</div>;
}

// Client Component with use():
'use client';
function UserData({ userPromise }) {
  const user = use(userPromise);  // suspends, no Spinner needed
  return <div>{user.name}</div>;
}
```

### Ref Cleanup Functions (React 19)

React 19 refs now support cleanup functions, like `useEffect`. This avoids memory leaks and removes the need for `useEffect` for some DOM measurement patterns:

```jsx
// React 18: cleanup requires separate useEffect
function Component() {
  const ref = useRef(null);
  useEffect(() => {
    const observer = new ResizeObserver(handleResize);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} />;
}

// React 19: ref callback returns cleanup function
function Component() {
  return (
    <div
      ref={(node) => {
        if (!node) return;
        const observer = new ResizeObserver(handleResize);
        observer.observe(node);
        return () => observer.disconnect();  // cleanup
      }}
    />
  );
}
```

---

## Measuring Performance

### Core Web Vitals Integration

```jsx
import { onCLS, onFID, onLCP, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, id }) {
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify({ name, value, id }),
  });
}

// Measure and report
onCLS(sendToAnalytics);
onLCP(sendToAnalytics);
onFID(sendToAnalytics);
```

### React-Specific Metrics

```jsx
// reportWebVitals in Next.js
export function reportWebVitals(metric) {
  if (metric.label === 'custom') {
    // React-specific metrics
    console.log(metric);
  }
}
```

### Performance Mark in Components

```jsx
function ExpensiveList({ items }) {
  performance.mark('ExpensiveList:start');
  
  const rendered = items.map(item => <Row key={item.id} item={item} />);
  
  // Note: useEffect is too late for initial render timing
  // Use the Profiler component instead for accurate measurements

  return <ul>{rendered}</ul>;
}
```

---

## Decision Tree: Do I Need to Optimize This?

```
Is there a user-visible performance problem?
├── No → Don't optimize
└── Yes → Profile first
    ├── What's the bottleneck?
    │   ├── Re-renders → Check memoization, context splits, state colocation
    │   ├── Slow computation → useMemo or move to Server Component
    │   ├── Large bundle → lazy(), route splitting, tree shaking
    │   ├── Slow network → Suspense, streaming, prefetch, caching
    │   └── First paint → SSR, RSC, preload critical resources
    └── After fix → Profile again to confirm improvement
```

### The Compiler Changes the Default Answer

With the React Compiler enabled, the answer to "should I add `memo`/`useMemo`/`useCallback`?" is almost always **no** — let the compiler handle it. Write readable code, profile, optimize only confirmed bottlenecks.

Without the compiler (React 18 or compiler not enabled):
- Add `memo` to components that receive stable props but re-render frequently due to parent state changes
- Add `useMemo` for expensive computations (>1ms)
- Add `useCallback` for functions passed to memoized children

---

## Common Anti-Patterns

### Anti-Pattern 1: Memoizing Cheap Operations

```jsx
// ❌ Overkill — string concatenation is free
const fullName = useMemo(() => `${firstName} ${lastName}`, [firstName, lastName]);

// ✅ Just compute it
const fullName = `${firstName} ${lastName}`;
```

### Anti-Pattern 2: memo Without Stable Props

```jsx
// ❌ memo is useless when props change every render
const MemoList = memo(function List({ items }) { ... });

function Parent() {
  return (
    <MemoList
      items={data}
      // New function reference every render → memo never hits
      onItemClick={(id) => handleClick(id)}
    />
  );
}

// ✅ Stabilize the function
const handleItemClick = useCallback((id) => handleClick(id), []);
// Or: let the compiler do it
```

### Anti-Pattern 3: Deriving State in `useEffect`

```jsx
// ❌ Causes double render: state update → effect → state update → render
function Component({ items }) {
  const [sortedItems, setSortedItems] = useState([]);
  
  useEffect(() => {
    setSortedItems([...items].sort());
  }, [items]);
}

// ✅ Compute during render (compiler will memoize it)
function Component({ items }) {
  const sortedItems = [...items].sort();  // derived, not stored
}
```

### Anti-Pattern 4: useLayoutEffect When useEffect Suffices

```jsx
// ❌ useLayoutEffect blocks paint — only use for DOM measurements
useLayoutEffect(() => {
  fetch('/api/data').then(setData);  // no DOM measurement happening
}, []);

// ✅ useEffect for async operations
useEffect(() => {
  fetch('/api/data').then(setData);
}, []);

// ✅ useLayoutEffect only for DOM read/write before paint
useLayoutEffect(() => {
  const height = ref.current.getBoundingClientRect().height;
  setTooltipOffset(height);
}, []);
```
