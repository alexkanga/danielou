import { AppShell } from '@/components/layout/app-shell';
import { getSession, type AppSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Le middleware gère déjà la redirection vers /login.
  // Cette vérification est un fallback pour les accès directs.
  let session: AppSession = null;
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
      session = {
        user: {
          id: userId,
          email: headersList.get('x-user-name') ?? userId,
          name: headersList.get('x-user-name') ?? userId,
          role: headersList.get('x-user-role') ?? 'admin',
          isSuperAdmin: headersList.get('x-super-admin') === 'true',
        },
        source: 'fantomas',
      };
    } else {
      redirect('/login');
    }
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
