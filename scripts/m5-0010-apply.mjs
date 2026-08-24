/**
 * M5 0010 — Actual non-prod migration apply
 * 
 * Uses the project's real migration mechanism:
 *   - Raw SQL via `postgres` (DIRECT_URL pattern)
 *   - __drizzle_migrations journal (id, hash, created_at)
 *   - Hash pattern matching (LIKE '%name%')
 *
 * SAFE NONPROD ONLY.
 */
import postgres from 'postgres';

const DIRECT_URL = process.argv[2];
if (!DIRECT_URL) { console.error('Usage: node scripts/m5-0010-apply.mjs <DIRECT_URL>'); process.exit(1); }

const sql = postgres(DIRECT_URL, { max: 1, idle_timeout: 10, connect_timeout: 15 });

async function run() {
  console.log('=== M5 0010 MIGRATION APPLY ===\n');

  // ─────────────────────────────────────────────
  // PRE-FLIGHT: Check journal for 0010
  // ─────────────────────────────────────────────
  const [existing] = await sql`SELECT id, hash FROM __drizzle_migrations WHERE hash LIKE '%0010%' OR hash LIKE '%m5_report_cards%'`;
  if (existing) {
    console.log('0010 ALREADY IN JOURNAL (id=' + existing.id + ', hash=' + existing.hash + '). Skipping DDL.');
    console.log('0010 FIRST APPLY: SKIP (already applied)');
    console.log('0010 TRACKING: PASS');
    return 'SKIP';
  }

  // Also check 0009 — it should be there but journal shows it's missing
  const [has0009] = await sql`SELECT id FROM __drizzle_migrations WHERE hash LIKE '%0009%' OR hash LIKE '%ba171%'`;
  if (!has0009) {
    console.log('Recording 0009_ba171_account_compat in journal (was applied to DB but missing from journal)...');
    await sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('0009_ba171_account_compat_snapshot', ${Date.now()})`;
    console.log('  0009 journal entry created.');
  }

  console.log('0010 not in journal. Applying M5 deltas...\n');

  await sql.begin(async (tx) => {
    // ─────────────────────────────────────────────
    // 1. general_average_input_policy enum
    // ─────────────────────────────────────────────
    console.log('1. Creating general_average_input_policy enum...');
    await tx.unsafe(`DO $$ BEGIN
      CREATE TYPE general_average_input_policy AS ENUM ('subject_official', 'subject_raw');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;`);
    console.log('   OK');

    // ─────────────────────────────────────────────
    // 2. pedagogical_config — add general_average_input_policy
    // ─────────────────────────────────────────────
    console.log('2. Adding general_average_input_policy to pedagogical_config...');
    await tx.unsafe(`DO $$ BEGIN
      ALTER TABLE pedagogical_config ADD COLUMN general_average_input_policy general_average_input_policy NOT NULL DEFAULT 'subject_official';
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;`);
    console.log('   OK');

    // ─────────────────────────────────────────────
    // 3. report_card — add M5 columns (delta from existing schema)
    // ─────────────────────────────────────────────
    console.log('3. Adding M5 columns to report_card...');
    const m5_rc_columns = [
      ['general_average_raw', 'NUMERIC(12, 8)'],
      ['general_average_official', 'NUMERIC(8, 4)'],
      ['general_average_input_policy', 'general_average_input_policy'],
      ['rounding_strategy', 'rounding_strategy'],
      ['subject_decimal_places', 'INTEGER'],
      ['general_decimal_places', 'INTEGER'],
      ['min_class_average', 'NUMERIC(8, 4)'],
      ['max_class_average', 'NUMERIC(8, 4)'],
      ['total_weighted_points', 'NUMERIC(12, 4)'],
      ['total_eligible_coefficient', 'NUMERIC(8, 2)'],
      ['created_by', 'UUID'],
      ['updated_by', 'UUID'],
    ];
    for (const [col, type] of m5_rc_columns) {
      await tx.unsafe(`DO $$ BEGIN
        ALTER TABLE report_card ADD COLUMN ${col} ${type};
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;`);
    }
    console.log('   ' + m5_rc_columns.length + ' columns checked/added.');

    // ─────────────────────────────────────────────
    // 4. report_card — add missing index
    // ─────────────────────────────────────────────
    console.log('4. Adding rc_config_version_idx...');
    await tx.unsafe(`CREATE INDEX IF NOT EXISTS rc_config_version_idx ON report_card(config_version_id);`);
    console.log('   OK');

    // ─────────────────────────────────────────────
    // 5. report_card_item — add M5 columns
    // ─────────────────────────────────────────────
    console.log('5. Adding M5 columns to report_card_item...');
    const m5_rci_columns = [
      ['subject_name', 'TEXT NOT NULL DEFAULT \'\''],
      ['subject_code', 'TEXT'],
      ['raw_value', 'NUMERIC(12, 8)'],
      ['official_value', 'NUMERIC(8, 4)'],
      ['include_in_average', 'BOOLEAN NOT NULL DEFAULT TRUE'],
      ['is_incomplete', 'BOOLEAN NOT NULL DEFAULT FALSE'],
      ['sort_order', 'INTEGER NOT NULL DEFAULT 0'],
      ['created_by', 'UUID'],
      ['updated_by', 'UUID'],
    ];
    for (const [col, def] of m5_rci_columns) {
      await tx.unsafe(`DO $$ BEGIN
        ALTER TABLE report_card_item ADD COLUMN ${col} ${def};
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;`);
    }
    console.log('   ' + m5_rci_columns.length + ' columns checked/added.');

    // ─────────────────────────────────────────────
    // 6. report_card_component_item (new table)
    // ─────────────────────────────────────────────
    console.log('6. Creating report_card_component_item table...');
    await tx.unsafe(`CREATE TABLE IF NOT EXISTS report_card_component_item (
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
    );`);
    console.log('   OK');
    console.log('7. Creating rcci_item_idx...');
    await tx.unsafe(`CREATE INDEX IF NOT EXISTS rcci_item_idx ON report_card_component_item(report_card_item_id);`);
    console.log('   OK');
  });

  // ─────────────────────────────────────────────
  // JOURNAL ENTRY
  // ─────────────────────────────────────────────
  console.log('\nRecording 0010 in journal...');
  await sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('0010_m5_report_cards_snapshot', ${Date.now()})`;
  console.log('  0010_m5_report_cards_snapshot recorded.');

  console.log('\n=== 0010 MIGRATION COMPLETE ===');
  return 'APPLIED';
}

try {
  const result = await run();
  console.log('\nRESULT:', result);
  await sql.end();
} catch (e) {
  console.error('\nMIGRATION FAILED:', e.message);
  await sql.end();
  process.exit(1);
}
