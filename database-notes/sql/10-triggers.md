# ⚡ Triggers

## What is a Trigger?

A **trigger** is a block of code that runs **automatically** when a specific event happens on a table — an `INSERT`, `UPDATE`, or `DELETE`. You don't call a trigger manually; the database fires it on your behalf.

Think of it like a **webhook on your database**: *"When X happens, automatically do Y."*

Just as a GitHub webhook fires a notification whenever someone pushes code, a database trigger fires a SQL routine whenever a row changes. The magic is that it happens inside the database engine itself — no application code required.

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

## 🎯 Why Use Triggers? Common Use Cases

| Use Case | What the Trigger Does |
|---|---|
| **Audit logging** | Records who changed what row and when |
| **Auto-updating timestamps** | Sets `updated_at = NOW()` on every update |
| **Enforcing business rules** | Rejects invalid data that constraints alone can't catch |
| **Data sync / derived data** | Keeps a summary table in sync with detail rows |
| **Soft delete enforcement** | Archives a row instead of deleting it |

---

## 🏗️ Trigger Anatomy

Every trigger has three key decisions to make before writing a single line of logic:

### 1. When does it fire? (Timing)

| Timing | Meaning |
|---|---|
| `BEFORE` | Runs *before* the data change is written to the table. You can still modify the incoming row. |
| `AFTER` | Runs *after* the data change is committed to the table. The row is already saved. |
| `INSTEAD OF` | Replaces the original operation entirely. Used mainly on **views**. |

**Rule of thumb:**
- Use `BEFORE` when you want to **modify or validate** the incoming data (e.g., auto-set `updated_at`).
- Use `AFTER` when you want to **react** to the change (e.g., write to an audit table).
- Use `INSTEAD OF` when you need to intercept operations on a **non-updatable view**.

### 2. What event triggers it?

`INSERT`, `UPDATE`, `DELETE`, or a combination like `INSERT OR UPDATE`.

### 3. Row-level vs. Statement-level

| Level | Fires | Access to OLD/NEW |
|---|---|---|
| **Row-level** (`FOR EACH ROW`) | Once per affected row | Yes — you can read/modify individual rows |
| **Statement-level** (`FOR EACH STATEMENT`) | Once per SQL statement, regardless of how many rows | No — only sees the statement as a whole |

**Example:** If you run `UPDATE users SET status = 'active' WHERE country = 'US'` and 500 rows match:
- A **row-level** trigger fires **500 times** (once per row).
- A **statement-level** trigger fires **once**.

> **Beginner tip:** Row-level triggers are far more common. Use statement-level triggers only for logging or auditing at the batch level.

---

## 🔗 OLD and NEW Row References

When a trigger fires on a row change, you can inspect the **before** and **after** versions of the row:

| Operation | OLD | NEW |
|---|---|---|
| `INSERT` | Not available | The new row being inserted |
| `UPDATE` | The row as it was before | The row as it will be after |
| `DELETE` | The row being deleted | Not available |

The syntax for accessing these differs by database:

| Database | Before-image | After-image |
|---|---|---|
| PostgreSQL | `OLD.column_name` | `NEW.column_name` |
| MySQL | `OLD.column_name` | `NEW.column_name` |
| SQL Server | `deleted` table (virtual) | `inserted` table (virtual) |
| Oracle | `:OLD.column_name` | `:NEW.column_name` |

> **SQL Server quirk:** Instead of row references, SQL Server gives you two virtual tables — `inserted` (for new/updated rows) and `deleted` (for old/deleted rows) — that contain all affected rows for that statement.

---

## 📝 Cross-DB Syntax: Auto-Updating `updated_at`

This is the most common real-world trigger. The goal: every time a row in `users` is updated, automatically stamp `updated_at` with the current time without relying on application code.

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

**Key differences at a glance:**

| Feature | PostgreSQL | MySQL | SQL Server | Oracle |
|---|---|---|---|---|
| Trigger logic lives | Separate function | Inline | Inline in `BEGIN...END` | Inline in `BEGIN...END` |
| Timing | `BEFORE UPDATE` | `BEFORE UPDATE` | `AFTER UPDATE` | `BEFORE UPDATE` |
| Row reference syntax | `NEW.col` | `NEW.col` | `inserted` table | `:NEW.col` |
| Current timestamp | `NOW()` | `NOW()` | `GETDATE()` | `SYSDATE` |

---

## 📋 Full Example: Audit Log Trigger

**Scenario:** You have a `users` table. Whenever a user row is updated, you want to record the old email, new email, who changed it, and when — in a separate `users_audit` table.

**Setup (same across all DBs):**

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

## 🚫 When to AVOID Triggers

Triggers are powerful, but they are also one of the most **misused** features in SQL. Here is when you should think twice:

### 1. Hidden Logic (Debugging Nightmares)
Triggers run invisibly. A developer who doesn't know a trigger exists will be baffled when a simple `UPDATE` produces unexpected side effects. **"Why is this audit table getting rows? I never called any audit function!"** — a classic trigger mystery.

### 2. Performance Surprises at Scale
A row-level trigger fires once per row. Bulk operations like `INSERT INTO orders SELECT * FROM staging` that affect millions of rows will fire the trigger millions of times, turning a fast bulk operation into a very slow one.

### 3. Cascading Trigger Chains
Trigger A fires, which updates table B, which fires Trigger B, which updates table C... These chains are nearly impossible to debug and can cause deadlocks or infinite loops.

### 4. Portability Problems
Trigger syntax is one of the least standardized parts of SQL (as you've seen above). A trigger written for PostgreSQL won't run on MySQL without significant rewriting.

### 5. Testing Difficulty
Unit tests for application code are straightforward. Testing trigger behavior requires a real (or realistic mock) database, making CI pipelines more complex.

**Better alternatives to consider:**

| Instead of a trigger for... | Consider... |
|---|---|
| `updated_at` timestamps | Application-layer ORM hooks (e.g., SQLAlchemy events, ActiveRecord callbacks) |
| Audit logging | A dedicated audit library or application service |
| Business rules | Database constraints (`CHECK`, `NOT NULL`, foreign keys) where possible |
| Data sync | Explicit transactions in application code |

> **Rule of thumb:** Use triggers for logic that *must* live at the database level — for example, when multiple different applications write to the same table and you can't trust all of them to enforce the rule in application code.

---

## Key Takeaways

- A trigger is code that fires **automatically** in response to `INSERT`, `UPDATE`, or `DELETE` — like a webhook inside your database.
- Choose `BEFORE` to **modify/validate** incoming data; choose `AFTER` to **react** to committed changes.
- **Row-level** triggers (`FOR EACH ROW`) fire once per affected row and give you access to `OLD`/`NEW` values. **Statement-level** triggers fire once per SQL statement.
- OLD/NEW syntax is `OLD.col` / `NEW.col` in PostgreSQL and MySQL, `:OLD.col` / `:NEW.col` in Oracle, and `deleted`/`inserted` virtual tables in SQL Server.
- PostgreSQL requires a **separate trigger function** written in PL/pgSQL before creating the trigger itself — the other major databases allow inline logic.
- Triggers are powerful but dangerous: they hide logic, hurt bulk-load performance, and create hard-to-debug chains. Prefer application-layer solutions unless the logic genuinely must live in the database.

---

## Quiz

**Question 1.**
You want to automatically set a `created_at` timestamp the moment a new row is inserted into a table. Should you use a `BEFORE INSERT` or `AFTER INSERT` trigger, and why?

> **Answer:** `BEFORE INSERT`. Because the trigger runs before the row is written, you can modify `NEW.created_at` and the database will save your value as part of the original insert. With `AFTER INSERT`, the row is already saved and you would need an extra `UPDATE` statement to change it.

---

**Question 2.**
In SQL Server, when an `UPDATE` trigger fires, how do you access the old value of a column and the new value of the same column?

> **Answer:** SQL Server provides two virtual tables inside the trigger body: `deleted` (which holds the row as it looked before the update) and `inserted` (which holds the row as it looks after the update). You join them on the primary key — for example, `JOIN deleted d ON i.id = d.id` — to compare old and new values side by side.

---

**Question 3.**
A colleague proposes adding a row-level `AFTER INSERT` trigger to a high-traffic `events` table that receives 50,000 inserts per minute. The trigger writes one row to an `events_audit` table per insert. What potential problem should you raise?

> **Answer:** Performance at scale. A row-level trigger fires **once per row**, so 50,000 inserts per minute means 50,000 additional writes per minute just from the trigger. This doubles the write load on the database and could saturate I/O, increase lock contention, and slow down the primary insert pipeline. A better approach might be asynchronous audit logging via a message queue, a CDC (Change Data Capture) tool, or batched audit writes from the application layer.
