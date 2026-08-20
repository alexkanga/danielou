"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable, FormDialog, DeleteDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Student } from '@/lib/db/schema';
import type { PaginatedResult } from '@/lib/data-access/pagination';

type StudentWithEnrollment = Student & {
  enrollment: { classroomId: string; classroomName: string; levelName: string; academicYearId: string } | null;
};

export default function ElevesPage() {
  const [data, setData] = useState<StudentWithEnrollment[]>([]);
  const [pagination, setPagination] = useState<PaginatedResult<StudentWithEnrollment>['pagination']>({
    page: 1, limit: 20, totalItems: 0, totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<StudentWithEnrollment | null>(null);
  const [deleting, setDeleting] = useState<StudentWithEnrollment | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // References
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; levelName: string; yearName: string }[]>([]);
  const [years, setYears] = useState<{ id: string; name: string }[]>([]);

  // Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');

  const fetchReferences = async () => {
    try {
      const [clsRes, yrRes] = await Promise.all([
        fetch('/api/classes?limit=100'),
        fetch('/api/annees-scolaires?limit=100'),
      ]);
      if (clsRes.ok) {
        const clsJson = await clsRes.json();
        setClassrooms((clsJson.data ?? []).map((c: { id: string; name: string; levelName: string; yearName: string }) => c));
      }
      if (yrRes.ok) {
        const yrJson = await yrRes.json();
        setYears((yrJson.data ?? []).map((y: { id: string; name: string }) => y));
      }
    } catch {
      // Silent
    }
  };

  const fetchData = async (page = 1, searchStr = search) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchStr) params.set('search', searchStr);
      const res = await fetch(`/api/eleves?${params}`);
      if (!res.ok) throw new Error();
      const json: PaginatedResult<StudentWithEnrollment> = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch {
      toast.error('Erreur lors du chargement des élèves.');
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
    setFirstName('');
    setLastName('');
    setDateOfBirth('');
    setGender('');
    setClassroomId(classrooms[0]?.id ?? '');
    setAcademicYearId(years[0]?.id ?? '');
    setFormOpen(true);
  };

  const openEdit = (item: StudentWithEnrollment) => {
    setEditing(item);
    setFirstName(item.firstName);
    setLastName(item.lastName);
    setDateOfBirth(item.dateOfBirth ?? '');
    setGender(item.gender ?? '');
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Le prénom et le nom sont requis.');
      return;
    }
    if (!editing && (!classroomId || !academicYearId)) {
      toast.error('Veuillez sélectionner une classe et une année scolaire.');
      return;
    }
    setFormLoading(true);
    try {
      const isCreate = !editing;
      const url = isCreate ? '/api/eleves' : `/api/eleves/${editing.id}`;
      const method = isCreate ? 'POST' : 'PUT';
      const body: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
      };
      if (isCreate) {
        body.classroomId = classroomId;
        body.academicYearId = academicYearId;
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
      toast.success(isCreate ? 'Élève inscrit.' : 'Élève modifié.');
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
      const res = await fetch(`/api/eleves/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur lors de la suppression.');
      toast.success('Élève supprimé.');
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
        title="Élèves"
        description="Gérez les inscriptions et les informations des élèves."
        action={{ label: 'Nouvel élève', onClick: openCreate }}
      />

      <DataTable
        columns={[
          { key: 'matricule', label: 'Matricule', render: (item) => (
            <span className="font-mono text-xs">{item.matricule}</span>
          )},
          { key: 'lastName', label: 'Nom' },
          { key: 'firstName', label: 'Prénom' },
          { key: 'gender', label: 'Sexe', render: (item) => item.gender === 'M' ? 'M' : item.gender === 'F' ? 'F' : '—' },
          { key: 'dateOfBirth', label: 'Naissance', render: (item) => item.dateOfBirth ? formatDate(item.dateOfBirth) : '—' },
          { key: 'classroom', label: 'Classe', render: (item) => item.enrollment?.classroomName ?? '—' },
          { key: 'level', label: 'Niveau', render: (item) => item.enrollment?.levelName ?? '—' },
        ]}
        data={data}
        pagination={pagination}
        onPageChange={(p) => fetchData(p, search)}
        onSearch={(s) => { setSearch(s); fetchData(1, s); }}
        searchable
        searchPlaceholder="Rechercher par nom ou matricule..."
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
        emptyMessage="Aucun élève trouvé."
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Modifier l'élève" : 'Nouvel élève'}
        onSubmit={handleSubmit}
        loading={formLoading}
      >
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stu-lastname">Nom *</Label>
              <Input id="stu-lastname" placeholder="Koné" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stu-firstname">Prénom *</Label>
              <Input id="stu-firstname" placeholder="Amadou" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stu-dob">Date de naissance</Label>
              <Input id="stu-dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stu-gender">Sexe</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="stu-gender"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculin</SelectItem>
                  <SelectItem value="F">Féminin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!editing && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stu-class">Classe *</Label>
                <Select value={classroomId} onValueChange={setClassroomId}>
                  <SelectTrigger id="stu-class"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {classrooms.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.levelName})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stu-year">Année scolaire *</Label>
                <Select value={academicYearId} onValueChange={setAcademicYearId}>
                  <SelectTrigger id="stu-year"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        description={
          deleting
            ? `Voulez-vous vraiment supprimer ${deleting.firstName} ${deleting.lastName} (${deleting.matricule}) ? Toutes ses inscriptions et notes seront supprimées.`
            : ''
        }
        onConfirm={handleDelete}
        loading={formLoading}
      />
    </div>
  );
}
