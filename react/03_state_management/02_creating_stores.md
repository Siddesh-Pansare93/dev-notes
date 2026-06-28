# Creating Zustand Stores

## What You'll Learn

- How to structure Zustand stores effectively
- The slices pattern for modular state management
- Organizing stores for scalability
- Sharing state and actions between slices
- Best practices for store architecture with TypeScript

---

## Store Organization Strategies

As your application grows, managing all state in a single store becomes difficult. This guide shows patterns for organizing stores effectively.

---

## Pattern 1: Simple Single Store

For small applications, a single store with all state works well.

```typescript
import { create } from 'zustand';

interface AppStore {
  // State
  count: number;
  user: { name: string; email: string } | null;
  theme: 'light' | 'dark';
  
  // Actions
  increment: () => void;
  decrement: () => void;
  setUser: (user: { name: string; email: string } | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  reset: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Initial state
  count: 0,
  user: null,
  theme: 'light',
  
  // Actions
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  setUser: (user) => set({ user }),
  setTheme: (theme) => set({ theme }),
  reset: () => set({ count: 0, user: null, theme: 'light' }),
}));

// Usage
function Counter() {
  const count = useAppStore((state) => state.count);
  const increment = useAppStore((state) => state.increment);
  
  return (
    <button onClick={increment}>
      Count: {count}
    </button>
  );
}
```

**When to use:** Small apps with <10 state properties.

---

## Pattern 2: Multiple Independent Stores

Separate unrelated concerns into different stores.

```typescript
// stores/userStore.ts
import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  setUser: (user: User | null) => void;
  fetchUser: (id: string) => Promise<void>;
  logout: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  
  setUser: (user) => set({ user }),
  
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
  
  logout: () => set({ user: null }),
}));

// stores/cartStore.ts
import { create } from 'zustand';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  total: number;
  
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  total: 0,
  
  addItem: (item) =>
    set((state) => {
      const existingItem = state.items.find((i) => i.id === item.id);
      
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.id === item.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      
      return { items: [...state.items, { ...item, quantity: 1 }] };
    }),
  
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  
  updateQuantity: (id, quantity) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, quantity } : item
      ),
    })),
  
  clearCart: () => set({ items: [], total: 0 }),
}));

// Usage - Import stores independently
function UserProfile() {
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  
  return <div>Welcome, {user?.name}</div>;
}

function ShoppingCart() {
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  
  return <div>Cart items: {items.length}</div>;
}
```

**When to use:** Different features with independent state (auth, cart, settings, etc.).

---

## Pattern 3: Slices Pattern (Modular Single Store)

Best for large stores - split into slices but combine into one store.

### Basic Slices

```typescript
import { create, StateCreator } from 'zustand';

// Define individual slice interfaces
interface BearSlice {
  bears: number;
  addBear: () => void;
  eatFish: () => void;
}

interface FishSlice {
  fishes: number;
  addFish: () => void;
}

interface SharedSlice {
  addBoth: () => void;
  getBoth: () => number;
}

// Combined store type
type BoundStore = BearSlice & FishSlice & SharedSlice;

// Create individual slices
const createBearSlice: StateCreator<BoundStore, [], [], BearSlice> = (
  set,
  get
) => ({
  bears: 0,
  addBear: () => set((state) => ({ bears: state.bears + 1 })),
  eatFish: () => set((state) => ({ fishes: state.fishes - 1 })),
});

const createFishSlice: StateCreator<BoundStore, [], [], FishSlice> = (
  set
) => ({
  fishes: 0,
  addFish: () => set((state) => ({ fishes: state.fishes + 1 })),
});

const createSharedSlice: StateCreator<BoundStore, [], [], SharedSlice> = (
  set,
  get
) => ({
  addBoth: () => {
    // Access other slices via get()
    get().addBear();
    get().addFish();
  },
  getBoth: () => get().bears + get().fishes,
});

// Combine slices into one store
export const useBoundStore = create<BoundStore>()((...args) => ({
  ...createBearSlice(...args),
  ...createFishSlice(...args),
  ...createSharedSlice(...args),
}));

// Usage
function App() {
  const bears = useBoundStore((state) => state.bears);
  const fishes = useBoundStore((state) => state.fishes);
  const addBoth = useBoundStore((state) => state.addBoth);
  
  return (
    <div>
      <p>Bears: {bears}</p>
      <p>Fishes: {fishes}</p>
      <button onClick={addBoth}>Add Both</button>
    </div>
  );
}
```

### Real-World E-Commerce Example

```typescript
import { create, StateCreator } from 'zustand';

// Types
interface Product {
  id: string;
  name: string;
  price: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

// === User Slice ===
interface UserSlice {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const createUserSlice: StateCreator<
  UserSlice & CartSlice & UISlice,
  [],
  [],
  UserSlice
> = (set) => ({
  user: null,
  isAuthenticated: false,
  
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
});

// === Cart Slice ===
interface CartSlice {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

const createCartSlice: StateCreator<
  UserSlice & CartSlice & UISlice,
  [],
  [],
  CartSlice
> = (set, get) => ({
  items: [],
  
  addToCart: (product) =>
    set((state) => {
      const existing = state.items.find((item) => item.id === product.id);
      
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      
      return {
        items: [...state.items, { ...product, quantity: 1 }],
      };
    }),
  
  removeFromCart: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== productId),
    })),
  
  clearCart: () => set({ items: [] }),
  
  getTotal: () => {
    const items = get().items;
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  },
});

// === UI Slice ===
interface UISlice {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  notifications: string[];
  toggleTheme: () => void;
  toggleSidebar: () => void;
  addNotification: (message: string) => void;
  clearNotifications: () => void;
}

const createUISlice: StateCreator<
  UserSlice & CartSlice & UISlice,
  [],
  [],
  UISlice
> = (set) => ({
  theme: 'light',
  sidebarOpen: false,
  notifications: [],
  
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),
  
  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  addNotification: (message) =>
    set((state) => ({
      notifications: [...state.notifications, message],
    })),
  
  clearNotifications: () => set({ notifications: [] }),
});

// === Combined Store ===
type StoreState = UserSlice & CartSlice & UISlice;

export const useStore = create<StoreState>()((...args) => ({
  ...createUserSlice(...args),
  ...createCartSlice(...args),
  ...createUISlice(...args),
}));

// Usage
function Header() {
  const user = useStore((state) => state.user);
  const cartItems = useStore((state) => state.items);
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  
  return (
    <header className={theme === 'dark' ? 'dark' : ''}>
      <p>Welcome, {user?.name}</p>
      <p>Cart: {cartItems.length} items</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </header>
  );
}
```

---

## Pattern 4: Nested Slices with Actions

Organize slices by feature domain with nested structure.

```typescript
import { create, StateCreator } from 'zustand';

// === Auth Feature ===
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

interface AuthSlice {
  auth: AuthState & AuthActions;
}

const createAuthSlice: StateCreator<
  AuthSlice & ProductsSlice,
  [],
  [],
  AuthSlice
> = (set, get) => ({
  auth: {
    // State
    user: null,
    token: null,
    isLoading: false,
    
    // Actions
    login: async (email, password) => {
      set((state) => ({
        auth: { ...state.auth, isLoading: true },
      }));
      
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        
        const { user, token } = await response.json();
        
        set((state) => ({
          auth: {
            ...state.auth,
            user,
            token,
            isLoading: false,
          },
        }));
      } catch (error) {
        set((state) => ({
          auth: { ...state.auth, isLoading: false },
        }));
      }
    },
    
    logout: () => {
      set((state) => ({
        auth: {
          ...state.auth,
          user: null,
          token: null,
        },
      }));
    },
    
    refreshToken: async () => {
      const currentToken = get().auth.token;
      // Refresh logic
    },
  },
});

// === Products Feature ===
interface ProductsState {
  products: Product[];
  selectedProduct: Product | null;
  isLoading: boolean;
}

interface ProductsActions {
  fetchProducts: () => Promise<void>;
  selectProduct: (id: string) => void;
}

interface ProductsSlice {
  products: ProductsState & ProductsActions;
}

const createProductsSlice: StateCreator<
  AuthSlice & ProductsSlice,
  [],
  [],
  ProductsSlice
> = (set, get) => ({
  products: {
    // State
    products: [],
    selectedProduct: null,
    isLoading: false,
    
    // Actions
    fetchProducts: async () => {
      set((state) => ({
        products: { ...state.products, isLoading: true },
      }));
      
      try {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        set((state) => ({
          products: {
            ...state.products,
            products,
            isLoading: false,
          },
        }));
      } catch (error) {
        set((state) => ({
          products: { ...state.products, isLoading: false },
        }));
      }
    },
    
    selectProduct: (id) => {
      const product = get().products.products.find((p) => p.id === id);
      set((state) => ({
        products: { ...state.products, selectedProduct: product || null },
      }));
    },
  },
});

// === Combined Store ===
type AppState = AuthSlice & ProductsSlice;

export const useAppStore = create<AppState>()((...args) => ({
  ...createAuthSlice(...args),
  ...createProductsSlice(...args),
}));

// Usage
function ProductList() {
  const products = useAppStore((state) => state.products.products);
  const fetchProducts = useAppStore((state) => state.products.fetchProducts);
  const user = useAppStore((state) => state.auth.user);
  
  return (
    <div>
      {user && <p>Welcome, {user.name}</p>}
      <button onClick={fetchProducts}>Load Products</button>
      {products.map((product) => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  );
}
```

---

## Best Practices

### ✅ Do's

1. **Use TypeScript for type safety**:
```typescript
interface MyStore {
  count: number;
  increment: () => void;
}

const useStore = create<MyStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

2. **Co-locate related state and actions**:
```typescript
// ✅ Good - auth state and actions together
const createAuthSlice = (set) => ({
  user: null,
  token: null,
  login: () => { /* ... */ },
  logout: () => { /* ... */ },
});
```

3. **Use slices for large stores**:
```typescript
// ✅ Good - organized into slices
const useStore = create((...args) => ({
  ...createUserSlice(...args),
  ...createCartSlice(...args),
  ...createUISlice(...args),
}));
```

4. **Name actions clearly**:
```typescript
// ✅ Good names
addToCart, removeFromCart, clearCart
setUser, fetchUser, logout
toggleTheme, openModal, closeModal
```

### ❌ Don'ts

1. **Don't mix unrelated concerns**:
```typescript
// ❌ Bad - auth and cart don't belong together
const useStore = create((set) => ({
  user: null,
  cartItems: [],
  login: () => {},
  addToCart: () => {},
}));
```

2. **Don't create deeply nested state**:
```typescript
// ❌ Bad - too nested
state: {
  user: {
    profile: {
      settings: {
        preferences: {
          theme: 'dark'
        }
      }
    }
  }
}

// ✅ Good - flatter structure
state: {
  userProfile: { /* ... */ },
  userSettings: { /* ... */ },
  theme: 'dark'
}
```

3. **Don't forget to use `get()` for accessing other slices**:
```typescript
// ❌ Bad - can't access other slice
const createCartSlice = (set) => ({
  clearIfLoggedOut: () => {
    // Can't access user slice!
  }
});

// ✅ Good - use get()
const createCartSlice = (set, get) => ({
  clearIfLoggedOut: () => {
    if (!get().user) {
      set({ items: [] });
    }
  }
});
```

---

## File Organization

### Option 1: Single File (Small Apps)

```
src/
  store/
    index.ts          # All store code
  components/
    Counter.tsx
```

### Option 2: Multiple Files (Medium Apps)

```
src/
  stores/
    userStore.ts      # Independent stores
    cartStore.ts
    settingsStore.ts
  components/
    UserProfile.tsx
    Cart.tsx
```

### Option 3: Slices Pattern (Large Apps)

```
src/
  store/
    index.ts          # Combines all slices
    slices/
      userSlice.ts    # Individual slices
      cartSlice.ts
      productsSlice.ts
      uiSlice.ts
    types.ts          # Shared types
  components/
    features/
      user/
      cart/
      products/
```

---

## Summary

- **Simple stores** work for small apps with minimal state
- **Multiple independent stores** separate unrelated concerns
- **Slices pattern** organizes large stores while keeping everything in one place
- Use `StateCreator` for proper TypeScript typing with slices
- Access other slices via `get()` when needed
- Co-locate related state and actions for better organization
- Choose a file structure that scales with your app

---

## Next Steps

- [TypeScript with Zustand](./03_zustand_typescript.md) - Advanced typing patterns
- [Advanced Zustand Patterns](./04_advanced_patterns.md) - Middleware, persistence, devtools
- [Data Fetching with TanStack Query](../04_data_fetching/01_tanstack_intro.md)
