# TypeScript Utility Types for React

Master TypeScript utility types to build more flexible and type-safe React components.

## What You'll Learn

- Built-in TypeScript utility types
- React-specific utility types  
- Component prop manipulation
- Type inference patterns
- Advanced type transformations
- Practical utility type patterns

## 1. Built-in TypeScript Utility Types

### Partial<T>

Makes all properties optional.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

// All properties optional
type PartialUser = Partial<User>;
// { id?: number; name?: string; email?: string; age?: number; }

function UpdateUserProfile({ updates }: { updates: Partial<User> }) {
  // Only update provided fields
  console.log('Updating:', updates);
}

// Usage
<UpdateUserProfile updates={{ name: 'John' }} />
<UpdateUserProfile updates={{ name: 'John', email: 'john@example.com' }} />
```

### Required<T>

Makes all properties required.

```typescript
interface Config {
  host?: string;
  port?: number;
  secure?: boolean;
}

// All properties required
type RequiredConfig = Required<Config>;
// { host: string; port: number; secure: boolean; }

function ConnectDatabase(config: RequiredConfig) {
  console.log(`Connecting to ${config.host}:${config.port}`);
}
```

### Pick<T, K>

Select specific properties from a type.

```typescript
interface Article {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

// Pick only display properties
type ArticlePreview = Pick<Article, 'id' | 'title' | 'author' | 'createdAt'>;

function ArticleCard({ article }: { article: ArticlePreview }) {
  return (
    <div>
      <h3>{article.title}</h3>
      <p>By {article.author}</p>
      <span>{article.createdAt.toLocaleDateString()}</span>
    </div>
  );
}
```

### Omit<T, K>

Remove specific properties from a type.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
}

// Omit sensitive data
type PublicUser = Omit<User, 'password'>;
// { id: number; name: string; email: string; role: string; }

function UserProfile({ user }: { user: PublicUser }) {
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <span>{user.role}</span>
    </div>
  );
}

// Omit multiple properties
type UserBasic = Omit<User, 'password' | 'role' | 'email'>;
```

### Record<K, T>

Create an object type with specific keys and value types.

```typescript
// Define status colors
type Status = 'success' | 'error' | 'warning' | 'info';
type StatusConfig = Record<Status, { color: string; icon: string }>;

const statusConfig: StatusConfig = {
  success: { color: 'green', icon: '✓' },
  error: { color: 'red', icon: '✗' },
  warning: { color: 'yellow', icon: '⚠' },
  info: { color: 'blue', icon: 'ℹ' },
};

function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status];
  return (
    <span style={{ color: config.color }}>
      {config.icon} {status}
    </span>
  );
}

// Another example
type PageSlug = 'home' | 'about' | 'contact' | 'blog';
type PageMetadata = Record<PageSlug, { title: string; description: string }>;
```

### Readonly<T>

Makes all properties readonly.

```typescript
interface Settings {
  apiKey: string;
  endpoint: string;
  timeout: number;
}

// All properties readonly
type ReadonlySettings = Readonly<Settings>;

const config: ReadonlySettings = {
  apiKey: 'abc123',
  endpoint: 'https://api.example.com',
  timeout: 5000,
};

// config.apiKey = 'new-key'; // Error: Cannot assign to 'apiKey'

// Readonly array
const items: ReadonlyArray<string> = ['a', 'b', 'c'];
// items.push('d'); // Error: Property 'push' does not exist
```

### Extract<T, U> and Exclude<T, U>

Filter union types.

```typescript
type AllEvents = 'click' | 'scroll' | 'keydown' | 'submit' | 'change';

// Extract mouse events
type MouseEvents = Extract<AllEvents, 'click' | 'scroll'>;
// 'click' | 'scroll'

// Exclude mouse events
type KeyboardAndFormEvents = Exclude<AllEvents, 'click' | 'scroll'>;
// 'keydown' | 'submit' | 'change'

// Practical example
type Status = 'pending' | 'active' | 'inactive' | 'deleted';
type ActiveStatuses = Exclude<Status, 'deleted'>;
// 'pending' | 'active' | 'inactive'

function UserList({ status }: { status: ActiveStatuses }) {
  // status can never be 'deleted'
  return <div>Users with status: {status}</div>;
}
```

### ReturnType<T>

Extract return type of a function.

```typescript
function getUser() {
  return {
    id: 1,
    name: 'John',
    email: 'john@example.com',
  };
}

// Infer the return type
type User = ReturnType<typeof getUser>;
// { id: number; name: string; email: string; }

// With async functions
async function fetchProducts() {
  return [
    { id: 1, name: 'Product 1', price: 100 },
    { id: 2, name: 'Product 2', price: 200 },
  ];
}

type Products = Awaited<ReturnType<typeof fetchProducts>>;
// { id: number; name: string; price: number; }[]
```

### Parameters<T>

Extract parameter types of a function.

```typescript
function createUser(name: string, age: number, email: string) {
  return { name, age, email };
}

// Extract parameter types
type CreateUserParams = Parameters<typeof createUser>;
// [name: string, age: number, email: string]

// Use in component
function UserForm() {
  const handleSubmit = (...args: CreateUserParams) => {
    createUser(...args);
  };

  return <form>{/* form fields */}</form>;
}
```

## 2. React-Specific Utility Types

### React.ComponentProps<T>

Extract props from a component.

```typescript
import { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';

// Extract Button props
type ButtonProps = ComponentProps<typeof Button>;

// Extend Button props
interface CustomButtonProps extends ButtonProps {
  loading?: boolean;
}

function CustomButton({ loading, children, ...props }: CustomButtonProps) {
  return (
    <Button {...props} disabled={loading || props.disabled}>
      {loading ? 'Loading...' : children}
    </Button>
  );
}

// For HTML elements
type DivProps = ComponentProps<'div'>;
type InputProps = ComponentProps<'input'>;
type ButtonElementProps = ComponentProps<'button'>;
```

### React.ComponentPropsWithoutRef<T>

Props without ref.

```typescript
import { ComponentPropsWithoutRef } from 'react';

type ButtonProps = ComponentPropsWithoutRef<'button'>;

function CustomButton(props: ButtonProps) {
  return <button {...props} />;
}
```

### React.ComponentPropsWithRef<T>

Props with ref support.

```typescript
import { ComponentPropsWithRef, forwardRef } from 'react';

type InputProps = ComponentPropsWithRef<'input'>;

const CustomInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <input ref={ref} {...props} className="custom-input" />;
});

CustomInput.displayName = 'CustomInput';
```

### React.ReactNode

Type for anything that can be rendered.

```typescript
import { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  title?: ReactNode;
  footer?: ReactNode;
}

function Container({ children, title, footer }: ContainerProps) {
  return (
    <div>
      {title && <header>{title}</header>}
      <main>{children}</main>
      {footer && <footer>{footer}</footer>}
    </div>
  );
}

// Usage
<Container
  title={<h1>Welcome</h1>}
  footer={<p>© 2024</p>}
>
  <p>Content here</p>
</Container>
```

### React.FC<Props> (Functional Component)

Type for functional components (use sparingly).

```typescript
import { FC, ReactNode } from 'react';

interface CardProps {
  title: string;
  children: ReactNode;
}

// Using FC
const Card: FC<CardProps> = ({ title, children }) => {
  return (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  );
};

// Preferred: Regular function
function Card2({ title, children }: CardProps) {
  return (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
```

## 3. Advanced Patterns

### Combining Utility Types

```typescript
interface BaseUser {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// Public user (no password, readonly)
type PublicUser = Readonly<Omit<BaseUser, 'password'>>;

// User update payload (optional fields except id)
type UserUpdatePayload = Pick<BaseUser, 'id'> & Partial<Omit<BaseUser, 'id' | 'createdAt' | 'updatedAt'>>;

// User creation payload (no id, createdAt, updatedAt)
type UserCreatePayload = Omit<BaseUser, 'id' | 'createdAt' | 'updatedAt'>;

function CreateUser(payload: UserCreatePayload) {
  // Implementation
}

function UpdateUser(payload: UserUpdatePayload) {
  // Implementation
}

function DisplayUser({ user }: { user: PublicUser }) {
  // user.password // Error: Property 'password' does not exist
  // user.email = 'new@example.com'; // Error: Cannot assign to 'email'
  return <div>{user.name}</div>;
}
```

### Conditional Types

```typescript
// Make specific properties optional
type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

// Make email and age optional
type UserWithOptionalContact = MakeOptional<User, 'email' | 'age'>;
// { id: number; name: string; email?: string; age?: number; }

// Make specific properties required
type MakeRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

interface Config {
  host?: string;
  port?: number;
  database?: string;
}

// Make host and database required
type RequiredConfig = MakeRequired<Config, 'host' | 'database'>;
// { host: string; port?: number; database: string; }
```

### Deep Partial

```typescript
// Make all nested properties optional
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface AppConfig {
  api: {
    endpoint: string;
    timeout: number;
    retry: {
      max: number;
      delay: number;
    };
  };
  ui: {
    theme: string;
    language: string;
  };
}

// All properties deeply optional
type PartialAppConfig = DeepPartial<AppConfig>;

const config: PartialAppConfig = {
  api: {
    retry: {
      max: 3,
      // delay is optional
    },
  },
  // ui is optional
};
```

### Discriminated Unions

```typescript
// API response types
type SuccessResponse<T> = {
  status: 'success';
  data: T;
};

type ErrorResponse = {
  status: 'error';
  error: string;
  code: number;
};

type LoadingResponse = {
  status: 'loading';
};

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse | LoadingResponse;

function DataDisplay({ response }: { response: ApiResponse<User> }) {
  // TypeScript narrows the type based on status
  if (response.status === 'loading') {
    return <div>Loading...</div>;
  }

  if (response.status === 'error') {
    return <div>Error: {response.error} (Code: {response.code})</div>;
  }

  // TypeScript knows response.data exists here
  return <div>Welcome, {response.data.name}</div>;
}
```

### Extract Props with Specific Attributes

```typescript
// Extract props that extend certain attributes
type PropsWithClassName<T> = T extends { className?: string } ? T : never;

interface ButtonProps {
  onClick: () => void;
  className?: string;
}

interface LinkProps {
  href: string;
  className?: string;
}

interface ImageProps {
  src: string;
  alt: string;
}

// Only ButtonProps and LinkProps are valid
type StyledComponents = PropsWithClassName<ButtonProps | LinkProps | ImageProps>;
// ButtonProps | LinkProps
```

## 4. Practical Component Examples

### Form Field with Utility Types

```typescript
import { ComponentPropsWithoutRef } from 'react';

type InputBaseProps = ComponentPropsWithoutRef<'input'>;

interface FormFieldProps extends Omit<InputBaseProps, 'type'> {
  label: string;
  error?: string;
  type?: Extract<InputBaseProps['type'], 'text' | 'email' | 'password' | 'number'>;
}

function FormField({ label, error, type = 'text', ...props }: FormFieldProps) {
  return (
    <div>
      <label>{label}</label>
      <input type={type} {...props} />
      {error && <span>{error}</span>}
    </div>
  );
}
```

### Polymorphic Component

```typescript
import { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

type PolymorphicProps<E extends ElementType> = {
  as?: E;
  children: ReactNode;
} & ComponentPropsWithoutRef<E>;

function Polymorphic<E extends ElementType = 'div'>({
  as,
  children,
  ...props
}: PolymorphicProps<E>) {
  const Component = as || 'div';
  return <Component {...props}>{children}</Component>;
}

// Usage
<Polymorphic>Default div</Polymorphic>
<Polymorphic as="button" onClick={() => console.log('clicked')}>
  Button
</Polymorphic>
<Polymorphic as="a" href="https://example.com">
  Link
</Polymorphic>
```

### API Hook with Utility Types

```typescript
type FetchState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

type UseApiOptions<T> = {
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
};

function useApi<T>(
  url: string,
  options?: UseApiOptions<T>
): FetchState<T> & {
  refetch: () => Promise<void>;
} {
  const [state, setState] = useState<FetchState<T>>({
    data: options?.initialData ?? null,
    loading: true,
    error: null,
  });

  const fetchData = async () => {
    try {
      const response = await fetch(url);
      const data = await response.json();
      setState({ data, loading: false, error: null });
      options?.onSuccess?.(data);
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
      options?.onError?.(error as Error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [url]);

  return { ...state, refetch: fetchData };
}

// Usage
interface User {
  id: number;
  name: string;
}

function UserProfile() {
  const { data, loading, error, refetch } = useApi<User>('/api/user', {
    onSuccess: (user) => console.log('Loaded:', user.name),
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return (
    <div>
      <h2>{data.name}</h2>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

## Best Practices

### ✅ Do's

- Use `Partial<T>` for optional updates
- Use `Pick<T, K>` to create focused component props
- Use `Omit<T, K>` to exclude sensitive data
- Use `Record<K, T>` for key-value mappings
- Combine utility types for complex transformations
- Use discriminated unions for state management
- Leverage type inference with utility types
- Create custom utility types for common patterns

### ❌ Don'ts

- Don't overuse `any` - use `unknown` instead
- Don't make everything `Partial` - be specific
- Don't create overly complex nested utility types
- Don't forget about performance with deep recursion
- Don't use `Readonly` when mutation is needed
- Don't use utility types when simple types suffice
- Don't sacrifice readability for clever type tricks
- Don't forget to document custom utility types

## Quick Reference

| Utility Type | Purpose | Example |
|--------------|---------|---------|
| **Partial<T>** | All properties optional | `Partial<User>` |
| **Required<T>** | All properties required | `Required<Config>` |
| **Pick<T, K>** | Select properties | `Pick<User, 'id' \| 'name'>` |
| **Omit<T, K>** | Remove properties | `Omit<User, 'password'>` |
| **Record<K, T>** | Key-value type | `Record<string, number>` |
| **Readonly<T>** | Immutable properties | `Readonly<Settings>` |
| **Extract<T, U>** | Filter union | `Extract<Status, 'active'>` |
| **Exclude<T, U>** | Remove from union | `Exclude<Status, 'deleted'>` |
| **ReturnType<T>** | Function return type | `ReturnType<typeof fn>` |
| **Parameters<T>** | Function params | `Parameters<typeof fn>` |

## Next Steps

- **[Component Design](../07_clean_code/01_component_design.md)** - Apply utility types to component patterns
- **[Testing](../07_clean_code/04_testing.md)** - Test components with utility types
- **[Generic Components](./02_generics.md)** - Combine with generic patterns
- **[Error Handling](../07_clean_code/03_error_handling.md)** - Type-safe error handling
