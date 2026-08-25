'use client';

import Link from 'next/link';
import { School, FileText, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { DirectionKpi } from '@/lib/services/m6/dashboard.service';

interface Props {
  kpi: DirectionKpi;
  yearName: string | null;
}

export function ReaderDashboard({ kpi, yearName }: Props) {
  return (
    <div className="space-y-6">
      {yearName && (
        <p className="text-sm text-muted-foreground">
          Année scolaire : <span className="font-medium text-foreground">{yearName}</span>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Classes actives" value={kpi.totalClassrooms} icon={School} color="text-primary" bg="bg-primary/10" />
        <KpiCard label="Bulletins publiés" value={kpi.reportCardsPublished} icon={Send} color="text-success" bg="bg-success-light" href="/dashboard/bulletins/publication" />
        <KpiCard label="Saisie complète" value={`${kpi.gradeEntryCompletionPct}%`} icon={FileText} color="text-info" bg="bg-info-light" />
      </div>
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

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}