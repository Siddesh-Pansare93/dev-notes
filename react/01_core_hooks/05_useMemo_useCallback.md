# useMemo and useCallback - Performance Optimization

Master performance optimization in React using useMemo and useCallback hooks to prevent unnecessary calculations and re-renders.

## What You'll Learn

- Understanding React re-renders
- useMemo for expensive calculations
- useCallback for function memoization
- When to use (and when not to use) these hooks
- Performance profiling

## Understanding Re-renders

React re-renders a component when:
1. State changes
2. Props change
3. Parent component re-renders
4. Context value changes

```typescript
function Parent() {
  const [count, setCount] = useState(0);
  
  // Child re-renders every time Parent re-renders
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <Child />
    </div>
  );
}

function Child() {
  console.log('Child rendered');
  return <div>I'm a child</div>;
}
```

## useMemo - Memoizing Values

### Basic Syntax

```typescript
const memoizedValue = useMemo(() => {
  return expensiveCalculation(a, b);
}, [a, b]); // Only recalculate when a or b changes
```

### Expensive Calculations

```typescript
function ProductList({ products }: { products: Product[] }) {
  const [filterTerm, setFilterTerm] = useState('');

  // ❌ Bad: Recalculates on every render
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(filterTerm.toLowerCase())
  );

  // ✅ Good: Only recalculates when dependencies change
  const filteredProducts = useMemo(() => {
    console.log('Filtering products...');
    return products.filter(product =>
      product.name.toLowerCase().includes(filterTerm.toLowerCase())
    );
  }, [products, filterTerm]);

  return (
    <div>
      <input
        value={filterTerm}
        onChange={(e) => setFilterTerm(e.target.value)}
      />
      {filteredProducts.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

### Sorting and Filtering

```typescript
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: number;
}

function TodoList({ todos }: { todos: Todo[] }) {
  const [sortBy, setSortBy] = useState<'priority' | 'title'>('priority');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const processedTodos = useMemo(() => {
    // Filter
    let filtered = todos;
    if (filter === 'active') {
      filtered = todos.filter(todo => !todo.completed);
    } else if (filter === 'completed') {
      filtered = todos.filter(todo => todo.completed);
    }

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'priority') {
        return b.priority - a.priority;
      }
      return a.title.localeCompare(b.title);
    });
  }, [todos, sortBy, filter]);

  return (
    <div>
      <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
        <option value="priority">Priority</option>
        <option value="title">Title</option>
      </select>
      <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
      </select>
      {processedTodos.map(todo => (
        <div key={todo.id}>{todo.title}</div>
      ))}
    </div>
  );
}
```

### Complex Calculations

```typescript
function DataAnalytics({ data }: { data: number[] }) {
  const statistics = useMemo(() => {
    console.log('Calculating statistics...');
    
    const sum = data.reduce((acc, val) => acc + val, 0);
    const mean = sum / data.length;
    
    const sortedData = [...data].sort((a, b) => a - b);
    const median = sortedData[Math.floor(sortedData.length / 2)];
    
    const variance = data.reduce((acc, val) => 
      acc + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    return { mean, median, stdDev, min: sortedData[0], max: sortedData[sortedData.length - 1] };
  }, [data]);

  return (
    <div>
      <p>Mean: {statistics.mean.toFixed(2)}</p>
      <p>Median: {statistics.median}</p>
      <p>Std Dev: {statistics.stdDev.toFixed(2)}</p>
      <p>Range: {statistics.min} - {statistics.max}</p>
    </div>
  );
}
```

### Preventing Object Recreation

```typescript
function UserProfile({ userId }: { userId: string }) {
  const [userData, setUserData] = useState(null);

  // ❌ Bad: New object on every render
  const userConfig = {
    id: userId,
    settings: { theme: 'dark', language: 'en' },
  };

  // ✅ Good: Memoized object
  const userConfig = useMemo(() => ({
    id: userId,
    settings: { theme: 'dark', language: 'en' },
  }), [userId]);

  // This effect won't run unnecessarily
  useEffect(() => {
    fetchUserData(userConfig);
  }, [userConfig]);

  return <div>{/* ... */}</div>;
}
```

## useCallback - Memoizing Functions

### Basic Syntax

```typescript
const memoizedCallback = useCallback(() => {
  doSomething(a, b);
}, [a, b]); // Only recreate when a or b changes
```

### Preventing Child Re-renders

```typescript
interface ChildProps {
  onIncrement: () => void;
}

const Child = React.memo(({ onIncrement }: ChildProps) => {
  console.log('Child rendered');
  return <button onClick={onIncrement}>Increment</button>;
});

function Parent() {
  const [count, setCount] = useState(0);
  const [otherState, setOtherState] = useState(0);

  // ❌ Bad: New function on every render
  const handleIncrement = () => {
    setCount(c => c + 1);
  };

  // ✅ Good: Memoized function
  const handleIncrement = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setOtherState(otherState + 1)}>
        Other State: {otherState}
      </button>
      <Child onIncrement={handleIncrement} />
    </div>
  );
}
```

### Event Handlers with Parameters

```typescript
interface Item {
  id: string;
  name: string;
}

function ItemList({ items }: { items: Item[] }) {
  // ❌ Bad: Creates new function for each item on every render
  return (
    <div>
      {items.map(item => (
        <button key={item.id} onClick={() => handleClick(item.id)}>
          {item.name}
        </button>
      ))}
    </div>
  );

  // ✅ Good: One memoized function
  const handleClick = useCallback((id: string) => {
    console.log('Clicked:', id);
  }, []);

  return (
    <div>
      {items.map(item => (
        <ItemButton key={item.id} id={item.id} onClick={handleClick} />
      ))}
    </div>
  );
}

const ItemButton = React.memo(({ 
  id, 
  onClick 
}: { 
  id: string; 
  onClick: (id: string) => void;
}) => {
  return (
    <button onClick={() => onClick(id)}>
      {id}
    </button>
  );
});
```

### With useEffect Dependencies

```typescript
function SearchComponent({ apiEndpoint }: { apiEndpoint: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  // Memoized search function
  const search = useCallback(async (searchTerm: string) => {
    if (!searchTerm) {
      setResults([]);
      return;
    }

    const response = await fetch(`${apiEndpoint}?q=${searchTerm}`);
    const data = await response.json();
    setResults(data);
  }, [apiEndpoint]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query, search]); // search is stable unless apiEndpoint changes

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {results.map((result: any) => (
        <div key={result.id}>{result.name}</div>
      ))}
    </div>
  );
}
```

## useMemo vs useCallback

```typescript
// useMemo returns a memoized VALUE
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);

// useCallback returns a memoized FUNCTION
const memoizedCallback = useCallback(() => doSomething(a, b), [a, b]);

// These are equivalent:
const memoizedCallback = useCallback(() => doSomething(a, b), [a, b]);
const memoizedCallback = useMemo(() => () => doSomething(a, b), [a, b]);
```

## React.memo - Component Memoization

### Basic Usage

```typescript
// Without memo: re-renders on every parent render
function ExpensiveComponent({ data }: { data: string }) {
  console.log('Rendered');
  return <div>{data}</div>;
}

// With memo: only re-renders when props change
const ExpensiveComponent = React.memo(({ data }: { data: string }) => {
  console.log('Rendered');
  return <div>{data}</div>;
});
```

### Custom Comparison

```typescript
interface UserProps {
  user: {
    id: string;
    name: string;
    metadata: any; // Large object we don't care about
  };
}

const UserCard = React.memo(
  ({ user }: UserProps) => {
    return (
      <div>
        <h2>{user.name}</h2>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (don't re-render)
    return prevProps.user.id === nextProps.user.id &&
           prevProps.user.name === nextProps.user.name;
  }
);
```

## Complete Example: Optimized List

```typescript
interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

// Memoized child component
const TodoItem = React.memo(({ 
  todo, 
  onToggle, 
  onDelete 
}: {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  console.log('TodoItem rendered:', todo.id);
  
  return (
    <div>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      <span>{todo.title}</span>
      <button onClick={() => onDelete(todo.id)}>Delete</button>
    </div>
  );
});

function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Memoized filtered list
  const filteredTodos = useMemo(() => {
    console.log('Filtering todos...');
    if (filter === 'active') return todos.filter(t => !t.completed);
    if (filter === 'completed') return todos.filter(t => t.completed);
    return todos;
  }, [todos, filter]);

  // Memoized callbacks
  const handleToggle = useCallback((id: string) => {
    setTodos(prev => prev.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  }, []);

  return (
    <div>
      <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
      </select>
      
      {filteredTodos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
```

## When to Use (and Not Use)

### ✅ Use useMemo When:
- Expensive calculations (loops, sorting, filtering large arrays)
- Creating objects/arrays passed as props to memoized components
- Computing derived data from complex state

### ❌ Don't Use useMemo For:
- Simple calculations
- Creating primitive values
- Every calculation "just in case"

### ✅ Use useCallback When:
- Passing callbacks to optimized child components (with React.memo)
- Function is a dependency of useEffect or other hooks
- Passing callbacks to custom hooks

### ❌ Don't Use useCallback For:
- Event handlers that aren't passed to optimized children
- Functions used only within the component
- Every function "just in case"

## Performance Profiling

```typescript
// React DevTools Profiler
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <YourComponent />
    </Profiler>
  );
}
```

## Common Mistakes

```typescript
// ❌ Missing dependencies
const value = useMemo(() => {
  return expensiveCalc(a, b);
}, [a]); // Missing b!

// ❌ Using memo for everything
const value = useMemo(() => 1 + 1, []); // Unnecessary

// ❌ Inline objects in dependencies
const value = useMemo(() => {
  // ...
}, [{ id: userId }]); // New object each time!

// ✅ Correct
const value = useMemo(() => {
  // ...
}, [userId]);
```

## Best Practices

1. **Measure first, optimize second**
```typescript
// Use React DevTools Profiler before optimizing
```

2. **Dependencies matter**
```typescript
// Include ALL dependencies
const value = useMemo(() => calc(a, b, c), [a, b, c]);
```

3. **Don't over-optimize**
```typescript
// Simple operations don't need memo
const fullName = `${firstName} ${lastName}`; // Fine without useMemo
```

4. **Combine with React.memo**
```typescript
const Child = React.memo(({ onClick }) => {
  // ...
});

function Parent() {
  const handleClick = useCallback(() => {
    // ...
  }, []);
  
  return <Child onClick={handleClick} />;
}
```

## Next Steps

- [useReducer - Complex State Logic](../02_advanced_hooks/01_useReducer.md)
- [Performance Best Practices](../07_clean_code/05_performance.md)

## Summary

Performance optimization hooks:
- ✅ useMemo memoizes expensive calculations
- ✅ useCallback memoizes functions
- ✅ React.memo prevents component re-renders
- ✅ Measure before optimizing
- ✅ Don't over-optimize simple code
