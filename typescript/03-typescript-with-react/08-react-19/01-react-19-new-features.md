# React 19 New Features

React 19 introduces major features focusing on data fetching, form handling, and developer experience. Let's explore the key additions.

## 1. Actions and `useActionState`

React 19 native form actions replace manual `e.preventDefault()` handling. When a function is passed to the `<form action>` prop, React handles the submission automatically.

The new `useActionState` hook (formerly `useFormState`) allows you to update state based on the result of a form action.

```tsx
import { useActionState } from 'react';

// Simulated server action
async function updateName(prevState: { error: string | null }, formData: FormData) {
  const name = formData.get('name') as string;
  if (name === 'admin') return { error: 'Name reserved' };
  
  // Fake API call
  await new Promise(res => setTimeout(res, 1000));
  return { error: null };
}

export default function ProfileForm() {
  const [state, submitAction, isPending] = useActionState(updateName, { error: null });

  return (
    <form action={submitAction}>
      <input type="text" name="name" disabled={isPending} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Updating...' : 'Update'}
      </button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}
```

## 2. `useFormStatus`

`useFormStatus` provides status information about the parent `<form>`. It's a Hook version of a Context provider for forms.

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  // Must be rendered INSIDE a <form action={...}>
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Submitting...' : 'Submit'}</button>;
}
```

## 3. The `useOptimistic` Hook

`useOptimistic` lets you show UI changes immediately while a background mutation completes.

```tsx
import { useOptimistic, useRef } from 'react';

export function MessageList({ messages, sendMessage }: any) {
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage: string) => [...state, { text: newMessage, sending: true }]
  );
  const formRef = useRef<HTMLFormElement>(null);

  async function action(formData: FormData) {
    const text = formData.get('message') as string;
    addOptimisticMessage(text);
    formRef.current?.reset();
    await sendMessage(text);
  }

  return (
    <>
      {optimisticMessages.map((m: any, i: number) => (
        <div key={i} style={{ opacity: m.sending ? 0.5 : 1 }}>{m.text}</div>
      ))}
      <form action={action} ref={formRef}>
        <input type="text" name="message" />
        <button type="submit">Send</button>
      </form>
    </>
  );
}
```

## 4. The `use()` API

`use()` allows you to read the value of a Promise or Context anywhere in the component, including conditionally.

```tsx
import { use, Suspense } from 'react';
import { ThemeContext } from './theme';

// Reading Context (can be inside an if statement!)
function ThemedText({ showTheme }: { showTheme: boolean }) {
  if (showTheme) {
    const theme = use(ThemeContext);
    return <p>Current theme: {theme}</p>;
  }
  return <p>No theme info</p>;
}

// Reading a Promise
function UserProfile({ userPromise }: { userPromise: Promise<any> }) {
  const user = use(userPromise); // Suspend until resolved
  return <div>{user.name}</div>;
}
```

## 5. Developer Experience Improvements

### `ref` as a Prop
You no longer need `forwardRef` to pass refs! `ref` is now just a standard prop on function components.

```tsx
// React 18:
// const Input = forwardRef((props, ref) => <input ref={ref} {...props} />);

// React 19:
function Input({ placeholder, ref }: { placeholder: string, ref: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} placeholder={placeholder} />;
}
```

### `<Context>` as a Provider
You can render `<ThemeContext>` directly instead of `<ThemeContext.Provider>`.

### Ref Cleanup Functions
Refs now support returning cleanup functions.

```tsx
<div ref={(node) => {
  console.log('Mounted:', node);
  return () => console.log('Unmounted:', node); // Cleanup function!
}} />
```

### Document Metadata
React 19 natively supports hoisting `<title>`, `<meta>`, `<link>`, and `<script>` tags to the `<head>` of the document from anywhere in the component tree.

```tsx
function BlogPost() {
  return (
    <article>
      <title>My Blog Post</title>
      <meta name="description" content="A great read" />
      <h1>Post Title</h1>
    </article>
  );
}
```