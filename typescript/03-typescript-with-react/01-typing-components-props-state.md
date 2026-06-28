# Typing Components, Props, and State

## What You'll Learn

- The difference between `React.FC` and plain function declarations (and why the community moved away from `FC`)
- How to type props with interfaces and type aliases
- Handling optional props and default values cleanly
- Typing `children` with `ReactNode` and `PropsWithChildren`
- Typing event handlers like `onClick`, `onChange`, and `onSubmit`
- Using discriminated union props to build polymorphic components

---

## FC vs Plain Function Declarations

Early in React + TypeScript adoption, `React.FC` (or `React.FunctionComponent`) was the go-to pattern. You will still see it in older codebases, but the community has largely moved away from it.

```tsx
// The old way: React.FC
const Greeting: React.FC<{ name: string }> = ({ name }) => {
  return <h1>Hello, {name}</h1>;
};

// The modern way: plain function with typed props
interface GreetingProps {
  name: string;
}

function Greeting({ name }: GreetingProps) {
  return <h1>Hello, {name}</h1>;
}
```

**Why did `FC` fall out of favor?**

1. **Implicit `children`**: Before React 18, `FC` automatically included `children` in every component's props, even when you did not want them. React 18 removed this, but the damage to community trust was done.
2. **Generic components**: You cannot easily make a generic component with `FC`. Plain functions handle generics naturally.
3. **Default props**: `FC` had awkward interactions with `defaultProps` (now deprecated anyway).
4. **Simplicity**: A plain function with typed arguments is just simpler and more predictable.

> **Coming from JS:** In plain JavaScript React, you might use `PropTypes` for runtime type checking. With TypeScript, you get compile-time checking that is far more powerful. You can safely remove `prop-types` from your dependencies.

---

## Typing Props with Interfaces

Use an `interface` (or `type` alias) to define the shape of your props. Both work; `interface` is slightly preferred for props because it produces better error messages and supports declaration merging.

```tsx
interface ButtonProps {
  label: string;
  variant: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick: () => void;
}

function Button({ label, variant, size = "md", disabled = false, onClick }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// Usage - TypeScript enforces the contract
<Button label="Save" variant="primary" onClick={handleSave} />
<Button label="Delete" variant="danger" size="lg" onClick={handleDelete} />

// Error: Property 'variant' is missing
<Button label="Oops" onClick={handleSave} />
```

---

## Optional Props and Default Values

Mark optional props with `?`. Provide defaults using destructuring, not `defaultProps` (which is deprecated).

```tsx
interface CardProps {
  title: string;
  subtitle?: string;
  elevation?: 0 | 1 | 2 | 3;
  bordered?: boolean;
  className?: string;
}

function Card({
  title,
  subtitle,
  elevation = 1,
  bordered = false,
  className = "",
}: CardProps) {
  return (
    <div
      className={`card elevation-${elevation} ${bordered ? "bordered" : ""} ${className}`}
    >
      <h2 className="card-title">{title}</h2>
      {subtitle && <p className="card-subtitle">{subtitle}</p>}
    </div>
  );
}
```

> **Coming from JS:** You probably already use destructured defaults in JS. The only difference in TS is you declare the optional nature with `?` in the interface. The destructuring default then kicks in only when the value is `undefined`.

---

## Typing Children

React components that accept children need to declare that explicitly. There are two common approaches.

### Approach 1: `ReactNode` directly

```tsx
import { ReactNode } from "react";

interface PanelProps {
  title: string;
  children: ReactNode;
}

function Panel({ title, children }: PanelProps) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      <div className="panel-body">{children}</div>
    </section>
  );
}
```

### Approach 2: `PropsWithChildren`

```tsx
import { PropsWithChildren } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

function Modal({ isOpen, onClose, title, children }: PropsWithChildren<ModalProps>) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// Usage
<Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Confirm Delete">
  <p>Are you sure you want to delete this item?</p>
  <button onClick={handleDelete}>Yes, delete it</button>
</Modal>
```

`ReactNode` covers everything renderable: strings, numbers, JSX, arrays, `null`, `undefined`, and booleans. Prefer `ReactNode` over `JSX.Element` because the latter is too narrow (it excludes strings, numbers, null, etc.).

---

## Typing Event Handlers

React provides specific event types for every kind of DOM event. The generic parameter is the element type the event originates from.

```tsx
import { useState, FormEvent, ChangeEvent, MouseEvent } from "react";

interface SearchFormProps {
  onSearch: (query: string) => void;
}

function SearchForm({ onSearch }: SearchFormProps) {
  const [query, setQuery] = useState("");

  // ChangeEvent<HTMLInputElement> for input onChange
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // FormEvent<HTMLFormElement> for form onSubmit
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch(query);
  };

  // MouseEvent<HTMLButtonElement> for button onClick
  const handleClear = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setQuery("");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search..."
      />
      <button type="submit">Search</button>
      <button type="button" onClick={handleClear}>Clear</button>
    </form>
  );
}
```

### Common Event Types

| Event | Type | Use Case |
|---|---|---|
| `onClick` | `MouseEvent<HTMLButtonElement>` | Button clicks |
| `onChange` | `ChangeEvent<HTMLInputElement>` | Input changes |
| `onSubmit` | `FormEvent<HTMLFormElement>` | Form submissions |
| `onKeyDown` | `KeyboardEvent<HTMLInputElement>` | Keyboard input |
| `onFocus` | `FocusEvent<HTMLInputElement>` | Focus/blur |
| `onDrag` | `DragEvent<HTMLDivElement>` | Drag and drop |

### Inline Handlers

When you write the handler inline, TypeScript infers the event type automatically. You only need explicit types when you extract the handler to a separate function.

```tsx
// Inline - type is inferred, no annotation needed
<input onChange={(e) => setQuery(e.target.value)} />

// Extracted - you need the type annotation
const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  setQuery(e.target.value);
};
<input onChange={handleChange} />
```

> **Coming from JS:** In JavaScript you would just use `e` and hope for the best. In TypeScript, the event types give you autocomplete for `e.target.value`, `e.currentTarget`, `e.key`, etc. You will never misspell a property name again.

---

## Discriminated Union Props

This is one of the most powerful TypeScript patterns for React. A component can accept different sets of props depending on a discriminating field.

### Polymorphic Button Component

```tsx
// A button that's either a regular button or a link styled as a button
type ButtonBaseProps = {
  label: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "danger";
};

type ButtonAsButton = ButtonBaseProps & {
  as?: "button";
  onClick: () => void;
  type?: "button" | "submit" | "reset";
};

type ButtonAsLink = ButtonBaseProps & {
  as: "link";
  href: string;
  target?: "_blank" | "_self";
};

type PolymorphicButtonProps = ButtonAsButton | ButtonAsLink;

function PolymorphicButton(props: PolymorphicButtonProps) {
  const { label, size = "md", variant = "primary" } = props;
  const className = `btn btn-${variant} btn-${size}`;

  if (props.as === "link") {
    return (
      <a href={props.href} target={props.target} className={className}>
        {label}
      </a>
    );
  }

  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      className={className}
    >
      {label}
    </button>
  );
}

// Usage - TypeScript narrows the type based on `as`
<PolymorphicButton label="Save" onClick={handleSave} />
<PolymorphicButton as="link" label="Go Home" href="/" target="_blank" />

// Error: Property 'href' does not exist when as is "button"
<PolymorphicButton as="button" label="Bad" href="/oops" onClick={() => {}} />
```

### Notification Component with Discriminated Unions

```tsx
type NotificationBase = {
  id: string;
  message: string;
  timestamp: Date;
};

type InfoNotification = NotificationBase & {
  type: "info";
};

type ErrorNotification = NotificationBase & {
  type: "error";
  errorCode: number;
  retryAction?: () => void;
};

type SuccessNotification = NotificationBase & {
  type: "success";
  autoDismissMs?: number;
};

type NotificationProps = InfoNotification | ErrorNotification | SuccessNotification;

function Notification(props: NotificationProps) {
  const { type, message, timestamp } = props;

  return (
    <div className={`notification notification-${type}`}>
      <p>{message}</p>
      <time>{timestamp.toLocaleTimeString()}</time>

      {/* TypeScript knows errorCode only exists on "error" */}
      {props.type === "error" && (
        <div className="error-details">
          <span>Error code: {props.errorCode}</span>
          {props.retryAction && (
            <button onClick={props.retryAction}>Retry</button>
          )}
        </div>
      )}

      {props.type === "success" && props.autoDismissMs && (
        <span className="auto-dismiss">
          Dismissing in {props.autoDismissMs / 1000}s
        </span>
      )}
    </div>
  );
}
```

> **Coming from JS:** Discriminated unions are impossible to replicate with PropTypes. This is where TypeScript genuinely changes the way you design components. You can model "if prop A is X, then props B and C are required, but D is not allowed" -- something that would require complex custom PropTypes validators.

---

## Putting It All Together: A Complete Component

```tsx
import { ReactNode, MouseEvent } from "react";

// Props with discriminated union, optional fields, children, and events
interface DialogAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
}

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  actions: DialogAction[];
  size?: "sm" | "md" | "lg";
  closeOnOverlayClick?: boolean;
}

function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  actions,
  size = "md",
  closeOnOverlayClick = true,
}: DialogProps) {
  if (!isOpen) return null;

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      <div className={`dialog dialog-${size}`} role="dialog" aria-modal="true">
        <header className="dialog-header">
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Close">&times;</button>
        </header>

        {description && <p className="dialog-description">{description}</p>}

        {children && <div className="dialog-body">{children}</div>}

        <footer className="dialog-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`btn btn-${action.variant ?? "secondary"}`}
            >
              {action.label}
            </button>
          ))}
        </footer>
      </div>
    </div>
  );
}

// Usage
function App() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <Dialog
      isOpen={showDialog}
      onClose={() => setShowDialog(false)}
      title="Unsaved Changes"
      description="You have unsaved changes. What would you like to do?"
      size="sm"
      actions={[
        { label: "Discard", onClick: handleDiscard, variant: "danger" },
        { label: "Save", onClick: handleSave, variant: "primary" },
      ]}
    />
  );
}
```

---

## Mini-Exercise

Build a `<TextField>` component with the following requirements:

1. Required props: `label` (string), `value` (string), `onChange` (receives the new string value, not the event).
2. Optional props: `placeholder`, `disabled`, `error` (a string to display as an error message), `type` (either `"text"`, `"email"`, or `"password"`, defaulting to `"text"`).
3. Use a discriminated union so that when `multiline` is `true`, the component renders a `<textarea>` and accepts an optional `rows` prop (number), but when `multiline` is `false` or omitted, it renders an `<input>` and `rows` is not accepted.
4. Type the internal `handleChange` event handler with the correct React event type (note: `textarea` and `input` have different element types).

Try building it before looking at any solutions. Focus on getting the types right -- the styling does not matter.
