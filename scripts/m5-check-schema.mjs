import pg from 'pg';
const client = new pg.Client({ connectionString: 'postgresql://neondb_owner:npg_kajScfx40nhJ@ep-floral-rice-b1si6p5a-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require' });
await client.connect();
const tables = ['school','level','academic_year','academic_period','subject','classroom','student','enrollment','classroom_assignment','pedagogical_config','config_subject','report_card','report_card_item'];
for (const t of tables) {
  const { rows } = await client.query(
    `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${t}' AND table_schema = 'public' ORDER BY ordinal_position`);
  console.log(`=== ${t} ===`);
  for (const r of rows) console.log(`  ${r.column_name} (${r.data_type}, nullable=${r.is_nullable}, default=${r.column_default})`);
}
await client.end();
