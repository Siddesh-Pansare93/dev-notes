# useEffect - Side Effects and Lifecycle

Master useEffect for handling side effects, data fetching, subscriptions, and component lifecycle in React.

## What You'll Learn

- Understanding side effects in React
- useEffect syntax and dependency array
- Cleanup functions
- Common useEffect patterns
- TypeScript best practices
- Performance optimization

## What are Side Effects?

Side effects are operations that affect things outside the component:
- Fetching data from APIs
- Subscribing to events
- Manually changing the DOM
- Setting up timers
- Reading/writing to localStorage

## Basic useEffect Syntax

```typescript
import { useEffect } from 'react';

function Component() {
  useEffect(() => {
    // Effect code runs after render
    console.log('Component rendered');
    
    // Optional cleanup function
    return () => {
      console.log('Component will unmount or effect will re-run');
    };
  }, [/* dependencies */]);
}
```

## Dependency Array Patterns

### No Dependency Array (Runs on Every Render)

```typescript
useEffect(() => {
  console.log('Runs after every render');
});
```

### Empty Dependency Array (Runs Once on Mount)

```typescript
useEffect(() => {
  console.log('Runs once when component mounts');
  
  return () => {
    console.log('Runs once when component unmounts');
  };
}, []);
```

### With Dependencies (Runs When Dependencies Change)

```typescript
function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    console.log('Runs when query changes');
    fetchResults(query).then(setResults);
  }, [query]); // Re-run when query changes

  return <div>{/* Render results */}</div>;
}
```

## Data Fetching with useEffect

### Basic Data Fetching

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`https://api.example.com/users/${userId}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch');
        return response.json();
      })
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>No user found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

### Data Fetching with Async/Await

```typescript
function UserProfile({ userId }: { userId: number }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Can't make useEffect callback async directly
    // Create async function inside
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  // Render logic...
}
```

### Handling Race Conditions

```typescript
function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false; // Flag to prevent race conditions

    const fetchResults = async () => {
      const response = await fetch(`/api/search?q=${query}`);
      const data = await response.json();
      
      // Only update if this is still the latest request
      if (!ignore) {
        setResults(data);
      }
    };

    if (query) {
      fetchResults();
    }

    return () => {
      ignore = true; // Cleanup: mark this request as outdated
    };
  }, [query]);

  return (
    <ul>
      {results.map((result, index) => (
        <li key={index}>{result}</li>
      ))}
    </ul>
  );
}
```

### Abort Controller Pattern

```typescript
function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/search?q=${query}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        setResults(data);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          console.error('Fetch error:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      fetchResults();
    }

    return () => {
      controller.abort(); // Cancel ongoing request
    };
  }, [query]);

  return <div>{/* Render results */}</div>;
}
```

## Event Listeners and Subscriptions

### Window Event Listeners

```typescript
function WindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    // Cleanup: Remove listener on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Empty array: only add listener once

  return (
    <div>
      Window size: {size.width} x {size.height}
    </div>
  );
}
```

### Document Event Listeners

```typescript
function ClickOutsideDetector() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Open</button>
      {isOpen && (
        <div ref={ref} className="modal">
          Click outside to close
        </div>
      )}
    </div>
  );
}
```

### Keyboard Event Listener

```typescript
function KeyboardShortcuts() {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        console.log('Save shortcut pressed');
        // Save logic
      }
      if (event.key === 'Escape') {
        console.log('Escape pressed');
        // Close modal logic
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return <div>Press Ctrl+S to save, Esc to close</div>;
}
```

## Timers and Intervals

### setTimeout

```typescript
function DelayedMessage() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, 3000);

    // Cleanup: Clear timeout if component unmounts
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return <div>{show && <p>This message appeared after 3 seconds</p>}</div>;
}
```

### setInterval

```typescript
function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Cleanup: Clear interval on unmount
    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      Current time: {time.toLocaleTimeString()}
    </div>
  );
}
```

## Local Storage Sync

```typescript
function PersistentCounter() {
  const [count, setCount] = useState(() => {
    // Initialize from localStorage
    const saved = localStorage.getItem('count');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Sync to localStorage whenever count changes
  useEffect(() => {
    localStorage.setItem('count', count.toString());
  }, [count]);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

## Document Title Updates

```typescript
function PageTitle({ title }: { title: string }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    // Restore previous title on unmount
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return null;
}

// Usage
function AboutPage() {
  return (
    <>
      <PageTitle title="About Us - My App" />
      <div>About page content</div>
    </>
  );
}
```

## Combining Multiple Effects

```typescript
function UserDashboard({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);

  // Effect 1: Fetch user data
  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(setUser);
  }, [userId]);

  // Effect 2: Fetch user posts
  useEffect(() => {
    fetch(`/api/users/${userId}/posts`)
      .then(res => res.json())
      .then(setPosts);
  }, [userId]);

  // Effect 3: Update document title
  useEffect(() => {
    if (user) {
      document.title = `${user.name}'s Dashboard`;
    }
  }, [user]);

  return <div>{/* Dashboard UI */}</div>;
}
```

## Common Patterns

### Debounced API Call

```typescript
function SearchInput() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    // Debounce API call
    const timer = setTimeout(() => {
      if (query) {
        fetch(`/api/search?q=${query}`)
          .then(res => res.json())
          .then(setResults);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <ul>
        {results.map((result, i) => (
          <li key={i}>{result}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Best Practices

1. **Always clean up side effects**
```typescript
useEffect(() => {
  const subscription = api.subscribe();
  return () => subscription.unsubscribe();
}, []);
```

2. **List all dependencies**
```typescript
// ❌ Missing dependency
useEffect(() => {
  console.log(userId);
}, []); // userId is missing!

// ✅ Include all dependencies
useEffect(() => {
  console.log(userId);
}, [userId]);
```

3. **Don't call hooks conditionally**
```typescript
// ❌ Wrong
if (condition) {
  useEffect(() => {});
}

// ✅ Correct
useEffect(() => {
  if (condition) {
    // Effect logic
  }
}, [condition]);
```

4. **Separate concerns into multiple effects**
```typescript
// ✅ Good: Separate effects for different concerns
useEffect(() => {
  // Fetch user data
}, [userId]);

useEffect(() => {
  // Update analytics
}, [pageView]);
```

## Common Mistakes

```typescript
// ❌ Infinite loop
useEffect(() => {
  setCount(count + 1); // Updates state -> re-render -> effect runs again
});

// ❌ Missing dependencies
useEffect(() => {
  console.log(props.value); // Should be in dependencies
}, []);

// ❌ Async useEffect callback
useEffect(async () => { // Wrong!
  await fetchData();
}, []);

// ✅ Correct async pattern
useEffect(() => {
  const fetchData = async () => {
    await fetch();
  };
  fetchData();
}, []);
```

## Practice Exercise

Create a component that:
- Fetches data when mounted
- Updates document title with data
- Has a live timer
- Cleans up all subscriptions properly

## Next Steps

- [useContext - Sharing Data](./03_useContext.md)
- [useRef - DOM Access and Mutable Values](./04_useRef.md)

## Summary

useEffect is essential for:
- ✅ Performing side effects after render
- ✅ Data fetching
- ✅ Event subscriptions
- ✅ Timers and intervals
- ✅ Synchronizing with external systems
