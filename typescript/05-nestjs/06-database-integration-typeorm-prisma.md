# Database Integration: TypeORM & Prisma

## What You'll Learn

- Setting up TypeORM with NestJS using `@nestjs/typeorm`
- Defining entities with decorators and establishing relations
- Using the repository pattern and custom repositories
- Managing transactions with QueryRunner
- Generating and running migrations
- Setting up Prisma as an alternative ORM
- Comparing TypeORM and Prisma approaches side by side

---

## TypeORM Setup with NestJS

Install the required packages:

```bash
npm install @nestjs/typeorm typeorm pg
```

Configure TypeORM in your root module:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'password',
      database: process.env.DB_NAME || 'myapp',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // NEVER true in production
      logging: process.env.NODE_ENV === 'development',
    }),
  ],
})
export class AppModule {}
```

> **Coming from JS:** In plain Node.js you might use raw `pg` queries or a lightweight query builder like Knex. TypeORM gives you a full object-relational mapping layer with TypeScript decorators that define your schema directly on classes — no separate schema files needed.

For async configuration (using ConfigService):

```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get<string>('DB_HOST'),
    port: config.get<number>('DB_PORT'),
    username: config.get<string>('DB_USER'),
    password: config.get<string>('DB_PASS'),
    database: config.get<string>('DB_NAME'),
    autoLoadEntities: true, // auto-register entities from modules
    synchronize: false,
  }),
}),
```

---

## Defining Entities with Decorators

Entities are classes decorated with `@Entity()` that map to database tables:

```typescript
// user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Post } from '../posts/post.entity';
import { Comment } from '../comments/comment.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email: string;

  @Column({ select: false }) // excluded from queries by default
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @OneToMany(() => Comment, (comment) => comment.author)
  comments: Comment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

```typescript
// post.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Comment } from '../comments/comment.entity';
import { Tag } from '../tags/tag.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  content: string;

  @Column({ default: false })
  published: boolean;

  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  authorId: string;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @ManyToMany(() => Tag, (tag) => tag.posts)
  @JoinTable({
    name: 'post_tags',
    joinColumn: { name: 'post_id' },
    inverseJoinColumn: { name: 'tag_id' },
  })
  tags: Tag[];

  @CreateDateColumn()
  createdAt: Date;
}
```

```typescript
// comment.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Post } from '../posts/post.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  body: string;

  @ManyToOne(() => User, (user) => user.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  authorId: string;

  @ManyToOne(() => Post, (post) => post.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @Column({ name: 'post_id' })
  postId: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

```typescript
// tag.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Post } from '../posts/post.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  name: string;

  @ManyToMany(() => Post, (post) => post.tags)
  posts: Post[];
}
```

---

## Repository Pattern with TypeORM

Register entities in feature modules then inject repositories:

```typescript
// posts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Post])],
  providers: [PostsService],
  controllers: [PostsController],
  exports: [PostsService],
})
export class PostsModule {}
```

```typescript
// posts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './post.entity';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
  ) {}

  async create(authorId: string, dto: CreatePostDto): Promise<Post> {
    const post = this.postRepo.create({
      ...dto,
      authorId,
    });
    return this.postRepo.save(post);
  }

  async findAll(page = 1, limit = 20): Promise<{ data: Post[]; total: number }> {
    const [data, total] = await this.postRepo.findAndCount({
      relations: ['author', 'tags'],
      where: { published: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postRepo.findOne({
      where: { id },
      relations: ['author', 'comments', 'comments.author', 'tags'],
    });
    if (!post) {
      throw new NotFoundException(`Post with ID "${id}" not found`);
    }
    return post;
  }

  async findByAuthor(authorId: string): Promise<Post[]> {
    return this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.tags', 'tag')
      .where('post.author_id = :authorId', { authorId })
      .orderBy('post.createdAt', 'DESC')
      .getMany();
  }

  async update(id: string, dto: Partial<CreatePostDto>): Promise<Post> {
    await this.postRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.postRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Post with ID "${id}" not found`);
    }
  }
}
```

---

## Transactions with QueryRunner

For operations that must succeed or fail together:

```typescript
// posts.service.ts (additional method)
import { DataSource } from 'typeorm';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    private readonly dataSource: DataSource,
  ) {}

  async createPostWithTags(
    authorId: string,
    dto: CreatePostDto,
    tagNames: string[],
  ): Promise<Post> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create the post
      const post = queryRunner.manager.create(Post, {
        ...dto,
        authorId,
      });
      const savedPost = await queryRunner.manager.save(post);

      // Find or create tags
      const tags: Tag[] = [];
      for (const name of tagNames) {
        let tag = await queryRunner.manager.findOne(Tag, {
          where: { name },
        });
        if (!tag) {
          tag = queryRunner.manager.create(Tag, { name });
          tag = await queryRunner.manager.save(tag);
        }
        tags.push(tag);
      }

      // Associate tags with the post
      savedPost.tags = tags;
      await queryRunner.manager.save(savedPost);

      await queryRunner.commitTransaction();
      return savedPost;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

> **Coming from JS:** If you have used `pg` transactions with `BEGIN`, `COMMIT`, and `ROLLBACK` SQL statements, the QueryRunner pattern is the ORM equivalent. The try/catch/finally block ensures rollback on failure and connection release regardless of outcome.

---

## Migrations

Configure your `data-source.ts` for the TypeORM CLI:

```typescript
// data-source.ts (project root)
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'myapp',
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
});
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "typeorm": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js",
    "migration:generate": "npm run typeorm -- migration:generate -d data-source.ts",
    "migration:run": "npm run typeorm -- migration:run -d data-source.ts",
    "migration:revert": "npm run typeorm -- migration:revert -d data-source.ts"
  }
}
```

```bash
# Generate a migration based on entity changes
npm run migration:generate -- src/migrations/AddUserRoleColumn

# Run pending migrations
npm run migration:run
```

A generated migration looks like:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRoleColumn1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "role" VARCHAR NOT NULL DEFAULT 'user'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }
}
```

---

## Prisma Setup with NestJS

Install Prisma:

```bash
npm install prisma --save-dev
npm install @prisma/client
npx prisma init
```

Define your schema in `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  USER
  ADMIN
  MODERATOR
}

model User {
  id        String    @id @default(uuid())
  name      String    @db.VarChar(100)
  email     String    @unique @db.VarChar(255)
  password  String
  role      UserRole  @default(USER)
  isActive  Boolean   @default(true) @map("is_active")
  posts     Post[]
  comments  Comment[]
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@map("users")
}

model Post {
  id        String    @id @default(uuid())
  title     String    @db.VarChar(255)
  content   String
  published Boolean   @default(false)
  author    User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String    @map("author_id")
  comments  Comment[]
  tags      Tag[]
  createdAt DateTime  @default(now()) @map("created_at")

  @@map("posts")
}

model Comment {
  id        String   @id @default(uuid())
  body      String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String   @map("author_id")
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId    String   @map("post_id")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("comments")
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique @db.VarChar(50)
  posts Post[]

  @@map("tags")
}
```

Create the PrismaService:

```typescript
// prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

```typescript
// prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

Use it in a service:

```typescript
// posts.service.ts (Prisma version)
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, dto: CreatePostDto) {
    return this.prisma.post.create({
      data: {
        title: dto.title,
        content: dto.content,
        author: { connect: { id: authorId } },
        tags: {
          connectOrCreate: dto.tags.map((name) => ({
            where: { name },
            create: { name },
          })),
        },
      },
      include: { author: true, tags: true },
    });
  }

  async findAll(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { published: true },
        include: { author: true, tags: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.post.count({ where: { published: true } }),
    ]);
    return { data, total };
  }

  async findOne(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        tags: true,
        comments: { include: { author: true } },
      },
    });
    if (!post) {
      throw new NotFoundException(`Post "${id}" not found`);
    }
    return post;
  }

  // Prisma transaction example
  async transferPostOwnership(postId: string, newAuthorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({ where: { id: postId } });
      if (!post) throw new NotFoundException('Post not found');

      return tx.post.update({
        where: { id: postId },
        data: { authorId: newAuthorId },
      });
    });
  }
}
```

---

## TypeORM vs Prisma Comparison

| Aspect | TypeORM | Prisma |
|---|---|---|
| Schema definition | Decorators on classes | Separate `.prisma` schema file |
| Type safety | Good, but some runtime gaps | Excellent — generated from schema |
| Migrations | `migration:generate` auto-diff | `prisma migrate dev` auto-diff |
| Query building | QueryBuilder or find options | Fluent, auto-completed API |
| Relations | Loaded via `relations` option | Loaded via `include` option |
| Raw queries | `queryRunner.query()` | `prisma.$queryRaw` |
| Learning curve | Familiar if you know ORMs | Unique syntax, quick to learn |

> **Coming from JS:** If you have used Sequelize or Mongoose, TypeORM will feel familiar — models are classes with decorators. Prisma is a different paradigm: you define the schema in its own DSL, then Prisma generates a fully typed client. The generated types mean you almost never have to write an interface for your database models.

---

## Mini-Exercise

Build a `BookStore` module with the following:

1. Create three entities/models: `Book` (id, title, isbn, price), `Author` (id, name, bio), and `Genre` (id, name). A book has one author (ManyToOne) and many genres (ManyToMany).
2. Implement a `BooksService` with CRUD operations using either TypeORM or Prisma.
3. Add a `createBookWithGenres` method that uses a transaction to create a book and connect/create its genres atomically.
4. Write a `findByGenre(genreName: string)` method that returns all books in a given genre with their authors included.

**Bonus:** Implement the same service in both TypeORM and Prisma to compare the developer experience firsthand.
