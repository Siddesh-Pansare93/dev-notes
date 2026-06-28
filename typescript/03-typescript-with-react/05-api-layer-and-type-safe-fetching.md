# API Layer and Type-Safe Fetching

## What You'll Learn

- Building a typed fetch wrapper with proper error handling
- Configuring an axios instance with generics and interceptors
- Using TanStack Query (React Query) with full TypeScript support
- Generating types from API schemas (OpenAPI / Swagger)
- Typed error handling patterns for API responses
- Optimistic updates with proper typing

---

## Typed Fetch Wrapper

The built-in `fetch` API returns `any` from `.json()`. A typed wrapper fixes this and centralizes error handling.

```tsx
// api/client.ts

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: unknown
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

interface RequestConfig extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

async function apiClient<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { body, params, headers: customHeaders, ...restConfig } = config;

  // Build query string from params
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  // Get auth token
  const token = localStorage.getItem("auth_token");

  const response = await fetch(url.toString(), {
    ...restConfig,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...customHeaders,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new ApiError(response.status, response.statusText, errorData);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// Convenience methods
const api = {
  get: <T>(endpoint: string, params?: RequestConfig["params"]) =>
    apiClient<T>(endpoint, { method: "GET", params }),

  post: <T>(endpoint: string, body: unknown) =>
    apiClient<T>(endpoint, { method: "POST", body }),

  put: <T>(endpoint: string, body: unknown) =>
    apiClient<T>(endpoint, { method: "PUT", body }),

  patch: <T>(endpoint: string, body: unknown) =>
    apiClient<T>(endpoint, { method: "PATCH", body }),

  delete: <T = void>(endpoint: string) =>
    apiClient<T>(endpoint, { method: "DELETE" }),
};

export { api, ApiError };
```

### Using the Typed API Client

```tsx
// api/types.ts
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface CreateUserPayload {
  name: string;
  email: string;
  role: User["role"];
}

// api/users.ts
const usersApi = {
  list: (page = 1, pageSize = 20) =>
    api.get<PaginatedResponse<User>>("/users", { page, pageSize }),

  getById: (id: string) =>
    api.get<User>(`/users/${id}`),

  create: (payload: CreateUserPayload) =>
    api.post<User>("/users", payload),

  update: (id: string, payload: Partial<CreateUserPayload>) =>
    api.patch<User>(`/users/${id}`, payload),

  delete: (id: string) =>
    api.delete(`/users/${id}`),
};
```

> **Coming from JS:** In JavaScript, `fetch("/api/users").then(r => r.json())` gives you an implicit `any`. You have to "just know" the shape. With a typed wrapper, `api.get<User[]>("/users")` guarantees the resolved value is `User[]`. Every `.then()` or `await` downstream gets full autocomplete.

---

## Axios Instance with Generics and Interceptors

If your project uses axios, the typing story is similar but with built-in interceptor support.

```tsx
// api/axios-client.ts
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

// Typed error response from your API
interface ApiErrorResponse {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}

const axiosClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach auth token
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 globally
axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }

    // Transform to a consistent error shape
    const apiError = error.response?.data;
    const enhancedError = new Error(
      apiError?.message || error.message || "An unexpected error occurred"
    );

    return Promise.reject(enhancedError);
  }
);

// Typed API methods
const axiosApi = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    axiosClient.get<T>(url, { params }).then((res) => res.data),

  post: <T>(url: string, data: unknown) =>
    axiosClient.post<T>(url, data).then((res) => res.data),

  put: <T>(url: string, data: unknown) =>
    axiosClient.put<T>(url, data).then((res) => res.data),

  patch: <T>(url: string, data: unknown) =>
    axiosClient.patch<T>(url, data).then((res) => res.data),

  delete: <T = void>(url: string) =>
    axiosClient.delete<T>(url).then((res) => res.data),
};

export { axiosApi, axiosClient };
export type { ApiErrorResponse };
```

---

## TanStack Query (React Query) with TypeScript

TanStack Query is the standard for server state management in React. Its TypeScript support is excellent.

### Basic Typed Queries

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// The generic parameters for useQuery:
// useQuery<TData, TError, TSelect>

function useUsers(page: number = 1) {
  return useQuery({
    queryKey: ["users", { page }],
    queryFn: () => usersApi.list(page),
    // TData is inferred from queryFn return: PaginatedResponse<User>
  });
}

function useUser(id: string) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id, // only fetch when id is truthy
  });
}

// Usage in a component
function UserList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useUsers(page);
  // data is PaginatedResponse<User> | undefined
  // error is Error | null

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!data) return null;

  return (
    <div>
      {data.data.map((user) => (
        // user is fully typed as User
        <div key={user.id}>
          <span>{user.name}</span>
          <span>{user.email}</span>
          <span className="badge">{user.role}</span>
        </div>
      ))}

      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>Page {data.page} of {data.totalPages}</span>
        <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
```

### Typed Mutations

```tsx
function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    // TData = User (return type), TError = Error, TVariables = CreateUserPayload
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),

    onSuccess: (newUser) => {
      // newUser is typed as User
      console.log("Created user:", newUser.name);

      // Invalidate the users list so it refetches
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },

    onError: (error) => {
      // error is typed as Error
      console.error("Failed to create user:", error.message);
    },
  });
}

function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => usersApi.delete(userId),

    onSuccess: (_data, userId) => {
      // _data is void, userId is string (the variables passed to mutate)
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.removeQueries({ queryKey: ["users", userId] });
    },
  });
}

// Usage
function CreateUserForm() {
  const createUser = useCreateUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate(
      { name, email, role: "viewer" },
      // Per-call callbacks (in addition to the ones in useMutation)
      {
        onSuccess: () => {
          setName("");
          setEmail("");
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <button type="submit" disabled={createUser.isPending}>
        {createUser.isPending ? "Creating..." : "Create User"}
      </button>
      {createUser.isError && (
        <p className="error">{createUser.error.message}</p>
      )}
    </form>
  );
}
```

> **Coming from JS:** TanStack Query in JavaScript gives you caching, refetching, and loading states for free. With TypeScript, you additionally get compile-time safety: `data` is the exact shape your API returns, `error` is typed, and `mutate` only accepts the correct payload shape. The generic inference from `queryFn` means you rarely need to write type annotations manually.

---

## Typed Error Handling Patterns

Real APIs return different error shapes. TypeScript can model this precisely.

```tsx
// Error types for different scenarios
interface ValidationError {
  type: "VALIDATION";
  message: string;
  fields: Record<string, string[]>;
}

interface AuthenticationError {
  type: "AUTHENTICATION";
  message: string;
}

interface NotFoundError {
  type: "NOT_FOUND";
  message: string;
  resource: string;
  resourceId: string;
}

interface ServerError {
  type: "SERVER";
  message: string;
  traceId?: string;
}

type AppError = ValidationError | AuthenticationError | NotFoundError | ServerError;

// Parse API errors into typed errors
function parseApiError(error: unknown): AppError {
  if (error instanceof ApiError) {
    const data = error.data as Record<string, unknown> | null;

    switch (error.status) {
      case 400:
        return {
          type: "VALIDATION",
          message: (data?.message as string) || "Validation failed",
          fields: (data?.fields as Record<string, string[]>) || {},
        };
      case 401:
      case 403:
        return {
          type: "AUTHENTICATION",
          message: (data?.message as string) || "Authentication required",
        };
      case 404:
        return {
          type: "NOT_FOUND",
          message: (data?.message as string) || "Resource not found",
          resource: (data?.resource as string) || "unknown",
          resourceId: (data?.resourceId as string) || "unknown",
        };
      default:
        return {
          type: "SERVER",
          message: (data?.message as string) || "An unexpected error occurred",
          traceId: data?.traceId as string | undefined,
        };
    }
  }

  return {
    type: "SERVER",
    message: error instanceof Error ? error.message : "An unexpected error occurred",
  };
}

// A component that renders different UI per error type
function ErrorDisplay({ error }: { error: AppError }) {
  switch (error.type) {
    case "VALIDATION":
      return (
        <div className="error error-validation">
          <p>{error.message}</p>
          <ul>
            {Object.entries(error.fields).map(([field, messages]) => (
              <li key={field}>
                <strong>{field}:</strong> {messages.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      );

    case "AUTHENTICATION":
      return (
        <div className="error error-auth">
          <p>{error.message}</p>
          <a href="/login">Go to login</a>
        </div>
      );

    case "NOT_FOUND":
      return (
        <div className="error error-not-found">
          <p>{error.message}</p>
          <p>Could not find {error.resource} with ID {error.resourceId}</p>
        </div>
      );

    case "SERVER":
      return (
        <div className="error error-server">
          <p>{error.message}</p>
          {error.traceId && (
            <p className="trace">Reference: {error.traceId}</p>
          )}
        </div>
      );
  }
}
```

---

## Optimistic Updates with Proper Typing

Optimistic updates show changes immediately before the server confirms them. TanStack Query makes this straightforward, and TypeScript ensures you do not corrupt the cache.

```tsx
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  userId: string;
}

function useToggleTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (todo: Todo) =>
      api.patch<Todo>(`/todos/${todo.id}`, {
        completed: !todo.completed,
      }),

    // Called before the mutation function fires
    onMutate: async (toggledTodo: Todo) => {
      // Cancel any outgoing refetches so they do not overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["todos"] });

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData<Todo[]>(["todos"]);

      // Optimistically update the cache
      queryClient.setQueryData<Todo[]>(["todos"], (old) =>
        old?.map((todo) =>
          todo.id === toggledTodo.id
            ? { ...todo, completed: !todo.completed }
            : todo
        )
      );

      // Return the snapshot so we can rollback on error
      return { previousTodos };
    },

    // If the mutation fails, roll back to the snapshot
    onError: (_error, _todo, context) => {
      // context is typed as { previousTodos: Todo[] | undefined } | undefined
      if (context?.previousTodos) {
        queryClient.setQueryData<Todo[]>(["todos"], context.previousTodos);
      }
    },

    // Always refetch after success or error to stay in sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

// Optimistic add with typed cache manipulation
function useAddTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title: string) =>
      api.post<Todo>("/todos", { title, completed: false }),

    onMutate: async (newTitle: string) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });

      const previousTodos = queryClient.getQueryData<Todo[]>(["todos"]);

      // Create an optimistic todo with a temporary ID
      const optimisticTodo: Todo = {
        id: `temp-${Date.now()}`,
        title: newTitle,
        completed: false,
        userId: "current-user",
      };

      queryClient.setQueryData<Todo[]>(["todos"], (old) =>
        old ? [...old, optimisticTodo] : [optimisticTodo]
      );

      return { previousTodos, optimisticTodo };
    },

    onSuccess: (serverTodo, _variables, context) => {
      // Replace the optimistic todo with the real one from the server
      queryClient.setQueryData<Todo[]>(["todos"], (old) =>
        old?.map((todo) =>
          todo.id === context?.optimisticTodo.id ? serverTodo : todo
        )
      );
    },

    onError: (_error, _variables, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData<Todo[]>(["todos"], context.previousTodos);
      }
    },
  });
}
```

---

## Generating Types from API Schemas

Instead of manually defining types, you can generate them from your API specification.

### From OpenAPI / Swagger

```bash
# Install the generator
npm install -D openapi-typescript

# Generate types from a remote or local schema
npx openapi-typescript https://api.example.com/openapi.json -o src/api/schema.d.ts

# Or from a local file
npx openapi-typescript ./openapi.yaml -o src/api/schema.d.ts
```

The generated file gives you types for every endpoint's request and response:

```tsx
// Generated types (simplified example of what openapi-typescript produces)
interface paths {
  "/users": {
    get: {
      parameters: {
        query: { page?: number; pageSize?: number };
      };
      responses: {
        200: {
          content: {
            "application/json": PaginatedResponse<User>;
          };
        };
      };
    };
    post: {
      requestBody: {
        content: {
          "application/json": CreateUserPayload;
        };
      };
      responses: {
        201: {
          content: {
            "application/json": User;
          };
        };
      };
    };
  };
}

// Using generated types with a typed fetch client
import createClient from "openapi-fetch";
import type { paths } from "./schema";

const client = createClient<paths>({ baseUrl: "https://api.example.com" });

// Fully typed: params, body, and response are all inferred from the schema
const { data, error } = await client.GET("/users", {
  params: { query: { page: 1, pageSize: 20 } },
});
// data is PaginatedResponse<User>

const { data: newUser } = await client.POST("/users", {
  body: { name: "Alice", email: "alice@example.com", role: "editor" },
});
// newUser is User
```

> **Coming from JS:** Type generation closes the loop between your backend and frontend. When the API schema changes, you regenerate types and TypeScript immediately flags every frontend location that needs updating. This is a massive productivity boost over manually keeping types in sync or, worse, discovering mismatches at runtime.

---

## Putting It All Together: A Complete API Layer

Here is how all these pieces fit together in a real project structure.

```
src/
  api/
    client.ts          # Base fetch/axios client
    schema.d.ts        # Generated types from OpenAPI
    errors.ts          # Typed error classes and parser
    users.ts           # User-specific API functions
    products.ts        # Product-specific API functions
  hooks/
    useUsers.ts        # TanStack Query hooks for users
    useProducts.ts     # TanStack Query hooks for products
  components/
    UserList.tsx       # Uses useUsers hook
    ProductGrid.tsx    # Uses useProducts hook
```

```tsx
// hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/users";
import { parseApiError, AppError } from "../api/errors";
import type { User, CreateUserPayload, PaginatedResponse } from "../api/schema";

// Query key factory -- keeps keys consistent
const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (page: number) => [...userKeys.lists(), { page }] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

export function useUsers(page: number = 1) {
  return useQuery({
    queryKey: userKeys.list(page),
    queryFn: () => usersApi.list(page),
    placeholderData: (previousData) => previousData, // keep showing old data while new page loads
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<CreateUserPayload>) =>
      usersApi.update(id, payload),
    onSuccess: (updatedUser) => {
      // Update the detail cache directly
      queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser);
      // Invalidate the list so it refetches
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.delete,
    onSuccess: (_data, deletedUserId) => {
      queryClient.removeQueries({ queryKey: userKeys.detail(deletedUserId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
```

```tsx
// Complete page component using the hooks
function UsersPage() {
  const [page, setPage] = useState(1);
  const usersQuery = useUsers(page);
  const deleteUser = useDeleteUser();

  const handleDelete = (userId: string) => {
    if (window.confirm("Are you sure?")) {
      deleteUser.mutate(userId);
    }
  };

  if (usersQuery.isLoading) return <PageSkeleton />;
  if (usersQuery.isError) {
    const appError = parseApiError(usersQuery.error);
    return <ErrorDisplay error={appError} />;
  }

  const { data: users, total, totalPages } = usersQuery.data!;

  return (
    <div>
      <h1>Users ({total})</h1>

      <DataTable
        data={users}
        columns={[
          { key: "name", header: "Name", render: (u) => u.name, sortable: true },
          { key: "email", header: "Email", render: (u) => u.email },
          { key: "role", header: "Role", render: (u) => <RoleBadge role={u.role} /> },
          {
            key: "actions",
            header: "",
            render: (u) => (
              <button onClick={() => handleDelete(u.id)} disabled={deleteUser.isPending}>
                Delete
              </button>
            ),
          },
        ]}
        keyExtractor={(u) => u.id}
      />

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
```

> **Coming from JS:** This layered architecture (client -> api functions -> hooks -> components) works in JavaScript too, but TypeScript makes the boundaries airtight. A change to the `User` type propagates through every layer, and the compiler tells you exactly what broke. In a large codebase, this is the difference between a 5-minute refactor and a day-long bug hunt.

---

## Mini-Exercise

Build a complete typed API layer for a blog application:

1. Define types for `Post` (id, title, body, authorId, createdAt, tags: string[]) and `Comment` (id, postId, authorName, body, createdAt).

2. Create a typed API client with `postsApi.list()`, `postsApi.getById(id)`, `postsApi.create(payload)`, and `commentsApi.listByPost(postId)`, `commentsApi.create(postId, payload)`.

3. Write TanStack Query hooks: `usePosts()`, `usePost(id)`, `useCreatePost()`, `useComments(postId)`, and `useCreateComment()`.

4. Implement an optimistic update for `useCreateComment()` -- when a user adds a comment, show it immediately in the list before the server responds, and rollback on failure.

5. Create a query key factory (like `userKeys` above) for both posts and comments.

Make sure every function has proper types and that you never use `any`. The goal is end-to-end type safety from the API call to the rendered component.
