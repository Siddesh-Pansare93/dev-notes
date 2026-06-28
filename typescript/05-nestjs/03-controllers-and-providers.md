# Controllers and Providers

## What You'll Learn

- Defining routes with HTTP method decorators (`@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`)
- Extracting request data with parameter decorators (`@Param`, `@Body`, `@Query`, `@Headers`)
- Building and validating DTOs with `class-validator` and `class-transformer`
- Standard vs library-specific response handling
- Service patterns for separating business logic from controllers
- Provider patterns: repository services, helper services, and factory providers
- Building a complete CRUD controller and service for a "products" resource

---

## Route Decorators

NestJS maps HTTP methods to controller methods using decorators:

```typescript
import {
  Controller, Get, Post, Put, Delete, Patch,
  Param, Body, Query, Headers, HttpCode, HttpStatus,
} from '@nestjs/common';

@Controller('products')  // Base route: /products
export class ProductsController {
  @Get()                    // GET /products
  findAll() {}

  @Get(':id')               // GET /products/:id
  findOne(@Param('id') id: string) {}

  @Post()                   // POST /products
  @HttpCode(HttpStatus.CREATED)  // 201
  create(@Body() dto: CreateProductDto) {}

  @Put(':id')               // PUT /products/:id
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {}

  @Patch(':id')             // PATCH /products/:id
  partialUpdate(@Param('id') id: string, @Body() dto: UpdateProductDto) {}

  @Delete(':id')            // DELETE /products/:id
  @HttpCode(HttpStatus.NO_CONTENT)  // 204
  remove(@Param('id') id: string) {}
}
```

> **Coming from JS:** Instead of `router.get('/products/:id', (req, res) => { ... })`, NestJS uses decorators on methods. The routing is declarative. You do not manually read from `req.params` or `req.body` -- parameter decorators extract and bind them for you.

### Route Wildcards and Versioning

```typescript
@Controller({ path: 'products', version: '1' })  // /v1/products
export class ProductsV1Controller {
  @Get('search/*')         // Matches /v1/products/search/anything/here
  searchWildcard() {}
}
```

---

## Parameter Decorators

```typescript
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // @Param -- route parameters
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // @Param without argument gives the entire params object
  @Get(':category/:id')
  findByCategory(@Param() params: { category: string; id: string }) {
    return this.productsService.findByCategory(params.category, params.id);
  }

  // @Query -- query string parameters
  // GET /products?page=2&limit=20&sort=price
  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('sort') sort?: string,
  ) {
    return this.productsService.findAll({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort,
    });
  }

  // @Body -- request body
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  // @Body with path -- extract a specific property
  @Post('bulk')
  createBulk(@Body('items') items: CreateProductDto[]) {
    return this.productsService.createMany(items);
  }

  // @Headers -- request headers
  @Get('export')
  export(
    @Headers('accept') accept: string,
    @Headers('authorization') auth: string,
  ) {
    // Return CSV or JSON based on Accept header
  }
}
```

---

## DTOs with class-validator and class-transformer

DTOs (Data Transfer Objects) define the shape and validation rules for incoming data.

```bash
npm install class-validator class-transformer
```

### Defining DTOs

```typescript
// dto/create-product.dto.ts
import {
  IsString, IsNumber, IsOptional, IsEnum, IsArray,
  MinLength, Min, Max, IsUrl, ValidateNested, ArrayMinSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export class ProductVariantDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(0)
  priceAdjustment: number;

  @IsString()
  sku: string;
}

export class CreateProductDto {
  @IsString()
  @MinLength(3, { message: 'Product name must be at least 3 characters' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Price must be positive' })
  @Max(999999.99)
  price: number;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus = ProductStatus.DRAFT;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @IsArray()
  @IsString({ each: true })  // Each element must be a string
  @IsOptional()
  tags?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)  // class-transformer needs this for nested objects
  @ArrayMinSize(1)
  @IsOptional()
  variants?: ProductVariantDto[];

  @Transform(({ value }) => value?.trim().toLowerCase())
  @IsString()
  slug: string;
}
```

### Update DTO with PartialType

```typescript
// dto/update-product.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

// All properties from CreateProductDto become optional
export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

> **Coming from JS:** You might be used to validating with Joi or writing manual `if (!req.body.name)` checks. `class-validator` decorators define rules directly on the DTO class. Combined with NestJS's `ValidationPipe`, invalid requests get rejected automatically with detailed error messages before your handler executes.

### Query DTO

```typescript
// dto/query-products.dto.ts
import { IsOptional, IsInt, Min, Max, IsEnum, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryProductsDto {
  @IsOptional()
  @Type(() => Number)  // Query params are strings; transform to number
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;
}
```

### Enabling Global Validation

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Strip properties not in the DTO
      forbidNonWhitelisted: true, // Throw if extra properties are sent
      transform: true,          // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,  // Convert types (string "5" -> number 5)
      },
    }),
  );

  await app.listen(3000);
}
bootstrap();
```

---

## Response Handling

### Standard Approach (Recommended)

Just return a value. NestJS serializes it to JSON automatically:

```typescript
@Get(':id')
async findOne(@Param('id') id: string): Promise<Product> {
  const product = await this.productsService.findOne(id);
  if (!product) {
    throw new NotFoundException(`Product #${id} not found`);
  }
  return product;  // Automatically serialized to JSON, status 200
}

@Post()
@HttpCode(HttpStatus.CREATED)  // Override default 201 for POST
async create(@Body() dto: CreateProductDto): Promise<Product> {
  return this.productsService.create(dto);  // Returns JSON, status 201
}
```

### Library-Specific Approach

Use `@Res()` to access the Express (or Fastify) response object directly:

```typescript
import { Response } from 'express';

@Get(':id/download')
async download(
  @Param('id') id: string,
  @Res() res: Response,
) {
  const file = await this.productsService.getExportFile(id);
  res.set({
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="product-${id}.csv"`,
  });
  res.send(file);
}
```

When using `@Res()`, you are responsible for sending the response. NestJS will not serialize a return value. If you want to mix both approaches, use `@Res({ passthrough: true })`:

```typescript
@Get(':id')
async findOne(
  @Param('id') id: string,
  @Res({ passthrough: true }) res: Response,
): Promise<Product> {
  res.header('X-Custom-Header', 'hello');
  return this.productsService.findOne(id);  // Still auto-serialized
}
```

---

## Service Patterns

### Business Logic Separation

Controllers handle HTTP concerns. Services handle business logic:

```typescript
// products.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
  ) {}

  async findAll(query: QueryProductsDto) {
    const { page, limit, search, order } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? [
          { name: Like(`%${search}%`) },
          { description: Like(`%${search}%`) },
        ]
      : {};

    const [items, total] = await this.productsRepo.findAndCount({
      where,
      order: { createdAt: order },
      skip,
      take: limit,
    });

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const existing = await this.productsRepo.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Product with slug "${dto.slug}" already exists`);
    }

    const product = this.productsRepo.create(dto);
    return this.productsRepo.save(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);  // Throws if not found
    Object.assign(product, dto);
    return this.productsRepo.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productsRepo.remove(product);
  }
}
```

### Repository Services

For more complex data access, create a dedicated repository layer:

```typescript
// products.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  createQueryBuilder(alias: string = 'product'): SelectQueryBuilder<Product> {
    return this.repo.createQueryBuilder(alias);
  }

  async findActiveWithVariants(categoryId: string): Promise<Product[]> {
    return this.createQueryBuilder('p')
      .leftJoinAndSelect('p.variants', 'v')
      .where('p.categoryId = :categoryId', { categoryId })
      .andWhere('p.status = :status', { status: 'active' })
      .orderBy('p.createdAt', 'DESC')
      .getMany();
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return this.repo.findOne({
      where: { slug },
      relations: ['category', 'variants'],
    });
  }
}
```

### Helper Services

Small, focused services for specific utilities:

```typescript
// slug.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class SlugService {
  generate(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async ensureUnique(
    slug: string,
    checkExists: (slug: string) => Promise<boolean>,
  ): Promise<string> {
    let candidate = slug;
    let counter = 1;
    while (await checkExists(candidate)) {
      candidate = `${slug}-${counter++}`;
    }
    return candidate;
  }
}
```

---

## Complete CRUD Example

### Entity

```typescript
// entities/product.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Index({ unique: true })
  @Column({ length: 255 })
  slug: string;

  @Column({ default: 'draft' })
  status: string;

  @Column('simple-array', { nullable: true })
  tags: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Controller

```typescript
// products.controller.ts
import {
  Controller, Get, Post, Put, Delete, Patch,
  Param, Body, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
```

### Module

```typescript
// products.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
```

---

## Mini-Exercise

1. Add a `GET /products/slug/:slug` endpoint that looks up a product by its URL slug instead of UUID. Create a `findBySlug` method on the service.

2. Create a `PaginatedResponseDto<T>` generic wrapper that the `findAll` method returns, including `items`, `total`, `page`, `limit`, and `totalPages`.

3. Add a `POST /products/:id/tags` endpoint that accepts `{ tags: string[] }` and appends them to the product's existing tags without duplicates.

4. Create a `ProductResponseDto` that excludes internal fields (like `updatedAt`) from the API response. Use `class-transformer`'s `@Exclude()` decorator combined with `ClassSerializerInterceptor`.

5. Write a DTO for bulk product creation (`POST /products/bulk`) that accepts an array of `CreateProductDto` with a maximum of 50 items. Validate both the array and each item inside it.
