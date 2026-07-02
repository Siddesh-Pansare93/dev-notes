# ⚡ Triggers

## Trigger hota kya hai?

Ek **trigger** basically code ka ek block hai jo **automatically** run ho jaata hai jab table pe koi specific event hota hai — `INSERT`, `UPDATE`, ya `DELETE`. Tumhe trigger ko manually call nahi karna padta, database khud hi peeche se fire kar deta hai.

Isko aise socho jaise tumhare **database ka webhook** ho: *"Jab X ho jaaye, tab automatically Y kar do."*

Jaise GitHub webhook fire hota hai jab koi code push karta hai, waise hi database trigger fire hota hai jab bhi koi row change hoti hai. Magic yeh hai ki yeh sab database engine ke andar hi ho jaata hai — application code ki zaroorat hi nahi padti.

```
Event occurs (INSERT / UPDATE / DELETE)
          |
          v
   Database Engine
          |
          +---> Fires the Trigger
          |
          v
   Your trigger logic runs automatically
```

---

## 🎯 Triggers kyun use karte hain? Common Use Cases

Kaunse real-life scenarios mein trigger kaam aata hai? Kuch common examples dekh lo:

| Use Case | Trigger Kya Karta Hai |
|---|---|
| **Audit logging** | Record karta hai ki kisne kaunsa row kab change kiya |
| **Auto-updating timestamps** | Har update pe `updated_at = NOW()` set karta hai |
| **Business rules enforce karna** | Aisa invalid data reject karta hai jo sirf constraints se nahi pakड़ा ja sakta |
| **Data sync / derived data** | Ek summary table ko detail rows ke saath sync rakhta hai |
| **Soft delete enforcement** | Row ko delete karne ke bajaye archive kar deta hai |

---

## 🏗️ Trigger ki Anatomy

Logic likhne se pehle, har trigger ke liye teen key decisions lene padte hain:

### 1. Kab fire hoga? (Timing)

| Timing | Matlab |
|---|---|
| `BEFORE` | Data change table mein likhe jaane **se pehle** run hota hai. Tum incoming row ko abhi bhi modify kar sakte ho. |
| `AFTER` | Data change table mein commit hone **ke baad** run hota hai. Row already save ho chuki hai. |
| `INSTEAD OF` | Original operation ko poori tarah replace kar deta hai. Mostly **views** pe use hota hai. |

**Rule of thumb:**
- `BEFORE` use karo jab tumhe incoming data ko **modify ya validate** karna ho (jaise `updated_at` auto-set karna).
- `AFTER` use karo jab tumhe change pe **react** karna ho (jaise audit table mein likhna).
- `INSTEAD OF` use karo jab tumhe kisi **non-updatable view** pe operations intercept karne hon.

### 2. Kaunsa event trigger karega?

`INSERT`, `UPDATE`, `DELETE`, ya inka combination jaise `INSERT OR UPDATE`.

### 3. Row-level vs. Statement-level

| Level | Kab Fire Hota Hai | OLD/NEW Access |
|---|---|---|
| **Row-level** (`FOR EACH ROW`) | Har affected row ke liye ek baar | Haan — individual rows read/modify kar sakte ho |
| **Statement-level** (`FOR EACH STATEMENT`) | Har SQL statement ke liye ek baar, chahe kitni bhi rows affect hui ho | Nahi — sirf poore statement ko ek unit ki tarah dekh sakte ho |

**Example samjho:** Agar tum `UPDATE users SET status = 'active' WHERE country = 'US'` run karte ho aur 500 rows match hoti hain:
- Ek **row-level** trigger **500 baar** fire hoga (har row ke liye ek baar).
- Ek **statement-level** trigger sirf **ek baar** fire hoga.

> **Beginner tip:** Row-level triggers zyada common hote hain. Statement-level triggers ka use sirf batch-level logging ya auditing ke liye karo.

---

## 🔗 OLD aur NEW Row References

Jab trigger kisi row change pe fire hota hai, tum row ke **pehle** aur **baad** wale version dono inspect kar sakte ho:

| Operation | OLD | NEW |
|---|---|---|
| `INSERT` | Available nahi hai | Naya row jo insert ho raha hai |
| `UPDATE` | Row jaisa pehle tha | Row jaisa baad mein hoga |
| `DELETE` | Row jo delete ho raha hai | Available nahi hai |

Inko access karne ka syntax database ke hisaab se alag hota hai:

| Database | Before-image | After-image |
|---|---|---|
| PostgreSQL | `OLD.column_name` | `NEW.column_name` |
| MySQL | `OLD.column_name` | `NEW.column_name` |
| SQL Server | `deleted` table (virtual) | `inserted` table (virtual) |
| Oracle | `:OLD.column_name` | `:NEW.column_name` |

> **SQL Server quirk:** Row references ki jagah, SQL Server tumhe do virtual tables deta hai — `inserted` (naye/updated rows ke liye) aur `deleted` (purane/deleted rows ke liye) — jo us statement ke saare affected rows rakhte hain.

---

## 📝 Cross-DB Syntax: `updated_at` ko Auto-Update Karna

Yeh sabse common real-world trigger hai. Goal simple hai: jab bhi `users` table ka koi row update ho, `updated_at` ko current time se stamp kar do — bina application code pe depend kiye.

```sql
-- PostgreSQL (two-step: function first, then trigger)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

```sql
-- MySQL (single statement, logic inline)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  SET NEW.updated_at = NOW();
```

```sql
-- SQL Server (AFTER trigger; uses the virtual inserted table to target changed rows)
CREATE TRIGGER set_updated_at
ON users
AFTER UPDATE AS
BEGIN
  UPDATE users
  SET updated_at = GETDATE()
  WHERE id IN (SELECT id FROM inserted);
END;
```

```sql
-- Oracle (colon prefix on :NEW, semicolon-terminated block)
CREATE OR REPLACE TRIGGER set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
BEGIN
  :NEW.updated_at := SYSDATE;
END;
```

**Ek nazar mein key differences:**

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| Trigger logic kahan rehta hai | Separate function | Inline | Inline `BEGIN...END` mein | Inline `BEGIN...END` mein |
| Timing | `BEFORE UPDATE` | `BEFORE UPDATE` | `AFTER UPDATE` | `BEFORE UPDATE` |
| Row reference syntax | `NEW.col` | `NEW.col` | `inserted` table | `:NEW.col` |
| Current timestamp | `NOW()` | `NOW()` | `GETDATE()` | `SYSDATE` |

---

## 📋 Poora Example: Audit Log Trigger

**Scenario samjho:** Tumhare paas `users` table hai. Jab bhi koi user row update ho, tumhe old email, new email, kisne change kiya, aur kab — yeh sab ek alag `users_audit` table mein record karna hai.

**Setup (sab DBs mein same):**

```sql
CREATE TABLE users_audit (
  audit_id     INT PRIMARY KEY AUTO_INCREMENT,  -- Use SERIAL in PostgreSQL, IDENTITY in SQL Server, SEQUENCE in Oracle
  user_id      INT,
  old_email    VARCHAR(255),
  new_email    VARCHAR(255),
  changed_at   TIMESTAMP,
  changed_by   VARCHAR(100)
);
```

---

```sql
-- PostgreSQL
CREATE OR REPLACE FUNCTION log_user_email_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if email actually changed
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    INSERT INTO users_audit (user_id, old_email, new_email, changed_at, changed_by)
    VALUES (OLD.id, OLD.email, NEW.email, NOW(), current_user);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_user_email
  AFTER UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION log_user_email_change();
```

---

```sql
-- MySQL
DELIMITER $$

CREATE TRIGGER audit_user_email
  AFTER UPDATE ON users
  FOR EACH ROW
BEGIN
  IF OLD.email <> NEW.email THEN
    INSERT INTO users_audit (user_id, old_email, new_email, changed_at, changed_by)
    VALUES (OLD.id, OLD.email, NEW.email, NOW(), CURRENT_USER());
  END IF;
END$$

DELIMITER ;
```

---

```sql
-- SQL Server
CREATE TRIGGER audit_user_email
ON users
AFTER UPDATE AS
BEGIN
  -- inserted holds the new row, deleted holds the old row
  INSERT INTO users_audit (user_id, old_email, new_email, changed_at, changed_by)
  SELECT
    d.id,
    d.email,
    i.email,
    GETDATE(),
    SYSTEM_USER
  FROM inserted i
  JOIN deleted d ON i.id = d.id
  WHERE i.email <> d.email;  -- Only when email actually changed
END;
```

---

```sql
-- Oracle
CREATE OR REPLACE TRIGGER audit_user_email
  AFTER UPDATE ON users
  FOR EACH ROW
BEGIN
  IF :OLD.email <> :NEW.email THEN
    INSERT INTO users_audit (user_id, old_email, new_email, changed_at, changed_by)
    VALUES (:OLD.id, :OLD.email, :NEW.email, SYSDATE, SYS_CONTEXT('USERENV', 'SESSION_USER'));
  END IF;
END;
```

---

## 🚫 Triggers se kab BACHNA chahiye

Triggers powerful hote hain, lekin SQL ke sabse zyada **misuse** hone waale features mein se bhi ek hain. Kab do baar sochna chahiye, dekho:

### 1. Hidden Logic (Debugging ka nightmare)
Triggers invisibly run hote hain. Jo developer ko pata hi nahi ki trigger exist karta hai, woh confuse ho jaayega jab ek simple `UPDATE` se unexpected side effects aa jaayenge. **"Yeh audit table mein rows kyun aa rahi hain? Maine toh koi audit function call hi nahi kiya!"** — yeh ek classic trigger mystery hai.

### 2. Scale pe Performance Surprises
Ek row-level trigger har row ke liye ek baar fire hota hai. Bulk operations jaise `INSERT INTO orders SELECT * FROM staging`, jo lakhon rows affect karte hain, trigger ko lakhon baar fire karwa dete hain — ek fast bulk operation ko bahut slow bana dete hain. Jaise Swiggy pe ek saath 10 lakh orders ka batch import karo aur har order pe alag se ek "notification trigger" fire ho jaaye — system crawl karne lagega.

### 3. Cascading Trigger Chains
Trigger A fire hota hai, jo table B ko update karta hai, jo Trigger B ko fire karta hai, jo table C ko update karta hai... Yeh chains debug karna almost namumkin ho jaata hai aur deadlocks ya infinite loops bhi create kar sakte hain.

### 4. Portability Problems
Trigger syntax SQL ka sabse kam standardized part hai (jaisa upar dekha bhi). PostgreSQL ke liye likha gaya trigger MySQL pe bina bade rewrite ke nahi chalega.

### 5. Testing Difficulty
Application code ke unit tests seedhe hote hain. Trigger behavior test karne ke liye ek real (ya realistic mock) database chahiye hota hai, jisse CI pipelines complicated ho jaate hain.

**Behtar alternatives jo consider kar sakte ho:**

| Iske liye trigger use karne ke bajaye... | Yeh try karo... |
|---|---|
| `updated_at` timestamps | Application-layer ORM hooks (jaise SQLAlchemy events, ActiveRecord callbacks) |
| Audit logging | Dedicated audit library ya application service |
| Business rules | Jahan possible ho, database constraints (`CHECK`, `NOT NULL`, foreign keys) |
| Data sync | Application code mein explicit transactions |

> **Rule of thumb:** Triggers ka use us logic ke liye karo jo *zaroor* database level pe hi rehna chahiye — jaise jab multiple alag applications same table pe likhte hon aur tum bharosa nahi kar sakte ki sabhi apne end pe rule enforce karenge.

---

## Key Takeaways

- Trigger woh code hai jo `INSERT`, `UPDATE`, ya `DELETE` ke response mein **automatically** fire hota hai — bilkul tumhare database ke andar ek webhook jaisa.
- Incoming data **modify/validate** karne ke liye `BEFORE` choose karo; committed changes pe **react** karne ke liye `AFTER` choose karo.
- **Row-level** triggers (`FOR EACH ROW`) har affected row ke liye ek baar fire hote hain aur `OLD`/`NEW` values ka access dete hain. **Statement-level** triggers har SQL statement ke liye ek baar fire hote hain.
- OLD/NEW ka syntax PostgreSQL aur MySQL mein `OLD.col` / `NEW.col` hai, Oracle mein `:OLD.col` / `:NEW.col`, aur SQL Server mein `deleted`/`inserted` virtual tables.
- PostgreSQL mein trigger banane se pehle ek **separate trigger function** PL/pgSQL mein likhna padta hai — baaki major databases inline logic allow karte hain.
- Triggers powerful hain lekin risky bhi: yeh logic ko chhupate hain, bulk-load performance ko hurt karte hain, aur debug karne mein mushkil chains create karte hain. Jab tak logic genuinely database mein hi rehna zaroori na ho, application-layer solutions ko priority do.

---

## Quiz

**Question 1.**
Tumhe chahiye ki jaise hi koi naya row insert ho, uss waqt automatically `created_at` timestamp set ho jaaye. Tum `BEFORE INSERT` use karoge ya `AFTER INSERT`, aur kyun?

> **Answer:** `BEFORE INSERT`. Kyunki trigger row save hone se pehle run hota hai, tum `NEW.created_at` ko modify kar sakte ho aur database tumhari value ko original insert ke part ke roop mein save kar dega. `AFTER INSERT` ke saath, row already save ho chuki hoti hai aur tumhe value change karne ke liye ek extra `UPDATE` statement chalana padega.

---

**Question 2.**
SQL Server mein, jab ek `UPDATE` trigger fire hota hai, tum kisi column ki old value aur usi column ki new value kaise access karoge?

> **Answer:** SQL Server trigger body ke andar do virtual tables provide karta hai: `deleted` (jo row ko update se pehle jaisi thi waisi rakhta hai) aur `inserted` (jo row ko update ke baad jaisi hai waisi rakhta hai). Old aur new values ko side-by-side compare karne ke liye tum inhe primary key pe join karte ho — jaise `JOIN deleted d ON i.id = d.id`.

---

**Question 3.**
Ek colleague suggest karta hai ki ek high-traffic `events` table pe, jo per minute 50,000 inserts receive karta hai, ek row-level `AFTER INSERT` trigger add kar dein. Trigger har insert ke liye `events_audit` table mein ek row likhega. Tumhe kaunsi potential problem raise karni chahiye?

> **Answer:** Scale pe performance problem. Ek row-level trigger **har row ke liye ek baar** fire hota hai, toh per minute 50,000 inserts ka matlab hai trigger ki wajah se per minute 50,000 extra writes. Isse database ka write load double ho jaata hai aur I/O saturate ho sakta hai, lock contention badh sakti hai, aur primary insert pipeline slow ho sakti hai. Behtar approach ho sakta hai asynchronous audit logging via message queue, ek CDC (Change Data Capture) tool, ya application layer se batched audit writes.
