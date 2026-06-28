# useQuery - Data Fetching with TanStack Query

## What You'll Learn

- How to use `useQuery` for fetching data
- Query keys and query functions
- Loading, error, and success states
- Configuration options (staleTime, cacheTime, retry)
- Data transformation with `select`
- Refetching strategies
- TypeScript patterns for type-safe queries

---

## Basic Usage

### Simple Query

```typescript
import { useQuery } from '@tanstack/react-query';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

function TodoList() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['todos'],
    queryFn: async (): Promise<Todo[]> => {
      const response = await fetch('/api/todos');
      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }
      return response.json();
    },
  });

  if (isPending) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  );
}
```

---

## Query Keys

Query keys uniquely identify queries and enable caching.

### Simple Keys

```typescript
// String key
useQuery({ queryKey: ['todos'], queryFn: fetchTodos });

// Array with multiple values
useQuery({ queryKey: ['user', userId], queryFn: () => fetchUser(userId) });
```

### Dynamic Keys

```typescript
interface UserQueryParams {
  userId: string;
  includeProfile?: boolean;
}

function UserProfile({ userId, includeProfile }: UserQueryParams) {
  const { data } = useQuery({
    queryKey: ['user', userId, { includeProfile }],
    queryFn: () => fetchUser(userId, includeProfile),
  });
  
  return <div>{data?.name}</div>;
}
```

### Key Best Practices

```typescript
// ✅ Good - Hierarchical structure
['users']                      // All users
['users', userId]              // Specific user
['users', userId, 'posts']     // User's posts
['users', userId, 'posts', 1]  // Specific post

// ✅ Good - Include filters/params in key
['todos', { status: 'active', page: 1 }]
['products', { category: 'electronics', sort: 'price' }]

// ❌ Bad - Too generic
['data']
['items']
```

---

## Query States

### All Available States

```typescript
function UserDetails({ userId }: { userId: string }) {
  const {
    data,              // Query data
    error,             // Error object
    
    // Status booleans
    isPending,         // Initial loading (no cached data)
    isLoading,         // Fetching (no cached data)
    isError,           // Query failed
    isSuccess,         // Query succeeded
    
    // Fetching states
    isFetching,        // Fetching (may have cached data)
    isRefetching,      // Re-fetching after success
    
    // Utility states
    isStale,           // Data is stale
    isPlaceholderData, // Showing placeholder data
    
    // Status string
    status,            // 'pending' | 'error' | 'success'
    fetchStatus,       // 'fetching' | 'paused' | 'idle'
    
    // Utility functions
    refetch,           // Manual refetch
  } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  // Different UI states
  if (isPending) return <Spinner />;
  if (isError) return <ErrorAlert error={error} />;
  
  return (
    <div>
      <h1>{data.name}</h1>
      {isFetching && <RefreshIndicator />}
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

### isPending vs isLoading

```typescript
// isPending: No data exists yet (initial load)
// isLoading: isPending && isFetching (actively fetching with no data)
// isFetching: Fetching (may have cached data)

function DataDisplay() {
  const { data, isPending, isLoading, isFetching } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
  });

  // First load (no cache)
  if (isPending) return <div>Loading for first time...</div>;
  
  // Subsequent loads (have cached data)
  return (
    <div>
      {data.value}
      {isFetching && <span>Refreshing...</span>}
    </div>
  );
}
```

---

## Configuration Options

### staleTime and gcTime

```typescript
import { useQuery } from '@tanstack/react-query';

function ProductList() {
  const { data } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    
    // staleTime: How long data is considered fresh
    staleTime: 1000 * 60 * 5, // 5 minutes
    // Data won't refetch on mount/focus for 5 minutes
    
    // gcTime (formerly cacheTime): How long unused data stays in cache
    gcTime: 1000 * 60 * 10, // 10 minutes
    // Cached data removed 10 minutes after all components unmount
  });

  return <div>{/* ... */}</div>;
}
```

**Understanding the difference:**
- **staleTime**: When data is considered "fresh" (won't refetch)
- **gcTime**: When unused cached data is garbage collected

```typescript
// Common patterns:

// Always fresh - never refetch automatically
staleTime: Infinity

// Always stale - refetch on every mount/focus
staleTime: 0 // Default

// Fresh for 5 minutes
staleTime: 1000 * 60 * 5

// Keep in cache for 30 minutes after unmount
gcTime: 1000 * 60 * 30
```

### Retry Configuration

```typescript
function UserProfile({ userId }: { userId: string }) {
  const { data, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    
    // Retry 3 times on failure
    retry: 3,
    
    // Or custom retry logic
    retry: (failureCount, error) => {
      // Don't retry on 404
      if (error.response?.status === 404) return false;
      // Retry up to 5 times for other errors
      return failureCount < 5;
    },
    
    // Exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return <div>{/* ... */}</div>;
}
```

### Enabled Option

Conditionally enable/disable queries.

```typescript
function UserPosts({ userId }: { userId: string | null }) {
  // Only fetch if userId exists
  const { data } = useQuery({
    queryKey: ['posts', userId],
    queryFn: () => fetchUserPosts(userId!),
    enabled: !!userId, // Convert to boolean
  });

  if (!userId) return <div>Select a user</div>;
  return <div>{/* ... */}</div>;
}
```

### Refetch Options

```typescript
function LiveData() {
  const { data } = useQuery({
    queryKey: ['live-data'],
    queryFn: fetchLiveData,
    
    // Refetch on window focus
    refetchOnWindowFocus: true, // Default
    
    // Refetch on mount
    refetchOnMount: true, // Default
    
    // Refetch on network reconnect
    refetchOnReconnect: true, // Default
    
    // Poll every 5 seconds
    refetchInterval: 5000,
    
    // Continue polling when window not focused
    refetchIntervalInBackground: true,
  });

  return <div>{data?.value}</div>;
}
```

---

## Data Transformation with select

Transform or select a subset of data.

### Basic Selection

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  profile: {
    bio: string;
    avatar: string;
  };
}

function UserBio({ userId }: { userId: string }) {
  // Only subscribe to bio changes
  const { data: bio } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    select: (user: User) => user.profile.bio,
  });

  return <p>{bio}</p>;
}
```

### Optimized Subscriptions

```typescript
// Custom hook that accepts select function
export function useTodos<TData = Todo[]>(
  select?: (data: Todo[]) => TData
) {
  return useQuery({
    queryKey: ['todos'],
    queryFn: fetchTodos,
    select,
  });
}

// Usage 1: Get all todos
function TodoList() {
  const { data: todos } = useTodos();
  return <div>{todos.length} todos</div>;
}

// Usage 2: Only subscribe to count
function TodoCount() {
  const { data: count } = useTodos((todos) => todos.length);
  // Only re-renders when count changes, not when individual todos change
  return <div>{count} todos</div>;
}

// Usage 3: Filter completed todos
function CompletedTodos() {
  const { data: completed } = useTodos((todos) =>
    todos.filter((t) => t.completed)
  );
  return <div>{completed.length} completed</div>;
}
```

### Memoized Selection

```typescript
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

function ProductList() {
  // Memoize selector to prevent unnecessary recomputations
  const selectExpensiveProducts = useMemo(
    () => (products: Product[]) =>
      products.filter((p) => p.price > 100).sort((a, b) => b.price - a.price),
    []
  );

  const { data } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    select: selectExpensiveProducts,
  });

  return <div>{/* ... */}</div>;
}
```

---

## Initial and Placeholder Data

### Initial Data

```typescript
function UserProfile({ userId, cachedUser }: Props) {
  const { data } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    
    // Use cached user as initial data
    initialData: cachedUser,
    
    // Mark when initial data was fetched
    initialDataUpdatedAt: cachedUser?.fetchedAt,
    
    // Initial data is considered stale after 1 minute
    staleTime: 1000 * 60,
  });

  return <div>{data.name}</div>;
}
```

### Placeholder Data

```typescript
function UserProfile({ userId }: { userId: string }) {
  const { data, isPlaceholderData } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    
    // Show placeholder while loading
    placeholderData: {
      id: userId,
      name: 'Loading...',
      email: '',
    },
  });

  return (
    <div className={isPlaceholderData ? 'opacity-50' : ''}>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
    </div>
  );
}
```

### Placeholder from Cache

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';

function UserDetails({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  
  const { data } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    
    // Use data from users list as placeholder
    placeholderData: () => {
      const users = queryClient.getQueryData<User[]>(['users']);
      return users?.find((u) => u.id === userId);
    },
  });

  return <div>{data?.name}</div>;
}
```

---

## TypeScript Patterns

### Typed Query Function

```typescript
import { useQuery, QueryFunctionContext } from '@tanstack/react-query';

interface User {
  id: string;
  name: string;
  email: string;
}

type UserQueryKey = ['user', string];

async function fetchUser(
  context: QueryFunctionContext<UserQueryKey>
): Promise<User> {
  const [, userId] = context.queryKey;
  
  const response = await fetch(`/api/users/${userId}`);
  if (!response.ok) throw new Error('Failed to fetch user');
  
  return response.json();
}

function UserProfile({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ['user', userId] as const,
    queryFn: fetchUser,
  });

  return <div>{data?.name}</div>;
}
```

### Generic Query Hook

```typescript
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';

function useTypedQuery<TData, TError = Error>(
  options: UseQueryOptions<TData, TError>
): UseQueryResult<TData, TError> {
  return useQuery(options);
}

// Usage
interface Product {
  id: string;
  name: string;
  price: number;
}

function ProductList() {
  const { data } = useTypedQuery<Product[]>({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  return <div>{/* Fully typed data */}</div>;
}
```

### Query Key Factory

```typescript
// queryKeys.ts
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Usage
function UserProfile({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => fetchUser(userId),
  });

  return <div>{data?.name}</div>;
}
```

---

## Common Patterns

### Dependent Queries

```typescript
function UserPosts({ userId }: { userId: string }) {
  // Fetch user first
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  // Fetch posts only after user is loaded
  const { data: posts } = useQuery({
    queryKey: ['posts', user?.id],
    queryFn: () => fetchUserPosts(user!.id),
    enabled: !!user, // Only fetch when user exists
  });

  return <div>{/* ... */}</div>;
}
```

### Parallel Queries

```typescript
function Dashboard({ userId }: { userId: string }) {
  const userQuery = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  const postsQuery = useQuery({
    queryKey: ['posts', userId],
    queryFn: () => fetchPosts(userId),
  });

  const statsQuery = useQuery({
    queryKey: ['stats', userId],
    queryFn: () => fetchStats(userId),
  });

  if (userQuery.isPending || postsQuery.isPending || statsQuery.isPending) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{userQuery.data.name}</h1>
      <p>{postsQuery.data.length} posts</p>
      <p>{statsQuery.data.views} views</p>
    </div>
  );
}
```

---

## Best Practices

### ✅ Do's

1. **Use descriptive query keys**:
```typescript
// ✅ Good
['users', userId, 'posts', { status: 'published' }]

// ❌ Bad
['data', id]
```

2. **Set appropriate staleTime**:
```typescript
// ✅ Good - Data that rarely changes
staleTime: 1000 * 60 * 5 // 5 minutes

// ✅ Good - Real-time data
staleTime: 0 // Always refetch
```

3. **Use select for optimization**:
```typescript
// ✅ Good - Only re-render when count changes
select: (data) => data.length
```

4. **Handle all states**:
```typescript
if (isPending) return <Loading />;
if (isError) return <Error error={error} />;
return <Data data={data} />;
```

### ❌ Don'ts

1. **Don't use non-serializable values in query keys**:
```typescript
// ❌ Bad
queryKey: ['user', userObject]

// ✅ Good
queryKey: ['user', userObject.id]
```

2. **Don't fetch inside useEffect**:
```typescript
// ❌ Bad
useEffect(() => {
  fetchData().then(setData);
}, []);

// ✅ Good
useQuery({ queryKey: ['data'], queryFn: fetchData });
```

3. **Don't ignore errors**:
```typescript
// ❌ Bad
const { data } = useQuery({ queryKey, queryFn });
return <div>{data.value}</div>; // May crash

// ✅ Good
const { data, isError, error } = useQuery({ queryKey, queryFn });
if (isError) return <Error error={error} />;
return <div>{data.value}</div>;
```

---

## Summary

- `useQuery` handles data fetching, caching, and synchronization
- Query keys uniquely identify queries and enable caching
- Configure with `staleTime`, `gcTime`, `retry`, and `enabled`
- Use `select` to transform data and optimize re-renders
- TypeScript provides full type safety for queries
- Handle `isPending`, `isError`, and `isSuccess` states
- Use query key factories for consistency

---

## Next Steps

- [useMutation](./03_useMutation.md) - Mutations and data updates
- [Axios Integration](./04_axios_integration.md) - Using Axios with React Query
- [Query Patterns](./05_patterns.md) - Advanced patterns and best practices
