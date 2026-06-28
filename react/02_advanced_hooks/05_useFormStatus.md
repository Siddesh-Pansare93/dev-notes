# useFormStatus - Form Submission State

## What You'll Learn

- How to use React 19's `useFormStatus` hook
- Track form submission state without prop drilling
- Build reusable form components with TypeScript
- Display loading states, disable buttons, and show progress
- Combine with Actions and `useActionState` for powerful forms

---

## What is `useFormStatus`?

`useFormStatus` is a React 19 hook that reads the status of a parent `<form>` element, allowing child components to access form submission state without prop drilling.

**Perfect for:**
- Submit buttons that show loading states
- Form-wide loading indicators
- Disabling inputs during submission
- Reusable design system components

---

## Basic Syntax

```typescript
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();
  
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}
```

### Return Values

```typescript
interface FormStatus {
  pending: boolean;      // Is form currently submitting?
  data: FormData | null; // Form data being submitted
  method: string | null; // HTTP method (usually 'post')
  action: string | ((formData: FormData) => void) | null; // Form action
}
```

**Important:** `useFormStatus` must be called in a component that is **rendered inside a `<form>`**. It doesn't work in the same component that renders the form.

---

## Pattern 1: Basic Submit Button

The most common use case - a submit button that shows loading state.

```typescript
import { useFormStatus } from 'react-dom';

// ✅ Correct - Component rendered INSIDE form
function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
    >
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}

// Parent component
async function submitForm(formData: FormData) {
  'use server'; // Server Action (Next.js)
  
  const name = formData.get('name');
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate delay
  console.log('Submitted:', name);
}

export function ContactForm() {
  return (
    <form action={submitForm} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="mt-1 block w-full rounded border-gray-300"
        />
      </div>
      
      <SubmitButton />
    </form>
  );
}
```

### ❌ Common Mistake

```typescript
// ❌ Wrong - useFormStatus in same component as form
export function ContactForm() {
  const { pending } = useFormStatus(); // This won't work!
  
  return (
    <form action={submitForm}>
      <button disabled={pending}>Submit</button>
    </form>
  );
}

// ✅ Correct - useFormStatus in child component
export function ContactForm() {
  return (
    <form action={submitForm}>
      <SubmitButton /> {/* useFormStatus called here */}
    </form>
  );
}
```

---

## Pattern 2: Reusable Form Components

Build a design system with form components that automatically handle loading states.

```typescript
import { useFormStatus } from 'react-dom';
import { ReactNode } from 'react';

// Reusable Submit Button
interface SubmitButtonProps {
  children: ReactNode;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function SubmitButton({
  children,
  loadingText = 'Loading...',
  variant = 'primary',
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700',
    secondary: 'bg-gray-600 hover:bg-gray-700',
    danger: 'bg-red-600 hover:bg-red-700',
  };
  
  return (
    <button
      type="submit"
      disabled={pending}
      className={`
        px-4 py-2 text-white rounded font-medium
        transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
      `}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <Spinner />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

// Reusable Form Input that disables during submission
interface FormInputProps {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}

export function FormInput({
  label,
  name,
  type = 'text',
  required = false,
  placeholder,
}: FormInputProps) {
  const { pending } = useFormStatus();
  
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        disabled={pending}
        placeholder={placeholder}
        className="mt-1 block w-full rounded border-gray-300 disabled:bg-gray-100"
      />
    </div>
  );
}

// Spinner component
function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Usage
export function UserProfileForm() {
  async function updateProfile(formData: FormData) {
    'use server';
    // Handle form submission
  }
  
  return (
    <form action={updateProfile} className="space-y-4">
      <FormInput label="Name" name="name" required />
      <FormInput label="Email" name="email" type="email" required />
      <FormInput label="Bio" name="bio" />
      
      <SubmitButton loadingText="Saving...">
        Save Profile
      </SubmitButton>
    </form>
  );
}
```

**Benefits:**
- No prop drilling needed
- Components automatically adapt to form state
- Consistent UX across your app
- Easy to maintain and reuse

---

## Pattern 3: Form Loading Overlay

Show a loading overlay over the entire form during submission.

```typescript
import { useFormStatus } from 'react-dom';
import { ReactNode } from 'react';

interface FormLoadingOverlayProps {
  children: ReactNode;
}

function FormLoadingOverlay({ children }: FormLoadingOverlayProps) {
  const { pending } = useFormStatus();
  
  return (
    <div className="relative">
      {pending && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <Spinner />
            <p className="mt-2 text-sm text-gray-600">Processing...</p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

export function PaymentForm() {
  async function processPayment(formData: FormData) {
    'use server';
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // Process payment
  }
  
  return (
    <form action={processPayment} className="max-w-md mx-auto">
      <FormLoadingOverlay>
        <div className="space-y-4">
          <FormInput label="Card Number" name="cardNumber" required />
          <FormInput label="Expiry Date" name="expiry" required />
          <FormInput label="CVV" name="cvv" required />
          
          <SubmitButton>Pay Now</SubmitButton>
        </div>
      </FormLoadingOverlay>
    </form>
  );
}
```

---

## Pattern 4: Multiple Submit Buttons with Different Actions

Use `formAction` to have different buttons perform different actions.

```typescript
import { useFormStatus } from 'react-dom';

interface ActionButtonProps {
  action: (formData: FormData) => void;
  children: ReactNode;
  variant?: 'save' | 'publish' | 'delete';
}

function ActionButton({ action, children, variant = 'save' }: ActionButtonProps) {
  const { pending } = useFormStatus();
  
  const styles = {
    save: 'bg-blue-600 hover:bg-blue-700',
    publish: 'bg-green-600 hover:bg-green-700',
    delete: 'bg-red-600 hover:bg-red-700',
  };
  
  return (
    <button
      formAction={action}
      disabled={pending}
      className={`px-4 py-2 text-white rounded ${styles[variant]} disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

export function BlogPostForm() {
  async function saveDraft(formData: FormData) {
    'use server';
    console.log('Saving draft...');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  
  async function publishPost(formData: FormData) {
    'use server';
    console.log('Publishing post...');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  
  return (
    <form className="space-y-4">
      <FormInput label="Title" name="title" required />
      <FormInput label="Content" name="content" required />
      
      <div className="flex gap-2">
        <ActionButton action={saveDraft} variant="save">
          Save Draft
        </ActionButton>
        <ActionButton action={publishPost} variant="publish">
          Publish
        </ActionButton>
      </div>
    </form>
  );
}
```

---

## Pattern 5: Combine with `useActionState`

Use together for comprehensive form state management.

```typescript
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';

interface FormState {
  message: string;
  errors?: Record<string, string[]>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Creating account...' : 'Sign Up'}
    </button>
  );
}

export function SignupForm() {
  async function signup(
    prevState: FormState | null,
    formData: FormData
  ): Promise<FormState> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    // Validation
    const errors: Record<string, string[]> = {};
    
    if (!email.includes('@')) {
      errors.email = ['Invalid email address'];
    }
    
    if (password.length < 8) {
      errors.password = ['Password must be at least 8 characters'];
    }
    
    if (Object.keys(errors).length > 0) {
      return { message: 'Validation failed', errors };
    }
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    return { message: 'Account created successfully!' };
  }
  
  const [state, formAction] = useActionState(signup, null);
  
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 block w-full rounded border-gray-300"
        />
        {state?.errors?.email && (
          <p className="mt-1 text-sm text-red-600">{state.errors.email[0]}</p>
        )}
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-1 block w-full rounded border-gray-300"
        />
        {state?.errors?.password && (
          <p className="mt-1 text-sm text-red-600">{state.errors.password[0]}</p>
        )}
      </div>
      
      {state?.message && !state.errors && (
        <div className="p-3 bg-green-50 text-green-800 rounded">
          {state.message}
        </div>
      )}
      
      <SubmitButton />
    </form>
  );
}
```

---

## Pattern 6: Progress Indicator

Show detailed progress during multi-step operations.

```typescript
import { useFormStatus } from 'react-dom';
import { useState, useEffect } from 'react';

function ProgressBar() {
  const { pending } = useFormStatus();
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!pending) {
      setProgress(0);
      return;
    }
    
    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);
    
    return () => clearInterval(interval);
  }, [pending]);
  
  if (!pending) return null;
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function FileUploadForm() {
  async function uploadFile(formData: FormData) {
    'use server';
    await new Promise((resolve) => setTimeout(resolve, 3000));
    // Upload logic
  }
  
  return (
    <form action={uploadFile} className="space-y-4">
      <FormInput label="File" name="file" type="file" required />
      <ProgressBar />
      <SubmitButton>Upload</SubmitButton>
    </form>
  );
}
```

---

## Best Practices

### ✅ Do's

1. **Call `useFormStatus` in child components**:
```typescript
// ✅ Good
function Form() {
  return (
    <form>
      <SubmitButton /> {/* useFormStatus here */}
    </form>
  );
}
```

2. **Use for design system components**:
```typescript
// ✅ Good - Reusable, no prop drilling
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>Submit</button>;
}
```

3. **Disable all inputs during submission**:
```typescript
function FormInput({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return <input name={name} disabled={pending} />;
}
```

### ❌ Don'ts

1. **Don't use in the form component itself**:
```typescript
// ❌ Bad - won't work
function Form() {
  const { pending } = useFormStatus(); // ❌
  return <form>...</form>;
}
```

2. **Don't forget to disable buttons**:
```typescript
// ❌ Bad - can submit multiple times
function SubmitButton() {
  const { pending } = useFormStatus();
  return <button>Submit</button>; // Missing disabled={pending}
}
```

3. **Don't use without Server Actions or form action**:
```typescript
// ❌ Bad - useFormStatus only works with form actions
<form onSubmit={handleSubmit}>
  <SubmitButton /> {/* pending will always be false */}
</form>
```

---

## TypeScript Tips

### Type the Form Status

```typescript
import { useFormStatus } from 'react-dom';

type FormStatus = ReturnType<typeof useFormStatus>;

function SubmitButton() {
  const status: FormStatus = useFormStatus();
  // status.pending, status.data, etc.
}
```

### Type Form Data

```typescript
function SubmitButton() {
  const { data } = useFormStatus();
  
  if (data) {
    const email = data.get('email') as string | null;
    const name = data.get('name') as string | null;
  }
}
```

### Create Typed Form Components

```typescript
interface BaseFormInputProps {
  name: string;
  label: string;
  required?: boolean;
}

interface TextInputProps extends BaseFormInputProps {
  type: 'text' | 'email' | 'password';
}

interface FileInputProps extends BaseFormInputProps {
  type: 'file';
  accept?: string;
}

type FormInputProps = TextInputProps | FileInputProps;

export function FormInput(props: FormInputProps) {
  const { pending } = useFormStatus();
  // Component implementation
}
```

---

## Common Use Cases

| Use Case | Implementation |
|----------|----------------|
| **Submit button with loading** | Basic `useFormStatus` with `pending` |
| **Disable all inputs** | Apply `disabled={pending}` to all inputs |
| **Loading overlay** | Conditional render based on `pending` |
| **Progress bar** | Track progress during `pending` state |
| **Multiple actions** | Use `formAction` with different buttons |
| **Validation feedback** | Combine with `useActionState` |

---

## Summary

- **`useFormStatus`** reads parent form state without prop drilling
- Must be called in a **child component** of the form
- Perfect for building reusable design system components
- Returns `pending`, `data`, `method`, and `action`
- Works with React 19 form actions and Server Actions
- Combine with `useActionState` for comprehensive form handling

---

## Next Steps

- [State Management with Zustand](../03_state_management/01_zustand_intro.md)
- [Data Fetching with TanStack Query](../04_data_fetching/01_tanstack_intro.md)
- [Building Forms with shadcn/ui](../05_ui_libraries/03_forms.md)
