"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable, FormDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

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

const SCHOOL_ROLES = [
  { value: 'admin', label: 'Administrateur' },
  { value: 'direction', label: 'Direction' },
  { value: 'teacher', label: 'Enseignant' },
  { value: 'reader', label: 'Lecteur' },
] as const;

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  direction: 'Direction',
  teacher: 'Enseignant',
  reader: 'Lecteur',
};

const PLATFORM_ROLE_LABELS: Record<string, string> = {
  ghost: 'Ghost',
  super_admin: 'Super Administrateur',
  none: 'Aucun',
};

// ─────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────

export default function UtilisateursPage() {
  const [data, setData] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, totalItems: 0, totalPages: 1 });
  const [search, setSearch] = useState('');

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', username: '', password: '', role: 'reader' as string });

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editId, setEditId] = useState('');
  const [editForm, setEditForm] = useState({ name: '', email: '', username: '', role: '' });

  // ─────────────────────────────────────────────
  // Fetch data
  // ─────────────────────────────────────────────

  const fetchData = useCallback(async (page = 1, searchStr = search) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (searchStr) params.set('search', searchStr);
      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) throw new Error('Erreur');
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination ?? { page: 1, limit: 50, totalItems: 0, totalPages: 1 });
    } catch {
      toast.error('Erreur lors du chargement des utilisateurs.');
    }
  }, [search]);

  /* eslint-disable react-hooks/set-state-in-effect -- data fetch on mount */
  useEffect(() => { void fetchData(1, ''); }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ─────────────────────────────────────────────
  // Create user
  // ─────────────────────────────────────────────

  const handleCreate = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success('Utilisateur créé avec succès.');
      setCreateOpen(false);
      setCreateForm({ name: '', email: '', username: '', password: '', role: 'reader' });
      fetchData(pagination.page, search);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setCreateLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Edit user
  // ─────────────────────────────────────────────

  const openEdit = (item: UserRow) => {
    setEditId(item.id);
    setEditForm({ name: item.name, email: item.email, username: item.username ?? '', role: item.role });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editForm.name || !editForm.email) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setEditLoading(true);
    try {
      const res = await fetch(`/api/users/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          username: editForm.username || null,
          role: editForm.role,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success('Utilisateur modifié.');
      setEditOpen(false);
      fetchData(pagination.page, search);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setEditLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Toggle active
  // ─────────────────────────────────────────────

  const handleToggleActive = async (item: UserRow) => {
    try {
      const res = await fetch(`/api/users/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_active' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success(item.isActive ? 'Utilisateur désactivé.' : 'Utilisateur activé.');
      fetchData(pagination.page, search);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  // ─────────────────────────────────────────────
  // Actions menu
  // ─────────────────────────────────────────────

  const isSystemUser = (item: UserRow) => item.id === 'fantomas-ghost' || item.isSuperAdmin;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description="Gestion des comptes utilisateurs."
        action={{ label: 'Ajouter un utilisateur', onClick: () => setCreateOpen(true) }}
      />

      <DataTable
        columns={[
          { key: 'name', label: 'Nom' },
          { key: 'email', label: 'Email' },
          { key: 'username', label: 'Identifiant', render: (item: UserRow) => item.username ?? '—' },
          { key: 'role', label: 'Rôle scolaire', render: (item: UserRow) => ROLE_LABELS[item.role] ?? item.role },
          { key: 'platformRole', label: 'Rôle plateforme', render: (item: UserRow) => PLATFORM_ROLE_LABELS[item.platformRole] ?? item.platformRole },
          { key: 'isActive', label: 'Actif', render: (item: UserRow) => (
            <span className={item.isActive ? 'text-green-600' : 'text-red-500'}>
              {item.isActive ? 'Oui' : 'Non'}
            </span>
          )},
          { key: 'createdAt', label: 'Créé le', render: (item: UserRow) => formatDate(item.createdAt) },
        ]}
        data={data}
        pagination={pagination}
        onPageChange={(p: number) => fetchData(p, search)}
        onSearch={(s: string) => { setSearch(s); fetchData(1, s); }}
        searchable
        searchPlaceholder="Rechercher par nom, email, identifiant..."
        getId={(item: UserRow) => item.id}
        emptyMessage="Aucun utilisateur trouvé."
        actions={(item: UserRow) => (
          <div className="flex items-center gap-1">
            {!isSystemUser(item) && (
              <>
                <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                  Modifier
                </Button>
                <Button
                  variant={item.isActive ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => void handleToggleActive(item)}
                >
                  {item.isActive ? 'Désactiver' : 'Activer'}
                </Button>
              </>
            )}
          </div>
        )}
      />

      {/* ── Create Dialog ── */}
      <FormDialog open={createOpen} onOpenChange={setCreateOpen} title="Ajouter un utilisateur" onSubmit={handleCreate} loading={createLoading} submitLabel="Créer">
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cu-name">Nom complet *</Label>
            <Input id="cu-name" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="Jean Dupont" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-email">Email *</Label>
            <Input id="cu-email" type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="jean@exemple.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-username">Identifiant</Label>
            <Input id="cu-username" value={createForm.username} onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))} placeholder="jdupont" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-password">Mot de passe initial *</Label>
            <Input id="cu-password" type="password" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 8 caractères" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-role">Rôle scolaire *</Label>
            <Select value={createForm.role} onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v }))}>
              <SelectTrigger id="cu-role"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {SCHOOL_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>

      {/* ── Edit Dialog ── */}
      <FormDialog open={editOpen} onOpenChange={setEditOpen} title="Modifier l'utilisateur" onSubmit={handleEdit} loading={editLoading} submitLabel="Enregistrer">
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="eu-name">Nom complet *</Label>
            <Input id="eu-name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eu-email">Email *</Label>
            <Input id="eu-email" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eu-username">Identifiant</Label>
            <Input id="eu-username" value={editForm.username} onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eu-role">Rôle scolaire</Label>
            <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}>
              <SelectTrigger id="eu-role"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {SCHOOL_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
