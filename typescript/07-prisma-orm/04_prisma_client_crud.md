# Prisma Client and CRUD Operations

Master type-safe database operations with Prisma Client's intuitive API for Create, Read, Update, and Delete operations.

## What You'll Learn

- Prisma Client instantiation patterns
- All CRUD operations with examples
- Filtering and sorting data
- Pagination strategies
- Field selection and inclusion
- Working with null and undefined
- Error handling
- Raw SQL queries

## Prisma Client Setup

### Basic Instance

```typescript
// src/db.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default prisma
```

### With Logging

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

export default prisma
```

### Production-Ready Singleton

```typescript
// src/db.ts
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
```

## Create Operations

### create() - Create Single Record

```typescript
import prisma from './db'

// Basic create
const user = await prisma.user.create({
  data: {
    email: 'alice@prisma.io',
    name: 'Alice'
  }
})

console.log(user)
// { id: 1, email: 'alice@prisma.io', name: 'Alice', createdAt: ... }
```

### Create with Relations

```typescript
// Create user with posts (nested create)
const user = await prisma.user.create({
  data: {
    email: 'bob@prisma.io',
    name: 'Bob',
    posts: {
      create: [
        {
          title: 'First Post',
          content: 'Hello World!',
          published: true
        },
        {
          title: 'Second Post',
          content: 'Work in progress'
        }
      ]
    }
  },
  include: {
    posts: true  // Include posts in response
  }
})
```

### Connect Existing Relations

```typescript
// Create post for existing user
const post = await prisma.post.create({
  data: {
    title: 'New Post',
    content: 'Content here',
    author: {
      connect: { id: 1 }  // Connect to user with id 1
    }
  }
})

// Or using foreign key directly
const post2 = await prisma.post.create({
  data: {
    title: 'Another Post',
    content: 'More content',
    authorId: 1  // Direct foreign key
  }
})
```

### createMany() - Bulk Insert

```typescript
// Create multiple records at once
const result = await prisma.user.createMany({
  data: [
    { email: 'user1@example.com', name: 'User 1' },
    { email: 'user2@example.com', name: 'User 2' },
    { email: 'user3@example.com', name: 'User 3' }
  ],
  skipDuplicates: true  // Skip records that violate unique constraints
})

console.log(result)
// { count: 3 }
```

**Limitations of createMany**:
- Cannot use nested creates
- Cannot use `include` or `select`
- Returns count only, not created records
- Not supported on SQLite

## Read Operations

### findUnique() - Find by Unique Field

```typescript
// Find by primary key
const user = await prisma.user.findUnique({
  where: { id: 1 }
})

// Find by unique email
const user2 = await prisma.user.findUnique({
  where: { email: 'alice@prisma.io' }
})

// Find by composite unique field
const orderItem = await prisma.orderItem.findUnique({
  where: {
    orderId_productId: {
      orderId: 1,
      productId: 5
    }
  }
})
```

### findUniqueOrThrow() - Find or Error

```typescript
try {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: 999 }
  })
} catch (error) {
  // Throws NotFoundError if record doesn't exist
  console.error('User not found')
}
```

### findFirst() - Find First Match

```typescript
// Find first user with role ADMIN
const admin = await prisma.user.findFirst({
  where: {
    role: 'ADMIN'
  },
  orderBy: {
    createdAt: 'asc'  // First admin by creation date
  }
})
```

### findMany() - Find Multiple Records

```typescript
// Find all users
const users = await prisma.user.findMany()

// Find with conditions
const admins = await prisma.user.findMany({
  where: {
    role: 'ADMIN'
  }
})

// Find with multiple conditions (AND)
const activeAdmins = await prisma.user.findMany({
  where: {
    role: 'ADMIN',
    active: true
  }
})
```

### Filtering with where

```typescript
// OR condition
const users = await prisma.user.findMany({
  where: {
    OR: [
      { email: { contains: '@gmail.com' } },
      { email: { contains: '@yahoo.com' } }
    ]
  }
})

// NOT condition
const nonAdmins = await prisma.user.findMany({
  where: {
    NOT: {
      role: 'ADMIN'
    }
  }
})

// Complex nested conditions
const posts = await prisma.post.findMany({
  where: {
    AND: [
      { published: true },
      {
        OR: [
          { title: { contains: 'Prisma' } },
          { content: { contains: 'Prisma' } }
        ]
      }
    ]
  }
})
```

### Filter Operators

```typescript
// String operators
const users = await prisma.user.findMany({
  where: {
    email: { contains: 'gmail' },           // LIKE %gmail%
    name: { startsWith: 'A' },              // LIKE A%
    bio: { endsWith: 'developer' },         // LIKE %developer
    username: { not: 'admin' },             // != 'admin'
    email: { in: ['a@x.com', 'b@x.com'] }  // IN (...)
  }
})

// Number operators
const posts = await prisma.post.findMany({
  where: {
    views: { gt: 100 },      // Greater than
    likes: { gte: 50 },      // Greater than or equal
    dislikes: { lt: 10 },    // Less than
    shares: { lte: 20 },     // Less than or equal
    score: { not: 0 }        // Not equal
  }
})

// Date operators
const recentPosts = await prisma.post.findMany({
  where: {
    createdAt: {
      gte: new Date('2024-01-01'),
      lt: new Date('2024-02-01')
    }
  }
})

// Null checks
const usersWithoutBio = await prisma.user.findMany({
  where: {
    bio: null  // IS NULL
  }
})

const usersWithBio = await prisma.user.findMany({
  where: {
    bio: { not: null }  // IS NOT NULL
  }
})
```

### Sorting with orderBy

```typescript
// Single field sort
const users = await prisma.user.findMany({
  orderBy: {
    createdAt: 'desc'  // Newest first
  }
})

// Multiple field sort
const posts = await prisma.post.findMany({
  orderBy: [
    { published: 'desc' },  // Published first
    { createdAt: 'desc' }   // Then by date
  ]
})

// Sort by relation
const users = await prisma.user.findMany({
  orderBy: {
    posts: {
      _count: 'desc'  // Users with most posts first
    }
  }
})
```

### Pagination

**Offset-based pagination**:

```typescript
const page = 2
const pageSize = 10

const posts = await prisma.post.findMany({
  skip: (page - 1) * pageSize,  // Skip first 10
  take: pageSize,                // Take 10
  orderBy: {
    createdAt: 'desc'
  }
})

// Get total count for pagination info
const totalCount = await prisma.post.count()
const totalPages = Math.ceil(totalCount / pageSize)
```

**Cursor-based pagination** (better for large datasets):

```typescript
// First page
const firstPage = await prisma.post.findMany({
  take: 10,
  orderBy: {
    id: 'asc'
  }
})

// Next page using cursor
const lastPostId = firstPage[firstPage.length - 1].id

const nextPage = await prisma.post.findMany({
  take: 10,
  skip: 1,  // Skip the cursor
  cursor: {
    id: lastPostId
  },
  orderBy: {
    id: 'asc'
  }
})
```

### Field Selection

**select** - Choose specific fields:

```typescript
// Select only id and email
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true
  }
})
// Returns: [{ id: 1, email: 'alice@...' }, ...]

// Select with nested relation
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    posts: {
      select: {
        title: true,
        published: true
      }
    }
  }
})
```

**include** - Include relations:

```typescript
// Include all post fields
const users = await prisma.user.findMany({
  include: {
    posts: true
  }
})

// Include with filters
const users = await prisma.user.findMany({
  include: {
    posts: {
      where: {
        published: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5  // Latest 5 posts per user
    }
  }
})
```

⚠️ **Cannot use select and include together** - choose one approach.

### Aggregations

```typescript
// Count records
const userCount = await prisma.user.count()

const adminCount = await prisma.user.count({
  where: {
    role: 'ADMIN'
  }
})

// Aggregate functions
const stats = await prisma.post.aggregate({
  _avg: {
    views: true
  },
  _sum: {
    views: true
  },
  _min: {
    createdAt: true
  },
  _max: {
    createdAt: true
  },
  _count: {
    id: true
  }
})

console.log(stats)
// {
//   _avg: { views: 125.5 },
//   _sum: { views: 1255 },
//   _min: { createdAt: 2024-01-01... },
//   _max: { createdAt: 2024-01-15... },
//   _count: { id: 10 }
// }

// Group by
const postsByUser = await prisma.post.groupBy({
  by: ['authorId'],
  _count: {
    id: true
  },
  _avg: {
    views: true
  },
  having: {
    views: {
      _avg: {
        gt: 100  // Only users with avg views > 100
      }
    }
  }
})
```

## Update Operations

### update() - Update Single Record

```typescript
// Update by unique field
const user = await prisma.user.update({
  where: { id: 1 },
  data: {
    name: 'Alice Smith'
  }
})

// Update multiple fields
const post = await prisma.post.update({
  where: { id: 1 },
  data: {
    title: 'Updated Title',
    content: 'Updated content',
    published: true
  }
})
```

### updateMany() - Update Multiple Records

```typescript
// Update all unpublished posts
const result = await prisma.post.updateMany({
  where: {
    published: false
  },
  data: {
    published: true
  }
})

console.log(result)
// { count: 5 }
```

### Atomic Number Updates

```typescript
// Increment views
const post = await prisma.post.update({
  where: { id: 1 },
  data: {
    views: {
      increment: 1
    }
  }
})

// Decrement stock
const product = await prisma.product.update({
  where: { id: 1 },
  data: {
    stock: {
      decrement: 5
    }
  }
})

// Multiply/divide
const score = await prisma.user.update({
  where: { id: 1 },
  data: {
    score: {
      multiply: 2
    }
  }
})
```

### Update Relations

```typescript
// Connect to existing relation
await prisma.post.update({
  where: { id: 1 },
  data: {
    author: {
      connect: { id: 2 }  // Change author to user 2
    }
  }
})

// Disconnect relation
await prisma.user.update({
  where: { id: 1 },
  data: {
    profile: {
      disconnect: true
    }
  }
})

// Update nested relation
await prisma.user.update({
  where: { id: 1 },
  data: {
    profile: {
      update: {
        bio: 'New bio'
      }
    }
  }
})
```

### upsert() - Update or Create

```typescript
// Update if exists, create if doesn't
const user = await prisma.user.upsert({
  where: {
    email: 'alice@prisma.io'
  },
  update: {
    name: 'Alice Updated'
  },
  create: {
    email: 'alice@prisma.io',
    name: 'Alice'
  }
})
```

## Delete Operations

### delete() - Delete Single Record

```typescript
// Delete by unique field
const deletedUser = await prisma.user.delete({
  where: { id: 1 }
})
```

### deleteMany() - Delete Multiple Records

```typescript
// Delete all unpublished posts
const result = await prisma.post.deleteMany({
  where: {
    published: false
  }
})

console.log(result)
// { count: 3 }

// Delete all records (dangerous!)
await prisma.user.deleteMany()
```

### Cascade Delete

Depends on relation configuration in schema:

```prisma
model User {
  id    Int    @id @default(autoincrement())
  posts Post[]
}

model Post {
  id       Int  @id @default(autoincrement())
  author   User @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId Int
}
```

```typescript
// Deleting user also deletes all their posts
await prisma.user.delete({
  where: { id: 1 }
})
```

**onDelete options**:
- `Cascade`: Delete related records
- `SetNull`: Set foreign key to null
- `Restrict`: Prevent deletion if relations exist (default)
- `NoAction`: Database-level behavior

## Error Handling

### Common Errors

```typescript
import { 
  PrismaClientKnownRequestError,
  PrismaClientValidationError 
} from '@prisma/client/runtime/library'

async function createUser(email: string) {
  try {
    const user = await prisma.user.create({
      data: { email }
    })
    return { success: true, user }
  } catch (error) {
    // Unique constraint violation
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { 
          success: false, 
          error: 'Email already exists' 
        }
      }
      if (error.code === 'P2025') {
        return { 
          success: false, 
          error: 'Record not found' 
        }
      }
    }
    
    // Validation error
    if (error instanceof PrismaClientValidationError) {
      return { 
        success: false, 
        error: 'Invalid data' 
      }
    }
    
    throw error
  }
}
```

### Common Error Codes

| Code | Meaning |
|------|---------|
| P2002 | Unique constraint violation |
| P2025 | Record not found |
| P2003 | Foreign key constraint failed |
| P2014 | Relation violation |
| P2034 | Transaction failed |

## Raw SQL Queries

### $queryRaw - Select Queries

```typescript
import { Prisma } from '@prisma/client'

// With template literal (safe from SQL injection)
const email = 'alice@prisma.io'
const users = await prisma.$queryRaw<User[]>`
  SELECT * FROM "User" WHERE email = ${email}
`

// With Prisma.sql (better type safety)
const users2 = await prisma.$queryRaw<User[]>(
  Prisma.sql`SELECT * FROM "User" WHERE email = ${email}`
)
```

### $executeRaw - Modification Queries

```typescript
// Update using raw SQL
const count = await prisma.$executeRaw`
  UPDATE "Post" SET views = views + 1 WHERE id = ${postId}
`

console.log(`Updated ${count} records`)
```

### $queryRawUnsafe - Dynamic SQL (Use Carefully!)

```typescript
// Only use when absolutely necessary
const tableName = 'User'
const users = await prisma.$queryRawUnsafe(
  `SELECT * FROM "${tableName}"`
)
```

⚠️ **Warning**: `$queryRawUnsafe` is vulnerable to SQL injection. Always validate inputs!

## Complete CRUD Example

```typescript
// src/user-service.ts
import prisma from './db'
import { Prisma } from '@prisma/client'

export class UserService {
  // Create user
  async createUser(data: Prisma.UserCreateInput) {
    try {
      return await prisma.user.create({ data })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Email already exists')
        }
      }
      throw error
    }
  }

  // Get user by ID
  async getUserById(id: number) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        posts: {
          where: { published: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
  }

  // List users with pagination
  async listUsers(page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          _count: {
            select: { posts: true }
          }
        }
      }),
      prisma.user.count()
    ])

    return {
      data: users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  }

  // Update user
  async updateUser(id: number, data: Prisma.UserUpdateInput) {
    return await prisma.user.update({
      where: { id },
      data
    })
  }

  // Delete user
  async deleteUser(id: number) {
    return await prisma.user.delete({
      where: { id }
    })
  }

  // Search users
  async searchUsers(query: string) {
    return await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      }
    })
  }
}
```

## Best Practices

1. **Always handle errors** - Use try-catch and check error codes
2. **Use type-safe queries** - Leverage Prisma's generated types
3. **Select only needed fields** - Reduce payload size
4. **Use pagination** - Don't fetch all records at once
5. **Disconnect client** - In scripts, always disconnect when done
6. **Use singleton pattern** - Prevent multiple client instances
7. **Leverage atomic operations** - Use increment/decrement for counters
8. **Validate input** - Before passing to Prisma
9. **Use transactions** - For operations that must succeed together (next tutorial)
10. **Monitor queries** - Enable logging in development

## Practice Exercises

1. Create a complete user management service with all CRUD operations
2. Implement cursor-based pagination for a blog post list
3. Build a search function that queries multiple fields
4. Create an analytics function using aggregations
5. Implement soft delete pattern (isDeleted flag instead of actual delete)
6. Build a bulk import function using createMany

## Summary

- Prisma Client provides type-safe database access
- CRUD operations: create, findMany, update, delete
- Advanced filtering with where, orderBy, select, include
- Pagination via skip/take (offset) or cursor
- Atomic updates with increment/decrement
- Error handling with specific error codes
- Raw SQL available when needed

Continue to [Relations and Nested Queries](./05_relations_and_nested_queries.md) →
