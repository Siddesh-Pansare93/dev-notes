# Object-Relational Mappers (ORMs)

Socho tumhara Node.js/TypeScript backend hai aur usko database se baat karni hai. Ab yahan do raaste hain — ya toh raw SQL likho (jaise Zomato ka backend engineer directly kitchen se baat kare), ya beech mein ek translator rakho jo tumhare JS objects ko SQL queries mein convert kare aur wapas SQL results ko JS objects mein. Yeh translator hi hota hai **ORM**.

Yeh guide practical hai — ORM kya hote hain, kyun zaruri hain, aur Prisma (aaj kal ka sabse popular choice) ko first setup se leke advanced production patterns tak use kaise karna hai, saath mein Drizzle, TypeORM, Sequelize, aur Knex ke saath honest comparison bhi.

## Table of Contents

### Part 1 — Foundations
1. [What Is an ORM?](./01-what-is-an-orm.md) — ORM kis problem ko solve karta hai, uske pros/cons, aur Node.js ke major options ka comparison

### Part 2 — Prisma in Depth
2. [Prisma Setup](./02-prisma-setup.md) — Node.js/TypeScript project mein Prisma install aur configure karna
3. [Prisma Schema](./03-prisma-schema.md) — `.prisma` schema file se apna data model banana
4. [Prisma CRUD](./04-prisma-crud.md) — Prisma Client ke saath create, read, update, delete operations
5. [Prisma Migrations](./05-prisma-migrations.md) — `prisma migrate` se schema changes safely manage karna
6. [Prisma Advanced](./06-prisma-advanced.md) — transactions, raw SQL, middleware, performance tuning, aur Prisma Client Extensions
7. [Other ORMs](./07-other-orms.md) — Drizzle, TypeORM, Sequelize, aur Knex side-by-side, benchmark queries ke saath aur decision guidance

---

## Learning Path

### Beginner — Apna pehla Prisma-powered backend banao
Chapters order mein padho: **01 → 02 → 03 → 04**. Isके baad tumhe pata chalega ORM kya karta hai, Prisma install ho chuka hoga aur database se connect hoga, relations wala working schema ban chuka hoga, aur full type safety ke saath saare standard CRUD operations likh paoge.

### Intermediate — Migrations aur production-readiness add karo
**05 → 06** continue karo. Yahan seekhoge database schema ko bina data khoye evolve karna kaise hota hai, operations ko transactions mein wrap karna, N+1 query problem se kaise bachna hai, aur Prisma Client Extensions se custom methods aur computed fields kaise add karte hain.

### Advanced — Sahi tool choose karna seekho
**07** se finish karo. Ab tum Prisma, Drizzle, TypeORM, Sequelize, aur Knex ke tradeoffs samajh kar kisi bhi project type ke liye — Cloudflare Workers se leke NestJS enterprise applications tak — informed architectural decision le paoge.

---

## Kya Seekhoge?

- Application code mein raw SQL kyun brittle hota hai aur ORMs uska solution kaise dete hain
- ORM vs raw SQL ke trade-offs (aur dono ko saath mein kaise use karein)
- Prisma mein relational database schema kaise model karte hain — one-to-many aur many-to-many relations ke saath
- Prisma ke type-safe client se saare standard CRUD operations kaise run karte hain
- Database migrations kaise kaam karte hain aur development aur production dono mein safely kaise chalate hain
- Prisma transactions se atomic, all-or-nothing operations kaise guarantee karte hain
- N+1 query problem ko kaise diagnose aur fix karte hain
- Jab full control chahiye tab Prisma se raw SQL mein kaise escape karte hain
- Drizzle, TypeORM, Sequelize, aur Knex, Prisma se aur ek-dusre se kaise alag hain
- Given runtime environment, team background, aur query complexity ke hisaab se sahi ORM kaise choose karein

---

## Prerequisites

- TypeScript likhne mein comfortable ho — interfaces, generics, async/await
- Pata ho relational database kya hota hai — tables, rows, columns, primary keys, foreign keys
- Basic SQL literacy — `SELECT ... WHERE` ya `JOIN` statement padh sako, chahe khud zyada likha na ho
- Node.js project setup ka basic idea — `npm install` chalana aur environment variables use karna aata ho

> [!info]
> Prior ORM experience zaruri nahi hai. Chapter 01 bilkul scratch se start karta hai.

---

## Is Guide Ko Kaise Use Karein

1. **Chapter 01 se hi start karo, chahe pehle kabhi ORM use kiya ho.** Pehle chapter mein comparison table aur ORM vs raw SQL decision framework hai jise baaki poori series reference karti hai. Skim karne mein 10 minute lagenge, aur aage sab kuch usi pe anchor hoga.

2. **Padhte waqt code khud run karo.** Har Prisma chapter pichhle wale pe build hota hai. Queries ko khud type karna (copy-paste nahi) API internalize karne ka sabse fast tareeka hai, aur tumhe pata chalega ki TypeScript kahan tumhari galtiyan pakadta hai.

3. **Quiz sections ko checkpoint ki tarah use karo.** Har chapter ke end mein 2-3 questions hain. Agar bina dekhe confidently answer nahi de paate, toh aage badhne se pehle relevant section dobara padho — baad ke chapters yeh knowledge assume karte hain.

4. **Naya project start karne se pehle Chapter 07 padho.** "Other ORMs" chapter mein decision guide hai jo batata hai Prisma kab NAHI use karna chahiye. Yeh pehle se pata hona baad mein ek painful migration se bacha sakta hai.

5. **Jaise-jaise app badhta jaaye, Chapter 06 ko refer karte raho.** Transactions, soft deletes, connection pooling, aur query logging — yeh cheezein day one pe zaruri nahi lagti, lekin week four tak zaroor chahiye hongi. Bookmark kar lo.

---

> [!tip]
> Har senior developer ke paas ek galat data access layer choose karne ki horror story hoti hai — bilkul waise hi jaise galat delivery partner choose karne se order late ho jaata hai. Is guide se guzarne ke baad tumhare paas woh knowledge hogi jisse tum yeh choice soch-samajh kar loge — aur yeh bhi exactly samjhoge ki tumhara ORM background mein kya kar raha hai.

## Key Takeaways

- ORM ek translator layer hai jo tumhare JS/TS objects aur SQL database ke beech baithta hai
- Yeh guide Prisma-first hai, lekin Drizzle, TypeORM, Sequelize, aur Knex ka bhi fair comparison deta hai
- Learning path teen level mein bata hai: Beginner (01-04), Intermediate (05-06), Advanced (07)
- Chapter 01 aur Chapter 07 dono hi baar-baar refer karne layak hain — pehla foundation ke liye, doosra decision-making ke liye
- Hands-on practice (khud code likhna, quiz answer karna) is series se sabse zyada value nikaalne ka tareeka hai
