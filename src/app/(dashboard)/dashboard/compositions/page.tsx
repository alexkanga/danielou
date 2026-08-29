"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, RefreshCw, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';

interface AcademicYearOption { id: string; name: string; status: string }
interface ClassroomOption { id: string; name: string; levelName: string; yearName: string }
interface PeriodOption { id: string; name: string; periodType: string; status: string; sortOrder: number }
interface AssessmentInfo { id: string; title: string; scale: number; status: string }
interface StudentResult {
  enrollmentId: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  result: { studentId: string; status: string; raw: string | null; official: string | null };
}
interface RankingEntry { studentId: string; average: string; rank: number; tiedCount: number }
interface ClassResult {
  periodId: string;
  classroomId: string;
  periodType: string;
  periodName: string;
  students: StudentResult[];
  classAverage: { status: string; raw: string | null; official: string | null; studentCount: number };
  ranking: RankingEntry[];
}

const STATUS_LABELS: Record<string, string> = {
  CALCULATED: 'Calculé',
  INCOMPLETE: 'Incomplet',
  NO_COMPUTABLE_RESULT: 'Aucune moyenne calculable',
};

const STATUS_COLORS: Record<string, string> = {
  CALCULATED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  INCOMPLETE: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  NO_COMPUTABLE_RESULT: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

export default function CompositionsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [assessments, setAssessments] = useState<AssessmentInfo[]>([]);
  const [classResult, setClassResult] = useState<ClassResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSelectors, setLoadingSelectors] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/annees-scolaires?limit=100');
        if (r.ok) {
          const j = await r.json();
          const items: AcademicYearOption[] = (j.data || []).map((y: { id: string; name: string; status: string }) => ({ id: y.id, name: y.name, status: y.status }));
          setAcademicYears(items);
          const active = items.find((y) => y.status === 'active');
          if (active) setSelectedYearId(active.id);
        }
      } catch { /* */ } finally { setLoadingSelectors(false); }
    })();
  }, []);

  const handleYearChange = useCallback((id: string) => {
    setSelectedYearId(id);
    setSelectedClassroomId('');
    setPeriods([]);
    setSelectedPeriodId('');
    setClassResult(null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!selectedYearId) { setClassrooms([]); return; }
    (async () => {
      try {
        const r = await fetch(`/api/classes?academicYearId=${selectedYearId}&limit=200`);
        if (r.ok) {
          const j = await r.json();
          setClassrooms((j.data || []).map((c: ClassroomOption) => c));
        }
      } catch { /* */ }
    })();
  }, [selectedYearId]);

  const handleClassroomChange = useCallback((id: string) => {
    setSelectedClassroomId(id);
    setPeriods([]);
    setSelectedPeriodId('');
    setClassResult(null);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!selectedClassroomId) { setPeriods([]); return; }
    (async () => {
      try {
        const [r1, r2] = await Promise.all([
          fetch(`/api/periodes?academicYearId=${selectedYearId}&periodType=composition&limit=50`),
          fetch(`/api/periodes?academicYearId=${selectedYearId}&periodType=passage&limit=50`),
        ]);
        const items: PeriodOption[] = [];
        for (const r of [r1, r2]) {
          if (r.ok) {
            const j = await r.json();
            for (const p of j.data || []) {
              items.push({ id: p.id, name: p.name, periodType: p.periodType, status: p.status, sortOrder: p.sortOrder ?? 0 });
            }
          }
        }
        items.sort((a, b) => a.sortOrder - b.sortOrder);
        setPeriods(items);
      } catch { /* */ }
    })();
  }, [selectedClassroomId, selectedYearId]);

  const loadAssessments = useCallback(async () => {
    if (!selectedClassroomId || !selectedPeriodId) return;
    try {
      const r = await fetch(`/api/evaluations?classroomId=${selectedClassroomId}&academicPeriodId=${selectedPeriodId}&limit=100`);
      if (r.ok) {
        const j = await r.json();
        setAssessments((j.data || []).map((a: { id: string; title: string; scale: number; status: string }) => ({ id: a.id, title: a.title, scale: a.scale, status: a.status })));
      }
    } catch { /* */ }
  }, [selectedClassroomId, selectedPeriodId]);

  const loadResults = useCallback(async () => {
    if (!selectedPeriodId || !selectedClassroomId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/compositions?academicPeriodId=${selectedPeriodId}&classroomId=${selectedClassroomId}`);
      if (!r.ok) {
        const err = await r.json().catch(() => null);
        toast.error(err?.error || 'Erreur de chargement des résultats.');
        setClassResult(null);
        return;
      }
      setClassResult(await r.json());
    } catch {
      toast.error('Erreur de chargement des résultats.');
      setClassResult(null);
    } finally { setLoading(false); }
  }, [selectedPeriodId, selectedClassroomId]);

  const handlePeriodChange = useCallback((id: string) => {
    setSelectedPeriodId(id);
    setClassResult(null);
    setAssessments([]);
  }, []);

  useEffect(() => {
    if (!selectedPeriodId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAssessments();
    void loadResults();
  }, [selectedPeriodId, loadAssessments, loadResults]);

  const getRank = (sid: string): number | null => {
    if (!classResult) return null;
    const e = classResult.ranking.find((r) => r.studentId === sid);
    return e ? e.rank : null;
  };

  const canLoad = !!(selectedYearId && selectedClassroomId && selectedPeriodId);

  return (
    <div className="space-y-6">
      <PageHeader title="Compositions" description="Résultats des compositions et passages par classe." />

      {/* Context selectors */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-lg border bg-card p-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Année scolaire</label>
          {loadingSelectors
            ? <Skeleton className="h-9 w-full" />
            : (
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={selectedYearId} onChange={(e) => handleYearChange(e.target.value)}>
                <option value="">- Choisir -</option>
                {academicYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Classe</label>
          <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={selectedClassroomId} onChange={(e) => handleClassroomChange(e.target.value)} disabled={!selectedYearId}>
            <option value="">- Choisir -</option>
            {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.levelName})</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Période</label>
          <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={selectedPeriodId} onChange={(e) => handlePeriodChange(e.target.value)} disabled={!selectedClassroomId}>
            <option value="">- Choisir -</option>
            {periods.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.periodType === 'passage' ? 'Passage' : 'Composition'})</option>)}
          </select>
        </div>
      </div>

      {/* Empty state */}
      {!canLoad && !loading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Award className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium text-muted-foreground">Sélectionnez une année, une classe et une période de composition.</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      )}

      {/* Results */}
      {!loading && classResult && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{classResult.periodName}</h3>
                <p className="text-sm text-muted-foreground">
                  {classResult.periodType === 'passage' ? 'Passage' : 'Composition'}
                  {assessments.length > 0 && <span> - {assessments.length} évaluation{assessments.length > 1 ? 's' : ''}</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/dashboard/evaluations?classroomId=${selectedClassroomId}&academicPeriodId=${selectedPeriodId}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Gérer les évaluations
                  </a>
                </Button>
                <Button variant="outline" size="sm" onClick={() => { void loadResults(); }}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  Actualiser
                </Button>
              </div>
            </div>
            {assessments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {assessments.map((a) => (
                  <span key={a.id} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
                    {a.title}
                    <span className="ml-1 text-muted-foreground">/ {a.scale}</span>
                  </span>
                ))}
              </div>
            )}
            {assessments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aucune évaluation pour cette période.{' '}
                <a href={`/dashboard/evaluations?classroomId=${selectedClassroomId}&academicPeriodId=${selectedPeriodId}`} className="underline" target="_blank" rel="noopener noreferrer">
                  Créer une évaluation
                </a>
              </p>
            )}
          </div>

          {/* Class average */}
          {classResult.classAverage.status === 'CALCULATED' ? (
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
              <span className="text-sm font-medium">Moyenne de classe</span>
              <span className="text-2xl font-bold">{classResult.classAverage.official}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
              <span className="text-sm font-medium">Moyenne de classe</span>
              <span className={["inline-flex items-center rounded-full px-3 py-0.5 text-sm font-medium", STATUS_COLORS[classResult.classAverage.status] || ''].join(' ')}>
                {STATUS_LABELS[classResult.classAverage.status] || classResult.classAverage.status}
              </span>
            </div>
          )}

          {/* Student results table */}
          <div className="rounded-lg border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Rang</th>
                    <th className="px-4 py-3 text-left font-medium">Élève</th>
                    <th className="px-4 py-3 text-center font-medium">Statut</th>
                    <th className="px-4 py-3 text-center font-medium">Moyenne</th>
                    <th className="px-4 py-3 text-center font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {classResult.students.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Aucun élève inscrit.</td></tr>
                  )}
                  {classResult.students.map((s) => {
                    const rank = getRank(s.studentId);
                    const st = s.result.status;
                    const isCalc = st === 'CALCULATED';
                    return (
                      <tr key={s.enrollmentId} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-center">
                          {rank !== null ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{rank}</span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-4 py-3 font-medium">{s.studentLastName} {s.studentFirstName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={["inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[st] || ''].join(' ')}>
                            {STATUS_LABELS[st] || st}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isCalc ? <span className="text-lg font-bold">{s.result.official}</span> : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {assessments.length > 0 && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/dashboard/saisie-notes?assessmentId=${assessments[0].id}`} target="_blank" rel="noopener noreferrer">Voir les notes</a>
                            </Button>
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
            {classResult.students.length} élève{classResult.students.length > 1 ? 's' : ''}
            {classResult.classAverage.studentCount > 0 && <span> - {classResult.classAverage.studentCount} calculé{classResult.classAverage.studentCount > 1 ? 's' : ''}</span>}
          </p>
        </div>
      )}

      {/* No periods */}
      {!loading && selectedClassroomId && periods.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>Aucune période de composition ou passage trouvée.</p>
        </div>
      )}
    </div>
  );
}
