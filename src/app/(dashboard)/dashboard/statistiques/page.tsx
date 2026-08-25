'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';

const VIEWS: { key: string; label: string }[] = [
  { key: 'classroom-average', label: 'Moy. par classe' },
  { key: 'level-average', label: 'Moy. par niveau' },
  { key: 'subject-average', label: 'Moy. par matière' },
  { key: 'component-average', label: 'Moy. par composante' },
  { key: 'distribution', label: 'Distribution' },
  { key: 'threshold', label: 'Seuil' },
  { key: 'period-progression', label: 'Progression' },
  { key: 'student-trends', label: 'Tendances' },
  { key: 'grade-completion', label: 'Saisie notes' },
  { key: 'report-card-workflow', label: 'Workflow bulletins' },
];

export default function StatistiquesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [refs, setRefs] = useState<{ academicYears: { id: string; name: string; status: string }[]; levels: { id: string; name: string }[] } | null>(null);

  const view = searchParams.get('view') ?? 'classroom-average';
  const year = searchParams.get('year') ?? '';
  const period = searchParams.get('period') ?? '';
  const level = searchParams.get('level') ?? '';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch('/api/annees-scolaires?limit=100');
        const j = r.ok ? await r.json() : { data: [] };
        const years = (j.data || []).map((y: { id: string; name: string; status: string }) => ({ id: y.id, name: y.name, status: y.status }));
        const lr = await fetch('/api/niveaux?limit=100');
        const lj = lr.ok ? await lr.json() : { data: [] };
        const levels = (lj.data || []).map((n: { id: string; name: string }) => ({ id: n.id, name: n.name }));
        if (!cancelled) {
          setRefs({ academicYears: years, levels });
          if (!year && years.length > 0) {
            const active = years.find((y: { status: string }) => y.status === 'active') ?? years[0];
            router.replace(`/dashboard/statistiques?view=${view}&year=${active.id}`);
          }
        }
      } catch { /* silent */ }
    };
    void load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['statistics', view, year, period, level],
    queryFn: async () => {
      const p = new URLSearchParams({ view, year });
      if (period) p.set('period', period);
      if (level) p.set('level', level);
      const r = await fetch(`/api/statistics?${p}`);
      if (!r.ok) throw new Error();
      return r.json();
    },
    enabled: !!year,
  });

  const setParam = (key: string, val: string) => {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val); else p.delete(key);
    router.push(`/dashboard/statistiques?${p.toString()}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Statistiques" description="Analyses et statistiques pédagogiques." />

      <div className="flex flex-wrap gap-2">
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setParam('view', v.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === v.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        {refs && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Année</label>
            <select className="border rounded-md px-3 py-2 text-sm bg-background" value={year} onChange={e => setParam('year', e.target.value)}>
              <option value="">— Choisir —</option>
              {refs.academicYears.map(y => (<option key={y.id} value={y.id}>{y.name}</option>))}
            </select>
          </div>
        )}
        {refs && refs.levels.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Niveau</label>
            <select className="border rounded-md px-3 py-2 text-sm bg-background" value={level} onChange={e => setParam('level', e.target.value)}>
              <option value="">Tous</option>
              {refs.levels.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <Card><CardContent className="p-5"><div className="h-4 w-48 animate-pulse rounded bg-muted" /></CardContent></Card>
      ) : !year ? (
        <Card><CardContent className="p-5"><p className="text-muted-foreground">Sélectionnez une année scolaire.</p></CardContent></Card>
      ) : !data || (Array.isArray(data) && data.length === 0) ? (
        <Card><CardContent className="p-5"><p className="text-muted-foreground">Aucune donnée disponible pour cette vue et ces filtres.</p></CardContent></Card>
      ) : (
        <StatView view={view} data={data} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// View dispatcher
// ─────────────────────────────────────────────

function StatView({ view, data }: { view: string; data: unknown }) {
  switch (view) {
    case 'classroom-average':
      return (
        <TableView
          columns={['Classe', 'Niveau', 'Moyenne', 'Effectif']}
          rows={(data as Array<Record<string, unknown>>).map(r => [
            String(r.classroomName ?? ''),
            String(r.levelName ?? ''),
            String(r.average ?? ''),
            String(r.studentCount ?? 0),
          ])}
        />
      );
    case 'level-average':
      return (
        <TableView
          columns={['Niveau', 'Moyenne', 'Effectif', 'Classes']}
          rows={(data as Array<Record<string, unknown>>).map(r => [
            String(r.levelName ?? ''),
            String(r.average ?? ''),
            String(r.studentCount ?? 0),
            String(r.classroomCount ?? 0),
          ])}
        />
      );
    case 'subject-average':
      return (
        <TableView
          columns={['Matière', 'Moyenne', 'Classes']}
          rows={(data as Array<Record<string, unknown>>).map(r => [
            String(r.subjectName ?? ''),
            String(r.average ?? ''),
            String(r.classroomCount ?? 0),
          ])}
        />
      );
    case 'component-average':
      return (
        <TableView
          columns={['Composante', 'Matière', 'Moyenne']}
          rows={(data as Array<Record<string, unknown>>).map(r => [
            String(r.componentName ?? ''),
            String(r.subjectName ?? ''),
            String(r.average ?? ''),
          ])}
        />
      );
    case 'distribution':
      return <DistributionChart data={data as Array<Record<string, unknown>>} />;
    case 'threshold':
      return <ThresholdView data={data as Array<Record<string, unknown>>} />;
    case 'period-progression':
      return (
        <TableView
          columns={['Moy. préc.', 'Moy. act.', 'Écart']}
          rows={(data as Array<Record<string, unknown>>).map(r => [
            String(r.previousAvg ?? '—'),
            String(r.currentAvg ?? ''),
            r.change != null ? String(r.change) : '—',
          ])}
        />
      );
    case 'student-trends':
      return <TrendSection data={data as Record<string, Array<Record<string, unknown>>>} />;
    case 'grade-completion':
      return <CompletionView data={data as Array<Record<string, unknown>>} />;
    case 'report-card-workflow':
      return <WorkflowView data={data as Array<Record<string, unknown>>} />;
    default:
      return <Card><CardContent className="p-5"><p className="text-muted-foreground">Vue non reconnue.</p></CardContent></Card>;
  }
}

// ─────────────────────────────────────────────
// Table view
// ─────────────────────────────────────────────

function TableView({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(c => <TableHead key={c}>{c}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Distribution chart (horizontal bars)
// ─────────────────────────────────────────────

function DistributionChart({ data }: { data: Array<Record<string, unknown>> }) {
  const maxPct = Math.max(...data.map(d => Number(d.percentage ?? 0)), 1);
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {data.map(d => {
          const pct = Number(d.percentage ?? 0);
          const cnt = Number(d.count ?? 0);
          return (
            <div key={String(d.range)} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{String(d.range)}</span>
                <span className="text-muted-foreground">{cnt} ({pct}%)</span>
              </div>
              <div className="h-4 w-full rounded-full bg-muted">
                <div
                  className="h-4 rounded-full bg-primary transition-all"
                  style={{ width: `${(pct / maxPct) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Threshold view
// ─────────────────────────────────────────────

function ThresholdView({ data }: { data: Array<Record<string, unknown>> }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {data.map((d, i) => {
          const abovePct = Number(d.abovePct ?? 0);
          const belowPct = Number(d.belowPct ?? 0);
          const aboveCnt = Number(d.aboveCount ?? 0);
          const belowCnt = Number(d.belowCount ?? 0);
          return (
            <div key={i} className="space-y-2">
              <p className="text-sm font-medium">{String(d.label)}</p>
              <div className="flex gap-4 text-sm">
                <span className="text-success font-medium">Au-dessus : {aboveCnt} ({abovePct}%)</span>
                <span className="text-danger font-medium">En-dessous : {belowCnt} ({belowPct}%)</span>
              </div>
              <div className="flex h-6 w-full overflow-hidden rounded-full bg-danger/20">
                <div
                  className="flex items-center justify-center rounded-l-full bg-success text-xs font-bold text-primary-foreground"
                  style={{ width: `${abovePct}%` }}
                >
                  {abovePct > 10 ? `${abovePct}%` : ''}
                </div>
                <div
                  className="flex items-center justify-center rounded-r-full bg-danger text-xs font-bold text-primary-foreground"
                  style={{ width: `${belowPct}%` }}
                >
                  {belowPct > 10 ? `${belowPct}%` : ''}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Student trends
// ─────────────────────────────────────────────

const TREND_LABELS: Record<string, { label: string; color: string }> = {
  improving: { label: 'En progression', color: 'text-success' },
  declining: { label: 'En régression', color: 'text-danger' },
  stable: { label: 'Stable', color: 'text-muted-foreground' },
};

function TrendSection({ data }: { data: Record<string, Array<Record<string, unknown>>> }) {
  const improving = (data.improving ?? []) as Array<Record<string, unknown>>;
  const declining = (data.declining ?? []) as Array<Record<string, unknown>>;
  const stable = (data.stable ?? []) as Array<Record<string, unknown>>;

  const renderList = (items: Array<Record<string, unknown>>, trend: string) => {
    const cfg = TREND_LABELS[trend] ?? TREND_LABELS.stable;
    return (
      <div className="space-y-2">
        <h4 className={`text-sm font-semibold ${cfg.color}`}>{cfg.label} ({items.length})</h4>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun élève.</p>
        ) : (
          <div className="max-h-48 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Moy. préc.</TableHead>
                  <TableHead>Moy. act.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{String(r.previousAvg ?? '—')}</TableCell>
                    <TableCell>{String(r.currentAvg ?? '')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardContent className="p-4">{renderList(improving, 'improving')}</CardContent></Card>
      <Card><CardContent className="p-4">{renderList(declining, 'declining')}</CardContent></Card>
      <Card><CardContent className="p-4">{renderList(stable, 'stable')}</CardContent></Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// Grade completion view
// ─────────────────────────────────────────────

function CompletionView({ data }: { data: Array<Record<string, unknown>> }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune évaluation ouverte trouvée.</p>
        ) : (
          data.map((d, i) => {
            const pct = Number(d.completionPct ?? 0);
            const total = Number(d.totalStudents ?? 0);
            const graded = Number(d.gradedCount ?? 0);
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{String(d.assessmentTitle ?? '')}</p>
                    <p className="text-xs text-muted-foreground">{String(d.classroomName ?? '')} — {String(d.subjectName ?? '')}</p>
                  </div>
                  <span className="text-sm font-semibold whitespace-nowrap">{graded}/{total}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-3 rounded-full transition-all',
                      pct === 100 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-danger',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Report-card workflow view
// ─────────────────────────────────────────────

function WorkflowView({ data }: { data: Array<Record<string, unknown>> }) {
  const total = data.reduce((sum, d) => sum + Number(d.count ?? 0), 0);
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground">Total : {total} bulletin(s)</p>
        {data.map((d, i) => {
          const cnt = Number(d.count ?? 0);
          const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
          return (
            <div key={i} className="flex items-center gap-3">
              <StatusBadge status={String(d.status ?? '')} />
              <div className="flex-1">
                <div className="h-3 w-full rounded-full bg-muted">
                  <div
                    className="h-3 rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium w-16 text-right">{cnt} ({pct}%)</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
