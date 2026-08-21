# R-V2-01 — TARGET DATA MODEL

**Projet**: Daniélou Abidjan — Plateforme de gestion scolaire  
**Date**: 2026-08-21  
**Prédecesseur**: R-V2-00 (audit de l'état actuel au commit `209b077`)  
**Statut**: MODÈLE CIBLE V2 — prêt pour planification de migration

---

## 1. RÉSUMÉ DES CHANGEMENTS

| Dimension | V1 (actuel) | V2 (cible) |
|-----------|-------------|------------|
| Tables applicatives | 22 | **29** (+7 nouvelles) |
| Enums | 10 | **14** (+4 nouvelles) |
| Role model | Monolithique (`user.role`) | **Dual : Platform Role + School Role** |
| Enrollment | Contient `classroom_id` | **Sans `classroom_id`** → délégué à `classroom_assignment` |
| Grade | Lié à `student_id` | **Lié à `enrollment_id`** |
| Assessment | Lié à `subject_id` | **Lié à `config_subject_id`** |
| Subject | Catalogue + règles pédagogiques | **Catalogue pur** (rules → `config_subject`) |
| SubjectComponent | Catalogue + règles pédagogiques | **Catalogue pur** (rules → `config_component`) |
| ReportCard | Contient `student_id` + `promotion_decision` | **Via `enrollment_id`** + snapshotté |
| TeacherAssignment | Colonnes plates (`user_id`, `subject_id`, `academic_year_id`) | **Via `school_membership_id`** + temporalité |
| AuditLog | `user_id` + `text` pour old/new | **`actor_type` + `JSONB` + `school_id`** |
| User | `role` monolithique | **`platform_role`** (GHOST / SUPER_ADMIN / NONE) |
| AnnualResult | Absent | **Nouvelle table** — décision annuelle |
| ClassroomAssignment | Absent | **Nouvelle table** — affectation temporelle |
| SchoolMembership | Absent | **Nouvelle table** — RBAC scolaire |
| ReportCardComponentItem | Absent | **Nouvelle table** — composantes snapshottées |
| School | Pas de `code`, `timezone`, `locale`, `is_active` | **Colonnes ajoutées** |

### 7 nouvelles tables

1. `school_membership` — adhésion utilisateur/école avec rôle scolaire
2. `classroom_assignment` — affectation temporelle d'un enrollment à une classe
3. `annual_result` — décision scolaire annuelle par enrollment
4. `report_card_component_item` — composantes détaillées dans un bulletin
5. Tables Better Auth additionnelles potentielles (verification, etc.)

### 4 nouveaux enums

1. `school_role` — `admin`, `direction`, `teacher`, `reader`
2. `platform_role` — `ghost`, `super_admin`, `none`
3. `classroom_assignment_status` — statuts d'affectation de classe
4. `assignment_type` — `homeroom`, `subject` (teacher assignment)

---

## 2. DUAL ROLE SYSTEM

### 2.1 Platform Role (rôle de plateforme)

Défini sur `user.platform_role`. Valeurs :

| Valeur | Description | Portée |
|--------|-------------|--------|
| `ghost` | Compte break-glass Fantomas | Plateforme entière + Recovery Mode |
| `super_admin` | Administrateur de plateforme | Gestion utilisateurs, tous droits ADMIN |
| `none` | Rôle par défaut | Aucun droit de plateforme |

**Règle** : le `platform_role` ne donne pas de droits scolaires directs. Ceux-ci viennent de `school_membership`.

### 2.2 School Role (rôle scolaire)

Défini sur `school_membership.role`. Valeurs :

| Valeur | Description | Périmètre |
|--------|-------------|-----------|
| `admin` | Administration scolaire complète | École assignée |
| `direction` | Consultation, validation, stats | École assignée |
| `teacher` | Saisie notes dans périmètre affecté | Classes/matières assignées |
| `reader` | Consultation uniquement | Périmètre assigné |

**Règle** : un utilisateur peut avoir des rôles différents dans des écoles différentes. Le rôle scolaire ne dépend plus exclusivement de `user.role`.

### 2.3 Matrice de permissions

| Action | GHOST | SUPER_ADMIN | ADMIN (école) | DIRECTION | TEACHER | READER |
|--------|-------|-------------|---------------|-----------|---------|--------|
| Gestion utilisateurs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Créer SUPER_ADMIN | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Administration scolaire | ✅ | ✅ (via ADMIN) | ✅ | ❌ | ❌ | ❌ |
| Consulter données | ✅ | ✅ | ✅ | ✅ | ✅ (périmètre) | ✅ (périmètre) |
| Saisir notes | ✅ | ✅ | ✅ | ❌ | ✅ (périmètre) | ❌ |
| Valider bulletins | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Publier bulletins | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Décision annuelle | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Recovery Mode | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Créer école | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 3. SCHÉMA CIBLE COMPLET

### Conventions

- Toutes les colonnes `*_at` de type timestamp utilisent `TIMESTAMPTZ` (with timezone)
- PK : `UUID` avec `defaultRandom()`
- Audit trail : `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` (mise à jour via trigger ou mécanisme Drizzle centralisé)
- Les colonnes marquées `→ RETIRER` sont à supprimer en phase CONTRACT uniquement, après migration vérifiée
- Les colonnes marquées `→ AJOUTER` sont à créer en phase EXPAND

---

### 3.1 `school`

**Responsabilité métier** : Établissement scolaire. Un tenant.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `code` | `TEXT` | | → AJOUTER — code identifiant de l'école |
| `name` | `TEXT` | `NOT NULL` | |
| `address` | `TEXT` | nullable | |
| `city` | `TEXT` | `DEFAULT 'Abidjan'` | |
| `country` | `TEXT` | `DEFAULT 'Côte d''Ivoire'` | |
| `timezone` | `TEXT` | `DEFAULT 'Africa/Abidjan'` | → AJOUTER |
| `locale` | `TEXT` | `DEFAULT 'fr-CI'` | → AJOUTER |
| `logo_url` | `TEXT` | nullable | |
| `is_active` | `BOOLEAN` | `DEFAULT true` | → AJOUTER |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Contraintes** : Aucune contrainte spécifique au-delà du PK.

**Delete policy** : `RESTRICT` — ne pas supprimer une école possédant un historique.

**Invariants** : Un seul tenant actif en production. Pas de cross-school silencieux.

---

### 3.2 `academic_year`

**Responsabilité métier** : Année scolaire rattachée à une école.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `school_id` | `UUID` | `NOT NULL FK → school.id` | |
| `name` | `TEXT` | `NOT NULL` | |
| `start_date` | `DATE` | `NOT NULL` | |
| `end_date` | `DATE` | `NOT NULL` | |
| `status` | `academic_year_status` | `NOT NULL DEFAULT 'preparation'` | Enum inchangé |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Contraintes** :
- `UNIQUE(school_id, name)` ✅ déjà présent
- → AJOUTER : `CHECK(start_date < end_date)`
- Règle métier (côté domaine) : au plus une année `active` simultanée par école

**Delete policy** : `RESTRICT` — protéger l'historique.

---

### 3.3 `academic_period`

**Responsabilité métier** : Période (trimestre/semestre) dans une année scolaire.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `academic_year_id` | `UUID` | `NOT NULL FK → academic_year.id` | |
| `name` | `TEXT` | `NOT NULL` | |
| `sort_order` | `INTEGER` | `NOT NULL DEFAULT 1` | |
| `start_date` | `DATE` | `NOT NULL` | |
| `end_date` | `DATE` | `NOT NULL` | |
| `status` | `period_status` | `NOT NULL DEFAULT 'draft'` | Enum inchangé |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Contraintes** :
- `UNIQUE(academic_year_id, name)` ✅ déjà présent
- → AJOUTER : `CHECK(sort_order > 0)`
- → AJOUTER : `CHECK(start_date < end_date)`
- Validation domaine : `period.start_date >= year.start_date` ET `period.end_date <= year.end_date`

**Delete policy** : `CASCADE` (enfant strict d'academic_year).

---

### 3.4 `level`

**Responsabilité métier** : Niveau scolaire (CP1, CE1, etc.) — catalogue configurables, jamais codés en dur.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `school_id` | `UUID` | `NOT NULL FK → school.id` | |
| `code` | `TEXT` | | → AJOUTER |
| `name` | `TEXT` | `NOT NULL` | |
| `sort_order` | `INTEGER` | `NOT NULL DEFAULT 0` | |
| `is_active` | `BOOLEAN` | `DEFAULT true` | → AJOUTER |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Contraintes** :
- `UNIQUE(school_id, name)` ✅ déjà présent
- → AJOUTER : `UNIQUE(school_id, code)` (code nullable-safe via index partiel si code nullable)
- → AJOUTER : `CHECK(sort_order >= 0)`

**Delete policy** : `RESTRICT` — niveau utilisé dans classroom et pedagogical_config.

---

### 3.5 `classroom`

**Responsabilité métier** : Classe concrète d'un niveau pour une année scolaire déterminée.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `school_id` | `UUID` | `NOT NULL` | → AJOUTER — dénormalisation pour cohérence multi-école |
| `level_id` | `UUID` | `NOT NULL FK → level.id` | |
| `academic_year_id` | `UUID` | `NOT NULL FK → academic_year.id` | |
| `name` | `TEXT` | `NOT NULL` | |
| `is_active` | `BOOLEAN` | `DEFAULT true` | → AJOUTER |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Contraintes** :
- `UNIQUE(level_id, academic_year_id, name)` ✅ déjà présent
- Invariant métier : `classroom.school_id = level.school_id = academic_year.school_id` (garanti transactionnellement + tests, ou FK composite)

**Delete policy** : `RESTRICT` — une classe avec des évaluations ou affectations doit être protégée.

---

### 3.6 `student`

**Responsabilité métier** : Identité **permanente** d'un élève. Un élève est créé une seule fois.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `school_id` | `UUID` | `NOT NULL FK → school.id` | |
| `matricule` | `TEXT` | nullable | |
| `first_name` | `TEXT` | `NOT NULL` | |
| `last_name` | `TEXT` | `NOT NULL` | |
| `date_of_birth` | `DATE` | nullable | |
| `gender` | `TEXT` | nullable | |
| `status` | `TEXT` | `DEFAULT 'active'` | → AJOUTER |
| `archived_at` | `TIMESTAMPTZ` | nullable | → AJOUTER |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Contraintes** :
- → AJOUTER : `UNIQUE(school_id, matricule)` WHERE matricule IS NOT NULL (index partiel)
- → AJOUTER : `CHECK(sort_order >= 0)` si applicable
- **INTERDICTION** : ne jamais ajouter `classroom_id` dans `student`

**Delete policy** : `RESTRICT` — un étudiant avec un historique scolaire ne doit jamais être supprimé en cascade.

**Invariants** :
- Un `student` est permanent. Son historique (enrollments, grades, bulletins) est protégé.
- Le `ON DELETE CASCADE` actuel depuis `student` vers `enrollment` et `grade` doit devenir `RESTRICT` ou `NO ACTION`.

---

### 3.7 `enrollment`

**Responsabilité métier** : « Cet élève est inscrit dans cet établissement pour cette année scolaire. » — Un seul enrollment par élève par année.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `school_id` | `UUID` | `NOT NULL` | → AJOUTER — cohérence multi-école |
| `student_id` | `UUID` | `NOT NULL FK → student.id` | → PASSER EN `NO ACTION` (retirer CASCADE) |
| `academic_year_id` | `UUID` | `NOT NULL FK → academic_year.id` | |
| `status` | `enrollment_status` | `NOT NULL DEFAULT 'active'` | Enum inchangé |
| `enrolled_at` | `DATE` | nullable | → AJOUTER |
| `exited_at` | `DATE` | nullable | → AJOUTER |
| `classroom_id` | `UUID` | FK → classroom.id | → RETIRER EN CONTRACT (après migration vers classroom_assignment) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Contraintes** :
- `UNIQUE(student_id, academic_year_id)` ✅ déjà présent
- Invariant : `enrollment.school_id = student.school_id = academic_year.school_id`

**Delete policy** : `RESTRICT` — protéger l'historique scolaire. Le CASCADE actuel doit être retiré.

---

### 3.8 `classroom_assignment` — **NOUVELLE TABLE**

**Responsabilité métier** : Affectation temporelle d'un enrollment à une classe. Permet le suivi des transferts.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `enrollment_id` | `UUID` | `NOT NULL FK → enrollment.id` | |
| `classroom_id` | `UUID` | `NOT NULL FK → classroom.id` | |
| `start_date` | `DATE` | `NOT NULL` | |
| `end_date` | `DATE` | nullable | |
| `status` | `classroom_assignment_status` | `NOT NULL` | Nouvel enum |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Contraintes** :
- `CHECK(end_date IS NULL OR start_date <= end_date)`
- Un enrollment ne doit pas avoir deux affectations actives qui se chevauchent (contrôle transactionnel + tests, pas d'exclusion constraint complexe en V1)

**Exemple** :
```
Koffi — Enrollment 2026-2027
  ├── CP1 A  01/09/2026 → 15/01/2027  (transféré)
  └── CP1 B  16/01/2027 → 30/06/2027  (actif)
→ 1 Enrollment, 2 ClassroomAssignments
```

**Delete policy** : `RESTRICT` — protéger l'historique.

---

### 3.9 `subject`

**Responsabilité métier** : Catalogue de matières. Les règles pédagogiques (coefficient, barème, etc.) sont migreées vers `config_subject`.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `school_id` | `UUID` | `NOT NULL FK → school.id` | |
| `code` | `TEXT` | `NOT NULL` | |
| `name` | `TEXT` | `NOT NULL` | |
| `sort_order` | `INTEGER` | `NOT NULL DEFAULT 0` | |
| `is_active` | `BOOLEAN` | `DEFAULT true` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `coefficient` | `NUMERIC(6,2)` | `DEFAULT '1'` | → RETIRER EN CONTRACT (source de vérité = config_subject) |
| `default_scale` | `INTEGER` | `DEFAULT 20` | → RETIRER EN CONTRACT |
| `is_optional` | `BOOLEAN` | `DEFAULT false` | → RETIRER EN CONTRACT |
| `include_in_average` | `BOOLEAN` | `DEFAULT true` | → RETIRER EN CONTRACT |
| `include_in_ranking` | `BOOLEAN` | `DEFAULT true` | → RETIRER EN CONTRACT |
| `include_in_decision` | `BOOLEAN` | `DEFAULT true` | → RETIRER EN CONTRACT |

**Contraintes** :
- `UNIQUE(school_id, code)` ✅ déjà présent
- → AJOUTER : `CHECK(sort_order >= 0)`

**Delete policy** : `RESTRICT` — matière référencée dans config_subject.

---

### 3.10 `subject_component`

**Responsabilité métier** : Catalogue de composantes de matière. Les règles effectives migrent vers `config_component`.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `subject_id` | `UUID` | `NOT NULL FK → subject.id` | |
| `code` | `TEXT` | nullable | → AJOUTER |
| `name` | `TEXT` | `NOT NULL` | |
| `sort_order` | `INTEGER` | `NOT NULL DEFAULT 0` | |
| `is_active` | `BOOLEAN` | `DEFAULT true` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `coefficient` | `NUMERIC(6,2)` | `DEFAULT '1'` | → RETIRER EN CONTRACT |
| `scale` | `INTEGER` | `DEFAULT 20` | → RETIRER EN CONTRACT |
| `is_required` | `BOOLEAN` | `DEFAULT true` | → RETIRER EN CONTRACT |

**Contraintes** :
- `UNIQUE(subject_id, name)` ✅ déjà présent
- → AJOUTER : unicité de code WHEN code IS NOT NULL

**Delete policy** : `RESTRICT`.

---

### 3.11 `assessment_type`

**Responsabilité métier** : Types d'évaluation (devoir, contrôle, examen...).

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `school_id` | `UUID` | `NOT NULL FK → school.id` | |
| `name` | `TEXT` | `NOT NULL` | |
| `description` | `TEXT` | nullable | |
| `default_coefficient` | `NUMERIC` | nullable | → AJOUTER |
| `default_scale` | `INTEGER` | nullable | → AJOUTER |
| `is_active` | `BOOLEAN` | `DEFAULT true` | → AJOUTER |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Contraintes** :
- → AJOUTER : `UNIQUE(school_id, name)`
- → AJOUTER : `CHECK(default_coefficient IS NULL OR default_coefficient >= 0)`
- → AJOUTER : `CHECK(default_scale IS NULL OR default_scale > 0)`

---

### 3.12 `assessment`

**Responsabilité métier** : Évaluation créée par un enseignant pour une classe dans une période. Refonction structurante : liée à la configuration pédagogique.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `classroom_id` | `UUID` | `NOT NULL FK → classroom.id` | |
| `academic_period_id` | `UUID` | `NOT NULL FK → academic_period.id` | |
| `config_subject_id` | `UUID` | `NOT NULL FK → config_subject.id` | → AJOUTER (EXPAND) |
| `config_component_id` | `UUID` | nullable FK → config_component.id | → AJOUTER (EXPAND) |
| `assessment_type_id` | `UUID` | nullable FK → assessment_type.id | |
| `subject_id` | `UUID` | `NOT NULL FK → subject.id` | → RETIRER EN CONTRACT |
| `title` | `TEXT` | `NOT NULL` | |
| `scale` | `INTEGER` | `NOT NULL DEFAULT 20` | |
| `coefficient` | `NUMERIC(6,2)` | `NOT NULL DEFAULT '1'` | |
| `assessment_date` | `DATE` | `NOT NULL` | |
| `status` | `TEXT` | nullable | → AJOUTER |
| `description` | `TEXT` | nullable | |
| `created_by` | `UUID` | nullable | → AJOUTER |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Contraintes** :
- → AJOUTER : `CHECK(scale > 0)`
- → AJOUTER : `CHECK(coefficient >= 0)`
- Invariant métier : `assessment.classroom` + `assessment.period` + `config_subject` + `config_component` doivent correspondre au même contexte année/niveau/configuration
- `config_component` doit appartenir à `config_subject`

---

### 3.13 `grade`

**Responsabilité métier** : Note d'un élève pour une évaluation. Liée à l'Enrollment (scolarité annuelle) et non à l'identité permanente.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `assessment_id` | `UUID` | `NOT NULL FK → assessment.id` | |
| `enrollment_id` | `UUID` | `NOT NULL` | → AJOUTER (EXPAND, nullable temporairement, puis NOT NULL) |
| `student_id` | `UUID` | `NOT NULL FK → student.id` | → RETIRER EN CONTRACT |
| `raw_value` | `NUMERIC(8,4)` | nullable | |
| `status` | `grade_status` | `NOT NULL DEFAULT 'pending'` | Enum inchangé |
| `comment` | `TEXT` | nullable | |
| `created_by` | `UUID` | nullable | → AJOUTER |
| `updated_by` | `UUID` | nullable | → AJOUTER |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `original_scale` | `INTEGER` | nullable | → RETIRER EN CONTRACT (le barème = assessment.scale) |

**Contraintes** :
- → AJOUTER : `UNIQUE(assessment_id, enrollment_id)` (après migration)
- → AJOUTER : `CHECK(raw_value IS NULL OR raw_value >= 0)`
- Validation domaine : `status = graded → raw_value NOT NULL`, `raw_value <= assessment.scale`

**Invariants** :
- Absence ≠ zéro. Une absence est un statut, pas une valeur.
- Le barème de référence est `assessment.scale`, pas dupliqué dans Grade.

---

### 3.14 `pedagogical_config`

**Responsabilité métier** : Configuration versionnée des règles pédagogiques pour un niveau + année.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `school_id` | `UUID` | `NOT NULL FK → school.id` | |
| `level_id` | `UUID` | `NOT NULL FK → level.id` | |
| `academic_year_id` | `UUID` | `NOT NULL FK → academic_year.id` | |
| `version` | `INTEGER` | `NOT NULL DEFAULT 1` | |
| `status` | `config_status` | `NOT NULL DEFAULT 'draft'` | Enum inchangé |
| `general_average_policy` | `general_average_policy` | `NOT NULL DEFAULT 'simple_average'` | → RENOMMER depuis `calculation_policy` |
| `rounding_strategy` | `rounding_strategy` | `NOT NULL DEFAULT 'half_up'` | Enum inchangé |
| `subject_decimal_places` | `INTEGER` | `NOT NULL DEFAULT 2` | |
| `general_decimal_places` | `INTEGER` | `NOT NULL DEFAULT 2` | |
| `ranking_enabled` | `BOOLEAN` | `NOT NULL DEFAULT true` | |
| `conduct_enabled` | `BOOLEAN` | `NOT NULL DEFAULT false` | |
| `conduct_included_in_average` | `BOOLEAN` | `NOT NULL DEFAULT false` | |
| `conduct_coefficient` | `NUMERIC(6,2)` | nullable | |
| `conduct_scale` | `INTEGER` | nullable | |
| `description` | `TEXT` | nullable | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Contraintes** :
- `UNIQUE(level_id, academic_year_id, version)` ✅ déjà présent
- → AJOUTER : `CHECK(version > 0)`
- → AJOUTER : `CHECK(subject_decimal_places BETWEEN 0 AND 6)`
- → AJOUTER : `CHECK(general_decimal_places BETWEEN 0 AND 6)`
- → AJOUTER : `CHECK(conduct_coefficient IS NULL OR conduct_coefficient >= 0)`
- → AJOUTER : `CHECK(conduct_scale IS NULL OR conduct_scale > 0)`

**Immuabilité** : Une config ACTIVE déjà utilisée pour produire des résultats ne doit plus être profondément modifiée. Modification structurante = cloner vers nouvelle version.

---

### 3.15 `config_subject`

**Responsabilité métier** : **Source de vérité pédagogique** pour une matière dans une configuration. Les coefficients, barèmes et politiques d'agrégation vivent ici.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `config_id` | `UUID` | `NOT NULL FK → pedagogical_config.id` | |
| `subject_id` | `UUID` | `NOT NULL FK → subject.id` | |
| `coefficient` | `NUMERIC(6,2)` | `NOT NULL` | |
| `scale` | `INTEGER` | `NOT NULL DEFAULT 20` | |
| `is_optional` | `BOOLEAN` | | → AJOUTER |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | |
| `include_in_average` | `BOOLEAN` | `NOT NULL DEFAULT true` | |
| `include_in_ranking` | `BOOLEAN` | `NOT NULL DEFAULT true` | |
| `include_in_decision` | `BOOLEAN` | `NOT NULL DEFAULT true` | |
| `assessment_aggregation_policy` | `TEXT` | nullable | → AJOUTER |
| `component_aggregation_policy` | `TEXT` | nullable | → AJOUTER |
| `sort_order` | `INTEGER` | `NOT NULL DEFAULT 0` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Contraintes** :
- `UNIQUE(config_id, subject_id)` ✅ déjà présent
- → AJOUTER : `CHECK(coefficient >= 0)`
- → AJOUTER : `CHECK(scale > 0)`
- → AJOUTER : `CHECK(sort_order >= 0)`

---

### 3.16 `config_component`

**Responsabilité métier** : Composante d'une matière dans une configuration. Détails des sous-évaluations.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `config_subject_id` | `UUID` | `NOT NULL FK → config_subject.id` | |
| `subject_component_id` | `UUID` | nullable FK → subject_component.id` | |
| `name` | `TEXT` | `NOT NULL` | |
| `sort_order` | `INTEGER` | `NOT NULL DEFAULT 0` | |
| `coefficient` | `NUMERIC(6,2)` | `NOT NULL DEFAULT '1'` | |
| `scale` | `INTEGER` | `NOT NULL DEFAULT 20` | |
| `is_required` | `BOOLEAN` | `NOT NULL DEFAULT true` | |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | |
| `assessment_aggregation_policy` | `TEXT` | nullable | → AJOUTER |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Contraintes** :
- → AJOUTER : `CHECK(sort_order >= 0)`
- → AJOUTER : `CHECK(coefficient >= 0)`
- → AJOUTER : `CHECK(scale > 0)`

**Note** : `subject_component_id` nullable permet une composante spécifique à une configuration sans équivalent dans le catalogue.

---

### 3.17 `teacher_assignment`

**Responsabilité métier** : Affectation d'un enseignant (membre d'une école) à une classe/matière.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `school_membership_id` | `UUID` | `NOT NULL FK → school_membership.id` | → AJOUTER |
| `classroom_id` | `UUID` | `NOT NULL FK → classroom.id` | |
| `config_subject_id` | `UUID` | nullable FK → config_subject.id` | → AJOUTER |
| `assignment_type` | `assignment_type` | `NOT NULL` | → AJOUTER (nouvel enum : `homeroom` / `subject`) |
| `start_date` | `DATE` | nullable | → AJOUTER |
| `end_date` | `DATE` | nullable | → AJOUTER |
| `status` | `TEXT` | `DEFAULT 'active'` | → AJOUTER |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `user_id` | `UUID` | `NOT NULL FK → user.id` | → RETIRER EN CONTRACT |
| `subject_id` | `UUID` | `NOT NULL FK → subject.id` | → RETIRER EN CONTRACT |
| `academic_year_id` | `UUID` | `NOT NULL FK → academic_year.id` | → RETIRER EN CONTRACT |

**Règles** :
- `homeroom` : `config_subject_id = NULL`
- `subject` : `config_subject_id NOT NULL`

---

### 3.18 `report_card`

**Responsabilité métier** : Bulletin périodique. Snapshot immuable après publication.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `enrollment_id` | `UUID` | `NOT NULL FK → enrollment.id` | |
| `academic_period_id` | `UUID` | `NOT NULL FK → academic_period.id` | |
| `pedagogical_config_id` | `UUID` | nullable FK → pedagogical_config.id` | → AJOUTER (transformer `config_version_id`) |
| `status` | `report_card_status` | `NOT NULL DEFAULT 'draft'` | Enum inchangé |
| `general_average` | `NUMERIC(8,4)` | nullable | |
| `class_average` | `NUMERIC(8,4)` | nullable | |
| `rank` | `INTEGER` | nullable | |
| `total_students_ranked` | `INTEGER` | nullable | |
| `conduct_grade` | `NUMERIC(4,2)` | nullable | |
| `conduct_comment` | `TEXT` | nullable | |
| `teacher_comment` | `TEXT` | nullable | |
| `director_comment` | `TEXT` | nullable | |
| `validated_at` | `TIMESTAMPTZ` | nullable | → AJOUTER |
| `validated_by` | `UUID` | nullable | → AJOUTER |
| `published_at` | `TIMESTAMPTZ` | nullable | |
| `published_by` | `UUID` | nullable | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `student_id` | `UUID` | `NOT NULL FK → student.id` | → RETIRER EN CONTRACT (dérivé via enrollment) |
| `config_version_id` | `UUID` | nullable | → RETIRER (remplacé par `pedagogical_config_id`) |
| `promotion_decision` | `promotion_decision` | nullable | → RETIRER (déplacé vers `annual_result`) |

**Contraintes** :
- → AJOUTER : `UNIQUE(enrollment_id, academic_period_id)`

**Delete policy** :
- `DRAFT` : supprimable → CASCADE sur items
- `PUBLISHED` : protégé (RESTRICT)

---

### 3.19 `report_card_item`

**Responsabilité métier** : Ligne matière d'un bulletin. Snapshot historique immuable.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `report_card_id` | `UUID` | `NOT NULL FK → report_card.id` | |
| `config_subject_id` | `UUID` | `NOT NULL FK → config_subject.id` | → REMPLACER `subject_id` |
| `subject_code` | `TEXT` | | → AJOUTER — snapshot |
| `subject_name` | `TEXT` | | → AJOUTER — snapshot |
| `average` | `NUMERIC(8,4)` | nullable | |
| `scale` | `INTEGER` | nullable | → AJOUTER |
| `coefficient` | `NUMERIC(6,2)` | nullable | |
| `weighted_points` | `NUMERIC(10,4)` | nullable | |
| `class_average` | `NUMERIC(8,4)` | nullable | |
| `min_average` | `NUMERIC(8,4)` | nullable | |
| `max_average` | `NUMERIC(8,4)` | nullable | |
| `sort_order` | `INTEGER` | nullable | → AJOUTER |
| `teacher_appreciation` | `TEXT` | nullable | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `subject_id` | `UUID` | `NOT NULL FK → subject.id` | → RETIRER EN CONTRACT |

**Contraintes** :
- `UNIQUE(report_card_id, config_subject_id)` (remplace l'actuel sur `subject_id`)

**Invariants** : Les colonnes `subject_code` / `subject_name` sont des snapshots. Un renommage futur de `Subject` ne modifie jamais un bulletin publié.

---

### 3.20 `report_card_component_item` — **NOUVELLE TABLE**

**Responsabilité métier** : Détail des composantes dans une ligne matière d'un bulletin. Snapshot historique.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `report_card_item_id` | `UUID` | `NOT NULL FK → report_card_item.id` | |
| `config_component_id` | `UUID` | nullable FK → config_component.id` | |
| `component_name` | `TEXT` | | Snapshot |
| `average` | `NUMERIC(8,4)` | nullable | |
| `scale` | `INTEGER` | nullable | |
| `coefficient` | `NUMERIC(6,2)` | nullable | |
| `weighted_points` | `NUMERIC(10,4)` | nullable | |
| `sort_order` | `INTEGER` | nullable | |

**Note** : Aussi un snapshot historique immuable.

---

### 3.21 `annual_result` — **NOUVELLE TABLE**

**Responsabilité métier** : Décision scolaire annuelle pour un enrollment.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `enrollment_id` | `UUID` | `NOT NULL FK → enrollment.id` | |
| `annual_average` | `NUMERIC(8,4)` | nullable | |
| `promotion_decision` | `promotion_decision` | nullable | Enum déplacé depuis report_card |
| `decision_comment` | `TEXT` | nullable | |
| `decision_at` | `TIMESTAMPTZ` | nullable | |
| `decided_by` | `UUID` | nullable | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Contraintes** :
- `UNIQUE(enrollment_id)` — un seul résultat annuel par enrollment

---

### 3.22 `school_membership` — **NOUVELLE TABLE**

**Responsabilité métier** : Adhésion d'un utilisateur à une école avec un rôle scolaire. Fondation du RBAC scolaire.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `school_id` | `UUID` | `NOT NULL FK → school.id` | |
| `user_id` | `UUID` | `NOT NULL FK → user.id` | |
| `role` | `school_role` | `NOT NULL` | Nouvel enum |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Contraintes** :
- `UNIQUE(school_id, user_id)` — un utilisateur a au plus un rôle par école

---

### 3.23 `user`

**Responsabilité métier** : Compte utilisateur. Géré par Better Auth pour l'authentification.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `email` | `TEXT` | `NOT NULL UNIQUE` | |
| `name` | `TEXT` | `NOT NULL` | |
| `platform_role` | `platform_role` | `NOT NULL DEFAULT 'none'` | → RENOMMER depuis `role` (enum `app_role` → `platform_role`) |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT true` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Enum cible** : `platform_role` = `{ghost, super_admin, none}` (remplace `app_role` = `{admin, direction, teacher, reader}`)

---

### 3.24 `account` (Better Auth)

**Responsabilité métier** : Comptes de connexion externes (email/password). Table gérée par Better Auth.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `user_id` | `UUID` | `NOT NULL FK → user.id CASCADE` | |
| `account_id` | `TEXT` | `NOT NULL` | |
| `provider_id` | `TEXT` | `NOT NULL` | |
| `access_token` | `TEXT` | nullable | |
| `refresh_token` | `TEXT` | nullable | |
| `expires_at` | `TIMESTAMPTZ` | nullable | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

---

### 3.25 `session` (Better Auth)

**Responsabilité métier** : Sessions des utilisateurs normaux. Table gérée par Better Auth.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `user_id` | `UUID` | `NOT NULL FK → user.id CASCADE` | |
| `token` | `TEXT` | `NOT NULL UNIQUE` | |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | |
| `ip_address` | `TEXT` | nullable | |
| `user_agent` | `TEXT` | nullable | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

---

### 3.26 `audit_log`

**Responsabilité métier** : Journal d'audit complet. Refactor pour supporter GHOST et SYSTEM.

| Colonne | Type | Contraintes | Notes |
|---------|------|-------------|-------|
| `id` | `UUID` | `PK` | |
| `school_id` | `UUID` | nullable | → AJOUTER |
| `user_id` | `UUID` | nullable | |
| `actor_type` | `TEXT` | `NOT NULL` | → AJOUTER : `user` / `ghost` / `system` |
| `actor_identifier` | `TEXT` | nullable | → AJOUTER |
| `action` | `TEXT` | `NOT NULL` | |
| `entity` | `TEXT` | `NOT NULL` | |
| `entity_id` | `UUID` | `NOT NULL` | |
| `old_value` | `JSONB` | nullable | → CHANGER depuis `TEXT` |
| `new_value` | `JSONB` | nullable | → CHANGER depuis `TEXT` |
| `context` | `JSONB` | nullable | → CHANGER depuis `TEXT` |
| `ip_address` | `TEXT` | nullable | |
| `user_agent` | `TEXT` | nullable | → AJOUTER |
| `request_id` | `TEXT` | nullable | → AJOUTER |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | |

**Règles actor** :
- Utilisateur normal : `user_id = UUID`, `actor_type = 'user'`
- Fantomas : `user_id = NULL`, `actor_type = 'ghost'`, `actor_identifier = 'fantomas'`
- Système/migration : `actor_type = 'system'`

---

## 4. ÉNUMÉRATIONS CIBLES (14)

| # | Nom | Valeurs | Statut | Notes |
|---|------|---------|--------|-------|
| 1 | `academic_year_status` | `preparation`, `active`, `closed` | Inchangé | |
| 2 | `period_status` | `draft`, `open`, `closed` | Inchangé | |
| 3 | `enrollment_status` | `active`, `transferred`, `withdrawn` | Inchangé | |
| 4 | `grade_status` | `pending`, `graded`, `absent_excused`, `absent_unexcused`, `exempt`, `not_evaluated` | Inchangé | |
| 5 | `report_card_status` | `draft`, `ready`, `validated`, `published` | Inchangé | |
| 6 | `config_status` | `draft`, `active`, `archived` | Inchangé | |
| 7 | `rounding_strategy` | `half_up`, `half_even`, `truncate` | Inchangé | |
| 8 | `promotion_decision` | `proposed_admitted`, `proposed_repeat`, `decision_required`, `final_admitted`, `final_repeat` | Inchangé | |
| 9 | **`platform_role`** | `ghost`, `super_admin`, `none` | **RENAME** | Remplace `app_role` (`admin`, `direction`, `teacher`, `reader`) |
| 10 | **`school_role`** | `admin`, `direction`, `teacher`, `reader` | **NOUVEAU** | Rôles scolaires dans `school_membership` |
| 11 | **`classroom_assignment_status`** | `active`, `transferred`, `withdrawn`, `completed` | **NOUVEAU** | Statuts d'affectation de classe |
| 12 | **`assignment_type`** | `homeroom`, `subject` | **NOUVEAU** | Type d'affectation enseignant |
| 13 | **`general_average_policy`** | `simple_average`, `weighted_average`, `single_grade` | **RENAME** | Remplace `calculation_policy` |
| 14 | `calculation_policy` | (ancien) | **SUPPRIMÉ** | Remplacé par `general_average_policy` |

---

## 5. COLONNES SUPPRIMÉES EN CONTRACT

Ces colonnes ne seront supprimées qu'après migration complète et vérifiée (phase CONTRACT) :

| Table | Colonne | Raison | Migration |
|-------|---------|--------|-----------|
| `enrollment` | `classroom_id` | Délégué à `classroom_assignment` | Données migrées vers classroom_assignment |
| `grade` | `student_id` | Délégué à `enrollment_id` | Résolu via enrollment correspondant |
| `grade` | `original_scale` | Redondant avec `assessment.scale` | Vérifié redondant puis supprimé |
| `assessment` | `subject_id` | Délégué à `config_subject_id` | Résolu via config applicable |
| `report_card` | `student_id` | Dérivé via `enrollment` | Accessible par jointure |
| `report_card` | `config_version_id` | Remplacé par `pedagogical_config_id` | Transformé en vraie FK |
| `report_card` | `promotion_decision` | Déplacé vers `annual_result` | Données migrées |
| `report_card_item` | `subject_id` | Remplacé par `config_subject_id` | + snapshot code/name |
| `subject` | `coefficient`, `default_scale`, `is_optional`, `include_in_*` | Délégué à `config_subject` | Valeurs migrées |
| `subject_component` | `coefficient`, `scale`, `is_required` | Délégué à `config_component` | Valeurs migrées |
| `teacher_assignment` | `user_id`, `subject_id`, `academic_year_id` | Via `school_membership_id` + `config_subject_id` | Données migrées |

---

## 6. MODIFICATIONS DELETE POLICY

La politique de suppression est entièrement revue pour protéger l'historique.

| Table | V1 Delete Policy | V2 Delete Policy | Raison |
|-------|-----------------|-----------------|--------|
| `student` | (pas de CASCADE entrante directe mais les enfants CASCADEnt) | **RESTRICT** | Protéger l'historique scolaire |
| `enrollment` | `CASCADE` depuis student | **RESTRICT** | Historique scolaire protégé |
| `grade` | `CASCADE` depuis assessment | **RESTRICT** | Notes historiques protégées |
| `report_card` | `CASCADE` depuis report_card_item | **DRAFT: CASCADE, PUBLISHED: RESTRICT** | Bulletin publié immuable |
| `level` | `CASCADE` depuis classroom | **RESTRICT** | Niveau avec historique |
| `classroom` | `CASCADE` depuis assessment | **RESTRICT** | Classe avec évaluations |
| `subject` | (pas de CASCADE entrante) | **RESTRICT** | Référencé dans config_subject |

**Règle générale** : CASCADE acceptable uniquement pour les enfants strictement dépendants d'un parent lui-même supprimable (ex: `report_card_item` si `report_card` DRAFT supprimé).

---

## 7. INDEX CIBLE

| Table | Index | Type | Notes |
|-------|-------|------|-------|
| `academic_year` | `school_id` | B-tree | → AJOUTER |
| `academic_year` | `(school_id, name)` | UNIQUE | Déjà présent |
| `academic_period` | `academic_year_id` | B-tree | Déjà présent |
| `classroom` | `academic_year_id` | B-tree | Déjà présent |
| `classroom` | `level_id` | B-tree | → AJOUTER |
| `student` | `school_id` | B-tree | Déjà présent |
| `student` | `(last_name, first_name)` | B-tree | Déjà présent |
| `student` | `(school_id, matricule)` | UNIQUE PARTIEL | → AJOUTER (WHERE matricule IS NOT NULL) |
| `enrollment` | `student_id` | B-tree | → AJOUTER |
| `enrollment` | `academic_year_id` | B-tree | → AJOUTER |
| `enrollment` | `(student_id, academic_year_id)` | UNIQUE | Déjà présent |
| `classroom_assignment` | `enrollment_id` | B-tree | → AJOUTER |
| `classroom_assignment` | `classroom_id` | B-tree | → AJOUTER |
| `classroom_assignment` | `status` | B-tree | → AJOUTER |
| `assessment` | `classroom_id` | B-tree | Déjà présent |
| `assessment` | `academic_period_id` | B-tree | Déjà présent |
| `assessment` | `config_subject_id` | B-tree | → AJOUTER |
| `grade` | `assessment_id` | B-tree | Déjà présent (via UNIQUE) |
| `grade` | `enrollment_id` | B-tree | → AJOUTER |
| `grade` | `(assessment_id, enrollment_id)` | UNIQUE | → AJOUTER |
| `report_card` | `enrollment_id` | B-tree | → AJOUTER |
| `report_card` | `academic_period_id` | B-tree | → AJOUTER |
| `report_card` | `(enrollment_id, academic_period_id)` | UNIQUE | → AJOUTER |
| `audit_log` | `(entity, entity_id)` | B-tree | → AJOUTER |
| `audit_log` | `(user_id, created_at)` | B-tree | → AJOUTER |
| `audit_log` | `created_at` | B-tree | → AJOUTER |
| `school_membership` | `(school_id, user_id)` | UNIQUE | → AJOUTER |
| `annual_result` | `enrollment_id` | UNIQUE | → AJOUTER |
| `assessment_type` | `(school_id, name)` | UNIQUE | → AJOUTER |
| `level` | `(school_id, code)` | UNIQUE PARTIEL | → AJOUTER (si code nullable) |
| `teacher_assignment` | `school_membership_id` | B-tree | → AJOUTER |

---

## 8. STRATÉGIE `updated_at`

Le `DEFAULT now()` ne met pas à jour `updated_at` lors d'un `UPDATE`.

**Solution cible** :

Fonction PostgreSQL générique `set_updated_at()` + triggers sur toutes les tables concernées.

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Pour chaque table avec updated_at :
CREATE TRIGGER trg_<table>_updated_at
  BEFORE UPDATE ON <table>
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
```

Alternative acceptée : solution Drizzle centralisée si elle garantit réellement tous les chemins d'écriture. En aucun cas plusieurs stratégies incohérentes.

---

## 9. DIAGRAMME DE RELATIONS CIBLE

```
school
├── academic_year
│   ├── academic_period
│   │   ├── assessment
│   │   │   ├── grade ──→ enrollment
│   │   │   └── (classroom, config_subject, config_component)
│   │   └── report_card
│   │       ├── report_card_item
│   │       │   └── report_card_component_item
│   │       └── (pedagogical_config)
│   ├── classroom
│   │   ├── classroom_assignment ──→ enrollment
│   │   └── teacher_assignment ──→ school_membership
│   ├── enrollment
│   │   ├── classroom_assignment
│   │   ├── grade
│   │   ├── report_card
│   │   └── annual_result
│   └── pedagogical_config
│       ├── config_subject
│       │   ├── config_component
│       │   ├── assessment
│       │   ├── teacher_assignment
│       │   └── report_card_item
│       └── report_card
├── level
│   ├── classroom
│   └── pedagogical_config
├── subject (catalogue)
│   ├── subject_component (catalogue)
│   ├── config_subject
│   │   └── config_component
│   └── assessment_type
├── student
│   └── enrollment
├── user
│   ├── school_membership
│   │   └── teacher_assignment
│   ├── account (Better Auth)
│   └── session (Better Auth)
└── audit_log
```

---

## 10. RISQUES IDENTIFIÉS

| # | Risque | Sévérité | Atténuation |
|---|-------|-----------|------------|
| R1 | Migration `grade.student_id` → `enrollment_id` : ambiguïté si un étudiant a plusieurs enrollments dans la même année | **CRITIQUE** | Vérifier unicité enrollment/student/year ; rapport d'ambiguïté si multiples |
| R2 | Migration `assessment.subject_id` → `config_subject_id` : plusieurs configs candidates pour un contexte | **CRITIQUE** | Ne pas deviner ; produire rapport d'ambiguïté ; arrêter avant CONTRACT |
| R3 | Changement d'enum `app_role` → `platform_role` : rupture de compatibilité avec Better Auth si le plugin admin est activé | **MOYEN** | Vérifier version Better Auth ; le rôle est géré hors Better Auth |
| R4 | Retrait CASCADE sur `student` : code existant qui supprime un étudiant et s'attend à la cascade | **MOYEN** | Audit du code ; remplacer par archivage (status/archived_at) |
| R5 | `school_id` dénormalisé sur classroom, enrollment : risque d'incohérence | **FAIBLE** | Garanti par invariant transactionnel + tests |
| R6 | Snapshot dans report_card_item : surcharge de données si bulletins nombreux | **FAIBLE** | Coût acceptable pour l'immuabilité historique |

---

## 11. CHECK CONSTRAINTS RÉCAPITULATIF

| Table | CHECK | Phase |
|-------|-------|-------|
| `academic_year` | `start_date < end_date` | EXPAND |
| `academic_period` | `sort_order > 0` | EXPAND |
| `academic_period` | `start_date < end_date` | EXPAND |
| `level` | `sort_order >= 0` | EXPAND |
| `classroom_assignment` | `end_date IS NULL OR start_date <= end_date` | EXPAND |
| `subject` | `sort_order >= 0` | EXPAND |
| `assessment` | `scale > 0` | EXPAND |
| `assessment` | `coefficient >= 0` | EXPAND |
| `grade` | `raw_value IS NULL OR raw_value >= 0` | EXPAND |
| `pedagogical_config` | `version > 0` | EXPAND |
| `pedagogical_config` | `subject_decimal_places BETWEEN 0 AND 6` | EXPAND |
| `pedagogical_config` | `general_decimal_places BETWEEN 0 AND 6` | EXPAND |
| `pedagogical_config` | `conduct_coefficient IS NULL OR conduct_coefficient >= 0` | EXPAND |
| `pedagogical_config` | `conduct_scale IS NULL OR conduct_scale > 0` | EXPAND |
| `config_subject` | `coefficient >= 0` | EXPAND |
| `config_subject` | `scale > 0` | EXPAND |
| `config_subject` | `sort_order >= 0` | EXPAND |
| `config_component` | `coefficient >= 0` | EXPAND |
| `config_component` | `scale > 0` | EXPAND |
| `config_component` | `sort_order >= 0` | EXPAND |
| `assessment_type` | `default_coefficient IS NULL OR default_coefficient >= 0` | EXPAND |
| `assessment_type` | `default_scale IS NULL OR default_scale > 0` | EXPAND |

---

## 12. COMPATIBILITÉ NUMERIC / CALCULS

Tous les champs numériques critiques utilisent `NUMERIC` (pas `FLOAT` / `DOUBLE`) :

- Notes : `raw_value NUMERIC(8,4)`
- Coefficients : `NUMERIC(6,2)`
- Moyennes : `NUMERIC(8,4)`
- Points pondérés : `NUMERIC(10,4)`
- Conduite : `NUMERIC(4,2)`

Le moteur de calcul doit :
1. Normaliser les barèmes
2. Appliquer les coefficients
3. Appliquer la politique d'agrégation
4. Appliquer la stratégie d'arrondi
5. Gérer la précision intermédiaire
6. Gérer la précision d'affichage

Les calculs critiques ne doivent pas utiliser une accumulation naïve de `float` JavaScript.

---

*Fin du document R-V2-01 — TARGET DATA MODEL*