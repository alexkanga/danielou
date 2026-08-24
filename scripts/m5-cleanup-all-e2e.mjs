import postgres from 'postgres';
const sql = postgres(process.argv[2], { max: 1, idle_timeout: 10, connect_timeout: 15 });

(async () => {
  await sql`DELETE FROM report_card_component_item WHERE report_card_item_id IN (
    SELECT id FROM report_card_item WHERE report_card_id IN (
      SELECT id FROM report_card WHERE academic_period_id IN (
        SELECT id FROM academic_period WHERE name LIKE 'Trimestre 1 E2E%'
      )
    )
  )`;
  await sql`DELETE FROM report_card_item WHERE report_card_id IN (
    SELECT id FROM report_card WHERE academic_period_id IN (
      SELECT id FROM academic_period WHERE name LIKE 'Trimestre 1 E2E%'
    )
  )`;
  await sql`DELETE FROM report_card WHERE academic_period_id IN (
    SELECT id FROM academic_period WHERE name LIKE 'Trimestre 1 E2E%'
  )`;
  await sql`DELETE FROM academic_period WHERE name LIKE 'Trimestre 1 E2E%'`;
  await sql`DELETE FROM enrollment WHERE student_id IN (SELECT id FROM student WHERE matricule LIKE 'M5-%')`;
  await sql`DELETE FROM pedagogical_config WHERE academic_year_id IN (
    SELECT id FROM academic_year WHERE name LIKE 'M5 Gate%'
  )`;
  await sql`DELETE FROM classroom WHERE academic_year_id IN (
    SELECT id FROM academic_year WHERE name LIKE 'M5 Gate%'
  )`;
  await sql`DELETE FROM student WHERE matricule LIKE 'M5-%'`;
  await sql`DELETE FROM academic_year WHERE name LIKE 'M5 Gate%'`;
  console.log('Full E2E cleanup done.');
  await sql.end();
})();
