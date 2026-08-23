/**
 * Phase F — M3 Pedagogy Domain Services barrel export
 *
 * All 6 services + shared infrastructure.
 * INV-M3-24: Every exported mutation function requires
 * server-side authorization (enforced at the API route layer).
 */

// ─────────────────────────────────────────────
// Shared infrastructure
// ─────────────────────────────────────────────

export { PedagogyDomainError, pedagogyErrorToResponse } from './errors';
export type {
  PedagogyDomainError as PedagogyDomainErrorType,
} from './errors';
export { logPedagogyAudit, sessionToAuditActor, buildChangeLog } from './audit';
export type { PedagogyAuditParams } from './audit';

// ─────────────────────────────────────────────
// Catalogue services
// ─────────────────────────────────────────────

export {
  listSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  listAllSubjects,
} from './subject.service';

export {
  listComponentsBySubject,
  getComponentById,
  createComponent,
  updateComponent,
  deleteComponent,
} from './subject-component.service';

export {
  listAssessmentTypes,
  getAssessmentTypeById,
  createAssessmentType,
  updateAssessmentType,
  deleteAssessmentType,
  listAllAssessmentTypes,
} from './assessment-type.service';

// ─────────────────────────────────────────────
// Configuration services
// ─────────────────────────────────────────────

export {
  listConfigs,
  getConfigById,
  createConfig,
  updateConfig,
  activateConfig,
  cloneConfig,
  deleteConfig,
} from './pedagogical-config.service';

export {
  listConfigSubjects,
  getConfigSubjectById,
  createConfigSubject,
  updateConfigSubject,
  deleteConfigSubject,
} from './config-subject.service';

export {
  listConfigComponents,
  getConfigComponentById,
  createConfigComponent,
  updateConfigComponent,
  deleteConfigComponent,
} from './config-component.service';
