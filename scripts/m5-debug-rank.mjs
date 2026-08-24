import postgres from 'postgres';
const sql = postgres(process.argv[2], { max: 1, idle_timeout: 10, connect_timeout: 15 });
(async () => {
  const r = await sql`SELECT rank FROM report_card WHERE academic_period_id IN (SELECT id FROM academic_period WHERE name LIKE 'T1%') AND status = 'published' ORDER BY rank`;
  r.forEach(x => console.log('rank:', x.rank));
  await sql.end();
})();