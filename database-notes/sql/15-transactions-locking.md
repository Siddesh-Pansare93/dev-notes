# 15. Transactions and Locking in Practice

> **Level:** Beginner-friendly | **Databases covered:** PostgreSQL, MySQL, SQL Server, Oracle

---

## Transaction Kya Hota Hai?

Socho tum apne savings account se checking account mein ₹500 transfer kar rahe ho, jaise Paytm ya UPI se ek account se doosre mein paisa bhejna. Isme do steps hain:

1. Savings se ₹500 kaato.
2. Checking mein ₹500 daalo.

Ab agar step 1 ke baad, step 2 se pehle hi database crash ho jaaye toh? Tumhare ₹500 gayab — na yahaan na wahaan. Ye ek nightmare scenario hai. **Transaction** exactly isi problem ko solve karta hai — dono steps ko ek single all-or-nothing unit mein group kar deta hai. Ya toh dono ho, ya kuch bhi na ho. Beech mein kuch nahi.

Har transaction **ACID** properties follow karta hai:

| Property | Matlab |
|---|---|
| **A**tomicity | Sab steps successful, ya ek bhi nahi |
| **C**onsistency | Data ek valid state se doosri valid state mein jaata hai |
| **I**solation | Ek saath chal rahe transactions ek doosre ko disturb nahi karte |
| **D**urability | Ek baar commit ho gaya, toh crash ke baad bhi data safe rahega |

---

## Transaction Syntax

Ye ek aisi jagah hai jahan har database thoda alag syntax use karta hai — isliye dhyan se dekho.

```sql
-- PostgreSQL / MySQL
BEGIN;
  UPDATE accounts SET balance = balance - 500 WHERE id = 1;
  UPDATE accounts SET balance = balance + 500 WHERE id = 2;
COMMIT;

-- SQL Server
BEGIN TRANSACTION;
  UPDATE accounts SET balance = balance - 500 WHERE id = 1;
  UPDATE accounts SET balance = balance + 500 WHERE id = 2;
COMMIT TRANSACTION;

-- Oracle
-- BEGIN ki zaroorat nahi. Transaction pehle DML statement se hi implicitly shuru ho jaata hai.
UPDATE accounts SET balance = balance - 500 WHERE id = 1;
UPDATE accounts SET balance = balance + 500 WHERE id = 2;
COMMIT;
```

Agar transaction shuru hone ke baad se sab kuch undo karna ho:

```sql
-- PostgreSQL / MySQL
ROLLBACK;

-- SQL Server
ROLLBACK TRANSACTION;

-- Oracle
ROLLBACK;
```

---

## Savepoints — Partial Rollback

**Savepoint** transaction ke andar ek bookmark jaisa hota hai. Puri transaction cancel kiye bina, tum sirf ek specific point tak rollback kar sakte ho.

Isko aise socho — jaise Swiggy pe order karte waqt tum cart mein items add karte jaate ho. Agar ek item ka delivery address galat ho gaya, toh poora order cancel karne ki zaroorat nahi — sirf uss ek cheez ko revert karo.

```sql
-- PostgreSQL / MySQL / Oracle
BEGIN;
  INSERT INTO orders (product, qty) VALUES ('Widget', 10);
  SAVEPOINT after_order;

  INSERT INTO shipments (order_id, address) VALUES (99, '123 Main St');
  -- Shipment mein kuch gadbad ho gayi
  ROLLBACK TO SAVEPOINT after_order;

  -- Order wala INSERT abhi bhi zinda hai; sirf shipment rollback hua
COMMIT;

-- SQL Server alag keywords use karta hai
BEGIN TRANSACTION;
  INSERT INTO orders (product, qty) VALUES ('Widget', 10);
  SAVE TRANSACTION after_order;

  INSERT INTO shipments (order_id, address) VALUES (99, '123 Main St');
  ROLLBACK TRANSACTION after_order;  -- sirf savepoint tak rollback hota hai

COMMIT TRANSACTION;
```

> [!tip]
> `ROLLBACK TO SAVEPOINT` ke baad bhi transaction open hi rehta hai. Tumhe abhi bhi puri transaction ko `COMMIT` ya `ROLLBACK` karna hoga.

---

## Locking Kya Hai?

Jab bahut saare users ek saath database ko hit karte hain (socho Big Billion Days sale pe Flipkart), toh database ko data consistent rakhne ke liye **locks** ka use karna padta hai. Do fundamental lock types hote hain:

| Lock Type | Kaun hold kar sakta hai | Kisko block karta hai |
|---|---|---|
| **Shared (read) lock** | Bahut saare readers ek saath | Writers ko |
| **Exclusive (write) lock** | Sirf ek writer | Sab readers aur writers ko |

Normally database khud hi automatically locks lagata aur hataata hai. Lekin kabhi-kabhi tumhe locking pe manual control chahiye hota hai.

---

## SELECT FOR UPDATE — Jinhe Modify Karna Hai Unhe Lock Karo

Kyun zaruri hai? Jab tum ek row read karte ho aur usko update karne ka plan hai, toh tumhare `SELECT` aur `UPDATE` ke beech koi doosra transaction wo row change kar sakta hai. `SELECT FOR UPDATE` read time pe hi row par exclusive lock laga deta hai — taaki koi aur usse chhed na sake.

Ye bilkul Ola/Uber cab booking jaisa hai — jaise hi ek driver ne ride accept karne ki koshish shuru ki, uss ride ko turant "locked" kar do taaki doosra driver usi ride ko accept na kar le.

```sql
-- PostgreSQL / Oracle / MySQL
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- Row ab lock ho chuki hai. Koi aur transaction jo isi row pe SELECT FOR UPDATE karega, wait karega.
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;

-- SQL Server query hints use karta hai
BEGIN TRANSACTION;
SELECT balance FROM accounts WITH (UPDLOCK, ROWLOCK) WHERE id = 1;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT TRANSACTION;
```

---

## SELECT FOR SHARE — Reading Ke Liye Lock

Kabhi-kabhi tumhe kehna hota hai: "Main ye row padh raha hoon, jab tak khatam na ho koi isse change na kare — lekin doosre readers padh sakte hain, koi dikkat nahi."

```sql
-- PostgreSQL
SELECT * FROM products WHERE id = 42 FOR SHARE;

-- MySQL
SELECT * FROM products WHERE id = 42 LOCK IN SHARE MODE;

-- SQL Server (HOLDLOCK hint jo transaction ke end tak shared lock hold karta hai)
SELECT * FROM products WITH (HOLDLOCK, ROWLOCK) WHERE id = 42;

-- Oracle
-- Oracle mein SELECT FOR SHARE ka direct equivalent nahi hai;
-- exclusive locking chahiye toh FOR UPDATE use karo, ya reads ke liye MVCC pe rely karo.
```

---

## SKIP LOCKED — Job Queue Pattern

Socho ek jobs table hai jaha multiple worker processes queue se tasks utha rahe hain — bilkul Zomato ke delivery partners jaise, jo ek pool se orders pick karte hain. Bina special handling ke, do workers ek hi job pakad sakte hain — dono confuse ho jayenge. `SKIP LOCKED` database ko bolta hai: "Mujhe wo row do jo **kisi aur ne lock nahi ki hui**, aur locked rows ko seedha skip kar do."

```sql
-- PostgreSQL / MySQL 8+ / Oracle / SQL Server 2019+
BEGIN;
SELECT id, payload
FROM jobs
WHERE status = 'pending'
ORDER BY created_at
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- Yahan job process karo...
UPDATE jobs SET status = 'done' WHERE id = :fetched_id;
COMMIT;
```

Ye pattern PostgreSQL, MySQL 8+, Oracle, aur SQL Server — sabme bilkul same tarike se kaam karta hai. Cross-database compatibility ka ek rare example.

> [!info]
> **Kyun zaruri hai:** `SKIP LOCKED` ke bina, saare workers ek doosre ke locks release hone ka wait karte reh jaate — jaise traffic jam. Isse har worker turant agli available job pe move kar jaata hai.

---

## NOWAIT — Wait Karne Ke Bajaye Turant Fail Ho Jao

Default behaviour ye hai — agar row locked hai, toh tumhari query lock release hone tak wait karti hai. `NOWAIT` ye badal deta hai: agar row already locked hai, toh wait karne ke bajaye turant error de do.

```sql
-- PostgreSQL / MySQL 8+ / Oracle
SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;
-- Error: could not obtain lock on row in relation "accounts"

-- SQL Server
SELECT * FROM accounts WITH (UPDLOCK, ROWLOCK, NOWAIT) WHERE id = 1;
```

`NOWAIT` tab use karo jab waiting se user experience aur bhi kharab ho jaaye — jaise CRED app mein agar payment lock ho, toh "try again" dikhana behtar hai bajaye user ko forever spinner dikhane ke.

---

## Table Locks — Sambhal Ke Use Karo

Row-level locks fine-grained hote hain aur usually yehi chahiye hota hai. Kabhi-kabhi puri table lock karni padti hai — jaise bulk load ya schema migration ke waqt.

```sql
-- PostgreSQL
LOCK TABLE products IN EXCLUSIVE MODE;

-- MySQL
LOCK TABLES products WRITE;
-- (kaam khatam hone pe unlock karna mat bhoolna)
UNLOCK TABLES;

-- SQL Server
SELECT * FROM products WITH (TABLOCKX);  -- TABLOCKX = exclusive table lock

-- Oracle
LOCK TABLE products IN EXCLUSIVE MODE;
```

> [!warning]
> Table locks sabhi concurrent readers aur writers ko block kar dete hain. Production mein, ek busy table pe table lock lagane se timeouts ka cascade ho sakta hai — jaise ek chhoti si dikkat poore system ko slow kar de. Jahan tak ho sake, row-level locks hi use karo.

---

## Deadlocks

**Deadlock** tab hota hai jab do transactions ek doosre ke pass jo lock hai uska wait kar rahe hote hain — aur dono hi aage nahi badh sakte. Bilkul do log ek narrow gali mein aamne-saamne aa jaayein aur koi peeche hatne ko taiyaar na ho.

**Example:**

| Time | Transaction A | Transaction B |
|---|---|---|
| T1 | Row 1 lock kiya | Row 2 lock kiya |
| T2 | Row 2 lock karne ki koshish — **wait** | Row 1 lock karne ki koshish — **wait** |
| T3 | Hamesha ke liye stuck | Hamesha ke liye stuck |

**Detection aur Resolution**

Saare major databases lock-wait graph mein cycles dhoond kar deadlocks automatically detect kar lete hain. Jab deadlock milta hai, database ek transaction ko "victim" chun kar rollback kar deta hai, taaki doosra aage badh sake. Tumhari application ko error milega aur usse transaction retry karni chahiye.

**Prevention Strategies**

1. **Tables aur rows ko hamesha same order mein access karo.** Agar Transaction A hamesha `accounts` ko `orders` se pehle lock karta hai, aur Transaction B bhi wahi order follow karta hai, toh dono kabhi deadlock nahi karenge.

2. **Transactions short rakho.** Jitni der transaction locks hold karega, deadlock ka chance utna zyada.

3. **`SELECT FOR UPDATE` shuru mein hi karo.** Transaction ke start mein hi sab zaroori locks le lo, beech-beech mein bikhraao mat.

4. **Jab safe ho toh lower isolation levels use karo** (agla section dekho) — kam locks matlab kam deadlocks.

**Lock Timeout Settings**

Hamesha ke liye wait karne ke bajaye, ek timeout set karo jiske baad blocked lock attempt error de de:

```sql
-- PostgreSQL
SET lock_timeout = '5s';

-- MySQL
SET innodb_lock_wait_timeout = 5;  -- seconds

-- SQL Server
SET LOCK_TIMEOUT 5000;  -- milliseconds

-- Oracle
-- Statement pe seedha WAIT clause use karo
SELECT * FROM accounts WHERE id = 1 FOR UPDATE WAIT 5;
```

---

## Isolation Levels — Practical Nazariya

Isolation levels control karte hain ki ek transaction doosre **concurrent** transactions ka kitna dekh sakta hai. Zyada isolation = zyada safety, zyada locking, kam concurrency. Kam isolation = zyada concurrency, lekin zyada anomalies possible.

### Chaar Standard Levels

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|---|---|---|---|
| READ UNCOMMITTED | Possible | Possible | Possible |
| READ COMMITTED | Safe | Possible | Possible |
| REPEATABLE READ | Safe | Safe | Possible (MySQL: safe) |
| SERIALIZABLE | Safe | Safe | Safe |

**Dirty Read:** Tumne aisa data padh liya jo ek doosre uncommitted transaction ne likha tha. Agar wo transaction rollback ho jaaye, toh tumne aisa data padha jo kabhi officially exist hi nahi kiya.

**Non-Repeatable Read:** Ek hi transaction ke andar tum ek row do baar padhte ho aur alag values milti hain, kyunki beech mein kisi doosre transaction ne change commit kar diya.

**Phantom Read:** Tum same query do baar run karte ho aur alag rows milti hain, kyunki beech mein kisi ne insert ya delete kar diya jo tumhare filter se match karta hai.

### Isolation Level Set Karna

```sql
-- PostgreSQL
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- ... tumhari queries ...
COMMIT;

-- MySQL
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
BEGIN;
-- ... tumhari queries ...
COMMIT;

-- SQL Server
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN TRANSACTION;
-- ... tumhari queries ...
COMMIT TRANSACTION;

-- Oracle
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- ... tumhari queries ...
COMMIT;
```

> [!info]
> **Defaults:** PostgreSQL = READ COMMITTED. MySQL InnoDB = REPEATABLE READ. SQL Server = READ COMMITTED. Oracle = READ COMMITTED.

### Practical Demonstration

```sql
-- Session A: REPEATABLE READ
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT COUNT(*) FROM products WHERE category = 'Electronics';
-- Returns: 42

-- Session B (concurrent): naya electronics product insert karke commit karta hai
INSERT INTO products (name, category) VALUES ('New Gadget', 'Electronics');
COMMIT;

-- Session A: wahi query dobara
SELECT COUNT(*) FROM products WHERE category = 'Electronics';
-- PostgreSQL/MySQL REPEATABLE READ: abhi bhi 42 aayega (phantom rok diya)
-- SQL Server READ COMMITTED: 43 aayega (phantom dikh jaayega)
COMMIT;
```

---

## Advisory Locks (Sirf PostgreSQL Mein)

PostgreSQL ka ek unique feature hai **advisory locks** — application-level locks jo kisi bhi table row se bandhe nahi hote. Tum khud ek lock ID (koi bhi integer) invent karte ho, aur usse different processes ke beech coordination ke liye use karte ho.

Isko aise socho — jaise IRCTC pe ek scheduled cron job hai jo tickets confirm karta hai, aur tumhare paas do servers chal rahe hain. Tumhe ye ensure karna hai ki dono servers ek hi time pe wahi job na chala dein. Advisory lock isi kaam aata hai — bina koi extra "jobs-lock" table banaye.

```sql
-- Advisory lock lene ki koshish (non-blocking, true/false return karta hai)
SELECT pg_try_advisory_lock(12345);
-- true agar lock mil gaya, false agar koi aur session pehle se hold kar raha hai

-- Blocking ke saath acquire karo (available hone tak wait karta hai)
SELECT pg_advisory_lock(12345);

-- Lock release karo
SELECT pg_advisory_unlock(12345);

-- Session-level lock (session disconnect hone pe release ho jaata hai)
SELECT pg_advisory_lock(42);

-- Transaction-level lock (COMMIT/ROLLBACK pe automatically release)
SELECT pg_try_advisory_xact_lock(42);
```

**Use case:** Do application servers ko ek hi scheduled job simultaneously run karne se rokna, bina koi dedicated jobs-lock table banaye.

---

## Real-World Examples

### Bank Transfer with Proper Transaction

```sql
-- PostgreSQL / MySQL mein kaam karta hai (SQL Server / Oracle ke liye BEGIN syntax adapt karo)
BEGIN;

-- Deadlock rokne ke liye dono rows pehle hi lock karo (hamesha ID order mein lock karo)
SELECT id, balance FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;

-- Sufficient funds check karo
-- (application yahan result check karti hai aage badhne se pehle)

UPDATE accounts SET balance = balance - 500 WHERE id = 1;
UPDATE accounts SET balance = balance + 500 WHERE id = 2;

-- Transfer record karo
INSERT INTO transfer_log (from_id, to_id, amount, transferred_at)
VALUES (1, 2, 500, NOW());

COMMIT;
-- Kisi bhi error pe: ROLLBACK;
```

### Job Queue with SKIP LOCKED

```sql
-- Worker process ek pending job pick karta hai bina doosre workers ko block kiye
BEGIN;

SELECT id, payload, retry_count
FROM job_queue
WHERE status = 'pending'
  AND scheduled_at <= NOW()
ORDER BY priority DESC, scheduled_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- Agar row mil gayi, toh usse in-progress mark karo
UPDATE job_queue
SET status = 'processing', started_at = NOW(), worker_id = :my_worker_id
WHERE id = :fetched_id;

COMMIT;
-- Worker ab job_queue row :fetched_id ko independently process karega
```

### Optimistic Locking with a Version Column

Read time pe rows lock karne ke bajaye, **optimistic locking** write time pe conflicts detect karta hai. Ye tab useful hai jab conflicts rare hote hain aur tumhe maximum read concurrency chahiye — jaise BigBasket pe product ka stock count, jise bahut saare log padhte hain lekin kam log update karte hain.

```sql
-- 1. Row padho aur version note karo
SELECT id, balance, version FROM accounts WHERE id = 1;
-- Returns: id=1, balance=1000, version=7

-- 2. Update SIRF tabhi karo jab version na badla ho (matlab kisi aur ne edit nahi kiya)
UPDATE accounts
SET balance = balance - 100,
    version = version + 1       -- version badhao
WHERE id = 1
  AND version = 7;              -- optimistic check

-- 3. Check karo kitni rows update hui
-- Agar 0 rows update hui: kisi aur ne row change kar di — retry karo ya conflict error dikhao
-- Agar 1 row update hui: success
```

Is approach mein reads ke liye zero extra locks chahiye, lekin application code mein "0 rows updated" wala case handle karna zaroori hai.

---

## Key Takeaways

- **Transaction** SQL statements ko ek all-or-nothing unit mein group karta hai. Jab bhi related data ek saath modify karo, `BEGIN` / `COMMIT` (ya database-specific equivalent) use karo.
- **Savepoints** se tum transaction ka ek part rollback kar sakte ho, bina savepoint se pehle kiya gaya kaam kho ke.
- **Shared locks** bahut saare readers ko allow karte hain; **exclusive locks** sirf ek writer ko allow karte hain aur baaki sabko block karte hain.
- `SELECT FOR UPDATE` un rows ko lock karne ka go-to tool hai jinhe tum modify karne wale ho.
- `SKIP LOCKED` aur `NOWAIT` respectively job queues aur fast-fail scenarios ke liye power tools hain.
- **Deadlocks** automatically detect aur resolve ho jaate hain, lekin phir bhi tumhe transactions ko consistent order mein resources access karne jaisa design karna chahiye.
- **Isolation levels** concurrency aur correctness ke beech trade-off karte hain. Default (usually READ COMMITTED) se shuru karo, aur REPEATABLE READ ya SERIALIZABLE pe tabhi jao jab real anomalies dikhein.
- PostgreSQL ke **advisory locks** tumhe application-level coordination dete hain, bina data tables ko chhue.

---

## Quiz

**Q1.** Tumne `SELECT balance FROM accounts WHERE id = 5 FOR UPDATE` run kiya aur phir decide kiya ki kuch change nahi karna. Ab kya karna chahiye?

A) Kuch nahi — SELECT ke baad lock automatically release ho jaata hai.
B) `ROLLBACK` ya `COMMIT` run karo transaction khatam karke lock release karne ke liye.
C) `UNLOCK ROW 5` run karo.

**Q2.** Do workers `job_queue` table se jobs pull kar rahe hain. Worker A ne row 101 lock kar di. Worker B `SELECT ... FOR UPDATE SKIP LOCKED` run karta hai. Worker B ke perspective se row 101 ka kya hoga?

A) Worker B wait karega jab tak Worker A lock release nahi karta.
B) Worker B ko turant error milega.
C) Worker B row 101 skip karke agli available unlocked row pick karega.

**Q3.** Tum `REPEATABLE READ` isolation pe ho aur same transaction ke andar `SELECT COUNT(*)` query do baar run karte ho. Dono queries ke beech, doosra session ek matching row insert karke commit kar deta hai. PostgreSQL mein doosri baar tumhe kya count dikhega?

A) Naya, zyada count — kyunki doosre session ne commit kar diya.
B) Original count — kyunki REPEATABLE READ PostgreSQL mein phantom reads rokta hai.
C) Error — kyunki data change ho gaya.

**Answers:** Q1 = B, Q2 = C, Q3 = B

---

*Next chapter: Indexes and Query Performance*
