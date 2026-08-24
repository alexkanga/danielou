/**
 * M5 BEFORE STATE — Full column/index/constraint capture for existing tables
 */
import postgres from 'postgres';

const DIRECT_URL = process.argv[2];
const sql = postgres(DIRECT_URL, { max: 1, idle_timeout: 10, connect_timeout: 15 });

try {
  // Report card columns
  console.log('=== report_card columns ===');
  const rc = await sql`SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns WHERE table_name='report_card' ORDER BY ordinal_position`;
  rc.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} nullable=${c.is_nullable} default=${c.column_default}`));

  console.log('\n=== report_card_item columns ===');
  const rci = await sql`SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns WHERE table_name='report_card_item' ORDER BY ordinal_position`;
  rci.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} nullable=${c.is_nullable} default=${c.column_default}`));

  // Indexes on report_card
  console.log('\n=== report_card indexes ===');
  const ri = await sql`SELECT indexname, indexdef FROM pg_indexes WHERE tablename='report_card' ORDER BY indexname`;
  ri.forEach(i => console.log(`  ${i.indexname}: ${i.indexdef}`));

  console.log('\n=== report_card_item indexes ===');
  const rii = await sql`SELECT indexname, indexdef FROM pg_indexes WHERE tablename='report_card_item' ORDER BY indexname`;
  rii.forEach(i => console.log(`  ${i.indexname}: ${i.indexdef}`));

  // FKs
  console.log('\n=== report_card FKs ===');
  const rfks = await sql`SELECT conname, pg_get_constraintdef(oid) as def 
    FROM pg_constraint WHERE conrelid='report_card'::regclass AND contype='f'`;
  rfks.forEach(f => console.log(`  ${f.conname}: ${f.def}`));

  console.log('\n=== report_card_item FKs ===');
  const rifks = await sql`SELECT conname, pg_get_constraintdef(oid) as def 
    FROM pg_constraint WHERE conrelid='report_card_item'::regclass AND contype='f'`;
  rifks.forEach(f => console.log(`  ${f.conname}: ${f.def}`));

  // Check for 0009 in journal
  console.log('\n=== Journal 0009 check ===');
  const [n9] = await sql`SELECT id FROM __drizzle_migrations WHERE hash LIKE '%0009%' OR hash LIKE '%ba171%'`;
  console.log('0009 in journal:', n9 ? `YES (id=${n9.id})` : 'NO');

  // report_card_component_item check
  console.log('\n=== report_card_component_item ===');
  const [rcci] = await sql`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='report_card_component_item') as exists_`;
  console.log('EXISTS:', rcci.exists_);

  // promotion_decision enum check
  const [pde] = await sql`SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname='promotion_decision') as exists_`;
  console.log('\npromotion_decision enum:', pde.exists_ ? 'EXISTS' : 'MISSING');

  // report_card_status enum check
  const [rse] = await sql`SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname='report_card_status') as exists_`;
  console.log('report_card_status enum:', rse.exists_ ? 'EXISTS' : 'MISSING');

} catch (e) {
  console.error('ERROR:', e.message);
  process.exit(1);
} finally {
  await sql.end();
}
