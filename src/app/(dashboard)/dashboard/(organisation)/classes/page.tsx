"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable, FormDialog, DeleteDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
import type { Classroom, Level, AcademicYear } from '@/lib/db/schema';
import type { PaginatedResult } from '@/lib/data-access/pagination';

type ClassroomListItem = Classroom & {
  levelName: string;
  yearName: string;
  studentCount: number;
};

export default function ClassesPage() {
  const [data, setData] = useState<ClassroomListItem[]>([]);
  const [pagination, setPagination] = useState<PaginatedResult<ClassroomListItem>['pagination']>({
    page: 1, limit: 20, totalItems: 0, totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<ClassroomListItem | null>(null);
  const [deleting, setDeleting] = useState<ClassroomListItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // References for dropdowns
  const [levels, setLevels] = useState<Level[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);

  // Form
  const [name, setName] = useState('');
  const [levelId, setLevelId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');

  const fetchReferences = async () => {
    try {
      const [lvlRes, yrRes] = await Promise.all([
        fetch('/api/niveaux?limit=100'),
        fetch('/api/annees-scolaires?limit=100'),
      ]);
      if (lvlRes.ok) {
        const lvlJson = await lvlRes.json();
        setLevels(lvlJson.data ?? []);
      }
      if (yrRes.ok) {
        const yrJson = await yrRes.json();
        setYears(yrJson.data ?? []);
      }
    } catch {
      // Silent — references are nice-to-have
    }
  };

  const fetchData = async (page = 1, searchStr = search) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchStr) params.set('search', searchStr);
      const res = await fetch(`/api/classes?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      const json: PaginatedResult<ClassroomListItem> = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch {
      toast.error('Erreur lors du chargement des classes.');
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect -- data fetch on mount */
  useEffect(() => {
    fetchReferences().catch(() => {});
    void fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openCreate = () => {
    setEditing(null);
    setName('');
    setLevelId(levels[0]?.id ?? '');
    setAcademicYearId(years[0]?.id ?? '');
    setFormOpen(true);
  };

  const openEdit = (item: ClassroomListItem) => {
    setEditing(item);
    setName(item.name);
    setLevelId(item.levelId);
    setAcademicYearId(item.academicYearId);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !levelId || !academicYearId) {
      toast.error('Veuillez remplir tous les champs.');
      return;
    }
    setFormLoading(true);
    try {
      const url = editing ? `/api/classes/${editing.id}` : '/api/classes';
      const method = editing ? 'PUT' : 'POST';
      const body: Record<string, string> = { name: name.trim(), levelId, academicYearId };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success(editing ? 'Classe modifiée.' : 'Classe créée.');
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
      const res = await fetch(`/api/classes/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 409) throw new Error('Cette classe contient des élèves ou des évaluations.');
        throw new Error('Erreur lors de la suppression.');
      }
      toast.success('Classe supprimée.');
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
        title="Classes"
        description="Gérez les classes par niveau et année scolaire."
        action={{ label: 'Nouvelle classe', onClick: openCreate }}
      />

      <DataTable
        columns={[
          { key: 'name', label: 'Nom' },
          { key: 'levelName', label: 'Niveau' },
          { key: 'yearName', label: 'Année' },
          {
            key: 'studentCount', label: 'Élèves',
            render: (item) => (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {item.studentCount}
              </span>
            ),
          },
        ]}
        data={data}
        pagination={pagination}
        onPageChange={(p) => fetchData(p, search)}
        onSearch={(s) => { setSearch(s); fetchData(1, s); }}
        searchable
        searchPlaceholder="Rechercher une classe..."
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
        emptyMessage="Aucune classe trouvée."
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Modifier la classe' : 'Nouvelle classe'}
        onSubmit={handleSubmit}
        loading={formLoading}
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cls-name">Nom de la classe</Label>
            <Input id="cls-name" placeholder="Ex: 6ème A" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cls-level">Niveau</Label>
            <Select value={levelId} onValueChange={setLevelId}>
              <SelectTrigger id="cls-level"><SelectValue placeholder="Sélectionner un niveau" /></SelectTrigger>
              <SelectContent>
                {levels.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cls-year">Année scolaire</Label>
            <Select value={academicYearId} onValueChange={setAcademicYearId}>
              <SelectTrigger id="cls-year"><SelectValue placeholder="Sélectionner une année" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        description={`Voulez-vous vraiment supprimer la classe \u00AB ${deleting?.name} \u00BB ?`}
        onConfirm={handleDelete}
        loading={formLoading}
      />
    </div>
  );
}
