'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Info, XCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Alert, AlertCategory } from '@/lib/services/m6/alerts.service';

const CATEGORY_CONFIG: Record<AlertCategory, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  INFORMATION: { icon: Info, color: 'text-info' },
  OPERATIONAL: { icon: AlertTriangle, color: 'text-warning' },
  PEDAGOGICAL: { icon: Info, color: 'text-brand-accent' },
  BLOCKING: { icon: XCircle, color: 'text-danger' },
};

export function AlertsPanel({ schoolId }: { schoolId: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ['alerts', schoolId],
    queryFn: async () => {
      const r = await fetch('/api/dashboard/alerts');
      if (!r.ok) throw new Error();
      const j = await r.json();
      return j.alerts as Alert[];
    },
    enabled: !!schoolId,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const alerts = data ?? [];
  if (alerts.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Alertes ({alerts.length})
        </h2>
        <div className="space-y-2">
          {alerts.map(alert => {
            const cfg = CATEGORY_CONFIG[alert.category] ?? CATEGORY_CONFIG.INFORMATION;
            const Icon = cfg.icon;
            return (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-md px-3 py-2 text-sm"
              >
                <div className="flex items-start gap-2">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.color}`} />
                  <span className="text-muted-foreground">{alert.message}</span>
                </div>
                {alert.actionHref && (
                  <a
                    href={alert.actionHref}
                    className="shrink-0 font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    {alert.actionLabel ?? 'Voir'}
                    <ArrowRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
