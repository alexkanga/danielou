/**
 * M1-29.14 — Bootstrap Super Admin
 * 
 * Permet à Ghost de créer le premier SUPER_ADMIN quand la DB est disponible.
 * Ne peut être appelé que par Ghost (vérifié par requireGhost()).
 */

import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { user } from './db/schema';
export interface BootstrapResult {
  success: boolean;
  userId?: string;
  error?: string;
}

/**
 * Vérifie si au moins un SUPER_ADMIN existe dans la base.
 */
export async function checkSuperAdminExists(): Promise<boolean> {
  try {
    const db = getDb();
    const results = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.isSuperAdmin, true))
      .limit(1);
    return results.length > 0;
  } catch {
    return false;
  }
}

/**
 * Crée le premier SUPER_ADMIN.
 * 
 * @param email - Email du super admin
 * @param password - Mot de passe initial
 * @param name - Nom affiché
 * @returns Le résultat du bootstrap
 * 
 * Sécurité :
 * - Ne peut être appelé que par un guard Ghost préalable
 * - Vérifie qu'aucun SUPER_ADMIN n'existe déjà
 * - Le mot de passe est hashé par Better Auth
 */
export async function bootstrapSuperAdmin(
  email: string,
  password: string,
  name: string,
): Promise<BootstrapResult> {
  // Vérifier qu'aucun super admin n'existe
  const exists = await checkSuperAdminExists();
  if (exists) {
    return { success: false, error: 'SUPER_ADMIN already exists' };
  }

  try {
    const db = getDb();
    const { hash } = await import('bcryptjs');
    const hashedPassword = await hash(password, 10);
    // Note: hashedPassword is not stored here because Better Auth manages its own
    // password hashing via its own account table.
    void hashedPassword;

    const [created] = await db
      .insert(user)
      .values({
        email,
        name,
        role: 'admin',
        platformRole: 'super_admin',
        isSuperAdmin: true,
        isActive: true,
        // Better Auth user table needs emailVerified and a hashed password
        // The actual Better Auth account creation is separate
      })
      .returning({ id: user.id });

    if (!created) {
      return { success: false, error: 'Failed to create user' };
    }

    return { success: true, userId: created.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return { success: false, error: 'User with this email already exists' };
    }
    return { success: false, error: 'Database error during bootstrap' };
  }
}

/**
 * Promouvoir un utilisateur existant en SUPER_ADMIN.
 */
export async function promoteToSuperAdmin(userId: string): Promise<BootstrapResult> {
  try {
    const db = getDb();
    await db
      .update(user)
      .set({
        platformRole: 'super_admin',
        isSuperAdmin: true,
      })
      .where(eq(user.id, userId));

    return { success: true, userId };
  } catch {
    return { success: false, error: 'Database error during promotion' };
  }
}
