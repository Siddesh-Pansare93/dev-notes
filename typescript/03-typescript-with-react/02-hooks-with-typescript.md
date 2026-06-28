# Hooks with TypeScript

## What You'll Learn

- How to use `useState` with explicit type parameters and union types
- Typing `useRef` for DOM elements and mutable values
- Patterns for `useEffect` typing
- Building type-safe reducers with `useReducer` and discriminated unions
- Typing `useCallback` and `useMemo` properly
- Creating custom hooks with generics (`useLocalStorage<T>`, `useFetch<T>`)

---

## useState with Explicit Types

TypeScript can infer the state type from the initial value, but there are cases where you need to be explicit.

### Simple Inference (No Annotation Needed)

```tsx
// TypeScript infers string
const [name, setName] = useState("");

// TypeScript infers number
const [count, setCount] = useState(0);

// TypeScript infers boolean
const [isOpen, setIsOpen] = useState(false);
```

### When You Need Explicit Types

```tsx
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
}

// Initial value is null, but later it will be a User
const [user, setUser] = useState<User | null>(null);

// Without the generic, TypeScript would infer `null` and never let you set a User
// setUser({ id: "1", name: "Alice", ... }) would be an error

// Later in an effect or handler:
const fetchUser = async () => {
  const response = await fetch("/api/me");
  const data: User = await response.json();
  setUser(data); // works because we declared User | null
};
```

### useState with Union Types

```tsx
type LoadingState = "idle" | "loading" | "success" | "error";

function DataLoader() {
  const [status, setStatus] = useState<LoadingState>("idle");
  const [data, setData] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const loadData = async () => {
    setStatus("loading");
    try {
      const response = await fetch("/api/items");
      const items: string[] = await response.json();
      setData(items);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setStatus("error");
    }
  };

  return (
    <div>
      {status === "idle" && <button onClick={loadData}>Load Data</button>}
      {status === "loading" && <p>Loading...</p>}
      {status === "error" && <p>Error: {error?.message}</p>}
      {status === "success" && (
        <ul>
          {data.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}
```

> **Coming from JS:** In JavaScript, you might store any shape of data in state and hope for consistency. With TypeScript, once you declare `useState<User | null>(null)`, every `setUser` call across your entire component is checked against that type. Typos and shape mismatches become compile errors.

---

## useRef for DOM Elements and Mutable Values

`useRef` serves two distinct purposes, and TypeScript treats them differently.

### DOM Refs

When you want a ref to a DOM element, initialize with `null` and pass it to an element's `ref` prop. TypeScript will create a `RefObject<T>` where `.current` is read-only.

```tsx
import { useRef, useEffect } from "react";

function AutoFocusInput() {
  // The generic tells TypeScript which element type this ref will hold
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // .current might be null (before mount or after unmount)
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} type="text" placeholder="I focus on mount" />;
}

function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    videoRef.current?.play();
  };

  const handlePause = () => {
    videoRef.current?.pause();
  };

  return (
    <div>
      <video ref={videoRef} src={src} />
      <button onClick={handlePlay}>Play</button>
      <button onClick={handlePause}>Pause</button>
    </div>
  );
}
```

### Mutable Value Refs

When you use `useRef` as a mutable container (like an instance variable), pass a non-null initial value. TypeScript will create a `MutableRefObject<T>` where `.current` is writable.

```tsx
function useInterval(callback: () => void, delayMs: number | null) {
  const savedCallback = useRef<() => void>(callback);

  // Update the ref each render so we always call the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) return;

    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}

function Timer() {
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useInterval(
    () => setCount((c) => c + 1),
    isRunning ? 1000 : null
  );

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setIsRunning(!isRunning)}>
        {isRunning ? "Stop" : "Start"}
      </button>
    </div>
  );
}
```

> **Coming from JS:** The key mental model shift is that `useRef<HTMLDivElement>(null)` produces a read-only `.current`, while `useRef<number>(0)` produces a writable `.current`. This is determined by whether `null` is included in the type but not the initial value.

---

## useEffect Typing Patterns

`useEffect` itself does not have generic parameters, but the code inside it often needs typing.

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // AbortController for cleanup
    const controller = new AbortController();

    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/users/${userId}`, {
          signal: controller.signal,
        });
        const data: User = await res.json();
        setUser(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Request was cancelled, ignore
          return;
        }
        console.error("Failed to fetch user:", err);
      }
    };

    fetchUser();

    // Cleanup function - no return type annotation needed
    return () => controller.abort();
  }, [userId]);

  if (!user) return <p>Loading...</p>;
  return <h1>{user.name}</h1>;
}
```

---

## useReducer with Discriminated Union Actions

`useReducer` shines with TypeScript because discriminated unions make every action type-safe.

```tsx
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

// Each action is a distinct type in the union
type TodoAction =
  | { type: "ADD"; payload: { text: string } }
  | { type: "TOGGLE"; payload: { id: string } }
  | { type: "DELETE"; payload: { id: string } }
  | { type: "EDIT"; payload: { id: string; text: string } }
  | { type: "CLEAR_COMPLETED" };

interface TodoState {
  todos: Todo[];
  filter: "all" | "active" | "completed";
}

function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case "ADD":
      return {
        ...state,
        todos: [
          ...state.todos,
          {
            id: crypto.randomUUID(),
            text: action.payload.text,   // TypeScript knows payload has `text`
            completed: false,
          },
        ],
      };

    case "TOGGLE":
      return {
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === action.payload.id        // TypeScript knows payload has `id`
            ? { ...todo, completed: !todo.completed }
            : todo
        ),
      };

    case "DELETE":
      return {
        ...state,
        todos: state.todos.filter((todo) => todo.id !== action.payload.id),
      };

    case "EDIT":
      return {
        ...state,
        todos: state.todos.map((todo) =>
          todo.id === action.payload.id
            ? { ...todo, text: action.payload.text }   // Both `id` and `text` available
            : todo
        ),
      };

    case "CLEAR_COMPLETED":
      return {
        ...state,
        todos: state.todos.filter((todo) => !todo.completed),
        // No payload needed here, and TypeScript knows that
      };

    default:
      // Exhaustiveness check: if you add a new action and forget to handle it,
      // TypeScript will error here
      const _exhaustive: never = action;
      return state;
  }
}

function TodoApp() {
  const [state, dispatch] = useReducer(todoReducer, {
    todos: [],
    filter: "all",
  });

  const handleAdd = (text: string) => {
    dispatch({ type: "ADD", payload: { text } });
  };

  // TypeScript will catch mistakes:
  // dispatch({ type: "ADD" })                   // Error: missing payload
  // dispatch({ type: "ADD", payload: { id: 1 }})  // Error: payload needs `text`, not `id`
  // dispatch({ type: "UNKNOWN" })               // Error: not in the union

  return (
    <div>
      {state.todos.map((todo) => (
        <div key={todo.id}>
          <span
            style={{ textDecoration: todo.completed ? "line-through" : "none" }}
            onClick={() => dispatch({ type: "TOGGLE", payload: { id: todo.id } })}
          >
            {todo.text}
          </span>
          <button onClick={() => dispatch({ type: "DELETE", payload: { id: todo.id } })}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## useCallback and useMemo Typing

TypeScript usually infers the types for these hooks, but there are edge cases worth knowing.

```tsx
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

function ProductList({ products }: { products: Product[] }) {
  const [sortBy, setSortBy] = useState<"name" | "price">("name");
  const [filterCategory, setFilterCategory] = useState<string>("");

  // useMemo infers the return type from the callback
  const filteredProducts = useMemo(() => {
    let result = products;
    if (filterCategory) {
      result = result.filter((p) => p.category === filterCategory);
    }
    return result.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a.price - b.price;
    });
  }, [products, sortBy, filterCategory]);

  // useCallback - TypeScript infers the parameter and return types
  const handleProductClick = useCallback((product: Product) => {
    console.log("Selected:", product.name);
  }, []);

  // If you need to pass callbacks to child components with specific signatures:
  const handlePriceChange = useCallback(
    (productId: string, newPrice: number): void => {
      // update logic here
      console.log(`Updating ${productId} to ${newPrice}`);
    },
    []
  );

  return (
    <div>
      {filteredProducts.map((product) => (
        <div key={product.id} onClick={() => handleProductClick(product)}>
          {product.name} - ${product.price}
        </div>
      ))}
    </div>
  );
}
```

> **Coming from JS:** In JavaScript, the only thing `useCallback` and `useMemo` give you is performance optimization. In TypeScript, they also serve as documentation -- the types make it immediately clear what the memoized value or callback expects and returns.

---

## Custom Hooks with Generics

This is where TypeScript really shines. Generics let you build hooks that work with any data type while remaining fully type-safe.

### useLocalStorage<T>

```tsx
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(nextValue));
        } catch (err) {
          console.error(`Failed to save to localStorage key "${key}":`, err);
        }
        return nextValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}

// Usage - T is inferred from the initial value
const [theme, setTheme] = useLocalStorage("theme", "light");
// theme is string, setTheme accepts string

const [user, setUser] = useLocalStorage<User | null>("user", null);
// user is User | null, setUser accepts User | null

interface Settings {
  notifications: boolean;
  language: string;
  fontSize: number;
}

const [settings, setSettings] = useLocalStorage<Settings>("settings", {
  notifications: true,
  language: "en",
  fontSize: 14,
});
// Fully typed -- settings.notifications is boolean, etc.
```

### useFetch<T>

```tsx
interface FetchState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

function useFetch<T>(url: string, options?: RequestInit): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setState({ data: null, error: null, isLoading: true });

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as T;
        setState({ data, error: null, isLoading: false });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState({
          data: null,
          error: err instanceof Error ? err : new Error("Unknown error"),
          isLoading: false,
        });
      }
    };

    fetchData();
    return () => controller.abort();
  }, [url]);

  return state;
}

// Usage
interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

function PostList() {
  // T is explicitly provided, so `data` is typed as Post[] | null
  const { data: posts, error, isLoading } = useFetch<Post[]>(
    "https://jsonplaceholder.typicode.com/posts"
  );

  if (isLoading) return <p>Loading posts...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!posts) return null;

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>
          <h3>{post.title}</h3>
          <p>{post.body}</p>
        </li>
      ))}
    </ul>
  );
}
```

### useDebounce<T>

```tsx
function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

// Usage
function SearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  // debouncedQuery is inferred as string

  const { data: results } = useFetch<SearchResult[]>(
    `/api/search?q=${encodeURIComponent(debouncedQuery)}`
  );

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {results?.map((result) => (
        <div key={result.id}>{result.title}</div>
      ))}
    </div>
  );
}
```

> **Coming from JS:** Custom hooks in JS return values that you just "know" the shape of. In TypeScript, the return type is explicit and enforced. If your hook returns `[T, (value: T) => void]`, every consumer gets autocomplete and type checking for free. Generic hooks like `useFetch<Post[]>` let you parameterize by data shape without sacrificing safety.

---

## Mini-Exercise

Build a `useToggle` hook and a `useAsync<T>` hook:

1. **`useToggle(initialValue?: boolean)`**: Returns `[value, toggle, setTrue, setFalse]` where `toggle` flips the boolean, `setTrue` forces it to `true`, and `setFalse` forces it to `false`. Make sure the return type is a tuple, not an array (hint: use `as const` or an explicit return type).

2. **`useAsync<T>(asyncFn: () => Promise<T>)`**: Returns `{ execute: () => Promise<void>, data: T | null, error: Error | null, status: "idle" | "pending" | "success" | "error" }`. The `execute` function should call `asyncFn`, handle the promise, and update all the state fields. Make sure calling `execute` while already pending does nothing (no duplicate requests).

Test both hooks in a simple component that toggles visibility of data fetched with `useAsync`.
