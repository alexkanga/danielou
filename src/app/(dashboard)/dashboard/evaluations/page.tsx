"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader, DataTable, StatusBadge, AcademicContextSelector } from '@/components/shared';
import type { AcademicContextValue, AcademicContextMeta, ClassroomOption, PeriodOption } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Play, Lock, XCircle, PenLine } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AssessmentRow {
  id: string; classroomId: string; subjectId: string; academicPeriodId: string;
  assessmentTypeId: string | null; title: string; scale: string; coefficient: string;
  status: 'draft' | 'open' | 'closed' | 'cancelled'; date: string;
  description: string | null; classroomName: string | null; yearName: string | null;
  subjectName: string | null; periodName: string | null; typeName: string | null;
  gradeCount: number; createdAt: string;
}

interface Pg { page: number; limit: number; totalItems: number; totalPages: number }

const TABS = [
  { key: '', label: 'Toutes' },
  { key: 'draft', label: 'Brouillons' },
  { key: 'open', label: 'Ouvertes' },
  { key: 'closed', label: 'Fermées' },
  { key: 'cancelled', label: 'Annulées' },
];

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function EvaluationsPage() {
  const router = useRouter();

  // Data state
  const [data, setData] = useState<AssessmentRow[]>([]);
  const [pg, setPg] = useState<Pg>({ page: 1, limit: 20, totalItems: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('');
  const [busy, setBusy] = useState(false);

  // Academic context
  const [ctxValue, setCtxValue] = useState<AcademicContextValue>({ academicYearId: '', classroomId: '', academicPeriodId: '' });
  const [ctxMeta, setCtxMeta] = useState<AcademicContextMeta | null>(null);

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fTitle, setFTitle] = useState('');
  const [fSubject, setFSubject] = useState('');
  const [fPeriod, setFPeriod] = useState('');
  const [fScale, setFScale] = useState('20');
  const [fCoeff, setFCoeff] = useState('1');
  const [fDate, setFDate] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fType, setFType] = useState('');
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [types, setTypes] = useState<{ id: string; name: string }[]>([]);

  // ── Fetch evaluations ────────────────────────
  const doFetch = useCallback(async (page = 1) => {
    setBusy(true);
    try {
      const p = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) p.set('search', search);
      if (tab) p.set('status', tab);
      if (ctxValue.academicYearId) p.set('academicYearId', ctxValue.academicYearId);
      if (ctxValue.classroomId) p.set('classroomId', ctxValue.classroomId);
      if (ctxValue.academicPeriodId) p.set('academicPeriodId', ctxValue.academicPeriodId);
      const r = await fetch(`/api/evaluations?${p}`);
      if (!r.ok) throw new Error();
      const j = await r.json();
      setData(j.data); setPg(j.pagination);
    } catch { toast.error('Erreur de chargement.'); } finally { setBusy(false); }
  }, [search, tab, ctxValue.academicYearId, ctxValue.classroomId, ctxValue.academicPeriodId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void doFetch(); }, [doFetch]);

  // ── Context change handler ───────────────────
  // Use onChange (fires on every selector change) instead of onContextChange
  // (which requires all visible selectors to have values before firing).
  // This enables progressive filtering: year-only, year+class, year+class+period.
  const handleContextChange = useCallback((value: AcademicContextValue, meta: AcademicContextMeta) => {
    setCtxValue(value);
    setCtxMeta(meta);
  }, []);

  // Refetch when context or tab changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void doFetch(1);
  }, [ctxValue.academicYearId, ctxValue.classroomId, ctxValue.academicPeriodId, tab, doFetch]);

  // ── Load reference data for create dialog ───
  const loadRefs = async () => {
    try {
      const [s, t] = await Promise.all([
        fetch('/api/matieres?limit=100').then(r => r.ok ? r.json() : { data: [] }),
        fetch('/api/types-evaluation?limit=100').then(r => r.ok ? r.json() : { data: [] }),
      ]);
      setSubjects((s.data || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
      setTypes((t.data || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })));
    } catch { /* silent */ }
  };

  const openCreate = () => {
    setFTitle(''); setFSubject('');
    setFPeriod(ctxValue.academicPeriodId);
    setFScale('20'); setFCoeff('1'); setFDate(''); setFDesc(''); setFType('');
    void loadRefs();
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!fTitle.trim() || !ctxValue.classroomId || !fSubject || !fPeriod || !fDate) {
      toast.error('Remplissez les champs obligatoires.'); return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/evaluations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: fTitle.trim(), classroomId: ctxValue.classroomId, subjectId: fSubject,
          academicPeriodId: fPeriod, scale: parseInt(fScale) || 20,
          coefficient: parseFloat(fCoeff) || 1, date: fDate,
          assessmentTypeId: fType || null, description: fDesc.trim() || null,
        }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Erreur'); }
      toast.success('Évaluation créée.');
      setDialogOpen(false); doFetch(pg.page);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erreur'); } finally { setBusy(false); }
  };

  const doAction = async (id: string, action: string) => {
    try {
      const r = await fetch(`/api/evaluations/${id}/${action}`, { method: 'POST' });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Erreur'); }
      const labels: Record<string, string> = { open: 'ouverte', close: 'fermée', cancel: 'annulée' };
      toast.success(`Évaluation ${labels[action]}.`); doFetch(pg.page);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Erreur'); }
  };

  // ── Derive available periods/classrooms from context meta ──
  const contextClassroom: ClassroomOption | undefined = ctxMeta?.classrooms.find(c => c.id === ctxValue.classroomId);
  const contextPeriod: PeriodOption | undefined = ctxMeta?.periods.find(p => p.id === ctxValue.academicPeriodId);

  const isFiltered = !!(ctxValue.academicYearId || ctxValue.classroomId || ctxValue.academicPeriodId);

  return (
    <div className="space-y-6">
      <PageHeader title="Évaluations" description="Créez et gérez les évaluations."
        action={{ label: 'Nouvelle évaluation', onClick: openCreate }} />

      {/* Academic Context Selector */}
      <AcademicContextSelector
        onChange={handleContextChange}
        columns={3}
      />

      {/* Context summary & status tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {TABS.map(t => (
            <Button key={t.key} variant={tab === t.key ? 'default' : 'outline'} size="sm"
              onClick={() => setTab(t.key)}>{t.label}</Button>
          ))}
        </div>
        {isFiltered && (
          <p className="text-xs text-muted-foreground">
            {ctxMeta?.academicYearName && <span>{ctxMeta.academicYearName}</span>}
            {ctxMeta?.academicYearName && contextClassroom && <span> · </span>}
            {contextClassroom && <span>{contextClassroom.name} ({contextClassroom.levelName})</span>}
            {contextClassroom && contextPeriod && <span> · </span>}
            {contextPeriod && <span>{contextPeriod.name}</span>}
          </p>
        )}
      </div>

      {/* Evaluations table */}
      <DataTable
        columns={[
          { key: 'title', label: 'Titre' },
          { key: 'classroomName', label: 'Classe', render: (i: AssessmentRow) => i.yearName ? `${i.classroomName ?? '—'} — ${i.yearName}` : (i.classroomName ?? '—') },
          { key: 'subjectName', label: 'Matière', render: (i: AssessmentRow) => i.subjectName ?? '—' },
          { key: 'periodName', label: 'Période', render: (i: AssessmentRow) => i.periodName ?? '—' },
          { key: 'scale', label: 'Barème', render: (_row: AssessmentRow) => `/` + _row.scale },
          { key: 'coefficient', label: 'Coeff.', render: (i: AssessmentRow) => i.coefficient },
          { key: 'status', label: 'Statut', render: (i: AssessmentRow) => <StatusBadge status={i.status} /> },
          { key: 'gradeCount', label: 'Notes', render: (i: AssessmentRow) => String(i.gradeCount) },
        ]}
        data={data} pagination={pg} onPageChange={p => doFetch(p)}
        onSearch={s => setSearch(s)} searchable searchPlaceholder="Rechercher une évaluation..."
        getId={(i: AssessmentRow) => i.id}
        emptyMessage={isFiltered ? 'Aucune évaluation trouvée pour cette sélection.' : 'Sélectionnez une année, une classe et/ou une période pour filtrer les évaluations.'}
        actions={(_item: AssessmentRow) => {
          const hasActions = _item.status === 'draft' || _item.status === 'open';
          if (!hasActions) return null;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {_item.status === 'draft' && <DropdownMenuItem onClick={() => doAction(_item.id, 'open')}><Play className="mr-2 h-4 w-4" /> Ouvrir</DropdownMenuItem>}
                {_item.status === 'open' && <DropdownMenuItem onClick={() => doAction(_item.id, 'close')}><Lock className="mr-2 h-4 w-4" /> Fermer</DropdownMenuItem>}
                {(_item.status === 'draft' || _item.status === 'open') && <DropdownMenuItem onClick={() => doAction(_item.id, 'cancel')}><XCircle className="mr-2 h-4 w-4" /> Annuler</DropdownMenuItem>}
                {_item.status === 'open' && (
                  <DropdownMenuItem onClick={() => { router.push('/dashboard/saisie-notes?assessmentId=' + _item.id); }}><PenLine className="mr-2 h-4 w-4" /> Saisir les notes</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }}
      />

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvelle évaluation</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {/* Show selected context */}
            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <p className="font-medium">Contexte académique</p>
              {ctxMeta?.academicYearName && <p>Année scolaire : {ctxMeta.academicYearName}</p>}
              {contextClassroom && <p>Classe : {contextClassroom.name} ({contextClassroom.levelName})</p>}
              {contextPeriod && <p>Période : {contextPeriod.name}</p>}
              {!ctxMeta?.academicYearName && !contextClassroom && <p className="text-muted-foreground">Sélectionnez une année et une classe dans le contexte ci-dessus.</p>}
            </div>

            <div className="space-y-2"><Label>Titre *</Label><Input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Ex: Contrôle chapitre 3" /></div>
            <div className="space-y-2">
              <Label>Matière *</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={fSubject} onChange={e => setFSubject(e.target.value)}>
                <option value="">— Choisir —</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Période *</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={fPeriod} onChange={e => setFPeriod(e.target.value)}>
                  <option value="">— Choisir —</option>
                  {(ctxMeta?.periods || []).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={fType} onChange={e => setFType(e.target.value)}>
                  <option value="">— Aucun —</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Barème *</Label><Input type="number" min={1} max={100} value={fScale} onChange={e => setFScale(e.target.value)} /></div>
              <div className="space-y-2"><Label>Coefficient *</Label><Input type="number" min={0.01} step="0.01" value={fCoeff} onChange={e => setFCoeff(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Date *</Label><Input type="date" value={fDate} onChange={e => setFDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Optionnel..." rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={busy || !ctxValue.classroomId}>{busy ? 'Création...' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
