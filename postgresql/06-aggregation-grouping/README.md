# Aggregation & Grouping

Master PostgreSQL's data summarization toolkit — from everyday aggregate functions and GROUP BY groupings to the full power of window functions for analytics without collapsing rows. This section is for developers and data analysts who need to move beyond raw row retrieval and start turning tables into insights.

## Table of Contents

1. [Aggregate Functions](./01-aggregate-functions.md)
   - COUNT variants and NULL handling
   - SUM, AVG, MIN, MAX
   - Boolean aggregates: `bool_and`, `bool_or`
   - Array aggregates: `array_agg`, `string_agg`
   - JSON aggregates: `jsonb_agg`, `jsonb_object_agg`
   - FILTER clause for conditional aggregation
   - Statistical functions: STDDEV, VARIANCE, PERCENTILE_CONT
   - Common mistakes and best practices

2. [GROUP BY and HAVING](./02-group-by-having.md)
   - Single and multi-column GROUP BY
   - GROUP BY with expressions and aliases (PostgreSQL extension)
   - WHERE vs HAVING: execution order and correct usage
   - Advanced grouping: GROUPING SETS, ROLLUP, CUBE
   - GROUPING() function for identifying super-aggregate rows
   - Multi-level aggregations with CTEs

3. [Window Functions](./03-window-functions.md)
   - OVER clause: PARTITION BY, ORDER BY, frame
   - Ranking functions: ROW_NUMBER, RANK, DENSE_RANK, NTILE
   - Value functions: LAG, LEAD, FIRST_VALUE, LAST_VALUE, NTH_VALUE
   - Frame specifications: ROWS, RANGE, GROUPS
   - Running totals, moving averages, cumulative statistics
   - PERCENT_RANK and CUME_DIST
   - Named windows with the WINDOW clause
   - Complex patterns: gap detection, cohort analysis

## Learning Path

### Beginner
Start here if you are new to SQL aggregation:
1. [Aggregate Functions](./01-aggregate-functions.md) — learn COUNT(*) vs COUNT(col), SUM, AVG, MIN, MAX, and how PostgreSQL handles NULLs
2. [GROUP BY and HAVING](./02-group-by-having.md) — group rows into sets and filter those groups with HAVING

### Intermediate
Once comfortable with basic grouping, level up with:
1. [Aggregate Functions](./01-aggregate-functions.md) — FILTER clause, array_agg, string_agg, JSON aggregates, statistical functions
2. [GROUP BY and HAVING](./02-group-by-having.md) — GROUPING SETS, ROLLUP, CUBE, and the GROUPING() function
3. [Window Functions](./03-window-functions.md) — OVER clause, PARTITION BY, ranking functions (ROW_NUMBER, RANK, DENSE_RANK)

### Advanced
For analytics and reporting work:
1. [Window Functions](./03-window-functions.md) — LAG/LEAD, frame specifications, running totals, moving averages, PERCENT_RANK, CUME_DIST, named windows, gap-and-island detection, cohort analysis

## What You'll Learn

- The difference between `COUNT(*)`, `COUNT(col)`, and `COUNT(DISTINCT col)` — and when each matters
- How PostgreSQL handles NULL values in every major aggregate function
- Using the `FILTER` clause to write conditional aggregations without verbose CASE statements
- Collecting multiple values into arrays, comma-separated strings, or JSON objects in a single query
- The critical distinction between WHERE (filters rows) and HAVING (filters groups after aggregation)
- How GROUPING SETS, ROLLUP, and CUBE generate subtotals and grand totals in a single table scan
- Why window functions preserve all rows while still computing group-level statistics
- Building rankings (ROW_NUMBER, RANK, DENSE_RANK) with predictable tie-breaking behavior
- Accessing adjacent rows with LAG and LEAD for period-over-period change calculations
- Defining precise calculation windows with ROWS, RANGE, and GROUPS frame specifications
- Computing running totals, 3-day and 7-day moving averages, and cumulative distributions
- Reusing window definitions across multiple functions with named WINDOW clauses

## Prerequisites

Before starting this section you should be comfortable with:
- Basic SELECT, FROM, WHERE, and ORDER BY clauses
- Understanding of what a table row and column are
- Familiarity with JOIN syntax (for later window function examples)
- A basic grasp of NULL semantics in SQL

No prior knowledge of aggregation or statistics is required.

## How to Use This Guide

1. **Run every example yourself.** Each file uses `CREATE TEMP TABLE` so examples are self-contained and safe to run in any PostgreSQL session — nothing persists after you disconnect.
2. **Read the Common Mistakes sections.** They address the errors that trip up even experienced SQL writers (wrong COUNT variant, using WHERE for aggregate filters, forgetting ORDER BY in array_agg, etc.).
3. **Do the practice exercises before reading solutions.** Each chapter ends with exercises that combine multiple concepts — working through them cements the material far better than passive reading.
4. **Follow the chapter order for window functions.** The OVER clause, PARTITION BY, ORDER BY, and frame specifications build on each other; jumping ahead often leads to confusion about default frame behavior.
5. **Use the Best Practices checklists as a code review reference.** Before shipping an analytical query, check it against the best practices at the end of each chapter — particularly NULL handling and the FILTER vs CASE WHEN trade-off.

Every query in this section works on real PostgreSQL — no extensions, no external tools, just psql or your preferred client.