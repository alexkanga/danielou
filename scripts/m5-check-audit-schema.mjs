// Quick check: audit_log actual schema in Neon
import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_kajScfx40nhJ@ep-floral-rice-b1si6p5a-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require',
});
await client.connect();

const res = await client.query(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'audit_log'
  ORDER BY ordinal_position
`);
console.log('=== audit_log columns ===');
for (const r of res.rows) {
  console.log(`  ${r.column_name}  ${r.data_type}  nullable=${r.is_nullable}  default=${r.column_default}`);
}

// Also check if there are any existing audit_log rows
const cnt = await client.query('SELECT count(*) as cnt FROM audit_log');
console.log(`\nExisting audit_log rows: ${cnt.rows[0].cnt}`);

// Try inserting with empty string schoolId to reproduce the bug
console.log('\n=== Reproducing empty-string schoolId insert ===');
try {
  await client.query(`
    INSERT INTO audit_log (action, entity, entity_id, school_id)
    VALUES ('TEST', 'test_entity', '00000000-0000-0000-0000-000000000001', '')
  `);
  console.log('INSERT succeeded (unexpected)');
  const del = await client.query("DELETE FROM audit_log WHERE action = 'TEST'");
  console.log('Cleaned up test row');
} catch (e) {
  console.log(`INSERT FAILED as expected: ${e.message}`);
}

// Try inserting with NULL schoolId
console.log('\n=== Testing NULL schoolId insert ===');
try {
  await client.query(`
    INSERT INTO audit_log (action, entity, entity_id, school_id)
    VALUES ('TEST2', 'test_entity', '00000000-0000-0000-0000-000000000001', NULL)
  `);
  console.log('INSERT with NULL schoolId succeeded');
  const del = await client.query("DELETE FROM audit_log WHERE action = 'TEST2'");
  console.log('Cleaned up test row');
} catch (e) {
  console.log(`INSERT with NULL schoolId FAILED: ${e.message}`);
}

await client.end();
