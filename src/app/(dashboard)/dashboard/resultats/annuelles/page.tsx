"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { PageHeader, AcademicContextSelector } from '@/components/shared';
import type { AcademicContextValue, AcademicContextMeta } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Award, RefreshCw } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface PeriodInfo {
  periodId: string;
  periodName: string;
  periodType: string;
  sortOrder: number;
}

interface PeriodCompositionResult {
  periodId: string;
  periodName: string;
  periodType: 'composition' | 'passage';
  status: string;
  raw: string | null;
  official: string | null;
}

interface AnnualStudentResult {
  studentId: string;
  status: string;
  regularRaw: string | null;
  passageRaw: string | null;
  annualRaw: string | null;
  annualOfficial: string | null;
}

interface AnnualRankingEntry {
  studentId: string;
  average: string;
  rank: number;
  tiedCount: number;
}

interface StudentRow {
  enrollmentId: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  periodResults: PeriodCompositionResult[];
  annual: AnnualStudentResult;
  annualRank: AnnualRankingEntry | null;
}

interface ClassAverage {
  status: string;
  annualOfficial: string | null;
  studentCount: number;
}

interface AnnualClassResult {
  academicYearId: string;
  classroomId: string;
  classroomName: string;
  periods: PeriodInfo[];
  students: StudentRow[];
  classAverage: ClassAverage;
  ranking: AnnualRankingEntry[];
}

// ─────────────────────────────────────────────
// Status display config
// ─────────────────────────────────────────────

const ANNUAL_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  CALCULATED: { label: 'Calculé', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  INCOMPLETE: { label: 'Incomplet', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  DECISION_COUNCIL: { label: 'Conseil de classe', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
};

const CELL_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  CALCULATED: { label: '', className: '' },
  INCOMPLETE: { label: 'Incomplet', className: 'text-amber-600 dark:text-amber-400' },
  NO_COMPUTABLE_RESULT: { label: '—', className: 'text-muted-foreground' },
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatNumber(value: string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function AnnualResultsPage() {
  const [ctxValue, setCtxValue] = useState<AcademicContextValue>({ academicYearId: '', classroomId: '', academicPeriodId: '' });
  const [ctxMeta, setCtxMeta] = useState<AcademicContextMeta | null>(null);
  const [data, setData] = useState<AnnualClassResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLoad = !!(ctxValue.academicYearId && ctxValue.classroomId);

  const loadData = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/annual-results?academicYearId=${ctxValue.academicYearId}&classroomId=${ctxValue.classroomId}`);
      if (!r.ok) {
        const err = await r.json().catch(() => null);
        toast.error(err?.error || 'Erreur de chargement des résultats annuels.');
        setData(null);
        return;
      }
      setData(await r.json());
    } catch {
      toast.error('Erreur de chargement des résultats annuels.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [canLoad, ctxValue.academicYearId, ctxValue.classroomId]);

  const handleContextChange = useCallback((value: AcademicContextValue, meta: AcademicContextMeta) => {
    setCtxValue(value);
    setCtxMeta(meta);
  }, []);

  useEffect(() => {
    if (!canLoad) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      return;
    }
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxValue.academicYearId, ctxValue.classroomId]);

  // Split periods into compositions and passage
  const compositionPeriods = useMemo(() =>
    (data?.periods ?? []).filter(p => p.periodType === 'composition'),
    [data?.periods],
  );

  const passagePeriod = useMemo(() =>
    (data?.periods ?? []).find(p => p.periodType === 'passage'),
    [data?.periods],
  );

  // Build a per-student lookup map for period results
  const studentPeriodMap = useMemo(() => {
    if (!data) return new Map<string, Map<string, PeriodCompositionResult>>();
    const map = new Map<string, Map<string, PeriodCompositionResult>>();
    for (const s of data.students) {
      const pMap = new Map<string, PeriodCompositionResult>();
      for (const pr of s.periodResults) {
        pMap.set(pr.periodId, pr);
      }
      map.set(s.studentId, pMap);
    }
    return map;
  }, [data]);

  const contextClassroom = ctxMeta?.classrooms.find(c => c.id === ctxValue.classroomId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Résultats annuels"
        description="Moyennes annuelles pondérées avec compositions et passage (coefficient ×2)."
      />

      {/* Academic Context Selector — year + classroom only */}
      <AcademicContextSelector
        onChange={handleContextChange}
        showPeriod={false}
        columns={2}
      />

      {/* Context summary */}
      {ctxMeta?.academicYearName && contextClassroom && (
        <p className="text-xs text-muted-foreground">
          {ctxMeta.academicYearName} · {contextClassroom.name} ({contextClassroom.levelName})
        </p>
      )}

      {/* Empty state */}
      {!canLoad && !loading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Award className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">Sélectionnez une année scolaire et une classe pour afficher les résultats annuels.</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results table */}
      {!loading && data && (
        <div className="space-y-4">
          {/* Header info bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-semibold">{data.classroomName}</h3>
              <p className="text-sm text-muted-foreground">
                {compositionPeriods.length} composition{compositionPeriods.length !== 1 ? 's' : ''}
                {passagePeriod ? ' + Passage' : ''}
                {' · '}
                {data.students.length} élève{data.students.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { void loadData(); }}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Actualiser
            </Button>
          </div>

          {/* Class average bar */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
            <span className="text-sm font-medium">Moyenne annuelle de la classe</span>
            {data.classAverage.status === 'CALCULATED' && data.classAverage.annualOfficial ? (
              <span className="text-2xl font-bold">{formatNumber(data.classAverage.annualOfficial)}</span>
            ) : (
              <Badge variant="outline" className={ANNUAL_STATUS_CONFIG[data.classAverage.status]?.className ?? ''}>
                {ANNUAL_STATUS_CONFIG[data.classAverage.status]?.label ?? data.classAverage.status}
              </Badge>
            )}
          </div>

          {/* Student count note */
            data.classAverage.studentCount > 0 && data.classAverage.studentCount < data.students.length && (
              <p className="text-xs text-muted-foreground">
                {data.classAverage.studentCount} élève{data.classAverage.studentCount !== 1 ? 's' : ''} sur {data.students.length} avec une moyenne calculable.
              </p>
            )}

          {/* Data table */}
          <div className="rounded-lg border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium sticky left-0 bg-muted/50 z-10 min-w-[180px]">Élève</th>
                    {compositionPeriods.map(p => (
                      <th key={p.periodId} className="px-3 py-3 text-center font-medium min-w-[70px]">
                        {p.periodName}
                      </th>
                    ))}
                    {passagePeriod && (
                      <th className="px-3 py-3 text-center font-medium min-w-[70px]">Passage</th>
                    )}
                    <th className="px-4 py-3 text-center font-medium min-w-[90px]">Moy. annuelle</th>
                    <th className="px-4 py-3 text-center font-medium min-w-[70px]">Rang</th>
                    <th className="px-3 py-3 text-center font-medium min-w-[110px]">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.length === 0 && (
                    <tr>
                      <td colSpan={3 + compositionPeriods.length + (passagePeriod ? 1 : 0)} className="px-4 py-8 text-center text-muted-foreground">
                        Aucun élève inscrit dans cette classe.
                      </td>
                    </tr>
                  )}
                  {data.students.map(s => {
                    const pMap = studentPeriodMap.get(s.studentId);
                    const isCalc = s.annual.status === 'CALCULATED';
                    return (
                      <tr key={s.enrollmentId} className="border-b last:border-0 hover:bg-muted/30">
                        {/* Student name */}
                        <td className="px-4 py-3 font-medium whitespace-nowrap sticky left-0 bg-background z-10">
                          {s.studentLastName} {s.studentFirstName}
                        </td>

                        {/* Composition period cells */}
                        {compositionPeriods.map(p => {
                          const pr = pMap?.get(p.periodId);
                          if (!pr || pr.status === 'INCOMPLETE') {
                            return (
                              <td key={p.periodId} className="px-3 py-3 text-center">
                                <span className={CELL_STATUS_CONFIG.INCOMPLETE.className}>
                                  {CELL_STATUS_CONFIG.INCOMPLETE.label}
                                </span>
                              </td>
                            );
                          }
                          if (pr.status === 'NO_COMPUTABLE_RESULT') {
                            return (
                              <td key={p.periodId} className="px-3 py-3 text-center">
                                <span className={CELL_STATUS_CONFIG.NO_COMPUTABLE_RESULT.className}>
                                  {CELL_STATUS_CONFIG.NO_COMPUTABLE_RESULT.label}
                                </span>
                              </td>
                            );
                          }
                          // CALCULATED
                          return (
                            <td key={p.periodId} className="px-3 py-3 text-center font-mono">
                              {formatNumber(pr.official)}
                            </td>
                          );
                        })}

                        {/* Passage cell */}
                        {passagePeriod && (() => {
                          const pr = pMap?.get(passagePeriod.periodId);
                          if (!pr || pr.status === 'INCOMPLETE') {
                            return (
                              <td className="px-3 py-3 text-center">
                                <span className={CELL_STATUS_CONFIG.INCOMPLETE.className}>
                                  {CELL_STATUS_CONFIG.INCOMPLETE.label}
                                </span>
                              </td>
                            );
                          }
                          if (pr.status === 'NO_COMPUTABLE_RESULT') {
                            return (
                              <td className="px-3 py-3 text-center">
                                <span className={CELL_STATUS_CONFIG.NO_COMPUTABLE_RESULT.className}>
                                  {CELL_STATUS_CONFIG.NO_COMPUTABLE_RESULT.label}
                                </span>
                              </td>
                            );
                          }
                          return (
                            <td className="px-3 py-3 text-center font-mono font-medium">
                              {formatNumber(pr.official)}
                            </td>
                          );
                        })()}

                        {/* Annual average */}
                        <td className="px-4 py-3 text-center">
                          {isCalc ? (
                            <span className="text-lg font-bold font-mono">{formatNumber(s.annual.annualOfficial)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Rank */}
                        <td className="px-4 py-3 text-center">
                          {s.annualRank ? (
                            <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                              {s.annualRank.rank}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 text-center">
                          <Badge variant="outline" className={ANNUAL_STATUS_CONFIG[s.annual.status]?.className ?? ''}>
                            {ANNUAL_STATUS_CONFIG[s.annual.status]?.label ?? s.annual.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer count */}
          <p className="text-xs text-muted-foreground text-right">
            {data.students.length} élève{data.students.length !== 1 ? 's' : ''}
            {data.classAverage.studentCount > 0 && (
              <span> · {data.classAverage.studentCount} calculé{data.classAverage.studentCount !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
      )}

      {/* No valid periods found */}
      {!loading && data && data.periods.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>Aucune période de composition ou passage configurée pour cette année scolaire.</p>
        </div>
      )}
    </div>
  );
}
