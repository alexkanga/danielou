/**
 * Comprehensive live DB audit script for R-V2-00
 * Queries actual Neon DB state for comparison with Drizzle schema
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function audit() {
  const results = {};

  // 1. List all tables
  results.tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;

  // 2. List all enums (custom types)
  results.enums = await sql`
    SELECT t.typname, e.enumlabel, e.enumsortorder
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    ORDER BY t.typname, e.enumsortorder
  `;

  // 3. Row counts per table
  results.rowCounts = await sql`
    SELECT table_name, (xpath('/row/cnt/text()', xml_count))[1]::text::int AS count
    FROM (
      SELECT table_name,
        query_to_xml(format('SELECT count(*) AS cnt FROM %I', table_name), false, true, '') AS xml_count
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ) t
    ORDER BY table_name
  `;

  // 4. All columns with types, nullability, defaults
  results.columns = await sql`
    SELECT 
      c.table_name,
      c.column_name,
      c.data_type,
      c.udt_name,
      c.is_nullable,
      c.column_default,
      c.character_maximum_length,
      c.numeric_precision,
      c.numeric_scale
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    ORDER BY c.table_name, c.ordinal_position
  `;

  // 5. All foreign keys
  results.foreignKeys = await sql`
    SELECT
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
  `;

  // 6. All unique constraints
  results.uniqueConstraints = await sql`
    SELECT
      tc.table_name,
      tc.constraint_name,
      kcu.column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
  `;

  // 7. All check constraints
  results.checkConstraints = await sql`
    SELECT
      tc.table_name,
      tc.constraint_name,
      cc.check_clause
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.check_constraints AS cc
      ON cc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'CHECK'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name
  `;

  // 8. All indexes (non-pk)
  results.indexes = await sql`
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `;

  // 9. Drizzle migration journal (may not exist)
  try {
    results.journal = await sql`SELECT * FROM __drizzle_migrations ORDER BY created_at`;
  } catch {
    results.journal = 'TABLE_NOT_FOUND';
  }

  // 10. Drizzle __drizzle_migrations table structure
  try {
    results.drizzleTable = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = '__drizzle_migrations'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
  } catch {
    results.drizzleTable = 'TABLE_NOT_FOUND';
  }

  // 11. Table sizes
  results.tableSizes = await sql`
    SELECT 
      relname AS table_name,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC
  `;

  // 12. Better Auth tables check
  results.betterAuthTables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (
      table_name LIKE 'verification%' 
      OR table_name LIKE 'password%'
      OR table_name LIKE 'two_factor%'
    )
    ORDER BY table_name
  `;

  // 13. Sequences
  results.sequences = await sql`
    SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
  `;

  // 14. Triggers
  results.triggers = await sql`
    SELECT event_object_table, trigger_name, action_statement
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table
  `;

  // 15. Functions
  results.functions = await sql`
    SELECT routine_name, routine_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    ORDER BY routine_name
  `;

  // 16. DB version & extensions
  results.dbInfo = await sql`SELECT version()`;
  results.extensions = await sql`
    SELECT extname, extversion FROM pg_extension ORDER BY extname
  `;

  // 17. Sample data
  results.sampleSchool = await sql`SELECT * FROM school LIMIT 5`;
  results.sampleUsers = await sql`SELECT id, email, name, role, is_active FROM "user" LIMIT 10`;
  results.sampleAcademicYears = await sql`SELECT * FROM academic_year LIMIT 5`;

  console.log(JSON.stringify(results, null, 2));
}

audit().catch(e => { console.error(e); process.exit(1); });
