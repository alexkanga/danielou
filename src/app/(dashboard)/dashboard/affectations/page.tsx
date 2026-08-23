"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable, FormDialog } from '@/components/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';

type AssignmentRow = {
  id: string;
  enrollmentId: string;
  classroomId: string;
  classroomName: string;
  levelName: string;
  yearName: string;
  studentFirstName: string;
  studentLastName: string;
  studentMatricule: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
};

export default function AffectationsPage() {
  const [data, setData] = useState<AssignmentRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, totalItems: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [enrollments, setEnrollments] = useState<{ id: string; studentFirstName: string; studentLastName: string; studentMatricule: string | null; yearName: string }[]>([]);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; levelName: string }[]>([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [startDate, setStartDate] = useState('');

  const fetchReferences = async () => {
    try {
      const [enrRes, clsRes] = await Promise.all([
        fetch('/api/inscriptions?limit=200'),
        fetch('/api/classes?limit=100'),
      ]);
      if (enrRes.ok) {
        const json = await enrRes.json();
        setEnrollments((json.data ?? []).map((e: { id: string; studentFirstName: string; studentLastName: string; studentMatricule: string | null; yearName: string }) => e));
      }
      if (clsRes.ok) {
        const json = await clsRes.json();
        setClassrooms((json.data ?? []).map((c: { id: string; name: string; levelName: string }) => c));
      }
    } catch { /* silent */ }
  };

  const fetchData = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      const res = await fetch(`/api/affectations?${params}`);
      if (!res.ok) throw new Error('Erreur');
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination ?? { page: 1, limit: 25, totalItems: 0, totalPages: 1 });
    } catch {
      toast.error('Erreur lors du chargement des affectations.');
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect -- data fetch on mount */
  useEffect(() => { fetchReferences().catch(() => {}); void fetchData(); });
  /* eslint-enable react-hooks/set-state-in-effect */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []

  const handleSubmit = async () => {
    if (!selectedEnrollment || !selectedClassroom || !startDate) {
      toast.error('Tous les champs sont requis.');
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch('/api/affectations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId: selectedEnrollment, classroomId: selectedClassroom, startDate }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success('Affectation creee.');
      setFormOpen(false);
      fetchData(pagination.page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setFormLoading(false);
    }
  };

  const openCreate = () => {
    setSelectedEnrollment('');
    setSelectedClassroom('');
    setStartDate('');
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Affectations de classe"
        description="Affectez les eleves inscrits a des classes."
        action={{ label: 'Nouvelle affectation', onClick: openCreate }}
      />
      <DataTable
        columns={[
          { key: 'student', label: 'Eleve', render: (item: AssignmentRow) => `${item.studentLastName} ${item.studentFirstName}` },
          { key: 'matricule', label: 'Matricule', render: (item: AssignmentRow) => item.studentMatricule ?? '—' },
          { key: 'classroom', label: 'Classe', render: (item: AssignmentRow) => item.classroomName },
          { key: 'level', label: 'Niveau', render: (item: AssignmentRow) => item.levelName },
          { key: 'year', label: 'Annee', render: (item: AssignmentRow) => item.yearName },
          { key: 'status', label: 'Statut', render: (item: AssignmentRow) => item.status },
          { key: 'startDate', label: 'Debut', render: (item: AssignmentRow) => item.startDate ? formatDate(item.startDate) : '—' },
          { key: 'endDate', label: 'Fin', render: (item: AssignmentRow) => item.endDate ? formatDate(item.endDate) : '—' },
        ]}
        data={data}
        pagination={pagination}
        onPageChange={(p: number) => fetchData(p)}
        onSearch={(s: string) => { setSearch(s); fetchData(1); }}
        searchable
        searchPlaceholder="Rechercher..."
        getId={(item: AssignmentRow) => item.id}
        emptyMessage="Aucune affectation trouvee."
      />
      <FormDialog open={formOpen} onOpenChange={setFormOpen} title="Nouvelle affectation" onSubmit={handleSubmit} loading={formLoading}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="aff-enr">Inscription *</Label>
            <Select value={selectedEnrollment} onValueChange={setSelectedEnrollment}>
              <SelectTrigger id="aff-enr"><SelectValue placeholder="Selectionner" /></SelectTrigger>
              <SelectContent>
                {enrollments.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.studentLastName} {e.studentFirstName} — {e.yearName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aff-cls">Classe *</Label>
            <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
              <SelectTrigger id="aff-cls"><SelectValue placeholder="Selectionner" /></SelectTrigger>
              <SelectContent>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} ({c.levelName})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="aff-date">Date de debut *</Label>
            <Input id="aff-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
