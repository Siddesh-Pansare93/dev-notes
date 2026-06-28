# 🔐 Database Security — Users, Roles, Permissions, and SQL Injection

## What You Will Learn

By the end of this chapter you will understand how databases control who can access what data, how SQL Injection attacks work and how to prevent them, how to store passwords safely, how to encrypt sensitive columns, and how to audit database activity. Security is not an afterthought — it is something you design in from day one.

---

## 🧭 Why Database Security Matters

A database often contains the most valuable assets a company owns: user credentials, payment information, medical records, and business secrets. A single misconfiguration or careless query can expose every row to an attacker. In 2021 alone, data breaches cost an average of USD 4.24 million per incident (IBM Cost of a Data Breach Report).

The good news is that the core security model of relational databases is remarkably consistent across vendors and relatively straightforward to learn.

---

## 👤 Authentication and Authorization

**Authentication** answers "Who are you?" — verifying an identity with credentials.  
**Authorization** answers "What are you allowed to do?" — checking permissions after identity is confirmed.

Databases enforce both layers natively.

---

### Creating Database Users

Every person or application that connects to a database does so as a **database user** (sometimes called a login). Each vendor has its own syntax.

```sql
-- PostgreSQL
CREATE USER app_user WITH PASSWORD 'str0ng_p@ss!';

-- Or use CREATE ROLE (more flexible — roles can also log in)
CREATE ROLE app_user WITH LOGIN PASSWORD 'str0ng_p@ss!';
```

```sql
-- MySQL
-- The host part restricts WHERE the user can connect from.
-- '%' means "any host"; '127.0.0.1' means localhost only.
CREATE USER 'app_user'@'%' IDENTIFIED BY 'str0ng_p@ss!';

-- Restrict to localhost (recommended for app servers on the same machine)
CREATE USER 'app_user'@'127.0.0.1' IDENTIFIED BY 'str0ng_p@ss!';
```

```sql
-- SQL Server (two-step: a server-level LOGIN, then a database-level USER)
-- Step 1 — create the login at the server level
CREATE LOGIN app_login WITH PASSWORD = 'str0ng_p@ss!';

-- Step 2 — inside the target database, map a user to that login
USE my_database;
CREATE USER app_user FOR LOGIN app_login;
```

```sql
-- Oracle
CREATE USER app_user IDENTIFIED BY str0ng_p@ss;
-- New users need at minimum the CREATE SESSION privilege to connect
GRANT CREATE SESSION TO app_user;
```

> **Tip:** Use strong, randomly-generated passwords for every database account. Store them in a secret manager (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault) rather than plain text config files.

---

### Roles — Grouping Permissions

Granting dozens of individual permissions to every user is error-prone and hard to audit. **Roles** are named collections of permissions. Grant the role; every user who holds it inherits its permissions.

```sql
-- PostgreSQL — create a role (no login), grant permissions to it,
-- then assign the role to a user
CREATE ROLE readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
GRANT readonly_role TO app_user;
```

```sql
-- MySQL — MySQL uses roles starting from version 8.0
CREATE ROLE 'readonly_role';
GRANT SELECT ON my_database.* TO 'readonly_role';
GRANT 'readonly_role' TO 'app_user'@'%';
-- Activate roles in the session (or set as default)
SET DEFAULT ROLE 'readonly_role' TO 'app_user'@'%';
```

```sql
-- SQL Server — built-in fixed roles exist (db_datareader, db_datawriter, etc.)
-- You can also create custom roles
CREATE ROLE ReadOnlyRole;
GRANT SELECT ON dbo.users TO ReadOnlyRole;
ALTER ROLE ReadOnlyRole ADD MEMBER app_user;
```

```sql
-- Oracle
CREATE ROLE readonly_role;
GRANT SELECT ON hr.employees TO readonly_role;
GRANT readonly_role TO app_user;
```

---

### GRANT and REVOKE

`GRANT` gives a permission; `REVOKE` takes it away.

**Common privilege types:**

| Privilege | What it allows |
|-----------|----------------|
| `SELECT` | Read rows |
| `INSERT` | Add rows |
| `UPDATE` | Modify rows |
| `DELETE` | Remove rows |
| `EXECUTE` | Run a stored procedure or function |
| `ALL PRIVILEGES` | Everything above (and more) |

**Grant examples that work the same across all major databases:**

```sql
-- Allow a user to read one specific table
GRANT SELECT ON orders TO app_user;

-- Allow a user to read and write one table
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO app_user;

-- Grant all privileges on a table
GRANT ALL PRIVILEGES ON orders TO app_user;
```

**Database-level grants differ slightly:**

```sql
-- PostgreSQL
GRANT ALL PRIVILEGES ON DATABASE my_database TO admin_user;
GRANT CONNECT ON DATABASE my_database TO app_user;

-- MySQL
GRANT ALL PRIVILEGES ON my_database.* TO 'admin_user'@'%';
GRANT SELECT ON my_database.* TO 'app_user'@'%';
FLUSH PRIVILEGES;  -- MySQL requires this to apply changes immediately

-- SQL Server — use database roles or schema permissions instead
GRANT SELECT ON SCHEMA::dbo TO app_user;

-- Oracle
GRANT CREATE SESSION, SELECT ANY TABLE TO admin_user;
```

**Revoking permissions:**

```sql
-- Works the same across all databases
REVOKE SELECT ON orders FROM app_user;
REVOKE ALL PRIVILEGES ON orders FROM app_user;
```

---

### 🛡️ Principle of Least Privilege

> **Rule:** Grant every user or application only the exact permissions it needs — nothing more.

Your web application almost certainly does not need to `DROP TABLE`, `CREATE USER`, or `GRANT` permissions. Create a dedicated app user and give it only what your queries actually require:

```sql
-- PostgreSQL example: a read-write app user that cannot alter the schema
CREATE USER webapp WITH PASSWORD 'randomly-generated-secret';
GRANT CONNECT ON DATABASE shopdb TO webapp;
GRANT USAGE ON SCHEMA public TO webapp;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE orders, products, customers TO webapp;
-- webapp cannot DROP tables, CREATE roles, or access system tables
```

Separate your users by role:

| User | Purpose | Permissions |
|------|---------|-------------|
| `webapp` | Application runtime | SELECT, INSERT, UPDATE, DELETE on app tables |
| `readonly` | Reporting / analytics | SELECT only |
| `migrations` | Schema changes at deploy time | DDL (CREATE, ALTER, DROP) |
| `dba` | Human administrator | SUPERUSER / DBA (used rarely) |

---

### 🔒 Row-Level Security (RLS)

Standard table-level grants are all-or-nothing: a user can either read the whole `orders` table or none of it. **Row-Level Security** lets you add a filter so each user sees only the rows they own.

**PostgreSQL — CREATE POLICY**

```sql
-- 1. Enable RLS on the table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 2. Create a policy: users can only see their own orders
CREATE POLICY user_orders_policy
  ON orders
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id')::INTEGER);

-- 3. The app sets the user context at the start of each session/transaction
SET app.current_user_id = 42;
SELECT * FROM orders;  -- Returns only rows where user_id = 42
```

**SQL Server — Security Policy with an Inline Table-Valued Function**

```sql
-- 1. Create a filter predicate function
CREATE FUNCTION dbo.fn_user_order_filter(@user_id INT)
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN
  SELECT 1 AS result WHERE @user_id = CAST(SESSION_CONTEXT(N'user_id') AS INT);

-- 2. Create a security policy that applies it
CREATE SECURITY POLICY OrderFilter
  ADD FILTER PREDICATE dbo.fn_user_order_filter(user_id) ON dbo.orders
  WITH (STATE = ON);
```

**MySQL — No built-in RLS**

MySQL does not have native row-level security. Two common workarounds:

1. **Views** — create a view per user class that hard-codes the filter:
   ```sql
   CREATE VIEW my_orders AS
     SELECT * FROM orders WHERE user_id = CURRENT_USER_ID();
   ```
2. **Application logic** — always append `WHERE user_id = ?` to every query and use a parameterized query (see the SQL Injection section below).

**Oracle — Virtual Private Database (VPD)**

```sql
-- 1. Create a policy function that returns a WHERE clause string
CREATE OR REPLACE FUNCTION user_order_filter(
  schema_name IN VARCHAR2,
  table_name  IN VARCHAR2
) RETURN VARCHAR2 AS
BEGIN
  RETURN 'user_id = SYS_CONTEXT(''userenv'', ''client_identifier'')';
END;

-- 2. Apply the policy to the table
DBMS_RLS.ADD_POLICY(
  object_schema  => 'HR',
  object_name    => 'ORDERS',
  policy_name    => 'USER_ORDER_POLICY',
  function_schema => 'HR',
  policy_function => 'USER_ORDER_FILTER'
);
```

---

### 🔗 Connection Security: SSL/TLS

Always encrypt the connection between your application and the database. Without it, credentials and query results travel in plain text over the network.

- **PostgreSQL:** Set `ssl = on` in `postgresql.conf`. Clients use `sslmode=require` (or `verify-full`) in the connection string.
- **MySQL:** Enable `require_secure_transport = ON` in `my.cnf`. Clients add `ssl-mode=REQUIRED`.
- **SQL Server:** Enable "Force Encryption" in SQL Server Configuration Manager.
- **Oracle:** Use Oracle Native Network Encryption or Oracle Advanced Security (TLS/SSL).

Connection string examples:

```bash
# PostgreSQL — enforce SSL
postgresql://app_user:password@db.example.com:5432/shopdb?sslmode=require

# MySQL — enforce SSL
mysql://app_user:password@db.example.com:3306/shopdb?ssl=true
```

> Never disable SSL/TLS enforcement just because it is "internal" traffic. Attackers who gain network access can still sniff unencrypted connections.

---

## 💉 SQL Injection — The Most Common Web Vulnerability

SQL Injection (SQLi) consistently tops the OWASP Top 10 list of web application security risks. It happens when user-supplied input is concatenated directly into a SQL string, letting an attacker inject arbitrary SQL commands.

---

### A Vivid Example

Imagine a login form. The naïve backend code looks like this:

```python
# VULNERABLE — NEVER do this
username = request.form['username']
password = request.form['password']

query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'"
db.execute(query)
```

A normal user types `alice` and `secret123`. The query becomes:

```sql
SELECT * FROM users WHERE username = 'alice' AND password = 'secret123'
```

An attacker types the username `admin'--` and anything as the password. The query becomes:

```sql
SELECT * FROM users WHERE username = 'admin'--' AND password = 'anything'
```

The `--` is a SQL comment. Everything after it — including the password check — is ignored. The attacker logs in as `admin` without knowing the password.

**Even more destructive:** an attacker could enter:

```
'; DROP TABLE users; --
```

Producing:

```sql
SELECT * FROM users WHERE username = ''; DROP TABLE users; --' AND password = '...'
```

Depending on the database driver, this deletes the entire `users` table in one request.

---

### How to Prevent: Parameterized Queries / Prepared Statements

The fix is to **never concatenate user input into SQL strings**. Instead, use **parameterized queries** (also called prepared statements). The database driver separates the SQL structure from the data — user input can never be interpreted as SQL commands.

**Python — psycopg2 (PostgreSQL)**

```python
import psycopg2

# VULNERABLE (never do this)
query = f"SELECT * FROM users WHERE username = '{username}'"

# SAFE — use %s placeholders, pass values as a tuple
cursor.execute(
    "SELECT * FROM users WHERE username = %s AND password = %s",
    (username, password)
)
```

**Node.js — pg (PostgreSQL)**

```javascript
const { Pool } = require('pg');
const pool = new Pool();

// VULNERABLE
const query = `SELECT * FROM users WHERE username = '${username}'`;

// SAFE — use $1, $2, ... placeholders
const result = await pool.query(
  'SELECT * FROM users WHERE username = $1 AND password_hash = $2',
  [username, passwordHash]
);
```

**Java — JDBC**

```java
// VULNERABLE
String query = "SELECT * FROM users WHERE username = '" + username + "'";
Statement stmt = conn.createStatement();
ResultSet rs = stmt.executeQuery(query);

// SAFE — PreparedStatement
String safeQuery = "SELECT * FROM users WHERE username = ? AND password_hash = ?";
PreparedStatement pstmt = conn.prepareStatement(safeQuery);
pstmt.setString(1, username);
pstmt.setString(2, passwordHash);
ResultSet rs = pstmt.executeQuery();
```

**The rule is simple:** the SQL template (with placeholders) is always a hard-coded string in your source code. User data flows in only through the bind parameters — never baked into the string itself.

---

### Second-Order SQL Injection

First-order injection happens immediately when input hits the database. **Second-order** injection is subtler: the attacker stores a malicious payload in the database during one request, and it fires when retrieved and used in a subsequent query — often in an admin operation where the developer assumed the data was already "safe."

**Example flow:**

1. Attacker registers with username: `admin'--`
2. The registration query is parameterized — no injection yet. The value is stored safely.
3. Later, an admin screen runs:
   ```python
   # Developer forgot parameterization here because "data came from our DB"
   query = "UPDATE users SET role = 'user' WHERE username = '" + row['username'] + "'"
   ```
4. The malicious username is now injected into this new query.

**Defence:** Use parameterized queries everywhere, not just at input boundaries. Treat all data as untrusted, regardless of where it came from.

---

### Stored Procedure Injection

Stored procedures are not automatically safe. If a procedure builds dynamic SQL internally using string concatenation, it is just as vulnerable:

```sql
-- VULNERABLE stored procedure (SQL Server)
CREATE PROCEDURE SearchUsers @username NVARCHAR(100)
AS
BEGIN
  DECLARE @sql NVARCHAR(500);
  SET @sql = 'SELECT * FROM users WHERE username = ''' + @username + '''';
  EXEC(@sql);  -- Injected here!
END;
```

**Safe version — use sp_executesql with parameters:**

```sql
-- SAFE stored procedure (SQL Server)
CREATE PROCEDURE SearchUsers @username NVARCHAR(100)
AS
BEGIN
  DECLARE @sql NVARCHAR(500);
  SET @sql = N'SELECT * FROM users WHERE username = @uname';
  EXEC sp_executesql @sql, N'@uname NVARCHAR(100)', @uname = @username;
END;
```

**PostgreSQL equivalent using `EXECUTE ... USING`:**

```sql
CREATE OR REPLACE FUNCTION search_users(p_username TEXT)
RETURNS SETOF users AS $$
DECLARE
BEGIN
  -- SAFE: USING clause binds parameters separately
  RETURN QUERY EXECUTE 'SELECT * FROM users WHERE username = $1'
    USING p_username;
END;
$$ LANGUAGE plpgsql;
```

> For the definitive reference, see the [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html).

---

## 🔑 Encryption

### Hashing Passwords — Never Store Plain Text

If your `users` table contains plain-text passwords and an attacker reads your database, every single user account is compromised instantly. The solution is to **hash** passwords before storing them using a slow, salted hashing algorithm designed for passwords.

**Use bcrypt, Argon2, or scrypt at the application level:**

```python
# Python — using bcrypt
import bcrypt

# When a user registers:
password = b"user_plaintext_password"
hashed = bcrypt.hashpw(password, bcrypt.gensalt(rounds=12))
# Store `hashed` in the database — it looks like:
# $2b$12$EXAMPLEhashstring...

# When a user logs in:
entered = b"user_plaintext_password"
if bcrypt.checkpw(entered, hashed_from_db):
    print("Login successful")
```

```javascript
// Node.js — using bcrypt
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

// On registration
const hash = await bcrypt.hash(plaintextPassword, SALT_ROUNDS);
// Store hash in DB

// On login
const match = await bcrypt.compare(plaintextPassword, hashFromDB);
if (match) { /* authenticated */ }
```

> **Never** use MD5 or SHA-1/SHA-256 alone for passwords. They are fast hash functions — an attacker with a GPU can crack billions of MD5 hashes per second. bcrypt is intentionally slow and includes a cost factor you can increase as hardware gets faster.

---

### Encrypting Columns

Sometimes you must store sensitive data (PII, credit card numbers, health records) in an encrypted form so that even if someone dumps the raw table they cannot read it.

**PostgreSQL — pgcrypto extension**

```sql
-- Enable the extension once per database
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert encrypted data
INSERT INTO patients (name, ssn_encrypted)
VALUES (
  'Jane Doe',
  pgp_sym_encrypt('123-45-6789', 'your-encryption-key')
);

-- Read and decrypt
SELECT name, pgp_sym_decrypt(ssn_encrypted, 'your-encryption-key') AS ssn
FROM patients;
```

**MySQL — AES_ENCRYPT / AES_DECRYPT**

```sql
-- Encrypt on insert (key should come from application config, not hardcoded)
INSERT INTO patients (name, ssn_encrypted)
VALUES (
  'Jane Doe',
  AES_ENCRYPT('123-45-6789', 'your-encryption-key')
);

-- Decrypt on read
SELECT name, AES_DECRYPT(ssn_encrypted, 'your-encryption-key') AS ssn
FROM patients;
```

> Column-level encryption protects specific fields but adds query overhead and means you generally cannot use `WHERE` clauses on encrypted columns without decrypting first. Plan your schema accordingly.

---

### Transparent Data Encryption (TDE)

TDE encrypts the entire database at rest — the data files on disk, backups, and log files are all encrypted. It is transparent to the application (queries work normally) and protects against someone physically stealing the storage media.

**SQL Server**

```sql
-- 1. Create a master key
CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'master-key-password';

-- 2. Create a certificate
CREATE CERTIFICATE TDECert WITH SUBJECT = 'TDE Certificate';

-- 3. Create a database encryption key
USE my_database;
CREATE DATABASE ENCRYPTION KEY
  WITH ALGORITHM = AES_256
  ENCRYPTION BY SERVER CERTIFICATE TDECert;

-- 4. Enable encryption
ALTER DATABASE my_database SET ENCRYPTION ON;
```

**Oracle — Advanced Security Option (ASO)**

```sql
-- Enable TDE tablespace encryption (Oracle 12c+)
ALTER TABLESPACE users ENCRYPTION ONLINE ENCRYPT;
```

**PostgreSQL** does not have built-in TDE as of PostgreSQL 16, but you can:
- Use **filesystem-level encryption** (dm-crypt / LUKS on Linux)
- Use **cloud provider managed encryption** (AWS RDS, Google Cloud SQL)
- Patches and extensions like PGCRYPTO for column-level encryption

**MySQL / MariaDB** — InnoDB supports tablespace encryption (enabled at the storage engine level with `innodb_encrypt_tables`).

---

## 📋 Auditing — Know What Happened

Auditing means recording who did what and when. This is essential for compliance (GDPR, HIPAA, SOC 2), forensic investigation after a breach, and detecting anomalous behaviour.

---

### General Query Logging

All major databases can log queries, but doing so for every single statement on a busy production server is expensive. Use selective logging or a dedicated audit extension instead.

**PostgreSQL — enable statement logging in postgresql.conf**

```ini
# Log all queries (only on dev — too noisy for prod)
log_statement = 'all'

# Log only slow queries (> 1 second) — safer for prod
log_min_duration_statement = 1000

# Log connections
log_connections = on
log_disconnections = on
```

**MySQL**

```sql
-- Enable general query log (not for production)
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/var/log/mysql/general.log';

-- Enable slow query log (production-safe)
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- seconds
```

---

### pgaudit — Fine-Grained Audit Logging (PostgreSQL)

The `pgaudit` extension gives you structured, detailed audit logs that comply with regulatory requirements. It logs DDL, DML, and role changes separately.

```bash
# Install (Debian/Ubuntu)
sudo apt install postgresql-16-pgaudit
```

```ini
# postgresql.conf
shared_preload_libraries = 'pgaudit'
pgaudit.log = 'write, ddl'   # Log INSERT/UPDATE/DELETE and schema changes
pgaudit.log_catalog = off    # Reduce noise from system catalog queries
```

```sql
-- Or set audit rules for a specific role
ALTER ROLE sensitive_user SET pgaudit.log = 'all';
```

Log entries include: timestamp, user, database, object, command type, and the full statement — everything you need for an audit trail.

**SQL Server — SQL Server Audit**

```sql
-- Create a server audit (writes to a file)
CREATE SERVER AUDIT MyAudit
  TO FILE (FILEPATH = 'C:\Audits\');

-- Create a database audit specification
CREATE DATABASE AUDIT SPECIFICATION MyDbAudit
  FOR SERVER AUDIT MyAudit
  ADD (SELECT ON dbo.users BY public),
  ADD (INSERT ON dbo.orders BY public)
  WITH (STATE = ON);

-- Enable the server audit
ALTER SERVER AUDIT MyAudit WITH (STATE = ON);
```

**Oracle — Unified Auditing (12c+)**

```sql
-- Create an audit policy
CREATE AUDIT POLICY orders_access_policy
  ACTIONS SELECT ON hr.orders, INSERT ON hr.orders;

-- Enable it
AUDIT POLICY orders_access_policy;
```

---

## ✅ Key Takeaways

| Topic | What to Remember |
|-------|-----------------|
| Users and roles | Always create dedicated application users; never connect as a superuser/root |
| Least privilege | Grant only what each user actually needs; review and revoke regularly |
| Row-level security | Built-in in PostgreSQL and SQL Server; use views or app logic in MySQL |
| SSL/TLS | Always encrypt connections between app and database |
| SQL Injection | Never concatenate user input into SQL — always use parameterized queries |
| Second-order SQLi | Parameterize every query, not just input boundaries |
| Password storage | Use bcrypt/Argon2; never store plain text or fast hashes like MD5 |
| Column encryption | pgcrypto (PostgreSQL), AES_ENCRYPT (MySQL) for sensitive fields |
| TDE | Protects data at rest on disk; supported natively in SQL Server and Oracle |
| Auditing | Use pgaudit (PostgreSQL) or built-in audit objects (SQL Server, Oracle) for compliance |

---

## 🧪 Quiz

**Question 1**

A developer writes this code in a web application:

```python
user_input = request.args.get('id')
query = "SELECT * FROM products WHERE id = " + user_input
```

a) What type of vulnerability does this introduce?  
b) An attacker sends `id=1 OR 1=1`. What does the resulting query look like, and what is the effect?  
c) Rewrite this code using parameterized queries in Python (psycopg2 style).

---

**Question 2**

Your company is building a multi-tenant SaaS application. Each customer should only be able to see their own rows in the `invoices` table, which has a `tenant_id` column. You are using PostgreSQL.

a) Which PostgreSQL feature would you use to enforce this at the database level?  
b) Write the SQL to enable that feature on `invoices` and create a policy that restricts each connection to its own `tenant_id` (use a session-level setting called `app.tenant_id`).

---

**Question 3**

Your DBA shows you this `users` table:

```
id | username | password
---|----------|----------
1  | alice    | secret123
2  | bob      | p@ssword
```

a) What is critically wrong with this design?  
b) What algorithm should you use instead, and at which layer (database or application)?  
c) If you switch to proper password hashing, can two users with the same plain-text password end up with the same stored value? Why or why not?

---

> **Answers are in the companion answer key (`14-security-answers.md`). Try the questions yourself first!**
