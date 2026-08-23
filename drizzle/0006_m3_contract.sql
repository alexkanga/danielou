-- M3 Phase I — CONTRACT Migration
-- Drops 3 redesign removals from subject_component
-- Pre-conditions verified: 0 data, 0 runtime reads, 0 runtime writes

BEGIN;

ALTER TABLE subject_component DROP COLUMN IF EXISTS coefficient;
ALTER TABLE subject_component DROP COLUMN IF EXISTS scale;
ALTER TABLE subject_component DROP COLUMN IF EXISTS is_required;

COMMIT;
