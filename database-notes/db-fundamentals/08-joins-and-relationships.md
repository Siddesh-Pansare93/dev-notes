# 08 - Relationships aur Joins Fundamentals

> **Chapter ka goal:** Samjho ki tables aapas mein kaise baat karte hain, relationships kyun banate hain, aur multiple tables mein failey data ko JOINs se kaise query karte hain.

---

## 🔗 Part 1: Relationships ke Types

Relational database ka naam hi isliye "relational" hai — tables ka pura purpose hi ek dusre se *relate* karna hai. Ek bhi JOIN likhne se pehle, samajhna zaruri hai ki ye relationships bante *kyun* hain.

---

### 1️⃣ One-to-One (1:1)

**Kya hota hai?** Table A ka ek row exactly Table B ke ek row se match karta hai, aur vice versa.

**Real example:** `users` ↔ `user_profiles`

Jaise Zomato pe ek user ka exactly ek hi profile hota hai. Aur ek profile exactly ek hi user ka hota hai — do users ek profile share nahi kar sakte.

**Kab use karein:**
- Jab ek table bahut wide ho raha ho (columns zyada ho gaye ho).
- Kuch columns optional hain ya kam query hote hain (jaise bio, avatar URL) — inhe alag rakh ke hot path (frequently accessed data) fast rakho.
- Sensitive data (jaise SSN, payment info) ko alag table mein tighter permissions ke saath store karna ho.

**Kaise implement karein:**

```sql
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_profiles (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE,          -- UNIQUE hi 1:1 rule enforce karta hai
  bio        TEXT,
  avatar_url VARCHAR(500),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Do cheezein zaruri hain yahan:
1. Ek **foreign key** (`user_id`) jo parent table ko point kare.
2. Us foreign key pe **UNIQUE constraint** — agar `UNIQUE` nahi lagaya, to ye One-to-Many ban jayega.

---

### 1️⃣➡️♾️ One-to-Many (1:N)

**Kya hota hai?** Table A ka ek row Table B ke *many* rows se relate karta hai. Ye sabse common relationship hai kisi bhi database mein.

**Real example:** `users` → `posts`

Jaise Swiggy pe ek restaurant ke many orders aa sakte hain, waise hi ek user many posts likh sakta hai. Har post exactly ek hi user ka hota hai.

**Golden rule:** Foreign key hamesha **"many" wale side** pe jaata hai.

```sql
CREATE TABLE posts (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL,               -- FK "many" side (posts) pe hai
  title      VARCHAR(255) NOT NULL,
  body       TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Notice karo — yahan `user_id` pe **koi UNIQUE nahi** hai. Yehi cheez ise One-to-One se One-to-Many banati hai. `posts` table ke multiple rows same `user_id` share kar sakte hain.

Aur classic examples:
- `departments` → `employees` (ek department, kai employees)
- `orders` → `order_items` (ek order, kai line items)
- `categories` → `products`

---

### ♾️↔️♾️ Many-to-Many (M:N) — Junction Table

**Kya hota hai?** Table A ke many rows Table B ke many rows se relate karte hain.

**Real example:** `students` ↔ `courses`

Ek student kai courses mein enroll ho sakta hai. Aur ek course mein kai students enroll ho sakte hain.

**Problem:** Isko sirf do tables aur ek foreign key se represent nahi kar sakte. Yahan koi single "many" side hai hi nahi jahan FK daal sako.

**Solution:** Ek **junction table** (isko bridge table, associative table, ya linking table bhi kehte hain).

```sql
CREATE TABLE students (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE courses (
  id    SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL
);

-- Junction table: har student-course pair ka ek row
CREATE TABLE enrollments (
  student_id INT NOT NULL,
  course_id  INT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT NOW(),   -- extra context column
  role        VARCHAR(50) DEFAULT 'student', -- 'student', 'auditor', 'TA'
  grade       CHAR(2),
  PRIMARY KEY (student_id, course_id),   -- composite PK duplicates rokta hai
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE
);
```

**Junction table mein extra columns kya daalein:**

| Column | Kyun |
|---|---|
| `enrolled_at` / `created_at` | Relationship kab bana? |
| `role` | Student, auditor, TA — same relationship, alag context |
| `grade` | Ye data sirf *is* relationship ka hai, na ki student ya course ka akela |
| `status` | `active`, `withdrawn`, `completed` |

Junction table sirf ek "connector" nahi hai — ye khud ek first-class entity hai jo relationship-level data hold kar sakti hai. Socho isko jaise Zomato ka "order" table hota hai — ek restaurant aur ek customer ke beech ka connection, but usme khud ka data hota hai (total amount, delivery time, status).

---

### 🔄 Self-Referencing Relationship

**Kya hota hai?** Ek table jo *khud se* relate karta hai. Same table ka ek row parent bhi hota hai aur child bhi.

**Real example:** `employees` → manager (jo khud bhi ek employee hai)

```sql
CREATE TABLE employees (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  manager_id INT,                        -- nullable: CEO ka koi manager nahi
  FOREIGN KEY (manager_id) REFERENCES employees(id)
);

-- Sample data
INSERT INTO employees (id, name, manager_id) VALUES
  (1, 'Alice (CEO)',   NULL),
  (2, 'Bob (VP)',      1),
  (3, 'Carol (Dev)',   2),
  (4, 'Dave (Dev)',    2);
```

Bilkul waise hi jaise Ola mein har driver ka ek "referred by" driver ho sakta hai, ya joining tree bane. Aur classic self-referencing examples:
- `categories` with `parent_category_id` (nested menus — jaise Flipkart ki category tree: Electronics → Mobiles → Smartphones)
- `comments` with `parent_comment_id` (threaded replies)
- `files` and `folders` file system mein

---

## 🔀 Part 2: JOINs — Tables ko Combine Karna

**JOIN** kya hota hai? Ye do ya zyada tables ke rows ko ek related column (usually foreign key / primary key pair) ke basis pe merge karta hai. JOINs ke bina, har query sirf ek table tak limited rahegi.

Mental model: socho do tables do lists of sticky notes hain. JOIN ka matlab hai unhe match karna aur decide karna ki matched/unmatched notes mein se kya rakhna hai.

---

### INNER JOIN

**Kya return karta hai?** Sirf wo rows jinka match **dono** tables mein hai. Jis side match nahi mila, wo row drop ho jaata hai.

```
Table A          Table B
[ A1 ]--match--[ B1 ]  ✓ included
[ A2 ]--match--[ B2 ]  ✓ included
[ A3 ]  no match        ✗ excluded
         [ B4 ]  no match  ✗ excluded
```

**SQL:**

```sql
-- Saare posts unke author ke email ke saath nikalo
SELECT
  posts.id,
  posts.title,
  users.email AS author_email
FROM posts
INNER JOIN users ON posts.user_id = users.id;
```

**Real-world use case:** Published posts ki list dikhani hai author names ke saath. Sirf wahi posts chahiye jinka valid user *hai* — orphaned posts (jinke user invalid hain) dikhane ka koi fayda nahi.

**Shorthand:** Sirf `JOIN` likhna (koi keyword pehle nahi) by default `INNER JOIN` maana jaata hai.

---

### LEFT JOIN (LEFT OUTER JOIN)

**Kya return karta hai?** **Left table ke saare rows**, plus right table se jo match mile. Agar right side match nahi mila, to right-side columns `NULL` bhar diye jaate hain.

```
Table A          Table B
[ A1 ]--match--[ B1 ]  ✓ included (dono side data hai)
[ A2 ]--match--[ B2 ]  ✓ included (dono side data hai)
[ A3 ]  no match        ✓ included (right side = NULL)
         [ B4 ]  no match  ✗ excluded (left table mein nahi hai)
```

**SQL:**

```sql
-- Saare users nikalo, aur unke posts agar hain to
-- Zero posts wale users bhi list mein dikhenge (posts columns = NULL)
SELECT
  users.id,
  users.email,
  posts.title AS post_title
FROM users
LEFT JOIN posts ON posts.user_id = users.id;
```

**Real-world use case:** Socho tumhe saare users ki list chahiye, aur ye bhi dikhana hai ki har ek ne kitne posts likhe — including wo users jinhone zero posts likhe hain (unke against `0` dikhna chahiye, list se gayab nahi hona chahiye).

```sql
-- Har user ke posts count karo, including 0 posts wale
SELECT
  users.email,
  COUNT(posts.id) AS post_count
FROM users
LEFT JOIN posts ON posts.user_id = users.id
GROUP BY users.id, users.email;
```

**Pro tip:** Left table mein hain but right table mein NAHI hain aise rows dhundne ke liye (orphan detection):

```sql
SELECT users.email
FROM users
LEFT JOIN posts ON posts.user_id = users.id
WHERE posts.id IS NULL;  -- jinhone kabhi post nahi likha
```

---

### RIGHT JOIN (RIGHT OUTER JOIN)

**Kya return karta hai?** LEFT JOIN ka mirror image. **Right table ke saare rows**, plus left se jo match mile. Left-side columns `NULL` honge jahan match nahi mila.

```
Table A          Table B
[ A1 ]--match--[ B1 ]  ✓ included
[ A2 ]--match--[ B2 ]  ✓ included
[ A3 ]  no match        ✗ excluded
         [ B4 ]  no match  ✓ included (left side = NULL)
```

**SQL:**

```sql
-- Saare posts aur unke authors nikalo, un posts sahit jinka user_id invalid hai
SELECT
  posts.title,
  users.email AS author_email
FROM users
RIGHT JOIN posts ON posts.user_id = users.id;
```

**Real-world use case:** Orphaned data audit karna — un posts ko dhundna jinka `user_id` kisi delete ho chuke ya non-existent user ko point kar raha hai.

**Practical note:** Practice mein, zyadatar developers RIGHT JOIN ko table order swap karke LEFT JOIN mein rewrite kar dete hain. Result same hi hota hai, but LEFT JOIN zyada readable maana jaata hai aur zyada universally supported bhi hai.

---

### FULL OUTER JOIN

**Kya return karta hai?** **Dono tables ke saare rows**. Matched rows combine ho jaate hain; jo unmatched hain unke against missing side `NULL` aata hai.

```
Table A          Table B
[ A1 ]--match--[ B1 ]  ✓ included (matched)
[ A2 ]--match--[ B2 ]  ✓ included (matched)
[ A3 ]  no match        ✓ included (B side = NULL)
         [ B4 ]  no match  ✓ included (A side = NULL)
```

**SQL (PostgreSQL / SQL Server / SQLite):**

```sql
SELECT
  users.email,
  posts.title
FROM users
FULL OUTER JOIN posts ON posts.user_id = users.id;
```

**Real-world use case:** Reconciliation — do data sources compare karna, ye pata karne ke liye ki A mein kya hai jo B mein nahi, B mein kya hai jo A mein nahi, aur dono mein kya match karta hai. Jaise UPI transactions ko bank statement se reconcile karna.

---

> ⚠️ **MySQL FULL OUTER JOIN support nahi karta.**
>
> Workaround: LEFT JOIN aur RIGHT JOIN ko `UNION` se combine karo (jo duplicates hata deta hai):
>
> ```sql
> SELECT users.email, posts.title
> FROM users
> LEFT JOIN posts ON posts.user_id = users.id
>
> UNION
>
> SELECT users.email, posts.title
> FROM users
> RIGHT JOIN posts ON posts.user_id = users.id;
> ```
>
> `UNION ALL` use karoge to duplicates rakh lega (matched rows do baar dikhenge). Deduplicate automatically karne ke liye `UNION` use karo.

---

### CROSS JOIN

**Kya return karta hai?** Table A aur Table B ke rows ka har possible combination. Agar Table A mein 3 rows hain aur Table B mein 4 rows, to result mein 3 × 4 = **12 rows** aayenge. Ye mathematical *Cartesian product* hai.

```
Table A: [A1] [A2] [A3]
Table B: [B1] [B2] [B3] [B4]

Result:
A1-B1  A1-B2  A1-B3  A1-B4
A2-B1  A2-B2  A2-B3  A2-B4
A3-B1  A3-B2  A3-B3  A3-B4
```

**SQL:**

```sql
-- Shirt size + color ka har combination generate karo
SELECT
  sizes.label  AS size,
  colors.name  AS color
FROM sizes
CROSS JOIN colors;
```

**Real-world use cases:**
- Product variant matrix generate karna (jaise Myntra pe har size × har color).
- Calendar grid banana (har din × har time slot).
- "Default" report populate karna jahan har combination dikhna chahiye chahe data zero ho.

**Warning:** Bade tables pe CROSS JOIN billions of rows generate kar sakta hai aur database crash kar sakta hai. Isko sochsamajh ke use karo, row counts ka hamesha dhyan rakho.

---

### SELF JOIN

**Kya return karta hai?** Ek table khud se joined. "Do copies" ko distinguish karne ke liye table aliases use karte hain.

**SQL:**

```sql
-- Har employee ke saath uske manager ka naam dikhao
SELECT
  emp.name        AS employee,
  mgr.name        AS manager
FROM employees emp
LEFT JOIN employees mgr ON emp.manager_id = mgr.id;
```

Result:

| employee | manager |
|---|---|
| Alice (CEO) | NULL |
| Bob (VP) | Alice (CEO) |
| Carol (Dev) | Bob (VP) |
| Dave (Dev) | Bob (VP) |

LEFT JOIN isliye use kiya taaki Alice (CEO, jiska `manager_id = NULL` hai) bhi result mein dikhe. INNER JOIN use karte to Alice exclude ho jaati.

**Real-world use cases:**
- Org charts aur reporting hierarchies dikhana.
- Same table ke rows ko compare karna (jaise same category ke products ka average price se cheaper products dhundna).
- Threading: ek comment ko uske parent comment ke saath dikhana.

---

## 🧠 Quick Reference: JOIN Comparison Table

| JOIN Type | Left ke Rows | Right ke Rows | NULLs? |
|---|---|---|---|
| INNER JOIN | Sirf matched | Sirf matched | Nahi |
| LEFT JOIN | Saare | Sirf matched | Right side |
| RIGHT JOIN | Sirf matched | Saare | Left side |
| FULL OUTER JOIN | Saare | Saare | Dono side |
| CROSS JOIN | Saare (×) | Saare (×) | Nahi |
| SELF JOIN | Same table khud se joined | — | Jo JOIN type use kiya usi pe depend karta hai |

---

## 📌 Key Takeaways

1. **Relationship type decide karta hai FK kahan jayega.** 1:1 ko FK + UNIQUE chahiye. 1:N ko FK "many" side pe chahiye. M:N ko junction table chahiye do FKs ke saath.

2. **Junction tables real tables hain.** Ye extra columns carry kar sakte hain (aur karne chahiye) jo relationship ke baare mein batate hain — timestamps, roles, grades, statuses.

3. **Self-referencing relationships** ek hi table ke andar hierarchies model karte hain. Jo column khud ko reference karta hai wo nullable hota hai (root ka koi parent nahi hota).

4. **INNER JOIN = intersection.** Sirf wahi milta hai jo dono side match karta hai.

5. **LEFT JOIN = left table guaranteed.** Left ka har row aayega; missing right-side data NULL ban jaayega. INNER ke baad ye sabse zyada use hone wala JOIN hai.

6. **RIGHT JOIN = LEFT JOIN with tables swapped.** Zyadatar developers consistency ke liye LEFT JOIN mein rewrite karna prefer karte hain.

7. **FULL OUTER JOIN = dono tables guaranteed.** MySQL isko support nahi karta — LEFT + RIGHT ka UNION use karo.

8. **CROSS JOIN = combinatorial explosion.** Har row × har row. Variant generation ke liye powerful, bade tables pe dangerous.

9. **SELF JOIN = ek table khud se baat kar raha hai.** Hamesha aliases use karo. Agar root/top-level row include karna zaruri ho to LEFT JOIN use karo.

---

## 🧪 Quiz

**Question 1**

Tum ek database design kar rahe ho jahan har `order` mein multiple `products` ho sakte hain, aur har `product` multiple `orders` mein appear ho sakta hai. Ye kaunsa relationship type hai, aur ise sahi tarike se model karne ke liye kya banana padega?

<details>
<summary>Answer</summary>

Ye ek **Many-to-Many** relationship hai. Tumhe ek **junction table** banani padegi — usually `order_items` naam ki — jisme foreign keys `orders` aur `products` dono ko point karengi. Isme extra columns bhi rakh sakte ho jaise `quantity` aur `unit_price` (purchase ke time ka price, jo current price se alag ho sakta hai).

</details>

---

**Question 2**

Ek team ye query likhti hai saare users list karne aur unke posts count karne ke liye, but zero posts wale users results mein missing hain. Unhe kaunsa JOIN use karna chahiye, aur kyun?

```sql
-- Broken: zero posts wale users drop ho jaate hain
SELECT users.email, COUNT(posts.id) AS post_count
FROM users
INNER JOIN posts ON posts.user_id = users.id
GROUP BY users.id;
```

<details>
<summary>Answer</summary>

`INNER JOIN` ko **`LEFT JOIN`** se replace karo. INNER JOIN un users ko exclude kar deta hai jinke `posts` mein koi matching row nahi hai. LEFT JOIN saare users ko result mein rakhta hai aur zero posts wale users ke liye `posts.id` ko NULL bhar deta hai. `COUNT(posts.id)` un users ke liye sahi se `0` return karta hai kyunki `COUNT` NULL values ko ignore karta hai.

</details>

---

**Question 3**

Tum MySQL pe ho aur `table_a` OR `table_b` (ya dono) mein exist karne wale saare records chahiye, unmatched rows dono side se sahit. FULL OUTER JOIN available nahi hai. Iska behavior kaise replicate karoge?

<details>
<summary>Answer</summary>

LEFT JOIN aur RIGHT JOIN ka `UNION` use karo:

```sql
SELECT a.id, b.id
FROM table_a a
LEFT JOIN table_b b ON a.id = b.a_id

UNION

SELECT a.id, b.id
FROM table_a a
RIGHT JOIN table_b b ON a.id = b.a_id;
```

`UNION` (`UNION ALL` nahi) duplicate rows hata deta hai, isliye matched rows jo query ke dono halves mein aate hain wo deduplicate ho jaate hain — bilkul FULL OUTER JOIN jaisa behavior replicate karte hue.

</details>

---

*Next chapter: Indexes — Apni Queries Fast Banana*
