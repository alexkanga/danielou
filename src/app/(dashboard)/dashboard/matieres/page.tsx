"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable, FormDialog, DeleteDialog, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Subject } from '@/lib/db/schema';
import type { PaginatedResult } from '@/lib/data-access/pagination';

type SubjectRow = Subject & { isActive: boolean };

export default function MatieresPage() {
  const [data, setData] = useState<SubjectRow[]>([]);
  const [pagination, setPagination] = useState<PaginatedResult<SubjectRow>['pagination']>({
    page: 1, limit: 20, totalItems: 0, totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectRow | null>(null);
  const [deleting, setDeleting] = useState<SubjectRow | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [coefficient, setCoefficient] = useState('1');
  const [defaultScale, setDefaultScale] = useState('20');
  const [isOptional, setIsOptional] = useState(false);
  const [includeInAverage, setIncludeInAverage] = useState(true);
  const [includeInRanking, setIncludeInRanking] = useState(true);
  const [includeInDecision, setIncludeInDecision] = useState(true);

  const fetchData = async (page = 1, searchStr = search) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchStr) params.set('search', searchStr);
      const res = await fetch(`/api/matieres?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      const json: PaginatedResult<SubjectRow> = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch {
      toast.error('Erreur lors du chargement des matières.');
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect -- data fetch on mount */
  useEffect(() => {
    void fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetForm = () => {
    setName('');
    setCode('');
    setSortOrder('0');
    setCoefficient('1');
    setDefaultScale('20');
    setIsOptional(false);
    setIncludeInAverage(true);
    setIncludeInRanking(true);
    setIncludeInDecision(true);
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (item: SubjectRow) => {
    setEditing(item);
    setName(item.name);
    setCode(item.code);
    setSortOrder(String(item.sortOrder));
    setCoefficient(String(item.coefficient));
    setDefaultScale(String(item.defaultScale));
    setIsOptional(item.isOptional);
    setIncludeInAverage(item.includeInAverage);
    setIncludeInRanking(item.includeInRanking);
    setIncludeInDecision(item.includeInDecision);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      toast.error('Le nom et le code sont requis.');
      return;
    }
    setFormLoading(true);
    try {
      const url = editing ? `/api/matieres/${editing.id}` : '/api/matieres';
      const method = editing ? 'PATCH' : 'POST';
      const body: Record<string, unknown> = {
        name: name.trim(),
        code: code.trim(),
        sortOrder: parseInt(sortOrder, 10) || 0,
        coefficient: parseFloat(coefficient) || 1,
        defaultScale: parseInt(defaultScale, 10) || 20,
        isOptional,
        includeInAverage,
        includeInRanking,
        includeInDecision,
      };
      if (editing) delete body.code;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success(editing ? 'Matière modifiée.' : 'Matière créée.');
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
      const res = await fetch(`/api/matieres/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 409) throw new Error('Cette matière est utilisée dans une configuration pédagogique.');
        throw new Error('Erreur lors de la suppression.');
      }
      toast.success('Matière supprimée.');
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
        title="Matières"
        description="Gérez les matières enseignées dans l'école."
        action={{ label: 'Nouvelle matière', onClick: openCreate }}
      />

      <DataTable
        columns={[
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Nom' },
          { key: 'coefficient', label: 'Coeff.' },
          { key: 'defaultScale', label: 'Barème' },
          { key: 'isActive', label: 'Statut', render: (item) => <StatusBadge status={item.isActive ? 'active' : 'draft'} /> },
          {
            key: 'isOptional', label: 'Optionnelle',
            render: (item) => item.isOptional ? 'Oui' : 'Non',
          },
        ]}
        data={data}
        pagination={pagination}
        onPageChange={(p) => fetchData(p, search)}
        onSearch={(s) => { setSearch(s); fetchData(1, s); }}
        searchable
        searchPlaceholder="Rechercher une matière..."
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
        emptyMessage="Aucune matière trouvée."
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Modifier la matière' : 'Nouvelle matière'}
        onSubmit={handleSubmit}
        loading={formLoading}
      >
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mat-code">Code *</Label>
              <Input
                id="mat-code"
                placeholder="Ex: MATH"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={!!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mat-name">Nom *</Label>
              <Input
                id="mat-name"
                placeholder="Ex: Mathématiques"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mat-order">Ordre</Label>
              <Input id="mat-order" type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mat-coeff">Coefficient</Label>
              <Input id="mat-coeff" type="number" min="0.01" step="0.01" value={coefficient} onChange={(e) => setCoefficient(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mat-scale">Barème</Label>
              <Input id="mat-scale" type="number" min="1" value={defaultScale} onChange={(e) => setDefaultScale(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isOptional}
                onChange={(e) => setIsOptional(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Optionnelle
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeInAverage}
                onChange={(e) => setIncludeInAverage(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Dans la moyenne
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeInRanking}
                onChange={(e) => setIncludeInRanking(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Dans le classement
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeInDecision}
                onChange={(e) => setIncludeInDecision(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Dans la décision
            </label>
          </div>
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        description={`Voulez-vous vraiment supprimer la matière « ${deleting?.name} » (${deleting?.code}) ?`}
        onConfirm={handleDelete}
        loading={formLoading}
      />
    </div>
  );
}
