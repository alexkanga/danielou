import postgres from 'postgres';
const sql = postgres(process.argv[2], { max: 1, idle_timeout: 10, connect_timeout: 15 });

const tables = ['academic_year', 'classroom', 'enrollment', 'student'];
for (const t of tables) {
  console.log('=== ' + t + ' ===');
  const c = await sql`SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name=${t} ORDER BY ordinal_position`;
  c.forEach(x => console.log('  ' + x.column_name + ' nullable=' + x.is_nullable + ' default=' + x.column_default));
}
await sql.end();
