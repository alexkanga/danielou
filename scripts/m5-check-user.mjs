import pg from 'pg';
const c = new pg.Client({connectionString:'postgresql://neondb_owner:npg_kajScfx40nhJ@ep-floral-rice-b1si6p5a-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require'});
await c.connect();
const {rows}=await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='user' AND table_schema='public' ORDER BY ordinal_position");
for(const r of rows) console.log(r.column_name, r.data_type);
await c.end();
