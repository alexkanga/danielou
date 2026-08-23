/**
 * Phase F — Zod validation schemas for all 6 M3 pedagogy entities.
 *
 * Maps 1:1 to the Drizzle schema columns and CHECK constraints.
 * DB-level constraints (INV-M3-09, 10, 11, 12, 13) are the last line of defense;
 * these schemas provide early validation with French error messages.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────
// Subject
// ─────────────────────────────────────────────

export const createSubjectSchema = z.object({
  code: z.string().min(1, 'Le code est requis').max(20, 'Le code ne peut pas dépasser 20 caractères'),
  name: z.string().min(1, 'Le nom est requis').max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  sortOrder: z.coerce.number().int().min(0, 'L\'ordre doit être ≥ 0 [INV-M3-11]').default(0),
  coefficient: z.coerce
    .number()
    .positive('Le coefficient doit être > 0 [INV-M3-09]')
    .max(99.99, 'Le coefficient ne peut pas dépasser 99.99')
    .default(1),
  defaultScale: z.coerce
    .number()
    .int()
    .min(1, 'L\'échelle par défaut doit être ≥ 1 [INV-M3-10]')
    .max(100, 'L\'échelle par défaut ne peut pas dépasser 100')
    .default(20),
  isOptional: z.boolean().default(false),
  includeInAverage: z.boolean().default(true),
  includeInRanking: z.boolean().default(true),
  includeInDecision: z.boolean().default(true),
});
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

export const updateSubjectSchema = createSubjectSchema.partial().omit({ code: true });
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

// ─────────────────────────────────────────────
// SubjectComponent
// ─────────────────────────────────────────────

export const createSubjectComponentSchema = z.object({
  subjectId: z.string().uuid('La matière est requise'),
  code: z.string().max(20).optional().nullable(),
  name: z.string().min(1, 'Le nom est requis').max(100),
  sortOrder: z.coerce.number().int().min(0, 'L\'ordre doit être ≥ 0 [INV-M3-11]').default(0),
});
export type CreateSubjectComponentInput = z.infer<typeof createSubjectComponentSchema>;

export const updateSubjectComponentSchema = z.object({
  code: z.string().max(20).optional().nullable(),
  name: z.string().min(1).max(100).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateSubjectComponentInput = z.infer<typeof updateSubjectComponentSchema>;

// ─────────────────────────────────────────────
// AssessmentType
// ─────────────────────────────────────────────

export const createAssessmentTypeSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  description: z.string().max(500).optional().nullable(),
  defaultCoefficient: z.coerce
    .number()
    .positive('Le coefficient par défaut doit être > 0 [INV-M3-09]')
    .max(99.99)
    .optional()
    .nullable(),
  defaultScale: z.coerce
    .number()
    .int()
    .min(1, 'L\'échelle par défaut doit être ≥ 1 [INV-M3-10]')
    .max(100)
    .optional()
    .nullable(),
  isActive: z.boolean().default(true),
});
export type CreateAssessmentTypeInput = z.infer<typeof createAssessmentTypeSchema>;

export const updateAssessmentTypeSchema = createAssessmentTypeSchema.partial().omit({ name: true });
export type UpdateAssessmentTypeInput = z.infer<typeof updateAssessmentTypeSchema>;

// ─────────────────────────────────────────────
// PedagogicalConfig
// ─────────────────────────────────────────────

export const createPedagogicalConfigSchema = z.object({
  levelId: z.string().uuid('Le niveau est requis'),
  academicYearId: z.string().uuid('L\'année scolaire est requise'),
  calculationPolicy: z.enum(['simple_average', 'weighted_average', 'single_grade']).default('simple_average'),
  roundingStrategy: z.enum(['half_up', 'half_even', 'truncate']).default('half_up'),
  subjectDecimalPlaces: z.coerce.number().int().min(0).max(6, 'Max 6 décimales [INV-M3-12]').default(2),
  generalDecimalPlaces: z.coerce.number().int().min(0).max(6, 'Max 6 décimales [INV-M3-13]').default(2),
  rankingEnabled: z.boolean().default(true),
  conductEnabled: z.boolean().default(false),
  conductIncludedInAverage: z.boolean().default(false),
  conductCoefficient: z.coerce.number().min(0).max(99.99).optional().nullable(),
  conductScale: z.coerce.number().int().min(1).max(100).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
});
export type CreatePedagogicalConfigInput = z.infer<typeof createPedagogicalConfigSchema>;

export const updatePedagogicalConfigSchema = createPedagogicalConfigSchema.partial().omit({
  levelId: true,
  academicYearId: true,
});
export type UpdatePedagogicalConfigInput = z.infer<typeof updatePedagogicalConfigSchema>;

// ─────────────────────────────────────────────
// ConfigSubject
// ─────────────────────────────────────────────

export const createConfigSubjectSchema = z.object({
  subjectId: z.string().uuid('La matière est requise'),
  coefficient: z.coerce
    .number()
    .positive('Le coefficient doit être > 0 [INV-M3-09]')
    .max(99.99),
  scale: z.coerce
    .number()
    .int()
    .min(1, 'L\'échelle doit être ≥ 1 [INV-M3-10]')
    .max(100)
    .default(20),
  isOptional: z.boolean().default(false),
  isActive: z.boolean().default(true),
  includeInAverage: z.boolean().default(true),
  includeInRanking: z.boolean().default(true),
  includeInDecision: z.boolean().default(true),
  assessmentAggregation: z.enum(['simple_average', 'weighted_average', 'single_grade']).default('weighted_average'),
  componentAggregation: z.enum(['simple_average', 'weighted_average', 'single_grade']).default('weighted_average'),
  sortOrder: z.coerce.number().int().min(0, 'L\'ordre doit être ≥ 0 [INV-M3-11]').default(0),
});
export type CreateConfigSubjectInput = z.infer<typeof createConfigSubjectSchema>;

export const updateConfigSubjectSchema = createConfigSubjectSchema.partial().omit({
  subjectId: true,
});
export type UpdateConfigSubjectInput = z.infer<typeof updateConfigSubjectSchema>;

// ─────────────────────────────────────────────
// ConfigComponent
// ─────────────────────────────────────────────

export const createConfigComponentSchema = z.object({
  subjectComponentId: z.string().uuid('La composante est requise'),
  name: z.string().min(1, 'Le nom est requis').max(100),
  sortOrder: z.coerce.number().int().min(0, 'L\'ordre doit être ≥ 0 [INV-M3-11]').default(0),
  coefficient: z.coerce
    .number()
    .positive('Le coefficient doit être > 0 [INV-M3-09]')
    .max(99.99)
    .default(1),
  scale: z.coerce
    .number()
    .int()
    .min(1, 'L\'échelle doit être ≥ 1 [INV-M3-10]')
    .max(100)
    .default(20),
  isRequired: z.boolean().default(true),
  isActive: z.boolean().default(true),
  assessmentAggregation: z.enum(['simple_average', 'weighted_average', 'single_grade']).default('weighted_average'),
});
export type CreateConfigComponentInput = z.infer<typeof createConfigComponentSchema>;

export const updateConfigComponentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  coefficient: z.coerce.number().positive().max(99.99).optional(),
  scale: z.coerce.number().int().min(1).max(100).optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  assessmentAggregation: z.enum(['simple_average', 'weighted_average', 'single_grade']).optional(),
});
export type UpdateConfigComponentInput = z.infer<typeof updateConfigComponentSchema>;
