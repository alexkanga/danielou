"use client";

import { useState, useEffect } from 'react';
import { PageHeader, DataTable } from '@/components/shared';
import { formatDate } from '@/lib/utils';

type UserRow = {
  id: string;
  email: string;
  name: string;
  username: string | null;
  role: string;
  platformRole: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function UtilisateursPage() {
  const [data, setData] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, totalItems: 0, totalPages: 1 });

  const fetchData = async (page = 1) => {
    try {
      const res = await fetch(`/api/users?page=${page}&limit=50`);
      if (!res.ok) throw new Error('Erreur');
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination ?? { page: 1, limit: 50, totalItems: 0, totalPages: 1 });
    } catch {
      // Users API may not exist yet
    }
  };

  useEffect(() => { void fetchData(); }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description="Gestion des comptes utilisateurs."
      />
      <DataTable
        columns={[
          { key: 'name', label: 'Nom' },
          { key: 'email', label: 'Email' },
          { key: 'username', label: 'Identifiant', render: (item) => item.username ?? '—' },
          { key: 'role', label: 'Rôle scolaire' },
          { key: 'platformRole', label: 'Rôle plateforme' },
          { key: 'isSuperAdmin', label: 'Super Admin', render: (item) => item.isSuperAdmin ? 'Oui' : 'Non' },
          { key: 'isActive', label: 'Actif', render: (item) => item.isActive ? 'Oui' : 'Non' },
          { key: 'createdAt', label: 'Créé le', render: (item) => formatDate(item.createdAt) },
        ]}
        data={data}
        pagination={pagination}
        onPageChange={(p) => fetchData(p)}
        getId={(item) => item.id}
        emptyMessage="Aucun utilisateur trouvé."
      />
    </div>
  );
}
