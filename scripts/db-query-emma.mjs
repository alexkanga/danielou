import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_kajScfx40nhJ@ep-floral-rice-b1si6p5a-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require' });
await client.connect();

// Query Emma's annual_result
const r = await client.query(
  `SELECT 
    ar.id AS ar_id,
    ar.enrollment_id,
    ar.calculation_status,
    ar.system_recommendation,
    ar.final_decision,
    ar.decision_justification,
    ar.decided_by,
    ar.decided_at,
    ar.annual_official,
    ar.annual_rank,
    e.student_id,
    s.first_name,
    s.last_name
  FROM annual_result ar
  JOIN enrollment e ON ar.enrollment_id = e.id
  JOIN student s ON e.student_id = s.id
  WHERE s.first_name ILIKE 'emma'
  ORDER BY ar.created_at DESC
  LIMIT 5;`
);
console.log('=== EMMA ANNUAL RESULT ===');
console.log(JSON.stringify(r.rows, null, 2));

// Query audit log for this decision
if (r.rows.length > 0) {
  const audit = await client.query(
    `SELECT id, action, entity, entity_id, old_value, new_value, actor_id, ip_address, created_at
    FROM audit_log 
    WHERE action = 'annual_final_decision_recorded'
    AND new_value LIKE '%' || $1 || '%'
    ORDER BY created_at DESC
    LIMIT 5;`,
    [r.rows[0].enrollment_id]
  );
  console.log('\n=== AUDIT LOG ===');
  console.log(JSON.stringify(audit.rows, null, 2));
}

await client.end();
