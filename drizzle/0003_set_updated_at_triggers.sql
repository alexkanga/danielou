-- R-V2-PRE-M3 §35/§36 — DB-managed updated_at triggers
-- Strategy: DB-managed (Option A per §35 recommendation)
-- Ensures updated_at is ALWAYS set on UPDATE, regardless of application code path.

--> statement-breakpoint

-- Reusable function: sets updated_at to current timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint

-- School
CREATE TRIGGER trg_school_updated_at
  BEFORE UPDATE ON "school"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Academic Year
CREATE TRIGGER trg_academic_year_updated_at
  BEFORE UPDATE ON "academic_year"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Academic Period
CREATE TRIGGER trg_academic_period_updated_at
  BEFORE UPDATE ON "academic_period"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Level
CREATE TRIGGER trg_level_updated_at
  BEFORE UPDATE ON "level"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Classroom
CREATE TRIGGER trg_classroom_updated_at
  BEFORE UPDATE ON "classroom"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Student
CREATE TRIGGER trg_student_updated_at
  BEFORE UPDATE ON "student"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Enrollment
CREATE TRIGGER trg_enrollment_updated_at
  BEFORE UPDATE ON "enrollment"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Classroom Assignment
CREATE TRIGGER trg_classroom_assignment_updated_at
  BEFORE UPDATE ON "classroom_assignment"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Subject
CREATE TRIGGER trg_subject_updated_at
  BEFORE UPDATE ON "subject"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Subject Component
CREATE TRIGGER trg_subject_component_updated_at
  BEFORE UPDATE ON "subject_component"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Assessment Type
CREATE TRIGGER trg_assessment_type_updated_at
  BEFORE UPDATE ON "assessment_type"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Assessment
CREATE TRIGGER trg_assessment_updated_at
  BEFORE UPDATE ON "assessment"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Grade
CREATE TRIGGER trg_grade_updated_at
  BEFORE UPDATE ON "grade"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Report Card
CREATE TRIGGER trg_report_card_updated_at
  BEFORE UPDATE ON "report_card"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Report Card Item
CREATE TRIGGER trg_report_card_item_updated_at
  BEFORE UPDATE ON "report_card_item"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Pedagogical Config
CREATE TRIGGER trg_pedagogical_config_updated_at
  BEFORE UPDATE ON "pedagogical_config"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Config Subject
CREATE TRIGGER trg_config_subject_updated_at
  BEFORE UPDATE ON "config_subject"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Config Component
CREATE TRIGGER trg_config_component_updated_at
  BEFORE UPDATE ON "config_component"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- School Membership
CREATE TRIGGER trg_school_membership_updated_at
  BEFORE UPDATE ON "school_membership"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

--> statement-breakpoint

-- Audit Log (mutable — for corrections)
CREATE TRIGGER trg_audit_log_updated_at
  BEFORE UPDATE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
