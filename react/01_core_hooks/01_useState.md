# useState - Managing Component State

Master the most fundamental React hook for managing component state with TypeScript.

## What You'll Learn

- Understanding state in React
- Using useState with TypeScript
- State updates and immutability
- Multiple state variables
- Complex state objects
- Common patterns and best practices

## What is State?

State is data that changes over time in your component. When state changes, React re-renders the component to reflect the new data.

## Basic useState Syntax

```typescript
import { useState } from 'react';

function Counter() {
  // Declare a state variable
  const [count, setCount] = useState(0);
  //     ^        ^              ^
  //     |        |              |
  //   value   setter    initial value

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
```

## TypeScript with useState

### Explicit Type Annotation

```typescript
import { useState } from 'react';

// Type is inferred as number
const [count, setCount] = useState(0);

// Explicit type annotation
const [count, setCount] = useState<number>(0);

// Union types
const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

// Array type
const [items, setItems] = useState<string[]>([]);

// Object type
interface User {
  id: string;
  name: string;
  email: string;
}

const [user, setUser] = useState<User | null>(null);
```

### Complex State Types

```typescript
interface FormData {
  username: string;
  email: string;
  age: number;
  agreedToTerms: boolean;
}

function RegistrationForm() {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    age: 0,
    agreedToTerms: false,
  });

  return <div>{/* Form implementation */}</div>;
}
```

## Updating State

### Simple Updates

```typescript
function Counter() {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1); // Use current value
  };

  const decrement = () => {
    setCount(count - 1);
  };

  const reset = () => {
    setCount(0);
  };

  return (
    <div className="flex gap-2">
      <button onClick={decrement}>-</button>
      <span className="px-4">{count}</span>
      <button onClick={increment}>+</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

### Functional Updates

Use when the new state depends on the previous state:

```typescript
function Counter() {
  const [count, setCount] = useState(0);

  const increment = () => {
    // ✅ Correct: Use functional update
    setCount(prevCount => prevCount + 1);
  };

  const incrementByFive = () => {
    // This will increment by 5, not 1!
    setCount(prevCount => prevCount + 1);
    setCount(prevCount => prevCount + 1);
    setCount(prevCount => prevCount + 1);
    setCount(prevCount => prevCount + 1);
    setCount(prevCount => prevCount + 1);
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+1</button>
      <button onClick={incrementByFive}>+5</button>
    </div>
  );
}
```

## Multiple State Variables

```typescript
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // API call logic
      await login(email, password);
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <label>
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        Remember me
      </label>
      {error && <p className="text-red-500">{error}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## State Objects and Immutability

### Updating Object State

```typescript
interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

function ProfileSettings() {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/default-avatar.png',
    preferences: {
      theme: 'light',
      notifications: true,
    },
  });

  // ❌ Wrong: Mutating state directly
  const updateNameWrong = (newName: string) => {
    profile.name = newName; // Never do this!
    setProfile(profile);
  };

  // ✅ Correct: Create new object
  const updateName = (newName: string) => {
    setProfile({
      ...profile,
      name: newName,
    });
  };

  // ✅ Correct: Update nested property
  const toggleTheme = () => {
    setProfile({
      ...profile,
      preferences: {
        ...profile.preferences,
        theme: profile.preferences.theme === 'light' ? 'dark' : 'light',
      },
    });
  };

  return (
    <div>
      <input
        value={profile.name}
        onChange={(e) => updateName(e.target.value)}
      />
      <button onClick={toggleTheme}>
        Toggle Theme (Current: {profile.preferences.theme})
      </button>
    </div>
  );
}
```

### Updating Array State

```typescript
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);

  // Add item
  const addTodo = (text: string) => {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
    };
    setTodos([...todos, newTodo]); // or setTodos(prev => [...prev, newTodo])
  };

  // Remove item
  const removeTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  // Update item
  const toggleTodo = (id: string) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // Clear all
  const clearCompleted = () => {
    setTodos(todos.filter(todo => !todo.completed));
  };

  return (
    <div>
      {todos.map(todo => (
        <div key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
          />
          <span>{todo.text}</span>
          <button onClick={() => removeTodo(todo.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

## Form Handling with useState

### Controlled Components

```typescript
interface FormData {
  username: string;
  email: string;
  age: string;
  country: string;
  bio: string;
  subscribe: boolean;
}

function RegistrationForm() {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    age: '',
    country: '',
    bio: '',
    subscribe: false,
  });

  // Generic change handler
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form data:', formData);
    // Submit to API
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        name="username"
        value={formData.username}
        onChange={handleChange}
        placeholder="Username"
      />
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Email"
      />
      <input
        type="number"
        name="age"
        value={formData.age}
        onChange={handleChange}
        placeholder="Age"
      />
      <select
        name="country"
        value={formData.country}
        onChange={handleChange}
      >
        <option value="">Select Country</option>
        <option value="us">United States</option>
        <option value="uk">United Kingdom</option>
        <option value="ca">Canada</option>
      </select>
      <textarea
        name="bio"
        value={formData.bio}
        onChange={handleChange}
        placeholder="Bio"
        rows={4}
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="subscribe"
          checked={formData.subscribe}
          onChange={handleChange}
        />
        Subscribe to newsletter
      </label>
      <button type="submit">Register</button>
    </form>
  );
}
```

## Common Patterns

### Toggle Boolean

```typescript
function ToggleExample() {
  const [isOpen, setIsOpen] = useState(false);

  // Simple toggle
  const toggle = () => setIsOpen(!isOpen);

  // Functional toggle (safer)
  const toggle2 = () => setIsOpen(prev => !prev);

  return (
    <div>
      <button onClick={toggle}>Toggle</button>
      {isOpen && <div>Content is visible!</div>}
    </div>
  );
}
```

### Lazy Initial State

Use a function when initial state is expensive to compute:

```typescript
function ExpensiveComponent() {
  // ❌ Runs on every render
  const [data, setData] = useState(expensiveCalculation());

  // ✅ Only runs once
  const [data, setData] = useState(() => expensiveCalculation());

  // Example: Reading from localStorage
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  return <div>{/* Component */}</div>;
}
```

### State Reset Pattern

```typescript
function SearchableList({ items }: { items: string[] }) {
  const [query, setQuery] = useState('');

  const filteredItems = items.filter(item =>
    item.toLowerCase().includes(query.toLowerCase())
  );

  const clearSearch = () => {
    setQuery('');
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {query && (
        <button onClick={clearSearch}>Clear</button>
      )}
      <ul>
        {filteredItems.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Best Practices

1. **Use functional updates for dependent state**
```typescript
// ✅ Good
setCount(prev => prev + 1);

// ❌ Avoid (can cause stale state issues)
setCount(count + 1);
```

2. **Keep state minimal**
```typescript
// ❌ Don't store derived data
const [items, setItems] = useState([]);
const [itemCount, setItemCount] = useState(0);

// ✅ Derive it
const [items, setItems] = useState([]);
const itemCount = items.length;
```

3. **Group related state**
```typescript
// ❌ Too many separate states
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [email, setEmail] = useState('');

// ✅ Group related state
const [user, setUser] = useState({
  firstName: '',
  lastName: '',
  email: '',
});
```

4. **Don't duplicate props in state**
```typescript
// ❌ Prop duplication
function User({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName); // Won't update if prop changes
}

// ✅ Use props directly or use key prop
function User({ name }: { name: string }) {
  return <div>{name}</div>;
}
```

## Common Mistakes

```typescript
// ❌ Mutating state directly
state.push(newItem);
setState(state);

// ✅ Create new array
setState([...state, newItem]);

// ❌ Forgetting async nature
setCount(count + 1);
console.log(count); // Still old value!

// ✅ Use useEffect or callback
setCount(prev => {
  const next = prev + 1;
  console.log(next);
  return next;
});
```

## Practice Exercise

Create a shopping cart component with:
- Add/remove items
- Update quantities
- Calculate total price
- Clear cart functionality

## Next Steps

- [useEffect - Side Effects and Lifecycle](./02_useEffect.md)
- [useContext - Sharing Data](./03_useContext.md)

## Summary

useState is essential for:
- ✅ Managing component-level state
- ✅ Re-rendering on data changes
- ✅ Building interactive UIs
- ✅ Form handling
