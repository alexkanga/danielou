import postgres from 'postgres';
const sql = postgres(process.argv[2], { max: 1, idle_timeout: 10, connect_timeout: 15 });
const r = await sql`SELECT name FROM academic_year LIMIT 5`;
r.forEach(x => console.log(x.name));
await sql.end();
