"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable } from '@/components/shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';

type AuditRow = {
  id: string;
  actorType: string | null;
  actorIdentifier: string | null;
  action: string;
  entity: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export default function JournalAuditPage() {
  const [data, setData] = useState<AuditRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, totalItems: 0, totalPages: 1 });
  const [entityFilter, setEntityFilter] = useState('');

  const fetchData = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (entityFilter) params.set('entity', entityFilter);
      const res = await fetch(`/api/audit?${params}`);
      if (!res.ok) throw new Error('Erreur');
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination ?? { page: 1, limit: 50, totalItems: 0, totalPages: 1 });
    } catch {
      toast.error('Erreur lors du chargement du journal.');
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect -- data fetch */
  useEffect(() => { void fetchData(); }, [entityFilter]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const formatValue = (v: string | null) => {
    if (!v) return '—';
    try { return JSON.stringify(JSON.parse(v), null, 1).substring(0, 120); } catch { return v.substring(0, 120); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal d'audit"
        description="Historique des actions effectuées sur la plateforme."
      />
      <div className="flex items-center gap-2">
        <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par entité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les entités</SelectItem>
            <SelectItem value="student">Élèves</SelectItem>
            <SelectItem value="enrollment">Inscriptions</SelectItem>
            <SelectItem value="classroom_assignment">Affectations</SelectItem>
            <SelectItem value="classroom">Classes</SelectItem>
            <SelectItem value="academic_year">Années scolaires</SelectItem>
            <SelectItem value="subject">Matières</SelectItem>
            <SelectItem value="assessment">Évaluations</SelectItem>
            <SelectItem value="grade">Notes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={[
          { key: 'createdAt', label: 'Date', render: (item) => formatDate(item.createdAt) },
          { key: 'actor', label: 'Acteur', render: (item) => item.actorIdentifier ?? item.actorType ?? '—' },
          { key: 'action', label: 'Action' },
          { key: 'entity', label: 'Entité' },
          { key: 'newValue', label: 'Détails', render: (item) => formatValue(item.newValue) },
          { key: 'ip', label: 'IP', render: (item) => item.ipAddress ?? '—' },
        ]}
        data={data}
        pagination={pagination}
        onPageChange={(p) => fetchData(p)}
        getId={(item) => item.id}
        emptyMessage="Aucun événement d'audit trouvé."
      />
    </div>
  );
}
