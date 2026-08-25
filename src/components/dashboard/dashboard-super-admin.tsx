import Link from 'next/link';
import { Users, School, Activity, FileSearch, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { SuperAdminKpi } from '@/lib/services/m6/dashboard.service';

interface Props {
  kpi: SuperAdminKpi;
}

export function SuperAdminDashboard({ kpi }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Écoles" value={kpi.totalSchools} icon={School} color="text-primary" bg="bg-primary/10" />
        <KpiCard label="Utilisateurs" value={kpi.totalUsers} icon={Users} color="text-info" bg="bg-info-light" href="/dashboard/admin/utilisateurs" />
        <KpiCard label="Utilisateurs actifs" value={kpi.activeUsers} icon={Users} color="text-success" bg="bg-success-light" />
        <KpiCard label="Entrées d\'audit" value={kpi.recentAuditEntries} icon={FileSearch} color="text-muted-foreground" bg="bg-muted" href="/dashboard/admin/journal-audit" />
        <HealthCard health={kpi.dbHealth} />
      </div>

      {/* Quick links */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-4 text-base font-semibold text-foreground">Accès rapides</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href="/dashboard/admin/utilisateurs" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted">
              <Users className="h-4 w-4 text-muted-foreground" /> Gérer les utilisateurs
            </Link>
            <Link href="/dashboard/system/db-health" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted">
              <Activity className="h-4 w-4 text-muted-foreground" /> Santé de la base
            </Link>
            <Link href="/dashboard/admin/journal-audit" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted">
              <FileSearch className="h-4 w-4 text-muted-foreground" /> Journal d&apos;audit
            </Link>
            <Link href="/dashboard/system/recovery" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" /> Récupération
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, bg, href }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; href?: string }) {
  const content = (
    <Card className={href ? 'transition-colors hover:bg-accent/50' : ''}>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function HealthCard({ health }: { health: string }) {
  const config = health === 'available'
    ? { label: 'Disponible', color: 'text-success', bg: 'bg-success-light' }
    : health === 'unavailable'
      ? { label: 'Indisponible', color: 'text-danger', bg: 'bg-danger-light' }
      : { label: 'Inconnu', color: 'text-muted-foreground', bg: 'bg-muted' };

  return (
    <Link href="/dashboard/system/db-health">
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
              <Activity className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <p className={`text-lg font-bold ${config.color}`}>{config.label}</p>
              <p className="text-sm text-muted-foreground">Base de données</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}