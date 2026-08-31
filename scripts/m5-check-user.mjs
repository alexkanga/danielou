import pg from 'pg';
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }
const c = new pg.Client({connectionString: DATABASE_URL});
await c.connect();
const {rows}=await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='user' AND table_schema='public' ORDER BY ordinal_position");
for(const r of rows) console.log(r.column_name, r.data_type);
await c.end();
