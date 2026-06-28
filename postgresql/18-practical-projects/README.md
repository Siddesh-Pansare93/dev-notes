# Practical Projects

Put everything together by building two real-world PostgreSQL database systems from scratch. This section is for developers who have learned the fundamentals and want hands-on experience designing production-grade schemas, enforcing business logic at the database level, and handling the complexity that real applications demand.

## Table of Contents

- [01. E-Commerce Database Design](./01-ecommerce-db.md)
- [02. SaaS Multi-Tenant Database Design](./02-saas-multi-tenant.md)

## Learning Path

### Beginner
Start with the e-commerce project — it introduces the core patterns (foreign keys, constraints, indexes, triggers) in a domain most developers already understand:
1. **E-Commerce — User Management & Product Catalog** — normalized tables, hierarchical categories with `ltree`, product variants, inventory tracking
2. **E-Commerce — Shopping Cart & Order Management** — transactional workflows, status lifecycles, snapshotting data at order time

### Intermediate
Continue through the payment, reviews, and automation sections of the e-commerce project, then move to the SaaS project:
3. **E-Commerce — Payment System, Reviews, Coupons** — tokenized payment storage, flexible discount validation with PL/pgSQL functions, helpfulness voting
4. **E-Commerce — Triggers & Performance** — automating inventory reservation, materialized views for reporting, composite and partial indexes
5. **SaaS — Tenant Management & RBAC** — multi-tenancy strategies, role-based access control, JSONB-stored permissions

### Advanced
Tackle the harder SaaS topics that require thinking about isolation, metering, and security at the database layer:
6. **SaaS — Subscriptions, Billing & Usage Metering** — plan limits enforcement, quota tracking, upsert-based counters, MRR and churn analysis
7. **SaaS — Feature Flags, API Keys & Audit Logging** — gradual feature rollouts, hashed key storage, immutable audit trails
8. **SaaS — Row-Level Security** — session-scoped tenant context, RLS policies, bypassing RLS for admin roles

## What You'll Learn

- Design fully normalized, production-ready schemas for complex domains
- Use `ltree` for efficient hierarchical category trees
- Snapshot mutable data (prices, product names) in transactional records so history stays accurate
- Write PL/pgSQL functions to encapsulate validation logic (coupon validation, quota checks, API key generation)
- Automate business rules with triggers (inventory reservation, order total recalculation, coupon usage counters)
- Implement PostgreSQL Row-Level Security (RLS) to enforce tenant data isolation at the database level
- Track and enforce usage quotas across subscription tiers using upsert patterns
- Manage API keys safely using SHA-256 hashing — never storing raw keys
- Build comprehensive audit logs that capture before/after state for any change
- Create materialized views and targeted indexes to keep analytical queries fast at scale

## Prerequisites

You should be comfortable with:
- Core SQL — `SELECT`, `JOIN`, `GROUP BY`, `INSERT`, `UPDATE`, `DELETE`
- PostgreSQL data types including `JSONB`, `UUID`, `INET`, `DECIMAL`, and `TIMESTAMP`
- Foreign keys, `CHECK` constraints, and `UNIQUE` constraints
- Basic index creation and an understanding of when indexes help
- Writing simple PL/pgSQL functions (helpful but not strictly required for the e-commerce project)

If you need a refresher, work through the earlier sections of this PostgreSQL guide first.

## How to Use This Guide

1. **Run the SQL yourself.** Each file is structured so you can copy schema sections into `psql` or any SQL client and build the database incrementally. Don't just read — execute.
2. **Follow the Theory → Schema → Examples pattern.** Each topic explains the design rationale before showing the DDL and then demonstrates it with real queries. Read the theory even if you're tempted to skip straight to code.
3. **Do the Practice Exercises.** Both projects end with exercises (checkout flow, inventory management, tenant onboarding, usage-based billing) that require you to combine multiple concepts. These are where the real learning happens.
4. **Study the Common Mistakes sections.** These highlight exactly the kind of bugs that make it into production: missing transactions, unsecured tenant queries, application-side total calculations that should be in triggers.
5. **Adapt the schemas to your own projects.** The e-commerce and SaaS patterns appear in countless applications. Once you understand the tradeoffs behind each design decision, you'll recognize where to apply them in your own work.

Real confidence with PostgreSQL comes from building things — start with the e-commerce project and let the SaaS project challenge everything you thought you knew about data isolation.
