"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader, DataTable, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Play, Lock, XCircle, PenLine } from 'lucide-react';

interface AssessmentRow {
  id: string; classroomId: string; subjectId: string; academicPeriodId: string;
  assessmentTypeId: string | null; title: string; scale: string; coefficient: string;
  status: 'draft' | 'open' | 'closed' | 'cancelled'; date: string;
  description: string | null; classroomName: string | null; subjectName: string | null;
  periodName: string | null; typeName: string | null; gradeCount: number; createdAt: string;
}

interface Pg { page: number; limit: number; totalItems: number; totalPages: number }

const TABS = [
  { key: '', label: 'Toutes' },
  { key: 'draft', label: 'Brouillons' },
  { key: 'open', label: 'Ouvertes' },
  { key: 'closed', label: 'Fermées' },
  { key: 'cancelled', label: 'Annulées' },
];

export default function EvaluationsPage() {
  const router = useRouter();
  const [data, setData] = useState<AssessmentRow[]>([]);
  const [pg, setPg] = useState<Pg>({ page: 1, limit: 20, totalItems: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fTitle, setFTitle] = useState('');
  const [fClassroom, setFClassroom] = useState('');
  const [fSubject, setFSubject] = useState('');
  const [fPeriod, setFPeriod] = useState('');
  const [fScale, setFScale] = useState('20');
  const [fCoeff, setFCoeff] = useState('1');
  const [fDate, setFDate] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fType, setFType] = useState('');
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [periods, setPeriods] = useState<{ id: string; name: string }[]>([]);
  const [types, setTypes] = useState<{ id: string; name: string }[]>([]);

  const doFetch = useCallback(async (page = 1) => {
    setBusy(true);
    try {
      const p = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) p.set('search', search);
      if (tab) p.set('status', tab);
      const r = await fetch(`/api/evaluations?${p}`);
      if (!r.ok) throw new Error();
      const j = await r.json();
      setData(j.data); setPg(j.pagination);
    } catch { toast.error('Erreur de chargement.'); } finally { setBusy(false); }
  }, [search, tab]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void doFetch(); }, [doFetch]);

  const loadRefs = async () => {
    try {
      const [c, s, t, y] = await Promise.all([
        fetch('/api/classes?limit=100').then(r => r.ok ? r.json() : { data: [] }),
        fetch('/api/matieres?limit=100').then(r => r.ok ? r.json() : { data: [] }),
        fetch('/api/types-evaluation?limit=100').then(r => r.ok ? r.json() : { data: [] }),
        fetch('/api/annees-scolaires?limit=100').then(r => r.ok ? r.json() : { data: [] }),
      ]);
      setClassrooms((c.data || []).map((x: {id:string;name:string;data?:unknown}) => ({ id: x.id, name: x.name })));
      setSubjects((s.data || []).map((x: {id:string;name:string;data?:unknown}) => ({ id: x.id, name: x.name })));
      setTypes((t.data || []).map((x: {id:string;name:string;data?:unknown}) => ({ id: x.id, name: x.name })));
      // Load periods for all academic years
      const allPeriods: { id: string; name: string }[] = [];
      for (const year of (y.data || [])) {
        try {
          const pr = await fetch(`/api/annees-scolaires/${year.id}`);
          if (pr.ok) {
            const jd = await pr.json();
            for (const p of (jd.periods || [])) {
              allPeriods.push({ id: p.id, name: p.name });
            }
          }
        } catch { /* skip */ }
      }
      setPeriods(allPeriods);
    } catch { /* silent */ }
  };

  const openCreate = () => {
    setFTitle(''); setFClassroom(''); setFSubject(''); setFPeriod('');
    setFScale('20'); setFCoeff('1'); setFDate(''); setFDesc(''); setFType('');
    void loadRefs();
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!fTitle.trim() || !fClassroom || !fSubject || !fPeriod || !fDate) {
      toast.error('Remplissez les champs obligatoires.'); return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/evaluations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: fTitle.trim(), classroomId: fClassroom, subjectId: fSubject,
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

  return (
    <div className="space-y-6">
      <PageHeader title="Évaluations" description="Créez et gérez les évaluations."
        action={{ label: 'Nouvelle évaluation', onClick: openCreate }} />
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <Button key={t.key} variant={tab === t.key ? 'default' : 'outline'} size="sm"
            onClick={() => setTab(t.key)}>{t.label}</Button>
        ))}
      </div>
      <DataTable
        columns={[
          { key: 'title', label: 'Titre' },
          { key: 'classroomName', label: 'Classe', render: (i: AssessmentRow) => i.classroomName ?? '—' },
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
        emptyMessage="Aucune évaluation trouvée."
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouvelle évaluation</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Titre *</Label><Input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Ex: Contrôle chapitre 3" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Classe *</Label><select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={fClassroom} onChange={e => setFClassroom(e.target.value)}><option value="">— Choisir —</option>{classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="space-y-2"><Label>Matière *</Label><select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={fSubject} onChange={e => setFSubject(e.target.value)}><option value="">— Choisir —</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Période *</Label><select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={fPeriod} onChange={e => setFPeriod(e.target.value)}><option value="">— Choisir —</option>{periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="space-y-2"><Label>Type</Label><select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={fType} onChange={e => setFType(e.target.value)}><option value="">— Aucun —</option>{types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Barème *</Label><Input type="number" min={1} max={100} value={fScale} onChange={e => setFScale(e.target.value)} /></div>
              <div className="space-y-2"><Label>Coefficient *</Label><Input type="number" min={0.01} step="0.01" value={fCoeff} onChange={e => setFCoeff(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Date *</Label><Input type="date" value={fDate} onChange={e => setFDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Optionnel..." rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button onClick={handleCreate} disabled={busy}>{busy ? 'Création...' : 'Créer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
