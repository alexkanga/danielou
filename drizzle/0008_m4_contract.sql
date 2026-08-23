-- M4 CONTRACT Migration
-- Drops legacy grade.student_id and grade.original_scale columns
-- With 0 grade rows, this is safe without data migration
-- DROP = 2 columns, 2 indexes, 1 unique constraint, 1 FK

BEGIN;

-- 1. Drop legacy unique constraint (assessment_id, student_id)
ALTER TABLE grade DROP CONSTRAINT IF EXISTS ug_assessment_student;

-- 2. Drop legacy index on student_id
DROP INDEX IF EXISTS gr_student_idx;

-- 3. Drop legacy FK on student_id
ALTER TABLE grade DROP CONSTRAINT IF EXISTS grade_student_id_fkey;

-- 4. Make enrollment_id NOT NULL
ALTER TABLE grade ALTER COLUMN enrollment_id SET NOT NULL;

-- 5. Drop legacy student_id column
ALTER TABLE grade DROP COLUMN IF EXISTS student_id;

-- 6. Drop legacy original_scale column
ALTER TABLE grade DROP COLUMN IF EXISTS original_scale;

-- 7. Drop partial unique index (replaced by non-partial ug_assessment_enrollment)
DROP INDEX IF EXISTS ug_assessment_enrollment;

-- 8. Recreate non-partial unique index (enrollment_id is now NOT NULL)
CREATE UNIQUE INDEX ug_assessment_enrollment ON grade (assessment_id, enrollment_id);

COMMIT;
