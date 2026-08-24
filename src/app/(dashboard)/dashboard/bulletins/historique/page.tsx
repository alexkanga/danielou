"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Eye, Lock, AlertTriangle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// --------------- Types ---------------

type BulletinStatus = 'draft' | 'ready' | 'validated' | 'published';

type TabFilter = 'all' | BulletinStatus;

interface BulletinItem {
  id: string;
  subjectName: string;
  rawValue: number | null;
  officialValue: number | null;
  coefficient: number;
  weightedPoints: number | null;
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
  status: BulletinStatus;
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
  publishedAt: string | null;
  items: BulletinItem[];
}

interface BulletinRow {
  id: string;
  studentId: string;
  studentName: string;
  status: BulletinStatus;
  generalAverageOfficial: number | null;
  rank: number | null;
  totalStudentsRanked: number | null;
  classAverage: number | null;
  publishedAt: string | null;
}

interface Pg {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

// --------------- Status badge config ---------------

const STATUS_CONFIG: Record<BulletinStatus | 'all', { label: string; className: string }> = {
  all: { label: 'Tous', className: '' },
  draft: { label: 'Brouillon', className: 'bg-muted text-muted-foreground' },
  ready: { label: 'Prêt', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  validated: { label: 'Validé', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  published: { label: 'Publié', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
};

function HistoriqueStatusBadge({ status }: { status: BulletinStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn('border-0 font-medium', config.className)}>
      {status === 'published' && <Lock className="inline-block mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

// --------------- Tab filters ---------------

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'draft', label: 'Brouillons' },
  { key: 'ready', label: 'Prêts' },
  { key: 'validated', label: 'Validés' },
  { key: 'published', label: 'Publiés' },
];

// --------------- Helpers ---------------

function fmt(n: number | null, decimals = 2): string {
  if (n === null || n === undefined) return '—';
  return n.toFixed(decimals);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDateShort(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// --------------- Component ---------------

export default function BulletinsHistoriquePage() {
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

  // --- Tab filter ---
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  // --- Search ---
  const [search, setSearch] = useState('');

  // --- Detail dialog ---
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<ReportCard | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

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

  // --------------- Fetch bulletins ---------------

  const fetchBulletins = useCallback(
    async (page = 1) => {
      if (!selClassroom || !selPeriod) return;
      setFetching(true);
      try {
        // Regenerate via POST to ensure latest data
        await fetch('/api/bulletins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classroomId: selClassroom, academicPeriodId: selPeriod }),
        }).catch(() => { /* non-blocking */ });

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
        setActiveTab('all');
        setSearch('');
      } catch {
        toast.error('Erreur de chargement des bulletins.');
      } finally {
        setFetching(false);
      }
    },
    [selClassroom, selPeriod],
  );

  // --------------- Derived / filtered data ---------------

  const classroomName = classrooms.find(c => c.id === selClassroom)?.name ?? '—';
  const periodName = periods.find(p => p.id === selPeriod)?.name ?? '—';

  const filteredData = data.filter(row => {
    if (activeTab !== 'all' && row.status !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      return row.studentName.toLowerCase().includes(q);
    }
    return true;
  });

  // Counts per tab
  const tabCounts: Record<TabFilter, number> = {
    all: data.length,
    draft: data.filter(d => d.status === 'draft').length,
    ready: data.filter(d => d.status === 'ready').length,
    validated: data.filter(d => d.status === 'validated').length,
    published: data.filter(d => d.status === 'published').length,
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
        title="Historique des bulletins"
        description="Consultez tous les bulletins par classe et période, quel que soit leur statut."
      />

      {/* ---- Selector ---- */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Filtres
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label>Classe</Label>
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
            <Label>Période</Label>
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
              <Search className="mr-2 h-4 w-4" />
              {fetching ? 'Chargement...' : 'Afficher les bulletins'}
            </Button>
          </div>
        </div>
      </div>

      {/* ---- Results ---- */}
      {hasSelected && (
        <>
          {/* ---- Tab filters ---- */}
          <div className="flex flex-wrap gap-2">
            {TABS.map(tab => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  activeTab === tab.key &&
                    tab.key === 'published' &&
                    'bg-purple-600 hover:bg-purple-700 text-white border-purple-600',
                  activeTab === tab.key &&
                    tab.key === 'ready' &&
                    'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
                  activeTab === tab.key &&
                    tab.key === 'validated' &&
                    'bg-green-600 hover:bg-green-700 text-white border-green-600',
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-xs opacity-70">({tabCounts[tab.key]})</span>
              </Button>
            ))}
          </div>

          {/* ---- Student search ---- */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un élève..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border rounded-md pl-9 pr-3 py-2 text-sm bg-background"
            />
          </div>

          {/* ---- Bulletins Table ---- */}
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
                render: (row: BulletinRow) => <HistoriqueStatusBadge status={row.status} />,
              },
              {
                key: 'classroom',
                label: 'Classe',
                render: () => classroomName,
              },
              {
                key: 'period',
                label: 'Période',
                render: () => periodName,
              },
              {
                key: 'publishedAt',
                label: 'Date publication',
                render: (row: BulletinRow) =>
                  row.status === 'published' && row.publishedAt ? (
                    <span className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-300">
                      <Lock className="h-3 w-3" />
                      {formatDateShort(row.publishedAt)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
              },
            ]}
            data={filteredData}
            pagination={pg}
            onPageChange={p => fetchBulletins(p)}
            getId={(row: BulletinRow) => row.id}
            actions={(row: BulletinRow) => (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openDetail(row)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            emptyMessage={
              activeTab !== 'all'
                ? `Aucun bulletin avec le statut « ${STATUS_CONFIG[activeTab].label} ».`
                : 'Aucun bulletin trouvé pour cette classe et période.'
            }
          />
        </>
      )}

      {/* ---- Detail Dialog (read-only) ---- */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 flex-wrap">
              <span>Bulletin de {detailData?.studentName ?? '...'}</span>
              {detailData && <HistoriqueStatusBadge status={detailData.status} />}
            </DialogTitle>
            {detailData?.status === 'published' && detailData.publishedAt && (
              <p className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1.5 mt-1">
                <Lock className="h-3.5 w-3.5" />
                Publié le {formatDate(detailData.publishedAt)}
              </p>
            )}
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
