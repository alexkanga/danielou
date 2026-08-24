-- Migration 0010: M5 Report Cards & Policy C
-- Adds: general_average_input_policy enum, column on pedagogical_config,
--        report_card table, report_card_item table, report_card_component_item table
-- DEV ONLY — NOT FOR PRODUCTION

BEGIN;

-- 1. Create general_average_input_policy enum
DO $$ BEGIN
  CREATE TYPE general_average_input_policy AS ENUM ('subject_official', 'subject_raw');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add general_average_input_policy column to pedagogical_config
ALTER TABLE pedagogical_config
  ADD COLUMN IF NOT EXISTS general_average_input_policy general_average_input_policy
  NOT NULL DEFAULT 'subject_official';

-- 3. Create report_card_status enum (if not exists)
DO $$ BEGIN
  CREATE TYPE report_card_status AS ENUM ('draft', 'ready', 'validated', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Create promotion_decision enum (if not exists)
DO $$ BEGIN
  CREATE TYPE promotion_decision AS ENUM (
    'proposed_admitted', 'proposed_repeat', 'decision_required',
    'final_admitted', 'final_repeat'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Create report_card table
CREATE TABLE IF NOT EXISTS report_card (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES student(id),
  enrollment_id UUID NOT NULL REFERENCES enrollment(id),
  academic_period_id UUID NOT NULL REFERENCES academic_period(id),
  status report_card_status NOT NULL DEFAULT 'draft',
  general_average_raw NUMERIC(12, 8),
  general_average_official NUMERIC(8, 4),
  general_average_input_policy general_average_input_policy,
  rounding_strategy rounding_strategy,
  subject_decimal_places INTEGER,
  general_decimal_places INTEGER,
  class_average NUMERIC(8, 4),
  min_class_average NUMERIC(8, 4),
  max_class_average NUMERIC(8, 4),
  rank INTEGER,
  total_students_ranked INTEGER,
  total_weighted_points NUMERIC(12, 4),
  total_eligible_coefficient NUMERIC(8, 2),
  conduct_grade NUMERIC(4, 2),
  conduct_comment TEXT,
  teacher_comment TEXT,
  director_comment TEXT,
  promotion_decision promotion_decision,
  published_at TIMESTAMPTZ,
  published_by UUID,
  config_version_id UUID REFERENCES pedagogical_config(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS ur_student_period ON report_card(student_id, academic_period_id);
CREATE INDEX IF NOT EXISTS rc_enrollment_idx ON report_card(enrollment_id);
CREATE INDEX IF NOT EXISTS rc_status_idx ON report_card(status);
CREATE INDEX IF NOT EXISTS rc_config_version_idx ON report_card(config_version_id);

-- 6. Create report_card_item table (per-subject detail)
CREATE TABLE IF NOT EXISTS report_card_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES report_card(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subject(id),
  subject_name TEXT NOT NULL,
  subject_code TEXT,
  raw_value NUMERIC(12, 8),
  official_value NUMERIC(8, 4),
  coefficient NUMERIC(6, 2),
  weighted_points NUMERIC(12, 8),
  include_in_average BOOLEAN NOT NULL DEFAULT TRUE,
  is_incomplete BOOLEAN NOT NULL DEFAULT FALSE,
  class_average NUMERIC(8, 4),
  min_average NUMERIC(8, 4),
  max_average NUMERIC(8, 4),
  teacher_appreciation TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS uri_rc_subject ON report_card_item(report_card_id, subject_id);

-- 7. Create report_card_component_item table (component-level snapshot)
-- Stores component breakdown per report_card_item for full traceability
CREATE TABLE IF NOT EXISTS report_card_component_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_item_id UUID NOT NULL REFERENCES report_card_item(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  raw_value NUMERIC(12, 8),
  coefficient NUMERIC(6, 2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS rcci_item_idx ON report_card_component_item(report_card_item_id);

COMMIT;
