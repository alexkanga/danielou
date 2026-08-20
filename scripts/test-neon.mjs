import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL non definie');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

try {
  const result = await sql`SELECT current_database() as db, current_user as usr, inet_server_addr() as addr`;
  console.log('NEON CONNECTE OK');
  console.log('Base:', result[0].db);
  console.log('User:', result[0].usr);
  console.log('Adresse serveur:', result[0].addr);
  console.log('Region: eu-central-1 (Frankfurt)');
} catch (err) {
  console.error('ERREUR CONNEXION:', err.message);
  process.exit(1);
}
