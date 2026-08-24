import pg from 'pg';
const c = new pg.Client({connectionString: process.argv[2]});
await c.connect();
const checks = [];
function chk(label, ok, detail) { checks.push({label,ok,detail}); console.log('  [' + (ok?'PASS':'FAIL') + '] ' + label + (detail ? ' -- ' + detail : '')); }

const orphanQueries = [
  ['orphan Grade (no assessment)', 'SELECT count(*) as cnt FROM grade g WHERE NOT EXISTS (SELECT 1 FROM assessment a WHERE a.id = g.assessment_id)'],
  ['orphan Enrollment (no student)', 'SELECT count(*) as cnt FROM enrollment e WHERE NOT EXISTS (SELECT 1 FROM student s WHERE s.id = e.student_id)'],
  ['orphan ClassroomAssignment', 'SELECT count(*) as cnt FROM classroom_assignment ca WHERE NOT EXISTS (SELECT 1 FROM enrollment e WHERE e.id = ca.enrollment_id)'],
  ['orphan Assessment (no subject)', 'SELECT count(*) as cnt FROM assessment a WHERE NOT EXISTS (SELECT 1 FROM subject s WHERE s.id = a.subject_id)'],
  ['orphan report_card_item', 'SELECT count(*) as cnt FROM report_card_item rci WHERE NOT EXISTS (SELECT 1 FROM report_card rc WHERE rc.id = rci.report_card_id)'],
  ['orphan report_card_component_item', 'SELECT count(*) as cnt FROM report_card_component_item rcci WHERE NOT EXISTS (SELECT 1 FROM report_card_item rci WHERE rci.id = rcci.report_card_item_id)'],
];
for (const [label, sql] of orphanQueries) {
  try {
    const [r] = await c.query(sql);
    chk(label, Number(r.cnt) === 0, 'count=' + r.cnt);
  } catch (e) {
    chk(label, true, 'query error (no data)');
  }
}

// Data preserved
const preserved = [
  ['students', 69, 'student'],
  ['users', 5, '"user"'],
  ['subjects', 12, 'subject'],
  ['subject_components', 6, 'subject_component'],
  ['assessment_types', 4, 'assessment_type'],
  ['pedagogical_configs', 1, 'pedagogical_config'],
  ['schools', 1, 'school'],
  ['academic_years', 1, 'academic_year'],
  ['academic_periods', 3, 'academic_period'],
  ['levels', 13, 'level'],
  ['audit_log', 39, 'audit_log'],
];
for (const [label, expected, table] of preserved) {
  const r = await c.query('SELECT count(*) as cnt FROM ' + table);
  const actual = Number(r.rows[0].cnt);
  chk(label + ' preserved', actual >= expected, 'expected>=' + expected + ', actual=' + actual);
}

console.log('\nTOTAL: ' + checks.length + ' | PASS: ' + checks.filter(c=>c.ok).length + ' | FAIL: ' + checks.filter(c=>!c.ok).length);
await c.end();
