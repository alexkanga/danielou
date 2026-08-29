"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, ClipboardList } from 'lucide-react';
import Link from 'next/link';

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface StudentRow {
  enrollmentId: string; studentId: string; firstName: string; lastName: string;
  matricule: string | null; gradeId: string | null; gradeRawValue: string | null;
  gradeStatus: string; gradeComment: string | null;
}

interface AssessmentInfo {
  id: string; title: string; scale: string; coefficient: string;
  status: string; subjectName: string | null; classroomName: string | null;
}

type GradeInput = {
  enrollmentId: string; rawValue: number | null; status: string; comment: string | null;
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Attente', short: '\u2014', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  { value: 'graded', label: 'Noté', short: null, color: '' },
  { value: 'absent_excused', label: 'Absent justifié', short: 'AJ', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  { value: 'absent_unexcused', label: 'Absent injustifié', short: 'AIJ', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'exempt', label: 'Exempté', short: 'EX', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'not_evaluated', label: 'Non évalué', short: 'NE', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' },
];

const NON_NUMERIC = new Set(['absent_excused', 'absent_unexcused', 'exempt', 'not_evaluated']);

/* ------------------------------------------------------------------
   Dirty detection helper
   ------------------------------------------------------------------ */

function gradeInputKey(g: GradeInput): string {
  return `${g.enrollmentId}:${g.rawValue}:${g.status}:${g.comment ?? ''}`;
}

function gradesFingerprint(gs: Record<string, GradeInput>): string {
  const keys = Object.keys(gs).sort();
  return keys.map(k => gradeInputKey(gs[k])).join('|');
}

/* ------------------------------------------------------------------
   Page
   ------------------------------------------------------------------ */

export default function SaisieNotesPage() {
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('assessmentId') || '';

  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [grades, setGrades] = useState<Record<string, GradeInput>>({});
  const [baselineGrades, setBaselineGrades] = useState<Record<string, GradeInput>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openAssessments, setOpenAssessments] = useState<{ id: string; title: string; subjectName: string | null; classroomName: string | null }[]>([]);

  /* ---- dirty detection ---- */
  const isDirty = useMemo(() => {
    return gradesFingerprint(grades) !== gradesFingerprint(baselineGrades);
  }, [grades, baselineGrades]);

  /* ---- fetch assessment students ---- */
  const loadStudents = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/evaluations/${assessmentId}/students`);
      if (!r.ok) throw new Error();
      const j = await r.json();
      setAssessment(j.assessment);
      setStudents(j.students);
      // Initialize grades from existing
      const g: Record<string, GradeInput> = {};
      for (const s of j.students) {
        g[s.enrollmentId] = {
          enrollmentId: s.enrollmentId,
          rawValue: s.gradeRawValue ? parseFloat(s.gradeRawValue) : null,
          status: s.gradeStatus || 'pending',
          comment: s.gradeComment || null,
        };
      }
      setGrades(g);
      setBaselineGrades(g);
    } catch { toast.error('Erreur de chargement.'); } finally { setLoading(false); }
  }, [assessmentId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadStudents(); }, [loadStudents]);

  /* ---- fetch open assessments for selector ---- */
  useEffect(() => {
    if (assessmentId) return;
    (async () => {
      try {
        const r = await fetch('/api/evaluations?status=open&limit=100');
        if (r.ok) { const j = await r.json(); setOpenAssessments(j.data || []); }
      } catch { /* */ }
    })();
  }, [assessmentId]);

  /* ---- grade helpers ---- */
  const updateGrade = (enrollmentId: string, patch: Partial<GradeInput>) => {
    setGrades(prev => {
      const cur = prev[enrollmentId] || { enrollmentId, rawValue: null, status: 'pending', comment: null };
      const next = { ...cur, ...patch };
      // If setting a numeric value, force status to graded
      if (patch.rawValue !== undefined && patch.rawValue !== null) {
        next.status = 'graded';
      }
      return { ...prev, [enrollmentId]: next };
    });
  };

  const setStatus = (enrollmentId: string, status: string) => {
    if (NON_NUMERIC.has(status)) {
      updateGrade(enrollmentId, { status, rawValue: null });
    } else {
      updateGrade(enrollmentId, { status });
    }
  };

  /* ---- cancel modifications (UX-1) ---- */
  const handleCancel = () => {
    setGrades({ ...baselineGrades });
  };

  /* ---- save ---- */
  const handleSave = async () => {
    if (!assessmentId) return;
    setSaving(true);
    try {
      const gradesList = Object.values(grades);
      const r = await fetch('/api/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId, grades: gradesList }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Erreur'); }
      const j = await r.json();
      toast.success(`Notes enregistrées. ${j.errors?.length ? j.errors.length + ' erreur(s).' : ''}`);
      // loadStudents will set both grades and baselineGrades to the new saved state
      void loadStudents();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erreur'); } finally { setSaving(false); }
  };

  const scale = assessment ? parseInt(assessment.scale, 10) : 20;

  /* ---- render ---- */
  if (!assessmentId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Saisie des notes</h1>
        {openAssessments.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Sélectionnez une évaluation ouverte :</p>
            {openAssessments.map(a => (
              <a key={a.id} href={`/dashboard/saisie-notes?assessmentId=${a.id}`}
                className="block p-4 border rounded-lg hover:bg-accent transition-colors">
                <span className="font-medium">{a.title}</span>
                <span className="text-sm text-muted-foreground ml-2">{a.subjectName ?? ''} — {a.classroomName ?? ''}</span>
              </a>
            ))}
          </div>
        ) : (
          /* UX-4: Improved empty state */
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">Aucune évaluation ouverte.</p>
            <p className="mt-2 text-sm text-muted-foreground">Pour saisir ou modifier des notes, ouvrez d&apos;abord une évaluation.</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/dashboard/evaluations">Voir les évaluations</Link>
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96" />
        <div className="space-y-2"> {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{assessment?.title ?? 'Évaluation'}</h1>
          <p className="text-sm text-muted-foreground">
            {assessment?.subjectName ?? ''} — {assessment?.classroomName ?? ''} — Barème /{scale} — Coeff. {assessment?.coefficient ?? '1'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={handleCancel} disabled={!isDirty || saving}>
            Annuler les modifications
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {/* grade table */}
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted z-10">
            <tr>
              <th className="text-left px-3 py-2 font-medium min-w-[150px]">Élève</th>
              <th className="text-left px-3 py-2 font-medium min-w-[80px]">Matricule</th>
              <th className="text-center px-3 py-2 font-medium min-w-[100px]">Note /{scale}</th>
              <th className="text-center px-3 py-2 font-medium">Statut</th>
              <th className="text-left px-3 py-2 font-medium min-w-[150px]">Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => {
              const g = grades[s.enrollmentId] || { rawValue: null, status: 'pending', comment: null };
              const isNonNumeric = NON_NUMERIC.has(g.status);
              return (
                <tr key={s.enrollmentId} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                  <td className="px-3 py-2 font-medium">{s.lastName} {s.firstName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.matricule ?? '—'}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number" min={0} max={scale} step="0.01"
                      className="w-full text-center border rounded px-2 py-1 bg-background"
                      value={g.rawValue !== null ? g.rawValue : ''}
                      placeholder="—"
                      disabled={isNonNumeric}
                      onChange={e => {
                        const v = e.target.value;
                        updateGrade(s.enrollmentId, { rawValue: v === '' ? null : parseFloat(v) });
                      }}
                    />
                  </td>
                  <td className="px-3 py-1">
                    <div className="flex gap-1 justify-center flex-wrap">
                      {STATUS_OPTIONS.filter(o => o.short).map(o => (
                        <button
                          key={o.value}
                          type="button"
                          className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${o.color} ${g.status === o.value ? 'ring-2 ring-primary' : 'opacity-60 hover:opacity-100'}`}
                          onClick={() => setStatus(s.enrollmentId, o.value)}
                        >
                          {o.short}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text" className="w-full border rounded px-2 py-1 bg-background text-sm"
                      value={g.comment ?? ''}
                      placeholder="Commentaire..."
                      onChange={e => updateGrade(s.enrollmentId, { comment: e.target.value || null })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {students.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">Aucun élève éligible pour cette évaluation.</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleCancel} disabled={!isDirty || saving} size="lg">
          Annuler les modifications
        </Button>
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="mr-2 h-4 w-4" /> {saving ? 'Enregistrement...' : 'Enregistrer toutes les notes'}
        </Button>
      </div>
    </div>
  );
}
