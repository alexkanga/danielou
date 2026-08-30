import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_kajScfx40nhJ@ep-floral-rice-b1si6p5a-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require' });
await client.connect();

// 1. Find Emma's annual_result
const r = await client.query(
  `SELECT ar.id, ar.enrollment_id, ar.final_decision, ar.decision_justification, ar.decided_by, ar.decided_at
  FROM annual_result ar
  JOIN enrollment e ON ar.enrollment_id = e.id
  JOIN student s ON e.student_id = s.id
  WHERE s.first_name ILIKE 'emma'`
);

if (r.rows.length === 0) {
  console.log('No annual_result found for Emma.');
  await client.end();
  process.exit(0);
}

const row = r.rows[0];
console.log('BEFORE:', JSON.stringify(row, null, 2));

// 2. Clean decision fields
await client.query(
  `UPDATE annual_result
  SET final_decision = NULL,
      decision_justification = NULL,
      decided_by = NULL,
      decided_at = NULL
  WHERE id = $1`,
  [row.id]
);

// 3. Verify
const after = await client.query(
  `SELECT id, final_decision, decision_justification, decided_by, decided_at
  FROM annual_result WHERE id = $1`,
  [row.id]
);
console.log('AFTER:', JSON.stringify(after.rows[0], null, 2));

// 4. Find and delete audit entries for this specific decision
const audit = await client.query(
  `SELECT id, action, new_value, created_at
  FROM audit_log
  WHERE action = 'annual_final_decision_recorded'
  AND entity_id = $1
  ORDER BY created_at DESC`,
  [row.id]
);
console.log('AUDIT ENTRIES FOUND:', audit.rows.length);
if (audit.rows.length > 0) {
  await client.query(
    `DELETE FROM audit_log WHERE id = ANY($1)`,
    [audit.rows.map(a => a.id)]
  );
  console.log('AUDIT ENTRIES DELETED:', audit.rows.length);
}

await client.end();
console.log('DONE — Emma restored to: Conseil requis / no final decision');
