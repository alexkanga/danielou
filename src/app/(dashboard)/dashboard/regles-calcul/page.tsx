"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader, DataTable, FormDialog, DeleteDialog, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Copy, Zap, Eye } from 'lucide-react';
import type { PaginatedResult } from '@/lib/data-access/pagination';

type ConfigListItem = {
  id: string;
  levelId: string;
  academicYearId: string;
  version: number;
  status: 'draft' | 'active' | 'archived';
  calculationPolicy: string;
  roundingStrategy: string;
  subjectDecimalPlaces: number;
  generalDecimalPlaces: number;
  rankingEnabled: boolean;
  conductEnabled: boolean;
  conductIncludedInAverage: boolean;
  conductCoefficient: string | null;
  conductScale: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  levelName: string;
  yearName: string;
  subjectCount: number;
};

type Level = { id: string; name: string };
type AcademicYear = { id: string; name: string };

const POLICY_LABELS: Record<string, string> = {
  simple_average: 'Moyenne simple',
  weighted_average: 'Moyenne pondérée',
  single_grade: 'Note unique',
};

export default function ReglesCalculPage() {
  const router = useRouter();
  const [data, setData] = useState<ConfigListItem[]>([]);
  const [pagination, setPagination] = useState<PaginatedResult<ConfigListItem>['pagination']>({
    page: 1, limit: 20, totalItems: 0, totalPages: 1,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<ConfigListItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // References
  const [levels, setLevels] = useState<Level[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [filterLevelId, setFilterLevelId] = useState('');
  const [filterYearId, setFilterYearId] = useState('');

  // Form fields
  const [levelId, setLevelId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [calculationPolicy, setCalculationPolicy] = useState('simple_average');
  const [roundingStrategy, setRoundingStrategy] = useState('half_up');
  const [subjectDecimalPlaces, setSubjectDecimalPlaces] = useState('2');
  const [generalDecimalPlaces, setGeneralDecimalPlaces] = useState('2');
  const [rankingEnabled, setRankingEnabled] = useState(true);
  const [conductEnabled, setConductEnabled] = useState(false);
  const [conductIncludedInAverage, setConductIncludedInAverage] = useState(false);
  const [conductCoefficient, setConductCoefficient] = useState('0');
  const [conductScale, setConductScale] = useState('20');
  const [description, setDescription] = useState('');
  const [promotionThreshold, setPromotionThreshold] = useState('');

  const fetchReferences = useCallback(async () => {
    try {
      const [lvlRes, yrRes] = await Promise.all([
        fetch('/api/niveaux?limit=100'),
        fetch('/api/annees-scolaires?limit=100'),
      ]);
      if (lvlRes.ok) { const j = await lvlRes.json(); setLevels(j.data ?? []); }
      if (yrRes.ok) { const j = await yrRes.json(); setYears(j.data ?? []); }
    } catch {
      // silent
    }
  }, []);

  const fetchData = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterLevelId) params.set('levelId', filterLevelId);
      if (filterYearId) params.set('academicYearId', filterYearId);
      const res = await fetch(`/api/regles-calcul?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      const json: PaginatedResult<ConfigListItem> = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch {
      toast.error('Erreur lors du chargement des configurations.');
    }
  }, [filterLevelId, filterYearId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchReferences();
  }, [fetchReferences]);
  useEffect(() => {
    void fetchData();
  }, [fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openCreate = () => {
    setLevelId(levels[0]?.id ?? '');
    setAcademicYearId(years[0]?.id ?? '');
    setCalculationPolicy('simple_average');
    setRoundingStrategy('half_up');
    setSubjectDecimalPlaces('2');
    setGeneralDecimalPlaces('2');
    setRankingEnabled(true);
    setConductEnabled(false);
    setConductIncludedInAverage(false);
    setConductCoefficient('0');
    setConductScale('20');
    setPromotionThreshold('');
    setDescription('');
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!levelId || !academicYearId) {
      toast.error('Le niveau et l\'année scolaire sont requis.');
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch('/api/regles-calcul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          levelId,
          academicYearId,
          calculationPolicy,
          roundingStrategy,
          subjectDecimalPlaces: parseInt(subjectDecimalPlaces, 10) || 2,
          generalDecimalPlaces: parseInt(generalDecimalPlaces, 10) || 2,
          rankingEnabled,
          conductEnabled,
          conductIncludedInAverage,
          conductCoefficient: conductEnabled ? (parseFloat(conductCoefficient) || null) : null,
          conductScale: conductEnabled ? (parseInt(conductScale, 10) || null) : null,
          promotionThreshold: promotionThreshold.trim() !== '' ? (parseFloat(promotionThreshold) || null) : null,
          description: description.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      const created = await res.json();
      toast.success('Configuration créée (brouillon).');
      setFormOpen(false);
      fetchData(pagination.page);
      router.push(`/dashboard/regles-calcul/${created.id}`);
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
      const res = await fetch(`/api/regles-calcul/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur lors de la suppression.');
      }
      toast.success('Configuration supprimée.');
      setDeleteOpen(false);
      setDeleting(null);
      fetchData(pagination.page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setFormLoading(false);
    }
  };

  const handleActivate = async (config: ConfigListItem) => {
    setActionLoading(config.id);
    try {
      const res = await fetch(`/api/regles-calcul/${config.id}/activate`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success('Configuration activée. L\'ancienne configuration active a été archivée.');
      fetchData(pagination.page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'activation.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClone = async (config: ConfigListItem) => {
    setActionLoading(config.id);
    try {
      const res = await fetch(`/api/regles-calcul/${config.id}/clone`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      const cloned = await res.json();
      toast.success(`Configuration clonée (version ${cloned.version}).`);
      fetchData(pagination.page);
      router.push(`/dashboard/regles-calcul/${cloned.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors du clonage.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Règles de calcul"
        description="Configurez les règles de calcul des moyennes par niveau et année scolaire."
        action={{ label: 'Nouvelle configuration', onClick: openCreate }}
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="w-full sm:w-56 space-y-1">
          <Label htmlFor="filter-level" className="text-xs text-muted-foreground">Niveau</Label>
          <Select value={filterLevelId} onValueChange={(v) => { setFilterLevelId(v === '__all__' ? '' : v); }}>
            <SelectTrigger id="filter-level" className="h-9">
              <SelectValue placeholder="Tous les niveaux" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Tous les niveaux</SelectItem>
              {levels.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-56 space-y-1">
          <Label htmlFor="filter-year" className="text-xs text-muted-foreground">Année scolaire</Label>
          <Select value={filterYearId} onValueChange={(v) => { setFilterYearId(v === '__all__' ? '' : v); }}>
            <SelectTrigger id="filter-year" className="h-9">
              <SelectValue placeholder="Toutes les années" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les années</SelectItem>
              {years.map((y) => (
                <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={[
          { key: 'levelName', label: 'Niveau' },
          { key: 'yearName', label: 'Année' },
          { key: 'version', label: 'V.' },
          { key: 'status', label: 'Statut', render: (item) => <StatusBadge status={item.status} /> },
          { key: 'calculationPolicy', label: 'Politique', render: (item) => POLICY_LABELS[item.calculationPolicy] ?? item.calculationPolicy },
          { key: 'subjectCount', label: 'Matières', render: (item) => item.subjectCount },
        ]}
        data={data}
        pagination={pagination}
        onPageChange={(p) => fetchData(p)}
        getId={(item) => item.id}
        actions={(item) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/dashboard/regles-calcul/${item.id}`)}>
                <Eye className="mr-2 h-4 w-4" /> Voir / Modifier
              </DropdownMenuItem>
              {item.status === 'draft' && (
                <DropdownMenuItem onClick={() => handleActivate(item)} disabled={actionLoading === item.id}>
                  <Zap className="mr-2 h-4 w-4" /> Activer
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleClone(item)} disabled={actionLoading === item.id}>
                <Copy className="mr-2 h-4 w-4" /> Cloner
              </DropdownMenuItem>
              {item.status === 'draft' && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => { setDeleting(item); setDeleteOpen(true); }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        emptyMessage="Aucune configuration trouvée."
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Nouvelle configuration de calcul"
        onSubmit={handleSubmit}
        loading={formLoading}
      >
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cfg-level">Niveau *</Label>
              <Select value={levelId} onValueChange={setLevelId}>
                <SelectTrigger id="cfg-level"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {levels.map((l) => (<SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-year">Année scolaire *</Label>
              <Select value={academicYearId} onValueChange={setAcademicYearId}>
                <SelectTrigger id="cfg-year"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => (<SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cfg-policy">Politique de calcul</Label>
              <Select value={calculationPolicy} onValueChange={setCalculationPolicy}>
                <SelectTrigger id="cfg-policy"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple_average">Moyenne simple</SelectItem>
                  <SelectItem value="weighted_average">Moyenne pondérée</SelectItem>
                  <SelectItem value="single_grade">Note unique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-rounding">Arrondi</Label>
              <Select value={roundingStrategy} onValueChange={setRoundingStrategy}>
                <SelectTrigger id="cfg-rounding"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="half_up">Arrondi supérieur</SelectItem>
                  <SelectItem value="half_even">Arrondi bancaire</SelectItem>
                  <SelectItem value="truncate">Troncature</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cfg-subj-dec">Décimales matière</Label>
              <Input id="cfg-subj-dec" type="number" min="0" max="6" value={subjectDecimalPlaces} onChange={(e) => setSubjectDecimalPlaces(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-gen-dec">Décimales générale</Label>
              <Input id="cfg-gen-dec" type="number" min="0" max="6" value={generalDecimalPlaces} onChange={(e) => setGeneralDecimalPlaces(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={rankingEnabled} onChange={(e) => setRankingEnabled(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Classement activé
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={conductEnabled} onChange={(e) => setConductEnabled(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Conduite activée
            </label>
          </div>
          {conductEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cfg-conduct-coeff">Coeff. conduite</Label>
                <Input id="cfg-conduct-coeff" type="number" min="0" step="0.01" value={conductCoefficient} onChange={(e) => setConductCoefficient(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfg-conduct-scale">Barème conduite</Label>
                <Input id="cfg-conduct-scale" type="number" min="1" value={conductScale} onChange={(e) => setConductScale(e.target.value)} />
              </div>
            </div>
          )}
          {conductEnabled && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={conductIncludedInAverage} onChange={(e) => setConductIncludedInAverage(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Inclure la conduite dans la moyenne
            </label>
          )}
          <div className="space-y-2">
            <Label htmlFor="cfg-threshold">Seuil de promotion <span className="text-muted-foreground font-normal">/ 10</span> <span className="text-muted-foreground font-normal text-xs">(optionnel)</span></Label>
            <Input
              id="cfg-threshold"
              type="number"
              min="0"
              max="10"
              step="0.01"
              placeholder="Non configuré"
              value={promotionThreshold}
              onChange={(e) => setPromotionThreshold(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Si non configuré, les propositions d&apos;admission/redoublement ne seront pas disponibles.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cfg-desc">Description</Label>
            <Textarea id="cfg-desc" placeholder="Description optionnelle…" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
      </FormDialog>

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        description={`Supprimer la configuration v${deleting?.version} (${deleting?.levelName} — ${deleting?.yearName}) ? Seuls les brouillons peuvent être supprimés.`}
        onConfirm={handleDelete}
        loading={formLoading}
      />
    </div>
  );
}
