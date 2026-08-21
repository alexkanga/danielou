# R-V2-01 — TARGET DATA MODEL (FINAL)

**Projet** : Daniélou Abidjan — Plateforme de gestion scolaire  
**Date** : 2026-08-21  
**Prédecesseur** : R-V2-00 (audit au commit `209b077`, tag `pre-v2-migration`)  
**Statut** : **FINAL — MODEL FREEZE CANDIDATE**  
**Version** : 2.0 (corrigé depuis R-V2-01 v1)

---

## Résumé exécutif

Ce document définit le modèle de données cible V2 de la plateforme Daniélou Abidjan. Il corrige 22 points identifiés dans la version initiale du R-V2-01 et constitue le contrat architectural figé (MODEL FREEZE) avant toute migration structurelle.

| Dimension | V1 (actuel) | V2 cible |
|-----------|-------------|----------|
| Tables métier/Auth explicitées | 22 | **26** |
| Tables Better Auth | 3 (`user`, `account`, `session`) | Dynamique (R-V2-02) |
| Enums PG actifs | 10 | **14** |
| Enums retirés après migration | — | 2 (`app_role`, `calculation_policy`) |
| Role model | Monolithique `user.role` | **Dual : Platform Role + School Role** |
| Enrollment | Contient `classroom_id` | Sans `classroom_id` → `classroom_assignment` |
| Grade | Lié à `student_id` | Lié à `enrollment_id` |
| Assessment | Lié à `subject_id` | Lié à `config_subject_id` |
| Subject | Catalogue + règles pédagogiques | **Catalogue pur** |
| Fantomas | Ligne dans `user` table | **GhostActor hors DB** |

**Le nombre physique final de tables est `26 + tables Better Auth supplémentaires`**, confirmé après configuration/génération du schéma Better Auth pendant R-V2-02.

---

## 1. Principes architecturaux verrouillés

- Next.js full-stack / App Router / TypeScript strict / modular monolith
- PostgreSQL Neon — Drizzle ORM / drizzle-kit
- Better Auth pour utilisateurs ordinaires
- Vercel / pnpm
- **SQLite totalement interdit** (dev, tests, CI, preview, production, migration, seed, fallback)
- Si PostgreSQL indisponible : pas de fallback SQLite ; Fantomas → Recovery Mode hors DB

---

## 2. Architecture générale

### Organisation

```text
SCHOOL
│
├── ACADEMIC_YEAR
│    ├── ACADEMIC_PERIOD
│    ├── CLASSROOM
│    ├── ENROLLMENT
│    └── PEDAGOGICAL_CONFIG
│
├── LEVEL
├── STUDENT
├── SUBJECT
├── ASSESSMENT_TYPE
└── SCHOOL_MEMBERSHIP
```

### Scolarité

```text
STUDENT
  │
  ▼
ENROLLMENT
  │
  ▼
CLASSROOM_ASSIGNMENT
  │
  ▼
CLASSROOM
```

Un changement de classe interne modifie `classroom_assignment`. Il ne met PAS `enrollment` en `transferred`. `transferred_out` signifie sortie hors établissement.

### Pédagogie

```text
SUBJECT (catalogue)
  └── SUBJECT_COMPONENT (catalogue)

PEDAGOGICAL_CONFIG
  ├── CONFIG_SUBJECT (source de vérité pédagogique)
  │     └── CONFIG_COMPONENT (source de vérité pédagogique)
  └── version / règles / arrondis
```

### Évaluation

```text
CLASSROOM + ACADEMIC_PERIOD + CONFIG_SUBJECT + CONFIG_COMPONENT
  ↓
ASSESSMENT
  ↓
GRADE → ENROLLMENT
```

### Résultats

```text
GRADES → CALCULATION ENGINE → REPORT_CARD
  ├── REPORT_CARD_ITEM (snapshot historique)
  │     └── REPORT_CARD_COMPONENT_ITEM (snapshot historique)
  └── SNAPSHOT HISTORIQUE

ENROLLMENT → ANNUAL_RESULT (décision annuelle)
```

---

## 3. Fantomas — Exigence non négociable

Fantomas est un compte **Ghost / Break-glass hors base de données**.

**Identifiants actuels** : `fantomas` / `fantomas` (inchangés pendant la construction).

```text
fantomas / fantomas
       ↓
Ghost Auth hors DB
       ↓
Ghost Session signée hors DB
       ↓
DB disponible ?
  ├── Oui → application complète
  └── Non → Recovery Mode
```

Fantomas fonctionne même si :

- PostgreSQL est indisponible / supprimé
- `DATABASE_URL` absente ou invalide
- Tables Better Auth supprimées

**Fantomas ne doit JAMAIS dépendre de** : `user`, `account`, `session`, `verification`, ou toute ligne PostgreSQL.

**Fantomas n'est PAS une valeur de `user.platform_role`**. L'enum `platform_role` contient uniquement `super_admin` et `none`.

---

## 4. Dual Role System

### 4.1 Platform Role

Défini sur `user.platform_role`.

```text
super_admin  — Gestion utilisateurs, tous droits scolaires, accès global
none        — Rôle par défaut, aucun droit de plateforme
```

**`ghost` n'est PAS dans `platform_role`**. Fantomas est un GhostActor hors DB.

**SUPER_ADMIN** possède : gestion utilisateurs, création/modification, réinitialisation mots de passe, activation/désactivation, attribution rôles, création ADMIN et SUPER_ADMIN, tous les droits scolaires, accès global aux écoles. SUPER_ADMIN n'a pas besoin d'un faux `school_membership = admin`.

### 4.2 School Role

Défini sur `school_membership.role`.

```text
admin      — Administration scolaire complète, aucun CRUD utilisateur
direction  — Consultation, validation, publication bulletins, statistiques, décisions annuelles
teacher    — Périmètre affecté : classes, matières, évaluations, notes, appréciations
reader     — Consultation uniquement selon périmètre
```

### 4.3 Matrice de principe

| Action | Fantomas | SUPER_ADMIN | ADMIN | DIRECTION | TEACHER | READER |
|--------|:--------:|:-----------:|:-----:|:---------:|:-------:|:------:|
| Gestion utilisateurs | Oui | Oui | Non | Non | Non | Non |
| Créer SUPER_ADMIN | Oui | Oui | Non | Non | Non | Non |
| Administration scolaire | Oui | Oui | Oui | Non | Non | Non |
| Consultation générale | Oui | Oui | Oui | Oui | Scope | Scope |
| Saisie notes | Oui | Oui | Oui | Non | Scope | Non |
| Validation bulletins | Oui | Oui | Oui | Oui | Non | Non |
| Publication bulletins | Oui | Oui | Oui | Oui | Non | Non |
| Décision annuelle | Oui | Oui | Oui | Oui | Non | Non |
| Recovery Mode | Oui | Non | Non | Non | Non | Non |

`Scope` = uniquement les ressources réellement affectées.

---

## 5. Enums cibles (14 actifs)

| # | Nom PG | Valeurs | Statut |
|---|--------|---------|--------|
| 1 | `academic_year_status` | `preparation`, `active`, `closed` | Inchangé |
| 2 | `period_status` | `draft`, `open`, `closed` | Inchangé |
| 3 | `enrollment_status` | `active`, `completed`, `withdrawn`, `transferred_out`, `cancelled` | **CORRIGÉ** — `transferred` → `transferred_out`, `active` conservé |
| 4 | `classroom_assignment_status` | `active`, `transferred`, `completed`, `withdrawn`, `cancelled` | **NOUVEAU** |
| 5 | `grade_status` | `pending`, `graded`, `absent_excused`, `absent_unexcused`, `exempt`, `not_evaluated` | Inchangé |
| 6 | `assessment_status` | `draft`, `open`, `closed`, `cancelled` | **NOUVEAU** |
| 7 | `report_card_status` | `draft`, `ready`, `validated`, `published` | Inchangé |
| 8 | `config_status` | `draft`, `active`, `archived` | Inchangé |
| 9 | `rounding_strategy` | `half_up`, `half_even`, `truncate` | Inchangé |
| 10 | `promotion_decision` | Valeurs métier existantes conservées | Inchangé |
| 11 | `platform_role` | `super_admin`, `none` | **NOUVEAU** (remplace `app_role`) |
| 12 | `school_role` | `admin`, `direction`, `teacher`, `reader` | **NOUVEAU** |
| 13 | `teacher_assignment_type` | `homeroom`, `subject` | **NOUVEAU** |
| 14 | `aggregation_policy` | `simple_average`, `weighted_average`, `single_grade` | **NOUVEAU** (remplace `calculation_policy`) |

### À retirer après migration

- `app_role` — remplacé par `platform_role`
- `calculation_policy` — remplacé par `aggregation_policy`

### TEXT + CHECK (pas d'enum PG)

Les colonnes suivantes utilisent `TEXT NOT NULL` + `CHECK(... IN (...))` au lieu d'un enum PostgreSQL :

- `student.status` : `active`, `inactive`, `archived`
- `teacher_assignment.status` : `active`, `completed`, `cancelled`
- `audit_log.actor_type` : `user`, `ghost`, `system`

---

## 6. Tables métier/Auth (26)

### Conventions

- PK : `UUID` avec `defaultRandom()`
- Audit trail : `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- FK vers `user.id` pour tracking (created_by/updated_by) : `SET NULL`
- Les colonnes marquées `→ RETIRER (CONTRACT)` sont supprimées uniquement après migration vérifiée

---

### 6.1 `school`

**Responsabilité** : Établissement / tenant.

```text
id          UUID PK
code        TEXT NULL
name        TEXT NOT NULL
address     TEXT NULL
city        TEXT DEFAULT 'Abidjan'
country     TEXT DEFAULT 'Côte d''Ivoire'
timezone    TEXT DEFAULT 'Africa/Abidjan'
locale      TEXT DEFAULT 'fr-CI'
logo_url    TEXT NULL
is_active   BOOLEAN NOT NULL DEFAULT true
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(code) WHERE code IS NOT NULL
```

**Delete** : `RESTRICT` — une école avec historique n'est pas supprimée.

---

### 6.2 `academic_year`

**Responsabilité** : Année scolaire d'une école.

```text
id          UUID PK
school_id   UUID NOT NULL FK → school.id
name        TEXT NOT NULL
start_date  DATE NOT NULL
end_date    DATE NOT NULL
status      academic_year_status NOT NULL DEFAULT 'preparation'
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(school_id, name)
CHECK(start_date < end_date)
UNIQUE(school_id) WHERE status = 'active'
```

Une seule année active par école (index unique partiel).

**Delete** : `RESTRICT`.

---

### 6.3 `academic_period`

**Responsabilité** : Période (trimestre/semestre) d'une année scolaire.

```text
id                UUID PK
academic_year_id  UUID NOT NULL FK → academic_year.id
name              TEXT NOT NULL
sort_order        INTEGER NOT NULL DEFAULT 1
start_date        DATE NOT NULL
end_date          DATE NOT NULL
status            period_status NOT NULL DEFAULT 'draft'
created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(academic_year_id, name)
CHECK(sort_order > 0)
CHECK(start_date < end_date)
```

**Invariant domaine** : `period.start_date >= year.start_date` ET `period.end_date <= year.end_date`.

---

### 6.4 `level`

**Responsabilité** : Niveau scolaire configurable (jamais codé en dur).

```text
id          UUID PK
school_id   UUID NOT NULL FK → school.id
code        TEXT NULL
name        TEXT NOT NULL
sort_order  INTEGER NOT NULL DEFAULT 0
is_active   BOOLEAN NOT NULL DEFAULT true
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(school_id, name)
UNIQUE(school_id, code) WHERE code IS NOT NULL
CHECK(sort_order >= 0)
```

**Delete** : `RESTRICT`.

---

### 6.5 `classroom`

**Responsabilité** : Classe concrète d'un niveau pour une année.

```text
id                UUID PK
school_id         UUID NOT NULL
level_id          UUID NOT NULL FK → level.id
academic_year_id  UUID NOT NULL FK → academic_year.id
name              TEXT NOT NULL
is_active         BOOLEAN NOT NULL DEFAULT true
created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(level_id, academic_year_id, name)
```

**Invariant** : `classroom.school_id = level.school_id = academic_year.school_id` (transaction + tests).

**Delete** : `RESTRICT`.

---

### 6.6 `student`

**Responsabilité** : Identité permanente. Un élève est créé une seule fois.

```text
id            UUID PK
school_id     UUID NOT NULL FK → school.id
matricule     TEXT NULL
first_name    TEXT NOT NULL
last_name     TEXT NOT NULL
date_of_birth DATE NULL
gender        TEXT NULL
status        TEXT NOT NULL DEFAULT 'active'
archived_at   TIMESTAMPTZ NULL
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

**`status` valeurs** (TEXT + CHECK) : `active`, `inactive`, `archived`.

**Contraintes** :

```text
UNIQUE(school_id, matricule) WHERE matricule IS NOT NULL
CHECK(status IN ('active','inactive','archived'))
```

**Invariant** : `status = 'archived' → archived_at IS NOT NULL` (validation domaine).

**INTERDICTION** : `student.classroom_id` ne doit jamais exister.

**Delete** : `RESTRICT` — historique scolaire protégé.

---

### 6.7 `enrollment`

**Responsabilité** : Inscription annuelle. Un changement de classe interne modifie `classroom_assignment`, PAS enrollment.

```text
id                UUID PK
school_id         UUID NOT NULL
student_id        UUID NOT NULL FK → student.id
academic_year_id  UUID NOT NULL FK → academic_year.id
status            enrollment_status NOT NULL DEFAULT 'active'
enrolled_at       DATE NULL
exited_at         DATE NULL
created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(student_id, academic_year_id)
CHECK(exited_at IS NULL OR enrolled_at IS NULL OR enrolled_at <= exited_at)
```

**Invariant** : `enrollment.school_id = student.school_id = academic_year.school_id`.

**→ RETIRER (CONTRACT)** : `classroom_id`.

**Delete** : `RESTRICT`. Aucun CASCADE depuis Student.

---

### 6.8 `classroom_assignment` — **NOUVELLE**

**Responsabilité** : Affectation temporelle d'un enrollment à une classe.

```text
id            UUID PK
enrollment_id UUID NOT NULL FK → enrollment.id
classroom_id  UUID NOT NULL FK → classroom.id
start_date    DATE NOT NULL
end_date      DATE NULL
status        classroom_assignment_status NOT NULL
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
CHECK(end_date IS NULL OR start_date <= end_date)
UNIQUE(enrollment_id) WHERE status = 'active'
```

Un enrollment ne peut avoir qu'une seule affectation ACTIVE.

**Index** : `enrollment_id`, `classroom_id`, `status`.

**Invariant transactionnel** : les périodes d'affectation d'un même enrollment ne doivent pas se chevaucher.

---

### 6.9 `subject`

**Responsabilité** : Catalogue de matières uniquement.

```text
id          UUID PK
school_id   UUID NOT NULL FK → school.id
code        TEXT NOT NULL
name        TEXT NOT NULL
sort_order  INTEGER NOT NULL DEFAULT 0
is_active   BOOLEAN NOT NULL DEFAULT true
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(school_id, code)
CHECK(sort_order >= 0)
```

**→ RETIRER (CONTRACT)** : `coefficient`, `default_scale`, `is_optional`, `include_in_average`, `include_in_ranking`, `include_in_decision`.

**Source de vérité pédagogique** : `config_subject`.

---

### 6.10 `subject_component`

**Responsabilité** : Catalogue de composantes.

```text
id          UUID PK
subject_id  UUID NOT NULL FK → subject.id
code        TEXT NULL
name        TEXT NOT NULL
sort_order  INTEGER NOT NULL DEFAULT 0
is_active   BOOLEAN NOT NULL DEFAULT true
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(subject_id, name)
UNIQUE(subject_id, code) WHERE code IS NOT NULL
CHECK(sort_order >= 0)
```

**→ RETIRER (CONTRACT)** : `coefficient`, `scale`, `is_required`.

**Source de vérité** : `config_component`.

**Delete** : `RESTRICT` lorsque utilisé.

---

### 6.11 `assessment_type`

```text
id                   UUID PK
school_id            UUID NOT NULL FK → school.id
name                 TEXT NOT NULL
description          TEXT NULL
default_coefficient  NUMERIC NULL
default_scale        INTEGER NULL
is_active            BOOLEAN NOT NULL DEFAULT true
created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(school_id, name)
CHECK(default_coefficient IS NULL OR default_coefficient >= 0)
CHECK(default_scale IS NULL OR default_scale > 0)
```

---

### 6.12 `pedagogical_config`

**Responsabilité** : Configuration versionnée d'un niveau + année.

```text
id                           UUID PK
school_id                    UUID NOT NULL FK → school.id
level_id                     UUID NOT NULL FK → level.id
academic_year_id             UUID NOT NULL FK → academic_year.id
version                      INTEGER NOT NULL DEFAULT 1
status                       config_status NOT NULL DEFAULT 'draft'
general_average_policy       aggregation_policy NOT NULL
rounding_strategy            rounding_strategy NOT NULL DEFAULT 'half_up'
subject_decimal_places       INTEGER NOT NULL DEFAULT 2
general_decimal_places       INTEGER NOT NULL DEFAULT 2
ranking_enabled              BOOLEAN NOT NULL DEFAULT true
conduct_enabled              BOOLEAN NOT NULL DEFAULT false
conduct_included_in_average  BOOLEAN NOT NULL DEFAULT false
conduct_coefficient          NUMERIC NULL
conduct_scale                INTEGER NULL
description                  TEXT NULL
created_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(level_id, academic_year_id, version)
CHECK(version > 0)
CHECK(subject_decimal_places BETWEEN 0 AND 6)
CHECK(general_decimal_places BETWEEN 0 AND 6)
CHECK(conduct_coefficient IS NULL OR conduct_coefficient >= 0)
CHECK(conduct_scale IS NULL OR conduct_scale > 0)
UNIQUE(level_id, academic_year_id) WHERE status = 'active'
```

Une seule configuration ACTIVE par niveau/année.

**Invariant conduite** : `conduct_included_in_average = true → conduct_enabled = true`, et si inclus : `conduct_coefficient > 0`, `conduct_scale > 0`.

**Immuabilité** : config ACTIVE + déjà utilisée → pas de modification structurelle. Clone vers nouvelle version.

---

### 6.13 `config_subject`

**Responsabilité** : Source de vérité pédagogique d'une matière dans une configuration.

```text
id                            UUID PK
config_id                     UUID NOT NULL FK → pedagogical_config.id
subject_id                    UUID NOT NULL FK → subject.id
coefficient                   NUMERIC(6,2) NOT NULL
scale                         INTEGER NOT NULL DEFAULT 20
is_optional                   BOOLEAN NOT NULL DEFAULT false
is_active                     BOOLEAN NOT NULL DEFAULT true
include_in_average            BOOLEAN NOT NULL DEFAULT true
include_in_ranking            BOOLEAN NOT NULL DEFAULT true
include_in_decision           BOOLEAN NOT NULL DEFAULT true
assessment_aggregation_policy aggregation_policy NOT NULL DEFAULT 'simple_average'
component_aggregation_policy   aggregation_policy NOT NULL DEFAULT 'simple_average'
sort_order                    INTEGER NOT NULL DEFAULT 0
created_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(config_id, subject_id)
CHECK(coefficient >= 0)
CHECK(scale > 0)
CHECK(sort_order >= 0)
```

---

### 6.14 `config_component`

```text
id                            UUID PK
config_subject_id             UUID NOT NULL FK → config_subject.id
subject_component_id          UUID NULL FK → subject_component.id
name                          TEXT NOT NULL
sort_order                    INTEGER NOT NULL DEFAULT 0
coefficient                   NUMERIC(6,2) NOT NULL DEFAULT 1
scale                         INTEGER NOT NULL DEFAULT 20
is_required                   BOOLEAN NOT NULL DEFAULT true
is_active                     BOOLEAN NOT NULL DEFAULT true
assessment_aggregation_policy aggregation_policy NOT NULL DEFAULT 'simple_average'
created_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
CHECK(sort_order >= 0)
CHECK(coefficient >= 0)
CHECK(scale > 0)
```

`subject_component_id` nullable pour composante propre à une configuration.

---

### 6.15 `school_membership` — **NOUVELLE**

**Responsabilité** : Rôle scolaire d'un utilisateur dans une école.

```text
id          UUID PK
school_id   UUID NOT NULL FK → school.id
user_id     UUID NOT NULL FK → user.id
role        school_role NOT NULL
is_active   BOOLEAN NOT NULL DEFAULT true
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(school_id, user_id)
```

**Delete** : `school_id → RESTRICT`, `user_id → RESTRICT`. Privilégier désactivation.

---

### 6.16 `teacher_assignment`

**Responsabilité** : Affectation temporelle d'un enseignant.

```text
id                     UUID PK
school_membership_id   UUID NOT NULL FK → school_membership.id
classroom_id           UUID NOT NULL FK → classroom.id
config_subject_id      UUID NULL FK → config_subject.id
assignment_type        teacher_assignment_type NOT NULL
start_date             DATE NULL
end_date               DATE NULL
status                 TEXT NOT NULL DEFAULT 'active'
created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
```

**`status` valeurs** (TEXT + CHECK) : `active`, `completed`, `cancelled`.

**Contraintes** :

```text
CHECK(end_date IS NULL OR start_date IS NULL OR start_date <= end_date)
CHECK(status IN ('active','completed','cancelled'))
CHECK(
  (assignment_type = 'homeroom' AND config_subject_id IS NULL)
  OR
  (assignment_type = 'subject' AND config_subject_id IS NOT NULL)
)
```

**→ RETIRER (CONTRACT)** : `user_id`, `subject_id`, `academic_year_id`.

---

### 6.17 `assessment`

**Responsabilité** : Évaluation selon la configuration pédagogique applicable.

```text
id                    UUID PK
classroom_id          UUID NOT NULL FK → classroom.id RESTRICT
academic_period_id    UUID NOT NULL FK → academic_period.id RESTRICT
config_subject_id     UUID NOT NULL FK → config_subject.id RESTRICT
config_component_id  UUID NULL FK → config_component.id RESTRICT
assessment_type_id    UUID NULL FK → assessment_type.id RESTRICT
title                 TEXT NOT NULL
scale                 INTEGER NOT NULL DEFAULT 20
coefficient           NUMERIC(6,2) NOT NULL DEFAULT 1
assessment_date       DATE NOT NULL
status                assessment_status NOT NULL DEFAULT 'draft'
description           TEXT NULL
created_by_user_id    UUID NULL FK → user.id SET NULL
created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
CHECK(scale > 0)
CHECK(coefficient >= 0)
```

**Invariants métier** :

```text
classroom.year = academic_period.year = pedagogical_config.year
classroom.level = pedagogical_config.level
config_component.config_subject_id = assessment.config_subject_id
```

**Immuabilité** : dès qu'une note `graded` existe OU `assessment.status = closed` : `scale`, `config_subject_id`, `config_component_id`, `assessment_type_id` ne sont plus modifiables silencieusement.

**→ RETIRER (CONTRACT)** : `subject_id`.

---

### 6.18 `grade`

**Responsabilité** : Note d'un enrollment pour une assessment.

```text
id                  UUID PK
assessment_id      UUID NOT NULL FK → assessment.id RESTRICT
enrollment_id      UUID NOT NULL FK → enrollment.id RESTRICT
raw_value          NUMERIC(8,4) NULL
status              grade_status NOT NULL DEFAULT 'pending'
comment             TEXT NULL
created_by_user_id  UUID NULL FK → user.id SET NULL
updated_by_user_id  UUID NULL FK → user.id SET NULL
created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(assessment_id, enrollment_id)
CHECK(raw_value IS NULL OR raw_value >= 0)
```

**Invariant** : `status = 'graded' → raw_value IS NOT NULL`.

**Validation domaine** : `raw_value <= assessment.scale`, et `enrollment.academic_year = assessment.academic_year`.

**Absence ≠ zéro** : `absent_excused`, `absent_unexcused`, `exempt`, `not_evaluated`, `pending` ne deviennent jamais `0` sans règle pédagogique explicite.

**→ RETIRER (CONTRACT)** : `student_id`, `original_scale`. Le barème = `assessment.scale`.

---

### 6.19 `report_card`

**Responsabilité** : Bulletin périodique snapshotté.

```text
id                       UUID PK
enrollment_id            UUID NOT NULL FK → enrollment.id
academic_period_id       UUID NOT NULL FK → academic_period.id
pedagogical_config_id    UUID NOT NULL FK → pedagogical_config.id
status                   report_card_status NOT NULL DEFAULT 'draft'
general_average          NUMERIC(8,4) NULL
class_average            NUMERIC(8,4) NULL
rank                     INTEGER NULL
total_students_ranked    INTEGER NULL
conduct_grade            NUMERIC NULL
conduct_comment          TEXT NULL
teacher_comment          TEXT NULL
director_comment         TEXT NULL
validated_at              TIMESTAMPTZ NULL
validated_by_user_id      UUID NULL FK → user.id SET NULL
published_at              TIMESTAMPTZ NULL
published_by_user_id      UUID NULL FK → user.id SET NULL
created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(enrollment_id, academic_period_id)
```

**Delete policy** : CASCADE vers `report_card_item` (et cascade vers `report_card_component_item`). Mais `status = published` → suppression interdite par service métier. PostgreSQL ne peut pas changer dynamiquement une FK selon le statut. Le service métier vérifie avant suppression.

**→ RETIRER (CONTRACT)** : `student_id`, `config_version_id`, `promotion_decision`.

---

### 6.20 `report_card_item`

**Responsabilité** : Ligne matière d'un bulletin. Snapshot historique immuable.

```text
id                    UUID PK
report_card_id        UUID NOT NULL FK → report_card.id CASCADE
config_subject_id     UUID NOT NULL
subject_code          TEXT NOT NULL
subject_name          TEXT NOT NULL
average                NUMERIC NULL
scale                 INTEGER NOT NULL
coefficient           NUMERIC NOT NULL
weighted_points        NUMERIC NULL
class_average          NUMERIC NULL
min_average            NUMERIC NULL
max_average            NUMERIC NULL
sort_order            INTEGER NOT NULL
teacher_appreciation   TEXT NULL
created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(report_card_id, config_subject_id)
```

`subject_code`, `subject_name`, `scale`, `coefficient`, `sort_order` sont des **snapshots historiques intentionnels**.

**→ RETIRER (CONTRACT)** : `subject_id`.

---

### 6.21 `report_card_component_item` — **NOUVELLE**

**Responsabilité** : Composantes détaillées d'une ligne matière. Snapshot historique.

```text
id                       UUID PK
report_card_item_id       UUID NOT NULL FK → report_card_item.id CASCADE
config_component_id       UUID NULL
component_name            TEXT NOT NULL
average                   NUMERIC NULL
scale                     INTEGER NULL
coefficient               NUMERIC NULL
weighted_points            NUMERIC NULL
sort_order                INTEGER NULL
```

**Contraintes** :

```text
UNIQUE(report_card_item_id, config_component_id) WHERE config_component_id IS NOT NULL
```

---

### 6.22 `annual_result` — **NOUVELLE**

**Responsabilité** : Décision scolaire annuelle.

```text
id                       UUID PK
enrollment_id            UUID NOT NULL FK → enrollment.id RESTRICT
pedagogical_config_id    UUID NOT NULL FK → pedagogical_config.id RESTRICT
annual_average           NUMERIC NULL
promotion_decision        promotion_decision NULL
decision_comment          TEXT NULL
decision_at              TIMESTAMPTZ NULL
decided_by_user_id        UUID NULL FK → user.id SET NULL
created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
UNIQUE(enrollment_id)
```

`pedagogical_config_id` NOT NULL pour assurer la reproductibilité.

---

### 6.23 `user` — Contrat Daniélou

Better Auth reste propriétaire de son schéma interne. Le modèle Daniélou impose :

```text
id            UUID PK
email         TEXT NOT NULL UNIQUE
username      TEXT UNIQUE
name          TEXT NOT NULL
platform_role platform_role NOT NULL DEFAULT 'none'
is_active     BOOLEAN NOT NULL DEFAULT true
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Obligatoire** : `email UNIQUE`, `username UNIQUE`. Username obligatoire pour comptes métiers.

**Login** : `email + password` OU `username + password`. Pas de signup public, pas de vérification email obligatoire.

**Password** : Better Auth gère credential/hash. Jamais `user.password` en clair.

**R-V2-02 vérifiera** la version Better Auth, configurera username plugin, générera le schéma officiel. Ce document ne fige que le contrat fonctionnel Daniélou.

---

### 6.24 `account` (Better Auth)

Table gérée par Better Auth. Le schéma définitif sera aligné pendant R-V2-02. Contrat actuel : `id`, `user_id` (CASCADE), `account_id`, `provider_id`, `access_token`, `refresh_token`, `expires_at`, audit trail.

---

### 6.25 `session` (Better Auth)

Table gérée par Better Auth. Sessions des utilisateurs ordinaires uniquement. Contrat actuel : `id`, `user_id` (CASCADE), `token`, `expires_at`, `ip_address`, `user_agent`, audit trail.

**Fantomas n'utilise PAS cette table.** Ghost Session indépendante.

---

### 6.26 `audit_log`

**Responsabilité** : Journal d'audit complet. Support Ghost/User/System.

```text
id                UUID PK
school_id         UUID NULL
user_id           UUID NULL
actor_type        TEXT NOT NULL
actor_identifier  TEXT NULL
action            TEXT NOT NULL
entity            TEXT NOT NULL
entity_id         UUID NULL
old_value         JSONB NULL
new_value         JSONB NULL
context           JSONB NULL
ip_address        TEXT NULL
user_agent        TEXT NULL
request_id        TEXT NULL
created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Contraintes** :

```text
CHECK(actor_type IN ('user','ghost','system'))
CHECK(
  (actor_type = 'user' AND user_id IS NOT NULL)
  OR
  (actor_type IN ('ghost','system') AND user_id IS NULL)
)
```

**Règles** :
- Utilisateur normal : `user_id = UUID`, `actor_type = 'user'`
- Fantomas : `user_id = NULL`, `actor_type = 'ghost'`, `actor_identifier = 'fantomas'`
- Système : `actor_type = 'system'`

---

## 7. Colonnes supprimées en CONTRACT

| Table | Colonne | Raison |
|-------|---------|--------|
| `enrollment` | `classroom_id` | Délégué à `classroom_assignment` |
| `grade` | `student_id` | Délégué à `enrollment_id` |
| `grade` | `original_scale` | Redondant avec `assessment.scale` |
| `assessment` | `subject_id` | Délégué à `config_subject_id` |
| `report_card` | `student_id` | Dérivé via `enrollment` |
| `report_card` | `config_version_id` | Remplacé par `pedagogical_config_id` |
| `report_card` | `promotion_decision` | Déplacé vers `annual_result` |
| `report_card_item` | `subject_id` | Remplacé par `config_subject_id` + snapshot |
| `subject` | `coefficient`, `default_scale`, `is_optional`, `include_in_*` | Délégué à `config_subject` |
| `subject_component` | `coefficient`, `scale`, `is_required` | Délégué à `config_component` |
| `teacher_assignment` | `user_id`, `subject_id`, `academic_year_id` | Via `school_membership_id` + `config_subject_id` |

---

## 8. Delete policies

| Table | Delete Policy | Raison |
|-------|---------------|--------|
| `school` | RESTRICT | Historique
| `academic_year` | RESTRICT | Historique |
| `level` | RESTRICT | Référencé |
| `classroom` | RESTRICT | Évaluations |
| `student` | RESTRICT | Historique scolaire protégé |
| `enrollment` | RESTRICT | Historique, pas de CASCADE depuis Student |
| `classroom_assignment` | RESTRICT | Historique |
| `grade` | RESTRICT | Notes historiques |
| `report_card` | CASCADE vers enfants ; `published` protégé par service métier |
| `assessment` | RESTRICT sur toutes les FK parentes |
| `pedagogical_config` | RESTRICT | Utilisé dans bulletins |
| `school_membership` | school_id RESTRICT, user_id RESTRICT |
| `annual_result` | enrollment_id RESTRICT, pedagogical_config_id RESTRICT |

**Règle** : CASCADE acceptable uniquement pour enfants strictement dépendants d'un parent supprimable.

---

## 9. Index cible

| Table | Index | Type |
|-------|-------|------|
| `school` | `code` | UNIQUE PARTIEL (WHERE NOT NULL) |
| `academic_year` | `school_id` | B-tree |
| `academic_year` | `(school_id, name)` | UNIQUE |
| `academic_year` | `(school_id) WHERE status = 'active'` | UNIQUE PARTIEL |
| `academic_period` | `academic_year_id` | B-tree |
| `classroom` | `academic_year_id` | B-tree |
| `classroom` | `level_id` | B-tree |
| `student` | `school_id` | B-tree |
| `student` | `(last_name, first_name)` | B-tree |
| `student` | `(school_id, matricule)` | UNIQUE PARTIEL |
| `enrollment` | `student_id` | B-tree |
| `enrollment` | `academic_year_id` | B-tree |
| `classroom_assignment` | `enrollment_id` | B-tree |
| `classroom_assignment` | `classroom_id` | B-tree |
| `classroom_assignment` | `status` | B-tree |
| `classroom_assignment` | `(enrollment_id) WHERE status = 'active'` | UNIQUE PARTIEL |
| `assessment` | `classroom_id` | B-tree |
| `assessment` | `academic_period_id` | B-tree |
| `assessment` | `config_subject_id` | B-tree |
| `grade` | `enrollment_id` | B-tree |
| `report_card` | `enrollment_id` | B-tree |
| `report_card` | `academic_period_id` | B-tree |
| `pedagogical_config` | `(level_id, academic_year_id) WHERE status = 'active'` | UNIQUE PARTIEL |
| `audit_log` | `(entity, entity_id)` | B-tree |
| `audit_log` | `(user_id, created_at)` | B-tree |
| `audit_log` | `created_at` | B-tree |
| `school_membership` | `(school_id, user_id)` | UNIQUE |
| `annual_result` | `enrollment_id` | UNIQUE |
| `assessment_type` | `(school_id, name)` | UNIQUE |
| `level` | `(school_id, code)` | UNIQUE PARTIEL |
| `teacher_assignment` | `school_membership_id` | B-tree |

---

## 10. Stratégie `updated_at`

Fonction PostgreSQL générique + triggers :

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Appliquée sur toutes les tables avec `updated_at`. Solution Drizzle centralisée acceptable si elle garantit tous les chemins d'écriture. Une seule stratégie.

---

## 11. NUMERIC / Calculs

Tous les champs numériques critiques utilisent `NUMERIC` :

- Notes : `raw_value NUMERIC(8,4)`
- Coefficients : `NUMERIC(6,2)`
- Moyennes : `NUMERIC(8,4)`
- Points pondérés : `NUMERIC(10,4)`

Le moteur applique : normalisation barème → coefficients → politique d'agrégation (`aggregation_policy`) → stratégie d'arrondi → précision intermédiaire → précision affichage. Pas d'accumulation naïve de float JavaScript.

---

## 12. Invariants cross-school

Aucune association cross-school silencieuse :

```text
Student école A → Enrollment année école B : REFUSÉ
Classroom école A → Level école B : REFUSÉ
Assessment classe école A → config matière école B : REFUSÉ
Teacher assignment école A → membership école B : REFUSÉ
```

Garantis par FK + validation serveur + tests d'intégration PostgreSQL.

---

## 13. CHECK constraints récapitulatif

| Table | CHECK |
|-------|-------|
| `school` | (aucun au-delà du PK et unique partiel) |
| `academic_year` | `start_date < end_date` |
| `academic_period` | `sort_order > 0`, `start_date < end_date` |
| `level` | `sort_order >= 0` |
| `student` | `status IN ('active','inactive','archived')` |
| `enrollment` | `exited_at IS NULL OR enrolled_at IS NULL OR enrolled_at <= exited_at` |
| `classroom_assignment` | `end_date IS NULL OR start_date <= end_date` |
| `subject` | `sort_order >= 0` |
| `subject_component` | `sort_order >= 0` |
| `assessment_type` | `default_coefficient IS NULL OR >= 0`, `default_scale IS NULL OR > 0` |
| `pedagogical_config` | `version > 0`, `subject_decimal_places BETWEEN 0 AND 6`, `general_decimal_places BETWEEN 0 AND 6`, `conduct_coefficient IS NULL OR >= 0`, `conduct_scale IS NULL OR > 0` |
| `config_subject` | `coefficient >= 0`, `scale > 0`, `sort_order >= 0` |
| `config_component` | `sort_order >= 0`, `coefficient >= 0`, `scale > 0` |
| `teacher_assignment` | dates valides, `status IN (...)`, homeroom/subject CHECK |
| `assessment` | `scale > 0`, `coefficient >= 0` |
| `grade` | `raw_value IS NULL OR raw_value >= 0` |
| `audit_log` | `actor_type IN ('user','ghost','system')`, actor/user cohérence |

---

## 14. Migrations critiques identifiées

| # | Migration | Risque | Atténuation |
|---|-----------|--------|------------|
| M1 | `grade.student_id` → `enrollment_id` | CRITIQUE — ambiguïté si multi-enrollments/year | Vérifier unicité ; rapport d'ambiguïté |
| M2 | `assessment.subject_id` → `config_subject_id` | CRITIQUE — plusieurs configs candidates | Ne pas deviner ; arrêter avant CONTRACT |
| M3 | `app_role` → `platform_role` | MOYEN — compatibilité Better Auth | Rôle géré hors Better Auth |
| M4 | Retrait CASCADE sur `student` | MOYEN — code existant | Audit + archivage |
| M5 | `enrollment.classroom_id` → `classroom_assignment` | FAIBLE — mécanique claire | Transaction atomique |
| M6 | Snapshot `report_card_item` | FAIBLE — surcharge données | Coût acceptable pour immuabilité |

---

## 15. Quality Gate

```text
[PASS] 26 tables explicitement modélisées
[PASS] tables Better Auth supplémentaires déclarées dynamiques
[PASS] username intégré
[PASS] email + username login supporté conceptuellement
[PASS] Fantomas hors DB
[PASS] Fantomas fonctionne sans DB
[PASS] platform_role sans ghost
[PASS] school_role séparé
[PASS] SUPER_ADMIN droits globaux
[PASS] ADMIN aucun CRUD utilisateur
[PASS] enrollment annualisé
[PASS] classroom_assignment séparé
[PASS] subject = catalogue
[PASS] subject_component = catalogue
[PASS] config_subject = source pédagogique
[PASS] config_component = source pédagogique
[PASS] une seule config ACTIVE / niveau / année
[PASS] assessment → config_subject
[PASS] assessment_status typé
[PASS] grade → enrollment
[PASS] grade enrollment FK explicite
[PASS] absence != zéro
[PASS] report_card snapshot historique
[PASS] annual_result séparé
[PASS] audit Ghost/User/System
[PASS] entity_id audit nullable
[PASS] cascades destructrices supprimées
[PASS] updated_at stratégie unique
[PASS] NUMERIC conservé
[PASS] aggregation_policy typé
[PASS] invariants cross-school documentés
[PASS] migrations critiques identifiées
[PASS] aucune SQLite
```

---

```text
R-V2-01 — TARGET DATA MODEL
STATUS: PASS
MODEL: FROZEN
```

---

## 16. Diagramme relationnel final

```text
school
├── academic_year ─────────────────────────────┐
│   ├── academic_period ──────────────────────┤
│   │   └── assessment ───────────────────────┤
│   │       ├── grade → enrollment            │
│   │       └── (classroom, config_subject,   │
│   │           config_component,             │
│   │           assessment_type)               │
│   ├── classroom                              │
│   │   ├── classroom_assignment → enrollment │
│   │   ├── teacher_assignment → school_membership
│   │   └── assessment                          │
│   ├── enrollment                             │
│   │   ├── classroom_assignment → classroom   │
│   │   ├── grade                               │
│   │   ├── report_card                         │
│   │   │   ├── report_card_item                 │
│   │   │   │   └── report_card_component_item    │
│   │   │   └── (pedagogical_config)             │
│   │   └── annual_result → pedagogical_config  │
│   └── pedagogical_config ←───────────────────┘
│       ├── config_subject                       │
│       │   ├── config_component                 │
│       │   ├── assessment                       │
│       │   ├── teacher_assignment               │
│       │   └── report_card_item                  │
│       └── annual_result
├── level
│   ├── classroom
│   └── pedagogical_config
├── student
│   └── enrollment
├── subject (catalogue)
│   ├── subject_component (catalogue)
│   ├── config_subject
│   │   └── config_component
│   └── assessment_type
├── school_membership
│   └── teacher_assignment
└── user
    ├── school_membership
    ├── account (Better Auth — schéma dynamique R-V2-02)
    └── session (Better Auth — schéma dynamique R-V2-02)

audit_log (school_id, user_id, actor_type) — cross-cutting
```

*Fin du document R-V2-01_TARGET_DATA_MODEL_FINAL — MODEL FREEZE*