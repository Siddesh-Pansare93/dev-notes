# Server vs Client Components

## What You'll Learn
- Fundamental differences between Server and Client Components
- When to use each component type
- How they work together
- Data flow and boundaries
- Best practices and patterns

## Table of Contents
1. [Introduction](#introduction)
2. [Server Components Explained](#server-components-explained)
3. [Client Components Explained](#client-components-explained)
4. [Key Differences](#key-differences)
5. [Component Boundaries](#component-boundaries)
6. [Data Flow Patterns](#data-flow-patterns)
7. [Decision Framework](#decision-framework)
8. [Best Practices](#best-practices)
9. [Real-World Examples](#real-world-examples)
10. [Practice Exercises](#practice-exercises)

---

## Introduction

React 19 introduces **Server Components**, a new paradigm that lets you render components on the server, separate from your client bundle.

### Why Server Components?

**Problems with traditional React:**
- Large JavaScript bundles
- All components sent to client
- Data fetching causes waterfalls
- No direct database access from components

**Server Components solve this by:**
- ✅ Reducing bundle size (server code stays on server)
- ✅ Direct backend access (databases, file systems)
- ✅ Better performance (less client JavaScript)
- ✅ Improved security (API keys stay on server)
- ✅ Streaming HTML (faster initial load)

---

## Server Components Explained

### What Are Server Components?

Components that **run only on the server** during the build or on each request. They:

- Have access to server-only resources (databases, file systems)
- Can be `async` and use `await`
- Don't ship JavaScript to the client
- Can't use browser APIs or hooks like `useState`, `useEffect`
- Render to a special format that React understands

### Basic Example

```typescript
// app/page.tsx - Server Component (default)
import { db } from '@/lib/database';

// ✅ Can be async!
export default async function BlogPage() {
  // ✅ Direct database access
  const posts = await db.posts.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return (
    <div>
      <h1>Blog Posts</h1>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  );
}
```

**Key characteristics:**
- No `'use client'` directive needed (default)
- Can be `async` functions
- Access backend resources directly
- Zero JavaScript sent to client

### What Server Components CAN Do

```typescript
import { db } from '@/lib/database';
import { readFile } from 'fs/promises';
import { cookies, headers } from 'next/headers';

async function ServerComponent() {
  // ✅ Read from database
  const users = await db.users.findMany();

  // ✅ Read files from filesystem
  const config = await readFile('config.json', 'utf-8');

  // ✅ Access request headers
  const headersList = headers();
  const userAgent = headersList.get('user-agent');

  // ✅ Read cookies
  const cookieStore = cookies();
  const theme = cookieStore.get('theme');

  // ✅ Call backend APIs directly
  const data = await fetch('http://internal-api:3000/data', {
    headers: { 'X-API-KEY': process.env.SECRET_KEY }
  });

  // ✅ Use environment variables securely
  const apiKey = process.env.PRIVATE_API_KEY;

  return <div>Server-rendered content</div>;
}
```

### What Server Components CANNOT Do

```typescript
// ❌ Server Components cannot:

// 1. Use state hooks
function ServerComponent() {
  const [count, setCount] = useState(0); // ❌ Error!
}

// 2. Use effect hooks
function ServerComponent() {
  useEffect(() => {}, []); // ❌ Error!
}

// 3. Use browser APIs
function ServerComponent() {
  const width = window.innerWidth; // ❌ Error!
  localStorage.setItem('key', 'value'); // ❌ Error!
}

// 4. Use event handlers
function ServerComponent() {
  return <button onClick={() => {}}> // ❌ Error!
    Click me
  </button>;
}

// 5. Use Context Providers (but can read Context)
function ServerComponent() {
  return (
    <ThemeContext.Provider value="dark"> // ❌ Error!
      {children}
    </ThemeContext.Provider>
  );
}
```

---

## Client Components Explained

### What Are Client Components?

Components that **run on the client** (browser). They:

- Can use all React hooks (`useState`, `useEffect`, etc.)
- Can use browser APIs
- Can handle user interactions
- Must be marked with `'use client'` directive
- Are included in the JavaScript bundle

### Basic Example

```typescript
// components/Counter.tsx - Client Component
'use client'; // ← Must have this directive

import { useState } from 'react';

export default function Counter() {
  // ✅ Can use state
  const [count, setCount] = useState(0);

  // ✅ Can handle events
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

### What Client Components CAN Do

```typescript
'use client';

import { useState, useEffect, useContext } from 'react';

function ClientComponent() {
  // ✅ Use all React hooks
  const [state, setState] = useState(0);
  const context = useContext(MyContext);

  useEffect(() => {
    // ✅ Access browser APIs
    const width = window.innerWidth;
    
    // ✅ Access localStorage
    localStorage.setItem('key', 'value');

    // ✅ Add event listeners
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ✅ Handle user events
  const handleClick = () => {
    // ✅ Browser-only operations
    navigator.clipboard.writeText('Hello');
  };

  // ✅ Render interactive UI
  return (
    <button onClick={handleClick}>
      Click me
    </button>
  );
}
```

### What Client Components CANNOT Do

```typescript
'use client';

// ❌ Client Components cannot:

// 1. Be async
async function ClientComponent() { // ❌ Error!
  const data = await fetch('/api/data');
}

// 2. Directly access server-only resources
function ClientComponent() {
  const posts = await db.posts.findMany(); // ❌ Error!
}

// 3. Use server-only modules
import { db } from '@/lib/database'; // ❌ Error!

// 4. Access environment variables directly (unless prefixed with NEXT_PUBLIC_)
function ClientComponent() {
  const apiKey = process.env.SECRET_KEY; // ❌ Undefined or error
}
```

---

## Key Differences

### Comparison Table

| Feature | Server Component | Client Component |
|---------|-----------------|------------------|
| **Directive** | None (default) | `'use client'` |
| **Async/Await** | ✅ Yes | ❌ No |
| **React Hooks** | ❌ No | ✅ Yes |
| **Event Handlers** | ❌ No | ✅ Yes |
| **Browser APIs** | ❌ No | ✅ Yes |
| **Database Access** | ✅ Yes | ❌ No |
| **File System** | ✅ Yes | ❌ No |
| **JavaScript to Client** | ❌ No | ✅ Yes |
| **Re-renders** | On navigation/refresh | On state/prop changes |
| **Bundle Size** | Zero | Counted in bundle |

### Rendering Lifecycle

**Server Component:**
```
Request → Server renders → Send HTML → Client displays
         ↑                                   ↓
         └───────── (no re-render) ──────────┘
```

**Client Component:**
```
Request → Server sends JS → Client hydrates → Interactive
                                   ↓
                            Can re-render on state change
```

### Example: Side-by-Side

```typescript
// ============================================
// SERVER COMPONENT (default)
// ============================================
// app/blog/page.tsx
import { db } from '@/lib/database';
import CommentForm from './CommentForm'; // Client component

export default async function BlogPost({ params }: Props) {
  // Runs on server, can access DB
  const post = await db.posts.findUnique({
    where: { id: params.id },
    include: { comments: true }
  });

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
      
      {/* Server-rendered list */}
      <div>
        {post.comments.map(comment => (
          <Comment key={comment.id} {...comment} />
        ))}
      </div>

      {/* Client component for interactivity */}
      <CommentForm postId={post.id} />
    </article>
  );
}

// ============================================
// CLIENT COMPONENT
// ============================================
// app/blog/CommentForm.tsx
'use client';

import { useState } from 'react';
import { useActionState } from 'react';

export default function CommentForm({ postId }: Props) {
  const [comment, setComment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Client-side form handling
    await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment })
    });
    setComment('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment..."
      />
      <button type="submit">Post Comment</button>
    </form>
  );
}
```

---

## Component Boundaries

### Server-to-Client Boundary

You can **import Client Components into Server Components**:

```typescript
// app/page.tsx (Server Component)
import ClientButton from './ClientButton'; // Client Component

export default async function Page() {
  const data = await fetchData(); // Server-side

  return (
    <div>
      <h1>Server-rendered title</h1>
      {/* ✅ Client Component rendered inside Server Component */}
      <ClientButton label="Click me" />
    </div>
  );
}

// ClientButton.tsx (Client Component)
'use client';

export default function ClientButton({ label }: Props) {
  const [clicked, setClicked] = useState(false);
  
  return (
    <button onClick={() => setClicked(true)}>
      {clicked ? 'Clicked!' : label}
    </button>
  );
}
```

### Client-to-Server Boundary

You **CANNOT import Server Components into Client Components** directly:

```typescript
// ❌ WRONG - Cannot import Server Component into Client Component
'use client';

import ServerComponent from './ServerComponent'; // ❌ Error!

export default function ClientComponent() {
  return <ServerComponent />; // Won't work
}
```

**But you CAN pass Server Components as children:**

```typescript
// ✅ CORRECT - Pass Server Component as children

// app/page.tsx (Server Component)
import ClientLayout from './ClientLayout';
import ServerContent from './ServerContent';

export default function Page() {
  return (
    <ClientLayout>
      {/* ✅ Server Component passed as children */}
      <ServerContent />
    </ClientLayout>
  );
}

// ClientLayout.tsx (Client Component)
'use client';

export default function ClientLayout({ children }: Props) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>
        Toggle
      </button>
      {isOpen && children}
    </div>
  );
}

// ServerContent.tsx (Server Component)
export default async function ServerContent() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

### Props Boundary Rules

**Serializable Props Only:**

```typescript
// ✅ GOOD - Serializable props
<ClientComponent
  id="123"
  count={42}
  active={true}
  items={['a', 'b', 'c']}
  data={{ name: 'John', age: 30 }}
/>

// ❌ BAD - Non-serializable props
<ClientComponent
  onClick={() => {}} // ❌ Functions
  date={new Date()} // ❌ Dates
  map={new Map()} // ❌ Maps/Sets
  element={<div />} // ❌ React elements (unless children)
/>
```

**Workaround for functions:**

```typescript
// ❌ BAD
// page.tsx (Server)
<ClientComponent onSave={async (data) => {
  await db.save(data); // ❌ Can't pass server function
}} />

// ✅ GOOD - Use Server Actions
// page.tsx (Server)
import { saveData } from './actions';

<ClientComponent saveAction={saveData} />

// actions.ts
'use server';

export async function saveData(data: FormData) {
  await db.save(data);
}

// ClientComponent.tsx
'use client';

export default function ClientComponent({ saveAction }: Props) {
  return (
    <form action={saveAction}>
      {/* Form fields */}
    </form>
  );
}
```

---

## Data Flow Patterns

### Pattern 1: Server Component Fetches, Client Component Displays

```typescript
// app/users/page.tsx (Server Component)
async function UsersPage() {
  // Fetch on server
  const users = await db.users.findMany();

  // Pass data to client component
  return <UserList users={users} />;
}

// components/UserList.tsx (Client Component)
'use client';

export default function UserList({ users }: Props) {
  const [filter, setFilter] = useState('');

  const filtered = users.filter(user =>
    user.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter users..."
      />
      <ul>
        {filtered.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Pattern 2: Parallel Data Fetching

```typescript
// app/dashboard/page.tsx (Server Component)
async function DashboardPage() {
  // ✅ Fetch in parallel
  const [stats, notifications, activity] = await Promise.all([
    fetchStats(),
    fetchNotifications(),
    fetchActivity(),
  ]);

  return (
    <div className="dashboard">
      <StatsCards stats={stats} />
      <NotificationList notifications={notifications} />
      <ActivityFeed activity={activity} />
    </div>
  );
}
```

### Pattern 3: Streaming with Suspense

```typescript
// app/products/page.tsx (Server Component)
import { Suspense } from 'react';

export default function ProductsPage() {
  return (
    <div>
      <h1>Products</h1>
      
      {/* Show immediately */}
      <QuickInfo />

      {/* Stream in when ready */}
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductList />
      </Suspense>

      <Suspense fallback={<ReviewsSkeleton />}>
        <ProductReviews />
      </Suspense>
    </div>
  );
}

async function ProductList() {
  // This can take a while
  const products = await fetchAllProducts();
  return <div>{/* Render products */}</div>;
}

async function ProductReviews() {
  // This can also take a while
  const reviews = await fetchReviews();
  return <div>{/* Render reviews */}</div>;
}
```

---

## Decision Framework

### When to Use Server Components

Use Server Components when you need to:

✅ **Fetch data from databases or APIs**
```typescript
async function PostsPage() {
  const posts = await db.posts.findMany();
  return <PostsList posts={posts} />;
}
```

✅ **Access backend resources**
```typescript
async function ConfigPage() {
  const config = await readFile('config.json');
  return <ConfigDisplay config={config} />;
}
```

✅ **Keep sensitive data on server**
```typescript
async function AdminPanel() {
  const apiKey = process.env.SECRET_API_KEY;
  const data = await fetchWithKey(apiKey);
  return <AdminView data={data} />;
}
```

✅ **Reduce client bundle size**
```typescript
// Heavy library stays on server
import { processMarkdown } from 'huge-markdown-lib';

async function Article() {
  const html = await processMarkdown(content);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

### When to Use Client Components

Use Client Components when you need to:

✅ **Handle user interactions**
```typescript
'use client';

function SearchBar() {
  const [query, setQuery] = useState('');
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

✅ **Use React hooks**
```typescript
'use client';

function Timer() {
  const [time, setTime] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return <div>Time: {time}s</div>;
}
```

✅ **Access browser APIs**
```typescript
'use client';

function GeolocationButton() {
  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => console.log(pos)
    );
  };

  return <button onClick={getLocation}>Get Location</button>;
}
```

✅ **Use Context providers**
```typescript
'use client';

function ThemeProvider({ children }: Props) {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### Decision Tree

```
Do you need interactivity?
├─ Yes
│  ├─ Event handlers? → Client Component
│  ├─ useState/useEffect? → Client Component
│  └─ Browser APIs? → Client Component
│
└─ No
   ├─ Data fetching? → Server Component
   ├─ Database access? → Server Component
   └─ Just rendering? → Server Component (default)
```

---

## Best Practices

### 1. **Keep Client Components Small and Leaf-Level**

```typescript
// ❌ BAD - Entire page is client component
'use client';

export default async function Page() { // Can't even be async!
  const [state, setState] = useState();
  
  return (
    <div>
      <Header />
      <Content />
      <Footer />
    </div>
  );
}

// ✅ GOOD - Only interactive parts are client components
// page.tsx (Server Component)
export default async function Page() {
  const data = await fetchData();

  return (
    <div>
      <Header /> {/* Server Component */}
      <InteractiveContent data={data} /> {/* Client Component */}
      <Footer /> {/* Server Component */}
    </div>
  );
}

// InteractiveContent.tsx
'use client';

export default function InteractiveContent({ data }: Props) {
  const [state, setState] = useState();
  // Only this small part is client-side
}
```

### 2. **Move 'use client' Down the Tree**

```typescript
// ❌ BAD - Button makes whole component client-side
'use client';

import { useState } from 'react';

export default function ProductPage({ product }: Props) {
  const [liked, setLiked] = useState(false);

  return (
    <div>
      {/* All of this becomes client-side unnecessarily */}
      <h1>{product.title}</h1>
      <p>{product.description}</p>
      <img src={product.image} />
      <button onClick={() => setLiked(!liked)}>
        {liked ? '❤️' : '🤍'}
      </button>
    </div>
  );
}

// ✅ GOOD - Extract interactive part
// ProductPage.tsx (Server Component)
export default function ProductPage({ product }: Props) {
  return (
    <div>
      {/* All this stays server-rendered */}
      <h1>{product.title}</h1>
      <p>{product.description}</p>
      <img src={product.image} />
      
      {/* Only button is client-side */}
      <LikeButton productId={product.id} />
    </div>
  );
}

// LikeButton.tsx (Client Component)
'use client';

export default function LikeButton({ productId }: Props) {
  const [liked, setLiked] = useState(false);

  return (
    <button onClick={() => setLiked(!liked)}>
      {liked ? '❤️' : '🤍'}
    </button>
  );
}
```

### 3. **Use Server Actions for Mutations**

```typescript
// actions.ts
'use server';

export async function createPost(formData: FormData) {
  const title = formData.get('title');
  const content = formData.get('content');
  
  await db.posts.create({
    data: { title, content }
  });

  revalidatePath('/posts');
}

// PostForm.tsx (Client Component)
'use client';

import { createPost } from './actions';

export default function PostForm() {
  return (
    <form action={createPost}>
      <input name="title" />
      <textarea name="content" />
      <button type="submit">Create Post</button>
    </form>
  );
}
```

### 4. **Share Code Between Server and Client**

```typescript
// lib/utils.ts - Shared utilities (no directive)
export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

export function calculatePrice(item: Item): number {
  return item.price * (1 + item.taxRate);
}

// Can be imported in both Server and Client Components!

// ServerComponent.tsx
import { formatDate } from '@/lib/utils';

export default async function ServerComponent() {
  const posts = await fetchPosts();
  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>
          {formatDate(post.createdAt)}
        </div>
      ))}
    </div>
  );
}

// ClientComponent.tsx
'use client';

import { formatDate } from '@/lib/utils';

export default function ClientComponent({ date }: Props) {
  return <div>{formatDate(date)}</div>;
}
```

---

## Real-World Examples

### Example 1: E-commerce Product Page

```typescript
// app/products/[id]/page.tsx (Server Component)
import { db } from '@/lib/database';
import { Suspense } from 'react';
import AddToCartButton from './AddToCartButton';
import ProductReviews from './ProductReviews';

type Props = {
  params: { id: string };
};

export default async function ProductPage({ params }: Props) {
  // Fetch product data on server
  const product = await db.products.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      images: true,
    }
  });

  if (!product) {
    return <div>Product not found</div>;
  }

  return (
    <div className="product-page">
      {/* Server-rendered product info */}
      <div className="product-info">
        <h1>{product.name}</h1>
        <p className="price">${product.price}</p>
        <p className="description">{product.description}</p>
        
        {/* Client component for cart interaction */}
        <AddToCartButton
          productId={product.id}
          price={product.price}
          stock={product.stock}
        />
      </div>

      {/* Stream reviews independently */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <ProductReviews productId={product.id} />
      </Suspense>
    </div>
  );
}

// AddToCartButton.tsx (Client Component)
'use client';

import { useActionState, useOptimistic } from 'react';
import { addToCart } from './actions';

export default function AddToCartButton({ productId, price, stock }: Props) {
  const [cartCount, setCartCount] = useState(0);
  const [optimisticCount, setOptimisticCount] = useOptimistic(cartCount);
  const [isPending, startTransition] = useTransition();

  const handleAddToCart = () => {
    startTransition(async () => {
      setOptimisticCount(optimisticCount + 1);
      const result = await addToCart(productId);
      setCartCount(result.quantity);
    });
  };

  return (
    <div>
      <button
        onClick={handleAddToCart}
        disabled={isPending || stock === 0}
      >
        {stock === 0 ? 'Out of Stock' : 'Add to Cart'}
      </button>
      {optimisticCount > 0 && (
        <span>In cart: {optimisticCount}</span>
      )}
    </div>
  );
}

// ProductReviews.tsx (Server Component - async)
async function ProductReviews({ productId }: { productId: string }) {
  // This can take a while - streamed independently
  const reviews = await db.reviews.findMany({
    where: { productId },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="reviews">
      <h2>Customer Reviews</h2>
      {reviews.map(review => (
        <div key={review.id} className="review">
          <div className="rating">{'⭐'.repeat(review.rating)}</div>
          <p>{review.comment}</p>
          <span className="author">- {review.user.name}</span>
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Dashboard with Real-time Updates

```typescript
// app/dashboard/page.tsx (Server Component)
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import StatCards from './StatCards';
import RealtimeNotifications from './RealtimeNotifications';
import ActivityChart from './ActivityChart';

export default async function Dashboard() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }

  // Fetch initial data on server
  const stats = await fetchUserStats(session.user.id);

  return (
    <div className="dashboard">
      <h1>Welcome back, {session.user.name}!</h1>

      {/* Server-rendered stats */}
      <StatCards stats={stats} />

      {/* Client component for real-time updates */}
      <RealtimeNotifications userId={session.user.id} />

      {/* Streamed chart data */}
      <Suspense fallback={<ChartSkeleton />}>
        <ActivityChart userId={session.user.id} />
      </Suspense>
    </div>
  );
}

// RealtimeNotifications.tsx (Client Component)
'use client';

import { useEffect, useState } from 'react';

export default function RealtimeNotifications({ userId }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // WebSocket connection
    const ws = new WebSocket(`wss://api.example.com/notifications/${userId}`);

    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      setNotifications(prev => [notification, ...prev]);
    };

    return () => ws.close();
  }, [userId]);

  return (
    <div className="notifications">
      {notifications.map(notif => (
        <div key={notif.id} className="notification">
          {notif.message}
        </div>
      ))}
    </div>
  );
}

// ActivityChart.tsx (Server Component - async)
async function ActivityChart({ userId }: { userId: string }) {
  // Fetch heavy data on server
  const activityData = await db.analytics.aggregate({
    where: { userId },
    // Complex aggregation query
  });

  // Heavy chart library only runs on server
  const chartData = processChartData(activityData);

  return (
    <div>
      {/* Client component receives processed data */}
      <ChartRenderer data={chartData} />
    </div>
  );
}
```

---

## Summary

**Key Takeaways:**

1. **Server Components are default** - No directive needed
2. **Client Components need 'use client'** - Explicit opt-in
3. **Server → Client works** - Can import client into server
4. **Client → Server doesn't** - Can't import server into client (use children pattern)
5. **Keep client components small** - Push 'use client' down the tree

**Decision Rules:**
- Need interactivity? → Client Component
- Need data fetching? → Server Component
- When in doubt? → Start with Server Component

**Next Steps:**
- Learn [Server Actions Patterns](./02_server_actions_patterns.md)
- Explore [Streaming and Suspense](./03_streaming_suspense.md)
- Practice with the exercises

**Further Reading:**
- [Server Components RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
- [React Server Components Documentation](https://react.dev/reference/rsc/server-components)
