# Your First Component

Learn how to create React components with TypeScript, understand JSX, and build your first interactive UI.

## What You'll Learn

- Creating functional components with TypeScript
- Understanding JSX syntax
- Props and type safety
- Component composition
- Event handling basics

## What is a Component?

Components are the building blocks of React applications. They are reusable pieces of UI that can have their own logic and styling.

```typescript
// A simple functional component
function Welcome() {
  return <h1>Hello, React!</h1>;
}
```

## Creating Your First Component

### Basic Component

```typescript
// src/components/Greeting.tsx
interface GreetingProps {
  name: string;
}

export const Greeting: React.FC<GreetingProps> = ({ name }) => {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>Welcome to React with TypeScript</p>
    </div>
  );
};

// Usage in App.tsx
import { Greeting } from './components/Greeting';

function App() {
  return <Greeting name="John" />;
}
```

### Component with Multiple Props

```typescript
// src/components/UserCard.tsx
interface UserCardProps {
  name: string;
  age: number;
  email: string;
  isActive?: boolean; // Optional prop
}

export const UserCard: React.FC<UserCardProps> = ({ 
  name, 
  age, 
  email, 
  isActive = true // Default value
}) => {
  return (
    <div className="border rounded-lg p-4 shadow-md">
      <h2 className="text-xl font-bold">{name}</h2>
      <p className="text-gray-600">Age: {age}</p>
      <p className="text-gray-600">Email: {email}</p>
      {isActive && (
        <span className="text-green-500">● Active</span>
      )}
    </div>
  );
};

// Usage
<UserCard 
  name="Jane Doe" 
  age={28} 
  email="jane@example.com" 
  isActive={true} 
/>
```

## Understanding JSX

JSX allows you to write HTML-like syntax in JavaScript/TypeScript.

### JSX Rules

1. **Return a Single Root Element**

```typescript
// ❌ Wrong - Multiple root elements
function Wrong() {
  return (
    <h1>Title</h1>
    <p>Paragraph</p>
  );
}

// ✅ Correct - Wrapped in fragment or div
function Correct() {
  return (
    <>
      <h1>Title</h1>
      <p>Paragraph</p>
    </>
  );
}
```

2. **Close All Tags**

```typescript
// ❌ Wrong
<img src="photo.jpg">
<input type="text">

// ✅ Correct
<img src="photo.jpg" />
<input type="text" />
```

3. **Use camelCase for Attributes**

```typescript
// HTML attributes become camelCase
<div className="container">      // not class
<label htmlFor="input">          // not for
<button onClick={handleClick}>   // not onclick
```

4. **JavaScript in Curly Braces**

```typescript
function Profile() {
  const name = "Alice";
  const age = 25;
  
  return (
    <div>
      <h1>{name}</h1>
      <p>Age: {age}</p>
      <p>Next year: {age + 1}</p>
    </div>
  );
}
```

## Props in TypeScript

### Different Ways to Define Props

```typescript
// 1. Interface (Recommended)
interface ButtonProps {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ text, onClick, variant = 'primary' }) => {
  return <button onClick={onClick}>{text}</button>;
};

// 2. Type Alias
type ButtonProps = {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
};

// 3. Inline (for simple components)
export const Button = ({ text, onClick }: { text: string; onClick: () => void }) => {
  return <button onClick={onClick}>{text}</button>;
};
```

### Children Prop

```typescript
interface CardProps {
  title: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="card-body">
        {children}
      </div>
    </div>
  );
};

// Usage
<Card title="My Card">
  <p>This is the content</p>
  <button>Click me</button>
</Card>
```

### Props with Functions

```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = "Search..." 
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get('search') as string;
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        name="search" 
        placeholder={placeholder}
      />
      <button type="submit">Search</button>
    </form>
  );
};

// Usage
<SearchBar onSearch={(query) => console.log(query)} />
```

## Event Handling

```typescript
interface CounterProps {
  initialCount?: number;
}

export const Counter: React.FC<CounterProps> = ({ initialCount = 0 }) => {
  const [count, setCount] = React.useState(initialCount);

  // Proper event handler typing
  const handleIncrement = (e: React.MouseEvent<HTMLButtonElement>) => {
    setCount(count + 1);
  };

  const handleDecrement = () => {
    setCount(count - 1);
  };

  const handleReset = () => {
    setCount(initialCount);
  };

  return (
    <div className="counter">
      <h2>Count: {count}</h2>
      <button onClick={handleIncrement}>+</button>
      <button onClick={handleDecrement}>-</button>
      <button onClick={handleReset}>Reset</button>
    </div>
  );
};
```

## Component Composition

Build complex UIs by combining simple components.

```typescript
// Small, focused components
interface AvatarProps {
  src: string;
  alt: string;
  size?: 'small' | 'medium' | 'large';
}

const Avatar: React.FC<AvatarProps> = ({ src, alt, size = 'medium' }) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
  };

  return (
    <img 
      src={src} 
      alt={alt} 
      className={`rounded-full ${sizeClasses[size]}`} 
    />
  );
};

interface UserInfoProps {
  name: string;
  role: string;
}

const UserInfo: React.FC<UserInfoProps> = ({ name, role }) => {
  return (
    <div>
      <h3 className="font-bold">{name}</h3>
      <p className="text-sm text-gray-600">{role}</p>
    </div>
  );
};

// Compose them together
interface UserProfileProps {
  avatar: string;
  name: string;
  role: string;
  bio: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ 
  avatar, 
  name, 
  role, 
  bio 
}) => {
  return (
    <div className="flex items-center gap-4 p-4 border rounded">
      <Avatar src={avatar} alt={name} size="large" />
      <div>
        <UserInfo name={name} role={role} />
        <p className="mt-2">{bio}</p>
      </div>
    </div>
  );
};
```

## Conditional Rendering

```typescript
interface MessageProps {
  isLoggedIn: boolean;
  username?: string;
}

export const Message: React.FC<MessageProps> = ({ isLoggedIn, username }) => {
  // 1. Using if/else
  if (isLoggedIn) {
    return <h1>Welcome back, {username}!</h1>;
  }
  return <h1>Please sign in.</h1>;
};

// 2. Using ternary operator
export const Message2: React.FC<MessageProps> = ({ isLoggedIn, username }) => {
  return (
    <h1>
      {isLoggedIn ? `Welcome back, ${username}!` : 'Please sign in.'}
    </h1>
  );
};

// 3. Using && operator
export const Message3: React.FC<MessageProps> = ({ isLoggedIn, username }) => {
  return (
    <>
      {isLoggedIn && <h1>Welcome back, {username}!</h1>}
      {!isLoggedIn && <h1>Please sign in.</h1>}
    </>
  );
};
```

## Rendering Lists

```typescript
interface Item {
  id: string;
  name: string;
  price: number;
}

interface ProductListProps {
  products: Item[];
}

export const ProductList: React.FC<ProductListProps> = ({ products }) => {
  return (
    <ul className="space-y-2">
      {products.map((product) => (
        <li 
          key={product.id} 
          className="border p-4 rounded"
        >
          <h3>{product.name}</h3>
          <p>${product.price.toFixed(2)}</p>
        </li>
      ))}
    </ul>
  );
};

// Usage
const products = [
  { id: '1', name: 'Laptop', price: 999.99 },
  { id: '2', name: 'Mouse', price: 29.99 },
  { id: '3', name: 'Keyboard', price: 79.99 },
];

<ProductList products={products} />
```

## Complete Example: Todo Item

```typescript
// src/components/TodoItem.tsx
interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TodoItem: React.FC<TodoItemProps> = ({ 
  todo, 
  onToggle, 
  onDelete 
}) => {
  return (
    <div className="flex items-center gap-2 p-2 border-b">
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
        className="w-5 h-5"
      />
      <span 
        className={`flex-1 ${todo.completed ? 'line-through text-gray-400' : ''}`}
      >
        {todo.text}
      </span>
      <button
        onClick={() => onDelete(todo.id)}
        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Delete
      </button>
    </div>
  );
};
```

## Best Practices

1. **Use TypeScript interfaces for props**
2. **Keep components small and focused**
3. **Use meaningful prop names**
4. **Provide default values for optional props**
5. **Extract reusable logic into custom hooks**
6. **Use composition over inheritance**

## Common Mistakes

```typescript
// ❌ Don't modify props
function Bad({ user }: { user: User }) {
  user.name = 'Changed'; // Never do this!
  return <div>{user.name}</div>;
}

// ❌ Don't forget keys in lists
{items.map(item => <div>{item.name}</div>)}

// ✅ Always use keys
{items.map(item => <div key={item.id}>{item.name}</div>)}

// ❌ Don't call hooks conditionally
if (condition) {
  useState(0); // Wrong!
}
```

## Practice Exercise

Create a `ContactCard` component that displays:
- Avatar image
- Name and title
- Email and phone
- A "Contact" button that logs the email when clicked

## Next Steps

- [useState - Managing Component State](../01_core_hooks/01_useState.md)
- [useEffect - Side Effects and Lifecycle](../01_core_hooks/02_useEffect.md)

## Summary

You've learned:
- ✅ Creating functional components with TypeScript
- ✅ Defining and using props
- ✅ JSX syntax and rules
- ✅ Event handling
- ✅ Conditional rendering and lists
- ✅ Component composition
