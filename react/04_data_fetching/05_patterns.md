# Advanced TanStack Query Patterns

Learn advanced data fetching patterns including pagination, prefetching, parallel queries, and optimistic updates.

## What You'll Learn

- Pagination strategies (offset & cursor-based)
- Infinite scrolling with `useInfiniteQuery`
- Parallel and dependent queries
- Prefetching for better performance
- Optimistic updates
- Suspense mode integration
- Query invalidation strategies

## 1. Pagination

### Offset-Based Pagination

```typescript
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

interface PaginatedResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

const fetchUsers = async (page: number, limit: number): Promise<PaginatedResponse> => {
  const offset = (page - 1) * limit;
  const response = await fetch(`/api/users?offset=${offset}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

function UserList() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError, error, isPreviousData } = useQuery({
    queryKey: ['users', page, limit],
    queryFn: () => fetchUsers(page, limit),
    keepPreviousData: true, // Show previous data while fetching new page
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div>
      <ul>
        {data.data.map((user) => (
          <li key={user.id}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>

      <div className="pagination">
        <button
          onClick={() => setPage((old) => Math.max(old - 1, 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        
        <span>
          Page {page} of {totalPages}
        </span>
        
        <button
          onClick={() => setPage((old) => (old < totalPages ? old + 1 : old))}
          disabled={page >= totalPages || isPreviousData}
        >
          Next
        </button>
      </div>

      {isPreviousData && <div>Loading next page...</div>}
    </div>
  );
}

export default UserList;
```

### Cursor-Based Pagination

```typescript
interface CursorResponse {
  data: User[];
  nextCursor?: string;
  prevCursor?: string;
}

const fetchUsersCursor = async (cursor?: string): Promise<CursorResponse> => {
  const url = cursor ? `/api/users?cursor=${cursor}` : '/api/users';
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

function UserListCursor() {
  const [cursors, setCursors] = useState<string[]>(['']); // Stack of cursors
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users-cursor', cursors[currentIndex]],
    queryFn: () => fetchUsersCursor(cursors[currentIndex] || undefined),
    keepPreviousData: true,
  });

  const goToNextPage = () => {
    if (data?.nextCursor) {
      setCursors((old) => [...old, data.nextCursor!]);
      setCurrentIndex((old) => old + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentIndex > 0) {
      setCurrentIndex((old) => old - 1);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div>
      <ul>
        {data.data.map((user) => (
          <li key={user.id}>
            {user.name} - {user.email}
          </li>
        ))}
      </ul>

      <div className="pagination">
        <button onClick={goToPreviousPage} disabled={currentIndex === 0}>
          Previous
        </button>
        
        <button onClick={goToNextPage} disabled={!data.nextCursor}>
          Next
        </button>
      </div>
    </div>
  );
}
```

## 2. Infinite Scrolling

### useInfiniteQuery with Load More Button

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

interface Project {
  id: number;
  name: string;
  description: string;
}

interface ProjectsPage {
  data: Project[];
  nextCursor?: number;
}

const fetchProjects = async ({ pageParam = 0 }): Promise<ProjectsPage> => {
  const response = await fetch(`/api/projects?cursor=${pageParam}`);
  if (!response.ok) throw new Error('Failed to fetch projects');
  return response.json();
};

function Projects() {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  if (status === 'pending') return <p>Loading...</p>;
  if (status === 'error') return <p>Error: {error.message}</p>;

  return (
    <div>
      {data.pages.map((page, i) => (
        <div key={i}>
          {page.data.map((project) => (
            <div key={project.id} className="project-card">
              <h3>{project.name}</h3>
              <p>{project.description}</p>
            </div>
          ))}
        </div>
      ))}

      <div>
        <button
          onClick={() => fetchNextPage()}
          disabled={!hasNextPage || isFetching}
        >
          {isFetchingNextPage
            ? 'Loading more...'
            : hasNextPage
              ? 'Load More'
              : 'Nothing more to load'}
        </button>
      </div>

      {isFetching && !isFetchingNextPage && <div>Fetching...</div>}
    </div>
  );
}

export default Projects;
```

### Infinite Scroll with Intersection Observer

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

function ProjectsInfiniteScroll() {
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (status === 'pending') return <p>Loading...</p>;
  if (status === 'error') return <p>Error: {error.message}</p>;

  return (
    <div>
      {data.pages.map((page, i) => (
        <div key={i}>
          {page.data.map((project) => (
            <div key={project.id} className="project-card">
              <h3>{project.name}</h3>
              <p>{project.description}</p>
            </div>
          ))}
        </div>
      ))}

      <div ref={observerTarget} className="observer-target">
        {isFetchingNextPage && <p>Loading more...</p>}
      </div>
    </div>
  );
}
```

## 3. Parallel Queries

### Multiple Independent Queries

```typescript
import { useQueries } from '@tanstack/react-query';

interface User {
  id: number;
  name: string;
}

interface Post {
  id: number;
  title: string;
}

function Dashboard() {
  const results = useQueries({
    queries: [
      {
        queryKey: ['user'],
        queryFn: async (): Promise<User> => {
          const res = await fetch('/api/user');
          return res.json();
        },
      },
      {
        queryKey: ['posts'],
        queryFn: async (): Promise<Post[]> => {
          const res = await fetch('/api/posts');
          return res.json();
        },
      },
      {
        queryKey: ['notifications'],
        queryFn: async () => {
          const res = await fetch('/api/notifications');
          return res.json();
        },
      },
    ],
  });

  const [userQuery, postsQuery, notificationsQuery] = results;

  // Check if any query is loading
  const isLoading = results.some((result) => result.isLoading);

  // Check if any query has error
  const hasError = results.some((result) => result.isError);

  if (isLoading) return <div>Loading dashboard...</div>;
  if (hasError) return <div>Error loading dashboard data</div>;

  return (
    <div>
      <h2>Welcome, {userQuery.data?.name}</h2>
      
      <div className="posts">
        <h3>Recent Posts</h3>
        {postsQuery.data?.map((post) => (
          <div key={post.id}>{post.title}</div>
        ))}
      </div>

      <div className="notifications">
        <h3>Notifications ({notificationsQuery.data?.length})</h3>
      </div>
    </div>
  );
}
```

### Dynamic Parallel Queries

```typescript
const fetchUserMessages = async (userId: number) => {
  const res = await fetch(`/api/messages/${userId}`);
  return res.json();
};

const fetchUsersData = async (): Promise<User[]> => {
  const res = await fetch('/api/users');
  return res.json();
};

function UserMessages() {
  // First, get all user IDs
  const { data: userIds } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsersData,
    select: (users) => users.map((user) => user.id),
  });

  // Then fetch messages for all users in parallel
  const messagesQueries = useQueries({
    queries: userIds
      ? userIds.map((id) => ({
          queryKey: ['messages', id],
          queryFn: () => fetchUserMessages(id),
        }))
      : [], // Empty array if userIds not yet loaded
  });

  if (!userIds) return <div>Loading users...</div>;

  return (
    <div>
      {messagesQueries.map((query, index) => (
        <div key={userIds[index]}>
          <h4>User {userIds[index]}</h4>
          {query.isLoading && <p>Loading messages...</p>}
          {query.isError && <p>Error loading messages</p>}
          {query.data && <p>{query.data.length} messages</p>}
        </div>
      ))}
    </div>
  );
}
```

## 4. Dependent Queries

```typescript
interface UserDetails {
  id: number;
  name: string;
  teamId: number;
}

interface Team {
  id: number;
  name: string;
  members: number[];
}

function UserProfile({ userId }: { userId: number }) {
  // First query: Get user details
  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
  } = useQuery({
    queryKey: ['user', userId],
    queryFn: async (): Promise<UserDetails> => {
      const res = await fetch(`/api/users/${userId}`);
      return res.json();
    },
  });

  // Second query: Get team data (depends on user.teamId)
  const {
    data: team,
    isLoading: isTeamLoading,
    isError: isTeamError,
  } = useQuery({
    queryKey: ['team', user?.teamId],
    queryFn: async (): Promise<Team> => {
      const res = await fetch(`/api/teams/${user!.teamId}`);
      return res.json();
    },
    enabled: !!user?.teamId, // Only run if user data exists
  });

  if (isUserLoading) return <div>Loading user...</div>;
  if (isUserError) return <div>Error loading user</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      
      {isTeamLoading && <p>Loading team...</p>}
      {isTeamError && <p>Error loading team</p>}
      {team && (
        <div className="team-info">
          <h3>Team: {team.name}</h3>
          <p>{team.members.length} members</p>
        </div>
      )}
    </div>
  );
}
```

## 5. Prefetching

### Prefetch on Hover

```typescript
import { useQueryClient } from '@tanstack/react-query';

interface User {
  id: number;
  name: string;
  email: string;
}

const fetchUser = async (userId: number): Promise<User> => {
  const res = await fetch(`/api/users/${userId}`);
  return res.json();
};

function UserList({ users }: { users: User[] }) {
  const queryClient = useQueryClient();

  const prefetchUser = async (userId: number) => {
    // Prefetch user data on hover
    await queryClient.prefetchQuery({
      queryKey: ['user', userId],
      queryFn: () => fetchUser(userId),
      staleTime: 1000 * 60 * 5, // Only prefetch if data is stale (older than 5 min)
    });
  };

  return (
    <ul>
      {users.map((user) => (
        <li
          key={user.id}
          onMouseEnter={() => prefetchUser(user.id)}
          onFocus={() => prefetchUser(user.id)}
        >
          <a href={`/users/${user.id}`}>{user.name}</a>
        </li>
      ))}
    </ul>
  );
}
```

### Prefetch in Route Loader

```typescript
// With React Router or TanStack Router
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();

// Route configuration
const userRoute = {
  path: '/users/:userId',
  loader: async ({ params }: { params: { userId: string } }) => {
    // Prefetch data before component renders
    await queryClient.prefetchQuery({
      queryKey: ['user', params.userId],
      queryFn: () => fetchUser(Number(params.userId)),
    });
    return null;
  },
  element: <UserProfile />,
};

// The component can immediately access cached data
function UserProfile() {
  const { userId } = useParams();
  
  // Data is already cached from loader
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(Number(userId)),
  });

  return <div>{user?.name}</div>;
}
```

### Ensure Data with ensureQueryData

```typescript
// Fetch data if not in cache, otherwise return cached data
async function ensureUserData(userId: number) {
  const queryClient = useQueryClient();
  
  const data = await queryClient.ensureQueryData({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
  
  return data; // Guaranteed to return data
}

// Usage in component
function UserButton({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);

  const handleClick = async () => {
    // Ensure data exists before navigating
    const userData = await ensureUserData(userId);
    setUser(userData);
    // Navigate to user page
  };

  return (
    <button onClick={handleClick}>
      View Profile {user && `(${user.name})`}
    </button>
  );
}
```

## 6. Optimistic Updates

```typescript
interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

function TodoItem({ todo }: { todo: Todo }) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (updatedTodo: Todo): Promise<Todo> => {
      const response = await fetch(`/api/todos/${updatedTodo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTodo),
      });
      if (!response.ok) throw new Error('Update failed');
      return response.json();
    },
    
    // Before mutation starts
    onMutate: async (newTodo) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);

      // Optimistically update the cache
      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old?.map((t) => (t.id === newTodo.id ? newTodo : t))
      );

      // Return context with snapshot for rollback
      return { previousTodos };
    },
    
    // If mutation fails, rollback
    onError: (err, newTodo, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
    },
    
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  const toggleComplete = () => {
    updateMutation.mutate({ ...todo, completed: !todo.completed });
  };

  return (
    <li style={{ opacity: updateMutation.isPending ? 0.5 : 1 }}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={toggleComplete}
      />
      {todo.title}
      {updateMutation.isError && <span> ⚠️ Update failed</span>}
    </li>
  );
}
```

## 7. Suspense Mode

### Using useSuspenseQuery

```typescript
import { useSuspenseQuery } from '@tanstack/react-query';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface Article {
  id: number;
  title: string;
  content: string;
}

const fetchArticle = async (id: number): Promise<Article> => {
  const res = await fetch(`/api/articles/${id}`);
  if (!res.ok) throw new Error('Failed to fetch article');
  return res.json();
};

function Article({ id }: { id: number }) {
  // No need to check isLoading or isError - handled by Suspense & ErrorBoundary
  const { data } = useSuspenseQuery({
    queryKey: ['article', id],
    queryFn: () => fetchArticle(id),
  });

  return (
    <article>
      <h1>{data.title}</h1>
      <p>{data.content}</p>
    </article>
  );
}

// Parent component with boundaries
function ArticlePage({ id }: { id: number }) {
  return (
    <ErrorBoundary fallback={<div>Error loading article</div>}>
      <Suspense fallback={<div>Loading article...</div>}>
        <Article id={id} />
      </Suspense>
    </ErrorBoundary>
  );
}

export default ArticlePage;
```

### Prefetch with Suspense

```typescript
import { usePrefetchQuery, useSuspenseQuery } from '@tanstack/react-query';

interface Comment {
  id: number;
  text: string;
  articleId: number;
}

const fetchComments = async (articleId: number): Promise<Comment[]> => {
  const res = await fetch(`/api/articles/${articleId}/comments`);
  return res.json();
};

function ArticleLayout({ id }: { id: number }) {
  // Prefetch comments outside Suspense boundary
  // This fetches in parallel without blocking
  usePrefetchQuery({
    queryKey: ['article-comments', id],
    queryFn: () => fetchComments(id),
  });

  return (
    <ErrorBoundary fallback={<div>Error</div>}>
      <Suspense fallback={<div>Loading article...</div>}>
        <Article id={id} />
        
        <Suspense fallback={<div>Loading comments...</div>}>
          <Comments articleId={id} />
        </Suspense>
      </Suspense>
    </ErrorBoundary>
  );
}

function Comments({ articleId }: { articleId: number }) {
  const { data: comments } = useSuspenseQuery({
    queryKey: ['article-comments', articleId],
    queryFn: () => fetchComments(articleId),
  });

  return (
    <div className="comments">
      {comments.map((comment) => (
        <p key={comment.id}>{comment.text}</p>
      ))}
    </div>
  );
}
```

## 8. Query Invalidation Strategies

### Manual Invalidation

```typescript
import { useQueryClient } from '@tanstack/react-query';

function RefreshButton() {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    // Invalidate all queries
    queryClient.invalidateQueries();

    // Invalidate specific query
    queryClient.invalidateQueries({ queryKey: ['todos'] });

    // Invalidate queries with filter
    queryClient.invalidateQueries({
      queryKey: ['todos'],
      exact: true, // Only exact match
    });

    // Invalidate with predicate
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === 'todos' && query.state.data,
    });
  };

  return <button onClick={handleRefresh}>Refresh</button>;
}
```

### Automatic Invalidation After Mutation

```typescript
const createTodoMutation = useMutation({
  mutationFn: async (newTodo: Omit<Todo, 'id'>) => {
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTodo),
    });
    return res.json();
  },
  onSuccess: () => {
    // Invalidate and refetch todos list
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

### Selective Invalidation

```typescript
const updateTodoMutation = useMutation({
  mutationFn: async (updatedTodo: Todo) => {
    const res = await fetch(`/api/todos/${updatedTodo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTodo),
    });
    return res.json();
  },
  onSuccess: (data, variables) => {
    // Invalidate list
    queryClient.invalidateQueries({ queryKey: ['todos'] });
    
    // Invalidate specific todo detail
    queryClient.invalidateQueries({ queryKey: ['todo', variables.id] });
    
    // Or update cache directly without refetching
    queryClient.setQueryData(['todo', variables.id], data);
  },
});
```

## 9. Configuration Best Practices

### Global Configuration

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
    </QueryClientProvider>
  );
}
```

### Per-Query Configuration

```typescript
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  
  // Override global settings
  staleTime: 1000 * 60 * 10, // 10 minutes
  gcTime: 1000 * 60 * 30, // 30 minutes
  
  // Retry configuration
  retry: 5,
  retryDelay: (attemptIndex) => attemptIndex * 1000,
  
  // Refetch configuration
  refetchOnWindowFocus: false,
  refetchInterval: 1000 * 60, // Poll every minute
  
  // Enable/disable based on condition
  enabled: !!userId,
  
  // Transform data
  select: (data) => data.name,
  
  // Initial data
  placeholderData: { id: userId, name: 'Loading...' },
});
```

## Best Practices

### ✅ Do's

- Use `keepPreviousData` for pagination to avoid loading states
- Prefetch data on user interactions (hover, focus) for better UX
- Use `useInfiniteQuery` for infinite scroll patterns
- Leverage optimistic updates for instant feedback
- Configure appropriate `staleTime` based on data volatility
- Use `enabled` option for dependent queries
- Implement proper error boundaries with Suspense mode
- Invalidate related queries after mutations

### ❌ Don'ts

- Don't refetch on every render - configure `staleTime` properly
- Don't forget to handle the `keepPreviousData` loading state
- Don't use `useQueries` for dependent queries - use `enabled` instead
- Don't prefetch without `staleTime` - you'll refetch unnecessarily
- Don't forget to cancel queries in `onMutate` for optimistic updates
- Don't use infinite queries for simple pagination
- Don't invalidate all queries unless necessary
- Don't ignore TypeScript types on query/mutation responses

## Common Patterns Summary

| Pattern | Use Case | Hook |
|---------|----------|------|
| **Offset Pagination** | Fixed page sizes, jump to any page | `useQuery` + `keepPreviousData` |
| **Cursor Pagination** | Efficient large datasets, no page jumping | `useQuery` + cursor stack |
| **Infinite Scroll** | Social feeds, product lists | `useInfiniteQuery` |
| **Parallel Queries** | Multiple independent data sources | `useQueries` |
| **Dependent Queries** | Sequential data fetching | `useQuery` + `enabled` |
| **Prefetching** | Anticipate user actions | `prefetchQuery` |
| **Optimistic Updates** | Instant UI feedback | `useMutation` + `onMutate` |
| **Suspense Mode** | Declarative loading/error states | `useSuspenseQuery` |

## Next Steps

- **[shadcn/ui Setup](../05_ui_libraries/01_shadcn_setup.md)** - Integrate beautiful UI components
- **[TypeScript Props Patterns](../06_typescript_patterns/01_props_patterns.md)** - Type-safe component patterns
- **[Component Design](../07_clean_code/01_component_design.md)** - Clean component architecture
- **[Axios Integration](./04_axios_integration.md)** - Review Axios + React Query patterns
