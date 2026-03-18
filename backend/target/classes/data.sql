-- Insert mock hashed Farmer ID
INSERT INTO farmer_profile (hashed_farmer_id) VALUES ('a1b2c3d4e5f6g7h8i9j0');

-- Insert PostGIS Polygon (Coordinates: Longitude Latitude)
-- Represents a polygon bounding box (must be closed, so start and end points are identical)
INSERT INTO farm_plot (farmer_profile_id, boundaries)
VALUES (1, ST_GeomFromText('POLYGON((78.9629 20.5937, 78.9630 20.5937, 78.9630 20.5938, 78.9629 20.5938, 78.9629 20.5937))', 4326));
