-- M3 Phase D — EXPAND Migration
-- 33 DB delta objects
-- Adds CHECK constraints, columns, indexes, FKs, enum for pedagogy configuration
-- DROP = 0, business backfill = 0, production data mutation = 0
-- subject_component.coefficient, .scale, .is_required are CONTRACT_LATER (Phase I)

BEGIN;

-- ============================================================
-- 1. NEW ENUM: aggregation_policy
-- ============================================================
-- Values: simple_average, weighted_average, single_grade
-- Reuses existing calculation_policy values plus adds single_grade
DO $$ BEGIN
    CREATE TYPE aggregation_policy AS ENUM ('simple_average', 'weighted_average', 'single_grade');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. SUBJECT — CHECK constraints (3)
-- ============================================================

ALTER TABLE subject ADD CONSTRAINT subject_coefficient_check CHECK (coefficient > 0);
ALTER TABLE subject ADD CONSTRAINT subject_default_scale_check CHECK (default_scale >= 1);
ALTER TABLE subject ADD CONSTRAINT subject_sort_order_check CHECK (sort_order >= 0);

-- ============================================================
-- 3. SUBJECT_COMPONENT — ADD COLUMN + PARTIAL UNIQUE + CHECK (3)
-- ============================================================
-- NOTE: coefficient, scale, is_required are NOT dropped here (CONTRACT_LATER Phase I)

ALTER TABLE subject_component ADD COLUMN IF NOT EXISTS code text;

CREATE UNIQUE INDEX uc_subject_code
    ON subject_component (subject_id, code)
    WHERE code IS NOT NULL;

ALTER TABLE subject_component ADD CONSTRAINT subject_component_sort_order_check
    CHECK (sort_order >= 0);

-- ============================================================
-- 4. ASSESSMENT_TYPE — ADD COLUMNS + UNIQUE + CHECKS (6)
-- ============================================================

ALTER TABLE assessment_type ADD COLUMN IF NOT EXISTS default_coefficient numeric(6,2);
ALTER TABLE assessment_type ADD COLUMN IF NOT EXISTS default_scale integer;
ALTER TABLE assessment_type ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX uat_school_name
    ON assessment_type (school_id, name);

ALTER TABLE assessment_type ADD CONSTRAINT assessment_type_default_coefficient_check
    CHECK (default_coefficient IS NULL OR default_coefficient > 0);
ALTER TABLE assessment_type ADD CONSTRAINT assessment_type_default_scale_check
    CHECK (default_scale IS NULL OR default_scale >= 1);

-- ============================================================
-- 5. PEDAGOGICAL_CONFIG — PARTIAL UNIQUE + CHECKS (6)
-- ============================================================

CREATE UNIQUE INDEX upc_level_year_active
    ON pedagogical_config (level_id, academic_year_id)
    WHERE status = 'active';

ALTER TABLE pedagogical_config ADD CONSTRAINT pedagogical_config_version_check CHECK (version >= 1);
ALTER TABLE pedagogical_config ADD CONSTRAINT pedagogical_config_subject_decimals_check
    CHECK (subject_decimal_places >= 0 AND subject_decimal_places <= 6);
ALTER TABLE pedagogical_config ADD CONSTRAINT pedagogical_config_general_decimals_check
    CHECK (general_decimal_places >= 0 AND general_decimal_places <= 6);
ALTER TABLE pedagogical_config ADD CONSTRAINT pedagogical_config_conduct_coefficient_check
    CHECK (conduct_coefficient IS NULL OR conduct_coefficient >= 0);
ALTER TABLE pedagogical_config ADD CONSTRAINT pedagogical_config_conduct_scale_check
    CHECK (conduct_scale IS NULL OR conduct_scale >= 1);

-- ============================================================
-- 6. CONFIG_SUBJECT — ADD COLUMNS + CHECKS (6)
-- ============================================================

ALTER TABLE config_subject ADD COLUMN IF NOT EXISTS is_optional boolean NOT NULL DEFAULT false;
ALTER TABLE config_subject ADD COLUMN IF NOT EXISTS assessment_aggregation aggregation_policy NOT NULL DEFAULT 'weighted_average';
ALTER TABLE config_subject ADD COLUMN IF NOT EXISTS component_aggregation aggregation_policy NOT NULL DEFAULT 'weighted_average';

ALTER TABLE config_subject ADD CONSTRAINT config_subject_coefficient_check CHECK (coefficient > 0);
ALTER TABLE config_subject ADD CONSTRAINT config_subject_scale_check CHECK (scale >= 1);
ALTER TABLE config_subject ADD CONSTRAINT config_subject_sort_order_check CHECK (sort_order >= 0);

-- ============================================================
-- 7. CONFIG_COMPONENT — ALTER + ADD COLUMN + UNIQUE + CHECKS + FK POLICY (7)
-- ============================================================
-- subject_component_id: NULLABLE → NOT NULL (safe: 0 rows in config_component)

ALTER TABLE config_component ALTER COLUMN subject_component_id SET NOT NULL;

ALTER TABLE config_component ADD COLUMN IF NOT EXISTS assessment_aggregation aggregation_policy NOT NULL DEFAULT 'weighted_average';

CREATE UNIQUE INDEX ucc_config_subject_name
    ON config_component (config_subject_id, name);

ALTER TABLE config_component ADD CONSTRAINT config_component_coefficient_check CHECK (coefficient > 0);
ALTER TABLE config_component ADD CONSTRAINT config_component_scale_check CHECK (scale >= 1);
ALTER TABLE config_component ADD CONSTRAINT config_component_sort_order_check CHECK (sort_order >= 0);

-- Change FK delete policy: add ON DELETE RESTRICT on subject_component_id
-- Drop existing FK and recreate with RESTRICT
ALTER TABLE config_component DROP CONSTRAINT IF EXISTS config_component_subject_component_id_subject_component_id_fk;
ALTER TABLE config_component ADD CONSTRAINT config_component_subject_component_id_fk
    FOREIGN KEY (subject_component_id) REFERENCES subject_component(id) ON DELETE RESTRICT;

-- ============================================================
-- 8. REPORT_CARD — ADD FK (1)
-- ============================================================

ALTER TABLE report_card ADD CONSTRAINT report_card_config_version_id_fk
    FOREIGN KEY (config_version_id) REFERENCES pedagogical_config(id);

-- ============================================================
-- VERIFY COUNT
-- ============================================================
-- This section is informational only — not a constraint
-- Expected: 33 delta objects applied

COMMIT;
