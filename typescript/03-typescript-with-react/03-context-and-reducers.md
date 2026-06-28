# Context and Reducers

## What You'll Learn

- How to create fully typed context with `createContext`
- The "undefined check" problem and how to solve it with a custom hook
- Typing complex reducer actions with discriminated unions
- Combining context and reducer for scalable state management
- Typing the dispatch function for consumers
- Nested providers pattern for composing state

---

## The Problem with createContext and TypeScript

`createContext` requires a default value. In most real apps, the context value depends on runtime data (a logged-in user, fetched settings), so the "real" default is meaningless. This creates an awkward tension with TypeScript.

### The Naive Approach (Avoid This)

```tsx
import { createContext, useContext, useState, ReactNode } from "react";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Problem: you have to provide a fake default
const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},     // fake function that does nothing
  logout: () => {},          // fake function that does nothing
  isAuthenticated: false,
});
```

This compiles, but the fake functions are a lie. If someone uses `AuthContext` outside a provider, they get silently broken behavior instead of a clear error.

### The Better Approach: undefined + Custom Hook

```tsx
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Default to undefined - meaning "no provider above me"
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook that throws if used outside provider
function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context; // TypeScript narrows this to AuthContextType (not undefined)
}
```

Now every consumer uses `useAuth()` instead of `useContext(AuthContext)`, and they never have to deal with `undefined`. If someone accidentally uses the hook outside a provider, they get a clear runtime error instead of silent bugs.

> **Coming from JS:** In JavaScript, you would use `createContext(null)` or `createContext()` and just hope everyone wraps things in a provider. The TypeScript pattern above codifies that assumption and gives you a clear error if it is violated. The custom hook also means consumers never need to import the raw context.

---

## Building a Complete Auth Context

```tsx
import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from "react";

// --- Types ---

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: "admin" | "editor" | "viewer";
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: "LOGIN_START" }
  | { type: "LOGIN_SUCCESS"; payload: User }
  | { type: "LOGIN_FAILURE"; payload: string }
  | { type: "LOGOUT" }
  | { type: "UPDATE_PROFILE"; payload: Partial<User> };

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

// --- Reducer ---

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_START":
      return { ...state, isLoading: true, error: null };

    case "LOGIN_SUCCESS":
      return { user: action.payload, isLoading: false, error: null };

    case "LOGIN_FAILURE":
      return { user: null, isLoading: false, error: action.payload };

    case "LOGOUT":
      return { user: null, isLoading: false, error: null };

    case "UPDATE_PROFILE":
      if (!state.user) return state;
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    default:
      const _exhaustive: never = action;
      return state;
  }
}

// --- Context ---

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// --- Provider ---

const initialAuthState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
};

function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: "LOGIN_START" });
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const user: User = await response.json();
      dispatch({ type: "LOGIN_SUCCESS", payload: user });
    } catch (err) {
      dispatch({
        type: "LOGIN_FAILURE",
        payload: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, []);

  const logout = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST" });
    dispatch({ type: "LOGOUT" });
  }, []);

  const updateProfile = useCallback((updates: Partial<User>) => {
    dispatch({ type: "UPDATE_PROFILE", payload: updates });
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Usage in Components ---

function LoginForm() {
  const { state, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      {state.error && <div className="error">{state.error}</div>}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={state.isLoading}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={state.isLoading}
      />
      <button type="submit" disabled={state.isLoading}>
        {state.isLoading ? "Logging in..." : "Log In"}
      </button>
    </form>
  );
}

function UserMenu() {
  const { state, logout } = useAuth();

  if (!state.user) return null;

  return (
    <div className="user-menu">
      <img src={state.user.avatarUrl} alt={state.user.name} />
      <span>{state.user.name}</span>
      <span className="role-badge">{state.user.role}</span>
      <button onClick={logout}>Log Out</button>
    </div>
  );
}
```

---

## Shopping Cart Context (A Second Real Example)

```tsx
// --- Types ---

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  discountPercent: number;
}

type CartAction =
  | { type: "ADD_ITEM"; payload: Omit<CartItem, "quantity"> }
  | { type: "REMOVE_ITEM"; payload: { productId: string } }
  | { type: "UPDATE_QUANTITY"; payload: { productId: string; quantity: number } }
  | { type: "APPLY_COUPON"; payload: { code: string; discountPercent: number } }
  | { type: "REMOVE_COUPON" }
  | { type: "CLEAR_CART" };

interface CartContextType {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  // Computed values
  totalItems: number;
  subtotal: number;
  discount: number;
  total: number;
}

// --- Reducer ---

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find(
        (item) => item.productId === action.payload.productId
      );

      if (existing) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.productId === action.payload.productId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }

      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };
    }

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter(
          (item) => item.productId !== action.payload.productId
        ),
      };

    case "UPDATE_QUANTITY": {
      if (action.payload.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(
            (item) => item.productId !== action.payload.productId
          ),
        };
      }

      return {
        ...state,
        items: state.items.map((item) =>
          item.productId === action.payload.productId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    }

    case "APPLY_COUPON":
      return {
        ...state,
        couponCode: action.payload.code,
        discountPercent: action.payload.discountPercent,
      };

    case "REMOVE_COUPON":
      return { ...state, couponCode: null, discountPercent: 0 };

    case "CLEAR_CART":
      return { items: [], couponCode: null, discountPercent: 0 };

    default:
      const _exhaustive: never = action;
      return state;
  }
}

// --- Context + Provider ---

const CartContext = createContext<CartContextType | undefined>(undefined);

function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    couponCode: null,
    discountPercent: 0,
  });

  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  );
  const discount = subtotal * (state.discountPercent / 100);
  const total = subtotal - discount;

  return (
    <CartContext.Provider
      value={{ state, dispatch, totalItems, subtotal, discount, total }}
    >
      {children}
    </CartContext.Provider>
  );
}
```

> **Coming from JS:** Notice how `Omit<CartItem, "quantity">` in the `ADD_ITEM` action means callers provide everything except `quantity` (which the reducer sets to 1). These utility types are impossible in plain JS and eliminate an entire category of "forgot to pass a field" bugs.

---

## Typing the Dispatch Function

When you expose `dispatch` to consumers, TypeScript already types it as `React.Dispatch<CartAction>`. This means consumers can only dispatch valid actions.

```tsx
// This helper pattern gives consumers type-safe action creators
// instead of raw dispatch calls

function useCartActions() {
  const { dispatch } = useCart();

  return {
    addItem: (item: Omit<CartItem, "quantity">) =>
      dispatch({ type: "ADD_ITEM", payload: item }),

    removeItem: (productId: string) =>
      dispatch({ type: "REMOVE_ITEM", payload: { productId } }),

    updateQuantity: (productId: string, quantity: number) =>
      dispatch({ type: "UPDATE_QUANTITY", payload: { productId, quantity } }),

    applyCoupon: (code: string, discountPercent: number) =>
      dispatch({ type: "APPLY_COUPON", payload: { code, discountPercent } }),

    removeCoupon: () =>
      dispatch({ type: "REMOVE_COUPON" }),

    clearCart: () =>
      dispatch({ type: "CLEAR_CART" }),
  };
}

// Usage in a component - much cleaner than raw dispatch
function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCartActions();

  return (
    <button
      onClick={() =>
        addItem({
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
        })
      }
    >
      Add to Cart
    </button>
  );
}
```

---

## Nested Providers Pattern

Real applications often have multiple contexts. Layer them so that inner providers can use outer hooks.

```tsx
// App.tsx - compose providers from outermost to innermost
function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CartProvider>
          <NotificationProvider>
            <Router>
              <AppRoutes />
            </Router>
          </NotificationProvider>
        </CartProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

// A cleaner way: a Providers component
interface ProvidersProps {
  children: ReactNode;
}

function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CartProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </CartProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

// Or a generic compose function for the truly adventurous
function composeProviders(
  ...providers: Array<React.ComponentType<{ children: ReactNode }>>
): React.ComponentType<{ children: ReactNode }> {
  return providers.reduce(
    (Accumulated, Current) => {
      return function ComposedProvider({ children }: { children: ReactNode }) {
        return (
          <Accumulated>
            <Current>{children}</Current>
          </Accumulated>
        );
      };
    },
    ({ children }: { children: ReactNode }) => <>{children}</>
  );
}

const AppProviders = composeProviders(
  AuthProvider,
  ThemeProvider,
  CartProvider,
  NotificationProvider
);

function App() {
  return (
    <AppProviders>
      <Router>
        <AppRoutes />
      </Router>
    </AppProviders>
  );
}
```

> **Coming from JS:** The provider composition pattern works the same in JS, but TypeScript ensures that each provider's props are satisfied. If `CartProvider` required a `currency` prop, TypeScript would catch the missing prop at compile time. In JS, you would get a silent `undefined` at runtime.

---

## Mini-Exercise

Build a `NotificationContext` with the following requirements:

1. Define a `Notification` type with: `id` (string), `message` (string), `type` ("info" | "success" | "warning" | "error"), and `autoDismissMs` (optional number).

2. Create actions: `ADD_NOTIFICATION` (payload is `Omit<Notification, "id">` -- the reducer generates the id), `DISMISS_NOTIFICATION` (payload is `{ id: string }`), and `CLEAR_ALL`.

3. Write the reducer, context, provider, and a `useNotifications` custom hook.

4. Create an `addNotification` helper in the hook that accepts the notification data and dispatches the action.

5. In the provider, set up a `useEffect` that automatically removes notifications with `autoDismissMs` after the specified delay.

6. Write a `NotificationToast` component that consumes the context and renders the list.

Focus on getting all the types correct. The UI can be minimal.
