import postgres from 'postgres';
const sql = postgres(process.argv[2], { max: 1, idle_timeout: 10, connect_timeout: 15 });

const rc = await sql`SELECT conname, contype FROM pg_constraint WHERE conrelid='report_card'::regclass`;
console.log('report_card constraints:');
rc.forEach(c => console.log(' ', c.conname, c.contype));

const rci = await sql`SELECT conname, contype FROM pg_constraint WHERE conrelid='report_card_item'::regclass`;
console.log('report_card_item constraints:');
rci.forEach(c => console.log(' ', c.conname, c.contype));

const rcci = await sql`SELECT conname, contype FROM pg_constraint WHERE conrelid='report_card_component_item'::regclass`;
console.log('report_card_component_item constraints:');
rcci.forEach(c => console.log(' ', c.conname, c.contype));

await sql.end();
