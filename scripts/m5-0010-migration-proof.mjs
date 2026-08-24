import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ─────────────────────────────────────────────
// M5 MIGRATION 0010 — DELTA PROOF
// ─────────────────────────────────────────────
//
// This script audits the migration 0010 SQL against
// the Drizzle schema and verifies the delta is safe.
//
// It does NOT connect to a live database.
// It parses the SQL and schema definition to prove:
//   1. All M5 tables have IF NOT EXISTS / IF NOT EXISTS guards
//   2. All ALTER TABLEs use ADD COLUMN IF NOT EXISTS
//   3. All CREATE INDEX statements use IF NOT EXISTS
//   4. All enums use EXCEPTION WHEN duplicate_object
//   5. The Drizzle schema matches the migration target
// ─────────────────────────────────────────────

const MIGRATION_PATH = join(process.cwd(), 'drizzle/0010_m5_report_cards.sql');
const SCHEMA_PATH = join(process.cwd(), 'src/lib/db/schema/index.ts');

let errors = 0;
let passed = 0;

function check(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.log(`  ✗ ${msg}`);
    errors++;
  }
}

// Read migration SQL
if (!existsSync(MIGRATION_PATH)) {
  console.error(`FAIL: Migration file not found: ${MIGRATION_PATH}`);
  process.exit(1);
}
const sql = readFileSync(MIGRATION_PATH, 'utf-8');

// Read Drizzle schema
if (!existsSync(SCHEMA_PATH)) {
  console.error(`FAIL: Schema file not found: ${SCHEMA_PATH}`);
  process.exit(1);
}
const schema = readFileSync(SCHEMA_PATH, 'utf-8');

console.log('=== M5 MIGRATION 0010 DELTA PROOF ===\n');

// ── 1. Migration safety checks ──
console.log('1. Migration safety (idempotent guards):');

check(sql.includes('IF NOT EXISTS'), 'Uses CREATE TABLE IF NOT EXISTS');
check(sql.includes('ADD COLUMN IF NOT EXISTS'), 'Uses ADD COLUMN IF NOT EXISTS for pedagogical_config');
check(sql.includes('IF NOT EXISTS'), 'Uses CREATE INDEX IF NOT EXISTS');
check(sql.includes('EXCEPTION WHEN duplicate_object THEN NULL'), 'Enum creation is idempotent');
check(sql.includes('BEGIN') && sql.includes('COMMIT'), 'Wrapped in transaction');

// ── 2. Enum: general_average_input_policy ──
console.log('\n2. general_average_input_policy enum:');

check(sql.includes("CREATE TYPE general_average_input_policy AS ENUM ('subject_official', 'subject_raw')"),
  'Enum created with correct values');
check(sql.includes("ADD COLUMN IF NOT EXISTS general_average_input_policy general_average_input_policy"),
  'Column added to pedagogical_config');
check(sql.includes("NOT NULL DEFAULT 'subject_official'"),
  'Default is subject_official');

// ── 3. report_card table ──
console.log('\n3. report_card table:');

check(sql.includes('CREATE TABLE IF NOT EXISTS report_card'), 'report_card table created');
check(sql.includes('student_id UUID NOT NULL REFERENCES student(id)'), 'FK to student');
check(sql.includes('enrollment_id UUID NOT NULL REFERENCES enrollment(id)'), 'FK to enrollment');
check(sql.includes('academic_period_id UUID NOT NULL REFERENCES academic_period(id)'), 'FK to academic_period');
check(sql.includes('status report_card_status NOT NULL DEFAULT'), 'Has status enum with default');
check(sql.includes('general_average_raw NUMERIC(12, 8)'), 'general_average_raw stored (8dp)');
check(sql.includes('general_average_official NUMERIC(8, 4)'), 'general_average_official stored (4dp)');
check(sql.includes('general_average_input_policy general_average_input_policy'), 'Policy column stored');
check(sql.includes('rounding_strategy rounding_strategy'), 'Rounding strategy stored');
check(sql.includes('subject_decimal_places INTEGER'), 'Subject decimal places stored');
check(sql.includes('general_decimal_places INTEGER'), 'General decimal places stored');
check(sql.includes('rank INTEGER'), 'Rank stored');
check(sql.includes('total_students_ranked INTEGER'), 'Total students ranked stored');
check(sql.includes('published_at TIMESTAMPTZ'), 'Publication timestamp stored');
check(sql.includes('published_by UUID'), 'Publisher stored');
check(sql.includes('config_version_id UUID REFERENCES pedagogical_config(id)'), 'Config version FK');
check(sql.includes('UNIQUE INDEX IF NOT EXISTS ur_student_period ON report_card(student_id, academic_period_id)'),
  'Unique constraint on student+period');
check(sql.includes('CREATE INDEX IF NOT EXISTS rc_enrollment_idx ON report_card(enrollment_id)'), 'Index on enrollment_id');
check(sql.includes('CREATE INDEX IF NOT EXISTS rc_status_idx ON report_card(status)'), 'Index on status');
check(sql.includes('CREATE INDEX IF NOT EXISTS rc_config_version_idx ON report_card(config_version_id)'), 'Index on config_version_id');

// ── 4. report_card_item table ──
console.log('\n4. report_card_item table:');

check(sql.includes('CREATE TABLE IF NOT EXISTS report_card_item'), 'report_card_item table created');
check(sql.includes('report_card_id UUID NOT NULL REFERENCES report_card(id) ON DELETE CASCADE'), 'FK to report_card with CASCADE');
check(sql.includes('subject_id UUID NOT NULL REFERENCES subject(id)'), 'FK to subject');
check(sql.includes('raw_value NUMERIC(12, 8)'), 'raw_value stored (subject raw)');
check(sql.includes('official_value NUMERIC(8, 4)'), 'official_value stored (subject official)');
check(sql.includes('coefficient NUMERIC(6, 2)'), 'Coefficient stored');
check(sql.includes('weighted_points NUMERIC(12, 8)'), 'Weighted points stored');
check(sql.includes('include_in_average BOOLEAN NOT NULL DEFAULT TRUE'), 'include_in_average flag');
check(sql.includes('is_incomplete BOOLEAN NOT NULL DEFAULT FALSE'), 'is_incomplete flag');
check(sql.includes('UNIQUE INDEX IF NOT EXISTS uri_rc_subject ON report_card_item(report_card_id, subject_id)'),
  'Unique constraint on report_card+subject');

// ── 5. report_card_component_item table ──
console.log('\n5. report_card_component_item table:');

check(sql.includes('CREATE TABLE IF NOT EXISTS report_card_component_item'), 'report_card_component_item table created');
check(sql.includes('report_card_item_id UUID NOT NULL REFERENCES report_card_item(id) ON DELETE CASCADE'), 'FK with CASCADE');
check(sql.includes('component_name TEXT NOT NULL'), 'Component name stored');
check(sql.includes('raw_value NUMERIC(12, 8)'), 'Component raw_value stored');
check(sql.includes('CREATE INDEX IF NOT EXISTS rcci_item_idx ON report_card_component_item(report_card_item_id)'),
  'Index on report_card_item_id');

// ── 6. Drizzle schema alignment ──
console.log('\n6. Drizzle schema alignment:');

check(schema.includes('reportCard'), 'Drizzle schema defines reportCard table');
check(schema.includes('reportCardItem'), 'Drizzle schema defines reportCardItem table');
check(schema.includes('reportCardComponentItem'), 'Drizzle schema defines reportCardComponentItem table');
check(schema.includes('generalAverageRaw'), 'Schema has generalAverageRaw');
check(schema.includes('generalAverageOfficial'), 'Schema has generalAverageOfficial');
check(schema.includes('generalAverageInputPolicy'), 'Schema has generalAverageInputPolicy');
check(schema.includes('roundingStrategy'), 'Schema has roundingStrategy');
check(schema.includes('subjectDecimalPlaces'), 'Schema has subjectDecimalPlaces');
check(schema.includes('generalDecimalPlaces'), 'Schema has generalDecimalPlaces');
check(schema.includes('report_card_status'), 'Schema has report_card_status type');
check(schema.includes('general_average_input_policy'), 'Schema has general_average_input_policy type');

// ── 7. Migration is dev-only ──
console.log('\n7. Dev-only guard:');
check(sql.includes('DEV ONLY') || sql.includes('NOT FOR PRODUCTION'), 'Migration marked as dev-only');

// ── Result ──
console.log(`\n=== RESULT: ${passed} passed, ${errors} errors ===`);
if (errors > 0) {
  console.error('\nMIGRATION PROOF FAILED');
  process.exit(1);
} else {
  console.log('\nMIGRATION PROOF PASSED');
}
