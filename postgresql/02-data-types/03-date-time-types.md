# Date and Time Types

## Theory

PostgreSQL provides comprehensive date and time data types with sophisticated timezone handling, making it one of the best databases for temporal data management.

### Date/Time Type Categories

1. **DATE**: Calendar date (year, month, day)
   - Storage: 4 bytes
   - Range: 4713 BC to 5874897 AD
   - Format: YYYY-MM-DD
   - No time component

2. **TIME [ (p) ] [ WITHOUT TIME ZONE ]**: Time of day without date
   - Storage: 8 bytes
   - Range: 00:00:00 to 24:00:00
   - Precision: Up to 6 decimal places (microseconds)
   - No timezone information

3. **TIME [ (p) ] WITH TIME ZONE (TIMETZ)**: Time of day with timezone
   - Storage: 12 bytes
   - Includes UTC offset
   - **Not recommended** (use TIMESTAMPTZ instead)

4. **TIMESTAMP [ (p) ] [ WITHOUT TIME ZONE ]**: Date and time without timezone
   - Storage: 8 bytes
   - Range: 4713 BC to 294276 AD
   - Precision: Up to 6 decimal places
   - No timezone conversion

5. **TIMESTAMP [ (p) ] WITH TIME ZONE (TIMESTAMPTZ)**: Date and time with timezone
   - Storage: 8 bytes
   - **Stores in UTC, displays in session timezone**
   - **Recommended for most use cases**
   - Automatic timezone conversion

6. **INTERVAL [ fields ] [ (p) ]**: Time span
   - Storage: 16 bytes
   - Represents duration (days, hours, minutes, etc.)
   - Used for date arithmetic

### Timezone Handling

PostgreSQL's timezone handling is sophisticated:
- **TIMESTAMPTZ** stores values in UTC internally
- Displays values in the session's timezone (`timezone` setting)
- Converts automatically based on `SET timezone`
- Use `AT TIME ZONE` for explicit conversion

### Important Concepts

- **Current time functions**: `CURRENT_DATE`, `CURRENT_TIME`, `CURRENT_TIMESTAMP`, `NOW()`
- **Extraction**: `EXTRACT()`, `DATE_PART()` - get components
- **Truncation**: `DATE_TRUNC()` - round to specific unit
- **Age calculation**: `AGE()` - calculate intervals between dates

## Syntax

### Basic Type Definitions

```sql
-- Date only
CREATE TABLE events (
    event_date DATE
);

-- Time only
CREATE TABLE schedules (
    start_time TIME,
    end_time TIME
);

-- Timestamp without timezone (avoid for most cases)
CREATE TABLE logs_local (
    created_at TIMESTAMP
);

-- Timestamp with timezone (recommended)
CREATE TABLE logs_global (
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Intervals
CREATE TABLE durations (
    processing_time INTERVAL
);
```

### Precision Specifications

```sql
-- Limit fractional seconds precision
CREATE TABLE precise_times (
    time_0 TIME(0),           -- No fractional seconds
    time_3 TIMESTAMP(3),      -- Milliseconds (3 digits)
    time_6 TIMESTAMPTZ(6)     -- Microseconds (6 digits, default)
);
```

### Timezone Operations

```sql
-- Set session timezone
SET timezone = 'UTC';
SET timezone = 'America/New_York';
SET timezone = 'Europe/London';

-- Show current timezone
SHOW timezone;

-- AT TIME ZONE conversion
SELECT
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
    CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles';
```

## Examples

### DATE Type

```sql
-- Create table with dates
CREATE TABLE project_milestones (
    milestone_id SERIAL PRIMARY KEY,
    project_name VARCHAR(100),
    start_date DATE,
    end_date DATE,
    actual_completion DATE
);

-- Insert dates (various formats)
INSERT INTO project_milestones (project_name, start_date, end_date)
VALUES
    ('Website Redesign', '2024-01-15', '2024-03-15'),
    ('Mobile App', DATE '2024-02-01', DATE '2024-05-01'),
    ('Database Migration', '2024-03-01', '2024-04-30');

-- Current date
INSERT INTO project_milestones (project_name, start_date, end_date)
VALUES ('New Project', CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days');

-- Date arithmetic
SELECT
    project_name,
    start_date,
    end_date,
    end_date - start_date AS duration_days,
    CURRENT_DATE - start_date AS days_since_start
FROM project_milestones;

-- Date comparisons
SELECT project_name, start_date
FROM project_milestones
WHERE start_date > '2024-02-01'
  AND start_date <= CURRENT_DATE;
```

### TIME Type

```sql
-- Create schedule table
CREATE TABLE business_hours (
    day_of_week VARCHAR(10),
    open_time TIME,
    close_time TIME
);

INSERT INTO business_hours VALUES
    ('Monday', '09:00:00', '17:00:00'),
    ('Tuesday', '09:00:00', '17:00:00'),
    ('Friday', '09:00:00', '15:00:00'),
    ('Saturday', '10:00:00', '14:00:00');

-- Time arithmetic
SELECT
    day_of_week,
    open_time,
    close_time,
    close_time - open_time AS hours_open,
    CURRENT_TIME BETWEEN open_time AND close_time AS currently_open
FROM business_hours;

-- Time precision
SELECT
    CURRENT_TIME AS full_precision,
    CURRENT_TIME(0) AS no_seconds,
    CURRENT_TIME(3) AS milliseconds;
```

### TIMESTAMP vs TIMESTAMPTZ

```sql
-- Create comparison tables
CREATE TABLE timestamp_test (
    id SERIAL PRIMARY KEY,
    ts_without TIMESTAMP,
    ts_with TIMESTAMPTZ
);

-- Insert same value to both
INSERT INTO timestamp_test (ts_without, ts_with)
VALUES ('2024-06-15 12:00:00', '2024-06-15 12:00:00');

-- Check current timezone
SHOW timezone;

-- View values in current timezone
SELECT * FROM timestamp_test;

-- Change timezone and view again
SET timezone = 'America/New_York';
SELECT * FROM timestamp_test;

SET timezone = 'Asia/Tokyo';
SELECT * FROM timestamp_test;
-- Note: ts_without stays the same, ts_with adjusts to timezone

-- Reset timezone
SET timezone = 'UTC';
```

### TIMESTAMPTZ Best Practices

```sql
-- Recommended: Always use TIMESTAMPTZ
CREATE TABLE user_activities (
    activity_id SERIAL PRIMARY KEY,
    user_id INTEGER,
    activity_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO user_activities (user_id, activity_type)
VALUES (1, 'login'), (2, 'purchase'), (1, 'logout');

-- Various current timestamp functions
SELECT
    CURRENT_TIMESTAMP AS current_timestamp,
    NOW() AS now,  -- Same as CURRENT_TIMESTAMP
    CLOCK_TIMESTAMP() AS clock_timestamp,  -- Changes during query
    TRANSACTION_TIMESTAMP() AS transaction_timestamp,
    STATEMENT_TIMESTAMP() AS statement_timestamp;

-- Differences between timestamp functions
SELECT
    NOW(),
    pg_sleep(1),
    NOW() AS still_same,  -- Same value (transaction time)
    CLOCK_TIMESTAMP() AS advanced;  -- Advanced by ~1 second
```

### INTERVAL Type

```sql
-- Create table with intervals
CREATE TABLE task_durations (
    task_id SERIAL PRIMARY KEY,
    task_name VARCHAR(100),
    estimated_duration INTERVAL,
    actual_duration INTERVAL
);

INSERT INTO task_durations (task_name, estimated_duration, actual_duration)
VALUES
    ('Code Review', INTERVAL '2 hours', INTERVAL '1 hour 45 minutes'),
    ('Testing', INTERVAL '1 day', INTERVAL '1 day 3 hours'),
    ('Documentation', INTERVAL '4 hours', INTERVAL '5 hours 30 minutes');

-- Interval arithmetic
SELECT
    task_name,
    estimated_duration,
    actual_duration,
    actual_duration - estimated_duration AS variance,
    actual_duration > estimated_duration AS over_estimate
FROM task_durations;

-- Interval construction methods
SELECT
    INTERVAL '1 day' AS day,
    INTERVAL '2 hours 30 minutes' AS hours_mins,
    INTERVAL '1 year 2 months 3 days' AS complex,
    INTERVAL '1.5 hours' AS fractional,
    '1 day'::INTERVAL AS cast_interval;

-- Date arithmetic with intervals
SELECT
    CURRENT_DATE AS today,
    CURRENT_DATE + INTERVAL '1 day' AS tomorrow,
    CURRENT_DATE + INTERVAL '1 week' AS next_week,
    CURRENT_DATE + INTERVAL '1 month' AS next_month,
    CURRENT_DATE + INTERVAL '1 year' AS next_year,
    CURRENT_DATE - INTERVAL '30 days' AS thirty_days_ago;
```

### EXTRACT and DATE_PART

```sql
-- Create events table
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(100),
    event_timestamp TIMESTAMPTZ
);

INSERT INTO events (event_name, event_timestamp)
VALUES
    ('New Year', '2024-01-01 00:00:00+00'),
    ('Spring Event', '2024-04-15 14:30:00+00'),
    ('Summer Conference', '2024-07-20 09:00:00+00'),
    ('Year End', '2024-12-31 23:59:59+00');

-- Extract various components
SELECT
    event_name,
    event_timestamp,
    EXTRACT(YEAR FROM event_timestamp) AS year,
    EXTRACT(MONTH FROM event_timestamp) AS month,
    EXTRACT(DAY FROM event_timestamp) AS day,
    EXTRACT(HOUR FROM event_timestamp) AS hour,
    EXTRACT(MINUTE FROM event_timestamp) AS minute,
    EXTRACT(DOW FROM event_timestamp) AS day_of_week,  -- 0=Sunday
    EXTRACT(DOY FROM event_timestamp) AS day_of_year,
    EXTRACT(WEEK FROM event_timestamp) AS week_number,
    EXTRACT(QUARTER FROM event_timestamp) AS quarter
FROM events;

-- DATE_PART (equivalent to EXTRACT)
SELECT
    event_name,
    DATE_PART('year', event_timestamp) AS year,
    DATE_PART('month', event_timestamp) AS month
FROM events;

-- Extract epoch (seconds since 1970-01-01)
SELECT
    event_timestamp,
    EXTRACT(EPOCH FROM event_timestamp) AS unix_timestamp,
    TO_TIMESTAMP(EXTRACT(EPOCH FROM event_timestamp)) AS back_to_timestamp
FROM events;
```

### DATE_TRUNC

```sql
-- Truncate timestamps to various units
SELECT
    event_timestamp,
    DATE_TRUNC('year', event_timestamp) AS truncated_to_year,
    DATE_TRUNC('month', event_timestamp) AS truncated_to_month,
    DATE_TRUNC('week', event_timestamp) AS truncated_to_week,
    DATE_TRUNC('day', event_timestamp) AS truncated_to_day,
    DATE_TRUNC('hour', event_timestamp) AS truncated_to_hour,
    DATE_TRUNC('minute', event_timestamp) AS truncated_to_minute
FROM events;

-- Practical use: Group by month
INSERT INTO user_activities (user_id, activity_type, created_at)
VALUES
    (1, 'login', '2024-01-05 10:00:00'),
    (2, 'login', '2024-01-15 11:00:00'),
    (1, 'purchase', '2024-01-20 14:00:00'),
    (3, 'login', '2024-02-01 09:00:00'),
    (2, 'purchase', '2024-02-10 16:00:00');

SELECT
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS activity_count,
    COUNT(DISTINCT user_id) AS unique_users
FROM user_activities
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
```

### AGE Function

```sql
-- Create users table with birthdates
CREATE TABLE users_age (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    birthdate DATE,
    registered_at TIMESTAMPTZ
);

INSERT INTO users_age (username, birthdate, registered_at)
VALUES
    ('alice', '1990-05-15', '2020-01-01 10:00:00+00'),
    ('bob', '1985-08-22', '2019-06-15 14:30:00+00'),
    ('charlie', '1995-12-03', '2021-03-10 09:00:00+00');

-- Calculate age
SELECT
    username,
    birthdate,
    AGE(birthdate) AS current_age,
    AGE(CURRENT_DATE, birthdate) AS age_alternative,
    EXTRACT(YEAR FROM AGE(birthdate)) AS years_old
FROM users_age;

-- Account age
SELECT
    username,
    registered_at,
    AGE(CURRENT_TIMESTAMP, registered_at) AS account_age,
    DATE_TRUNC('day', AGE(CURRENT_TIMESTAMP, registered_at)) AS days_since_registration
FROM users_age;

-- Age between two dates
SELECT
    username,
    AGE('2024-01-01'::DATE, birthdate) AS age_on_jan_2024
FROM users_age;
```

### Timezone Conversions

```sql
-- Create global events table
CREATE TABLE global_events (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(100),
    utc_time TIMESTAMPTZ
);

INSERT INTO global_events (event_name, utc_time)
VALUES
    ('Product Launch', '2024-06-15 14:00:00 UTC'),
    ('Webinar', '2024-06-20 16:30:00 UTC');

-- Convert to different timezones
SELECT
    event_name,
    utc_time,
    utc_time AT TIME ZONE 'UTC' AS displayed_utc,
    utc_time AT TIME ZONE 'America/New_York' AS new_york_time,
    utc_time AT TIME ZONE 'Europe/London' AS london_time,
    utc_time AT TIME ZONE 'Asia/Tokyo' AS tokyo_time,
    utc_time AT TIME ZONE 'Australia/Sydney' AS sydney_time
FROM global_events;

-- Store time from different timezone
INSERT INTO global_events (event_name, utc_time)
VALUES ('Regional Meeting', '2024-07-01 10:00:00 America/Los_Angeles');

SELECT * FROM global_events;
```

### Practical Application: Event Management

```sql
-- Comprehensive event management system
CREATE TABLE conference_events (
    event_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(200),
    description TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    timezone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert events
INSERT INTO conference_events (title, description, start_time, end_time, timezone)
VALUES
    ('Opening Keynote', 'Conference opening and welcome',
     '2024-09-15 09:00:00 America/New_York',
     '2024-09-15 10:00:00 America/New_York',
     'America/New_York'),
    ('Technical Workshop', 'Hands-on PostgreSQL workshop',
     '2024-09-15 11:00:00 America/New_York',
     '2024-09-15 13:00:00 America/New_York',
     'America/New_York'),
    ('Closing Session', 'Conference wrap-up',
     '2024-09-15 16:00:00 America/New_York',
     '2024-09-15 17:00:00 America/New_York',
     'America/New_York');

-- Calculate durations
SELECT
    title,
    start_time,
    end_time,
    end_time - start_time AS duration,
    EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 AS hours
FROM conference_events;

-- Find upcoming events
SELECT
    title,
    start_time,
    AGE(start_time, CURRENT_TIMESTAMP) AS time_until_start
FROM conference_events
WHERE start_time > CURRENT_TIMESTAMP
ORDER BY start_time;

-- Display in multiple timezones
SELECT
    title,
    start_time AT TIME ZONE 'America/New_York' AS eastern,
    start_time AT TIME ZONE 'America/Los_Angeles' AS pacific,
    start_time AT TIME ZONE 'Europe/London' AS london,
    start_time AT TIME ZONE 'UTC' AS utc
FROM conference_events;

-- Events grouped by day
SELECT
    DATE_TRUNC('day', start_time) AS event_day,
    COUNT(*) AS event_count,
    MIN(start_time) AS first_event,
    MAX(end_time) AS last_event
FROM conference_events
GROUP BY DATE_TRUNC('day', start_time)
ORDER BY event_day;
```

### Date Ranges and Overlaps

```sql
-- Create booking system
CREATE TABLE room_bookings (
    booking_id SERIAL PRIMARY KEY,
    room_name VARCHAR(50),
    booked_from TIMESTAMPTZ,
    booked_until TIMESTAMPTZ,
    booked_by VARCHAR(100)
);

INSERT INTO room_bookings (room_name, booked_from, booked_until, booked_by)
VALUES
    ('Conference A', '2024-06-15 09:00:00+00', '2024-06-15 11:00:00+00', 'Team Alpha'),
    ('Conference A', '2024-06-15 14:00:00+00', '2024-06-15 16:00:00+00', 'Team Beta'),
    ('Conference B', '2024-06-15 10:00:00+00', '2024-06-15 12:00:00+00', 'Team Gamma');

-- Check for overlapping bookings
SELECT
    a.room_name,
    a.booked_from AS booking1_from,
    a.booked_until AS booking1_until,
    a.booked_by AS booking1_by,
    b.booked_from AS booking2_from,
    b.booked_until AS booking2_until,
    b.booked_by AS booking2_by
FROM room_bookings a
JOIN room_bookings b ON a.room_name = b.room_name
    AND a.booking_id < b.booking_id
WHERE (a.booked_from, a.booked_until) OVERLAPS (b.booked_from, b.booked_until);

-- Find available time slots
SELECT
    room_name,
    booked_from,
    booked_until,
    LEAD(booked_from) OVER (PARTITION BY room_name ORDER BY booked_from) AS next_booking_start,
    LEAD(booked_from) OVER (PARTITION BY room_name ORDER BY booked_from) - booked_until AS gap
FROM room_bookings;
```

## Common Mistakes

### 1. Using TIMESTAMP Instead of TIMESTAMPTZ

```sql
-- MISTAKE: Using TIMESTAMP for global application
CREATE TABLE logs_bad (
    created_at TIMESTAMP  -- Doesn't store timezone!
);

-- BETTER: Use TIMESTAMPTZ
CREATE TABLE logs_good (
    created_at TIMESTAMPTZ
);
```

### 2. Not Considering Timezones

```sql
-- MISTAKE: Assuming all times are in server timezone
SELECT * FROM events WHERE start_time > '2024-06-15 09:00:00';

-- BETTER: Be explicit about timezone
SELECT * FROM events WHERE start_time > '2024-06-15 09:00:00 UTC';
SELECT * FROM events WHERE start_time > '2024-06-15 09:00:00 America/New_York';
```

### 3. Incorrect Date Arithmetic

```sql
-- MISTAKE: Adding integers to timestamps (days only)
SELECT CURRENT_TIMESTAMP + 1;  -- Adds 1 day, but unclear

-- BETTER: Use explicit intervals
SELECT CURRENT_TIMESTAMP + INTERVAL '1 day';
SELECT CURRENT_TIMESTAMP + INTERVAL '2 hours';
```

### 4. Using TIME WITH TIME ZONE

```sql
-- MISTAKE: Using TIMETZ (rarely useful)
CREATE TABLE schedules_bad (
    start_time TIME WITH TIME ZONE
);

-- BETTER: Use TIME or TIMESTAMPTZ
CREATE TABLE schedules_good (
    start_time TIME  -- If you only need time of day
);
```

### 5. Not Handling NULL Dates

```sql
-- MISTAKE: Not handling NULL in date calculations
SELECT CURRENT_DATE - NULL;  -- Returns NULL

-- BETTER: Use COALESCE
SELECT CURRENT_DATE - COALESCE(some_date, CURRENT_DATE);
```

### 6. Incorrect String to Date Conversion

```sql
-- MISTAKE: Relying on implicit conversion
-- INSERT INTO events (event_date) VALUES ('15-06-2024');  -- Might fail

-- BETTER: Use explicit conversion or ISO format
INSERT INTO events (event_date) VALUES (DATE '2024-06-15');
INSERT INTO events (event_date) VALUES (TO_DATE('15-06-2024', 'DD-MM-YYYY'));
```

## Best Practices

### 1. Always Use TIMESTAMPTZ

```sql
-- Standard practice for timestamps
CREATE TABLE entities (
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Set Explicit Timezone

```sql
-- At session level
SET timezone = 'UTC';

-- For specific queries
SELECT start_time AT TIME ZONE 'America/New_York' FROM events;
```

### 3. Use ISO 8601 Format

```sql
-- Standard format: YYYY-MM-DD HH:MI:SS
INSERT INTO events (event_date) VALUES ('2024-06-15');
INSERT INTO events (event_time) VALUES ('2024-06-15 14:30:00');
```

### 4. Add Check Constraints

```sql
CREATE TABLE bookings (
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    CHECK (end_time > start_time)
);
```

### 5. Index Temporal Columns

```sql
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_date ON events(DATE(start_time));
CREATE INDEX idx_events_month ON events(DATE_TRUNC('month', start_time));
```

### 6. Use Triggers for Updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users_age
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

## Practice Exercises

### Exercise 1: Employee Timesheet System

Create a timesheet tracking system:

Requirements:
1. Create tables for employees and time entries
2. Track clock-in and clock-out times (TIMESTAMPTZ)
3. Calculate total hours worked per day
4. Find employees who worked overtime (>8 hours/day)
5. Generate weekly summaries

<details>
<summary>Solution</summary>

```sql
-- Create tables
CREATE TABLE employees (
    employee_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100),
    hire_date DATE
);

CREATE TABLE time_entries (
    entry_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(employee_id),
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    CHECK (clock_out > clock_in)
);

-- Insert employees
INSERT INTO employees (name, hire_date) VALUES
    ('Alice Johnson', '2020-01-15'),
    ('Bob Smith', '2021-03-22'),
    ('Carol White', '2022-06-10');

-- Insert time entries
INSERT INTO time_entries (employee_id, clock_in, clock_out) VALUES
    (1, '2024-06-10 08:00:00+00', '2024-06-10 17:00:00+00'),
    (1, '2024-06-11 08:00:00+00', '2024-06-11 18:30:00+00'),
    (2, '2024-06-10 09:00:00+00', '2024-06-10 17:30:00+00'),
    (2, '2024-06-11 09:00:00+00', '2024-06-11 17:00:00+00'),
    (3, '2024-06-10 07:30:00+00', '2024-06-10 16:30:00+00');

-- Calculate hours worked per day
SELECT
    e.name,
    DATE(te.clock_in) AS work_date,
    te.clock_in,
    te.clock_out,
    EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600 AS hours_worked
FROM time_entries te
JOIN employees e ON te.employee_id = e.employee_id
ORDER BY e.name, work_date;

-- Find overtime (>8 hours)
SELECT
    e.name,
    DATE(te.clock_in) AS work_date,
    EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600 AS hours_worked,
    EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600 - 8 AS overtime_hours
FROM time_entries te
JOIN employees e ON te.employee_id = e.employee_id
WHERE EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600 > 8;

-- Weekly summary
SELECT
    e.name,
    DATE_TRUNC('week', te.clock_in) AS week_start,
    COUNT(*) AS days_worked,
    SUM(EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600) AS total_hours
FROM time_entries te
JOIN employees e ON te.employee_id = e.employee_id
GROUP BY e.name, DATE_TRUNC('week', te.clock_in)
ORDER BY week_start, e.name;
```

</details>

### Exercise 2: Subscription Management

Create a subscription management system with trial periods and renewals:

Requirements:
1. Track subscription start dates, end dates, trial periods
2. Calculate remaining days in subscription
3. Find subscriptions expiring in next 7 days
4. Determine subscription age and renewal count
5. Handle different timezones for global customers

<details>
<summary>Solution</summary>

```sql
-- Create tables
CREATE TABLE subscriptions (
    subscription_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_name VARCHAR(100),
    customer_timezone VARCHAR(50),
    start_date DATE,
    end_date DATE,
    trial_end_date DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date >= start_date)
);

-- Insert subscriptions
INSERT INTO subscriptions (customer_name, customer_timezone, start_date, end_date, trial_end_date)
VALUES
    ('Alice Corp', 'America/New_York', '2024-01-01', '2024-12-31', '2024-01-15'),
    ('Bob Industries', 'Europe/London', '2024-03-15', '2024-06-15', '2024-03-30'),
    ('Charlie Ltd', 'Asia/Tokyo', '2024-05-01', '2025-05-01', '2024-05-15'),
    ('Delta Inc', 'America/Los_Angeles', '2024-06-01', '2024-07-01', '2024-06-08');

-- Calculate remaining days
SELECT
    customer_name,
    start_date,
    end_date,
    end_date - CURRENT_DATE AS days_remaining,
    CASE
        WHEN end_date < CURRENT_DATE THEN 'Expired'
        WHEN end_date - CURRENT_DATE <= 7 THEN 'Expiring Soon'
        ELSE 'Active'
    END AS status
FROM subscriptions
ORDER BY days_remaining;

-- Find expiring in next 7 days
SELECT
    customer_name,
    end_date,
    end_date - CURRENT_DATE AS days_until_expiry
FROM subscriptions
WHERE end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY end_date;

-- Subscription age and metrics
SELECT
    customer_name,
    start_date,
    end_date,
    AGE(CURRENT_DATE, start_date) AS subscription_age,
    end_date - start_date AS subscription_length,
    trial_end_date - start_date AS trial_period_length,
    CASE
        WHEN CURRENT_DATE <= trial_end_date THEN true
        ELSE false
    END AS is_trial
FROM subscriptions;

-- Display in customer's timezone
SELECT
    customer_name,
    customer_timezone,
    created_at AT TIME ZONE customer_timezone AS created_local,
    start_date,
    end_date
FROM subscriptions;
```

</details>

### Exercise 3: Event Scheduling with Timezones

Create a multi-timezone event scheduler:

Requirements:
1. Store events with start/end times in UTC
2. Display events in multiple timezones
3. Find conflicting events
4. Calculate event durations
5. Generate daily schedules

<details>
<summary>Solution</summary>

```sql
-- Create events table
CREATE TABLE scheduled_events (
    event_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(200),
    description TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    organizer VARCHAR(100),
    CHECK (end_time > start_time)
);

-- Insert events (stored in UTC)
INSERT INTO scheduled_events (title, description, start_time, end_time, organizer) VALUES
    ('Team Standup', 'Daily standup meeting',
     '2024-06-15 14:00:00 UTC', '2024-06-15 14:30:00 UTC', 'Alice'),
    ('Client Call', 'Q2 review with client',
     '2024-06-15 15:00:00 UTC', '2024-06-15 16:00:00 UTC', 'Bob'),
    ('Code Review', 'Review PRs',
     '2024-06-15 14:15:00 UTC', '2024-06-15 15:00:00 UTC', 'Carol');

-- Display in multiple timezones
SELECT
    title,
    start_time AT TIME ZONE 'UTC' AS utc_time,
    start_time AT TIME ZONE 'America/New_York' AS eastern_time,
    start_time AT TIME ZONE 'America/Los_Angeles' AS pacific_time,
    start_time AT TIME ZONE 'Europe/London' AS london_time,
    start_time AT TIME ZONE 'Asia/Tokyo' AS tokyo_time
FROM scheduled_events
ORDER BY start_time;

-- Find overlapping events
SELECT
    a.title AS event1,
    b.title AS event2,
    a.start_time,
    a.end_time,
    b.start_time AS event2_start,
    b.end_time AS event2_end
FROM scheduled_events a
JOIN scheduled_events b ON a.event_id < b.event_id
WHERE (a.start_time, a.end_time) OVERLAPS (b.start_time, b.end_time);

-- Calculate durations
SELECT
    title,
    start_time,
    end_time,
    end_time - start_time AS duration,
    EXTRACT(EPOCH FROM (end_time - start_time)) / 60 AS minutes
FROM scheduled_events
ORDER BY start_time;

-- Daily schedule
SELECT
    DATE_TRUNC('day', start_time) AS day,
    STRING_AGG(
        title || ' (' || TO_CHAR(start_time AT TIME ZONE 'America/New_York', 'HH24:MI') || ')',
        ', '
        ORDER BY start_time
    ) AS events
FROM scheduled_events
GROUP BY DATE_TRUNC('day', start_time)
ORDER BY day;
```

</details>

## Related Topics

- [Numeric Types](01-numeric-types.md) - EXTRACT returns numeric values
- [Text Types](02-text-types.md) - Date formatting and parsing
- [Special Types](07-special-types.md) - Range types include date ranges

## Additional Resources

- PostgreSQL Documentation: [Date/Time Types](https://www.postgresql.org/docs/16/datatype-datetime.html)
- PostgreSQL Documentation: [Date/Time Functions](https://www.postgresql.org/docs/16/functions-datetime.html)
- PostgreSQL Documentation: [Timezone Handling](https://www.postgresql.org/docs/16/datatype-datetime.html#DATATYPE-TIMEZONES)
