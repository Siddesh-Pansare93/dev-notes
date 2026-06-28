# Type-Safe Event Handlers in TypeScript

Master type-safe event handling patterns in React with TypeScript.

## What You'll Learn

- React synthetic event types
- Type-safe event handlers
- Custom event patterns
- Form event handling
- Keyboard and mouse events
- Generic event handler patterns
- Event delegation
- Performance optimization

## 1. Common Event Types

### Mouse Events

```typescript
import { MouseEvent } from 'react';

function MouseEventExamples() {
  // Basic click handler
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    console.log('Button clicked:', event.currentTarget.textContent);
  };

  // With event details
  const handleClickWithDetails = (event: MouseEvent<HTMLDivElement>) => {
    console.log({
      clientX: event.clientX,
      clientY: event.clientY,
      button: event.button, // 0: left, 1: middle, 2: right
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
    });
  };

  // Prevent default behavior
  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    console.log('Link prevented');
  };

  return (
    <div>
      <button onClick={handleClick}>Click Me</button>
      
      <div
        onClick={handleClickWithDetails}
        onDoubleClick={() => console.log('Double clicked')}
        onContextMenu={(e) => {
          e.preventDefault();
          console.log('Right clicked');
        }}
        className="p-4 border cursor-pointer"
      >
        Click, Double-click, or Right-click me
      </div>

      <a href="https://example.com" onClick={handleLinkClick}>
        Prevented Link
      </a>
    </div>
  );
}

export default MouseEventExamples;
```

### Keyboard Events

```typescript
import { KeyboardEvent, useState } from 'react';

function KeyboardEventExamples() {
  const [value, setValue] = useState('');

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    console.log('Key:', event.key);
    console.log('Code:', event.code);
    console.log('Alt key:', event.altKey);
    console.log('Ctrl key:', event.ctrlKey);
    console.log('Shift key:', event.shiftKey);

    // Handle specific keys
    if (event.key === 'Enter') {
      console.log('Enter pressed');
    }

    // Key combinations
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      console.log('Ctrl+S pressed');
    }

    if (event.key === 'Escape') {
      setValue('');
    }
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Limit character input
    if (event.key.length === 1 && !/[a-zA-Z0-9\s]/.test(event.key)) {
      event.preventDefault();
      console.log('Only alphanumeric characters allowed');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label>Try Escape to clear, or Ctrl+S</label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-2 border rounded"
          placeholder="Type something..."
        />
      </div>

      <div>
        <label>Alphanumeric only</label>
        <textarea
          onKeyPress={handleKeyPress}
          className="w-full p-2 border rounded"
          placeholder="Type letters or numbers..."
        />
      </div>
    </div>
  );
}

export default KeyboardEventExamples;
```

## 2. Form Events

### Input Change Events

```typescript
import { ChangeEvent, FormEvent, useState } from 'react';

interface FormData {
  username: string;
  email: string;
  age: number;
  bio: string;
  country: string;
  subscribe: boolean;
}

function TypeSafeForm() {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    age: 0,
    bio: '',
    country: '',
    subscribe: false,
  });

  // Type-safe input handler
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Textarea handler
  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Select handler
  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Number input handler with validation
  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setFormData((prev) => ({ ...prev, [name]: numValue }));
    }
  };

  // Form submission
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Username</label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label>Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label>Age</label>
        <input
          type="number"
          name="age"
          value={formData.age}
          onChange={handleNumberChange}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label>Bio</label>
        <textarea
          name="bio"
          value={formData.bio}
          onChange={handleTextareaChange}
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label>Country</label>
        <select
          name="country"
          value={formData.country}
          onChange={handleSelectChange}
          className="w-full p-2 border rounded"
        >
          <option value="">Select</option>
          <option value="us">United States</option>
          <option value="uk">United Kingdom</option>
          <option value="ca">Canada</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="subscribe"
          checked={formData.subscribe}
          onChange={handleInputChange}
        />
        <label>Subscribe to newsletter</label>
      </div>

      <button
        type="submit"
        className="px-4 py-2 bg-primary text-primary-foreground rounded"
      >
        Submit
      </button>
    </form>
  );
}

export default TypeSafeForm;
```

## 3. Generic Event Handlers

### Reusable Event Handler Types

```typescript
import { ChangeEvent, FocusEvent, MouseEvent } from 'react';

// Generic event handler types
type InputChangeHandler = (event: ChangeEvent<HTMLInputElement>) => void;
type TextareaChangeHandler = (event: ChangeEvent<HTMLTextAreaElement>) => void;
type SelectChangeHandler = (event: ChangeEvent<HTMLSelectElement>) => void;
type ButtonClickHandler = (event: MouseEvent<HTMLButtonElement>) => void;
type InputFocusHandler = (event: FocusEvent<HTMLInputElement>) => void;

// Generic form field component
interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: InputChangeHandler;
  onFocus?: InputFocusHandler;
  onBlur?: InputFocusHandler;
  type?: string;
  error?: string;
}

function FormField({
  label,
  name,
  value,
  onChange,
  onFocus,
  onBlur,
  type = 'text',
  error,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full p-2 border rounded"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

// Usage
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleEmailChange: InputChangeHandler = (event) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange: InputChangeHandler = (event) => {
    setPassword(event.target.value);
  };

  const handleFocus: InputFocusHandler = (event) => {
    console.log('Focused:', event.target.name);
  };

  const handleSubmit: ButtonClickHandler = (event) => {
    event.preventDefault();
    console.log({ email, password });
  };

  return (
    <div className="space-y-4">
      <FormField
        label="Email"
        name="email"
        value={email}
        onChange={handleEmailChange}
        onFocus={handleFocus}
        type="email"
      />
      <FormField
        label="Password"
        name="password"
        value={password}
        onChange={handlePasswordChange}
        onFocus={handleFocus}
        type="password"
      />
      <button onClick={handleSubmit}>Login</button>
    </div>
  );
}
```

## 4. Custom Event Patterns

### Create Type-Safe Custom Events

```typescript
import { createContext, useContext, ReactNode } from 'react';

// Define custom event types
interface CustomEvents {
  'user:login': { userId: number; username: string };
  'user:logout': { reason: string };
  'notification:show': { message: string; type: 'success' | 'error' | 'info' };
}

type EventName = keyof CustomEvents;
type EventHandler<T extends EventName> = (data: CustomEvents[T]) => void;

// Event emitter
class TypedEventEmitter {
  private listeners: Map<string, Set<Function>> = new Map();

  on<T extends EventName>(event: T, handler: EventHandler<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  off<T extends EventName>(event: T, handler: EventHandler<T>) {
    this.listeners.get(event)?.delete(handler);
  }

  emit<T extends EventName>(event: T, data: CustomEvents[T]) {
    this.listeners.get(event)?.forEach((handler) => handler(data));
  }
}

// Create context
const EventContext = createContext<TypedEventEmitter | null>(null);

export function EventProvider({ children }: { children: ReactNode }) {
  const emitter = new TypedEventEmitter();

  return (
    <EventContext.Provider value={emitter}>{children}</EventContext.Provider>
  );
}

// Hook to use events
export function useEvent() {
  const emitter = useContext(EventContext);
  if (!emitter) throw new Error('useEvent must be used within EventProvider');
  return emitter;
}

// Usage
function UserLogin() {
  const emitter = useEvent();

  const handleLogin = () => {
    // Type-safe event emission
    emitter.emit('user:login', { userId: 1, username: 'john_doe' });
  };

  return <button onClick={handleLogin}>Login</button>;
}

function NotificationListener() {
  const emitter = useEvent();

  useEffect(() => {
    // Type-safe event listener
    const unsubscribe = emitter.on('user:login', (data) => {
      console.log(`User ${data.username} logged in`);
    });

    return unsubscribe;
  }, [emitter]);

  return null;
}
```

## 5. Event Delegation Pattern

```typescript
import { MouseEvent } from 'react';

interface ListItem {
  id: number;
  name: string;
  category: string;
}

function EventDelegationList() {
  const items: ListItem[] = [
    { id: 1, name: 'Item 1', category: 'A' },
    { id: 2, name: 'Item 2', category: 'B' },
    { id: 3, name: 'Item 3', category: 'A' },
  ];

  // Single event handler for all items
  const handleListClick = (event: MouseEvent<HTMLUListElement>) => {
    const target = event.target as HTMLElement;
    const listItem = target.closest('[data-item-id]') as HTMLElement;

    if (!listItem) return;

    const itemId = listItem.dataset.itemId;
    const action = (target as HTMLButtonElement).dataset.action;

    if (action === 'edit') {
      console.log('Edit item:', itemId);
    } else if (action === 'delete') {
      console.log('Delete item:', itemId);
    } else {
      console.log('View item:', itemId);
    }
  };

  return (
    <ul onClick={handleListClick} className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          data-item-id={item.id}
          className="p-4 border rounded flex items-center justify-between"
        >
          <span>{item.name}</span>
          <div className="flex gap-2">
            <button data-action="edit" className="px-2 py-1 border rounded">
              Edit
            </button>
            <button data-action="delete" className="px-2 py-1 border rounded">
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default EventDelegationList;
```

## 6. Debounced and Throttled Events

```typescript
import { ChangeEvent, useCallback, useRef } from 'react';

// Debounce hook
function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

// Throttle hook
function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args) => {
      const now = Date.now();

      if (now - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRun.current = Date.now();
        }, delay - (now - lastRun.current));
      }
    }) as T,
    [callback, delay]
  );
}

// Usage
function SearchInput() {
  const [query, setQuery] = useState('');

  // Debounced search (waits for user to stop typing)
  const debouncedSearch = useDebounce((value: string) => {
    console.log('Searching for:', value);
    // API call here
  }, 500);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  return (
    <input
      type="text"
      value={query}
      onChange={handleChange}
      placeholder="Search..."
      className="w-full p-2 border rounded"
    />
  );
}

function ScrollTracker() {
  // Throttled scroll (triggers at most once per interval)
  const throttledScroll = useThrottle(() => {
    console.log('Scroll position:', window.scrollY);
  }, 200);

  useEffect(() => {
    window.addEventListener('scroll', throttledScroll);
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [throttledScroll]);

  return <div>Scroll to see throttled logs</div>;
}
```

## 7. Drag and Drop Events

```typescript
import { DragEvent, useState } from 'react';

interface DragItem {
  id: number;
  content: string;
}

function DragAndDropExample() {
  const [items, setItems] = useState<DragItem[]>([
    { id: 1, content: 'Item 1' },
    { id: 2, content: 'Item 2' },
    { id: 3, content: 'Item 3' },
  ]);
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);

  const handleDragStart = (event: DragEvent<HTMLDivElement>, item: DragItem) => {
    setDraggedItem(item);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, dropIndex: number) => {
    event.preventDefault();
    if (!draggedItem) return;

    const dragIndex = items.findIndex((item) => item.id === draggedItem.id);
    if (dragIndex === dropIndex) return;

    const newItems = [...items];
    newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);

    setItems(newItems);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(e, item)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={`p-4 border rounded cursor-move ${
            draggedItem?.id === item.id ? 'opacity-50' : ''
          }`}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}

export default DragAndDropExample;
```

## Best Practices

### ✅ Do's

- Use specific event types (MouseEvent, KeyboardEvent, etc.)
- Prevent default behavior when necessary
- Use event delegation for lists
- Debounce/throttle expensive event handlers
- Type event handlers properly
- Use `currentTarget` for element that has the listener
- Use `target` for element that triggered the event
- Clean up event listeners in useEffect

### ❌ Don'ts

- Don't use `any` for event types
- Don't forget to prevent default for forms
- Don't attach too many individual event listeners
- Don't forget to clean up event listeners
- Don't use inline arrow functions for event handlers (creates new function on every render)
- Don't access synthetic events asynchronously
- Don't forget keyboard accessibility
- Don't ignore error boundaries for async event handlers

## React Synthetic Events vs Native Events

| React Synthetic Event | Native Event | When to Use |
|----------------------|--------------|-------------|
| `onClick` | `click` | React component events |
| `onChange` | `change` | Controlled components |
| `onSubmit` | `submit` | Form submission |
| `addEventListener` | N/A | Outside React tree, cleanup needed |

## Next Steps

- **[Utility Types](./04_utility_types.md)** - TypeScript utility types for React
- **[Error Handling](../07_clean_code/03_error_handling.md)** - Handle errors in event handlers
- **[Performance](../07_clean_code/05_performance.md)** - Optimize event handlers
- **[Testing](../07_clean_code/04_testing.md)** - Test event handlers
