import pg from 'pg';
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }
const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
const tables = ['school','level','academic_year','academic_period','subject','classroom','student','enrollment','classroom_assignment','pedagogical_config','config_subject','report_card','report_card_item'];
for (const t of tables) {
  const { rows } = await client.query(
    `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${t}' AND table_schema = 'public' ORDER BY ordinal_position`);
  console.log(`=== ${t} ===`);
  for (const r of rows) console.log(`  ${r.column_name} (${r.data_type}, nullable=${r.is_nullable}, default=${r.column_default})`);
}
await client.end();
