import { pgTable, text, timestamp, uuid, boolean, integer, numeric, date, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';

// ==============================================
// ENUMS
// ==============================================

export const academicYearStatusEnum = pgEnum('academic_year_status', ['preparation', 'active', 'closed']);
export const periodStatusEnum = pgEnum('period_status', ['draft', 'open', 'closed']);
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['active', 'completed', 'transferred_out', 'withdrawn', 'cancelled']);
export const classroomAssignmentStatusEnum = pgEnum('classroom_assignment_status', ['active', 'transferred', 'completed', 'withdrawn', 'cancelled']);
export const gradeStatusEnum = pgEnum('grade_status', ['graded', 'absent_excused', 'absent_unexcused', 'exempt', 'not_evaluated', 'pending']);
export const reportCardStatusEnum = pgEnum('report_card_status', ['draft', 'ready', 'validated', 'published']);
export const configStatusEnum = pgEnum('config_status', ['draft', 'active', 'archived']);
export const calculationPolicyEnum = pgEnum('calculation_policy', ['simple_average', 'weighted_average', 'single_grade']);
export const roundingStrategyEnum = pgEnum('rounding_strategy', ['half_up', 'half_even', 'truncate']);
export const promotionDecisionEnum = pgEnum('promotion_decision', ['proposed_admitted', 'proposed_repeat', 'decision_required', 'final_admitted', 'final_repeat']);
export const roleEnum = pgEnum('app_role', ['admin', 'direction', 'teacher', 'reader']);
export const platformRoleEnum = pgEnum('platform_role', ['super_admin', 'none']);
export const schoolMembershipRoleEnum = pgEnum('school_membership_role', ['admin', 'direction', 'teacher', 'reader']);

// ==============================================
// AUDIT TRAIL MIXIN
// ==============================================

const auditColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

// ==============================================
// SCHOOL
// ==============================================

export const school = pgTable('school', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address'),
  city: text('city').default('Abidjan'),
  country: text('country').default('Côte d\'Ivoire'),
  logoUrl: text('logo_url'),
  ...auditColumns,
});

// ==============================================
// ACADEMIC YEAR
// ==============================================

export const academicYear = pgTable('academic_year', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => school.id),
  name: text('name').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: academicYearStatusEnum('status').notNull().default('preparation'),
  ...auditColumns,
}, (table) => [
  uniqueIndex('uy_school_name').on(table.schoolId, table.name),
  index('ay_status_idx').on(table.status),
]);

// ==============================================
// ACADEMIC PERIOD
// ==============================================

export const academicPeriod = pgTable('academic_period', {
  id: uuid('id').primaryKey().defaultRandom(),
  academicYearId: uuid('academic_year_id').notNull().references(() => academicYear.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(1),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: periodStatusEnum('status').notNull().default('draft'),
  ...auditColumns,
}, (table) => [
  uniqueIndex('up_year_name').on(table.academicYearId, table.name),
  index('ap_year_idx').on(table.academicYearId),
  index('ap_status_idx').on(table.status),
]);

// ==============================================
// LEVEL
// ==============================================

export const level = pgTable('level', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => school.id),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  ...auditColumns,
}, (table) => [
  uniqueIndex('ul_school_name').on(table.schoolId, table.name),
]);

// ==============================================
// CLASSROOM
// ==============================================

export const classroom = pgTable('classroom', {
  id: uuid('id').primaryKey().defaultRandom(),
  levelId: uuid('level_id').notNull().references(() => level.id, { onDelete: 'cascade' }),
  academicYearId: uuid('academic_year_id').notNull().references(() => academicYear.id),
  name: text('name').notNull(),
  ...auditColumns,
}, (table) => [
  uniqueIndex('uc_level_year_name').on(table.levelId, table.academicYearId, table.name),
  index('cl_year_idx').on(table.academicYearId),
]);

// ==============================================
// STUDENT
// ==============================================

export const student = pgTable('student', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => school.id),
  matricule: text('matricule'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  dateOfBirth: date('date_of_birth'),
  gender: text('gender'),
  ...auditColumns,
}, (table) => [
  index('st_school_idx').on(table.schoolId),
  index('st_name_idx').on(table.lastName, table.firstName),
]);

// ==============================================
// ENROLLMENT
// ==============================================

export const enrollment = pgTable('enrollment', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => school.id, { onDelete: 'restrict' }),
  studentId: uuid('student_id').notNull().references(() => student.id, { onDelete: 'restrict' }),
  academicYearId: uuid('academic_year_id').notNull().references(() => academicYear.id, { onDelete: 'restrict' }),
  status: enrollmentStatusEnum('status').notNull().default('active'),
  enrolledAt: date('enrolled_at'),
  exitedAt: date('exited_at'),
  ...auditColumns,
}, (table) => [
  uniqueIndex('ue_student_year').on(table.studentId, table.academicYearId),
  index('en_school_idx').on(table.schoolId),
  index('en_status_idx').on(table.status),
]);

// ==============================================
// CLASSROOM ASSIGNMENT (M2)
// ==============================================

export const classroomAssignment = pgTable('classroom_assignment', {
  id: uuid('id').primaryKey().defaultRandom(),
  enrollmentId: uuid('enrollment_id').notNull().references(() => enrollment.id, { onDelete: 'restrict' }),
  classroomId: uuid('classroom_id').notNull().references(() => classroom.id, { onDelete: 'restrict' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  status: classroomAssignmentStatusEnum('status').notNull().default('active'),
  ...auditColumns,
}, (table) => [
  index('ca_enrollment_idx').on(table.enrollmentId),
  index('ca_classroom_idx').on(table.classroomId),
  index('ca_status_idx').on(table.status),
]);

export type ClassroomAssignment = typeof classroomAssignment.$inferSelect;
export type NewClassroomAssignment = typeof classroomAssignment.$inferInsert;

// ==============================================
// SUBJECT
// ==============================================

export const subject = pgTable('subject', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => school.id),
  code: text('code').notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  coefficient: numeric('coefficient', { precision: 6, scale: 2 }).notNull().default('1'),
  defaultScale: integer('default_scale').notNull().default(20),
  isActive: boolean('is_active').notNull().default(true),
  isOptional: boolean('is_optional').notNull().default(false),
  includeInAverage: boolean('include_in_average').notNull().default(true),
  includeInRanking: boolean('include_in_ranking').notNull().default(true),
  includeInDecision: boolean('include_in_decision').notNull().default(true),
  ...auditColumns,
}, (table) => [
  uniqueIndex('us_school_code').on(table.schoolId, table.code),
]);

// ==============================================
// SUBJECT COMPONENT
// ==============================================

export const subjectComponent = pgTable('subject_component', {
  id: uuid('id').primaryKey().defaultRandom(),
  subjectId: uuid('subject_id').notNull().references(() => subject.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  coefficient: numeric('coefficient', { precision: 6, scale: 2 }).notNull().default('1'),
  componentScale: integer('scale').notNull().default(20),
  isRequired: boolean('is_required').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  ...auditColumns,
}, (table) => [
  uniqueIndex('uc_subject_name').on(table.subjectId, table.name),
  index('sc_subject_idx').on(table.subjectId),
]);

// ==============================================
// ASSESSMENT TYPE
// ==============================================

export const assessmentType = pgTable('assessment_type', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => school.id),
  name: text('name').notNull(),
  description: text('description'),
  ...auditColumns,
});

// ==============================================
// ASSESSMENT
// ==============================================

export const assessment = pgTable('assessment', {
  id: uuid('id').primaryKey().defaultRandom(),
  classroomId: uuid('classroom_id').notNull().references(() => classroom.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').notNull().references(() => subject.id),
  academicPeriodId: uuid('academic_period_id').notNull().references(() => academicPeriod.id),
  assessmentTypeId: uuid('assessment_type_id').references(() => assessmentType.id),
  title: text('title').notNull(),
  scale: integer('scale').notNull().default(20),
  coefficient: numeric('coefficient', { precision: 6, scale: 2 }).notNull().default('1'),
  date: date('assessment_date').notNull(),
  description: text('description'),
  ...auditColumns,
}, (table) => [
  index('as_classroom_idx').on(table.classroomId),
  index('as_subject_idx').on(table.subjectId),
  index('as_period_idx').on(table.academicPeriodId),
]);

// ==============================================
// GRADE (NOTE)
// ==============================================

export const grade = pgTable('grade', {
  id: uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id').notNull().references(() => assessment.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => student.id, { onDelete: 'cascade' }),
  rawValue: numeric('raw_value', { precision: 8, scale: 4 }),
  originalScale: integer('original_scale'),
  status: gradeStatusEnum('status').notNull().default('pending'),
  comment: text('comment'),
  ...auditColumns,
}, (table) => [
  uniqueIndex('ug_assessment_student').on(table.assessmentId, table.studentId),
  index('gr_student_idx').on(table.studentId),
]);

// ==============================================
// REPORT CARD
// ==============================================

export const reportCard = pgTable('report_card', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => student.id),
  enrollmentId: uuid('enrollment_id').notNull().references(() => enrollment.id),
  academicPeriodId: uuid('academic_period_id').notNull().references(() => academicPeriod.id),
  status: reportCardStatusEnum('status').notNull().default('draft'),
  generalAverage: numeric('general_average', { precision: 8, scale: 4 }),
  classAverage: numeric('class_average', { precision: 8, scale: 4 }),
  rank: integer('rank'),
  totalStudentsRanked: integer('total_students_ranked'),
  conductGrade: numeric('conduct_grade', { precision: 4, scale: 2 }),
  conductComment: text('conduct_comment'),
  teacherComment: text('teacher_comment'),
  directorComment: text('director_comment'),
  promotionDecision: promotionDecisionEnum('promotion_decision'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  publishedBy: uuid('published_by'),
  configVersionId: uuid('config_version_id'),
  ...auditColumns,
}, (table) => [
  uniqueIndex('ur_student_period').on(table.studentId, table.academicPeriodId),
  index('rc_enrollment_idx').on(table.enrollmentId),
  index('rc_status_idx').on(table.status),
]);

// ==============================================
// REPORT CARD ITEM (détail par matière)
// ==============================================

export const reportCardItem = pgTable('report_card_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  reportCardId: uuid('report_card_id').notNull().references(() => reportCard.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').notNull().references(() => subject.id),
  average: numeric('average', { precision: 8, scale: 4 }),
  coefficient: numeric('coefficient', { precision: 6, scale: 2 }),
  weightedPoints: numeric('weighted_points', { precision: 10, scale: 4 }),
  classAverage: numeric('class_average', { precision: 8, scale: 4 }),
  minAverage: numeric('min_average', { precision: 8, scale: 4 }),
  maxAverage: numeric('max_average', { precision: 8, scale: 4 }),
  teacherAppreciation: text('teacher_appreciation'),
  ...auditColumns,
}, (table) => [
  uniqueIndex('uri_rc_subject').on(table.reportCardId, table.subjectId),
]);

// ==============================================
// PEDAGOGICAL CONFIG (versionnée)
// ==============================================

export const pedagogicalConfig = pgTable('pedagogical_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => school.id),
  levelId: uuid('level_id').notNull().references(() => level.id),
  academicYearId: uuid('academic_year_id').notNull().references(() => academicYear.id),
  version: integer('version').notNull().default(1),
  status: configStatusEnum('status').notNull().default('draft'),
  calculationPolicy: calculationPolicyEnum('calculation_policy').notNull().default('simple_average'),
  roundingStrategy: roundingStrategyEnum('rounding_strategy').notNull().default('half_up'),
  subjectDecimalPlaces: integer('subject_decimal_places').notNull().default(2),
  generalDecimalPlaces: integer('general_decimal_places').notNull().default(2),
  rankingEnabled: boolean('ranking_enabled').notNull().default(true),
  conductEnabled: boolean('conduct_enabled').notNull().default(false),
  conductIncludedInAverage: boolean('conduct_included_in_average').notNull().default(false),
  conductCoefficient: numeric('conduct_coefficient', { precision: 6, scale: 2 }).default('0'),
  conductScale: integer('conduct_scale').default(20),
  description: text('description'),
  ...auditColumns,
}, (table) => [
  uniqueIndex('upc_level_year_version').on(table.levelId, table.academicYearId, table.version),
]);

// ==============================================
// CONFIG SUBJECT (matière dans une config)
// ==============================================

export const configSubject = pgTable('config_subject', {
  id: uuid('id').primaryKey().defaultRandom(),
  configId: uuid('config_id').notNull().references(() => pedagogicalConfig.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').notNull().references(() => subject.id),
  coefficient: numeric('coefficient', { precision: 6, scale: 2 }).notNull(),
  componentScale: integer('scale').notNull().default(20),
  isActive: boolean('is_active').notNull().default(true),
  includeInAverage: boolean('include_in_average').notNull().default(true),
  includeInRanking: boolean('include_in_ranking').notNull().default(true),
  includeInDecision: boolean('include_in_decision').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  ...auditColumns,
}, (table) => [
  uniqueIndex('ucs_config_subject').on(table.configId, table.subjectId),
]);

// ==============================================
// CONFIG COMPONENT
// ==============================================

export const configComponent = pgTable('config_component', {
  id: uuid('id').primaryKey().defaultRandom(),
  configSubjectId: uuid('config_subject_id').notNull().references(() => configSubject.id, { onDelete: 'cascade' }),
  subjectComponentId: uuid('subject_component_id').references(() => subjectComponent.id),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  coefficient: numeric('coefficient', { precision: 6, scale: 2 }).notNull().default('1'),
  componentScale: integer('scale').notNull().default(20),
  isRequired: boolean('is_required').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  ...auditColumns,
});

// ==============================================
// USER
// ==============================================

export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  username: text('username').unique(),
  role: roleEnum('role').notNull().default('reader'),
  platformRole: platformRoleEnum('platform_role').notNull().default('none'),
  isSuperAdmin: boolean('is_super_admin').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  ...auditColumns,
});

// ==============================================
// USER ACCOUNT (Better Auth)
// ==============================================

export const account = pgTable('account', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  ...auditColumns,
});

export const session = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  ...auditColumns,
});

// ==============================================
// TEACHER ASSIGNMENT
// ==============================================

export const teacherAssignment = pgTable('teacher_assignment', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  classroomId: uuid('classroom_id').notNull().references(() => classroom.id),
  subjectId: uuid('subject_id').notNull().references(() => subject.id),
  academicYearId: uuid('academic_year_id').notNull().references(() => academicYear.id),
  ...auditColumns,
}, (table) => [
  uniqueIndex('uta_user_class_subject_year').on(table.userId, table.classroomId, table.subjectId, table.academicYearId),
]);

// ==============================================
// AUDIT LOG
// ==============================================

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorType: text('actor_type'),
  actorIdentifier: text('actor_identifier'),
  userId: uuid('user_id'),
  schoolId: uuid('school_id'),
  requestId: text('request_id'),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: uuid('entity_id').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  context: text('context'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ==============================================
// TYPE EXPORTS
// ==============================================

export type School = typeof school.$inferSelect;
export type NewSchool = typeof school.$inferInsert;
export type AcademicYear = typeof academicYear.$inferSelect;
export type NewAcademicYear = typeof academicYear.$inferInsert;
export type AcademicPeriod = typeof academicPeriod.$inferSelect;
export type NewAcademicPeriod = typeof academicPeriod.$inferInsert;
export type Level = typeof level.$inferSelect;
export type NewLevel = typeof level.$inferInsert;
export type Classroom = typeof classroom.$inferSelect;
export type NewClassroom = typeof classroom.$inferInsert;
export type Student = typeof student.$inferSelect;
export type NewStudent = typeof student.$inferInsert;
export type Enrollment = typeof enrollment.$inferSelect;
export type NewEnrollment = typeof enrollment.$inferInsert;
export type Subject = typeof subject.$inferSelect;
export type NewSubject = typeof subject.$inferInsert;
export type SubjectComponent = typeof subjectComponent.$inferSelect;
export type NewSubjectComponent = typeof subjectComponent.$inferInsert;
export type Assessment = typeof assessment.$inferSelect;
export type NewAssessment = typeof assessment.$inferInsert;
export type Grade = typeof grade.$inferSelect;
export type NewGrade = typeof grade.$inferInsert;
export type ReportCard = typeof reportCard.$inferSelect;
export type NewReportCard = typeof reportCard.$inferInsert;
export type ReportCardItem = typeof reportCardItem.$inferSelect;
export type NewReportCardItem = typeof reportCardItem.$inferInsert;
export type PedagogicalConfig = typeof pedagogicalConfig.$inferSelect;
export type NewPedagogicalConfig = typeof pedagogicalConfig.$inferInsert;
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;

// ==============================================
// SCHOOL MEMBERSHIP (M1-29.8)
// ==============================================

export const schoolMembership = pgTable('school_membership', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').notNull().references(() => school.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: schoolMembershipRoleEnum('role').notNull().default('reader'),
  isActive: boolean('is_active').notNull().default(true),
  ...auditColumns,
}, (table) => [
  uniqueIndex('usm_school_user').on(table.schoolId, table.userId),
  index('sm_user_idx').on(table.userId),
  index('sm_school_idx').on(table.schoolId),
]);

export type SchoolMembershipRow = typeof schoolMembership.$inferSelect;
export type NewSchoolMembership = typeof schoolMembership.$inferInsert;

// ==============================================
// CONFIG SUBJECT (type re-export)
// ==============================================

export type ConfigSubject = typeof configSubject.$inferSelect;
export type NewConfigSubject = typeof configSubject.$inferInsert;
export type ConfigComponent = typeof configComponent.$inferSelect;
export type NewConfigComponent = typeof configComponent.$inferInsert;
export type TeacherAssignment = typeof teacherAssignment.$inferSelect;
export type NewTeacherAssignment = typeof teacherAssignment.$inferInsert;