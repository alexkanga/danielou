'use client';

import Link from 'next/link';
import {
  Users, School, FileText, AlertTriangle, ClipboardCheck,
  Send, BookOpen, PenTool,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { AdminKpi } from '@/lib/services/m6/dashboard.service';

interface Props {
  kpi: AdminKpi;
  yearName: string | null;
}

const STAT_CARDS = [
  { key: 'totalStudents' as const, label: 'Élèves inscrits', icon: Users, color: 'text-primary', bg: 'bg-primary/10', href: '/dashboard/eleves' },
  { key: 'activeYearStudents' as const, label: 'Élèves année active', icon: Users, color: 'text-info', bg: 'bg-info-light', href: '/dashboard/inscriptions' },
  { key: 'totalClassrooms' as const, label: 'Classes actives', icon: School, color: 'text-success', bg: 'bg-success-light', href: '/dashboard/classes' },
  { key: 'incompleteGradeEntry' as const, label: 'Notes en attente', icon: PenTool, color: 'text-warning', bg: 'bg-warning-light', href: '/dashboard/saisie-notes' },
];

export function AdminDashboard({ kpi, yearName }: Props) {
  return (
    <div className="space-y-6">
      {/* Year indicator */}
      {yearName && (
        <p className="text-sm text-muted-foreground">
          Année scolaire : <span className="font-medium text-foreground">{yearName}</span>
        </p>
      )}

      {/* Primary KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map(card => (
          <Link key={card.key} href={card.href} className="block">
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${card.color}`}>{kpi[card.key]}</p>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Anomalies & Workflow */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Anomalies card */}
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-base font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Anomalies
            </h2>
            <div className="space-y-3">
              <AnomalyItem
                label="Élèves sans inscription"
                count={kpi.studentsWithoutEnrollment}
                href="/dashboard/inscriptions"
              />
              <AnomalyItem
                label="Inscriptions sans classe"
                count={kpi.enrollmentsWithoutClassroom}
                href="/dashboard/affectations"
              />
              <AnomalyItem
                label="Évaluations incomplètes"
                count={kpi.incompleteAssessments}
                href="/dashboard/evaluations?status=open"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bulletin workflow card */}
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-base font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Bulletins
            </h2>
            <div className="space-y-3">
              <WorkflowItem
                label="À préparer"
                count={kpi.reportCardsToPrepare}
                icon={BookOpen}
                href="/dashboard/bulletins/preparation"
              />
              <WorkflowItem
                label="À valider"
                count={kpi.reportCardsToValidate}
                icon={ClipboardCheck}
                href="/dashboard/bulletins/validation"
              />
              <WorkflowItem
                label="À publier"
                count={kpi.reportCardsToPublish}
                icon={Send}
                href="/dashboard/bulletins/publication"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AnomalyItem({ label, count, href }: { label: string; count: number; href: string }) {
  if (count === 0) return null;
  return (
    <Link href={href} className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-warning-light">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-warning">{count}</span>
    </Link>
  );
}

function WorkflowItem({ label, count, icon: Icon, href }: { label: string; count: number; icon: React.ComponentType<{ className?: string }>; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />{label}
      </span>
      <span className="font-semibold text-foreground">{count}</span>
    </Link>
  );
}