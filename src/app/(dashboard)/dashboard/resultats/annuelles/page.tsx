"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { PageHeader, AcademicContextSelector } from '@/components/shared';
import type { AcademicContextValue, AcademicContextMeta } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Award, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { deriveRecommendation } from '@/lib/services/results/recommendation-engine';

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
  persistedFinalDecision?: string | null;
  persistedJustification?: string | null;
  decidedAt?: string | null;
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
  promotionThreshold: string | null;
}

// ─────────────────────────────────────────────
// Status display config
// ─────────────────────────────────────────────

const ANNUAL_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  CALCULATED: { label: 'Calculé', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  INCOMPLETE: { label: 'Incomplet', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  DECISION_COUNCIL: { label: 'Conseil de classe', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
};

const RECOMMENDATION_CONFIG: Record<string, { label: string; className: string }> = {
  PROPOSED_ADMITTED: { label: 'Admissibilité', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  PROPOSED_REPEAT: { label: 'Redoublement', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  DECISION_COUNCIL: { label: 'Conseil requis', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  INCOMPLETE: { label: 'Dossier incomplet', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  THRESHOLD_NOT_CONFIGURED: { label: 'Seuil non configuré', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
};

const DECISION_CONFIG: Record<string, { label: string; className: string }> = {
  admitted: { label: 'Admis', className: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100' },
  repeat: { label: 'Redouble', className: 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100' },
  admitted_by_derogation: { label: 'Admis sur dérogation', className: 'bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100' },
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

function getRecommendation(status: string, annualOfficial: string | null, threshold: string | null): string {
  return deriveRecommendation(status, annualOfficial, threshold);
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

  // Decision dialog state
  const [decisionDialog, setDecisionDialog] = useState<{ enrollmentId: string; studentName: string; annualOfficial: string | null; annualStatus: string; recommendation: string; currentDecision?: string | null } | null>(null);
  const [decisionAction, setDecisionAction] = useState<string>('');
  const [decisionJustification, setDecisionJustification] = useState('');
  const [decisionLoading, setDecisionLoading] = useState(false);

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

  const threshold = data?.promotionThreshold ?? null;

  // Build a per-student lookup map for period results
  const studentPeriodMap = useMemo(() => {
    if (!data) return new Map<string, Map<string, PeriodCompositionResult>>();
    const map = new Map<string, Map<string, PeriodCompositionResult>>();
    for (const s of data.students) {
      const pMap = new Map<string, PeriodCompositionResult>();
      for (const pr of s.periodResults) { pMap.set(pr.periodId, pr); }
      map.set(s.studentId, pMap);
    }
    return map;
  }, [data]);

  const contextClassroom = ctxMeta?.classrooms.find(c => c.id === ctxValue.classroomId);

  // Decision handler
  const handleDecisionSubmit = async () => {
    if (!decisionDialog) return;
    setDecisionLoading(true);
    try {
      const res = await fetch('/api/annual-results/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: decisionDialog.enrollmentId,
          finalDecision: decisionAction,
          justification: decisionJustification.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Erreur lors de l&apos;enregistrement de la décision.');
      }
      toast.success('Décision enregistrée.');
      setDecisionDialog(null);
      setDecisionJustification('');
      void loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setDecisionLoading(false);
    }
  };

  // Determine available actions for a recommendation
  const getAvailableActions = (recommendation: string, currentDecision?: string | null) => {
    if (currentDecision) return []; // Already decided
    switch (recommendation) {
      case 'PROPOSED_ADMITTED': return [{ value: 'ADMITTED', label: 'Admis' }];
      case 'PROPOSED_REPEAT': return [
        { value: 'REPEAT', label: 'Redouble' },
        { value: 'ADMITTED_BY_DEROGATION', label: 'Admis sur dérogation' },
      ];
      case 'DECISION_COUNCIL': return [
        { value: 'ADMITTED', label: 'Admis' },
        { value: 'REPEAT', label: 'Redouble' },
      ];
      default: return [];
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Résultats annuels"
        description="Moyennes annuelles pondérées avec compositions et passage (coefficient ×2)."
      />

      <AcademicContextSelector
        onChange={handleContextChange}
        showPeriod={false}
        columns={2}
      />

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

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!loading && data && (
        <div className="space-y-4">
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

          {/* Threshold state banner */}
          {!threshold && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Seuil de promotion non configuré</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Les propositions d&apos;admission / redoublement ne sont pas disponibles.
                  Configurez le seuil dans les règles de calcul.
                </p>
              </div>
            </div>
          )}

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

          {data.classAverage.studentCount > 0 && data.classAverage.studentCount < data.students.length && (
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
                    <th className="px-3 py-3 text-center font-medium min-w-[130px]">Statut provisoire</th>
                    <th className="px-3 py-3 text-center font-medium min-w-[150px]">Décision du conseil</th>
                    <th className="px-3 py-3 text-center font-medium min-w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.students.length === 0 && (
                    <tr>
                      <td colSpan={5 + compositionPeriods.length + (passagePeriod ? 1 : 0)} className="px-4 py-8 text-center text-muted-foreground">
                        Aucun élève inscrit dans cette classe.
                      </td>
                    </tr>
                  )}
                  {data.students.map(s => {
                    const pMap = studentPeriodMap.get(s.studentId);
                    const isCalc = s.annual.status === 'CALCULATED';
                    const rec = getRecommendation(s.annual.status, s.annual.annualOfficial, threshold);
                    const hasDecision = !!s.persistedFinalDecision;
                    const actions = getAvailableActions(rec, s.persistedFinalDecision);

                    return (
                      <tr key={s.enrollmentId} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium whitespace-nowrap sticky left-0 bg-background z-10">
                          {s.studentLastName} {s.studentFirstName}
                        </td>

                        {compositionPeriods.map(p => {
                          const pr = pMap?.get(p.periodId);
                          if (!pr || pr.status === 'INCOMPLETE') {
                            return (
                              <td key={p.periodId} className="px-3 py-3 text-center">
                              <span className={CELL_STATUS_CONFIG.INCOMPLETE.className}>{CELL_STATUS_CONFIG.INCOMPLETE.label}</span>
                            </td>
                            );
                          }
                          if (pr.status === 'NO_COMPUTABLE_RESULT') {
                            return (
                              <td key={p.periodId} className="px-3 py-3 text-center">
                              <span className={CELL_STATUS_CONFIG.NO_COMPUTABLE_RESULT.className}>{CELL_STATUS_CONFIG.NO_COMPUTABLE_RESULT.label}</span>
                            </td>
                            );
                          }
                          return <td key={p.periodId} className="px-3 py-3 text-center font-mono">{formatNumber(pr.official)}</td>;
                        })}

                        {passagePeriod && (() => {
                          const pr = pMap?.get(passagePeriod.periodId);
                          if (!pr || pr.status === 'INCOMPLETE') {
                            return <td className="px-3 py-3 text-center"><span className={CELL_STATUS_CONFIG.INCOMPLETE.className}>{CELL_STATUS_CONFIG.INCOMPLETE.label}</span></td>;
                          }
                          if (pr.status === 'NO_COMPUTABLE_RESULT') {
                            return <td className="px-3 py-3 text-center"><span className={CELL_STATUS_CONFIG.NO_COMPUTABLE_RESULT.className}>{CELL_STATUS_CONFIG.NO_COMPUTABLE_RESULT.label}</span></td>;
                          }
                          return <td className="px-3 py-3 text-center font-mono font-medium">{formatNumber(pr.official)}</td>;
                        })()}

                        <td className="px-4 py-3 text-center">
                          {isCalc ? (
                            <span className="text-lg font-bold font-mono">{formatNumber(s.annual.annualOfficial)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {s.annualRank ? (
                            <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                              {s.annualRank.rank}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Recommendation */}
                        <td className="px-3 py-3 text-center">
                          <Badge variant="outline" className={RECOMMENDATION_CONFIG[rec]?.className ?? ''}>
                            {RECOMMENDATION_CONFIG[rec]?.label ?? rec}
                          </Badge>
                        </td>

                        {/* Final decision */}
                        <td className="px-3 py-3 text-center">
                          {hasDecision && s.persistedFinalDecision ? (
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="outline" className={DECISION_CONFIG[s.persistedFinalDecision]?.className ?? ''}>
                                {DECISION_CONFIG[s.persistedFinalDecision]?.label ?? s.persistedFinalDecision}
                              </Badge>
                              {s.decidedAt && (
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(s.decidedAt).toLocaleDateString('fr-FR')}
                                </span>
                              )}
                            </div>
                          ) : rec === 'INCOMPLETE' ? (
                            <span className="text-xs text-muted-foreground italic">Décision impossible — dossier incomplet</span>
                          ) : rec === 'THRESHOLD_NOT_CONFIGURED' ? (
                            <span className="text-xs text-muted-foreground">Seuil non configuré</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3 text-center">
                          {hasDecision ? (
                            <CheckCircle className="mx-auto h-4 w-4 text-emerald-600" />
                          ) : actions.length > 0 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setDecisionDialog({
                                  enrollmentId: s.enrollmentId,
                                  studentName: `${s.studentLastName} ${s.studentFirstName}`,
                                  annualOfficial: s.annual.annualOfficial,
                                  annualStatus: s.annual.status,
                                  recommendation: rec,
                                });
                                setDecisionAction(actions[0].value);
                                setDecisionJustification('');
                              }}
                            >
                              Décider
                            </Button>
                          ) : rec === 'INCOMPLETE' ? (
                            <span className="text-xs text-muted-foreground italic">Décision impossible</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-right">
            {data.students.length} élève{data.students.length !== 1 ? 's' : ''}
            {data.classAverage.studentCount > 0 && (
              <span> · {data.classAverage.studentCount} calculé{data.classAverage.studentCount !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
      )}

      {!loading && data && data.periods.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>Aucune période de composition ou passage configurée pour cette année scolaire.</p>
        </div>
      )}

      {/* Decision Dialog */}
      <Dialog open={!!decisionDialog} onOpenChange={(open) => { if (!open) setDecisionDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Décision du conseil</DialogTitle>
          </DialogHeader>
          {decisionDialog && (
            <div className="space-y-4 py-2">
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                <p className="font-medium">Élève : {decisionDialog.studentName}</p>
                <p className="text-muted-foreground">
                  Moyenne annuelle : {decisionDialog.annualStatus === 'CALCULATED' && decisionDialog.annualOfficial ? formatNumber(decisionDialog.annualOfficial) : '—'}
                </p>
                <p className="text-muted-foreground">
                  Statut provisoire : {RECOMMENDATION_CONFIG[decisionDialog.recommendation]?.label ?? decisionDialog.recommendation}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Décision du conseil</Label>
                <div className="flex flex-wrap gap-2">
                  {getAvailableActions(decisionDialog.recommendation).map(a => (
                    <Button
                      key={a.value}
                      variant={decisionAction === a.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDecisionAction(a.value)}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
              </div>

              {(decisionAction === 'ADMITTED_BY_DEROGATION' || decisionDialog.recommendation === 'DECISION_COUNCIL') && (
                <div className="space-y-2">
                  <Label htmlFor="decision-justification">Justification <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="decision-justification"
                    placeholder="Raison de la décision…"
                    value={decisionJustification}
                    onChange={(e) => setDecisionJustification(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionDialog(null)}>Annuler</Button>
            <Button
              onClick={() => { void handleDecisionSubmit(); }}
              disabled={decisionLoading || !decisionAction}
            >
              {decisionLoading ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
