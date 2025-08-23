-- 0003_normalize_storage_path.sql
-- Normalize existing documents.storage_path values to a web-safe relative path
-- Format: uploads/<basename>
-- If the normalized path would collide with an existing storage_path, append `-<id>` to keep uniqueness.

BEGIN;

-- Build candidate normalized paths from current storage_path values that are not already 'uploads/...'
WITH candidates AS (
  SELECT id, 'uploads/' || regexp_replace(storage_path, '^.*/', '') AS new_path
  FROM documents
  WHERE storage_path IS NOT NULL
    AND storage_path NOT LIKE 'uploads/%'
),
-- Ensure uniqueness by checking existing rows; if collision would occur, append '-'||id
unique_candidates AS (
  SELECT c.id,
    CASE WHEN EXISTS (
      SELECT 1 FROM documents d2
      WHERE d2.storage_path = c.new_path
        AND d2.id <> c.id
    )
    THEN c.new_path || '-' || c.id::text
    ELSE c.new_path END AS final_path
  FROM candidates c
)
-- Apply updates
UPDATE documents d
SET storage_path = u.final_path
FROM unique_candidates u
WHERE d.id = u.id;

-- For visibility, print how many rows were updated
-- (Some environments may ignore RAISE NOTICE output)
DO $$
DECLARE
  updated_count int;
BEGIN
  SELECT count(*) INTO updated_count FROM documents WHERE storage_path LIKE 'uploads/%' AND storage_path ~ 'uploads/.+';
  RAISE NOTICE 'Total documents now using uploads/ prefix: %', updated_count;
END$$;

COMMIT;

-- IMPORTANT: Please backup your database before running this migration if you have production data.
-- You can run this SQL directly (psql) or integrate into your migration tooling.
