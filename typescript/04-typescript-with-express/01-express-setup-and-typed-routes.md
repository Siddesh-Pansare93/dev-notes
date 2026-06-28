# Express Setup and Typed Routes

## What You'll Learn

- Setting up a TypeScript + Express project from scratch
- Configuring `tsconfig.json` for backend development
- Using `ts-node-dev` for fast reloading during development
- Typing `Request` and `Response` objects with generics
- Building typed route parameters, request bodies, and query strings
- Organizing routes with the controller pattern and `Router`

---

## Project Setup from Scratch

### Initialize and Install Dependencies

```bash
mkdir my-api && cd my-api
npm init -y

# Runtime dependencies
npm install express

# Dev dependencies
npm install -D typescript ts-node-dev @types/express @types/node
```

### tsconfig.json for Express

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

> **Coming from JS:** You might be used to just writing `.js` files and running them directly with `node`. With TypeScript, the `outDir` and `rootDir` split keeps your source separate from compiled output. The `esModuleInterop` flag lets you use `import express from 'express'` instead of `import * as express from 'express'`.

### package.json Scripts

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

`ts-node-dev` watches your files, restarts on changes, and skips full type checking for speed. Run `tsc` separately (or in CI) for full type checks.

---

## Basic Server Entry Point

```typescript
// src/server.ts
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

---

## Typing Request and Response Objects

Express `Request` is a generic with four type parameters:

```typescript
Request<Params, ResBody, ReqBody, Query>
```

Each one defaults to `any`, so you can type only what you need.

### Route Parameters

```typescript
import { Request, Response } from 'express';

// Define the shape of URL params
interface PostParams {
  id: string;  // Route params are always strings
}

app.get('/posts/:id', (req: Request<PostParams>, res: Response) => {
  const { id } = req.params; // id is typed as string
  res.json({ postId: id });
});
```

### Request Body

```typescript
interface CreatePostBody {
  title: string;
  content: string;
  tags: string[];
}

// The third generic is ReqBody
app.post('/posts', (req: Request<{}, {}, CreatePostBody>, res: Response) => {
  const { title, content, tags } = req.body; // All typed
  res.status(201).json({ title, content, tags });
});
```

### Query Parameters

```typescript
interface PostQuery {
  page?: string;
  limit?: string;
  sortBy?: 'date' | 'title';
}

// The fourth generic is Query
app.get('/posts', (req: Request<{}, {}, {}, PostQuery>, res: Response) => {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '20', 10);
  const sortBy = req.query.sortBy || 'date';

  res.json({ page, limit, sortBy });
});
```

> **Coming from JS:** In plain Express, `req.params`, `req.body`, and `req.query` are all `any`. You probably relied on runtime checks or just hoped for the best. Now TypeScript tells you at compile time if you misspell `req.body.titl` or forget that query params are strings.

---

## Typed Response Bodies

You can also type what the response sends back:

```typescript
interface PostResponse {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface ErrorResponse {
  error: string;
  message: string;
}

app.get(
  '/posts/:id',
  (req: Request<PostParams>, res: Response<PostResponse | ErrorResponse>) => {
    const post = findPost(req.params.id);

    if (!post) {
      // TypeScript knows this must match ErrorResponse
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Post not found' });
    }

    // TypeScript knows this must match PostResponse
    res.json(post);
  }
);
```

---

## The Controller Pattern

Inline handlers get messy fast. Extract them into controller objects with typed methods.

### Shared Types

```typescript
// src/types/post.types.ts
export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  tags: string[];
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePostDTO {
  title: string;
  content: string;
  tags: string[];
}

export interface UpdatePostDTO {
  title?: string;
  content?: string;
  tags?: string[];
  published?: boolean;
}

export interface PostParams {
  id: string;
}

export interface PostQuery {
  page?: string;
  limit?: string;
  sortBy?: 'date' | 'title' | 'author';
  published?: 'true' | 'false';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### The Controller

```typescript
// src/controllers/post.controller.ts
import { Request, Response } from 'express';
import {
  Post,
  CreatePostDTO,
  UpdatePostDTO,
  PostParams,
  PostQuery,
  PaginatedResponse,
} from '../types/post.types';

// Simulated data store
const posts: Post[] = [];
let nextId = 1;

export const postController = {
  getAll(
    req: Request<{}, PaginatedResponse<Post>, {}, PostQuery>,
    res: Response<PaginatedResponse<Post>>
  ) {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const publishedFilter = req.query.published;

    let filtered = posts;
    if (publishedFilter !== undefined) {
      filtered = posts.filter(p => p.published === (publishedFilter === 'true'));
    }

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    res.json({
      data: paginated,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },

  getById(req: Request<PostParams>, res: Response) {
    const post = posts.find(p => p.id === req.params.id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ data: post });
  },

  create(req: Request<{}, {}, CreatePostDTO>, res: Response) {
    const { title, content, tags } = req.body;
    const now = new Date();

    const post: Post = {
      id: String(nextId++),
      title,
      content,
      authorId: 'user-1', // Would come from auth middleware in real app
      tags,
      published: false,
      createdAt: now,
      updatedAt: now,
    };

    posts.push(post);
    res.status(201).json({ data: post });
  },

  update(req: Request<PostParams, {}, UpdatePostDTO>, res: Response) {
    const index = posts.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    posts[index] = {
      ...posts[index],
      ...req.body,
      updatedAt: new Date(),
    };

    res.json({ data: posts[index] });
  },

  delete(req: Request<PostParams>, res: Response) {
    const index = posts.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const [deleted] = posts.splice(index, 1);
    res.json({ data: deleted });
  },
};
```

---

## Organizing Routes with Router

```typescript
// src/routes/post.routes.ts
import { Router } from 'express';
import { postController } from '../controllers/post.controller';

const router = Router();

router.get('/',     postController.getAll);
router.get('/:id',  postController.getById);
router.post('/',    postController.create);
router.put('/:id',  postController.update);
router.delete('/:id', postController.delete);

export default router;
```

```typescript
// src/routes/index.ts
import { Router } from 'express';
import postRoutes from './post.routes';

const router = Router();

router.use('/posts', postRoutes);

// Add more resource routes here:
// router.use('/users', userRoutes);
// router.use('/comments', commentRoutes);

export default router;
```

```typescript
// src/server.ts (updated)
import express from 'express';
import routes from './routes';

const app = express();

app.use(express.json());
app.use('/api/v1', routes);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

> **Coming from JS:** The router pattern is the same one you know from Express. The difference is that your controllers now have typed parameters, so a typo like `req.body.titel` is caught before you even run the server.

---

## Mini-Exercise

Build a typed CRUD controller for a `Comment` resource:

1. Define a `Comment` interface with `id`, `postId`, `authorId`, `text`, and `createdAt`.
2. Create `CreateCommentDTO` (requires `postId` and `text`) and `UpdateCommentDTO` (only `text`, optional).
3. Write `CommentParams` with both `postId` and `commentId` for nested routes like `/posts/:postId/comments/:commentId`.
4. Implement `commentController` with `getByPost`, `create`, `update`, and `delete` methods, all fully typed.
5. Wire it up with a `Router` mounted at `/posts/:postId/comments`.

Focus on getting the `Request` generics right -- the actual logic can use an in-memory array.
