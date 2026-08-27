import { z } from 'zod';

// ===== NIVEAUX =====
export const createLevelSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(50),
  sortOrder: z.coerce.number().int().min(0).default(0),
});
export type CreateLevelInput = z.infer<typeof createLevelSchema>;

export const updateLevelSchema = createLevelSchema.partial();
export type UpdateLevelInput = z.infer<typeof updateLevelSchema>;

// ===== ANNÉES SCOLAIRES (independent, zero periods valid) =====
export const createAcademicYearSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(20),
  startDate: z.string().min(1, 'La date de début est requise'),
  endDate: z.string().min(1, 'La date de fin est requise'),
  status: z.enum(['preparation', 'active', 'closed']).default('preparation'),
});
export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;

export const updateAcademicYearSchema = createAcademicYearSchema.partial();
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;

// ===== PÉRIODES D'ÉVALUATION =====
export const PERIOD_TYPE_VALUES = ['trimester', 'semester', 'composition', 'passage', 'other'] as const;
export const PERIOD_TYPE_LABELS: Record<string, string> = {
  trimester: 'Trimestre',
  semester: 'Semestre',
  composition: 'Composition',
  passage: 'Composition de passage',
  other: 'Autre',
};

export const createPeriodSchema = z.object({
  academicYearId: z.string().uuid("L'année scolaire est requise"),
  levelId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, 'Le nom est requis').max(100),
  periodType: z.enum(PERIOD_TYPE_VALUES).default('other'),
  sortOrder: z.coerce.number().int().min(1).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.enum(['draft', 'open', 'closed']).default('draft'),
});

const dateRefine = (d: { startDate?: string | null; endDate?: string | null }) => {
  if (d.startDate && d.endDate) return d.startDate <= d.endDate;
  return true;
};

export const createPeriodSchemaWithDates = createPeriodSchema.refine(
  dateRefine,
  { message: 'La date de début doit être antérieure ou égale à la date de fin.', path: ['endDate'] },
);
export type CreatePeriodInput = z.infer<typeof createPeriodSchema>;

export const updatePeriodSchema = createPeriodSchema.omit({ academicYearId: true }).partial().refine(
  dateRefine,
  { message: 'La date de début doit être antérieure ou égale à la date de fin.', path: ['endDate'] },
);
export type UpdatePeriodInput = z.infer<typeof updatePeriodSchema>;

// ===== CLASSES =====
export const createClassroomSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(50),
  levelId: z.string().uuid('Le niveau est requis'),
  academicYearId: z.string().uuid("L'année scolaire est requise"),
});
export type CreateClassroomInput = z.infer<typeof createClassroomSchema>;

export const updateClassroomSchema = createClassroomSchema.partial();
export type UpdateClassroomInput = z.infer<typeof updateClassroomSchema>;

// ===== ÉLÈVES =====
export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis').max(100),
  lastName: z.string().min(1, 'Le nom est requis').max(100),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['M', 'F']).optional(),
  classroomId: z.string().uuid('La classe est requise'),
  academicYearId: z.string().uuid("L'année scolaire est requise"),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const updateStudentSchema = createStudentSchema.omit({ classroomId: true, academicYearId: true }).partial();
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

// ===== AFFECTATIONS (M2) =====
export const createAssignmentSchema = z.object({
  enrollmentId: z.string().uuid("L'inscription est requise"),
  classroomId: z.string().uuid('La classe est requise'),
  startDate: z.string().min(1, 'La date de début est requise'),
});
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export const transferSchema = z.object({
  enrollmentId: z.string().uuid("L'inscription est requise"),
  newClassroomId: z.string().uuid('La nouvelle classe est requise'),
  effectiveDate: z.string().min(1, 'La date d\'effet est requise'),
});
export type TransferInput = z.infer<typeof transferSchema>;

export const closeAssignmentSchema = z.object({
  endDate: z.string().min(1, 'La date de fin est requise'),
  newStatus: z.enum(['completed', 'withdrawn', 'cancelled']),
});
export type CloseAssignmentInput = z.infer<typeof closeAssignmentSchema>;
