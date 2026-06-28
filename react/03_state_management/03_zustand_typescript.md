# TypeScript with Zustand

## What You'll Learn

- Advanced TypeScript patterns for Zustand stores
- Proper typing for middleware (devtools, persist, immer)
- Generic type patterns and utilities
- Type-safe selectors and actions
- Inferring types from stores
- Best practices for type safety

---

## Basic TypeScript Setup

### Simple Store with Types

```typescript
import { create } from 'zustand';

interface BearStore {
  bears: number;
  increase: (by: number) => void;
  decrease: (by: number) => void;
  reset: () => void;
}

export const useBearStore = create<BearStore>((set) => ({
  bears: 0,
  increase: (by) => set((state) => ({ bears: state.bears + by })),
  decrease: (by) => set((state) => ({ bears: state.bears - by })),
  reset: () => set({ bears: 0 }),
}));

// Usage with full type safety
function BearCounter() {
  const bears = useBearStore((state) => state.bears); // number
  const increase = useBearStore((state) => state.increase); // (by: number) => void
  
  return (
    <div>
      <p>Bears: {bears}</p>
      <button onClick={() => increase(1)}>Add Bear</button>
    </div>
  );
}
```

---

## Typing with Middleware

### DevTools Middleware

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {} from '@redux-devtools/extension'; // Required for devtools typing

interface BearStore {
  bears: number;
  increase: (by: number) => void;
}

// ✅ Correct - Double call signature with generic
export const useBearStore = create<BearStore>()(
  devtools(
    (set) => ({
      bears: 0,
      increase: (by) => set((state) => ({ bears: state.bears + by })),
    }),
    {
      name: 'BearStore', // Name shown in Redux DevTools
    }
  )
);
```

**Note:** The double `()()` is required for proper TypeScript inference with middleware.

### Persist Middleware

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface CartStore {
  items: string[];
  addItem: (item: string) => void;
  removeItem: (item: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => ({ items: [...state.items, item] })),
      removeItem: (item) =>
        set((state) => ({ items: state.items.filter((i) => i !== item) })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cart-storage', // localStorage key
      storage: createJSONStorage(() => localStorage), // Can use sessionStorage
      partialize: (state) => ({ items: state.items }), // Only persist items
    }
  )
);
```

### Immer Middleware

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoStore {
  todos: Todo[];
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  updateTodo: (id: string, text: string) => void;
}

export const useTodoStore = create<TodoStore>()(
  immer((set) => ({
    todos: [],
    
    // With immer, you can "mutate" state directly
    addTodo: (text) =>
      set((state) => {
        state.todos.push({
          id: crypto.randomUUID(),
          text,
          completed: false,
        });
      }),
    
    toggleTodo: (id) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          todo.completed = !todo.completed;
        }
      }),
    
    updateTodo: (id, text) =>
      set((state) => {
        const todo = state.todos.find((t) => t.id === id);
        if (todo) {
          todo.text = text;
        }
      }),
  }))
);
```

### Combining Multiple Middleware

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {} from '@redux-devtools/extension';

interface AppStore {
  count: number;
  user: { name: string; email: string } | null;
  increment: () => void;
  setUser: (user: { name: string; email: string }) => void;
}

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      immer((set) => ({
        count: 0,
        user: null,
        
        increment: () =>
          set((state) => {
            state.count += 1; // Immer allows mutations
          }),
        
        setUser: (user) =>
          set((state) => {
            state.user = user;
          }),
      })),
      {
        name: 'app-storage',
        partialize: (state) => ({ user: state.user }), // Only persist user
      }
    ),
    { name: 'AppStore' }
  )
);
```

**Middleware Order Matters:**
```
devtools(persist(immer(...)))
         ↑       ↑     ↑
         3rd     2nd   1st (innermost runs first)
```

---

## Advanced TypeScript Patterns

### Inferring Types from Store

```typescript
import { create } from 'zustand';

const useBearStore = create((set) => ({
  bears: 0,
  increase: (by: number) => set((state) => ({ bears: state.bears + by })),
}));

// Infer store type
type BearStore = ReturnType<typeof useBearStore.getState>;
// Result: { bears: number; increase: (by: number) => void; }

// Extract state type (without actions)
type BearState = Omit<BearStore, 'increase'>;
// Result: { bears: number; }

// Extract actions type
type BearActions = Pick<BearStore, 'increase'>;
// Result: { increase: (by: number) => void; }
```

### Separate State and Actions Types

```typescript
import { create } from 'zustand';

// State type
interface UserState {
  user: { id: string; name: string; email: string } | null;
  isLoading: boolean;
  error: string | null;
}

// Actions type
interface UserActions {
  fetchUser: (id: string) => Promise<void>;
  updateUser: (user: Partial<UserState['user']>) => void;
  logout: () => void;
}

// Combined store type
type UserStore = UserState & UserActions;

export const useUserStore = create<UserStore>((set, get) => ({
  // State
  user: null,
  isLoading: false,
  error: null,
  
  // Actions
  fetchUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/users/${id}`);
      const user = await response.json();
      set({ user, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch user', isLoading: false });
    }
  },
  
  updateUser: (updates) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, ...updates } });
    }
  },
  
  logout: () => set({ user: null }),
}));
```

### Type-Safe Selectors

```typescript
import { create } from 'zustand';

interface AppStore {
  user: { id: string; name: string } | null;
  theme: 'light' | 'dark';
  count: number;
}

const useStore = create<AppStore>(() => ({
  user: null,
  theme: 'light',
  count: 0,
}));

// Type-safe selector utility
function createSelector<T>(selector: (state: AppStore) => T) {
  return selector;
}

// Usage
const selectUser = createSelector((state) => state.user);
const selectTheme = createSelector((state) => state.theme);
const selectUserName = createSelector((state) => state.user?.name);

function UserProfile() {
  const user = useStore(selectUser); // Typed as User | null
  const theme = useStore(selectTheme); // Typed as 'light' | 'dark'
  const userName = useStore(selectUserName); // Typed as string | undefined
  
  return <div>Welcome, {userName}</div>;
}
```

### Generic Store Creator

```typescript
import { create, StateCreator } from 'zustand';

// Generic store creator with loading/error states
interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface AsyncActions<T> {
  setData: (data: T) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type AsyncStore<T> = AsyncState<T> & AsyncActions<T>;

function createAsyncStore<T>() {
  return create<AsyncStore<T>>((set) => ({
    data: null,
    isLoading: false,
    error: null,
    
    setData: (data) => set({ data, isLoading: false, error: null }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error, isLoading: false }),
    reset: () => set({ data: null, isLoading: false, error: null }),
  }));
}

// Usage
interface User {
  id: string;
  name: string;
  email: string;
}

const useUserStore = createAsyncStore<User>();

function UserComponent() {
  const user = useUserStore((state) => state.data); // Typed as User | null
  const isLoading = useUserStore((state) => state.isLoading);
  
  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>No user</div>;
  
  return <div>{user.name}</div>;
}
```

### Typed Slices with StateCreator

```typescript
import { create, StateCreator } from 'zustand';

// User slice
interface UserSlice {
  user: { id: string; name: string } | null;
  setUser: (user: { id: string; name: string }) => void;
  logout: () => void;
}

// Cart slice
interface CartSlice {
  items: string[];
  addItem: (item: string) => void;
  removeItem: (item: string) => void;
}

// Combined store type
type StoreState = UserSlice & CartSlice;

// Create slices with proper typing
const createUserSlice: StateCreator<StoreState, [], [], UserSlice> = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
});

const createCartSlice: StateCreator<StoreState, [], [], CartSlice> = (set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (item) =>
    set((state) => ({ items: state.items.filter((i) => i !== item) })),
});

// Combine slices
export const useStore = create<StoreState>()((...args) => ({
  ...createUserSlice(...args),
  ...createCartSlice(...args),
}));
```

### Typed Slices with Middleware

```typescript
import { create, StateCreator } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {} from '@redux-devtools/extension';

interface UserSlice {
  user: { name: string } | null;
  setUser: (user: { name: string }) => void;
}

interface SettingsSlice {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

type StoreState = UserSlice & SettingsSlice;

// Middleware type helper
type Middleware = [['zustand/devtools', never], ['zustand/persist', unknown]];

const createUserSlice: StateCreator<
  StoreState,
  Middleware,
  [],
  UserSlice
> = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
});

const createSettingsSlice: StateCreator<
  StoreState,
  Middleware,
  [],
  SettingsSlice
> = (set) => ({
  theme: 'light',
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),
});

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...args) => ({
        ...createUserSlice(...args),
        ...createSettingsSlice(...args),
      }),
      { name: 'app-storage' }
    ),
    { name: 'AppStore' }
  )
);
```

---

## Utility Types

### Extract Store Type

```typescript
type ExtractState<T> = T extends { getState: () => infer S } ? S : never;

const useStore = create(() => ({ count: 0 }));
type StoreState = ExtractState<typeof useStore>;
// Result: { count: number }
```

### Readonly State

```typescript
interface AppState {
  readonly count: number;
  readonly user: Readonly<{ name: string; email: string }> | null;
  increment: () => void;
}

const useStore = create<AppState>((set) => ({
  count: 0,
  user: null,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

### Async Action Types

```typescript
type AsyncAction<T> = () => Promise<T>;
type AsyncActionWithArgs<T, Args extends any[]> = (...args: Args) => Promise<T>;

interface UserStore {
  fetchUser: AsyncAction<void>;
  updateUser: AsyncActionWithArgs<void, [id: string, data: Partial<User>]>;
}
```

---

## Best Practices

### ✅ Do's

1. **Always type your stores**:
```typescript
// ✅ Good
const useStore = create<StoreType>((set) => ({...}));

// ❌ Bad
const useStore = create((set) => ({...}));
```

2. **Use middleware type signature correctly**:
```typescript
// ✅ Good - Double call with generic
create<StoreType>()(devtools(...))

// ❌ Bad - Missing parentheses
create<StoreType>(devtools(...))
```

3. **Import devtools types**:
```typescript
// ✅ Good
import type {} from '@redux-devtools/extension';

// ❌ Bad - missing type import
```

4. **Separate state and actions types**:
```typescript
// ✅ Good
interface State { /* ... */ }
interface Actions { /* ... */ }
type Store = State & Actions;
```

### ❌ Don'ts

1. **Don't use `any` types**:
```typescript
// ❌ Bad
const useStore = create((set: any) => ({...}));

// ✅ Good
const useStore = create<StoreType>((set) => ({...}));
```

2. **Don't mix middleware order**:
```typescript
// ❌ Bad - wrong order
create()(persist(devtools(immer(...))))

// ✅ Good - correct order
create()(devtools(persist(immer(...))))
```

---

## Summary

- Always type your Zustand stores with TypeScript interfaces
- Use double `()()` call signature with middleware for proper typing
- Import `@redux-devtools/extension` types for devtools
- Separate state and actions types for clarity
- Use `StateCreator` for typed slices
- Middleware order: `devtools(persist(immer(...)))`
- Create generic utilities for reusable store patterns
- Use type inference utilities to extract types from stores

---

## Next Steps

- [Advanced Zustand Patterns](./04_advanced_patterns.md) - Middleware, subscriptions, context
- [Data Fetching with TanStack Query](../04_data_fetching/01_tanstack_intro.md)
- [TypeScript Patterns](../06_typescript_patterns/01_props_patterns.md)
