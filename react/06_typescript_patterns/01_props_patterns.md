# Component Props Patterns

Master TypeScript patterns for React component props, ensuring type safety and excellent developer experience.

## What You'll Learn

- Basic props patterns
- Optional and default props
- Union types and discriminated unions
- Generic components
- Props with children
- Event handler types
- Advanced patterns

## Basic Props

### Interface vs Type

```typescript
// ✅ Interface (Preferred for components)
interface ButtonProps {
  text: string;
  onClick: () => void;
}

// ✅ Type alias (Good for unions and complex types)
type ButtonProps = {
  text: string;
  onClick: () => void;
};

// Both work, but interfaces are preferred for React components
export const Button: React.FC<ButtonProps> = ({ text, onClick }) => {
  return <button onClick={onClick}>{text}</button>;
};
```

### Optional Props

```typescript
interface UserCardProps {
  name: string;
  email: string;
  age?: number; // Optional
  avatar?: string; // Optional
}

export const UserCard: React.FC<UserCardProps> = ({ 
  name, 
  email, 
  age, 
  avatar 
}) => {
  return (
    <div>
      {avatar && <img src={avatar} alt={name} />}
      <h2>{name}</h2>
      <p>{email}</p>
      {age && <p>Age: {age}</p>}
    </div>
  );
};
```

### Default Props

```typescript
// Modern approach: Destructuring with defaults
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary',
  size = 'medium',
  disabled = false,
  children 
}) => {
  return (
    <button 
      className={`btn-${variant} btn-${size}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
```

## Children Props

### Basic Children

```typescript
interface CardProps {
  title: string;
  children: React.ReactNode; // Accepts anything renderable
}

export const Card: React.FC<CardProps> = ({ title, children }) => {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
};

// Usage
<Card title="My Card">
  <p>Any content</p>
  <button>Click me</button>
</Card>
```

### Typed Children

```typescript
interface ListProps {
  children: React.ReactElement<ItemProps> | React.ReactElement<ItemProps>[];
}

interface ItemProps {
  label: string;
  value: string;
}

const Item: React.FC<ItemProps> = ({ label, value }) => (
  <li>{label}: {value}</li>
);

const List: React.FC<ListProps> = ({ children }) => {
  return <ul>{children}</ul>;
};

// Usage - Type safe!
<List>
  <Item label="Name" value="John" />
  <Item label="Age" value="30" />
</List>
```

### Render Props

```typescript
interface DataFetcherProps<T> {
  url: string;
  children: (data: T | null, loading: boolean, error: Error | null) => React.ReactNode;
}

function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return <>{children(data, loading, error)}</>;
}

// Usage
<DataFetcher<User> url="/api/user">
  {(user, loading, error) => {
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (!user) return null;
    return <div>{user.name}</div>;
  }}
</DataFetcher>
```

## Union Types

### String Literal Unions

```typescript
interface AlertProps {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export const Alert: React.FC<AlertProps> = ({ message, type }) => {
  const colors = {
    info: 'blue',
    success: 'green',
    warning: 'yellow',
    error: 'red',
  };

  return (
    <div className={`alert alert-${colors[type]}`}>
      {message}
    </div>
  );
};

// TypeScript ensures only valid types
<Alert message="Success!" type="success" /> // ✅
<Alert message="Error!" type="danger" /> // ❌ Type error
```

### Discriminated Unions

```typescript
// Different props based on type
type ButtonProps = 
  | {
      variant: 'link';
      href: string;
      children: React.ReactNode;
    }
  | {
      variant: 'button';
      onClick: () => void;
      children: React.ReactNode;
    };

export const Button: React.FC<ButtonProps> = (props) => {
  if (props.variant === 'link') {
    return <a href={props.href}>{props.children}</a>;
  }
  
  return (
    <button onClick={props.onClick}>
      {props.children}
    </button>
  );
};

// Usage
<Button variant="link" href="/about">About</Button>
<Button variant="button" onClick={() => alert('Hi')}>Click</Button>
```

### Complex Discriminated Unions

```typescript
interface BaseFormFieldProps {
  name: string;
  label: string;
  required?: boolean;
}

type FormFieldProps =
  | (BaseFormFieldProps & {
      type: 'text' | 'email' | 'password';
      placeholder?: string;
    })
  | (BaseFormFieldProps & {
      type: 'select';
      options: Array<{ label: string; value: string }>;
    })
  | (BaseFormFieldProps & {
      type: 'checkbox';
      checked: boolean;
      onChange: (checked: boolean) => void;
    });

export const FormField: React.FC<FormFieldProps> = (props) => {
  const { type, name, label, required } = props;

  return (
    <div>
      <label htmlFor={name}>
        {label} {required && '*'}
      </label>
      
      {(type === 'text' || type === 'email' || type === 'password') && (
        <input
          type={type}
          name={name}
          placeholder={props.placeholder}
          required={required}
        />
      )}
      
      {type === 'select' && (
        <select name={name} required={required}>
          {props.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
      
      {type === 'checkbox' && (
        <input
          type="checkbox"
          name={name}
          checked={props.checked}
          onChange={(e) => props.onChange(e.target.checked)}
        />
      )}
    </div>
  );
};
```

## Event Handler Types

### Common Event Types

```typescript
interface FormProps {
  onSubmit: (data: FormData) => void;
}

export const Form: React.FC<FormProps> = ({ onSubmit }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log('Button clicked');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      console.log('Enter pressed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleInputChange} onKeyPress={handleKeyPress} />
      <button onClick={handleClick}>Submit</button>
    </form>
  );
};
```

### Generic Event Handlers

```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;
  onChange?: (query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onChange }) => {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onChange?.(value); // Optional chaining
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={query} onChange={handleChange} />
      <button type="submit">Search</button>
    </form>
  );
};
```

## Generic Components

### Generic List Component

```typescript
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
}

export function List<T>({ 
  items, 
  renderItem, 
  keyExtractor,
  emptyMessage = 'No items'
}: ListProps<T>) {
  if (items.length === 0) {
    return <div>{emptyMessage}</div>;
  }

  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item, index)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}

// Usage
interface User {
  id: number;
  name: string;
}

const users: User[] = [
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' },
];

<List
  items={users}
  renderItem={(user) => <div>{user.name}</div>}
  keyExtractor={(user) => user.id}
/>
```

### Generic Data Fetcher

```typescript
interface DataFetcherProps<T> {
  url: string;
  children: (state: {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
  }) => React.ReactNode;
}

export function DataFetcher<T>({ url, children }: DataFetcherProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url);
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return <>{children({ data, loading, error, refetch: fetchData })}</>;
}

// Usage
interface Post {
  id: number;
  title: string;
}

<DataFetcher<Post> url="/api/post/1">
  {({ data, loading, error, refetch }) => {
    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;
    if (!data) return null;
    
    return (
      <div>
        <h1>{data.title}</h1>
        <button onClick={refetch}>Refresh</button>
      </div>
    );
  }}
</DataFetcher>
```

## Component Composition Patterns

### Compound Components

```typescript
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('useTabs must be used within Tabs');
  return context;
};

interface TabsProps {
  defaultTab: string;
  children: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> & {
  List: React.FC<{ children: React.ReactNode }>;
  Tab: React.FC<{ value: string; children: React.ReactNode }>;
  Panel: React.FC<{ value: string; children: React.ReactNode }>;
} = ({ defaultTab, children }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
};

Tabs.List = ({ children }) => {
  return <div role="tablist">{children}</div>;
};

Tabs.Tab = ({ value, children }) => {
  const { activeTab, setActiveTab } = useTabs();
  return (
    <button
      role="tab"
      aria-selected={activeTab === value}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
};

Tabs.Panel = ({ value, children }) => {
  const { activeTab } = useTabs();
  if (activeTab !== value) return null;
  return <div role="tabpanel">{children}</div>;
};

// Usage
<Tabs defaultTab="tab1">
  <Tabs.List>
    <Tabs.Tab value="tab1">Tab 1</Tabs.Tab>
    <Tabs.Tab value="tab2">Tab 2</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
  <Tabs.Panel value="tab2">Content 2</Tabs.Panel>
</Tabs>
```

## Extending HTML Elements

### Button with Native Props

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'large';
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary',
  size = 'small',
  className,
  children,
  ...props // Rest of native button props
}) => {
  return (
    <button
      className={`btn-${variant} btn-${size} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Usage - All native button props work!
<Button 
  variant="primary"
  onClick={() => {}}
  disabled
  type="submit"
  aria-label="Submit form"
>
  Submit
</Button>
```

### Input with Ref

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div>
        {label && <label>{label}</label>}
        <input
          ref={ref}
          className={`input ${error ? 'input-error' : ''} ${className || ''}`}
          {...props}
        />
        {error && <span className="error">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Usage with ref
const MyForm = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  
  return (
    <Input
      ref={inputRef}
      label="Email"
      type="email"
      error="Invalid email"
      onFocus={() => inputRef.current?.select()}
    />
  );
};
```

## Best Practices

1. **Use interfaces for component props**
2. **Provide default values for optional props**
3. **Use discriminated unions for variant props**
4. **Type event handlers properly**
5. **Extend native HTML props when appropriate**
6. **Use generics for reusable components**
7. **Create custom hooks for shared logic**

## Next Steps

- [Generics in Components](./02_generics.md)
- [Clean Code Practices](../07_clean_code/01_component_design.md)

## Summary

TypeScript patterns help you:
- ✅ Write type-safe components
- ✅ Provide excellent IntelliSense
- ✅ Catch errors at compile time
- ✅ Create flexible, reusable components
