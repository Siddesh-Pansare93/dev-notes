# Backup & Restore

PostgreSQL offers two complementary backup strategies — logical dumps and continuous WAL archiving — that together cover everything from quick database copies to sub-minute point-in-time recovery after a disaster. This section teaches you both, so you can choose the right tool for any situation and sleep soundly knowing your data is recoverable.

## Table of Contents

### Part 1 — Logical Backups
- [pg_dump and pg_restore](./01-pg-dump-restore.md)
  - Logical backup theory and dump formats (plain, custom, directory, tar)
  - `pg_dump` options: schema-only, data-only, table selection, compression
  - `pg_restore` syntax: parallel restore, selective restore, restore lists
  - `pg_dumpall` for cluster-wide backups including roles and tablespaces
  - Piping dumps, cloning databases, exporting to CSV/JSON
  - Automated backup scripts with rotation (daily, weekly, monthly)
  - Common mistakes and production best practices

### Part 2 — Point-in-Time Recovery
- [Point-in-Time Recovery (PITR)](./02-pitr.md)
  - PITR concepts: base backups, WAL archiving, and the recovery timeline
  - `archive_command` and `archive_library` (PostgreSQL 15+)
  - `pg_basebackup` for creating base backups
  - Recovery configuration: `restore_command` and recovery targets
  - Recovery targets: by time, LSN, transaction ID, named restore point
  - Recovery timelines — what they are and why they matter
  - Named restore points with `pg_create_restore_point`
  - Full PITR walkthroughs: setup, disaster simulation, and recovery
  - WAL archive monitoring, cleanup, and lag alerting

## Learning Path

### Beginner
Start here if you are new to PostgreSQL backups or need to quickly back up a database.

1. Read [pg_dump and pg_restore](./01-pg-dump-restore.md) — Theory section
2. Practice the basic `pg_dump` / `psql` restore commands
3. Learn the four dump formats and when to choose each
4. Study the common mistakes section to avoid painful gotchas

### Intermediate
Once you are comfortable with logical backups, tackle WAL-based recovery.

1. Complete the [pg_dump and pg_restore](./01-pg-dump-restore.md) chapter (all sections including automation)
2. Start [Point-in-Time Recovery (PITR)](./02-pitr.md) — Theory and WAL archiving setup
3. Practice Example 1 in the PITR chapter (complete setup from scratch)
4. Implement the automated base backup script with WAL cleanup

### Advanced
Master the full recovery toolkit for production reliability.

1. Work through all PITR examples: named restore points, XID-based recovery, timeline navigation
2. Build the monitoring function for archive lag (PITR Practice Exercise 3)
3. Implement full backup rotation: daily `pg_dump` + continuous PITR as defense in depth
4. Test your restore procedures regularly against a staging environment — recovery untested is recovery unproven

## What You'll Learn

- How `pg_dump`, `pg_restore`, and `pg_dumpall` work and when to use each
- The four dump formats (plain SQL, custom, directory, tar) and their trade-offs for compression and parallelism
- How to perform selective backups — specific tables, schemas, or data-only exports
- How to automate backups with cron and implement daily/weekly/monthly retention rotation
- How Write-Ahead Log (WAL) archiving works and why it is the foundation of PITR
- How to configure `archive_command` to ship WAL to local storage, remote servers, or S3
- How to perform Point-in-Time Recovery to a specific timestamp, LSN, transaction ID, or named restore point
- How PostgreSQL recovery timelines work and how to navigate them after multiple recoveries
- How to create named restore points before risky migrations and roll back to them if needed
- How to monitor archive health with `pg_stat_archiver` and alert on archiving lag

## Prerequisites

- Comfortable with basic PostgreSQL operations: connecting with `psql`, running queries, creating databases
- Familiarity with the Linux/macOS command line and shell scripting basics (bash)
- Understanding of what a PostgreSQL data directory (`PGDATA`) contains
- No prior backup experience required — the chapters build from first principles

## How to Use This Guide

1. **Read theory before syntax.** Each chapter opens with a Theory section that explains the "why" — do not skip it. Understanding how pg_dump works makes the flags obvious; understanding WAL makes PITR recovery intuitive.
2. **Run the examples hands-on.** Set up a local test database and actually execute the commands. The PITR examples simulate real disasters — recreating them in a safe environment builds muscle memory for when it counts.
3. **Study the Common Mistakes sections.** Both chapters include real mistakes with wrong/correct comparisons. Scanning these before you start can save hours of debugging.
4. **Follow the Best Practices checklists.** Both chapters close with production-grade recommendations — bookmark these for your team's backup runbooks.
5. **Test your restores.** A backup you have never restored is not a backup. The exercises in each chapter are designed to give you real restore practice, not just backup practice.

Your data is only as safe as your last verified restore — build that confidence one exercise at a time.
