# Generic Components in TypeScript

Learn how to build reusable, type-safe components using TypeScript generics.

## What You'll Learn

- Generic component patterns
- Type constraints and extends
- Generic hooks
- Generic utility components
- Inferring types from generics
- Default generic types
- Advanced generic patterns

## 1. Basic Generic Components

### Generic List Component

```typescript
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
}

function List<T>({
  items,
  renderItem,
  keyExtractor,
  emptyMessage = 'No items found',
}: ListProps<T>) {
  if (items.length === 0) {
    return <p className="text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

// Usage
interface User {
  id: number;
  name: string;
  email: string;
}

function UserList() {
  const users: User[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ];

  return (
    <List
      items={users}
      keyExtractor={(user) => user.id}
      renderItem={(user) => (
        <div className="p-4 border rounded">
          <h3 className="font-semibold">{user.name}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      )}
    />
  );
}

export default UserList;
```

### Generic Table Component

```typescript
interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  sortable?: boolean;
  width?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
}

function Table<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
}: TableProps<T>) {
  const getCellValue = (item: T, column: Column<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(item);
    }
    return item[column.accessor];
  };

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((column, index) => (
              <th
                key={index}
                className="px-4 py-3 text-left text-sm font-medium"
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={() => onRowClick?.(item)}
              className="border-b hover:bg-muted/50 cursor-pointer"
            >
              {columns.map((column, colIndex) => (
                <td key={colIndex} className="px-4 py-3 text-sm">
                  {getCellValue(item, column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Usage
interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

function ProductTable() {
  const products: Product[] = [
    { id: 1, name: 'Laptop', price: 999, stock: 5 },
    { id: 2, name: 'Mouse', price: 29, stock: 50 },
  ];

  const columns: Column<Product>[] = [
    { header: 'ID', accessor: 'id', width: '80px' },
    { header: 'Product', accessor: 'name' },
    {
      header: 'Price',
      accessor: (product) => `$${product.price.toFixed(2)}`,
      width: '120px',
    },
    { header: 'Stock', accessor: 'stock', width: '100px' },
  ];

  return (
    <Table
      data={products}
      columns={columns}
      onRowClick={(product) => console.log('Clicked:', product)}
    />
  );
}

export default ProductTable;
```

## 2. Generic Components with Constraints

### Generic Form Field

```typescript
interface FormFieldProps<T extends string | number | boolean> {
  value: T;
  onChange: (value: T) => void;
  label: string;
  type?: 'text' | 'number' | 'checkbox';
  error?: string;
}

function FormField<T extends string | number | boolean>({
  value,
  onChange,
  label,
  type = 'text',
  error,
}: FormFieldProps<T>) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === 'checkbox') {
      onChange(e.target.checked as T);
    } else if (type === 'number') {
      onChange(Number(e.target.value) as T);
    } else {
      onChange(e.target.value as T);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        checked={type === 'checkbox' ? (value as boolean) : undefined}
        value={type !== 'checkbox' ? String(value) : undefined}
        onChange={handleChange}
        className="w-full p-2 border rounded"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

// Usage
function UserForm() {
  const [name, setName] = useState<string>('');
  const [age, setAge] = useState<number>(18);
  const [isActive, setIsActive] = useState<boolean>(true);

  return (
    <div className="space-y-4">
      <FormField value={name} onChange={setName} label="Name" />
      <FormField value={age} onChange={setAge} label="Age" type="number" />
      <FormField value={isActive} onChange={setIsActive} label="Active" type="checkbox" />
    </div>
  );
}
```

### Generic Select Component

```typescript
interface Option<T> {
  label: string;
  value: T;
  disabled?: boolean;
}

interface SelectProps<T> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
}

function Select<T extends string | number>({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select an option',
}: SelectProps<T>) {
  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      <select
        value={String(value)}
        onChange={(e) => {
          const selectedOption = options.find(
            (opt) => String(opt.value) === e.target.value
          );
          if (selectedOption) {
            onChange(selectedOption.value);
          }
        }}
        className="w-full p-2 border rounded"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option, index) => (
          <option
            key={index}
            value={String(option.value)}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Usage with different types
function SelectExamples() {
  const [stringValue, setStringValue] = useState<string>('option1');
  const [numberValue, setNumberValue] = useState<number>(1);

  const stringOptions: Option<string>[] = [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
  ];

  const numberOptions: Option<number>[] = [
    { label: 'One', value: 1 },
    { label: 'Two', value: 2 },
  ];

  return (
    <div className="space-y-4">
      <Select
        options={stringOptions}
        value={stringValue}
        onChange={setStringValue}
        label="String Select"
      />
      <Select
        options={numberOptions}
        value={numberValue}
        onChange={setNumberValue}
        label="Number Select"
      />
    </div>
  );
}
```

## 3. Generic Hooks

### Generic useLocalStorage Hook

```typescript
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  };

  return [storedValue, setValue];
}

// Usage
interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

function UserSettings() {
  const [preferences, setPreferences] = useLocalStorage<UserPreferences>(
    'user-preferences',
    {
      theme: 'light',
      language: 'en',
      notifications: true,
    }
  );

  return (
    <div>
      <p>Theme: {preferences.theme}</p>
      <button
        onClick={() =>
          setPreferences((prev) => ({
            ...prev,
            theme: prev.theme === 'light' ? 'dark' : 'light',
          }))
        }
      >
        Toggle Theme
      </button>
    </div>
  );
}
```

### Generic useFetch Hook

```typescript
interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

function useFetch<T>(url: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error as Error,
        });
      }
    };

    fetchData();
  }, [url]);

  return state;
}

// Usage
interface User {
  id: number;
  name: string;
  email: string;
}

function UserProfile({ userId }: { userId: number }) {
  const { data: user, loading, error } = useFetch<User>(
    `/api/users/${userId}`
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>No user found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

## 4. Generic Card Components

### Generic Data Card

```typescript
interface CardProps<T> {
  data: T;
  title: (data: T) => string;
  description: (data: T) => string;
  actions?: (data: T) => React.ReactNode;
  image?: (data: T) => string;
}

function DataCard<T>({
  data,
  title,
  description,
  actions,
  image,
}: CardProps<T>) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {image && (
        <img src={image(data)} alt={title(data)} className="w-full h-48 object-cover" />
      )}
      <div className="p-4">
        <h3 className="text-lg font-semibold">{title(data)}</h3>
        <p className="text-sm text-muted-foreground mt-2">{description(data)}</p>
        {actions && <div className="mt-4">{actions(data)}</div>}
      </div>
    </div>
  );
}

// Usage with different data types
interface Article {
  id: number;
  title: string;
  excerpt: string;
  coverImage: string;
  author: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
}

function Examples() {
  const article: Article = {
    id: 1,
    title: 'Getting Started with TypeScript',
    excerpt: 'Learn TypeScript basics...',
    coverImage: '/article.jpg',
    author: 'John Doe',
  };

  const product: Product = {
    id: 1,
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse',
    price: 29.99,
    image: '/mouse.jpg',
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <DataCard
        data={article}
        title={(a) => a.title}
        description={(a) => `By ${a.author} - ${a.excerpt}`}
        image={(a) => a.coverImage}
        actions={(a) => <button>Read Article</button>}
      />

      <DataCard
        data={product}
        title={(p) => p.name}
        description={(p) => `${p.description} - $${p.price}`}
        image={(p) => p.image}
        actions={(p) => <button>Add to Cart</button>}
      />
    </div>
  );
}
```

## 5. Generic Modal Component

```typescript
interface ModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  data: T | null;
  renderContent: (data: T) => React.ReactNode;
  title?: (data: T) => string;
}

function Modal<T>({
  isOpen,
  onClose,
  data,
  renderContent,
  title,
}: ModalProps<T>) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {title && (
            <h2 className="text-2xl font-bold mb-4">{title(data)}</h2>
          )}
          {renderContent(data)}
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Usage
interface UserDetails {
  id: number;
  name: string;
  email: string;
  bio: string;
  joinedAt: string;
}

function UserList() {
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (user: UserDetails) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  return (
    <>
      {/* User list */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={selectedUser}
        title={(user) => user.name}
        renderContent={(user) => (
          <div className="space-y-2">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Bio:</strong> {user.bio}</p>
            <p><strong>Joined:</strong> {user.joinedAt}</p>
          </div>
        )}
      />
    </>
  );
}
```

## 6. Advanced Generic Patterns

### Generic Form with Validation

```typescript
type Validator<T> = (value: T) => string | null;

interface FieldConfig<T, K extends keyof T> {
  name: K;
  label: string;
  type?: string;
  validators?: Validator<T[K]>[];
}

interface GenericFormProps<T> {
  initialValues: T;
  fields: FieldConfig<T, keyof T>[];
  onSubmit: (values: T) => void | Promise<void>;
}

function GenericForm<T extends Record<string, any>>({
  initialValues,
  fields,
  onSubmit,
}: GenericFormProps<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = <K extends keyof T>(
    fieldName: K,
    value: T[K]
  ): string | null => {
    const field = fields.find((f) => f.name === fieldName);
    if (!field?.validators) return null;

    for (const validator of field.validators) {
      const error = validator(value);
      if (error) return error;
    }
    return null;
  };

  const handleChange = <K extends keyof T>(name: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error || undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Partial<Record<keyof T, string>> = {};
    let hasErrors = false;

    for (const field of fields) {
      const error = validateField(field.name, values[field.name]);
      if (error) {
        newErrors[field.name] = error;
        hasErrors = true;
      }
    }

    setErrors(newErrors);

    if (!hasErrors) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={String(field.name)} className="space-y-2">
          <label className="text-sm font-medium">{field.label}</label>
          <input
            type={field.type || 'text'}
            value={String(values[field.name])}
            onChange={(e) => handleChange(field.name, e.target.value as T[typeof field.name])}
            className="w-full p-2 border rounded"
          />
          {errors[field.name] && (
            <p className="text-sm text-red-600">{errors[field.name]}</p>
          )}
        </div>
      ))}
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-primary text-primary-foreground rounded"
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}

// Usage
interface LoginForm {
  email: string;
  password: string;
}

const emailValidator: Validator<string> = (value) => {
  if (!value) return 'Email is required';
  if (!/\S+@\S+\.\S+/.test(value)) return 'Invalid email';
  return null;
};

const passwordValidator: Validator<string> = (value) => {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  return null;
};

function LoginPage() {
  const handleSubmit = async (values: LoginForm) => {
    console.log('Login:', values);
  };

  return (
    <GenericForm
      initialValues={{ email: '', password: '' }}
      fields={[
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          validators: [emailValidator],
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          validators: [passwordValidator],
        },
      ]}
      onSubmit={handleSubmit}
    />
  );
}
```

## Best Practices

### ✅ Do's

- Use generics to create truly reusable components
- Add type constraints with `extends` when necessary
- Provide default types for optional generic parameters
- Use descriptive generic names (not just `T`)
- Leverage TypeScript's type inference
- Create helper types for complex generic patterns
- Use generic constraints to enforce shape requirements
- Document generic parameters in JSDoc comments

### ❌ Don'ts

- Don't make everything generic - only when needed
- Don't use generics for simple, specific components
- Don't forget to handle edge cases (null, undefined)
- Don't over-constrain generics unnecessarily
- Don't use `any` inside generic components
- Don't create overly complex generic signatures
- Don't forget about performance with large generic types
- Don't sacrifice readability for type safety

## Common Generic Patterns

| Pattern | Use Case |
|---------|----------|
| **`<T>`** | Single generic type |
| **`<T extends U>`** | Constrained generic |
| **`<T = DefaultType>`** | Generic with default |
| **`<T, K extends keyof T>`** | Key of generic object |
| **`<T extends Record<string, any>>`** | Generic object constraint |
| **`<T extends React.ElementType>`** | Polymorphic components |
| **`<T extends (...args: any[]) => any>`** | Generic function type |

## Next Steps

- **[Event Handlers](./03_event_handlers.md)** - Type-safe event handling
- **[Utility Types](./04_utility_types.md)** - TypeScript utility types for React
- **[Component Design](../07_clean_code/01_component_design.md)** - Component architecture
- **[Testing](../07_clean_code/04_testing.md)** - Test generic components
