# Testing in NestJS

## What You'll Learn

- Setting up the NestJS testing module with `Test.createTestingModule`
- Unit testing services by mocking their dependencies
- Unit testing controllers in isolation
- Mocking providers with `useValue` and `jest.fn()`
- Testing guards and interceptors
- Writing end-to-end (e2e) tests with supertest
- Best practices for test coverage and organization

---

## Testing Setup

NestJS projects scaffolded with the CLI come with Jest pre-configured. The key import for all NestJS tests is `@nestjs/testing`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
```

> **Coming from JS:** If you have written Jest tests for Express apps, you know the pain of manually wiring up dependencies for each test. NestJS gives you `Test.createTestingModule` which mirrors your module system — you declare providers, override the ones you want to mock, and compile. The DI container does the wiring for you.

---

## Unit Testing a Service

Here is a complete test file for a `PostsService` that depends on a TypeORM repository:

```typescript
// posts/posts.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { Post } from './post.entity';

// A helper type for mocking Repository methods
type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('PostsService', () => {
  let service: PostsService;
  let postRepo: MockRepository<Post>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: getRepositoryToken(Post),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    postRepo = module.get<MockRepository<Post>>(getRepositoryToken(Post));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a post when it exists', async () => {
      const mockPost = {
        id: 'abc-123',
        title: 'Test Post',
        content: 'Hello world',
        published: true,
      };

      postRepo.findOne.mockResolvedValue(mockPost);

      const result = await service.findOne('abc-123');

      expect(result).toEqual(mockPost);
      expect(postRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'abc-123' },
        relations: ['author', 'comments', 'comments.author', 'tags'],
      });
    });

    it('should throw NotFoundException when post does not exist', async () => {
      postRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and return a new post', async () => {
      const dto = { title: 'New Post', content: 'Content here' };
      const authorId = 'user-1';
      const createdPost = { id: 'post-1', ...dto, authorId };

      postRepo.create.mockReturnValue(createdPost);
      postRepo.save.mockResolvedValue(createdPost);

      const result = await service.create(authorId, dto as any);

      expect(postRepo.create).toHaveBeenCalledWith({ ...dto, authorId });
      expect(postRepo.save).toHaveBeenCalledWith(createdPost);
      expect(result).toEqual(createdPost);
    });
  });

  describe('remove', () => {
    it('should delete a post', async () => {
      postRepo.delete.mockResolvedValue({ affected: 1, raw: {} });

      await expect(service.remove('post-1')).resolves.toBeUndefined();
      expect(postRepo.delete).toHaveBeenCalledWith('post-1');
    });

    it('should throw NotFoundException if post does not exist', async () => {
      postRepo.delete.mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated posts', async () => {
      const mockPosts = [
        { id: '1', title: 'Post 1' },
        { id: '2', title: 'Post 2' },
      ];
      postRepo.findAndCount.mockResolvedValue([mockPosts, 2]);

      const result = await service.findAll(1, 20);

      expect(result).toEqual({ data: mockPosts, total: 2 });
      expect(postRepo.findAndCount).toHaveBeenCalledWith({
        relations: ['author', 'tags'],
        where: { published: true },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });
  });
});
```

---

## Unit Testing a Controller

Controllers should be tested in isolation — mock the service layer:

```typescript
// posts/posts.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

describe('PostsController', () => {
  let controller: PostsController;
  let postsService: jest.Mocked<Partial<PostsService>>;

  beforeEach(async () => {
    const mockPostsService: Partial<PostsService> = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        {
          provide: PostsService,
          useValue: mockPostsService,
        },
      ],
    }).compile();

    controller = module.get<PostsController>(PostsController);
    postsService = module.get(PostsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of posts', async () => {
      const mockResult = {
        data: [{ id: '1', title: 'Post 1' }],
        total: 1,
      };
      (postsService.findAll as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.findAll();

      expect(result).toEqual(mockResult);
      expect(postsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single post', async () => {
      const mockPost = { id: '1', title: 'Post 1', content: 'Content' };
      (postsService.findOne as jest.Mock).mockResolvedValue(mockPost);

      const result = await controller.findOne('1');

      expect(result).toEqual(mockPost);
      expect(postsService.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('create', () => {
    it('should create a post with the current user id', async () => {
      const dto = { title: 'New Post', content: 'Content' };
      const createdPost = { id: 'post-1', ...dto, authorId: 'user-1' };
      (postsService.create as jest.Mock).mockResolvedValue(createdPost);

      const result = await controller.create('user-1', dto as any);

      expect(result).toEqual(createdPost);
      expect(postsService.create).toHaveBeenCalledWith('user-1', dto);
    });
  });
});
```

---

## Testing a Guard

```typescript
// auth/guards/roles.guard.spec.ts
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { Role } from '../../users/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(userRole: Role): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: '1', role: userRole },
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext(Role.USER);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has a required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockContext(Role.ADMIN);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access when user lacks the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockContext(Role.USER);

    expect(guard.canActivate(context)).toBe(false);
  });
});
```

---

## Testing an Interceptor

```typescript
// common/interceptors/logging.interceptor.spec.ts
import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  it('should log the execution time', (done) => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/test' }),
      }),
    } as unknown as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => of({ data: 'test' }),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: () => {
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
        done();
      },
    });
  });
});
```

> **Coming from JS:** Testing Express middleware typically means calling the function directly with mock `req`, `res`, and `next` objects. NestJS guards and interceptors receive an `ExecutionContext`, which is more structured but also needs to be mocked. The pattern shown above is the standard approach.

---

## End-to-End (e2e) Testing

E2e tests spin up the full NestJS application and make real HTTP requests:

```typescript
// test/posts.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Posts (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same pipes/guards as your main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Register a test user and get a token
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

    authToken = registerRes.body.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    if (dataSource.isInitialized) {
      await dataSource.query('DELETE FROM comments');
      await dataSource.query('DELETE FROM posts');
      await dataSource.query('DELETE FROM users');
    }
    await app.close();
  });

  describe('POST /posts', () => {
    it('should create a post when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'E2E Test Post', content: 'Created in test' })
        .expect(HttpStatus.CREATED);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('E2E Test Post');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/posts')
        .send({ title: 'Unauthorized', content: 'Should fail' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 400 for invalid data', async () => {
      await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: '' }) // missing content, empty title
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /posts', () => {
    it('should return a list of posts', async () => {
      const res = await request(app.getHttpServer())
        .get('/posts')
        .expect(HttpStatus.OK);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /posts/:id', () => {
    it('should return a single post', async () => {
      // Create a post first
      const createRes = await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Find Me', content: 'Content' });

      const res = await request(app.getHttpServer())
        .get(`/posts/${createRes.body.id}`)
        .expect(HttpStatus.OK);

      expect(res.body.title).toBe('Find Me');
    });

    it('should return 404 for non-existent post', async () => {
      await request(app.getHttpServer())
        .get('/posts/00000000-0000-0000-0000-000000000000')
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
```

---

## Mocking External Services in e2e Tests

Sometimes you want a real app but with a mocked external dependency (like an email service):

```typescript
// test/with-mocks.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { EmailService } from '../src/email/email.service';

describe('Notifications (e2e)', () => {
  let app: INestApplication;

  const mockEmailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(mockEmailService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should send a welcome email on registration', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'securepass1',
        name: 'New User',
      })
      .expect(201);

    expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
      'newuser@example.com',
      'New User',
    );
  });
});
```

---

## Test Coverage Best Practices

Configure Jest coverage in `package.json`:

```json
{
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.ts",
      "!src/**/*.spec.ts",
      "!src/**/*.module.ts",
      "!src/main.ts"
    ],
    "coverageThresholds": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

Guidelines for meaningful tests:

- **Unit tests** for services: test business logic, error handling, edge cases.
- **Unit tests** for controllers: verify they call the right service methods with the right arguments.
- **Unit tests** for guards and interceptors: verify access decisions and transformations.
- **E2e tests**: test the full request/response cycle for critical user flows.
- Avoid testing framework internals (do not test that NestJS DI works).
- Mock at the boundary: database repositories, external APIs, file system.
- Each test should be independent — use `beforeEach` to reset mocks.

```bash
# Run unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e

# Run with coverage
npm run test:cov
```

---

## Mini-Exercise

Write tests for a `UsersService` and `UsersController`:

1. Create a `users.service.spec.ts` that tests `findById`, `findByEmail`, `create`, and `updateRole`. Mock the TypeORM repository. Include tests for both the success path and the "not found" path.
2. Create a `users.controller.spec.ts` that tests `getProfile` (returns the current user), `getAllUsers` (admin-only), and `deleteUser`. Mock the `UsersService`.
3. Write an e2e test that registers two users, logs in as one, and verifies they cannot access admin-only routes. Then manually set one user to admin and verify they can.
4. Add a test for the `RolesGuard` that checks all three scenarios: no roles required, correct role, incorrect role.

**Bonus:** Create a helper function `createTestApp()` that builds and configures the NestApplication with all your global pipes, guards, and interceptors so that every e2e test file can reuse it.
