# pg_dump and pg_restore

## Theory

### Logical Backups with pg_dump

`pg_dump` creates logical backups by exporting database contents as SQL statements or archive format:

**What is Backed Up**:
- Table schemas (CREATE TABLE statements)
- Data (INSERT or COPY statements)
- Indexes
- Constraints
- Views
- Functions and procedures
- Triggers
- Sequences and their current values
- Comments

**What is NOT Backed Up**:
- Global objects (roles, tablespaces) - use `pg_dumpall`
- Large objects (LOBs) - unless using `--blobs`
- Configuration files (postgresql.conf, pg_hba.conf)
- Transaction logs (WAL)

**Use Cases**:
- Database migration to different PostgreSQL version
- Selective table/schema backup
- Development/staging database cloning
- Archival of specific database state
- Cross-platform database transfer

**Limitations**:
- Not suitable for point-in-time recovery (PITR)
- Can be slow on very large databases (TB+)
- Creates snapshot at dump start, not fully consistent during long dumps
- Requires restoration to be useful (unlike file-level backups)

### pg_dump Output Formats

PostgreSQL supports multiple dump formats:

**1. Plain SQL (default, `-Fp`)**:
- Human-readable SQL statements
- Can be edited before restore
- Restored with `psql`
- No compression
- Single-threaded restore
- Good for: Small databases, version control, manual inspection

**2. Custom Format (`-Fc`)**:
- Compressed binary format
- Smallest file size
- Parallel restore support
- Selective table restore
- Good for: Production backups, large databases

**3. Directory Format (`-Fd`)**:
- One file per table
- Parallel dump and restore
- Flexible and performant
- Good for: Very large databases

**4. Tar Format (`-Ft`)**:
- Tar archive
- No compression (use external compression)
- No parallel restore
- Good for: Compatibility with tar tools

**Comparison**:

| Format | Compression | Parallel Restore | Selective Restore | Edit Before Restore |
|--------|-------------|------------------|-------------------|---------------------|
| Plain  | No          | No               | Manual            | Yes                 |
| Custom | Yes         | Yes              | Yes               | No                  |
| Directory | Yes      | Yes              | Yes               | No                  |
| Tar    | No          | No               | Limited           | No                  |

### pg_dump Options

**Table/Schema Selection**:
- `-t table`: Dump specific table
- `-T table`: Exclude specific table
- `-n schema`: Dump specific schema
- `-N schema`: Exclude specific schema

**Data/Schema Control**:
- `--data-only`: Dump only data, not schema
- `--schema-only`: Dump only schema, not data
- `--inserts`: Use INSERT statements (slow, portable)
- `--column-inserts`: Use INSERT with column names

**Large Objects**:
- `-b, --blobs`: Include large objects
- `-B, --no-blobs`: Exclude large objects (default)

**Performance**:
- `-j N`: Parallel dump (directory format only)
- `-Z 0-9`: Compression level (custom/directory format)

**Other Options**:
- `--if-exists`: Use IF EXISTS in DROP statements
- `--clean`: Include DROP statements before CREATE
- `--create`: Include CREATE DATABASE statement
- `--no-owner`: Don't set object ownership
- `--no-privileges`: Don't dump privileges (GRANT/REVOKE)

### pg_restore

`pg_restore` restores databases from non-plain-text dumps:

**Key Features**:
- Parallel restoration (`-j`)
- Selective object restoration (`-t`, `-n`, `-I`)
- List archive contents without restoring (`-l`)
- Create custom restore lists (`-L`)
- Restore to different database name

**Restore Process**:
1. Connect to target database
2. Create schema objects (tables, indexes, etc.)
3. Load data
4. Create constraints and triggers
5. Update sequences
6. Apply privileges

### pg_dumpall

`pg_dumpall` dumps entire PostgreSQL cluster including global objects:

**What's Included**:
- All databases
- Roles (users and groups)
- Tablespaces
- Database-level settings

**Output**:
- Always plain SQL format
- Must be restored with `psql`
- Cannot use parallel restore

**Common Usage**:
```bash
# Backup entire cluster
pg_dumpall -U postgres > cluster_backup.sql

# Backup only global objects (roles, tablespaces)
pg_dumpall -U postgres --globals-only > globals.sql
```

### Dumping and Restoring Single Tables

Selective backup/restore is useful for:
- Copying specific tables between environments
- Testing with production data subset
- Debugging specific table issues
- Partial database migration

**Considerations**:
- Foreign key dependencies
- Sequence values
- Table inheritance
- Partitioned tables

### Compressed Dumps

Compression reduces backup size and transfer time:

**Built-in Compression** (custom/directory format):
```bash
pg_dump -Fc -Z 9 mydb > backup.dump  # Maximum compression
```

**External Compression** (plain format):
```bash
pg_dump mydb | gzip > backup.sql.gz
pg_dump mydb | zstd > backup.sql.zst  # Better compression ratio
```

**Trade-offs**:
- Higher compression = smaller files, slower dump/restore
- Custom format compression is parallel-friendly
- zstd offers best compression ratio and speed

### Piping Dump to Restore

Direct database copy without intermediate file:

```bash
pg_dump -h source_host source_db | psql -h dest_host dest_db
```

**Benefits**:
- No disk space needed for backup file
- Faster for over-the-network copies
- Useful for quick database cloning

**Limitations**:
- No backup retained
- Cannot retry failed restore without re-dumping
- No selective restore

### Common Pitfalls

**Encoding Issues**:
- Source and destination encodings must match
- Use `--encoding` to specify encoding
- Check client encoding settings

**Ownership**:
- Dump includes object ownership
- Use `--no-owner` if roles differ between environments
- User running pg_restore needs CREATE privileges

**Privileges**:
- GRANT/REVOKE statements may fail if roles don't exist
- Use `--no-privileges` to skip, then manually apply
- Or restore globals first with `pg_dumpall --globals-only`

**Large Databases**:
- Plain format can be very slow to restore
- Use custom or directory format with parallel restore
- Consider partitioning dump by schema

## Syntax

### Basic pg_dump

```bash
# Plain SQL dump
pg_dump dbname > backup.sql

# Custom format (compressed)
pg_dump -Fc dbname > backup.dump

# Directory format
pg_dump -Fd dbname -f backup_dir

# Tar format
pg_dump -Ft dbname > backup.tar

# With connection parameters
pg_dump -h hostname -p 5432 -U username dbname > backup.sql

# Password via environment variable
export PGPASSWORD=mypassword
pg_dump -h hostname -U username dbname > backup.sql

# Or use .pgpass file (~/.pgpass)
# hostname:port:database:username:password
```

### Schema and Data Options

```bash
# Schema only (no data)
pg_dump --schema-only dbname > schema.sql

# Data only (no schema)
pg_dump --data-only dbname > data.sql

# Specific table
pg_dump -t users dbname > users.sql

# Multiple tables
pg_dump -t users -t orders dbname > tables.sql

# All tables except one
pg_dump -T logs dbname > backup_no_logs.sql

# Specific schema
pg_dump -n public dbname > public_schema.sql

# Exclude schema
pg_dump -N audit dbname > backup_no_audit.sql
```

### Advanced pg_dump Options

```bash
# Include DROP statements
pg_dump --clean dbname > backup.sql

# Use IF EXISTS with DROP
pg_dump --if-exists --clean dbname > backup.sql

# Include CREATE DATABASE
pg_dump --create dbname > backup.sql

# Use INSERT instead of COPY
pg_dump --inserts dbname > backup.sql

# INSERT with column names (most portable)
pg_dump --column-inserts dbname > backup.sql

# No ownership information
pg_dump --no-owner dbname > backup.sql

# No privilege information
pg_dump --no-privileges dbname > backup.sql

# Parallel dump (directory format only)
pg_dump -Fd -j 4 dbname -f backup_dir

# Custom compression level (0-9)
pg_dump -Fc -Z 9 dbname > backup.dump

# Include large objects
pg_dump --blobs dbname > backup.sql
```

### pg_restore Syntax

```bash
# Restore custom format dump
pg_restore -d dbname backup.dump

# Restore to different database
pg_restore -d newdb backup.dump

# Parallel restore
pg_restore -j 4 -d dbname backup.dump

# Restore specific table
pg_restore -t users -d dbname backup.dump

# Restore specific schema
pg_restore -n public -d dbname backup.dump

# List contents without restoring
pg_restore -l backup.dump

# Create restore list, edit, then use it
pg_restore -l backup.dump > restore_list.txt
# Edit restore_list.txt to comment out unwanted items
pg_restore -L restore_list.txt -d dbname backup.dump

# Clean before restore (DROP existing objects)
pg_restore --clean -d dbname backup.dump

# Clean with IF EXISTS
pg_restore --if-exists --clean -d dbname backup.dump

# Create database before restoring
pg_restore --create -d postgres backup.dump

# No ownership
pg_restore --no-owner -d dbname backup.dump

# No privileges
pg_restore --no-privileges -d dbname backup.dump

# Verbose output
pg_restore -v -d dbname backup.dump

# Stop on error
pg_restore -e -d dbname backup.dump

# Single transaction (all or nothing)
pg_restore -1 -d dbname backup.dump
```

### pg_dumpall Syntax

```bash
# Dump entire cluster
pg_dumpall -U postgres > cluster.sql

# Globals only (roles, tablespaces)
pg_dumpall --globals-only > globals.sql

# Schema only (all databases)
pg_dumpall --schema-only > schemas.sql

# Data only (all databases)
pg_dumpall --data-only > data.sql

# Restore cluster dump
psql -U postgres -f cluster.sql
```

### Restoring Plain SQL Dumps

```bash
# Restore with psql
psql dbname < backup.sql

# Restore with connection parameters
psql -h hostname -U username dbname < backup.sql

# Restore and stop on first error
psql --set ON_ERROR_STOP=on dbname < backup.sql

# Restore with progress (verbose)
psql -v ON_ERROR_STOP=1 -e dbname < backup.sql

# Restore from compressed dump
gunzip < backup.sql.gz | psql dbname
zstdcat backup.sql.zst | psql dbname
```

## Examples

### Example 1: Complete Database Backup and Restore

```bash
# Backup production database
pg_dump -h prod-server -U postgres -Fc -Z 9 production_db > prod_backup_$(date +%Y%m%d).dump

# Verify backup size
ls -lh prod_backup_*.dump

# Transfer to staging server (if needed)
scp prod_backup_20260210.dump staging-server:/backups/

# On staging server, create database
psql -U postgres -c "CREATE DATABASE staging_db;"

# Restore backup
pg_restore -h staging-server -U postgres -d staging_db -j 4 prod_backup_20260210.dump

# Verify restoration
psql -h staging-server -U postgres staging_db -c "SELECT COUNT(*) FROM users;"
```

### Example 2: Selective Table Backup and Restore

```bash
# Backup specific tables for debugging
pg_dump -Fc -t users -t orders -t order_items production_db > tables_backup.dump

# List contents
pg_restore -l tables_backup.dump

# Output:
# ; Archive created at 2026-02-10 14:30:00 UTC
# ; dbname: production_db
# ...
# 3001; 1259 16384 TABLE public users postgres
# 3002; 1259 16385 TABLE public orders postgres
# 3003; 1259 16386 TABLE public order_items postgres
# ...

# Restore only users table to test database
pg_restore -t users -d test_db tables_backup.dump

# Restore with clean (drop existing tables first)
pg_restore --clean -t users -t orders -d test_db tables_backup.dump
```

### Example 3: Clone Database with Pipe

```bash
# Clone database on same server
createdb -T template0 dbname_clone
pg_dump dbname | psql dbname_clone

# Clone to different server
pg_dump -h source-server dbname | psql -h dest-server dbname_clone

# Clone with progress monitoring
pg_dump dbname | pv | psql dbname_clone

# Clone specific schema
pg_dump -n public dbname | psql -d dbname_clone
```

### Example 4: Parallel Dump and Restore

```bash
# Parallel dump using directory format
pg_dump -Fd -j 8 -f /backups/mydb_backup large_database

# Verify directory structure
ls -lh /backups/mydb_backup/
# Output:
# toc.dat
# 3001.dat.gz
# 3002.dat.gz
# ...

# Parallel restore
createdb restored_db
pg_restore -Fd -j 8 -d restored_db /backups/mydb_backup

# Monitor restore progress
watch -n 1 'psql restored_db -c "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;"'
```

### Example 5: Backup with Globals for Complete Cluster Migration

```bash
# Step 1: Backup global objects (roles, tablespaces)
pg_dumpall --globals-only > globals.sql

# Step 2: Backup each database
for db in $(psql -t -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'postgres';"); do
  pg_dump -Fc -Z 9 "$db" > "${db}_backup.dump"
done

# Step 3: Transfer files to new server
# scp globals.sql *.dump new-server:/backups/

# Step 4: On new server, restore globals first
psql -U postgres -f globals.sql

# Step 5: Restore each database
for dump in /backups/*_backup.dump; do
  dbname=$(basename "$dump" _backup.dump)
  createdb "$dbname"
  pg_restore -j 4 -d "$dbname" "$dump"
done
```

### Example 6: Incremental Schema Backup for Version Control

```bash
# Daily schema-only backup for tracking schema changes
pg_dump --schema-only production_db > schema_$(date +%Y%m%d).sql

# Commit to version control
git add schema_$(date +%Y%m%d).sql
git commit -m "Daily schema backup $(date +%Y-%m-%d)"
git push

# View schema differences
git diff schema_20260209.sql schema_20260210.sql
```

### Example 7: Export Data in Different Formats

```bash
# Export as SQL INSERT statements
pg_dump --data-only --inserts -t users production_db > users_inserts.sql

# Export with column names (more portable)
pg_dump --data-only --column-inserts -t users production_db > users_portable.sql

# Export to CSV (using COPY)
psql production_db -c "COPY users TO STDOUT CSV HEADER" > users.csv

# Export to JSON (using psql)
psql production_db -t -A -F"," -c "SELECT row_to_json(t) FROM (SELECT * FROM users) t" > users.json
```

### Example 8: Automated Backup Script

```bash
#!/bin/bash
# /usr/local/bin/pg_backup.sh

# Configuration
DB_NAME="production_db"
BACKUP_DIR="/var/backups/postgresql"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.dump"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Perform backup
pg_dump -Fc -Z 9 "$DB_NAME" > "$BACKUP_FILE"

# Check if backup succeeded
if [ $? -eq 0 ]; then
  echo "Backup successful: $BACKUP_FILE"

  # Get backup size
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "Backup size: $SIZE"

  # Delete old backups
  find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -mtime +$RETENTION_DAYS -delete
  echo "Deleted backups older than $RETENTION_DAYS days"

  # Log success
  logger "PostgreSQL backup successful: $BACKUP_FILE ($SIZE)"
else
  echo "Backup failed!"
  logger "PostgreSQL backup failed for $DB_NAME"
  exit 1
fi
```

## Common Mistakes

### 1. Not Specifying Database Name

**Wrong**:
```bash
pg_dump > backup.sql  # Dumps default database or fails
```

**Correct**:
```bash
pg_dump mydb > backup.sql
```

### 2. Restoring Custom Format with psql

**Wrong**:
```bash
psql mydb < backup.dump  # Binary file, will fail
```

**Correct**:
```bash
pg_restore -d mydb backup.dump
```

### 3. Forgetting to Create Target Database

**Wrong**:
```bash
pg_restore -d newdb backup.dump  # ERROR: database "newdb" does not exist
```

**Correct**:
```bash
createdb newdb
pg_restore -d newdb backup.dump

# Or use --create flag
pg_restore --create -d postgres backup.dump
```

### 4. Not Using Parallel Restore

**Wrong**:
```bash
# Single-threaded restore of 100GB database takes hours
pg_restore -d mydb backup.dump
```

**Correct**:
```bash
# Parallel restore completes in fraction of time
pg_restore -j 8 -d mydb backup.dump
```

### 5. Ignoring Ownership and Privileges

**Wrong**:
```bash
# Restore fails because roles don't exist
pg_restore -d mydb backup.dump
# ERROR: role "old_user" does not exist
```

**Correct**:
```bash
# Skip ownership
pg_restore --no-owner --no-privileges -d mydb backup.dump
# Then manually set ownership if needed
```

### 6. Not Testing Restore Procedures

**Wrong**: Never testing restores until disaster strikes.

**Correct**: Regularly test restore procedures in staging environment.

### 7. Using Plain Format for Large Databases

**Wrong**:
```bash
# Slow dump and restore
pg_dump mydb > backup.sql
psql mydb < backup.sql
```

**Correct**:
```bash
# Faster with custom format and parallel restore
pg_dump -Fc mydb > backup.dump
pg_restore -j 4 -d mydb backup.dump
```

## Best Practices

### 1. Use Custom Format for Production

```bash
# Compression, parallel restore, selective restore
pg_dump -Fc -Z 9 mydb > backup.dump
```

### 2. Automate Backups with Cron

```cron
# /etc/cron.d/postgresql-backup
0 2 * * * postgres /usr/local/bin/pg_backup.sh >> /var/log/pg_backup.log 2>&1
```

### 3. Verify Backups

```bash
# Test restore to verify backup integrity
pg_restore -l backup.dump > /dev/null
if [ $? -eq 0 ]; then
  echo "Backup is valid"
fi
```

### 4. Store Backups Offsite

```bash
# Upload to S3 after backup
aws s3 cp backup.dump s3://my-backups/postgres/$(date +%Y%m%d)/

# Or use rsync
rsync -avz backup.dump backup-server:/backups/
```

### 5. Document Restore Procedures

Create runbook with:
- Connection strings
- Database creation steps
- Restore commands
- Verification queries
- Estimated restore time

### 6. Use Separate Backup User

```sql
-- Create backup user with minimal privileges
CREATE ROLE backup_user WITH LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE mydb TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO backup_user;
```

### 7. Monitor Backup Size and Duration

```bash
# Log backup metrics
BACKUP_START=$(date +%s)
pg_dump -Fc mydb > backup.dump
BACKUP_END=$(date +%s)
BACKUP_SIZE=$(du -h backup.dump | cut -f1)
BACKUP_DURATION=$((BACKUP_END - BACKUP_START))

echo "Backup completed in ${BACKUP_DURATION}s, size: ${BACKUP_SIZE}"
```

## Practice Exercises

### Exercise 1: Implement Automated Backup Rotation

Create a script that backs up a database daily and retains:
- Daily backups for 7 days
- Weekly backups for 4 weeks
- Monthly backups for 12 months

**Solution**:

```bash
#!/bin/bash
# /usr/local/bin/pg_backup_rotation.sh

DB_NAME="production_db"
BACKUP_BASE="/var/backups/postgresql"
DAILY_DIR="${BACKUP_BASE}/daily"
WEEKLY_DIR="${BACKUP_BASE}/weekly"
MONTHLY_DIR="${BACKUP_BASE}/monthly"
DATE=$(date +%Y%m%d)
DAY_OF_WEEK=$(date +%u)  # 1-7 (Monday-Sunday)
DAY_OF_MONTH=$(date +%d)

# Create directories
mkdir -p "$DAILY_DIR" "$WEEKLY_DIR" "$MONTHLY_DIR"

# Daily backup
DAILY_BACKUP="${DAILY_DIR}/${DB_NAME}_${DATE}.dump"
pg_dump -Fc -Z 9 "$DB_NAME" > "$DAILY_BACKUP"

if [ $? -ne 0 ]; then
  echo "Daily backup failed!"
  exit 1
fi

echo "Daily backup created: $DAILY_BACKUP"

# Weekly backup (every Sunday)
if [ "$DAY_OF_WEEK" -eq 7 ]; then
  WEEK_NUM=$(date +%V)
  WEEKLY_BACKUP="${WEEKLY_DIR}/${DB_NAME}_week${WEEK_NUM}.dump"
  cp "$DAILY_BACKUP" "$WEEKLY_BACKUP"
  echo "Weekly backup created: $WEEKLY_BACKUP"
fi

# Monthly backup (first day of month)
if [ "$DAY_OF_MONTH" -eq 01 ]; then
  MONTH=$(date +%Y%m)
  MONTHLY_BACKUP="${MONTHLY_DIR}/${DB_NAME}_${MONTH}.dump"
  cp "$DAILY_BACKUP" "$MONTHLY_BACKUP"
  echo "Monthly backup created: $MONTHLY_BACKUP"
fi

# Cleanup old backups
find "$DAILY_DIR" -name "${DB_NAME}_*.dump" -mtime +7 -delete
find "$WEEKLY_DIR" -name "${DB_NAME}_*.dump" -mtime +28 -delete
find "$MONTHLY_DIR" -name "${DB_NAME}_*.dump" -mtime +365 -delete

echo "Backup rotation completed successfully"
```

### Exercise 2: Selective Table Restore with Dependencies

Restore a subset of tables while respecting foreign key dependencies.

**Solution**:

```bash
# Step 1: Identify tables and dependencies
psql mydb << 'EOF'
SELECT
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('orders', 'order_items', 'products');
EOF

# Step 2: Create backup of required tables
pg_dump -Fc -t users -t products -t orders -t order_items mydb > subset_backup.dump

# Step 3: List restore order
pg_restore -l subset_backup.dump > restore_list.txt

# Step 4: Create target database
createdb restored_subset

# Step 5: Restore in correct order (dependencies first)
# Edit restore_list.txt to reorder if needed, or let PostgreSQL handle it

# Step 6: Restore
pg_restore -L restore_list.txt -d restored_subset subset_backup.dump

# Step 7: Verify foreign keys
psql restored_subset << 'EOF'
SELECT
  COUNT(*) AS orphaned_orders
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE u.id IS NULL;

SELECT
  COUNT(*) AS orphaned_order_items
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.id IS NULL;
EOF
```

### Exercise 3: Compare and Sync Databases

Compare two databases and identify schema differences.

**Solution**:

```bash
#!/bin/bash
# compare_databases.sh

DB1="production"
DB2="staging"

# Dump schemas
pg_dump --schema-only "$DB1" > /tmp/db1_schema.sql
pg_dump --schema-only "$DB2" > /tmp/db2_schema.sql

# Compare schemas
echo "Schema differences between $DB1 and $DB2:"
diff -u /tmp/db1_schema.sql /tmp/db2_schema.sql > /tmp/schema_diff.txt

if [ -s /tmp/schema_diff.txt ]; then
  echo "Differences found:"
  cat /tmp/schema_diff.txt

  # Optionally, sync staging to match production
  read -p "Sync $DB2 to match $DB1 schema? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    psql "$DB2" << 'EOF'
-- Drop all tables in staging
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
EOF

    # Restore production schema to staging
    psql "$DB2" < /tmp/db1_schema.sql
    echo "Schema synced successfully"
  fi
else
  echo "No differences found"
fi

# Cleanup
rm /tmp/db1_schema.sql /tmp/db2_schema.sql /tmp/schema_diff.txt
```

These exercises demonstrate real-world backup scenarios including rotation policies, selective restores with dependencies, and schema comparison.
