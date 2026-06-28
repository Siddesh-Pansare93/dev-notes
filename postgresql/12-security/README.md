# PostgreSQL Security

A practical guide to securing PostgreSQL databases, covering the role and permission system, privilege management, and access control patterns used in real-world applications.

## Table of Contents

### Part 1: Access Control Foundations
1. [Roles and Permissions](./01-roles-permissions.md)

## Learning Path

### Beginner Track
Start here if you are new to PostgreSQL security:
1. Role attributes — LOGIN, SUPERUSER, CREATEDB, CREATEROLE (Roles and Permissions)
2. Creating users and group roles (Roles and Permissions)
3. GRANT and REVOKE basics (Roles and Permissions)
4. Schema USAGE and table-level privileges (Roles and Permissions)

### Intermediate Track
Build on the basics with more nuanced access patterns:
1. Role membership and inheritance (Roles and Permissions)
2. INHERIT vs NOINHERIT and SET ROLE (Roles and Permissions)
3. Column-level privileges (Roles and Permissions)
4. ALTER DEFAULT PRIVILEGES for consistent permission management (Roles and Permissions)

### Advanced Track
Design and audit production-grade permission systems:
1. Complex role hierarchies for multi-team applications (Roles and Permissions)
2. Multi-tenant role isolation (Roles and Permissions)
3. Predefined roles — pg_read_all_data, pg_monitor, pg_write_all_data (Roles and Permissions)
4. Auditing sessions and permission usage with pg_stat_activity (Roles and Permissions)

## What You'll Learn

- How PostgreSQL's role system works — roles as users, groups, or both
- The difference between role attributes (LOGIN, SUPERUSER, CREATEDB) and object privileges (SELECT, INSERT, EXECUTE)
- How to grant and revoke fine-grained privileges on tables, schemas, sequences, and functions
- Role membership, privilege inheritance, and how NOINHERIT changes access behavior
- How to use SET ROLE to operate under a different role for testing or controlled access
- Why ALTER DEFAULT PRIVILEGES matters and how to use it so new objects are automatically accessible
- Column-level security — granting SELECT or UPDATE on specific columns only
- How to structure role hierarchies for real-world scenarios: app services, analysts, admins, tenant isolation
- PostgreSQL 14+ predefined roles as a safer alternative to SUPERUSER for common tasks
- How to audit current permissions and active sessions using system views

## Prerequisites

- Familiarity with PostgreSQL basics: connecting to a database, running queries
- Understanding of SQL DDL — CREATE TABLE, CREATE SCHEMA
- Basic knowledge of how applications connect to databases (connection strings, users)
- No prior security experience required — this guide starts from first principles

## How to Use This Guide

1. **Read the theory first**: Each file opens with a Theory section that explains the mental model before showing syntax — do not skip it.
2. **Run the examples yourself**: Paste the example SQL into psql on a local database to see how permissions actually behave. Watching a permission denial happen is worth more than reading about it.
3. **Test with SET ROLE**: Every permission setup should be validated by switching to the target role and confirming what works and what does not. The examples show you how.
4. **Watch for the common mistakes**: The Common Mistakes section in each file covers pitfalls that trip up experienced developers — forgotten sequence permissions, missing schema USAGE, and over-broad grants.
5. **Do the practice exercises**: The exercises walk through realistic scenarios end-to-end, including setup, granting, and verification. They are the fastest way to build intuition.

Security mistakes in PostgreSQL are often silent — a missing grant does not cause a crash, it just silently blocks access in production. Build the habit of testing permissions explicitly, and you will save yourself hours of debugging.
