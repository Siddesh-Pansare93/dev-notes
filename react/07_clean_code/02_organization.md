# File and Folder Organization

Learn best practices for organizing React projects for scalability and maintainability.

## What You'll Learn

- Project structure patterns
- Feature-based organization
- Naming conventions
- File colocation strategies
- Barrel exports
- Scalable architecture
- Module organization

## 1. Recommended Project Structure

### Feature-Based Structure (Recommended)

```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── AuthGuard.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useSession.ts
│   │   ├── api/
│   │   │   └── authApi.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   ├── utils/
│   │   │   └── validation.ts
│   │   └── index.ts
│   │
│   ├── products/
│   │   ├── components/
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   └── ProductFilters.tsx
│   │   ├── hooks/
│   │   │   ├── useProducts.ts
│   │   │   └── useProductFilters.ts
│   │   ├── api/
│   │   │   └── productsApi.ts
│   │   ├── stores/
│   │   │   └── productsStore.ts
│   │   ├── types/
│   │   │   └── product.types.ts
│   │   └── index.ts
│   │
│   └── cart/
│       ├── components/
│       ├── hooks/
│       ├── stores/
│       └── index.ts
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── index.ts
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   └── MainLayout.tsx
│   └── common/
│       ├── ErrorBoundary.tsx
│       ├── Loading.tsx
│       └── NotFound.tsx
│
├── hooks/
│   ├── useLocalStorage.ts
│   ├── useDebounce.ts
│   ├── useMediaQuery.ts
│   └── index.ts
│
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   └── interceptors.ts
│   ├── queryClient.ts
│   └── utils.ts
│
├── types/
│   ├── api.types.ts
│   ├── common.types.ts
│   └── index.ts
│
├── config/
│   ├── env.ts
│   └── constants.ts
│
├── styles/
│   ├── globals.css
│   └── themes.css
│
├── App.tsx
└── main.tsx
```

### Alternative: Layered Structure

```
src/
├── presentation/
│   ├── pages/
│   ├── components/
│   └── layouts/
├── application/
│   ├── hooks/
│   ├── stores/
│   └── services/
├── domain/
│   ├── models/
│   └── types/
├── infrastructure/
│   ├── api/
│   └── persistence/
└── shared/
    ├── utils/
    └── constants/
```

## 2. Feature Module Pattern

### Complete Feature Module Example

```typescript
// features/users/index.ts (Barrel export)
export * from './components';
export * from './hooks';
export * from './types';
export { default as userApi } from './api/userApi';

// features/users/types/user.types.ts
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export type UserRole = 'admin' | 'user' | 'guest';

export interface UserFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

// features/users/api/userApi.ts
import { api } from '@/lib/api/client';
import type { User, UserFilters } from '../types';

export const userApi = {
  getAll: (filters?: UserFilters) =>
    api.get<User[]>('/users', { params: filters }),
  
  getById: (id: number) =>
    api.get<User>(`/users/${id}`),
  
  create: (data: Omit<User, 'id'>) =>
    api.post<User>('/users', data),
  
  update: (id: number, data: Partial<User>) =>
    api.put<User>(`/users/${id}`, data),
  
  delete: (id: number) =>
    api.delete(`/users/${id}`),
};

export default userApi;

// features/users/hooks/useUsers.ts
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/userApi';
import type { UserFilters } from '../types';

export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => userApi.getAll(filters),
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => userApi.getById(id),
    enabled: !!id,
  });
}

// features/users/components/UserList.tsx
import { useUsers } from '../hooks/useUsers';
import { UserCard } from './UserCard';

export function UserList() {
  const { data: users, isLoading } = useUsers();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="grid gap-4">
      {users?.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}

// features/users/components/index.ts
export { UserList } from './UserList';
export { UserCard } from './UserCard';
export { UserForm } from './UserForm';
```

## 3. Component Organization

### Component File Structure

```typescript
// components/ProductCard/ProductCard.tsx
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProductCardProps } from './ProductCard.types';
import { formatPrice } from './ProductCard.utils';
import styles from './ProductCard.module.css';

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);

  return (
    <Card className={styles.card}>
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{formatPrice(product.price)}</p>
      <Button onClick={() => onAddToCart(product, quantity)}>
        Add to Cart
      </Button>
    </Card>
  );
}

// components/ProductCard/ProductCard.types.ts
import type { Product } from '@/features/products/types';

export interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
}

// components/ProductCard/ProductCard.utils.ts
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

// components/ProductCard/ProductCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  it('renders product name', () => {
    // Test implementation
  });
});

// components/ProductCard/index.ts
export { ProductCard } from './ProductCard';
export type { ProductCardProps } from './ProductCard.types';
```

### Simplified Component (for simple components)

```typescript
// components/Badge.tsx
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'error';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded text-sm',
        {
          'bg-gray-100 text-gray-800': variant === 'default',
          'bg-green-100 text-green-800': variant === 'success',
          'bg-red-100 text-red-800': variant === 'error',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
```

## 4. Barrel Exports (index.ts)

### Feature Barrel Export

```typescript
// features/auth/index.ts
export { LoginForm } from './components/LoginForm';
export { RegisterForm } from './components/RegisterForm';
export { AuthGuard } from './components/AuthGuard';

export { useAuth } from './hooks/useAuth';
export { useSession } from './hooks/useSession';

export { authApi } from './api/authApi';

export type { User, AuthState, LoginCredentials } from './types';
```

### Component Barrel Export

```typescript
// components/ui/index.ts
export { Button } from './button';
export { Card, CardHeader, CardContent, CardFooter } from './card';
export { Input } from './input';
export { Select } from './select';
export { Dialog } from './dialog';

// Usage in other files
import { Button, Card, Input } from '@/components/ui';
```

### Hooks Barrel Export

```typescript
// hooks/index.ts
export { useLocalStorage } from './useLocalStorage';
export { useDebounce } from './useDebounce';
export { useMediaQuery } from './useMediaQuery';
export { useClickOutside } from './useClickOutside';
```

## 5. Path Aliases

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/features/*": ["./src/features/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/styles/*": ["./src/styles/*"]
    }
  }
}
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },
});
```

### Usage with Path Aliases

```typescript
// ❌ Avoid relative imports
import { Button } from '../../../components/ui/button';
import { useAuth } from '../../../features/auth/hooks/useAuth';

// ✅ Use path aliases
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth';
```

## 6. Naming Conventions

### File Naming

```
✅ Good:
- UserProfile.tsx          (PascalCase for components)
- useAuth.ts              (camelCase for hooks)
- authApi.ts              (camelCase for utilities)
- user.types.ts           (lowercase with .types suffix)
- Button.module.css       (PascalCase with .module suffix)

❌ Avoid:
- userprofile.tsx
- user-profile.tsx
- UseAuth.ts
- Auth_Api.ts
```

### Folder Naming

```
✅ Good:
- components/
- features/
- hooks/
- auth/
- user-settings/

❌ Avoid:
- Components/
- FEATURES/
- Auth_Module/
```

### Component Naming

```typescript
// ✅ Good: Descriptive, specific names
export function UserProfileCard() {}
export function ProductSearchFilters() {}
export function AuthenticationGuard() {}

// ❌ Avoid: Generic, vague names
export function Card() {}
export function Filters() {}
export function Guard() {}
```

## 7. Configuration Files

### Environment Configuration

```typescript
// config/env.ts
const env = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
} as const;

export default env;

// Usage
import env from '@/config/env';
console.log(env.API_URL);
```

### Constants

```typescript
// config/constants.ts
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  PRODUCTS: '/products',
  PRODUCT_DETAIL: (id: string | number) => `/products/${id}`,
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
  },
  USERS: {
    LIST: '/users',
    DETAIL: (id: string | number) => `/users/${id}`,
  },
} as const;

export const QUERY_KEYS = {
  USERS: 'users',
  PRODUCTS: 'products',
  AUTH: 'auth',
} as const;

// Usage
import { ROUTES, API_ENDPOINTS } from '@/config/constants';
navigate(ROUTES.DASHBOARD);
```

## 8. Types Organization

### Shared Types

```typescript
// types/common.types.ts
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
}
```

### API Types

```typescript
// types/api.types.ts
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface ApiRequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
}
```

## 9. Utility Organization

### Grouped by Purpose

```typescript
// lib/utils/string.utils.ts
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-');
}

// lib/utils/date.utils.ts
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US').format(date);
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// lib/utils/index.ts
export * from './string.utils';
export * from './date.utils';
export * from './validation.utils';
```

## Best Practices

### ✅ Do's

- Group related files by feature, not by type
- Use barrel exports (index.ts) for public APIs
- Keep component folders flat until they grow
- Colocate related files (components, hooks, types)
- Use path aliases to avoid relative import hell
- Follow consistent naming conventions
- Separate business logic from UI components
- Create a clear public API for each feature

### ❌ Don'ts

- Don't create deep nested folder structures
- Don't export everything - be intentional
- Don't mix feature code with shared code
- Don't create generic folders like "helpers" or "misc"
- Don't use index.tsx for components (use ComponentName.tsx)
- Don't scatter related files across the project
- Don't skip barrel exports for features
- Don't hardcode paths - use aliases

## Folder Structure Patterns

| Pattern | Use Case | Pros | Cons |
|---------|----------|------|------|
| **Feature-based** | Most apps | Clear boundaries, easy to navigate | Can duplicate code |
| **Layered** | Complex domains | Separation of concerns | More boilerplate |
| **Modular** | Microservices | Independent modules | Overhead for small apps |
| **Flat** | Small apps | Simple, fast | Doesn't scale well |

## Migration Strategy

### From Flat to Feature-Based

```typescript
// Before (flat structure)
src/
├── components/
│   ├── UserList.tsx
│   ├── UserCard.tsx
│   ├── ProductList.tsx
│   └── ProductCard.tsx
├── hooks/
│   ├── useUsers.ts
│   └── useProducts.ts

// After (feature-based)
src/
├── features/
│   ├── users/
│   │   ├── components/
│   │   │   ├── UserList.tsx
│   │   │   └── UserCard.tsx
│   │   ├── hooks/
│   │   │   └── useUsers.ts
│   │   └── index.ts
│   └── products/
│       ├── components/
│       │   ├── ProductList.tsx
│       │   └── ProductCard.tsx
│       ├── hooks/
│       │   └── useProducts.ts
│       └── index.ts
```

## Next Steps

- **[Error Handling](./03_error_handling.md)** - Handle errors gracefully
- **[Testing](./04_testing.md)** - Test your organized codebase
- **[Performance](./05_performance.md)** - Optimize your architecture
- **[Component Design](./01_component_design.md)** - Review design principles
