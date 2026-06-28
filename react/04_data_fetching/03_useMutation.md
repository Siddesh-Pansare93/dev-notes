# useMutation - Data Mutations with TanStack Query

## What You'll Learn

- How to use `useMutation` for creating, updating, and deleting data
- Mutation states and lifecycle callbacks
- Invalidating and updating queries after mutations
- Optimistic updates
- Error handling and rollback
- TypeScript patterns for type-safe mutations

---

## Basic Usage

### Simple Mutation

```typescript
import { useMutation } from '@tanstack/react-query';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

interface CreateTodoInput {
  title: string;
}

async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const response = await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create todo');
  }
  
  return response.json();
}

function CreateTodoForm() {
  const { mutate, isPending, isError, error, isSuccess } = useMutation({
    mutationFn: createTodo,
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    
    mutate({ title });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Todo title" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Todo'}
      </button>
      
      {isError && <div className="error">{error.message}</div>}
      {isSuccess && <div className="success">Todo created!</div>}
    </form>
  );
}
```

---

## Mutation States

### All Available States

```typescript
function TodoActions({ todoId }: { todoId: string }) {
  const {
    mutate,           // Trigger mutation (callback-based)
    mutateAsync,      // Trigger mutation (promise-based)
    data,             // Mutation response data
    error,            // Error object if mutation failed
    
    // Status booleans
    isPending,        // Mutation in progress
    isIdle,           // Mutation not started
    isError,          // Mutation failed
    isSuccess,        // Mutation succeeded
    isPaused,         // Mutation paused (offline)
    
    // Metadata
    status,           // 'idle' | 'pending' | 'error' | 'success'
    variables,        // Variables passed to mutation
    submittedAt,      // Timestamp when mutation started
    failureCount,     // Number of failed attempts
    failureReason,    // Reason for failure
    
    // Utility
    reset,            // Reset mutation to idle state
  } = useMutation({
    mutationFn: (id: string) => deleteTodo(id),
  });

  return (
    <div>
      <button
        onClick={() => mutate(todoId)}
        disabled={isPending}
      >
        {isPending ? 'Deleting...' : 'Delete'}
      </button>
      
      {isError && <span>Error: {error.message}</span>}
      {isSuccess && <span>Deleted successfully!</span>}
    </div>
  );
}
```

---

## Lifecycle Callbacks

### All Callbacks

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Todo {
  id: string;
  title: string;
}

function TodoForm() {
  const queryClient = useQueryClient();
  
  const { mutate } = useMutation({
    mutationFn: createTodo,
    
    // Before mutation starts
    onMutate: async (variables: CreateTodoInput) => {
      console.log('Starting mutation with:', variables);
      
      // Optionally return context for use in other callbacks
      return { startTime: Date.now() };
    },
    
    // On successful mutation
    onSuccess: (data: Todo, variables: CreateTodoInput, context: any) => {
      console.log('Mutation succeeded:', data);
      console.log('Time taken:', Date.now() - context.startTime, 'ms');
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
    
    // On failed mutation
    onError: (error: Error, variables: CreateTodoInput, context: any) => {
      console.error('Mutation failed:', error);
      console.log('Failed variables:', variables);
    },
    
    // Always runs (success or error)
    onSettled: (data, error, variables, context) => {
      console.log('Mutation settled');
      // Cleanup logic here
    },
  });

  return <div>{/* ... */}</div>;
}
```

### Per-Mutation Callbacks

```typescript
function TodoActions() {
  const { mutate } = useMutation({
    mutationFn: deleteTodo,
  });

  function handleDelete(todoId: string) {
    mutate(todoId, {
      // Override callbacks for this specific mutation call
      onSuccess: () => {
        console.log(`Todo ${todoId} deleted`);
      },
      onError: (error) => {
        alert(`Failed to delete: ${error.message}`);
      },
      onSettled: () => {
        console.log('Delete operation completed');
      },
    });
  }

  return <button onClick={() => handleDelete('123')}>Delete</button>;
}
```

---

## Invalidating Queries

### Basic Invalidation

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateTodoForm() {
  const queryClient = useQueryClient();
  
  const { mutate } = useMutation({
    mutationFn: createTodo,
    onSuccess: () => {
      // Invalidate todos query - will trigger refetch
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  return <div>{/* ... */}</div>;
}
```

### Multiple Query Invalidation

```typescript
function CreateTodoForm() {
  const queryClient = useQueryClient();
  
  const { mutate } = useMutation({
    mutationFn: createTodo,
    onSuccess: async () => {
      // Invalidate multiple queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['todos'] }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
        queryClient.invalidateQueries({ queryKey: ['user', 'activity'] }),
      ]);
    },
  });

  return <div>{/* ... */}</div>;
}
```

### Selective Invalidation

```typescript
function UpdateTodoForm({ todoId }: { todoId: string }) {
  const queryClient = useQueryClient();
  
  const { mutate } = useMutation({
    mutationFn: updateTodo,
    onSuccess: (data) => {
      // Only invalidate queries for this specific todo
      queryClient.invalidateQueries({
        queryKey: ['todo', todoId],
      });
      
      // Invalidate all todos list queries
      queryClient.invalidateQueries({
        queryKey: ['todos'],
        exact: false, // Match any query starting with ['todos']
      });
    },
  });

  return <div>{/* ... */}</div>;
}
```

---

## Updating Query Data

### Direct Cache Update

Instead of invalidating, directly update the cache with mutation response.

```typescript
function UpdateTodoForm({ todoId }: { todoId: string }) {
  const queryClient = useQueryClient();
  
  const { mutate } = useMutation({
    mutationFn: updateTodo,
    onSuccess: (updatedTodo: Todo) => {
      // Update specific todo in cache
      queryClient.setQueryData(['todo', todoId], updatedTodo);
      
      // Update todo in list
      queryClient.setQueryData<Todo[]>(['todos'], (oldTodos) => {
        if (!oldTodos) return [updatedTodo];
        
        return oldTodos.map((todo) =>
          todo.id === todoId ? updatedTodo : todo
        );
      });
    },
  });

  return <div>{/* ... */}</div>;
}
```

### Add to List

```typescript
function CreateTodoForm() {
  const queryClient = useQueryClient();
  
  const { mutate } = useMutation({
    mutationFn: createTodo,
    onSuccess: (newTodo: Todo) => {
      // Add new todo to existing list
      queryClient.setQueryData<Todo[]>(['todos'], (oldTodos) => {
        return oldTodos ? [...oldTodos, newTodo] : [newTodo];
      });
    },
  });

  return <div>{/* ... */}</div>;
}
```

### Remove from List

```typescript
function TodoItem({ todo }: { todo: Todo }) {
  const queryClient = useQueryClient();
  
  const { mutate } = useMutation({
    mutationFn: deleteTodo,
    onSuccess: () => {
      // Remove todo from list
      queryClient.setQueryData<Todo[]>(['todos'], (oldTodos) => {
        return oldTodos?.filter((t) => t.id !== todo.id) || [];
      });
    },
  });

  return (
    <div>
      <span>{todo.title}</span>
      <button onClick={() => mutate(todo.id)}>Delete</button>
    </div>
  );
}
```

---

## Optimistic Updates

Show changes immediately before server confirms.

### Basic Optimistic Update

```typescript
interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

function TodoItem({ todo }: { todo: Todo }) {
  const queryClient = useQueryClient();
  
  const { mutate } = useMutation({
    mutationFn: (id: string) => toggleTodo(id),
    
    // Before mutation
    onMutate: async (todoId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      
      // Snapshot current value
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);
      
      // Optimistically update cache
      queryClient.setQueryData<Todo[]>(['todos'], (oldTodos) => {
        return oldTodos?.map((t) =>
          t.id === todoId ? { ...t, completed: !t.completed } : t
        ) || [];
      });
      
      // Return snapshot for rollback
      return { previousTodos };
    },
    
    // On error, rollback
    onError: (error, variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
    },
    
    // Always refetch after mutation
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  return (
    <div>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => mutate(todo.id)}
      />
      <span>{todo.title}</span>
    </div>
  );
}
```

### Advanced Optimistic Update with Rollback

```typescript
function EditTodoForm({ todo }: { todo: Todo }) {
  const queryClient = useQueryClient();
  
  const { mutate, isPending } = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Todo> }) =>
      updateTodo(id, updates),
    
    onMutate: async ({ id, updates }) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      await queryClient.cancelQueries({ queryKey: ['todo', id] });
      
      // Snapshot previous values
      const previousTodo = queryClient.getQueryData<Todo>(['todo', id]);
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);
      
      // Optimistic update - single todo
      queryClient.setQueryData<Todo>(['todo', id], (old) => ({
        ...old!,
        ...updates,
      }));
      
      // Optimistic update - todo list
      queryClient.setQueryData<Todo[]>(['todos'], (oldTodos) =>
        oldTodos?.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ) || []
      );
      
      return { previousTodo, previousTodos };
    },
    
    onError: (error, { id }, context) => {
      // Rollback on error
      if (context?.previousTodo) {
        queryClient.setQueryData(['todo', id], context.previousTodo);
      }
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos);
      }
      
      alert(`Update failed: ${error.message}`);
    },
    
    onSettled: (data, error, { id }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['todo', id] });
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    
    mutate({ id: todo.id, updates: { title } });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" defaultValue={todo.title} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

---

## Error Handling

### Basic Error Handling

```typescript
function CreateTodoForm() {
  const { mutate, isError, error, reset } = useMutation({
    mutationFn: createTodo,
    onError: (error: Error) => {
      console.error('Mutation failed:', error);
    },
  });

  return (
    <div>
      {isError && (
        <div className="error">
          <p>Error: {error.message}</p>
          <button onClick={reset}>Dismiss</button>
        </div>
      )}
      {/* ... */}
    </div>
  );
}
```

### Retry on Error

```typescript
function CreateTodoForm() {
  const { mutate } = useMutation({
    mutationFn: createTodo,
    retry: 3, // Retry 3 times on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return <div>{/* ... */}</div>;
}
```

### Custom Error Handling

```typescript
interface ApiError extends Error {
  status: number;
  code: string;
}

function CreateTodoForm() {
  const { mutate } = useMutation({
    mutationFn: createTodo,
    onError: (error: ApiError) => {
      if (error.status === 401) {
        // Redirect to login
        window.location.href = '/login';
      } else if (error.status === 429) {
        alert('Too many requests. Please try again later.');
      } else {
        alert(`Error: ${error.message}`);
      }
    },
  });

  return <div>{/* ... */}</div>;
}
```

---

## mutate vs mutateAsync

### mutate (Callback-based)

```typescript
function TodoForm() {
  const { mutate } = useMutation({
    mutationFn: createTodo,
  });

  function handleSubmit(data: CreateTodoInput) {
    mutate(data, {
      onSuccess: (newTodo) => {
        console.log('Created:', newTodo);
      },
      onError: (error) => {
        console.error('Failed:', error);
      },
    });
  }

  return <div>{/* ... */}</div>;
}
```

### mutateAsync (Promise-based)

```typescript
function TodoForm() {
  const { mutateAsync } = useMutation({
    mutationFn: createTodo,
  });

  async function handleSubmit(data: CreateTodoInput) {
    try {
      const newTodo = await mutateAsync(data);
      console.log('Created:', newTodo);
      
      // Do something else after success
      navigate(`/todos/${newTodo.id}`);
    } catch (error) {
      console.error('Failed:', error);
    }
  }

  return <div>{/* ... */}</div>;
}
```

---

## TypeScript Patterns

### Typed Mutation

```typescript
import { useMutation, UseMutationResult } from '@tanstack/react-query';

interface CreateTodoInput {
  title: string;
  description?: string;
}

interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface ApiError {
  message: string;
  code: string;
}

function useCreateTodo(): UseMutationResult<Todo, ApiError, CreateTodoInput> {
  return useMutation<Todo, ApiError, CreateTodoInput>({
    mutationFn: async (input) => {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      
      return response.json();
    },
  });
}

// Usage
function CreateTodoForm() {
  const { mutate, data, error } = useCreateTodo();
  // data is typed as Todo
  // error is typed as ApiError
  
  return <div>{/* ... */}</div>;
}
```

### Generic Mutation Hook

```typescript
function useApiMutation<TData, TVariables>(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST'
) {
  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variables),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${method} ${url}`);
      }
      
      return response.json();
    },
  });
}

// Usage
function CreateTodoForm() {
  const { mutate } = useApiMutation<Todo, CreateTodoInput>(
    '/api/todos',
    'POST'
  );
  
  return <div>{/* ... */}</div>;
}
```

---

## Best Practices

### ✅ Do's

1. **Invalidate related queries after mutations**:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['todos'] });
}
```

2. **Use optimistic updates for better UX**:
```typescript
onMutate: async (newData) => {
  await queryClient.cancelQueries({ queryKey: ['todos'] });
  const previous = queryClient.getQueryData(['todos']);
  queryClient.setQueryData(['todos'], newData);
  return { previous };
}
```

3. **Handle errors gracefully**:
```typescript
onError: (error, variables, context) => {
  if (context?.previous) {
    queryClient.setQueryData(['todos'], context.previous);
  }
  showErrorToast(error.message);
}
```

4. **Use TypeScript for type safety**:
```typescript
useMutation<Todo, Error, CreateTodoInput>({ /* ... */ });
```

### ❌ Don'ts

1. **Don't forget to invalidate queries**:
```typescript
// ❌ Bad - stale data
onSuccess: () => {}

// ✅ Good - fresh data
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['todos'] });
}
```

2. **Don't ignore rollback on error**:
```typescript
// ❌ Bad - optimistic update stays on error
onMutate: async () => {
  queryClient.setQueryData(['todos'], newData);
}

// ✅ Good - rollback on error
onError: (error, variables, context) => {
  queryClient.setQueryData(['todos'], context.previous);
}
```

3. **Don't use mutateAsync without try/catch**:
```typescript
// ❌ Bad - unhandled promise rejection
async function handleSubmit() {
  const result = await mutateAsync(data);
}

// ✅ Good - handle errors
async function handleSubmit() {
  try {
    const result = await mutateAsync(data);
  } catch (error) {
    console.error(error);
  }
}
```

---

## Summary

- `useMutation` handles create, update, and delete operations
- Use lifecycle callbacks: `onMutate`, `onSuccess`, `onError`, `onSettled`
- Invalidate queries to refetch updated data
- Update cache directly for instant UI updates
- Implement optimistic updates for better UX
- Always handle errors and rollback on failure
- Use TypeScript for type-safe mutations
- Choose `mutate` (callbacks) or `mutateAsync` (promises) based on your needs

---

## Next Steps

- [Axios Integration](./04_axios_integration.md) - Using Axios with React Query
- [Query Patterns](./05_patterns.md) - Advanced patterns and best practices
- [Error Handling](../07_clean_code/03_error_handling.md) - Error handling patterns
