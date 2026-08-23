-- M4 EXPAND Migration
-- Adds assessment lifecycle, grade→enrollment relationship, audit columns, constraints
-- DROP = 0, business data mutation = 0
-- DATA MIGRATION NEED = NONE (0 rows in assessment, 0 rows in grade)

BEGIN;

-- ============================================================
-- 1. NEW ENUM: assessment_status
-- ============================================================
DO $$ BEGIN
    CREATE TYPE assessment_status AS ENUM ('draft', 'open', 'closed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. ASSESSMENT — ADD COLUMNS + CHECKS + INDEX
-- ============================================================

-- Status for lifecycle management
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS status assessment_status NOT NULL DEFAULT 'draft';

-- Link to active pedagogical configuration (optional, for config-governed assessments)
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS config_subject_id uuid;
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS config_component_id uuid;

-- Audit trail: who created/last modified
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS updated_by uuid;

-- FK: config_subject_id → config_subject
DO $$ BEGIN
    ALTER TABLE assessment ADD CONSTRAINT assessment_config_subject_id_fk
        FOREIGN KEY (config_subject_id) REFERENCES config_subject(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- FK: config_component_id → config_component
DO $$ BEGIN
    ALTER TABLE assessment ADD CONSTRAINT assessment_config_component_id_fk
        FOREIGN KEY (config_component_id) REFERENCES config_component(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CHECK: scale >= 1
ALTER TABLE assessment ADD CONSTRAINT assessment_scale_check CHECK ("scale" >= 1);

-- CHECK: coefficient > 0
ALTER TABLE assessment ADD CONSTRAINT assessment_coefficient_check CHECK (coefficient > 0);

-- INDEX: status for lifecycle queries
CREATE INDEX IF NOT EXISTS as_status_idx ON assessment (status);

-- INDEX: config_subject_id for config lookups
CREATE INDEX IF NOT EXISTS as_config_subject_idx ON assessment (config_subject_id);

-- ============================================================
-- 3. GRADE — ADD COLUMNS + CHECKS + INDEX
-- ============================================================

-- Canonical enrollment relationship (EXPAND: nullable, SWITCH: NOT NULL)
ALTER TABLE grade ADD COLUMN IF NOT EXISTS enrollment_id uuid;

-- Audit trail: who created/last modified
ALTER TABLE grade ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE grade ADD COLUMN IF NOT EXISTS updated_by uuid;

-- FK: created_by/updated_by for assessment
DO $$ BEGIN
    ALTER TABLE assessment ADD CONSTRAINT assessment_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES "user"(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE assessment ADD CONSTRAINT assessment_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES "user"(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- FK: enrollment_id → enrollment
DO $$ BEGIN
    ALTER TABLE grade ADD CONSTRAINT grade_enrollment_id_fk
        FOREIGN KEY (enrollment_id) REFERENCES enrollment(id) ON DELETE RESTRICT;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- FK: created_by/updated_by for grade
DO $$ BEGIN
    ALTER TABLE grade ADD CONSTRAINT grade_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES "user"(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE grade ADD CONSTRAINT grade_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES "user"(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CHECK: raw_value >= 0 when present
ALTER TABLE grade ADD CONSTRAINT grade_raw_value_check CHECK (raw_value IS NULL OR raw_value >= 0);

-- PARTIAL UNIQUE: one grade per assessment+enrollment (active once enrollment_id is populated)
CREATE UNIQUE INDEX IF NOT EXISTS ug_assessment_enrollment
    ON grade (assessment_id, enrollment_id)
    WHERE enrollment_id IS NOT NULL;

-- INDEX: enrollment_id for student result queries
CREATE INDEX IF NOT EXISTS gr_enrollment_idx ON grade (enrollment_id);

COMMIT;
