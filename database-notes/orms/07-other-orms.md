# 🗄️ Chapter 7: Other ORMs — Drizzle, TypeORM, Sequelize, aur Knex

> Tumne Prisma seekh liya hai. Data model kar sakte ho, migrations run kar sakte ho, type-safe queries likh sakte ho. Ab har developer ke mann mein ek din yeh sawaal aata hi hai: *"Kya alternatives hain, aur inhe kab use karna chahiye?"*
>
> Yeh chapter iska honest aur practical jawab deta hai.

---

## 🧭 Alternatives Kyun Seekhein?

Prisma zabardast hai, lekin har jagah sahi tool nahi hai. Alag-alag projects ki alag-alag constraints hoti hain:

- Ek **Cloudflare Worker** Prisma ka query engine binary run nahi kar sakta.
- Ek **NestJS** codebase jo Java developers ne banaya ho, woh shaayad pehle se hi TypeORM use kar raha ho.
- Ek **legacy Node.js** project jo 2016 ka ho, woh almost certainly Sequelize pe hi hoga.
- Ek data-heavy app jisko **hand-crafted SQL** chahiye, usko Knex se fayda hoga.

Poore landscape ko samajhna tumhe better engineer banata hai — isliye nahi ki tumhe sab kuch rewrite karna hai, balki isliye ki tum *informed* architectural decisions le sako.

---

## 🎯 Benchmark Query

Is chapter mein har ORM ek hi query implement karega, taaki tum sabko side by side compare kar sako:

```
Get users where isActive = true,
include their post count,
order by createdAt descending,
page 2 (10 items per page).
```

Yeh ek realistic query hai — filtering, aggregation, ordering, pagination sab kuch hai. Isse pata chalta hai ki ek ORM asal mein sochta kaise hai.

---

## 🌊 1. Drizzle ORM

### Yeh Hai Kya?

Drizzle ek **TypeScript-first, SQL-centric ORM** hai jo modern JavaScript runtime era ke liye bana hai. Yeh 2022 mein aaya aur bahut tezi se grow hua kyunki yeh ek specific pain point solve karta hai: tumhe full type safety milti hai bina SQL ko chhupaye.

Iski philosophy seedhi si hai: **"Agar tumhe SQL aata hai, toh Drizzle bhi aata hai."** Query API ek thin, typed wrapper hai SQL syntax ke upar — yeh koi naya abstraction nahi hai, SQL ke upar direct layer hai.

### Schema Definition

Prisma ki tarah alag `.prisma` file nahi hoti. Schema seedha TypeScript mein rehta hai.

Socho jaise Zomato ka menu tum seedha code mein likh rahe ho, koi alag config file nahi:

```typescript
// schema.ts
import { pgTable, serial, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  userId: integer('user_id').references(() => users.id),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));
```

Sab kuch plain TypeScript hai. Columns, types, constraints, foreign keys — sab woh code hai jo tumne pehle bhi dekha hai.

### Benchmark Query, Drizzle Mein

```typescript
import { db } from './db';
import { users, posts } from './schema';
import { eq, desc, count } from 'drizzle-orm';

const PAGE = 2;
const PAGE_SIZE = 10;

const result = await db
  .select({
    id: users.id,
    name: users.name,
    email: users.email,
    postCount: count(posts.id),
  })
  .from(users)
  .leftJoin(posts, eq(posts.userId, users.id))
  .where(eq(users.isActive, true))
  .groupBy(users.id)
  .orderBy(desc(users.createdAt))
  .limit(PAGE_SIZE)
  .offset((PAGE - 1) * PAGE_SIZE);

// result fully typed hai: { id: number, name: string, email: string, postCount: number }[]
```

Dekho, yeh almost SQL jaisa hi lagta hai. `select`, `from`, `leftJoin`, `where`, `groupBy`, `orderBy`, `limit`, `offset` — yeh sab SQL clauses hain, bas typed hain.

### Fayde (Pros)

- **Zero runtime overhead** — koi query engine process nahi, koi binary nahi
- **Zabardast TypeScript inference** — return types select shape se hi infer ho jaate hain
- **Edge-compatible** — Cloudflare Workers, Deno, Bun, aur jahan bhi `fetch` support ho, wahan chalta hai
- **SQL-transparent** — tumhe hamesha pata hota hai ki kaunsi query chalegi
- **Lightweight bundle** — serverless cold start times ke liye critical hai

### Nuksan (Cons)

- **Chhota ecosystem** — Prisma ya Sequelize ke mukable third-party plugins kam hain
- **Simple queries ke liye verbose** — Prisma ka `findMany` with `include` standard CRUD ke liye zyada concise hai
- **Relations manually handle karne padte hain** — Drizzle automatically nested relations load nahi karta bina explicit joins ke
- **Migrations alag hain** — `drizzle-kit` ek alag workflow step hai

### Drizzle Kab Use Karein

- **Cloudflare Workers**, **Vercel Edge**, ya **Deno Deploy** pe build kar rahe ho
- Tumhe **full SQL control** chahiye type safety ke saath
- Performance critical hai aur tumhe **lightweight runtime** chahiye
- Team SQL se comfortable hai aur ORM ka "magic" pasand nahi
- Tum **Bun** ya kisi doosre modern JS runtime pe ho

---

## 🏛️ 2. TypeORM

### Yeh Hai Kya?

TypeORM ek **class-based, decorator-driven ORM** hai jo Java ke Hibernate aur Spring Data se inspired hai. Yeh shuru se hi TypeScript ke liye bana (Sequelize ke ulat), aur NestJS ecosystem ke saath deeply integrate hota hai.

Yeh do patterns support karta hai:
- **Active Record** — models khud ko save karna jaante hain (`user.save()`)
- **Data Mapper** — repositories persistence handle karte hain, models plain data hote hain

### Entity Definition

```typescript
// user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Post } from './post.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];
}
```

```typescript
// post.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @ManyToOne(() => User, (user) => user.posts)
  user: User;
}
```

Decorators schema define karte hain. Agar tumne Spring Boot ya NestJS ke saath kaam kiya hai, toh yeh familiar lagega.

### Benchmark Query, TypeORM Mein

```typescript
import { AppDataSource } from './data-source';
import { User } from './user.entity';

const PAGE = 2;
const PAGE_SIZE = 10;

const userRepository = AppDataSource.getRepository(User);

const result = await userRepository
  .createQueryBuilder('user')
  .leftJoin('user.posts', 'post')
  .select([
    'user.id',
    'user.name',
    'user.email',
  ])
  .addSelect('COUNT(post.id)', 'postCount')
  .where('user.isActive = :isActive', { isActive: true })
  .groupBy('user.id')
  .orderBy('user.createdAt', 'DESC')
  .limit(PAGE_SIZE)
  .offset((PAGE - 1) * PAGE_SIZE)
  .getRawAndEntities();

// Ya raw query use karke count + entities:
const [entities, count] = await userRepository.findAndCount({
  where: { isActive: true },
  relations: { posts: true },
  order: { createdAt: 'DESC' },
  take: PAGE_SIZE,
  skip: (PAGE - 1) * PAGE_SIZE,
});
```

TypeORM tumhe do styles deta hai: complex queries ke liye `QueryBuilder` (raw SQL jaisa syntax), aur standard operations ke liye simpler `find` API.

### Fayde (Pros)

- **First-class NestJS integration** — NestJS modules TypeORM ko out of the box wrap karte hain
- **Decorator-driven** — Java/Spring developers ke liye familiar
- **Active Record aur Data Mapper dono support** — flexible architecture
- **Mature ecosystem** — widely used, Stack Overflow pe answers ki kami nahi
- **Bahut saare databases support** — PostgreSQL, MySQL, SQLite, MongoDB (partial), Oracle

### Nuksan (Cons)

- **Decorator performance** — metadata reflection startup pe overhead add karta hai
- **Complex relations tricky ho jaate hain** — eager loading se achanak N+1 queries fir sakti hain
- **QueryBuilder verbose hai** — complex queries lambi chains ban jaati hain
- **Development velocity slow** — simple tasks ke liye Prisma se zyada boilerplate
- **TypeScript types hamesha infer nahi hote** — `getRawMany()` `any[]` return karta hai

### TypeORM Kab Use Karein

- **NestJS application** bana rahe ho (NestJS ka default ORM choice hai)
- Team **Java ya Spring background** se aati hai
- Tumhe **class-based models** decorators ke saath pasand hain
- Choti services ke liye simplicity ke liye **Active Record pattern** chahiye
- Project already TypeORM use kar raha hai aur migration cost zyada hai

---

## 🐘 3. Sequelize

### Yeh Hai Kya?

Sequelize sabse **purana aur established Node.js ORM** hai, pehli baar 2010 mein release hua. Yeh TypeScript popular hone se pehle ka hai. Agar tumhe 2018 se pehle ka koi Node.js ORM tutorial mile, toh woh almost certainly Sequelize use kar raha hoga.

Yeh ek full-featured ORM hai: model definition, associations, migrations, hooks, validators — sab kuch built-in hai.

### Model Definition

```typescript
// models/user.ts
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../database';

interface UserAttributes {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

export class User extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes {
  declare id: number;
  declare name: string;
  declare email: string;
  declare isActive: boolean;
  declare createdAt: Date;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { sequelize, modelName: 'User', tableName: 'users', timestamps: true }
);
```

Associations alag se define hote hain:

```typescript
// associations.ts
User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'user' });
```

### Benchmark Query, Sequelize Mein

```typescript
import { User } from './models/user';
import { Post } from './models/post';
import { fn, col, literal } from 'sequelize';

const PAGE = 2;
const PAGE_SIZE = 10;

const result = await User.findAll({
  attributes: [
    'id',
    'name',
    'email',
    [fn('COUNT', col('posts.id')), 'postCount'],
  ],
  include: [
    {
      model: Post,
      as: 'posts',
      attributes: [],    // output mein post columns include mat karo
      required: false,   // LEFT JOIN
    },
  ],
  where: { isActive: true },
  group: ['User.id'],
  order: [['createdAt', 'DESC']],
  limit: PAGE_SIZE,
  offset: (PAGE - 1) * PAGE_SIZE,
  subQuery: false,       // GROUP BY ke saath sahi LIMIT ke liye zaruri
});

// result User[] hai, lekin postCount access karna ho toh .get('postCount') use karo
```

`subQuery: false` pe dhyaan do — yeh ek Sequelize ka quirk hai jo tab zaruri hota hai jab `GROUP BY` ko `LIMIT` ke saath combine karo. Yeh cheez tum hard way mein hi seekhte ho.

### Fayde (Pros)

- **Bahut bada ecosystem** — saalon ka community packages, guides, aur battle-tested patterns
- **Saari associations built-in hain** — `hasMany`, `belongsTo`, `belongsToMany`, `hasOne`
- **Rich hooks system** — `beforeCreate`, `afterUpdate`, `beforeDestroy`, waghera
- **Existing projects ke liye best** — agar codebase already isko use kar raha hai, toh usi pe rehna usually sahi hai
- **Flexible migration system** — `sequelize-cli` stable hai aur widely samjha jaata hai

### Nuksan (Cons)

- **TypeScript support "bolted-on" feel hoti hai** — types ke liye bahut boilerplate chahiye (`declare`, `Optional`, interface duplication)
- **Complex queries awkward hain** — `fn`, `col`, `literal`, aur `where` padhna mushkil ho jaata hai
- **Documentation dense hai** — bahut saare options, clear nahi kaunsa use karein
- **N+1 ka risk** — eager loading careful `include` configuration ke bina inefficient ho sakti hai
- **Alternatives se slower** — tumhare code aur database ke beech zyada abstraction layers

### Sequelize Kab Use Karein

- **Existing Node.js project maintain** kar rahe ho jo Sequelize use karta hai
- Tumhe **sabse bada ecosystem** chahiye plugins aur guides ka
- Team JavaScript mein zyada comfortable hai, TypeScript mein kam
- Audit trails aur side effects ke liye **rich hook pipelines** chahiye
- Legacy app migrate kar rahe ho aur data access layer rewrite karne ka budget nahi hai

---

## 🔧 4. Knex.js — The Query Builder

### Yeh Hai Kya?

Knex **ORM nahi hai**. Yeh ek **SQL query builder** hai — ek library jo JavaScript/TypeScript API se SQL strings banata hai aur unhe tumhare database ko bhejta hai. Koi models nahi, koi entities nahi, koi schema definitions nahi. Bas queries.

Isko socho raw `pg.query('SELECT ...')` aur full ORM ke beech ki layer ki tarah. Bahut saare ORMs (jaise Objection.js ke purane versions) andar se Knex hi use karte hain.

### Setup

```typescript
// db.ts
import knex from 'knex';

export const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});
```

Koi schema definition ki zarurat nahi — Knex ko tumhare models ke baare mein kuch nahi pata.

### Benchmark Query, Knex Mein

```typescript
import { db } from './db';

const PAGE = 2;
const PAGE_SIZE = 10;

const result = await db('users')
  .select(
    'users.id',
    'users.name',
    'users.email',
    db.raw('COUNT(posts.id) as "postCount"')
  )
  .leftJoin('posts', 'posts.user_id', 'users.id')
  .where('users.is_active', true)
  .groupBy('users.id')
  .orderBy('users.created_at', 'desc')
  .limit(PAGE_SIZE)
  .offset((PAGE - 1) * PAGE_SIZE);

// result: { id: number, name: string, email: string, postCount: string }[]
// Note: postCount string hai — PostgreSQL COUNT bigint ko string ki tarah return karta hai
```

Yeh clean aur readable hai. Tumhe hamesha exactly pata hota hai ki kaunsa SQL chalega. Tradeoff yeh hai: relations mein koi help nahi milegi, koi model layer nahi hai, aur types manually define karne padte hain.

### Knex Mein Migrations

Knex ka apna migration system bhi hai:

```typescript
// migrations/20240101_create_users.ts
exports.up = (knex) =>
  knex.schema.createTable('users', (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTable('users');
```

### Fayde (Pros)

- **Tumhara pura control** — koi magic nahi, koi hidden query nahi
- **Complex SQL ke liye zabardast** — subqueries, CTEs, window functions, raw fragments sab naturally kaam karte hain
- **Lightweight** — minimal abstraction, fast startup, koi binary nahi
- **Data scripts aur migrations ke liye badhiya** — jab tumhe bas SQL programmatically run karna ho
- **Kisi bhi ORM ke saath kaam karta hai** — complex reports ke liye Knex, CRUD ke liye tumhara ORM

### Nuksan (Cons)

- **ORM nahi hai** — koi model layer nahi, koi relations nahi, joins pe type inference nahi
- **Manual typing** — return types query shape se infer nahi hote
- **CRUD ke liye zyada boilerplate** — jo Prisma ek line mein karta hai, Knex mein multiple lines chahiye
- **Schema awareness nahi hai** — column names mein typos runtime errors hain, compile-time errors nahi
- **Complexity badhne pe scale nahi karta** — bahut badi Knex queries maintain karna mushkil ho jaata hai

### Knex Kab Use Karein

- Tumhe **complex analytical queries** chahiye jo ORMs mangle kar dete hain
- **Data pipeline ya migration script** bana rahe ho
- Tumhe **maximum SQL control** chahiye bina raw strings likhe
- Isse ek **custom repository pattern** ke foundation ki tarah use kar rahe ho
- App ko aisi queries chahiye jisme **CTEs, window functions, ya LATERAL joins** ho jo tumhara ORM express nahi kar sakta

---

## 📊 Bada Comparison Table

| Feature | Prisma | Drizzle | TypeORM | Sequelize | Knex |
|---|---|---|---|---|---|
| **TypeScript Support** | Excellent (auto-generated types) | Excellent (schema se inferred) | Good (decorators, kuch gaps) | Fair (verbose, boilerplate) | Manual (khud types likho) |
| **Schema Definition** | `.prisma` file (DSL) | TypeScript objects | Class decorators | `Model.init()` | Kuch nahi (sirf migrations) |
| **Migrations** | `prisma migrate` (auto-diff) | `drizzle-kit push/generate` | `typeorm migration:generate` | `sequelize-cli migrate` | `knex migrate:latest` |
| **Learning Curve** | Low (beginner-friendly) | Medium (SQL knowledge chahiye) | Medium-High (decorators, DI) | Medium (bahut options) | Low-Medium (bas SQL) |
| **Performance** | Good (query engine overhead) | Excellent (no runtime) | Good | Good | Excellent (no ORM layer) |
| **Edge Support** | Limited (binary engine) | Excellent (edge-first) | Limited | Limited | Good |
| **Community** | Large, fast-growing | Growing rapidly | Large | Very large (sabse purana) | Large (stable) |
| **Best For** | TypeScript teams, rapid dev | Serverless, edge, SQL lovers | NestJS, Java devs | Legacy projects | Complex queries, raw SQL |
| **Relations** | Automatic (include/select) | Manual joins | Decorators + lazy/eager | hasMany/belongsTo | Sirf manual joins |
| **Full ORM?** | Yes | Yes | Yes | Yes | No (sirf query builder) |

---

## 🤔 Kab Kisko Choose Karein

### Prisma Choose Karo Jab...
- Tum **scratch se TypeScript application** bana rahe ho
- Team mein **junior developers** hain ya jo SQL se unfamiliar hain
- Tumhe **fast iteration** chahiye — Prisma ka `include` aur `select` sabse ergonomic hai
- Tum **Next.js ya SvelteKit** full-stack app bana rahe ho
- Tumhe **auto-generated types** chahiye bina kisi configuration ke

### Drizzle Choose Karo Jab...
- Tum **Cloudflare Workers, Vercel Edge, ya Deno** pe deploy kar rahe ho
- Tumhe **SQL-level control** chahiye TypeScript safety ke saath
- **Bundle size aur cold start** critical metrics hain
- Team SQL pasand karti hai aur ORMs ko zyada abstract manti hai
- Tum **Bun** ya kisi non-Node runtime pe build kar rahe ho

### TypeORM Choose Karo Jab...
- Tum **NestJS application** bana rahe ho (yeh standard choice hai)
- Team **Java, Spring, ya Hibernate** backgrounds se aati hai
- Tumhe simpler services ke liye **Active Record** pattern chahiye
- Project mein already TypeORM entities aur migration history hai

### Sequelize Choose Karo Jab...
- Tum **existing Node.js project maintain** kar rahe ho jo Sequelize use karta hai
- Tumhe plugins aur guides ka **sabse bada ecosystem** chahiye
- Team **JavaScript mein zyada comfortable** hai, TypeScript mein kam
- Audit trails aur side effects ke liye **rich lifecycle hooks** chahiye

### Knex Choose Karo Jab...
- Tumhe **complex SQL** likhna hai jo ORMs achhe se express nahi kar paate
- **Data pipelines, ETL scripts, ya reporting tools** bana rahe ho
- Tumhe ek **query builder** chahiye bina model magic ke
- Knex ko **ORM ke saath** use kar rahe ho un queries ke liye jo ORM handle nahi kar sakta
- Custom data layer bana rahe ho aur SQL control chahiye bina raw strings ke

---

## 💡 Key Takeaways

1. **Prisma best default hai** greenfield TypeScript projects ke liye. Standard CRUD operations ke liye iska developer experience unmatched hai.

2. **Drizzle edge ka Prisma hai**. Agar Prisma nahi chala sakte (Cloudflare Workers, edge functions), toh Drizzle modern replacement hai — downgrade nahi.

3. **TypeORM NestJS ka ORM hai**. Agar NestJS use kar rahe ho, TypeORM already integrated hai. Is default ke against jaana costly padta hai.

4. **Sequelize legacy-stable hai**. Naye projects ke liye best choice nahi hai, lekin broken bhi nahi hai. Agar tumhara project Sequelize pe hai, toh usko rewrite karne ki compelling reason kam hi milegi.

5. **Knex tumhara ORM nahi hai — yeh tumhara escape hatch hai**. Zyadatar projects jo full ORM use karte hain, unmein bhi ek-do Knex queries hoti hain us complex SQL ke liye jo ORM cleanly express nahi kar sakta.

6. **"Best ORM" context-dependent hai**. Runtime environment, team background, existing codebase, aur query complexity — sab matter karta hai. Winner pick karna nahi, tradeoffs evaluate karna seekho.

7. **SQL knowledge tumhare ORM ki effectiveness ko multiply karti hai**. Chahe Drizzle use karo (jahan SQL hi API hai) ya Prisma (jahan SQL chhupa hota hai), yeh samajhna ki kaunsi query generate ho rahi hai, tumhe better developer banata hai.

---

## 🧠 Quiz

Agle chapter pe jaane se pehle apni understanding test karo.

**Question 1**

Tum ek API route bana rahe ho jo Cloudflare Workers pe chalta hai. Yeh route PostgreSQL database se user data fetch karta hai. Kaunsa ORM choose karoge aur kyun?

<details>
<summary>Answer</summary>

**Drizzle ORM.** Cloudflare Workers V8 isolate runtime use karte hain — koi Node.js APIs nahi, koi filesystem access nahi, processes spawn karne ki ability nahi. Prisma ka query engine ek binary hai jo is environment mein run nahi ho sakta. Drizzle ka koi runtime binary nahi hai — yeh pure TypeScript hai jo SQL strings generate karta hai aur ek compatible driver use karta hai (jaise `@cloudflare/workers-postgres`). Yeh specifically edge environments ke liye design kiya gaya hai.

</details>

---

**Question 2**

Tumhari team NestJS application bana rahi hai. Java background wala ek senior developer TypeORM suggest karta hai. Ek TypeScript-first developer Prisma suggest karta hai. Dono side ke sabse strong arguments kya hain, aur decide kaise karoge?

<details>
<summary>Answer</summary>

**TypeORM ke favour mein arguments:** NestJS ka native `@nestjs/typeorm` integration hai — module setup, `@InjectRepository` se entity injection, aur decorator style Spring/Hibernate se aane wale developers ke liye familiar hai. Kam conceptual translation chahiye.

**Prisma ke favour mein arguments:** Prisma ka TypeScript inference better hai, schema definition cleaner hai, aur prototype karna generally faster hai. `@nestjs/prisma` community integrations bhi exist karte hain.

**Decide kaise karein:** Agar Java developer lead hai ya team mostly OOP-oriented hai, toh TypeORM friction kam karega. Agar TypeScript quality aur developer ergonomics priority hai, toh Prisma better choice hai. Dono kaam karte hain — sabse important factor team consensus aur consistency hai.

</details>

---

**Question 3**

Tumhare paas ek PostgreSQL database hai jisme `orders` table hai. Tumhe ek query likhni hai jo `WITH RECURSIVE` CTE use karke ek category hierarchy traverse kare, phir orders ke against join kare. Kaunsa tool use karoge aur kyun?

<details>
<summary>Answer</summary>

**Knex.js** (ya tumhare ORM ke `$queryRaw` / `query` escape hatch se raw SQL).

Recursive CTEs advanced SQL hain jo zyadatar ORMs natively support nahi karte. Drizzle mein limited CTE support hai. Prisma, TypeORM, aur Sequelize generally is case mein raw query escape hatch maangte hain.

Knex mein:
```typescript
const result = await db.raw(`
  WITH RECURSIVE category_tree AS (
    SELECT id, name, parent_id FROM categories WHERE id = ?
    UNION ALL
    SELECT c.id, c.name, c.parent_id
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
  )
  SELECT o.* FROM orders o
  JOIN category_tree ct ON o.category_id = ct.id
`, [rootCategoryId]);
```

Yeh exactly wahi use case hai jisme Knex excel karta hai: complex SQL jispe tumhe full control chahiye, ek structured tarike se express kiya gaya bina simpler parts ke liye raw string concatenation kiye.

</details>

---

## 📚 Further Reading

- [Drizzle ORM Docs](https://orm.drizzle.team) — especially "Why Drizzle?" page
- [TypeORM Docs](https://typeorm.io) — Data Mapper vs Active Record section
- [Sequelize v6 Docs](https://sequelize.org/docs/v6/) — Associations guide
- [Knex.js Docs](https://knexjs.org) — Query Builder reference
- [Prisma vs Drizzle — Official Comparison](https://orm.drizzle.team/docs/prisma) — Drizzle team ne likha hai, isliye critically padhna

---

*Next Chapter: Database Migrations — Schema Changes Ko Environments Ke Across Safely Manage Karna*
