# Generic Components and Higher-Order Components

## What You'll Learn

- How to build generic React components that work with any data type
- Creating a type-safe generic `<List>` and `<DataTable>` component
- Typed Higher-Order Components (withAuth, withLoading)
- The render props pattern with TypeScript
- Building a generic `<Select>` / dropdown component
- The compound component pattern with full type safety

---

## Why Generic Components?

In JavaScript, you might write a `<List>` component that accepts `items` as `any[]` and a `renderItem` callback. It works, but nothing prevents you from returning the wrong shape from `renderItem` or passing mismatched data. Generic components solve this completely.

```tsx
// Without generics: items and renderItem are disconnected
interface UntypedListProps {
  items: any[];
  renderItem: (item: any) => ReactNode;
}

// With generics: T links items and renderItem together
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
}
```

> **Coming from JS:** Generics are the biggest conceptual leap from JavaScript to TypeScript in React. Think of `<T>` as a placeholder that gets filled in when the component is used. It is not a value -- it is a type variable that creates a contract between props.

---

## Generic List Component

```tsx
import { ReactNode } from "react";

interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  className?: string;
}

// Note: you cannot use React.FC with generics. Use a plain function.
function List<T>({
  items,
  renderItem,
  keyExtractor,
  emptyMessage = "No items to display",
  className,
}: ListProps<T>) {
  if (items.length === 0) {
    return <p className="list-empty">{emptyMessage}</p>;
  }

  return (
    <ul className={className}>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

// Usage with different types -- T is inferred from `items`

interface User {
  id: string;
  name: string;
  email: string;
}

interface Product {
  sku: string;
  title: string;
  price: number;
}

function App() {
  const users: User[] = [
    { id: "1", name: "Alice", email: "alice@example.com" },
    { id: "2", name: "Bob", email: "bob@example.com" },
  ];

  const products: Product[] = [
    { sku: "A100", title: "Keyboard", price: 79.99 },
    { sku: "B200", title: "Mouse", price: 49.99 },
  ];

  return (
    <div>
      {/* T is inferred as User */}
      <List
        items={users}
        keyExtractor={(user) => user.id}
        renderItem={(user) => (
          <span>{user.name} ({user.email})</span>
          // TypeScript knows `user` is User here
        )}
      />

      {/* T is inferred as Product */}
      <List
        items={products}
        keyExtractor={(product) => product.sku}
        renderItem={(product) => (
          <span>{product.title} - ${product.price.toFixed(2)}</span>
          // TypeScript knows `product` is Product here
        )}
      />
    </div>
  );
}
```

---

## Generic DataTable Component

A more complex example: a type-safe table where columns are tied to the data shape.

```tsx
import { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (columnKey: string) => void;
  isLoading?: boolean;
}

function DataTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  isLoading = false,
}: DataTableProps<T>) {
  if (isLoading) {
    return <div className="table-loading">Loading...</div>;
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              style={{ width: col.width }}
              onClick={() => col.sortable && onSort?.(col.key)}
              className={col.sortable ? "sortable" : ""}
            >
              {col.header}
              {sortColumn === col.key && (
                <span>{sortDirection === "asc" ? " ▲" : " ▼"}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            className={onRowClick ? "clickable" : ""}
          >
            {columns.map((col) => (
              <td key={col.key}>{col.render(item)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Usage

interface Employee {
  id: string;
  name: string;
  department: string;
  salary: number;
  startDate: Date;
}

function EmployeeTable({ employees }: { employees: Employee[] }) {
  // Column<Employee> -- every render function receives an Employee
  const columns: Column<Employee>[] = [
    {
      key: "name",
      header: "Name",
      render: (emp) => <strong>{emp.name}</strong>,
      sortable: true,
    },
    {
      key: "department",
      header: "Department",
      render: (emp) => emp.department,
      sortable: true,
    },
    {
      key: "salary",
      header: "Salary",
      render: (emp) => `$${emp.salary.toLocaleString()}`,
      sortable: true,
      width: "150px",
    },
    {
      key: "startDate",
      header: "Start Date",
      render: (emp) => emp.startDate.toLocaleDateString(),
      sortable: true,
    },
  ];

  return (
    <DataTable
      data={employees}
      columns={columns}
      keyExtractor={(emp) => emp.id}
      onRowClick={(emp) => console.log("Clicked:", emp.name)}
    />
  );
}
```

> **Coming from JS:** In JavaScript, you would define columns with string accessors like `{ key: "name", accessor: "name" }` and hope the accessor matches a real field. With generics, the `render` function receives a fully typed `T`, so you get autocomplete for every field and compile errors for typos.

---

## Generic Select / Dropdown Component

```tsx
interface SelectOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SelectProps<T> {
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  placeholder?: string;
  getOptionKey: (value: T) => string;
  disabled?: boolean;
  className?: string;
}

function Select<T>({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  getOptionKey,
  disabled = false,
  className,
}: SelectProps<T>) {
  const selectedKey = value !== null ? getOptionKey(value) : "";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOption = options.find(
      (opt) => getOptionKey(opt.value) === e.target.value
    );
    if (selectedOption) {
      onChange(selectedOption.value);
    }
  };

  return (
    <select
      value={selectedKey}
      onChange={handleChange}
      disabled={disabled}
      className={className}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((option) => (
        <option
          key={getOptionKey(option.value)}
          value={getOptionKey(option.value)}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}

// Usage with a complex type
interface Country {
  code: string;
  name: string;
  region: string;
}

function CountryPicker() {
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  const countries: SelectOption<Country>[] = [
    { value: { code: "US", name: "United States", region: "NA" }, label: "United States" },
    { value: { code: "GB", name: "United Kingdom", region: "EU" }, label: "United Kingdom" },
    { value: { code: "JP", name: "Japan", region: "AS" }, label: "Japan" },
  ];

  return (
    <Select
      options={countries}
      value={selectedCountry}
      onChange={setSelectedCountry}  // receives Country, not string
      getOptionKey={(country) => country.code}
      placeholder="Choose a country..."
    />
  );
}
```

---

## Typed Higher-Order Components

HOCs are less common in modern React (hooks have largely replaced them), but you will still encounter them in existing codebases. Typing them correctly is important.

### withLoading HOC

```tsx
import { ComponentType } from "react";

interface WithLoadingProps {
  isLoading: boolean;
}

// The HOC takes a component that expects props P,
// and returns a component that expects P & WithLoadingProps
function withLoading<P extends object>(
  WrappedComponent: ComponentType<P>
): ComponentType<P & WithLoadingProps> {
  function WithLoadingComponent({ isLoading, ...rest }: P & WithLoadingProps) {
    if (isLoading) {
      return <div className="spinner">Loading...</div>;
    }
    // Cast needed because TS can't infer that `rest` is exactly P
    return <WrappedComponent {...(rest as P)} />;
  }

  WithLoadingComponent.displayName = `withLoading(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return WithLoadingComponent;
}

// Usage
interface UserProfileProps {
  user: User;
  showEmail: boolean;
}

function UserProfile({ user, showEmail }: UserProfileProps) {
  return (
    <div>
      <h2>{user.name}</h2>
      {showEmail && <p>{user.email}</p>}
    </div>
  );
}

const UserProfileWithLoading = withLoading(UserProfile);

// The enhanced component requires UserProfileProps + WithLoadingProps
<UserProfileWithLoading user={user} showEmail={true} isLoading={false} />
```

### withAuth HOC

```tsx
interface WithAuthProps {
  minRole?: "viewer" | "editor" | "admin";
}

function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  fallback: ReactNode = <p>Access denied</p>
): ComponentType<P & WithAuthProps> {
  function WithAuthComponent({ minRole = "viewer", ...rest }: P & WithAuthProps) {
    const { state } = useAuth();

    if (!state.user) {
      return <Navigate to="/login" />;
    }

    const roleHierarchy: Record<string, number> = {
      viewer: 1,
      editor: 2,
      admin: 3,
    };

    if (roleHierarchy[state.user.role] < roleHierarchy[minRole]) {
      return <>{fallback}</>;
    }

    return <WrappedComponent {...(rest as P)} />;
  }

  WithAuthComponent.displayName = `withAuth(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return WithAuthComponent;
}

// Usage
const ProtectedDashboard = withAuth(Dashboard);
const AdminPanel = withAuth(AdminSettings, <p>Admin access required</p>);

<ProtectedDashboard />
<AdminPanel minRole="admin" />
```

> **Coming from JS:** HOCs in JavaScript are notoriously hard to type correctly, which is one reason hooks replaced them. If you are writing new code, prefer custom hooks. If you are maintaining a codebase with HOCs, these patterns will help you add types incrementally.

---

## Render Props Pattern with TypeScript

The render props pattern passes a function as a prop (or as `children`) that receives data and returns JSX.

```tsx
interface MousePosition {
  x: number;
  y: number;
}

interface MouseTrackerProps {
  children: (position: MousePosition) => ReactNode;
}

function MouseTracker({ children }: MouseTrackerProps) {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div onMouseMove={handleMouseMove} style={{ height: "100vh" }}>
      {children(position)}
    </div>
  );
}

// Usage - `pos` is typed as MousePosition
<MouseTracker>
  {(pos) => (
    <p>
      Mouse is at ({pos.x}, {pos.y})
    </p>
  )}
</MouseTracker>
```

### Generic Render Props

```tsx
interface FetchRenderProps<T> {
  url: string;
  children: (state: {
    data: T | null;
    error: Error | null;
    isLoading: boolean;
    refetch: () => void;
  }) => ReactNode;
}

function Fetch<T>({ url, children }: FetchRenderProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(url);
      const json = (await res.json()) as T;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Fetch failed"));
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return <>{children({ data, error, isLoading, refetch: fetchData })}</>;
}

// Usage
interface Post {
  id: number;
  title: string;
}

<Fetch<Post[]> url="/api/posts">
  {({ data, error, isLoading, refetch }) => {
    if (isLoading) return <p>Loading...</p>;
    if (error) return <button onClick={refetch}>Retry</button>;
    return (
      <ul>
        {data?.map((post) => <li key={post.id}>{post.title}</li>)}
      </ul>
    );
  }}
</Fetch>
```

---

## Compound Component Pattern

Compound components share implicit state through context. Think of `<select>` and `<option>`, or a `<Tabs>` component with `<Tab>` and `<TabPanel>`.

```tsx
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  Children,
  isValidElement,
} from "react";

// --- Tabs Context ---

interface TabsContextType {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

function useTabsContext(): TabsContextType {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs compound components must be used within <Tabs>");
  }
  return context;
}

// --- Tabs Root ---

interface TabsProps {
  defaultTab: string;
  children: ReactNode;
  onChange?: (tabId: string) => void;
}

function Tabs({ defaultTab, children, onChange }: TabsProps) {
  const [activeTab, setActiveTabState] = useState(defaultTab);

  const setActiveTab = (id: string) => {
    setActiveTabState(id);
    onChange?.(id);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// --- TabList ---

function TabList({ children }: { children: ReactNode }) {
  return (
    <div className="tab-list" role="tablist">
      {children}
    </div>
  );
}

// --- Tab ---

interface TabProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}

function Tab({ id, children, disabled = false }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      className={`tab ${isActive ? "tab-active" : ""}`}
      onClick={() => !disabled && setActiveTab(id)}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// --- TabPanel ---

interface TabPanelProps {
  id: string;
  children: ReactNode;
}

function TabPanel({ id, children }: TabPanelProps) {
  const { activeTab } = useTabsContext();

  if (activeTab !== id) return null;

  return (
    <div role="tabpanel" className="tab-panel">
      {children}
    </div>
  );
}

// --- Attach sub-components to Tabs for dot notation ---

Tabs.TabList = TabList;
Tabs.Tab = Tab;
Tabs.TabPanel = TabPanel;

// Usage
function SettingsPage() {
  return (
    <Tabs defaultTab="general" onChange={(tab) => console.log("Switched to", tab)}>
      <Tabs.TabList>
        <Tabs.Tab id="general">General</Tabs.Tab>
        <Tabs.Tab id="security">Security</Tabs.Tab>
        <Tabs.Tab id="billing">Billing</Tabs.Tab>
        <Tabs.Tab id="advanced" disabled>Advanced</Tabs.Tab>
      </Tabs.TabList>

      <Tabs.TabPanel id="general">
        <h2>General Settings</h2>
        <p>Manage your profile and preferences.</p>
      </Tabs.TabPanel>

      <Tabs.TabPanel id="security">
        <h2>Security Settings</h2>
        <p>Update your password and 2FA settings.</p>
      </Tabs.TabPanel>

      <Tabs.TabPanel id="billing">
        <h2>Billing</h2>
        <p>Manage your subscription and payment methods.</p>
      </Tabs.TabPanel>
    </Tabs>
  );
}
```

To make the dot-notation typing work cleanly, you can declare the compound type explicitly:

```tsx
interface TabsComponent {
  (props: TabsProps): JSX.Element;
  TabList: typeof TabList;
  Tab: typeof Tab;
  TabPanel: typeof TabPanel;
}

const Tabs = (({ defaultTab, children, onChange }: TabsProps) => {
  // ... same implementation
}) as TabsComponent;

Tabs.TabList = TabList;
Tabs.Tab = Tab;
Tabs.TabPanel = TabPanel;
```

> **Coming from JS:** The compound component pattern works identically in JS, but TypeScript adds the guarantee that `<Tabs.Tab>` can only be used inside a `<Tabs>` parent (enforced at runtime by the context throw, but documented at the type level). The dot-notation typing takes extra effort but gives consumers full autocomplete.

---

## Mini-Exercise

Build a generic `<Accordion>` compound component with the following:

1. `<Accordion>` -- root component that manages which panels are open. Accept a `multiple` boolean prop: when `true`, multiple panels can be open simultaneously; when `false`, opening one panel closes the others.

2. `<Accordion.Item>` -- wraps a single collapsible section. Requires an `id` string prop.

3. `<Accordion.Header>` -- the clickable header that toggles its parent `Item`. Accepts `children: ReactNode`.

4. `<Accordion.Content>` -- the collapsible content. Only renders when its parent `Item` is open.

5. Use context to share state between the compound components. Make sure all context access is typed and includes the "must be used within" error pattern.

6. Bonus: make the `Accordion.Item` accept a `disabled` boolean that prevents toggling.

Focus on getting the generic typing and context plumbing right. The animation and styling are not important.
