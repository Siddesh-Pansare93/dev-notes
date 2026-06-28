# CRUD Operations with Drizzle ORM

## Overview

Drizzle provides type-safe CRUD (Create, Read, Update, Delete) operations with an intuitive SQL-like syntax. All operations are fully typed based on your schema definition.

## Select Queries

### Basic Select

```typescript
import { db } from './db';
import { users } from './db/schema';

// Select all users
const allUsers = await db.select().from(users);
// Type: User[]

// Select all with explicit typing
const result: User[] = await db.select().from(users);
```

### Select Specific Columns

```typescript
// Select specific columns
const userEmails = await db
  .select({
    email: users.email,
    name: users.name,
  })
  .from(users);
// Type: { email: string; name: string }[]

// With column aliases
const userInfo = await db
  .select({
    id: users.id,
    fullName: users.name, // Different property name
    userEmail: users.email,
  })
  .from(users);
```

### Where Conditions

```typescript
import { eq, ne, gt, gte, lt, lte, like, ilike, and, or, not, inArray, notInArray, isNull, isNotNull } from 'drizzle-orm';

// Simple equality
const user = await db
  .select()
  .from(users)
  .where(eq(users.id, 1));

// Not equal
const activeUsers = await db
  .select()
  .from(users)
  .where(eq(users.isActive, true));

// Greater than / Less than
const recentPosts = await db
  .select()
  .from(posts)
  .where(gt(posts.createdAt, new Date('2024-01-01')));

// LIKE and ILIKE
const searchUsers = await db
  .select()
  .from(users)
  .where(like(users.email, '%@gmail.com'));

// Case-insensitive LIKE
const searchByName = await db
  .select()
  .from(users)
  .where(ilike(users.name, '%john%'));

// IN clause
const specificUsers = await db
  .select()
  .from(users)
  .where(inArray(users.id, [1, 2, 3, 4, 5]));

// NOT IN clause
const excludedUsers = await db
  .select()
  .from(users)
  .where(notInArray(users.role, ['banned', 'deleted']));

// IS NULL / IS NOT NULL
const usersWithoutAvatar = await db
  .select()
  .from(users)
  .where(isNull(users.avatar));

const verifiedUsers = await db
  .select()
  .from(users)
  .where(isNotNull(users.emailVerifiedAt));
```

### Combining Conditions

```typescript
// AND conditions
const result = await db
  .select()
  .from(users)
  .where(
    and(
      eq(users.isActive, true),
      eq(users.emailVerified, true),
      gt(users.createdAt, new Date('2024-01-01'))
    )
  );

// OR conditions
const result = await db
  .select()
  .from(users)
  .where(
    or(
      eq(users.role, 'admin'),
      eq(users.role, 'moderator')
    )
  );

// Complex combinations
const result = await db
  .select()
  .from(users)
  .where(
    and(
      eq(users.isActive, true),
      or(
        eq(users.role, 'admin'),
        eq(users.role, 'moderator')
      ),
      not(eq(users.email, 'banned@example.com'))
    )
  );
```

### Ordering

```typescript
import { asc, desc } from 'drizzle-orm';

// Order by single column
const users = await db
  .select()
  .from(users)
  .orderBy(desc(users.createdAt));

// Order by multiple columns
const users = await db
  .select()
  .from(users)
  .orderBy(
    asc(users.role),
    desc(users.createdAt)
  );

// Null values first/last (PostgreSQL)
const users = await db
  .select()
  .from(users)
  .orderBy(desc(users.lastLoginAt).nullsLast());
```

### Limit and Offset

```typescript
// Limit results
const topUsers = await db
  .select()
  .from(users)
  .limit(10);

// Pagination with offset
const page = 2;
const pageSize = 20;
const paginatedUsers = await db
  .select()
  .from(users)
  .limit(pageSize)
  .offset((page - 1) * pageSize);

// With ordering
const latestPosts = await db
  .select()
  .from(posts)
  .orderBy(desc(posts.createdAt))
  .limit(10);
```

### Distinct

```typescript
// Select distinct values
const uniqueRoles = await db
  .selectDistinct({ role: users.role })
  .from(users);

// Distinct on specific columns (PostgreSQL)
const distinctUsers = await db
  .selectDistinctOn([users.email])
  .from(users)
  .orderBy(users.email, desc(users.createdAt));
```

## Insert Operations

### Single Insert

```typescript
// Insert and return all fields
const newUser = await db
  .insert(users)
  .values({
    name: 'John Doe',
    email: 'john@example.com',
    passwordHash: 'hashed_password',
  })
  .returning();
// Type: User[]

// Insert and return specific fields
const result = await db
  .insert(users)
  .values({
    name: 'Jane Doe',
    email: 'jane@example.com',
    passwordHash: 'hashed_password',
  })
  .returning({
    id: users.id,
    email: users.email,
  });
// Type: { id: number; email: string }[]

// Insert without returning (MySQL, SQLite without RETURNING support)
await db
  .insert(users)
  .values({
    name: 'Bob Smith',
    email: 'bob@example.com',
    passwordHash: 'hashed_password',
  });
```

### Bulk Insert

```typescript
// Insert multiple records
const newUsers = await db
  .insert(users)
  .values([
    {
      name: 'User 1',
      email: 'user1@example.com',
      passwordHash: 'hash1',
    },
    {
      name: 'User 2',
      email: 'user2@example.com',
      passwordHash: 'hash2',
    },
    {
      name: 'User 3',
      email: 'user3@example.com',
      passwordHash: 'hash3',
    },
  ])
  .returning();

// With type inference
type NewUser = InferInsertModel<typeof users>;

const usersToInsert: NewUser[] = [
  { name: 'A', email: 'a@example.com', passwordHash: 'hash' },
  { name: 'B', email: 'b@example.com', passwordHash: 'hash' },
];

await db.insert(users).values(usersToInsert);
```

### Insert with Default Values

```typescript
// Schema with defaults
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 })
    .$defaultFn(() => generateSlug()),
  status: varchar('status', { length: 20 }).default('draft'),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Insert with some defaults
const newPost = await db
  .insert(posts)
  .values({
    title: 'My First Post',
    // slug, status, viewCount, createdAt will use defaults
  })
  .returning();
```

### Upsert (Insert or Update)

```typescript
// PostgreSQL - ON CONFLICT DO UPDATE
const result = await db
  .insert(users)
  .values({
    email: 'john@example.com',
    name: 'John Doe',
    passwordHash: 'hash',
  })
  .onConflictDoUpdate({
    target: users.email,
    set: {
      name: 'John Doe Updated',
      updatedAt: new Date(),
    },
  })
  .returning();

// MySQL - ON DUPLICATE KEY UPDATE
const result = await db
  .insert(users)
  .values({
    email: 'john@example.com',
    name: 'John Doe',
    passwordHash: 'hash',
  })
  .onDuplicateKeyUpdate({
    set: {
      name: sql`VALUES(name)`,
      updatedAt: new Date(),
    },
  });

// Upsert with conditional update
const result = await db
  .insert(users)
  .values({
    email: 'john@example.com',
    name: 'John Doe',
    passwordHash: 'hash',
  })
  .onConflictDoUpdate({
    target: users.email,
    set: {
      name: sql`excluded.name`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    },
    where: sql`${users.updatedAt} < excluded.updated_at`,
  });
```

### Insert from Select

```typescript
// Insert data from another table
await db
  .insert(archivedUsers)
  .select(
    db.select().from(users).where(eq(users.isActive, false))
  );
```

## Update Operations

### Basic Update

```typescript
// Update and return updated rows
const updated = await db
  .update(users)
  .set({
    name: 'Updated Name',
    updatedAt: new Date(),
  })
  .where(eq(users.id, 1))
  .returning();

// Update without returning
await db
  .update(users)
  .set({ isActive: false })
  .where(eq(users.id, 1));

// Update specific columns
const result = await db
  .update(users)
  .set({
    emailVerified: true,
    emailVerifiedAt: new Date(),
  })
  .where(eq(users.email, 'user@example.com'))
  .returning({
    id: users.id,
    email: users.email,
  });
```

### Conditional Update

```typescript
// Update with multiple conditions
await db
  .update(users)
  .set({ role: 'premium' })
  .where(
    and(
      eq(users.isActive, true),
      gt(users.orderCount, 10)
    )
  );

// Update with OR conditions
await db
  .update(posts)
  .set({ status: 'archived' })
  .where(
    or(
      lt(posts.createdAt, new Date('2023-01-01')),
      eq(posts.viewCount, 0)
    )
  );
```

### Increment/Decrement

```typescript
import { sql } from 'drizzle-orm';

// Increment a counter
await db
  .update(posts)
  .set({
    viewCount: sql`${posts.viewCount} + 1`,
  })
  .where(eq(posts.id, 1));

// Decrement stock
await db
  .update(products)
  .set({
    quantity: sql`${products.quantity} - ${orderQuantity}`,
  })
  .where(eq(products.id, productId));

// Multiple increments
await db
  .update(users)
  .set({
    loginCount: sql`${users.loginCount} + 1`,
    lastLoginAt: new Date(),
  })
  .where(eq(users.id, userId));
```

### Update with Subquery

```typescript
// Update using values from another table
await db
  .update(products)
  .set({
    averageRating: sql`(
      SELECT AVG(rating) 
      FROM reviews 
      WHERE reviews.product_id = ${products.id}
    )`,
  })
  .where(eq(products.id, productId));
```

## Delete Operations

### Basic Delete

```typescript
// Delete and return deleted rows
const deleted = await db
  .delete(users)
  .where(eq(users.id, 1))
  .returning();

// Delete without returning
await db
  .delete(users)
  .where(eq(users.id, 1));

// Delete with conditions
await db
  .delete(users)
  .where(
    and(
      eq(users.isActive, false),
      lt(users.lastLoginAt, new Date('2023-01-01'))
    )
  );
```

### Conditional Delete

```typescript
// Delete inactive users
await db
  .delete(users)
  .where(eq(users.isActive, false));

// Delete old records
const cutoffDate = new Date();
cutoffDate.setMonth(cutoffDate.getMonth() - 6);

await db
  .delete(logs)
  .where(lt(logs.createdAt, cutoffDate));

// Delete with multiple conditions
await db
  .delete(sessions)
  .where(
    or(
      lt(sessions.expiresAt, new Date()),
      eq(sessions.isValid, false)
    )
  );
```

### Delete All

```typescript
// ⚠️ Delete all records (use with caution!)
await db.delete(tempData);
```

## Aggregation Functions

```typescript
import { sql, count, sum, avg, min, max } from 'drizzle-orm';

// Count
const userCount = await db
  .select({ count: count() })
  .from(users);
// { count: number }

// Count with conditions
const activeUserCount = await db
  .select({ count: count() })
  .from(users)
  .where(eq(users.isActive, true));

// Count distinct
const uniqueRoles = await db
  .select({ count: count(users.role) })
  .from(users);

// Sum
const totalRevenue = await db
  .select({ total: sum(orders.total) })
  .from(orders);

// Average
const avgPrice = await db
  .select({ average: avg(products.price) })
  .from(products);

// Min and Max
const priceRange = await db
  .select({
    min: min(products.price),
    max: max(products.price),
  })
  .from(products);

// Multiple aggregations
const stats = await db
  .select({
    totalOrders: count(),
    totalRevenue: sum(orders.total),
    avgOrderValue: avg(orders.total),
    minOrder: min(orders.total),
    maxOrder: max(orders.total),
  })
  .from(orders)
  .where(eq(orders.status, 'completed'));
```

## Group By and Having

```typescript
// Group by single column
const usersByRole = await db
  .select({
    role: users.role,
    count: count(),
  })
  .from(users)
  .groupBy(users.role);

// Group by multiple columns
const ordersByUserAndStatus = await db
  .select({
    userId: orders.userId,
    status: orders.status,
    count: count(),
    total: sum(orders.total),
  })
  .from(orders)
  .groupBy(orders.userId, orders.status);

// Group by with HAVING
const activeRoles = await db
  .select({
    role: users.role,
    count: count(),
  })
  .from(users)
  .groupBy(users.role)
  .having(({ count }) => gt(count, 10));

// Complex aggregation
const topCategories = await db
  .select({
    categoryId: products.categoryId,
    productCount: count(),
    totalRevenue: sum(products.price),
    avgPrice: avg(products.price),
  })
  .from(products)
  .groupBy(products.categoryId)
  .having(({ productCount }) => gt(productCount, 5))
  .orderBy(desc(sql`total_revenue`))
  .limit(10);
```

## Using Raw SQL

```typescript
import { sql } from 'drizzle-orm';

// Raw SQL in select
const result = await db
  .select({
    id: users.id,
    fullName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
    emailDomain: sql<string>`substring(${users.email} from '@(.*)$')`,
  })
  .from(users);

// Raw SQL in where
const users = await db
  .select()
  .from(users)
  .where(sql`lower(${users.email}) = lower(${'USER@EXAMPLE.COM'})`);

// Execute raw SQL query
const result = await db.execute(sql`
  SELECT 
    u.id,
    u.name,
    COUNT(p.id) as post_count
  FROM users u
  LEFT JOIN posts p ON p.author_id = u.id
  GROUP BY u.id, u.name
  HAVING COUNT(p.id) > 5
`);
```

## Helper Functions Example

```typescript
// src/db/queries.ts
import { db } from './index';
import { users, posts } from './schema';
import { eq, and, or, desc } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

type User = InferSelectModel<typeof users>;
type NewUser = InferInsertModel<typeof users>;

// Get user by ID
export async function getUserById(id: number): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id));
  return user;
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  return user;
}

// Create user
export async function createUser(data: NewUser): Promise<User> {
  const [user] = await db
    .insert(users)
    .values(data)
    .returning();
  return user;
}

// Update user
export async function updateUser(
  id: number,
  data: Partial<NewUser>
): Promise<User | undefined> {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return user;
}

// Delete user
export async function deleteUser(id: number): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}

// Get active users
export async function getActiveUsers(): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(desc(users.createdAt));
}

// Search users
export async function searchUsers(query: string): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(
      or(
        ilike(users.name, `%${query}%`),
        ilike(users.email, `%${query}%`)
      )
    )
    .limit(20);
}
```

## Practice Exercises

1. **Create a user management system** with CRUD operations
2. **Implement pagination** for listing products
3. **Build a search function** with multiple filters
4. **Create aggregation queries** to get statistics (user count by role, total revenue by month)
5. **Implement soft delete** by using a `deletedAt` field instead of actual deletion
6. **Build update functions** with field-level validation

## Common Patterns

```typescript
// Soft delete pattern
export async function softDeleteUser(id: number) {
  return db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
}

// Get non-deleted records
export async function getActiveRecords() {
  return db
    .select()
    .from(users)
    .where(isNull(users.deletedAt));
}

// Update or create pattern
export async function upsertUser(email: string, data: Partial<NewUser>) {
  return db
    .insert(users)
    .values({ email, ...data })
    .onConflictDoUpdate({
      target: users.email,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
}
```

## Next Steps

Continue to [Relations and Joins](./04_relations_and_joins.md) to learn how to work with related data across multiple tables.
