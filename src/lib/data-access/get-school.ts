/**
 * Récupère l'ID de l'école (single-tenant).
 * Lève une erreur descriptive si l'école n'est pas configurée.
 */

import { db } from '@/lib/db';
import { school } from '@/lib/db/schema';

let _cachedSchoolId: string | null | undefined; // undefined = not yet fetched

export async function getSchoolId(): Promise<string> {
  if (_cachedSchoolId !== undefined) {
    if (_cachedSchoolId === null) {
      throw new Error('NO_SCHOOL_CONFIGURED');
    }
    return _cachedSchoolId;
  }

  try {
    const [firstSchool] = await db.select({ id: school.id }).from(school).limit(1);
    if (!firstSchool) {
      _cachedSchoolId = null;
      throw new Error('NO_SCHOOL_CONFIGURED');
    }
    _cachedSchoolId = firstSchool.id;
    return firstSchool.id;
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_SCHOOL_CONFIGURED') {
      throw error;
    }
    throw new Error(
      `DB_CONNECTION_ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/** Handle common API errors consistently */
export function handleApiError(error: unknown, context: string): Response {
  if (error instanceof Error) {
    if (error.message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Non autorisé.' }, { status: 401 });
    }
    if (error.message === 'NO_SCHOOL_CONFIGURED') {
      console.error(`[${context}] No school configured in database.`);
      return Response.json(
        { error: 'Aucune école configurée. Exécutez: pnpm db:seed' },
        { status: 503 },
      );
    }
    if (error.message.startsWith('DB_CONNECTION_ERROR')) {
      console.error(`[${context}]`, error.message);
      return Response.json(
        { error: 'Erreur de connexion à la base de données. Vérifiez DATABASE_URL.' },
        { status: 503 },
      );
    }
  }
  console.error(`[${context}]`, error);
  return Response.json({ error: 'Erreur interne du serveur.' }, { status: 500 });
}
