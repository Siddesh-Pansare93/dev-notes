# Relations and Joins in Drizzle ORM

## Overview

Drizzle provides two powerful ways to work with related data:
1. **Relational Query API** - High-level, intuitive API for querying relations
2. **Join Queries** - SQL-like joins for complex queries

## Defining Relations

Relations are defined separately from the schema using the `relations()` function:

```typescript
// src/db/schema.ts
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tables
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: integer('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  postId: integer('post_id').notNull().references(() => posts.id),
  userId: integer('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));
```

## One-to-Many Relations

### Basic Example

```typescript
// Schema
export const authors = pgTable('authors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

export const books = pgTable('books', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  authorId: integer('author_id').notNull().references(() => authors.id),
});

export const authorsRelations = relations(authors, ({ many }) => ({
  books: many(books),
}));

export const booksRelations = relations(books, ({ one }) => ({
  author: one(authors, {
    fields: [books.authorId],
    references: [authors.id],
  }),
}));

// Queries
import { db } from './db';

// Get author with all books
const authorWithBooks = await db.query.authors.findFirst({
  where: eq(authors.id, 1),
  with: {
    books: true,
  },
});
// Type: { id: number; name: string; books: Book[] }

// Get book with author
const bookWithAuthor = await db.query.books.findFirst({
  where: eq(books.id, 1),
  with: {
    author: true,
  },
});
// Type: { id: number; title: string; authorId: number; author: Author }
```

## Many-to-Many Relations

### Junction Table Pattern

```typescript
// Schema
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

// Junction table
export const studentsToCourses = pgTable('students_to_courses', {
  studentId: integer('student_id').notNull().references(() => students.id),
  courseId: integer('course_id').notNull().references(() => courses.id),
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.studentId, t.courseId] }),
}));

// Relations
export const studentsRelations = relations(students, ({ many }) => ({
  studentsToCourses: many(studentsToCourses),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  studentsToCourses: many(studentsToCourses),
}));

export const studentsToCoursesRelations = relations(studentsToCourses, ({ one }) => ({
  student: one(students, {
    fields: [studentsToCourses.studentId],
    references: [students.id],
  }),
  course: one(courses, {
    fields: [studentsToCourses.courseId],
    references: [courses.id],
  }),
}));

// Query - Get student with courses
const studentWithCourses = await db.query.students.findFirst({
  where: eq(students.id, 1),
  with: {
    studentsToCourses: {
      with: {
        course: true,
      },
    },
  },
});
```

## Self-Referencing Relations

```typescript
// Schema - Categories with parent-child relationship
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  parentId: integer('parent_id').references((): AnyPgColumn => categories.id),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'parentChild',
  }),
  children: many(categories, {
    relationName: 'parentChild',
  }),
}));

// Query - Get category with children
const categoryWithChildren = await db.query.categories.findFirst({
  where: eq(categories.id, 1),
  with: {
    children: true,
  },
});

// Get category with parent
const categoryWithParent = await db.query.categories.findFirst({
  where: eq(categories.id, 5),
  with: {
    parent: true,
  },
});
```

## Relational Query API

### Basic Queries

```typescript
import { db } from './db';
import { users, posts } from './schema';
import { eq } from 'drizzle-orm';

// Find first with relations
const user = await db.query.users.findFirst({
  where: eq(users.id, 1),
  with: {
    posts: true,
  },
});

// Find many with relations
const allUsers = await db.query.users.findMany({
  with: {
    posts: true,
  },
});

// Select specific fields
const users = await db.query.users.findMany({
  columns: {
    id: true,
    name: true,
    email: true,
  },
  with: {
    posts: {
      columns: {
        id: true,
        title: true,
      },
    },
  },
});
```

### Nested Relations

```typescript
// Deep nesting
const user = await db.query.users.findFirst({
  where: eq(users.id, 1),
  with: {
    posts: {
      with: {
        comments: {
          with: {
            user: true,
          },
        },
      },
    },
  },
});

// Result type
type Result = {
  id: number;
  name: string;
  email: string;
  posts: {
    id: number;
    title: string;
    content: string;
    comments: {
      id: number;
      content: string;
      user: {
        id: number;
        name: string;
        email: string;
      };
    }[];
  }[];
};
```

### Filtering Relations

```typescript
// Filter related data
const users = await db.query.users.findMany({
  with: {
    posts: {
      where: eq(posts.status, 'published'),
      orderBy: [desc(posts.createdAt)],
      limit: 5,
    },
  },
});

// Multiple filters
const user = await db.query.users.findFirst({
  where: eq(users.id, 1),
  with: {
    posts: {
      where: and(
        eq(posts.status, 'published'),
        gt(posts.viewCount, 100)
      ),
    },
    comments: {
      where: gte(comments.createdAt, new Date('2024-01-01')),
      limit: 10,
    },
  },
});
```

### Ordering and Limiting Relations

```typescript
// Order and limit
const users = await db.query.users.findMany({
  with: {
    posts: {
      orderBy: [desc(posts.createdAt)],
      limit: 3,
    },
  },
  orderBy: [asc(users.name)],
  limit: 10,
});

// Complex ordering
const posts = await db.query.posts.findMany({
  with: {
    comments: {
      orderBy: [desc(comments.createdAt)],
      limit: 5,
    },
    author: true,
  },
  orderBy: [desc(posts.viewCount), desc(posts.createdAt)],
});
```

## SQL-like Joins

### Inner Join

```typescript
import { eq } from 'drizzle-orm';

// Basic inner join
const result = await db
  .select()
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id));

// Select specific fields
const result = await db
  .select({
    postId: posts.id,
    postTitle: posts.title,
    authorName: users.name,
    authorEmail: users.email,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id));

// Multiple joins
const result = await db
  .select({
    postId: posts.id,
    postTitle: posts.title,
    authorName: users.name,
    commentCount: sql<number>`count(${comments.id})`,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .leftJoin(comments, eq(comments.postId, posts.id))
  .groupBy(posts.id, users.id);
```

### Left Join

```typescript
// Left join - includes posts without comments
const result = await db
  .select({
    postId: posts.id,
    postTitle: posts.title,
    commentContent: comments.content,
  })
  .from(posts)
  .leftJoin(comments, eq(comments.postId, posts.id));

// Left join with aggregation
const postsWithCommentCount = await db
  .select({
    id: posts.id,
    title: posts.title,
    commentCount: sql<number>`count(${comments.id})`,
  })
  .from(posts)
  .leftJoin(comments, eq(comments.postId, posts.id))
  .groupBy(posts.id);
```

### Right Join

```typescript
// Right join (PostgreSQL, MySQL)
const result = await db
  .select()
  .from(posts)
  .rightJoin(users, eq(posts.authorId, users.id));
```

### Full Outer Join

```typescript
// Full outer join (PostgreSQL)
const result = await db
  .select()
  .from(posts)
  .fullJoin(users, eq(posts.authorId, users.id));
```

### Complex Join Example

```typescript
// E-commerce query: Get orders with items and products
const ordersWithDetails = await db
  .select({
    orderId: orders.id,
    orderNumber: orders.orderNumber,
    orderTotal: orders.total,
    customerName: users.name,
    customerEmail: users.email,
    productName: products.name,
    itemQuantity: orderItems.quantity,
    itemPrice: orderItems.price,
  })
  .from(orders)
  .innerJoin(users, eq(orders.userId, users.id))
  .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
  .innerJoin(products, eq(orderItems.productId, products.id))
  .where(eq(orders.id, orderId));
```

## Real-World Examples

### Blog System with Complete Relations

```typescript
// Schema
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  featuredImage: text('featured_image'),
  status: varchar('status', { length: 20 }).default('draft').notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  authorId: integer('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  publishedAt: timestamp('published_at'),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id),
  parentId: integer('parent_id').references((): AnyPgColumn => comments.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
});

export const postsToTags = pgTable('posts_to_tags', {
  postId: integer('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.postId, t.tagId] }),
}));

export const likes = pgTable('likes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  postId: integer('post_id').references(() => posts.id, { onDelete: 'cascade' }),
  commentId: integer('comment_id').references(() => comments.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  likes: many(likes),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  postsToTags: many(postsToTags),
  likes: many(likes),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: 'commentReplies',
  }),
  replies: many(comments, {
    relationName: 'commentReplies',
  }),
  likes: many(likes),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postsToTags: many(postsToTags),
}));

export const postsToTagsRelations = relations(postsToTags, ({ one }) => ({
  post: one(posts, {
    fields: [postsToTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postsToTags.tagId],
    references: [tags.id],
  }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
  comment: one(comments, {
    fields: [likes.commentId],
    references: [comments.id],
  }),
}));
```

### Query Examples

```typescript
// Get full post with all relations
export async function getPostBySlug(slug: string) {
  return db.query.posts.findFirst({
    where: eq(posts.slug, slug),
    with: {
      author: {
        columns: {
          id: true,
          username: true,
          avatarUrl: true,
          bio: true,
        },
      },
      comments: {
        where: isNull(comments.parentId), // Top-level comments only
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          replies: {
            with: {
              user: {
                columns: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
            orderBy: [asc(comments.createdAt)],
          },
          likes: true,
        },
        orderBy: [desc(comments.createdAt)],
      },
      postsToTags: {
        with: {
          tag: true,
        },
      },
      likes: true,
    },
  });
}

// Get user profile with posts
export async function getUserProfile(username: string) {
  return db.query.users.findFirst({
    where: eq(users.username, username),
    with: {
      posts: {
        where: eq(posts.status, 'published'),
        columns: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
          viewCount: true,
          publishedAt: true,
        },
        orderBy: [desc(posts.publishedAt)],
        limit: 10,
      },
    },
  });
}

// Get posts by tag
export async function getPostsByTag(tagSlug: string) {
  return db.query.tags.findFirst({
    where: eq(tags.slug, tagSlug),
    with: {
      postsToTags: {
        with: {
          post: {
            where: eq(posts.status, 'published'),
            with: {
              author: {
                columns: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

// Complex join query: Popular posts with stats
export async function getPopularPosts(limit: number = 10) {
  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      featuredImage: posts.featuredImage,
      authorName: users.username,
      authorAvatar: users.avatarUrl,
      viewCount: posts.viewCount,
      commentCount: sql<number>`count(distinct ${comments.id})`,
      likeCount: sql<number>`count(distinct ${likes.id})`,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(comments, eq(comments.postId, posts.id))
    .leftJoin(likes, eq(likes.postId, posts.id))
    .where(eq(posts.status, 'published'))
    .groupBy(posts.id, users.id)
    .orderBy(desc(posts.viewCount))
    .limit(limit);
}
```

## Performance Considerations

### N+1 Query Problem

```typescript
// ❌ Bad - N+1 queries
const posts = await db.select().from(posts);
for (const post of posts) {
  const author = await db
    .select()
    .from(users)
    .where(eq(users.id, post.authorId));
  // This executes N queries!
}

// ✅ Good - Single query with join
const postsWithAuthors = await db
  .select()
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id));

// ✅ Good - Relational query
const postsWithAuthors = await db.query.posts.findMany({
  with: {
    author: true,
  },
});
```

### Limiting Nested Relations

```typescript
// Limit nested data to prevent huge payloads
const users = await db.query.users.findMany({
  with: {
    posts: {
      limit: 5, // Only get 5 most recent posts
      orderBy: [desc(posts.createdAt)],
      columns: {
        id: true,
        title: true,
        publishedAt: true,
      },
      with: {
        comments: {
          limit: 3, // Only 3 comments per post
        },
      },
    },
  },
  limit: 20, // Limit users
});
```

## Practice Exercises

1. **Design a social media schema** with users, posts, likes, follows, and comments
2. **Create a many-to-many relationship** for products and categories
3. **Implement nested comments** with self-referencing relations
4. **Build complex queries** joining 3+ tables with aggregations
5. **Optimize queries** to avoid N+1 problems
6. **Create reusable query functions** for common relation patterns

## Next Steps

Continue to [Migrations with Drizzle Kit](./05_migrations.md) to learn how to manage database schema changes.
