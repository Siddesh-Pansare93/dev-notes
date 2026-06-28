# Axios Integration with TanStack Query

## What You'll Learn

- How to integrate Axios with TanStack Query
- Creating reusable Axios query and mutation functions
- Error handling with Axios interceptors
- Authentication and headers management
- Request cancellation
- TypeScript patterns for type-safe API calls

---

## Setup

### Install Dependencies

```bash
npm install @tanstack/react-query axios
```

### Basic Axios Instance

```typescript
// lib/axios.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});
```

---

## Basic Integration

### Simple Query with Axios

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

interface User {
  id: string;
  name: string;
  email: string;
}

function UserProfile({ userId }: { userId: string }) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await api.get<User>(`/users/${userId}`);
      return response.data;
    },
  });

  if (isPending) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
    </div>
  );
}
```

### Simple Mutation with Axios

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

interface CreateUserInput {
  name: string;
  email: string;
}

function CreateUserForm() {
  const queryClient = useQueryClient();
  
  const { mutate, isPending } = useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const response = await api.post<User>('/users', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

---

## Axios Interceptors

### Request Interceptor (Authentication)

```typescript
// lib/axios.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

### Response Interceptor (Error Handling)

```typescript
// lib/axios.ts
import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Handle response errors globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      switch (error.response.status) {
        case 401:
          // Unauthorized - redirect to login
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          break;
        case 403:
          // Forbidden
          console.error('Access denied');
          break;
        case 404:
          // Not found
          console.error('Resource not found');
          break;
        case 500:
          // Server error
          console.error('Server error');
          break;
      }
    } else if (error.request) {
      // Request made but no response
      console.error('Network error');
    }
    
    return Promise.reject(error);
  }
);
```

### Retry with Exponential Backoff

```typescript
// lib/axios.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig & { retryCount?: number };
    
    // Only retry on network errors or 5xx errors
    const shouldRetry =
      !error.response || (error.response.status >= 500 && error.response.status < 600);
    
    if (shouldRetry && config && (!config.retryCount || config.retryCount < MAX_RETRIES)) {
      config.retryCount = (config.retryCount || 0) + 1;
      
      // Exponential backoff
      const delay = RETRY_DELAY * Math.pow(2, config.retryCount - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      return api.request(config);
    }
    
    return Promise.reject(error);
  }
);
```

---

## Reusable API Functions

### API Service Layer

```typescript
// services/userService.ts
import { api } from '@/lib/axios';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  avatar?: string;
}

export const userService = {
  // Get all users
  getAll: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users');
    return response.data;
  },
  
  // Get user by ID
  getById: async (id: string): Promise<User> => {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },
  
  // Create user
  create: async (input: CreateUserInput): Promise<User> => {
    const response = await api.post<User>('/users', input);
    return response.data;
  },
  
  // Update user
  update: async (id: string, input: UpdateUserInput): Promise<User> => {
    const response = await api.patch<User>(`/users/${id}`, input);
    return response.data;
  },
  
  // Delete user
  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
```

### Using API Service with React Query

```typescript
// hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/userService';

// Get all users
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: userService.getAll,
  });
}

// Get single user
export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => userService.getById(userId),
    enabled: !!userId,
  });
}

// Create user
export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: userService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Update user
export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      userService.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', data.id] });
    },
  });
}

// Delete user
export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: userService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

### Component Usage

```typescript
import { useUsers, useCreateUser, useDeleteUser } from '@/hooks/useUsers';

function UserList() {
  const { data: users, isPending } = useUsers();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();

  if (isPending) return <div>Loading...</div>;

  return (
    <div>
      <button
        onClick={() =>
          createUser.mutate({
            name: 'New User',
            email: 'new@example.com',
          })
        }
      >
        Add User
      </button>
      
      <ul>
        {users?.map((user) => (
          <li key={user.id}>
            {user.name}
            <button onClick={() => deleteUser.mutate(user.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Request Cancellation

### Automatic Cancellation with Axios

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import axios from 'axios';

function SearchResults({ query }: { query: string }) {
  const { data } = useQuery({
    queryKey: ['search', query],
    queryFn: async ({ signal }) => {
      const response = await api.get('/search', {
        params: { q: query },
        signal, // Pass abort signal to axios
      });
      return response.data;
    },
    enabled: query.length > 0,
  });

  return <div>{/* ... */}</div>;
}
```

### Manual Cancellation

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

function DataFetcher() {
  const queryClient = useQueryClient();
  
  const { data, isFetching } = useQuery({
    queryKey: ['data'],
    queryFn: async ({ signal }) => {
      const response = await api.get('/data', { signal });
      return response.data;
    },
  });

  function handleCancel() {
    // Cancel all queries with this key
    queryClient.cancelQueries({ queryKey: ['data'] });
  }

  return (
    <div>
      {isFetching && <button onClick={handleCancel}>Cancel</button>}
      {/* ... */}
    </div>
  );
}
```

---

## Error Handling

### Custom Error Type

```typescript
// types/errors.ts
import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  code: string;
  status: number;
  errors?: Record<string, string[]>;
}

export function isApiError(error: unknown): error is AxiosError<ApiError> {
  return (error as AxiosError).isAxiosError === true;
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.response?.data?.message || error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unknown error occurred';
}
```

### Error Boundary Component

```typescript
import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/types/errors';

function UserProfile({ userId }: { userId: string }) {
  const { data, isError, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    },
    retry: (failureCount, error) => {
      // Don't retry on 404
      if (isApiError(error) && error.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });

  if (isError) {
    return (
      <div className="error">
        <h2>Error</h2>
        <p>{getErrorMessage(error)}</p>
      </div>
    );
  }

  return <div>{/* ... */}</div>;
}
```

---

## TypeScript Patterns

### Generic API Function

```typescript
// lib/api.ts
import { api } from './axios';
import { AxiosRequestConfig } from 'axios';

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<T>(url, config);
  return response.data;
}

export async function post<T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await api.post<T>(url, data, config);
  return response.data;
}

export async function put<T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await api.put<T>(url, data, config);
  return response.data;
}

export async function patch<T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await api.patch<T>(url, data, config);
  return response.data;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.delete<T>(url, config);
  return response.data;
}

// Usage
import { get, post } from '@/lib/api';

const users = await get<User[]>('/users');
const newUser = await post<User, CreateUserInput>('/users', { name: 'John' });
```

### Typed Query Hooks Factory

```typescript
// hooks/useApi.ts
import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { get, post, put, del } from '@/lib/api';

export function useGet<TData>(
  key: unknown[],
  url: string,
  options?: Omit<UseQueryOptions<TData, AxiosError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, AxiosError>({
    queryKey: key,
    queryFn: () => get<TData>(url),
    ...options,
  });
}

export function usePost<TData, TVariables>(
  url: string,
  options?: UseMutationOptions<TData, AxiosError, TVariables>
) {
  return useMutation<TData, AxiosError, TVariables>({
    mutationFn: (data: TVariables) => post<TData, TVariables>(url, data),
    ...options,
  });
}

// Usage
function UserList() {
  const { data: users } = useGet<User[]>(['users'], '/users');
  const createUser = usePost<User, CreateUserInput>('/users');
  
  return <div>{/* ... */}</div>;
}
```

---

## Best Practices

### ✅ Do's

1. **Create a centralized Axios instance**:
```typescript
// ✅ Good
export const api = axios.create({ baseURL: '/api' });
```

2. **Use interceptors for auth and errors**:
```typescript
// ✅ Good
api.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

3. **Create service layers**:
```typescript
// ✅ Good - Organized and reusable
export const userService = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
};
```

4. **Pass abort signals for cancellation**:
```typescript
// ✅ Good
queryFn: async ({ signal }) => {
  return api.get('/data', { signal });
}
```

5. **Use TypeScript generics**:
```typescript
// ✅ Good
const response = await api.get<User[]>('/users');
```

### ❌ Don'ts

1. **Don't make raw axios calls in components**:
```typescript
// ❌ Bad
const { data } = useQuery({
  queryKey: ['users'],
  queryFn: () => axios.get('http://localhost:3000/api/users'),
});

// ✅ Good
const { data } = useQuery({
  queryKey: ['users'],
  queryFn: userService.getAll,
});
```

2. **Don't ignore error handling**:
```typescript
// ❌ Bad
const { data } = useQuery({ queryKey, queryFn });

// ✅ Good
const { data, isError, error } = useQuery({ queryKey, queryFn });
if (isError) handleError(error);
```

3. **Don't hardcode URLs**:
```typescript
// ❌ Bad
axios.get('http://localhost:3000/api/users')

// ✅ Good
api.get('/users') // baseURL configured in instance
```

---

## Summary

- Create a centralized Axios instance with baseURL and default headers
- Use interceptors for authentication, error handling, and retries
- Build service layers to encapsulate API logic
- Pass abort signals to Axios for request cancellation
- Handle errors with custom error types and boundaries
- Use TypeScript generics for type-safe API calls
- Create reusable hooks that combine Axios and React Query

---

## Next Steps

- [Query Patterns](./05_patterns.md) - Advanced patterns and best practices
- [Error Handling](../07_clean_code/03_error_handling.md) - Comprehensive error handling
- [TypeScript Patterns](../06_typescript_patterns/01_props_patterns.md)
