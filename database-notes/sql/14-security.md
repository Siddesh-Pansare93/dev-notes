# 🔐 Database Security — Users, Roles, Permissions, aur SQL Injection

## Is Chapter Mein Kya Seekhoge

Is chapter ke end tak tumhe samajh aa jayega ki databases kaise decide karte hain "kisko kya access milega", SQL Injection attacks kaise hote hain aur unse kaise bachein, passwords ko safely kaise store karein, sensitive columns ko encrypt kaise karein, aur database activity ko audit kaise karein. Security koi baad mein sochne wali cheez nahi hai — ye din 1 se hi design karni padti hai. Jaise Zomato apna payment system security-first design karta hai, waise hi tumhara database bhi.

---

## 🧭 Database Security Itni Zaruri Kyun Hai?

Socho — ek database mein company ka sabse valuable asset pada hota hai: user credentials, payment info, medical records, business secrets. Ek chhoti si galti ya careless query, aur poora data attacker ke haath mein. 2021 mein IBM ki report ke mutabik, ek data breach ka average cost tha USD 4.24 million — matlab ek chhoti si mistake, karodon ka nuksaan.

Achhi baat ye hai ki relational databases ka security model har vendor (Postgres, MySQL, SQL Server, Oracle) mein kaafi consistent hai — ek baar samajh liya, toh sabme kaam aayega.

---

## 👤 Authentication aur Authorization

**Authentication** ka matlab hai — "Tum ho kaun?" — jaise Paytm login karte waqt password ya OTP se identity confirm hoti hai.
**Authorization** ka matlab hai — "Tumhe kya karne ki permission hai?" — identity confirm hone ke baad, kya tum sirf apna wallet dekh sakte ho ya admin panel bhi access kar sakte ho.

Database dono layers ko natively handle karta hai.

---

### Database Users Banana

Har person ya application jo database se connect hota hai, wo ek **database user** (kabhi-kabhi "login" bhi kehte hain) ke roop mein connect hota hai. Har vendor ka apna syntax hai.

```sql
-- PostgreSQL
CREATE USER app_user WITH PASSWORD 'str0ng_p@ss!';

-- Ya CREATE ROLE use karo (zyada flexible — roles login bhi kar sakte hain)
CREATE ROLE app_user WITH LOGIN PASSWORD 'str0ng_p@ss!';
```

```sql
-- MySQL
-- Host part decide karta hai ki user KAHAN se connect kar sakta hai.
-- '%' matlab "kisi bhi host se"; '127.0.0.1' matlab sirf localhost se.
CREATE USER 'app_user'@'%' IDENTIFIED BY 'str0ng_p@ss!';

-- Sirf localhost tak restrict karo (recommended jab app server aur DB same machine pe ho)
CREATE USER 'app_user'@'127.0.0.1' IDENTIFIED BY 'str0ng_p@ss!';
```

```sql
-- SQL Server (do steps mein hota hai: pehle server-level LOGIN, phir database-level USER)
-- Step 1 — server level pe login banao
CREATE LOGIN app_login WITH PASSWORD = 'str0ng_p@ss!';

-- Step 2 — target database ke andar, us login ko user se map karo
USE my_database;
CREATE USER app_user FOR LOGIN app_login;
```

```sql
-- Oracle
CREATE USER app_user IDENTIFIED BY str0ng_p@ss;
-- Naye users ko connect karne ke liye minimum CREATE SESSION privilege chahiye
GRANT CREATE SESSION TO app_user;
```

> **Tip:** Har database account ke liye strong, randomly-generated password use karo. Inhe kabhi plain text config file mein mat rakho — secret manager use karo (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault), jaise tum apna ATM PIN kisi diary mein nahi likhte.

---

### Roles — Permissions Ko Group Karna

Har user ko individually dus-dus permissions dena error-prone hai aur audit karna mushkil. **Roles** ek named collection hote hain permissions ka. Role ko grant karo, aur jis-jis user ke paas wo role hai, use automatically saari permissions mil jaati hain — bilkul jaise Swiggy mein "Delivery Partner" role ke saath specific set of app-permissions bandhi hoti hain, har naye rider ko alag se define nahi karna padta.

```sql
-- PostgreSQL — ek role banao (login ke bina), usko permissions do,
-- phir role ko user ko assign kardo
CREATE ROLE readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
GRANT readonly_role TO app_user;
```

```sql
-- MySQL — roles version 8.0 se available hain
CREATE ROLE 'readonly_role';
GRANT SELECT ON my_database.* TO 'readonly_role';
GRANT 'readonly_role' TO 'app_user'@'%';
-- Session mein roles activate karo (ya default set karo)
SET DEFAULT ROLE 'readonly_role' TO 'app_user'@'%';
```

```sql
-- SQL Server — built-in fixed roles already exist (db_datareader, db_datawriter, etc.)
-- Custom roles bhi bana sakte ho
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

### GRANT aur REVOKE

`GRANT` permission deta hai; `REVOKE` use waapas le leta hai.

**Common privilege types:**

| Privilege | Ye kya allow karta hai |
|-----------|----------------|
| `SELECT` | Rows read karna |
| `INSERT` | Rows add karna |
| `UPDATE` | Rows modify karna |
| `DELETE` | Rows remove karna |
| `EXECUTE` | Stored procedure ya function run karna |
| `ALL PRIVILEGES` | Upar wala sab (aur usse zyada) |

**Grant examples jo saari major databases mein same tarike se kaam karte hain:**

```sql
-- User ko ek specific table read karne do
GRANT SELECT ON orders TO app_user;

-- User ko ek table read aur write karne do
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO app_user;

-- Ek table pe saari privileges grant karo
GRANT ALL PRIVILEGES ON orders TO app_user;
```

**Database-level grants thoda alag hote hain:**

```sql
-- PostgreSQL
GRANT ALL PRIVILEGES ON DATABASE my_database TO admin_user;
GRANT CONNECT ON DATABASE my_database TO app_user;

-- MySQL
GRANT ALL PRIVILEGES ON my_database.* TO 'admin_user'@'%';
GRANT SELECT ON my_database.* TO 'app_user'@'%';
FLUSH PRIVILEGES;  -- MySQL mein changes turant apply karne ke liye ye zaruri hai

-- SQL Server — database roles ya schema permissions use karo instead
GRANT SELECT ON SCHEMA::dbo TO app_user;

-- Oracle
GRANT CREATE SESSION, SELECT ANY TABLE TO admin_user;
```

**Permissions revoke karna:**

```sql
-- Sab databases mein same tarike se kaam karta hai
REVOKE SELECT ON orders FROM app_user;
REVOKE ALL PRIVILEGES ON orders FROM app_user;
```

---

### 🛡️ Principle of Least Privilege

> **Rule:** Har user ya application ko sirf utni hi permission do jitni use zaruri hai — usse ek bhi zyada nahi.

Tumhari web application ko almost kabhi bhi `DROP TABLE`, `CREATE USER`, ya `GRANT` permissions ki zarurat nahi padti. Ek dedicated app user banao aur use sirf wahi do jo tumhari queries actually maangti hain:

```sql
-- PostgreSQL example: ek read-write app user jo schema alter nahi kar sakta
CREATE USER webapp WITH PASSWORD 'randomly-generated-secret';
GRANT CONNECT ON DATABASE shopdb TO webapp;
GRANT USAGE ON SCHEMA public TO webapp;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE orders, products, customers TO webapp;
-- webapp tables DROP nahi kar sakta, roles CREATE nahi kar sakta, ya system tables access nahi kar sakta
```

Apne users ko role ke hisaab se alag-alag rakho — jaise ek company mein delivery boy, warehouse manager, aur owner ke alag-alag access levels hote hain:

| User | Purpose | Permissions |
|------|---------|-------------|
| `webapp` | Application runtime | App tables pe SELECT, INSERT, UPDATE, DELETE |
| `readonly` | Reporting / analytics | Sirf SELECT |
| `migrations` | Deploy time pe schema changes | DDL (CREATE, ALTER, DROP) |
| `dba` | Human administrator | SUPERUSER / DBA (bahut kam use hota hai) |

---

### 🔒 Row-Level Security (RLS)

Normal table-level grants all-or-nothing hote hain: ek user ya toh poori `orders` table read kar sakta hai, ya bilkul nahi. **Row-Level Security** tumhe ek filter add karne deta hai taaki har user sirf apni khud ki rows dekh sake — bilkul jaise Swiggy app mein tum sirf apna order history dekh sakte ho, kisi aur customer ka nahi.

**PostgreSQL — CREATE POLICY**

```sql
-- 1. Table pe RLS enable karo
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 2. Ek policy banao: users sirf apne khud ke orders dekh sakein
CREATE POLICY user_orders_policy
  ON orders
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id')::INTEGER);

-- 3. App har session/transaction ki shuruaat mein user context set karta hai
SET app.current_user_id = 42;
SELECT * FROM orders;  -- Sirf wahi rows return karega jaha user_id = 42
```

**SQL Server — Security Policy with an Inline Table-Valued Function**

```sql
-- 1. Ek filter predicate function banao
CREATE FUNCTION dbo.fn_user_order_filter(@user_id INT)
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN
  SELECT 1 AS result WHERE @user_id = CAST(SESSION_CONTEXT(N'user_id') AS INT);

-- 2. Ek security policy banao jo isko apply kare
CREATE SECURITY POLICY OrderFilter
  ADD FILTER PREDICATE dbo.fn_user_order_filter(user_id) ON dbo.orders
  WITH (STATE = ON);
```

**MySQL — Built-in RLS Nahi Hai**

MySQL mein native row-level security nahi hai. Do common workarounds hain:

1. **Views** — har user class ke liye ek view banao jisme filter hard-code ho:
   ```sql
   CREATE VIEW my_orders AS
     SELECT * FROM orders WHERE user_id = CURRENT_USER_ID();
   ```
2. **Application logic** — har query ke saath hamesha `WHERE user_id = ?` append karo aur parameterized query use karo (neeche SQL Injection section dekho).

**Oracle — Virtual Private Database (VPD)**

```sql
-- 1. Ek policy function banao jo WHERE clause string return kare
CREATE OR REPLACE FUNCTION user_order_filter(
  schema_name IN VARCHAR2,
  table_name  IN VARCHAR2
) RETURN VARCHAR2 AS
BEGIN
  RETURN 'user_id = SYS_CONTEXT(''userenv'', ''client_identifier'')';
END;

-- 2. Table pe policy apply karo
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

Apni application aur database ke beech connection ko hamesha encrypt karo. Agar nahi kiya, toh credentials aur query results network pe plain text mein travel karte hain — koi bhi beech mein baithkar padh sakta hai, jaise unlocked WhatsApp message.

- **PostgreSQL:** `postgresql.conf` mein `ssl = on` set karo. Clients connection string mein `sslmode=require` (ya `verify-full`) use karein.
- **MySQL:** `my.cnf` mein `require_secure_transport = ON` enable karo. Clients `ssl-mode=REQUIRED` add karein.
- **SQL Server:** SQL Server Configuration Manager mein "Force Encryption" enable karo.
- **Oracle:** Oracle Native Network Encryption ya Oracle Advanced Security (TLS/SSL) use karo.

Connection string examples:

```bash
# PostgreSQL — SSL enforce karo
postgresql://app_user:password@db.example.com:5432/shopdb?sslmode=require

# MySQL — SSL enforce karo
mysql://app_user:password@db.example.com:3306/shopdb?ssl=true
```

> SSL/TLS enforcement ko kabhi bhi disable mat karo, ye sochkar ki traffic "internal" hai. Jo attacker network access le chuka hai, wo unencrypted connections aasani se sniff kar sakta hai.

---

## 💉 SQL Injection — Sabse Common Web Vulnerability

SQL Injection (SQLi) consistently OWASP Top 10 list mein top pe rehta hai web application security risks ka. Ye tab hota hai jab user-supplied input directly ek SQL string mein concatenate kar diya jaata hai, jisse attacker arbitrary SQL commands inject kar sake.

---

### Ek Zabardast Example

Socho ek login form hai. Naïve backend code kuch aisa dikhta hai:

```python
# VULNERABLE — Ye KABHI mat karo
username = request.form['username']
password = request.form['password']

query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'"
db.execute(query)
```

Ek normal user `alice` aur `secret123` type karta hai. Query ye ban jaati hai:

```sql
SELECT * FROM users WHERE username = 'alice' AND password = 'secret123'
```

Lekin ek attacker username mein `admin'--` type karta hai aur password mein kuch bhi. Query ye ban jaati hai:

```sql
SELECT * FROM users WHERE username = 'admin'--' AND password = 'anything'
```

`--` ek SQL comment hai. Uske baad sab kuch — password check bhi — ignore ho jaata hai. Attacker `admin` ban ke login kar leta hai, password jaane bina hi. Jaise koi tumhare ghar ka main lock crack kiye bina hi seedhe peeche wale darwaze se andar ghus jaaye.

**Aur bhi zyada destructive:** attacker ye enter kar sakta hai:

```
'; DROP TABLE users; --
```

Jo ye query banati hai:

```sql
SELECT * FROM users WHERE username = ''; DROP TABLE users; --' AND password = '...'
```

Database driver ke hisaab se, ye ek hi request mein poori `users` table delete kar sakta hai. Socho — ek din tumhara pura customer database gayab, sirf ek chhoti si input field ki wajah se.

---

### Bachne Ka Tarika: Parameterized Queries / Prepared Statements

Fix simple hai — **user input ko kabhi SQL strings mein concatenate mat karo**. Iske bajaye **parameterized queries** (jinhe prepared statements bhi kehte hain) use karo. Database driver SQL structure ko data se alag rakhta hai — user input kabhi bhi SQL command ke roop mein interpret nahi ho sakta.

**Python — psycopg2 (PostgreSQL)**

```python
import psycopg2

# VULNERABLE (ye kabhi mat karo)
query = f"SELECT * FROM users WHERE username = '{username}'"

# SAFE — %s placeholders use karo, values ko tuple ke roop mein pass karo
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

// SAFE — $1, $2, ... placeholders use karo
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

**Rule simple hai:** SQL template (placeholders ke saath) hamesha tumhare source code mein ek hard-coded string hoti hai. User data sirf bind parameters ke through andar aata hai — kabhi bhi string mein directly bake nahi hota.

---

### Second-Order SQL Injection

First-order injection turant hoti hai jab input database tak pahunchta hai. **Second-order** injection thodi subtle hoti hai: attacker ek request mein malicious payload database mein store kar deta hai, aur ye tab fire hoti hai jab wo data baad mein retrieve hokar kisi doosri query mein use hota hai — often ek admin operation mein, jahan developer ne assume kar liya tha ki data pehle se hi "safe" hai.

**Example flow:**

1. Attacker register karta hai username: `admin'--` ke saath
2. Registration query parameterized hai — abhi tak koi injection nahi. Value safely store ho jaati hai.
3. Baad mein, ek admin screen ye run karti hai:
   ```python
   # Developer yahan parameterization bhool gaya kyunki "data toh hamare DB se hi aaya"
   query = "UPDATE users SET role = 'user' WHERE username = '" + row['username'] + "'"
   ```
4. Malicious username ab is naye query mein inject ho jaata hai.

**Bachaav:** Parameterized queries hamesha use karo, sirf input boundaries pe nahi. Har data ko untrusted samjho, chahe wo kahi se bhi aaya ho — jaise ek trusted vendor se aaya raw material bhi quality check ke bina factory mein nahi jaata.

---

### Stored Procedure Injection

Stored procedures automatically safe nahi hote. Agar koi procedure andar hi string concatenation se dynamic SQL banata hai, toh wo bhi utna hi vulnerable hai:

```sql
-- VULNERABLE stored procedure (SQL Server)
CREATE PROCEDURE SearchUsers @username NVARCHAR(100)
AS
BEGIN
  DECLARE @sql NVARCHAR(500);
  SET @sql = 'SELECT * FROM users WHERE username = ''' + @username + '''';
  EXEC(@sql);  -- Yahan inject ho gaya!
END;
```

**Safe version — sp_executesql with parameters use karo:**

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
  -- SAFE: USING clause parameters ko alag se bind karta hai
  RETURN QUERY EXECUTE 'SELECT * FROM users WHERE username = $1'
    USING p_username;
END;
$$ LANGUAGE plpgsql;
```

> Definitive reference ke liye, [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html) dekho.

---

## 🔑 Encryption

### Passwords Ko Hash Karna — Plain Text Kabhi Store Mat Karo

Agar tumhari `users` table mein plain-text passwords pade hain aur attacker tumhara database padh leta hai, toh ek jhatke mein har user account compromise ho jaata hai. Solution ye hai ki passwords ko store karne se pehle **hash** karo, using ek slow, salted hashing algorithm jo specifically passwords ke liye banaya gaya hai.

**Application level pe bcrypt, Argon2, ya scrypt use karo:**

```python
# Python — bcrypt use karke
import bcrypt

# Jab user register karta hai:
password = b"user_plaintext_password"
hashed = bcrypt.hashpw(password, bcrypt.gensalt(rounds=12))
# `hashed` ko database mein store karo — ye kuch aisa dikhta hai:
# $2b$12$EXAMPLEhashstring...

# Jab user login karta hai:
entered = b"user_plaintext_password"
if bcrypt.checkpw(entered, hashed_from_db):
    print("Login successful")
```

```javascript
// Node.js — bcrypt use karke
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

// Registration pe
const hash = await bcrypt.hash(plaintextPassword, SALT_ROUNDS);
// Hash ko DB mein store karo

// Login pe
const match = await bcrypt.compare(plaintextPassword, hashFromDB);
if (match) { /* authenticated */ }
```

> Passwords ke liye **kabhi** MD5 ya SHA-1/SHA-256 akela use mat karo. Ye fast hash functions hain — GPU wala attacker billions of MD5 hashes per second crack kar sakta hai. bcrypt jaan-boojh kar slow hai aur ek cost factor deta hai jise hardware improve hone ke saath badha sakte ho.

---

### Columns Ko Encrypt Karna

Kabhi-kabhi tumhe sensitive data (PII, credit card numbers, health records) ko encrypted form mein store karna padta hai, taaki agar koi raw table dump bhi kar le, tab bhi wo use padh na sake.

**PostgreSQL — pgcrypto extension**

```sql
-- Extension ko ek baar database ke liye enable karo
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypted data insert karo
INSERT INTO patients (name, ssn_encrypted)
VALUES (
  'Jane Doe',
  pgp_sym_encrypt('123-45-6789', 'your-encryption-key')
);

-- Read aur decrypt karo
SELECT name, pgp_sym_decrypt(ssn_encrypted, 'your-encryption-key') AS ssn
FROM patients;
```

**MySQL — AES_ENCRYPT / AES_DECRYPT**

```sql
-- Insert pe encrypt karo (key application config se aani chahiye, hardcode mat karo)
INSERT INTO patients (name, ssn_encrypted)
VALUES (
  'Jane Doe',
  AES_ENCRYPT('123-45-6789', 'your-encryption-key')
);

-- Read pe decrypt karo
SELECT name, AES_DECRYPT(ssn_encrypted, 'your-encryption-key') AS ssn
FROM patients;
```

> Column-level encryption specific fields ko protect karta hai lekin query overhead add karta hai, aur generally isse tum encrypted columns pe direct `WHERE` clause use nahi kar sakte, jab tak decrypt na karo. Apna schema uske hisaab se plan karo.

---

### Transparent Data Encryption (TDE)

TDE poori database ko rest mein encrypt kar deta hai — disk pe data files, backups, aur log files sab encrypted hote hain. Ye application ke liye transparent hai (queries normally kaam karti hain) aur protect karta hai us scenario se jaha koi physically storage media chura le.

**SQL Server**

```sql
-- 1. Master key banao
CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'master-key-password';

-- 2. Certificate banao
CREATE CERTIFICATE TDECert WITH SUBJECT = 'TDE Certificate';

-- 3. Database encryption key banao
USE my_database;
CREATE DATABASE ENCRYPTION KEY
  WITH ALGORITHM = AES_256
  ENCRYPTION BY SERVER CERTIFICATE TDECert;

-- 4. Encryption enable karo
ALTER DATABASE my_database SET ENCRYPTION ON;
```

**Oracle — Advanced Security Option (ASO)**

```sql
-- TDE tablespace encryption enable karo (Oracle 12c+)
ALTER TABLESPACE users ENCRYPTION ONLINE ENCRYPT;
```

**PostgreSQL** mein PostgreSQL 16 tak built-in TDE nahi hai, lekin tum ye kar sakte ho:
- **Filesystem-level encryption** use karo (Linux pe dm-crypt / LUKS)
- **Cloud provider managed encryption** use karo (AWS RDS, Google Cloud SQL)
- Column-level encryption ke liye PGCRYPTO jaise patches/extensions

**MySQL / MariaDB** — InnoDB tablespace encryption support karta hai (storage engine level pe `innodb_encrypt_tables` se enable hota hai).

---

## 📋 Auditing — Pata Ho Kya Hua Tha

Auditing ka matlab hai record karna ki kisne kya kiya aur kab kiya. Ye compliance ke liye zaruri hai (GDPR, HIPAA, SOC 2), breach ke baad forensic investigation ke liye, aur anomalous behaviour detect karne ke liye — bilkul jaise CRED apne transactions ka detailed log rakhta hai taaki koi bhi suspicious activity turant pakdi ja sake.

---

### General Query Logging

Saari major databases queries log kar sakti hain, lekin busy production server pe har single statement log karna expensive hai. Selective logging ya ek dedicated audit extension use karo.

**PostgreSQL — postgresql.conf mein statement logging enable karo**

```ini
# Saari queries log karo (sirf dev pe — prod ke liye bahut noisy hai)
log_statement = 'all'

# Sirf slow queries log karo (> 1 second) — prod ke liye safe
log_min_duration_statement = 1000

# Connections log karo
log_connections = on
log_disconnections = on
```

**MySQL**

```sql
-- General query log enable karo (production ke liye nahi)
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/var/log/mysql/general.log';

-- Slow query log enable karo (production-safe)
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- seconds
```

---

### pgaudit — Fine-Grained Audit Logging (PostgreSQL)

`pgaudit` extension tumhe structured, detailed audit logs deta hai jo regulatory requirements comply karte hain. Ye DDL, DML, aur role changes ko alag-alag log karta hai.

```bash
# Install karo (Debian/Ubuntu)
sudo apt install postgresql-16-pgaudit
```

```ini
# postgresql.conf
shared_preload_libraries = 'pgaudit'
pgaudit.log = 'write, ddl'   # INSERT/UPDATE/DELETE aur schema changes log karo
pgaudit.log_catalog = off    # System catalog queries se noise kam karo
```

```sql
-- Ya ek specific role ke liye audit rules set karo
ALTER ROLE sensitive_user SET pgaudit.log = 'all';
```

Log entries mein ye sab hota hai: timestamp, user, database, object, command type, aur full statement — audit trail ke liye jo kuch bhi chahiye, sab kuch.

**SQL Server — SQL Server Audit**

```sql
-- Ek server audit banao (file mein likhta hai)
CREATE SERVER AUDIT MyAudit
  TO FILE (FILEPATH = 'C:\Audits\');

-- Ek database audit specification banao
CREATE DATABASE AUDIT SPECIFICATION MyDbAudit
  FOR SERVER AUDIT MyAudit
  ADD (SELECT ON dbo.users BY public),
  ADD (INSERT ON dbo.orders BY public)
  WITH (STATE = ON);

-- Server audit enable karo
ALTER SERVER AUDIT MyAudit WITH (STATE = ON);
```

**Oracle — Unified Auditing (12c+)**

```sql
-- Ek audit policy banao
CREATE AUDIT POLICY orders_access_policy
  ACTIONS SELECT ON hr.orders, INSERT ON hr.orders;

-- Enable karo
AUDIT POLICY orders_access_policy;
```

---

## ✅ Key Takeaways

- **Users aur roles**: Hamesha dedicated application users banao; kabhi bhi superuser/root ke roop mein connect mat karo.
- **Least privilege**: Har user ko sirf wahi do jo use actually chahiye; regularly review aur revoke karo.
- **Row-level security**: PostgreSQL aur SQL Server mein built-in hai; MySQL mein views ya app logic use karo.
- **SSL/TLS**: App aur database ke beech connection hamesha encrypt karo.
- **SQL Injection**: User input ko kabhi SQL mein concatenate mat karo — hamesha parameterized queries use karo.
- **Second-order SQLi**: Har query ko parameterize karo, sirf input boundaries pe nahi.
- **Password storage**: bcrypt/Argon2 use karo; plain text ya MD5 jaisi fast hashes kabhi mat use karo.
- **Column encryption**: Sensitive fields ke liye pgcrypto (PostgreSQL), AES_ENCRYPT (MySQL) use karo.
- **TDE**: Disk pe data ko rest mein protect karta hai; SQL Server aur Oracle mein natively supported hai.
- **Auditing**: Compliance ke liye pgaudit (PostgreSQL) ya built-in audit objects (SQL Server, Oracle) use karo.

---

## 🧪 Quiz

**Question 1**

Ek developer web application mein ye code likhta hai:

```python
user_input = request.args.get('id')
query = "SELECT * FROM products WHERE id = " + user_input
```

a) Ye kaunsi vulnerability introduce karta hai?
b) Ek attacker `id=1 OR 1=1` bhejta hai. Resulting query kaisi dikhegi, aur iska effect kya hoga?
c) Is code ko Python (psycopg2 style) mein parameterized queries use karke rewrite karo.

---

**Question 2**

Tumhari company ek multi-tenant SaaS application bana rahi hai. Har customer ko sirf apni khud ki rows dikhni chahiye `invoices` table mein, jisme ek `tenant_id` column hai. Tum PostgreSQL use kar rahe ho.

a) Isko database level pe enforce karne ke liye tum kaunsa PostgreSQL feature use karoge?
b) `invoices` pe us feature ko enable karne ka SQL likho aur ek policy banao jo har connection ko sirf uske apne `tenant_id` tak restrict kare (session-level setting `app.tenant_id` naam ki use karo).

---

**Question 3**

Tumhara DBA tumhe ye `users` table dikhata hai:

```
id | username | password
---|----------|----------
1  | alice    | secret123
2  | bob      | p@ssword
```

a) Is design mein critically kya galat hai?
b) Iske bajaye kaunsa algorithm use karna chahiye, aur kis layer pe (database ya application)?
c) Agar tum proper password hashing pe switch karte ho, toh kya same plain-text password wale do users ka stored value bhi same ho sakta hai? Kyun ya kyun nahi?

---

> **Answers companion answer key mein hain (`14-security-answers.md`). Pehle khud try karo!**
