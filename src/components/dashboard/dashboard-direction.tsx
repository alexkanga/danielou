'use client';

import Link from 'next/link';
import { School, TrendingDown, BarChart3, ClipboardCheck, Send, ScrollText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { DirectionKpi } from '@/lib/services/m6/dashboard.service';

interface Props {
  kpi: DirectionKpi;
  yearName: string | null;
}

export function DirectionDashboard({ kpi, yearName }: Props) {
  return (
    <div className="space-y-6">
      {yearName && (
        <p className="text-sm text-muted-foreground">
          Année scolaire : <span className="font-medium text-foreground">{yearName}</span>
        </p>
      )}

      {/* Primary KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Classes actives" value={kpi.totalClassrooms} icon={School} color="text-primary" bg="bg-primary/10" />
        <KpiCard label="Saisie de notes" value={`${kpi.gradeEntryCompletionPct}%`} icon={BarChart3} color={kpi.gradeEntryCompletionPct < 80 ? 'text-warning' : 'text-success'} bg={kpi.gradeEntryCompletionPct < 80 ? 'bg-warning-light' : 'bg-success-light'} />
        <KpiCard label="Bulletins validés" value={kpi.reportCardsValidated} icon={ClipboardCheck} color="text-info" bg="bg-info-light" />
        <KpiCard label="Bulletins publiés" value={kpi.reportCardsPublished} icon={Send} color="text-success" bg="bg-success-light" />
      </div>

      {/* Report card workflow + Weak subjects */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-base font-semibold text-foreground">Workflow des bulletins</h2>
            <div className="space-y-2">
              <WorkflowBar label="Brouillon" count={kpi.reportCardsDraft} total={Math.max(1, kpi.reportCardsDraft + kpi.reportCardsReady + kpi.reportCardsValidated + kpi.reportCardsPublished)} color="bg-muted-foreground/30" />
              <WorkflowBar label="Prêt" count={kpi.reportCardsReady} total={Math.max(1, kpi.reportCardsDraft + kpi.reportCardsReady + kpi.reportCardsValidated + kpi.reportCardsPublished)} color="bg-info" />
              <WorkflowBar label="Validé" count={kpi.reportCardsValidated} total={Math.max(1, kpi.reportCardsDraft + kpi.reportCardsReady + kpi.reportCardsValidated + kpi.reportCardsPublished)} color="bg-success" />
              <WorkflowBar label="Publié" count={kpi.reportCardsPublished} total={Math.max(1, kpi.reportCardsDraft + kpi.reportCardsReady + kpi.reportCardsValidated + kpi.reportCardsPublished)} color="bg-brand-accent" />
            </div>
            <div className="mt-4 flex gap-2">
              {kpi.reportCardsReady > 0 && (
                <Link href="/dashboard/bulletins/validation" className="text-sm font-medium text-info hover:underline">Valider ({kpi.reportCardsReady})</Link>
              )}
              {kpi.reportCardsValidated > 0 && (
                <Link href="/dashboard/bulletins/publication" className="text-sm font-medium text-success hover:underline">Publier ({kpi.reportCardsValidated})</Link>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-base font-semibold text-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-danger" />
              Matières faibles
            </h2>
            {kpi.weakSubjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Aucune matière identifiée comme faible.</p>
            ) : (
              <div className="space-y-2">
                {kpi.weakSubjects.map((ws, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md px-3 py-2 text-sm bg-danger-light">
                    <div>
                      <span className="font-medium text-foreground">{ws.subjectName}</span>
                      <span className="text-muted-foreground ml-2">({ws.classroomName})</span>
                    </div>
                    <span className="font-semibold text-danger">Moy. {ws.avg}/20</span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/statistiques" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Voir statistiques détaillées
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, bg }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }) {
  return (
    <Card>
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
}

function WorkflowBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}