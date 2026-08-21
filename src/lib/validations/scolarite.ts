import { z } from 'zod';

// ===== NIVEAUX =====
export const createLevelSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(50),
  sortOrder: z.coerce.number().int().min(0).default(0),
});
export type CreateLevelInput = z.infer<typeof createLevelSchema>;

export const updateLevelSchema = createLevelSchema.partial();
export type UpdateLevelInput = z.infer<typeof updateLevelSchema>;

// ===== ANNÉES SCOLAIRES =====
export const createAcademicYearSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(20),
  startDate: z.string().min(1, 'La date de début est requise'),
  endDate: z.string().min(1, 'La date de fin est requise'),
  status: z.enum(['preparation', 'active', 'closed']).default('preparation'),
  periods: z.array(z.object({
    name: z.string().min(1),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    sortOrder: z.coerce.number().int().min(1).default(1),
  })).optional(),
});
export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;

export const updateAcademicYearSchema = createAcademicYearSchema.omit({ periods: true }).partial();
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;

// ===== CLASSES =====
export const createClassroomSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(50),
  levelId: z.string().uuid('Le niveau est requis'),
  academicYearId: z.string().uuid('L\'année scolaire est requise'),
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
  academicYearId: z.string().uuid('L\'année scolaire est requise'),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const updateStudentSchema = createStudentSchema.omit({ classroomId: true, academicYearId: true }).partial();
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;