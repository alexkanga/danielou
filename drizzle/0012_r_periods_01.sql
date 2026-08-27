-- R-PERIODS-01: AcademicPeriod evolution
-- Add level_id, period_type, make dates nullable, change delete policy, add partial uniqueness

-- 1. Create new enum
DO $$ BEGIN
    CREATE TYPE period_type AS ENUM ('trimester', 'semester', 'composition', 'passage', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add new columns
ALTER TABLE academic_period ADD COLUMN IF NOT EXISTS level_id UUID REFERENCES "level"(id) ON DELETE RESTRICT;
ALTER TABLE academic_period ADD COLUMN IF NOT EXISTS period_type period_type NOT NULL DEFAULT 'other';

-- 3. Make dates nullable
ALTER TABLE academic_period ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE academic_period ALTER COLUMN end_date DROP NOT NULL;

-- 4. Change FK delete policy from CASCADE to RESTRICT
-- PostgreSQL doesn't support ALTER CONSTRAINT on FK delete policy,
-- so we must drop and recreate the FK
DO $$ BEGIN
    ALTER TABLE academic_period DROP CONSTRAINT IF EXISTS academic_period_academic_year_id_fkey;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;
ALTER TABLE academic_period ADD CONSTRAINT academic_period_academic_year_id_fkey
    FOREIGN KEY (academic_year_id) REFERENCES academic_year(id) ON DELETE RESTRICT;

-- 5. Drop old unique index (year+name without level scoping)
DROP INDEX IF EXISTS up_year_name;

-- 6. Add scope-aware partial unique indexes
-- GLOBAL: unique name per year where level_id IS NULL
CREATE UNIQUE INDEX up_period_year_name_global
    ON academic_period (academic_year_id, name)
    WHERE level_id IS NULL;

-- LEVEL: unique name per year+level where level_id IS NOT NULL
CREATE UNIQUE INDEX up_period_year_level_name
    ON academic_period (academic_year_id, level_id, name)
    WHERE level_id IS NOT NULL;

-- 7. Add new indexes
CREATE INDEX IF NOT EXISTS ap_level_idx ON academic_period (level_id);
CREATE INDEX IF NOT EXISTS ap_year_level_idx ON academic_period (academic_year_id, level_id);

-- 8. Add check constraints
DO $$ BEGIN
    ALTER TABLE academic_period ADD CONSTRAINT ap_sort_order_check CHECK (sort_order >= 1);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE academic_period ADD CONSTRAINT ap_dates_check
        CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 9. Backfill existing periods: set level_id = NULL (global), period_type = 'other'
UPDATE academic_period SET period_type = 'other' WHERE period_type IS NULL;
