"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable, FormDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';

type EnrollmentRow = {
  id: string;
  studentId: string;
  academicYearId: string;
  status: string;
  enrolledAt: string | null;
  exitedAt: string | null;
  createdAt: string;
  updatedAt: string;
  studentFirstName: string;
  studentLastName: string;
  studentMatricule: string | null;
  yearName: string;
};

export default function InscriptionsPage() {
  const [data, setData] = useState<EnrollmentRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, totalItems: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [students, setStudents] = useState<{ id: string; firstName: string; lastName: string; matricule: string | null }[]>([]);
  const [years, setYears] = useState<{ id: string; name: string }[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const fetchReferences = async () => {
    try {
      const [stuRes, yrRes] = await Promise.all([
        fetch('/api/eleves?limit=200'),
        fetch('/api/annees-scolaires?limit=20'),
      ]);
      if (stuRes.ok) {
        const json = await stuRes.json();
        setStudents((json.data ?? []).map((s: EnrollmentRow['studentFirstName'] & { id: string; matricule: string | null; firstName: string; lastName: string }) => ({
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          matricule: s.matricule,
        })));
      }
      if (yrRes.ok) {
        const json = await yrRes.json();
        setYears((json.data ?? []).map((y: { id: string; name: string }) => y));
      }
    } catch { /* silent */ }
  };

  const fetchData = async (page = 1, searchStr = search) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (searchStr) params.set('search', searchStr);
      const res = await fetch(`/api/inscriptions?${params}`);
      if (!res.ok) throw new Error('Erreur');
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination ?? { page: 1, limit: 25, totalItems: 0, totalPages: 1 });
    } catch {
      toast.error('Erreur lors du chargement des inscriptions.');
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect -- data fetch on mount */
  useEffect(() => { fetchReferences().catch(() => {}); void fetchData(); });
  /* eslint-enable react-hooks/set-state-in-effect */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []

  const handleSubmit = async () => {
    if (!selectedStudent || !selectedYear) {
      toast.error('Veuillez sélectionner un élève et une année scolaire.');
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch('/api/inscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent, academicYearId: selectedYear }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success('Inscription créée.');
      setFormOpen(false);
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
        title="Inscriptions"
        description="Gérez les inscriptions des élèves par année scolaire."
        action={{ label: 'Nouvelle inscription', onClick: () => { setSelectedStudent(''); setSelectedYear(''); setFormOpen(true); } }}
      />
      <DataTable
        columns={[
          { key: 'student', label: 'Élève', render: (item) => `${item.studentLastName} ${item.studentFirstName}` },
          { key: 'matricule', label: 'Matricule', render: (item) => item.studentMatricule ?? '—' },
          { key: 'year', label: 'Année scolaire', render: (item) => item.yearName },
          { key: 'status', label: 'Statut', render: (item) => item.status },
          { key: 'enrolledAt', label: 'Date inscription', render: (item) => item.enrolledAt ? formatDate(item.enrolledAt) : '—' },
          { key: 'exitedAt', label: 'Date sortie', render: (item) => item.exitedAt ? formatDate(item.exitedAt) : '—' },
        ]}
        data={data}
        pagination={pagination}
        onPageChange={(p) => fetchData(p, search)}
        onSearch={(s) => { setSearch(s); fetchData(1, s); }}
        searchable
        searchPlaceholder="Rechercher par nom..."
        getId={(item) => item.id}
        emptyMessage="Aucune inscription trouvée."
      />
      <FormDialog open={formOpen} onOpenChange={setFormOpen} title="Nouvelle inscription" onSubmit={handleSubmit} loading={formLoading}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ins-student">Élève *</Label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger id="ins-student"><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.lastName} {s.firstName} {s.matricule ? `(${s.matricule})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ins-year">Année scolaire *</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger id="ins-year"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
