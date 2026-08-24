import postgres from 'postgres';
const sql = postgres(process.argv[2], { max: 1, idle_timeout: 10, connect_timeout: 15 });
(async () => {
  const r = await sql`SELECT '13.62'::numeric(8,4) as val, '5'::numeric(6,2) as coef, '1'::numeric(6,2) as one, '272.40'::numeric(12,4) as wp, '16.00'::numeric(8,4) as avg`;
  console.log('val:', JSON.stringify(r[0].val), typeof r[0].val);
  console.log('coef:', JSON.stringify(r[0].coef), typeof r[0].coef);
  console.log('one:', JSON.stringify(r[0].one), typeof r[0].one);
  console.log('wp:', JSON.stringify(r[0].wp), typeof r[0].wp);
  console.log('avg:', JSON.stringify(r[0].avg), typeof r[0].avg);
  await sql.end();
})();
