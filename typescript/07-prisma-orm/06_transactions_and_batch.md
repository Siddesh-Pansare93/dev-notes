# Transactions and Batch Operations

Learn how to ensure data consistency with transactions and optimize performance with batch operations in Prisma.

## What You'll Learn

- Sequential transactions
- Interactive transactions
- Transaction isolation levels
- Batch operations (createMany, updateMany, deleteMany)
- Error handling and rollbacks
- Optimistic concurrency control
- Real-world transaction patterns

## Why Transactions?

Transactions ensure **ACID** properties:
- **Atomicity**: All operations succeed or all fail
- **Consistency**: Database remains in valid state
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed changes persist

**Use transactions when**:
- Transferring money between accounts
- Creating order with multiple order items
- Updating inventory and creating reservation
- Any operations that must succeed together

## Sequential Transactions

### Basic Sequential Transaction

```typescript
import prisma from './db'

// All operations in array execute in transaction
const [user, posts] = await prisma.$transaction([
  prisma.user.create({
    data: {
      email: 'alice@prisma.io',
      name: 'Alice'
    }
  }),
  prisma.post.createMany({
    data: [
      { title: 'Post 1', authorId: 1 },
      { title: 'Post 2', authorId: 1 }
    ]
  })
])

console.log(user, posts)
```

If ANY operation fails, ALL are rolled back.

### Transfer Money Example

```typescript
async function transferMoney(fromId: number, toId: number, amount: number) {
  try {
    const result = await prisma.$transaction([
      // Deduct from sender
      prisma.account.update({
        where: { id: fromId },
        data: {
          balance: {
            decrement: amount
          }
        }
      }),
      // Add to receiver
      prisma.account.update({
        where: { id: toId },
        data: {
          balance: {
            increment: amount
          }
        }
      })
    ])

    return { success: true, result }
  } catch (error) {
    return { success: false, error }
  }
}

// Usage
await transferMoney(1, 2, 100)
```

### Sequential Transaction Limitations

- Cannot use results from one operation in another
- All operations must be defined upfront
- No conditional logic based on intermediate results

## Interactive Transactions

### Basic Interactive Transaction

```typescript
await prisma.$transaction(async (tx) => {
  // Use 'tx' instead of 'prisma' inside transaction
  const user = await tx.user.create({
    data: {
      email: 'bob@prisma.io',
      name: 'Bob'
    }
  })

  await tx.post.create({
    data: {
      title: 'Bob\'s Post',
      authorId: user.id  // Use result from previous operation
    }
  })
})
```

### Money Transfer with Validation

```typescript
async function transferMoneySafe(fromId: number, toId: number, amount: number) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get sender account
      const sender = await tx.account.findUnique({
        where: { id: fromId }
      })

      if (!sender) {
        throw new Error('Sender account not found')
      }

      if (sender.balance < amount) {
        throw new Error('Insufficient funds')
      }

      // Deduct from sender
      const updatedSender = await tx.account.update({
        where: { id: fromId },
        data: {
          balance: {
            decrement: amount
          }
        }
      })

      // Add to receiver
      const updatedReceiver = await tx.account.update({
        where: { id: toId },
        data: {
          balance: {
            increment: amount
          }
        }
      })

      // Create transaction record
      await tx.transaction.create({
        data: {
          fromAccountId: fromId,
          toAccountId: toId,
          amount,
          status: 'COMPLETED'
        }
      })

      return { sender: updatedSender, receiver: updatedReceiver }
    })

    return { success: true, result }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

### Transaction Options

```typescript
await prisma.$transaction(
  async (tx) => {
    // Your transaction logic
  },
  {
    maxWait: 5000,      // Max time to wait for transaction to start (ms)
    timeout: 10000,     // Max time transaction can run (ms)
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable
  }
)
```

## Transaction Isolation Levels

Controls how concurrent transactions interact:

```typescript
import { Prisma } from '@prisma/client'

await prisma.$transaction(
  async (tx) => {
    // Transaction logic
  },
  {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadUncommitted
  }
)
```

### Isolation Levels

| Level | Dirty Reads | Non-Repeatable Reads | Phantom Reads |
|-------|-------------|----------------------|---------------|
| Read Uncommitted | ✅ Possible | ✅ Possible | ✅ Possible |
| Read Committed | ❌ Not possible | ✅ Possible | ✅ Possible |
| Repeatable Read | ❌ Not possible | ❌ Not possible | ✅ Possible |
| Serializable | ❌ Not possible | ❌ Not possible | ❌ Not possible |

**PostgreSQL default**: Read Committed  
**MySQL default**: Repeatable Read

### When to Use Each Level

```typescript
// Read Committed (Default) - Good for most cases
await prisma.$transaction(async (tx) => {
  // Normal operations
})

// Serializable - When you need strongest guarantees
await prisma.$transaction(
  async (tx) => {
    // Critical financial operations
    // Inventory management
  },
  { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
)
```

## Error Handling and Rollbacks

### Automatic Rollback

```typescript
try {
  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: { email: 'test@example.com' }
    })

    // This will cause rollback
    throw new Error('Something went wrong')

    // User creation is rolled back
  })
} catch (error) {
  console.log('Transaction rolled back:', error.message)
}
```

### Manual Rollback

```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: { email: 'test@example.com' }
  })

  const validationResult = await someValidation(user)

  if (!validationResult.valid) {
    // Throw error to rollback
    throw new Error('Validation failed')
  }

  // Continue with more operations...
})
```

### Catching Specific Errors

```typescript
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

try {
  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: { email: 'alice@example.com' }
    })

    await tx.user.create({
      data: { email: 'alice@example.com' }  // Duplicate!
    })
  })
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      console.log('Duplicate email detected, transaction rolled back')
    }
  }
}
```

## Batch Operations

### createMany - Bulk Insert

```typescript
// Insert multiple records efficiently
const result = await prisma.user.createMany({
  data: [
    { email: 'user1@example.com', name: 'User 1' },
    { email: 'user2@example.com', name: 'User 2' },
    { email: 'user3@example.com', name: 'User 3' }
  ],
  skipDuplicates: true  // Skip records that violate unique constraints
})

console.log(`Created ${result.count} users`)
```

**Performance**: Much faster than multiple `create()` calls.

**Limitations**:
- Cannot use nested creates
- Cannot include created records in response
- Returns count only
- Not available on SQLite

### updateMany - Bulk Update

```typescript
// Update multiple records matching condition
const result = await prisma.post.updateMany({
  where: {
    published: false,
    createdAt: {
      lt: new Date('2024-01-01')
    }
  },
  data: {
    published: true,
    updatedAt: new Date()
  }
})

console.log(`Updated ${result.count} posts`)
```

### deleteMany - Bulk Delete

```typescript
// Delete multiple records
const result = await prisma.post.deleteMany({
  where: {
    published: false,
    createdAt: {
      lt: new Date('2023-01-01')
    }
  }
})

console.log(`Deleted ${result.count} old draft posts`)

// Delete all records (dangerous!)
await prisma.user.deleteMany()
```

### Batch Operations in Transaction

```typescript
await prisma.$transaction([
  // Create many users
  prisma.user.createMany({
    data: [
      { email: 'user1@example.com' },
      { email: 'user2@example.com' }
    ]
  }),
  // Update many posts
  prisma.post.updateMany({
    where: { published: false },
    data: { published: true }
  }),
  // Delete many comments
  prisma.comment.deleteMany({
    where: {
      createdAt: {
        lt: new Date('2023-01-01')
      }
    }
  })
])
```

## Optimistic Concurrency Control

Prevent lost updates when multiple users edit same record.

### Version Field Pattern

**Schema**:
```prisma
model Post {
  id      Int    @id @default(autoincrement())
  title   String
  content String
  version Int    @default(0)  // Version tracking
}
```

**Implementation**:
```typescript
async function updatePostSafe(id: number, currentVersion: number, data: any) {
  try {
    const updated = await prisma.post.updateMany({
      where: {
        id,
        version: currentVersion  // Only update if version matches
      },
      data: {
        ...data,
        version: {
          increment: 1  // Increment version
        }
      }
    })

    if (updated.count === 0) {
      throw new Error('Post was modified by another user. Please refresh and try again.')
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Usage
await updatePostSafe(1, 5, { title: 'New Title' })
```

### Last Modified Pattern

**Schema**:
```prisma
model Document {
  id             Int      @id @default(autoincrement())
  title          String
  content        String
  lastModifiedAt DateTime @updatedAt
}
```

**Implementation**:
```typescript
async function updateDocument(
  id: number,
  lastModifiedAt: Date,
  data: any
) {
  const result = await prisma.document.updateMany({
    where: {
      id,
      lastModifiedAt  // Check timestamp hasn't changed
    },
    data
  })

  if (result.count === 0) {
    throw new Error('Document was modified by another user')
  }

  return result
}
```

## Real-World Transaction Patterns

### E-commerce Order Creation

```typescript
async function createOrder(
  customerId: number,
  items: { productId: number; quantity: number }[]
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Check inventory for all products
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId }
      })

      if (!product || product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}`)
      }
    }

    // 2. Create order
    const order = await tx.order.create({
      data: {
        customerId,
        status: 'PENDING',
        total: 0  // Will calculate below
      }
    })

    // 3. Create order items and update inventory
    let total = 0

    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId }
      })

      // Create order item
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: product.price
        }
      })

      // Decrease inventory
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity
          }
        }
      })

      total += product.price.toNumber() * item.quantity
    }

    // 4. Update order total
    const finalOrder = await tx.order.update({
      where: { id: order.id },
      data: { total }
    })

    return finalOrder
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    timeout: 10000
  })
}
```

### Blog Post Publication

```typescript
async function publishPost(postId: number, userId: number) {
  return await prisma.$transaction(async (tx) => {
    // 1. Check post exists and user is author
    const post = await tx.post.findUnique({
      where: { id: postId },
      include: { author: true }
    })

    if (!post) {
      throw new Error('Post not found')
    }

    if (post.authorId !== userId) {
      throw new Error('Not authorized')
    }

    if (post.published) {
      throw new Error('Post already published')
    }

    // 2. Publish post
    const published = await tx.post.update({
      where: { id: postId },
      data: {
        published: true,
        publishedAt: new Date()
      }
    })

    // 3. Create notification for all followers
    const followers = await tx.follow.findMany({
      where: { followingId: userId }
    })

    await tx.notification.createMany({
      data: followers.map(f => ({
        userId: f.followerId,
        type: 'NEW_POST',
        postId: published.id
      }))
    })

    // 4. Update user stats
    await tx.user.update({
      where: { id: userId },
      data: {
        publishedPostCount: {
          increment: 1
        }
      }
    })

    return published
  })
}
```

### Soft Delete with Cascade

```typescript
async function softDeleteUser(userId: number) {
  return await prisma.$transaction(async (tx) => {
    // 1. Soft delete user
    await tx.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        active: false
      }
    })

    // 2. Soft delete all user's posts
    await tx.post.updateMany({
      where: { authorId: userId },
      data: {
        deletedAt: new Date()
      }
    })

    // 3. Soft delete all user's comments
    await tx.comment.updateMany({
      where: { authorId: userId },
      data: {
        deletedAt: new Date()
      }
    })

    // 4. Remove from followers
    await tx.follow.deleteMany({
      where: {
        OR: [
          { followerId: userId },
          { followingId: userId }
        ]
      }
    })

    return { success: true }
  })
}
```

## Performance Considerations

### 1. Transaction Size

```typescript
// ❌ BAD: Long-running transaction
await prisma.$transaction(async (tx) => {
  const users = await tx.user.findMany()  // Could be thousands

  for (const user of users) {
    await someSlowOperation(user)  // Blocks other transactions
  }
})

// ✅ GOOD: Process in batches
const batchSize = 100
let skip = 0

while (true) {
  const users = await prisma.user.findMany({
    skip,
    take: batchSize
  })

  if (users.length === 0) break

  // Process batch in transaction
  await prisma.$transaction(async (tx) => {
    for (const user of users) {
      await tx.user.update({
        where: { id: user.id },
        data: { processed: true }
      })
    }
  })

  skip += batchSize
}
```

### 2. Timeout Configuration

```typescript
// Increase timeout for long operations
await prisma.$transaction(
  async (tx) => {
    // Complex operations
  },
  {
    timeout: 30000  // 30 seconds
  }
)
```

### 3. Use Batch Operations When Possible

```typescript
// ❌ Slow: Individual updates in transaction
await prisma.$transaction(async (tx) => {
  for (const id of postIds) {
    await tx.post.update({
      where: { id },
      data: { published: true }
    })
  }
})

// ✅ Fast: Single batch update
await prisma.post.updateMany({
  where: {
    id: { in: postIds }
  },
  data: {
    published: true
  }
})
```

## Best Practices

1. **Keep transactions short** - Hold locks for minimal time
2. **Use appropriate isolation level** - Balance consistency vs performance
3. **Handle errors gracefully** - Provide meaningful error messages
4. **Set realistic timeouts** - Prevent hung transactions
5. **Use batch operations** - For bulk updates/inserts/deletes
6. **Avoid external API calls** - Inside transactions
7. **Use optimistic locking** - For concurrent edits
8. **Test rollback scenarios** - Ensure data consistency
9. **Monitor transaction performance** - Track slow transactions
10. **Document transaction logic** - Complex transactions need comments

## Practice Exercises

1. Implement a bank transfer system with validation
2. Create an order processing system with inventory management
3. Build a booking system that prevents double-booking
4. Implement a points/rewards system with transactions
5. Create a bulk import system using createMany and transactions
6. Build a soft delete system that cascades to related records

## Summary

- Sequential transactions: Array of operations
- Interactive transactions: Conditional logic with `async (tx) => {}`
- Isolation levels control concurrent transaction behavior
- Batch operations (createMany, updateMany, deleteMany) optimize performance
- Automatic rollback on any error
- Use optimistic concurrency for concurrent edits
- Keep transactions short and focused
- Set appropriate timeouts and isolation levels

Continue to [Type Safety and TypeScript Integration](./07_type_safety.md) →
