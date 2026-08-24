"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Send,
  Lock,
  Eye,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
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
    componentName: string;
    rawValue: number | null;
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

function LockedBadge() {
  return (
    <Badge variant="outline" className="border-0 font-medium bg-success-light text-success">
      <Lock className="inline-block mr-1 h-3 w-3" />
      Verrouillé
    </Badge>
  );
}

// --------------- Component ---------------

export default function BulletinsPublicationPage() {
  // --- Reference data ---
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [periods, setPeriods] = useState<{ id: string; name: string }[]>([]);
  const [refsLoaded, setRefsLoaded] = useState(false);

  // --- Selection ---
  const [selClassroom, setSelClassroom] = useState('');
  const [selPeriod, setSelPeriod] = useState('');

  // --- Table data ---
  const [data, setData] = useState<BulletinRow[]>([]);
  const [pg, setPg] = useState<Pg>({ page: 1, limit: 25, totalItems: 0, totalPages: 1 });
  const [fetching, setFetching] = useState(false);
  const [hasSelected, setHasSelected] = useState(false);

  // --- Detail dialog ---
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<ReportCard | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  // --- Publishing ---
  const [publishing, setPublishing] = useState(false);

  // --------------- Load references ---------------

  const loadRefs = useCallback(async () => {
    if (refsLoaded) return;
    try {
      const [c, y] = await Promise.all([
        fetch('/api/classes?limit=100').then(r => (r.ok ? r.json() : { data: [] })),
        fetch('/api/annees-scolaires?limit=100').then(r => (r.ok ? r.json() : { data: [] })),
      ]);
      setClassrooms(
        (c.data || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })),
      );

      const allPeriods: { id: string; name: string }[] = [];
      for (const year of y.data || []) {
        try {
          const pr = await fetch(`/api/annees-scolaires/${year.id}`);
          if (pr.ok) {
            const jd = await pr.json();
            for (const p of jd.periods || []) {
              allPeriods.push({ id: p.id, name: p.name });
            }
          }
        } catch {
          /* skip */
        }
      }
      setPeriods(allPeriods);
      setRefsLoaded(true);
    } catch {
      /* silent */
    }
  }, [refsLoaded]);

  useEffect(() => {
    void loadRefs();
  }, [loadRefs]);

  // --------------- Load & refresh bulletins ---------------

  const fetchBulletins = useCallback(
    async (page = 1) => {
      if (!selClassroom || !selPeriod) return;
      setFetching(true);
      try {
        // Regenerate via POST to get the latest data
        await fetch('/api/bulletins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classroomId: selClassroom, academicPeriodId: selPeriod }),
        }).catch(() => {/* regeneration failure is non-blocking */ });

        // Then fetch the list
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
        setHasSelected(true);
      } catch {
        toast.error('Erreur de chargement des bulletins.');
      } finally {
        setFetching(false);
      }
    },
    [selClassroom, selPeriod],
  );

  // --------------- Filter: only validated + published ---------------

  const publishableData = data.filter(
    d => d.status === 'validated' || d.status === 'published',
  );

  const validatedCount = data.filter(d => d.status === 'validated').length;
  const publishedCount = data.filter(d => d.status === 'published').length;

  // --------------- Publish all validated ---------------

  const handlePublishAll = async () => {
    if (!selClassroom || !selPeriod || validatedCount === 0) return;
    setPublishing(true);
    try {
      const r = await fetch('/api/bulletins/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'published',
          classroomId: selClassroom,
          academicPeriodId: selPeriod,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || 'Erreur lors de la publication.');
      }
      toast.success(`${validatedCount} bulletin${validatedCount > 1 ? 's' : ''} publié${validatedCount > 1 ? 's' : ''} avec succès.`);
      void fetchBulletins(pg.page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la publication.');
    } finally {
      setPublishing(false);
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
    } catch {
      toast.error('Erreur de chargement du bulletin.');
      setDetailOpen(false);
    } finally {
      setDetailBusy(false);
    }
  };

  // --------------- Render ---------------

  return (
    <div className="space-y-6">
      <PageHeader
        title="Publication des bulletins"
        description="Publiez les bulletins validés par la direction."
      />

      {/* ---- Selector ---- */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Sélection
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label>Classe *</Label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={selClassroom}
              onChange={e => {
                setSelClassroom(e.target.value);
                setHasSelected(false);
                setData([]);
              }}
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
              onChange={e => {
                setSelPeriod(e.target.value);
                setHasSelected(false);
                setData([]);
              }}
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
              onClick={() => fetchBulletins(1)}
              disabled={!selClassroom || !selPeriod || fetching}
              className="w-full"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {fetching ? 'Chargement...' : 'Charger les bulletins'}
            </Button>
          </div>
        </div>
      </div>

      {/* ---- Results ---- */}
      {hasSelected && (
        <>
          {/* Count + publish action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {validatedCount} bulletin{validatedCount !== 1 ? 's' : ''} validé{validatedCount !== 1 ? 's' : ''} prêt{validatedCount !== 1 ? 's' : ''} à publier
              </p>
              {publishedCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {publishedCount} bulletin{publishedCount !== 1 ? 's' : ''} déjà publié{publishedCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            {validatedCount > 0 && (
              <Button
                size="lg"
                onClick={handlePublishAll}
                disabled={publishing}
              >
                <Send className="mr-2 h-5 w-5" />
                {publishing
                  ? 'Publication...'
                  : `Publier tous les bulletins (${validatedCount})`}
              </Button>
            )}
          </div>

          {/* ---- Bulletins Table (validated + published only) ---- */}
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
                render: (row: BulletinRow) =>
                  row.status === 'published' ? <LockedBadge /> : <StatusBadge status={row.status} />,
              },
              {
                key: 'classAverage',
                label: 'Moy. classe',
                render: (row: BulletinRow) => fmt(row.classAverage),
              },
            ]}
            data={publishableData}
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
                    Voir le bulletin
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            emptyMessage="Aucun bulletin validé ou publié pour cette classe et période."
          />
        </>
      )}

      {/* ---- Detail Dialog (read-only) ---- */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Bulletin de {detailData?.studentName ?? '...'}
              {detailData &&
                (detailData.status === 'published' ? (
                  <LockedBadge />
                ) : (
                  <StatusBadge status={detailData.status} />
                ))}
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
                  <p className="text-xs text-muted-foreground font-medium">Min / Max</p>
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
                              {/* Sub-components */}
                              {item.components && item.components.length > 0 && (
                                <div className="ml-3 mt-1 space-y-0.5">
                                  {item.components.map((comp, ci) => (
                                    <p key={ci} className="text-xs text-muted-foreground">
                                      {comp.componentName} : {fmt(comp.rawValue)}
                                    </p>
                                  ))}
                                </div>
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

              {/* --- Comments (read-only) --- */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Commentaires</h4>

                {detailData.teacherComment && (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Appréciation de l&apos;enseignant</Label>
                    <p className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap">
                      {detailData.teacherComment}
                    </p>
                  </div>
                )}

                {detailData.conductComment && (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Conduite et tenue</Label>
                    <p className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap">
                      {detailData.conductComment}
                    </p>
                  </div>
                )}

                {detailData.directorComment && (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Commentaire de la direction</Label>
                    <p className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap">
                      {detailData.directorComment}
                    </p>
                  </div>
                )}

                {!detailData.teacherComment && !detailData.conductComment && !detailData.directorComment && (
                  <p className="text-sm text-muted-foreground">Aucun commentaire.</p>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
