"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable, FormDialog, DeleteDialog, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { AcademicYear } from '@/lib/db/schema';
import type { PaginatedResult } from '@/lib/data-access/pagination';

export default function AnneesScolairesPage() {
  const [data, setData] = useState<AcademicYear[]>([]);
  const [pagination, setPagination] = useState<PaginatedResult<AcademicYear>['pagination']>({
    page: 1, limit: 20, totalItems: 0, totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [deleting, setDeleting] = useState<AcademicYear | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'preparation' | 'active' | 'closed'>('preparation');

  const fetchData = async (page = 1, searchStr = search) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchStr) params.set('search', searchStr);
      const res = await fetch(`/api/annees-scolaires?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      const json: PaginatedResult<AcademicYear> = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch {
      toast.error('Erreur lors du chargement des années scolaires.');
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetForm = () => {
    setEditing(null);
    setName('');
    setStartDate('');
    setEndDate('');
    setStatus('preparation');
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = async (item: AcademicYear) => {
    setEditing(item);
    setName(item.name);
    setStartDate(item.startDate);
    setEndDate(item.endDate);
    setStatus(item.status as 'preparation' | 'active' | 'closed');
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !startDate || !endDate) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setFormLoading(true);
    try {
      const url = editing ? `/api/annees-scolaires/${editing.id}` : '/api/annees-scolaires';
      const method = editing ? 'PUT' : 'POST';
      const body = {
        name: name.trim(),
        startDate,
        endDate,
        status,
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success(editing ? 'Année scolaire modifiée.' : 'Année scolaire créée.');
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
      const res = await fetch(`/api/annees-scolaires/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 409) throw new Error('Cette année scolaire est utilisée.');
        throw new Error('Erreur lors de la suppression.');
      }
      toast.success('Année scolaire supprimée.');
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
        title="Années scolaires"
        description="Gérez les années scolaires. Les périodes d'évaluation sont gérées séparément."
        action={{ label: 'Nouvelle année', onClick: openCreate }}
      />

      <DataTable
        columns={[
          { key: 'name', label: 'Nom' },
          { key: 'startDate', label: 'Début', render: (item) => formatDate(item.startDate) },
          { key: 'endDate', label: 'Fin', render: (item) => formatDate(item.endDate) },
          { key: 'status', label: 'Statut', render: (item) => <StatusBadge status={item.status} /> },
        ]}
        data={data}
        pagination={pagination}
        onPageChange={(p) => fetchData(p, search)}
        onSearch={(s) => { setSearch(s); fetchData(1, s); }}
        searchable
        searchPlaceholder="Rechercher une année..."
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
        emptyMessage="Aucune année scolaire trouvée."
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Modifier l'année scolaire" : 'Nouvelle année scolaire'}
        onSubmit={handleSubmit}
        loading={formLoading}
      >
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ay-name">Nom *</Label>
              <Input id="ay-name" placeholder="2026-2027" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ay-status">Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger id="ay-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preparation">Préparation</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Clôturée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ay-start">Date de début *</Label>
              <Input id="ay-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ay-end">Date de fin *</Label>
              <Input id="ay-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        description={`Voulez-vous vraiment supprimer l'année scolaire « ${deleting?.name} » ? Cette action est irréversible.`}
        onConfirm={handleDelete}
        loading={formLoading}
      />
    </div>
  );
}