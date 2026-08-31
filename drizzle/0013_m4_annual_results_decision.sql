-- M4: Annual Results & Decision — Threshold + Persistence
-- Adds promotion_threshold to pedagogical_config, creates annual_result table

BEGIN;

-- 1. Create new enums
DO $$ BEGIN
    CREATE TYPE annual_calculation_status AS ENUM ('calculated', 'incomplete', 'decision_council');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE annual_recommendation AS ENUM ('proposed_admitted', 'proposed_repeat', 'decision_council', 'incomplete', 'threshold_not_configured');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE annual_final_decision AS ENUM ('admitted', 'repeat', 'admitted_by_derogation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add promotion_threshold to pedagogical_config
ALTER TABLE pedagogical_config ADD COLUMN IF NOT EXISTS promotion_threshold NUMERIC(4,2);

DO $$ BEGIN
    ALTER TABLE pedagogical_config ADD CONSTRAINT pedagogical_config_promotion_threshold_check
        CHECK (promotion_threshold IS NULL OR (promotion_threshold >= 0 AND promotion_threshold <= 10));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create annual_result table
CREATE TABLE IF NOT EXISTS annual_result (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollment(id) ON DELETE RESTRICT,
    regular_raw NUMERIC(12,8),
    passage_raw NUMERIC(12,8),
    annual_raw NUMERIC(12,8),
    annual_official NUMERIC(8,4),
    calculation_status annual_calculation_status NOT NULL,
    annual_rank INTEGER,
    promotion_threshold_snapshot NUMERIC(4,2),
    system_recommendation annual_recommendation,
    final_decision annual_final_decision,
    decision_justification TEXT,
    decided_by UUID REFERENCES "user"(id),
    decided_at TIMESTAMPTZ,
    config_version_id UUID REFERENCES pedagogical_config(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT annual_result_enrollment_unique UNIQUE (enrollment_id)
);

CREATE INDEX IF NOT EXISTS ar_enrollment_idx ON annual_result (enrollment_id);
CREATE INDEX IF NOT EXISTS ar_decision_by_idx ON annual_result (decided_by);
CREATE INDEX IF NOT EXISTS ar_config_version_idx ON annual_result (config_version_id);

COMMIT;
