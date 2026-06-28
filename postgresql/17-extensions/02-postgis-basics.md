# PostGIS Basics

## Table of Contents
- [Introduction to PostGIS](#introduction-to-postgis)
- [Installing PostGIS](#installing-postgis)
- [Geometry vs Geography Types](#geometry-vs-geography-types)
- [Spatial Reference Systems (SRID)](#spatial-reference-systems-srid)
- [Creating Spatial Tables](#creating-spatial-tables)
- [Point Creation and Operations](#point-creation-and-operations)
- [Distance Calculations](#distance-calculations)
- [Spatial Queries](#spatial-queries)
- [Spatial Relationships](#spatial-relationships)
- [Spatial Indexes](#spatial-indexes)
- [Location-Based Applications](#location-based-applications)
- [GeoJSON Support](#geojson-support)
- [Common Mistakes](#common-mistakes)
- [Best Practices](#best-practices)
- [Practice Exercises](#practice-exercises)

## Introduction to PostGIS

### Theory
PostGIS is a spatial database extension for PostgreSQL that adds support for geographic objects, allowing location queries to be run in SQL. It provides hundreds of functions for processing and analyzing geographic data, making PostgreSQL a powerful Geographic Information System (GIS) database.

PostGIS supports:
- Spatial data types (points, lines, polygons)
- Spatial indexes (GiST and SP-GiST)
- Spatial functions (measurements, relationships, transformations)
- Coordinate systems and projections
- Raster data support
- 3D geometries and topology

### Key Concepts
- **Geometry**: Planar (flat-earth) coordinates, faster calculations
- **Geography**: Spherical coordinates, accurate over long distances
- **SRID**: Spatial Reference System Identifier (coordinate system)
- **WGS84**: World Geodetic System 1984 (SRID 4326) - standard for GPS

## Installing PostGIS

### Syntax

```sql
-- Install PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Check PostGIS version
SELECT PostGIS_Version();

-- Check installed PostGIS functions
SELECT PostGIS_Full_Version();
```

### Examples

```sql
-- Install PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify installation
SELECT PostGIS_Version();
SELECT PostGIS_Full_Version();

-- Check available spatial reference systems
SELECT srid, auth_name, auth_srid, srtext, proj4text
FROM spatial_ref_sys
WHERE srid IN (4326, 3857, 2163)
ORDER BY srid;

-- List all PostGIS functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE 'ST_%'
ORDER BY routine_name;
```

## Geometry vs Geography Types

### Theory
PostGIS provides two main spatial data types:

**Geometry (SRID-based planar)**
- Uses Cartesian coordinates
- Faster calculations
- Less accurate over long distances
- Best for small areas or projected coordinate systems

**Geography (spherical)**
- Uses latitude/longitude on Earth's sphere
- More accurate over long distances
- Slower calculations
- Best for global or large-scale applications
- Default SRID is 4326 (WGS84)

### Examples

```sql
-- Geometry: planar coordinates
CREATE TABLE geometry_demo (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    location GEOMETRY(Point, 4326)
);

-- Geography: spherical coordinates
CREATE TABLE geography_demo (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    location GEOGRAPHY(Point, 4326)
);

-- Insert points
INSERT INTO geometry_demo (name, location)
VALUES ('Location A', ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326));

INSERT INTO geography_demo (name, location)
VALUES ('Location B', ST_GeographyFromText('POINT(-73.9857 40.7484)'));

-- Distance comparison (geometry vs geography)
-- Geometry: returns units of the SRID (degrees for 4326)
SELECT ST_Distance(
    ST_MakePoint(-73.9857, 40.7484),  -- New York
    ST_MakePoint(-118.2437, 34.0522)  -- Los Angeles
) AS geometry_distance_degrees;

-- Geography: returns meters
SELECT ST_Distance(
    ST_GeographyFromText('POINT(-73.9857 40.7484)'),   -- New York
    ST_GeographyFromText('POINT(-118.2437 34.0522)')   -- Los Angeles
) AS geography_distance_meters;

-- Convert meters to miles
SELECT ST_Distance(
    ST_GeographyFromText('POINT(-73.9857 40.7484)'),
    ST_GeographyFromText('POINT(-118.2437 34.0522)')
) / 1609.34 AS distance_miles;
```

## Spatial Reference Systems (SRID)

### Theory
A Spatial Reference System Identifier (SRID) defines the coordinate system used for spatial data. Common SRIDs include:

- **4326 (WGS84)**: Standard GPS coordinates (latitude/longitude)
- **3857**: Web Mercator (used by Google Maps, OpenStreetMap)
- **2163**: US National Atlas Equal Area (for US mapping)

### Syntax

```sql
-- Set SRID for geometry
ST_SetSRID(geometry, srid_integer)

-- Transform between coordinate systems
ST_Transform(geometry, target_srid)

-- Get SRID of geometry
ST_SRID(geometry)
```

### Examples

```sql
-- Create point with SRID 4326 (WGS84)
SELECT ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326) AS san_francisco;

-- Get SRID
SELECT ST_SRID(ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)) AS srid;

-- Transform from WGS84 (4326) to Web Mercator (3857)
SELECT ST_AsText(
    ST_Transform(
        ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326),
        3857
    )
) AS web_mercator;

-- Get coordinate system information
SELECT
    srid,
    auth_name,
    auth_srid,
    srtext
FROM spatial_ref_sys
WHERE srid = 4326;

-- Example: convert all geometries to different SRID
CREATE TABLE locations_4326 (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    point GEOMETRY(Point, 4326)
);

CREATE TABLE locations_3857 (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    point GEOMETRY(Point, 3857)
);

INSERT INTO locations_4326 (name, point) VALUES
    ('New York', ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326)),
    ('Los Angeles', ST_SetSRID(ST_MakePoint(-118.2437, 34.0522), 4326));

-- Transform and insert
INSERT INTO locations_3857 (id, name, point)
SELECT id, name, ST_Transform(point, 3857)
FROM locations_4326;

SELECT
    name,
    ST_AsText(point) AS original_4326,
    ST_AsText((SELECT point FROM locations_3857 WHERE locations_3857.id = locations_4326.id)) AS transformed_3857
FROM locations_4326;
```

## Creating Spatial Tables

### Syntax

```sql
-- Create table with geometry column
CREATE TABLE table_name (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    geom GEOMETRY(Point, 4326)
);

-- Add geometry column to existing table
ALTER TABLE table_name
ADD COLUMN geom GEOMETRY(Point, 4326);

-- Create spatial index
CREATE INDEX idx_name ON table_name USING GIST (geom);
```

### Examples

```sql
-- Points of interest table
CREATE TABLE points_of_interest (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    location GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index
CREATE INDEX idx_poi_location ON points_of_interest USING GIST (location);

-- Polygons (e.g., city boundaries)
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    state VARCHAR(50),
    population INT,
    boundary GEOMETRY(Polygon, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cities_boundary ON cities USING GIST (boundary);

-- Lines (e.g., roads, routes)
CREATE TABLE roads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    road_type VARCHAR(50),
    path GEOMETRY(LineString, 4326)
);

CREATE INDEX idx_roads_path ON roads USING GIST (path);

-- Multi-geometry types
CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    area GEOMETRY(MultiPolygon, 4326)
);

-- Generic geometry (any type)
CREATE TABLE spatial_objects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    geom GEOMETRY(Geometry, 4326)
);

-- Geography type for global data
CREATE TABLE global_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    location GEOGRAPHY(Point, 4326)
);

CREATE INDEX idx_global_location ON global_locations USING GIST (location);
```

## Point Creation and Operations

### Syntax

```sql
-- Create point from longitude, latitude
ST_MakePoint(longitude, latitude)
ST_Point(longitude, latitude)

-- Create point with SRID
ST_SetSRID(ST_MakePoint(lon, lat), srid)

-- Create point from text
ST_GeomFromText('POINT(lon lat)', srid)
ST_PointFromText('POINT(lon lat)', srid)

-- Get coordinates
ST_X(geometry) -- longitude
ST_Y(geometry) -- latitude
```

### Examples

```sql
-- Create points table
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    point GEOMETRY(Point, 4326)
);

-- Insert points using different methods
INSERT INTO locations (name, point) VALUES
    ('Empire State Building', ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326)),
    ('Statue of Liberty', ST_GeomFromText('POINT(-74.0445 40.6892)', 4326)),
    ('Central Park', ST_PointFromText('POINT(-73.9654 40.7829)', 4326));

-- Extract coordinates
SELECT
    name,
    ST_X(point) AS longitude,
    ST_Y(point) AS latitude,
    ST_AsText(point) AS wkt
FROM locations;

-- Create point from latitude/longitude columns
CREATE TABLE raw_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8)
);

INSERT INTO raw_locations (name, latitude, longitude) VALUES
    ('Times Square', 40.7580, -73.9855),
    ('Brooklyn Bridge', 40.7061, -73.9969);

-- Add geometry column
ALTER TABLE raw_locations ADD COLUMN geom GEOMETRY(Point, 4326);

-- Populate geometry from lat/lon
UPDATE raw_locations
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);

-- Validate points
SELECT
    name,
    ST_IsValid(point) AS is_valid,
    ST_GeometryType(point) AS geom_type
FROM locations;
```

## Distance Calculations

### Syntax

```sql
-- Distance between geometries (units depend on SRID)
ST_Distance(geom1, geom2)

-- Distance on sphere (meters, for geography or lon/lat)
ST_DistanceSphere(geom1, geom2)
ST_DistanceSpheroid(geom1, geom2, spheroid)

-- Check if within distance
ST_DWithin(geom1, geom2, distance)
```

### Examples

```sql
-- Create restaurants table
CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    cuisine VARCHAR(50),
    location GEOGRAPHY(Point, 4326) NOT NULL
);

CREATE INDEX idx_restaurants_location ON restaurants USING GIST (location);

-- Insert sample restaurants
INSERT INTO restaurants (name, cuisine, location) VALUES
    ('Joe''s Pizza', 'Italian', ST_GeographyFromText('POINT(-73.9857 40.7484)')),
    ('Sushi World', 'Japanese', ST_GeographyFromText('POINT(-73.9897 40.7505)')),
    ('Taco Palace', 'Mexican', ST_GeographyFromText('POINT(-73.9820 40.7490)')),
    ('Burger Joint', 'American', ST_GeographyFromText('POINT(-73.9880 40.7470)')),
    ('Thai Delight', 'Thai', ST_GeographyFromText('POINT(-73.9900 40.7520)'));

-- Find distance between two restaurants
SELECT
    r1.name AS restaurant1,
    r2.name AS restaurant2,
    ST_Distance(r1.location, r2.location) AS distance_meters,
    ROUND(ST_Distance(r1.location, r2.location) / 1609.34, 2) AS distance_miles
FROM restaurants r1, restaurants r2
WHERE r1.id = 1 AND r2.id = 2;

-- Find all restaurants within 500 meters of a point
SELECT
    name,
    cuisine,
    ROUND(ST_Distance(
        location,
        ST_GeographyFromText('POINT(-73.9857 40.7484)')
    )::numeric, 2) AS distance_meters
FROM restaurants
WHERE ST_DWithin(
    location,
    ST_GeographyFromText('POINT(-73.9857 40.7484)'),
    500
)
ORDER BY distance_meters;

-- Find 5 nearest restaurants to a point
SELECT
    name,
    cuisine,
    ROUND(ST_Distance(
        location,
        ST_GeographyFromText('POINT(-73.9857 40.7484)')
    )::numeric, 2) AS distance_meters
FROM restaurants
ORDER BY location <-> ST_GeographyFromText('POINT(-73.9857 40.7484)')
LIMIT 5;

-- Distance matrix (all restaurants to all)
SELECT
    r1.name AS from_restaurant,
    r2.name AS to_restaurant,
    ROUND(ST_Distance(r1.location, r2.location)::numeric, 2) AS distance_meters
FROM restaurants r1
CROSS JOIN restaurants r2
WHERE r1.id < r2.id
ORDER BY distance_meters;
```

## Spatial Queries

### Theory
Spatial queries allow you to find geographic relationships between objects, such as containment, intersection, proximity, and more.

### Syntax

```sql
-- Radius search
ST_DWithin(geom1, geom2, distance)

-- Bounding box search
geom && ST_MakeEnvelope(xmin, ymin, xmax, ymax, srid)

-- Nearest neighbor
ORDER BY geom1 <-> geom2 LIMIT n
```

### Examples

```sql
-- Stores table
CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    store_type VARCHAR(50),
    location GEOGRAPHY(Point, 4326)
);

CREATE INDEX idx_stores_location ON stores USING GIST (location);

INSERT INTO stores (name, store_type, location) VALUES
    ('Whole Foods Market', 'Grocery', ST_GeographyFromText('POINT(-73.9897 40.7505)')),
    ('CVS Pharmacy', 'Pharmacy', ST_GeographyFromText('POINT(-73.9820 40.7490)')),
    ('Starbucks', 'Coffee', ST_GeographyFromText('POINT(-73.9880 40.7470)')),
    ('Target', 'Department', ST_GeographyFromText('POINT(-73.9900 40.7520)')),
    ('Best Buy', 'Electronics', ST_GeographyFromText('POINT(-73.9850 40.7495)'));

-- Find stores within 1 km radius
CREATE OR REPLACE FUNCTION find_nearby_stores(
    lat DECIMAL,
    lon DECIMAL,
    radius_meters INT DEFAULT 1000
)
RETURNS TABLE (
    store_name VARCHAR,
    store_type VARCHAR,
    distance_meters NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        name,
        stores.store_type,
        ROUND(ST_Distance(
            location,
            ST_GeographyFromText('POINT(' || lon || ' ' || lat || ')')
        )::numeric, 2)
    FROM stores
    WHERE ST_DWithin(
        location,
        ST_GeographyFromText('POINT(' || lon || ' ' || lat || ')'),
        radius_meters
    )
    ORDER BY location <-> ST_GeographyFromText('POINT(' || lon || ' ' || lat || ')');
END;
$$ LANGUAGE plpgsql;

-- Test function
SELECT * FROM find_nearby_stores(40.7484, -73.9857, 1000);

-- Bounding box search (faster for large datasets)
SELECT
    name,
    store_type
FROM stores
WHERE location && ST_MakeEnvelope(-74.0, 40.7, -73.9, 40.8, 4326)::geography;

-- Find stores by type within radius
CREATE OR REPLACE FUNCTION find_stores_by_type(
    lat DECIMAL,
    lon DECIMAL,
    p_store_type VARCHAR,
    radius_meters INT DEFAULT 2000
)
RETURNS TABLE (
    store_name VARCHAR,
    distance_meters NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        name,
        ROUND(ST_Distance(
            location,
            ST_GeographyFromText('POINT(' || lon || ' ' || lat || ')')
        )::numeric, 2)
    FROM stores
    WHERE
        store_type = p_store_type
        AND ST_DWithin(
            location,
            ST_GeographyFromText('POINT(' || lon || ' ' || lat || ')'),
            radius_meters
        )
    ORDER BY location <-> ST_GeographyFromText('POINT(' || lon || ' ' || lat || ')');
END;
$$ LANGUAGE plpgsql;

-- Test
SELECT * FROM find_stores_by_type(40.7484, -73.9857, 'Grocery', 2000);
```

## Spatial Relationships

### Syntax

```sql
-- Containment
ST_Contains(geom1, geom2)  -- geom1 fully contains geom2
ST_Within(geom1, geom2)    -- geom1 is fully within geom2

-- Intersection
ST_Intersects(geom1, geom2)  -- geometries share any space
ST_Overlaps(geom1, geom2)    -- geometries overlap

-- Proximity
ST_Touches(geom1, geom2)     -- boundaries touch
ST_Crosses(geom1, geom2)     -- geometries cross

-- Other
ST_Disjoint(geom1, geom2)    -- geometries don't intersect
ST_Equals(geom1, geom2)      -- geometries are identical
```

### Examples

```sql
-- Cities with boundaries
CREATE TABLE city_boundaries (
    id SERIAL PRIMARY KEY,
    city_name VARCHAR(100),
    boundary GEOMETRY(Polygon, 4326)
);

-- Create sample city boundaries (simplified rectangles)
INSERT INTO city_boundaries (city_name, boundary) VALUES
    ('Manhattan', ST_GeomFromText('POLYGON((
        -74.0479 40.6829,
        -73.9067 40.6829,
        -73.9067 40.8820,
        -74.0479 40.8820,
        -74.0479 40.6829
    ))', 4326)),
    ('Brooklyn', ST_GeomFromText('POLYGON((
        -74.0421 40.5698,
        -73.8334 40.5698,
        -73.8334 40.7395,
        -74.0421 40.7395,
        -74.0421 40.5698
    ))', 4326));

-- Points of interest
CREATE TABLE poi (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    location GEOMETRY(Point, 4326)
);

INSERT INTO poi (name, location) VALUES
    ('Times Square', ST_GeomFromText('POINT(-73.9855 40.7580)', 4326)),
    ('Coney Island', ST_GeomFromText('POINT(-73.9712 40.5755)', 4326)),
    ('Statue of Liberty', ST_GeomFromText('POINT(-74.0445 40.6892)', 4326));

-- Find which city each POI is in
SELECT
    p.name AS poi_name,
    c.city_name
FROM poi p
LEFT JOIN city_boundaries c ON ST_Contains(c.boundary, p.location);

-- Find all POIs within Manhattan
SELECT p.name
FROM poi p
JOIN city_boundaries c ON ST_Within(p.location, c.boundary)
WHERE c.city_name = 'Manhattan';

-- Check if boundaries intersect
SELECT
    c1.city_name AS city1,
    c2.city_name AS city2,
    ST_Intersects(c1.boundary, c2.boundary) AS intersects,
    ST_Touches(c1.boundary, c2.boundary) AS touches
FROM city_boundaries c1
CROSS JOIN city_boundaries c2
WHERE c1.id < c2.id;

-- Calculate area of intersection
SELECT
    c1.city_name,
    c2.city_name,
    ST_Area(ST_Intersection(c1.boundary, c2.boundary)::geography) AS intersection_area_sq_meters
FROM city_boundaries c1
CROSS JOIN city_boundaries c2
WHERE c1.id < c2.id AND ST_Intersects(c1.boundary, c2.boundary);

-- Buffer operations (create zone around point)
SELECT
    name,
    ST_AsText(ST_Buffer(location::geography, 1000)::geometry) AS buffer_1km
FROM poi
WHERE name = 'Times Square';

-- Find POIs within 2km of a boundary
SELECT p.name
FROM poi p
JOIN city_boundaries c ON ST_DWithin(
    p.location::geography,
    c.boundary::geography,
    2000
)
WHERE c.city_name = 'Manhattan';
```

## Spatial Indexes

### Theory
Spatial indexes (typically GiST indexes) dramatically improve performance of spatial queries by organizing spatial data in a way that allows efficient searching.

### Syntax

```sql
-- Create GiST index
CREATE INDEX idx_name ON table_name USING GIST (geom_column);

-- Create SP-GiST index (space-partitioned)
CREATE INDEX idx_name ON table_name USING SPGIST (geom_column);

-- Analyze table after creating index
ANALYZE table_name;
```

### Examples

```sql
-- Create large dataset for testing
CREATE TABLE large_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    location GEOGRAPHY(Point, 4326)
);

-- Insert 100,000 random points
INSERT INTO large_locations (name, location)
SELECT
    'Location ' || generate_series,
    ST_GeographyFromText(
        'POINT(' ||
        (-180 + random() * 360) || ' ' ||
        (-90 + random() * 180) ||
        ')'
    )
FROM generate_series(1, 100000);

-- Query without index (slow)
EXPLAIN ANALYZE
SELECT name
FROM large_locations
WHERE ST_DWithin(
    location,
    ST_GeographyFromText('POINT(-73.9857 40.7484)'),
    10000
);

-- Create spatial index
CREATE INDEX idx_large_locations_gist ON large_locations USING GIST (location);

-- Analyze table
ANALYZE large_locations;

-- Query with index (fast)
EXPLAIN ANALYZE
SELECT name
FROM large_locations
WHERE ST_DWithin(
    location,
    ST_GeographyFromText('POINT(-73.9857 40.7484)'),
    10000
);

-- Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'large_locations';

-- Partial spatial index (index only certain conditions)
CREATE INDEX idx_active_locations ON large_locations USING GIST (location)
WHERE name LIKE 'Location 1%';

-- Multi-column index with spatial data
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    event_date DATE,
    location GEOGRAPHY(Point, 4326),
    is_active BOOLEAN DEFAULT true
);

-- Index for active events by location
CREATE INDEX idx_events_active_location ON events USING GIST (location)
WHERE is_active = true;
```

## Location-Based Applications

### Examples

```sql
-- Complete restaurant finder application
CREATE TABLE restaurants_app (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    cuisine VARCHAR(50),
    price_range VARCHAR(10),
    rating DECIMAL(2, 1),
    address TEXT,
    phone VARCHAR(20),
    location GEOGRAPHY(Point, 4326) NOT NULL,
    is_open BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_restaurants_app_location ON restaurants_app USING GIST (location);
CREATE INDEX idx_restaurants_app_cuisine ON restaurants_app (cuisine) WHERE is_open = true;

-- Sample data
INSERT INTO restaurants_app (name, cuisine, price_range, rating, address, phone, location) VALUES
    ('Luigi''s Pizzeria', 'Italian', '$$', 4.5, '123 Main St', '555-0101', ST_GeographyFromText('POINT(-73.9857 40.7484)')),
    ('Sakura Sushi', 'Japanese', '$$$', 4.7, '456 Oak Ave', '555-0102', ST_GeographyFromText('POINT(-73.9897 40.7505)')),
    ('El Mariachi', 'Mexican', '$', 4.2, '789 Elm St', '555-0103', ST_GeographyFromText('POINT(-73.9820 40.7490)')),
    ('The Steakhouse', 'American', '$$$$', 4.8, '321 Park Pl', '555-0104', ST_GeographyFromText('POINT(-73.9880 40.7470)')),
    ('Pad Thai House', 'Thai', '$$', 4.4, '654 Broadway', '555-0105', ST_GeographyFromText('POINT(-73.9900 40.7520)'));

-- Find nearby restaurants with filters
CREATE OR REPLACE FUNCTION find_restaurants(
    user_lat DECIMAL,
    user_lon DECIMAL,
    max_distance_meters INT DEFAULT 2000,
    p_cuisine VARCHAR DEFAULT NULL,
    min_rating DECIMAL DEFAULT 0,
    p_price_range VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    restaurant_id INT,
    restaurant_name VARCHAR,
    cuisine_type VARCHAR,
    rating DECIMAL,
    distance_meters NUMERIC,
    distance_miles NUMERIC
) AS $$
DECLARE
    user_location GEOGRAPHY;
BEGIN
    user_location := ST_GeographyFromText('POINT(' || user_lon || ' ' || user_lat || ')');

    RETURN QUERY
    SELECT
        id,
        name,
        cuisine,
        restaurants_app.rating,
        ROUND(ST_Distance(location, user_location)::numeric, 2),
        ROUND((ST_Distance(location, user_location) / 1609.34)::numeric, 2)
    FROM restaurants_app
    WHERE
        is_open = true
        AND ST_DWithin(location, user_location, max_distance_meters)
        AND (p_cuisine IS NULL OR cuisine = p_cuisine)
        AND restaurants_app.rating >= min_rating
        AND (p_price_range IS NULL OR price_range = p_price_range)
    ORDER BY location <-> user_location;
END;
$$ LANGUAGE plpgsql;

-- Test restaurant finder
SELECT * FROM find_restaurants(40.7484, -73.9857, 3000, NULL, 4.0, NULL);
SELECT * FROM find_restaurants(40.7484, -73.9857, 5000, 'Italian', 4.0, '$$');

-- Store locator with driving directions estimate
CREATE TABLE retail_stores (
    id SERIAL PRIMARY KEY,
    store_name VARCHAR(200),
    chain VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state CHAR(2),
    zip VARCHAR(10),
    phone VARCHAR(20),
    hours TEXT,
    location GEOGRAPHY(Point, 4326),
    has_pharmacy BOOLEAN DEFAULT false,
    has_grocery BOOLEAN DEFAULT false
);

CREATE INDEX idx_retail_stores_location ON retail_stores USING GIST (location);

-- Delivery zones (polygons)
CREATE TABLE delivery_zones (
    id SERIAL PRIMARY KEY,
    zone_name VARCHAR(100),
    store_id INT REFERENCES retail_stores(id),
    delivery_fee DECIMAL(5, 2),
    min_order DECIMAL(7, 2),
    zone_boundary GEOMETRY(Polygon, 4326)
);

CREATE INDEX idx_delivery_zones_boundary ON delivery_zones USING GIST (zone_boundary);

-- Check if address is in delivery zone
CREATE OR REPLACE FUNCTION check_delivery_availability(
    delivery_lat DECIMAL,
    delivery_lon DECIMAL
)
RETURNS TABLE (
    store_name VARCHAR,
    zone_name VARCHAR,
    delivery_fee DECIMAL,
    min_order DECIMAL,
    distance_km NUMERIC
) AS $$
DECLARE
    delivery_point GEOGRAPHY;
BEGIN
    delivery_point := ST_GeographyFromText('POINT(' || delivery_lon || ' ' || delivery_lat || ')');

    RETURN QUERY
    SELECT
        s.store_name,
        dz.zone_name,
        dz.delivery_fee,
        dz.min_order,
        ROUND((ST_Distance(s.location, delivery_point) / 1000)::numeric, 2)
    FROM delivery_zones dz
    JOIN retail_stores s ON dz.store_id = s.id
    WHERE ST_Contains(dz.zone_boundary, ST_GeomFromText('POINT(' || delivery_lon || ' ' || delivery_lat || ')', 4326))
    ORDER BY ST_Distance(s.location, delivery_point);
END;
$$ LANGUAGE plpgsql;
```

## GeoJSON Support

### Theory
GeoJSON is a standard format for encoding geographic data structures using JSON. PostGIS can convert between PostGIS geometries and GeoJSON.

### Syntax

```sql
-- Geometry to GeoJSON
ST_AsGeoJSON(geometry, max_decimals, options)

-- GeoJSON to geometry
ST_GeomFromGeoJSON(geojson_text)
```

### Examples

```sql
-- Convert geometry to GeoJSON
SELECT
    id,
    name,
    ST_AsGeoJSON(location)::json AS geojson
FROM restaurants_app
LIMIT 3;

-- Create GeoJSON FeatureCollection
SELECT json_build_object(
    'type', 'FeatureCollection',
    'features', json_agg(
        json_build_object(
            'type', 'Feature',
            'id', id,
            'geometry', ST_AsGeoJSON(location)::json,
            'properties', json_build_object(
                'name', name,
                'cuisine', cuisine,
                'rating', rating,
                'price_range', price_range
            )
        )
    )
) AS geojson_collection
FROM restaurants_app
WHERE is_open = true;

-- Parse GeoJSON to geometry
CREATE TABLE imported_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    location GEOMETRY(Point, 4326)
);

-- Insert from GeoJSON
INSERT INTO imported_locations (name, location)
VALUES (
    'Central Park',
    ST_GeomFromGeoJSON('{"type":"Point","coordinates":[-73.9654,40.7829]}')
);

-- GeoJSON with properties
DO $$
DECLARE
    geojson_data JSON := '{
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [-73.9857, 40.7484]},
        "properties": {"name": "Empire State", "type": "landmark"}
    }';
BEGIN
    INSERT INTO imported_locations (name, location)
    VALUES (
        geojson_data->'properties'->>'name',
        ST_GeomFromGeoJSON(geojson_data->'geometry')
    );
END $$;

-- Export specific area as GeoJSON
CREATE OR REPLACE FUNCTION export_area_geojson(
    center_lat DECIMAL,
    center_lon DECIMAL,
    radius_meters INT
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    center_point GEOGRAPHY;
BEGIN
    center_point := ST_GeographyFromText('POINT(' || center_lon || ' ' || center_lat || ')');

    SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', json_agg(
            json_build_object(
                'type', 'Feature',
                'id', id,
                'geometry', ST_AsGeoJSON(location)::json,
                'properties', json_build_object(
                    'name', name,
                    'cuisine', cuisine,
                    'distance', ROUND(ST_Distance(location, center_point)::numeric, 2)
                )
            )
        )
    ) INTO result
    FROM restaurants_app
    WHERE ST_DWithin(location, center_point, radius_meters);

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Test GeoJSON export
SELECT export_area_geojson(40.7484, -73.9857, 2000);
```

## Common Mistakes

1. **Mixing longitude and latitude order**
   ```sql
   -- Wrong: latitude, longitude
   ST_MakePoint(40.7484, -73.9857)

   -- Right: longitude, latitude
   ST_MakePoint(-73.9857, 40.7484)
   ```

2. **Forgetting to set SRID**
   ```sql
   -- Wrong: no SRID
   INSERT INTO locations (point) VALUES (ST_MakePoint(-73.9857, 40.7484));

   -- Right: with SRID
   INSERT INTO locations (point)
   VALUES (ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326));
   ```

3. **Not creating spatial indexes**
   ```sql
   -- Slow queries without index
   -- Always create GIST index on spatial columns
   CREATE INDEX idx_location ON table_name USING GIST (geom_column);
   ```

4. **Using geometry instead of geography for global data**
   ```sql
   -- Wrong for global distances: returns degrees
   SELECT ST_Distance(
       ST_MakePoint(-73.9857, 40.7484),
       ST_MakePoint(-118.2437, 34.0522)
   );

   -- Right: returns meters
   SELECT ST_Distance(
       ST_GeographyFromText('POINT(-73.9857 40.7484)'),
       ST_GeographyFromText('POINT(-118.2437 34.0522)')
   );
   ```

5. **Not using ST_DWithin for radius searches**
   ```sql
   -- Slow: calculates distance for all rows
   SELECT * FROM locations
   WHERE ST_Distance(location, point) < 1000;

   -- Fast: uses spatial index
   SELECT * FROM locations
   WHERE ST_DWithin(location, point, 1000);
   ```

6. **Mixing SRIDs in queries**
   ```sql
   -- Wrong: comparing different SRIDs
   -- Must transform to same SRID first
   SELECT ST_Distance(
       geom_4326,
       ST_Transform(geom_3857, 4326)
   );
   ```

## Best Practices

1. **Always use appropriate SRID**
   ```sql
   -- WGS84 (4326) for global data
   location GEOGRAPHY(Point, 4326)

   -- Local projection for specific regions
   location GEOMETRY(Point, 2163)  -- US National Atlas
   ```

2. **Create spatial indexes on all geometry/geography columns**
   ```sql
   CREATE INDEX idx_table_geom ON table_name USING GIST (geom_column);
   ANALYZE table_name;
   ```

3. **Use geography type for distance calculations**
   ```sql
   -- Accurate distances in meters
   CREATE TABLE locations (
       id SERIAL PRIMARY KEY,
       name VARCHAR(100),
       location GEOGRAPHY(Point, 4326)
   );
   ```

4. **Use ST_DWithin for radius queries**
   ```sql
   -- Efficient radius search
   SELECT * FROM locations
   WHERE ST_DWithin(location, search_point, 1000)
   ORDER BY location <-> search_point;
   ```

5. **Validate geometries**
   ```sql
   -- Check validity before operations
   SELECT ST_IsValid(geom), ST_IsValidReason(geom)
   FROM spatial_table;

   -- Fix invalid geometries
   UPDATE spatial_table
   SET geom = ST_MakeValid(geom)
   WHERE NOT ST_IsValid(geom);
   ```

6. **Use appropriate geometry types**
   ```sql
   -- Specific types for better performance and validation
   location GEOMETRY(Point, 4326)
   boundary GEOMETRY(Polygon, 4326)
   route GEOMETRY(LineString, 4326)
   ```

7. **Optimize bounding box queries**
   ```sql
   -- Use && operator for bounding box checks
   SELECT * FROM locations
   WHERE geom && ST_MakeEnvelope(xmin, ymin, xmax, ymax, 4326)
     AND ST_Contains(polygon, geom);  -- Exact check
   ```

## Practice Exercises

### Exercise 1: Restaurant Finder with Advanced Features
Build a complete restaurant discovery application with proximity search, filters, and recommendations.

**Requirements:**
1. Create restaurants table with spatial data, ratings, and attributes
2. Implement proximity search with multiple filters
3. Add cuisine-based recommendations
4. Create heat map data aggregation
5. Implement "similar restaurants" feature

**Solution:**
```sql
-- Restaurants table
CREATE TABLE restaurants_complete (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    cuisine VARCHAR(50) NOT NULL,
    price_range INT CHECK (price_range BETWEEN 1 AND 4),
    rating DECIMAL(2, 1) CHECK (rating BETWEEN 0 AND 5),
    review_count INT DEFAULT 0,
    address TEXT,
    phone VARCHAR(20),
    website VARCHAR(200),
    location GEOGRAPHY(Point, 4326) NOT NULL,
    delivery_available BOOLEAN DEFAULT false,
    takeout_available BOOLEAN DEFAULT false,
    reservation_required BOOLEAN DEFAULT false,
    parking_available BOOLEAN DEFAULT false,
    outdoor_seating BOOLEAN DEFAULT false,
    is_open BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_restaurants_complete_location ON restaurants_complete USING GIST (location);
CREATE INDEX idx_restaurants_complete_cuisine ON restaurants_complete (cuisine) WHERE is_open = true;
CREATE INDEX idx_restaurants_complete_rating ON restaurants_complete (rating DESC) WHERE is_open = true;

-- Sample data
INSERT INTO restaurants_complete (name, cuisine, price_range, rating, review_count, location, delivery_available, outdoor_seating) VALUES
    ('Bella Italia', 'Italian', 3, 4.5, 245, ST_GeographyFromText('POINT(-73.9857 40.7484)'), true, true),
    ('Tokyo Sushi Bar', 'Japanese', 4, 4.7, 189, ST_GeographyFromText('POINT(-73.9897 40.7505)'), false, false),
    ('La Hacienda', 'Mexican', 2, 4.2, 312, ST_GeographyFromText('POINT(-73.9820 40.7490)'), true, true),
    ('Prime Steakhouse', 'Steakhouse', 4, 4.8, 156, ST_GeographyFromText('POINT(-73.9880 40.7470)'), false, false),
    ('Thai Orchid', 'Thai', 2, 4.4, 203, ST_GeographyFromText('POINT(-73.9900 40.7520)'), true, false),
    ('Burger Haven', 'American', 1, 4.0, 421, ST_GeographyFromText('POINT(-73.9860 40.7500)'), true, true),
    ('French Bistro', 'French', 3, 4.6, 178, ST_GeographyFromText('POINT(-73.9845 40.7495)'), false, true);

-- Advanced search function
CREATE OR REPLACE FUNCTION search_restaurants_advanced(
    user_lat DECIMAL,
    user_lon DECIMAL,
    max_distance_meters INT DEFAULT 3000,
    p_cuisines VARCHAR[] DEFAULT NULL,
    min_rating DECIMAL DEFAULT 0,
    max_price INT DEFAULT 4,
    p_delivery BOOLEAN DEFAULT NULL,
    p_outdoor_seating BOOLEAN DEFAULT NULL,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    restaurant_id INT,
    restaurant_name VARCHAR,
    cuisine VARCHAR,
    price_range INT,
    rating DECIMAL,
    review_count INT,
    distance_meters NUMERIC,
    delivery_available BOOLEAN,
    outdoor_seating BOOLEAN,
    relevance_score NUMERIC
) AS $$
DECLARE
    user_location GEOGRAPHY;
BEGIN
    user_location := ST_GeographyFromText('POINT(' || user_lon || ' ' || user_lat || ')');

    RETURN QUERY
    SELECT
        id,
        name,
        restaurants_complete.cuisine,
        restaurants_complete.price_range,
        restaurants_complete.rating,
        restaurants_complete.review_count,
        ROUND(ST_Distance(location, user_location)::numeric, 2) AS dist_m,
        restaurants_complete.delivery_available,
        restaurants_complete.outdoor_seating,
        -- Relevance score: rating + review count factor - distance penalty
        ROUND((
            restaurants_complete.rating * 20 +
            (LOG(GREATEST(restaurants_complete.review_count, 1)) * 5) -
            (ST_Distance(location, user_location) / 100)
        )::numeric, 2) AS rel_score
    FROM restaurants_complete
    WHERE
        is_open = true
        AND ST_DWithin(location, user_location, max_distance_meters)
        AND (p_cuisines IS NULL OR restaurants_complete.cuisine = ANY(p_cuisines))
        AND restaurants_complete.rating >= min_rating
        AND restaurants_complete.price_range <= max_price
        AND (p_delivery IS NULL OR restaurants_complete.delivery_available = p_delivery)
        AND (p_outdoor_seating IS NULL OR restaurants_complete.outdoor_seating = p_outdoor_seating)
    ORDER BY rel_score DESC, dist_m
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Test advanced search
SELECT * FROM search_restaurants_advanced(
    40.7484, -73.9857, 2000,
    ARRAY['Italian', 'Japanese'],
    4.0, 4, NULL, true, 10
);

-- Find similar restaurants
CREATE OR REPLACE FUNCTION find_similar_restaurants(
    restaurant_id INT,
    max_distance_meters INT DEFAULT 5000,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    similar_id INT,
    similar_name VARCHAR,
    cuisine VARCHAR,
    rating DECIMAL,
    distance_meters NUMERIC,
    similarity_score NUMERIC
) AS $$
DECLARE
    ref_restaurant RECORD;
BEGIN
    SELECT * INTO ref_restaurant
    FROM restaurants_complete
    WHERE id = restaurant_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        id,
        name,
        restaurants_complete.cuisine,
        restaurants_complete.rating,
        ROUND(ST_Distance(location, ref_restaurant.location)::numeric, 2),
        ROUND((
            CASE WHEN restaurants_complete.cuisine = ref_restaurant.cuisine THEN 50 ELSE 0 END +
            CASE WHEN restaurants_complete.price_range = ref_restaurant.price_range THEN 25 ELSE 0 END +
            (25 - ABS(restaurants_complete.rating - ref_restaurant.rating) * 5)
        )::numeric, 2)
    FROM restaurants_complete
    WHERE
        id != restaurant_id
        AND is_open = true
        AND ST_DWithin(location, ref_restaurant.location, max_distance_meters)
    ORDER BY
        CASE WHEN restaurants_complete.cuisine = ref_restaurant.cuisine THEN 1 ELSE 2 END,
        ABS(restaurants_complete.rating - ref_restaurant.rating),
        location <-> ref_restaurant.location
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Test similarity search
SELECT * FROM find_similar_restaurants(1, 5000, 5);

-- Heat map aggregation
CREATE OR REPLACE FUNCTION restaurant_heatmap_data(
    lat_min DECIMAL,
    lat_max DECIMAL,
    lon_min DECIMAL,
    lon_max DECIMAL,
    grid_size INT DEFAULT 10
)
RETURNS TABLE (
    cell_lat DECIMAL,
    cell_lon DECIMAL,
    restaurant_count BIGINT,
    avg_rating DECIMAL,
    cuisine_diversity INT
) AS $$
BEGIN
    RETURN QUERY
    WITH grid_cells AS (
        SELECT
            ROUND(ST_Y(location::geometry)::numeric, 3) AS lat,
            ROUND(ST_X(location::geometry)::numeric, 3) AS lon
        FROM restaurants_complete
        WHERE
            is_open = true
            AND ST_Y(location::geometry) BETWEEN lat_min AND lat_max
            AND ST_X(location::geometry) BETWEEN lon_min AND lon_max
    )
    SELECT
        lat,
        lon,
        COUNT(*)::BIGINT,
        ROUND(AVG(r.rating)::numeric, 2),
        COUNT(DISTINCT r.cuisine)::INT
    FROM grid_cells gc
    JOIN restaurants_complete r ON
        ROUND(ST_Y(r.location::geometry)::numeric, 3) = gc.lat
        AND ROUND(ST_X(r.location::geometry)::numeric, 3) = gc.lon
    GROUP BY lat, lon
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql;
```

### Exercise 2: Delivery Zone Management
Create a delivery zone system with polygon boundaries, fee calculation, and coverage analysis.

**Requirements:**
1. Create delivery zones as polygons
2. Check if an address is within a delivery zone
3. Calculate delivery fees based on distance and zone
4. Find optimal store for delivery
5. Analyze coverage gaps

**Solution:**
```sql
-- Stores table
CREATE TABLE delivery_stores (
    id SERIAL PRIMARY KEY,
    store_name VARCHAR(200),
    address TEXT,
    phone VARCHAR(20),
    location GEOGRAPHY(Point, 4326),
    max_delivery_distance_meters INT DEFAULT 5000,
    base_delivery_fee DECIMAL(5, 2) DEFAULT 5.00,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_delivery_stores_location ON delivery_stores USING GIST (location);

-- Delivery zones
CREATE TABLE delivery_zones_complete (
    id SERIAL PRIMARY KEY,
    store_id INT REFERENCES delivery_stores(id) ON DELETE CASCADE,
    zone_name VARCHAR(100),
    zone_type VARCHAR(50), -- 'standard', 'extended', 'premium'
    zone_boundary GEOMETRY(Polygon, 4326),
    delivery_fee DECIMAL(5, 2),
    min_order_amount DECIMAL(7, 2),
    estimated_delivery_minutes INT,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_delivery_zones_boundary ON delivery_zones_complete USING GIST (zone_boundary);
CREATE INDEX idx_delivery_zones_store ON delivery_zones_complete (store_id) WHERE is_active = true;

-- Insert sample stores
INSERT INTO delivery_stores (store_name, address, location, base_delivery_fee) VALUES
    ('Downtown Store', '100 Main St', ST_GeographyFromText('POINT(-73.9857 40.7484)'), 4.99),
    ('Uptown Store', '200 Park Ave', ST_GeographyFromText('POINT(-73.9700 40.7650)'), 5.99);

-- Create delivery zones (simplified squares)
INSERT INTO delivery_zones_complete (store_id, zone_name, zone_type, zone_boundary, delivery_fee, min_order_amount, estimated_delivery_minutes)
VALUES
    (1, 'Downtown Core', 'standard',
     ST_GeomFromText('POLYGON((-73.990 40.745, -73.980 40.745, -73.980 40.755, -73.990 40.755, -73.990 40.745))', 4326),
     2.99, 15.00, 30),
    (1, 'Downtown Extended', 'extended',
     ST_GeomFromText('POLYGON((-74.000 40.735, -73.970 40.735, -73.970 40.765, -74.000 40.765, -74.000 40.735))', 4326),
     5.99, 25.00, 45);

-- Check delivery availability
CREATE OR REPLACE FUNCTION check_delivery(
    delivery_lat DECIMAL,
    delivery_lon DECIMAL
)
RETURNS TABLE (
    store_id INT,
    store_name VARCHAR,
    zone_name VARCHAR,
    zone_type VARCHAR,
    delivery_fee DECIMAL,
    min_order DECIMAL,
    estimated_minutes INT,
    distance_meters NUMERIC
) AS $$
DECLARE
    delivery_point GEOGRAPHY;
    delivery_geom GEOMETRY;
BEGIN
    delivery_point := ST_GeographyFromText('POINT(' || delivery_lon || ' ' || delivery_lat || ')');
    delivery_geom := ST_GeomFromText('POINT(' || delivery_lon || ' ' || delivery_lat || ')', 4326);

    RETURN QUERY
    SELECT
        s.id,
        s.store_name,
        dz.zone_name,
        dz.zone_type,
        dz.delivery_fee,
        dz.min_order_amount,
        dz.estimated_delivery_minutes,
        ROUND(ST_Distance(s.location, delivery_point)::numeric, 2)
    FROM delivery_zones_complete dz
    JOIN delivery_stores s ON dz.store_id = s.id
    WHERE
        dz.is_active = true
        AND s.is_active = true
        AND ST_Contains(dz.zone_boundary, delivery_geom)
    ORDER BY ST_Distance(s.location, delivery_point)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Find nearest store even if outside zones
CREATE OR REPLACE FUNCTION find_nearest_store_with_fee(
    delivery_lat DECIMAL,
    delivery_lon DECIMAL
)
RETURNS TABLE (
    store_id INT,
    store_name VARCHAR,
    in_zone BOOLEAN,
    calculated_fee DECIMAL,
    distance_meters NUMERIC,
    can_deliver BOOLEAN
) AS $$
DECLARE
    delivery_point GEOGRAPHY;
    delivery_geom GEOMETRY;
    zone_info RECORD;
    nearest_store RECORD;
BEGIN
    delivery_point := ST_GeographyFromText('POINT(' || delivery_lon || ' ' || delivery_lat || ')');
    delivery_geom := ST_GeomFromText('POINT(' || delivery_lon || ' ' || delivery_lat || ')', 4326);

    -- Check if in any zone
    SELECT * INTO zone_info
    FROM check_delivery(delivery_lat, delivery_lon)
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT
            zone_info.store_id,
            zone_info.store_name,
            true,
            zone_info.delivery_fee,
            zone_info.distance_meters,
            true;
    ELSE
        -- Find nearest store
        SELECT
            s.id,
            s.store_name,
            s.base_delivery_fee,
            s.max_delivery_distance_meters,
            ST_Distance(s.location, delivery_point) AS dist
        INTO nearest_store
        FROM delivery_stores s
        WHERE s.is_active = true
        ORDER BY s.location <-> delivery_point
        LIMIT 1;

        IF nearest_store.dist <= nearest_store.max_delivery_distance_meters THEN
            -- Calculate dynamic fee based on distance
            RETURN QUERY SELECT
                nearest_store.id,
                nearest_store.store_name,
                false,
                ROUND((nearest_store.base_delivery_fee + (nearest_store.dist / 1000 * 2))::numeric, 2),
                ROUND(nearest_store.dist::numeric, 2),
                true;
        ELSE
            RETURN QUERY SELECT
                nearest_store.id,
                nearest_store.store_name,
                false,
                NULL::DECIMAL,
                ROUND(nearest_store.dist::numeric, 2),
                false;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Test delivery check
SELECT * FROM check_delivery(40.7500, -73.9857);
SELECT * FROM find_nearest_store_with_fee(40.7500, -73.9857);

-- Analyze zone coverage
CREATE OR REPLACE FUNCTION analyze_zone_coverage()
RETURNS TABLE (
    store_name VARCHAR,
    total_zones INT,
    total_coverage_area_km2 NUMERIC,
    avg_delivery_fee DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.store_name,
        COUNT(dz.id)::INT,
        ROUND((SUM(ST_Area(dz.zone_boundary::geography)) / 1000000)::numeric, 2),
        ROUND(AVG(dz.delivery_fee)::numeric, 2)
    FROM delivery_stores s
    LEFT JOIN delivery_zones_complete dz ON s.id = dz.store_id AND dz.is_active = true
    WHERE s.is_active = true
    GROUP BY s.id, s.store_name;
END;
$$ LANGUAGE plpgsql;

SELECT * FROM analyze_zone_coverage();
```

### Exercise 3: Real Estate Property Search
Build a property search system with complex spatial queries and analytics.

**Requirements:**
1. Create properties table with location and attributes
2. Implement search within boundaries (neighborhoods)
3. Find properties near amenities (schools, parks, transit)
4. Calculate walkability score
5. Generate market analytics by area

**Solution:**
```sql
-- Properties table
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    address TEXT,
    property_type VARCHAR(50), -- 'house', 'condo', 'apartment'
    bedrooms INT,
    bathrooms DECIMAL(3, 1),
    square_feet INT,
    price DECIMAL(12, 2),
    year_built INT,
    location GEOGRAPHY(Point, 4326),
    listing_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_properties_location ON properties USING GIST (location);
CREATE INDEX idx_properties_price ON properties (price) WHERE is_active = true;

-- Amenities table
CREATE TABLE amenities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    amenity_type VARCHAR(50), -- 'school', 'park', 'transit', 'grocery', 'restaurant'
    rating DECIMAL(2, 1),
    location GEOGRAPHY(Point, 4326)
);

CREATE INDEX idx_amenities_location ON amenities USING GIST (location);
CREATE INDEX idx_amenities_type ON amenities (amenity_type);

-- Neighborhoods table
CREATE TABLE neighborhoods (
    id SERIAL PRIMARY KEY,
    neighborhood_name VARCHAR(100),
    boundary GEOMETRY(Polygon, 4326),
    median_home_price DECIMAL(12, 2),
    crime_rating INT CHECK (crime_rating BETWEEN 1 AND 10),
    school_rating INT CHECK (school_rating BETWEEN 1 AND 10)
);

CREATE INDEX idx_neighborhoods_boundary ON neighborhoods USING GIST (boundary);

-- Sample data
INSERT INTO properties (address, property_type, bedrooms, bathrooms, square_feet, price, year_built, location) VALUES
    ('123 Main St', 'house', 3, 2.0, 1800, 650000, 1995, ST_GeographyFromText('POINT(-73.9857 40.7484)')),
    ('456 Oak Ave', 'condo', 2, 2.0, 1200, 450000, 2010, ST_GeographyFromText('POINT(-73.9880 40.7500)')),
    ('789 Elm St', 'apartment', 1, 1.0, 750, 350000, 2015, ST_GeographyFromText('POINT(-73.9820 40.7490)'));

INSERT INTO amenities (name, amenity_type, rating, location) VALUES
    ('Central Elementary', 'school', 4.5, ST_GeographyFromText('POINT(-73.9870 40.7490)')),
    ('City Park', 'park', 4.0, ST_GeographyFromText('POINT(-73.9840 40.7495)')),
    ('Metro Station', 'transit', 4.2, ST_GeographyFromText('POINT(-73.9865 40.7485)'));

-- Property search with amenity proximity
CREATE OR REPLACE FUNCTION search_properties_with_amenities(
    min_price DECIMAL DEFAULT 0,
    max_price DECIMAL DEFAULT 9999999,
    min_bedrooms INT DEFAULT 0,
    property_types VARCHAR[] DEFAULT NULL,
    max_distance_to_transit_m INT DEFAULT 1000,
    max_distance_to_school_m INT DEFAULT 2000
)
RETURNS TABLE (
    property_id INT,
    address TEXT,
    property_type VARCHAR,
    bedrooms INT,
    price DECIMAL,
    nearest_transit VARCHAR,
    transit_distance_m NUMERIC,
    nearest_school VARCHAR,
    school_distance_m NUMERIC,
    walkability_score INT
) AS $$
BEGIN
    RETURN QUERY
    WITH property_transit AS (
        SELECT DISTINCT ON (p.id)
            p.id,
            a.name AS transit_name,
            ST_Distance(p.location, a.location) AS transit_dist
        FROM properties p
        CROSS JOIN LATERAL (
            SELECT name, location
            FROM amenities
            WHERE amenity_type = 'transit'
            ORDER BY location <-> p.location
            LIMIT 1
        ) a
        WHERE p.is_active = true
    ),
    property_school AS (
        SELECT DISTINCT ON (p.id)
            p.id,
            a.name AS school_name,
            ST_Distance(p.location, a.location) AS school_dist
        FROM properties p
        CROSS JOIN LATERAL (
            SELECT name, location
            FROM amenities
            WHERE amenity_type = 'school'
            ORDER BY location <-> p.location
            LIMIT 1
        ) a
        WHERE p.is_active = true
    )
    SELECT
        p.id,
        p.address,
        p.property_type,
        p.bedrooms,
        p.price,
        pt.transit_name,
        ROUND(pt.transit_dist::numeric, 2),
        ps.school_name,
        ROUND(ps.school_dist::numeric, 2),
        -- Walkability score (0-100)
        (
            100 -
            LEAST((pt.transit_dist / 10)::INT, 50) -
            LEAST((ps.school_dist / 20)::INT, 50)
        )::INT
    FROM properties p
    JOIN property_transit pt ON p.id = pt.id
    JOIN property_school ps ON p.id = ps.id
    WHERE
        p.is_active = true
        AND p.price BETWEEN min_price AND max_price
        AND p.bedrooms >= min_bedrooms
        AND (property_types IS NULL OR p.property_type = ANY(property_types))
        AND pt.transit_dist <= max_distance_to_transit_m
        AND ps.school_dist <= max_distance_to_school_m
    ORDER BY p.price;
END;
$$ LANGUAGE plpgsql;

-- Test property search
SELECT * FROM search_properties_with_amenities(
    300000, 700000, 2,
    ARRAY['house', 'condo'],
    1500, 2500
);

-- Market analytics by neighborhood
CREATE OR REPLACE FUNCTION neighborhood_market_analysis()
RETURNS TABLE (
    neighborhood VARCHAR,
    property_count BIGINT,
    avg_price DECIMAL,
    avg_price_per_sqft DECIMAL,
    avg_bedrooms DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.neighborhood_name,
        COUNT(p.id),
        ROUND(AVG(p.price)::numeric, 2),
        ROUND(AVG(p.price / NULLIF(p.square_feet, 0))::numeric, 2),
        ROUND(AVG(p.bedrooms)::numeric, 2)
    FROM neighborhoods n
    LEFT JOIN properties p ON
        ST_Contains(n.boundary, p.location::geometry)
        AND p.is_active = true
    GROUP BY n.id, n.neighborhood_name
    ORDER BY AVG(p.price) DESC;
END;
$$ LANGUAGE plpgsql;
```

## Summary

PostGIS extends PostgreSQL with powerful spatial capabilities:
- **Geometry vs Geography**: Choose based on scale and accuracy needs
- **SRID 4326**: Standard for GPS coordinates (latitude/longitude)
- **Spatial Indexes**: Essential for performance (GIST indexes)
- **Distance Calculations**: ST_Distance for measurements, ST_DWithin for radius queries
- **Spatial Relationships**: ST_Contains, ST_Intersects, ST_Within
- **GeoJSON**: Standard format for web mapping integration

PostGIS enables building sophisticated location-based applications with accurate spatial queries.
