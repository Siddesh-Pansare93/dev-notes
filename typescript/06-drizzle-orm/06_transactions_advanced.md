# Transactions and Advanced Queries

## Overview

Learn advanced Drizzle ORM features including transactions, prepared statements, batch operations, and performance optimization techniques.

## Transactions

### Basic Transaction

```typescript
import { db } from './db';
import { users, accounts } from './schema';

// Automatic commit/rollback
await db.transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values({ name: 'John', email: 'john@example.com' })
    .returning();
  
  await tx
    .insert(accounts)
    .values({ userId: user.id, balance: 100 });
  
  // If any query fails, entire transaction rolls back
});
```

### Transaction with Error Handling

```typescript
try {
  await db.transaction(async (tx) => {
    // Transfer money between accounts
    const [sender] = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.id, fromAccountId))
      .for('update'); // Lock row
    
    if (sender.balance < amount) {
      throw new Error('Insufficient funds');
    }
    
    // Deduct from sender
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} - ${amount}` })
      .where(eq(accounts.id, fromAccountId));
    
    // Add to receiver
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance} + ${amount}` })
      .where(eq(accounts.id, toAccountId));
    
    // Log transaction
    await tx.insert(transactions).values({
      fromAccountId,
      toAccountId,
      amount,
      timestamp: new Date(),
    });
  });
  
  console.log('Transfer successful');
} catch (error) {
  console.error('Transfer failed:', error);
  // Transaction automatically rolled back
}
```

### Nested Transactions (Savepoints)

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: 'User 1' });
  
  try {
    await tx.transaction(async (tx2) => {
      await tx2.insert(posts).values({ title: 'Post 1' });
      throw new Error('Something went wrong');
    });
  } catch (error) {
    // Inner transaction rolled back, outer continues
    console.log('Inner transaction failed, continuing...');
  }
  
  await tx.insert(users).values({ name: 'User 2' });
  // Only outer inserts are committed
});
```

### Transaction Isolation Levels

```typescript
import { sql } from 'drizzle-orm';

// PostgreSQL isolation levels
await db.transaction(async (tx) => {
  await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
  
  // Your queries here
  const data = await tx.select().from(users);
  
}, {
  isolationLevel: 'serializable', // or 'read committed', 'repeatable read'
});
```

## Prepared Statements

### Basic Prepared Statement

```typescript
import { sql } from 'drizzle-orm';

// Create prepared statement
const getUserById = db
  .select()
  .from(users)
  .where(eq(users.id, sql.placeholder('id')))
  .prepare('get_user_by_id');

// Execute multiple times
const user1 = await getUserById.execute({ id: 1 });
const user2 = await getUserById.execute({ id: 2 });
const user3 = await getUserById.execute({ id: 3 });

// Much faster than rebuilding query each time
```

### Prepared Insert

```typescript
const insertUser = db
  .insert(users)
  .values({
    name: sql.placeholder('name'),
    email: sql.placeholder('email'),
  })
  .returning()
  .prepare('insert_user');

// Execute with different values
await insertUser.execute({ name: 'Alice', email: 'alice@example.com' });
await insertUser.execute({ name: 'Bob', email: 'bob@example.com' });
```

### Prepared Update

```typescript
const updateUserStatus = db
  .update(users)
  .set({
    isActive: sql.placeholder('isActive'),
    updatedAt: new Date(),
  })
  .where(eq(users.id, sql.placeholder('id')))
  .prepare('update_user_status');

await updateUserStatus.execute({ id: 1, isActive: true });
await updateUserStatus.execute({ id: 2, isActive: false });
```

### Complex Prepared Query

```typescript
const searchPosts = db
  .select({
    id: posts.id,
    title: posts.title,
    authorName: users.name,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .where(
    and(
      ilike(posts.title, sql.placeholder('search')),
      eq(posts.status, sql.placeholder('status'))
    )
  )
  .orderBy(desc(posts.createdAt))
  .limit(sql.placeholder('limit'))
  .prepare('search_posts');

// Execute with parameters
const results = await searchPosts.execute({
  search: '%typescript%',
  status: 'published',
  limit: 10,
});
```

## Batch Operations

### Batch API (Neon, LibSQL, D1)

```typescript
// Execute multiple queries in single round trip
const [insertResult, updateResult, selectResult] = await db.batch([
  db.insert(users).values({ name: 'Alice', email: 'alice@example.com' }),
  db.update(posts).set({ status: 'published' }).where(eq(posts.id, 1)),
  db.select().from(users).where(eq(users.isActive, true)),
]);

// All execute in single transaction
// If one fails, all roll back
```

### Batch Insert

```typescript
// Insert many records efficiently
const userBatch = [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
  { name: 'User 3', email: 'user3@example.com' },
  // ... thousands more
];

// Single query for all inserts
await db.insert(users).values(userBatch);

// With returning
const inserted = await db.insert(users).values(userBatch).returning();
```

### Batch with Transaction

```typescript
await db.transaction(async (tx) => {
  const [users, posts, comments] = await tx.batch([
    tx.insert(users).values(usersData).returning(),
    tx.insert(posts).values(postsData).returning(),
    tx.insert(comments).values(commentsData).returning(),
  ]);
  
  return { users, posts, comments };
});
```

## Query Building Patterns

### Dynamic Query Builder

```typescript
function buildUserQuery(filters: {
  role?: string;
  isActive?: boolean;
  search?: string;
  sortBy?: 'name' | 'createdAt';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}) {
  let query = db.select().from(users);
  
  // Build where conditions
  const conditions: SQL[] = [];
  
  if (filters.role) {
    conditions.push(eq(users.role, filters.role));
  }
  
  if (filters.isActive !== undefined) {
    conditions.push(eq(users.isActive, filters.isActive));
  }
  
  if (filters.search) {
    conditions.push(
      or(
        ilike(users.name, `%${filters.search}%`),
        ilike(users.email, `%${filters.search}%`)
      )
    );
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  
  // Sorting
  if (filters.sortBy) {
    const column = filters.sortBy === 'name' ? users.name : users.createdAt;
    query = query.orderBy(
      filters.order === 'desc' ? desc(column) : asc(column)
    );
  }
  
  // Pagination
  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  
  if (filters.offset) {
    query = query.offset(filters.offset);
  }
  
  return query;
}

// Usage
const activeAdmins = await buildUserQuery({
  role: 'admin',
  isActive: true,
  sortBy: 'createdAt',
  order: 'desc',
  limit: 20,
});
```

### Reusable Query Fragments

```typescript
// Common query fragments
const activeUsersQuery = db.select().from(users).where(eq(users.isActive, true));

const publishedPostsQuery = db
  .select()
  .from(posts)
  .where(eq(posts.status, 'published'));

// Compose queries
const activeAuthors = await activeUsersQuery
  .innerJoin(publishedPostsQuery, eq(posts.authorId, users.id));
```

### Query Builder Class

```typescript
class UserQueryBuilder {
  private query = db.select().from(users);
  
  active() {
    this.query = this.query.where(eq(users.isActive, true));
    return this;
  }
  
  role(role: string) {
    this.query = this.query.where(eq(users.role, role));
    return this;
  }
  
  search(term: string) {
    this.query = this.query.where(ilike(users.name, `%${term}%`));
    return this;
  }
  
  limit(limit: number) {
    this.query = this.query.limit(limit);
    return this;
  }
  
  async execute() {
    return this.query;
  }
}

// Usage
const users = await new UserQueryBuilder()
  .active()
  .role('admin')
  .search('john')
  .limit(10)
  .execute();
```

## Advanced SQL Features

### Window Functions

```typescript
import { sql } from 'drizzle-orm';

// Ranking
const rankedPosts = await db
  .select({
    id: posts.id,
    title: posts.title,
    viewCount: posts.viewCount,
    rank: sql<number>`rank() over (order by ${posts.viewCount} desc)`,
  })
  .from(posts);

// Row number within partition
const result = await db
  .select({
    id: posts.id,
    title: posts.title,
    categoryId: posts.categoryId,
    rowNum: sql<number>`row_number() over (partition by ${posts.categoryId} order by ${posts.createdAt} desc)`,
  })
  .from(posts);

// Running total
const runningTotal = await db
  .select({
    date: orders.createdAt,
    dailyTotal: sum(orders.total),
    runningTotal: sql<number>`sum(${orders.total}) over (order by ${orders.createdAt})`,
  })
  .from(orders)
  .groupBy(orders.createdAt);
```

### Common Table Expressions (CTEs)

```typescript
// PostgreSQL WITH clause
const recentPosts = db.$with('recent_posts').as(
  db
    .select()
    .from(posts)
    .where(gt(posts.createdAt, sql`now() - interval '7 days'`))
);

const result = await db
  .with(recentPosts)
  .select({
    authorName: users.name,
    postCount: count(recentPosts.id),
  })
  .from(recentPosts)
  .innerJoin(users, eq(recentPosts.authorId, users.id))
  .groupBy(users.id);

// Multiple CTEs
const activeUsers = db.$with('active_users').as(
  db.select().from(users).where(eq(users.isActive, true))
);

const publishedPosts = db.$with('published_posts').as(
  db.select().from(posts).where(eq(posts.status, 'published'))
);

const report = await db
  .with(activeUsers, publishedPosts)
  .select({
    userName: activeUsers.name,
    postCount: count(publishedPosts.id),
  })
  .from(activeUsers)
  .leftJoin(publishedPosts, eq(publishedPosts.authorId, activeUsers.id))
  .groupBy(activeUsers.id);
```

### Subqueries

```typescript
// Subquery in SELECT
const usersWithPostCount = await db
  .select({
    id: users.id,
    name: users.name,
    postCount: db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.authorId, users.id)),
  })
  .from(users);

// Subquery in WHERE
const usersWithManyPosts = await db
  .select()
  .from(users)
  .where(
    sql`${users.id} IN (
      SELECT ${posts.authorId} 
      FROM ${posts} 
      GROUP BY ${posts.authorId} 
      HAVING COUNT(*) > 10
    )`
  );

// EXISTS subquery
const usersWithPublishedPosts = await db
  .select()
  .from(users)
  .where(
    sql`EXISTS (
      SELECT 1 FROM ${posts}
      WHERE ${posts.authorId} = ${users.id}
        AND ${posts.status} = 'published'
    )`
  );
```

### UNION and INTERSECT

```typescript
// UNION
const allContent = await db
  .select({ type: sql`'post'`, title: posts.title })
  .from(posts)
  .union(
    db.select({ type: sql`'page'`, title: pages.title }).from(pages)
  );

// UNION ALL (includes duplicates)
const allTitles = await db
  .select({ title: posts.title })
  .from(posts)
  .unionAll(
    db.select({ title: pages.title }).from(pages)
  );

// INTERSECT (common records)
const common = await db
  .select({ id: users.id })
  .from(users)
  .intersect(
    db.select({ id: authors.id }).from(authors)
  );
```

## Performance Optimization

### Explain Queries

```typescript
// PostgreSQL EXPLAIN
const plan = await db.execute(sql`
  EXPLAIN ANALYZE
  SELECT * FROM users WHERE email = 'test@example.com'
`);

console.log(plan);
```

### Index Hints

```typescript
// Force index usage (MySQL)
const result = await db.execute(sql`
  SELECT * FROM ${users} FORCE INDEX (email_idx)
  WHERE ${users.email} = 'test@example.com'
`);
```

### Query Timeouts

```typescript
// Set statement timeout (PostgreSQL)
await db.execute(sql`SET statement_timeout = 5000`); // 5 seconds

// Your query
const result = await db.select().from(users);
```

### Connection Pooling

```typescript
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 2000, // Timeout for acquiring connection
});

export const db = drizzle(pool);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
```

## Real-World Examples

### E-commerce Order Processing

```typescript
async function processOrder(orderData: CreateOrder) {
  return await db.transaction(async (tx) => {
    // 1. Create order
    const [order] = await tx
      .insert(orders)
      .values({
        userId: orderData.userId,
        status: 'pending',
        total: orderData.total,
      })
      .returning();
    
    // 2. Create order items
    const orderItems = await tx
      .insert(orderItems)
      .values(
        orderData.items.map(item => ({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        }))
      )
      .returning();
    
    // 3. Update product inventory
    for (const item of orderData.items) {
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .for('update'); // Row lock
      
      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      
      await tx
        .update(products)
        .set({
          quantity: sql`${products.quantity} - ${item.quantity}`,
        })
        .where(eq(products.id, item.productId));
    }
    
    // 4. Create payment record
    await tx.insert(payments).values({
      orderId: order.id,
      amount: orderData.total,
      status: 'pending',
    });
    
    return { order, orderItems };
  });
}
```

### Analytics Query

```typescript
async function getDashboardStats(userId: number) {
  const [stats] = await db
    .select({
      totalOrders: count(orders.id),
      totalRevenue: sum(orders.total),
      avgOrderValue: avg(orders.total),
      completedOrders: sql<number>`count(*) filter (where ${orders.status} = 'completed')`,
      pendingOrders: sql<number>`count(*) filter (where ${orders.status} = 'pending')`,
    })
    .from(orders)
    .where(eq(orders.userId, userId));
  
  return stats;
}
```

## Practice Exercises

1. **Implement money transfer** with proper transaction handling
2. **Create batch import** function for CSV data
3. **Build dynamic query builder** with all filter options
4. **Use prepared statements** for high-performance queries
5. **Implement complex analytics** using CTEs and window functions
6. **Optimize slow queries** using indexes and EXPLAIN

## Next Steps

Continue to [Drizzle with NestJS](./07_nestjs_integration.md) to learn enterprise patterns with NestJS framework.
