"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable, FormDialog, DeleteDialog, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { AssessmentType } from '@/lib/db/schema';
import type { PaginatedResult } from '@/lib/data-access/pagination';

export default function TypesEvaluationPage() {
  const [data, setData] = useState<AssessmentType[]>([]);
  const [pagination, setPagination] = useState<PaginatedResult<AssessmentType>['pagination']>({
    page: 1, limit: 20, totalItems: 0, totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<AssessmentType | null>(null);
  const [deleting, setDeleting] = useState<AssessmentType | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form fields
  const [typeName, setTypeName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultCoefficient, setDefaultCoefficient] = useState('1');
  const [defaultScale, setDefaultScale] = useState('20');
  const [isActive, setIsActive] = useState(true);

  const fetchData = async (page = 1, searchStr = search) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchStr) params.set('search', searchStr);
      const res = await fetch(`/api/types-evaluation?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      const json: PaginatedResult<AssessmentType> = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch {
      toast.error("Erreur lors du chargement des types d'évaluation.");
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetForm = () => {
    setTypeName('');
    setDescription('');
    setDefaultCoefficient('1');
    setDefaultScale('20');
    setIsActive(true);
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (item: AssessmentType) => {
    setEditing(item);
    setTypeName(item.name);
    setDescription(item.description ?? '');
    setDefaultCoefficient(item.defaultCoefficient ?? '1');
    setDefaultScale(String(item.defaultScale ?? 20));
    setIsActive(item.isActive);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!typeName.trim()) {
      toast.error('Le nom est requis.');
      return;
    }
    setFormLoading(true);
    try {
      const url = editing ? `/api/types-evaluation/${editing.id}` : '/api/types-evaluation';
      const method = editing ? 'PATCH' : 'POST';
      const body: Record<string, unknown> = {
        name: typeName.trim(),
        description: description.trim() || null,
        defaultCoefficient: parseFloat(defaultCoefficient) || null,
        defaultScale: parseInt(defaultScale, 10) || null,
        isActive,
      };
      if (editing) delete body.name;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success(editing ? "Type d'évaluation modifié." : "Type d'évaluation créé.");
      setFormOpen(false);
      fetchData(pagination.page, search);
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
      const res = await fetch(`/api/types-evaluation/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 409) throw new Error("Ce type d'évaluation est utilisé par des évaluations.");
        throw new Error('Erreur lors de la suppression.');
      }
      toast.success("Type d'évaluation supprimé.");
      setDeleteOpen(false);
      setDeleting(null);
      fetchData(pagination.page, search);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Types d'évaluation"
        description="Gérez les types d'évaluation (devoir, contrôle, examen…)."
        action={{ label: "Nouveau type", onClick: openCreate }}
      />

      <DataTable
        columns={[
          { key: 'name', label: 'Nom' },
          { key: 'defaultCoefficient', label: 'Coeff. défaut', render: (item) => item.defaultCoefficient ?? '—' },
          { key: 'defaultScale', label: 'Barème défaut', render: (item) => item.defaultScale ?? '—' },
          { key: 'isActive', label: 'Statut', render: (item) => <StatusBadge status={item.isActive ? 'active' : 'draft'} /> },
        ]}
        data={data}
        pagination={pagination}
        onPageChange={(p) => fetchData(p, search)}
        onSearch={(s) => { setSearch(s); fetchData(1, s); }}
        searchable
        searchPlaceholder="Rechercher un type d'évaluation..."
        getId={(item) => item.id}
        actions={(item) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(item)}>
                <Pencil className="mr-2 h-4 w-4" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => { setDeleting(item); setDeleteOpen(true); }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        emptyMessage="Aucun type d'évaluation trouvé."
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Modifier le type d'évaluation" : "Nouveau type d'évaluation"}
        onSubmit={handleSubmit}
        loading={formLoading}
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type-name">Nom *</Label>
            <Input
              id="type-name"
              placeholder="Ex: Devoir maison"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              disabled={!!editing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type-desc">Description</Label>
            <Textarea
              id="type-desc"
              placeholder="Description optionnelle…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type-coeff">Coefficient par défaut</Label>
              <Input id="type-coeff" type="number" min="0.01" step="0.01" value={defaultCoefficient} onChange={(e) => setDefaultCoefficient(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-scale">Barème par défaut</Label>
              <Input id="type-scale" type="number" min="1" value={defaultScale} onChange={(e) => setDefaultScale(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Actif
          </label>
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        description={`Voulez-vous vraiment supprimer le type « ${deleting?.name} » ?`}
        onConfirm={handleDelete}
        loading={formLoading}
      />
    </div>
  );
}
