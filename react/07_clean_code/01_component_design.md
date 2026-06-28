# Component Design Principles

Learn how to design React components that are maintainable, reusable, and follow clean code principles.

## What You'll Learn

- Single Responsibility Principle
- Component composition
- Prop design
- State management patterns
- Performance considerations
- Testing-friendly components

## Single Responsibility Principle

Each component should do one thing well.

### ❌ Bad: Component doing too much

```typescript
// UserDashboard.tsx - Doing everything!
function UserDashboard() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Fetch user
    fetch('/api/user').then(res => res.json()).then(setUser);
    // Fetch posts
    fetch('/api/posts').then(res => res.json()).then(setPosts);
    // Fetch comments
    fetch('/api/comments').then(res => res.json()).then(setComments);
    // Setup notifications
    const ws = new WebSocket('/ws');
    ws.onmessage = (e) => setNotifications(prev => [...prev, e.data]);
  }, []);

  return (
    <div className={theme}>
      <header>
        <h1>{user?.name}</h1>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
          Toggle Theme
        </button>
      </header>
      <div>
        {notifications.map(n => <div key={n.id}>{n.message}</div>)}
      </div>
      <section>
        <h2>Posts</h2>
        {posts.map(post => (
          <article key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.body}</p>
          </article>
        ))}
      </section>
      <section>
        <h2>Comments</h2>
        {comments.map(comment => (
          <div key={comment.id}>{comment.text}</div>
        ))}
      </section>
    </div>
  );
}
```

### ✅ Good: Separated concerns

```typescript
// hooks/useUser.ts
export function useUser() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
  });
  return { user: data, isLoading, error };
}

// hooks/usePosts.ts
export function usePosts() {
  const { data, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });
  return { posts: data ?? [], isLoading };
}

// components/UserHeader.tsx
interface UserHeaderProps {
  userName: string;
}

export const UserHeader: React.FC<UserHeaderProps> = ({ userName }) => {
  return (
    <header>
      <h1>{userName}</h1>
      <ThemeToggle />
    </header>
  );
};

// components/PostList.tsx
interface PostListProps {
  posts: Post[];
}

export const PostList: React.FC<PostListProps> = ({ posts }) => {
  if (posts.length === 0) {
    return <EmptyState message="No posts yet" />;
  }

  return (
    <section>
      <h2>Posts</h2>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </section>
  );
};

// components/UserDashboard.tsx
export function UserDashboard() {
  const { user, isLoading: userLoading } = useUser();
  const { posts, isLoading: postsLoading } = usePosts();

  if (userLoading) return <LoadingSpinner />;
  if (!user) return <ErrorMessage message="User not found" />;

  return (
    <div>
      <UserHeader userName={user.name} />
      <NotificationBar />
      {postsLoading ? <LoadingSpinner /> : <PostList posts={posts} />}
      <CommentSection />
    </div>
  );
}
```

## Component Size and Complexity

### Keep Components Small

```typescript
// ❌ Bad: 300+ lines component
function ProductPage() {
  // Tons of state and logic
  // Complex JSX
  // Multiple nested components
  // Hard to test and maintain
}

// ✅ Good: Small, focused components
function ProductPage() {
  const { product } = useProduct();
  
  return (
    <div>
      <ProductHeader product={product} />
      <ProductImages images={product.images} />
      <ProductDetails details={product.details} />
      <ProductReviews productId={product.id} />
      <RelatedProducts category={product.category} />
    </div>
  );
}
```

### Extract Complex Logic

```typescript
// ❌ Bad: Complex logic in component
function ShoppingCart() {
  const [items, setItems] = useState([]);
  
  const total = items.reduce((sum, item) => {
    const price = item.onSale 
      ? item.price * (1 - item.discount / 100)
      : item.price;
    return sum + (price * item.quantity);
  }, 0);

  const tax = total * 0.08;
  const shipping = total > 50 ? 0 : 5.99;
  const finalTotal = total + tax + shipping;

  // More logic...
}

// ✅ Good: Extract to hooks
function ShoppingCart() {
  const { items, addItem, removeItem } = useCart();
  const { total, tax, shipping, finalTotal } = useCartCalculations(items);
  
  return (
    <div>
      <CartItems items={items} onRemove={removeItem} />
      <CartSummary
        subtotal={total}
        tax={tax}
        shipping={shipping}
        total={finalTotal}
      />
    </div>
  );
}

// hooks/useCartCalculations.ts
export function useCartCalculations(items: CartItem[]) {
  return useMemo(() => {
    const total = calculateTotal(items);
    const tax = calculateTax(total);
    const shipping = calculateShipping(total);
    
    return {
      total,
      tax,
      shipping,
      finalTotal: total + tax + shipping,
    };
  }, [items]);
}
```

## Prop Design

### Flat, Specific Props

```typescript
// ❌ Bad: Passing entire objects
interface UserCardProps {
  user: User; // User has 20+ fields
}

function UserCard({ user }: UserCardProps) {
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

// ✅ Good: Only pass what's needed
interface UserCardProps {
  name: string;
  email: string;
}

function UserCard({ name, email }: UserCardProps) {
  return (
    <div>
      <h2>{name}</h2>
      <p>{email}</p>
    </div>
  );
}
```

### Boolean Props vs Variants

```typescript
// ❌ Bad: Multiple boolean flags
<Button primary large disabled rounded />

// ✅ Good: Use variants
<Button 
  variant="primary" 
  size="large" 
  disabled 
  rounded
/>

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  rounded?: boolean;
}
```

### Avoid Prop Drilling

```typescript
// ❌ Bad: Prop drilling
function App() {
  const user = useUser();
  return <Dashboard user={user} />;
}

function Dashboard({ user }) {
  return <Sidebar user={user} />;
}

function Sidebar({ user }) {
  return <UserMenu user={user} />;
}

function UserMenu({ user }) {
  return <div>{user.name}</div>;
}

// ✅ Good: Use Context or state management
const UserContext = createContext();

function App() {
  const user = useUser();
  return (
    <UserContext.Provider value={user}>
      <Dashboard />
    </UserContext.Provider>
  );
}

function UserMenu() {
  const user = useContext(UserContext);
  return <div>{user.name}</div>;
}
```

## Composition Over Configuration

```typescript
// ❌ Bad: Lots of configuration props
interface ModalProps {
  showCloseButton?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  headerText?: string;
  footerButtons?: ButtonConfig[];
  // 20+ more props...
}

// ✅ Good: Composition
interface ModalProps {
  children: React.ReactNode;
  onClose?: () => void;
}

function Modal({ children, onClose }: ModalProps) {
  return (
    <div className="modal">
      {children}
    </div>
  );
}

// Compound components
Modal.Header = ({ children }) => <div className="modal-header">{children}</div>;
Modal.Body = ({ children }) => <div className="modal-body">{children}</div>;
Modal.Footer = ({ children }) => <div className="modal-footer">{children}</div>;

// Usage - Much more flexible!
<Modal onClose={closeModal}>
  <Modal.Header>
    <h2>Confirm Delete</h2>
  </Modal.Header>
  <Modal.Body>
    <p>Are you sure?</p>
  </Modal.Body>
  <Modal.Footer>
    <Button onClick={closeModal}>Cancel</Button>
    <Button onClick={handleDelete} variant="destructive">Delete</Button>
  </Modal.Footer>
</Modal>
```

## Conditional Rendering Patterns

```typescript
// ❌ Bad: Nested ternaries
function Component({ status }) {
  return (
    <div>
      {status === 'loading' ? (
        <Spinner />
      ) : status === 'error' ? (
        <Error />
      ) : status === 'empty' ? (
        <Empty />
      ) : (
        <Content />
      )}
    </div>
  );
}

// ✅ Good: Early returns
function Component({ status }) {
  if (status === 'loading') return <Spinner />;
  if (status === 'error') return <Error />;
  if (status === 'empty') return <Empty />;
  return <Content />;
}

// ✅ Good: Object mapping
const statusComponents = {
  loading: Spinner,
  error: Error,
  empty: Empty,
  success: Content,
};

function Component({ status }) {
  const StatusComponent = statusComponents[status];
  return <StatusComponent />;
}
```

## State Management

### Co-locate State

```typescript
// ❌ Bad: State in parent when not needed
function ParentComponent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  return (
    <LoginForm
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      rememberMe={rememberMe}
      setRememberMe={setRememberMe}
    />
  );
}

// ✅ Good: State in component that uses it
function ParentComponent() {
  return <LoginForm onSubmit={handleLogin} />;
}

function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ email, password, rememberMe });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Derived State

```typescript
// ❌ Bad: Duplicating state
function ProductList({ products }) {
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    setFilteredProducts(
      products.filter(p => p.name.includes(searchQuery))
    );
  }, [products, searchQuery]);
  
  // ... render
}

// ✅ Good: Derive state
function ProductList({ products }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredProducts = useMemo(
    () => products.filter(p => p.name.includes(searchQuery)),
    [products, searchQuery]
  );
  
  // ... render
}
```

## Error Boundaries

```typescript
// ErrorBoundary.tsx
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div>
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<ErrorMessage />}>
  <YourComponent />
</ErrorBoundary>
```

## Loading and Empty States

```typescript
interface DataListProps<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  renderItem: (item: T) => React.ReactNode;
  emptyMessage?: string;
}

export function DataList<T>({
  data,
  isLoading,
  error,
  renderItem,
  emptyMessage = 'No items found'
}: DataListProps<T>) {
  if (isLoading) return <LoadingSpinner />;
  
  if (error) {
    return <ErrorMessage message={error.message} />;
  }
  
  if (data.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }
  
  return (
    <ul>
      {data.map((item, index) => (
        <li key={index}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}
```

## Best Practices Summary

1. **Single Responsibility**: One component, one job
2. **Small Components**: Aim for < 200 lines
3. **Composition**: Build complex UIs from simple parts
4. **Specific Props**: Pass only what's needed
5. **Co-locate State**: Keep state close to where it's used
6. **Extract Logic**: Move complex logic to hooks
7. **Handle All States**: Loading, error, empty, success
8. **Type Everything**: Use TypeScript properly
9. **Test-Friendly**: Design for testability
10. **Performance**: Memoize when needed

## Anti-Patterns to Avoid

```typescript
// ❌ Don't modify props
function Bad({ items }) {
  items.push(newItem); // Never!
}

// ❌ Don't use indexes as keys
{items.map((item, index) => <div key={index}>{item}</div>)}

// ❌ Don't call hooks conditionally
if (condition) {
  useState(); // Wrong!
}

// ❌ Don't forget cleanup
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  // Missing cleanup!
}, []);

// ❌ Don't use inline object/array literals in props
<Component style={{ margin: 10 }} /> // Creates new object each render
```

## Next Steps

- [File and Folder Organization](./02_organization.md)
- [Error Handling Patterns](./03_error_handling.md)
- [Testing React Components](./04_testing.md)

## Summary

Clean component design means:
- ✅ Single responsibility per component
- ✅ Small, focused components
- ✅ Composition over configuration
- ✅ Proper state management
- ✅ Handling all UI states
- ✅ Type-safe props
