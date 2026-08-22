import { AppShell } from '@/components/layout/app-shell';
import { getSession, type AppSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { PlatformRole, SchoolRole, SessionUserV2 } from '@/lib/types/rbac';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Le middleware gère déjà la redirection vers /login.
  // Cette vérification est un fallback pour les accès directs.
  let session: AppSession | null = null;
  try {
    session = await getSession();
  } catch {
    // DB indisponible — le middleware a déjà validé le cookie
  }

  if (!session) {
    // Essayer de lire les headers injectés par le middleware (Fantomas)
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (userId) {
      const platformRole = (headersList.get('x-platform-role') as PlatformRole) ?? 'ghost';
      const schoolRole = (headersList.get('x-school-role') as SchoolRole) ?? 'admin';
      const isGhost = headersList.get('x-is-ghost') === 'true';

      const user: SessionUserV2 = {
        id: userId,
        email: headersList.get('x-user-email') ?? 'fantomas',
        name: headersList.get('x-user-name') ?? userId,
        platformRole,
        isGhost,
        source: 'ghost',
      };

      session = {
        user,
        schoolMemberships: [],
        activeSchoolRole: schoolRole,
        activeSchoolId: null,
      };
    } else {
      redirect('/login');
    }
  }

  return (
    <AppShell
      user={session.user}
      schoolMemberships={session.schoolMemberships}
      activeSchoolRole={session.activeSchoolRole}
      activeSchoolId={session.activeSchoolId}
    >
      {children}
    </AppShell>
  );
}
