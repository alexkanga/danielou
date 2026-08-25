import { getSession } from '@/lib/session';
import { getDashboardData, getSuperAdminDashboard } from '@/lib/services/m6/dashboard.service';
import { AdminDashboard } from '@/components/dashboard/dashboard-admin';
import { DirectionDashboard } from '@/components/dashboard/dashboard-direction';
import { TeacherDashboard } from '@/components/dashboard/dashboard-teacher';
import { ReaderDashboard } from '@/components/dashboard/dashboard-reader';
import { SuperAdminDashboard } from '@/components/dashboard/dashboard-super-admin';
import { AlertsPanel } from '@/components/dashboard/alerts-panel';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { QueryProvider } from '@/components/providers/query-provider';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground">Non authentifié.</p>
      </div>
    );
  }

  const { user, activeSchoolRole, activeSchoolId } = session;

  let data;
  if (user.platformRole === 'super_admin' || user.isGhost) {
    data = await getSuperAdminDashboard();
  } else {
    data = await getDashboardData(activeSchoolRole ?? 'reader', activeSchoolId, user.id);
  }

  return (
    <QueryProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bienvenue, {user.name}
          </p>
        </div>

        {/* Alerts (client component with TanStack Query) */}
        <AlertsPanel schoolId={activeSchoolId} />

        {/* Role-specific dashboard */}
        {user.isGhost && data.superAdmin && (
          <SuperAdminDashboard kpi={data.superAdmin} />
        )}
        {user.platformRole === 'super_admin' && data.superAdmin && (
          <SuperAdminDashboard kpi={data.superAdmin} />
        )}
        {activeSchoolRole === 'admin' && data.admin && (
          <AdminDashboard kpi={data.admin} yearName={data.academicYearName} />
        )}
        {activeSchoolRole === 'direction' && data.direction && (
          <DirectionDashboard kpi={data.direction} yearName={data.academicYearName} />
        )}
        {activeSchoolRole === 'teacher' && data.teacher && (
          <TeacherDashboard kpi={data.teacher} yearName={data.academicYearName} />
        )}
        {activeSchoolRole === 'reader' && data.direction && (
          <ReaderDashboard kpi={data.direction} yearName={data.academicYearName} />
        )}

        {/* Quick actions */}
        <QuickActions role={activeSchoolRole} />
      </div>
    </QueryProvider>
  );
}
