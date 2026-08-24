import postgres from 'postgres';
const sql = postgres(process.argv[2], { max: 1, idle_timeout: 10, connect_timeout: 15 });
const c = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='academic_period' ORDER BY ordinal_position`;
c.forEach(x => console.log(x.column_name));
await sql.end();
