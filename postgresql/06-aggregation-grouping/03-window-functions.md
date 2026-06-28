# Window Functions

## Theory

Window functions perform calculations across a set of rows related to the current row, without collapsing the result set like aggregate functions with GROUP BY. They provide access to multiple rows without requiring joins to derived tables, enabling powerful analytics like running totals, rankings, moving averages, and relative row access.

Key concepts:
- **Window**: A set of rows related to the current row, defined by the OVER clause
- **Partitioning**: Divides rows into groups (like GROUP BY), but maintains all rows in output
- **Ordering**: Defines the sequence within each partition for positional and aggregate functions
- **Frame**: Specifies which rows within the partition are included in calculations
- **Non-aggregating**: Unlike GROUP BY, window functions preserve all input rows

Window function categories:
1. **Ranking functions**: ROW_NUMBER, RANK, DENSE_RANK, NTILE, PERCENT_RANK, CUME_DIST
2. **Value functions**: LAG, LEAD, FIRST_VALUE, LAST_VALUE, NTH_VALUE
3. **Aggregate functions**: Any aggregate (SUM, AVG, COUNT, etc.) used with OVER clause
4. **Statistical functions**: PERCENT_RANK, CUME_DIST, NTILE

## Syntax

### Basic Window Function Syntax

```sql
function_name(...) OVER (
    [PARTITION BY partition_expression [, ...]]
    [ORDER BY sort_expression [ASC | DESC] [NULLS {FIRST | LAST}] [, ...]]
    [frame_clause]
)
```

### Frame Clause Syntax

```sql
{ROWS | RANGE | GROUPS} BETWEEN frame_start AND frame_end
{ROWS | RANGE | GROUPS} frame_start

-- frame_start and frame_end can be:
UNBOUNDED PRECEDING
offset PRECEDING
CURRENT ROW
offset FOLLOWING
UNBOUNDED FOLLOWING
```

### Named Windows

```sql
SELECT
    column1,
    function1() OVER w,
    function2() OVER w
FROM table_name
WINDOW w AS (PARTITION BY column2 ORDER BY column3);
```

## Examples

### Window Function Concept and OVER Clause

```sql
-- Create sample employee data
CREATE TEMP TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    department VARCHAR(50),
    salary DECIMAL(10,2),
    hire_date DATE
);

INSERT INTO employees (name, department, salary, hire_date) VALUES
('Alice', 'Engineering', 90000, '2022-01-15'),
('Bob', 'Engineering', 85000, '2022-03-20'),
('Carol', 'Engineering', 95000, '2021-06-10'),
('Dave', 'Sales', 70000, '2022-02-01'),
('Eve', 'Sales', 75000, '2021-08-15'),
('Frank', 'Sales', 72000, '2022-05-01'),
('Grace', 'HR', 65000, '2021-11-20'),
('Henry', 'HR', 68000, '2022-04-10');

-- Basic window function: compare to department average
SELECT
    name,
    department,
    salary,
    AVG(salary) OVER (PARTITION BY department) AS dept_avg_salary,
    salary - AVG(salary) OVER (PARTITION BY department) AS diff_from_dept_avg,
    AVG(salary) OVER () AS company_avg_salary
FROM employees
ORDER BY department, salary DESC;

-- Notice: All rows preserved (unlike GROUP BY)
-- PARTITION BY is like GROUP BY, but doesn't collapse rows
```

### PARTITION BY: Creating Window Partitions

```sql
-- Multiple partitioned calculations
SELECT
    name,
    department,
    salary,
    hire_date,
    -- Department-level aggregates
    COUNT(*) OVER (PARTITION BY department) AS dept_employee_count,
    AVG(salary) OVER (PARTITION BY department) AS dept_avg_salary,
    MAX(salary) OVER (PARTITION BY department) AS dept_max_salary,
    -- Company-level aggregates (no partition = entire table)
    COUNT(*) OVER () AS total_employees,
    AVG(salary) OVER () AS company_avg_salary,
    -- Multiple metrics per employee
    ROUND(
        salary * 100.0 / SUM(salary) OVER (PARTITION BY department),
        2
    ) AS pct_of_dept_payroll
FROM employees
ORDER BY department, salary DESC;

-- Without PARTITION BY = entire result set is the window
SELECT
    name,
    salary,
    SUM(salary) OVER () AS total_payroll,
    salary * 100.0 / SUM(salary) OVER () AS pct_of_total_payroll
FROM employees;
```

### ORDER BY Within Windows

```sql
-- ORDER BY defines row sequence within partition
SELECT
    name,
    department,
    salary,
    hire_date,
    -- Running total within department (ordered by hire_date)
    SUM(salary) OVER (
        PARTITION BY department
        ORDER BY hire_date
    ) AS cumulative_dept_payroll,
    -- Row number within department (ordered by salary descending)
    ROW_NUMBER() OVER (
        PARTITION BY department
        ORDER BY salary DESC
    ) AS salary_rank_in_dept
FROM employees
ORDER BY department, hire_date;

-- ORDER BY affects frame: default is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
SELECT
    name,
    department,
    hire_date,
    salary,
    -- Running count of employees hired up to this date
    COUNT(*) OVER (
        PARTITION BY department
        ORDER BY hire_date
    ) AS employees_hired_so_far,
    -- Running average salary
    AVG(salary) OVER (
        PARTITION BY department
        ORDER BY hire_date
    ) AS avg_salary_so_far
FROM employees
ORDER BY department, hire_date;
```

### ROW_NUMBER(): Sequential Numbering

```sql
-- ROW_NUMBER assigns unique sequential integers
SELECT
    name,
    department,
    salary,
    ROW_NUMBER() OVER (ORDER BY salary DESC) AS overall_salary_rank,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_salary_rank,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY hire_date) AS dept_hire_order
FROM employees
ORDER BY department, salary DESC;

-- Use ROW_NUMBER for top-N per group
WITH ranked_employees AS (
    SELECT
        name,
        department,
        salary,
        ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
    FROM employees
)
SELECT name, department, salary
FROM ranked_employees
WHERE rn <= 2  -- Top 2 earners per department
ORDER BY department, salary DESC;

-- ROW_NUMBER for pagination
SELECT
    name,
    department,
    salary,
    ROW_NUMBER() OVER (ORDER BY name) AS row_num
FROM employees
ORDER BY name
LIMIT 5 OFFSET 0;  -- Page 1
```

### RANK() and DENSE_RANK(): Ranking with Ties

```sql
-- Create data with salary ties
CREATE TEMP TABLE sales_performance (
    salesperson VARCHAR(100),
    region VARCHAR(50),
    sales_amount DECIMAL(10,2)
);

INSERT INTO sales_performance VALUES
('Alice', 'North', 100000),
('Bob', 'North', 100000),    -- Tie with Alice
('Carol', 'North', 95000),
('Dave', 'South', 120000),
('Eve', 'South', 110000),
('Frank', 'South', 110000);  -- Tie with Eve

-- Compare ROW_NUMBER, RANK, and DENSE_RANK
SELECT
    salesperson,
    region,
    sales_amount,
    ROW_NUMBER() OVER (ORDER BY sales_amount DESC) AS row_number,
    RANK() OVER (ORDER BY sales_amount DESC) AS rank,
    DENSE_RANK() OVER (ORDER BY sales_amount DESC) AS dense_rank
FROM sales_performance
ORDER BY sales_amount DESC;

-- Result shows differences:
-- ROW_NUMBER: 1,2,3,4,5,6 (always unique)
-- RANK: 1,1,3,4,5,5 (ties get same rank, next rank skips)
-- DENSE_RANK: 1,1,2,3,4,4 (ties get same rank, next rank consecutive)

-- Ranking within partitions
SELECT
    salesperson,
    region,
    sales_amount,
    RANK() OVER (PARTITION BY region ORDER BY sales_amount DESC) AS regional_rank,
    DENSE_RANK() OVER (PARTITION BY region ORDER BY sales_amount DESC) AS dense_regional_rank
FROM sales_performance
ORDER BY region, sales_amount DESC;
```

### NTILE(): Distributing into Buckets

```sql
-- NTILE divides rows into N roughly equal groups
SELECT
    name,
    department,
    salary,
    NTILE(4) OVER (ORDER BY salary) AS salary_quartile,
    NTILE(3) OVER (PARTITION BY department ORDER BY salary) AS dept_salary_tertile
FROM employees
ORDER BY salary;

-- Use NTILE for percentile analysis
WITH salary_quartiles AS (
    SELECT
        name,
        department,
        salary,
        NTILE(4) OVER (ORDER BY salary) AS quartile
    FROM employees
)
SELECT
    quartile,
    COUNT(*) AS employee_count,
    MIN(salary) AS min_salary,
    MAX(salary) AS max_salary,
    AVG(salary) AS avg_salary
FROM salary_quartiles
GROUP BY quartile
ORDER BY quartile;

-- NTILE for balanced distribution (e.g., assigning tasks)
SELECT
    employee_id,
    name,
    NTILE(3) OVER (ORDER BY employee_id) AS team_assignment
FROM employees;
```

### LAG() and LEAD(): Accessing Adjacent Rows

```sql
-- Create time-series sales data
CREATE TEMP TABLE monthly_sales (
    month DATE,
    region VARCHAR(50),
    revenue DECIMAL(10,2)
);

INSERT INTO monthly_sales VALUES
('2024-01-01', 'North', 100000),
('2024-02-01', 'North', 110000),
('2024-03-01', 'North', 105000),
('2024-01-01', 'South', 95000),
('2024-02-01', 'South', 98000),
('2024-03-01', 'South', 102000);

-- LAG: access previous row, LEAD: access next row
SELECT
    month,
    region,
    revenue,
    LAG(revenue) OVER (PARTITION BY region ORDER BY month) AS prev_month_revenue,
    LEAD(revenue) OVER (PARTITION BY region ORDER BY month) AS next_month_revenue,
    revenue - LAG(revenue) OVER (PARTITION BY region ORDER BY month) AS mom_change,
    ROUND(
        (revenue - LAG(revenue) OVER (PARTITION BY region ORDER BY month)) * 100.0 /
        NULLIF(LAG(revenue) OVER (PARTITION BY region ORDER BY month), 0),
        2
    ) AS mom_pct_change
FROM monthly_sales
ORDER BY region, month;

-- LAG/LEAD with offset and default value
SELECT
    month,
    region,
    revenue,
    LAG(revenue, 1, 0) OVER (PARTITION BY region ORDER BY month) AS prev_month,
    LAG(revenue, 2, 0) OVER (PARTITION BY region ORDER BY month) AS two_months_ago,
    LEAD(revenue, 1, revenue) OVER (PARTITION BY region ORDER BY month) AS next_month
FROM monthly_sales
ORDER BY region, month;
```

### FIRST_VALUE(), LAST_VALUE(), NTH_VALUE()

```sql
-- Access specific rows within window
SELECT
    month,
    region,
    revenue,
    FIRST_VALUE(revenue) OVER (
        PARTITION BY region
        ORDER BY month
    ) AS first_month_revenue,
    LAST_VALUE(revenue) OVER (
        PARTITION BY region
        ORDER BY month
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_month_revenue,
    NTH_VALUE(revenue, 2) OVER (
        PARTITION BY region
        ORDER BY month
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS second_month_revenue,
    revenue - FIRST_VALUE(revenue) OVER (
        PARTITION BY region
        ORDER BY month
    ) AS change_since_first_month
FROM monthly_sales
ORDER BY region, month;

-- Important: LAST_VALUE needs proper frame specification
-- Default frame is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
-- Must use ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING for true last value

SELECT
    name,
    department,
    salary,
    hire_date,
    FIRST_VALUE(name) OVER (
        PARTITION BY department
        ORDER BY hire_date
    ) AS first_hire_in_dept,
    LAST_VALUE(name) OVER (
        PARTITION BY department
        ORDER BY hire_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_hire_in_dept
FROM employees
ORDER BY department, hire_date;
```

### Frame Specifications: ROWS BETWEEN

```sql
-- ROWS: physical row-based frame
CREATE TEMP TABLE daily_metrics (
    metric_date DATE,
    value INTEGER
);

INSERT INTO daily_metrics VALUES
('2024-01-01', 10),
('2024-01-02', 15),
('2024-01-03', 12),
('2024-01-04', 18),
('2024-01-05', 20),
('2024-01-06', 16),
('2024-01-07', 14);

-- Moving averages with ROWS BETWEEN
SELECT
    metric_date,
    value,
    -- 3-day moving average (current + 2 preceding)
    AVG(value) OVER (
        ORDER BY metric_date
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS moving_avg_3day,
    -- 5-day centered moving average (2 before, current, 2 after)
    AVG(value) OVER (
        ORDER BY metric_date
        ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING
    ) AS centered_avg_5day,
    -- Running total
    SUM(value) OVER (
        ORDER BY metric_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total,
    -- Total of next 3 days (including current)
    SUM(value) OVER (
        ORDER BY metric_date
        ROWS BETWEEN CURRENT ROW AND 2 FOLLOWING
    ) AS next_3days_total
FROM daily_metrics
ORDER BY metric_date;

-- Frame specifications with MIN/MAX
SELECT
    metric_date,
    value,
    MIN(value) OVER (
        ORDER BY metric_date
        ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING
    ) AS min_in_5day_window,
    MAX(value) OVER (
        ORDER BY metric_date
        ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING
    ) AS max_in_5day_window
FROM daily_metrics
ORDER BY metric_date;
```

### Frame Specifications: RANGE BETWEEN

```sql
-- RANGE: value-based frame (based on ORDER BY values)
CREATE TEMP TABLE timestamped_events (
    event_time TIMESTAMP,
    event_value INTEGER
);

INSERT INTO timestamped_events VALUES
('2024-01-01 10:00:00', 100),
('2024-01-01 10:05:00', 105),
('2024-01-01 10:10:00', 110),
('2024-01-01 10:15:00', 108),
('2024-01-01 10:20:00', 115);

-- RANGE with intervals
SELECT
    event_time,
    event_value,
    -- All events within 10 minutes before current
    AVG(event_value) OVER (
        ORDER BY event_time
        RANGE BETWEEN INTERVAL '10 minutes' PRECEDING AND CURRENT ROW
    ) AS avg_last_10min,
    COUNT(*) OVER (
        ORDER BY event_time
        RANGE BETWEEN INTERVAL '10 minutes' PRECEDING AND CURRENT ROW
    ) AS count_last_10min
FROM timestamped_events
ORDER BY event_time;

-- RANGE vs ROWS with duplicates
CREATE TEMP TABLE scores (
    player VARCHAR(50),
    score INTEGER
);

INSERT INTO scores VALUES
('Alice', 100),
('Bob', 100),
('Carol', 100),
('Dave', 95),
('Eve', 95);

SELECT
    player,
    score,
    -- ROWS: counts physical rows
    COUNT(*) OVER (ORDER BY score ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS rows_count,
    -- RANGE: includes all rows with same ORDER BY value
    COUNT(*) OVER (ORDER BY score RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS range_count
FROM scores
ORDER BY score, player;
```

### Frame Specifications: GROUPS BETWEEN

```sql
-- GROUPS: groups of peer rows (rows with same ORDER BY value)
SELECT
    player,
    score,
    -- Current group and 1 preceding group
    AVG(score) OVER (
        ORDER BY score
        GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW
    ) AS avg_current_and_prev_group,
    -- Count of players in current and previous score group
    COUNT(*) OVER (
        ORDER BY score
        GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW
    ) AS count_in_2_groups
FROM scores
ORDER BY score DESC, player;
```

### Running Totals and Cumulative Aggregates

```sql
-- Running totals are common window function use case
SELECT
    month,
    region,
    revenue,
    SUM(revenue) OVER (
        PARTITION BY region
        ORDER BY month
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_revenue,
    -- Simplified syntax (default frame when ORDER BY is present)
    SUM(revenue) OVER (PARTITION BY region ORDER BY month) AS cumulative_revenue_short,
    -- Running average
    AVG(revenue) OVER (
        PARTITION BY region
        ORDER BY month
    ) AS running_avg_revenue,
    -- Count of months so far
    COUNT(*) OVER (
        PARTITION BY region
        ORDER BY month
    ) AS month_number
FROM monthly_sales
ORDER BY region, month;

-- Year-to-date calculations
SELECT
    month,
    EXTRACT(YEAR FROM month) AS year,
    region,
    revenue,
    SUM(revenue) OVER (
        PARTITION BY region, EXTRACT(YEAR FROM month)
        ORDER BY month
    ) AS ytd_revenue
FROM monthly_sales
ORDER BY region, month;
```

### Moving Averages

```sql
-- Moving averages smooth out fluctuations
SELECT
    metric_date,
    value,
    -- 3-day simple moving average
    ROUND(AVG(value) OVER (
        ORDER BY metric_date
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ), 2) AS sma_3,
    -- 5-day simple moving average
    ROUND(AVG(value) OVER (
        ORDER BY metric_date
        ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
    ), 2) AS sma_5,
    -- Centered 3-day moving average
    ROUND(AVG(value) OVER (
        ORDER BY metric_date
        ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
    ), 2) AS centered_ma_3
FROM daily_metrics
ORDER BY metric_date;

-- Weighted moving average (manual calculation)
SELECT
    metric_date,
    value,
    ROUND(
        (value * 3 +
         COALESCE(LAG(value, 1) OVER (ORDER BY metric_date), value) * 2 +
         COALESCE(LAG(value, 2) OVER (ORDER BY metric_date), value) * 1
        ) / 6.0,
        2
    ) AS weighted_ma_3
FROM daily_metrics
ORDER BY metric_date;
```

### CUME_DIST() and PERCENT_RANK()

```sql
-- Cumulative distribution and percentile ranking
SELECT
    name,
    department,
    salary,
    -- PERCENT_RANK: relative rank (0 to 1)
    PERCENT_RANK() OVER (ORDER BY salary) AS overall_pct_rank,
    PERCENT_RANK() OVER (PARTITION BY department ORDER BY salary) AS dept_pct_rank,
    -- CUME_DIST: cumulative distribution (proportion of values <= current)
    CUME_DIST() OVER (ORDER BY salary) AS overall_cume_dist,
    CUME_DIST() OVER (PARTITION BY department ORDER BY salary) AS dept_cume_dist,
    -- Convert to percentiles
    ROUND(PERCENT_RANK() OVER (ORDER BY salary) * 100, 1) AS percentile,
    ROUND(CUME_DIST() OVER (ORDER BY salary) * 100, 1) AS cum_dist_pct
FROM employees
ORDER BY salary;

-- Finding rows in specific percentiles
WITH percentile_data AS (
    SELECT
        name,
        salary,
        PERCENT_RANK() OVER (ORDER BY salary) AS pct_rank
    FROM employees
)
SELECT name, salary
FROM percentile_data
WHERE pct_rank >= 0.75  -- Top 25%
ORDER BY salary DESC;
```

### Named Windows (WINDOW Clause)

```sql
-- Define windows once, use multiple times
SELECT
    name,
    department,
    salary,
    hire_date,
    AVG(salary) OVER dept_window AS dept_avg_salary,
    MAX(salary) OVER dept_window AS dept_max_salary,
    MIN(salary) OVER dept_window AS dept_min_salary,
    COUNT(*) OVER dept_window AS dept_employee_count,
    ROW_NUMBER() OVER salary_order AS dept_salary_rank,
    SUM(salary) OVER cumulative AS cumulative_dept_salary
FROM employees
WINDOW
    dept_window AS (PARTITION BY department),
    salary_order AS (PARTITION BY department ORDER BY salary DESC),
    cumulative AS (PARTITION BY department ORDER BY hire_date)
ORDER BY department, salary DESC;

-- Named windows can reference each other
SELECT
    name,
    department,
    salary,
    AVG(salary) OVER base_window AS dept_avg,
    RANK() OVER ordered_window AS salary_rank
FROM employees
WINDOW
    base_window AS (PARTITION BY department),
    ordered_window AS (base_window ORDER BY salary DESC)
ORDER BY department, salary DESC;
```

### Combining Window Functions with Aggregates

```sql
-- Mix GROUP BY aggregates with window functions
WITH dept_stats AS (
    SELECT
        department,
        COUNT(*) AS employee_count,
        AVG(salary) AS avg_salary,
        SUM(salary) AS total_payroll
    FROM employees
    GROUP BY department
)
SELECT
    department,
    employee_count,
    avg_salary,
    total_payroll,
    -- Window functions on aggregated data
    SUM(total_payroll) OVER () AS company_payroll,
    total_payroll * 100.0 / SUM(total_payroll) OVER () AS pct_of_company_payroll,
    RANK() OVER (ORDER BY avg_salary DESC) AS avg_salary_rank,
    ROW_NUMBER() OVER (ORDER BY employee_count DESC) AS size_rank
FROM dept_stats
ORDER BY total_payroll DESC;

-- Window functions in same query as GROUP BY (in subquery or CTE)
SELECT
    e.name,
    e.department,
    e.salary,
    ds.dept_avg_salary,
    e.salary - ds.dept_avg_salary AS diff_from_avg,
    RANK() OVER (PARTITION BY e.department ORDER BY e.salary DESC) AS dept_rank
FROM employees e
JOIN (
    SELECT
        department,
        AVG(salary) AS dept_avg_salary
    FROM employees
    GROUP BY department
) ds ON e.department = ds.department
ORDER BY e.department, e.salary DESC;
```

### Complex Window Function Patterns

```sql
-- Pattern 1: Gap and Island detection
CREATE TEMP TABLE user_activity (
    user_id INTEGER,
    activity_date DATE
);

INSERT INTO user_activity VALUES
(1, '2024-01-01'),
(1, '2024-01-02'),
(1, '2024-01-03'),
(1, '2024-01-05'),  -- Gap
(1, '2024-01-06'),
(2, '2024-01-01'),
(2, '2024-01-03');  -- Gap

-- Identify consecutive activity streaks
WITH activity_gaps AS (
    SELECT
        user_id,
        activity_date,
        activity_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY activity_date))::INTEGER AS streak_group
    FROM user_activity
)
SELECT
    user_id,
    MIN(activity_date) AS streak_start,
    MAX(activity_date) AS streak_end,
    COUNT(*) AS streak_length
FROM activity_gaps
GROUP BY user_id, streak_group
ORDER BY user_id, streak_start;

-- Pattern 2: Comparing current row to multiple statistics
SELECT
    name,
    department,
    salary,
    AVG(salary) OVER (PARTITION BY department) AS dept_avg,
    MAX(salary) OVER (PARTITION BY department) AS dept_max,
    MIN(salary) OVER (PARTITION BY department) AS dept_min,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) OVER (PARTITION BY department) AS dept_median,
    CASE
        WHEN salary >= PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY salary) OVER (PARTITION BY department)
            THEN 'Top 25%'
        WHEN salary >= PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY salary) OVER (PARTITION BY department)
            THEN 'Above Median'
        WHEN salary >= PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY salary) OVER (PARTITION BY department)
            THEN 'Below Median'
        ELSE 'Bottom 25%'
    END AS salary_quartile_category
FROM employees
ORDER BY department, salary DESC;

-- Pattern 3: Conditional window aggregates
SELECT
    month,
    region,
    revenue,
    -- Count of months with revenue > 100000 up to current month
    COUNT(*) FILTER (WHERE revenue > 100000) OVER (
        PARTITION BY region
        ORDER BY month
    ) AS high_revenue_months_so_far,
    -- Average of only high-revenue months
    AVG(revenue) FILTER (WHERE revenue > 100000) OVER (
        PARTITION BY region
        ORDER BY month
    ) AS avg_high_revenue
FROM monthly_sales
ORDER BY region, month;
```

### Advanced Analytics with Window Functions

```sql
-- Cohort analysis using window functions
CREATE TEMP TABLE user_purchases (
    user_id INTEGER,
    purchase_date DATE,
    amount DECIMAL(10,2)
);

INSERT INTO user_purchases VALUES
(1, '2024-01-01', 100),
(1, '2024-02-15', 150),
(1, '2024-03-20', 200),
(2, '2024-01-05', 80),
(2, '2024-01-25', 90),
(3, '2024-02-01', 120);

-- User lifecycle analysis
WITH user_first_purchase AS (
    SELECT
        user_id,
        MIN(purchase_date) AS first_purchase_date
    FROM user_purchases
    GROUP BY user_id
)
SELECT
    up.user_id,
    up.purchase_date,
    up.amount,
    ufp.first_purchase_date,
    (up.purchase_date - ufp.first_purchase_date) AS days_since_first_purchase,
    ROW_NUMBER() OVER (PARTITION BY up.user_id ORDER BY up.purchase_date) AS purchase_number,
    SUM(up.amount) OVER (PARTITION BY up.user_id ORDER BY up.purchase_date) AS lifetime_value,
    AVG(up.amount) OVER (PARTITION BY up.user_id ORDER BY up.purchase_date) AS avg_purchase_to_date
FROM user_purchases up
JOIN user_first_purchase ufp ON up.user_id = ufp.user_id
ORDER BY up.user_id, up.purchase_date;
```

## Common Mistakes

### Mistake 1: Confusing Window Functions with GROUP BY

```sql
-- WRONG: Trying to use window function results in WHERE
SELECT name, salary, AVG(salary) OVER () AS avg_salary
FROM employees
WHERE salary > AVG(salary) OVER ();  -- ERROR: window functions not allowed in WHERE

-- CORRECT: Use subquery or CTE
WITH salary_stats AS (
    SELECT name, salary, AVG(salary) OVER () AS avg_salary
    FROM employees
)
SELECT name, salary, avg_salary
FROM salary_stats
WHERE salary > avg_salary;
```

### Mistake 2: Incorrect Frame Specification for LAST_VALUE

```sql
-- WRONG: Default frame doesn't include future rows
SELECT
    month,
    revenue,
    LAST_VALUE(revenue) OVER (ORDER BY month) AS last_revenue
FROM monthly_sales;
-- Returns current row's value, not actual last value!

-- CORRECT: Specify frame to include all rows
SELECT
    month,
    revenue,
    LAST_VALUE(revenue) OVER (
        ORDER BY month
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS last_revenue
FROM monthly_sales;
```

### Mistake 3: Forgetting ORDER BY in Window Functions

```sql
-- WRONG: No ORDER BY when it's needed
SELECT
    name,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department) AS rn  -- Non-deterministic without ORDER BY
FROM employees;

-- CORRECT: Add ORDER BY for deterministic results
SELECT
    name,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
FROM employees;
```

### Mistake 4: Misunderstanding LAG/LEAD Defaults

```sql
-- WRONG: Not handling NULLs from LAG/LEAD
SELECT
    month,
    revenue,
    revenue - LAG(revenue) OVER (ORDER BY month) AS change
FROM monthly_sales;
-- First row has NULL change

-- CORRECT: Provide default value
SELECT
    month,
    revenue,
    revenue - LAG(revenue, 1, revenue) OVER (ORDER BY month) AS change
FROM monthly_sales;

-- Or handle NULL explicitly
SELECT
    month,
    revenue,
    COALESCE(revenue - LAG(revenue) OVER (ORDER BY month), 0) AS change
FROM monthly_sales;
```

### Mistake 5: Inefficient Window Definitions

```sql
-- WRONG: Repeating same window definition
SELECT
    name,
    AVG(salary) OVER (PARTITION BY department ORDER BY hire_date),
    SUM(salary) OVER (PARTITION BY department ORDER BY hire_date),
    COUNT(*) OVER (PARTITION BY department ORDER BY hire_date)
FROM employees;

-- CORRECT: Use named window
SELECT
    name,
    AVG(salary) OVER w,
    SUM(salary) OVER w,
    COUNT(*) OVER w
FROM employees
WINDOW w AS (PARTITION BY department ORDER BY hire_date);
```

### Mistake 6: Mixing ROWS and RANGE Incorrectly

```sql
-- WRONG: Using RANGE with offset on non-numeric ORDER BY
SELECT
    name,
    salary,
    AVG(salary) OVER (
        ORDER BY name
        RANGE BETWEEN 2 PRECEDING AND CURRENT ROW  -- ERROR: can't use numeric offset with text
    )
FROM employees;

-- CORRECT: Use ROWS for physical offset
SELECT
    name,
    salary,
    AVG(salary) OVER (
        ORDER BY name
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    )
FROM employees;
```

## Best Practices

### 1. Use Named Windows for Readability

```sql
-- Good: Named windows make code more maintainable
SELECT
    name,
    department,
    salary,
    AVG(salary) OVER dept AS dept_avg,
    RANK() OVER dept_salary AS salary_rank,
    SUM(salary) OVER dept_cumulative AS running_total
FROM employees
WINDOW
    dept AS (PARTITION BY department),
    dept_salary AS (dept ORDER BY salary DESC),
    dept_cumulative AS (dept ORDER BY hire_date);
```

### 2. Always Specify ORDER BY for Ranking Functions

```sql
-- Good: Explicit ordering ensures deterministic results
SELECT
    name,
    department,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC, hire_date) AS rank
FROM employees;
```

### 3. Be Explicit About Frame Specifications

```sql
-- Good: Explicit frame specification removes ambiguity
SELECT
    month,
    revenue,
    AVG(revenue) OVER (
        ORDER BY month
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS moving_avg_3month
FROM monthly_sales;
```

### 4. Use CTEs to Separate Window Logic

```sql
-- Good: CTEs make complex window queries readable
WITH monthly_stats AS (
    SELECT
        month,
        region,
        revenue,
        LAG(revenue) OVER (PARTITION BY region ORDER BY month) AS prev_month_revenue
    FROM monthly_sales
)
SELECT
    month,
    region,
    revenue,
    prev_month_revenue,
    revenue - prev_month_revenue AS mom_change,
    (revenue - prev_month_revenue) * 100.0 / NULLIF(prev_month_revenue, 0) AS mom_pct_change
FROM monthly_stats
WHERE prev_month_revenue IS NOT NULL;
```

### 5. Choose Appropriate Ranking Function

```sql
-- Good: Use the right ranking function for your needs
-- ROW_NUMBER: Always unique (1,2,3,4,5,6)
-- RANK: Gaps after ties (1,1,3,4,5,5,7)
-- DENSE_RANK: No gaps (1,1,2,3,4,4,5)

SELECT
    name,
    score,
    ROW_NUMBER() OVER (ORDER BY score DESC) AS unique_rank,
    RANK() OVER (ORDER BY score DESC) AS rank_with_gaps,
    DENSE_RANK() OVER (ORDER BY score DESC) AS dense_rank
FROM test_results;
```

### 6. Consider Performance

```sql
-- Good: Partition appropriately to limit window size
-- Large windows can be expensive

-- If you only need department-level calculations:
SELECT name, AVG(salary) OVER (PARTITION BY department)
FROM employees;

-- Not:
SELECT name, AVG(salary) OVER ()  -- Entire table
FROM employees;
```

### 7. Handle NULLs Appropriately

```sql
-- Good: Explicit NULL handling in LAG/LEAD
SELECT
    month,
    revenue,
    COALESCE(
        LAG(revenue) OVER (ORDER BY month),
        revenue
    ) AS prev_month_or_current
FROM monthly_sales;
```

## Practice Exercises

### Exercise 1: Sales Performance Analysis

Using window functions, analyze sales representative performance:
- Rank salespeople by total sales within each region
- Calculate running total of sales for each salesperson (chronologically)
- Find the difference between each sale and the previous sale for the same salesperson
- Identify sales that are above the salesperson's average

```sql
CREATE TEMP TABLE sales_data (
    sale_id SERIAL PRIMARY KEY,
    salesperson_id INTEGER,
    salesperson_name VARCHAR(100),
    region VARCHAR(50),
    sale_date DATE,
    amount DECIMAL(10,2)
);

INSERT INTO sales_data (salesperson_id, salesperson_name, region, sale_date, amount) VALUES
(1, 'Alice', 'North', '2024-01-01', 1000),
(1, 'Alice', 'North', '2024-01-15', 1500),
(1, 'Alice', 'North', '2024-02-01', 1200),
(2, 'Bob', 'North', '2024-01-05', 2000),
(2, 'Bob', 'North', '2024-01-20', 1800),
(3, 'Carol', 'South', '2024-01-10', 2500),
(3, 'Carol', 'South', '2024-01-25', 2200);

-- Your query should include:
-- 1. Ranking by total sales within region
-- 2. Running total per salesperson
-- 3. Difference from previous sale
-- 4. Indicator if sale is above personal average
```

### Exercise 2: Moving Averages and Trend Analysis

Create a comprehensive time-series analysis with multiple window functions:
- Calculate 3-day and 7-day moving averages
- Identify days where value exceeded the 7-day moving average
- Calculate running min and max within a 7-day window
- Compute day-over-day percentage change

```sql
CREATE TEMP TABLE stock_prices (
    price_date DATE,
    symbol VARCHAR(10),
    closing_price DECIMAL(10,2)
);

-- Insert at least 14 days of data for two stock symbols
-- Your data here

-- Your query should calculate:
-- 1. 3-day and 7-day simple moving averages
-- 2. Boolean flag: is current price > 7-day MA?
-- 3. Rolling 7-day min and max
-- 4. Day-over-day percent change
-- 5. Days until new 7-day high (if applicable)
```

### Exercise 3: Cohort Analysis with Window Functions

Analyze user behavior over time using multiple window functions:
- Identify each user's first purchase date (cohort)
- Number each user's purchases sequentially
- Calculate days between purchases for each user
- Compute running lifetime value for each user
- Rank users within their cohort by lifetime value

```sql
-- Use the user_purchases table created earlier or create new data

-- Your query should:
-- 1. Identify cohort (first purchase month)
-- 2. Assign sequential purchase numbers per user
-- 3. Calculate days since previous purchase
-- 4. Running lifetime value
-- 5. Rank within cohort by current lifetime value
-- 6. Calculate retention (users with 2+ purchases)
```

## Summary

Window functions are powerful tools for analytics without collapsing rows:

- **OVER clause**: Defines the window (PARTITION BY, ORDER BY, frame)
- **Ranking functions**: ROW_NUMBER, RANK, DENSE_RANK, NTILE
- **Value functions**: LAG, LEAD, FIRST_VALUE, LAST_VALUE, NTH_VALUE
- **Frame specifications**:
  - ROWS: Physical row-based frames
  - RANGE: Value-based frames
  - GROUPS: Peer group frames
- **Cumulative statistics**: PERCENT_RANK, CUME_DIST
- **Named windows**: Reusable window definitions (WINDOW clause)
- **Performance**: Window functions often more efficient than self-joins

Key advantages:
- Access to multiple rows without self-joins
- Preserve all rows in output (unlike GROUP BY)
- Support complex analytics (running totals, moving averages, rankings)
- Combine with aggregates for powerful analysis

Previous: [GROUP BY and HAVING](./02-group-by-having.md)
