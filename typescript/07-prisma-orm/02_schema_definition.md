# Schema Definition and Types

Master the Prisma Schema Language (PSL) to define your database models, relations, and constraints with complete type safety.

## What You'll Learn

- Prisma Schema Language syntax
- Data types and field attributes
- Model definition best practices
- Enums and composite types
- Database-specific features
- Schema validation and formatting

## Prisma Schema Structure

Every `schema.prisma` file has three main blocks:

```prisma
// 1. Data source configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 2. Generator configuration
generator client {
  provider = "prisma-client-js"
}

// 3. Data models
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  name  String?
}
```

## Data Types

### Scalar Types

| Prisma Type | PostgreSQL | MySQL | SQLite | TypeScript |
|-------------|------------|-------|--------|------------|
| `String` | text | varchar | text | string |
| `Int` | integer | int | integer | number |
| `BigInt` | bigint | bigint | N/A | bigint |
| `Float` | double precision | double | real | number |
| `Decimal` | decimal | decimal | N/A | Decimal |
| `Boolean` | boolean | boolean | N/A | boolean |
| `DateTime` | timestamp | datetime | datetime | Date |
| `Json` | jsonb | json | text | object |
| `Bytes` | bytea | longblob | blob | Buffer |

### Example with All Types

```prisma
model Product {
  id          Int      @id @default(autoincrement())
  sku         String   @unique
  name        String
  description String?  // Optional field
  price       Decimal  @db.Decimal(10, 2)
  quantity    Int      @default(0)
  weight      Float?
  inStock     Boolean  @default(true)
  metadata    Json?
  image       Bytes?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Generated TypeScript types**:

```typescript
type Product = {
  id: number
  sku: string
  name: string
  description: string | null
  price: Decimal
  quantity: number
  weight: number | null
  inStock: boolean
  metadata: JsonValue | null
  image: Buffer | null
  createdAt: Date
  updatedAt: Date
}
```

## Field Attributes

### @id - Primary Key

```prisma
model User {
  // Auto-incrementing integer ID
  id Int @id @default(autoincrement())
}

model Post {
  // UUID as ID
  id String @id @default(uuid())
}

model Session {
  // CUID (collision-resistant unique identifier)
  id String @id @default(cuid())
}
```

### Composite Primary Keys (@@id)

```prisma
model OrderItem {
  orderId   Int
  productId Int
  quantity  Int
  
  order   Order   @relation(fields: [orderId], references: [id])
  product Product @relation(fields: [productId], references: [id])
  
  @@id([orderId, productId])
}
```

### @unique - Unique Constraint

```prisma
model User {
  id       Int    @id @default(autoincrement())
  email    String @unique
  username String @unique
}
```

### Composite Unique Constraints (@@unique)

```prisma
model Post {
  id       Int    @id @default(autoincrement())
  title    String
  slug     String
  authorId Int
  
  @@unique([slug, authorId]) // Unique combination
}
```

### @default - Default Values

```prisma
model Article {
  id          Int      @id @default(autoincrement())
  title       String
  views       Int      @default(0)
  published   Boolean  @default(false)
  publishedAt DateTime @default(now())
  updatedAt   DateTime @updatedAt  // Auto-updates on change
}
```

**Default value functions**:
- `autoincrement()`: Auto-increment number
- `uuid()`: Random UUID v4
- `cuid()`: Collision-resistant ID
- `now()`: Current timestamp
- `dbgenerated()`: Database-level default

### @updatedAt - Auto-Update Timestamp

```prisma
model Post {
  id        Int      @id @default(autoincrement())
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt  // Automatically updated
}
```

### @map - Column Name Mapping

```prisma
model User {
  id        Int    @id @default(autoincrement())
  email     String @unique
  firstName String @map("first_name")  // Maps to 'first_name' in DB
  
  @@map("users")  // Maps to 'users' table
}
```

### @db - Database-Specific Types

```prisma
model Product {
  id          Int     @id @default(autoincrement())
  price       Decimal @db.Decimal(10, 2)      // PostgreSQL
  description String  @db.VarChar(500)        // MySQL
  metadata    Json    @db.JsonB               // PostgreSQL JSONB
}
```

**Common database-specific types**:

PostgreSQL:
```prisma
@db.VarChar(255)
@db.Text
@db.SmallInt
@db.Integer
@db.BigInt
@db.Decimal(10, 2)
@db.Real
@db.DoublePrecision
@db.Timestamp(6)
@db.Date
@db.Time
@db.Json
@db.JsonB
@db.Uuid
```

MySQL:
```prisma
@db.VarChar(255)
@db.Text
@db.TinyInt
@db.SmallInt
@db.MediumInt
@db.Int
@db.BigInt
@db.Decimal(10, 2)
@db.Float
@db.Double
@db.DateTime(6)
@db.Date
@db.Time
@db.Json
```

## Enums

### Basic Enum

```prisma
enum Role {
  USER
  ADMIN
  MODERATOR
}

model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  role  Role   @default(USER)
}
```

**Generated TypeScript**:

```typescript
enum Role {
  USER = "USER",
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR"
}

type User = {
  id: number
  email: string
  role: Role
}
```

### Using Enums in Queries

```typescript
import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

// Create admin user
const admin = await prisma.user.create({
  data: {
    email: 'admin@example.com',
    role: Role.ADMIN
  }
})

// Find all admins
const admins = await prisma.user.findMany({
  where: {
    role: Role.ADMIN
  }
})
```

### Multiple Enums Example

```prisma
enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}

enum PaymentStatus {
  UNPAID
  PAID
  REFUNDED
}

model Order {
  id            Int           @id @default(autoincrement())
  orderStatus   OrderStatus   @default(PENDING)
  paymentStatus PaymentStatus @default(UNPAID)
  total         Decimal       @db.Decimal(10, 2)
  createdAt     DateTime      @default(now())
}
```

## Index Configuration

### Single Column Index

```prisma
model Post {
  id        Int      @id @default(autoincrement())
  title     String
  slug      String   @unique
  createdAt DateTime @default(now())
  
  @@index([createdAt])  // Index on createdAt for faster queries
}
```

### Composite Index

```prisma
model Post {
  id        Int      @id @default(autoincrement())
  title     String
  authorId  Int
  published Boolean  @default(false)
  
  @@index([authorId, published])  // Composite index
}
```

### Named Index

```prisma
model Post {
  id       Int    @id @default(autoincrement())
  title    String
  authorId Int
  
  @@index([authorId], name: "author_posts_idx")
}
```

### Full-Text Search Index (PostgreSQL)

```prisma
model Post {
  id      Int    @id @default(autoincrement())
  title   String
  content String
  
  @@index([title, content], type: Fulltext)
}
```

## Relations

### One-to-Many Relation

```prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  posts Post[]  // Relation field (not in database)
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  author   User   @relation(fields: [authorId], references: [id])
  authorId Int    // Foreign key field
}
```

### One-to-One Relation

```prisma
model User {
  id      Int      @id @default(autoincrement())
  email   String   @unique
  profile Profile?  // Optional one-to-one
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String
  user   User   @relation(fields: [userId], references: [id])
  userId Int    @unique  // Must be unique for one-to-one
}
```

### Many-to-Many Relation (Implicit)

```prisma
model Post {
  id         Int        @id @default(autoincrement())
  title      String
  categories Category[]
}

model Category {
  id    Int    @id @default(autoincrement())
  name  String
  posts Post[]
}
```

Prisma automatically creates a join table `_CategoryToPost`.

### Many-to-Many Relation (Explicit)

```prisma
model Post {
  id               Int               @id @default(autoincrement())
  title            String
  postCategories   PostCategory[]
}

model Category {
  id               Int               @id @default(autoincrement())
  name             String
  postCategories   PostCategory[]
}

model PostCategory {
  post       Post     @relation(fields: [postId], references: [id])
  postId     Int
  category   Category @relation(fields: [categoryId], references: [id])
  categoryId Int
  assignedAt DateTime @default(now())
  
  @@id([postId, categoryId])
}
```

## Model Constraints

### Check Constraints (PostgreSQL)

```prisma
model Product {
  id       Int     @id @default(autoincrement())
  price    Decimal @db.Decimal(10, 2)
  discount Decimal @db.Decimal(5, 2) @default(0)
  
  @@check(price > 0, name: "price_positive")
  @@check(discount >= 0 AND discount <= 100, name: "discount_range")
}
```

## Real-World Schema Examples

### Blog Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  AUTHOR
  ADMIN
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  posts     Post[]
  comments  Comment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("users")
}

model Post {
  id          Int       @id @default(autoincrement())
  title       String
  slug        String    @unique
  content     String
  excerpt     String?
  published   Boolean   @default(false)
  publishedAt DateTime?
  views       Int       @default(0)
  author      User      @relation(fields: [authorId], references: [id])
  authorId    Int
  comments    Comment[]
  tags        Tag[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([authorId])
  @@index([published, publishedAt])
  @@map("posts")
}

model Comment {
  id        Int      @id @default(autoincrement())
  content   String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  post      Post     @relation(fields: [postId], references: [id])
  postId    Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([postId])
  @@map("comments")
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]
  
  @@map("tags")
}
```

### E-commerce Schema

```prisma
enum OrderStatus {
  PENDING
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

model Customer {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  firstName String
  lastName  String
  phone     String?
  orders    Order[]
  addresses Address[]
  createdAt DateTime @default(now())
  
  @@index([email])
}

model Product {
  id          Int         @id @default(autoincrement())
  sku         String      @unique
  name        String
  description String?
  price       Decimal     @db.Decimal(10, 2)
  stock       Int         @default(0)
  images      String[]
  categoryId  Int
  category    Category    @relation(fields: [categoryId], references: [id])
  orderItems  OrderItem[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  @@index([categoryId])
  @@index([sku])
}

model Category {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  slug        String    @unique
  description String?
  products    Product[]
}

model Order {
  id         Int         @id @default(autoincrement())
  orderNo    String      @unique @default(cuid())
  customer   Customer    @relation(fields: [customerId], references: [id])
  customerId Int
  status     OrderStatus @default(PENDING)
  total      Decimal     @db.Decimal(10, 2)
  items      OrderItem[]
  shippingId Int         @unique
  shipping   Address     @relation(fields: [shippingId], references: [id])
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  
  @@index([customerId])
  @@index([status, createdAt])
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  order     Order   @relation(fields: [orderId], references: [id])
  orderId   Int
  product   Product @relation(fields: [productId], references: [id])
  productId Int
  quantity  Int
  price     Decimal @db.Decimal(10, 2)
  
  @@unique([orderId, productId])
}

model Address {
  id         Int      @id @default(autoincrement())
  customer   Customer @relation(fields: [customerId], references: [id])
  customerId Int
  street     String
  city       String
  state      String
  zipCode    String
  country    String   @default("US")
  orders     Order[]
  
  @@index([customerId])
}
```

### SaaS Multi-Tenancy Schema

```prisma
model Organization {
  id          Int      @id @default(autoincrement())
  name        String
  slug        String   @unique
  plan        String   @default("free")
  members     Member[]
  projects    Project[]
  createdAt   DateTime @default(now())
  
  @@index([slug])
}

model User {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  name        String
  memberships Member[]
  createdAt   DateTime @default(now())
  
  @@index([email])
}

model Member {
  id             Int          @id @default(autoincrement())
  user           User         @relation(fields: [userId], references: [id])
  userId         Int
  organization   Organization @relation(fields: [organizationId], references: [id])
  organizationId Int
  role           String       @default("member")
  createdAt      DateTime     @default(now())
  
  @@unique([userId, organizationId])
  @@index([organizationId])
}

model Project {
  id             Int          @id @default(autoincrement())
  name           String
  organization   Organization @relation(fields: [organizationId], references: [id])
  organizationId Int
  createdAt      DateTime     @default(now())
  
  @@index([organizationId])
}
```

## Schema Validation and Formatting

### Validate Schema

```bash
npx prisma validate
```

Checks for:
- Syntax errors
- Invalid field types
- Broken relations
- Missing required fields

### Format Schema

```bash
npx prisma format
```

Automatically:
- Formats indentation
- Aligns field types
- Sorts attributes
- Organizes models

## Best Practices

1. **Use meaningful model names** (singular, PascalCase)
   ```prisma
   model User { }      // ✅ Good
   model users { }     // ❌ Bad
   ```

2. **Always include createdAt and updatedAt**
   ```prisma
   createdAt DateTime @default(now())
   updatedAt DateTime @updatedAt
   ```

3. **Use enums for fixed sets of values**
   ```prisma
   enum Status { ACTIVE, INACTIVE, PENDING }
   ```

4. **Index foreign keys and frequently queried fields**
   ```prisma
   @@index([userId])
   @@index([createdAt])
   ```

5. **Use @map for database naming conventions**
   ```prisma
   firstName String @map("first_name")
   @@map("users")
   ```

6. **Make optional fields explicit with ?**
   ```prisma
   bio String?  // Clearly optional
   ```

7. **Use appropriate database types**
   ```prisma
   price Decimal @db.Decimal(10, 2)  // For money
   ```

8. **Document complex models**
   ```prisma
   /// User account with authentication and profile data
   model User {
     // Fields...
   }
   ```

## Practice Exercises

1. **Exercise 1**: Create a schema for a task management app (Users, Projects, Tasks)
2. **Exercise 2**: Add enums for task priority and status
3. **Exercise 3**: Implement a many-to-many relation between Tasks and Tags
4. **Exercise 4**: Create a complete social media schema (Users, Posts, Likes, Follows)
5. **Exercise 5**: Design a marketplace schema with vendors, products, and reviews

## Summary

- Prisma Schema Language (PSL) is declarative and type-safe
- Supports all major relational databases
- Field attributes (@id, @unique, @default) define constraints
- Relations map database relationships to type-safe code
- Enums provide type safety for fixed value sets
- Indexes improve query performance
- Use @@map for custom database table/column names
- Always validate and format your schema

Continue to [Migrations Workflow](./03_migrations.md) →
