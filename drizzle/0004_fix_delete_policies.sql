-- R-V2-PRE-M3 §37-§39 — Fix destructive CASCADE on business-root entities
-- Doctrine V2: roots/business-history → RESTRICT/archive; CASCADE only for dependent children.

-- =============================================
-- 1. level → classroom: CASCADE → RESTRICT (§37/§38)
--    Classroom is a business entity with its own children.
--    Deleting a level must NOT silently destroy classrooms.
-- =============================================

--> statement-breakpoint

-- Find and drop the existing FK constraint
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'classroom'::regclass
    AND confrelid = 'level'::regclass
    AND contype = 'f';
  
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "classroom" DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

--> statement-breakpoint

ALTER TABLE "classroom"
  ADD CONSTRAINT "classroom_level_id_fkey"
    FOREIGN KEY ("level_id") REFERENCES "level"("id") ON DELETE RESTRICT;

-- =============================================
-- 2. classroom → assessment: CASCADE → RESTRICT (§39)
--    Assessments contain grades — destructive business data.
-- =============================================

--> statement-breakpoint

DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'assessment'::regclass
    AND confrelid = 'classroom'::regclass
    AND contype = 'f';
  
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "assessment" DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

--> statement-breakpoint

ALTER TABLE "assessment"
  ADD CONSTRAINT "assessment_classroom_id_fkey"
    FOREIGN KEY ("classroom_id") REFERENCES "classroom"("id") ON DELETE RESTRICT;

-- =============================================
-- 3. student → grade: CASCADE → RESTRICT (§39)
--    Grades are critical business data — must not be silently destroyed.
-- =============================================

--> statement-breakpoint

DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'grade'::regclass
    AND confrelid = 'student'::regclass
    AND contype = 'f';
  
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "grade" DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

--> statement-breakpoint

ALTER TABLE "grade"
  ADD CONSTRAINT "grade_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE RESTRICT;