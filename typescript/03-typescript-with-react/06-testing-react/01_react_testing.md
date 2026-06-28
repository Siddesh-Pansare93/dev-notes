# React Testing Best Practices

Testing modern React applications requires a mix of unit testing components, testing custom hooks, mocking API responses, and ensuring End-to-End (E2E) flows work correctly. This guide focuses on React Testing Library (RTL), MSW (Mock Service Worker), and Playwright for React 18/19.

## What You'll Learn
- Testing Library philosophy and best practices
- Testing React Hooks with `renderHook`
- Testing asynchronous components and state
- Mocking API calls using MSW (Mock Service Worker)
- E2E testing with Playwright
- CI/CD integration for UI testing

## Setup Instructions

We recommend using Vitest for unit testing React components and Playwright for E2E testing.

```bash
# Unit Testing
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw

# E2E Testing
npx playwright install
```

Set up your `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
```

And your `setupTests.ts`:
```typescript
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Testing Library Best Practices

React Testing Library encourages testing your app the way a user interacts with it. Avoid finding elements by test IDs when possible; use roles and text.

### Example 1: Basic Component Rendering
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });
});
```

### Example 2: Simulating User Events
Use `@testing-library/user-event` instead of `fireEvent` to simulate realistic interactions.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './Counter';

describe('Counter', () => {
  it('increments the count on click', async () => {
    const user = userEvent.setup();
    render(<Counter />);

    const button = screen.getByRole('button', { name: /increment/i });
    expect(screen.getByText('Count: 0')).toBeInTheDocument();

    await user.click(button);
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });
});
```

---

## Testing Hooks

You no longer need `@testing-library/react-hooks`; `renderHook` is built into `@testing-library/react`.

### Example 3: Testing a Custom Hook
```tsx
import { renderHook, act } from '@testing-library/react';
import { useToggle } from './useToggle';

describe('useToggle', () => {
  it('toggles state from false to true', () => {
    const { result } = renderHook(() => useToggle());

    expect(result.current[0]).toBe(false);

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(true);
  });
});
```

### Example 4: Testing Async Hooks
```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useFetchData } from './useFetchData';

describe('useFetchData', () => {
  it('returns data after fetching', async () => {
    const { result } = renderHook(() => useFetchData('/api/data'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

---

## Mocking API Calls with MSW

Mock Service Worker (MSW) intercepts network requests at the network level, meaning your React components (using `fetch` or `axios`) don't even know they're being mocked.

### Example 5: Setting up MSW Handlers
```typescript
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/user', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: '1',
        name: 'John Doe',
      })
    );
  }),
];
```

### Example 6: Testing a Component that Fetches Data
```tsx
import { render, screen } from '@testing-library/react';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  it('displays user data after loading', async () => {
    render(<UserProfile />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    const userName = await screen.findByText('John Doe'); // findBy automatically waits
    expect(userName).toBeInTheDocument();
  });
});
```

### Example 7: Handling MSW Errors
Override a handler for a single test.

```tsx
import { server } from './mocks/server';
import { rest } from 'msw';

it('displays an error message when fetch fails', async () => {
  server.use(
    rest.get('/api/user', (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );

  render(<UserProfile />);
  expect(await screen.findByText(/failed to load user/i)).toBeInTheDocument();
});
```

---

## E2E Testing with Playwright

Playwright is preferred over Cypress for its cross-browser support and speed.

### Example 8: Basic Playwright Test
```typescript
import { test, expect } from '@playwright/test';

test('homepage has correct title', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page).toHaveTitle(/React App/);
});
```

### Example 9: Testing Form Submission
```typescript
import { test, expect } from '@playwright/test';

test('user can log in', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('http://localhost:3000/dashboard');
  await expect(page.locator('h1')).toHaveText('Welcome, test@example.com');
});
```

### Example 10: Visual Regression Testing
```typescript
import { test, expect } from '@playwright/test';

test('homepage looks correct visually', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page).toHaveScreenshot('homepage.png');
});
```

---

## Best Practices and Anti-Patterns

**Best Practices:**
1. **Query by Role:** Always prefer `getByRole`. It ensures your app is accessible.
2. **Use `findBy` for Async UI:** Instead of `waitFor(() => expect(...))`, use `await screen.findByRole(...)`. It is cleaner and handles retries automatically.
3. **Mock at the Network Boundary:** Use MSW instead of mocking `fetch` or `axios`. This ensures your code functions exactly as it would in production.

**Anti-Patterns:**
1. **Testing Implementation Details:** Don't assert on component internal state (like checking if a `useState` value changed). Test what the user *sees* on the DOM.
2. **Over-mocking:** Avoid mocking child components unless they are extraordinarily complex or slow down the test suite drastically.

---

## React 19 Considerations
- **`use` hook:** Test components using React 19's `use` promise unwrap exactly like any other async data-fetching component using `Suspense`. Use RTL's `findBy` to wait for the fallback to resolve.
- **Server Actions:** Test server actions by mocking the module export for the action if necessary, or let them hit MSW if they are standard fetch requests.

---

## Practice Exercises
1. Write a component with a simple controlled form input. Use `userEvent.type` to simulate typing and assert the value updates.
2. Build a custom hook that debounces a search term. Write a test utilizing `vi.useFakeTimers()` to test the debounce logic.
3. Setup Playwright in your project and write a test that navigates through a multi-step wizard form.
