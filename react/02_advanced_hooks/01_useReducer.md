# useReducer - Complex State Logic

Master useReducer for managing complex state logic in React components with better organization and predictability.

## What You'll Learn

- When to use useReducer over useState
- Reducer pattern and best practices
- TypeScript with useReducer
- Complex state management
- Combining with Context

## useState vs useReducer

### When to Use useState
- Simple state (boolean, string, number)
- Independent state updates
- State doesn't depend on previous state

### When to Use useReducer
- Complex state objects
- Multiple state transitions
- State updates depend on previous state
- Multiple related state values

## Basic useReducer Syntax

```typescript
const [state, dispatch] = useReducer(reducer, initialState);

function reducer(state, action) {
  // Return new state based on action
}
```

## Simple Counter Example

```typescript
// State type
type State = {
  count: number;
};

// Action types
type Action =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'RESET' }
  | { type: 'SET'; payload: number };

// Reducer function
function counterReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + 1 };
    case 'DECREMENT':
      return { count: state.count - 1 };
    case 'RESET':
      return { count: 0 };
    case 'SET':
      return { count: action.payload };
    default:
      return state;
  }
}

// Component
function Counter() {
  const [state, dispatch] = useReducer(counterReducer, { count: 0 });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+</button>
      <button onClick={() => dispatch({ type: 'DECREMENT' })}>-</button>
      <button onClick={() => dispatch({ type: 'RESET' })}>Reset</button>
      <button onClick={() => dispatch({ type: 'SET', payload: 10 })}>
        Set to 10
      </button>
    </div>
  );
}
```

## Todo List with useReducer

```typescript
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

type State = {
  todos: Todo[];
};

type Action =
  | { type: 'ADD_TODO'; payload: string }
  | { type: 'TOGGLE_TODO'; payload: string }
  | { type: 'DELETE_TODO'; payload: string }
  | { type: 'EDIT_TODO'; payload: { id: string; text: string } }
  | { type: 'CLEAR_COMPLETED' };

function todoReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        todos: [
          ...state.todos,
          {
            id: crypto.randomUUID(),
            text: action.payload,
            completed: false,
          },
        ],
      };

    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload
            ? { ...todo, completed: !todo.completed }
            : todo
        ),
      };

    case 'DELETE_TODO':
      return {
        ...state,
        todos: state.todos.filter(todo => todo.id !== action.payload),
      };

    case 'EDIT_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload.id
            ? { ...todo, text: action.payload.text }
            : todo
        ),
      };

    case 'CLEAR_COMPLETED':
      return {
        ...state,
        todos: state.todos.filter(todo => !todo.completed),
      };

    default:
      return state;
  }
}

function TodoApp() {
  const [state, dispatch] = useReducer(todoReducer, { todos: [] });
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      dispatch({ type: 'ADD_TODO', payload: inputValue });
      setInputValue('');
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add todo..."
        />
        <button type="submit">Add</button>
      </form>

      <ul>
        {state.todos.map(todo => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => dispatch({ type: 'TOGGLE_TODO', payload: todo.id })}
            />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
              {todo.text}
            </span>
            <button onClick={() => dispatch({ type: 'DELETE_TODO', payload: todo.id })}>
              Delete
            </button>
          </li>
        ))}
      </ul>

      <button onClick={() => dispatch({ type: 'CLEAR_COMPLETED' })}>
        Clear Completed
      </button>
    </div>
  );
}
```

## Form State Management

```typescript
interface FormState {
  values: {
    email: string;
    password: string;
    rememberMe: boolean;
  };
  errors: {
    email?: string;
    password?: string;
  };
  isSubmitting: boolean;
}

type FormAction =
  | { type: 'SET_FIELD'; field: string; value: any }
  | { type: 'SET_ERROR'; field: string; error: string }
  | { type: 'CLEAR_ERROR'; field: string }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR' }
  | { type: 'RESET' };

const initialState: FormState = {
  values: {
    email: '',
    password: '',
    rememberMe: false,
  },
  errors: {},
  isSubmitting: false,
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        values: {
          ...state.values,
          [action.field]: action.value,
        },
      };

    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.field]: action.error,
        },
      };

    case 'CLEAR_ERROR':
      const { [action.field]: removed, ...restErrors } = state.errors;
      return {
        ...state,
        errors: restErrors,
      };

    case 'SUBMIT_START':
      return {
        ...state,
        isSubmitting: true,
      };

    case 'SUBMIT_SUCCESS':
      return {
        ...initialState,
      };

    case 'SUBMIT_ERROR':
      return {
        ...state,
        isSubmitting: false,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

function LoginForm() {
  const [state, dispatch] = useReducer(formReducer, initialState);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    dispatch({
      type: 'SET_FIELD',
      field: name,
      value: type === 'checkbox' ? checked : value,
    });
    
    // Clear error when user types
    if (state.errors[name as keyof typeof state.errors]) {
      dispatch({ type: 'CLEAR_ERROR', field: name });
    }
  };

  const validate = (): boolean => {
    let isValid = true;

    if (!state.values.email.includes('@')) {
      dispatch({ type: 'SET_ERROR', field: 'email', error: 'Invalid email' });
      isValid = false;
    }

    if (state.values.password.length < 6) {
      dispatch({
        type: 'SET_ERROR',
        field: 'password',
        error: 'Password must be at least 6 characters',
      });
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    dispatch({ type: 'SUBMIT_START' });

    try {
      await loginUser(state.values.email, state.values.password);
      dispatch({ type: 'SUBMIT_SUCCESS' });
    } catch (error) {
      dispatch({ type: 'SUBMIT_ERROR' });
      dispatch({
        type: 'SET_ERROR',
        field: 'email',
        error: 'Login failed. Please try again.',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          type="email"
          name="email"
          value={state.values.email}
          onChange={handleChange}
          placeholder="Email"
        />
        {state.errors.email && <span className="error">{state.errors.email}</span>}
      </div>

      <div>
        <input
          type="password"
          name="password"
          value={state.values.password}
          onChange={handleChange}
          placeholder="Password"
        />
        {state.errors.password && (
          <span className="error">{state.errors.password}</span>
        )}
      </div>

      <label>
        <input
          type="checkbox"
          name="rememberMe"
          checked={state.values.rememberMe}
          onChange={handleChange}
        />
        Remember me
      </label>

      <button type="submit" disabled={state.isSubmitting}>
        {state.isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## Async State Management

```typescript
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

type AsyncAction<T> =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: T }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'RESET' };

function asyncReducer<T>(
  state: AsyncState<T>,
  action: AsyncAction<T>
): AsyncState<T> {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'FETCH_SUCCESS':
      return {
        data: action.payload,
        loading: false,
        error: null,
      };

    case 'FETCH_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case 'RESET':
      return {
        data: null,
        loading: false,
        error: null,
      };

    default:
      return state;
  }
}

interface User {
  id: string;
  name: string;
  email: string;
}

function UserProfile({ userId }: { userId: string }) {
  const [state, dispatch] = useReducer(asyncReducer<User>, {
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    const fetchUser = async () => {
      dispatch({ type: 'FETCH_START' });

      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user');
        const data = await response.json();
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (error) {
        dispatch({
          type: 'FETCH_ERROR',
          payload: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    fetchUser();
  }, [userId]);

  if (state.loading) return <div>Loading...</div>;
  if (state.error) return <div>Error: {state.error}</div>;
  if (!state.data) return <div>No user found</div>;

  return (
    <div>
      <h2>{state.data.name}</h2>
      <p>{state.data.email}</p>
    </div>
  );
}
```

## useReducer with Context

```typescript
// types.ts
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  total: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'CLEAR_CART' };

// CartContext.tsx
const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
} | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);

      if (existingItem) {
        const items = state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
        return {
          items,
          total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        };
      }

      const items = [...state.items, action.payload];
      return {
        items,
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      };
    }

    case 'REMOVE_ITEM': {
      const items = state.items.filter(item => item.id !== action.payload);
      return {
        items,
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      };
    }

    case 'UPDATE_QUANTITY': {
      const items = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      return {
        items,
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      };
    }

    case 'CLEAR_CART':
      return { items: [], total: 0 };

    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0 });

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

// Usage
function Cart() {
  const { state, dispatch } = useCart();

  return (
    <div>
      <h2>Shopping Cart</h2>
      {state.items.map(item => (
        <div key={item.id}>
          <span>{item.name}</span>
          <span>${item.price}</span>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_QUANTITY',
                payload: { id: item.id, quantity: parseInt(e.target.value) },
              })
            }
          />
          <button onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: item.id })}>
            Remove
          </button>
        </div>
      ))}
      <div>Total: ${state.total.toFixed(2)}</div>
      <button onClick={() => dispatch({ type: 'CLEAR_CART' })}>Clear Cart</button>
    </div>
  );
}
```

## Lazy Initialization

```typescript
function init(initialCount: number): State {
  // Expensive initialization
  return { count: initialCount };
}

function Counter({ initialCount }: { initialCount: number }) {
  // Pass init function as third argument
  const [state, dispatch] = useReducer(reducer, initialCount, init);

  return <div>{state.count}</div>;
}
```

## Best Practices

1. **Keep reducers pure**
```typescript
// ✅ Good: Pure function
function reducer(state, action) {
  return { ...state, count: state.count + 1 };
}

// ❌ Bad: Mutating state
function reducer(state, action) {
  state.count += 1; // Don't mutate!
  return state;
}
```

2. **Use discriminated unions for actions**
```typescript
type Action =
  | { type: 'ADD'; payload: number }
  | { type: 'SUBTRACT'; payload: number }
  | { type: 'RESET' };
```

3. **Create action creators**
```typescript
const actions = {
  increment: (): Action => ({ type: 'INCREMENT' }),
  decrement: (): Action => ({ type: 'DECREMENT' }),
  setCount: (count: number): Action => ({ type: 'SET', payload: count }),
};

// Usage
dispatch(actions.increment());
dispatch(actions.setCount(10));
```

4. **Handle default case**
```typescript
function reducer(state: State, action: Action): State {
  switch (action.type) {
    // ... cases
    default:
      return state; // or throw new Error(`Unknown action: ${action.type}`)
  }
}
```

## Next Steps

- [Custom Hooks](./02_custom_hooks.md)
- [useActionState - React 19](./03_useActionState.md)

## Summary

useReducer is perfect for:
- ✅ Complex state logic
- ✅ Multiple related state values
- ✅ State transitions with rules
- ✅ Better organization and testing
- ✅ Combining with Context API
