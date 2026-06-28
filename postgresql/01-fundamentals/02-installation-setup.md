# Installation and Setup

## Overview

This module covers installing PostgreSQL on Windows, Linux, and macOS, verifying the installation, setting up pgAdmin, and creating your first database.

---

## Theory

### PostgreSQL Installation Components

A typical PostgreSQL installation includes:

1. **PostgreSQL Server**: The core database engine
2. **psql**: Command-line interface for interacting with PostgreSQL
3. **pgAdmin** (optional): Graphical user interface for database administration
4. **Additional Tools**: pg_dump, pg_restore, pg_ctl, createdb, dropdb, etc.
5. **Documentation**: Local copy of PostgreSQL documentation

### Installation Methods

Different platforms offer various installation methods:

- **Windows**: Official installer, Chocolatey, Scoop, Docker
- **Linux**: Package managers (apt, yum, dnf), source compilation
- **macOS**: Homebrew, Postgres.app, official installer, Docker

### Default Configuration

After installation, PostgreSQL typically runs with:

- **Port**: 5432 (default PostgreSQL port)
- **Superuser**: postgres (on Linux/macOS) or user-specified during Windows installation
- **Default Database**: postgres
- **Data Directory**: Varies by platform and installation method
  - Windows: `C:\Program Files\PostgreSQL\16\data`
  - Linux: `/var/lib/postgresql/16/main`
  - macOS (Homebrew): `/opt/homebrew/var/postgresql@16`

---

## Installation Steps

### Windows Installation

#### Method 1: Official Installer (Recommended for Beginners)

**Step 1: Download the Installer**

1. Visit https://www.postgresql.org/download/windows/
2. Click on "Download the installer" from EDB
3. Select PostgreSQL 16 (or latest version)
4. Choose Windows x86-64 architecture

**Step 2: Run the Installer**

1. Run the downloaded `.exe` file
2. Click "Next" through the welcome screen
3. Choose installation directory (default: `C:\Program Files\PostgreSQL\16`)
4. Select components:
   - [x] PostgreSQL Server
   - [x] pgAdmin 4
   - [x] Stack Builder (for additional tools)
   - [x] Command Line Tools
5. Choose data directory (default: `C:\Program Files\PostgreSQL\16\data`)
6. Set a password for the postgres superuser (REMEMBER THIS!)
7. Set port number (default: 5432)
8. Choose locale (default: [Default locale])
9. Review summary and click "Next"
10. Wait for installation to complete

**Step 3: Verify Installation**

```cmd
REM Open Command Prompt or PowerShell

REM Check PostgreSQL version
psql --version

REM Expected output:
REM psql (PostgreSQL) 16.x
```

**Step 4: Add to PATH (if not automatic)**

If `psql --version` doesn't work, add PostgreSQL to PATH:

1. Open System Properties > Environment Variables
2. Edit "Path" variable
3. Add: `C:\Program Files\PostgreSQL\16\bin`
4. Click OK and restart Command Prompt

#### Method 2: Chocolatey (For Advanced Users)

```powershell
# Run PowerShell as Administrator

# Install Chocolatey (if not already installed)
# See https://chocolatey.org/install

# Install PostgreSQL
choco install postgresql16 -y

# The installer will prompt for postgres user password
# Default installation directory: C:\Program Files\PostgreSQL\16

# Verify installation
psql --version

# Install pgAdmin separately (optional)
choco install pgadmin4 -y
```

**Configuration:**

```powershell
# Check if PostgreSQL service is running
Get-Service postgresql*

# Start PostgreSQL service
Start-Service postgresql-x64-16

# Stop PostgreSQL service
Stop-Service postgresql-x64-16

# Set to start automatically
Set-Service postgresql-x64-16 -StartupType Automatic
```

### Linux Installation

#### Ubuntu/Debian (apt)

**Step 1: Update Package List**

```bash
# Update package list
sudo apt update

# Install prerequisites
sudo apt install -y wget ca-certificates
```

**Step 2: Add PostgreSQL Repository**

```bash
# Create the file repository configuration
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Import the repository signing key
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Update package list again
sudo apt update
```

**Step 3: Install PostgreSQL**

```bash
# Install PostgreSQL 16
sudo apt install -y postgresql-16 postgresql-contrib-16

# Install pgAdmin (optional)
sudo apt install -y pgadmin4
```

**Step 4: Verify Installation**

```bash
# Check PostgreSQL version
psql --version

# Check PostgreSQL service status
sudo systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql

# Enable auto-start on boot
sudo systemctl enable postgresql
```

**Step 5: Configure PostgreSQL User**

```bash
# Switch to postgres user
sudo -i -u postgres

# Access PostgreSQL prompt
psql

# You should see:
# psql (16.x)
# Type "help" for help.
# postgres=#
```

#### RHEL/CentOS/Fedora (yum/dnf)

**Step 1: Add PostgreSQL Repository**

```bash
# Install the repository RPM (for RHEL/CentOS 9)
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Disable built-in PostgreSQL module (RHEL/CentOS 8+)
sudo dnf -qy module disable postgresql
```

**Step 2: Install PostgreSQL**

```bash
# Install PostgreSQL 16
sudo dnf install -y postgresql16-server postgresql16-contrib

# Initialize the database
sudo /usr/pgsql-16/bin/postgresql-16-setup initdb

# Enable and start service
sudo systemctl enable postgresql-16
sudo systemctl start postgresql-16
```

**Step 3: Verify Installation**

```bash
# Check version
/usr/pgsql-16/bin/psql --version

# Check service status
sudo systemctl status postgresql-16
```

### macOS Installation

#### Method 1: Homebrew (Recommended)

**Step 1: Install Homebrew (if not installed)**

```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Step 2: Install PostgreSQL**

```bash
# Install PostgreSQL 16
brew install postgresql@16

# Add to PATH (add to ~/.zshrc or ~/.bash_profile)
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc

# Reload shell configuration
source ~/.zshrc

# Verify installation
psql --version
```

**Step 3: Start PostgreSQL**

```bash
# Start PostgreSQL service
brew services start postgresql@16

# Or run in foreground for testing
postgres -D /opt/homebrew/var/postgresql@16

# Check if running
brew services list | grep postgresql
```

**Step 4: Create Default User**

```bash
# Homebrew creates a user matching your macOS username
# Connect to PostgreSQL
psql postgres

# You should see the psql prompt
```

#### Method 2: Postgres.app (GUI-Friendly)

**Step 1: Download Postgres.app**

1. Visit https://postgresapp.com/
2. Download the latest version with PostgreSQL 16
3. Drag Postgres.app to Applications folder

**Step 2: Run and Configure**

1. Open Postgres.app
2. Click "Initialize" to create a new PostgreSQL instance
3. The server will start automatically
4. Click "Open psql" to access command line

**Step 3: Add to PATH**

```bash
# Add to ~/.zshrc or ~/.bash_profile
echo 'export PATH="/Applications/Postgres.app/Contents/Versions/16/bin:$PATH"' >> ~/.zshrc

source ~/.zshrc
```

---

## Verifying Installation

### Check PostgreSQL Version

```bash
# Check psql version
psql --version

# Expected output:
# psql (PostgreSQL) 16.x
```

### Check PostgreSQL Service

**Windows:**
```cmd
sc query postgresql-x64-16
```

**Linux:**
```bash
sudo systemctl status postgresql
```

**macOS (Homebrew):**
```bash
brew services list | grep postgresql
```

### Test Connection

**Linux/macOS:**
```bash
# Connect as postgres user (Linux)
sudo -u postgres psql

# Connect as current user (macOS Homebrew)
psql postgres
```

**Windows:**
```cmd
REM Connect with password prompt
psql -U postgres -h localhost

REM Or set PGPASSWORD environment variable
set PGPASSWORD=your_password
psql -U postgres -h localhost
```

**Expected Output:**
```
psql (16.x)
Type "help" for help.

postgres=#
```

### Basic Test Queries

```sql
-- Check PostgreSQL version
SELECT version();

-- List databases
\l

-- Check current user
SELECT current_user;

-- Check current database
SELECT current_database();

-- Exit psql
\q
```

---

## Setting Up pgAdmin

### Installing pgAdmin

**Windows:**
- Installed automatically with official PostgreSQL installer
- Or download separately from https://www.pgadmin.org/download/

**Linux (Ubuntu/Debian):**
```bash
# Install pgAdmin 4
sudo apt install pgadmin4

# For web version only
sudo apt install pgadmin4-web

# Configure web mode
sudo /usr/pgadmin4/bin/setup-web.sh
```

**macOS:**
```bash
# Install via Homebrew
brew install --cask pgadmin4
```

### Configuring pgAdmin

**Step 1: Launch pgAdmin**

1. Open pgAdmin 4 from Applications/Start Menu
2. Set a master password (for pgAdmin, not PostgreSQL)

**Step 2: Add PostgreSQL Server**

1. Right-click "Servers" in the Browser panel
2. Select "Register" > "Server"

**General Tab:**
- Name: `Local PostgreSQL 16` (or any name you prefer)

**Connection Tab:**
- Host: `localhost` (or `127.0.0.1`)
- Port: `5432`
- Maintenance database: `postgres`
- Username: `postgres` (or your username)
- Password: (your postgres password)
- [x] Save password (optional)

**Advanced Tab (optional):**
- DB restriction: (leave empty to see all databases)

3. Click "Save"

**Step 3: Verify Connection**

1. Expand the server in the Browser panel
2. You should see:
   - Databases (1)
     - postgres
   - Login/Group Roles
   - Tablespaces

---

## Initial psql Connection

### Connecting to PostgreSQL

**Basic Connection:**

```bash
# Connect to default database as postgres user
psql -U postgres

# Connect to specific database
psql -U postgres -d mydb

# Connect to remote host
psql -U postgres -h hostname -d mydb

# Connect with all options
psql -U username -h hostname -p 5432 -d database_name
```

### Connection String Format

```bash
# Using connection string (URI format)
psql postgresql://username:password@hostname:5432/database_name

# Example
psql postgresql://postgres:mypassword@localhost:5432/postgres
```

### Environment Variables

Set environment variables to avoid typing connection details:

**Linux/macOS:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGDATABASE=postgres
export PGPASSWORD=your_password  # Not recommended for security

# Then simply run
psql
```

**Windows:**
```cmd
REM Set environment variables
setx PGHOST localhost
setx PGPORT 5432
setx PGUSER postgres
setx PGDATABASE postgres

REM Then simply run
psql
```

### Using .pgpass for Password Management

Create a `.pgpass` file to store passwords securely:

**Linux/macOS:**
```bash
# Create .pgpass file in home directory
nano ~/.pgpass

# Add connection details (format: hostname:port:database:username:password)
localhost:5432:*:postgres:your_password
localhost:5432:mydb:myuser:mypassword

# Set proper permissions (required)
chmod 600 ~/.pgpass
```

**Windows:**
```cmd
REM Create pgpass.conf file
REM Location: %APPDATA%\postgresql\pgpass.conf

REM Add connection details
localhost:5432:*:postgres:your_password
```

---

## Creating Your First Database

### Using psql

```sql
-- Connect to PostgreSQL
psql -U postgres

-- List existing databases
\l

-- Create a new database
CREATE DATABASE myapp;

-- Create database with options
CREATE DATABASE myapp_prod
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1
    TEMPLATE = template0;

-- Switch to the new database
\c myapp

-- You should see: "You are now connected to database "myapp" as user "postgres"."

-- Create a test table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO users (username, email)
VALUES ('admin', 'admin@example.com');

-- Query the data
SELECT * FROM users;

-- List all tables in current database
\dt

-- Describe the users table
\d users
```

### Using Command Line

```bash
# Create database using createdb utility
createdb -U postgres myapp

# Create database with options
createdb -U postgres -O postgres -E UTF8 -T template0 myapp_prod

# List databases
psql -U postgres -l

# Drop database
dropdb -U postgres myapp_test
```

### Using pgAdmin

1. In pgAdmin, expand your server
2. Right-click "Databases" > "Create" > "Database"
3. **General Tab:**
   - Database: `myapp`
   - Owner: `postgres`
4. **Definition Tab:**
   - Encoding: `UTF8`
   - Template: `template0`
   - Collation: `en_US.UTF-8`
   - Character Type: `en_US.UTF-8`
5. Click "Save"

---

## Syntax

### Database Creation Syntax

```sql
CREATE DATABASE name
    [ WITH ]
    [ OWNER [=] user_name ]
    [ TEMPLATE [=] template ]
    [ ENCODING [=] encoding ]
    [ LOCALE [=] locale ]
    [ LC_COLLATE [=] lc_collate ]
    [ LC_CTYPE [=] lc_ctype ]
    [ TABLESPACE [=] tablespace_name ]
    [ ALLOW_CONNECTIONS [=] allowconn ]
    [ CONNECTION LIMIT [=] connlimit ]
    [ IS_TEMPLATE [=] istemplate ];
```

### Connection Syntax

```bash
psql [OPTION]... [DBNAME [USERNAME]]

Options:
  -h, --host=HOSTNAME      database server host or socket directory
  -p, --port=PORT          database server port (default: 5432)
  -U, --username=USERNAME  database user name
  -d, --dbname=DBNAME      database name to connect to
  -W, --password           force password prompt
  -w, --no-password        never prompt for password
```

---

## Examples

### Example 1: Complete Setup Workflow

```bash
# Step 1: Verify PostgreSQL is running
sudo systemctl status postgresql  # Linux
# or
brew services list | grep postgresql  # macOS
# or
sc query postgresql-x64-16  # Windows

# Step 2: Connect to PostgreSQL
psql -U postgres

# You're now in psql prompt
```

```sql
-- Step 3: Check server information
SELECT version();
SHOW server_version;
SHOW server_encoding;
SHOW timezone;

-- Step 4: List existing databases
\l

-- Step 5: Create a new database for a project
CREATE DATABASE bookstore
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    CONNECTION LIMIT = 50;

-- Step 6: Connect to the new database
\c bookstore

-- Step 7: Create a schema
CREATE SCHEMA IF NOT EXISTS app;

-- Step 8: Create tables
CREATE TABLE app.books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    isbn VARCHAR(13) UNIQUE,
    price NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 9: Verify table creation
\dt app.*

-- Step 10: Insert test data
INSERT INTO app.books (title, isbn, price)
VALUES ('PostgreSQL Guide', '9781234567890', 49.99);

-- Step 11: Query data
SELECT * FROM app.books;

-- Step 12: Exit psql
\q
```

### Example 2: Creating Multiple Databases with Different Configurations

```sql
-- Development database (less restrictive)
CREATE DATABASE myapp_dev
    OWNER = postgres
    ENCODING = 'UTF8'
    CONNECTION LIMIT = -1;  -- Unlimited connections

-- Testing database (isolated)
CREATE DATABASE myapp_test
    OWNER = postgres
    ENCODING = 'UTF8'
    CONNECTION LIMIT = 10
    TEMPLATE = template0;  -- Clean template

-- Production database (strict settings)
CREATE DATABASE myapp_prod
    OWNER = postgres
    ENCODING = 'UTF8'
    CONNECTION LIMIT = 100  -- Limit connections
    IS_TEMPLATE = false
    ALLOW_CONNECTIONS = true;

-- Analytics database (separate workload)
CREATE DATABASE myapp_analytics
    OWNER = postgres
    ENCODING = 'UTF8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = 20;

-- List all databases with details
SELECT
    datname AS database_name,
    pg_size_pretty(pg_database_size(datname)) AS size,
    datconnlimit AS connection_limit,
    encoding AS encoding_code,
    pg_encoding_to_char(encoding) AS encoding_name
FROM pg_database
WHERE datname LIKE 'myapp%'
ORDER BY datname;
```

### Example 3: Setting Up User Roles and Permissions

```sql
-- Connect as superuser
psql -U postgres

-- Create roles for different environments
CREATE ROLE dev_team WITH LOGIN PASSWORD 'dev_password';
CREATE ROLE app_user WITH LOGIN PASSWORD 'app_password';
CREATE ROLE readonly_user WITH LOGIN PASSWORD 'readonly_password';

-- Grant database access
GRANT CONNECT ON DATABASE myapp_dev TO dev_team;
GRANT CONNECT ON DATABASE myapp_prod TO app_user;
GRANT CONNECT ON DATABASE myapp_prod TO readonly_user;

-- Connect to specific database
\c myapp_dev

-- Grant schema permissions
GRANT USAGE ON SCHEMA public TO dev_team;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dev_team;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dev_team;

-- For production
\c myapp_prod

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- Read-only access
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- Make grants apply to future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO readonly_user;

-- Verify roles
\du

-- Verify permissions
\dp
```

### Example 4: Configuring PostgreSQL After Installation

```bash
# Find PostgreSQL configuration file
sudo -u postgres psql -c "SHOW config_file;"

# Common locations:
# Ubuntu/Debian: /etc/postgresql/16/main/postgresql.conf
# RHEL/CentOS: /var/lib/pgsql/16/data/postgresql.conf
# macOS (Homebrew): /opt/homebrew/var/postgresql@16/postgresql.conf
# Windows: C:\Program Files\PostgreSQL\16\data\postgresql.conf
```

```sql
-- View current configuration settings
SHOW all;

-- View specific settings
SHOW max_connections;
SHOW shared_buffers;
SHOW work_mem;

-- Important settings to adjust for production
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET work_mem = '4MB';

-- Reload configuration without restart
SELECT pg_reload_conf();

-- Some settings require restart
-- Linux: sudo systemctl restart postgresql
-- macOS: brew services restart postgresql@16
-- Windows: restart service postgresql-x64-16
```

---

## Common Mistakes

### Mistake 1: Forgetting postgres Password

**Problem:**
```bash
psql -U postgres
# Password for user postgres:
# psql: error: connection to server failed: FATAL: password authentication failed
```

**Solutions:**

**Option 1: Reset via peer authentication (Linux)**
```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Change this line:
# local   all             postgres                                peer
# To:
local   all             postgres                                trust

# Reload PostgreSQL
sudo systemctl reload postgresql

# Connect without password
psql -U postgres

# Change password
ALTER USER postgres PASSWORD 'new_password';

# Revert pg_hba.conf back to peer or md5
# Reload again
sudo systemctl reload postgresql
```

**Option 2: Reset via single-user mode (all platforms)**
```bash
# Stop PostgreSQL service
# Start in single-user mode
postgres --single -D /var/lib/postgresql/16/main postgres

# In the single-user prompt
ALTER USER postgres PASSWORD 'new_password';
# Press Ctrl+D to exit

# Start PostgreSQL normally
```

### Mistake 2: Port Already in Use

**Problem:**
```bash
FATAL: could not create lock file "/var/run/postgresql/.s.PGSQL.5432.lock": Permission denied
# Or
FATAL: lock file "postmaster.pid" already exists
```

**Solution:**
```bash
# Check if PostgreSQL is already running
sudo systemctl status postgresql

# Check what's using port 5432
sudo lsof -i :5432  # Linux/macOS
netstat -ano | findstr :5432  # Windows

# If another PostgreSQL instance is running
sudo systemctl stop postgresql

# Or kill the process (use with caution)
sudo kill -9 <PID>

# Or change the port in postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf
# Change: port = 5433
# Reload: sudo systemctl restart postgresql
```

### Mistake 3: Cannot Connect Remotely

**Problem:**
```bash
psql -h remote_host -U postgres
# could not connect to server: Connection refused
```

**Solution:**

**Step 1: Edit postgresql.conf**
```bash
sudo nano /etc/postgresql/16/main/postgresql.conf

# Change:
# listen_addresses = 'localhost'
# To:
listen_addresses = '*'  # Or specific IP address
```

**Step 2: Edit pg_hba.conf**
```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Add line to allow remote connections:
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    all             all             0.0.0.0/0               md5
# Or for specific network:
host    all             all             192.168.1.0/24          md5
```

**Step 3: Restart PostgreSQL**
```bash
sudo systemctl restart postgresql
```

**Step 4: Check firewall**
```bash
# Ubuntu/Debian
sudo ufw allow 5432/tcp

# RHEL/CentOS
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload

# Windows
# Windows Firewall > Inbound Rules > New Rule > Port > TCP 5432
```

### Mistake 4: Wrong Encoding

**Problem:**
```sql
CREATE DATABASE mydb;
-- Later, when inserting Unicode characters:
INSERT INTO users (name) VALUES ('José');
-- ERROR: invalid byte sequence for encoding "SQL_ASCII"
```

**Solution:**
```sql
-- Drop and recreate with proper encoding
DROP DATABASE mydb;

CREATE DATABASE mydb
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Now Unicode works
\c mydb
INSERT INTO users (name) VALUES ('José');  -- Success
```

### Mistake 5: Not Using .pgpass

**Problem:**
```bash
# Scripting becomes tedious
psql -U postgres -h localhost
# Password:  (manual entry each time)
```

**Solution:**
```bash
# Create .pgpass file (Linux/macOS)
cat > ~/.pgpass << EOF
localhost:5432:*:postgres:my_password
EOF

chmod 600 ~/.pgpass

# Now connect without password prompt
psql -U postgres -h localhost  # No password prompt
```

---

## Best Practices

### 1. Use Strong Passwords

```sql
-- Generate random password
-- Use password manager or command-line tools

-- Set strong password for postgres user
ALTER USER postgres PASSWORD 'Str0ng!P@ssw0rd#2024';

-- Never use default or weak passwords in production
```

### 2. Configure pg_hba.conf Properly

```conf
# pg_hba.conf - Principle of least privilege

# Local connections (Unix domain socket)
local   all             postgres                                peer
local   all             all                                     peer

# IPv4 local connections
host    all             all             127.0.0.1/32            scram-sha-256

# IPv6 local connections
host    all             all             ::1/128                 scram-sha-256

# Remote connections (be specific)
host    myapp_prod      app_user        192.168.1.0/24          scram-sha-256
host    myapp_prod      readonly_user   10.0.0.0/8              scram-sha-256

# Reject everything else
host    all             all             0.0.0.0/0               reject
```

### 3. Regular Backups from Day One

```bash
# Set up automated backups immediately after installation

# Create backup script
cat > /usr/local/bin/pg_backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup all databases
pg_dumpall -U postgres | gzip > "$BACKUP_DIR/all_databases_$TIMESTAMP.sql.gz"

# Backup specific database
pg_dump -U postgres -d myapp_prod | gzip > "$BACKUP_DIR/myapp_prod_$TIMESTAMP.sql.gz"

# Remove backups older than 7 days
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/pg_backup.sh

# Add to cron (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/pg_backup.sh" | sudo crontab -
```

### 4. Use Connection Pooling

```bash
# Install PgBouncer for connection pooling
sudo apt install pgbouncer  # Ubuntu/Debian

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
myapp_prod = host=localhost port=5432 dbname=myapp_prod

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25

# Application connects to PgBouncer (port 6432) instead of PostgreSQL (port 5432)
```

### 5. Monitor from the Start

```sql
-- Enable logging for slow queries
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1 second
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;

SELECT pg_reload_conf();

-- Set up pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Query slow queries
SELECT
    calls,
    mean_exec_time,
    query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Practice Exercises

### Exercise 1: Complete Installation and Setup

**Task:** Perform a complete PostgreSQL installation and setup for a development environment.

```bash
# 1. Install PostgreSQL (choose your platform)
# Ubuntu:
sudo apt update && sudo apt install -y postgresql-16

# macOS:
brew install postgresql@16

# Windows:
# Download and run installer from postgresql.org

# 2. Verify installation
psql --version
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# 3. Connect to PostgreSQL
sudo -u postgres psql  # Linux
psql postgres  # macOS/Windows
```

```sql
-- 4. Check server information
SELECT version();
SHOW server_version;
SHOW data_directory;
SHOW config_file;
SHOW hba_file;

-- 5. Create a development database
CREATE DATABASE dev_sandbox
    OWNER = postgres
    ENCODING = 'UTF8'
    CONNECTION LIMIT = -1;

-- 6. Connect to the new database
\c dev_sandbox

-- 7. Create test objects
CREATE TABLE test_connection (
    id SERIAL PRIMARY KEY,
    test_data VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO test_connection (test_data)
VALUES ('Installation successful!');

SELECT * FROM test_connection;

-- 8. Exit
\q
```

**Verification:**
- PostgreSQL service is running
- You can connect via psql
- You can create databases and tables
- pgAdmin is installed and connected (optional)

### Exercise 2: Multi-Database Setup

**Task:** Create separate databases for development, testing, and production environments with appropriate configurations.

```sql
-- Create development database
CREATE DATABASE myapp_dev
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0
    CONNECTION LIMIT = -1;

-- Create testing database (isolated, no connection limit for CI/CD)
CREATE DATABASE myapp_test
    OWNER = postgres
    ENCODING = 'UTF8'
    TEMPLATE = template0
    CONNECTION LIMIT = -1;

-- Create production database (connection limit enforced)
CREATE DATABASE myapp_prod
    OWNER = postgres
    ENCODING = 'UTF8'
    TEMPLATE = template0
    CONNECTION LIMIT = 100;

-- Create read replica simulation database
CREATE DATABASE myapp_analytics
    OWNER = postgres
    ENCODING = 'UTF8'
    TEMPLATE = template0
    CONNECTION LIMIT = 50;

-- Create users for each environment
CREATE ROLE dev_user WITH LOGIN PASSWORD 'dev_pass_123';
CREATE ROLE test_user WITH LOGIN PASSWORD 'test_pass_123';
CREATE ROLE app_user WITH LOGIN PASSWORD 'app_pass_123';
CREATE ROLE analytics_user WITH LOGIN PASSWORD 'analytics_pass_123';

-- Grant appropriate permissions
-- Development: full access
GRANT ALL PRIVILEGES ON DATABASE myapp_dev TO dev_user;

-- Testing: full access
GRANT ALL PRIVILEGES ON DATABASE myapp_test TO test_user;

-- Production: limited access
GRANT CONNECT ON DATABASE myapp_prod TO app_user;

\c myapp_prod

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Analytics: read-only
\c postgres
GRANT CONNECT ON DATABASE myapp_analytics TO analytics_user;

\c myapp_analytics

GRANT USAGE ON SCHEMA public TO analytics_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analytics_user;

-- Verify setup
\c postgres
\l

SELECT
    d.datname AS database,
    pg_catalog.pg_get_userbyid(d.datdba) AS owner,
    d.datconnlimit AS conn_limit,
    pg_encoding_to_char(d.encoding) AS encoding
FROM pg_catalog.pg_database d
WHERE d.datname LIKE 'myapp%'
ORDER BY d.datname;
```

**Challenge:**
- Test connecting with each user to their respective database
- Verify permissions work as expected
- Document connection strings for each environment

### Exercise 3: Troubleshooting Installation Issues

**Task:** Simulate and resolve common installation issues.

**Scenario 1: Service Won't Start**

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check logs
sudo journalctl -u postgresql -n 50

# Common issues:
# 1. Port already in use
sudo lsof -i :5432

# 2. Data directory permissions
ls -la /var/lib/postgresql/16/main
sudo chown -R postgres:postgres /var/lib/postgresql/16/main
sudo chmod 700 /var/lib/postgresql/16/main

# 3. Configuration errors
sudo -u postgres /usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main --check

# Restart service
sudo systemctl restart postgresql
```

**Scenario 2: Cannot Connect**

```bash
# Test local connection
psql -U postgres -h localhost

# If fails, check pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Add this line if missing:
# host    all             all             127.0.0.1/32            md5

# Reload configuration
sudo systemctl reload postgresql

# Test again
psql -U postgres -h localhost
```

**Scenario 3: Password Issues**

```sql
-- Connect as superuser (using peer authentication)
sudo -u postgres psql

-- Reset password
ALTER USER postgres PASSWORD 'new_password';

-- Verify
\password postgres

-- Test connection
\q
psql -U postgres -h localhost -W
```

**Documentation:**
Create a troubleshooting document with:
1. Issue description
2. Error messages
3. Resolution steps
4. Prevention measures

---

## Summary

Key points covered:
- Installing PostgreSQL on Windows, Linux, and macOS
- Verifying installation and service status
- Setting up pgAdmin for GUI management
- Connecting with psql and creating first database
- Configuring authentication and users
- Common installation issues and solutions

**Next Steps:**
- [PostgreSQL Architecture](./03-architecture.md) - Understand how PostgreSQL works internally
- [Databases and Schemas](./04-databases-schemas.md) - Learn about database organization

---

## Additional Resources

- PostgreSQL Downloads: https://www.postgresql.org/download/
- pgAdmin Documentation: https://www.pgadmin.org/docs/
- PostgreSQL Configuration Guide: https://www.postgresql.org/docs/current/runtime-config.html
- Connection Strings: https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING

---

**Module:** 01-Fundamentals | **Previous:** [Introduction](./01-introduction.md) | **Next:** [Architecture](./03-architecture.md)
