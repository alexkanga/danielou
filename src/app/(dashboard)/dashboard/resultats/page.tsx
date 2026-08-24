"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ReportCardItem {
  id: string;
  subjectName: string;
  rawValue: string | null;
  officialValue: string | null;
  coefficient: string | null;
  weightedPoints: string | null;
  includeInAverage: boolean;
  isIncomplete: boolean;
  components?: { componentName: string; rawValue: string | null }[];
}

interface ReportCard {
  id: string;
  studentId: string;
  status: string;
  generalAverageOfficial: string | null;
  generalAverageRaw: string | null;
  rank: number | null;
  totalStudentsRanked: number | null;
  classAverage: string | null;
  minClassAverage: string | null;
  maxClassAverage: string | null;
  roundingStrategy: string | null;
  generalAverageInputPolicy: string | null;
  subjectDecimalPlaces: number | null;
  generalDecimalPlaces: number | null;
  teacherComment: string | null;
  directorComment: string | null;
  conductComment: string | null;
  publishedAt: string | null;
  items: ReportCardItem[];
}

interface ResultRow {
  id: string;
  studentName: string;
  generalAverageOfficial: string | null;
  generalAverageRaw: string | null;
  rank: number | null;
  totalStudentsRanked: number | null;
  classAverage: string | null;
  status: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  ready: { label: 'Prêt', color: 'bg-blue-100 text-blue-700' },
  validated: { label: 'Validé', color: 'bg-green-100 text-green-700' },
  published: { label: 'Publié', color: 'bg-purple-100 text-purple-700' },
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function ResultatsPage() {
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [periods, setPeriods] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCard, setDetailCard] = useState<ReportCard | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, y] = await Promise.all([
          fetch('/api/classes?limit=100').then(r => r.ok ? r.json() : { data: [] }),
          fetch('/api/annees-scolaires?limit=100').then(r => r.ok ? r.json() : { data: [] }),
        ]);
        setClassrooms((c.data || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
        const allPeriods: { id: string; name: string }[] = [];
        for (const year of (y.data || []) as { id: string }[]) {
          try {
            const pr = await fetch(`/api/annees-scolaires/${year.id}`);
            if (pr.ok) {
              const jd = await pr.json();
              for (const p of (jd.periods || []) as { id: string; name: string }[]) allPeriods.push(p);
            }
          } catch { /* skip */ }
        }
        setPeriods(allPeriods);
      } catch { /* silent */ }
    })();
  }, []);

  const loadResults = useCallback(async () => {
    if (!selectedClass || !selectedPeriod) return;
    setBusy(true);
    try {
      const r = await fetch('/api/bulletins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId: selectedClass, academicPeriodId: selectedPeriod }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json() as { created: number; updated: number; errors: string[] };
      toast.info(`${data.created} créés, ${data.updated} mis à jour.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally { setBusy(false); }
  }, [selectedClass, selectedPeriod]);

  const openDetail = async (id: string) => {
    try {
      const r = await fetch(`/api/bulletins/${id}`);
      if (!r.ok) throw new Error();
      setDetailCard(await r.json() as ReportCard);
      setDetailOpen(true);
    } catch {
      toast.error('Erreur de chargement.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Résultats"
        description="Consultez les moyennes générales, rangs et statistiques par classe."
      />

      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-2">
          <Label>Classe</Label>
          <select
            className="w-56 border rounded-md px-3 py-2 text-sm bg-background"
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
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
            onChange={e => setSelectedPeriod(e.target.value)}
          >
            <option value="">— Choisir —</option>
            {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <Button onClick={() => { void loadResults(); }} disabled={busy || !selectedClass || !selectedPeriod}>
          {busy ? 'Chargement...' : 'Afficher les résultats'}
        </Button>
      </div>

      <DataTable
        columns={[
          { key: 'studentName', label: 'Élève' },
          { key: 'generalAverageOfficial', label: 'Moy. générale', render: (i: ResultRow) => (
            <span className="font-mono font-medium">{i.generalAverageOfficial ?? '—'}</span>
          )},
          { key: 'generalAverageRaw', label: 'Brute', render: (i: ResultRow) => (
            <span className="font-mono text-xs text-muted-foreground">{i.generalAverageRaw ?? '—'}</span>
          )},
          { key: 'rank', label: 'Rang', render: (i: ResultRow) => (
            i.rank != null
              ? <span className="font-medium">{i.rank}<span className="text-muted-foreground font-normal">/{i.totalStudentsRanked ?? '?'}</span></span>
              : '—'
          )},
          { key: 'classAverage', label: 'Moy. classe', render: (i: ResultRow) => i.classAverage ?? '—' },
          { key: 'status', label: 'Statut', render: (i: ResultRow) => {
            const s = STATUS_MAP[i.status] ?? { label: i.status, color: 'bg-gray-100 text-gray-700' };
            return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
          }},
        ]}
        data={rows}
        getId={(i: ResultRow) => i.id}
        onRowClick={(i: ResultRow) => openDetail(i.id)}
        actions={(item: ResultRow) => (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(item.id)}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
        emptyMessage="Sélectionnez une classe et une période pour afficher les résultats."
      />

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Résultats détaillés</DialogTitle>
          </DialogHeader>
          {detailCard && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Moy. officielle</div>
                  <div className="text-xl font-bold">{detailCard.generalAverageOfficial ?? '—'}</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Rang</div>
                  <div className="text-xl font-bold">
                    {detailCard.rank != null ? `${detailCard.rank}/${detailCard.totalStudentsRanked ?? '?'}` : '—'}
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Moy. classe</div>
                  <div className="text-xl font-bold">{detailCard.classAverage ?? '—'}</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Min / Max</div>
                  <div className="text-xl font-bold">{detailCard.minClassAverage ?? '—'} / {detailCard.maxClassAverage ?? '—'}</div>
                </div>
              </div>

              {/* Traceability info */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Politique: {detailCard.generalAverageInputPolicy ?? '—'} · Arrondi: {detailCard.roundingStrategy ?? '—'} · Décimales sujet: {detailCard.subjectDecimalPlaces ?? '—'} · Décimales général: {detailCard.generalDecimalPlaces ?? '—'}</p>
              </div>

              {/* Subjects table */}
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
                    {detailCard.items.map(item => (
                      <>
                        <tr key={item.id} className="border-t">
                          <td className="px-3 py-2 font-medium">{item.subjectName}</td>
                          <td className="text-right px-3 py-2 font-mono text-xs">{item.rawValue ?? '—'}</td>
                          <td className="text-right px-3 py-2 font-mono text-xs">{item.officialValue ?? '—'}</td>
                          <td className="text-right px-3 py-2">{item.coefficient ?? '—'}</td>
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
                        {item.components?.map(comp => (
                          <tr key={comp.componentName} className="border-t bg-muted/20">
                            <td className="px-3 py-1.5 pl-6 text-xs text-muted-foreground">{comp.componentName}</td>
                            <td className="text-right px-3 py-1.5 font-mono text-xs text-muted-foreground">{comp.rawValue ?? '—'}</td>
                            <td colSpan={4} />
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Comments */}
              {(detailCard.teacherComment || detailCard.directorComment || detailCard.conductComment) && (
                <div className="space-y-2 text-sm">
                  {detailCard.teacherComment && (
                    <div><span className="font-medium">Professeur:</span> {detailCard.teacherComment}</div>
                  )}
                  {detailCard.directorComment && (
                    <div><span className="font-medium">Direction:</span> {detailCard.directorComment}</div>
                  )}
                  {detailCard.conductComment && (
                    <div><span className="font-medium">Conduite:</span> {detailCard.conductComment}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
