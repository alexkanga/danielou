"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type StudentResultStatus = 'CALCULATED' | 'INCOMPLETE' | 'NON_COMPUTABLE';

interface SubjectResultItem {
  subjectId: string;
  subjectName: string;
  rawValue: string | null;
  officialValue: string | null;
  coefficient: string;
  weightedPoints: string | null;
  includeInAverage: boolean;
  isIncomplete: boolean;
}

interface PeriodStudentResult {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  generalAverageOfficial: string | null;
  generalAverageRaw: string | null;
  status: StudentResultStatus;
  rank: number | null;
  totalStudentsRanked: number | null;
  classAverage: string | null;
  subjectResults: SubjectResultItem[];
}

interface PeriodClassResult {
  classAverage: string | null;
  minAverage: string | null;
  maxAverage: string | null;
  studentCount: number;
}

interface PeriodResultsData {
  students: PeriodStudentResult[];
  classResult: PeriodClassResult;
  configVersionId: string | null;
  generalAverageInputPolicy: string | null;
  roundingStrategy: string | null;
  subjectDecimalPlaces: number | null;
  generalDecimalPlaces: number | null;
}

interface ResultRow {
  id: string;
  studentName: string;
  generalAverageOfficial: string | null;
  generalAverageRaw: string | null;
  rank: number | null;
  totalStudentsRanked: number | null;
  classAverage: string | null;
  status: StudentResultStatus;
  subjectResults: SubjectResultItem[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  CALCULATED: { label: 'Calculé', color: 'bg-green-100 text-green-700' },
  INCOMPLETE: { label: 'Incomplet', color: 'bg-amber-100 text-amber-700' },
  NON_COMPUTABLE: { label: 'Non calculable', color: 'bg-gray-100 text-gray-500' },
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function ResultatsPage() {
  // Context state: Year → Classroom → Period (WS-003 §3)
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string }[]>([]);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [periods, setPeriods] = useState<{ id: string; name: string }[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');

  // Results state
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [classResult, setClassResult] = useState<PeriodClassResult | null>(null);
  const [busy, setBusy] = useState(false);

  // Detail state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState<PeriodStudentResult | null>(null);

  // Load academic years on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/annees-scolaires?limit=100');
        if (r.ok) {
          const json = await r.json();
          setAcademicYears((json.data || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
        }
      } catch { /* silent */ }
    })();
  }, []);

  // When year changes: load classrooms + periods for that year, clear stale results
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedYear) {
        // Use microtask to avoid synchronous setState in effect
        await new Promise(r => setTimeout(r, 0));
        if (cancelled) return;
        setClassrooms([]);
        setPeriods([]);
        setSelectedClass('');
        setSelectedPeriod('');
        setRows([]);
        setClassResult(null);
        return;
      }

      try {
        const [c, p] = await Promise.all([
          fetch(`/api/classes?academicYearId=${selectedYear}&limit=100`).then(r => r.ok ? r.json() : { data: [] }),
          fetch(`/api/periodes?academicYearId=${selectedYear}&limit=100`).then(r => r.ok ? r.json() : { data: [] }),
        ]);
        if (cancelled) return;
        setClassrooms((c.data || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
        setPeriods(
          (p.data || [])
            .filter((x: { periodType: string }) => x.periodType !== 'composition' && x.periodType !== 'passage')
            .map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })),
        );
        setSelectedClass('');
        setSelectedPeriod('');
        setRows([]);
        setClassResult(null);
      } catch { /* silent */ }
    };
    void load();
    return () => { cancelled = true; };
  }, [selectedYear]);

  // Load results — PURE READ via GET /api/period-results (WS-003 §4)
  const loadResults = useCallback(async () => {
    if (!selectedYear || !selectedClass || !selectedPeriod) return;
    setBusy(true);
    try {
      const r = await fetch(
        `/api/period-results?academicYearId=${selectedYear}&classroomId=${selectedClass}&academicPeriodId=${selectedPeriod}`,
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: 'Erreur serveur' }));
        toast.error(err.error || 'Erreur');
        return;
      }
      const data: PeriodResultsData = await r.json();

      // Sort students by name for display
      const sorted = [...data.students].sort((a, b) => a.studentName.localeCompare(b.studentName, 'fr'));
      const newRows: ResultRow[] = sorted.map(s => ({
        id: s.enrollmentId,
        studentName: s.studentName,
        generalAverageOfficial: s.generalAverageOfficial,
        generalAverageRaw: s.generalAverageRaw,
        rank: s.rank,
        totalStudentsRanked: s.totalStudentsRanked,
        classAverage: s.classAverage,
        status: s.status,
        subjectResults: s.subjectResults,
      }));
      setRows(newRows);
      setClassResult(data.classResult);
    } catch {
      toast.error('Erreur de chargement.');
    } finally {
      setBusy(false);
    }
  }, [selectedYear, selectedClass, selectedPeriod]);

  const openDetail = (row: ResultRow) => {
    setDetailStudent({
      enrollmentId: row.id,
      studentId: row.id,
      studentName: row.studentName,
      generalAverageOfficial: row.generalAverageOfficial,
      generalAverageRaw: row.generalAverageRaw,
      status: row.status,
      rank: row.rank,
      totalStudentsRanked: row.totalStudentsRanked,
      classAverage: row.classAverage,
      subjectResults: row.subjectResults,
    });
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Résultats par période"
        description="Consultez les moyennes générales, rangs et statistiques par classe et période."
      />

      {/* Context selectors: Year → Classroom → Period (WS-003 §3) */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-2">
          <Label>Année scolaire</Label>
          <select
            className="w-56 border rounded-md px-3 py-2 text-sm bg-background"
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
          >
            <option value="">— Choisir —</option>
            {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Classe</Label>
          <select
            className="w-56 border rounded-md px-3 py-2 text-sm bg-background"
            value={selectedClass}
            onChange={e => { setSelectedClass(e.target.value); setRows([]); setClassResult(null); }}
            disabled={!selectedYear}
          >
            <option value="">— Choisir —</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Période</Label>
          <select
            className="w-56 border rounded-md px-3 py-2 text-sm bg-background"
            value={selectedPeriod}
            onChange={e => { setSelectedPeriod(e.target.value); setRows([]); setClassResult(null); }}
            disabled={!selectedYear}
          >
            <option value="">— Choisir —</option>
            {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <Button
          onClick={() => { void loadResults(); }}
          disabled={busy || !selectedYear || !selectedClass || !selectedPeriod}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {busy ? 'Chargement...' : 'Afficher les résultats'}
        </Button>
      </div>

      {/* Class summary (WS-003 §12) */}
      {classResult && classResult.studentCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-muted-foreground">Moy. classe</div>
            <div className="text-xl font-bold">{classResult.classAverage ?? '—'}</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-muted-foreground">Min</div>
            <div className="text-xl font-bold">{classResult.minAverage ?? '—'}</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-muted-foreground">Max</div>
            <div className="text-xl font-bold">{classResult.maxAverage ?? '—'}</div>
          </div>
        </div>
      )}

      {/* Results table (WS-003 §13) */}
      <DataTable
        columns={[
          { key: 'studentName', label: 'Élève' },
          { key: 'generalAverageOfficial', label: 'Moy. générale', render: (i: ResultRow) => (
            <span className="font-mono font-medium">
              {i.status === 'CALCULATED' ? (i.generalAverageOfficial ?? '—') : '—'}
            </span>
          )},
          { key: 'rank', label: 'Rang', render: (i: ResultRow) => (
            i.rank != null
              ? <span className="font-medium">{i.rank}<span className="text-muted-foreground font-normal">/{i.totalStudentsRanked ?? '?'}</span></span>
              : '—'
          )},
          { key: 'status', label: 'Statut', render: (i: ResultRow) => {
            const s = STATUS_MAP[i.status] ?? { label: i.status, color: 'bg-gray-100 text-gray-700' };
            return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
          }},
        ]}
        data={rows}
        getId={(i: ResultRow) => i.id}
        onRowClick={(i: ResultRow) => openDetail(i)}
        actions={(item: ResultRow) => (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(item)}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
        emptyMessage="Sélectionnez une année, une classe et une période pour afficher les résultats."
      />

      {/* Detail Dialog — powered by live period result payload (WS-003 §14) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Résultats détaillés — {detailStudent?.studentName}</DialogTitle>
          </DialogHeader>
          {detailStudent && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Moy. officielle</div>
                  <div className="text-xl font-bold">{detailStudent.generalAverageOfficial ?? '—'}</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Rang</div>
                  <div className="text-xl font-bold">
                    {detailStudent.rank != null ? `${detailStudent.rank}/${detailStudent.totalStudentsRanked ?? '?'}` : '—'}
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Moy. classe</div>
                  <div className="text-xl font-bold">{detailStudent.classAverage ?? '—'}</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Statut</div>
                  <div className="text-lg font-bold">
                    {STATUS_MAP[detailStudent.status]?.label ?? detailStudent.status}
                  </div>
                </div>
              </div>

              {/* Subjects table */}
              {detailStudent.subjectResults.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2">Matière</th>
                        <th className="text-right px-3 py-2">Brut</th>
                        <th className="text-right px-3 py-2">Officiel</th>
                        <th className="text-right px-3 py-2">Coeff.</th>
                        <th className="text-right px-3 py-2">Points</th>
                        <th className="text-center px-3 py-2">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailStudent.subjectResults.map(item => (
                        <tr key={item.subjectId} className="border-t">
                          <td className="px-3 py-2 font-medium">{item.subjectName}</td>
                          <td className="text-right px-3 py-2 font-mono text-xs">{item.rawValue ?? '—'}</td>
                          <td className="text-right px-3 py-2 font-mono text-xs">{item.officialValue ?? '—'}</td>
                          <td className="text-right px-3 py-2">{item.coefficient}</td>
                          <td className="text-right px-3 py-2 font-mono text-xs">{item.weightedPoints ?? '—'}</td>
                          <td className="text-center px-3 py-2">
                            {item.isIncomplete && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">Incomplet</span>
                            )}
                            {!item.includeInAverage && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">Exclu</span>
                            )}
                            {!item.isIncomplete && item.includeInAverage && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
