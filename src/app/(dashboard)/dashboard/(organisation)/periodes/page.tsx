"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable, FormDialog, DeleteDialog, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { PERIOD_TYPE_LABELS } from '@/lib/validations/scolarite';
import type { PaginatedResult } from '@/lib/data-access/pagination';

type PeriodItem = {
  id: string;
  academicYearId: string;
  levelId: string | null;
  name: string;
  periodType: string;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
  levelName?: string | null;
  academicYearName?: string | null;
  createdAt: string;
  updatedAt: string;
};

type LevelOption = { id: string; name: string };
type YearOption = { id: string; name: string };

export default function PeriodesPage() {
  const [data, setData] = useState<PeriodItem[]>([]);
  const [pagination, setPagination] = useState<PaginatedResult<PeriodItem>['pagination']>({
    page: 1, limit: 25, totalItems: 0, totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<PeriodItem | null>(null);
  const [deleting, setDeleting] = useState<PeriodItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Filters
  const [years, setYears] = useState<YearOption[]>([]);
  const [levels, setLevels] = useState<LevelOption[]>([]);
  const [filterYear, setFilterYear] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterType, setFilterType] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [periodType, setPeriodType] = useState('other');
  const [academicYearId, setAcademicYearId] = useState('');
  const [levelId, setLevelId] = useState<string>('__global__');
  const [sortOrder, setSortOrder] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('draft');

  const fetchFilters = async () => {
    try {
      const [yRes, lRes] = await Promise.all([
        fetch('/api/annees-scolaires?limit=100'),
        fetch('/api/niveaux?limit=100'),
      ]);
      if (yRes.ok) {
        const yJson = await yRes.json();
        setYears(yJson.data ?? []);
      }
      if (lRes.ok) {
        const lJson = await lRes.json();
        setLevels(lJson.data ?? []);
      }
    } catch {
      // silent
    }
  };

  const fetchData = useCallback(async (page = 1, searchStr = search) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (searchStr) params.set('search', searchStr);
      if (filterYear) params.set('academicYearId', filterYear);
      if (filterLevel) params.set('levelId', filterLevel);
      if (filterType) params.set('periodType', filterType);
      const res = await fetch(`/api/periodes?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      const json: PaginatedResult<PeriodItem> = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch {
      toast.error('Erreur lors du chargement des périodes.');
    }
  }, [search, filterYear, filterLevel, filterType]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchFilters();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetForm = () => {
    setEditing(null);
    setName('');
    setPeriodType('other');
    setAcademicYearId('');
    setLevelId('__global__');
    setSortOrder('');
    setStartDate('');
    setEndDate('');
    setStatus('draft');
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = async (item: PeriodItem) => {
    setEditing(item);
    setName(item.name);
    setPeriodType(item.periodType);
    setAcademicYearId(item.academicYearId);
    setLevelId(item.levelId ?? '__global__');
    setSortOrder(String(item.sortOrder));
    setStartDate(item.startDate ?? '');
    setEndDate(item.endDate ?? '');
    setStatus(item.status);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !academicYearId) {
      toast.error('Veuillez remplir les champs obligatoires (nom, année scolaire).');
      return;
    }
    setFormLoading(true);
    try {
      const url = editing ? `/api/periodes/${editing.id}` : '/api/periodes';
      const method = editing ? 'PUT' : 'POST';
      const body: Record<string, unknown> = {
        name: name.trim(),
        periodType,
        startDate: startDate || null,
        endDate: endDate || null,
        status,
      };
      if (!editing) {
        body.academicYearId = academicYearId;
        body.levelId = levelId === '__global__' ? null : levelId;
        if (sortOrder) body.sortOrder = parseInt(sortOrder, 10);
      } else {
        if (levelId === '__global__') body.levelId = null;
        else if (levelId !== editing.levelId) body.levelId = levelId;
        if (sortOrder) body.sortOrder = parseInt(sortOrder, 10);
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
      toast.success(editing ? 'Période modifiée.' : 'Période créée.');
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
      const res = await fetch(`/api/periodes/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 409) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Cette période est utilisée et ne peut pas être supprimée.');
        }
        throw new Error('Erreur lors de la suppression.');
      }
      toast.success('Période supprimée.');
      setDeleteOpen(false);
      setDeleting(null);
      fetchData(pagination.page, search);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setFormLoading(false);
    }
  };

  const periodTypeBadge = (t: string) => {
    const label = PERIOD_TYPE_LABELS[t] || t;
    const colorClass: Record<string, string> = {
      trimester: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      semester: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      composition: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      passage: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass[t] || colorClass.other}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Périodes d'évaluation"
        description="Gérez les périodes d'évaluation : compositions, trimestres, devoirs de passage."
        action={{ label: 'Nouvelle période', onClick: openCreate }}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterYear} onValueChange={(v) => { setFilterYear(v); fetchData(1, search); }}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Toutes les années" /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterLevel} onValueChange={(v) => { setFilterLevel(v); fetchData(1, search); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tous niveaux" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Tous les niveaux</SelectItem>
            {levels.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); fetchData(1, search); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tous types" /></SelectTrigger>
          <SelectContent>
            {Object.entries(PERIOD_TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={[
          { key: 'academicYearName', label: 'Année' },
          { key: 'name', label: 'Nom' },
          { key: 'periodType', label: 'Type', render: (item) => periodTypeBadge(item.periodType) },
          { key: 'levelName', label: 'Niveau', render: (item) => <span>{item.levelName ?? 'Tous niveaux'}</span> },
          { key: 'sortOrder', label: 'Ordre' },
          { key: 'startDate', label: 'Début', render: (item) => item.startDate ? formatDate(item.startDate) : '—' },
          { key: 'endDate', label: 'Fin', render: (item) => item.endDate ? formatDate(item.endDate) : '—' },
          { key: 'status', label: 'Statut', render: (item) => <StatusBadge status={item.status} /> },
        ]}
        data={data}
        pagination={pagination}
        onPageChange={(p) => fetchData(p, search)}
        onSearch={(s) => { setSearch(s); fetchData(1, s); }}
        searchable
        searchPlaceholder="Rechercher une période..."
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
        emptyMessage="Aucune période trouvée."
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Modifier la période' : 'Nouvelle période'}
        onSubmit={handleSubmit}
        loading={formLoading}
      >
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-name">Nom *</Label>
              <Input id="p-name" placeholder="Composition 1" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-type">Type *</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger id="p-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PERIOD_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-year">Année scolaire *</Label>
              <Select value={academicYearId} onValueChange={setAcademicYearId} disabled={!!editing}>
                <SelectTrigger id="p-year"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-level">Portée</Label>
              <Select value={levelId} onValueChange={setLevelId}>
                <SelectTrigger id="p-level"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global__">Tous les niveaux</SelectItem>
                  {levels.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-order">Ordre</Label>
              <Input id="p-order" type="number" min="1" placeholder="Auto" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-start">Date de début</Label>
              <Input id="p-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-end">Date de fin</Label>
              <Input id="p-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-status">Statut</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger id="p-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="open">Ouverte</SelectItem>
                <SelectItem value="closed">Fermée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        description={`Voulez-vous vraiment supprimer la période « ${deleting?.name} » ? Cette action est irréversible si la période n'est pas utilisée.`}
        onConfirm={handleDelete}
        loading={formLoading}
      />
    </div>
  );
}
