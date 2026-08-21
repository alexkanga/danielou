import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);

const tables = await sql`
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  ORDER BY table_name
`;

console.log('TABLES SUR NEON:', tables.length);
tables.forEach(t => console.log(' -', t.table_name));

const enums = await sql`
  SELECT t.typname 
  FROM pg_type t 
  JOIN pg_enum e ON t.oid = e.enumtypid 
  GROUP BY t.typname 
  ORDER BY t.typname
`;
console.log('\nENUMS:', enums.length);
enums.forEach(e => console.log(' -', e.typname));
