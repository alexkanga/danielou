"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PageHeader, DataTable, FormDialog, DeleteDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Level } from '@/lib/db/schema';
import type { PaginatedResult } from '@/lib/data-access/pagination';

export default function NiveauxPage() {
  const [data, setData] = useState<Level[]>([]);
  const [pagination, setPagination] = useState<PaginatedResult<Level>['pagination']>({
    page: 1, limit: 20, totalItems: 0, totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Level | null>(null);
  const [deleting, setDeleting] = useState<Level | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  const fetchData = async (page = 1, searchStr = search) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchStr) params.set('search', searchStr);
      const res = await fetch(`/api/niveaux?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      const json: PaginatedResult<Level> = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch {
      toast.error('Erreur lors du chargement des niveaux.');
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect -- data fetch on mount */
  useEffect(() => {
    void fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openCreate = () => {
    setEditing(null);
    setName('');
    setSortOrder('0');
    setFormOpen(true);
  };

  const openEdit = (item: Level) => {
    setEditing(item);
    setName(item.name);
    setSortOrder(String(item.sortOrder));
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Le nom est requis.'); return; }
    setFormLoading(true);
    try {
      const url = editing ? `/api/niveaux/${editing.id}` : '/api/niveaux';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), sortOrder: parseInt(sortOrder, 10) || 0 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success(editing ? 'Niveau modifié.' : 'Niveau créé.');
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
      const res = await fetch(`/api/niveaux/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 409) throw new Error('Ce niveau est utilisé par des classes.');
        throw new Error('Erreur lors de la suppression.');
      }
      toast.success('Niveau supprimé.');
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
        title="Niveaux"
        description="Gérez les niveaux d'enseignement de l'école."
        action={{ label: 'Nouveau niveau', onClick: openCreate }}
      />

      <DataTable
        columns={[
          { key: 'sortOrder', label: '#', render: (item) => item.sortOrder },
          { key: 'name', label: 'Nom' },
        ]}
        data={data}
        pagination={pagination}
        onPageChange={(p) => fetchData(p, search)}
        onSearch={(s) => { setSearch(s); fetchData(1, s); }}
        searchable
        searchPlaceholder="Rechercher un niveau..."
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
        emptyMessage="Aucun niveau trouvé."
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Modifier le niveau' : 'Nouveau niveau'}
        onSubmit={handleSubmit}
        loading={formLoading}
      >
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="level-name">Nom</Label>
            <Input
              id="level-name"
              placeholder="Ex: 6ème"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="level-order">Ordre d&apos;affichage</Label>
            <Input
              id="level-order"
              type="number"
              min="0"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        description={`Voulez-vous vraiment supprimer le niveau \u00AB ${deleting?.name} \u00BB ? Cette action est irréversible.`}
        onConfirm={handleDelete}
        loading={formLoading}
      />
    </div>
  );
}
