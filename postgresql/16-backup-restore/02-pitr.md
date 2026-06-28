# Point-in-Time Recovery (PITR)

## Theory

### Point-in-Time Recovery Concept

Point-in-Time Recovery (PITR) allows restoring a database to any specific moment in time:

**What PITR Provides**:
- Recovery to any point between base backup and present
- Protection against accidental data deletion
- Recovery from application bugs that corrupt data
- Testing "what-if" scenarios by restoring to past states
- Compliance and auditing (reconstruct historical state)

**How PITR Works**:
1. Take periodic base backups (pg_basebackup)
2. Continuously archive Write-Ahead Log (WAL) files
3. To recover: restore base backup + replay WAL to desired time
4. Database state reconstructed by replaying all transactions

**Example Timeline**:
```
12:00 AM - Base backup taken
01:00 AM - WAL archived (segment 000001)
02:00 AM - WAL archived (segment 000002)
03:00 AM - User accidentally drops table
03:15 AM - Error discovered

Recovery:
- Restore base backup from 12:00 AM
- Replay WAL up to 02:59:59 (before table drop)
- Database now at state just before error
```

**Advantages over pg_dump**:
- No downtime during backup (base backup from hot standby)
- Recovery to exact point in time (not just backup time)
- Minimal data loss (RPO in seconds/minutes)
- Can recover from corruption at specific time

**Disadvantages**:
- More complex setup and management
- Requires continuous WAL archiving
- Larger storage requirements (WAL accumulation)
- Recovery time depends on WAL volume (RTO can be hours for large WAL)

### WAL Archiving

Write-Ahead Log (WAL) archiving is the foundation of PITR:

**WAL Basics**:
- PostgreSQL writes all changes to WAL before data files
- WAL files are 16MB segments (default)
- Each segment has unique name (e.g., 000000010000000000000001)
- Segments created sequentially as database writes occur

**Archiving Process**:
1. PostgreSQL fills a WAL segment
2. Before recycling segment, archive_command is triggered
3. Command copies WAL to archive location
4. If command succeeds, segment can be recycled
5. If command fails, WAL accumulates until successful

**Archive Storage**:
- Network file system (NFS)
- Cloud storage (S3, Azure Blob, GCS)
- Remote server via rsync/scp
- Local disk (not recommended for DR)

**Archive Requirements**:
- Reliable and durable storage
- Sufficient space (plan for peak write periods)
- Fast enough to keep up with WAL generation
- Secure (encrypted transfer and storage)

### archive_command

`archive_command` specifies how to archive WAL files:

**Common Commands**:

**Local copy**:
```
archive_command = 'cp %p /mnt/archive/%f'
```

**Remote copy (SSH)**:
```
archive_command = 'rsync -a %p backup-server:/wal_archive/%f'
```

**S3 upload**:
```
archive_command = 'aws s3 cp %p s3://my-bucket/wal_archive/%f'
```

**Placeholders**:
- `%p`: Full path of WAL file to archive
- `%f`: WAL file name only

**Return Codes**:
- 0: Success (WAL can be recycled)
- Non-zero: Failure (WAL retained, command retried)

**Testing**:
```bash
# Test archive_command manually
su - postgres -c 'test -f /path/to/wal && cp /path/to/wal /mnt/archive/ && echo Success'
```

**Best Practices**:
- Use absolute paths
- Test command before production use
- Handle network failures gracefully
- Add compression for remote archives
- Log archive operations

### archive_library (PostgreSQL 15+)

PostgreSQL 15 introduced archive modules as an alternative to archive_command:

**Benefits**:
- Better error handling
- Improved performance (parallel archiving)
- Built-in modules for common destinations
- Extension API for custom modules

**Basic Module**:
```
archive_library = 'basic_archive'
basic_archive.archive_directory = '/mnt/archive'
```

**Comparison**:

| Feature | archive_command | archive_library |
|---------|-----------------|-----------------|
| Performance | Sequential | Parallel capable |
| Error handling | Return code only | Detailed errors |
| Configuration | Shell command | Module + parameters |
| Extensibility | Any shell command | C extension API |

### Continuous Archiving Setup

Complete PITR setup involves:

**1. Enable WAL Archiving**:
```
wal_level = replica
archive_mode = on
archive_command = 'cp %p /mnt/archive/%f'
```

**2. Create Base Backup**:
```bash
pg_basebackup -D /backup/base -Fp -Xs -P
```

**3. Monitor Archiving**:
```sql
SELECT * FROM pg_stat_archiver;
```

**4. Retain Base Backups and WAL**:
- Keep base backups for desired recovery window
- Keep all WAL since oldest base backup
- Clean up old backups and WAL after new base backup

### Recovery Configuration (PostgreSQL 12+)

PostgreSQL 12 changed recovery configuration:

**Pre-PG12 (recovery.conf)**:
- Separate recovery.conf file
- Placed in data directory
- Deleted after recovery completes

**PG12+ (postgresql.conf + recovery signal)**:
- Recovery parameters in postgresql.conf
- Signal file triggers recovery mode
- `recovery.signal` for PITR
- `standby.signal` for streaming replication

**Migration**:
```bash
# Old (PG11 and earlier)
cat > $PGDATA/recovery.conf << 'EOF'
restore_command = 'cp /mnt/archive/%f %p'
recovery_target_time = '2026-02-10 14:30:00'
EOF

# New (PG12+)
# Add to postgresql.conf:
# restore_command = 'cp /mnt/archive/%f %p'
# recovery_target_time = '2026-02-10 14:30:00'

# Create signal file
touch $PGDATA/recovery.signal
```

### restore_command

`restore_command` specifies how to retrieve archived WAL during recovery:

**Common Commands**:

**Local copy**:
```
restore_command = 'cp /mnt/archive/%f %p'
```

**Remote copy**:
```
restore_command = 'rsync backup-server:/wal_archive/%f %p'
```

**S3 download**:
```
restore_command = 'aws s3 cp s3://my-bucket/wal_archive/%f %p'
```

**With fallback**:
```
restore_command = 'cp /mnt/archive/%f %p || exit 1'
```

**Placeholders**:
- `%f`: File name of WAL file needed
- `%p`: Full path where PostgreSQL expects WAL file
- `%r`: File name of last restartpoint

**Return Codes**:
- 0: Success (file found and copied)
- Non-zero: File not found (expected for end of WAL)

### Recovery Targets

Specify recovery stopping point:

**By Time**:
```
recovery_target_time = '2026-02-10 14:30:00'
```

**By LSN (Log Sequence Number)**:
```
recovery_target_lsn = '0/3000000'
```

**By Transaction ID**:
```
recovery_target_xid = '12345'
```

**By Named Restore Point**:
```
recovery_target_name = 'before_migration'
```

**By Timeline**:
```
recovery_target_timeline = 'latest'
```

**Immediate** (end of base backup):
```
recovery_target = 'immediate'
```

**Target Inclusiveness**:
```
recovery_target_inclusive = false  # Stop before target
recovery_target_inclusive = true   # Stop after target (default)
```

**Recovery Target Action**:
```
recovery_target_action = 'pause'    # Pause at target (default)
recovery_target_action = 'promote'  # Automatically promote to read-write
recovery_target_action = 'shutdown' # Shutdown at target
```

### Recovery Timeline

Every time a database is recovered and promoted, a new timeline is created:

**Timeline Concept**:
```
Original timeline (1):
  Base backup ─> WAL ─> Crash at 03:00 AM

Recovery timeline (2):
  Base backup ─> WAL until 02:59 AM ─> Promoted ─> New WAL

Second recovery timeline (3):
  Base backup ─> WAL until 02:58 AM ─> Promoted ─> New WAL
```

**Why Timelines**:
- Prevent accidentally following wrong WAL path
- Enable recovery from recovery (re-recovery)
- Track database history across multiple recoveries

**Timeline Files**:
- Stored as `0000000X.history` in WAL archive
- Records branching point and reason
- Used during recovery to follow correct path

### Creating Restore Points

Named restore points for easier recovery:

```sql
-- Create restore point
SELECT pg_create_restore_point('before_major_migration');

-- During recovery, use:
-- recovery_target_name = 'before_major_migration'
```

**Use Cases**:
- Before risky operations (migrations, bulk updates)
- Daily/weekly checkpoints for quick recovery
- Application version releases
- Data import operations

**Limitations**:
- Only available with wal_level = replica or higher
- Names must be unique
- Require WAL archiving to be useful

### PITR Walkthrough

**Complete PITR process**:

**Phase 1: Setup (Once)**
1. Configure WAL archiving
2. Set up archive storage
3. Test archive and restore commands
4. Schedule regular base backups

**Phase 2: Normal Operations (Continuous)**
1. Database runs normally
2. WAL continuously archived
3. Periodic base backups taken
4. Old base backups and WAL cleaned up

**Phase 3: Disaster/Error Occurs**
1. Identify problem and recovery target time
2. Stop database (if still running)
3. Move/rename data directory (preserve evidence)
4. Restore base backup
5. Configure recovery target
6. Start PostgreSQL in recovery mode
7. Wait for recovery to complete
8. Promote to read-write
9. Verify data integrity
10. Resume normal operations

**Phase 4: Cleanup**
1. Create new base backup
2. Start new timeline
3. Clean up old WAL from original timeline

## Syntax

### WAL Archiving Configuration

```sql
-- postgresql.conf

-- Enable archiving
wal_level = replica              -- or 'logical'
archive_mode = on                -- Enable archiving
archive_command = 'cp %p /mnt/archive/%f'  -- Archive command
archive_timeout = 300            -- Force switch after 5 minutes (optional)

-- PostgreSQL 15+ alternative
archive_library = 'basic_archive'
basic_archive.archive_directory = '/mnt/archive'

-- Monitoring
max_wal_size = 4GB              -- Max WAL before checkpoint
min_wal_size = 1GB              -- Min WAL to keep
wal_keep_size = 1024            -- MB to keep for replication (PG13+)
```

### Creating Base Backup

```bash
# Basic base backup
pg_basebackup -D /backup/base -Fp -Xs -P

# With compression
pg_basebackup -D /backup/base -Ft -z -P

# To specific location with label
pg_basebackup -D /backup/base_20260210 -Fp -Xs -P -l "Daily backup 2026-02-10"

# Parallel (PG15+)
pg_basebackup -D /backup/base -Fp -Xs -P -j 4

# Flags:
# -D: Destination directory
# -F: Format (p=plain, t=tar)
# -X: WAL method (s=stream, f=fetch, n=none)
# -z: Compress tar output
# -P: Show progress
# -l: Label for backup
# -j: Parallel jobs (PG15+)
```

### Recovery Configuration (PG12+)

```sql
-- Add to postgresql.conf
restore_command = 'cp /mnt/archive/%f %p'

-- Recovery target (choose one)
recovery_target_time = '2026-02-10 14:30:00'
# recovery_target_lsn = '0/3000000'
# recovery_target_xid = '12345'
# recovery_target_name = 'restore_point_name'
# recovery_target = 'immediate'

-- Recovery behavior
recovery_target_inclusive = true
recovery_target_action = 'pause'
recovery_target_timeline = 'latest'
```

```bash
# Create recovery signal file
touch /var/lib/postgresql/16/main/recovery.signal

# Start PostgreSQL (will enter recovery mode)
systemctl start postgresql

# Monitor recovery progress
tail -f /var/log/postgresql/postgresql-16-main.log
```

### Monitoring WAL Archiving

```sql
-- Check archiver status
SELECT * FROM pg_stat_archiver;

-- Columns:
-- archived_count: Number of WAL files successfully archived
-- last_archived_wal: Name of last archived WAL file
-- last_archived_time: Time of last successful archive
-- failed_count: Number of failed archive attempts
-- last_failed_wal: Name of last failed WAL file
-- last_failed_time: Time of last failure
-- stats_reset: Time stats were reset

-- Check current WAL file
SELECT pg_walfile_name(pg_current_wal_lsn());

-- Check WAL write location
SELECT pg_current_wal_lsn();

-- Check if WAL file is ready for archiving
SELECT * FROM pg_ls_archive_statusdir();
```

### Creating Restore Points

```sql
-- Create named restore point
SELECT pg_create_restore_point('before_migration');

-- Returns: LSN of restore point
-- Example: 0/3000000

-- Restore points are stored in WAL
-- Use during recovery:
-- recovery_target_name = 'before_migration'
```

### Recovery Process Commands

```bash
# Step 1: Stop PostgreSQL
sudo systemctl stop postgresql

# Step 2: Backup existing data (if possible)
sudo mv /var/lib/postgresql/16/main /var/lib/postgresql/16/main.old

# Step 3: Restore base backup
sudo cp -a /backup/base /var/lib/postgresql/16/main
sudo chown -R postgres:postgres /var/lib/postgresql/16/main

# Step 4: Configure recovery
sudo -u postgres cat >> /var/lib/postgresql/16/main/postgresql.auto.conf << 'EOF'
restore_command = 'cp /mnt/archive/%f %p'
recovery_target_time = '2026-02-10 14:30:00'
recovery_target_action = 'pause'
EOF

# Step 5: Create recovery signal
sudo -u postgres touch /var/lib/postgresql/16/main/recovery.signal

# Step 6: Start PostgreSQL
sudo systemctl start postgresql

# Step 7: Monitor recovery
sudo -u postgres tail -f /var/log/postgresql/postgresql-16-main.log

# Step 8: After recovery reaches target (if action = 'pause')
# Connect and verify data
sudo -u postgres psql -c "SELECT pg_is_in_recovery();"  # Should be true

# Step 9: Promote to read-write
sudo -u postgres psql -c "SELECT pg_promote();"
# Or: sudo -u postgres pg_ctl promote -D /var/lib/postgresql/16/main

# Step 10: Verify promotion
sudo -u postgres psql -c "SELECT pg_is_in_recovery();"  # Should be false
```

## Examples

### Example 1: Complete PITR Setup from Scratch

**Step 1: Configure WAL Archiving**

```bash
# Create archive directory
sudo mkdir -p /mnt/archive/wal
sudo chown postgres:postgres /mnt/archive/wal

# Edit postgresql.conf
sudo -u postgres cat >> /etc/postgresql/16/main/postgresql.conf << 'EOF'
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /mnt/archive/wal/%f && cp %p /mnt/archive/wal/%f'
archive_timeout = 300
EOF

# Restart PostgreSQL
sudo systemctl restart postgresql

# Verify archiving is active
sudo -u postgres psql -c "SELECT * FROM pg_stat_archiver;"
```

**Step 2: Test Archiving**

```bash
# Force WAL switch to trigger archiving
sudo -u postgres psql -c "SELECT pg_switch_wal();"

# Wait a moment, then check archive directory
ls -lh /mnt/archive/wal/

# Should see WAL files like: 000000010000000000000001
```

**Step 3: Create Base Backup**

```bash
# Create backup directory
sudo mkdir -p /backup/base
sudo chown postgres:postgres /backup/base

# Create base backup
sudo -u postgres pg_basebackup -D /backup/base -Fp -Xs -P

# Verify backup
ls -lh /backup/base/
# Should see PostgreSQL data directory structure
```

**Step 4: Simulate Normal Operations**

```bash
# Create test data
sudo -u postgres psql << 'EOF'
CREATE TABLE recovery_test (
  id SERIAL PRIMARY KEY,
  operation VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO recovery_test (operation) VALUES ('Initial data');

-- Create restore point
SELECT pg_create_restore_point('after_initial_data');
EOF

# More operations
sudo -u postgres psql << 'EOF'
INSERT INTO recovery_test (operation) VALUES ('Operation 1');
SELECT pg_sleep(2);
INSERT INTO recovery_test (operation) VALUES ('Operation 2');
SELECT pg_sleep(2);
INSERT INTO recovery_test (operation) VALUES ('Operation 3');
EOF

# Record current time (before "disaster")
RECOVERY_TIME=$(date '+%Y-%m-%d %H:%M:%S')
echo "Recovery target time: $RECOVERY_TIME"

# Simulate disaster
sudo -u postgres psql << 'EOF'
INSERT INTO recovery_test (operation) VALUES ('BAD DATA - SHOULD NOT APPEAR');
DROP TABLE recovery_test;
EOF
```

**Step 5: Perform PITR**

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Backup corrupted data
sudo mv /var/lib/postgresql/16/main /var/lib/postgresql/16/main.corrupted

# Restore base backup
sudo cp -a /backup/base /var/lib/postgresql/16/main
sudo chown -R postgres:postgres /var/lib/postgresql/16/main

# Configure recovery
sudo -u postgres cat > /var/lib/postgresql/16/main/postgresql.auto.conf << EOF
restore_command = 'cp /mnt/archive/wal/%f %p'
recovery_target_time = '$RECOVERY_TIME'
recovery_target_action = 'promote'
EOF

# Create recovery signal
sudo -u postgres touch /var/lib/postgresql/16/main/recovery.signal

# Start recovery
sudo systemctl start postgresql

# Monitor recovery
sudo tail -f /var/log/postgresql/postgresql-16-main.log
# Wait for: "database system is ready to accept connections"
```

**Step 6: Verify Recovery**

```bash
# Check if recovery succeeded
sudo -u postgres psql -c "SELECT * FROM recovery_test ORDER BY id;"

# Should see:
# id | operation     | timestamp
# ----+---------------+-----------
#  1 | Initial data  | ...
#  2 | Operation 1   | ...
#  3 | Operation 2   | ...
#  4 | Operation 3   | ...

# BAD DATA should NOT appear (recovered to before disaster)
```

### Example 2: Recovery Using Named Restore Point

```bash
# Step 1: Create restore point before risky operation
sudo -u postgres psql << 'EOF'
SELECT pg_create_restore_point('before_migration');

-- Output: 0/3000000 (LSN)

-- Perform risky migration
ALTER TABLE users ADD COLUMN new_field INTEGER;
UPDATE users SET new_field = complex_calculation();
-- Oh no, calculation was wrong!
EOF

# Step 2: Recover to restore point
sudo systemctl stop postgresql

sudo mv /var/lib/postgresql/16/main /var/lib/postgresql/16/main.bad

sudo cp -a /backup/base /var/lib/postgresql/16/main

sudo -u postgres cat > /var/lib/postgresql/16/main/postgresql.auto.conf << 'EOF'
restore_command = 'cp /mnt/archive/wal/%f %p'
recovery_target_name = 'before_migration'
recovery_target_action = 'promote'
EOF

sudo -u postgres touch /var/lib/postgresql/16/main/recovery.signal

sudo systemctl start postgresql

# Verify: new_field column should not exist
sudo -u postgres psql -c "\d users"
```

### Example 3: Recovery to Specific Transaction

```bash
# Step 1: Note transaction ID before mistake
sudo -u postgres psql << 'EOF'
BEGIN;
SELECT txid_current();  -- Note this XID, e.g., 12345
INSERT INTO critical_table VALUES ('good data');
COMMIT;

-- Later, bad transaction
BEGIN;
SELECT txid_current();  -- e.g., 12346
DELETE FROM critical_table WHERE important = true;  -- MISTAKE!
COMMIT;
EOF

# Step 2: Recover to before bad transaction
sudo systemctl stop postgresql

sudo mv /var/lib/postgresql/16/main /var/lib/postgresql/16/main.bad

sudo cp -a /backup/base /var/lib/postgresql/16/main

sudo -u postgres cat > /var/lib/postgresql/16/main/postgresql.auto.conf << 'EOF'
restore_command = 'cp /mnt/archive/wal/%f %p'
recovery_target_xid = '12345'
recovery_target_inclusive = true
recovery_target_action = 'promote'
EOF

sudo -u postgres touch /var/lib/postgresql/16/main/recovery.signal

sudo systemctl start postgresql
```

### Example 4: Automated Base Backup with WAL Cleanup

```bash
#!/bin/bash
# /usr/local/bin/pitr_backup.sh

BACKUP_DIR="/backup/postgres"
ARCHIVE_DIR="/mnt/archive/wal"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_LABEL="Automated backup ${DATE}"

# Create backup
echo "Creating base backup..."
pg_basebackup -D "${BACKUP_DIR}/base_${DATE}" -Fp -Xs -P -l "${BACKUP_LABEL}"

if [ $? -ne 0 ]; then
  echo "Backup failed!"
  exit 1
fi

echo "Backup created: ${BACKUP_DIR}/base_${DATE}"

# Record backup completion time (WAL before this can be cleaned up)
BACKUP_LSN=$(psql -t -c "SELECT pg_current_wal_lsn();")
echo "Backup LSN: $BACKUP_LSN"

# Remove old base backups
echo "Cleaning up old base backups..."
find "${BACKUP_DIR}" -name "base_*" -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} \;

# Find oldest remaining base backup
OLDEST_BACKUP=$(find "${BACKUP_DIR}" -name "base_*" -type d | sort | head -1)

if [ -n "$OLDEST_BACKUP" ]; then
  # Get backup start LSN
  OLDEST_LSN=$(cat "${OLDEST_BACKUP}/backup_label" | grep "START WAL LOCATION" | awk '{print $4}')

  # Calculate WAL file name from LSN
  OLDEST_WAL=$(psql -t -c "SELECT pg_walfile_name('${OLDEST_LSN}');")

  echo "Oldest backup requires WAL starting from: $OLDEST_WAL"

  # Remove WAL files older than oldest backup
  # (Be very careful with this - ensure backup is valid first!)
  # find "${ARCHIVE_DIR}" -name "0000*" -type f ! -newer "${OLDEST_BACKUP}" -delete
fi

echo "Backup and cleanup completed successfully"
```

### Example 5: Recovery with Timeline Navigation

```bash
# Scenario: Database recovered twice, need to navigate timelines

# First recovery (creates timeline 2)
# ... recovery process ...
# Database promoted, now on timeline 2

# More work done on timeline 2
# ... operations ...

# Second disaster, need to recover to timeline 1 (original)

# Configure recovery to follow original timeline
sudo -u postgres cat > /var/lib/postgresql/16/main/postgresql.auto.conf << 'EOF'
restore_command = 'cp /mnt/archive/wal/%f %p'
recovery_target_time = '2026-02-10 12:00:00'  # Time on timeline 1
recovery_target_timeline = '1'  # Explicitly follow timeline 1
recovery_target_action = 'promote'
EOF

# Timeline history files in archive show branching:
cat /mnt/archive/wal/00000002.history
# Output:
# 1  0/3000000  before recovery 2026-02-10 14:00:00 UTC
```

## Common Mistakes

### 1. Not Testing restore_command

**Wrong**: Configure restore_command without testing.

**Correct**:
```bash
# Test restore_command manually
sudo -u postgres cp /mnt/archive/wal/000000010000000000000001 /tmp/test_wal
sudo -u postgres rm /tmp/test_wal
echo "Success"
```

### 2. Archive Directory Full

**Wrong**: No monitoring of archive directory space.

**Correct**:
```bash
# Monitor archive directory
df -h /mnt/archive/wal

# Set up alert when > 80% full
```

### 3. Forgetting recovery.signal

**Wrong** (PG12+):
```bash
# Configure recovery but no signal file
# PostgreSQL starts normally, doesn't recover
```

**Correct**:
```bash
touch /var/lib/postgresql/16/main/recovery.signal
```

### 4. Not Cleaning Up Old WAL

**Wrong**: Never clean up archived WAL, disk fills up.

**Correct**:
```bash
# Clean up WAL older than oldest base backup
# After creating new base backup
find /mnt/archive/wal -name "0000*" -mtime +7 -delete
```

### 5. No Base Backup

**Wrong**: Enable archiving but never take base backup.

**Correct**: Take initial base backup immediately after enabling archiving.

### 6. Recovery Target After Last WAL

**Wrong**:
```
recovery_target_time = '2026-02-10 18:00:00'
# But last archived WAL is from 17:00:00
# Recovery will fail or stop at 17:00
```

**Correct**: Ensure recovery target is within available WAL range.

## Best Practices

### 1. Test Recovery Procedures Regularly

```bash
# Monthly recovery test
# 1. Restore base backup to test server
# 2. Perform PITR
# 3. Verify data integrity
# 4. Document recovery time
```

### 2. Monitor Archive Success Rate

```sql
-- Alert if archiving failures
SELECT
  failed_count,
  last_failed_time,
  last_failed_wal
FROM pg_stat_archiver
WHERE failed_count > 0;
```

### 3. Store Archives Remotely

```bash
# Archive to S3 for disaster recovery
archive_command = 'aws s3 cp %p s3://my-backups/wal/%f'

# Or use pgBackRest/Barman for managed archiving
```

### 4. Use Compression for Remote Archives

```bash
# Compress before uploading
archive_command = 'gzip < %p > /tmp/%f.gz && aws s3 cp /tmp/%f.gz s3://backups/wal/ && rm /tmp/%f.gz'
```

### 5. Document Recovery Procedures

Create runbook with:
- Archive and backup locations
- restore_command
- Expected recovery time
- Verification queries
- Escalation contacts

### 6. Create Restore Points Before Risky Operations

```sql
-- Before major migration
SELECT pg_create_restore_point('before_v2_migration');

-- Perform migration
-- If issues, recover to restore point
```

### 7. Automate Base Backups

```cron
# Daily base backup at 2 AM
0 2 * * * postgres /usr/local/bin/pitr_backup.sh >> /var/log/pitr_backup.log 2>&1
```

## Practice Exercises

### Exercise 1: Set Up and Test Complete PITR System

Implement full PITR with testing.

**Solution**: See Example 1 above for complete walkthrough.

### Exercise 2: Implement WAL Archive Rotation

Create script to manage WAL archive cleanup based on base backups.

**Solution**:

```bash
#!/bin/bash
# /usr/local/bin/cleanup_wal_archive.sh

BACKUP_DIR="/backup/postgres"
ARCHIVE_DIR="/mnt/archive/wal"

# Find oldest base backup
OLDEST_BACKUP=$(find "$BACKUP_DIR" -name "base_*" -type d -printf '%T+ %p\n' | sort | head -1 | awk '{print $2}')

if [ -z "$OLDEST_BACKUP" ]; then
  echo "No base backups found"
  exit 1
fi

echo "Oldest backup: $OLDEST_BACKUP"

# Get backup label
BACKUP_LABEL="${OLDEST_BACKUP}/backup_label"

if [ ! -f "$BACKUP_LABEL" ]; then
  echo "Backup label not found"
  exit 1
fi

# Extract start WAL location
START_WAL=$(grep "START WAL LOCATION" "$BACKUP_LABEL" | awk '{print $6}' | tr -d '()')

echo "Oldest required WAL segment: $START_WAL"

# Convert LSN to WAL filename
OLDEST_WAL=$(psql -t -c "SELECT pg_walfile_name('$START_WAL');")

echo "Oldest WAL file: $OLDEST_WAL"

# List WAL files older than oldest required
echo "WAL files that can be safely removed:"
find "$ARCHIVE_DIR" -name "0000*" -type f | sort | while read wal_file; do
  filename=$(basename "$wal_file")
  if [[ "$filename" < "$OLDEST_WAL" ]]; then
    echo "  $wal_file"
    # Uncomment to actually delete:
    # rm "$wal_file"
  fi
done
```

### Exercise 3: Implement Monitoring for Archive Lag

Monitor and alert on archiving delays.

**Solution**:

```sql
-- Create monitoring function
CREATE OR REPLACE FUNCTION monitor_archive_lag()
RETURNS TABLE(
  status TEXT,
  details TEXT,
  seconds_since_last_archive BIGINT
) AS $$
DECLARE
  last_archive_time TIMESTAMP WITH TIME ZONE;
  lag_seconds BIGINT;
BEGIN
  SELECT last_archived_time INTO last_archive_time
  FROM pg_stat_archiver;

  lag_seconds := EXTRACT(EPOCH FROM (NOW() - last_archive_time))::BIGINT;

  RETURN QUERY SELECT
    CASE
      WHEN lag_seconds > 600 THEN 'CRITICAL'  -- > 10 minutes
      WHEN lag_seconds > 300 THEN 'WARNING'   -- > 5 minutes
      ELSE 'OK'
    END,
    'Last archive: ' || last_archive_time::TEXT,
    lag_seconds;
END;
$$ LANGUAGE plpgsql;

-- Query monitoring
SELECT * FROM monitor_archive_lag();

-- Set up periodic check (using pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'check_archive_lag',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  DO $$
  DECLARE
    v_status TEXT;
    v_details TEXT;
    v_lag BIGINT;
  BEGIN
    SELECT status, details, seconds_since_last_archive
    INTO v_status, v_details, v_lag
    FROM monitor_archive_lag();

    IF v_status != 'OK' THEN
      RAISE WARNING 'Archive lag detected: % - %', v_status, v_details;
      -- Add alerting logic here (email, slack, etc.)
    END IF;
  END $$;
  $$
);
```

These exercises provide hands-on experience with PITR setup, management, and monitoring in production environments.
