# 🔍 Filtering Data — WHERE, LIKE, IN, BETWEEN, aur baaki sab

> **Chapter 5** | SQL From Scratch Series
> Prerequisites: SELECT basics, FROM clause, basic data types

---

## 🎯 Filtering Hai Kya, Aur Zaruri Kyun Hai?

Socho tumhare paas ek `users` table hai jisme lakhon rows padi hain — bilkul Zomato ke database jaisa, jaha crores restaurants aur orders ka data hoga. Ab agar tum bina kisi shart ke query maaroge, toh database poora table utha ke de dega — slow bhi, expensive bhi, aur 99% data tumhe chahiye bhi nahi hoga.

Yahi kaam `WHERE` clause karta hai. Ye tumhe bolne deta hai: *"Bhai, sirf wahi rows do jo mujhe chahiye."* Jaise Zomato pe tum filter lagate ho "sirf veg restaurants, rating 4+" — wahi cheez SQL mein `WHERE` karta hai.

Is chapter mein hum har roz kaam aane wali filtering techniques dekhenge.

---

## 🟢 WHERE Clause

`WHERE` hamesha `FROM` ke baad aur `ORDER BY` ya `GROUP BY` se pehle aata hai. Ye har row ke liye ek condition check karta hai — jo row condition ko **true** karti hai woh rakhi jaati hai, baaki sab hata di jaati hain.

```sql
SELECT column1, column2
FROM   table_name
WHERE  condition;
```

**Example table — `users`:**

| id | name    | age | status   | email               |
|----|---------|-----|----------|---------------------|
| 1  | Alice   | 30  | active   | alice@example.com   |
| 2  | Bob     | 17  | pending  | bob@example.com     |
| 3  | Carol   | 25  | inactive | carol@example.com   |
| 4  | Dave    | 30  | active   | dave@example.com    |
| 5  | Eve     | NULL| active   | NULL                |

```sql
-- Sirf active users
SELECT name, email
FROM   users
WHERE  status = 'active';
-- Returns: Alice, Dave, Eve
```

---

## ➕ Comparison Operators

Ye sab databases mein same tarah kaam karte hain:

| Operator | Matlab                | Example              |
|----------|-----------------------|----------------------|
| `=`      | Equal to              | `age = 30`           |
| `!=`     | Not equal to          | `status != 'active'` |
| `<>`     | Not equal to (SQL std)| `status <> 'active'` |
| `<`      | Less than             | `age < 18`           |
| `>`      | Greater than          | `age > 25`           |
| `<=`     | Less than or equal    | `age <= 30`          |
| `>=`     | Greater than or equal | `age >= 18`          |

> **Tip:** `!=` aur `<>` bilkul same kaam karte hain. `<>` SQL standard hai, aur dono PostgreSQL, MySQL, SQL Server, Oracle sab mein chalte hain.

```sql
SELECT name
FROM   users
WHERE  age >= 18;
-- Returns: Alice, Carol, Dave (Bob 17 ka hai; Eve ki age NULL hai — NULL exclude ho jaata hai)
```

> [!info]
> NULL ke saath comparison ka behavior thoda alag hota hai — isko hum aage `IS NULL` section mein detail se samjhenge.

---

## 🔗 AND, OR, NOT — Conditions Ko Jodna

### AND — dono conditions true honi chahiye

Socho tum Swiggy pe filter laga rahe ho: "active bhi ho AUR 18+ bhi ho" — dono sach honi chahiye tabhi row milegi.

```sql
SELECT name
FROM   users
WHERE  status = 'active'
  AND  age >= 18;
-- Returns: Alice, Dave
```

### OR — kam se kam ek condition true ho

```sql
SELECT name
FROM   users
WHERE  status = 'active'
  OR   age < 18;
-- Returns: Alice, Bob, Dave, Eve
```

### NOT — condition ko ulta kar deta hai

```sql
SELECT name
FROM   users
WHERE  NOT status = 'active';
-- Returns: Bob, Carol
```

### ⚠️ Operator Precedence — AND, OR Se Zyada Powerful Hai

SQL `AND` ko `OR` se **pehle** evaluate karta hai — bilkul maths mein multiplication addition se pehle hota hai waisa hi. Ye ek common bug ka source hai, ispe dhyan zaruru dena.

```sql
-- GALAT INTENTION: tum shayad chahte ho (status = 'active' OR status = 'pending') AND age >= 18
SELECT name
FROM   users
WHERE  status = 'active'
  OR   status = 'pending'
  AND  age >= 18;
-- SQL isko aise padhta hai: status = 'active' OR (status = 'pending' AND age >= 18)
-- Returns: Alice, Dave, Eve  — Bob chhoot gaya! Par tum shayad usko bhi chahte the.

-- SAHI TAREEKA: parentheses laga ke apni intended grouping force karo
SELECT name
FROM   users
WHERE  (status = 'active' OR status = 'pending')
  AND  age >= 18;
-- Returns: Alice, Dave, Eve (ab Bob exclude hua kyunki age=17 hai — ye ab sahi reason se hua)
```

**Rule of thumb:** Jab bhi `AND` aur `OR` ko mix karo, hamesha parentheses lagao. Isme kuch kharch nahi hota, aur bugs se bacha leta hai.

---

## 📋 IN — List Ke Against Match Karna

Multiple `OR` conditions chain karne ki jagah `IN` use karo:

```sql
-- OR wala verbose version
SELECT name FROM users
WHERE  status = 'active' OR status = 'pending';

-- IN wala clean version
SELECT name FROM users
WHERE  status IN ('active', 'pending');
```

Dono same result dete hain. `IN` padhne aur maintain karne mein zyada aasan hai — especially jab list lambi ho.

```sql
-- Multiple IDs filter karna
SELECT name FROM users
WHERE  id IN (1, 3, 5);
```

### ❌ NOT IN — NULLs Se Dhyan Se!

`NOT IN` theek se kaam karta hai jab list mein koi NULL na ho:

```sql
SELECT name FROM users
WHERE  status NOT IN ('inactive');
-- Returns: Alice, Bob, Dave, Eve
```

**Critical caveat:** Agar list mein ek bhi `NULL` hai, toh `NOT IN` **hamesha zero rows** return karega.

```sql
-- Maan lo subquery se aayi list mein galti se NULL bhi shaamil hai
SELECT name FROM users
WHERE  id NOT IN (2, NULL);
-- Returns: EMPTY — zero rows!
```

Ye isliye hota hai kyunki SQL three-valued logic use karta hai. Kisi bhi value ko `NULL` se compare karoge toh result `UNKNOWN` aata hai, `TRUE` ya `FALSE` nahi. Isliye koi bhi row confirm nahi ho paati ki woh ek aisi list mein "nahi hai" jisme `NULL` bhi ho.

> [!warning]
> Ye ek bahut common production bug hai — jab subquery se NULL aa jaata hai aur poori query silently zero rows de deti hai, bina kisi error ke. **Safe pattern:** `NOT IN` ki jagah `NOT EXISTS` use karo, ya subquery se NULLs filter kar do.

---

## 📏 BETWEEN — Range Filtering

`BETWEEN low AND high` `>= low AND <= high` ka shorthand hai. Dono ends **inclusive** hote hain (matlab low aur high dono include honge).

```sql
SELECT name, age
FROM   users
WHERE  age BETWEEN 18 AND 30;
-- Equivalent to: age >= 18 AND age <= 30
-- Returns: Alice (30), Carol (25), Dave (30)
```

`BETWEEN` dates aur strings pe bhi kaam karta hai:

```sql
-- Date range
SELECT * FROM orders
WHERE  created_at BETWEEN '2024-01-01' AND '2024-12-31';

-- Alphabetic range (kam common, lekin valid hai)
SELECT name FROM users
WHERE  name BETWEEN 'A' AND 'D';
```

> [!warning]
> Timestamps ke saath `BETWEEN` thoda tricky ho sakta hai. `BETWEEN '2024-01-01' AND '2024-12-31'` ka matlab hota hai `'2024-12-31 00:00:00'` tak — matlab 31 Dec ke din ki baaki saari rows miss ho jaayengi. Timestamp columns ke liye explicit `>= '2024-01-01' AND < '2025-01-01'` use karna better hai.

---

## 🔤 LIKE — Pattern Matching

`LIKE` string patterns match karta hai do wildcard characters ke through — bilkul jaise tum Google pe partial search karte ho:

| Wildcard | Matlab                          | Example              |
|----------|----------------------------------|----------------------|
| `%`      | Koi bhi characters (0 ya usse zyada) | `'alice%'` → alice, alice123 |
| `_`      | Exactly ek character              | `'ali_e'` → alice, alige |

```sql
-- 'A' se shuru hone wale naam
SELECT name FROM users WHERE name LIKE 'A%';

-- 'e' pe khatam hone wale naam
SELECT name FROM users WHERE name LIKE '%e';

-- Jinme 'ar' aata hai
SELECT name FROM users WHERE name LIKE '%ar%';

-- 5-character naam jisme beech mein 'ob' ho
SELECT name FROM users WHERE name LIKE '_ob__';
```

### Case Sensitivity Ka Jhamela

Yahan pe har database apna alag rasta leta hai:

| Database    | Default behavior                              | Case-insensitive option         |
|-------------|-----------------------------------------------|---------------------------------|
| PostgreSQL  | Case-sensitive                                | `ILIKE` use karo                |
| MySQL       | Case-insensitive (zyadatar collations mein)   | Default — extra keyword nahi chahiye |
| SQL Server  | Column/database collation pe depend karta hai | Collation lagao: `LIKE '%alice%' COLLATE Latin1_General_CI_AS` |
| Oracle      | Case-sensitive                                | `UPPER(col) LIKE UPPER('%alice%')` use karo |

```sql
-- PostgreSQL: ILIKE se case-insensitive
SELECT name FROM users WHERE name ILIKE 'alice%';

-- MySQL: already case-insensitive by default
SELECT name FROM users WHERE name LIKE 'alice%';

-- SQL Server: collation lagake case-insensitive force karo
SELECT name FROM users
WHERE  name LIKE 'alice%' COLLATE Latin1_General_CI_AS;

-- Oracle: dono sides ko uppercase karo
SELECT name FROM users WHERE UPPER(name) LIKE UPPER('alice%');
```

---

## 🔧 REGEXP / SIMILAR TO — Advanced Pattern Matching

Jab `LIKE` se kaam nahi chalta aur complex patterns chahiye, zyadatar databases regex support dete hain — lekin syntax har jagah alag hai:

```sql
-- PostgreSQL: ~ (case-sensitive), ~* (case-insensitive)
SELECT name FROM users WHERE name ~ '^A.*e$';   -- A se start, e pe end
SELECT name FROM users WHERE name ~* '^a.*e$';  -- same, case-insensitive

-- PostgreSQL SIMILAR TO bhi support karta hai (SQL standard regex ka subset)
SELECT name FROM users WHERE name SIMILAR TO '(Alice|Dave)';

-- MySQL: REGEXP ya RLIKE (dono aliases hain)
SELECT name FROM users WHERE name REGEXP '^A.*e$';
SELECT name FROM users WHERE name RLIKE '^A.*e$';

-- SQL Server: native REGEXP nahi hai
-- Multiple LIKE patterns use karo, ya CLR integration enable karo regex ke liye
-- Workaround:
SELECT name FROM users WHERE name LIKE 'A%e' OR name LIKE 'A%e%';

-- Oracle: REGEXP_LIKE() function
SELECT name FROM users WHERE REGEXP_LIKE(name, '^A.*e$');
-- Oracle mein case-insensitive:
SELECT name FROM users WHERE REGEXP_LIKE(name, '^A.*e$', 'i');
```

---

## 🚫 IS NULL / IS NOT NULL

`NULL` ka matlab hai "unknown" ya "missing" — jaise koi order jisme delivery address hi register nahi hua. Tum `NULL` ko `=` ya `!=` se compare **nahi kar sakte** — ye comparisons hamesha `UNKNOWN` return karte hain, `TRUE` nahi.

```sql
-- GALAT: ye hamesha zero rows return karega
SELECT name FROM users WHERE email = NULL;

-- SAHI: IS NULL use karo
SELECT name FROM users WHERE email IS NULL;
-- Returns: Eve

-- SAHI: IS NOT NULL use karo
SELECT name FROM users WHERE email IS NOT NULL;
-- Returns: Alice, Bob, Carol, Dave
```

> [!tip]
> Yaad rakhne ka trick: NULL ek "pata nahi kya hai" wali value hai. `kuch = pata-nahi-kya` ka answer bhi "pata nahi" hi hoga — `TRUE` nahi. Isliye `= NULL` kabhi kaam nahi karta.

---

## 📅 Dates Filter Karna

Date filtering same comparison operators use karti hai, lekin "abhi ka time" nikalne ka function har database mein alag hai:

```sql
-- PostgreSQL / MySQL
SELECT * FROM orders WHERE created_at >= NOW();

-- Sab databases (SQL standard)
SELECT * FROM orders WHERE created_at >= CURRENT_TIMESTAMP;

-- SQL Server
SELECT * FROM orders WHERE created_at >= GETDATE();

-- Oracle
SELECT * FROM orders WHERE created_at >= SYSDATE;
```

**Date range filtering example:**

```sql
-- 2024 mein place kiye gaye orders
SELECT order_id, total
FROM   orders
WHERE  created_at >= '2024-01-01'
  AND  created_at <  '2025-01-01';
```

**Pichle N dino ka data filter karna** (jaise IRCTC pe "pichle 30 din ke tickets" dekhna):

```sql
-- PostgreSQL
SELECT * FROM orders WHERE created_at >= NOW() - INTERVAL '30 days';

-- MySQL
SELECT * FROM orders WHERE created_at >= NOW() - INTERVAL 30 DAY;

-- SQL Server
SELECT * FROM orders WHERE created_at >= DATEADD(DAY, -30, GETDATE());

-- Oracle
SELECT * FROM orders WHERE created_at >= SYSDATE - 30;
```

---

## 🔡 WHERE Clause Mein String Functions

`WHERE` conditions ke andar direct string functions call kar sakte ho.

### UPPER / LOWER

Sab jagah same tarah kaam karta hai:

```sql
SELECT name FROM users WHERE UPPER(name) = 'ALICE';
SELECT name FROM users WHERE LOWER(email) = 'alice@example.com';
```

### TRIM

Aage-peeche ka whitespace hata deta hai — sab major databases mein same syntax:

```sql
SELECT name FROM users WHERE TRIM(name) = 'Alice';
```

### LENGTH vs LEN

| Function       | PostgreSQL | MySQL | SQL Server | Oracle |
|----------------|-----------|-------|------------|--------|
| String length  | `LENGTH()` | `LENGTH()` | `LEN()` | `LENGTH()` |

```sql
-- PostgreSQL / MySQL / Oracle
SELECT name FROM users WHERE LENGTH(name) > 4;

-- SQL Server
SELECT name FROM users WHERE LEN(name) > 4;
```

### SUBSTRING vs SUBSTR

SQL standard hai `SUBSTRING(col FROM start FOR length)`. Zyadatar databases `SUBSTRING(col, start, length)` bhi accept karte hain.

| Function    | PostgreSQL | MySQL | SQL Server | Oracle |
|-------------|-----------|-------|------------|--------|
| Standard    | `SUBSTRING` | `SUBSTRING` | `SUBSTRING` | `SUBSTR` |
| Shorthand   | `SUBSTR` (alias) | `SUBSTR` (alias) | — | `SUBSTRING` (alias) |

```sql
-- PostgreSQL, MySQL, SQL Server mein chalta hai
SELECT name FROM users WHERE SUBSTRING(name, 1, 1) = 'A';

-- Oracle SUBSTR prefer karta hai
SELECT name FROM users WHERE SUBSTR(name, 1, 1) = 'A';
```

### REPLACE

Sab jagah same syntax:

```sql
-- Comparison ke liye email domains normalize karna
SELECT name FROM users
WHERE  REPLACE(email, '.net', '.com') LIKE '%@example.com';
```

---

## 🌍 Real-World Filtering Examples

### 1. User Search

Ek user search box mein "ali" type karta hai. Tumhe naam ya email dono mein match karna hai — bilkul jaise Flipkart ke search bar mein tum "ali" likho toh product naam aur description dono check hote hain:

```sql
-- PostgreSQL (case-insensitive, ILIKE se)
SELECT id, name, email
FROM   users
WHERE  name  ILIKE '%ali%'
  OR   email ILIKE '%ali%';

-- MySQL (LIKE already case-insensitive hai)
SELECT id, name, email
FROM   users
WHERE  name  LIKE '%ali%'
  OR   email LIKE '%ali%';

-- SQL Server
SELECT id, name, email
FROM   users
WHERE  name  LIKE '%ali%'  COLLATE Latin1_General_CI_AS
  OR   email LIKE '%ali%'  COLLATE Latin1_General_CI_AS;

-- Oracle
SELECT id, name, email
FROM   users
WHERE  UPPER(name)  LIKE UPPER('%ali%')
  OR   UPPER(email) LIKE UPPER('%ali%');
```

### 2. Date Range Report

Q1 2024 ke saare orders nikalo jinki value $100 se zyada hai — jaise CRED pe koi apna "high-value transactions" report banaye:

```sql
SELECT order_id, customer_id, total, created_at
FROM   orders
WHERE  created_at >= '2024-01-01'
  AND  created_at <  '2024-04-01'
  AND  total > 100
ORDER BY created_at DESC;
```

### 3. NULL-Safe Status Filtering

Un users ko dhoondo jo active hain ya jinka status set hi nahi hai:

```sql
SELECT name, status
FROM   users
WHERE  status = 'active'
  OR   status IS NULL;
```

### 4. Kuch Roles Ko Safely Exclude Karna

```sql
-- Safe NOT IN, jab list tum khud control karte ho (koi NULL nahi)
SELECT name FROM users
WHERE  role NOT IN ('admin', 'superuser');

-- Zyada safe pattern, jab subquery mein NULLs aa sakte hain
SELECT name FROM users u
WHERE  NOT EXISTS (
    SELECT 1 FROM restricted_roles r
    WHERE  r.role = u.role
);
```

---

## 🗝️ Key Takeaways

- `WHERE` grouping ya sorting se **pehle** rows filter karta hai
- `AND`, `OR` se zyada tight bindta hai — jab dono mix karo, hamesha parentheses lagao
- `IN` bahut saari `OR` conditions se zyada clean aur maintainable hai
- `NOT IN` with NULL — is combo se bacho, list mein NULL hone pe hamesha empty result deta hai
- `BETWEEN` dono ends inclusive hota hai; timestamps ke saath careful raho
- `LIKE` mein `%` = koi bhi characters, `_` = exactly ek character; case sensitivity database pe depend karti hai
- `NULL` check karne ke liye kabhi `= NULL` mat likho — hamesha `IS NULL` / `IS NOT NULL` use karo
- Dates ke liye portability chahiye toh `CURRENT_TIMESTAMP` use karo; date literals `'YYYY-MM-DD'` format mein likho
- `LENGTH` vs `LEN` — PostgreSQL/MySQL/Oracle mein `LENGTH`, SQL Server mein `LEN`

---

## 📝 Quiz

Khud test karo — answers neeche hain (chori mat karna!).

**Question 1:** Agar `email` column mein kuch rows ke liye NULL hai, toh ye query kya return karegi?

```sql
SELECT name FROM users WHERE email NOT IN ('a@b.com', NULL);
```

A) Un sab users ko jinka email `a@b.com` nahi hai
B) Zero rows
C) Ek error
D) Sirf un users ko jinka email NULL hai

---

**Question 2:** Tumhe woh saare products chahiye jinki price $20 se $80 ke beech mein hai (inclusive), AUR jinki category ya toh `'electronics'` ho ya `'books'`. Konsi query sahi hai?

A)
```sql
WHERE price BETWEEN 20 AND 80 AND category = 'electronics' OR category = 'books'
```

B)
```sql
WHERE price BETWEEN 20 AND 80 AND (category = 'electronics' OR category = 'books')
```

C)
```sql
WHERE price BETWEEN 20 AND 80 OR category IN ('electronics', 'books')
```

D) A aur B dono sahi hain

---

**Question 3:** PostgreSQL mein case-insensitive LIKE search karne ka sahi tareeka konsa hai?

A) `WHERE name LIKE '%alice%'`
B) `WHERE name ILIKE '%alice%'`
C) `WHERE name REGEXP '%alice%'`
D) `WHERE NOCASE(name) LIKE '%alice%'`

---

**Answers:**
1. **B** — Jab list mein NULL ho, `NOT IN` three-valued logic ki wajah se hamesha zero rows return karta hai.
2. **B** — Option A galat hai kyunki `AND`, `OR` se zyada tight bindta hai, matlab ye ban jaata hai `(... AND category = 'electronics') OR category = 'books'`. Parentheses zaruri hain.
3. **B** — PostgreSQL case-insensitive pattern matching ke liye `ILIKE` deta hai. Option A case-sensitive hai. Option C galat syntax use karta hai (PostgreSQL regex mein `~` use hota hai). Option D koi real function nahi hai.

---

*Agla chapter: Sorting and Limiting Results — ORDER BY, LIMIT/TOP/FETCH FIRST*
