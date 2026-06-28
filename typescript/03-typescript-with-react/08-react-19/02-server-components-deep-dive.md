# Server Components Deep Dive

React Server Components (RSC) were introduced previously but are fully stable and foundational in React 19.

## What are Server Components?

By default, in React 19 framework environments (like Next.js 15), components are **Server Components**. They only run on the server, their JS bundle is zero bytes, and they are perfect for secure operations and data fetching.

### Client Components
If you need interactivity (state, context, DOM effects), you must explicitly mark the component with the `'use client'` directive.

```tsx
// Client Component
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

```tsx
// Server Component (Default)
import { db } from '@/lib/db';
import { Counter } from './Counter';

export default async function Dashboard() {
  // Fetching directly in the component - no useEffect or getServerSideProps!
  const userCount = await db.user.count();

  return (
    <div>
      <h1>Total Users: {userCount}</h1>
      <Counter />
    </div>
  );
}
```

## Data Fetching in Server Components

Since Server Components run on the server and support `async`/`await`, you don't need `useEffect` or SWR/React Query for initial data loads.

You simply await your Promises directly in the functional component body:

```tsx
import { Suspense } from 'react';

async function UserList() {
  const res = await fetch('https://jsonplaceholder.typicode.com/users');
  const users = await res.json();
  
  return (
    <ul>
      {users.map((u: any) => <li key={u.id}>{u.name}</li>)}
    </ul>
  );
}

export default function UsersPage() {
  return (
    <div>
      <h2>User Directory</h2>
      <Suspense fallback={<p>Loading users...</p>}>
        <UserList />
      </Suspense>
    </div>
  );
}
```

## Server Actions and Mutations

`'use server'` marks async functions that can be called by Client Components or passed to `<form action={...}>`.

These replace traditional API routes and simplify mutations:

```tsx
// actions.ts
'use server';
import { db } from './db';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  await db.post.create({ data: { title, content } });
  revalidatePath('/posts'); // Invalidate cache (Next.js example)
}
```

```tsx
// Client Form
'use client';
import { createPost } from './actions';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>Save</button>;
}

export default function NewPost() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <textarea name="content" required />
      <SubmitButton />
    </form>
  );
}
```

## Server vs Client Best Practices

| Use Server Components For | Use Client Components For |
| :--- | :--- |
| Fetching data directly from DB | Adding interactivity and event listeners |
| Accessing backend resources (files) | State and Lifecycle hooks (`useState`, `useEffect`) |
| Keeping heavy dependencies off the client | Browser-exclusive APIs (`window`, `localStorage`) |
| Passing sensitive tokens | Using React Context (`createContext`) |