/**
 * Pre-M5 Functional Closure — User Management Service
 *
 * Manages ordinary user CRUD with server-side RBAC enforcement.
 * - Ghost/SUPER_ADMIN: full user management
 * - ADMIN (school): CANNOT manage users (platform:users:manage required)
 * - Uses Better Auth for credential creation (email+password accounts)
 * - Audit logs all mutations
 */

import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { user, schoolMembership, account } from '@/lib/db/schema';
import { logPedagogyAudit, sessionToAuditActor, buildChangeLog } from '@/lib/services/pedagogy/audit';
import type { AppSessionV2, SchoolRole } from '@/lib/types/rbac';
import { AuthorizationError } from '@/lib/authorization';
import { headers } from 'next/headers';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface CreateUserInput {
  name: string;
  email: string;
  username?: string;
  password: string;
  role: SchoolRole;
  isActive?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  username?: string;
  role?: SchoolRole;
  isActive?: boolean;
}

export type UserPublic = {
  id: string;
  email: string;
  name: string;
  username: string | null;
  role: string;
  platformRole: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export interface UserManagementResult {
  success: boolean;
  user?: UserPublic;
  error?: string;
  code?: string;
}

// ─────────────────────────────────────────────
// Authorization helpers
// ─────────────────────────────────────────────

/**
 * Verify the actor can manage users.
 * Only ghost and super_admin can manage users.
 */
function assertCanManageUsers(session: AppSessionV2): void {
  if (session.user.platformRole === 'ghost') return;
  if (session.user.platformRole === 'super_admin') return;
  throw new AuthorizationError('FORBIDDEN');
}

/**
 * Prevent an actor from modifying themselves.
 */
function assertNotSelf(session: AppSessionV2, targetUserId: string): void {
  if (session.user.id === targetUserId && !session.user.isGhost) {
    throw new AuthorizationError('FORBIDDEN');
  }
}

// ─────────────────────────────────────────────
// IP Address
// ─────────────────────────────────────────────

async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// ─────────────────────────────────────────────
// CREATE USER
// ─────────────────────────────────────────────

export async function createUser(
  input: CreateUserInput,
  session: AppSessionV2,
  schoolId: string,
  // requestHeaders kept for future BA API integration if needed
  _requestHeaders?: Headers,
): Promise<UserManagementResult> {
  assertCanManageUsers(session);

  // Check email uniqueness
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1);
  if (existing) {
    return { success: false, error: 'Un utilisateur avec cet email existe déjà.', code: 'EMAIL_EXISTS' };
  }

  // Check username uniqueness if provided
  if (input.username) {
    const [existingUsername] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, input.username))
      .limit(1);
    if (existingUsername) {
      return { success: false, error: 'Cet identifiant est déjà utilisé.', code: 'USERNAME_EXISTS' };
    }
  }

  // Direct DB insert with Better Auth's password hashing
  // BA's signUpEmail requires complex request context that's unreliable
  // in server-side admin API calls. We use BA's hashPassword + direct insert.
  try {
    const { hashPassword } = await import('better-auth/crypto');
    const passwordHash = await hashPassword(input.password);

    const crypto = await import('crypto');
    const newUserId = crypto.randomUUID();

    // Insert user record
    await db.insert(user).values({
      id: newUserId,
      email: input.email,
      name: input.name,
      username: input.username ?? null,
      role: input.role,
      isActive: input.isActive ?? true,
    });

    // Insert credential account (Better Auth compatible)
    // BA's drizzle adapter maps 'password' → 'access_token' for credential provider
    await db.insert(account).values({
      userId: newUserId,
      accountId: newUserId,
      providerId: 'credential',
      accessToken: passwordHash,
    });

    // Create school membership
    await db.insert(schoolMembership).values({
      schoolId,
      userId: newUserId,
      role: input.role,
      isActive: true,
    });

    // Fetch the complete created user
    const [created] = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        platformRole: user.platformRole,
        isSuperAdmin: user.isSuperAdmin,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, newUserId));

    // Audit
    const ip = await getClientIp();
    await logPedagogyAudit({
      action: 'user_created',
      entity: 'user',
      entityId: newUserId,
      schoolId,
      newValue: JSON.stringify({ name: input.name, email: input.email, username: input.username, role: input.role }),
      ...sessionToAuditActor(session.user),
      ipAddress: ip,
    });

    return { success: true, user: created };
  } catch (err) {
    if (err instanceof AuthorizationError) throw err;
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('already') || msg.includes('duplicate') || msg.includes('unique')) {
      return { success: false, error: 'Un utilisateur avec cet email existe déjà.', code: 'EMAIL_EXISTS' };
    }
    return { success: false, error: `Erreur lors de la création: ${msg}`, code: 'CREATE_FAILED' };
  }
}

// ─────────────────────────────────────────────
// UPDATE USER
// ─────────────────────────────────────────────

export async function updateUser(
  targetUserId: string,
  input: UpdateUserInput,
  session: AppSessionV2,
  schoolId: string,
): Promise<UserManagementResult> {
  assertCanManageUsers(session);
  assertNotSelf(session, targetUserId);

  const [existing] = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      role: user.role,
      platformRole: user.platformRole,
      isSuperAdmin: user.isSuperAdmin,
      isActive: user.isActive,
    })
    .from(user)
    .where(eq(user.id, targetUserId));

  if (!existing) {
    return { success: false, error: 'Utilisateur introuvable.', code: 'USER_NOT_FOUND' };
  }

  if (targetUserId === 'fantomas-ghost') {
    return { success: false, error: 'Impossible de modifier le compte système Fantomas.', code: 'FORBIDDEN' };
  }

  if (existing.isSuperAdmin && !session.user.isGhost) {
    return { success: false, error: 'Impossible de modifier un Super Administrateur.', code: 'FORBIDDEN' };
  }

  // Check email uniqueness if changing
  if (input.email && input.email !== existing.email) {
    const [dup] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, input.email))
      .limit(1);
    if (dup) {
      return { success: false, error: 'Un utilisateur avec cet email existe déjà.', code: 'EMAIL_EXISTS' };
    }
  }

  // Check username uniqueness if changing
  if (input.username !== undefined && input.username !== existing.username) {
    if (input.username) {
      const [dup] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.username, input.username))
        .limit(1);
      if (dup) {
        return { success: false, error: 'Cet identifiant est déjà utilisé.', code: 'USERNAME_EXISTS' };
      }
    }
  }

  const updates: Record<string, unknown> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.email !== undefined) updates.email = input.email;
  if (input.username !== undefined) updates.username = input.username;
  if (input.isActive !== undefined) updates.isActive = input.isActive;

  let roleChanged = false;
  if (input.role !== undefined && input.role !== existing.role) {
    updates.role = input.role;
    roleChanged = true;
  }

  if (Object.keys(updates).length === 0 && !roleChanged) {
    return { success: false, error: 'Aucune modification fournie.', code: 'NO_CHANGES' };
  }

  try {
    await db
      .update(user)
      .set(updates)
      .where(eq(user.id, targetUserId));

    if (roleChanged && input.role) {
      await db
        .update(schoolMembership)
        .set({ role: input.role })
        .where(
          and(
            eq(schoolMembership.userId, targetUserId),
            eq(schoolMembership.schoolId, schoolId),
          ),
        );
    }

    // Audit
    const ip = await getClientIp();
    const { oldValue, newValue } = buildChangeLog(
      { name: existing.name, email: existing.email, username: existing.username, role: existing.role, isActive: existing.isActive },
      { ...updates, ...(roleChanged ? { role: input.role } : {}) },
    );
    await logPedagogyAudit({
      action: 'user_updated',
      entity: 'user',
      entityId: targetUserId,
      schoolId,
      oldValue,
      newValue,
      ...sessionToAuditActor(session.user),
      ipAddress: ip,
    });

    const [updated] = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        platformRole: user.platformRole,
        isSuperAdmin: user.isSuperAdmin,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, targetUserId));

    return { success: true, user: updated };
  } catch (err) {
    if (err instanceof AuthorizationError) throw err;
    return { success: false, error: 'Erreur lors de la mise à jour.', code: 'UPDATE_FAILED' };
  }
}

// ─────────────────────────────────────────────
// TOGGLE ACTIVE
// ─────────────────────────────────────────────

export async function toggleUserActive(
  targetUserId: string,
  session: AppSessionV2,
  schoolId: string,
): Promise<UserManagementResult> {
  assertCanManageUsers(session);
  assertNotSelf(session, targetUserId);

  const [existing] = await db
    .select({
      id: user.id,
      name: user.name,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
    })
    .from(user)
    .where(eq(user.id, targetUserId));

  if (!existing) {
    return { success: false, error: 'Utilisateur introuvable.', code: 'USER_NOT_FOUND' };
  }

  if (targetUserId === 'fantomas-ghost') {
    return { success: false, error: 'Impossible de modifier le compte système Fantomas.', code: 'FORBIDDEN' };
  }

  if (existing.isSuperAdmin && !session.user.isGhost) {
    return { success: false, error: 'Impossible de modifier un Super Administrateur.', code: 'FORBIDDEN' };
  }

  const newActive = !existing.isActive;

  try {
    await db
      .update(user)
      .set({ isActive: newActive })
      .where(eq(user.id, targetUserId));

    await db
      .update(schoolMembership)
      .set({ isActive: newActive })
      .where(
        and(
          eq(schoolMembership.userId, targetUserId),
          eq(schoolMembership.schoolId, schoolId),
        ),
      );

    const ip = await getClientIp();
    await logPedagogyAudit({
      action: newActive ? 'user_activated' : 'user_deactivated',
      entity: 'user',
      entityId: targetUserId,
      schoolId,
      oldValue: JSON.stringify({ isActive: existing.isActive }),
      newValue: JSON.stringify({ isActive: newActive }),
      ...sessionToAuditActor(session.user),
      ipAddress: ip,
    });

    const [updated] = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        platformRole: user.platformRole,
        isSuperAdmin: user.isSuperAdmin,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, targetUserId));

    return { success: true, user: updated };
  } catch (err) {
    if (err instanceof AuthorizationError) throw err;
    return { success: false, error: 'Erreur lors de la modification.', code: 'UPDATE_FAILED' };
  }
}
