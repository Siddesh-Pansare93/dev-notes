# React Testing — Comprehensive Revision Notes

Targeted at developers who know React well and need a fast, dense reference for testing patterns. No fluff.

---

## 1. Testing Philosophy: What to Test vs What Not to Test

### The Core Rule

Test **behavior** (what the user experiences), not **implementation** (how the code works internally). Your tests should survive refactors that don't change user-visible behavior.

**Test this:**
- User interactions produce correct UI outcomes
- Data is displayed correctly given certain props/state
- Async operations (fetch, submit) resolve and update the UI
- Error states render correctly
- Accessibility (aria labels, roles)

**Skip this:**
- Internal state variables (`useState` values directly)
- Which function was called inside a component
- CSS class names (unless they drive visible behavior)
- Exact DOM structure (fragile, not behavior)
- Implementation details of third-party libraries

```jsx
// BAD — tests implementation detail
expect(component.state('isLoading')).toBe(true);
expect(wrapper.find('InternalSpinner')).toHaveLength(1);

// GOOD — tests what the user sees
expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
expect(screen.queryByText('Submit')).not.toBeInTheDocument(); // button gone while loading
```

### What Gives You Confidence vs What Doesn't

High confidence: tests that would catch real bugs users would notice.
Low confidence: tests that pass when the app is broken, or fail when behavior is unchanged.

```jsx
// Low confidence — only tests that a function was called
it('calls onSubmit', () => {
  const onSubmit = jest.fn();
  render(<Form onSubmit={onSubmit} />);
  fireEvent.submit(screen.getByRole('form'));
  expect(onSubmit).toHaveBeenCalled(); // doesn't tell you if UI updated
});

// Higher confidence — tests the full interaction
it('submits form and shows success message', async () => {
  render(<Form />);
  await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(await screen.findByText(/thank you/i)).toBeInTheDocument();
});
```

---

## 2. Testing Pyramid for React

```
         /\
        /E2E\         ← Cypress / Playwright: full browser, real network (or MSW)
       /------\
      /  Integ  \     ← Multiple components + routing + context + API (MSW)
     /------------\
    /  Component   \  ← Single component or small tree, RTL
   /----------------\
  /   Unit (Logic)   \ ← Pure functions, hooks (renderHook), reducers, utils
 /____________________\
```

**Rule of thumb:**
- Lots of unit tests for business logic extracted into pure functions/hooks
- Medium coverage via component tests (RTL)
- A handful of integration tests for critical user flows
- Minimal E2E tests for smoke tests of the most critical paths

**Don't reach for E2E when RTL + MSW covers it.** E2E is slow, flaky, and expensive to maintain.

---

## 3. React Testing Library (RTL) Core

### Setup

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

```js
// jest.config.js / vitest.config.ts
import '@testing-library/jest-dom'; // extends expect() matchers
```

### render()

```jsx
import { render, screen } from '@testing-library/react';

const { container, rerender, unmount, baseElement } = render(<MyComponent prop="value" />);

// rerender with new props
rerender(<MyComponent prop="newValue" />);

// cleanup is automatic after each test (cleanup() runs in afterEach)
```

### Query Priority (use in this order)

RTL queries ranked from most to least accessible/preferred:

| Priority | Query | Use When |
|----------|-------|----------|
| 1 | `getByRole` | Almost always — matches accessible role |
| 2 | `getByLabelText` | Form fields |
| 3 | `getByPlaceholderText` | Input with placeholder (fallback) |
| 4 | `getByText` | Non-interactive text content |
| 5 | `getByDisplayValue` | Filled form fields |
| 6 | `getByAltText` | Images |
| 7 | `getByTitle` | Last resort |
| 8 | `getByTestId` | Absolute last resort — add `data-testid` |

```jsx
// Prefer role + accessible name
screen.getByRole('button', { name: /submit/i });
screen.getByRole('textbox', { name: /email address/i });
screen.getByRole('heading', { level: 2 });
screen.getByRole('checkbox', { name: /agree to terms/i });
screen.getByRole('combobox', { name: /country/i });

// For form fields, label association is tested automatically
screen.getByLabelText('Email address'); // finds <input> via <label for="...">

// Avoid these unless nothing else works
screen.getByTestId('submit-btn'); // brittle, adds test-only attributes
```

### Query Variants: getBy / findBy / queryBy

```jsx
// getBy — throws if not found, throws if multiple found
// Use when the element MUST be present right now
const btn = screen.getByRole('button', { name: /delete/i });

// queryBy — returns null if not found, throws if multiple found
// Use to assert element is NOT present
expect(screen.queryByText(/error/i)).not.toBeInTheDocument();

// findBy — returns a Promise, waits for element to appear (default timeout 1000ms)
// Use for async rendering
const msg = await screen.findByText(/success/i);

// getAllBy / queryAllBy / findAllBy — return arrays
const items = screen.getAllByRole('listitem');
expect(items).toHaveLength(3);
```

### userEvent vs fireEvent

**Always prefer `userEvent` over `fireEvent`.** `userEvent` simulates real browser events (pointer, keyboard, focus, blur) in the correct sequence. `fireEvent` dispatches a single synthetic event — it misses pointer events, focus management, etc.

```jsx
import userEvent from '@testing-library/user-event';

// Setup once per test (v14+)
const user = userEvent.setup();

it('handles form input correctly', async () => {
  render(<LoginForm />);

  await user.type(screen.getByLabelText(/username/i), 'alice');
  await user.type(screen.getByLabelText(/password/i), 'secret');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  expect(await screen.findByText(/welcome, alice/i)).toBeInTheDocument();
});

// fireEvent — only use for events userEvent can't simulate (e.g., drag-and-drop edge cases)
import { fireEvent } from '@testing-library/react';
fireEvent.dragStart(element, { dataTransfer: { files: [] } });
```

### within() — Scoping Queries

Query within a specific container to avoid ambiguity when the same text appears multiple times:

```jsx
import { within } from '@testing-library/react';

render(<ProductList products={[{ id: 1, name: 'Widget' }, { id: 2, name: 'Gadget' }]} />);

const listItems = screen.getAllByRole('listitem');
const widgetItem = listItems[0];

// Now query only within that list item
const deleteBtn = within(widgetItem).getByRole('button', { name: /delete/i });
await userEvent.click(deleteBtn);

expect(within(widgetItem).queryByText('Widget')).not.toBeInTheDocument();
```

---

## 4. Async Testing

### waitFor — Waiting for Assertions

Use `waitFor` when you need to wait for an assertion to pass (not for an element to appear — that's `findBy`):

```jsx
import { waitFor } from '@testing-library/react';

it('removes spinner after data loads', async () => {
  render(<DataTable />);

  // Initially shows spinner
  expect(screen.getByRole('status')).toBeInTheDocument();

  // Wait for spinner to disappear
  await waitFor(() => {
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  expect(screen.getAllByRole('row')).toHaveLength(6); // header + 5 data rows
});

// waitFor options
await waitFor(() => expect(something).toBeTruthy(), {
  timeout: 3000,      // default 1000ms
  interval: 100,      // how often to retry
  onTimeout: (error) => error, // custom timeout handler
});
```

### findBy* — Preferred for "Wait for Element to Appear"

```jsx
// findBy is waitFor + getBy combined — simpler and clearer intent
const successMsg = await screen.findByText(/order placed/i);
// equivalent to:
const successMsg = await waitFor(() => screen.getByText(/order placed/i));

// findBy also accepts timeout option
const el = await screen.findByRole('alert', {}, { timeout: 3000 });
```

### act() — When You Actually Need It

RTL wraps most interactions in `act()` for you. You only need it manually when:
- Triggering state updates outside of RTL's controlled events (e.g., from a timer, socket event, or direct imperative call)
- Using `renderHook` with manual state-triggering

```jsx
import { act } from '@testing-library/react'; // NOT from 'react' directly

it('updates after timer fires', async () => {
  jest.useFakeTimers();
  render(<Countdown seconds={5} />);

  expect(screen.getByText('5')).toBeInTheDocument();

  act(() => {
    jest.advanceTimersByTime(1000);
  });

  expect(screen.getByText('4')).toBeInTheDocument();

  jest.useRealTimers();
});

// For async act (e.g., resolving a promise that triggers state update)
await act(async () => {
  await someAsyncOperation();
});
```

**Avoid `act()` warnings:** They usually mean an async state update happened outside of RTL's awareness. Fix: return the async operation properly, or wrap in `waitFor`.

---

## 5. Mocking

### jest.mock() for Modules

```jsx
// Mock an entire module
jest.mock('../api/userService');

// Auto-mock — all exports become jest.fn()
import { getUser, updateUser } from '../api/userService';
getUser.mockResolvedValue({ id: 1, name: 'Alice' });

// Mock with factory function — more control
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Alice', role: 'admin' },
    isAuthenticated: true,
    logout: jest.fn(),
  }),
}));

// Partial mock — keep some real implementations
jest.mock('../utils/formatter', () => ({
  ...jest.requireActual('../utils/formatter'),
  formatCurrency: jest.fn(() => '$999.99'), // only override this
}));

// Reset between tests
beforeEach(() => {
  jest.clearAllMocks();   // clear call counts/results, keep implementation
  // jest.resetAllMocks(); // clear + remove mock implementation
  // jest.restoreAllMocks(); // restore original implementations (only for jest.spyOn)
});
```

### MSW (Mock Service Worker) — Preferred for API Mocking

MSW intercepts network requests at the service worker level, so your code makes real `fetch`/`axios` calls and MSW intercepts them. No coupling to your HTTP library.

```bash
npm install --save-dev msw
```

```js
// src/mocks/handlers.js
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 3, ...body }, { status: 201 });
  }),

  http.get('/api/users/:id', ({ params }) => {
    if (params.id === '999') {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ id: Number(params.id), name: 'Alice' });
  }),
];
```

```js
// src/mocks/server.js (Node.js environment for Jest/Vitest)
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```js
// setupTests.js (or vitest.setup.ts)
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers()); // reset overrides between tests
afterAll(() => server.close());
```

```jsx
// In a test — override handlers for specific scenarios
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

it('shows error when API fails', async () => {
  server.use(
    http.get('/api/users', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  render(<UserList />);
  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
});
```

### Why MSW Beats axios/fetch Mocks

```jsx
// BAD — mocking axios directly (couples test to implementation)
jest.mock('axios');
axios.get.mockResolvedValue({ data: { users: [] } });
// If you refactor to fetch, this mock breaks even if behavior is identical

// GOOD — MSW intercepts at network level
// Works with axios, fetch, ky, got, or anything that uses HTTP
// Switching from axios to fetch doesn't touch your tests
```

---

## 6. Component Testing Patterns

### Testing Custom Hooks with renderHook

```jsx
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

it('increments counter', () => {
  const { result } = renderHook(() => useCounter(0));

  expect(result.current.count).toBe(0);

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});

// Hook that depends on props — use initialProps + rerender
it('updates when initialValue changes', () => {
  const { result, rerender } = renderHook(
    ({ initialValue }) => useCounter(initialValue),
    { initialProps: { initialValue: 5 } }
  );

  expect(result.current.count).toBe(5);

  rerender({ initialValue: 10 });
  // Note: changing initialProps rerenders but doesn't reset state
  // unless the hook specifically responds to it
});

// Async hooks
it('fetches data', async () => {
  const { result } = renderHook(() => useUserData(1));

  expect(result.current.loading).toBe(true);

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.data).toEqual({ id: 1, name: 'Alice' });
});
```

### Testing Context Providers

```jsx
// AuthContext.js
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Option 1: Wrap with real provider in test
it('shows user name when authenticated', () => {
  render(
    <AuthContext.Provider value={{ user: { name: 'Alice' }, isAuthenticated: true }}>
      <Navbar />
    </AuthContext.Provider>
  );

  expect(screen.getByText('Alice')).toBeInTheDocument();
});

// Option 2: Custom render utility (see Section 8)
it('shows user name', () => {
  renderWithAuth(<Navbar />, { user: { name: 'Alice' } });
  expect(screen.getByText('Alice')).toBeInTheDocument();
});

// Testing the context provider itself
it('provides auth state to children', async () => {
  const user = userEvent.setup();

  render(
    <AuthProvider>
      <LoginForm />
      <UserDisplay />
    </AuthProvider>
  );

  expect(screen.queryByText(/welcome/i)).not.toBeInTheDocument();

  await user.type(screen.getByLabelText(/email/i), 'alice@example.com');
  await user.type(screen.getByLabelText(/password/i), 'password');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  expect(await screen.findByText(/welcome, alice/i)).toBeInTheDocument();
});
```

### Testing Error Boundaries

```jsx
// Suppress console.error for expected errors in tests
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
afterEach(() => consoleSpy.mockRestore());

it('renders fallback when child throws', () => {
  const ThrowingComponent = () => {
    throw new Error('Boom');
  };

  render(
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <ThrowingComponent />
    </ErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});

it('renders children when no error', () => {
  render(
    <ErrorBoundary fallback={<div>Error</div>}>
      <div>All good</div>
    </ErrorBoundary>
  );

  expect(screen.getByText('All good')).toBeInTheDocument();
  expect(screen.queryByText('Error')).not.toBeInTheDocument();
});

// Test error boundary reset
it('resets error state after retry', async () => {
  let shouldThrow = true;
  const Flaky = () => {
    if (shouldThrow) throw new Error('Flaky');
    return <div>Recovered</div>;
  };

  render(
    <ErrorBoundary
      fallback={(error, reset) => <button onClick={reset}>Retry</button>}
    >
      <Flaky />
    </ErrorBoundary>
  );

  shouldThrow = false;
  await userEvent.click(screen.getByRole('button', { name: /retry/i }));
  expect(screen.getByText('Recovered')).toBeInTheDocument();
});
```

---

## 7. Testing React Query / SWR Integrations

### React Query

```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

// Create a fresh QueryClient per test — no cache pollution
function renderWithQuery(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,        // don't retry on failure in tests
        gcTime: Infinity,    // (v5) or cacheTime: Infinity (v4) — don't GC during test
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

// MSW handles the actual network interception
it('displays users from API', async () => {
  renderWithQuery(<UserList />);

  expect(screen.getByRole('status')).toBeInTheDocument(); // loading spinner

  const userItems = await screen.findAllByRole('listitem');
  expect(userItems).toHaveLength(2);
  expect(screen.getByText('Alice')).toBeInTheDocument();
});

it('shows error state on API failure', async () => {
  server.use(
    http.get('/api/users', () => new HttpResponse(null, { status: 500 }))
  );

  renderWithQuery(<UserList />);

  expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load/i);
});

// Testing mutations
it('creates a user and refetches list', async () => {
  renderWithQuery(<UserManager />);

  await screen.findAllByRole('listitem'); // wait for initial load

  await userEvent.type(screen.getByLabelText(/name/i), 'Charlie');
  await userEvent.click(screen.getByRole('button', { name: /add user/i }));

  expect(await screen.findByText('Charlie')).toBeInTheDocument();
});
```

### SWR

```jsx
import { SWRConfig } from 'swr';

function renderWithSWR(ui) {
  return render(
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      {ui}
    </SWRConfig>
  );
  // dedupingInterval: 0 — prevents deduplication from blocking test requests
  // provider: () => new Map() — fresh cache per test
}

it('displays data from SWR', async () => {
  renderWithSWR(<Profile userId={1} />);

  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(await screen.findByText('Alice')).toBeInTheDocument();
});
```

---

## 8. Custom Render with Providers (Wrapper Pattern)

Essential for any non-trivial app. Put this in `src/test-utils.tsx` (or `.js`):

```jsx
// src/test-utils.jsx
import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';

const DEFAULT_USER = { id: 1, name: 'Test User', role: 'user' };

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function AllProviders({ children, authValue, initialRoute = '/' }) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <ThemeProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            {children}
          </MemoryRouter>
        </ThemeProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

function customRender(ui, {
  user = DEFAULT_USER,
  isAuthenticated = true,
  initialRoute = '/',
  ...renderOptions
} = {}) {
  const authValue = { user, isAuthenticated, logout: jest.fn() };

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders authValue={authValue} initialRoute={initialRoute}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
}

// Re-export everything from RTL so tests only need one import
export * from '@testing-library/react';
export { customRender as render };
```

```jsx
// In tests — import from test-utils, not @testing-library/react
import { render, screen } from '../test-utils';

it('shows admin panel for admin users', () => {
  render(<Dashboard />, { user: { id: 1, name: 'Admin', role: 'admin' } });
  expect(screen.getByText('Admin Panel')).toBeInTheDocument();
});

it('hides admin panel for regular users', () => {
  render(<Dashboard />, { user: { id: 2, name: 'Bob', role: 'user' } });
  expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
});

it('redirects unauthenticated users', () => {
  render(<Dashboard />, { isAuthenticated: false });
  expect(screen.getByText(/sign in/i)).toBeInTheDocument();
});
```

---

## 9. Snapshot Testing

### When Snapshots Are Useful

- Capturing serialized output of **small, stable utility components** (e.g., icon sets, badge variants)
- Detecting accidental regressions in HTML structure you care about
- Components that rarely change and where the snapshot is readable/meaningful

### When to Avoid Snapshots

- Large components — snapshots become unreadable walls of HTML
- Components under active development — snapshot churn buries real failures
- Anything generated from dynamic data — snapshot diffs will be noisy

```jsx
import { render } from '@testing-library/react';

it('renders badge correctly', () => {
  const { container } = render(<Badge variant="success" size="sm">Active</Badge>);
  expect(container.firstChild).toMatchSnapshot();
});

// Updating snapshots after intentional changes:
// npx jest --updateSnapshot (or npx vitest --update-snapshots)
```

### Inline Snapshots — Preferred over File Snapshots

```jsx
it('renders error badge', () => {
  const { container } = render(<Badge variant="error">Failed</Badge>);
  expect(container.firstChild).toMatchInlineSnapshot(`
    <span
      class="badge badge--error badge--md"
    >
      Failed
    </span>
  `);
});
// Inline snapshots live in the test file — easier to review in PRs
```

### Component Testing vs Snapshot Testing

For most UI components, behavior tests are more valuable:

```jsx
// Snapshot — tells you HTML changed, not why it matters
expect(container).toMatchSnapshot();

// Behavior — tells you what the user experiences
expect(screen.getByRole('status')).toHaveClass('badge--error');
expect(screen.getByText('Failed')).toBeInTheDocument();
```

---

## 10. Vitest vs Jest

### Key Differences

| Feature | Jest | Vitest |
|---------|------|--------|
| Speed | Slower (babel transform) | Fast (Vite/esbuild) |
| Config | `jest.config.js` | `vitest.config.ts` (shares vite.config) |
| ESM support | Needs `--experimental-vm-modules` | Native |
| API | `jest.*` | `vi.*` (compatible with jest API) |
| Coverage | `jest --coverage` | `vitest --coverage` (uses v8 or istanbul) |
| Watch mode | `--watch` | `--watch` (faster HMR-aware) |
| Browser mode | No | Yes (`vitest --browser`) |

### Migration Notes (Jest → Vitest)

```js
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,           // lets you use describe/it/expect without importing
    setupFiles: ['./src/test/setup.ts'],
    css: false,              // skip CSS processing unless needed
  },
});
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

```ts
// Vitest API — drop-in replacement for Jest
import { vi, describe, it, expect, beforeEach } from 'vitest';

// jest.fn() → vi.fn()
const mockFn = vi.fn();

// jest.mock() → vi.mock()
vi.mock('../api/userService', () => ({
  getUser: vi.fn().mockResolvedValue({ id: 1, name: 'Alice' }),
}));

// jest.spyOn() → vi.spyOn()
const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

// jest.useFakeTimers() → vi.useFakeTimers()
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.useRealTimers();

// jest.requireActual() → vi.importActual() (note: async)
vi.mock('./module', async () => {
  const actual = await vi.importActual('./module');
  return { ...actual, someExport: vi.fn() };
});
```

### Gotcha: Module Hoisting

Both Jest and Vitest hoist `jest.mock()`/`vi.mock()` calls to the top of the file. With Vitest, factory functions in `vi.mock()` cannot use variables from outer scope (they're hoisted before variable initialization). Use `vi.hoisted()` to work around this:

```ts
// Vitest hoisting workaround
const mockGetUser = vi.hoisted(() => vi.fn());

vi.mock('../api/userService', () => ({
  getUser: mockGetUser,
}));

it('calls getUser with correct id', () => {
  mockGetUser.mockResolvedValue({ id: 1, name: 'Alice' });
  // ...
});
```

---

## 11. Common Mistakes

### Mistake 1: Testing Implementation Details

```jsx
// BAD — knows about internal state, doesn't test user experience
it('sets isOpen to true when button clicked', () => {
  const wrapper = shallow(<Dropdown />);
  wrapper.find('button').simulate('click');
  expect(wrapper.state('isOpen')).toBe(true); // Enzyme + implementation detail
});

// GOOD — tests what the user sees
it('opens dropdown when trigger clicked', async () => {
  render(<Dropdown options={['A', 'B', 'C']} />);
  await userEvent.click(screen.getByRole('button', { name: /select/i }));
  expect(screen.getByRole('listbox')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'A' })).toBeInTheDocument();
});
```

### Mistake 2: Over-Mocking

```jsx
// BAD — mocking so much that the test doesn't prove anything
jest.mock('../components/UserCard');
jest.mock('../hooks/useFormatDate');
jest.mock('../utils/sortUsers');

// GOOD — only mock external I/O (network, timers, file system)
// Let real components, hooks, and utils run
// Use MSW for network, jest.useFakeTimers() for timers
```

### Mistake 3: Not Using findBy for Async

```jsx
// BAD — element may not exist yet
it('shows data', () => {
  render(<AsyncComponent />);
  expect(screen.getByText('Alice')).toBeInTheDocument(); // fails! data not loaded yet
});

// GOOD
it('shows data', async () => {
  render(<AsyncComponent />);
  expect(await screen.findByText('Alice')).toBeInTheDocument();
});
```

### Mistake 4: Missing Cleanup / State Bleed

```jsx
// RTL auto-cleans DOM after each test, but you must clean up other things:

// Fake timers
afterEach(() => {
  jest.useRealTimers(); // or vi.useRealTimers()
});

// MSW per-test overrides
afterEach(() => {
  server.resetHandlers();
});

// Module mocks
afterEach(() => {
  jest.clearAllMocks();
});

// Window/global mutations
afterEach(() => {
  delete window.matchMedia; // if you patched it in a test
});
```

### Mistake 5: Querying by Index

```jsx
// BAD — fragile, breaks if order changes
const buttons = screen.getAllByRole('button');
await userEvent.click(buttons[2]); // which button is this??

// GOOD — be explicit about which element
await userEvent.click(screen.getByRole('button', { name: /delete alice/i }));
// or use within()
const aliceRow = screen.getByRole('row', { name: /alice/i });
await userEvent.click(within(aliceRow).getByRole('button', { name: /delete/i }));
```

### Mistake 6: Asserting on Resolved Values Instead of UI

```jsx
// BAD — tests the function, not the component
it('returns correct data', async () => {
  const result = await fetchUser(1);
  expect(result.name).toBe('Alice');
});

// GOOD — test through the component as users experience it
it('displays user data', async () => {
  render(<UserProfile userId={1} />);
  expect(await screen.findByText('Alice')).toBeInTheDocument();
});
```

### Mistake 7: Using act() Unnecessarily

```jsx
// BAD — RTL already wraps userEvent in act()
await act(async () => {
  await userEvent.click(screen.getByRole('button'));
});

// GOOD — just use userEvent directly
await userEvent.click(screen.getByRole('button'));
```

### Mistake 8: Forgetting `data-testid` Is a Last Resort

```jsx
// BAD — leaks test concerns into production markup
<button data-testid="submit-btn">Submit</button>

// query: screen.getByTestId('submit-btn')

// GOOD — use the accessible attributes that should exist anyway
<button type="submit" aria-label="Submit order">Submit</button>

// query: screen.getByRole('button', { name: /submit order/i })
// Bonus: if this query fails, your accessibility is also broken
```

---

## 12. Full Integration Test Example

Combining everything: RTL + MSW + custom render + routing:

```jsx
// src/__tests__/checkout.integration.test.jsx
import { render, screen, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { App } from '../App';

describe('Checkout flow', () => {
  const user = userEvent.setup();

  it('completes a purchase end-to-end', async () => {
    render(<App />, { initialRoute: '/cart' });

    // Verify cart loaded
    expect(await screen.findByText('Shopping Cart')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2); // 2 items in cart

    // Proceed to checkout
    await user.click(screen.getByRole('button', { name: /checkout/i }));

    // Fill shipping form
    await user.type(screen.getByLabelText(/full name/i), 'Alice Smith');
    await user.type(screen.getByLabelText(/address/i), '123 Main St');
    await user.selectOptions(screen.getByLabelText(/country/i), 'US');

    // Submit order
    await user.click(screen.getByRole('button', { name: /place order/i }));

    // Verify success
    expect(await screen.findByRole('heading', { name: /order confirmed/i })).toBeInTheDocument();
    expect(screen.getByText(/order #/i)).toBeInTheDocument();
  });

  it('shows validation errors for incomplete form', async () => {
    render(<App />, { initialRoute: '/checkout' });

    await user.click(screen.getByRole('button', { name: /place order/i }));

    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/address is required/i)).toBeInTheDocument();
  });

  it('handles payment failure gracefully', async () => {
    server.use(
      http.post('/api/orders', () => {
        return HttpResponse.json(
          { error: 'Card declined' },
          { status: 402 }
        );
      })
    );

    render(<App />, { initialRoute: '/checkout' });

    await user.type(screen.getByLabelText(/full name/i), 'Bob');
    await user.type(screen.getByLabelText(/address/i), '456 Oak Ave');
    await user.click(screen.getByRole('button', { name: /place order/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/card declined/i);
    // Form should still be usable
    expect(screen.getByRole('button', { name: /place order/i })).toBeEnabled();
  });
});
```

---

## Quick Reference

### Query Decision Tree

```
Is the element interactive (button, input, link, checkbox)?
  → getByRole

Is it a form field with a <label>?
  → getByLabelText

Is it non-interactive text?
  → getByText

Is it an image?
  → getByAltText

Nothing else works?
  → getByTestId (add data-testid to the element)
```

### Async Decision Tree

```
Waiting for element to APPEAR?
  → findBy* (simplest)

Waiting for element to DISAPPEAR?
  → waitFor(() => expect(queryBy*(...)).not.toBeInTheDocument())

Waiting for MULTIPLE assertions to pass?
  → waitFor(() => { expect(...); expect(...); })

Triggering state updates from outside RTL (timers, sockets)?
  → act(() => { ... })
```

### Essential Matchers (from @testing-library/jest-dom)

```jsx
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toBeEnabled();
expect(element).toBeDisabled();
expect(element).toBeChecked();
expect(element).toHaveFocus();
expect(element).toHaveValue('text');
expect(element).toHaveDisplayValue('Option A');
expect(element).toHaveTextContent(/pattern/);
expect(element).toHaveAttribute('aria-label', 'Close');
expect(element).toHaveClass('btn-primary');
expect(element).toHaveStyle('display: none');
```
