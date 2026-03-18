-- Idempotent seed data: safe to re-run on every container restart.
-- ON CONFLICT DO NOTHING skips silently if the row already exists in the persisted volume.

INSERT INTO farmer_profile (hashed_farmer_id)
VALUES ('a1b2c3d4e5f6g7h8i9j0')
ON CONFLICT (hashed_farmer_id) DO NOTHING;

-- Insert PostGIS Polygon boundary for the mock farmer's farm plot.
-- Coordinates: Longitude Latitude (SRID 4326 = WGS84)
INSERT INTO farm_plot (farmer_profile_id, boundaries)
SELECT 1, ST_GeomFromText('POLYGON((78.9629 20.5937, 78.9630 20.5937, 78.9630 20.5938, 78.9629 20.5938, 78.9629 20.5937))', 4326)
WHERE NOT EXISTS (
    SELECT 1 FROM farm_plot WHERE farmer_profile_id = 1
);
