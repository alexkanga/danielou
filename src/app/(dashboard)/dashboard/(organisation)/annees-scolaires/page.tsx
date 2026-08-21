"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable, FormDialog, DeleteDialog, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { AcademicYear, AcademicPeriod } from '@/lib/db/schema';
import type { PaginatedResult } from '@/lib/data-access/pagination';

type YearWithPeriods = AcademicYear & { periods?: AcademicPeriod[] };

type YearListItem = AcademicYear & { periods: AcademicPeriod[] };

export default function AnneesScolairesPage() {
  const [data, setData] = useState<YearListItem[]>([]);
  const [pagination, setPagination] = useState<PaginatedResult<YearWithPeriods>['pagination']>({
    page: 1, limit: 20, totalItems: 0, totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<YearWithPeriods | null>(null);
  const [deleting, setDeleting] = useState<YearWithPeriods | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Year form
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'preparation' | 'active' | 'closed'>('preparation');

  // Periods form (for create only)
  const [periods, setPeriods] = useState<{ name: string; startDate: string; endDate: string }[]>([
    { name: '1er trimestre', startDate: '', endDate: '' },
  ]);

  const fetchData = async (page = 1, searchStr = search) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchStr) params.set('search', searchStr);
      const res = await fetch(`/api/annees-scolaires?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      const json: PaginatedResult<YearWithPeriods> = await res.json();
      setData(json.data.map((y) => ({ ...y, periods: y.periods ?? [] })));
      setPagination(json.pagination);
    } catch {
      toast.error('Erreur lors du chargement des années scolaires.');
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect -- data fetch on mount */
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
    setPeriods([{ name: '1er trimestre', startDate: '', endDate: '' }]);
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

  const addPeriod = () => {
    setPeriods([...periods, { name: '', startDate: '', endDate: '' }]);
  };

  const removePeriod = (idx: number) => {
    setPeriods(periods.filter((_, i) => i !== idx));
  };

  const updatePeriod = (idx: number, field: string, value: string) => {
    const updated = [...periods];
    (updated[idx] as Record<string, string>)[field] = value;
    setPeriods(updated);
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
      const body: Record<string, unknown> = {
        name: name.trim(),
        startDate,
        endDate,
        status,
      };
      if (!editing && periods.length > 0) {
        body.periods = periods
          .filter((p) => p.name.trim() && p.startDate && p.endDate)
          .map((p, i) => ({ ...p, sortOrder: i + 1 }));
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
        if (res.status === 409) throw new Error('Cette année scolaire est utilisée par des classes.');
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
        description="Gérez les années scolaires et leurs périodes."
        action={{ label: 'Nouvelle année', onClick: openCreate }}
      />

      <DataTable
        columns={[
          { key: 'name', label: 'Nom' },
          { key: 'startDate', label: 'Début', render: (item) => formatDate(item.startDate) },
          { key: 'endDate', label: 'Fin', render: (item) => formatDate(item.endDate) },
          { key: 'status', label: 'Statut', render: (item) => <StatusBadge status={item.status} /> },
          {
            key: 'periods', label: 'Périodes',
            render: (item) => (
              <span className="text-muted-foreground">
                {item.periods?.length ?? 0} période{(item.periods?.length ?? 0) > 1 ? 's' : ''}
              </span>
            ),
          },
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
              <Label htmlFor="ay-name">Nom</Label>
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
              <Label htmlFor="ay-start">Date de début</Label>
              <Input id="ay-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ay-end">Date de fin</Label>
              <Input id="ay-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {!editing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Périodes</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPeriod}>
                  <CalendarDays className="mr-1 h-3 w-3" /> Ajouter
                </Button>
              </div>
              {periods.map((p, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                  <div className="space-y-1">
                    {i === 0 && <Label className="text-xs text-muted-foreground">Nom</Label>}
                    <Input placeholder="1er trimestre" value={p.name} onChange={(e) => updatePeriod(i, 'name', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    {i === 0 && <Label className="text-xs text-muted-foreground">Début</Label>}
                    <Input type="date" value={p.startDate} onChange={(e) => updatePeriod(i, 'startDate', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    {i === 0 && <Label className="text-xs text-muted-foreground">Fin</Label>}
                    <Input type="date" value={p.endDate} onChange={(e) => updatePeriod(i, 'endDate', e.target.value)} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => removePeriod(i)} disabled={periods.length <= 1}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        description={`Voulez-vous vraiment supprimer l’année scolaire « ${deleting?.name} » ? Cette action est irréversible.`}
        onConfirm={handleDelete}
        loading={formLoading}
      />
    </div>
  );
}
