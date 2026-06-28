# React Server Components — Deep Dive

React Server Components (RSC) are not just a Next.js feature — they're a first-class React primitive that fundamentally changes where and how rendering happens. Understanding the mental model is the prerequisite; the API is the easy part.

---

## The Rendering Model

### Before RSC: Everything Ships to the Client

Traditional React renders a component tree entirely in the browser. Even "SSR" in React 18 still sends JS to the client for hydration — the server produces HTML, the client re-runs all the component code to attach event listeners.

```
Traditional SSR (React 18):
  Server: render(tree) → HTML string
  Client: hydrate(tree) → re-run ALL components → attach events
           ↑ every component's JS is in the bundle
```

### RSC: Split Rendering Across Server and Client

With RSC, the tree is split at compile time. Server components never run in the browser. They produce a serialized representation (not HTML — a special wire format) that the client runtime reconstructs.

```
RSC Model:
  Server: render(ServerComponents) → RSC payload (wire format)
  Client: render(ClientComponents) + merge(RSC payload) → DOM
          ↑ server component JS never ships to the browser
```

The RSC wire format is a JSON-like stream that describes the component output. It's not HTML — it's React's intermediate representation, which means the client can do React-level updates (diffing, transitions) without re-running server code.

---

## The Two Directives

### `"use client"` — Marks the Client Boundary

```jsx
// components/Counter.jsx
'use client';  // Everything below this point runs in the browser

import { useState } from 'react';

export function Counter({ initialCount }) {
  const [count, setCount] = useState(initialCount);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**What `"use client"` actually does:**
- Creates a boundary in the module graph
- The component and all its transitive imports go into the client bundle
- Props passed across this boundary must be serializable (see Serialization section)
- The directive applies to the file, not individual components — all exports become client components

### `"use server"` — Marks Server Actions

```jsx
// Not a Server Component directive — this marks a function as callable from the client
'use server';

export async function savePost(formData) {
  // Runs on the server, called from client
  const title = formData.get('title');
  await db.posts.create({ data: { title } });
  revalidatePath('/posts');
}
```

`"use server"` can appear at the top of a file (all exports become Server Actions) or inline inside a Server Component to define a local action:

```jsx
// Server Component with inline Server Action
async function PostForm() {
  async function handleSubmit(formData) {
    'use server';  // inline directive
    await db.posts.create({ data: { title: formData.get('title') } });
  }

  return <form action={handleSubmit}><input name="title" /><button>Save</button></form>;
}
```

---

## Server Components vs Client Components — The Actual Rules

| Capability | Server Component | Client Component |
|---|---|---|
| `async/await` in component body | Yes | No |
| `useState`, `useEffect`, other hooks | No | Yes |
| Event handlers (`onClick`, etc.) | No | Yes |
| Direct DB/filesystem access | Yes | No |
| `cookies()`, `headers()` (Next.js) | Yes | No |
| `window`, `document`, browser APIs | No | Yes |
| Import server-only packages | Yes | No (build error) |
| Added to JS bundle | No | Yes |
| Can hold secrets / env vars | Yes | Only `NEXT_PUBLIC_*` |

### Default Is Server

In Next.js App Router, every component is a Server Component by default. You opt **into** the client with `'use client'`. This is the opposite of the old pages router mental model.

```jsx
// app/page.jsx — Server Component (no directive needed)
export default async function Page() {
  const data = await db.posts.findMany();  // fine — runs on server
  return <PostList posts={data} />;
}

// app/components/LikeButton.jsx — must opt in
'use client';
export function LikeButton({ postId }) {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(l => !l)}>{liked ? '♥' : '♡'}</button>;
}
```

---

## Data Fetching in Server Components

### Fetch Directly in the Component

No more `getServerSideProps`, no `useEffect` + fetch chain, no API routes just to proxy server data.

```jsx
// React 18 (pages router) — data fetching separated from component
export async function getServerSideProps() {
  const posts = await db.posts.findMany();
  return { props: { posts } };
}
export default function BlogPage({ posts }) {
  return <PostList posts={posts} />;
}

// React 19 RSC — co-located, async component
export default async function BlogPage() {
  const posts = await db.posts.findMany();  // direct DB access
  return <PostList posts={posts} />;
}
```

### Parallel Data Fetching

Don't chain awaits — fetch in parallel:

```jsx
// Bad: sequential, each waits for the previous
async function Dashboard() {
  const user = await getUser();
  const posts = await getPosts(user.id);  // waits for getUser
  const stats = await getStats(user.id);  // waits for getPosts
  // total time = user + posts + stats
}

// Good: parallel
async function Dashboard() {
  const [user, posts, stats] = await Promise.all([
    getUser(),
    getPosts(),
    getStats(),
  ]);
  // total time = max(user, posts, stats)
}
```

### Request Deduplication

In Next.js, `fetch` calls are automatically deduplicated within a render. If two components fetch the same URL, it only makes one network request. For non-fetch data sources (DB queries), use React's `cache()`:

```jsx
import { cache } from 'react';

// Wrapped with cache() — safe to call from multiple components in same render
export const getUser = cache(async (id) => {
  return db.users.findUnique({ where: { id } });
});

// Both components call getUser(userId) — only one DB query happens
async function Header({ userId }) {
  const user = await getUser(userId);
  return <nav>{user.name}</nav>;
}

async function Profile({ userId }) {
  const user = await getUser(userId);
  return <div>{user.bio}</div>;
}
```

---

## The Server/Client Boundary and Composition

### The Golden Rule

A Server Component can render a Client Component. A Client Component cannot render a Server Component (it can render children passed from a server-side parent, but cannot import and render one directly).

```jsx
// ✅ Valid: Server renders Client
// ServerPage.jsx (no directive)
import { LikeButton } from './LikeButton';  // 'use client'

export default async function ServerPage() {
  const posts = await getPosts();
  return posts.map(post => (
    <article key={post.id}>
      <h2>{post.title}</h2>
      <LikeButton postId={post.id} />
    </article>
  ));
}

// ❌ Invalid: Client imports Server
// ClientComponent.jsx
'use client';
import { ServerData } from './ServerData';  // Server Component — build error
```

### The Children Pattern — Server Inside Client

The workaround for "Server Component inside Client Component" is composition via `children`:

```jsx
// ClientShell.jsx
'use client';
export function ClientShell({ children }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}>Toggle</button>
      {open && children}
    </div>
  );
}

// page.jsx (Server Component)
import { ClientShell } from './ClientShell';
import { ServerContent } from './ServerContent';  // async Server Component

export default function Page() {
  // ServerContent is evaluated on the server, its output is passed as children
  return (
    <ClientShell>
      <ServerContent />
    </ClientShell>
  );
}
```

`ServerContent` runs on the server. Its output (RSC payload) is passed as `children` to `ClientShell` which renders it in the browser without re-running server code.

### Practical Composition Pattern: Island Architecture

Push interactivity to leaf nodes. Keep parents as Server Components.

```jsx
// ❌ Unnecessary client component — the whole page
'use client';
export default function ProductPage({ product }) {
  const [qty, setQty] = useState(1);
  return (
    <div>
      <h1>{product.name}</h1>         {/* static — shouldn't be client */}
      <p>{product.description}</p>     {/* static */}
      <img src={product.image} />      {/* static */}
      <QuantityPicker qty={qty} onChange={setQty} />
      <AddToCartButton product={product} qty={qty} />
    </div>
  );
}

// ✅ Server Component — most content stays on server
export default async function ProductPage({ params }) {
  const product = await db.products.findUnique({ where: { id: params.id } });
  return (
    <div>
      <h1>{product.name}</h1>          {/* no JS shipped */}
      <p>{product.description}</p>
      <img src={product.image} />
      <AddToCartSection product={product} />  {/* only this is client */}
    </div>
  );
}

// AddToCartSection.jsx
'use client';
export function AddToCartSection({ product }) {
  const [qty, setQty] = useState(1);
  return (
    <>
      <QuantityPicker qty={qty} onChange={setQty} />
      <button onClick={() => addToCart(product.id, qty)}>Add to Cart</button>
    </>
  );
}
```

---

## Serialization — What Can Cross the Boundary

Props passed from a Server Component to a Client Component must be serializable — they go through the RSC wire format.

### What's Serializable

```jsx
// ✅ These all work across the boundary
<ClientComponent
  str="hello"
  num={42}
  bool={true}
  arr={[1, 2, 3]}
  obj={{ name: 'Alice', age: 30 }}
  null={null}
  undefined={undefined}
  date={new Date()}           // serialized as ISO string
  bigint={9007199254740991n}  // supported
  serverAction={myServerAction}  // special case — functions with 'use server' work
/>
```

### What's NOT Serializable

```jsx
// ❌ These break at the boundary
<ClientComponent
  fn={() => console.log('hello')}   // regular functions — not serializable
  class={MyClass}                    // class references
  instance={new MyClass()}           // class instances
  symbol={Symbol('foo')}             // symbols
  map={new Map()}                    // Map/Set
  set={new Set()}                    // 
  weakRef={new WeakRef(obj)}         // 
  regex={/pattern/}                  // 
  component={<SomeComponent />}      // React elements (unless children)
  promise={fetchData()}              // Promises (partially supported — see below)
/>
```

### The Function Problem

You can't pass arbitrary functions across the boundary. The pattern is Server Actions:

```jsx
// ❌ Broken: passing a closure
async function ServerPage() {
  const user = await getUser();
  return (
    <ClientForm
      onSubmit={async (data) => {  // ❌ not serializable — it closes over `user`
        await saveUserData(user.id, data);
      }}
    />
  );
}

// ✅ Fixed: Server Action
async function saveUserData(userId, formData) {
  'use server';
  await db.users.update({ where: { id: userId }, data: formData });
}

async function ServerPage() {
  const user = await getUser();
  // Server Actions are serializable reference tokens
  const boundSave = saveUserData.bind(null, user.id);
  return <ClientForm onSubmit={boundSave} />;
}
```

### Passing Promises (React 19 Feature)

React 19 adds the ability to pass Promises from server to client, combined with `use()`:

```jsx
// Server Component
async function ServerPage() {
  // Don't await — pass the promise
  const commentsPromise = fetchComments();  // Promise<Comment[]>
  return (
    <Suspense fallback={<CommentsLoading />}>
      <ClientComments commentsPromise={commentsPromise} />
    </Suspense>
  );
}

// Client Component — receives and "uses" the promise
'use client';
import { use } from 'react';

function ClientComments({ commentsPromise }) {
  const comments = use(commentsPromise);  // suspends until resolved
  return <ul>{comments.map(c => <li key={c.id}>{c.text}</li>)}</ul>;
}
```

---

## Suspense and Streaming

Server Components integrate natively with Suspense for streaming. Components that are slow don't block the rest of the page.

```jsx
// app/page.jsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <main>
      <Header />                           {/* renders immediately */}
      <Suspense fallback={<PostsSkeleton />}>
        <PostList />                       {/* streams in when ready */}
      </Suspense>
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments />                       {/* independent stream */}
      </Suspense>
    </main>
  );
}

async function PostList() {
  const posts = await db.posts.findMany();  // this suspends the Suspense boundary
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}

async function Comments() {
  const comments = await db.comments.findMany();  // independent — doesn't block PostList
  return <div>{comments.length} comments</div>;
}
```

The server streams the RSC payload — `Header` HTML arrives first, then `PostList` and `Comments` chunks arrive as their queries resolve, without a second HTTP request.

---

## RSC in Next.js App Router

### Directory Conventions

```
app/
  layout.jsx          → Server Component (wraps all pages)
  page.jsx            → Server Component (the route)
  loading.jsx         → Creates Suspense boundary automatically
  error.jsx           → Error boundary (must be 'use client')
  not-found.jsx       → 404 UI
  components/
    Header.jsx        → Server Component (no directive)
    NavMenu.jsx       → 'use client' (needs state for mobile menu)
```

### Caching Behavior (Critical to Understand)

```jsx
// Default: cached at build time (Static)
async function StaticPage() {
  const posts = await fetch('https://api.example.com/posts');
  // This fetch is cached — same response for all users
}

// Force dynamic per-request
async function DynamicPage() {
  const posts = await fetch('https://api.example.com/posts', {
    cache: 'no-store'  // opt out of caching
  });
  // OR
  const posts = await fetch('https://api.example.com/posts', {
    next: { revalidate: 60 }  // ISR — revalidate every 60s
  });
}

// Dynamic by default when you use dynamic APIs
async function UserPage() {
  const cookieStore = cookies();         // using cookies → forces dynamic
  const headersList = headers();         // using headers → forces dynamic
  const { searchParams } = new URL(req.url);  // same
}
```

### `revalidatePath` and `revalidateTag`

After a mutation (Server Action), invalidate cached data:

```jsx
'use server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function createPost(formData) {
  await db.posts.create({ data: { title: formData.get('title') } });
  revalidatePath('/posts');          // invalidate specific path
  revalidateTag('posts');            // invalidate by tag
}

// Tag the fetch
async function PostList() {
  const posts = await fetch('/api/posts', { next: { tags: ['posts'] } });
  // revalidateTag('posts') will bust this cache
}
```

---

## When to Use RSC vs Client Components

### Use Server Components for:

- **Data fetching** — any component that reads from a database, API, or filesystem
- **Static content** — marketing pages, blog posts, product descriptions
- **Heavy dependencies** — `markdown-it`, `date-fns`, chart data processing — keep off the client bundle
- **Authentication checks** — read cookies/session server-side, don't expose to client
- **SEO-critical content** — server-rendered HTML is immediately available to crawlers

### Use Client Components for:

- **Interactivity** — anything with `onClick`, `onChange`, `onSubmit`
- **React hooks** — `useState`, `useEffect`, `useContext`, `useRef`
- **Browser APIs** — `localStorage`, `window`, `navigator`, WebSocket, canvas
- **Real-time updates** — polling, WebSocket subscriptions, SSE listeners
- **Third-party client-only libraries** — anything that touches `window` on import

### The Thumb Rule

Default to Server Components. Add `'use client'` only when you hit a wall (hook, event handler, browser API). When you add it, move the directive as deep into the tree as possible.

```jsx
// Anti-pattern: broad client boundary
'use client';
export default function ProductPage({ productId }) {
  // only the button needs state — but everything is now client-side
  const [qty, setQty] = useState(1);
  return (
    <div>
      <ProductDetails productId={productId} />  {/* could be server */}
      <button onClick={() => setQty(q => q + 1)}>+</button>
    </div>
  );
}

// Correct: minimal client boundary
// ProductPage.jsx (Server)
export default async function ProductPage({ params }) {
  const product = await db.products.findUnique({ where: { id: params.id } });
  return (
    <div>
      <ProductDetails product={product} />
      <QuantityControl />   {/* only this file has 'use client' */}
    </div>
  );
}
```

---

## Common Pitfalls

### 1. Context Providers Must Be Client Components

```jsx
// ❌ ThemeContext.Provider in a Server Component
export default function Layout({ children }) {
  return (
    <ThemeContext.Provider value="dark">  {/* Error */}
      {children}
    </ThemeContext.Provider>
  );
}

// ✅ Wrap provider in a Client Component
// providers.jsx
'use client';
export function Providers({ children }) {
  return <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>;
}

// layout.jsx (Server)
import { Providers } from './providers';
export default function Layout({ children }) {
  return <Providers>{children}</Providers>;
}
```

### 2. Server-Only Imports Leaking to Client

```jsx
// lib/db.ts — uses Node.js APIs, must stay server-side
import { PrismaClient } from '@prisma/client';
export const db = new PrismaClient();

// If a Client Component imports this (directly or transitively), you get a build error
// Use 'server-only' package to make the error explicit:
import 'server-only';  // throws if imported in client context
export const db = new PrismaClient();
```

### 3. `useRouter`, `usePathname`, `useSearchParams` Require Client

```jsx
// ❌ In a Server Component
export default function Page() {
  const router = useRouter();  // Error — hook in server component
}

// ✅ Use Next.js server-side equivalents or make it a client component
// Server: use redirect(), notFound() from 'next/navigation'
// Client: use useRouter(), usePathname() with 'use client'
```

### 4. Forgetting That Client Components Still SSR

`'use client'` doesn't mean "client-only rendered." Client Components still render on the server during SSR — they just also hydrate and run in the browser. If you need truly browser-only code, check `typeof window !== 'undefined'` or use `useEffect`:

```jsx
'use client';
import { useState, useEffect } from 'react';

export function LocalStorageValue({ key }) {
  const [value, setValue] = useState(null);
  
  useEffect(() => {
    // Safe — only runs in browser after hydration
    setValue(localStorage.getItem(key));
  }, [key]);

  return <span>{value}</span>;
}
```

---

## RSC Wire Format — What's Actually Happening

When Next.js fetches a page or you navigate client-side, the server doesn't return HTML for RSC — it returns a special serialized format:

```
0:["$","div",null,{"children":[["$","h1",null,{"children":"Hello"}],...]}]
1:I["ClientButton",["/static/chunks/client-button.js"],...]
2:["$","$L1",null,{"label":"Click me"}]
```

This is the RSC payload. The client runtime uses it to:
1. Build the React element tree without re-running server component code
2. Reference client component chunks by URL (lazy-loaded as needed)
3. Enable client-side navigation without a full page reload

This is why RSC-powered navigation feels like a SPA — you're fetching RSC payloads, not HTML, and React merges them into the existing tree.
