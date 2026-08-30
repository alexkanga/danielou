import pg from 'pg';
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }
const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
const tables = ['assessment_type','subject_component','audit_log','config_component'];
for (const t of tables) {
  const { rows } = await client.query(`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${t}' AND table_schema = 'public' ORDER BY ordinal_position`);
  console.log(`=== ${t} ===`);
  for (const r of rows) console.log(`  ${r.column_name} (${r.data_type}, nullable=${r.is_nullable}, default=${r.column_default})`);
}
await client.end();
