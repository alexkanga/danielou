"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { StatusBadge, FormDialog, DeleteDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Pencil, Trash2, Plus, Copy, Zap, ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import type { PedagogicalConfig, ConfigSubject, ConfigComponent } from '@/lib/db/schema';

// Extended types from services

type ConfigSubjectWithDetails = ConfigSubject & {
  subjectName: string;
  subjectCode: string;
  componentCount: number;
};

type SubjectOption = { id: string; code: string; name: string };

type ComponentOption = { id: string; name: string };

const POLICY_LABELS: Record<string, string> = {
  simple_average: 'Moyenne simple',
  weighted_average: 'Moyenne pondérée',
  single_grade: 'Note unique',
};

const ROUNDING_LABELS: Record<string, string> = {
  half_up: 'Arrondi supérieur',
  half_even: 'Arrondi bancaire',
  truncate: 'Troncature',
};

export default function ConfigDetailPage() {
  const params = useParams();
  const router = useRouter();
  const configId = params.configId as string;

  const [config, setConfig] = useState<PedagogicalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Config subjects & their components
  const [configSubjects, setConfigSubjects] = useState<ConfigSubjectWithDetails[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [componentsBySubject, setComponentsBySubject] = useState<Record<string, ConfigComponent[]>>({});
  const [loadingComponents, setLoadingComponents] = useState<Set<string>>(new Set());

  // Config subject form
  const [csFormOpen, setCsFormOpen] = useState(false);
  const [csEditing, setCsEditing] = useState<ConfigSubjectWithDetails | null>(null);
  const [csFormLoading, setCsFormLoading] = useState(false);
  const [csSubjectId, setCsSubjectId] = useState('');
  const [csCoefficient, setCsCoefficient] = useState('1');
  const [csScale, setCsScale] = useState('20');
  const [csIsOptional, setCsIsOptional] = useState(false);
  const [csIsActive, setCsIsActive] = useState(true);
  const [csIncludeInAverage, setCsIncludeInAverage] = useState(true);
  const [csIncludeInRanking, setCsIncludeInRanking] = useState(true);
  const [csIncludeInDecision, setCsIncludeInDecision] = useState(true);
  const [csAssessmentAgg, setCsAssessmentAgg] = useState('weighted_average');
  const [csComponentAgg, setCsComponentAgg] = useState('weighted_average');
  const [csSortOrder, setCsSortOrder] = useState('0');

  // Config component form
  const [ccFormOpen, setCcFormOpen] = useState(false);
  const [ccEditing, setCcEditing] = useState<ConfigComponent | null>(null);
  const [ccFormLoading, setCcFormLoading] = useState(false);
  const [ccConfigSubjectId, setCcConfigSubjectId] = useState('');
  const [ccSubjectComponentId, setCcSubjectComponentId] = useState('');
  const [ccName, setCcName] = useState('');
  const [ccCoefficient, setCcCoefficient] = useState('1');
  const [ccScale, setCcScale] = useState('20');
  const [ccIsRequired, setCcIsRequired] = useState(true);
  const [ccIsActive, setCcIsActive] = useState(true);
  const [ccAssessmentAgg, setCcAssessmentAgg] = useState('weighted_average');
  const [ccSortOrder, setCcSortOrder] = useState('0');

  // Config edit form
  const [cfgFormOpen, setCfgFormOpen] = useState(false);
  const [cfgFormLoading, setCfgFormLoading] = useState(false);
  const [cfgCalcPolicy, setCfgCalcPolicy] = useState('');
  const [cfgRounding, setCfgRounding] = useState('');
  const [cfgSubjDec, setCfgSubjDec] = useState('2');
  const [cfgGenDec, setCfgGenDec] = useState('2');
  const [cfgRanking, setCfgRanking] = useState(true);
  const [cfgConduct, setCfgConduct] = useState(false);
  const [cfgConductAvg, setCfgConductAvg] = useState(false);
  const [cfgConductCoeff, setCfgConductCoeff] = useState('0');
  const [cfgConductScale, setCfgConductScale] = useState('20');
  const [cfgDesc, setCfgDesc] = useState('');

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'cs' | 'cc'; item: { id: string; name: string } } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Available subjects for add
  const [availableSubjects, setAvailableSubjects] = useState<SubjectOption[]>([]);
  const [availableComponents, setAvailableComponents] = useState<ComponentOption[]>([]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/regles-calcul/${configId}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setConfig(json);
    } catch {
      toast.error('Configuration introuvable.');
      router.push('/dashboard/regles-calcul');
    } finally {
      setLoading(false);
    }
  }, [configId, router]);

  const fetchConfigSubjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/config-subjects?configId=${configId}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setConfigSubjects(json.data ?? []);
    } catch {
      toast.error('Erreur lors du chargement des matières.');
    }
  }, [configId]);

  const fetchComponents = useCallback(async (configSubjectId: string) => {
    setLoadingComponents((prev) => new Set(prev).add(configSubjectId));
    try {
      const res = await fetch(`/api/config-components?configSubjectId=${configSubjectId}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setComponentsBySubject((prev) => ({ ...prev, [configSubjectId]: json.data ?? [] }));
    } catch {
      // silent
    } finally {
      setLoadingComponents((prev) => {
        const next = new Set(prev);
        next.delete(configSubjectId);
        return next;
      });
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- refetch subjects when config loads */
  useEffect(() => {
    if (config) void fetchConfigSubjects();
  }, [config, fetchConfigSubjects]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleExpand = (csId: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(csId)) next.delete(csId);
      else {
        next.add(csId);
        if (!componentsBySubject[csId]) fetchComponents(csId);
      }
      return next;
    });
  };

  const canEdit = config?.status === 'draft';

  // ─── Config header edit ───────────────────────

  const openEditConfig = () => {
    if (!config) return;
    setCfgCalcPolicy(config.calculationPolicy);
    setCfgRounding(config.roundingStrategy);
    setCfgSubjDec(String(config.subjectDecimalPlaces));
    setCfgGenDec(String(config.generalDecimalPlaces));
    setCfgRanking(config.rankingEnabled);
    setCfgConduct(config.conductEnabled);
    setCfgConductAvg(config.conductIncludedInAverage);
    setCfgConductCoeff(config.conductCoefficient ?? '0');
    setCfgConductScale(String(config.conductScale ?? 20));
    setCfgDesc(config.description ?? '');
    setCfgFormOpen(true);
  };

  const handleSaveConfig = async () => {
    setCfgFormLoading(true);
    try {
      const res = await fetch(`/api/regles-calcul/${configId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calculationPolicy: cfgCalcPolicy,
          roundingStrategy: cfgRounding,
          subjectDecimalPlaces: parseInt(cfgSubjDec, 10) || 2,
          generalDecimalPlaces: parseInt(cfgGenDec, 10) || 2,
          rankingEnabled: cfgRanking,
          conductEnabled: cfgConduct,
          conductIncludedInAverage: cfgConductAvg,
          conductCoefficient: cfgConduct ? (parseFloat(cfgConductCoeff) || null) : null,
          conductScale: cfgConduct ? (parseInt(cfgConductScale, 10) || null) : null,
          description: cfgDesc.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success('Configuration mise à jour.');
      setCfgFormOpen(false);
      await fetchConfig();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setCfgFormLoading(false);
    }
  };

  // ─── Config Subject CRUD ──────────────────────

  const openAddSubject = async () => {
    // Fetch available subjects (not already in config)
    try {
      const res = await fetch('/api/matieres?limit=100');
      if (res.ok) {
        const json = await res.json();
        const all = (json.data ?? []) as SubjectOption[];
        const usedIds = new Set(configSubjects.map((cs) => cs.subjectId));
        setAvailableSubjects(all.filter((s) => !usedIds.has(s.id)));
      }
    } catch { /* silent */ }
    setCsEditing(null);
    setCsSubjectId('');
    setCsCoefficient('1');
    setCsScale('20');
    setCsIsOptional(false);
    setCsIsActive(true);
    setCsIncludeInAverage(true);
    setCsIncludeInRanking(true);
    setCsIncludeInDecision(true);
    setCsAssessmentAgg('weighted_average');
    setCsComponentAgg('weighted_average');
    setCsSortOrder('0');
    setCsFormOpen(true);
  };

  const openEditSubject = (cs: ConfigSubjectWithDetails) => {
    setCsEditing(cs);
    setCsSubjectId(cs.subjectId);
    setCsCoefficient(String(cs.coefficient));
    setCsScale(String(cs.componentScale));
    setCsIsOptional(cs.isOptional);
    setCsIsActive(cs.isActive);
    setCsIncludeInAverage(cs.includeInAverage);
    setCsIncludeInRanking(cs.includeInRanking);
    setCsIncludeInDecision(cs.includeInDecision);
    setCsAssessmentAgg(cs.assessmentAggregation);
    setCsComponentAgg(cs.componentAggregation);
    setCsSortOrder(String(cs.sortOrder));
    setCsFormOpen(true);
  };

  const handleSubmitSubject = async () => {
    if (!csEditing && !csSubjectId) {
      toast.error('Veuillez sélectionner une matière.');
      return;
    }
    setCsFormLoading(true);
    try {
      if (csEditing) {
        const res = await fetch(`/api/config-subjects/${csEditing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coefficient: parseFloat(csCoefficient) || 1,
            scale: parseInt(csScale, 10) || 20,
            isOptional: csIsOptional,
            isActive: csIsActive,
            includeInAverage: csIncludeInAverage,
            includeInRanking: csIncludeInRanking,
            includeInDecision: csIncludeInDecision,
            assessmentAggregation: csAssessmentAgg,
            componentAggregation: csComponentAgg,
            sortOrder: parseInt(csSortOrder, 10) || 0,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Erreur');
        }
        toast.success('Matière mise à jour dans la configuration.');
      } else {
        const res = await fetch('/api/config-subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            configId,
            subjectId: csSubjectId,
            coefficient: parseFloat(csCoefficient) || 1,
            scale: parseInt(csScale, 10) || 20,
            isOptional: csIsOptional,
            isActive: csIsActive,
            includeInAverage: csIncludeInAverage,
            includeInRanking: csIncludeInRanking,
            includeInDecision: csIncludeInDecision,
            assessmentAggregation: csAssessmentAgg,
            componentAggregation: csComponentAgg,
            sortOrder: parseInt(csSortOrder, 10) || 0,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Erreur');
        }
        toast.success('Matière ajoutée à la configuration.');
      }
      setCsFormOpen(false);
      fetchConfigSubjects();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setCsFormLoading(false);
    }
  };

  // ─── Config Component CRUD ────────────────────

  const openAddComponent = async (configSubjectId: string) => {
    setCcConfigSubjectId(configSubjectId);
    // Fetch available subject components
    try {
      const cs = configSubjects.find((s) => s.id === configSubjectId);
      if (cs) {
        const res = await fetch(`/api/composantes?subjectId=${cs.subjectId}`);
        if (res.ok) {
          const json = await res.json();
          const all = (json.data ?? []) as ComponentOption[];
          const existing = componentsBySubject[configSubjectId] ?? [];
          const usedIds = new Set(existing.map((c) => c.subjectComponentId));
          setAvailableComponents(all.filter((c) => !usedIds.has(c.id)));
        }
      }
    } catch { /* silent */ }
    setCcEditing(null);
    setCcSubjectComponentId('');
    setCcName('');
    setCcCoefficient('1');
    setCcScale('20');
    setCcIsRequired(true);
    setCcIsActive(true);
    setCcAssessmentAgg('weighted_average');
    setCcSortOrder('0');
    setCcFormOpen(true);
  };

  const openEditComponent = (cc: ConfigComponent) => {
    setCcConfigSubjectId(cc.configSubjectId);
    setCcEditing(cc);
    setCcSubjectComponentId(cc.subjectComponentId);
    setCcName(cc.name);
    setCcCoefficient(String(cc.coefficient));
    setCcScale(String(cc.componentScale));
    setCcIsRequired(cc.isRequired);
    setCcIsActive(cc.isActive);
    setCcAssessmentAgg(cc.assessmentAggregation);
    setCcSortOrder(String(cc.sortOrder));
    setCcFormOpen(true);
  };

  const handleSubmitComponent = async () => {
    if (!ccEditing && !ccSubjectComponentId) {
      toast.error('Veuillez sélectionner une composante.');
      return;
    }
    if (!ccName.trim()) {
      toast.error('Le nom est requis.');
      return;
    }
    setCcFormLoading(true);
    try {
      if (ccEditing) {
        const res = await fetch(`/api/config-components/${ccEditing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: ccName.trim(),
            coefficient: parseFloat(ccCoefficient) || 1,
            scale: parseInt(ccScale, 10) || 20,
            isRequired: ccIsRequired,
            isActive: ccIsActive,
            assessmentAggregation: ccAssessmentAgg,
            sortOrder: parseInt(ccSortOrder, 10) || 0,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Erreur');
        }
        toast.success('Composante mise à jour.');
      } else {
        const res = await fetch('/api/config-components', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            configSubjectId: ccConfigSubjectId,
            subjectComponentId: ccSubjectComponentId,
            name: ccName.trim(),
            coefficient: parseFloat(ccCoefficient) || 1,
            scale: parseInt(ccScale, 10) || 20,
            isRequired: ccIsRequired,
            isActive: ccIsActive,
            assessmentAggregation: ccAssessmentAgg,
            sortOrder: parseInt(ccSortOrder, 10) || 0,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Erreur');
        }
        toast.success('Composante ajoutée.');
      }
      setCcFormOpen(false);
      // Refresh components for this subject
      fetchComponents(ccConfigSubjectId);
      fetchConfigSubjects(); // refresh componentCount
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setCcFormLoading(false);
    }
  };

  // ─── Delete ───────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const endpoint = deleteTarget.type === 'cs'
        ? `/api/config-subjects/${deleteTarget.item.id}`
        : `/api/config-components/${deleteTarget.item.id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success(deleteTarget.type === 'cs' ? 'Matière retirée.' : 'Composante retirée.');
      setDeleteOpen(false);
      setDeleteTarget(null);
      if (deleteTarget.type === 'cs') {
        fetchConfigSubjects();
      } else {
        // Need to know which configSubjectId this component belonged to
        // We stored it before, refresh all
        fetchComponents(ccConfigSubjectId);
        fetchConfigSubjects();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Activate / Clone ─────────────────────────

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/regles-calcul/${configId}/activate`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      toast.success('Configuration activée !');
      await fetchConfig();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'activation.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClone = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/regles-calcul/${configId}/clone`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }
      const cloned = await res.json();
      toast.success(`Configuration clonée (version ${cloned.version}).`);
      router.push(`/dashboard/regles-calcul/${cloned.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors du clonage.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !config) {
    return <div className="py-12 text-center text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/regles-calcul')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Règles de calcul — v{config.version}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <StatusBadge status={config.status} />
              {' · '}
              {POLICY_LABELS[config.calculationPolicy] ?? config.calculationPolicy}
              {' · '}
              {ROUNDING_LABELS[config.roundingStrategy] ?? config.roundingStrategy}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" onClick={openEditConfig}>
              <Pencil className="mr-2 h-4 w-4" /> Modifier la configuration
            </Button>
          )}
          {canEdit && (
            <Button onClick={handleActivate} disabled={actionLoading}>
              <Zap className="mr-2 h-4 w-4" /> Activer
            </Button>
          )}
          <Button variant="outline" onClick={handleClone} disabled={actionLoading}>
            <Copy className="mr-2 h-4 w-4" /> Cloner
          </Button>
        </div>
      </div>

      {/* Config summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Résumé de la configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <div><span className="text-muted-foreground">Politique :</span> {POLICY_LABELS[config.calculationPolicy]}</div>
            <div><span className="text-muted-foreground">Arrondi :</span> {ROUNDING_LABELS[config.roundingStrategy]}</div>
            <div><span className="text-muted-foreground">Décimales matière :</span> {config.subjectDecimalPlaces}</div>
            <div><span className="text-muted-foreground">Décimales générale :</span> {config.generalDecimalPlaces}</div>
            <div><span className="text-muted-foreground">Classement :</span> {config.rankingEnabled ? 'Oui' : 'Non'}</div>
            <div><span className="text-muted-foreground">Conduite :</span> {config.conductEnabled ? 'Oui' : 'Non'}</div>
            {config.conductEnabled && (
              <div><span className="text-muted-foreground">Coeff. conduite :</span> {config.conductCoefficient ?? '—'} / {config.conductScale ?? '—'}</div>
            )}
            {config.conductEnabled && (
              <div><span className="text-muted-foreground">Conduite dans moy. :</span> {config.conductIncludedInAverage ? 'Oui' : 'Non'}</div>
            )}
          </div>
          {config.description && (
            <p className="mt-3 text-sm text-muted-foreground">{config.description}</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Config subjects */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Matières configurées ({configSubjects.length})</h2>
        {canEdit && (
          <Button size="sm" onClick={openAddSubject}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter une matière
          </Button>
        )}
      </div>

      {configSubjects.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {canEdit ? 'Aucune matière configurée. Cliquez sur « Ajouter une matière » pour commencer.' : 'Aucune matière configurée.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {configSubjects.map((cs) => {
            const isExpanded = expandedSubjects.has(cs.id);
            const components = componentsBySubject[cs.id] ?? [];
            return (
              <Card key={cs.id}>
                <CardContent className="p-0">
                  {/* Subject row */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(cs.id)}
                  >
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    }
                    <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">{cs.subjectCode}</span>
                    <span className="font-medium flex-1 min-w-0 truncate">{cs.subjectName}</span>
                    <span className="text-sm text-muted-foreground hidden sm:inline">Coeff. {String(cs.coefficient)}</span>
                    <span className="text-sm text-muted-foreground hidden sm:inline">/ {cs.componentScale}</span>
                    <span className="text-xs text-muted-foreground hidden md:inline">{cs.componentCount} comp.</span>
                    <StatusBadge status={cs.isActive ? 'active' : 'draft'} />
                    {cs.isOptional && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Option.</span>
                    )}
                    {canEdit && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditSubject(cs)}>
                              <Pencil className="mr-2 h-4 w-4" /> Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAddComponent(cs.id)}>
                              <Plus className="mr-2 h-4 w-4" /> Ajouter composante
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => { setDeleteTarget({ type: 'cs', item: { id: cs.id, name: cs.subjectName } }); setDeleteOpen(true); }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Retirer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>

                  {/* Expanded components */}
                  {isExpanded && (
                    <div className="border-t px-4 py-2">
                      {loadingComponents.has(cs.id) ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">Chargement des composantes…</p>
                      ) : components.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          {canEdit ? 'Aucune composante. Ajoutez-en depuis le menu.' : 'Aucune composante configurée.'}
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nom</TableHead>
                              <TableHead className="w-20">Coeff.</TableHead>
                              <TableHead className="w-20">Barème</TableHead>
                              <TableHead className="w-20">Requis</TableHead>
                              <TableHead className="w-20">Statut</TableHead>
                              {canEdit && <TableHead className="w-12">Actions</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {components.map((cc) => (
                              <TableRow key={cc.id}>
                                <TableCell>{cc.name}</TableCell>
                                <TableCell>{String(cc.coefficient)}</TableCell>
                                <TableCell>{cc.componentScale}</TableCell>
                                <TableCell>{cc.isRequired ? 'Oui' : 'Non'}</TableCell>
                                <TableCell><StatusBadge status={cc.isActive ? 'active' : 'draft'} /></TableCell>
                                {canEdit && (
                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => openEditComponent(cc)}>
                                          <Pencil className="mr-2 h-4 w-4" /> Modifier
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => {
                                            setCcConfigSubjectId(cc.configSubjectId);
                                            setDeleteTarget({ type: 'cc', item: { id: cc.id, name: cc.name } });
                                            setDeleteOpen(true);
                                          }}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" /> Retirer
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Config Header Edit Dialog ─── */}
      <FormDialog open={cfgFormOpen} onOpenChange={setCfgFormOpen} title="Modifier la configuration" onSubmit={handleSaveConfig} loading={cfgFormLoading}>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ed-policy">Politique de calcul</Label>
              <Select value={cfgCalcPolicy} onValueChange={setCfgCalcPolicy}>
                <SelectTrigger id="ed-policy"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple_average">Moyenne simple</SelectItem>
                  <SelectItem value="weighted_average">Moyenne pondérée</SelectItem>
                  <SelectItem value="single_grade">Note unique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-rounding">Arrondi</Label>
              <Select value={cfgRounding} onValueChange={setCfgRounding}>
                <SelectTrigger id="ed-rounding"><SelectValue /></SelectTrigger>
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
              <Label htmlFor="ed-sdec">Décimales matière</Label>
              <Input id="ed-sdec" type="number" min="0" max="6" value={cfgSubjDec} onChange={(e) => setCfgSubjDec(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-gdec">Décimales générale</Label>
              <Input id="ed-gdec" type="number" min="0" max="6" value={cfgGenDec} onChange={(e) => setCfgGenDec(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cfgRanking} onChange={(e) => setCfgRanking(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Classement activé
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cfgConduct} onChange={(e) => setCfgConduct(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Conduite activée
            </label>
          </div>
          {cfgConduct && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ed-ccoeff">Coeff. conduite</Label>
                <Input id="ed-ccoeff" type="number" min="0" step="0.01" value={cfgConductCoeff} onChange={(e) => setCfgConductCoeff(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-cscale">Barème conduite</Label>
                <Input id="ed-cscale" type="number" min="1" value={cfgConductScale} onChange={(e) => setCfgConductScale(e.target.value)} />
              </div>
            </div>
          )}
          {cfgConduct && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cfgConductAvg} onChange={(e) => setCfgConductAvg(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Inclure la conduite dans la moyenne
            </label>
          )}
          <div className="space-y-2">
            <Label htmlFor="ed-desc">Description</Label>
            <Textarea id="ed-desc" value={cfgDesc} onChange={(e) => setCfgDesc(e.target.value)} rows={2} />
          </div>
        </div>
      </FormDialog>

      {/* ─── Config Subject Form Dialog ─── */}
      <FormDialog open={csFormOpen} onOpenChange={setCsFormOpen} title={csEditing ? 'Modifier la matière dans la configuration' : 'Ajouter une matière'} onSubmit={handleSubmitSubject} loading={csFormLoading}>
        <div className="space-y-4 py-4">
          {!csEditing && (
            <div className="space-y-2">
              <Label htmlFor="cs-subject">Matière *</Label>
              <Select value={csSubjectId} onValueChange={setCsSubjectId}>
                <SelectTrigger id="cs-subject"><SelectValue placeholder="Sélectionner une matière" /></SelectTrigger>
                <SelectContent>
                  {availableSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {csEditing && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              <span className="font-mono">{csEditing.subjectCode}</span> — {csEditing.subjectName}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cs-coeff">Coefficient</Label>
              <Input id="cs-coeff" type="number" min="0.01" step="0.01" value={csCoefficient} onChange={(e) => setCsCoefficient(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cs-scale">Barème composantes</Label>
              <Input id="cs-scale" type="number" min="1" value={csScale} onChange={(e) => setCsScale(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cs-assess-agg">Agrégation évaluations</Label>
              <Select value={csAssessmentAgg} onValueChange={setCsAssessmentAgg}>
                <SelectTrigger id="cs-assess-agg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple_average">Moyenne simple</SelectItem>
                  <SelectItem value="weighted_average">Moyenne pondérée</SelectItem>
                  <SelectItem value="single_grade">Note unique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cs-comp-agg">Agrégation composantes</Label>
              <Select value={csComponentAgg} onValueChange={setCsComponentAgg}>
                <SelectTrigger id="cs-comp-agg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple_average">Moyenne simple</SelectItem>
                  <SelectItem value="weighted_average">Moyenne pondérée</SelectItem>
                  <SelectItem value="single_grade">Note unique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cs-order">Ordre d&apos;affichage</Label>
            <Input id="cs-order" type="number" min="0" value={csSortOrder} onChange={(e) => setCsSortOrder(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={csIsActive} onChange={(e) => setCsIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={csIsOptional} onChange={(e) => setCsIsOptional(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Optionnelle
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={csIncludeInAverage} onChange={(e) => setCsIncludeInAverage(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Dans la moyenne
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={csIncludeInRanking} onChange={(e) => setCsIncludeInRanking(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Dans le classement
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={csIncludeInDecision} onChange={(e) => setCsIncludeInDecision(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Dans la décision
            </label>
          </div>
        </div>
      </FormDialog>

      {/* ─── Config Component Form Dialog ─── */}
      <FormDialog open={ccFormOpen} onOpenChange={setCcFormOpen} title={ccEditing ? 'Modifier la composante' : 'Ajouter une composante'} onSubmit={handleSubmitComponent} loading={ccFormLoading}>
        <div className="space-y-4 py-4">
          {!ccEditing && (
            <div className="space-y-2">
              <Label htmlFor="cc-scomp">Composante source *</Label>
              <Select value={ccSubjectComponentId} onValueChange={(v) => {
                setCcSubjectComponentId(v);
                const opt = availableComponents.find((c) => c.id === v);
                if (opt) setCcName(opt.name);
              }}>
                <SelectTrigger id="cc-scomp"><SelectValue placeholder="Sélectionner une composante" /></SelectTrigger>
                <SelectContent>
                  {availableComponents.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="cc-name">Nom *</Label>
            <Input id="cc-name" value={ccName} onChange={(e) => setCcName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cc-coeff">Coefficient</Label>
              <Input id="cc-coeff" type="number" min="0.01" step="0.01" value={ccCoefficient} onChange={(e) => setCcCoefficient(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-scale">Barème</Label>
              <Input id="cc-scale" type="number" min="1" value={ccScale} onChange={(e) => setCcScale(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cc-agg">Agrégation</Label>
              <Select value={ccAssessmentAgg} onValueChange={setCcAssessmentAgg}>
                <SelectTrigger id="cc-agg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple_average">Moyenne simple</SelectItem>
                  <SelectItem value="weighted_average">Moyenne pondérée</SelectItem>
                  <SelectItem value="single_grade">Note unique</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-order">Ordre</Label>
              <Input id="cc-order" type="number" min="0" value={ccSortOrder} onChange={(e) => setCcSortOrder(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ccIsActive} onChange={(e) => setCcIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ccIsRequired} onChange={(e) => setCcIsRequired(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
              Requise
            </label>
          </div>
        </div>
      </FormDialog>

      {/* ─── Delete Dialog ─── */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        description={`Voulez-vous vraiment retirer « ${deleteTarget?.item.name} » de la configuration ?`}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
