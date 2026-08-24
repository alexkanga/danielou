import pg from 'pg';
const c = new pg.Client({connectionString: process.argv[2]});
await c.connect();
const checks = [];
function chk(label, ok, detail) { checks.push({label,ok,detail}); console.log('  [' + (ok?'PASS':'FAIL') + '] ' + label + (detail ? ' -- ' + detail : '')); }

const e1 = await c.query("SELECT 1 FROM pg_type WHERE typname = 'general_average_input_policy'");
chk('ENUM general_average_input_policy', e1.rows.length > 0);

const c1 = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'pedagogical_config' AND column_name = 'general_average_input_policy'");
chk('pc.general_average_input_policy', c1.rows.length > 0);

const rcCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'report_card'");
const rcSet = new Set(rcCols.rows.map(r => r.column_name));
for (const col of ['general_average_raw','general_average_official','general_average_input_policy','rounding_strategy','subject_decimal_places','general_decimal_places','min_class_average','max_class_average','total_weighted_points','total_eligible_coefficient','created_by','updated_by']) {
  chk('rc.' + col, rcSet.has(col));
}

const rciCols = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'report_card_item'");
const rciSet = new Set(rciCols.rows.map(r => r.column_name));
for (const col of ['subject_name','subject_code','raw_value','official_value','include_in_average','is_incomplete','sort_order','created_by','updated_by']) {
  chk('rci.' + col, rciSet.has(col));
}

const t1 = await c.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'report_card_component_item'");
chk('report_card_component_item table', t1.rows.length > 0);

const i1 = await c.query("SELECT indexname FROM pg_indexes WHERE indexname = 'rc_config_version_idx'");
chk('rc_config_version_idx', i1.rows.length > 0);
const i2 = await c.query("SELECT indexname FROM pg_indexes WHERE indexname = 'rcci_item_idx'");
chk('rcci_item_idx', i2.rows.length > 0);

const j = await c.query("SELECT id, hash FROM __drizzle_migrations WHERE hash LIKE '%0010%' OR hash LIKE '%0009%'");
chk('0009 in journal', j.rows.some(r => r.hash.includes('0009')));
chk('0010 in journal', j.rows.some(r => r.hash.includes('0010')));

const jall = await c.query('SELECT count(*) as cnt FROM __drizzle_migrations');
chk('total migrations', Number(jall.rows[0].cnt) === 11, 'expected 11, got ' + jall.rows[0].cnt);

const s = await c.query('SELECT count(*) as cnt FROM student');
chk('students preserved', Number(s.rows[0].cnt) === 69, 'count=' + s.rows[0].cnt);
const u = await c.query('SELECT count(*) as cnt FROM "user"');
chk('users preserved', Number(u.rows[0].cnt) === 5, 'count=' + u.rows[0].cnt);
const sub = await c.query('SELECT count(*) as cnt FROM subject');
chk('subjects preserved', Number(sub.rows[0].cnt) === 12, 'count=' + sub.rows[0].cnt);

console.log('\nTOTAL: ' + checks.length + ' | PASS: ' + checks.filter(c=>c.ok).length + ' | FAIL: ' + checks.filter(c=>!c.ok).length);
await c.end();
