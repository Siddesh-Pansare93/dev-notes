# Testing React Applications

Comprehensive guide to testing React components, hooks, and applications using modern testing tools and best practices.

## What You'll Learn

- Vitest setup and configuration
- React Testing Library fundamentals
- Component testing patterns
- Hook testing strategies
- Integration testing
- Mocking APIs and modules
- Test coverage
- Testing best practices

---

## 1. Setup

### Install Dependencies

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Vitest Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/',
        'src/main.tsx',
      ],
    },
  },
});
```

### Test Setup File

```typescript
// src/test/setup.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Clean up after each test
afterEach(() => {
  cleanup();
});
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

## 2. Component Testing Basics

### Simple Component Test

```typescript
// src/components/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false 
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
}
```

```typescript
// src/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct variant class', () => {
    render(<Button variant="secondary">Click me</Button>);
    expect(screen.getByText('Click me')).toHaveClass('btn-secondary');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick} disabled>Click me</Button>);
    
    await user.click(screen.getByText('Click me'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
```

---

## 3. Testing with User Interactions

### Form Testing

```typescript
// src/components/LoginForm.tsx
import { useState } from 'react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit">Login</button>
    </form>
  );
}
```

```typescript
// src/components/LoginForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('submits form with email and password', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleSubmit} />);

    // Fill in form fields
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit form
    await user.click(screen.getByRole('button', { name: /login/i }));

    // Verify onSubmit was called with correct values
    expect(handleSubmit).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('does not submit with empty fields', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleSubmit} />);

    await user.click(screen.getByRole('button', { name: /login/i }));

    // Form validation should prevent submission
    expect(handleSubmit).not.toHaveBeenCalled();
  });
});
```

---

## 4. Testing Async Components

### Component with Data Fetching

```typescript
// src/components/UserProfile.tsx
import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserProfileProps {
  userId: string;
}

export function UserProfile({ userId }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user');
        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

```typescript
// src/components/UserProfile.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UserProfile } from './UserProfile';

// Mock fetch globally
global.fetch = vi.fn();

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    (global.fetch as any).mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    render(<UserProfile userId="123" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays user data after loading', async () => {
    const mockUser = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    render(<UserProfile userId="123" />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Check user data is displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('displays error message on fetch failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('displays "user not found" when user is null', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    });

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText(/user not found/i)).toBeInTheDocument();
    });
  });
});
```

---

## 5. Testing React Query

### Setup Query Client for Tests

```typescript
// src/test/utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        cacheTime: 0,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress error logs in tests
    },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithClient(
  ui: ReactElement,
  { queryClient, ...options }: CustomRenderOptions = {}
) {
  const testQueryClient = queryClient ?? createTestQueryClient();

  return render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>,
    options
  );
}
```

### Testing useQuery

```typescript
// src/hooks/useUser.ts
import { useQuery } from '@tanstack/react-query';

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
  });
}
```

```typescript
// src/hooks/useUser.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUser } from './useUser';

global.fetch = vi.fn();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches user data successfully', async () => {
    const mockUser = { id: '123', name: 'John Doe' };
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    const { result } = renderHook(() => useUser('123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockUser);
  });

  it('handles fetch error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    const { result } = renderHook(() => useUser('123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
```

### Testing useMutation

```typescript
// src/components/CreateUserForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithClient } from '@/test/utils';
import { CreateUserForm } from './CreateUserForm';

global.fetch = vi.fn();

describe('CreateUserForm', () => {
  it('creates user successfully', async () => {
    const user = userEvent.setup();
    const mockUser = { id: '123', name: 'John Doe' };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    renderWithClient(<CreateUserForm />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/user created successfully/i)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/users',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'John Doe' }),
      })
    );
  });
});
```

---

## 6. Testing Custom Hooks

### Custom Hook

```typescript
// src/hooks/useCounter.ts
import { useState, useCallback } from 'react';

export function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  const decrement = useCallback(() => {
    setCount((c) => c - 1);
  }, []);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  return { count, increment, decrement, reset };
}
```

```typescript
// src/hooks/useCounter.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });

  it('initializes with custom value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('increments count', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('decrements count', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.decrement();
    });

    expect(result.current.count).toBe(4);
  });

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(10));

    act(() => {
      result.current.increment();
      result.current.increment();
    });

    expect(result.current.count).toBe(12);

    act(() => {
      result.current.reset();
    });

    expect(result.current.count).toBe(10);
  });
});
```

---

## 7. Mocking

### Mocking Modules

```typescript
// src/api/users.ts
export async function fetchUsers() {
  const response = await fetch('/api/users');
  return response.json();
}
```

```typescript
// src/components/UserList.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UserList } from './UserList';
import * as usersApi from '@/api/users';

// Mock the entire module
vi.mock('@/api/users', () => ({
  fetchUsers: vi.fn(),
}));

describe('UserList', () => {
  it('displays users', async () => {
    const mockUsers = [
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' },
    ];

    vi.mocked(usersApi.fetchUsers).mockResolvedValue(mockUsers);

    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Jane')).toBeInTheDocument();
    });
  });
});
```

### Mocking Context

```typescript
// src/test/utils.tsx
import { AuthContext } from '@/contexts/AuthContext';

export function renderWithAuth(
  ui: ReactElement,
  { authValue, ...options }: CustomRenderOptions & { authValue?: any } = {}
) {
  const defaultAuthValue = {
    user: { id: '1', name: 'Test User' },
    login: vi.fn(),
    logout: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={authValue ?? defaultAuthValue}>
      {ui}
    </AuthContext.Provider>,
    options
  );
}
```

```typescript
// Usage in test
it('displays user name when authenticated', () => {
  renderWithAuth(<Header />, {
    authValue: {
      user: { id: '1', name: 'John Doe' },
      login: vi.fn(),
      logout: vi.fn(),
    },
  });

  expect(screen.getByText('John Doe')).toBeInTheDocument();
});
```

### Mocking Zustand Stores

```typescript
// src/test/utils.tsx
import { useUserStore } from '@/stores/userStore';

// Mock the store
vi.mock('@/stores/userStore');

// In your test
it('uses user from store', () => {
  vi.mocked(useUserStore).mockReturnValue({
    user: { id: '1', name: 'John Doe' },
    setUser: vi.fn(),
    clearUser: vi.fn(),
  });

  render(<UserProfile />);
  expect(screen.getByText('John Doe')).toBeInTheDocument();
});
```

---

## 8. Integration Testing

### Testing User Flows

```typescript
// src/features/auth/Login.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithClient } from '@/test/utils';
import { Login } from './Login';
import * as authApi from '@/api/auth';

vi.mock('@/api/auth');

describe('Login Flow', () => {
  it('completes full login flow', async () => {
    const user = userEvent.setup();
    const mockLogin = vi.mocked(authApi.login);
    
    mockLogin.mockResolvedValue({
      user: { id: '1', name: 'John Doe' },
      token: 'fake-token',
    });

    const onSuccess = vi.fn();
    renderWithClient(<Login onSuccess={onSuccess} />);

    // Fill in login form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit form
    await user.click(screen.getByRole('button', { name: /log in/i }));

    // Wait for loading to finish
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    // Verify success callback was called
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('displays error on failed login', async () => {
    const user = userEvent.setup();
    const mockLogin = vi.mocked(authApi.login);
    
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    renderWithClient(<Login onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
```

---

## 9. Testing Accessibility

```typescript
// src/components/Dialog.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Dialog } from './Dialog';

expect.extend(toHaveNoViolations);

describe('Dialog Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <Dialog open onClose={() => {}}>
        <h2>Dialog Title</h2>
        <p>Dialog content</p>
      </Dialog>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('traps focus within dialog', async () => {
    const user = userEvent.setup();
    
    render(
      <Dialog open onClose={() => {}}>
        <input placeholder="First" />
        <input placeholder="Second" />
        <button>Close</button>
      </Dialog>
    );

    const firstInput = screen.getByPlaceholderText('First');
    const button = screen.getByRole('button', { name: /close/i });

    firstInput.focus();
    expect(firstInput).toHaveFocus();

    // Tab through all focusable elements
    await user.tab();
    expect(screen.getByPlaceholderText('Second')).toHaveFocus();
    
    await user.tab();
    expect(button).toHaveFocus();

    // Should cycle back to first element
    await user.tab();
    expect(firstInput).toHaveFocus();
  });
});
```

---

## 10. Coverage Reports

### Generate Coverage

```bash
npm run test:coverage
```

### Coverage Configuration

```typescript
// vite.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

---

## Best Practices

### ✅ Do

- Test user behavior, not implementation details
- Use semantic queries (`getByRole`, `getByLabelText`)
- Test accessibility
- Keep tests simple and focused
- Mock external dependencies
- Use `userEvent` over `fireEvent`
- Clean up after tests
- Write descriptive test names

### ❌ Don't

- Test implementation details (internal state, private methods)
- Use `getByTestId` unless necessary
- Write tests that depend on each other
- Mock everything (test real behavior when possible)
- Forget to handle async operations
- Skip accessibility testing
- Use `setTimeout` in tests
- Test third-party library internals

---

## Common Testing Patterns

### 1. Waiting for Elements

```typescript
// Wait for element to appear
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});

// Wait for element to disappear
await waitFor(() => {
  expect(screen.queryByText('Loading')).not.toBeInTheDocument();
});

// Find with timeout
const element = await screen.findByText('Async content', {}, { timeout: 3000 });
```

### 2. Testing Conditional Rendering

```typescript
it('shows content when condition is met', () => {
  render(<Component showContent={true} />);
  expect(screen.getByText('Content')).toBeInTheDocument();
});

it('hides content when condition is not met', () => {
  render(<Component showContent={false} />);
  expect(screen.queryByText('Content')).not.toBeInTheDocument();
});
```

### 3. Testing Lists

```typescript
it('renders all items', () => {
  const items = ['Item 1', 'Item 2', 'Item 3'];
  render(<List items={items} />);
  
  items.forEach(item => {
    expect(screen.getByText(item)).toBeInTheDocument();
  });
});
```

---

## Next Steps

- **Performance**: Optimization techniques in `05_performance.md`
- **Error Handling**: Better error handling in `03_error_handling.md`
- **Component Design**: Testing-friendly design in `01_component_design.md`

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
