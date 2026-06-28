# Advanced Zustand Patterns

## What You'll Learn

- Subscriptions and listening to state changes
- Custom middleware creation
- DevTools integration and debugging
- State persistence strategies
- Immer for immutable updates
- Context pattern for multiple stores
- Performance optimization techniques

---

## Subscriptions

### Basic Subscription

Subscribe to any state change in the store.

```typescript
import { create } from 'zustand';

interface BearStore {
  bears: number;
  increase: () => void;
}

const useBearStore = create<BearStore>((set) => ({
  bears: 0,
  increase: () => set((state) => ({ bears: state.bears + 1 })),
}));

// Subscribe to all state changes
const unsubscribe = useBearStore.subscribe((state) => {
  console.log('State changed:', state);
});

// Later: unsubscribe
unsubscribe();
```

### Selective Subscriptions

Use `subscribeWithSelector` middleware to subscribe to specific state slices.

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

interface DogStore {
  paw: boolean;
  snout: boolean;
  fur: boolean;
  setPaw: (paw: boolean) => void;
}

const useDogStore = create<DogStore>()(
  subscribeWithSelector((set) => ({
    paw: true,
    snout: true,
    fur: true,
    setPaw: (paw) => set({ paw }),
  }))
);

// Subscribe to specific property
const unsubscribe1 = useDogStore.subscribe(
  (state) => state.paw,
  (paw) => console.log('Paw changed:', paw)
);

// Subscribe with previous value
const unsubscribe2 = useDogStore.subscribe(
  (state) => state.paw,
  (paw, previousPaw) => {
    console.log('Paw changed from', previousPaw, 'to', paw);
  }
);

// Subscribe to multiple values
const unsubscribe3 = useDogStore.subscribe(
  (state) => [state.paw, state.fur],
  (values) => console.log('Paw or fur changed:', values),
  { equalityFn: shallow } // Use shallow comparison
);

// Subscribe and fire immediately
const unsubscribe4 = useDogStore.subscribe(
  (state) => state.paw,
  (paw) => console.log('Initial value:', paw),
  { fireImmediately: true }
);
```

### React Component Subscriptions

```typescript
import { useEffect } from 'react';
import { useBearStore } from './store';

function BearLogger() {
  useEffect(() => {
    const unsubscribe = useBearStore.subscribe(
      (state) => state.bears,
      (bears, previousBears) => {
        console.log(`Bears changed: ${previousBears} → ${bears}`);
      }
    );
    
    return unsubscribe; // Cleanup on unmount
  }, []);
  
  return null;
}
```

---

## Persist Middleware

### Basic Persistence

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UserStore {
  user: { name: string; email: string } | null;
  setUser: (user: { name: string; email: string }) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'user-storage', // localStorage key
    }
  )
);
```

### Custom Storage

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

// Custom storage implementation
const customStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = sessionStorage.getItem(name);
    return value || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    sessionStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    sessionStorage.removeItem(name);
  },
};

export const useStore = create()(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }),
    {
      name: 'count-storage',
      storage: createJSONStorage(() => customStorage),
    }
  )
);
```

### Partial Persistence

Only persist specific parts of the state.

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
  // Persisted
  user: { name: string } | null;
  theme: 'light' | 'dark';
  
  // Not persisted
  sessionId: string;
  tempData: string[];
  
  // Actions
  setUser: (user: { name: string }) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSessionId: (id: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      user: null,
      theme: 'light',
      sessionId: '',
      tempData: [],
      
      setUser: (user) => set({ user }),
      setTheme: (theme) => set({ theme }),
      setSessionId: (id) => set({ sessionId: id }),
    }),
    {
      name: 'app-storage',
      // Only persist user and theme
      partialize: (state) => ({
        user: state.user,
        theme: state.theme,
      }),
    }
  )
);
```

### Migration Support

Handle state structure changes between app versions.

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CurrentState {
  user: { id: string; name: string; email: string } | null;
  version: number;
}

interface OldState {
  username: string;
  userEmail: string;
}

export const useUserStore = create<CurrentState>()(
  persist(
    (set) => ({
      user: null,
      version: 2,
    }),
    {
      name: 'user-storage',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        // Migrate from version 1 to version 2
        if (version === 1) {
          const oldState = persistedState as OldState;
          return {
            user: {
              id: crypto.randomUUID(),
              name: oldState.username,
              email: oldState.userEmail,
            },
            version: 2,
          };
        }
        
        return persistedState as CurrentState;
      },
    }
  )
);
```

---

## Immer Middleware

Use Immer for simpler immutable updates.

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  tags: string[];
}

interface TodoStore {
  todos: Todo[];
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  addTag: (todoId: string, tag: string) => void;
  removeTodo: (id: string) => void;
}

export const useTodoStore = create<TodoStore>()(
  immer((set) => ({
    todos: [],
    
    // With Immer, mutate state directly
    addTodo: (text) =>
      set((state) => {
        state.todos.push({
          id: crypto.randomUUID(),
          text,
          completed: false,
          tags: [],
        });
      }),
    
    toggleTodo: (id) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          todo.completed = !todo.completed;
        }
      }),
    
    addTag: (todoId, tag) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === todoId);
        if (todo && !todo.tags.includes(tag)) {
          todo.tags.push(tag);
        }
      }),
    
    removeTodo: (id) =>
      set((state) => {
        const index = state.todos.findIndex((t) => t.id === id);
        if (index !== -1) {
          state.todos.splice(index, 1);
        }
      }),
  }))
);
```

---

## DevTools Integration

### Basic DevTools

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {} from '@redux-devtools/extension';

interface CounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useCounterStore = create<CounterStore>()(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
      decrement: () => set((state) => ({ count: state.count - 1 })),
    }),
    {
      name: 'CounterStore', // Store name in DevTools
      enabled: process.env.NODE_ENV === 'development', // Only in dev
    }
  )
);
```

### Named Actions in DevTools

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useStore = create()(
  devtools((set) => ({
    count: 0,
    
    increment: () =>
      set(
        (state) => ({ count: state.count + 1 }),
        undefined,
        'counter/increment' // Action name in DevTools
      ),
    
    decrement: () =>
      set(
        (state) => ({ count: state.count - 1 }),
        undefined,
        'counter/decrement'
      ),
    
    reset: () =>
      set(
        { count: 0 },
        undefined,
        'counter/reset'
      ),
  }))
);
```

### DevTools with Slices

```typescript
import { create, StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';

type BearSlice = {
  bears: number;
  addBear: () => void;
};

type FishSlice = {
  fishes: number;
  addFish: () => void;
};

type StoreState = BearSlice & FishSlice;

const createBearSlice: StateCreator<
  StoreState,
  [['zustand/devtools', never]],
  [],
  BearSlice
> = (set) => ({
  bears: 0,
  addBear: () =>
    set(
      (state) => ({ bears: state.bears + 1 }),
      undefined,
      'animals/addBear' // Named action
    ),
});

const createFishSlice: StateCreator<
  StoreState,
  [['zustand/devtools', never]],
  [],
  FishSlice
> = (set) => ({
  fishes: 0,
  addFish: () =>
    set(
      (state) => ({ fishes: state.fishes + 1 }),
      undefined,
      'animals/addFish'
    ),
});

export const useAnimalStore = create<StoreState>()(
  devtools((...args) => ({
    ...createBearSlice(...args),
    ...createFishSlice(...args),
  }))
);
```

---

## Custom Middleware

### Simple Logger Middleware

```typescript
import { StateCreator, StoreMutatorIdentifier } from 'zustand';

type Logger = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  f: StateCreator<T, Mps, Mcs>,
  name?: string
) => StateCreator<T, Mps, Mcs>;

type LoggerImpl = <T>(
  f: StateCreator<T, [], []>,
  name?: string
) => StateCreator<T, [], []>;

const loggerImpl: LoggerImpl = (f, name) => (set, get, store) => {
  const loggedSet: typeof set = (...args) => {
    console.log(`[${name || 'Store'}] prev state:`, get());
    set(...args);
    console.log(`[${name || 'Store'}] next state:`, get());
  };
  
  return f(loggedSet, get, store);
};

export const logger = loggerImpl as Logger;

// Usage
import { create } from 'zustand';

interface CounterStore {
  count: number;
  increment: () => void;
}

const useStore = create<CounterStore>()(
  logger(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }),
    'CounterStore'
  )
);
```

### Performance Monitor Middleware

```typescript
import { StateCreator } from 'zustand';

const performanceMonitor = <T extends object>(
  f: StateCreator<T>
): StateCreator<T> => (set, get, store) => {
  const perfSet: typeof set = (...args) => {
    const start = performance.now();
    set(...args);
    const end = performance.now();
    console.log(`State update took ${(end - start).toFixed(2)}ms`);
  };
  
  return f(perfSet, get, store);
};

// Usage
const useStore = create(
  performanceMonitor((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
  }))
);
```

---

## Context Pattern (Multiple Store Instances)

Create multiple instances of the same store.

```typescript
import { createContext, useContext, useRef, ReactNode } from 'react';
import { createStore, useStore } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

type CounterStore = ReturnType<typeof createCounterStore>;

const createCounterStore = () =>
  createStore<CounterState>((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
  }));

const CounterContext = createContext<CounterStore | null>(null);

export function CounterProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<CounterStore>();
  
  if (!storeRef.current) {
    storeRef.current = createCounterStore();
  }
  
  return (
    <CounterContext.Provider value={storeRef.current}>
      {children}
    </CounterContext.Provider>
  );
}

export function useCounterStore<T>(selector: (state: CounterState) => T): T {
  const store = useContext(CounterContext);
  if (!store) throw new Error('Missing CounterProvider');
  return useStore(store, selector);
}

// Usage
function Counter() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  
  return (
    <button onClick={increment}>Count: {count}</button>
  );
}

function App() {
  return (
    <div>
      <CounterProvider>
        <Counter /> {/* Independent instance 1 */}
      </CounterProvider>
      
      <CounterProvider>
        <Counter /> {/* Independent instance 2 */}
      </CounterProvider>
    </div>
  );
}
```

---

## Best Practices

### ✅ Do's

1. **Use subscribeWithSelector for specific updates**:
```typescript
const useStore = create()(
  subscribeWithSelector((set) => ({...}))
);
```

2. **Combine middleware in correct order**:
```typescript
create()(devtools(persist(immer(...))))
```

3. **Use Immer for complex nested updates**:
```typescript
set((state) => {
  state.nested.deep.value = newValue; // Much cleaner!
});
```

4. **Persist only necessary data**:
```typescript
persist(..., {
  partialize: (state) => ({ user: state.user })
})
```

### ❌ Don'ts

1. **Don't forget to unsubscribe**:
```typescript
useEffect(() => {
  const unsub = store.subscribe(...);
  return unsub; // ✅ Cleanup
}, []);
```

2. **Don't persist sensitive data**:
```typescript
// ❌ Bad
partialize: (state) => ({ token: state.token })
```

3. **Don't overuse DevTools in production**:
```typescript
// ✅ Good
devtools(..., { enabled: process.env.NODE_ENV === 'development' })
```

---

## Summary

- Use **subscriptions** to react to state changes outside components
- **Persist** state to localStorage/sessionStorage with migration support
- **Immer** simplifies nested immutable updates
- **DevTools** integration helps debugging with named actions
- Create **custom middleware** for cross-cutting concerns
- Use **context pattern** for multiple independent store instances
- Always cleanup subscriptions to prevent memory leaks

---

## Next Steps

- [Data Fetching with TanStack Query](../04_data_fetching/01_tanstack_intro.md)
- [TypeScript Patterns](../06_typescript_patterns/01_props_patterns.md)
- [Performance Best Practices](../07_clean_code/05_performance.md)
