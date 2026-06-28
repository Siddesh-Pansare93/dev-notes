# Relations and Nested Queries

Master working with related data in Prisma through powerful relation queries, nested writes, and optimized data fetching strategies.

## What You'll Learn

- One-to-one, one-to-many, and many-to-many relations
- Nested reads with include and select
- Nested writes (create, update, connect)
- Relation filters
- Avoiding N+1 query problems
- Optimizing relation queries
- Self-relations

## Relation Types

### One-to-One

**Schema**:
```prisma
model User {
  id      Int      @id @default(autoincrement())
  email   String   @unique
  profile Profile?
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String
  user   User   @relation(fields: [userId], references: [id])
  userId Int    @unique  // Must be unique
}
```

**Queries**:
```typescript
// Create user with profile
const user = await prisma.user.create({
  data: {
    email: 'alice@prisma.io',
    profile: {
      create: {
        bio: 'Software developer'
      }
    }
  },
  include: {
    profile: true
  }
})

// Create profile for existing user
const profile = await prisma.profile.create({
  data: {
    bio: 'Designer',
    user: {
      connect: { id: 1 }
    }
  }
})

// Update user's profile
const updated = await prisma.user.update({
  where: { id: 1 },
  data: {
    profile: {
      update: {
        bio: 'Senior Developer'
      }
    }
  }
})

// Delete profile (disconnect)
await prisma.user.update({
  where: { id: 1 },
  data: {
    profile: {
      disconnect: true
    }
  }
})
```

### One-to-Many

**Schema**:
```prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  posts Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  author   User   @relation(fields: [authorId], references: [id])
  authorId Int
}
```

**Queries**:
```typescript
// Create user with multiple posts
const user = await prisma.user.create({
  data: {
    email: 'bob@prisma.io',
    posts: {
      create: [
        { title: 'First Post' },
        { title: 'Second Post' },
        { title: 'Third Post' }
      ]
    }
  },
  include: {
    posts: true
  }
})

// Add post to existing user
const post = await prisma.post.create({
  data: {
    title: 'New Post',
    author: {
      connect: { id: 1 }
    }
  }
})

// Find user with all their posts
const userWithPosts = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: {
      orderBy: {
        createdAt: 'desc'
      }
    }
  }
})

// Find posts by specific author
const posts = await prisma.post.findMany({
  where: {
    authorId: 1
  }
})

// Update all posts for a user
await prisma.user.update({
  where: { id: 1 },
  data: {
    posts: {
      updateMany: {
        where: {
          published: false
        },
        data: {
          published: true
        }
      }
    }
  }
})
```

### Many-to-Many (Implicit)

**Schema**:
```prisma
model Post {
  id       Int        @id @default(autoincrement())
  title    String
  tags     Tag[]
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]
}
```

Prisma creates join table automatically: `_PostToTag`

**Queries**:
```typescript
// Create post with tags
const post = await prisma.post.create({
  data: {
    title: 'Prisma Tutorial',
    tags: {
      create: [
        { name: 'prisma' },
        { name: 'typescript' }
      ]
    }
  },
  include: {
    tags: true
  }
})

// Connect post to existing tags
const updated = await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      connect: [
        { id: 1 },
        { id: 2 }
      ]
    }
  }
})

// Find posts with specific tag
const postsWithTag = await prisma.post.findMany({
  where: {
    tags: {
      some: {
        name: 'prisma'
      }
    }
  },
  include: {
    tags: true
  }
})

// Remove tag from post
await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      disconnect: { id: 2 }
    }
  }
})
```

### Many-to-Many (Explicit)

**Schema**:
```prisma
model Post {
  id         Int            @id @default(autoincrement())
  title      String
  categories PostCategory[]
}

model Category {
  id    Int            @id @default(autoincrement())
  name  String         @unique
  posts PostCategory[]
}

model PostCategory {
  post       Post     @relation(fields: [postId], references: [id])
  postId     Int
  category   Category @relation(fields: [categoryId], references: [id])
  categoryId Int
  assignedAt DateTime @default(now())
  assignedBy String?  // Extra field!
  
  @@id([postId, categoryId])
}
```

**Queries**:
```typescript
// Create post with categories (with metadata)
const post = await prisma.post.create({
  data: {
    title: 'Blog Post',
    categories: {
      create: [
        {
          category: {
            connect: { id: 1 }
          },
          assignedBy: 'admin'
        },
        {
          category: {
            create: { name: 'New Category' }
          },
          assignedBy: 'admin'
        }
      ]
    }
  }
})

// Find posts with category metadata
const posts = await prisma.post.findMany({
  include: {
    categories: {
      include: {
        category: true
      }
    }
  }
})

// Query join table directly
const assignments = await prisma.postCategory.findMany({
  where: {
    assignedBy: 'admin'
  },
  include: {
    post: true,
    category: true
  }
})
```

## Nested Reads

### include - Include Relations

```typescript
// Include single relation
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: true
  }
})

// Include multiple relations
const user2 = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: true,
    profile: true
  }
})

// Deep nesting
const user3 = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: {
      include: {
        comments: {
          include: {
            author: true
          }
        }
      }
    }
  }
})
```

### select - Choose Specific Fields

```typescript
// Select specific fields from user and posts
const user = await prisma.user.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    email: true,
    posts: {
      select: {
        title: true,
        published: true
      }
    }
  }
})

// Result type is automatically inferred
// {
//   id: number
//   email: string
//   posts: { title: string, published: boolean }[]
// }
```

### include vs select

```typescript
// ❌ Cannot use both together
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { posts: true },  // Error!
  select: { email: true }     // Error!
})

// ✅ Use select for everything
const user = await prisma.user.findUnique({
  where: { id: 1 },
  select: {
    email: true,
    posts: true  // Includes all post fields
  }
})

// ✅ Or nested select
const user2 = await prisma.user.findUnique({
  where: { id: 1 },
  select: {
    email: true,
    posts: {
      select: {
        title: true
      }
    }
  }
})
```

### Filtering Relations

```typescript
// Include only published posts
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: {
      where: {
        published: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5  // Latest 5 published posts
    }
  }
})

// Count relations
const users = await prisma.user.findMany({
  include: {
    _count: {
      select: {
        posts: true,
        comments: true
      }
    }
  }
})

// Result: [{ id: 1, email: '...', _count: { posts: 10, comments: 25 } }]
```

## Nested Writes

### Nested Create

```typescript
// Create user with nested profile and posts
const user = await prisma.user.create({
  data: {
    email: 'charlie@prisma.io',
    profile: {
      create: {
        bio: 'Developer'
      }
    },
    posts: {
      create: [
        { title: 'First Post', published: true },
        { title: 'Second Post' }
      ]
    }
  },
  include: {
    profile: true,
    posts: true
  }
})
```

### Nested Update

```typescript
// Update user and their posts
const user = await prisma.user.update({
  where: { id: 1 },
  data: {
    name: 'Updated Name',
    posts: {
      updateMany: {
        where: {
          published: false
        },
        data: {
          published: true
        }
      }
    }
  }
})

// Update specific nested record
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

### Connect and Disconnect

```typescript
// Connect existing records
await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      connect: [
        { id: 1 },
        { id: 2 }
      ]
    }
  }
})

// Disconnect records
await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      disconnect: [
        { id: 2 }
      ]
    }
  }
})

// Set (replace all)
await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      set: [
        { id: 1 },
        { id: 3 }
      ]
    }
  }
})
```

### createMany in Nested Writes

```typescript
// Create parent with many children
const user = await prisma.user.create({
  data: {
    email: 'dave@prisma.io',
    posts: {
      createMany: {
        data: [
          { title: 'Post 1' },
          { title: 'Post 2' },
          { title: 'Post 3' }
        ]
      }
    }
  }
})

// Note: createMany cannot be used with include
// Must query separately if you need the created posts
```

## Relation Filters

### Filtering by Related Records

```typescript
// Find users who have at least one published post
const users = await prisma.user.findMany({
  where: {
    posts: {
      some: {
        published: true
      }
    }
  }
})

// Find users with NO posts
const usersWithoutPosts = await prisma.user.findMany({
  where: {
    posts: {
      none: {}
    }
  }
})

// Find users where ALL posts are published
const usersAllPublished = await prisma.user.findMany({
  where: {
    posts: {
      every: {
        published: true
      }
    }
  }
})
```

### Complex Relation Filters

```typescript
// Users with posts containing "Prisma" in title
const users = await prisma.user.findMany({
  where: {
    posts: {
      some: {
        title: {
          contains: 'Prisma'
        }
      }
    }
  }
})

// Posts with specific tag AND category
const posts = await prisma.post.findMany({
  where: {
    AND: [
      {
        tags: {
          some: {
            name: 'typescript'
          }
        }
      },
      {
        categories: {
          some: {
            category: {
              name: 'tutorials'
            }
          }
        }
      }
    ]
  }
})
```

## Self-Relations

### Hierarchical Data

**Schema**:
```prisma
model Category {
  id       Int        @id @default(autoincrement())
  name     String
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  parentId Int?
  children Category[] @relation("CategoryTree")
}
```

**Queries**:
```typescript
// Create category hierarchy
const root = await prisma.category.create({
  data: {
    name: 'Electronics',
    children: {
      create: [
        {
          name: 'Computers',
          children: {
            create: [
              { name: 'Laptops' },
              { name: 'Desktops' }
            ]
          }
        },
        { name: 'Phones' }
      ]
    }
  }
})

// Find category with all children
const category = await prisma.category.findUnique({
  where: { id: 1 },
  include: {
    children: {
      include: {
        children: true  // Two levels deep
      }
    }
  }
})

// Find category with parent
const child = await prisma.category.findUnique({
  where: { id: 3 },
  include: {
    parent: true
  }
})
```

### Social Network (Followers)

**Schema**:
```prisma
model User {
  id         Int      @id @default(autoincrement())
  email      String   @unique
  followers  Follow[] @relation("UserFollowers")
  following  Follow[] @relation("UserFollowing")
}

model Follow {
  follower    User @relation("UserFollowers", fields: [followerId], references: [id])
  followerId  Int
  following   User @relation("UserFollowing", fields: [followingId], references: [id])
  followingId Int
  createdAt   DateTime @default(now())
  
  @@id([followerId, followingId])
}
```

**Queries**:
```typescript
// User follows another user
await prisma.follow.create({
  data: {
    followerId: 1,
    followingId: 2
  }
})

// Get user's followers
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    followers: {
      include: {
        follower: true
      }
    }
  }
})

// Get who user is following
const following = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    following: {
      include: {
        following: true
      }
    }
  }
})

// Mutual followers
const mutualFollowers = await prisma.follow.findMany({
  where: {
    followerId: 1,
    following: {
      followers: {
        some: {
          followerId: 1
        }
      }
    }
  }
})
```

## Avoiding N+1 Queries

### ❌ N+1 Problem

```typescript
// DON'T: This creates N+1 queries (1 + N)
const users = await prisma.user.findMany()  // 1 query

for (const user of users) {
  const posts = await prisma.post.findMany({  // N queries
    where: { authorId: user.id }
  })
  console.log(user.name, posts.length)
}
```

### ✅ Solution: Include Relations

```typescript
// DO: Single query with include
const users = await prisma.user.findMany({
  include: {
    posts: true
  }
})

users.forEach(user => {
  console.log(user.name, user.posts.length)
})
```

### ✅ Solution: Aggregation

```typescript
// Even better: Use aggregation
const users = await prisma.user.findMany({
  include: {
    _count: {
      select: { posts: true }
    }
  }
})

users.forEach(user => {
  console.log(user.name, user._count.posts)
})
```

## Performance Optimization

### 1. Select Only Needed Fields

```typescript
// ❌ Fetches all fields
const users = await prisma.user.findMany({
  include: {
    posts: true
  }
})

// ✅ Select only what you need
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    posts: {
      select: {
        id: true,
        title: true
      }
    }
  }
})
```

### 2. Limit Nested Relations

```typescript
// ✅ Limit number of nested records
const users = await prisma.user.findMany({
  include: {
    posts: {
      take: 5,  // Only 5 posts per user
      orderBy: {
        createdAt: 'desc'
      }
    }
  }
})
```

### 3. Use Aggregations

```typescript
// ❌ Fetching all posts just to count
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: true
  }
})
const postCount = user.posts.length

// ✅ Use _count
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    _count: {
      select: { posts: true }
    }
  }
})
const postCount = user._count.posts
```

## Complete Example: Blog with Relations

```typescript
// src/blog-service.ts
import prisma from './db'

export class BlogService {
  // Get post with all relations
  async getPost(id: number) {
    return await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        tags: true,
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    })
  }

  // Create post with tags
  async createPost(userId: number, title: string, content: string, tagNames: string[]) {
    return await prisma.post.create({
      data: {
        title,
        content,
        author: {
          connect: { id: userId }
        },
        tags: {
          connectOrCreate: tagNames.map(name => ({
            where: { name },
            create: { name }
          }))
        }
      },
      include: {
        tags: true
      }
    })
  }

  // Get user's feed (posts from followed users)
  async getUserFeed(userId: number, page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize

    return await prisma.post.findMany({
      where: {
        author: {
          followers: {
            some: {
              followerId: userId
            }
          }
        }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: pageSize
    })
  }
}
```

## Best Practices

1. **Use include for related data** - Avoid N+1 queries
2. **Select only needed fields** - Reduce payload size
3. **Limit nested relations** - Use take to cap results
4. **Use _count for counting** - More efficient than fetching all records
5. **Leverage connectOrCreate** - Upsert pattern for relations
6. **Use explicit many-to-many** - When you need metadata on relations
7. **Filter at database level** - Use where on includes, not in application code
8. **Consider denormalization** - For frequently accessed aggregates
9. **Use indexes on foreign keys** - Already done by Prisma automatically
10. **Monitor query performance** - Enable query logging

## Practice Exercises

1. Create a social media schema with Users, Posts, Comments, Likes
2. Implement a tree structure for comments (nested comments)
3. Build a followers system with mutual followers query
4. Create an e-commerce schema with Products, Orders, OrderItems
5. Optimize a slow query that has N+1 problem
6. Implement a tagging system with explicit many-to-many

## Summary

- Relations model real-world data connections
- Three types: one-to-one, one-to-many, many-to-many
- Use include/select for nested reads
- Nested writes allow complex operations in single query
- Relation filters: some, every, none
- Avoid N+1 queries with include
- Use _count for aggregations
- Self-relations enable hierarchies and graphs

Continue to [Transactions and Batch Operations](./06_transactions_and_batch.md) →
