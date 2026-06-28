# Performance Optimization in React

Comprehensive guide to optimizing React applications for maximum performance, covering React-specific optimizations, bundling strategies, and web performance best practices.

## What You'll Learn

- React.memo and component memoization
- useMemo and useCallback optimization
- Code splitting and lazy loading
- Bundle size optimization
- React Profiler and performance measurement
- Virtual scrolling for large lists
- Image optimization
- Web Vitals and Core Web Vitals
- Performance monitoring

---

## 1. React.memo

Memoize components to prevent unnecessary re-renders when props haven't changed.

### Basic Usage

```typescript
// ❌ Bad: Re-renders on every parent render
function ExpensiveComponent({ data }: { data: string }) {
  console.log('Rendering ExpensiveComponent');
  return <div>{data}</div>;
}

// ✅ Good: Only re-renders when data changes
const ExpensiveComponent = React.memo(({ data }: { data: string }) => {
  console.log('Rendering ExpensiveComponent');
  return <div>{data}</div>;
});
```

### Custom Comparison Function

```typescript
interface Props {
  user: User;
  settings: Settings;
}

// Only re-render if user.id changes
const UserProfile = React.memo(
  ({ user, settings }: Props) => {
    return (
      <div>
        <h2>{user.name}</h2>
        <Settings data={settings} />
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (skip render)
    // Return false if props are different (re-render)
    return prevProps.user.id === nextProps.user.id;
  }
);
```

### When to Use React.memo

```typescript
// ✅ Good use cases:
// 1. Pure presentational components
const Card = React.memo(({ title, content }: CardProps) => (
  <div className="card">
    <h3>{title}</h3>
    <p>{content}</p>
  </div>
));

// 2. Components with expensive rendering
const DataVisualization = React.memo(({ data }: Props) => {
  // Complex calculations or rendering
  const chartData = processLargeDataset(data);
  return <Chart data={chartData} />;
});

// 3. List items
const ListItem = React.memo(({ item }: { item: Item }) => (
  <li>{item.name}</li>
));

// ❌ Don't use React.memo for:
// 1. Components that always receive different props
// 2. Simple components (overhead not worth it)
// 3. Components that rarely re-render
```

---

## 2. useMemo and useCallback

### useMemo: Memoize Expensive Calculations

```typescript
function ProductList({ products, filter }: Props) {
  // ❌ Bad: Recalculates on every render
  const filteredProducts = products.filter(p => 
    p.category === filter.category &&
    p.price >= filter.minPrice &&
    p.price <= filter.maxPrice
  );

  // ✅ Good: Only recalculates when dependencies change
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.category === filter.category &&
      p.price >= filter.minPrice &&
      p.price <= filter.maxPrice
    );
  }, [products, filter]);

  return (
    <div>
      {filteredProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### useCallback: Memoize Functions

```typescript
function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);

  // ❌ Bad: Creates new function on every render
  const handleToggle = (id: string) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  // ✅ Good: Memoized function reference
  const handleToggle = useCallback((id: string) => {
    setTodos(todos => todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  }, []); // Empty deps because we use functional update

  return (
    <div>
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={handleToggle} // Stable reference
        />
      ))}
    </div>
  );
}

// This component won't re-render unnecessarily
const TodoItem = React.memo(({ todo, onToggle }: TodoItemProps) => (
  <div onClick={() => onToggle(todo.id)}>
    {todo.text}
  </div>
));
```

### When to Use useMemo/useCallback

```typescript
// ✅ Good use cases for useMemo:
// 1. Expensive calculations
const sortedData = useMemo(() => {
  return largeArray.sort((a, b) => a.value - b.value);
}, [largeArray]);

// 2. Object/array creation for memoized components
const config = useMemo(() => ({
  color: 'blue',
  size: 'large'
}), []);

// ✅ Good use cases for useCallback:
// 1. Callbacks passed to memoized children
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// 2. Dependencies in other hooks
useEffect(() => {
  fetchData(userId);
}, [fetchData, userId]); // fetchData should be memoized

// ❌ Don't use for:
// 1. Simple calculations
const double = useMemo(() => count * 2, [count]); // Overkill

// 2. Primitive values
const isActive = useMemo(() => status === 'active', [status]); // Unnecessary
```

---

## 3. Code Splitting and Lazy Loading

### Route-Based Code Splitting

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Eagerly loaded (small, always needed)
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy loaded (large, conditionally needed)
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Analytics = lazy(() => import('./pages/Analytics'));

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}
```

### Component-Based Code Splitting

```typescript
// Lazy load heavy components
const RichTextEditor = lazy(() => import('./components/RichTextEditor'));
const ChartComponent = lazy(() => import('./components/Chart'));

function DocumentEditor() {
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div>
      <button onClick={() => setShowEditor(true)}>
        Edit Document
      </button>

      {showEditor && (
        <Suspense fallback={<div>Loading editor...</div>}>
          <RichTextEditor />
        </Suspense>
      )}
    </div>
  );
}
```

### Prefetching Routes

```typescript
// Prefetch on hover for better UX
import { Link } from 'react-router-dom';

function Navigation() {
  const prefetchDashboard = () => {
    import('./pages/Dashboard'); // Starts loading immediately
  };

  return (
    <nav>
      <Link 
        to="/dashboard" 
        onMouseEnter={prefetchDashboard}
      >
        Dashboard
      </Link>
    </nav>
  );
}
```

### Named Exports with Lazy Loading

```typescript
// ❌ Won't work: named export
const { Button } = lazy(() => import('./components/Button'));

// ✅ Solution 1: Default export
// components/Button.tsx
export default function Button() { /* ... */ }

// App.tsx
const Button = lazy(() => import('./components/Button'));

// ✅ Solution 2: Re-export as default
const Button = lazy(() => 
  import('./components/Button').then(module => ({ 
    default: module.Button 
  }))
);
```

---

## 4. Bundle Size Optimization

### Analyze Bundle Size

```bash
npm install -D rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

### Tree Shaking

```typescript
// ❌ Bad: Imports entire library
import _ from 'lodash';
const result = _.debounce(fn, 300);

// ✅ Good: Imports only what you need
import debounce from 'lodash/debounce';
const result = debounce(fn, 300);

// ✅ Even better: Use native alternatives
function debounce(fn: Function, delay: number) {
  let timeoutId: number;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
```

### Replace Heavy Libraries

```typescript
// ❌ Heavy: moment.js (69KB)
import moment from 'moment';
const date = moment().format('YYYY-MM-DD');

// ✅ Light: date-fns (13KB with tree shaking)
import { format } from 'date-fns';
const date = format(new Date(), 'yyyy-MM-dd');

// ✅ Native: Intl API (0KB)
const date = new Intl.DateTimeFormat('en-CA').format(new Date());
```

### Dynamic Imports for Third-Party Libraries

```typescript
// Only load when needed
async function exportToExcel(data: any[]) {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, 'export.xlsx');
}
```

### Configure Build for Production

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'query': ['@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

---

## 5. Virtual Scrolling for Large Lists

### Using react-window

```bash
npm install react-window
```

```typescript
// src/components/VirtualList.tsx
import { FixedSizeList } from 'react-window';

interface Item {
  id: string;
  name: string;
}

interface VirtualListProps {
  items: Item[];
}

export function VirtualList({ items }: VirtualListProps) {
  // Row renderer
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} className="list-item">
      {items[index].name}
    </div>
  );

  return (
    <FixedSizeList
      height={600}        // Viewport height
      itemCount={items.length}
      itemSize={50}       // Height of each item
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### Variable Size List

```typescript
import { VariableSizeList } from 'react-window';

export function VariableVirtualList({ items }: VirtualListProps) {
  // Calculate item size dynamically
  const getItemSize = (index: number) => {
    return items[index].description ? 120 : 50;
  };

  const Row = ({ index, style }: any) => (
    <div style={style} className="list-item">
      <h3>{items[index].name}</h3>
      {items[index].description && <p>{items[index].description}</p>}
    </div>
  );

  return (
    <VariableSizeList
      height={600}
      itemCount={items.length}
      itemSize={getItemSize}
      width="100%"
    >
      {Row}
    </VariableSizeList>
  );
}
```

### Infinite Scroll with react-window

```typescript
import { FixedSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';

export function InfiniteVirtualList() {
  const [items, setItems] = useState<Item[]>([]);
  const [hasNextPage, setHasNextPage] = useState(true);

  const loadMoreItems = async (startIndex: number, stopIndex: number) => {
    const newItems = await fetchItems(startIndex, stopIndex);
    setItems(prev => [...prev, ...newItems]);
    if (newItems.length === 0) setHasNextPage(false);
  };

  const isItemLoaded = (index: number) => !hasNextPage || index < items.length;

  return (
    <InfiniteLoader
      isItemLoaded={isItemLoaded}
      itemCount={hasNextPage ? items.length + 1 : items.length}
      loadMoreItems={loadMoreItems}
    >
      {({ onItemsRendered, ref }) => (
        <FixedSizeList
          height={600}
          itemCount={items.length}
          itemSize={50}
          onItemsRendered={onItemsRendered}
          ref={ref}
          width="100%"
        >
          {({ index, style }) => (
            <div style={style}>
              {isItemLoaded(index) ? items[index].name : 'Loading...'}
            </div>
          )}
        </FixedSizeList>
      )}
    </InfiniteLoader>
  );
}
```

---

## 6. Image Optimization

### Lazy Loading Images

```typescript
// Native lazy loading
<img 
  src="/large-image.jpg" 
  alt="Description"
  loading="lazy"  // Browser handles lazy loading
/>

// With intersection observer for more control
function LazyImage({ src, alt }: { src: string; alt: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' } // Start loading 50px before visible
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={isLoaded ? src : undefined}
      alt={alt}
      style={{ backgroundColor: '#f0f0f0' }}
    />
  );
}
```

### Responsive Images

```typescript
function ResponsiveImage({ src, alt }: { src: string; alt: string }) {
  return (
    <picture>
      {/* WebP for modern browsers */}
      <source 
        srcSet={`${src}.webp 1x, ${src}@2x.webp 2x`}
        type="image/webp"
      />
      {/* Fallback to JPEG */}
      <source 
        srcSet={`${src}.jpg 1x, ${src}@2x.jpg 2x`}
        type="image/jpeg"
      />
      <img src={`${src}.jpg`} alt={alt} loading="lazy" />
    </picture>
  );
}
```

### Image with Blur Placeholder

```typescript
function ImageWithPlaceholder({ 
  src, 
  blurDataURL, 
  alt 
}: { 
  src: string; 
  blurDataURL: string; 
  alt: string;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      {/* Blur placeholder */}
      <img
        src={blurDataURL}
        alt=""
        style={{
          position: 'absolute',
          filter: 'blur(20px)',
          opacity: isLoaded ? 0 : 1,
          transition: 'opacity 0.3s',
        }}
      />
      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
      />
    </div>
  );
}
```

---

## 7. React Profiler

### Using Profiler Component

```typescript
import { Profiler, ProfilerOnRenderCallback } from 'react';

const onRenderCallback: ProfilerOnRenderCallback = (
  id,                    // Component ID
  phase,                 // "mount" or "update"
  actualDuration,        // Time spent rendering
  baseDuration,          // Estimated time without memoization
  startTime,             // When render started
  commitTime,            // When render committed
  interactions           // Set of interactions
) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
  
  // Send to analytics
  if (actualDuration > 16) { // More than one frame (60fps)
    logPerformanceMetric({
      component: id,
      duration: actualDuration,
      phase,
    });
  }
};

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Dashboard />
    </Profiler>
  );
}
```

### Custom Performance Hook

```typescript
// src/hooks/usePerformance.ts
export function usePerformance(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      if (duration > 16) {
        console.warn(`${componentName} took ${duration}ms to unmount`);
      }
    };
  }, [componentName]);
}

// Usage
function MyComponent() {
  usePerformance('MyComponent');
  // ... component code
}
```

---

## 8. Web Vitals Monitoring

### Setup Web Vitals

```bash
npm install web-vitals
```

```typescript
// src/utils/vitals.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

export function reportWebVitals() {
  onCLS(console.log);  // Cumulative Layout Shift
  onFID(console.log);  // First Input Delay
  onFCP(console.log);  // First Contentful Paint
  onLCP(console.log);  // Largest Contentful Paint
  onTTFB(console.log); // Time to First Byte
}

// Send to analytics
function sendToAnalytics(metric: any) {
  const body = JSON.stringify(metric);
  const url = '/api/analytics';

  // Use `navigator.sendBeacon()` if available, falling back to `fetch()`
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    fetch(url, { body, method: 'POST', keepalive: true });
  }
}

export function reportWebVitalsToAnalytics() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
```

```typescript
// src/main.tsx
import { reportWebVitals } from './utils/vitals';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
```

---

## 9. Additional Optimizations

### Debounce and Throttle

```typescript
// Debounce: Wait for user to stop typing
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      searchAPI(debouncedQuery);
    }
  }, [debouncedQuery]);

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search..."
    />
  );
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

### Throttle for Scroll Events

```typescript
function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    if (Date.now() >= lastExecuted.current + interval) {
      lastExecuted.current = Date.now();
      setThrottledValue(value);
    } else {
      const timerId = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, interval);

      return () => clearTimeout(timerId);
    }
  }, [value, interval]);

  return throttledValue;
}

// Usage: Throttle scroll position updates
function ScrollTracker() {
  const [scrollY, setScrollY] = useState(0);
  const throttledScrollY = useThrottle(scrollY, 100);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return <div>Scroll position: {throttledScrollY}</div>;
}
```

### Avoid Inline Functions in JSX

```typescript
// ❌ Bad: Creates new function on every render
function TodoList({ todos }: Props) {
  return (
    <div>
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onDelete={() => deleteTodo(todo.id)}  // New function every render
        />
      ))}
    </div>
  );
}

// ✅ Good: Stable function reference
function TodoList({ todos }: Props) {
  const handleDelete = useCallback((id: string) => {
    deleteTodo(id);
  }, []);

  return (
    <div>
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
```

### Avoid Anonymous Objects in JSX

```typescript
// ❌ Bad: Creates new object on every render
<Component style={{ marginTop: 20 }} />

// ✅ Good: Stable object reference
const style = { marginTop: 20 };
<Component style={style} />

// Or use useMemo for dynamic styles
const style = useMemo(() => ({
  marginTop: isActive ? 20 : 10
}), [isActive]);
```

---

## 10. Performance Checklist

### Initial Load Performance

- [ ] Enable code splitting for routes
- [ ] Lazy load heavy components
- [ ] Optimize bundle size (< 200KB gzipped)
- [ ] Use tree shaking
- [ ] Remove unused dependencies
- [ ] Enable compression (Gzip/Brotli)
- [ ] Optimize images (WebP, lazy loading)
- [ ] Use CDN for static assets

### Runtime Performance

- [ ] Use React.memo for expensive components
- [ ] Memoize callbacks with useCallback
- [ ] Memoize expensive calculations with useMemo
- [ ] Implement virtual scrolling for long lists
- [ ] Debounce user input
- [ ] Throttle scroll/resize handlers
- [ ] Avoid unnecessary re-renders
- [ ] Profile components with React DevTools

### Network Performance

- [ ] Implement data caching (React Query)
- [ ] Prefetch critical resources
- [ ] Use optimistic updates
- [ ] Implement pagination or infinite scroll
- [ ] Minimize API calls
- [ ] Use HTTP/2 or HTTP/3
- [ ] Enable browser caching

### Rendering Performance

- [ ] Keep component tree shallow
- [ ] Avoid inline functions/objects in JSX
- [ ] Use keys correctly in lists
- [ ] Avoid layout thrashing
- [ ] Use CSS transforms for animations
- [ ] Minimize DOM manipulations

---

## Best Practices

### ✅ Do

- Measure before optimizing (use Profiler)
- Focus on user-perceived performance
- Optimize critical rendering path
- Use production builds for testing
- Monitor Web Vitals
- Lazy load non-critical resources
- Keep bundle sizes small
- Cache data when possible

### ❌ Don't

- Optimize prematurely
- Over-use memoization (adds overhead)
- Ignore Core Web Vitals
- Forget to test on real devices
- Optimize without measuring
- Use deep component nesting
- Skip accessibility for performance
- Ignore network conditions

---

## Next Steps

- **Testing**: Performance testing strategies in `04_testing.md`
- **Error Handling**: Error boundaries and performance in `03_error_handling.md`
- **Data Fetching**: Optimize queries in `../04_data_fetching/05_patterns.md`

---

## Additional Resources

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools#profiler)
- [Bundle Size Optimization](https://web.dev/reduce-javascript-payloads-with-code-splitting/)
