# Actions and useActionState

## What You'll Learn
- Understanding the Actions pattern in React 19
- How to use `useActionState` for async operations
- Managing pending states, errors, and optimistic updates
- Comparison with React 18 patterns
- Best practices and real-world use cases

## Table of Contents
1. [Introduction to Actions](#introduction-to-actions)
2. [The useActionState Hook](#the-useactionstate-hook)
3. [React 18 vs React 19](#react-18-vs-react-19)
4. [TypeScript Integration](#typescript-integration)
5. [Best Practices](#best-practices)
6. [Anti-Patterns](#anti-patterns)
7. [Real-World Examples](#real-world-examples)
8. [Performance Considerations](#performance-considerations)
9. [Practice Exercises](#practice-exercises)

---

## Introduction to Actions

**Actions** are a new pattern in React 19 for handling async operations that modify data. By convention, functions that use async transitions are called "Actions".

### What Are Actions?

Actions automatically manage:
- **Pending states** - Automatically track loading status
- **Error handling** - Built-in error boundaries support
- **Optimistic updates** - Show instant feedback to users
- **Sequential requests** - Handle request ordering
- **Form resets** - Automatic form clearing after submission

### Why Actions?

Before React 19, handling async operations required manual state management:

```typescript
// ❌ OLD WAY - Manual state management (React 18)
function UpdateProfile() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async () => {
    setIsPending(true);
    setError(null);
    
    try {
      const result = await updateProfile(name);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Success handling
      redirect("/profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={handleSubmit} disabled={isPending}>
        {isPending ? "Updating..." : "Update"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

With React 19 Actions, this becomes much simpler!

---

## The useActionState Hook

`useActionState` is a React 19 hook that simplifies async state management for Actions.

### Signature

```typescript
const [state, action, isPending] = useActionState<State, Payload>(
  actionFunction,
  initialState,
  permalink?
);
```

**Parameters:**
- `actionFunction`: Async function that receives `(previousState, payload) => Promise<State>`
- `initialState`: The initial state value
- `permalink?`: Optional URL for progressive enhancement

**Returns:**
- `state`: Current state (result from last action or initialState)
- `action`: Function to trigger the action
- `isPending`: Boolean indicating if action is in progress

### Basic Example

```typescript
import { useActionState } from 'react';

type FormState = {
  message: string;
  error?: string;
};

async function updateNameAction(
  previousState: FormState,
  formData: FormData
): Promise<FormState> {
  const name = formData.get("name") as string;
  
  if (!name || name.length < 2) {
    return {
      message: "",
      error: "Name must be at least 2 characters"
    };
  }

  try {
    await updateName(name);
    return { message: "Name updated successfully!" };
  } catch (error) {
    return {
      message: "",
      error: error instanceof Error ? error.message : "Update failed"
    };
  }
}

function UpdateNameForm() {
  const [state, submitAction, isPending] = useActionState(
    updateNameAction,
    { message: "" }
  );

  return (
    <form action={submitAction}>
      <input type="text" name="name" required />
      <button type="submit" disabled={isPending}>
        {isPending ? "Updating..." : "Update Name"}
      </button>
      {state.error && <p className="error">{state.error}</p>}
      {state.message && <p className="success">{state.message}</p>}
    </form>
  );
}
```

---

## React 18 vs React 19

### Comparison Table

| Feature | React 18 | React 19 (Actions) |
|---------|----------|-------------------|
| **Pending State** | Manual `useState` | Automatic via `isPending` |
| **Error Handling** | Manual try/catch + state | Automatic via return value |
| **Form Reset** | Manual reset | Automatic on success |
| **Optimistic Updates** | Manual state management | `useOptimistic` hook |
| **Sequential Requests** | Manual queue/abort | Automatic handling |
| **Code Volume** | ~30-40 lines | ~10-15 lines |

### Side-by-Side Example

**React 18 Pattern:**

```typescript
// ❌ React 18 - Verbose manual management
function CommentForm({ postId }: { postId: string }) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment }),
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error);
        return;
      }

      setComment(""); // Reset form
      setSuccess(true);
    } catch (err) {
      setError("Failed to post comment");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={isPending}
      />
      <button type="submit" disabled={isPending || !comment}>
        {isPending ? "Posting..." : "Post Comment"}
      </button>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">Comment posted!</p>}
    </form>
  );
}
```

**React 19 Pattern:**

```typescript
// ✅ React 19 - Clean and concise
import { useActionState } from 'react';

type CommentState = {
  error?: string;
  success?: boolean;
};

async function postCommentAction(
  prevState: CommentState,
  formData: FormData
): Promise<CommentState> {
  const comment = formData.get("comment") as string;
  const postId = formData.get("postId") as string;

  try {
    const response = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ comment }),
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      const data = await response.json();
      return { error: data.error };
    }

    return { success: true };
  } catch {
    return { error: "Failed to post comment" };
  }
}

function CommentForm({ postId }: { postId: string }) {
  const [state, submitAction, isPending] = useActionState(
    postCommentAction,
    {}
  );

  return (
    <form action={submitAction}>
      <input type="hidden" name="postId" value={postId} />
      <textarea name="comment" disabled={isPending} required />
      <button type="submit" disabled={isPending}>
        {isPending ? "Posting..." : "Post Comment"}
      </button>
      {state.error && <p className="error">{state.error}</p>}
      {state.success && <p className="success">Comment posted!</p>}
    </form>
  );
}
```

**Benefits:**
- 50% less code
- No manual state management
- Automatic form reset
- Better type safety
- Cleaner component logic

---

## TypeScript Integration

### Typing useActionState

```typescript
import { useActionState } from 'react';

// Define your state type
type LoginState = {
  user?: { id: string; name: string };
  error?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
};

// Define your action payload type (usually FormData)
type LoginPayload = FormData;

// Type the action function
async function loginAction(
  previousState: LoginState,
  formData: LoginPayload
): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Validation
  const fieldErrors: LoginState['fieldErrors'] = {};
  
  if (!email?.includes("@")) {
    fieldErrors.email = "Invalid email address";
  }
  
  if (!password || password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  // Authentication
  try {
    const user = await authenticate(email, password);
    return { user };
  } catch (error) {
    return { error: "Invalid credentials" };
  }
}

// Component with full type safety
function LoginForm() {
  const [state, submitAction, isPending] = useActionState<
    LoginState,
    LoginPayload
  >(loginAction, {});

  return (
    <form action={submitAction}>
      <div>
        <input
          type="email"
          name="email"
          disabled={isPending}
          aria-invalid={!!state.fieldErrors?.email}
        />
        {state.fieldErrors?.email && (
          <span className="error">{state.fieldErrors.email}</span>
        )}
      </div>
      
      <div>
        <input
          type="password"
          name="password"
          disabled={isPending}
          aria-invalid={!!state.fieldErrors?.password}
        />
        {state.fieldErrors?.password && (
          <span className="error">{state.fieldErrors.password}</span>
        )}
      </div>

      <button type="submit" disabled={isPending}>
        {isPending ? "Logging in..." : "Log In"}
      </button>

      {state.error && <p className="error">{state.error}</p>}
      {state.user && <p>Welcome, {state.user.name}!</p>}
    </form>
  );
}
```

### Generic Action Helper

```typescript
// Create a reusable typed action helper
type ActionFunction<TState, TPayload = FormData> = (
  previousState: TState,
  payload: TPayload
) => Promise<TState>;

function createAction<TState, TPayload = FormData>(
  handler: ActionFunction<TState, TPayload>
): ActionFunction<TState, TPayload> {
  return async (previousState, payload) => {
    try {
      return await handler(previousState, payload);
    } catch (error) {
      console.error("Action error:", error);
      return previousState; // Fallback to previous state
    }
  };
}

// Usage
const safeUpdateAction = createAction<UserState>(async (prev, formData) => {
  const name = formData.get("name") as string;
  const updatedUser = await updateUser({ name });
  return { user: updatedUser };
});
```

---

## Best Practices

### 1. **Keep Actions Pure and Focused**

```typescript
// ✅ GOOD - Single responsibility
async function updateEmailAction(
  prevState: EmailState,
  formData: FormData
): Promise<EmailState> {
  const email = formData.get("email") as string;
  
  // Validate
  if (!isValidEmail(email)) {
    return { error: "Invalid email" };
  }
  
  // Update
  await updateEmail(email);
  return { success: true };
}

// ❌ BAD - Too many responsibilities
async function updateProfileAction(prevState: any, formData: FormData) {
  // Updating email, name, avatar, preferences all in one action
  // Hard to test, hard to maintain
}
```

### 2. **Use Descriptive State Types**

```typescript
// ✅ GOOD - Clear state structure
type FormState = 
  | { status: 'idle' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: string };

// ❌ BAD - Ambiguous state
type FormState = {
  data?: any;
  error?: string;
};
```

### 3. **Validate Early, Fail Fast**

```typescript
async function createPostAction(
  prevState: PostState,
  formData: FormData
): Promise<PostState> {
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  // ✅ Validate before making API calls
  if (!title || title.length < 3) {
    return { error: "Title must be at least 3 characters" };
  }

  if (!content || content.length < 10) {
    return { error: "Content must be at least 10 characters" };
  }

  // Only proceed if validation passes
  const post = await createPost({ title, content });
  return { success: true, post };
}
```

### 4. **Handle Network Errors Gracefully**

```typescript
async function submitAction(
  prevState: State,
  formData: FormData
): Promise<State> {
  try {
    const response = await fetch("/api/endpoint", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      // Handle HTTP errors
      const errorData = await response.json();
      return { error: errorData.message || "Request failed" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError) {
      return { error: "Network error. Please check your connection." };
    }
    return { error: "An unexpected error occurred" };
  }
}
```

### 5. **Use Progressive Enhancement**

```typescript
// Provide a permalink for no-JS scenarios
function SearchForm() {
  const [state, searchAction, isPending] = useActionState(
    performSearch,
    { results: [] },
    "/search" // Fallback URL
  );

  return (
    <form action={searchAction}>
      <input name="query" type="search" />
      <button type="submit">Search</button>
      {/* Results render here */}
    </form>
  );
}
```

---

## Anti-Patterns

### ❌ 1. Don't Mix useState with useActionState

```typescript
// ❌ BAD - Redundant state management
function BadForm() {
  const [localError, setLocalError] = useState(""); // Unnecessary
  const [state, action, isPending] = useActionState(submitAction, {});
  
  // Managing error in two places - confusing!
}

// ✅ GOOD - Single source of truth
function GoodForm() {
  const [state, action, isPending] = useActionState(submitAction, {});
  // All state in one place
}
```

### ❌ 2. Don't Ignore isPending

```typescript
// ❌ BAD - No loading state
function BadForm() {
  const [state, action] = useActionState(submitAction, {});
  // User can click submit multiple times!
  return <button type="submit">Submit</button>;
}

// ✅ GOOD - Disable during pending
function GoodForm() {
  const [state, action, isPending] = useActionState(submitAction, {});
  return (
    <button type="submit" disabled={isPending}>
      {isPending ? "Submitting..." : "Submit"}
    </button>
  );
}
```

### ❌ 3. Don't Mutate Previous State

```typescript
// ❌ BAD - Mutating previous state
async function badAction(prevState: State, formData: FormData) {
  prevState.count++; // Mutation!
  return prevState;
}

// ✅ GOOD - Return new state
async function goodAction(prevState: State, formData: FormData) {
  return { ...prevState, count: prevState.count + 1 };
}
```

### ❌ 4. Don't Use for Non-Form Actions

```typescript
// ❌ BAD - useActionState for simple state
function Counter() {
  const [count, incrementAction] = useActionState(
    async (prev) => prev + 1,
    0
  );
  // Overkill for simple sync updates!
}

// ✅ GOOD - Use useState for simple state
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>;
}
```

---

## Real-World Examples

### Example 1: User Registration Form

```typescript
import { useActionState } from 'react';
import { z } from 'zod';

// Validation schema
const registrationSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type RegistrationState = {
  success?: boolean;
  errors?: z.ZodError['formErrors'];
};

async function registerAction(
  prevState: RegistrationState,
  formData: FormData
): Promise<RegistrationState> {
  // Extract and validate data
  const data = {
    username: formData.get("username") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const validation = registrationSchema.safeParse(data);

  if (!validation.success) {
    return {
      errors: validation.error.formErrors
    };
  }

  // Check if username/email exists
  const exists = await checkUserExists(data.username, data.email);
  if (exists.username) {
    return {
      errors: {
        fieldErrors: { username: ["Username already taken"] }
      }
    };
  }
  if (exists.email) {
    return {
      errors: {
        fieldErrors: { email: ["Email already registered"] }
      }
    };
  }

  // Register user
  try {
    await registerUser({
      username: data.username,
      email: data.email,
      password: data.password
    });
    
    return { success: true };
  } catch (error) {
    return {
      errors: {
        formErrors: ["Registration failed. Please try again."]
      }
    };
  }
}

function RegistrationForm() {
  const [state, submitAction, isPending] = useActionState(
    registerAction,
    {}
  );

  if (state.success) {
    return (
      <div className="success-message">
        <h2>Registration Successful!</h2>
        <p>Please check your email to verify your account.</p>
      </div>
    );
  }

  return (
    <form action={submitAction} className="registration-form">
      <h2>Create Account</h2>

      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input
          type="text"
          id="username"
          name="username"
          disabled={isPending}
          aria-invalid={!!state.errors?.fieldErrors?.username}
        />
        {state.errors?.fieldErrors?.username && (
          <span className="error">
            {state.errors.fieldErrors.username[0]}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          disabled={isPending}
          aria-invalid={!!state.errors?.fieldErrors?.email}
        />
        {state.errors?.fieldErrors?.email && (
          <span className="error">
            {state.errors.fieldErrors.email[0]}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          disabled={isPending}
          aria-invalid={!!state.errors?.fieldErrors?.password}
        />
        {state.errors?.fieldErrors?.password && (
          <span className="error">
            {state.errors.fieldErrors.password[0]}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          disabled={isPending}
          aria-invalid={!!state.errors?.fieldErrors?.confirmPassword}
        />
        {state.errors?.fieldErrors?.confirmPassword && (
          <span className="error">
            {state.errors.fieldErrors.confirmPassword[0]}
          </span>
        )}
      </div>

      {state.errors?.formErrors && (
        <div className="form-errors">
          {state.errors.formErrors.map((error, i) => (
            <p key={i} className="error">{error}</p>
          ))}
        </div>
      )}

      <button type="submit" disabled={isPending} className="submit-btn">
        {isPending ? "Creating Account..." : "Register"}
      </button>
    </form>
  );
}
```

### Example 2: Multi-Step Form with Actions

```typescript
import { useActionState } from 'react';

type Step = 'personal' | 'address' | 'payment' | 'review';

type MultiStepState = {
  step: Step;
  data: {
    personal?: { name: string; email: string };
    address?: { street: string; city: string; zip: string };
    payment?: { cardNumber: string; expiry: string };
  };
  error?: string;
};

async function processStepAction(
  prevState: MultiStepState,
  formData: FormData
): Promise<MultiStepState> {
  const action = formData.get("action") as string;

  if (action === "next") {
    const currentStep = prevState.step;

    if (currentStep === 'personal') {
      const personal = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
      };

      if (!personal.name || !personal.email) {
        return { ...prevState, error: "All fields are required" };
      }

      return {
        step: 'address',
        data: { ...prevState.data, personal },
      };
    }

    if (currentStep === 'address') {
      const address = {
        street: formData.get("street") as string,
        city: formData.get("city") as string,
        zip: formData.get("zip") as string,
      };

      if (!address.street || !address.city || !address.zip) {
        return { ...prevState, error: "All fields are required" };
      }

      return {
        step: 'payment',
        data: { ...prevState.data, address },
      };
    }

    if (currentStep === 'payment') {
      const payment = {
        cardNumber: formData.get("cardNumber") as string,
        expiry: formData.get("expiry") as string,
      };

      if (!payment.cardNumber || !payment.expiry) {
        return { ...prevState, error: "All fields are required" };
      }

      return {
        step: 'review',
        data: { ...prevState.data, payment },
      };
    }
  }

  if (action === "back") {
    const steps: Step[] = ['personal', 'address', 'payment', 'review'];
    const currentIndex = steps.indexOf(prevState.step);
    const previousStep = steps[Math.max(0, currentIndex - 1)];

    return {
      ...prevState,
      step: previousStep,
      error: undefined,
    };
  }

  if (action === "submit") {
    try {
      await submitOrder(prevState.data);
      // Redirect to success page
      window.location.href = "/order/success";
      return prevState;
    } catch (error) {
      return {
        ...prevState,
        error: "Failed to submit order. Please try again.",
      };
    }
  }

  return prevState;
}

function MultiStepCheckout() {
  const [state, processStep, isPending] = useActionState(
    processStepAction,
    { step: 'personal', data: {} }
  );

  return (
    <div className="checkout-wizard">
      <StepIndicator currentStep={state.step} />

      <form action={processStep}>
        {state.step === 'personal' && (
          <PersonalInfoStep isPending={isPending} error={state.error} />
        )}
        {state.step === 'address' && (
          <AddressStep isPending={isPending} error={state.error} />
        )}
        {state.step === 'payment' && (
          <PaymentStep isPending={isPending} error={state.error} />
        )}
        {state.step === 'review' && (
          <ReviewStep data={state.data} isPending={isPending} />
        )}

        <div className="form-actions">
          {state.step !== 'personal' && (
            <button
              type="submit"
              name="action"
              value="back"
              disabled={isPending}
            >
              Back
            </button>
          )}
          
          {state.step !== 'review' ? (
            <button
              type="submit"
              name="action"
              value="next"
              disabled={isPending}
            >
              {isPending ? "Processing..." : "Next"}
            </button>
          ) : (
            <button
              type="submit"
              name="action"
              value="submit"
              disabled={isPending}
            >
              {isPending ? "Submitting..." : "Complete Order"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

---

## Performance Considerations

### 1. **Actions Are Debounced by Default**

React automatically prevents multiple simultaneous submissions:

```typescript
function SearchForm() {
  const [state, search, isPending] = useActionState(performSearch, {});

  // ✅ React ensures only one search runs at a time
  // No need for manual debouncing!
  return (
    <form action={search}>
      <input name="query" />
      <button type="submit" disabled={isPending}>Search</button>
    </form>
  );
}
```

### 2. **Avoid Heavy Computations in Actions**

```typescript
// ❌ BAD - Heavy processing in action
async function processAction(prev: State, formData: FormData) {
  const data = formData.get("data") as string;
  const processed = expensiveProcessing(data); // Blocks UI!
  await saveData(processed);
  return { success: true };
}

// ✅ GOOD - Offload to server/worker
async function processAction(prev: State, formData: FormData) {
  const data = formData.get("data") as string;
  // Let server handle heavy processing
  await fetch("/api/process", {
    method: "POST",
    body: JSON.stringify({ data })
  });
  return { success: true };
}
```

### 3. **Batch Related Updates**

```typescript
// ❌ BAD - Multiple actions for related updates
function ProfileForm() {
  const [nameState, updateName] = useActionState(updateNameAction, {});
  const [emailState, updateEmail] = useActionState(updateEmailAction, {});
  // Two separate actions = two network calls
}

// ✅ GOOD - Single action for related updates
function ProfileForm() {
  const [state, updateProfile] = useActionState(updateProfileAction, {});
  // One action = one network call
}
```

### 4. **Memoize Action Functions When Needed**

```typescript
import { useActionState, useCallback } from 'react';

function DynamicForm({ endpoint }: { endpoint: string }) {
  // ❌ BAD - New action function on every render
  const [state, action, isPending] = useActionState(
    async (prev, formData) => {
      await fetch(endpoint, { method: "POST", body: formData });
      return { success: true };
    },
    {}
  );

  // ✅ GOOD - Memoized action function
  const stableAction = useCallback(
    async (prev: State, formData: FormData) => {
      await fetch(endpoint, { method: "POST", body: formData });
      return { success: true };
    },
    [endpoint]
  );

  const [state, action, isPending] = useActionState(stableAction, {});
}
```

---

## Practice Exercises

### Exercise 1: Basic Action (Beginner)

Create a simple newsletter signup form using `useActionState`:

**Requirements:**
- Email input field
- Validation: valid email format
- Show loading state while submitting
- Display success/error messages
- Reset form on success

**Starter Code:**

```typescript
import { useActionState } from 'react';

type NewsletterState = {
  // Define your state type
};

async function subscribeAction(
  prevState: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  // Implement subscription logic
}

function NewsletterForm() {
  // Implement the form
}
```

<details>
<summary>Solution</summary>

```typescript
import { useActionState } from 'react';

type NewsletterState = {
  success?: boolean;
  error?: string;
};

async function subscribeAction(
  prevState: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  const email = formData.get("email") as string;

  // Validation
  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address" };
  }

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Simulate success/failure
  if (Math.random() > 0.2) {
    return { success: true };
  } else {
    return { error: "Subscription failed. Please try again." };
  }
}

function NewsletterForm() {
  const [state, subscribe, isPending] = useActionState(
    subscribeAction,
    {}
  );

  return (
    <form action={subscribe}>
      <h3>Subscribe to Newsletter</h3>
      
      <input
        type="email"
        name="email"
        placeholder="your@email.com"
        disabled={isPending}
        required
      />

      <button type="submit" disabled={isPending}>
        {isPending ? "Subscribing..." : "Subscribe"}
      </button>

      {state.error && <p style={{ color: 'red' }}>{state.error}</p>}
      {state.success && (
        <p style={{ color: 'green' }}>Successfully subscribed!</p>
      )}
    </form>
  );
}
```
</details>

### Exercise 2: File Upload with Progress (Intermediate)

Create a file upload form with progress tracking:

**Requirements:**
- File input (images only)
- Validate file size (max 5MB)
- Show upload progress
- Display thumbnail preview
- Handle upload errors

**Hints:**
- Use `XMLHttpRequest` for progress tracking
- Store progress in action state
- Validate file type and size before upload

### Exercise 3: Shopping Cart Update (Advanced)

Build a shopping cart quantity updater:

**Requirements:**
- Use `useActionState` and `useOptimistic` together
- Update quantity optimistically
- Handle stock validation on server
- Revert on failure
- Show loading state per item

**Challenge:**
- Support bulk operations (update multiple items)
- Implement retry logic
- Add undo functionality

---

## Summary

**Key Takeaways:**

1. **Actions simplify async operations** - No more manual state management for pending/error states
2. **useActionState is powerful** - Combines state management with async transitions
3. **TypeScript support is excellent** - Full type safety for state and payloads
4. **Performance benefits** - Automatic debouncing and optimization
5. **Better UX** - Built-in support for optimistic updates and error handling

**Next Steps:**
- Learn about [useOptimistic Hook](./02_useoptimistic_hook.md) for optimistic UI updates
- Explore [Form Actions](./04_form_actions.md) for simplified form handling
- Practice with the exercises above

**Further Reading:**
- [React 19 Actions Documentation](https://react.dev/reference/react/useActionState)
- [Form Actions Guide](https://react.dev/reference/react-dom/components/form)
- [Server Actions](https://react.dev/reference/rsc/server-actions)
