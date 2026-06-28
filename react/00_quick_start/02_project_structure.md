# Project Structure Best Practices

Learn how to organize your React + TypeScript project for scalability and maintainability.

## What You'll Learn

- Industry-standard folder structures
- File naming conventions
- Component organization strategies
- Separation of concerns

## Recommended Project Structure

```
src/
├── assets/              # Static files (images, fonts, etc.)
│   ├── images/
│   └── fonts/
├── components/          # Reusable components
│   ├── ui/             # Basic UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   └── layout/         # Layout components
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── Sidebar.tsx
├── features/           # Feature-based modules
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types.ts
│   └── products/
│       ├── components/
│       ├── hooks/
│       ├── api/
│       └── types.ts
├── hooks/              # Shared custom hooks
│   ├── useAuth.ts
│   ├── useDebounce.ts
│   └── useLocalStorage.ts
├── store/              # State management
│   ├── authStore.ts
│   ├── cartStore.ts
│   └── index.ts
├── services/           # API services
│   ├── api.ts
│   ├── authService.ts
│   └── productService.ts
├── utils/              # Utility functions
│   ├── formatters.ts
│   ├── validators.ts
│   └── constants.ts
├── types/              # Shared TypeScript types
│   ├── api.types.ts
│   ├── user.types.ts
│   └── index.ts
├── pages/              # Page components (if using routing)
│   ├── Home.tsx
│   ├── About.tsx
│   └── NotFound.tsx
├── App.tsx             # Root component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## File Naming Conventions

### Components

```typescript
// PascalCase for component files
Button.tsx
UserProfile.tsx
ProductCard.tsx

// Example: Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};
```

### Hooks

```typescript
// camelCase with 'use' prefix
useAuth.ts
useDebounce.ts
useLocalStorage.ts

// Example: useDebounce.ts
export const useDebounce = <T,>(value: T, delay: number): T => {
  // Hook implementation
};
```

### Utilities

```typescript
// camelCase for utility files
formatters.ts
validators.ts
helpers.ts
```

### Types

```typescript
// camelCase with .types.ts suffix
user.types.ts
api.types.ts
```

## Feature-Based Organization

Organize by feature for larger applications:

```
src/features/
├── auth/
│   ├── components/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── PasswordReset.tsx
│   ├── hooks/
│   │   ├── useLogin.ts
│   │   └── useAuth.ts
│   ├── api/
│   │   └── authApi.ts
│   ├── store/
│   │   └── authStore.ts
│   ├── types.ts
│   └── index.ts        # Public exports
└── products/
    ├── components/
    │   ├── ProductList.tsx
    │   ├── ProductCard.tsx
    │   └── ProductDetails.tsx
    ├── hooks/
    │   └── useProducts.ts
    ├── api/
    │   └── productsApi.ts
    ├── types.ts
    └── index.ts
```

### Feature Module Example

```typescript
// features/auth/types.ts
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// features/auth/api/authApi.ts
import axios from 'axios';
import { User, LoginCredentials } from '../types';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<User> => {
    const response = await axios.post('/api/login', credentials);
    return response.data;
  },
  logout: async (): Promise<void> => {
    await axios.post('/api/logout');
  },
};

// features/auth/hooks/useLogin.ts
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { LoginCredentials } from '../types';

export const useLogin = () => {
  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
  });
};

// features/auth/components/LoginForm.tsx
import { useLogin } from '../hooks/useLogin';

export const LoginForm = () => {
  const { mutate, isPending } = useLogin();
  
  // Component implementation
};

// features/auth/index.ts (Public API)
export { LoginForm, RegisterForm } from './components';
export { useLogin, useAuth } from './hooks';
export type { User, LoginCredentials } from './types';
```

## Component Organization Patterns

### 1. Co-located Styles

```typescript
// Button/
├── Button.tsx
├── Button.module.css
└── index.ts
```

### 2. Component with Subcomponents

```typescript
// Card/
├── Card.tsx
├── CardHeader.tsx
├── CardBody.tsx
├── CardFooter.tsx
└── index.ts

// Card/index.ts
export { Card } from './Card';
export { CardHeader } from './CardHeader';
export { CardBody } from './CardBody';
export { CardFooter } from './CardFooter';

// Usage
import { Card, CardHeader, CardBody } from '@/components/Card';
```

### 3. Component with Tests

```typescript
// Button/
├── Button.tsx
├── Button.test.tsx
└── index.ts
```

## Path Aliases

Configure path aliases in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/types/*": ["./src/types/*"],
      "@/store/*": ["./src/store/*"]
    }
  }
}
```

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Usage:

```typescript
// Instead of: import { Button } from '../../../../components/ui/Button'
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/utils/formatters';
```

## Environment Variables

```
.env                # Committed defaults
.env.local          # Local overrides (gitignored)
.env.development    # Development environment
.env.production     # Production environment
```

```bash
# .env
VITE_API_URL=https://api.example.com
VITE_APP_NAME=My React App
```

```typescript
// src/config/env.ts
export const env = {
  apiUrl: import.meta.env.VITE_API_URL,
  appName: import.meta.env.VITE_APP_NAME,
} as const;

// Usage
import { env } from '@/config/env';
console.log(env.apiUrl);
```

## Index Files for Clean Imports

```typescript
// components/ui/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Card } from './Card';

// Usage - Single import statement
import { Button, Input, Card } from '@/components/ui';
```

## Constants and Configuration

```typescript
// utils/constants.ts
export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  PRODUCTS: '/api/products',
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
} as const;

export const CONFIG = {
  PAGE_SIZE: 20,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
} as const;
```

## Type Definitions

```typescript
// types/index.ts
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Global type augmentation
declare global {
  interface Window {
    __INITIAL_STATE__?: Record<string, unknown>;
  }
}
```

## Best Practices

1. **Keep It Simple**: Start simple, add complexity only when needed
2. **Consistent Naming**: Use consistent naming conventions throughout
3. **Colocation**: Keep related files close together
4. **Single Responsibility**: Each file should have one clear purpose
5. **Public APIs**: Use index files to control what's exported
6. **Type Safety**: Define types close to where they're used
7. **Avoid Deep Nesting**: Maximum 3-4 levels of folders

## Anti-Patterns to Avoid

```typescript
// ❌ Don't: Generic names without context
utils.ts
helpers.ts
functions.ts

// ✅ Do: Specific, descriptive names
dateUtils.ts
stringHelpers.ts
validationFunctions.ts

// ❌ Don't: Everything in one file
AllComponents.tsx

// ✅ Do: Separate files per component
Button.tsx
Input.tsx
Card.tsx
```

## Next Steps

- [Your First Component](./03_first_component.md)
- [useState - Managing Component State](../01_core_hooks/01_useState.md)

## Summary

A well-organized project structure:
- ✅ Makes code easier to find and maintain
- ✅ Scales with your application
- ✅ Improves team collaboration
- ✅ Follows industry standards
