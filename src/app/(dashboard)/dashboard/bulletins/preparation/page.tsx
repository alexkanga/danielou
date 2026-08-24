"use client";

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  FileText, Send, MoreHorizontal, Eye, AlertTriangle,
} from 'lucide-react';

// --------------- Types ---------------

interface BulletinItem {
  id: string;
  subjectId: string;
  subjectName: string;
  rawValue: number | null;
  officialValue: number | null;
  coefficient: number;
  weightedPoints: number | null;
  includeInAverage: boolean;
  isIncomplete: boolean;
  components?: {
    id: string;
    componentName: string;
    rawValue: number | null;
    coefficient: number;
  }[];
}

interface ReportCard {
  id: string;
  studentId: string;
  studentName?: string;
  status: 'draft' | 'ready' | 'validated' | 'published';
  generalAverageOfficial: number | null;
  generalAverageRaw: number | null;
  rank: number | null;
  totalStudentsRanked: number | null;
  classAverage: number | null;
  minClassAverage: number | null;
  maxClassAverage: number | null;
  roundingStrategy: string | null;
  generalAverageInputPolicy: string | null;
  subjectDecimalPlaces: number | null;
  generalDecimalPlaces: number | null;
  teacherComment: string | null;
  directorComment: string | null;
  conductComment: string | null;
  conductGrade: string | null;
  items: BulletinItem[];
}

interface BulletinRow {
  id: string;
  studentId: string;
  studentName: string;
  status: 'draft' | 'ready' | 'validated' | 'published';
  generalAverageOfficial: number | null;
  rank: number | null;
  totalStudentsRanked: number | null;
  classAverage: number | null;
}

interface Pg {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

// --------------- Helpers ---------------

function fmt(n: number | null, decimals = 2): string {
  if (n === null || n === undefined) return '—';
  return n.toFixed(decimals);
}

// --------------- Component ---------------

export default function BulletinsPreparationPage() {
  // --- Reference data ---
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [periods, setPeriods] = useState<{ id: string; name: string }[]>([]);
  const refsLoadedRef = useRef(false);

  // --- Generation form ---
  const [selClassroom, setSelClassroom] = useState('');
  const [selPeriod, setSelPeriod] = useState('');
  const [generating, setGenerating] = useState(false);

  // --- Table data ---
  const [data, setData] = useState<BulletinRow[]>([]);
  const [pg, setPg] = useState<Pg>({ page: 1, limit: 25, totalItems: 0, totalPages: 1 });
  const [fetching, setFetching] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // --- Detail dialog ---
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<ReportCard | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [editTeacherComment, setEditTeacherComment] = useState('');
  const [editConductComment, setEditConductComment] = useState('');
  const [savingComments, setSavingComments] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // --- Bulk action ---
  const [bulkBusy, setBulkBusy] = useState(false);

  // --------------- Load references ---------------

  useEffect(() => {
    if (refsLoadedRef.current) return;
    refsLoadedRef.current = true;
    let cancelled = false;

    Promise.all([
      fetch('/api/classes?limit=100').then(r => (r.ok ? r.json() : { data: [] })),
      fetch('/api/annees-scolaires?limit=100').then(r => (r.ok ? r.json() : { data: [] })),
    ])
      .then(([c, y]) => {
        if (cancelled) return;
        setClassrooms(
          (c.data || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })),
        );

        const allPeriods: { id: string; name: string }[] = [];
        const yearList = y.data || [];
        const periodPromises = yearList.map((year: { id: string }) =>
          fetch(`/api/annees-scolaires/${year.id}`)
            .then(pr => (pr.ok ? pr.json() : { periods: [] }))
            .then(jd => jd.periods || [])
            .catch(() => []),
        );
        Promise.all(periodPromises).then(periodBatches => {
          if (cancelled) return;
          for (const batch of periodBatches) {
            for (const p of batch) {
              allPeriods.push({ id: p.id, name: p.name });
            }
          }
          setPeriods(allPeriods);
        });
      })
      .catch(() => { /* silent */ });

    return () => { cancelled = true; };
  }, []);

  // --------------- Generate bulletins ---------------

  const handleGenerate = async () => {
    if (!selClassroom || !selPeriod) {
      toast.error('Veuillez sélectionner une classe et une période.');
      return;
    }
    setGenerating(true);
    try {
      const r = await fetch('/api/bulletins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId: selClassroom, academicPeriodId: selPeriod }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || 'Erreur lors de la génération.');
      }
      const j = await r.json();
      const parts: string[] = [];
      if (j.created) parts.push(`${j.created} créé${j.created > 1 ? 's' : ''}`);
      if (j.updated) parts.push(`${j.updated} mis à jour`);
      if (parts.length) toast.success(`Bulletins générés : ${parts.join(', ')}.`);
      if (j.errors?.length) {
        for (const err of j.errors.slice(0, 3)) {
          toast.error(err);
        }
      }
      setHasGenerated(true);
      void fetchBulletins(1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la génération.');
    } finally {
      setGenerating(false);
    }
  };

  // --------------- Fetch bulletins for table ---------------

  const fetchBulletins = async (page = 1) => {
    if (!selClassroom || !selPeriod) return;
    setFetching(true);
    try {
      const p = new URLSearchParams({
        classroomId: selClassroom,
        academicPeriodId: selPeriod,
        page: String(page),
        limit: '25',
      });
      const r = await fetch(`/api/bulletins?${p}`);
      if (!r.ok) throw new Error();
      const j = await r.json();
      setData(j.data || []);
      setPg(j.pagination || { page: 1, limit: 25, totalItems: 0, totalPages: 1 });
    } catch {
      toast.error('Erreur de chargement des bulletins.');
    } finally {
      setFetching(false);
    }
  };

  // --------------- Open detail dialog ---------------

  const openDetail = async (row: BulletinRow) => {
    setDetailBusy(true);
    setDetailOpen(true);
    try {
      const r = await fetch(`/api/bulletins/${row.id}`);
      if (!r.ok) throw new Error();
      const j: ReportCard = await r.json();
      setDetailData(j);
      setEditTeacherComment(j.teacherComment || '');
      setEditConductComment(j.conductComment || '');
    } catch {
      toast.error('Erreur de chargement du bulletin.');
      setDetailOpen(false);
    } finally {
      setDetailBusy(false);
    }
  };

  // --------------- Save comments ---------------

  const handleSaveComments = async () => {
    if (!detailData) return;
    setSavingComments(true);
    try {
      const r = await fetch(`/api/bulletins/${detailData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherComment: editTeacherComment || null,
          conductComment: editConductComment || null,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || 'Erreur');
      }
      toast.success('Commentaires enregistrés.');
      // Refresh detail
      const refreshed = await fetch(`/api/bulletins/${detailData.id}`);
      if (refreshed.ok) {
        const j: ReportCard = await refreshed.json();
        setDetailData(j);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSavingComments(false);
    }
  };

  // --------------- Individual transition draft → ready ---------------

  const handleTransition = async (id: string) => {
    setTransitioning(true);
    try {
      const r = await fetch(`/api/bulletins/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ready' }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || 'Erreur');
      }
      toast.success('Bulletin envoyé en validation.');
      setDetailOpen(false);
      void fetchBulletins(pg.page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setTransitioning(false);
    }
  };

  // --------------- Bulk transition ---------------

  const handleBulkTransition = async () => {
    if (!selClassroom || !selPeriod) return;
    setBulkBusy(true);
    try {
      const r = await fetch('/api/bulletins/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ready',
          classroomId: selClassroom,
          academicPeriodId: selPeriod,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || 'Erreur');
      }
      toast.success('Tous les brouillons ont été envoyés en validation.');
      void fetchBulletins(pg.page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBulkBusy(false);
    }
  };

  // --------------- Draft count for bulk action ---------------

  const draftCount = data.filter(d => d.status === 'draft').length;

  // --------------- Render ---------------

  return (
    <div className="space-y-6">
      <PageHeader
        title="Préparation des bulletins"
        description="Générez et révisez les bulletins avant envoi à la direction."
      />

      {/* ---- Generation Form ---- */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Génération
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label>Classe *</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={selClassroom}
              onChange={e => setSelClassroom(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Période *</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={selPeriod}
              onChange={e => setSelPeriod(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Button
              onClick={handleGenerate}
              disabled={generating || !selClassroom || !selPeriod}
              className="w-full"
            >
              <FileText className="mr-2 h-4 w-4" />
              {generating ? 'Génération...' : 'Générer les bulletins'}
            </Button>
          </div>
        </div>
      </div>

      {/* ---- Bulletins Table ---- */}
      {hasGenerated && (
        <>
          {draftCount > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {draftCount} bulletin{draftCount > 1 ? 's' : ''} en brouillon
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkTransition}
                disabled={bulkBusy}
              >
                <Send className="mr-2 h-4 w-4" />
                {bulkBusy
                  ? 'Envoi...'
                  : `Tout envoyer en validation (${draftCount})`}
              </Button>
            </div>
          )}

          <DataTable
            columns={[
              {
                key: 'studentName',
                label: 'Élève',
              },
              {
                key: 'generalAverageOfficial',
                label: 'Moy. générale',
                render: (row: BulletinRow) => fmt(row.generalAverageOfficial),
              },
              {
                key: 'rank',
                label: 'Rang',
                render: (row: BulletinRow) =>
                  row.rank !== null && row.totalStudentsRanked
                    ? `${row.rank}/${row.totalStudentsRanked}`
                    : '—',
              },
              {
                key: 'status',
                label: 'Statut',
                render: (row: BulletinRow) => <StatusBadge status={row.status} />,
              },
              {
                key: 'classAverage',
                label: 'Moy. classe',
                render: (row: BulletinRow) => fmt(row.classAverage),
              },
            ]}
            data={data}
            pagination={pg}
            onPageChange={p => fetchBulletins(p)}
            getId={(row: BulletinRow) => row.id}
            onRowClick={(row: BulletinRow) => openDetail(row)}
            actions={(row: BulletinRow) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openDetail(row)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Voir le détail
                  </DropdownMenuItem>
                  {row.status === 'draft' && (
                    <DropdownMenuItem onClick={() => handleTransition(row.id)}>
                      <Send className="mr-2 h-4 w-4" />
                      Envoyer en validation
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            emptyMessage="Aucun bulletin trouvé pour cette classe et période."
          />
        </>
      )}

      {/* ---- Detail Dialog ---- */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Bulletin de {detailData?.studentName ?? '...'}
              {detailData && <StatusBadge status={detailData.status} />}
            </DialogTitle>
          </DialogHeader>

          {detailBusy ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Chargement…
            </div>
          ) : detailData ? (
            <div className="space-y-6">
              {/* --- Summary cards --- */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-lg border bg-muted/50 p-3 text-center space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Moy. officielle</p>
                  <p className="text-xl font-bold">
                    {fmt(detailData.generalAverageOfficial)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3 text-center space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Rang</p>
                  <p className="text-xl font-bold">
                    {detailData.rank !== null && detailData.totalStudentsRanked
                      ? `${detailData.rank}/${detailData.totalStudentsRanked}`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3 text-center space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Moy. classe</p>
                  <p className="text-xl font-bold">{fmt(detailData.classAverage)}</p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3 text-center space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    Min / Max
                  </p>
                  <p className="text-lg font-bold">
                    {fmt(detailData.minClassAverage)} / {fmt(detailData.maxClassAverage)}
                  </p>
                </div>
              </div>

              {/* --- Subject table --- */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Détail par matière</h4>
                <div className="rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left px-3 py-2 font-medium">Matière</th>
                          <th className="text-right px-3 py-2 font-medium">Brut</th>
                          <th className="text-right px-3 py-2 font-medium">Officiel</th>
                          <th className="text-right px-3 py-2 font-medium">Coeff.</th>
                          <th className="text-right px-3 py-2 font-medium">Points</th>
                          <th className="text-center px-3 py-2 font-medium">Inc.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.items.map(item => (
                          <tr
                            key={item.id}
                            className="border-b last:border-b-0 hover:bg-muted/30"
                          >
                            <td className="px-3 py-2 font-medium">
                              {item.subjectName}
                              {item.isIncomplete && (
                                <AlertTriangle className="inline-block ml-1.5 h-3.5 w-3.5 text-amber-500" />
                              )}
                            </td>
                            <td className="text-right px-3 py-2">
                              {fmt(item.rawValue)}
                            </td>
                            <td className="text-right px-3 py-2">
                              {fmt(item.officialValue)}
                            </td>
                            <td className="text-right px-3 py-2">
                              {item.coefficient}
                            </td>
                            <td className="text-right px-3 py-2">
                              {fmt(item.weightedPoints)}
                            </td>
                            <td className="text-center px-3 py-2">
                              {item.isIncomplete ? (
                                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                              ) : (
                                <span className="inline-block h-2 w-2 rounded-full bg-transparent" />
                              )}
                            </td>
                          </tr>
                        ))}
                        {detailData.items.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-3 py-6 text-center text-muted-foreground"
                            >
                              Aucune matière
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* --- Comments --- */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Commentaires</h4>
                <div className="space-y-2">
                  <Label>Appréciation de l&apos;enseignant</Label>
                  <Textarea
                    value={editTeacherComment}
                    onChange={e => setEditTeacherComment(e.target.value)}
                    placeholder="Commentaire du conseil de classe..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conduite et tenue</Label>
                  <Textarea
                    value={editConductComment}
                    onChange={e => setEditConductComment(e.target.value)}
                    placeholder="Appréciation sur la conduite..."
                    rows={2}
                  />
                </div>
                {detailData.directorComment && (
                  <div className="space-y-2">
                    <Label>Commentaire de la direction</Label>
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                      {detailData.directorComment}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Fermer
            </Button>
            {detailData && detailData.status === 'draft' && (
              <Button
                onClick={() => handleTransition(detailData.id)}
                disabled={transitioning}
              >
                <Send className="mr-2 h-4 w-4" />
                {transitioning ? 'Envoi...' : 'Envoyer en validation'}
              </Button>
            )}
            <Button
              onClick={handleSaveComments}
              disabled={savingComments || detailBusy}
            >
              {savingComments ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
