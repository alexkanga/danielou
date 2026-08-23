"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader, FormDialog, DeleteDialog, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Plus } from 'lucide-react';
import type { Subject, SubjectComponent } from '@/lib/db/schema';

export default function ComposantesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [components, setComponents] = useState<SubjectComponent[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectComponent | null>(null);
  const [deleting, setDeleting] = useState<SubjectComponent | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [compName, setCompName] = useState('');
  const [compCode, setCompCode] = useState('');
  const [compSortOrder, setCompSortOrder] = useState('0');
  const [compIsActive, setCompIsActive] = useState(true);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch('/api/matieres?limit=100');
      if (res.ok) {
        const json = await res.json();
        setSubjects(json.data ?? []);
        if (json.data?.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(json.data[0].id);
        }
      }
    } catch {
      // silent
    }
  }, [selectedSubjectId]);

  const fetchComponents = useCallback(async () => {
    if (!selectedSubjectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/composantes?subjectId=${selectedSubjectId}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setComponents(json.data ?? []);
    } catch {
      toast.error('Erreur lors du chargement des composantes.');
    } finally {
      setLoading(false);
    }
  }, [selectedSubjectId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchSubjects();
  }, [fetchSubjects]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- fetch components when subject changes */
  useEffect(() => {
    void fetchComponents();
  }, [fetchComponents]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const resetForm = () => {
    setCompName('');
    setCompCode('');
    setCompSortOrder('0');
    setCompIsActive(true);
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (item: SubjectComponent) => {
    setEditing(item);
    setCompName(item.name);
    setCompCode(item.code ?? '');
    setCompSortOrder(String(item.sortOrder));
    setCompIsActive(item.isActive);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!compName.trim()) {
      toast.error('Le nom est requis.');
      return;
    }
    if (!selectedSubjectId) {
      toast.error('Veuillez sélectionner une matière.');
      return;
    }
    setFormLoading(true);
    try {
      const url = editing ? `/api/composantes/${editing.id}` : '/api/composantes';
      const method = editing ? 'PATCH' : 'POST';
      const body: Record<string, unknown> = {
        name: compName.trim(),
        sortOrder: parseInt(compSortOrder, 10) || 0,
        isActive: compIsActive,
      };
      if (!editing) {
        body.subjectId = selectedSubjectId;
        if (compCode.trim()) body.code = compCode.trim();
      } else {
        if (compCode.trim()) body.code = compCode.trim();
        else body.code = null;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success(editing ? 'Composante modifiée.' : 'Composante créée.');
      setFormOpen(false);
      fetchComponents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setFormLoading(true);
    try {
      const res = await fetch(`/api/composantes/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 409) throw new Error('Cette composante est utilisée dans une configuration pédagogique.');
        throw new Error('Erreur lors de la suppression.');
      }
      toast.success('Composante supprimée.');
      setDeleteOpen(false);
      setDeleting(null);
      fetchComponents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Composantes"
        description="Gérez les composantes (sous-matières) de chaque matière."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="w-full sm:w-64 space-y-1">
          <Label htmlFor="subject-select">Matière</Label>
          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
            <SelectTrigger id="subject-select">
              <SelectValue placeholder="Sélectionner une matière" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} disabled={!selectedSubjectId}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle composante
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedSubject ? `Composantes de ${selectedSubject.code} — ${selectedSubject.name}` : 'Sélectionnez une matière'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Chargement…</p>
          ) : components.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {selectedSubjectId ? 'Aucune composante pour cette matière.' : ''}
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Ordre</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components.map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-mono text-sm">{comp.code ?? '—'}</TableCell>
                      <TableCell>{comp.name}</TableCell>
                      <TableCell>{comp.sortOrder}</TableCell>
                      <TableCell><StatusBadge status={comp.isActive ? 'active' : 'draft'} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(comp)}>
                              <Pencil className="mr-2 h-4 w-4" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => { setDeleting(comp); setDeleteOpen(true); }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Modifier la composante' : 'Nouvelle composante'}
        onSubmit={handleSubmit}
        loading={formLoading}
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="comp-name">Nom *</Label>
            <Input id="comp-name" placeholder="Ex: Contrôle continu" value={compName} onChange={(e) => setCompName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="comp-code">Code</Label>
              <Input id="comp-code" placeholder="Ex: CC" value={compCode} onChange={(e) => setCompCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-order">Ordre</Label>
              <Input id="comp-order" type="number" min="0" value={compSortOrder} onChange={(e) => setCompSortOrder(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={compIsActive}
              onChange={(e) => setCompIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Active
          </label>
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        description={`Voulez-vous vraiment supprimer la composante « ${deleting?.name} » ?`}
        onConfirm={handleDelete}
        loading={formLoading}
      />
    </div>
  );
}
