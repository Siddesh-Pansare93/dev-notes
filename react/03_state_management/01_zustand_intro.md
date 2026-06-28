# Introduction to Zustand

Learn Zustand, a small, fast, and scalable state management solution for React that's simpler than Redux and more powerful than Context.

## What You'll Learn

- Why use Zustand over Context or Redux
- Creating stores with TypeScript
- Reading and updating state
- Async actions
- Middleware and devtools

## Why Zustand?

### Problems with Context

```typescript
// ❌ Context causes re-renders for all consumers
const AppContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [theme, setTheme] = useState('light');
  
  // All consumers re-render when ANY value changes
  return (
    <AppContext.Provider value={{ user, cart, theme, setUser, setCart, setTheme }}>
      <ComponentA /> {/* Re-renders even if only cart changes */}
      <ComponentB /> {/* Re-renders even if only theme changes */}
    </AppContext.Provider>
  );
}
```

### Zustand Solution

```typescript
// ✅ Zustand: Components only re-render when their specific data changes
import { create } from 'zustand';

const useStore = create((set) => ({
  user: null,
  cart: [],
  theme: 'light',
  setUser: (user) => set({ user }),
  setCart: (cart) => set({ cart }),
  setTheme: (theme) => set({ theme }),
}));

function ComponentA() {
  const cart = useStore(state => state.cart); // Only re-renders when cart changes
  return <div>{cart.length} items</div>;
}

function ComponentB() {
  const theme = useStore(state => state.theme); // Only re-renders when theme changes
  return <div>{theme}</div>;
}
```

## Installation

```bash
npm install zustand
```

## Creating Your First Store

### Basic Store

```typescript
// store/useCounterStore.ts
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));

// Usage in component
function Counter() {
  const count = useCounterStore(state => state.count);
  const increment = useCounterStore(state => state.increment);
  const decrement = useCounterStore(state => state.decrement);
  const reset = useCounterStore(state => state.reset);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

### Optimized Selectors

```typescript
// ❌ Component re-renders on any store change
function BadComponent() {
  const store = useCounterStore(); // Gets entire store
  return <div>{store.count}</div>;
}

// ✅ Only re-renders when count changes
function GoodComponent() {
  const count = useCounterStore(state => state.count);
  return <div>{count}</div>;
}

// ✅ Multiple selectors
function MultipleSelectors() {
  const { count, increment } = useCounterStore(
    state => ({ count: state.count, increment: state.increment })
  );
  return <div>{count}</div>;
}
```

## TypeScript Patterns

### Complete Store Example

```typescript
// store/useAuthStore.ts
import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) throw new Error('Login failed');

      const user = await response.json();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false 
      });
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const user = await response.json();
        set({ user, isAuthenticated: true });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

// Usage
function LoginPage() {
  const { login, isLoading, error } = useAuthStore();
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await login(
      formData.get('email') as string,
      formData.get('password') as string
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## Common Store Patterns

### Todo Store

```typescript
// store/useTodoStore.ts
import { create } from 'zustand';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
}

interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'completed';
  
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  setFilter: (filter: TodoState['filter']) => void;
  clearCompleted: () => void;
}

export const useTodoStore = create<TodoState>((set) => ({
  todos: [],
  filter: 'all',

  addTodo: (text) =>
    set((state) => ({
      todos: [
        ...state.todos,
        {
          id: crypto.randomUUID(),
          text,
          completed: false,
          createdAt: new Date(),
        },
      ],
    })),

  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ),
    })),

  deleteTodo: (id) =>
    set((state) => ({
      todos: state.todos.filter((todo) => todo.id !== id),
    })),

  setFilter: (filter) => set({ filter }),

  clearCompleted: () =>
    set((state) => ({
      todos: state.todos.filter((todo) => !todo.completed),
    })),
}));

// Derived state with selectors
export const useFilteredTodos = () => {
  return useTodoStore((state) => {
    switch (state.filter) {
      case 'active':
        return state.todos.filter(todo => !todo.completed);
      case 'completed':
        return state.todos.filter(todo => todo.completed);
      default:
        return state.todos;
    }
  });
};

// Usage
function TodoList() {
  const todos = useFilteredTodos();
  const toggleTodo = useTodoStore(state => state.toggleTodo);
  const deleteTodo = useTodoStore(state => state.deleteTodo);

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
          />
          <span>{todo.text}</span>
          <button onClick={() => deleteTodo(todo.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

### Shopping Cart Store

```typescript
// store/useCartStore.ts
import { create } from 'zustand';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartState {
  items: CartItem[];
  
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  
  // Computed values
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const existingItem = state.items.find((i) => i.id === item.id);
      
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      
      return {
        items: [...state.items, { ...item, quantity: 1 }],
      };
    }),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  updateQuantity: (id, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((item) => item.id !== id)
          : state.items.map((item) =>
              item.id === id ? { ...item, quantity } : item
            ),
    })),

  clearCart: () => set({ items: [] }),

  getTotal: () => {
    const state = get();
    return state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getItemCount: () => {
    const state = get();
    return state.items.reduce((count, item) => count + item.quantity, 0);
  },
}));

// Usage
function Cart() {
  const items = useCartStore(state => state.items);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);
  const total = useCartStore(state => state.getTotal());

  return (
    <div>
      <h2>Shopping Cart</h2>
      {items.map((item) => (
        <div key={item.id}>
          <img src={item.image} alt={item.name} />
          <h3>{item.name}</h3>
          <p>${item.price}</p>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
          />
          <button onClick={() => removeItem(item.id)}>Remove</button>
        </div>
      ))}
      <div>Total: ${total.toFixed(2)}</div>
    </div>
  );
}

function CartIcon() {
  const itemCount = useCartStore(state => state.getItemCount());
  return <div>Cart ({itemCount})</div>;
}
```

## Middleware

### Persist Middleware

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
  
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: string) => void;
  toggleNotifications: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'en',
      notifications: true,

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      toggleNotifications: () =>
        set((state) => ({ notifications: !state.notifications })),
    }),
    {
      name: 'app-settings', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### Devtools Middleware

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useStore = create<State>()(
  devtools(
    (set) => ({
      // Store implementation
    }),
    { name: 'MyStore' } // Name in Redux DevTools
  )
);
```

### Combining Middleware

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export const useStore = create<State>()(
  devtools(
    persist(
      (set) => ({
        // Store implementation
      }),
      { name: 'storage-key' }
    ),
    { name: 'StoreName' }
  )
);
```

## Best Practices

1. **Use selectors for optimization**
```typescript
// ✅ Good
const count = useStore(state => state.count);

// ❌ Bad (causes unnecessary re-renders)
const store = useStore();
```

2. **Keep actions with state**
```typescript
// ✅ Good: Actions in store
const increment = useStore(state => state.increment);

// ❌ Bad: External functions
function increment() {
  useStore.setState(state => ({ count: state.count + 1 }));
}
```

3. **Use TypeScript**
```typescript
// ✅ Always type your stores
interface MyState {
  value: number;
  setValue: (value: number) => void;
}

const useStore = create<MyState>((set) => ({...}));
```

4. **Separate stores by domain**
```typescript
// ✅ Good: Separate concerns
useAuthStore
useCartStore
useProductStore

// ❌ Bad: One giant store
useAppStore
```

## Next Steps

- [Creating Stores](./02_creating_stores.md)
- [TypeScript with Zustand](./03_zustand_typescript.md)

## Summary

Zustand provides:
- ✅ Simple API with minimal boilerplate
- ✅ Excellent TypeScript support
- ✅ No prop drilling
- ✅ Optimized re-renders
- ✅ Middleware support (persist, devtools)
- ✅ Small bundle size (~1KB)
