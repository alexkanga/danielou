/**
 * Phase F — M3 Domain Error Types
 *
 * Structured domain errors for all 6 pedagogy entities.
 * Each error carries an invariant code (INV-M3-XX) when relevant,
 * allowing API routes to map to the correct HTTP status.
 */

export class PedagogyDomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = 'PedagogyDomainError';
  }
}

// ─────────────────────────────────────────────
// Catalogue errors (Subject, SubjectComponent, AssessmentType)
// ─────────────────────────────────────────────

export class NotFoundError extends PedagogyDomainError {
  constructor(entity: string, id: string) {
    super(
      `${entity.toUpperCase()}_NOT_FOUND`,
      `${entity} non trouvé(e) (id: ${id}).`,
      404,
    );
  }
}

export class DuplicateError extends PedagogyDomainError {
  constructor(entity: string, field: string) {
    super(
      `${entity.toUpperCase()}_DUPLICATE`,
      `Un(e) ${entity} avec ce ${field} existe déjà.`,
      409,
    );
  }
}

/** INV-M3-14: Cannot delete catalog entry referenced by configuration */
export class CatalogReferencedError extends PedagogyDomainError {
  constructor(
    public readonly entity: string,
    public readonly referencingTable: string,
    public readonly referenceCount: number,
  ) {
    super(
      'CATALOG_REFERENCED',
      `Impossible de supprimer : ${referenceCount} référence(s) dans ${referencingTable}. Désactivez plutôt l'entrée (is_active = false) pour préserver l'historique. [INV-M3-14]`,
      409,
    );
  }
}

// ─────────────────────────────────────────────
// Config errors (PedagogicalConfig, ConfigSubject, ConfigComponent)
// ─────────────────────────────────────────────

/** INV-M3-07: Level / academic year / config school compatibility */
export class ConfigSchoolMismatchError extends PedagogyDomainError {
  constructor(detail: string) {
    super(
      'CONFIG_SCHOOL_MISMATCH',
      `Incohérence d'école : ${detail} [INV-M3-07]`,
      422,
    );
  }
}

/** INV-M3-06: ConfigSubject.subject.school != config.school */
export class ConfigSubjectSchoolMismatchError extends PedagogyDomainError {
  constructor() {
    super(
      'CONFIG_SUBJECT_SCHOOL_MISMATCH',
      "La matière n'appartient pas à la même école que la configuration. [INV-M3-06]",
      422,
    );
  }
}

/** INV-M3-08: ConfigComponent's component subject != ConfigSubject's subject */
export class ComponentSubjectMismatchError extends PedagogyDomainError {
  constructor() {
    super(
      'COMPONENT_SUBJECT_MISMATCH',
      "La composante n'appartient pas à la même matière que le config_subject. [INV-M3-08]",
      422,
    );
  }
}

/** INV-M3-02/03/04: Config not mutable */
export class ConfigNotMutableError extends PedagogyDomainError {
  constructor(status: string) {
    super(
      'CONFIG_NOT_MUTABLE',
      `Seule une configuration en brouillon (draft) peut être modifiée. Statut actuel : ${status}. [INV-M3-02/03/04]`,
      409,
    );
  }
}

/** INV-M3-01: Already has active config */
export class ActiveConfigExistsError extends PedagogyDomainError {
  constructor() {
    super(
      'ACTIVE_CONFIG_EXISTS',
      'Une configuration active existe déjà pour ce niveau et cette année scolaire. Désactivez-la d\'abord. [INV-M3-01]',
      409,
    );
  }
}

/** INV-M3-15: Activation transaction failure */
export class ActivationError extends PedagogyDomainError {
  constructor(detail: string) {
    super(
      'ACTIVATION_FAILED',
      `Échec de l'activation : ${detail} [INV-M3-15]`,
      409,
    );
  }
}

/** INV-M3-16: Clone failure */
export class CloneError extends PedagogyDomainError {
  constructor(detail: string) {
    super(
      'CLONE_FAILED',
      `Échec du clonage : ${detail} [INV-M3-16]`,
      409,
    );
  }
}

// ─────────────────────────────────────────────
// Helper: map domain error to NextResponse
// ─────────────────────────────────────────────

export function pedagogyErrorToResponse(error: unknown): Response {
  if (error instanceof PedagogyDomainError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.httpStatus },
    );
  }

  // Re-use the existing handleApiError for non-domain errors
  // (auth, DB, etc.)
  // M4 errors
  const err = error as Error;
  if (err.name === 'AssessmentLifecycleError' || err.name === 'AssessmentImmutabilityError') {
    return Response.json({ error: err.message, code: 'ASSESSMENT_LIFECYCLE' }, { status: 409 });
  }
  if (err.name === 'GradeEligibilityError') {
    return Response.json({ error: err.message, code: 'GRADE_ELIGIBILITY' }, { status: 422 });
  }

  if (error instanceof Error) {
    if (error.message === 'UNAUTHORIZED') {
      return Response.json({ error: 'Non autorisé.' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return Response.json({ error: 'Accès refusé.' }, { status: 403 });
    }
    if (error.message === 'NO_SCHOOL_CONFIGURED') {
      return Response.json(
        { error: 'Aucune école configurée.' },
        { status: 503 },
      );
    }
  }

  console.error('[pedagogy]', error);
  return Response.json(
    { error: 'Erreur interne du serveur.' },
    { status: 500 },
  );
}
