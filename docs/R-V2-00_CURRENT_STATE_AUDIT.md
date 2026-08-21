# R-V2-00 — CURRENT STATE AUDIT

**Projet**: Daniélou Abidjan — Plateforme de gestion scolaire  
**Date**: 2026-08-21  
**Commit de référence**: `209b077`  
**Auditeur**: Z (automated)  
**Statut**: AUDIT COMPLET — en attente d'autorisation pour migration

---

## 1. VERSIONS INSTALLÉES

| Composant | Version | Source |
|-----------|---------|--------|
| Next.js | 16.3.1 | package.json |
| React | 19.2.8 | package.json |
| TypeScript | 5.9.3 | pnpm-lock.yaml |
| Drizzle ORM | 0.45.2 | package.json |
| Drizzle Kit | 0.31.10 | package.json |
| Better Auth | **1.7.1** | pnpm-lock.yaml (résolu) |
| @neondatabase/serverless | 1.1.0+ | package.json |
| jose | 6.2.9 | package.json |
| Zod | 4.4.3 | package.json |
| pnpm | 11.22.0 | packageManager |
| Node | >=20 (engines) | .nvmrc absent |

### Better Auth — Configuration réelle

- **Aucun plugin** actif (pas de username, admin, etc.)
- Adapter : `drizzleAdapter(getDb(), { provider: 'pg' })`
- Seul `emailAndPassword` activé (`minPasswordLength: 6`)
- Pas de `BETTER_AUTH_URL` passé au config
- Session : 7j expiry, 1j update age
- Better Auth est **ignorant** du champ `role` sur `user` — il ne le gère pas

### SQLite

- **Aucune dépendance SQLite** dans package.json
- Script `check:sqlite` présent dans CI (ADR-003)
- `better-sqlite3` apparaît dans pnpm-lock.yaml comme **dépendance optionnelle** de `better-auth` (non installé)
- Aucune import SQLite dans le code source
- ✅ Conforme ADR-003

---

## 2. TABLES PRÉSENTES (22)

| # | Table Drizzle | Table Neon | Lignes | Match |
|---|--------------|------------|--------|-------|
| 1 | school | school | 1 | ✅ |
| 2 | academicYear | academic_year | 1 | ✅ |
| 3 | academicPeriod | academic_period | 3 | ✅ |
| 4 | level | level | 13 | ✅ |
| 5 | classroom | classroom | 0 | ✅ |
| 6 | student | student | 0 | ✅ |
| 7 | enrollment | enrollment | 0 | ✅ |
| 8 | subject | subject | 12 | ✅ |
| 9 | subjectComponent | subject_component | 0 | ✅ |
| 10 | assessmentType | assessment_type | 4 | ✅ |
| 11 | assessment | assessment | 0 | ✅ |
| 12 | grade | grade | 0 | ✅ |
| 13 | reportCard | report_card | 0 | ✅ |
| 14 | reportCardItem | report_card_item | 0 | ✅ |
| 15 | pedagogicalConfig | pedagogical_config | 0 | ✅ |
| 16 | configSubject | config_subject | 0 | ✅ |
| 17 | configComponent | config_component | 0 | ✅ |
| 18 | user | user | 1 | ✅ |
| 19 | account | account | 0 | ✅ |
| 20 | session | session | 0 | ✅ |
| 21 | teacherAssignment | teacher_assignment | 0 | ✅ |
| 22 | auditLog | audit_log | 0 | ✅ |

**Différence Drizzle ↔ Neon** : Aucune différence structurelle. Les 22 tables sont présentes dans les deux, avec les mêmes colonnes.

---

## 3. COLONNES RÉELLES

### 3.1 school
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| name | text | NOT NULL | — | |
| address | text | NULL | — | |
| city | text | NULL | 'Abidjan' | |
| country | text | NULL | 'Côte d'Ivoire' | |
| logo_url | text | NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | ⚠️ DEFAULT ne se met pas à jour au UPDATE |

**Manquant vs cible V2** : `code`, `is_active`, `timezone`, `locale`

### 3.2 academic_year
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| school_id | uuid | NOT NULL | — | FK → school |
| name | text | NOT NULL | — | |
| start_date | date | NOT NULL | — | |
| end_date | date | NOT NULL | — | |
| status | academic_year_status | NOT NULL | 'preparation' | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : CHECK(start_date < end_date)

### 3.3 academic_period
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| academic_year_id | uuid | NOT NULL | — | FK → academic_year CASCADE |
| name | text | NOT NULL | — | |
| sort_order | integer | NOT NULL | 1 | |
| start_date | date | NOT NULL | — | |
| end_date | date | NOT NULL | — | |
| status | period_status | NOT NULL | 'draft' | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : CHECK(start_date < end_date), CHECK(sort_order > 0)

### 3.4 level
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| school_id | uuid | NOT NULL | — | FK → school |
| name | text | NOT NULL | — | |
| sort_order | integer | NOT NULL | 0 | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : `code`, `is_active`, UNIQUE(school_id, code), CHECK(sort_order >= 0)

### 3.5 classroom
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| level_id | uuid | NOT NULL | — | FK → level CASCADE |
| academic_year_id | uuid | NOT NULL | — | FK → academic_year |
| name | text | NOT NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : `school_id`, `is_active`, CHECK(cross-school invariant)

### 3.6 student
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| school_id | uuid | NOT NULL | — | FK → school |
| matricule | text | NULL | — | ⚠️ Pas de UNIQUE, pas de NOT NULL |
| first_name | text | NOT NULL | — | |
| last_name | text | NOT NULL | — | |
| date_of_birth | date | NULL | — | |
| gender | text | NULL | — | ⚠️ Texte libre, pas d'enum |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : `status`, `archived_at`, UNIQUE(school_id, matricule) WHERE matricule NOT NULL, gender enum

### 3.7 enrollment
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| student_id | uuid | NOT NULL | — | FK → student CASCADE ⚠️ |
| classroom_id | uuid | NOT NULL | — | FK → classroom ⚠️ À migrer |
| academic_year_id | uuid | NOT NULL | — | FK → academic_year |
| status | enrollment_status | NOT NULL | 'active' | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : `school_id`, `enrolled_at`, `exited_at`.  La colonne `classroom_id` doit être migrée vers `classroom_assignment`.

### 3.8 subject
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| school_id | uuid | NOT NULL | — | FK → school |
| code | text | NOT NULL | — | |
| name | text | NOT NULL | — | |
| sort_order | integer | NOT NULL | 0 | |
| coefficient | numeric | NOT NULL | '1' | ⚠️ Sera déplacé vers config_subject |
| default_scale | integer | NOT NULL | 20 | ⚠️ Sera déplacé vers config_subject |
| is_active | boolean | NOT NULL | true | |
| is_optional | boolean | NOT NULL | false | ⚠️ Sera déplacé vers config_subject |
| include_in_average | boolean | NOT NULL | true | ⚠️ Sera déplacé vers config_subject |
| include_in_ranking | boolean | NOT NULL | true | ⚠️ Sera déplacé vers config_subject |
| include_in_decision | boolean | NOT NULL | true | ⚠️ Sera déplacé vers config_subject |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : aucune colonne manquante, mais les colonnes pédagogiques (coefficient, default_scale, etc.) doivent migrer vers config_subject

### 3.9 subject_component
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| subject_id | uuid | NOT NULL | — | FK → subject CASCADE |
| name | text | NOT NULL | — | |
| sort_order | integer | NOT NULL | 0 | |
| coefficient | numeric | NOT NULL | '1' | ⚠️ Sera déplacé vers config_component |
| scale | integer | NOT NULL | 20 | ⚠️ Sera déplacé vers config_component |
| is_required | boolean | NOT NULL | true | ⚠️ Sera déplacé vers config_component |
| is_active | boolean | NOT NULL | true | ⚠️ Sera déplacé vers config_component |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : `code`, UNIQUE sur code

### 3.10 assessment_type
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| school_id | uuid | NOT NULL | — | FK → school |
| name | text | NOT NULL | — | |
| description | text | NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : `default_coefficient`, `default_scale`, `is_active`, UNIQUE(school_id, name)

### 3.11 assessment
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| classroom_id | uuid | NOT NULL | — | FK → classroom CASCADE ⚠️ |
| subject_id | uuid | NOT NULL | — | FK → subject ⚠️ À migrer |
| academic_period_id | uuid | NOT NULL | — | FK → academic_period |
| assessment_type_id | uuid | NULL | — | FK → assessment_type |
| title | text | NOT NULL | — | |
| scale | integer | NOT NULL | 20 | |
| coefficient | numeric | NOT NULL | '1' | |
| assessment_date | date | NOT NULL | — | |
| description | text | NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : `config_subject_id`, `config_component_id`, `status`, `created_by`. `subject_id` à migrer.

### 3.12 grade
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| assessment_id | uuid | NOT NULL | — | FK → assessment CASCADE ⚠️ |
| student_id | uuid | NOT NULL | — | FK → student CASCADE ⚠️ À migrer |
| raw_value | numeric | NULL | — | |
| original_scale | integer | NULL | — | ⚠️ Redondant avec assessment.scale |
| status | grade_status | NOT NULL | 'pending' | |
| comment | text | NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : `enrollment_id`, `created_by`, `updated_by`. `student_id` et `original_scale` à migrer/supprimer.

### 3.13 report_card
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| student_id | uuid | NOT NULL | — | FK → student ⚠️ Redondant |
| enrollment_id | uuid | NOT NULL | — | FK → enrollment |
| academic_period_id | uuid | NOT NULL | — | FK → academic_period |
| status | report_card_status | NOT NULL | 'draft' | |
| general_average | numeric | NULL | — | |
| class_average | numeric | NULL | — | |
| rank | integer | NULL | — | |
| total_students_ranked | integer | NULL | — | |
| conduct_grade | numeric | NULL | — | |
| conduct_comment | text | NULL | — | |
| teacher_comment | text | NULL | — | |
| director_comment | text | NULL | — | |
| promotion_decision | promotion_decision | NULL | — | ⚠️ À migrer vers annual_result |
| published_at | timestamptz | NULL | — | |
| published_by | uuid | NULL | — | ⚠️ Pas de FK |
| config_version_id | uuid | NULL | — | ⚠️ Pas de FK vers pedagogical_config |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : `pedagogical_config_id`, `validated_at`, `validated_by`. `student_id` redondant. `promotion_decision` à déplacer.

### 3.14 report_card_item
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| report_card_id | uuid | NOT NULL | — | FK → report_card CASCADE |
| subject_id | uuid | NOT NULL | — | FK → subject |
| average | numeric | NULL | — | |
| coefficient | numeric | NULL | — | |
| weighted_points | numeric | NULL | — | |
| class_average | numeric | NULL | — | |
| min_average | numeric | NULL | — | |
| max_average | numeric | NULL | — | |
| teacher_appreciation | text | NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : `config_subject_id` (au lieu de `subject_id`), `subject_code`, `subject_name` (snapshot), `scale`, `sort_order`

### 3.15 pedagogical_config
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| school_id | uuid | NOT NULL | — | |
| level_id | uuid | NOT NULL | — | |
| academic_year_id | uuid | NOT NULL | — | |
| version | integer | NOT NULL | 1 | |
| status | config_status | NOT NULL | 'draft' | |
| calculation_policy | calculation_policy | NOT NULL | 'simple_average' | |
| rounding_strategy | rounding_strategy | NOT NULL | 'half_up' | |
| subject_decimal_places | integer | NOT NULL | 2 | |
| general_decimal_places | integer | NOT NULL | 2 | |
| ranking_enabled | boolean | NOT NULL | true | |
| conduct_enabled | boolean | NOT NULL | false | |
| conduct_included_in_average | boolean | NOT NULL | false | |
| conduct_coefficient | numeric | NULL | '0' | |
| conduct_scale | integer | NULL | 20 | |
| description | text | NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : CHECK(version > 0), CHECK(subject_decimal_places BETWEEN 0 AND 6), CHECK(general_decimal_places BETWEEN 0 AND 6), CHECK(conduct_coefficient >= 0), CHECK(conduct_scale > 0)

### 3.16 config_subject
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| config_id | uuid | NOT NULL | — | FK → pedagogical_config CASCADE |
| subject_id | uuid | NOT NULL | — | FK → subject |
| coefficient | numeric | NOT NULL | — | |
| scale | integer | NOT NULL | 20 | |
| is_active | boolean | NOT NULL | true | |
| include_in_average | boolean | NOT NULL | true | |
| include_in_ranking | boolean | NOT NULL | true | |
| include_in_decision | boolean | NOT NULL | true | |
| sort_order | integer | NOT NULL | 0 | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : `is_optional`, `assessment_aggregation_policy`, `component_aggregation_policy`, CHECK(coefficient >= 0), CHECK(scale > 0)

### 3.17 config_component
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| config_subject_id | uuid | NOT NULL | — | FK → config_subject CASCADE |
| subject_component_id | uuid | NULL | — | FK → subject_component |
| name | text | NOT NULL | — | |
| sort_order | integer | NOT NULL | 0 | |
| coefficient | numeric | NOT NULL | '1' | |
| scale | integer | NOT NULL | 20 | |
| is_required | boolean | NOT NULL | true | |
| is_active | boolean | NOT NULL | true | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : `assessment_aggregation_policy`

### 3.18 user
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| email | text | NOT NULL | — | UNIQUE |
| name | text | NOT NULL | — | |
| role | app_role | NOT NULL | 'reader' | ⚠️ Pas de username, pas de password |
| is_active | boolean | NOT NULL | true | |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : `username` (colonne ou plugin Better Auth), `platform_role` (séparé de school_role)

### 3.19 account (Better Auth)
| Colonne | Type | Nullable | Default |
|---------|------|----------|--------|
| id | uuid | NOT NULL | gen_random_uuid() |
| user_id | uuid | NOT NULL | — |
| account_id | text | NOT NULL | — |
| provider_id | text | NOT NULL | — |
| access_token | text | NULL | — |
| refresh_token | text | NULL | — |
| expires_at | timestamptz | NULL | — |
| created_at | timestamptz | NOT NULL | now() |
| updated_at | timestamptz | NOT NULL | now() |

### 3.20 session (Better Auth)
| Colonne | Type | Nullable | Default |
|---------|------|----------|--------|
| id | uuid | NOT NULL | gen_random_uuid() |
| user_id | uuid | NOT NULL | — |
| token | text | NOT NULL | — |
| expires_at | timestamptz | NOT NULL | — |
| ip_address | text | NULL | — |
| user_agent | text | NULL | — |
| created_at | timestamptz | NOT NULL | now() |
| updated_at | timestamptz | NOT NULL | now() |

### 3.21 teacher_assignment
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| user_id | uuid | NOT NULL | — | FK → user CASCADE ⚠️ |
| classroom_id | uuid | NOT NULL | — | FK → classroom |
| subject_id | uuid | NOT NULL | — | FK → subject ⚠️ |
| academic_year_id | uuid | NOT NULL | — | FK → academic_year ⚠️ |
| created_at | timestamptz | NOT NULL | now() | |
| updated_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : `school_membership_id`, `config_subject_id`, `assignment_type`, `start_date`, `end_date`, `status`. Colonnes `user_id`, `subject_id`, `academic_year_id` à migrer.

### 3.22 audit_log
| Colonne | Type | Nullable | Default | Note |
|---------|------|----------|---------|------|
| id | uuid | NOT NULL | gen_random_uuid() | PK |
| user_id | uuid | NULL | — | ⚠️ Pas de FK |
| action | text | NOT NULL | — | |
| entity | text | NOT NULL | — | |
| entity_id | uuid | NOT NULL | — | |
| old_value | text | NULL | — | ⚠️ Sera JSONB |
| new_value | text | NULL | — | ⚠️ Sera JSONB |
| context | text | NULL | — | ⚠️ Sera JSONB |
| ip_address | text | NULL | — | |
| created_at | timestamptz | NOT NULL | now() | |

**Manquant vs cible V2** : `school_id`, `actor_type`, `actor_identifier`, `user_agent`, `request_id`

---

## 4. CLÉS ÉTRANGÈRES

### CASCADE destructeurs (⚠️ à revoir)

| FK | De → Vers | ON DELETE | Risque |
|----|-----------|-----------|-------|
| enrollment → student | CASCADE | ⚠️ Supprimer un étève supprime ses inscriptions |
| grade → student | CASCADE | ⚠️ Supprimer un élève supprime ses notes |
| grade → assessment | CASCADE | ⚠️ Supprimer une évaluation supprime ses notes |
| assessment → classroom | CASCADE | ⚠️ Supprimer une classe supprime ses évaluations |
| academic_period → academic_year | CASCADE | ⚠️ Supprimer une année supprime ses périodes |
| subject_component → subject | CASCADE | Modéré, données de catalogue |
| account → user | CASCADE | Modéré, compte Better Auth |
| session → user | CASCADE | Modéré, sessions Better Auth |
| classroom → level | CASCADE | ⚠️ Supprimer un niveau supprime ses classes |
| report_card_item → report_card | CASCADE | Modéré, draft uniquement |
| config_subject → pedagogical_config | CASCADE | Modéré |
| config_component → config_subject | CASCADE | Modéré |
| teacher_assignment → user | CASCADE | ⚠️ Supprimer un user supprime ses affectations |

### NO ACTION / RESTRICT

| FK | De → Vers | ON DELETE |
|----|-----------|-----------|
| academic_year → school | NO ACTION |
| level → school | NO ACTION |
| assessment → academic_period | NO ACTION |
| assessment → assessment_type | NO ACTION |
| classroom → academic_year | NO ACTION |
| enrollment → academic_year | NO ACTION |
| enrollment → classroom | NO ACTION |
| report_card → enrollment | NO ACTION |
| report_card → student | NO ACTION |
| report_card → academic_period | NO ACTION |
| report_card_item → subject | NO ACTION |
| assessment_type → school | NO ACTION |
| pedagogical_config → school/level/year | NO ACTION |
| subject → school | NO ACTION |
| student → school | NO ACTION |
| teacher_assignment → classroom/subject/year | NO ACTION |
| config_subject → subject | NO ACTION |
| config_component → subject_component | NO ACTION |

---

## 5. CONTRAINTES UNIQUE

### Dans le code Drizzle (via `uniqueIndex`)

| Table | Colonnes | Type Drizzle |
|-------|---------|--------------|
| academic_year | (school_id, name) | uniqueIndex |
| academic_period | (academic_year_id, name) | uniqueIndex |
| level | (school_id, name) | uniqueIndex |
| classroom | (level_id, academic_year_id, name) | uniqueIndex |
| subject | (school_id, code) | uniqueIndex |
| subject_component | (subject_id, name) | uniqueIndex |
| enrollment | (student_id, academic_year_id) | uniqueIndex |
| grade | (assessment_id, student_id) | uniqueIndex |
| report_card | (student_id, academic_period_id) | uniqueIndex |
| report_card_item | (report_card_id, subject_id) | uniqueIndex |
| pedagogical_config | (level_id, academic_year_id, version) | uniqueIndex |
| config_subject | (config_id, subject_id) | uniqueIndex |
| teacher_assignment | (user_id, classroom_id, subject_id, academic_year_id) | uniqueIndex |
| user | (email) | unique |
| session | (token) | unique |

### Dans la base Neon (contraintes SQL)

Seules **2 contraintes UNIQUE** formelles existent :
- `session.session_token_unique` sur `(token)`
- `user.user_email_unique` sur `(email)`

Les autres sont implémentées comme **index uniques** (fonctionnellement équivalent, mais `information_schema.table_constraints` ne les liste pas comme des contraintes UNIQUE).

**Manquantes vs cible V2** :
- `assessment_type` : UNIQUE(school_id, name)
- `student` : UNIQUE(school_id, matricule) WHERE matricule NOT NULL

---

## 6. CONTRAINTES CHECK

**Aucune contrainte CHECK métier** dans la base.

Tous les CHECK présents sont des NOT NULL générés automatiquement par PostgreSQL.

**Manquantes vs cible V2** :
- `academic_year` : CHECK(start_date < end_date)
- `academic_period` : CHECK(start_date < end_date), CHECK(sort_order > 0)
- `level` : CHECK(sort_order >= 0)
- `pedagogical_config` : CHECK(version > 0), CHECK(subject_decimal_places 0..6), CHECK(general_decimal_places 0..6), CHECK(conduct_coefficient >= 0), CHECK(conduct_scale > 0)
- `config_subject` : CHECK(coefficient >= 0), CHECK(scale > 0)
- `config_component` : CHECK(coefficient >= 0), CHECK(scale > 0)
- `assessment` : CHECK(scale > 0), CHECK(coefficient >= 0)
- `grade` : CHECK(raw_value IS NULL OR raw_value >= 0)
- `student` : CHECK(gender IN ('M', 'F')) — à créer avec enum

---

## 7. INDEX

26 index non-PK dans la base :

| Index | Table | Colonnes | Type |
|-------|-------|---------|------|
| ap_status_idx | academic_period | status | btree |
| ap_year_idx | academic_period | academic_year_id | btree |
| up_year_name | academic_period | (academic_year_id, name) | unique btree |
| ay_status_idx | academic_year | status | btree |
| uy_school_name | academic_year | (school_id, name) | unique btree |
| as_classroom_idx | assessment | classroom_id | btree |
| as_period_idx | assessment | academic_period_id | btree |
| as_subject_idx | assessment | subject_id | btree |
| cl_year_idx | classroom | academic_year_id | btree |
| uc_level_year_name | classroom | (level_id, academic_year_id, name) | unique btree |
| ucs_config_subject | config_subject | (config_id, subject_id) | unique btree |
| en_classroom_idx | enrollment | classroom_id | btree |
| ue_student_year | enrollment | (student_id, academic_year_id) | unique btree |
| gr_student_idx | grade | student_id | btree |
| ug_assessment_student | grade | (assessment_id, student_id) | unique btree |
| ul_school_name | level | (school_id, name) | unique btree |
| upc_level_year_version | pedagogical_config | (level_id, academic_year_id, version) | unique btree |
| rc_enrollment_idx | report_card | enrollment_id | btree |
| rc_status_idx | report_card | status | btree |
| ur_student_period | report_card | (student_id, academic_period_id) | unique btree |
| uri_rc_subject | report_card_item | (report_card_id, subject_id) | unique btree |
| session_token_unique | session | token | unique btree |
| st_name_idx | student | (last_name, first_name) | btree |
| st_school_idx | student | school_id | btree |
| us_school_code | subject | (school_id, code) | unique btree |
| sc_subject_idx | subject_component | subject_id | btree |
| uc_subject_name | subject_component | (subject_id, name) | unique btree |
| uta_user_class_subject_year | teacher_assignment | (user_id, classroom_id, subject_id, academic_year_id) | unique btree |
| user_email_unique | user | email | unique btree |

**Manquants vs cible V2** :
- `student.matricule` (si UNIQUE ajouté)
- `classroom_assignment.enrollment_id`
- `classroom_assignment.classroom_id`
- `assessment.config_subject_id` (nouveau)
- `audit_log(entity, entity_id)`
- `audit_log(user_id, created_at)`
- `audit_log(created_at)`

---

## 8. ENUMS

| Enum | Valeurs |
|------|---------|
| academic_year_status | preparation, active, closed |
| period_status | draft, open, closed |
| enrollment_status | active, transferred, withdrawn |
| grade_status | graded, absent_excused, absent_unexcused, exempt, not_evaluated, pending |
| report_card_status | draft, ready, validated, published |
| config_status | draft, active, archived |
| calculation_policy | simple_average, weighted_average, single_grade |
| rounding_strategy | half_up, half_even, truncate |
| promotion_decision | proposed_admitted, proposed_repeat, decision_required, final_admitted, final_repeat |
| app_role | admin, direction, teacher, reader |

**Manquants vs cible V2** :
- `platform_role` : ghost, super_admin, none (NOUVEAU)
- `school_role` : admin, direction, teacher, reader (NOUVEAU — remplace app_role)
- `classroom_assignment_status` : actif, inactif, etc. (NOUVEAU)
- `teacher_assignment_type` : homeroom, subject (NOUVEAU)
- `audit_actor_type` : user, ghost, system (NOUVEAU)

---

## 9. CASCADES

Voir section 4. Résumé des risques :

| Niveau de risque | FK |
|-----------------|-----|
| 🔴 CRITIQUE | student → (enrollment, grade) CASCADE — un élève supprimé perd tout son historique scolaire |
| 🔴 CRITIQUE | assessment → classroom CASCADE — une classe supprimée perd ses évaluations et notes |
| 🟠 ÉLEVÉ | classroom → level CASCADE — un niveau supprimé perd ses classes |
| 🟠 ÉLEVÉ | teacher_assignment → user CASCADE — un utilisateur supprimé perd ses affectations |
| 🟡 MODÉRÉ | grade → assessment CASCADE — logique métier acceptable mais à protéger si bulletins publiés existent |

---

## 10. DIFFÉRENCES CODE DRIZZLE ↔ BASE NEON

| Aspect | Drizzle | Neon | Écart |
|--------|---------|------|
| Nombre de tables | 22 | 22 | ✅ Aucun |
| Colonnes par table | Identiques | Identiques | ✅ Aucun |
| Types de colonnes | Identiques | Identiques | ✅ Aucun |
| FK | Identiques | Identiques | ✅ Aucun |
| UNIQUE (constraints) | 15 | 2 formelles + 13 index | ⚠️ Implémentation différente mais fonctionnellement équivalente |
| CHECK métier | 0 | 0 | ✅ Aucun écart (les deux sont vides) |
| Index non-PK | 26 | 26 | ✅ Aucun |
| Enums | 10 | 10 | ✅ Aucun |

**Conclusion** : Le schéma Drizzle et la base Neon sont **synchronisés**. L'écart est dans ce qui est **absent des deux** (contraintes CHECK métier, colonnes manquantes vs cible V2).

---

## 11. DETTE TECHNIQUE DÉTECTÉE

### 🔴 Critique

| # | Dette | Impact | Localisation |
|---|-------|--------|-------------|
| D-01 | **Fantomas dépend de BETTER_AUTH_SECRET** pour signer le JWT. Si ce secret change, les sessions Fantomas existantes sont invalidées. | Sécurité | `fantomas.ts` |
| D-02 | **Fantomas credentials hardcoded** dans le code source. | Sécurité | `fantomas.ts:16-19` |
| D-03 | **Admin seed sans password** — `admin@danielou.ci` ne peut pas se connecter via Better Auth. | Fonctionnel | `seed.ts:123-128` |
| D-04 | **Middleware ne valide pas les sessions Better Auth en DB** — un cookie expiré passe le middleware. | Sécurité | `middleware.ts:55-59` |
| D-05 | **Aucun RBAC** — `requireSession()` vérifie seulement l'authentification, pas l'autorisation. | Sécurité | Tous les API routes |
| D-06 | **Grade CASCADE depuis student** — suppression d'un élève = perte de tout l'historique. | Données | Schéma |
| D-07 | **Assessment CASCADE depuis classroom** — suppression d'une classe = perte des évaluations/notes. | Données | Schéma |
| D-08 | **updated_at DEFAULT now()** ne se met pas à jour automatiquement au UPDATE PostgreSQL. | Intégrité | Toutes les tables |

### 🟠 Élevé

| # | Dette | Impact | Localisation |
|---|-------|--------|-------------|
| D-09 | **Zéro test** — aucun fichier de test. | Qualité | `src/tests/` |
| D-10 | **getEnv() jamais appelé** — validation d'environnement inexistante à runtime. | Robustesse | `env.ts` |
| D-11 | **decimal.ts jamais importé** — 116 lignes de calcul de notes mortes. | Code mort | `lib/decimal.ts` |
| D-12 | **logger.ts jamais importé** — logger structuré non utilisé. | Code mort | `lib/logger.ts` |
| D-13 | **design-tokens.ts jamais importé** — tokens non utilisés. | Code mort | `lib/design-tokens.ts` |
| D-14 | **loginAction sans 'use server'** — directive manquante. | Stabilité | `login/actions.ts` |
| D-15 | **Race condition matricule** — MAX + 1 sans isolation transactionnelle. | Données | `api/eleves/route.ts` |
| D-16 | **Année active non transactionnelle** — toggle sans transaction. | Données | `api/annees-scolaires/[id]/route.ts` |
| D-17 | **Vitest coverage sur `src/modules/`** qui n'existe pas. | CI | `vitest.config.ts` |
| D-18 | **User.role = app_role** mélange rôle plateforme et rôle scolaire. | Architecture | `schema/index.ts` |
| D-19 | **student.gender = text libre** au lieu d'un enum. | Données | `schema/index.ts` |
| D-20 | **report_card.student_id redondant** — dérivable via enrollment. | Normalisation | Schéma |
| D-21 | **Dépendances inutilisées** : `next-themes`, `react-hook-form`, `@hookform/resolvers`, `bcryptjs`, `@types/bcryptjs`. | Maintenance | `package.json` |

### 🟡 Modéré

| # | Dette | Impact | Localisation |
|---|-------|--------|-------------|
| D-22 | **audit_log.user_id sans FK** vers user. | Intégrité | Schéma |
| D-23 | **audit_log.old_value/new_value = text** au lieu de JSONB. | Performance | Schéma |
| D-24 | **report_card.published_by sans FK** vers user. | Intégrité | Schéma |
| D-25 | **Cookie deletion dupliquée** dans logout. | Bug mineur | `api/auth/logout/route.ts` |
| D-26 | **Topbar hardcode "2026-2027"**. | UX | `topbar.tsx` |
| D-27 | **Sidebar hardcode "AD" / "Administrateur"**. | UX | `sidebar.tsx` |
| D-28 | **assessment_type sans UNIQUE(school_id, name)**. | Données | Schéma |
| D-29 | **student.matricule nullable, pas de UNIQUE**. | Données | Schéma |
| D-30 | **Seed avec @ts-nocheck**. | Qualité | `seed.ts` |

---

## 12. RISQUES DE MIGRATION

### 🔴 Risques critiques

| # | Risque | Tables affectées | Stratégie d'atténuation |
|---|-------|-----------------|------------------------|
| R-01 | **enrollment.classroom_id → classroom_assignment** : Migration nécessite de créer une nouvelle table, peupler depuis enrollment, basculer le code, puis supprimer la colonne. | enrollment, classroom, classroom_assignment (nouvelle) | EXPAND/CONTRACT strict |
| R-02 | **grade.student_id → enrollment_id** : Résolution bidirectionnelle (student + assessment → enrollment). Risque d'ambiguïté si un étève a plusieurs enrollments. | grade, enrollment, assessment, classroom | Rapport d'ambiguïté obligatoire |
| R-03 | **assessment.subject_id → config_subject_id** : Nécessite une pedagogical_config active pour chaque classroom/year. Si aucune config n'existe, migration bloquée. | assessment, pedagogical_config, classroom, level, academic_year | Vérifier existence configs avant migration |
| R-04 | **Suppression CASCADE sur student** : Avant de changer les cascades, s'assurer qu'aucune donnée historique n'existe (actuellement 0 lignes). | student, enrollment, grade | OK — 0 lignes |

### 🟠 Risques élevés

| # | Risque | Tables affectées | Stratégie |
|---|-------|-----------------|--------|
| R-05 | ** Fantomas Ghost Auth refactor** : Passage de BETTER_AUTH_SECRET à GHOST_SESSION_SECRET dédié. Rupture de compatibilité avec les sessions existantes. | N/A (pas de DB) | Déployer pendant une période calme |
| R-06 | ** user.role → platform_role + school_membership** : L'enum app_role actuel (admin, direction, teacher, reader) doit être séparé. | user, school_membership (nouvelle), teacher_assignment | Créer school_membership, migrer, puis contract |
| R-07 | ** report_card.promotion_decision → annual_result** : Déplacer la décision annuelle hors du bulletin périodique. | report_card, annual_result (nouvelle) | EXPAND/CONTRACT |
| R-08 | ** updated_at trigger** : Ajouter un trigger PostgreSQL pour la mise à jour automatique. | Toutes les tables avec updated_at | Trigger générique |

### 🟡 Risques modérés

| # | Risque | Stratégie |
|---|-------|--------|
| R-09 | subject.coefficient/default_scale etc. → config_subject | Ne pas supprimer avant migration vérifiée |
| R-10 | subject_component.coefficient/scale etc. → config_component | Ne pas supprimer avant migration vérifiée |
| R-11 | teacher_assignment.user_id/subject_id/year_id → school_membership_id/config_subject_id | Migration avec données de résolution |
| R-12 | report_card_item.subject_id → config_subject_id + snapshot | Ajouter colonnes snapshot avant de supprimer |

---

## 13. ÉTAT DES DONNÉES

| Table | Lignes | Données sensibles |
|-------|--------|-----------------|
| school | 1 | ⚠️ Seul point de données — à protéger |
| academic_year | 1 | — |
| academic_period | 3 | — |
| level | 13 | Données de référence |
| subject | 12 | Données de référence |
| assessment_type | 4 | Données de référence |
| user | 1 | ⚠️ admin@danielou.ci sans password |
| classroom | 0 | — |
| student | 0 | — |
| enrollment | 0 | — |
| assessment | 0 | — |
| grade | 0 | — |
| report_card | 0 | — |
| pedagogical_config | 0 | — |
| config_subject | 0 | — |
| config_component | 0 | — |
| teacher_assignment | 0 | — |
| audit_log | 0 | — |
| account | 0 | — |
| session | 0 | — |
| subject_component | 0 | — |

**Total** : 34 lignes de données, toutes dans des tables de référence ou de configuration. Aucune donnée métier (élèves, notes, bulletins) n'existe encore.

---

## 14. FANTOMAS — ÉTAT ACTUEL

| Aspect | Actuel | Cible V2 | Écart |
|--------|--------|----------|
| Credentials | Hardcoded dans source | Env vars (FANTOMAS_USERNAME/PASSWORD) | 🔴 |
| Signing key | BETTER_AUTH_SECRET (partagé) | GHOST_SESSION_SECRET (dedicated) | 🔴 |
| Session type | JWT dans cookie | JWT dans cookie (OK) | ✅ |
| Cookie name | `danielou-fantomas-token` | À conserver ou renommer | 🟡 |
| DB dependency | Aucune ✅ | Aucune ✅ | ✅ |
| actorType | Absent | GHOST | 🔴 |
| platformRole | Absent (role='admin') | GHOST | 🔴 |
| Recovery Mode | Absent | Requis si DB indisponible | 🔴 |
| Détection exacte | `isFantomasLogin()` exacte | À conserver | ✅ |
| Fallback générique | Aucun | Interdit | ✅ |

---

## 15. MIGRATIONS EXISTANTES

**Une seule migration** : `drizzle/0000_slippery_azazel.sql` (358 lignes)

- Crée les 10 enums
- Crée les 20 tables applicatives + 2 tables Better Auth (account, session)
- Crée toutes les FK, indexes uniques, indexes btree
- Aucune contrainte CHECK métier
- Aucun trigger
- Pas de fichier journal `__drizzle_migrations` (migration probablement appliquée via `drizzle-kit push`)

---

## 16. ROUTE HANDLERS

| Route | Méthodes | Auth | RBAC | Notes |
|-------|----------|------|------|-------|
| `/api/auth/fantomas` | POST | Fantomas (DB-less) | N/A | ✅ Fonctionne sans DB |
| `/api/auth/[...all]` | * | Better Auth | N/A | Catch-all handler |
| `/api/auth/logout` | POST | Aucune | N/A | Supprime cookies |
| `/api/niveaux` | GET, POST | requireSession | Aucun | ⚠️ Pas de RBAC |
| `/api/niveaux/[id]` | GET, PUT, DELETE | requireSession | Aucun | ⚠️ Pas de RBAC |
| `/api/annees-scolaires` | GET, POST | requireSession | Aucun | ⚠️ Pas de RBAC |
| `/api/annees-scolaires/[id]` | GET, PUT, DELETE | requireSession | Aucun | ⚠️ Pas de RBAC |
| `/api/classes` | GET, POST | requireSession | Aucun | ⚠️ Pas de RBAC |
| `/api/classes/[id]` | GET, PUT, DELETE | requireSession | Aucun | ⚠️ Pas de RBAC |
| `/api/eleves` | GET, POST | requireSession | Aucun | ⚠️ Pas de RBAC |
| `/api/eleves/[id]` | GET, PUT, DELETE | requireSession | Aucun | ⚠️ Pas de RBAC |

---

## 17. SERVER ACTIONS

**Aucun Server Action explicite** (`'use server'`).  
Le `loginAction` dans `src/app/(auth)/login/actions.ts` fonctionne via `useActionState` mais sans la directive `'use server'`.

---

## 18. SERVICES MÉTIER

**Aucun service dédié.** Toute la logique est dans les route handlers.

Module utilitaire existant mais inutilisé : `src/lib/decimal.ts` (calculs de notes avec decimal.js).

---

## 19. TESTS

**Aucun test.** Le fichier `src/tests/setup.ts` contient uniquement l'import jest-dom.

La CI exécute `pnpm test:unit` qui tourne sur un répertoire vide et passe toujours.

---

## 20. CI

Deux workflows GitHub Actions :
- `ci.yml` : lint, typecheck, test:unit (vide), build (env vars placeholder)
- `deploy-preview.yml` : build avec preview secrets

**Manquant** : tests d'intégration PostgreSQL, tests de migration, security/dependency checks

---

## CONCLUSION

Le repository est dans un état **V1 fonctionnel partiel** :
- Auth Fantomas : fonctionne mais nécessite un refactor complet pour V2 (env vars, GHOST_SESSION_SECRET, Recovery Mode)
- Better Auth : installé mais **inutilisé en pratique** (0 compte utilisable, 0 session)
- Schéma : 22 tables synchronisées Drizzle/Neon, mais **30+ écarts** avec la cible V2
- Données : 34 lignes dans 6 tables, **0 donnée métier** à migrer (élèves, notes, bulletins)
- Tests : **0 test**
- RBAC : **inexistant**

**Favorable pour la migration** : L'absence de données métier réduit considérablement le risque de perte de données. Les migrations structurantes (enrollment→classroom_assignment, grade.student_id→enrollment_id, assessment.subject_id→config_subject_id) peuvent être effectuées sur des tables vides sans risque.

**Point de restauration Git** : À créer immédiatement avant toute modification.

---

*Rapport généré automatiquement. En attente d'autorisation pour procéder à R-V2-01.*