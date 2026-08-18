-- Rishi Valley itself was missing from the GeoNames gazetteer, so the one
-- place every member of this site shares could not be picked in the location
-- finder (owner, 2026-08-18: "would it be possible to add Rishi Valley to
-- the location finder?").
--
-- One curated row, idempotent. The id 900000001 is far outside GeoNames'
-- allocated range (currently ~13M), so it can never collide with a future
-- gazetteer refresh. Coordinates are the school campus in the valley near
-- Madanapalle; population is the resident campus community, and ranking no
-- longer leans on population for prefix matches anyway (see the search
-- route's ORDER BY).
INSERT INTO "Place" (id, name, "asciiName", "altNames", admin1, country, lat, lng, population)
VALUES (
  900000001,
  'Rishi Valley',
  'Rishi Valley',
  'Rishi Valley School,Rishivalley',
  'Andhra Pradesh',
  'IN',
  13.6299,
  78.4661,
  1500
)
ON CONFLICT (id) DO NOTHING;
