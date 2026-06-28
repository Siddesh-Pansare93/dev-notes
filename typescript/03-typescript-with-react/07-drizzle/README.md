# Drizzle ORM + Next.js Server Actions Integration Guide

Combining Drizzle ORM with Next.js Server Actions provides a full-stack type-safe experience where your database operations seamlessly integrate with your frontend forms, all while executing securely on the server or Edge network.

## 1. Drizzle ORM Setup for Next.js (App Router)

### Installation

For Next.js App Router, we'll use `@neondatabase/serverless` for optimal Edge network compatibility, along with Drizzle ORM.

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit tsx
```

### Database Connection (`src/db/index.ts`)

```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// This runs on the server (or Edge)
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### Schema Definition (`src/db/schema.ts`)

```typescript
import { pgTable, serial, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const todos = pgTable('todos', {
  id: serial('id').primaryKey(),
  text: text('text').notNull(),
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
```

---

## 2. Server Actions with Drizzle

Server Actions (`"use server"`) allow you to write functions that run securely on the Node.js server or Edge, making them the perfect place for database mutations.

### Creating Server Actions (`src/actions/todo.ts`)

```typescript
"use server"

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { todos } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Add a Todo
export async function addTodo(formData: FormData) {
  const text = formData.get('text') as string;

  if (!text) throw new Error("Text is required");

  // Drizzle Insert
  await db.insert(todos).values({ text });

  // Invalidate the cache to update the UI instantly
  revalidatePath('/');
}

// Toggle Todo Status
export async function toggleTodo(id: number, completed: boolean) {
  // Drizzle Update
  await db.update(todos)
    .set({ completed: !completed })
    .where(eq(todos.id, id));

  revalidatePath('/');
}

// Delete Todo
export async function deleteTodo(id: number) {
  // Drizzle Delete
  await db.delete(todos).where(eq(todos.id, id));
  revalidatePath('/');
}
```

---

## 3. Frontend Integration (Type-Safe DB Operations)

You can fetch data directly in Server Components using Drizzle, passing the results to Client Components.

### `app/page.tsx` (Server Component)

```tsx
import { db } from '@/db';
import { todos } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { addTodo } from '@/actions/todo';
import TodoList from './TodoList';

export default async function Page() {
  // Type-safe fetch directly inside the Server Component
  const allTodos = await db.select()
    .from(todos)
    .orderBy(desc(todos.createdAt));

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Drizzle + Next.js Edge</h1>
      
      {/* Form automatically wires up to Server Action */}
      <form action={addTodo} className="flex gap-2 mb-8">
        <input 
          type="text" 
          name="text" 
          placeholder="New task..." 
          className="border p-2 rounded"
          required
        />
        <button type="submit" className="bg-blue-500 text-white px-4 rounded">
          Add
        </button>
      </form>

      {/* Client component for interactive list */}
      <TodoList initialTodos={allTodos} />
    </main>
  );
}
```

---

## 4. Optimistic Updates in Client Components

When interacting with a database via Server Actions, waiting for the network roundtrip can feel slow. Next.js `useOptimistic` hook solves this.

### `app/TodoList.tsx` (Client Component)

```tsx
"use client"

import { useOptimistic } from 'react';
import { toggleTodo, deleteTodo } from '@/actions/todo';
import type { Todo } from '@/db/schema';

export default function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    initialTodos,
    (state, updatedTodo: Todo) => {
      // If deleted (id negative hack for demo)
      if (updatedTodo.id < 0) return state.filter(t => t.id !== Math.abs(updatedTodo.id));
      
      // If toggled
      return state.map(t => t.id === updatedTodo.id ? updatedTodo : t);
    }
  );

  return (
    <ul className="space-y-2">
      {optimisticTodos.map(todo => (
        <li key={todo.id} className="flex gap-4 items-center">
          <input 
            type="checkbox"
            checked={todo.completed}
            onChange={() => {
              // 1. Instantly update UI optimistically
              addOptimisticTodo({ ...todo, completed: !todo.completed });
              // 2. Fire server action in background
              toggleTodo(todo.id, todo.completed);
            }}
          />
          <span className={todo.completed ? 'line-through text-gray-400' : ''}>
            {todo.text}
          </span>
          <button 
            onClick={() => {
               // Optimistically remove
               addOptimisticTodo({ ...todo, id: -todo.id }); 
               // Delete from DB
               deleteTodo(todo.id);
            }}
            className="text-red-500 text-sm ml-auto"
          >
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
```

---

## 5. RLS (Row Level Security) Patterns with Drizzle

In modern Next.js apps often using tools like Supabase Auth or Clerk, enforcing Row Level Security (RLS) or tenant isolation is critical.

Because Drizzle generates pure SQL, you can combine it effortlessly with tenant-aware transactions.

### Multi-Tenant Query Example (Clerk / Postgres)

```typescript
"use server"

import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { todos } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function getUserTodos() {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Drizzle query restricted to the current user
  return db.select()
    .from(todos)
    .where(eq(todos.userId, userId)); // Only fetch this user's data
}
```

### True Postgres RLS using Neon

If using actual Postgres RLS policies, you must inject the user session context into the transaction before querying:

```typescript
import { sql } from 'drizzle-orm';

export async function secureAction() {
  const { userId } = auth();

  await db.transaction(async (tx) => {
     // Set Postgres configuration for this transaction
     await tx.execute(sql`set local rls.user_id = ${userId}`);

     // Drizzle queries will now run under RLS constraints
     const secureData = await tx.select().from(todos);
     return secureData;
  });
}
```

---

## 6. Edge Runtime Compatibility

Next.js Middleware and certain routes deploy to Vercel's Edge Network (Cloudflare Workers under the hood). Node.js native drivers like `pg` or `mysql2` will crash on the Edge because they rely on native TCP sockets (`net` module).

**How to fix it:**
Always use an HTTP/WebSocket based driver with Drizzle in Next.js.
- **Neon:** `drizzle-orm/neon-http`
- **PlanetScale (MySQL):** `drizzle-orm/planetscale-serverless`
- **Turso (SQLite):** `drizzle-orm/libsql`

```typescript
// Edge compatible Route Handler (app/api/data/route.ts)
export const runtime = 'edge'; 

import { db } from '@/db';
import { todos } from '@/db/schema';
import { NextResponse } from 'next/server';

export async function GET() {
  const data = await db.select().from(todos);
  return NextResponse.json(data);
}
```

## Practice Exercises
1. Setup a Next.js App Router project connected to Neon DB via Drizzle.
2. Build a full CRUD Server Action suite for a `notes` table.
3. Use `useOptimistic` to make deleting a note instantaneous.
4. Experiment with edge compatibility by adding `export const runtime = 'edge'` to a Server Component that reads from Drizzle.