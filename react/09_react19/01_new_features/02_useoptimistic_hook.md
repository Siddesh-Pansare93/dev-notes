# useOptimistic Hook

## What You'll Learn
- Understanding optimistic UI updates
- How to use the `useOptimistic` hook
- Combining with `useActionState` for better UX
- Real-world patterns and best practices
- Error handling and state reversion

## Table of Contents
1. [Introduction to Optimistic Updates](#introduction-to-optimistic-updates)
2. [The useOptimistic Hook](#the-useoptimistic-hook)
3. [React 18 vs React 19](#react-18-vs-react-19)
4. [TypeScript Integration](#typescript-integration)
5. [Best Practices](#best-practices)
6. [Real-World Examples](#real-world-examples)
7. [Practice Exercises](#practice-exercises)

---

## Introduction to Optimistic Updates

**Optimistic Updates** display the final state immediately while the async request is in progress, providing instant feedback to users.

### Why Optimistic Updates?

Users expect instant feedback. Waiting for server responses feels slow and unresponsive.

**Traditional Flow:**
```
User clicks → Show loading → Wait for server → Update UI
[0s]         [0.1s]         [0.5-2s]         [Done]
```

**Optimistic Flow:**
```
User clicks → Update UI immediately → Confirm with server → Revert if failed
[0s]         [0s]                    [0.5-2s background]   [if needed]
```

### Common Use Cases

- ✅ Like/Unlike buttons
- ✅ Adding items to cart
- ✅ Posting comments
- ✅ Toggling settings
- ✅ Incrementing counters
- ✅ Reordering lists

---

## The useOptimistic Hook

### Signature

```typescript
const [optimisticState, setOptimisticState] = useOptimistic<T>(
  actualState: T,
  updateFn?: (currentState: T, optimisticValue: T) => T
);
```

**Parameters:**
- `actualState`: The "source of truth" state
- `updateFn`: Optional function to compute optimistic state from updates

**Returns:**
- `optimisticState`: The current optimistic value (updates immediately)
- `setOptimisticState`: Function to set optimistic value

### How It Works

```typescript
import { useOptimistic, useState } from 'react';

function LikeButton({ postId, initialLikes }: Props) {
  const [likes, setLikes] = useState(initialLikes);
  const [optimisticLikes, setOptimisticLikes] = useOptimistic(likes);

  async function handleLike() {
    // 1. Update optimistically (instant)
    setOptimisticLikes(optimisticLikes + 1);

    // 2. Send request to server (background)
    try {
      const newLikes = await likePost(postId);
      setLikes(newLikes); // Update actual state
    } catch (error) {
      // 3. Automatically reverts to actual state on error
      console.error("Failed to like post");
    }
  }

  return (
    <button onClick={handleLike}>
      ❤️ {optimisticLikes} {/* Shows optimistic value */}
    </button>
  );
}
```

**Key Behavior:**
- `optimisticLikes` updates **immediately** when you call `setOptimisticLikes`
- When `likes` (actual state) changes, `optimisticLikes` **automatically syncs** to it
- If the request fails and `likes` doesn't change, `optimisticLikes` **reverts automatically**

---

## React 18 vs React 19

### React 18 Pattern (Manual Optimistic Updates)

```typescript
// ❌ React 18 - Complex manual management
function CommentList({ postId, initialComments }: Props) {
  const [comments, setComments] = useState(initialComments);
  const [pendingComment, setPendingComment] = useState<Comment | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function addComment(text: string) {
    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      text,
      author: "You",
      createdAt: new Date(),
    };

    // Show optimistic comment
    setPendingComment(tempComment);
    setIsPending(true);

    try {
      const newComment = await postComment(postId, text);
      
      // Success: replace temp with real
      setComments([...comments, newComment]);
      setPendingComment(null);
    } catch (error) {
      // Failure: remove temp
      setPendingComment(null);
      alert("Failed to post comment");
    } finally {
      setIsPending(false);
    }
  }

  // Combine actual and pending comments
  const displayComments = pendingComment
    ? [...comments, pendingComment]
    : comments;

  return (
    <div>
      {displayComments.map((comment) => (
        <Comment
          key={comment.id}
          {...comment}
          isPending={comment.id === pendingComment?.id}
        />
      ))}
      <AddCommentForm onSubmit={addComment} disabled={isPending} />
    </div>
  );
}
```

### React 19 Pattern (useOptimistic)

```typescript
// ✅ React 19 - Clean and simple
import { useOptimistic, useState, useTransition } from 'react';

function CommentList({ postId, initialComments }: Props) {
  const [comments, setComments] = useState(initialComments);
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (state, newComment: Comment) => [...state, newComment]
  );
  const [isPending, startTransition] = useTransition();

  async function addComment(text: string) {
    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      text,
      author: "You",
      createdAt: new Date(),
    };

    startTransition(async () => {
      // Show optimistically
      addOptimisticComment(tempComment);

      // Save to server
      const newComment = await postComment(postId, text);
      setComments([...comments, newComment]);
      
      // Automatically reverts if this throws
    });
  }

  return (
    <div>
      {optimisticComments.map((comment) => (
        <Comment key={comment.id} {...comment} />
      ))}
      <AddCommentForm onSubmit={addComment} disabled={isPending} />
    </div>
  );
}
```

**Benefits:**
- 60% less code
- Automatic reversion on error
- No manual pending state management
- Cleaner component logic

---

## TypeScript Integration

### Basic Typing

```typescript
import { useOptimistic } from 'react';

type Todo = {
  id: string;
  text: string;
  completed: boolean;
};

function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  
  // Type inference works automatically
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: Todo) => [...state, newTodo]
  );

  // optimisticTodos is inferred as Todo[]
  // addOptimisticTodo accepts Todo
}
```

### Complex Update Function

```typescript
import { useOptimistic } from 'react';

type Message = {
  id: string;
  text: string;
  status: 'sending' | 'sent' | 'failed';
};

type MessageUpdate = 
  | { type: 'add'; message: Message }
  | { type: 'update'; id: string; status: Message['status'] }
  | { type: 'delete'; id: string };

function MessageThread() {
  const [messages, setMessages] = useState<Message[]>([]);

  const [optimisticMessages, updateOptimistic] = useOptimistic(
    messages,
    (state, update: MessageUpdate): Message[] => {
      switch (update.type) {
        case 'add':
          return [...state, update.message];
        
        case 'update':
          return state.map(msg =>
            msg.id === update.id
              ? { ...msg, status: update.status }
              : msg
          );
        
        case 'delete':
          return state.filter(msg => msg.id !== update.id);
        
        default:
          return state;
      }
    }
  );

  async function sendMessage(text: string) {
    const tempMessage: Message = {
      id: `temp-${crypto.randomUUID()}`,
      text,
      status: 'sending',
    };

    // Add optimistically
    updateOptimistic({ type: 'add', message: tempMessage });

    try {
      const sentMessage = await postMessage(text);
      setMessages([...messages, sentMessage]);
    } catch (error) {
      // Automatically reverts to messages (without temp message)
    }
  }

  return (
    <div>
      {optimisticMessages.map(msg => (
        <Message key={msg.id} {...msg} />
      ))}
    </div>
  );
}
```

### Generic Helper

```typescript
// Reusable optimistic list helper
function useOptimisticList<T extends { id: string }>(initialItems: T[]) {
  const [items, setItems] = useState(initialItems);

  const [optimisticItems, updateOptimistic] = useOptimistic(
    items,
    (state, update: { type: 'add' | 'remove' | 'update'; item?: T; id?: string }) => {
      switch (update.type) {
        case 'add':
          return update.item ? [...state, update.item] : state;
        case 'remove':
          return update.id ? state.filter(item => item.id !== update.id) : state;
        case 'update':
          return update.item
            ? state.map(item => item.id === update.item!.id ? update.item! : item)
            : state;
        default:
          return state;
      }
    }
  );

  return {
    items: optimisticItems,
    actualItems: items,
    setItems,
    addOptimistic: (item: T) => updateOptimistic({ type: 'add', item }),
    removeOptimistic: (id: string) => updateOptimistic({ type: 'remove', id }),
    updateOptimistic: (item: T) => updateOptimistic({ type: 'update', item }),
  };
}

// Usage
function ShoppingCart() {
  const cart = useOptimisticList<CartItem>(initialCart);

  async function addToCart(product: Product) {
    const cartItem: CartItem = {
      id: product.id,
      name: product.name,
      quantity: 1,
    };

    cart.addOptimistic(cartItem);

    try {
      const updated = await addItemToCart(product.id);
      cart.setItems(updated);
    } catch (error) {
      // Reverts automatically
    }
  }

  return (
    <div>
      {cart.items.map(item => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
}
```

---

## Best Practices

### 1. **Use with useTransition for Actions**

```typescript
import { useOptimistic, useTransition } from 'react';

function LikeButton({ postId, initialLikes }: Props) {
  const [likes, setLikes] = useState(initialLikes);
  const [optimisticLikes, setOptimisticLikes] = useOptimistic(likes);
  const [isPending, startTransition] = useTransition();

  function handleLike() {
    startTransition(async () => {
      setOptimisticLikes(optimisticLikes + 1);
      const newLikes = await likePost(postId);
      setLikes(newLikes);
    });
  }

  return (
    <button onClick={handleLike} disabled={isPending}>
      ❤️ {optimisticLikes}
    </button>
  );
}
```

### 2. **Combine with useActionState**

```typescript
import { useActionState, useOptimistic, useTransition } from 'react';

type CartState = {
  items: CartItem[];
  error?: string;
};

function ShoppingCart({ initialItems }: Props) {
  const [state, dispatch, isPending] = useActionState(
    updateCartAction,
    { items: initialItems }
  );

  const [optimisticItems, setOptimisticItems] = useOptimistic(
    state.items,
    (currentItems, newItem: CartItem) => [...currentItems, newItem]
  );

  const [, startTransition] = useTransition();

  function addItem(product: Product) {
    startTransition(async () => {
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        quantity: 1,
      };

      setOptimisticItems(newItem);
      await dispatch({ type: 'ADD', product });
    });
  }

  return (
    <div>
      {optimisticItems.map(item => (
        <CartItem key={item.id} {...item} />
      ))}
      {state.error && <div className="error">{state.error}</div>}
    </div>
  );
}
```

### 3. **Visual Feedback for Optimistic State**

```typescript
import { useOptimistic, useState } from 'react';

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  optimistic?: boolean; // Flag for styling
};

function TodoList({ initialTodos }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState(initialTodos);
  
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: Todo) => [...state, { ...newTodo, optimistic: true }]
  );

  async function addTodo(text: string) {
    const tempTodo: Todo = {
      id: `temp-${Date.now()}`,
      text,
      completed: false,
    };

    addOptimisticTodo(tempTodo);

    try {
      const created = await createTodo(text);
      setTodos([...todos, created]);
    } catch (error) {
      // Show error notification
    }
  }

  return (
    <ul>
      {optimisticTodos.map(todo => (
        <li
          key={todo.id}
          className={todo.optimistic ? 'pending' : ''}
          style={{ opacity: todo.optimistic ? 0.6 : 1 }}
        >
          {todo.text}
          {todo.optimistic && <span> (Saving...)</span>}
        </li>
      ))}
    </ul>
  );
}
```

### 4. **Handle Conflicts Gracefully**

```typescript
import { useOptimistic, useState } from 'react';

type DocumentVersion = {
  id: string;
  content: string;
  version: number;
};

function CollaborativeEditor({ initialDoc }: { initialDoc: DocumentVersion }) {
  const [doc, setDoc] = useState(initialDoc);
  
  const [optimisticDoc, updateOptimistic] = useOptimistic(
    doc,
    (current, update: Partial<DocumentVersion>) => ({
      ...current,
      ...update
    })
  );

  async function saveContent(content: string) {
    // Update optimistically
    updateOptimistic({ content });

    try {
      const saved = await saveDocument({
        id: doc.id,
        content,
        version: doc.version,
      });

      setDoc(saved);
    } catch (error) {
      if (error.code === 'VERSION_CONFLICT') {
        // Handle conflict: reload latest version
        const latest = await fetchLatestVersion(doc.id);
        setDoc(latest);
        
        alert("Document was updated by someone else. Your changes were not saved.");
      }
    }
  }

  return (
    <textarea
      value={optimisticDoc.content}
      onChange={(e) => saveContent(e.target.value)}
    />
  );
}
```

---

## Real-World Examples

### Example 1: Social Media Like Button

```typescript
import { useOptimistic, useState, useTransition } from 'react';

type Post = {
  id: string;
  content: string;
  likes: number;
  likedByUser: boolean;
};

function Post({ post: initialPost }: { post: Post }) {
  const [post, setPost] = useState(initialPost);
  const [isPending, startTransition] = useTransition();

  const [optimisticPost, setOptimisticPost] = useOptimistic(
    post,
    (current, update: Partial<Post>) => ({ ...current, ...update })
  );

  async function toggleLike() {
    startTransition(async () => {
      // Calculate optimistic state
      const optimisticLikes = optimisticPost.likedByUser
        ? optimisticPost.likes - 1
        : optimisticPost.likes + 1;
      
      const optimisticLikedByUser = !optimisticPost.likedByUser;

      // Update immediately
      setOptimisticPost({
        likes: optimisticLikes,
        likedByUser: optimisticLikedByUser,
      });

      try {
        // Send to server
        const updated = optimisticPost.likedByUser
          ? await unlikePost(post.id)
          : await likePost(post.id);

        setPost(updated);
      } catch (error) {
        // Automatically reverts to post state
        console.error("Failed to update like");
      }
    });
  }

  return (
    <article>
      <p>{optimisticPost.content}</p>
      
      <button
        onClick={toggleLike}
        disabled={isPending}
        className={optimisticPost.likedByUser ? 'liked' : ''}
      >
        {optimisticPost.likedByUser ? '❤️' : '🤍'} {optimisticPost.likes}
      </button>
    </article>
  );
}
```

### Example 2: Todo List with Optimistic Updates

```typescript
import { useOptimistic, useState, useTransition } from 'react';

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
};

type TodoAction =
  | { type: 'add'; todo: Todo }
  | { type: 'toggle'; id: string }
  | { type: 'delete'; id: string };

function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isPending, startTransition] = useTransition();

  const [optimisticTodos, updateOptimistic] = useOptimistic(
    todos,
    (state, action: TodoAction): Todo[] => {
      switch (action.type) {
        case 'add':
          return [...state, action.todo];
        
        case 'toggle':
          return state.map(todo =>
            todo.id === action.id
              ? { ...todo, completed: !todo.completed }
              : todo
          );
        
        case 'delete':
          return state.filter(todo => todo.id !== action.id);
        
        default:
          return state;
      }
    }
  );

  async function addTodo(text: string) {
    const newTodo: Todo = {
      id: `temp-${crypto.randomUUID()}`,
      text,
      completed: false,
      createdAt: new Date(),
    };

    startTransition(async () => {
      updateOptimistic({ type: 'add', todo: newTodo });

      try {
        const created = await createTodo(text);
        setTodos([...todos, created]);
      } catch (error) {
        alert("Failed to add todo");
      }
    });
  }

  async function toggleTodo(id: string) {
    startTransition(async () => {
      updateOptimistic({ type: 'toggle', id });

      try {
        const updated = await updateTodo(id, {
          completed: !todos.find(t => t.id === id)?.completed
        });
        setTodos(todos.map(t => t.id === id ? updated : t));
      } catch (error) {
        alert("Failed to update todo");
      }
    });
  }

  async function deleteTodo(id: string) {
    startTransition(async () => {
      updateOptimistic({ type: 'delete', id });

      try {
        await removeTodo(id);
        setTodos(todos.filter(t => t.id !== id));
      } catch (error) {
        alert("Failed to delete todo");
      }
    });
  }

  return (
    <div className="todo-app">
      <AddTodoForm onAdd={addTodo} disabled={isPending} />
      
      <ul className="todo-list">
        {optimisticTodos.map(todo => (
          <li key={todo.id} className={todo.completed ? 'completed' : ''}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
              disabled={isPending}
            />
            <span>{todo.text}</span>
            <button
              onClick={() => deleteTodo(todo.id)}
              disabled={isPending}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {isPending && <div className="loading">Syncing...</div>}
    </div>
  );
}
```

### Example 3: Real-time Chat with Optimistic Messages

```typescript
import { useOptimistic, useState, useEffect } from 'react';

type Message = {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'failed';
};

function ChatRoom({ roomId, currentUser }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);

  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage: Message) => [...state, newMessage]
  );

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToRoom(roomId, (newMessage) => {
      setMessages(current => [...current, newMessage]);
    });

    return unsubscribe;
  }, [roomId]);

  async function sendMessage(text: string) {
    const tempMessage: Message = {
      id: `temp-${crypto.randomUUID()}`,
      text,
      author: currentUser.name,
      timestamp: new Date(),
      status: 'sending',
    };

    // Show immediately
    addOptimisticMessage(tempMessage);

    try {
      // Send to server
      const sentMessage = await postMessage(roomId, text);
      
      // Server will broadcast to all clients via WebSocket
      // Our subscription will receive it and update messages
      
    } catch (error) {
      // Update temp message to failed state
      setMessages(current =>
        current.map(msg =>
          msg.id === tempMessage.id
            ? { ...msg, status: 'failed' as const }
            : msg
        )
      );
    }
  }

  return (
    <div className="chat-room">
      <div className="messages">
        {optimisticMessages.map(message => (
          <ChatMessage
            key={message.id}
            {...message}
            isOwn={message.author === currentUser.name}
          />
        ))}
      </div>
      
      <MessageInput onSend={sendMessage} />
    </div>
  );
}

function ChatMessage({ text, author, status, isOwn }: Message & { isOwn: boolean }) {
  return (
    <div className={`message ${isOwn ? 'own' : 'other'}`}>
      {!isOwn && <span className="author">{author}</span>}
      <div className="content">
        {text}
        {isOwn && status === 'sending' && <span className="status">⏳</span>}
        {isOwn && status === 'sent' && <span className="status">✓</span>}
        {isOwn && status === 'failed' && <span className="status">⚠️</span>}
      </div>
    </div>
  );
}
```

---

## Practice Exercises

### Exercise 1: Voting System (Beginner)

Create upvote/downvote buttons with optimistic updates:

**Requirements:**
- Show vote count
- Update immediately on click
- Disable during pending state
- Handle errors gracefully

**Starter:**

```typescript
import { useOptimistic, useState } from 'react';

type VoteData = {
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
};

function VoteButtons({ postId, initialData }: Props) {
  // Implement optimistic voting
}
```

### Exercise 2: Drag and Drop Reordering (Intermediate)

Create a draggable list with optimistic reordering:

**Requirements:**
- Drag to reorder items
- Update order optimistically
- Save new order to server
- Revert on failure
- Show saving indicator

### Exercise 3: Collaborative Whiteboard (Advanced)

Build a real-time collaborative drawing app:

**Requirements:**
- Draw shapes optimistically
- Sync with other users
- Handle conflicts (last-write-wins)
- Show pending shapes differently
- Undo/redo support

---

## Summary

**Key Takeaways:**

1. **useOptimistic provides instant feedback** - Makes apps feel responsive
2. **Automatic reversion** - No manual error state cleanup needed
3. **Combine with transitions** - Use `useTransition` for async actions
4. **Works great with useActionState** - Perfect for form submissions
5. **Visual feedback is important** - Show users what's pending

**When to Use:**
- ✅ Actions with predictable outcomes (likes, toggles)
- ✅ Low-stakes operations (can safely revert)
- ✅ Frequent user interactions (chat, comments)
- ❌ Critical operations (payments, deletions)
- ❌ When outcome is unpredictable

**Next Steps:**
- Explore [use() Hook](./03_use_hook.md) for reading resources
- Learn about [Form Actions](./04_form_actions.md)
- Practice with the exercises above

**Further Reading:**
- [useOptimistic Documentation](https://react.dev/reference/react/useOptimistic)
- [Optimistic UI Patterns](https://www.nngroup.com/articles/optimistic-ui/)
