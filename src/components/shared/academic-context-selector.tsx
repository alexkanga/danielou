'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface AcademicYearOption {
  id: string;
  name: string;
  status: string;
}

export interface ClassroomOption {
  id: string;
  name: string;
  levelName: string;
  yearName: string;
}

export interface PeriodOption {
  id: string;
  name: string;
  periodType: string;
  status: string;
  sortOrder: number;
}

export interface AcademicContextValue {
  academicYearId: string;
  classroomId: string;
  academicPeriodId: string;
}

export interface AcademicContextMeta {
  academicYearName: string | null;
  classroomName: string | null;
  academicPeriodName: string | null;
  classrooms: ClassroomOption[];
  periods: PeriodOption[];
}

interface AcademicContextSelectorProps {
  /** Initial preselected values (e.g. from URL params) */
  initialValues?: Partial<AcademicContextValue>;
  /** Which selectors to show (default: all three) */
  showClassroom?: boolean;
  /** Which selectors to show (default: all three) */
  showPeriod?: boolean;
  /** Filter periods by type (e.g. 'trimester', 'composition') — default: all */
  periodTypeFilter?: string | string[];
  /** Called when the full context changes (all required selectors are selected) */
  onContextChange?: (value: AcademicContextValue, meta: AcademicContextMeta) => void;
  /** Called on any individual selector change */
  onChange?: (value: AcademicContextValue, meta: AcademicContextMeta) => void;
  /** Auto-select the active year on mount (default: true) */
  autoSelectActiveYear?: boolean;
  /** Number of columns: 2 or 3 (default: responsive 1 then 2 or 3) */
  columns?: 2 | 3;
  /** Label overrides */
  labels?: {
    year?: string;
    classroom?: string;
    period?: string;
  };
  /** Extra CSS class for the root container */
  className?: string;
}

// ─────────────────────────────────────────────
// Select styling
// ─────────────────────────────────────────────

const SELECT_CLASSES =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function AcademicContextSelector({
  initialValues,
  showClassroom = true,
  showPeriod = true,
  periodTypeFilter,
  onContextChange,
  onChange,
  autoSelectActiveYear = true,
  columns = 3,
  labels = {},
  className = '',
}: AcademicContextSelectorProps) {
  // State
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [selectedYearId, setSelectedYearId] = useState(initialValues?.academicYearId ?? '');
  const [selectedClassroomId, setSelectedClassroomId] = useState(initialValues?.classroomId ?? '');
  const [selectedPeriodId, setSelectedPeriodId] = useState(initialValues?.academicPeriodId ?? '');
  const [loading, setLoading] = useState(true);

  // Ref to suppress onContextChange during initial cascade
  const initialMountRef = useRef(true);

  // ── Load academic years ──────────────────────
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/annees-scolaires?limit=100');
        if (r.ok) {
          const j = await r.json();
          const items: AcademicYearOption[] = (j.data || []).map(
            (y: { id: string; name: string; status: string }) => ({
              id: y.id,
              name: y.name,
              status: y.status,
            }),
          );
          setAcademicYears(items);
          // Auto-select active year
          if (autoSelectActiveYear && !initialValues?.academicYearId) {
            const active = items.find((y) => y.status === 'active');
            if (active) setSelectedYearId(active.id);
          }
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load classrooms when year changes ────────
  useEffect(() => {
    if (!selectedYearId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setClassrooms([]);
      return;
    }
    (async () => {
      try {
        const r = await fetch(`/api/classes?academicYearId=${selectedYearId}&limit=200`);
        if (r.ok) {
          const j = await r.json();
          setClassrooms(
            (j.data || []).map((c: ClassroomOption) => c),
          );
        }
      } catch {
        /* silent */
      }
    })();
  }, [selectedYearId]);

  // ── Load periods when year (and optionally classroom) changes ──
  useEffect(() => {
    if (!selectedYearId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPeriods([]);
      return;
    }
    (async () => {
      try {
        const params = new URLSearchParams({
          academicYearId: selectedYearId,
          limit: '100',
        });
        if (periodTypeFilter) {
          // Support single string or array of types
          const types = Array.isArray(periodTypeFilter) ? periodTypeFilter : [periodTypeFilter];
          for (const t of types) params.append('periodType', t);
        }
        const r = await fetch(`/api/periodes?${params}`);
        if (r.ok) {
          const j = await r.json();
          const items: PeriodOption[] = (j.data || []).map(
            (p: { id: string; name: string; periodType: string; status: string; sortOrder: number }) => ({
              id: p.id,
              name: p.name,
              periodType: p.periodType,
              status: p.status,
              sortOrder: p.sortOrder ?? 0,
            }),
          );
          items.sort((a, b) => a.sortOrder - b.sortOrder);
          setPeriods(items);
        }
      } catch {
        /* silent */
      }
    })();
  }, [selectedYearId, periodTypeFilter]);

  // ── Notify parent of changes ────────────────
  const buildMeta = useCallback(
    (yearId: string, classroomId: string, periodId: string): AcademicContextMeta => {
      const year = academicYears.find((y) => y.id === yearId);
      const classroom = classrooms.find((c) => c.id === classroomId);
      const period = periods.find((p) => p.id === periodId);
      return {
        academicYearName: year?.name ?? null,
        classroomName: classroom ? `${classroom.name} (${classroom.levelName})` : null,
        academicPeriodName: period?.name ?? null,
        classrooms,
        periods,
      };
    },
    [academicYears, classrooms, periods],
  );

  const notifyChange = useCallback(
    (yearId: string, classroomId: string, periodId: string) => {
      const value: AcademicContextValue = {
        academicYearId: yearId,
        classroomId,
        academicPeriodId: periodId,
      };
      const meta = buildMeta(yearId, classroomId, periodId);
      onChange?.(value, meta);

      // Determine if the full context is complete
      const requiredSelectors: string[] = ['year'];
      if (showClassroom) requiredSelectors.push('classroom');
      if (showPeriod) requiredSelectors.push('period');

      const isComplete =
        (!showClassroom || classroomId) && (!showPeriod || periodId);

      if (isComplete && !initialMountRef.current) {
        onContextChange?.(value, meta);
      }
    },
    [showClassroom, showPeriod, onChange, onContextChange, buildMeta],
  );

  // After initial cascade settles, enable onContextChange
  useEffect(() => {
    const timer = setTimeout(() => {
      initialMountRef.current = false;
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // ── Handlers ────────────────────────────────
  const handleYearChange = useCallback(
    (id: string) => {
 setSelectedYearId(id); setSelectedClassroomId(''); setSelectedPeriodId(''); notifyChange(id, '', ''); },
    [notifyChange],
  );

  const handleClassroomChange = useCallback(
    (id: string) => {
 setSelectedClassroomId(id); setSelectedPeriodId(''); notifyChange(selectedYearId, id, ''); },
    [selectedYearId, notifyChange],
  );

  const handlePeriodChange = useCallback(
    (id: string) => {
 setSelectedPeriodId(id); notifyChange(selectedYearId, selectedClassroomId, id); },
    [selectedYearId, selectedClassroomId, notifyChange],
  );

  // ── Period type label helper ────────────────
  const periodTypeLabel = (type: string) => {
    if (type === 'composition') return 'Composition';
    if (type === 'passage') return 'Passage';
    if (type === 'trimester') return 'Trimestre';
    if (type === 'semester') return 'Semestre';
    return type;
  };

  // ── Column grid class ───────────────────────

  const yearLabel = labels.year ?? 'Année scolaire';
  const classroomLabel = labels.classroom ?? 'Classe';
  const periodLabel = labels.period ?? 'Période';

  return (
    <div className={`grid gap-4 rounded-lg border bg-card p-4 ${className} ${columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
      {/* Academic Year */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{yearLabel}</label>
        {loading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <select
            className={SELECT_CLASSES}
            value={selectedYearId}
            onChange={(e) => handleYearChange(e.target.value)}
          >
            <option value="">— Choisir —</option>
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Classroom */}
      {showClassroom && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{classroomLabel}</label>
          <select
            className={SELECT_CLASSES}
            value={selectedClassroomId}
            onChange={(e) => handleClassroomChange(e.target.value)}
            disabled={!selectedYearId}
          >
            <option value="">— Choisir —</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.levelName})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Period */}
      {showPeriod && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{periodLabel}</label>
          <select
            className={SELECT_CLASSES}
            value={selectedPeriodId}
            onChange={(e) => handlePeriodChange(e.target.value)}
            disabled={!selectedYearId}
          >
            <option value="">— Choisir —</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({periodTypeLabel(p.periodType)})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/**
 * Hook: parse academic context from URL search params.
 * Useful for pages that accept ?academicYearId=X&classroomId=Y&academicPeriodId=Z.
 */
export function useAcademicContextParams() {
  if (typeof window === 'undefined') return { academicYearId: '', classroomId: '', academicPeriodId: '' };
  const params = new URLSearchParams(window.location.search);
  return {
    academicYearId: params.get('academicYearId') ?? '',
    classroomId: params.get('classroomId') ?? '',
    academicPeriodId: params.get('academicPeriodId') ?? '',
  };
}
