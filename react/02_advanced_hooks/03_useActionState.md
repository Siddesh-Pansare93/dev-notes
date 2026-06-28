# useActionState - Form Actions (React 19)

Learn how to use React 19's useActionState hook for handling form submissions with automatic pending states and error handling.

## What You'll Learn

- useActionState hook basics
- Form actions with async handling
- Automatic pending states
- Error handling patterns
- Progressive enhancement

## What is useActionState?

`useActionState` is a new hook in React 19 that simplifies form handling by:
- Managing pending states automatically
- Handling errors gracefully
- Supporting progressive enhancement
- Resetting forms after submission

## Basic Syntax

```typescript
const [state, formAction, isPending] = useActionState(
  actionFunction,
  initialState
);
```

## Simple Form Example

```typescript
import { useActionState } from 'react';

interface FormState {
  message: string;
  error?: string;
}

async function submitForm(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const name = formData.get('name') as string;
  
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (!name || name.length < 2) {
    return {
      message: '',
      error: 'Name must be at least 2 characters',
    };
  }
  
  return {
    message: `Hello, ${name}!`,
  };
}

function GreetingForm() {
  const [state, formAction, isPending] = useActionState(submitForm, {
    message: '',
  });

  return (
    <form action={formAction}>
      <input
        name="name"
        placeholder="Enter your name"
        disabled={isPending}
      />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Submitting...' : 'Submit'}
      </button>
      
      {state.error && (
        <p style={{ color: 'red' }}>{state.error}</p>
      )}
      {state.message && (
        <p style={{ color: 'green' }}>{state.message}</p>
      )}
    </form>
  );
}
```

## Login Form with useActionState

```typescript
interface LoginState {
  success?: boolean;
  error?: string;
  user?: { id: string; name: string };
}

async function loginAction(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return {
        error: 'Invalid credentials',
      };
    }

    const user = await response.json();
    
    return {
      success: true,
      user,
    };
  } catch (error) {
    return {
      error: 'Network error. Please try again.',
    };
  }
}

function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, {});

  if (state.success && state.user) {
    return <div>Welcome back, {state.user.name}!</div>;
  }

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          disabled={isPending}
        />
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          disabled={isPending}
        />
      </div>

      {state.error && (
        <div className="error">{state.error}</div>
      )}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

## Multi-Step Form

```typescript
interface FormState {
  step: number;
  data: {
    name?: string;
    email?: string;
    phone?: string;
  };
  error?: string;
}

async function handleFormAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const action = formData.get('action') as string;

  if (action === 'next') {
    const currentStep = prevState.step;
    
    if (currentStep === 1) {
      const name = formData.get('name') as string;
      if (!name || name.length < 2) {
        return {
          ...prevState,
          error: 'Name is required',
        };
      }
      return {
        step: 2,
        data: { ...prevState.data, name },
      };
    }
    
    if (currentStep === 2) {
      const email = formData.get('email') as string;
      if (!email.includes('@')) {
        return {
          ...prevState,
          error: 'Invalid email',
        };
      }
      return {
        step: 3,
        data: { ...prevState.data, email },
      };
    }
    
    if (currentStep === 3) {
      const phone = formData.get('phone') as string;
      
      // Final submission
      await fetch('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          ...prevState.data,
          phone,
        }),
      });
      
      return {
        step: 4,
        data: { ...prevState.data, phone },
      };
    }
  }

  if (action === 'back') {
    return {
      ...prevState,
      step: Math.max(1, prevState.step - 1),
      error: undefined,
    };
  }

  return prevState;
}

function MultiStepForm() {
  const [state, formAction, isPending] = useActionState(handleFormAction, {
    step: 1,
    data: {},
  });

  if (state.step === 4) {
    return <div>Registration complete! Welcome {state.data.name}!</div>;
  }

  return (
    <form action={formAction}>
      {state.step === 1 && (
        <div>
          <h2>Step 1: Name</h2>
          <input
            name="name"
            defaultValue={state.data.name}
            placeholder="Your name"
            disabled={isPending}
          />
          <button
            type="submit"
            name="action"
            value="next"
            disabled={isPending}
          >
            Next
          </button>
        </div>
      )}

      {state.step === 2 && (
        <div>
          <h2>Step 2: Email</h2>
          <input
            name="email"
            type="email"
            defaultValue={state.data.email}
            placeholder="Your email"
            disabled={isPending}
          />
          <button
            type="submit"
            name="action"
            value="back"
            disabled={isPending}
          >
            Back
          </button>
          <button
            type="submit"
            name="action"
            value="next"
            disabled={isPending}
          >
            Next
          </button>
        </div>
      )}

      {state.step === 3 && (
        <div>
          <h2>Step 3: Phone</h2>
          <input
            name="phone"
            type="tel"
            defaultValue={state.data.phone}
            placeholder="Your phone"
            disabled={isPending}
          />
          <button
            type="submit"
            name="action"
            value="back"
            disabled={isPending}
          >
            Back
          </button>
          <button
            type="submit"
            name="action"
            value="next"
            disabled={isPending}
          >
            {isPending ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      )}

      {state.error && (
        <div className="error">{state.error}</div>
      )}
    </form>
  );
}
```

## With Validation

```typescript
interface ContactFormState {
  success?: boolean;
  errors?: {
    name?: string;
    email?: string;
    message?: string;
  };
}

function validateContactForm(formData: FormData): ContactFormState['errors'] {
  const errors: ContactFormState['errors'] = {};
  
  const name = formData.get('name') as string;
  if (!name || name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }
  
  const email = formData.get('email') as string;
  if (!email || !email.includes('@')) {
    errors.email = 'Please enter a valid email';
  }
  
  const message = formData.get('message') as string;
  if (!message || message.trim().length < 10) {
    errors.message = 'Message must be at least 10 characters';
  }
  
  return Object.keys(errors).length > 0 ? errors : undefined;
}

async function submitContactForm(
  prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const errors = validateContactForm(formData);
  
  if (errors) {
    return { errors };
  }

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to send message');

    return { success: true };
  } catch (error) {
    return {
      errors: {
        message: 'Failed to send message. Please try again.',
      },
    };
  }
}

function ContactForm() {
  const [state, formAction, isPending] = useActionState(
    submitContactForm,
    {}
  );

  if (state.success) {
    return (
      <div className="success">
        Thank you! We'll get back to you soon.
      </div>
    );
  }

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          disabled={isPending}
        />
        {state.errors?.name && (
          <span className="error">{state.errors.name}</span>
        )}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          disabled={isPending}
        />
        {state.errors?.email && (
          <span className="error">{state.errors.email}</span>
        )}
      </div>

      <div>
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          disabled={isPending}
        />
        {state.errors?.message && (
          <span className="error">{state.errors.message}</span>
        )}
      </div>

      <button type="submit" disabled={isPending}>
        {isPending ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
```

## With Redirect

```typescript
import { useActionState } from 'react';
import { redirect } from 'react-router-dom';

async function createPostAction(
  prevState: any,
  formData: FormData
) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  try {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
      return {
        error: 'Failed to create post',
      };
    }

    const post = await response.json();
    
    // Redirect after successful creation
    redirect(`/posts/${post.id}`);
    
    return null;
  } catch (error) {
    return {
      error: 'Network error. Please try again.',
    };
  }
}

function CreatePostForm() {
  const [state, formAction, isPending] = useActionState(
    createPostAction,
    null
  );

  return (
    <form action={formAction}>
      <input name="title" placeholder="Title" required disabled={isPending} />
      <textarea name="content" placeholder="Content" required disabled={isPending} />
      
      {state?.error && <div className="error">{state.error}</div>}
      
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  );
}
```

## Best Practices

1. **Handle all states**
```typescript
// Loading, error, and success states
if (isPending) return <Spinner />;
if (state.error) return <Error message={state.error} />;
if (state.success) return <Success />;
```

2. **Validate before submission**
```typescript
function validateForm(formData: FormData): Errors | undefined {
  // Validate all fields
  // Return errors or undefined
}
```

3. **Provide user feedback**
```typescript
<button disabled={isPending}>
  {isPending ? 'Submitting...' : 'Submit'}
</button>
```

4. **Type your state properly**
```typescript
interface FormState {
  success?: boolean;
  error?: string;
  data?: any;
}
```

## Next Steps

- [useOptimistic](./04_useOptimistic.md)
- [useFormStatus](./05_useFormStatus.md)

## Summary

useActionState provides:
- ✅ Automatic pending state management
- ✅ Built-in error handling
- ✅ Form action integration
- ✅ Progressive enhancement support
- ✅ Cleaner form code
