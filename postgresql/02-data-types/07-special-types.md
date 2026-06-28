# Special Types

## Theory

PostgreSQL offers several specialized data types for specific use cases. These types provide type safety, optimized storage, and specialized operators that make working with certain kinds of data more efficient and intuitive.

### Type Categories

1. **hstore**: Key-value pairs (simple, denormalized)
2. **Composite Types**: Custom structured types (user-defined records)
3. **Range Types**: Continuous ranges of values
4. **Network Types**: IP addresses and MAC addresses
5. **Bit String Types**: Fixed or variable-length bit strings
6. **Bytea**: Binary data
7. **pg_lsn**: Log Sequence Number (replication)

### When to Use Special Types

- **hstore**: Simple key-value data, tags, settings
- **Composite**: Reusable structured data (address, coordinates)
- **Range**: Date ranges, price ranges, inventory levels
- **Network**: IP addresses, subnets, MAC addresses
- **Bit strings**: Flags, permissions, binary protocols
- **Bytea**: Files, images, encrypted data
- **pg_lsn**: Replication monitoring

## Syntax and Examples

### 1. hstore (Key-Value Store)

**Theory**: hstore stores sets of key-value pairs within a single PostgreSQL value. It's useful for semi-structured data with varying attributes.

```sql
-- Enable hstore extension
CREATE EXTENSION IF NOT EXISTS hstore;

-- Create table with hstore
CREATE TABLE products_hstore (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    attributes hstore
);

-- Insert data
INSERT INTO products_hstore (name, attributes) VALUES
('Laptop', 'brand=>Dell, cpu=>i7, ram=>16GB, storage=>512GB SSD'),
('Mouse', 'brand=>Logitech, dpi=>1600, wireless=>true'),
('Monitor', '"brand"=>"Samsung", "size"=>"27inch", "resolution"=>"4K"');

-- Alternative syntax using hstore()
INSERT INTO products_hstore (name, attributes) VALUES
('Keyboard', hstore(ARRAY['brand', 'type', 'backlit'], ARRAY['Corsair', 'mechanical', 'true']));

-- Query hstore data
SELECT name, attributes FROM products_hstore;

-- Access specific key
SELECT
    name,
    attributes -> 'brand' AS brand,
    attributes -> 'cpu' AS cpu
FROM products_hstore;

-- Check if key exists
SELECT name
FROM products_hstore
WHERE attributes ? 'cpu';

-- Check if multiple keys exist
SELECT name
FROM products_hstore
WHERE attributes ?& ARRAY['brand', 'cpu'];  -- All keys exist

SELECT name
FROM products_hstore
WHERE attributes ?| ARRAY['cpu', 'dpi'];  -- Any key exists

-- Contains operator
SELECT name
FROM products_hstore
WHERE attributes @> 'brand=>Dell';

-- Get all keys
SELECT
    name,
    akeys(attributes) AS all_keys
FROM products_hstore;

-- Get all values
SELECT
    name,
    avals(attributes) AS all_values
FROM products_hstore;

-- Convert to JSON
SELECT
    name,
    hstore_to_json(attributes) AS attributes_json
FROM products_hstore;

-- Each key-value pair
SELECT
    name,
    (each(attributes)).*
FROM products_hstore;

-- Update hstore
UPDATE products_hstore
SET attributes = attributes || 'warranty=>2years'
WHERE name = 'Laptop';

-- Delete key
UPDATE products_hstore
SET attributes = delete(attributes, 'warranty')
WHERE name = 'Laptop';

-- Create GIN index
CREATE INDEX idx_attributes ON products_hstore USING GIN (attributes);
```

### 2. Composite Types

**Theory**: Composite types are user-defined structured types that group related fields together, similar to structs in programming languages.

```sql
-- Create composite type for address
CREATE TYPE address_type AS (
    street VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(100)
);

-- Create composite type for coordinates
CREATE TYPE coordinates AS (
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
);

-- Use composite types in table
CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    location_name VARCHAR(100),
    address address_type,
    coords coordinates
);

-- Insert data
INSERT INTO locations (location_name, address, coords) VALUES
('Headquarters',
 ROW('123 Main St', 'New York', 'NY', '10001', 'USA')::address_type,
 ROW(40.7128, -74.0060)::coordinates),
('Branch Office',
 ROW('456 Oak Ave', 'San Francisco', 'CA', '94102', 'USA')::address_type,
 ROW(37.7749, -122.4194)::coordinates);

-- Query composite fields
SELECT
    location_name,
    (address).city,
    (address).state,
    (coords).latitude,
    (coords).longitude
FROM locations;

-- Access entire composite
SELECT
    location_name,
    address
FROM locations;

-- Expand composite type
SELECT
    location_name,
    (address).*
FROM locations;

-- Filter by composite field
SELECT location_name
FROM locations
WHERE (address).state = 'NY';

-- Update composite field
UPDATE locations
SET address.city = 'New York City'
WHERE location_id = 1;

-- Update entire composite
UPDATE locations
SET coords = ROW(40.7589, -73.9851)::coordinates
WHERE location_id = 1;

-- Create table with array of composite types
CREATE TABLE persons (
    person_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    addresses address_type[]
);

INSERT INTO persons (name, addresses) VALUES
('John Doe', ARRAY[
    ROW('100 Home St', 'Boston', 'MA', '02101', 'USA')::address_type,
    ROW('200 Work Ave', 'Cambridge', 'MA', '02138', 'USA')::address_type
]);

SELECT
    name,
    (UNNEST(addresses)).*
FROM persons;
```

### 3. Range Types

**Theory**: Range types represent continuous ranges of values. PostgreSQL provides built-in range types and allows custom range types.

**Built-in Range Types**:
- **int4range**: Range of INTEGER
- **int8range**: Range of BIGINT
- **numrange**: Range of NUMERIC
- **tsrange**: Range of TIMESTAMP
- **tstzrange**: Range of TIMESTAMPTZ
- **daterange**: Range of DATE

```sql
-- Create table with range types
CREATE TABLE hotel_bookings (
    booking_id SERIAL PRIMARY KEY,
    room_number VARCHAR(10),
    guest_name VARCHAR(100),
    booking_period daterange,
    price_range numrange
);

-- Insert bookings
INSERT INTO hotel_bookings (room_number, guest_name, booking_period, price_range) VALUES
('101', 'Alice Johnson', '[2024-06-15, 2024-06-20)', '[100, 150)'),
('102', 'Bob Smith', '[2024-06-18, 2024-06-22)', '[120, 180)'),
('103', 'Carol White', '[2024-06-25, 2024-06-30)', '[100, 150)');

-- Query ranges
SELECT
    room_number,
    guest_name,
    booking_period,
    lower(booking_period) AS check_in,
    upper(booking_period) AS check_out
FROM hotel_bookings;

-- Range operators
-- Contains @>
SELECT room_number, guest_name
FROM hotel_bookings
WHERE booking_period @> '2024-06-19'::DATE;

-- Overlaps &&
SELECT
    room_number,
    guest_name,
    booking_period
FROM hotel_bookings
WHERE booking_period && '[2024-06-17, 2024-06-21)'::daterange;

-- Adjacent -|-
SELECT
    b1.room_number,
    b1.booking_period AS first_booking,
    b2.booking_period AS adjacent_booking
FROM hotel_bookings b1
JOIN hotel_bookings b2
  ON b1.booking_id < b2.booking_id
  AND b1.booking_period -|- b2.booking_period;

-- Strictly left <<
SELECT * FROM hotel_bookings
WHERE booking_period << '[2024-06-20, 2024-06-25)'::daterange;

-- Strictly right >>
SELECT * FROM hotel_bookings
WHERE booking_period >> '[2024-06-20, 2024-06-25)'::daterange;

-- Contains range
SELECT room_number
FROM hotel_bookings
WHERE booking_period @> '[2024-06-16, 2024-06-19)'::daterange;

-- Is contained by
SELECT room_number
FROM hotel_bookings
WHERE '[2024-06-16, 2024-06-17)'::daterange <@ booking_period;

-- Range functions
SELECT
    room_number,
    booking_period,
    lower(booking_period) AS start_date,
    upper(booking_period) AS end_date,
    upper(booking_period) - lower(booking_period) AS nights,
    isempty(booking_period) AS is_empty,
    lower_inc(booking_period) AS lower_inclusive,
    upper_inc(booking_period) AS upper_inclusive
FROM hotel_bookings;

-- Union of ranges
SELECT range_merge(booking_period) AS total_coverage
FROM hotel_bookings
WHERE room_number = '101';

-- Intersection
SELECT
    booking_period * '[2024-06-17, 2024-06-21)'::daterange AS overlap_period
FROM hotel_bookings
WHERE booking_period && '[2024-06-17, 2024-06-21)'::daterange;

-- Find overlapping bookings (conflicts)
SELECT
    b1.room_number,
    b1.guest_name AS guest1,
    b2.guest_name AS guest2,
    b1.booking_period,
    b2.booking_period
FROM hotel_bookings b1
JOIN hotel_bookings b2
  ON b1.booking_id < b2.booking_id
  AND b1.room_number = b2.room_number
  AND b1.booking_period && b2.booking_period;

-- Price range queries
SELECT
    room_number,
    price_range,
    lower(price_range) AS min_price,
    upper(price_range) AS max_price
FROM hotel_bookings
WHERE price_range @> 130::NUMERIC;

-- Create exclusion constraint (prevent overlapping bookings)
CREATE TABLE reservations (
    reservation_id SERIAL PRIMARY KEY,
    room_number VARCHAR(10),
    booking_period tstzrange,
    EXCLUDE USING GIST (room_number WITH =, booking_period WITH &&)
);

-- This will succeed
INSERT INTO reservations (room_number, booking_period)
VALUES ('201', '[2024-06-15 14:00, 2024-06-20 11:00)');

-- This will fail (overlapping booking for same room)
-- INSERT INTO reservations (room_number, booking_period)
-- VALUES ('201', '[2024-06-18 14:00, 2024-06-22 11:00)');

-- Custom range type
CREATE TYPE float_range AS RANGE (
    subtype = float8,
    subtype_diff = float8mi
);

CREATE TABLE measurements (
    measurement_id SERIAL PRIMARY KEY,
    temperature_range float_range,
    humidity_range float_range
);

INSERT INTO measurements (temperature_range, humidity_range)
VALUES ('[20.5, 25.3)', '[40.0, 60.0)');
```

### 4. Network Types

**Theory**: PostgreSQL provides types for storing network addresses with built-in validation and specialized operators.

```sql
-- Create table with network types
CREATE TABLE network_devices (
    device_id SERIAL PRIMARY KEY,
    device_name VARCHAR(100),
    ip_address INET,
    subnet CIDR,
    mac_address MACADDR,
    mac_address_eui64 MACADDR8  -- EUI-64 format
);

-- Insert network data
INSERT INTO network_devices (device_name, ip_address, subnet, mac_address, mac_address_eui64) VALUES
('Router-1', '192.168.1.1', '192.168.1.0/24', '08:00:2b:01:02:03', '08:00:2b:01:02:03:04:05'),
('Server-1', '192.168.1.10', '192.168.1.0/24', '08:00:2b:01:02:04', '08:00:2b:01:02:04:05:06'),
('Workstation-1', '10.0.0.5/32', '10.0.0.0/16', '08:00:2b:01:02:05', '08:00:2b:01:02:05:06:07');

-- Query network data
SELECT
    device_name,
    ip_address,
    host(ip_address) AS ip_only,
    masklen(ip_address) AS prefix_length,
    netmask(ip_address) AS netmask,
    network(ip_address) AS network_address,
    broadcast(ip_address) AS broadcast_address
FROM network_devices;

-- Subnet containment
SELECT device_name, ip_address
FROM network_devices
WHERE subnet >>= '192.168.1.10'::INET;  -- Subnet contains IP

SELECT device_name, ip_address
FROM network_devices
WHERE '192.168.1.10'::INET <<= subnet;  -- IP is within subnet

-- CIDR matching
SELECT device_name, ip_address
FROM network_devices
WHERE ip_address << '192.168.0.0/16'::INET;  -- Strictly within

-- Subnet overlap
SELECT
    d1.device_name,
    d1.subnet,
    d2.device_name,
    d2.subnet
FROM network_devices d1
JOIN network_devices d2
  ON d1.device_id < d2.device_id
  AND d1.subnet && d2.subnet;

-- MAC address operations
SELECT
    device_name,
    mac_address,
    trunc(mac_address) AS manufacturer_oui
FROM network_devices;

-- Network functions
SELECT
    '192.168.1.100'::INET + 10 AS ip_plus_10,
    '192.168.1.100'::INET - 10 AS ip_minus_10,
    '192.168.1.200'::INET - '192.168.1.100'::INET AS ip_difference;

-- Set netmask
SELECT set_masklen('192.168.1.1'::INET, 24) AS with_netmask;

-- Family (IPv4 or IPv6)
SELECT
    ip_address,
    family(ip_address) AS ip_family  -- 4 for IPv4, 6 for IPv6
FROM network_devices;

-- IPv6 support
INSERT INTO network_devices (device_name, ip_address, subnet)
VALUES ('IPv6-Server', '2001:db8::1', '2001:db8::/32');

SELECT
    device_name,
    ip_address,
    family(ip_address) AS ip_version
FROM network_devices;
```

### 5. Bit String Types

**Theory**: BIT and BIT VARYING (VARBIT) store strings of 0s and 1s, useful for flags and binary protocols.

```sql
-- Create table with bit strings
CREATE TABLE permissions (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    permissions BIT(8),  -- Fixed 8 bits
    flags VARBIT  -- Variable length
);

-- Insert bit strings
INSERT INTO permissions (username, permissions, flags) VALUES
('alice', B'11111111', B'101010'),  -- All permissions
('bob', B'11110000', B'1010'),      -- Limited permissions
('charlie', B'10000000', B'1');      -- Minimal permissions

-- Query bit strings
SELECT
    username,
    permissions,
    permissions::INTEGER AS perm_as_int,
    length(flags) AS flag_count
FROM permissions;

-- Bit operations
SELECT
    username,
    permissions,
    permissions & B'11110000' AS masked,           -- AND
    permissions | B'00001111' AS with_extra,       -- OR
    permissions # B'11110000' AS xor_result,       -- XOR
    ~permissions AS inverted,                      -- NOT
    permissions << 2 AS left_shift,
    permissions >> 2 AS right_shift
FROM permissions;

-- Check specific bit
SELECT
    username,
    get_bit(permissions, 0) AS first_bit,  -- 0-indexed
    get_bit(permissions, 7) AS eighth_bit
FROM permissions;

-- Set specific bit
UPDATE permissions
SET permissions = set_bit(permissions, 3, 1)
WHERE username = 'charlie';

-- Position of first 1 bit
SELECT
    username,
    position(B'1' IN permissions) AS first_one_position
FROM permissions;

-- Practical example: Feature flags
CREATE TABLE user_features (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    features BIT(16)  -- 16 feature flags
);

-- Feature flag positions:
-- Bit 0: Premium
-- Bit 1: Beta Access
-- Bit 2: Dark Mode
-- Bit 3: Notifications
-- etc.

INSERT INTO user_features (username, features) VALUES
('alice', B'1111000000000000'),  -- First 4 features enabled
('bob', B'1010000000000000');    -- Premium and Dark Mode

SELECT
    username,
    get_bit(features, 0)::BOOLEAN AS is_premium,
    get_bit(features, 1)::BOOLEAN AS has_beta_access,
    get_bit(features, 2)::BOOLEAN AS dark_mode_enabled
FROM user_features;
```

### 6. Bytea (Binary Data)

**Theory**: BYTEA stores binary strings (blobs), useful for files, images, and encrypted data.

```sql
-- Create table for binary data
CREATE TABLE file_storage (
    file_id SERIAL PRIMARY KEY,
    file_name VARCHAR(255),
    file_type VARCHAR(50),
    file_size INTEGER,
    file_data BYTEA,
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert binary data (hex format)
INSERT INTO file_storage (file_name, file_type, file_data) VALUES
('test.txt', 'text/plain', '\x48656c6c6f20576f726c64'),  -- "Hello World"
('data.bin', 'application/octet-stream', '\xDEADBEEF');

-- Insert using decode
INSERT INTO file_storage (file_name, file_type, file_data) VALUES
('encoded.txt', 'text/plain', decode('48656c6c6f', 'hex'));

-- Query binary data
SELECT
    file_name,
    file_type,
    length(file_data) AS size_bytes,
    encode(file_data, 'hex') AS hex_data,
    encode(file_data, 'escape') AS escaped_data,
    convert_from(file_data, 'UTF8') AS as_text  -- If text data
FROM file_storage;

-- Convert text to bytea
SELECT
    'Hello World'::BYTEA AS bytea_data,
    convert_to('Hello World', 'UTF8') AS utf8_bytea;

-- Bytea functions
SELECT
    substring(file_data FROM 1 FOR 5) AS first_5_bytes,
    position('\x6c6c'::BYTEA IN file_data) AS position_of_ll,
    file_data || '\xFF'::BYTEA AS appended
FROM file_storage
WHERE file_name = 'test.txt';

-- Practical: Store small images/files
-- (For large files, consider storing file path and using file system)
CREATE TABLE user_avatars (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    avatar_data BYTEA,
    avatar_mime_type VARCHAR(50)
);

-- Note: In production, consider file storage services for large files
```

### 7. pg_lsn (Log Sequence Number)

**Theory**: pg_lsn represents PostgreSQL Write-Ahead Log (WAL) positions, used primarily for replication monitoring.

```sql
-- pg_lsn is mainly used in system catalogs and replication
-- Example: Check replication lag

-- Get current WAL position
SELECT pg_current_wal_lsn();

-- Calculate lag (bytes)
SELECT
    pg_wal_lsn_diff(
        pg_current_wal_lsn(),
        '0/0'::pg_lsn
    ) AS bytes_written;

-- pg_lsn comparison
SELECT
    '0/16B5000'::pg_lsn < '0/16B6000'::pg_lsn AS comparison,
    '0/16B6000'::pg_lsn - '0/16B5000'::pg_lsn AS difference_bytes;

-- Practical use: Monitoring replication
-- Query on primary:
SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replication_lag_bytes
FROM pg_stat_replication;
```

## Practical Application: Multi-Type System

```sql
-- Comprehensive example using multiple special types

-- Create types
CREATE TYPE contact_info AS (
    phone VARCHAR(20),
    email VARCHAR(100)
);

-- Create main table
CREATE TABLE properties (
    property_id SERIAL PRIMARY KEY,
    property_name VARCHAR(200),
    address address_type,
    location coordinates,
    price_range numrange,
    availability daterange,
    features hstore,
    network_info INET,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert comprehensive data
INSERT INTO properties (
    property_name,
    address,
    location,
    price_range,
    availability,
    features,
    network_info
) VALUES (
    'Luxury Apartment',
    ROW('789 Park Ave', 'New York', 'NY', '10021', 'USA')::address_type,
    ROW(40.7614, -73.9776)::coordinates,
    '[500000, 600000)'::numrange,
    '[2024-07-01, 2024-12-31)'::daterange,
    'bedrooms=>3, bathrooms=>2, parking=>yes, gym=>yes',
    '192.168.1.100'
);

-- Complex query
SELECT
    property_name,
    (address).city || ', ' || (address).state AS location_str,
    (location).latitude || ',' || (location).longitude AS coords_str,
    lower(price_range) AS min_price,
    upper(price_range) AS max_price,
    features -> 'bedrooms' AS bedrooms,
    features -> 'parking' AS has_parking,
    network_info
FROM properties
WHERE price_range @> 550000::NUMERIC
  AND features ? 'gym'
  AND availability @> CURRENT_DATE;
```

## Common Mistakes

### 1. Not Enabling Extensions

```sql
-- MISTAKE: Using hstore without extension
-- CREATE TABLE test (data hstore);  -- Error!

-- CORRECT: Enable extension first
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE TABLE test (data hstore);
```

### 2. Range Boundary Confusion

```sql
-- MISTAKE: Forgetting that ranges can be inclusive or exclusive
-- '[2024-06-15, 2024-06-20)' includes 15th but excludes 20th

-- Be explicit about boundaries
SELECT
    '[2024-06-15, 2024-06-20)'::daterange AS exclusive_upper,
    '[2024-06-15, 2024-06-20]'::daterange AS inclusive_both;
```

### 3. hstore vs JSONB Choice

```sql
-- MISTAKE: Using hstore for nested data
-- hstore only supports flat key-value pairs

-- CORRECT: Use JSONB for nested structures
CREATE TABLE products (
    simple_attrs hstore,      -- Flat attributes
    complex_data JSONB        -- Nested data
);
```

### 4. Composite Type Updates

```sql
-- MISTAKE: Forgetting parentheses
-- UPDATE locations SET address.city = 'NYC';  -- Error!

-- CORRECT: Use parentheses or ROW syntax
UPDATE locations SET address = ROW(
    (address).street,
    'NYC',
    (address).state,
    (address).zip_code,
    (address).country
)::address_type;
```

### 5. Network Type Comparison

```sql
-- MISTAKE: String comparison
-- WHERE ip_address = '192.168.1.1';  -- Works but not optimal

-- BETTER: Use network operators
WHERE ip_address = '192.168.1.1'::INET;
WHERE ip_address <<= '192.168.1.0/24'::CIDR;
```

## Best Practices

### 1. Use Appropriate Type

```sql
-- Simple key-value: hstore
-- Complex nested: JSONB
-- Structured reusable: Composite type
-- Continuous ranges: Range type
```

### 2. Index Special Types

```sql
-- hstore
CREATE INDEX idx_hstore ON table USING GIN (hstore_column);

-- Range types
CREATE INDEX idx_range ON table USING GIST (range_column);

-- Network types
CREATE INDEX idx_inet ON table USING GIST (inet_column inet_ops);
```

### 3. Validate Input

```sql
-- Add constraints
ALTER TABLE network_devices
ADD CONSTRAINT valid_ipv4
CHECK (family(ip_address) = 4);

-- Use domain for reusable validation
CREATE DOMAIN ipv4 AS INET
CHECK (family(VALUE) = 4);
```

### 4. Document Composite Types

```sql
COMMENT ON TYPE address_type IS 'Standard mailing address structure';
```

## Practice Exercises

### Exercise 1: Event Scheduling with Ranges

Create an event scheduling system using range types to prevent conflicts:

Requirements:
1. Use tstzrange for event time slots
2. Implement exclusion constraint
3. Find available time slots
4. Query overlapping events

<details>
<summary>Solution</summary>

```sql
-- Create events table with exclusion constraint
CREATE TABLE event_schedule (
    event_id SERIAL PRIMARY KEY,
    event_name VARCHAR(200),
    room VARCHAR(50),
    time_slot tstzrange,
    organizer VARCHAR(100),
    EXCLUDE USING GIST (room WITH =, time_slot WITH &&)
);

-- Insert events
INSERT INTO event_schedule (event_name, room, time_slot, organizer) VALUES
('Team Meeting', 'Room A', '[2024-06-15 09:00, 2024-06-15 10:00)', 'Alice'),
('Client Call', 'Room B', '[2024-06-15 10:00, 2024-06-15 11:30)', 'Bob'),
('Workshop', 'Room A', '[2024-06-15 14:00, 2024-06-15 16:00)', 'Carol');

-- Find events at specific time
SELECT event_name, room, time_slot
FROM event_schedule
WHERE time_slot @> '2024-06-15 09:30'::TIMESTAMPTZ;

-- Find overlapping events
SELECT
    e1.event_name,
    e2.event_name,
    e1.time_slot,
    e2.time_slot
FROM event_schedule e1
JOIN event_schedule e2
  ON e1.event_id < e2.event_id
  AND e1.time_slot && e2.time_slot;

-- Find available slots in Room A
WITH busy_times AS (
    SELECT time_slot
    FROM event_schedule
    WHERE room = 'Room A'
      AND time_slot && '[2024-06-15 08:00, 2024-06-15 18:00)'::tstzrange
)
SELECT
    tstzrange(
        COALESCE(upper(LAG(time_slot) OVER (ORDER BY time_slot)), '2024-06-15 08:00'),
        lower(time_slot)
    ) AS available_slot
FROM busy_times;
```

</details>

### Exercise 2: Network Inventory

Create network device inventory with subnet management:

Requirements:
1. Store IP addresses and subnets
2. Find devices in specific subnet
3. Detect IP conflicts
4. Calculate available IPs

<details>
<summary>Solution</summary>

```sql
-- Create network inventory
CREATE TABLE network_inventory (
    device_id SERIAL PRIMARY KEY,
    hostname VARCHAR(100),
    ip_address INET NOT NULL,
    subnet CIDR,
    mac_address MACADDR,
    device_type VARCHAR(50),
    location VARCHAR(100),
    UNIQUE(ip_address)
);

-- Insert devices
INSERT INTO network_inventory (hostname, ip_address, subnet, mac_address, device_type, location) VALUES
('router-1', '192.168.1.1/24', '192.168.1.0/24', '00:1A:2B:3C:4D:5E', 'Router', 'Data Center'),
('server-1', '192.168.1.10/24', '192.168.1.0/24', '00:1A:2B:3C:4D:5F', 'Server', 'Data Center'),
('switch-1', '192.168.2.1/24', '192.168.2.0/24', '00:1A:2B:3C:4D:60', 'Switch', 'Office Floor 1'),
('workstation-1', '192.168.2.10/24', '192.168.2.0/24', '00:1A:2B:3C:4D:61', 'Workstation', 'Office Floor 1');

-- Devices in subnet
SELECT hostname, ip_address, device_type
FROM network_inventory
WHERE ip_address <<= '192.168.1.0/24'::CIDR
ORDER BY ip_address;

-- Devices by location with subnet summary
SELECT
    location,
    COUNT(*) AS device_count,
    ARRAY_AGG(DISTINCT subnet) AS subnets
FROM network_inventory
GROUP BY location;

-- Check for subnet overlaps (conflicts)
SELECT
    n1.subnet AS subnet1,
    n2.subnet AS subnet2
FROM network_inventory n1
JOIN network_inventory n2
  ON n1.device_id < n2.device_id
  AND n1.subnet && n2.subnet;
```

</details>

### Exercise 3: Product Attributes with hstore

Create flexible product catalog using hstore:

Requirements:
1. Store varying product attributes in hstore
2. Query by specific attributes
3. Aggregate attribute statistics
4. Convert to JSON for API

<details>
<summary>Solution</summary>

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS hstore;

-- Create products table
CREATE TABLE flexible_products (
    product_id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE,
    category VARCHAR(50),
    base_price NUMERIC(10, 2),
    attributes hstore
);

-- Create GIN index
CREATE INDEX idx_product_attributes ON flexible_products USING GIN (attributes);

-- Insert varied products
INSERT INTO flexible_products (sku, category, base_price, attributes) VALUES
('LAP-001', 'Electronics', 999.99, 'brand=>Dell, cpu=>i7, ram=>16GB, storage=>512GB SSD, screen=>15.6"'),
('SHIRT-001', 'Clothing', 29.99, 'brand=>Nike, size=>M, color=>Blue, material=>Cotton'),
('BOOK-001', 'Books', 39.99, 'author=>John Doe, pages=>450, isbn=>978-1234567890, publisher=>TechBooks');

-- Query by attribute
SELECT sku, category, attributes -> 'brand' AS brand
FROM flexible_products
WHERE attributes ? 'cpu';

-- Find products with specific attribute value
SELECT sku, base_price, attributes
FROM flexible_products
WHERE attributes @> 'brand=>Dell';

-- Get all unique attributes
SELECT DISTINCT unnest(akeys(attributes)) AS attribute_name
FROM flexible_products
ORDER BY attribute_name;

-- Attributes by category
SELECT
    category,
    COUNT(*) AS product_count,
    array_agg(DISTINCT skeys(attributes)) AS all_attributes
FROM flexible_products
GROUP BY category;

-- Convert to JSON for API
SELECT
    sku,
    jsonb_build_object(
        'category', category,
        'price', base_price,
        'attributes', hstore_to_jsonb(attributes)
    ) AS product_json
FROM flexible_products;
```

</details>

## Related Topics

- [JSON and JSONB](05-json-jsonb.md) - Alternative to hstore for complex data
- [Array Types](06-array-types.md) - Arrays of composite types
- [Date/Time Types](03-date-time-types.md) - Used in range types

## Additional Resources

- PostgreSQL Documentation: [hstore](https://www.postgresql.org/docs/16/hstore.html)
- PostgreSQL Documentation: [Composite Types](https://www.postgresql.org/docs/16/rowtypes.html)
- PostgreSQL Documentation: [Range Types](https://www.postgresql.org/docs/16/rangetypes.html)
- PostgreSQL Documentation: [Network Types](https://www.postgresql.org/docs/16/datatype-net-types.html)
- PostgreSQL Documentation: [Bit Strings](https://www.postgresql.org/docs/16/datatype-bit.html)
- PostgreSQL Documentation: [Binary Data](https://www.postgresql.org/docs/16/datatype-binary.html)
