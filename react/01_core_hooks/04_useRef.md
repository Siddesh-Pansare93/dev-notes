# useRef - DOM Access and Mutable Values

Master useRef for accessing DOM elements and storing mutable values that persist across renders without causing re-renders.

## What You'll Learn

- What is useRef and when to use it
- Accessing DOM elements
- Storing mutable values
- useRef vs useState
- Common patterns and use cases

## What is useRef?

`useRef` returns a mutable ref object whose `.current` property is initialized to the passed argument. The returned object persists for the full lifetime of the component.

```typescript
const ref = useRef(initialValue);
// ref.current = initialValue
```

## Two Main Use Cases

1. **Accessing DOM elements**
2. **Storing mutable values that don't trigger re-renders**

## Accessing DOM Elements

### Basic DOM Access

```typescript
import { useRef, useEffect } from 'react';

function TextInputWithFocusButton() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    inputRef.current?.focus();
  };

  return (
    <div>
      <input ref={inputRef} type="text" />
      <button onClick={handleFocus}>Focus Input</button>
    </div>
  );
}
```

### Auto-focus on Mount

```typescript
function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input when component mounts
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} placeholder="Auto-focused" />;
}
```

### Measuring DOM Elements

```typescript
function MeasureElement() {
  const divRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (divRef.current) {
      const { width, height } = divRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  }, []);

  return (
    <div>
      <div ref={divRef} className="box">
        Measure me!
      </div>
      <p>Width: {dimensions.width}px</p>
      <p>Height: {dimensions.height}px</p>
    </div>
  );
}
```

### Scrolling to Element

```typescript
function ScrollToSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const scrollToSection = () => {
    sectionRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  return (
    <div>
      <button onClick={scrollToSection}>Scroll to Section</button>
      
      <div style={{ height: '150vh' }}>Scroll down...</div>
      
      <div ref={sectionRef} className="target-section">
        <h2>Target Section</h2>
      </div>
    </div>
  );
}
```

## Storing Mutable Values

### useRef vs useState

```typescript
// ❌ Using useState causes unnecessary re-renders
function BadCounter() {
  const [renderCount, setRenderCount] = useState(0);
  
  useEffect(() => {
    setRenderCount(renderCount + 1); // Causes re-render!
  });

  return <div>Rendered {renderCount} times</div>;
}

// ✅ Using useRef doesn't cause re-renders
function GoodCounter() {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1; // No re-render
  });

  return <div>Rendered {renderCount.current} times</div>;
}
```

### Storing Previous Values

```typescript
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

// Usage
function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <div>
      <p>Current: {count}</p>
      <p>Previous: {prevCount}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### Storing Interval/Timer IDs

```typescript
function Timer() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const start = () => {
    if (intervalRef.current !== null) return;
    
    setIsRunning(true);
    intervalRef.current = window.setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
  };

  const stop = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsRunning(false);
    }
  };

  const reset = () => {
    stop();
    setSeconds(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div>
      <h1>{seconds}s</h1>
      <button onClick={start} disabled={isRunning}>Start</button>
      <button onClick={stop} disabled={!isRunning}>Stop</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
```

### Storing Latest Callback

```typescript
function useLatestCallback<T extends (...args: any[]) => any>(callback: T) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []);
}

// Usage
function ChatRoom({ roomId }: { roomId: string }) {
  const [message, setMessage] = useState('');

  const sendMessage = useLatestCallback(() => {
    // This always uses the latest message value
    console.log(`Sending: ${message} to room ${roomId}`);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      sendMessage(); // Uses latest message
    }, 5000);

    return () => clearInterval(interval);
  }, [roomId]); // Only re-run when roomId changes

  return (
    <input 
      value={message} 
      onChange={(e) => setMessage(e.target.value)} 
    />
  );
}
```

## Advanced Patterns

### Click Outside Detector

```typescript
function useClickOutside<T extends HTMLElement>(
  callback: () => void
): React.RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [callback]);

  return ref;
}

// Usage
function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  return (
    <div ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && (
        <div className="dropdown-menu">
          <ul>
            <li>Option 1</li>
            <li>Option 2</li>
            <li>Option 3</li>
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Managing Multiple Refs

```typescript
function FormWithMultipleInputs() {
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const focusInput = (name: string) => {
    inputRefs.current[name]?.focus();
  };

  return (
    <form>
      <input
        ref={(el) => (inputRefs.current['email'] = el)}
        name="email"
        placeholder="Email"
      />
      <input
        ref={(el) => (inputRefs.current['password'] = el)}
        name="password"
        type="password"
        placeholder="Password"
      />
      <button type="button" onClick={() => focusInput('email')}>
        Focus Email
      </button>
      <button type="button" onClick={() => focusInput('password')}>
        Focus Password
      </button>
    </form>
  );
}
```

### Refs with Dynamic Lists

```typescript
interface Item {
  id: string;
  name: string;
}

function DynamicList({ items }: { items: Item[] }) {
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const scrollToItem = (id: string) => {
    const node = itemRefs.current.get(id);
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div>
      <ul>
        {items.map((item) => (
          <li
            key={item.id}
            ref={(node) => {
              if (node) {
                itemRefs.current.set(item.id, node);
              } else {
                itemRefs.current.delete(item.id);
              }
            }}
          >
            {item.name}
            <button onClick={() => scrollToItem(item.id)}>Scroll to me</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Video/Audio Control

```typescript
function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    console.log(videoRef.current?.currentTime);
  };

  return (
    <div>
      <video
        ref={videoRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />
      <button onClick={togglePlay}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  );
}
```

## Forwarding Refs

### Using forwardRef

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const CustomInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...props }, ref) => {
    return (
      <div>
        {label && <label>{label}</label>}
        <input ref={ref} {...props} />
      </div>
    );
  }
);

CustomInput.displayName = 'CustomInput';

// Usage
function ParentComponent() {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <CustomInput ref={inputRef} label="Email" />
      <button onClick={() => inputRef.current?.focus()}>
        Focus Input
      </button>
    </div>
  );
}
```

### useImperativeHandle

```typescript
interface FancyInputHandle {
  focus: () => void;
  scrollIntoView: () => void;
  getValue: () => string;
}

interface FancyInputProps {
  defaultValue?: string;
}

const FancyInput = React.forwardRef<FancyInputHandle, FancyInputProps>(
  ({ defaultValue = '' }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState(defaultValue);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
      scrollIntoView: () => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth' });
      },
      getValue: () => {
        return value;
      },
    }));

    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    );
  }
);

// Usage
function Form() {
  const inputRef = useRef<FancyInputHandle>(null);

  const handleSubmit = () => {
    console.log('Value:', inputRef.current?.getValue());
    inputRef.current?.focus();
  };

  return (
    <div>
      <FancyInput ref={inputRef} />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
```

## Common Patterns

### Debounced Input

```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timerRef = useRef<number>();

  useEffect(() => {
    timerRef.current = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchInput() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearchTerm) {
      // Perform search
      console.log('Searching for:', debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

## useRef vs useState Decision Table

| Use Case | Use useRef | Use useState |
|----------|-----------|--------------|
| Accessing DOM elements | ✅ | ❌ |
| Storing timer IDs | ✅ | ❌ |
| Storing previous values | ✅ | ❌ |
| Tracking render count | ✅ | ❌ |
| Storing mutable values | ✅ | ❌ |
| Triggering re-renders | ❌ | ✅ |
| Displaying data to user | ❌ | ✅ |
| Form input values | ❌ | ✅ |

## Best Practices

1. **Don't read/write ref.current during render**
```typescript
// ❌ Bad
function Bad() {
  const ref = useRef(0);
  ref.current += 1; // Don't do this during render
  return <div>{ref.current}</div>;
}

// ✅ Good
function Good() {
  const ref = useRef(0);
  
  useEffect(() => {
    ref.current += 1; // Do this in effects or event handlers
  });
  
  return <div>{ref.current}</div>;
}
```

2. **Type your refs properly**
```typescript
const inputRef = useRef<HTMLInputElement>(null);
const divRef = useRef<HTMLDivElement>(null);
const intervalRef = useRef<number | null>(null);
```

3. **Always check if ref.current exists**
```typescript
if (inputRef.current) {
  inputRef.current.focus();
}

// Or use optional chaining
inputRef.current?.focus();
```

## Common Mistakes

```typescript
// ❌ Don't use ref for values that affect rendering
const [count, setCount] = useState(0); // Use this for UI
const countRef = useRef(0); // Not this

// ❌ Don't forget to cleanup
useEffect(() => {
  const id = setInterval(() => {}, 1000);
  // Missing cleanup!
}, []);

// ✅ Always cleanup
useEffect(() => {
  const id = setInterval(() => {}, 1000);
  return () => clearInterval(id);
}, []);
```

## Next Steps

- [useMemo and useCallback](./05_useMemo_useCallback.md)
- [useReducer](../02_advanced_hooks/01_useReducer.md)

## Summary

useRef is essential for:
- ✅ Accessing DOM elements
- ✅ Storing mutable values without re-renders
- ✅ Keeping references to timers/intervals
- ✅ Storing previous values
- ✅ Implementing custom hooks
