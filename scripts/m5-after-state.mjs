/**
 * M5 AFTER STATE — Full verification of all M5 deltas
 */
import postgres from 'postgres';

const DIRECT_URL = process.argv[2];
const sql = postgres(DIRECT_URL, { max: 1, idle_timeout: 10, connect_timeout: 15 });

let pass = 0, fail = 0;
function check(label, condition) {
  if (condition) { console.log('  PASS: ' + label); pass++; }
  else { console.log('  FAIL: ' + label); fail++; }
}

try {
  console.log('=== M5 0010 AFTER-STATE VERIFICATION ===\n');

  // 1. general_average_input_policy enum
  const [gap] = await sql`SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname='general_average_input_policy') as ok`;
  check('general_average_input_policy enum EXISTS', gap.ok);

  // 2. pedagogical_config column
  const [gapc] = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='pedagogical_config' AND column_name='general_average_input_policy'`;
  check('pedagogical_config.general_average_input_policy column', !!gapc);

  // 3. Default value check
  const [gapd] = await sql`SELECT column_default FROM information_schema.columns WHERE table_name='pedagogical_config' AND column_name='general_average_input_policy'`;
  check('pedagogical_config.general_average_input_policy DEFAULT = subject_official', gapd?.column_default === "'subject_official'::general_average_input_policy");

  // 4. report_card M5 columns
  const rcCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='report_card'`;
  const rcColNames = rcCols.map(c => c.column_name);
  const requiredRcCols = [
    'general_average_raw', 'general_average_official', 'general_average_input_policy',
    'rounding_strategy', 'subject_decimal_places', 'general_decimal_places',
    'min_class_average', 'max_class_average',
    'total_weighted_points', 'total_eligible_coefficient',
    'created_by', 'updated_by',
  ];
  for (const col of requiredRcCols) {
    check(`report_card.${col}`, rcColNames.includes(col));
  }

  // 5. report_card indexes
  const rcIdx = await sql`SELECT indexname FROM pg_indexes WHERE tablename='report_card'`;
  const rcIdxNames = rcIdx.map(i => i.indexname);
  check('report_card: ur_student_period unique index', rcIdxNames.includes('ur_student_period'));
  check('report_card: rc_enrollment_idx', rcIdxNames.includes('rc_enrollment_idx'));
  check('report_card: rc_status_idx', rcIdxNames.includes('rc_status_idx'));
  check('report_card: rc_config_version_idx (NEW)', rcIdxNames.includes('rc_config_version_idx'));

  // 6. report_card FKs
  const rcFks = await sql`SELECT conname FROM pg_constraint WHERE conrelid='report_card'::regclass AND contype='f'`;
  const rcFkNames = rcFks.map(f => f.conname);
  check('report_card FK: student', rcFkNames.some(f => f.includes('student')));
  check('report_card FK: enrollment', rcFkNames.some(f => f.includes('enrollment')));
  check('report_card FK: academic_period', rcFkNames.some(f => f.includes('academic_period')));
  check('report_card FK: pedagogical_config (config_version_id)', rcFkNames.some(f => f.includes('config_version')));

  // 7. report_card_item M5 columns
  const rciCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='report_card_item'`;
  const rciColNames = rciCols.map(c => c.column_name);
  const requiredRciCols = [
    'subject_name', 'subject_code', 'raw_value', 'official_value',
    'coefficient', 'weighted_points', 'include_in_average', 'is_incomplete',
    'class_average', 'min_average', 'max_average', 'teacher_appreciation',
    'sort_order', 'created_by', 'updated_by',
  ];
  for (const col of requiredRciCols) {
    check(`report_card_item.${col}`, rciColNames.includes(col));
  }

  // 8. report_card_item indexes
  const rciIdx = await sql`SELECT indexname FROM pg_indexes WHERE tablename='report_card_item'`;
  const rciIdxNames = rciIdx.map(i => i.indexname);
  check('report_card_item: uri_rc_subject unique index', rciIdxNames.includes('uri_rc_subject'));

  // 9. report_card_item FKs
  const rciFks = await sql`SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid='report_card_item'::regclass AND contype='f'`;
  check('report_card_item FK: report_card ON DELETE CASCADE', rciFks.some(f => f.conname.includes('report_card_id') && f.def.includes('CASCADE')));
  check('report_card_item FK: subject', rciFks.some(f => f.conname.includes('subject_id')));

  // 10. report_card_component_item (NEW TABLE)
  const [rcci] = await sql`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='report_card_component_item') as ok`;
  check('report_card_component_item table EXISTS', rcci.ok);

  if (rcci.ok) {
    const rcciCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='report_card_component_item'`;
    const rcciColNames = rcciCols.map(c => c.column_name);
    const requiredRcciCols = ['id', 'report_card_item_id', 'component_name', 'raw_value', 'coefficient', 'sort_order', 'created_at', 'updated_at', 'created_by', 'updated_by'];
    for (const col of requiredRcciCols) {
      check(`report_card_component_item.${col}`, rcciColNames.includes(col));
    }

    // FK on component item
    const rcciFks = await sql`SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid='report_card_component_item'::regclass AND contype='f'`;
    check('report_card_component_item FK: report_card_item ON DELETE CASCADE', rcciFks.some(f => f.conname.includes('report_card_item_id') && f.def.includes('CASCADE')));

    // Index
    const rcciIdx = await sql`SELECT indexname FROM pg_indexes WHERE tablename='report_card_component_item'`;
    check('report_card_component_item index: rcci_item_idx', rcciIdx.some(i => i.indexname === 'rcci_item_idx'));
  }

  // 11. Journal state
  const journal = await sql`SELECT * FROM __drizzle_migrations ORDER BY id`;
  check('Journal has 0009', journal.some(j => j.hash.includes('0009')));
  check('Journal has 0010', journal.some(j => j.hash.includes('0010')));
  check('Journal total entries >= 11', journal.length >= 11);

  // 12. Uniqueness constraints (report_card)
  const rcUnique = await sql`SELECT conname FROM pg_constraint WHERE conrelid='report_card'::regclass AND contype='u'`;
  check('report_card: ur_student_period unique constraint', rcUnique.some(c => c.conname === 'ur_student_period'));

  // 13. Uniqueness constraints (report_card_item)
  const rciUnique = await sql`SELECT conname FROM pg_constraint WHERE conrelid='report_card_item'::regclass AND contype='u'`;
  check('report_card_item: uri_rc_subject unique constraint', rciUnique.some(c => c.conname === 'uri_rc_subject'));

  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log('PASS: ' + pass + '  FAIL: ' + fail);
  console.log(fail === 0 ? 'ALL CHECKS PASSED' : 'FAILURES DETECTED');

} catch (e) {
  console.error('VERIFICATION ERROR:', e.message);
  process.exit(1);
} finally {
  await sql.end();
}
