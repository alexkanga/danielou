import pg from 'pg';
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }
const c=new pg.Client({connectionString: DATABASE_URL});
await c.connect();
const ids = ['b1000001-0000-0000-0000-000000000001','b1000002-0000-0000-0000-000000000002','b1000003-0000-0000-0000-000000000003','b1000004-0000-0000-0000-000000000004','b1000005-0000-0000-0000-000000000005'];
const aid = ids.map(i=>`'${i}'`).join(',');
const {rows:r1}=await c.query(`SELECT count(*) as cnt FROM report_card WHERE student_id IN (${aid})`);
console.log('orphan report_cards:', r1[0].cnt);
const {rows:r2}=await c.query(`SELECT count(*) as cnt FROM audit_log WHERE entity='report_card'`);
console.log('total audit_log for report_card:', r2[0].cnt);
await c.end();