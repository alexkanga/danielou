import postgres from 'postgres';
const sql = postgres(process.argv[2], { max: 1, idle_timeout: 10, connect_timeout: 15 });
const r = await sql`SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'period_status') ORDER BY enumsortorder`;
r.forEach(x => console.log(x.enumlabel));
await sql.end();
