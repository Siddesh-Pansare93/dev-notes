# Schema Definition with Drizzle ORM

## Overview

Drizzle schemas are defined using TypeScript code, providing full type safety and IntelliSense support. Unlike Prisma's DSL or TypeORM's decorators, Drizzle uses simple function calls that mirror SQL DDL statements.

## Table Definition

### PostgreSQL Tables

```typescript
// src/db/schema.ts
import { pgTable, serial, text, varchar, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  role: varchar('role', { length: 20 }).default('user').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### MySQL Tables

```typescript
import { mysqlTable, serial, varchar, text, int, boolean, timestamp, json } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  role: varchar('role', { length: 20 }).default('user').notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### SQLite Tables

```typescript
import { sqliteTable, integer, text, blob } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  role: text('role').default('user').notNull(),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

## Column Types

### PostgreSQL Column Types

```typescript
import {
  pgTable,
  serial,
  integer,
  bigint,
  smallint,
  boolean,
  text,
  varchar,
  char,
  numeric,
  decimal,
  real,
  doublePrecision,
  json,
  jsonb,
  timestamp,
  date,
  time,
  interval,
  uuid,
  pgEnum,
  point,
  line,
  cidr,
  inet,
  macaddr,
} from 'drizzle-orm/pg-core';

export const allTypes = pgTable('all_types', {
  // Numeric types
  serialId: serial('serial_id').primaryKey(),
  intCol: integer('int_col'),
  bigintCol: bigint('bigint_col', { mode: 'number' }), // or 'bigint'
  smallintCol: smallint('smallint_col'),
  numericCol: numeric('numeric_col', { precision: 10, scale: 2 }),
  decimalCol: decimal('decimal_col', { precision: 10, scale: 2 }),
  realCol: real('real_col'),
  doublePrecisionCol: doublePrecision('double_precision_col'),
  
  // String types
  textCol: text('text_col'),
  varcharCol: varchar('varchar_col', { length: 255 }),
  charCol: char('char_col', { length: 10 }),
  
  // Boolean
  booleanCol: boolean('boolean_col'),
  
  // JSON types
  jsonCol: json('json_col'),
  jsonbCol: jsonb('jsonb_col'),
  
  // Date/Time types
  timestampCol: timestamp('timestamp_col', { withTimezone: true }),
  timestampNoTz: timestamp('timestamp_no_tz', { withTimezone: false }),
  dateCol: date('date_col', { mode: 'date' }), // or 'string'
  timeCol: time('time_col', { withTimezone: true }),
  intervalCol: interval('interval_col'),
  
  // UUID
  uuidCol: uuid('uuid_col').defaultRandom(),
  
  // Network types
  cidrCol: cidr('cidr_col'),
  inetCol: inet('inet_col'),
  macaddrCol: macaddr('macaddr_col'),
  
  // Geometric types
  pointCol: point('point_col'),
  lineCol: line('line_col'),
});
```

### MySQL Column Types

```typescript
import {
  mysqlTable,
  serial,
  int,
  bigint,
  tinyint,
  smallint,
  mediumint,
  float,
  double,
  decimal,
  boolean,
  text,
  varchar,
  char,
  tinytext,
  mediumtext,
  longtext,
  json,
  timestamp,
  datetime,
  date,
  time,
  year,
  binary,
  varbinary,
  mysqlEnum,
} from 'drizzle-orm/mysql-core';

export const allTypes = mysqlTable('all_types', {
  // Numeric types
  serialId: serial('serial_id').primaryKey(),
  intCol: int('int_col'),
  bigintCol: bigint('bigint_col', { mode: 'number' }),
  tinyintCol: tinyint('tinyint_col'),
  smallintCol: smallint('smallint_col'),
  mediumintCol: mediumint('mediumint_col'),
  floatCol: float('float_col'),
  doubleCol: double('double_col'),
  decimalCol: decimal('decimal_col', { precision: 10, scale: 2 }),
  
  // Boolean (stored as tinyint(1))
  booleanCol: boolean('boolean_col'),
  
  // String types
  textCol: text('text_col'),
  tinytextCol: tinytext('tinytext_col'),
  mediumtextCol: mediumtext('mediumtext_col'),
  longtextCol: longtext('longtext_col'),
  varcharCol: varchar('varchar_col', { length: 255 }),
  charCol: char('char_col', { length: 10 }),
  
  // JSON
  jsonCol: json('json_col'),
  
  // Date/Time types
  timestampCol: timestamp('timestamp_col').defaultNow(),
  datetimeCol: datetime('datetime_col'),
  dateCol: date('date_col', { mode: 'date' }),
  timeCol: time('time_col'),
  yearCol: year('year_col'),
  
  // Binary types
  binaryCol: binary('binary_col', { length: 16 }),
  varbinaryCol: varbinary('varbinary_col', { length: 255 }),
});
```

## Column Modifiers

```typescript
import { pgTable, serial, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  
  // NOT NULL
  username: varchar('username', { length: 50 }).notNull(),
  
  // UNIQUE constraint
  email: varchar('email', { length: 255 }).notNull().unique(),
  
  // DEFAULT values
  role: varchar('role', { length: 20 }).default('user'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  
  // Custom default using SQL
  randomId: varchar('random_id', { length: 32 })
    .default(sql`gen_random_uuid()`),
  
  // $default - TypeScript function (runs in app, not DB)
  clientId: varchar('client_id', { length: 32 })
    .$default(() => crypto.randomUUID()),
  
  // $defaultFn - For dynamic defaults
  slug: varchar('slug', { length: 255 })
    .$defaultFn(() => generateSlug()),
});
```

## Enums

### PostgreSQL Enums

```typescript
import { pgTable, serial, text, pgEnum } from 'drizzle-orm/pg-core';

// Define enum
export const roleEnum = pgEnum('role', ['user', 'admin', 'moderator']);
export const statusEnum = pgEnum('status', ['draft', 'published', 'archived']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: roleEnum('role').default('user').notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  status: statusEnum('status').default('draft').notNull(),
});
```

### MySQL Enums

```typescript
import { mysqlTable, serial, text, mysqlEnum } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: mysqlEnum('role', ['user', 'admin', 'moderator']).default('user').notNull(),
});
```

### SQLite Enums (using text with check)

```typescript
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role', { enum: ['user', 'admin', 'moderator'] })
    .default('user')
    .notNull(),
});
```

## Primary Keys

```typescript
import { pgTable, serial, integer, varchar, text, primaryKey } from 'drizzle-orm/pg-core';

// Auto-increment primary key
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

// UUID primary key
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: integer('user_id').notNull(),
});

// Composite primary key
export const userRoles = pgTable('user_roles', {
  userId: integer('user_id').notNull(),
  roleId: integer('role_id').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.roleId] }),
}));
```

## Foreign Keys

```typescript
import { pgTable, serial, integer, text, varchar, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id), // Basic foreign key
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// With cascade options
export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }), // DELETE CASCADE
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Self-referencing foreign key
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  parentId: integer('parent_id')
    .references((): AnyPgColumn => categories.id),
});
```

## Indexes

```typescript
import { pgTable, serial, varchar, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  content: text('content'),
  authorId: integer('author_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Simple index
  titleIdx: index('title_idx').on(table.title),
  
  // Unique index
  slugIdx: uniqueIndex('slug_idx').on(table.slug),
  
  // Composite index
  authorCreatedIdx: index('author_created_idx').on(table.authorId, table.createdAt),
  
  // Partial index (with WHERE clause)
  publishedIdx: index('published_idx')
    .on(table.createdAt)
    .where(sql`${table.status} = 'published'`),
}));
```

## Check Constraints

```typescript
import { pgTable, serial, integer, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  price: integer('price').notNull(),
  discount: integer('discount').default(0).notNull(),
  stock: integer('stock').default(0).notNull(),
}, (table) => ({
  // Price must be positive
  priceCheck: check('price_check', sql`${table.price} > 0`),
  
  // Discount must be between 0 and 100
  discountCheck: check('discount_check', 
    sql`${table.discount} >= 0 AND ${table.discount} <= 100`
  ),
  
  // Stock must be non-negative
  stockCheck: check('stock_check', sql`${table.stock} >= 0`),
}));
```

## Real-World E-commerce Schema Example

```typescript
// src/db/schema.ts
import { 
  pgTable, 
  serial, 
  varchar, 
  text, 
  integer, 
  numeric, 
  boolean, 
  timestamp, 
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['customer', 'admin', 'vendor']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'shipped', 'delivered', 'cancelled']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'failed', 'refunded']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: userRoleEnum('role').default('customer').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }),
  avatar: text('avatar'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('email_idx').on(table.email),
  roleIdx: index('role_idx').on(table.role),
}));

// Products table
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: numeric('compare_at_price', { precision: 10, scale: 2 }),
  cost: numeric('cost', { precision: 10, scale: 2 }),
  sku: varchar('sku', { length: 100 }).unique(),
  barcode: varchar('barcode', { length: 100 }),
  trackQuantity: boolean('track_quantity').default(true).notNull(),
  quantity: integer('quantity').default(0).notNull(),
  images: jsonb('images').$type<string[]>(),
  tags: jsonb('tags').$type<string[]>(),
  categoryId: integer('category_id').references(() => categories.id),
  vendorId: integer('vendor_id').references(() => users.id),
  isActive: boolean('is_active').default(true).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('product_slug_idx').on(table.slug),
  categoryIdx: index('product_category_idx').on(table.categoryId),
  skuIdx: index('product_sku_idx').on(table.sku),
  priceCheck: check('price_check', sql`${table.price} >= 0`),
  quantityCheck: check('quantity_check', sql`${table.quantity} >= 0`),
}));

// Categories table
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  parentId: integer('parent_id').references((): AnyPgColumn => categories.id),
  image: text('image'),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('category_slug_idx').on(table.slug),
  parentIdx: index('category_parent_idx').on(table.parentId),
}));

// Orders table
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  userId: integer('user_id').notNull().references(() => users.id),
  status: orderStatusEnum('status').default('pending').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').default('pending').notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax: numeric('tax', { precision: 10, scale: 2 }).default('0').notNull(),
  shipping: numeric('shipping', { precision: 10, scale: 2 }).default('0').notNull(),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  shippingAddress: jsonb('shipping_address').$type<{
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
  }>().notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orderNumberIdx: uniqueIndex('order_number_idx').on(table.orderNumber),
  userIdx: index('order_user_idx').on(table.userId),
  statusIdx: index('order_status_idx').on(table.status),
  createdAtIdx: index('order_created_at_idx').on(table.createdAt),
}));

// Order Items table
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull().references(() => products.id),
  name: varchar('name', { length: 255 }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
}, (table) => ({
  orderIdx: index('order_item_order_idx').on(table.orderId),
  productIdx: index('order_item_product_idx').on(table.productId),
}));
```

## Type Inference from Schema

```typescript
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { users, products, orders, orderItems } from './schema';

// Select types (what you get from queries)
export type User = InferSelectModel<typeof users>;
export type Product = InferSelectModel<typeof products>;
export type Order = InferSelectModel<typeof orders>;
export type OrderItem = InferSelectModel<typeof orderItems>;

// Insert types (what you need for inserts)
export type NewUser = InferInsertModel<typeof users>;
export type NewProduct = InferInsertModel<typeof products>;
export type NewOrder = InferInsertModel<typeof orders>;
export type NewOrderItem = InferInsertModel<typeof orderItems>;

// Partial types for updates
export type UserUpdate = Partial<NewUser>;
export type ProductUpdate = Partial<NewProduct>;
```

## Practice Exercises

1. **Create a blog schema** with users, posts, comments, tags, and post_tags tables
2. **Design a social media schema** including users, posts, likes, follows, and comments
3. **Build a project management schema** with projects, tasks, users, and assignments
4. **Implement proper indexes** for common query patterns
5. **Add check constraints** to ensure data integrity

## Next Steps

Continue to [CRUD Operations](./03_crud_operations.md) to learn how to query and manipulate data.
