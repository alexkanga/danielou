"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CheckCircle, ArrowLeft, Eye, Send, RotateCcw, MoreHorizontal } from 'lucide-react';

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
  components?: { componentName: string; rawValue: string | null; coefficient: string | null }[];
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
  teacherComment: string | null;
  directorComment: string | null;
  conductComment: string | null;
  conductGrade: string | null;
  publishedAt: string | null;
  roundingStrategy: string | null;
  generalAverageInputPolicy: string | null;
  items: ReportCardItem[];
}

interface BulletinRow {
  id: string;
  studentName: string;
  generalAverageOfficial: string | null;
  rank: number | null;
  totalStudentsRanked: number | null;
  classAverage: string | null;
  status: string;
  teacherComment: string | null;
  directorComment: string | null;
}

// ─────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  ready: { label: 'Prêt', color: 'bg-blue-100 text-blue-700' },
  validated: { label: 'Validé', color: 'bg-green-100 text-green-700' },
  published: { label: 'Publié', color: 'bg-purple-100 text-purple-700' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function BulletinValidationPage() {
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [periods, setPeriods] = useState<{ id: string; name: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [rows, setRows] = useState<BulletinRow[]>([]);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCard, setDetailCard] = useState<ReportCard | null>(null);
  const [directorComment, setDirectorComment] = useState('');
  const [confirmPublish, setConfirmPublish] = useState(false);

  // Load reference data
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
              for (const p of (jd.periods || []) as { id: string; name: string }[]) {
                allPeriods.push(p);
              }
            }
          } catch { /* skip */ }
        }
        setPeriods(allPeriods);
      } catch { /* silent */ }
    })();
  }, []);

  const loadReportCards = useCallback(async () => {
    if (!selectedClass || !selectedPeriod) return;
    setBusy(true);
    try {
      const gen = await fetch('/api/bulletins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId: selectedClass, academicPeriodId: selectedPeriod }),
      });
      if (!gen.ok) throw new Error();
      const genData = await gen.json() as { created: number; updated: number; errors: string[] };
      toast.info(`${genData.created} créés, ${genData.updated} mis à jour, ${genData.errors.length} erreurs.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  }, [selectedClass, selectedPeriod]);

  const handleLoad = () => { void loadReportCards(); };

  const openDetail = async (id: string) => {
    try {
      const r = await fetch(`/api/bulletins/${id}`);
      if (!r.ok) throw new Error();
      const card = await r.json() as ReportCard;
      setDetailCard(card);
      setDirectorComment(card.directorComment ?? '');
      setDetailOpen(true);
    } catch {
      toast.error('Erreur de chargement du bulletin.');
    }
  };

  const saveComment = async () => {
    if (!detailCard) return;
    try {
      const r = await fetch(`/api/bulletins/${detailCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directorComment }),
      });
      if (!r.ok) throw new Error();
      toast.success('Commentaire enregistré.');
      setDetailCard({ ...detailCard, directorComment });
    } catch {
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  const doTransition = async (id: string, newStatus: string) => {
    try {
      const body: Record<string, string> = { status: newStatus };
      if (selectedClass) body.classroomId = selectedClass;
      if (selectedPeriod) body.academicPeriodId = selectedPeriod;
      const r = await fetch(`/api/bulletins/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { error?: string }).error || 'Erreur');
      }
      const labels: Record<string, string> = {
        validated: 'validé',
        ready: 'renvoyé au professeur',
        published: 'publié',
      };
      toast.success(`Bulletin ${labels[newStatus] ?? newStatus}.`);
      setDetailOpen(false);
      void loadReportCards();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const bulkPublish = async () => {
    if (!selectedClass || !selectedPeriod || reportCards.length === 0) return;
    try {
      const r = await fetch(`/api/bulletins/${reportCards[0].id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'published',
          classroomId: selectedClass,
          academicPeriodId: selectedPeriod,
        }),
      });
      if (!r.ok) throw new Error();
      toast.success('Bulletins publiés.');
      setConfirmPublish(false);
      void loadReportCards();
    } catch {
      toast.error('Erreur lors de la publication.');
    }
  };

  const validatedCount = reportCards.filter(c => c.status === 'validated').length;
  const publishedCount = reportCards.filter(c => c.status === 'published').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validation des bulletins"
        description="Examinez et validez les bulletins préparés par les professeurs."
      />

      {/* Selectors */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-2">
          <Label>Classe</Label>
          <select
            className="w-56 border rounded-md px-3 py-2 text-sm bg-background"
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
          >
            <option value="">— Choisir —</option>
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
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
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <Button onClick={handleLoad} disabled={busy || !selectedClass || !selectedPeriod}>
          {busy ? 'Chargement...' : 'Charger les bulletins'}
        </Button>
      </div>

      {/* Summary + Publish */}
      {reportCards.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-green-700">{validatedCount} bulletin(s) validé(s)</span>
            {' · '}
            <span className="font-medium text-purple-700">{publishedCount} publié(s)</span>
          </div>
          {validatedCount > 0 && (
            <Button variant="default" size="sm" onClick={() => setConfirmPublish(true)}>
              <Send className="mr-2 h-4 w-4" />
              Publier les bulletins validés ({validatedCount})
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={[
          { key: 'studentName', label: 'Élève' },
          { key: 'generalAverageOfficial', label: 'Moy. générale', render: (i: BulletinRow) => i.generalAverageOfficial ?? '—' },
          { key: 'rank', label: 'Rang', render: (i: BulletinRow) => i.rank != null ? `${i.rank}/${i.totalStudentsRanked ?? '?'}` : '—' },
          { key: 'status', label: 'Statut', render: (i: BulletinRow) => <StatusBadge status={i.status} /> },
          { key: 'classAverage', label: 'Moy. classe', render: (i: BulletinRow) => i.classAverage ?? '—' },
        ]}
        data={rows}
        getId={(i: BulletinRow) => i.id}
        onRowClick={(i: BulletinRow) => openDetail(i.id)}
        actions={(item: BulletinRow) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openDetail(item.id)}>
                <Eye className="mr-2 h-4 w-4" /> Voir le détail
              </DropdownMenuItem>
              {item.status === 'ready' && (
                <DropdownMenuItem onClick={() => doTransition(item.id, 'validated')}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Valider
                </DropdownMenuItem>
              )}
              {item.status === 'validated' && (
                <DropdownMenuItem onClick={() => doTransition(item.id, 'ready')}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Renvoyer au professeur
                </DropdownMenuItem>
              )}
              {item.status === 'validated' && (
                <DropdownMenuItem onClick={() => doTransition(item.id, 'published')}>
                  <Send className="mr-2 h-4 w-4" /> Publier
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        emptyMessage="Sélectionnez une classe et une période pour charger les bulletins."
      />

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Bulletin
              {detailCard && <StatusBadge status={detailCard.status} />}
            </DialogTitle>
          </DialogHeader>

          {detailCard && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Moy. officielle</div>
                  <div className="text-xl font-bold">{detailCard.generalAverageOfficial ?? '—'}</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Rang</div>
                  <div className="text-xl font-bold">
                    {detailCard.rank != null
                      ? `${detailCard.rank}/${detailCard.totalStudentsRanked ?? '?'}`
                      : '—'}
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Moy. classe</div>
                  <div className="text-xl font-bold">{detailCard.classAverage ?? '—'}</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Min / Max</div>
                  <div className="text-xl font-bold">
                    {detailCard.minClassAverage ?? '—'} / {detailCard.maxClassAverage ?? '—'}
                  </div>
                </div>
              </div>

              {/* Subjects table */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Détail par matière</h3>
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
              </div>

              {/* Comments */}
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Commentaire professeur</Label>
                  <p className="mt-1 text-sm border rounded-md p-2 min-h-[60px] bg-muted/30">
                    {detailCard.teacherComment || 'Aucun commentaire'}
                  </p>
                </div>
                <div>
                  <Label>Appréciation du directeur</Label>
                  {detailCard.status === 'published' ? (
                    <p className="mt-1 text-sm border rounded-md p-2 min-h-[60px] bg-muted/30">
                      {detailCard.directorComment || 'Aucun commentaire'}
                    </p>
                  ) : (
                    <Textarea
                      className="mt-1"
                      value={directorComment}
                      onChange={e => setDirectorComment(e.target.value)}
                      placeholder="Appréciation du directeur..."
                      rows={3}
                    />
                  )}
                </div>
                {detailCard.conductComment && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Conduite</Label>
                    <p className="mt-1 text-sm border rounded-md p-2 min-h-[40px] bg-muted/30">
                      {detailCard.conductComment}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <DialogFooter className="flex gap-2 sm:justify-end">
                {detailCard.status === 'ready' && (
                  <Button onClick={() => doTransition(detailCard.id, 'validated')}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Valider ce bulletin
                  </Button>
                )}
                {detailCard.status === 'validated' && (
                  <>
                    <Button variant="outline" onClick={() => doTransition(detailCard.id, 'ready')}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Renvoyer au professeur
                    </Button>
                    <Button onClick={() => doTransition(detailCard.id, 'published')}>
                      <Send className="mr-2 h-4 w-4" /> Publier
                    </Button>
                  </>
                )}
                {detailCard.status !== 'published' && (
                  <Button variant="outline" onClick={saveComment}>
                    Enregistrer le commentaire
                  </Button>
                )}
                {detailCard.status === 'published' && (
                  <div className="flex items-center gap-2 text-purple-700 text-sm font-medium">
                    <Send className="h-4 w-4" /> Bulletin publié
                  </div>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Publish confirmation dialog */}
      <Dialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la publication</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Vous êtes sur le point de publier {validatedCount} bulletin(s) validé(s).
            Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPublish(false)}>Annuler</Button>
            <Button onClick={bulkPublish}>Confirmer la publication</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
