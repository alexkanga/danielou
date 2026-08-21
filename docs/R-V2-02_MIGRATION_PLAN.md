# R-V2-02 — PLAN DE MIGRATION EXPAND/CONTRACT

**Projet** : Daniélou Abidjan — Plateforme de gestion scolaire  
**Date** : 2026-08-22  
**Prédecesseur** : R-V2-01 TARGET DATA MODEL (FINAL) — MODEL FREEZE  
**Statut** : PLAN COMPLET — en attente d'exécution  
**Commit de référence** : tag `pre-v2-migration`  
**Données métier existantes** : **0** (favorable — aucune donnée élève/note/bulletin)

---

## 1. Objectif et périmètre

### 1.1 Objectif

Ce document définit le plan de migration complet de la base de données Daniélou Abidjan du schéma V1 (22 tables, 10 enums, rôle monolithique) vers le schéma V2 (26+ tables métier, 14 enums, système de rôle dual Platform + School) défini dans le R-V2-01 TARGET DATA MODEL FINAL.

La migration suit impérativement la méthodologie **Expand/Contract** telle que spécifiée dans la section 41 de la MISSION. Aucune colonne ancienne ne sera supprimée avant que la donnée correspondante n'ait été migrée et vérifiée à 100%.

### 1.2 Périmètre

| Dimension | V1 | V2 | Δ |
|-----------|----|----|---|
| Tables métier/Auth | 22 | 26 | +4 nouvelles |
| Enums PostgreSQL | 10 | 14 | +4 nouvelles, -2 retirées |
| Colonnes ajoutées (EXPAND) | — | ~30 | Nouvelles colonnes |
| Colonnes retirées (CONTRACT) | — | ~18 | Après vérification |
| CHECK constraints | 0 | 22 | Toutes nouvelles |
| Index cible | 26 | ~30 | +4 nouveaux |
| FK CASCADE→RESTRICT | 8 | 0 | Toutes protégées |
| FK nouvelles | 0 | ~6 | school_id dénormalisé, config_subject_id, etc. |

### 1.3 Tables affectées

**Nouvelles tables (4)** : `school_membership`, `classroom_assignment`, `annual_result`, `report_card_component_item`

**Tables modifiées (16)** : `school`, `level`, `classroom`, `student`, `enrollment`, `subject`, `subject_component`, `assessment_type`, `assessment`, `grade`, `pedagogical_config`, `config_subject`, `config_component`, `teacher_assignment`, `report_card`, `report_card_item`, `user`, `audit_log`

**Tables inchangées (4)** : `academic_year`, `academic_period`, `account`, `session`

### 1.4 Hors périmètre

- Schéma Better Auth (géré par R-V2-02 auth)
- Refactor Fantomas (géré par R-V2-02 auth)
- Trigger `updated_at` (traité séparément, applicable à toutes les tables)
- Migration du code applicatif (routes, composants) — ce plan se concentre sur le schéma et les données

---

## 2. Méthodologie Expand/Contract

### 2.1 Principe

Chaque modification structurelle suit un cycle strict en 7 étapes. **JAMAIS** on ne supprime une colonne existante avant d'avoir créé sa remplaçante, migré les données, et vérifié l'intégrité.

### 2.2 Les 7 phases obligatoires

```
1. EXPAND    — Créer la nouvelle structure (colonne, table, enum, contrainte, index)
2. KEEP      — Conserver l'ancienne structure intacte
3. MIGRATE   — Peupler la nouvelle structure depuis l'ancienne
4. VERIFY    — Vérifier l'intégrité de la migration (comptages, invariants, bizarreries)
5. SWITCH    — Basculer le code applicatif vers la nouvelle structure
6. TEST      — Exécuter les tests (unitaires, intégration, manuels)
7. CONTRACT  — Supprimer l'ancienne structure UNIQUEMENT si 1-6 sont validés
```

### 2.3 Règles absolues

1. **INTERDICTION** : `ALTER TABLE ... DROP COLUMN` sans vérification préalable à 100%
2. **INTERDICTION** : Supposer qu'une résolution ambiguë est correcte — en cas de doute, **STOP et rapporter**
3. **INTERDICTION** : Modifier le code applicatif (SWITCH) avant que MIGRATE+VERIFY ne soient passés
4. **OBLIGATION** : Chaque phase CONTRACT doit lister ses prérequis de vérification
5. **OBLIGATION** : Chaque phase doit pouvoir être rollbackée indépendamment
6. **OBLIGATION** : Toute migration de données se fait dans une transaction PostgreSQL explicite

### 2.4 Exit criteria globaux

- [ ] Toutes les 7 phases de chaque sous-migration sont complétées
- [ ] Aucune donnée perdue (comptages avant/après cohérents)
- [ ] Tous les CHECK constraints sont en place
- [ ] Tous les index cibles sont créés
- [ ] Toutes les FK CASCADE→RESTRICT sont appliquées
- [ ] Les 2 enums obsolètes (`app_role`, `calculation_policy`) sont retirés
- [ ] Le schéma Drizzle est synchronisé avec la base PostgreSQL
- [ ] `drizzle-kit push` ou `drizzle-kit generate` ne signale aucune différence

---

## 3. Prérequis et rollback

### 3.1 Point de restauration Git

Le tag `pre-v2-migration` existe déjà sur le commit avant toute modification. Avant de commencer la phase M1 :

```bash
git tag -f pre-v2-migration-expands
```

Ce tag sera le point de retour si la migration doit être annulée.

### 3.2 Stratégie de backup de la base

Avant M1 :

```bash
# Via Neon Dashboard : créer un branch de la base
# Ou via pg_dump si accès direct
pg_dump $DATABASE_URL > backup_pre_v2_migration_$(date +%Y%m%d_%H%M%S).sql
```

### 3.3 Rollback par phase

| Phase | Stratégie de rollback |
|-------|----------------------|
| M1 | `DROP TABLE` si nouvelles tables vides ; `ALTER TABLE DROP COLUMN` si colonnes ajoutées non encore utilisées ; supprimer enums créés |
| M2 | Supprimer les lignes de `classroom_assignment` ; drop de la colonne `school_id` de enrollment si ajoutée |
| M3 | `UPDATE grade SET enrollment_id = NULL` ; drop colonne enrollment_id nullable |
| M4 | `UPDATE assessment SET config_subject_id = NULL, config_component_id = NULL` ; drop colonnes |
| M5 | Supprimer les lignes insérées dans config_subject/config_component ; drop colonnes ajoutées |
| M6 | Opérations similaires colonne par colonne |
| M7 | **Non rollbackable** — c'est la phase de suppression. Seul le restore Git + backup DB fonctionne |

### 3.4 Rollback d'urgence

En cas de problème bloquant : `git checkout pre-v2-migration-expands -- .` puis `pg_restore backup_pre_v2_migration.sql`.

---

## 4. Phase M1 : Foundations

### 4.1 Objectif

Poser les fondations sans toucher aux données existantes : créer les nouveaux enums, les nouvelles tables, ajouter les colonnes simples (sans migration de données), ajouter les CHECK constraints, et modifier les FK CASCADE→RESTRICT.

### 4.2 Tables affectées

- **Nouvelles tables** : `school_membership`, `classroom_assignment`, `annual_result`, `report_card_component_item`
- **Colonnes à ajouter** : `school`, `level`, `classroom`, `student`, `enrollment`, `subject`, `subject_component`, `assessment_type`, `assessment`, `grade`, `pedagogical_config`, `config_subject`, `config_component`, `teacher_assignment`, `report_card`, `report_card_item`, `user`, `audit_log`
- **Enums** : 4 nouveaux, 2 à préparer pour renommage

### 4.3 Opérations SQL

#### 4.3.1 Nouveaux enums

```sql
-- E1 : school_role
CREATE TYPE school_role AS ENUM ('admin', 'direction', 'teacher', 'reader');

-- E2 : platform_role
CREATE TYPE platform_role AS ENUM ('super_admin', 'none');

-- E3 : classroom_assignment_status
CREATE TYPE classroom_assignment_status AS ENUM (
  'active', 'transferred', 'completed', 'withdrawn', 'cancelled'
);

-- E4 : assessment_status
CREATE TYPE assessment_status AS ENUM ('draft', 'open', 'closed', 'cancelled');

-- E5 : teacher_assignment_type
CREATE TYPE teacher_assignment_type AS ENUM ('homeroom', 'subject');

-- E6 : aggregation_policy (remplacera calculation_policy)
CREATE TYPE aggregation_policy AS ENUM (
  'simple_average', 'weighted_average', 'single_grade'
);
```

**Note** : `enrollment_status` nécessite aussi une mise à jour : la valeur `transferred` doit devenir `transferred_out`.

```sql
-- Mise à jour enrollment_status : transferred → transferred_out
ALTER TYPE enrollment_status RENAME VALUE 'transferred' TO 'transferred_out';

-- Ajout de nouvelles valeurs si manquantes
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'cancelled';
```

#### 4.3.2 Nouvelles tables

```sql
-- T1 : school_membership
CREATE TABLE school_membership (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES school(id) ON DELETE RESTRICT,
  user_id     UUID NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  role        school_role NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX usm_school_user ON school_membership(school_id, user_id);

-- T2 : classroom_assignment
CREATE TABLE classroom_assignment (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES enrollment(id) ON DELETE RESTRICT,
  classroom_id  UUID NOT NULL REFERENCES classroom(id) ON DELETE RESTRICT,
  start_date    DATE NOT NULL,
  end_date      DATE NULL,
  status        classroom_assignment_status NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ca_enrollment_idx ON classroom_assignment(enrollment_id);
CREATE INDEX ca_classroom_idx ON classroom_assignment(classroom_id);
CREATE INDEX ca_status_idx ON classroom_assignment(status);
CREATE UNIQUE INDEX uca_active_enrollment
  ON classroom_assignment(enrollment_id) WHERE status = 'active';

-- Contraintes CHECK classroom_assignment
ALTER TABLE classroom_assignment
  ADD CONSTRAINT ck_ca_dates
  CHECK (end_date IS NULL OR start_date <= end_date);

-- T3 : annual_result
CREATE TABLE annual_result (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id            UUID NOT NULL REFERENCES enrollment(id) ON DELETE RESTRICT,
  pedagogical_config_id    UUID NOT NULL REFERENCES pedagogical_config(id) ON DELETE RESTRICT,
  annual_average           NUMERIC(8,4) NULL,
  promotion_decision        promotion_decision NULL,
  decision_comment          TEXT NULL,
  decision_at              TIMESTAMPTZ NULL,
  decided_by_user_id        UUID NULL REFERENCES "user"(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uar_enrollment ON annual_result(enrollment_id);

-- T4 : report_card_component_item
CREATE TABLE report_card_component_item (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_item_id       UUID NOT NULL REFERENCES report_card_item(id) ON DELETE CASCADE,
  config_component_id       UUID NULL,
  component_name            TEXT NOT NULL,
  average                   NUMERIC(8,4) NULL,
  scale                     INTEGER NULL,
  coefficient               NUMERIC(6,2) NULL,
  weighted_points            NUMERIC(10,4) NULL,
  sort_order                INTEGER NULL
);
CREATE UNIQUE INDEX urcci_rc_item_component
  ON report_card_component_item(report_card_item_id, config_component_id)
  WHERE config_component_id IS NOT NULL;
```

#### 4.3.3 Colonnes à ajouter (EXPAND — pas de données à migrer)

```sql
-- school : +code, +timezone, +locale, +is_active
ALTER TABLE school ADD COLUMN code TEXT NULL;
ALTER TABLE school ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Africa/Abidjan';
ALTER TABLE school ADD COLUMN locale TEXT NOT NULL DEFAULT 'fr-CI';
ALTER TABLE school ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX us_school_code ON school(code) WHERE code IS NOT NULL;

-- level : +code, +is_active
ALTER TABLE level ADD COLUMN code TEXT NULL;
ALTER TABLE level ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX ul_level_code ON level(school_id, code) WHERE code IS NOT NULL;
ALTER TABLE level ADD CONSTRAINT ck_level_sort_order CHECK (sort_order >= 0);

-- classroom : +school_id (denormalisé), +is_active
ALTER TABLE classroom ADD COLUMN school_id UUID NULL;
-- La FK sera ajoutée après peuplement
ALTER TABLE classroom ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- student : +status, +archived_at
ALTER TABLE student ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE student ADD COLUMN archived_at TIMESTAMPTZ NULL;
ALTER TABLE student ADD CONSTRAINT ck_student_status
  CHECK (status IN ('active','inactive','archived'));
CREATE UNIQUE INDEX ust_matricule ON student(school_id, matricule) WHERE matricule IS NOT NULL;

-- enrollment : +school_id, +enrolled_at, +exited_at
ALTER TABLE enrollment ADD COLUMN school_id UUID NULL;
ALTER TABLE enrollment ADD COLUMN enrolled_at DATE NULL;
ALTER TABLE enrollment ADD COLUMN exited_at DATE NULL;
ALTER TABLE enrollment ADD CONSTRAINT ck_enrollment_dates
  CHECK (exited_at IS NULL OR enrolled_at IS NULL OR enrolled_at <= exited_at);

-- subject : déjà a code, is_active, sort_order — rien à ajouter
-- (les colonnes pédagogiques seront retirées en CONTRACT M5)

-- subject_component : +code
ALTER TABLE subject_component ADD COLUMN code TEXT NULL;
ALTER TABLE subject_component ADD CONSTRAINT ck_sc_sort_order CHECK (sort_order >= 0);
CREATE UNIQUE INDEX usc_comp_code
  ON subject_component(subject_id, code) WHERE code IS NOT NULL;

-- assessment_type : +default_coefficient, +default_scale, +is_active
ALTER TABLE assessment_type ADD COLUMN default_coefficient NUMERIC(6,2) NULL;
ALTER TABLE assessment_type ADD COLUMN default_scale INTEGER NULL;
ALTER TABLE assessment_type ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE assessment_type ADD CONSTRAINT ck_at_coeff
  CHECK (default_coefficient IS NULL OR default_coefficient >= 0);
ALTER TABLE assessment_type ADD CONSTRAINT ck_at_scale
  CHECK (default_scale IS NULL OR default_scale > 0);
CREATE UNIQUE INDEX uat_school_name ON assessment_type(school_id, name);

-- assessment : +config_subject_id, +config_component_id, +status, +created_by
ALTER TABLE assessment ADD COLUMN config_subject_id UUID NULL;
ALTER TABLE assessment ADD COLUMN config_component_id UUID NULL;
ALTER TABLE assessment ADD COLUMN status assessment_status NOT NULL DEFAULT 'draft';
ALTER TABLE assessment ADD COLUMN created_by_user_id UUID NULL;
ALTER TABLE assessment ADD CONSTRAINT ck_assessment_scale CHECK (scale > 0);
ALTER TABLE assessment ADD CONSTRAINT ck_assessment_coeff CHECK (coefficient >= 0);

-- grade : +enrollment_id (nullable temporairement), +created_by, +updated_by
ALTER TABLE grade ADD COLUMN enrollment_id UUID NULL;
ALTER TABLE grade ADD COLUMN created_by_user_id UUID NULL;
ALTER TABLE grade ADD COLUMN updated_by_user_id UUID NULL;
ALTER TABLE grade ADD CONSTRAINT ck_grade_raw_value
  CHECK (raw_value IS NULL OR raw_value >= 0);

-- pedagogical_config : renommer calculation_policy → general_average_policy
-- (colonne ajoutée d'abord, données copiées, puis renommage)
ALTER TABLE pedagogical_config ADD COLUMN general_average_policy aggregation_policy NULL;
ALTER TABLE pedagogical_config ADD CONSTRAINT ck_pc_version CHECK (version > 0);
ALTER TABLE pedagogical_config ADD CONSTRAINT ck_pc_subj_dec
  CHECK (subject_decimal_places BETWEEN 0 AND 6);
ALTER TABLE pedagogical_config ADD CONSTRAINT ck_pc_gen_dec
  CHECK (general_decimal_places BETWEEN 0 AND 6);
ALTER TABLE pedagogical_config ADD CONSTRAINT ck_pc_conduct_coeff
  CHECK (conduct_coefficient IS NULL OR conduct_coefficient >= 0);
ALTER TABLE pedagogical_config ADD CONSTRAINT ck_pc_conduct_scale
  CHECK (conduct_scale IS NULL OR conduct_scale > 0);
CREATE UNIQUE INDEX upc_active_config
  ON pedagogical_config(level_id, academic_year_id) WHERE status = 'active';

-- config_subject : +is_optional, +assessment_aggregation_policy, +component_aggregation_policy
ALTER TABLE config_subject ADD COLUMN is_optional BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE config_subject ADD COLUMN assessment_aggregation_policy aggregation_policy
  NOT NULL DEFAULT 'simple_average';
ALTER TABLE config_subject ADD COLUMN component_aggregation_policy aggregation_policy
  NOT NULL DEFAULT 'simple_average';
ALTER TABLE config_subject ADD CONSTRAINT ck_cs_coeff CHECK (coefficient >= 0);
ALTER TABLE config_subject ADD CONSTRAINT ck_cs_scale CHECK (scale > 0);
ALTER TABLE config_subject ADD CONSTRAINT ck_cs_sort CHECK (sort_order >= 0);

-- config_component : +assessment_aggregation_policy
ALTER TABLE config_component ADD COLUMN assessment_aggregation_policy aggregation_policy
  NOT NULL DEFAULT 'simple_average';
ALTER TABLE config_component ADD CONSTRAINT ck_cc_sort CHECK (sort_order >= 0);
ALTER TABLE config_component ADD CONSTRAINT ck_cc_coeff CHECK (coefficient >= 0);
ALTER TABLE config_component ADD CONSTRAINT ck_cc_scale CHECK (scale > 0);

-- teacher_assignment : +school_membership_id, +config_subject_id, +assignment_type,
--                        +start_date, +end_date, +status
ALTER TABLE teacher_assignment ADD COLUMN school_membership_id UUID NULL;
ALTER TABLE teacher_assignment ADD COLUMN config_subject_id UUID NULL;
ALTER TABLE teacher_assignment ADD COLUMN assignment_type teacher_assignment_type NULL;
ALTER TABLE teacher_assignment ADD COLUMN start_date DATE NULL;
ALTER TABLE teacher_assignment ADD COLUMN end_date DATE NULL;
ALTER TABLE teacher_assignment ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- report_card : +pedagogical_config_id, +validated_at, +validated_by
ALTER TABLE report_card ADD COLUMN pedagogical_config_id UUID NULL;
ALTER TABLE report_card ADD COLUMN validated_at TIMESTAMPTZ NULL;
ALTER TABLE report_card ADD COLUMN validated_by_user_id UUID NULL;

-- report_card_item : +config_subject_id, +subject_code, +subject_name, +scale, +sort_order
ALTER TABLE report_card_item ADD COLUMN config_subject_id UUID NULL;
ALTER TABLE report_card_item ADD COLUMN subject_code TEXT NULL;
ALTER TABLE report_card_item ADD COLUMN subject_name TEXT NULL;
ALTER TABLE report_card_item ADD COLUMN scale INTEGER NULL;
ALTER TABLE report_card_item ADD COLUMN sort_order INTEGER NULL;

-- user : +platform_role (à côté de role existant)
ALTER TABLE "user" ADD COLUMN platform_role platform_role NOT NULL DEFAULT 'none';
ALTER TABLE "user" ADD COLUMN username TEXT NULL;
-- username UNIQUE sera ajouté après peuplement

-- audit_log : +school_id, +actor_type, +actor_identifier, +user_agent, +request_id
ALTER TABLE audit_log ADD COLUMN school_id UUID NULL;
ALTER TABLE audit_log ADD COLUMN actor_type TEXT NULL;
ALTER TABLE audit_log ADD COLUMN actor_identifier TEXT NULL;
ALTER TABLE audit_log ADD COLUMN user_agent TEXT NULL;
ALTER TABLE audit_log ADD COLUMN request_id TEXT NULL;
ALTER TABLE audit_log ADD CONSTRAINT ck_al_actor_type
  CHECK (actor_type IN ('user','ghost','system'));
ALTER TABLE audit_log ALTER COLUMN entity_id DROP NOT NULL;
```

#### 4.3.4 FK CASCADE → RESTRICT

```sql
-- enrollment → student : CASCADE → RESTRICT
ALTER TABLE enrollment DROP CONSTRAINT enrollment_student_id_fkey;
ALTER TABLE enrollment ADD CONSTRAINT enrollment_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE RESTRICT;

-- grade → student : CASCADE → RESTRICT
ALTER TABLE grade DROP CONSTRAINT grade_student_id_fkey;
ALTER TABLE grade ADD CONSTRAINT grade_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE RESTRICT;

-- grade → assessment : CASCADE → RESTRICT
ALTER TABLE grade DROP CONSTRAINT grade_assessment_id_fkey;
ALTER TABLE grade ADD CONSTRAINT grade_assessment_id_fkey
  FOREIGN KEY (assessment_id) REFERENCES assessment(id) ON DELETE RESTRICT;

-- assessment → classroom : CASCADE → RESTRICT
ALTER TABLE assessment DROP CONSTRAINT assessment_classroom_id_fkey;
ALTER TABLE assessment ADD CONSTRAINT assessment_classroom_id_fkey
  FOREIGN KEY (classroom_id) REFERENCES classroom(id) ON DELETE RESTRICT;

-- classroom → level : CASCADE → RESTRICT
ALTER TABLE classroom DROP CONSTRAINT classroom_level_id_fkey;
ALTER TABLE classroom ADD CONSTRAINT classroom_level_id_fkey
  FOREIGN KEY (level_id) REFERENCES level(id) ON DELETE RESTRICT;

-- subject_component → subject : CASCADE → RESTRICT
ALTER TABLE subject_component DROP CONSTRAINT subject_component_subject_id_fkey;
ALTER TABLE subject_component ADD CONSTRAINT subject_component_subject_id_fkey
  FOREIGN KEY (subject_id) REFERENCES subject(id) ON DELETE RESTRICT;

-- teacher_assignment → user : CASCADE → RESTRICT
ALTER TABLE teacher_assignment DROP CONSTRAINT teacher_assignment_user_id_fkey;
ALTER TABLE teacher_assignment ADD CONSTRAINT teacher_assignment_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE RESTRICT;

-- config_subject → pedagogical_config : CASCADE → RESTRICT
ALTER TABLE config_subject DROP CONSTRAINT config_subject_config_id_fkey;
ALTER TABLE config_subject ADD CONSTRAINT config_subject_config_id_fkey
  FOREIGN KEY (config_id) REFERENCES pedagogical_config(id) ON DELETE RESTRICT;

-- config_component → config_subject : CASCADE → RESTRICT
ALTER TABLE config_component DROP CONSTRAINT config_component_config_subject_id_fkey;
ALTER TABLE config_component ADD CONSTRAINT config_component_config_subject_id_fkey
  FOREIGN KEY (config_subject_id) REFERENCES config_subject(id) ON DELETE RESTRICT;

-- academic_period → academic_year : CASCADE → RESTRICT
ALTER TABLE academic_period DROP CONSTRAINT academic_period_academic_year_id_fkey;
ALTER TABLE academic_period ADD CONSTRAINT academic_period_academic_year_id_fkey
  FOREIGN KEY (academic_year_id) REFERENCES academic_year(id) ON DELETE RESTRICT;
```

#### 4.3.5 CHECK constraints manquantes sur tables existantes

```sql
-- academic_year
ALTER TABLE academic_year ADD CONSTRAINT ck_ay_dates CHECK (start_date < end_date);

-- academic_period
ALTER TABLE academic_period ADD CONSTRAINT ck_ap_dates CHECK (start_date < end_date);
ALTER TABLE academic_period ADD CONSTRAINT ck_ap_sort CHECK (sort_order > 0);

-- school (delete policy)
-- Vérifier qu'aucune FK n'est CASCADE vers school. Si oui, les passer en RESTRICT.
```

#### 4.3.6 Données de fondation (peuplement simple)

```sql
-- P1 : classroom.school_id dénormalisé depuis level.school_id
UPDATE classroom c
SET school_id = l.school_id
FROM level l
WHERE c.level_id = l.id;
ALTER TABLE classroom ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE classroom ADD CONSTRAINT classroom_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES school(id) ON DELETE RESTRICT;

-- P2 : enrollment.school_id dénormalisé depuis student.school_id
UPDATE enrollment e
SET school_id = s.school_id
FROM student s
WHERE e.student_id = s.id;
ALTER TABLE enrollment ALTER COLUMN school_id SET NOT NULL;

-- P3 : pedagogical_config.general_average_policy depuis calculation_policy
UPDATE pedagogical_config
SET general_average_policy = calculation_policy::text::aggregation_policy;

-- P4 : user.platform_role initial
-- L'unique utilisateur (admin@danielou.ci) a role='admin' (app_role)
-- Il devient super_admin au niveau plateforme
UPDATE "user" SET platform_role = 'super_admin' WHERE role = 'admin';
UPDATE "user" SET platform_role = 'none' WHERE role != 'admin' OR role IS NULL;
```

### 4.4 Vérification M1

```sql
-- V1 : Nouvelles tables créées
SELECT count(*) AS new_tables FROM information_schema.tables
WHERE table_name IN ('school_membership','classroom_assignment','annual_result','report_card_component_item');
-- Attendu : 4

-- V2 : Nouveaux enums créés
SELECT count(*) AS new_enums FROM pg_type
WHERE typname IN ('school_role','platform_role','classroom_assignment_status',
  'assessment_status','teacher_assignment_type','aggregation_policy');
-- Attendu : 6

-- V3 : enrollment_status mis à jour
SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'enrollment_status' ORDER BY enumsortorder;
-- Attendu : active, completed, transferred_out, withdrawn, cancelled

-- V4 : classroom.school_id peuplé
SELECT count(*) AS classroom_without_school FROM classroom WHERE school_id IS NULL;
-- Attendu : 0

-- V5 : enrollment.school_id peuplé
SELECT count(*) AS enrollment_without_school FROM enrollment WHERE school_id IS NULL;
-- Attendu : 0

-- V6 : pedagogical_config.general_average_policy peuplé
SELECT count(*) AS config_without_policy FROM pedagogical_config WHERE general_average_policy IS NULL;
-- Attendu : 0 (mais table vide actuellement)

-- V7 : user.platform_role assigné
SELECT count(*) AS user_without_platform_role FROM "user" WHERE platform_role IS NULL;
-- Attendu : 0

-- V8 : Aucun CASCADE destructeur restant sur les tables protégées
SELECT tc.constraint_name, tc.table_name, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE rc.delete_rule = 'CASCADE'
AND tc.table_name IN ('enrollment','grade','assessment','classroom',
  'subject_component','teacher_assignment','config_subject','config_component','academic_period');
-- Attendu : 0 lignes (sauf report_card_item → report_card, report_card_component_item → report_card_item, account → user, session → user)

-- V9 : Toutes les CHECK constraints en place
SELECT count(*) AS check_count FROM information_schema.table_constraints
WHERE constraint_type = 'CHECK'
AND table_schema = 'public'
AND table_name NOT LIKE 'pg%';
-- Attendu : ≥ 22
```

### 4.5 Rollback M1

```sql
-- Inverser les FK RESTRICT→CASCADE
-- Supprimer les CHECK ajoutés
-- Supprimer les colonnes ajoutées
-- DROP TABLE des 4 nouvelles tables
-- DROP TYPE des 6 nouveaux enums
-- Renommer enrollment_status 'transferred_out' → 'transferred'
```

### 4.6 Critères de sortie M1

- [ ] 4 nouvelles tables créées avec toutes leurs contraintes et index
- [ ] 6 nouveaux enums créés
- [ ] `enrollment_status.transferred` renommé en `transferred_out`
- [ ] Toutes les colonnes EXPAND ajoutées
- [ ] Toutes les CHECK constraints ajoutées (22+)
- [ ] Toutes les FK CASCADE→RESTRICT converties
- [ ] `classroom.school_id` peuplé et NOT NULL
- [ ] `enrollment.school_id` peuplé et NOT NULL
- [ ] `pedagogical_config.general_average_policy` peuplé
- [ ] `user.platform_role` assigné pour tous les utilisateurs
- [ ] 0 données métier corrompues

---

## 5. Phase M2 : Enrollment + ClassroomAssignment

### 5.1 Objectif

Migrer `enrollment.classroom_id` vers la nouvelle table `classroom_assignment`. L'inscription (enrollment) ne contient plus directement la classe ; l'affectation est désormais temporelle via `classroom_assignment`.

### 5.2 Tables affectées

- `enrollment` (source : `classroom_id`)
- `classroom_assignment` (cible : nouveau)

### 5.3 Migration des données

```sql
BEGIN;

-- M2.1 : Pour chaque enrollment avec classroom_id, créer un classroom_assignment
INSERT INTO classroom_assignment (
  id, enrollment_id, classroom_id, start_date, end_date, status, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  e.id,
  e.classroom_id,
  COALESCE(e.created_at::date, ay.start_date),
  NULL,  -- end_date NULL = toujours actif
  'active'::classroom_assignment_status,
  e.created_at,
  e.updated_at
FROM enrollment e
JOIN academic_year ay ON e.academic_year_id = ay.id
WHERE e.classroom_id IS NOT NULL;

COMMIT;
```

### 5.4 Vérification M2

```sql
-- V1 : Nombre de classroom_assignment créés = nombre d'enrollments avec classroom_id
SELECT
  (SELECT count(*) FROM enrollment WHERE classroom_id IS NOT NULL) AS source_count,
  (SELECT count(*) FROM classroom_assignment) AS target_count;
-- Attendu : source_count = target_count

-- V2 : Aucun enrollment orphelin (classroom_id pointe vers une classroom existante)
SELECT count(*) AS orphaned FROM enrollment e
LEFT JOIN classroom c ON e.classroom_id = c.id
WHERE e.classroom_id IS NOT NULL AND c.id IS NULL;
-- Attendu : 0

-- V3 : Chaque classroom_assignment pointe vers un enrollment valide
SELECT count(*) AS orphans FROM classroom_assignment ca
LEFT JOIN enrollment e ON ca.enrollment_id = e.id
WHERE e.id IS NULL;
-- Attendu : 0

-- V4 : Un seul classroom_assignment actif par enrollment
SELECT ca.enrollment_id, count(*) AS active_count
FROM classroom_assignment ca
WHERE ca.status = 'active'
GROUP BY ca.enrollment_id
HAVING count(*) > 1;
-- Attendu : 0 lignes

-- V5 : start_date <= année start si applicable
SELECT count(*) AS date_issues FROM classroom_assignment ca
JOIN enrollment e ON ca.enrollment_id = e.id
JOIN academic_year ay ON e.academic_year_id = ay.id
WHERE ca.start_date < ay.start_date;
-- Attendu : 0 (tolérance si created_at avant start_date)
```

### 5.5 Rollback M2

```sql
DELETE FROM classroom_assignment;
```

La table `enrollment.classroom_id` est toujours présente, donc le système peut revenir à l'ancien comportement.

### 5.6 Critères de sortie M2

- [ ] `source_count = target_count` — 100% des enrollments migrés
- [ ] 0 enrollment orphelin
- [ ] 0 classroom_assignment orphelin
- [ ] Maximum 1 classroom_assignment actif par enrollment
- [ ] Code applicatif basculé vers `classroom_assignment` pour la résolution de classe
- [ ] Tests passés

**PRÉREQUIS pour CONTRACT (M7)** : Tous les critères ci-dessus validés. `enrollment.classroom_id` ne sera supprimé qu'en M7.

---

## 6. Phase M3 : Grade migration — student_id → enrollment_id

### 6.1 Objectif

Remplacer `grade.student_id` par `grade.enrollment_id`. La note est désormais liée à une inscription (enrollment) et non plus directement à un élève (student).

### 6.2 Risque CRITIQUE — Ambiguïté multi-enrollments

**Scénario** : Un élève possède plusieurs enrollments actifs dans la même année scolaire. Dans ce cas, la résolution `student_id + assessment → enrollment` est ambiguë.

**Règle absolue** : Si ambiguïté détectée → **STOP** et rapporter. Ne jamais deviner.

### 6.3 Tables affectées

- `grade` (source : `student_id`, cible : `enrollment_id`)

### 6.4 Logique de résolution

```sql
-- M3.1 : Détection préalable d'ambiguïté
-- Pour chaque (student_id, assessment_id), compter les candidats enrollment
WITH grade_candidates AS (
  SELECT
    g.id AS grade_id,
    g.student_id,
    g.assessment_id,
    e.id AS enrollment_id,
    e.academic_year_id,
    a.classroom_id,
    e.status AS enrollment_status,
    ROW_NUMBER() OVER (
      PARTITION BY g.id
      ORDER BY e.status DESC  -- 'active' en premier
    ) AS candidate_rank
  FROM grade g
  JOIN assessment a ON g.assessment_id = a.id
  JOIN classroom c ON a.classroom_id = c.id
  JOIN enrollment e ON g.student_id = e.student_id
    AND e.academic_year_id = c.academic_year_id
  WHERE e.status IN ('active', 'completed')
)
SELECT
  grade_id,
  student_id,
  assessment_id,
  count(*) AS candidate_count
FROM grade_candidates
GROUP BY grade_id, student_id, assessment_id
HAVING count(*) > 1;
```

**Si cette requête retourne des lignes** : STOP. Générer un rapport d'ambiguïté avec les UUIDs concernés. L'opérateur devra résoudre manuellement.

### 6.5 Migration des données

```sql
-- M3.2 : Résolution univoque (0 ambiguïté détectée)
BEGIN;

UPDATE grade g
SET enrollment_id = (
  SELECT e.id
  FROM assessment a
  JOIN classroom c ON a.classroom_id = c.id
  JOIN enrollment e ON g.student_id = e.student_id
    AND e.academic_year_id = c.academic_year_id
  WHERE a.id = g.assessment_id
    AND e.status IN ('active', 'completed')
  LIMIT 1
)
WHERE g.enrollment_id IS NULL
  AND g.student_id IS NOT NULL;

COMMIT;
```

### 6.6 Vérification M3

```sql
-- V1 : Toutes les grades ont un enrollment_id résolu
SELECT count(*) AS unresolved_grades
FROM grade
WHERE enrollment_id IS NULL AND student_id IS NOT NULL;
-- Attendu : 0

-- V2 : Cohérence croisée — enrollment.student_id = grade.student_id
SELECT count(*) AS mismatched FROM grade g
JOIN enrollment e ON g.enrollment_id = e.id
WHERE g.student_id != e.student_id;
-- Attendu : 0

-- V3 : Cohérence année — enrollment.academic_year = assessment classroom year
SELECT count(*) AS year_mismatch FROM grade g
JOIN enrollment e ON g.enrollment_id = e.id
JOIN assessment a ON g.assessment_id = a.id
JOIN classroom c ON a.classroom_id = c.id
WHERE e.academic_year_id != c.academic_year_id;
-- Attendu : 0

-- V4 : Aucune duplication (enrollment_id, assessment_id) qui violerait la future UNIQUE
SELECT g.assessment_id, g.enrollment_id, count(*) AS dup_count
FROM grade g
WHERE g.enrollment_id IS NOT NULL
GROUP BY g.assessment_id, g.enrollment_id
HAVING count(*) > 1;
-- Attendu : 0
```

### 6.7 Rollback M3

```sql
UPDATE grade SET enrollment_id = NULL;
```

### 6.8 Critères de sortie M3

- [ ] 0 grade avec ambiguïté (rapport généré si >0)
- [ ] 100% des grades ont `enrollment_id` peuplé
- [ ] Cohérence `grade.student_id = enrollment.student_id` vérifiée
- [ ] Cohérence année scolaire vérifiée
- [ ] 0 duplication future sur `(assessment_id, enrollment_id)`
- [ ] Code applicatif basculé vers `enrollment_id`
- [ ] Tests passés

**PRÉREQUIS pour CONTRACT (M7)** : Tous les critères ci-dessus validés.

---

## 7. Phase M4 : Assessment migration — subject_id → config_subject_id

### 7.1 Objectif

Remplacer `assessment.subject_id` par `assessment.config_subject_id` et ajouter `assessment.config_component_id`. L'évaluation est désormais liée à la configuration pédagogique (config_subject) et non plus directement au catalogue (subject).

### 7.2 Risque CRITIQUE — Ambiguïté multi-config

**Scénario** : Pour un même `subject_id` + `classroom.level_id` + `academic_year_id`, il existe zéro ou plusieurs `config_subject` candidats. Zéro = bloquant. Plusieurs = ambigu.

**Règle absolue** : Si 0 candidat ou >1 candidat actif → **STOP** et rapporter. Ne jamais deviner.

### 7.3 Tables affectées

- `assessment` (source : `subject_id`, cible : `config_subject_id`, `config_component_id`)

### 7.4 Logique de résolution

```sql
-- M4.1 : Compter les candidats config_subject par assessment
WITH assessment_candidates AS (
  SELECT
    a.id AS assessment_id,
    a.subject_id,
    cs.id AS config_subject_id,
    pc.id AS pedagogical_config_id,
    pc.status AS config_status,
    ROW_NUMBER() OVER (
      PARTITION BY a.id
      ORDER BY
        CASE WHEN pc.status = 'active' THEN 0 ELSE 1 END,
        pc.version DESC
    ) AS candidate_rank
  FROM assessment a
  JOIN classroom c ON a.classroom_id = c.id
  JOIN level l ON c.level_id = l.id
  JOIN academic_year ay ON c.academic_year_id = ay.id
  JOIN pedagogical_config pc
    ON pc.level_id = l.id AND pc.academic_year_id = ay.id
  JOIN config_subject cs
    ON cs.config_id = pc.id AND cs.subject_id = a.subject_id
)
SELECT
  assessment_id,
  subject_id,
  count(*) AS candidate_count,
  count(*) FILTER (WHERE config_status = 'active') AS active_candidate_count
FROM assessment_candidates
GROUP BY assessment_id, subject_id
HAVING count(*) FILTER (WHERE config_status = 'active') != 1;
```

**Résultats possibles** :
- `active_candidate_count = 0` : **BLOQUANT** — aucune config active pour ce sujet/niveau/année
- `active_candidate_count > 1` : **BLOQUANT** — plusieurs configs actives (ne devrait pas arriver grâce à l'unique partiel, mais possible si status non encore fixé)
- `active_candidate_count = 1` mais `candidate_count > 1` : **OK** — on prend l'active

### 7.5 Migration des données

```sql
-- M4.2 : Résolution univoque (0 ambiguïté détectée)
BEGIN;

UPDATE assessment a
SET config_subject_id = (
  SELECT cs.id
  FROM classroom c
  JOIN level l ON c.level_id = l.id
  JOIN academic_year ay ON c.academic_year_id = ay.id
  JOIN pedagogical_config pc
    ON pc.level_id = l.id AND pc.academic_year_id = ay.id AND pc.status = 'active'
  JOIN config_subject cs
    ON cs.config_id = pc.id AND cs.subject_id = a.subject_id
  WHERE c.id = a.classroom_id
  LIMIT 1
)
WHERE a.config_subject_id IS NULL;

COMMIT;
```

### 7.6 Vérification M4

```sql
-- V1 : Toutes les assessments ont un config_subject_id résolu
SELECT count(*) AS unresolved_assessments
FROM assessment
WHERE config_subject_id IS NULL AND subject_id IS NOT NULL;
-- Attendu : 0

-- V2 : Cohérence sujet — config_subject.subject_id = assessment.subject_id
SELECT count(*) AS subject_mismatch FROM assessment a
JOIN config_subject cs ON a.config_subject_id = cs.id
WHERE a.subject_id != cs.subject_id;
-- Attendu : 0

-- V3 : Cohérence école — pas de cross-school
SELECT count(*) AS cross_school FROM assessment a
JOIN classroom c ON a.classroom_id = c.id
JOIN config_subject cs ON a.config_subject_id = cs.id
JOIN pedagogical_config pc ON cs.config_id = pc.id
WHERE c.school_id != pc.school_id;
-- Attendu : 0

-- V4 : Index de couverture
CREATE INDEX IF NOT EXISTS as_config_subject_idx ON assessment(config_subject_id);
```

### 7.7 Rollback M4

```sql
UPDATE assessment SET config_subject_id = NULL, config_component_id = NULL;
```

### 7.8 Critères de sortie M4

- [ ] 0 assessment avec ambiguïté (rapport généré si >0)
- [ ] 0 assessment sans config_subject (rapport si >0)
- [ ] 100% des assessments ont `config_subject_id` peuplé
- [ ] Cohérence `config_subject.subject_id = assessment.subject_id` vérifiée
- [ ] Cohérence cross-school vérifiée
- [ ] Index créé
- [ ] Code applicatif basculé vers `config_subject_id`
- [ ] Tests passés

**PRÉREQUIS pour CONTRACT (M7)** : Tous les critères ci-dessus validés.

---

## 8. Phase M5 : Subject/Component catalog cleanup

### 8.1 Objectif

Migrer les règles pédagogiques actuellement stockées dans `subject` et `subject_component` vers `config_subject` et `config_component`. Les tables `subject` et `subject_component` deviennent des catalogues purs.

### 8.2 Tables affectées

- `subject` (source de : coefficient, default_scale, is_optional, include_in_average, include_in_ranking, include_in_decision)
- `config_subject` (cible : ces colonnes y sont déjà, sauf is_optional + aggregation_policies ajoutés en M1)
- `subject_component` (source de : coefficient, scale, is_required)
- `config_component` (cible : ces colonnes y sont déjà, sauf assessment_aggregation_policy ajouté en M1)

### 8.3 Logique de migration

**Note** : Les données pédagogiques (`subject.coefficient`, etc.) doivent être copiées dans les `config_subject` correspondants. Si un `config_subject` n'existe pas encore pour un `subject` donné, la migration ne peut pas copier — mais c'est acceptable car les configs seront créées par le service métier.

```sql
-- M5.1 : Copier les règles pédagogiques de subject vers config_subject
-- Uniquement pour les config_subject existants qui ont le même subject_id
UPDATE config_subject cs
SET
  coefficient       = s.coefficient,
  scale             = s.default_scale,
  is_optional       = s.is_optional,
  include_in_average  = s.include_in_average,
  include_in_ranking  = s.include_in_ranking,
  include_in_decision = s.include_in_decision
FROM subject s
WHERE cs.subject_id = s.id;

-- M5.2 : Comparaison old vs new pour vérification
SELECT
  s.id AS subject_id,
  s.code,
  s.coefficient AS old_coeff,
  cs.coefficient AS new_coeff,
  s.default_scale AS old_scale,
  cs.scale AS new_scale,
  s.is_optional AS old_optional,
  cs.is_optional AS new_optional,
  CASE
    WHEN s.coefficient != cs.coefficient THEN 'COEFF_MISMATCH'
    WHEN s.default_scale != cs.scale THEN 'SCALE_MISMATCH'
    WHEN s.is_optional != cs.is_optional THEN 'OPTIONAL_MISMATCH'
    ELSE 'MATCH'
  END AS diff_status
FROM subject s
JOIN config_subject cs ON cs.subject_id = s.id
WHERE s.coefficient != cs.coefficient
   OR s.default_scale != cs.scale
   OR s.is_optional != cs.is_optional;
-- Attendu : 0 lignes (après M5.1)

-- M5.3 : Copier les règles de subject_component vers config_component
UPDATE config_component cc
SET
  coefficient = sc.coefficient,
  scale       = sc.scale,
  is_required = sc.is_required
FROM subject_component sc
WHERE cc.subject_component_id = sc.id;
```

### 8.4 Vérification M5

```sql
-- V1 : Nombre de config_subject avec des valeurs par défaut non mises à jour
-- (ceux qui n'ont pas de correspondance subject existante)
SELECT count(*) AS config_subjects_with_defaults FROM config_subject
WHERE coefficient = 1 AND scale = 20 AND is_optional = false;
-- Si > 0 : vérifier que ce sont des configs sans subject correspondant dans la base

-- V2 : Tous les config_subject avec subject existant ont des valeurs migrées
SELECT count(*) AS unmigrated FROM config_subject cs
JOIN subject s ON cs.subject_id = s.id
WHERE cs.coefficient = 1 AND cs.scale = 20 AND s.coefficient != 1;
-- Attendu : 0

-- V3 : subject conserve toujours ses colonnes (CONTRACT pas encore fait)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'subject'
AND column_name IN ('coefficient','default_scale','is_optional','include_in_average','include_in_ranking','include_in_decision')
ORDER BY ordinal_position;
-- Attendu : 6 colonnes encore présentes
```

### 8.5 Rollback M5

```sql
-- Les colonnes de config_subject/coomponent peuvent être remises à leurs defaults
-- subject et subject_component n'ont pas été modifiées
UPDATE config_subject SET
  coefficient = 1, scale = 20, is_optional = false,
  include_in_average = true, include_in_ranking = true, include_in_decision = true
WHERE subject_id IN (SELECT id FROM subject);
```

### 8.6 Critères de sortie M5

- [ ] Valeurs pédagogiques copiées de `subject` → `config_subject` pour toutes les correspondances existantes
- [ ] Valeurs pédagogiques copiées de `subject_component` → `config_component` pour toutes les correspondances existantes
- [ ] Comparaison old vs new : 0 mismatch
- [ ] Colonnes de `subject` et `subject_component` encore présentes (CONTRACT en M7)
- [ ] Code applicatif basculé pour lire les valeurs depuis `config_subject` / `config_component`
- [ ] Tests passés

**PRÉREQUIS pour CONTRACT (M7)** : Code migré + vérification old/new.

---

## 9. Phase M6 : ReportCard + TeacherAssignment + AuditLog + User

### 9.1 Objectif

Traiter les migrations restantes qui sont plus simples ou plus mécaniques.

### 9.2 Sous-phase M6A : ReportCard

#### Objectif

- Ajouter `pedagogical_config_id`, `validated_at`, `validated_by_user_id`
- Préparer la migration de `promotion_decision` vers `annual_result`
- Préparer le remplacement de `student_id` (dérivable via `enrollment`)
- Préparer le remplacement de `config_version_id` par `pedagogical_config_id`
- Ajouter `config_subject_id` + snapshots à `report_card_item`

#### Tables affectées

- `report_card`, `report_card_item`, `annual_result`

#### Opérations

```sql
-- M6A.1 : Peupler report_card.pedagogical_config_id
-- La config est dérivable via enrollment → classroom → level → academic_year
UPDATE report_card rc
SET pedagogical_config_id = (
  SELECT pc.id
  FROM enrollment e
  JOIN classroom c ON c.id = (
    SELECT ca.classroom_id FROM classroom_assignment ca
    WHERE ca.enrollment_id = e.id AND ca.status = 'active'
    LIMIT 1
  )
  JOIN pedagogical_config pc
    ON pc.level_id = c.level_id
    AND pc.academic_year_id = e.academic_year_id
    AND pc.status = 'active'
  WHERE e.id = rc.enrollment_id
  LIMIT 1
)
WHERE rc.pedagogical_config_id IS NULL;

-- M6A.2 : Migrer promotion_decision vers annual_result
INSERT INTO annual_result (
  id, enrollment_id, pedagogical_config_id,
  promotion_decision, decision_comment, decision_at, decided_by_user_id,
  created_at, updated_at
)
SELECT
  gen_random_uuid(),
  rc.enrollment_id,
  rc.pedagogical_config_id,
  rc.promotion_decision,
  NULL AS decision_comment,
  rc.updated_at AS decision_at,
  rc.published_by AS decided_by_user_id,
  rc.created_at,
  rc.updated_at
FROM report_card rc
WHERE rc.promotion_decision IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM annual_result ar WHERE ar.enrollment_id = rc.enrollment_id
);

-- M6A.3 : Peupler report_card_item.config_subject_id + snapshots
UPDATE report_card_item rci
SET
  config_subject_id = cs.id,
  subject_code = s.code,
  subject_name = s.name,
  scale = cs.scale,
  sort_order = cs.sort_order
FROM subject s
JOIN config_subject cs ON cs.subject_id = s.id
WHERE rci.subject_id = s.id
  AND rci.config_subject_id IS NULL;
```

#### Vérification M6A

```sql
-- V1 : Toutes les report_card avec enrollment ont un pedagogical_config_id
SELECT count(*) AS rc_without_config FROM report_card
WHERE enrollment_id IS NOT NULL AND pedagogical_config_id IS NULL;
-- Attendu : 0

-- V2 : Toutes les promotion_decision migrées vers annual_result
SELECT count(*) AS unmigrated_decisions FROM report_card rc
WHERE rc.promotion_decision IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM annual_result ar WHERE ar.enrollment_id = rc.enrollment_id
);
-- Attendu : 0

-- V3 : report_card_item.config_subject_id peuplé
SELECT count(*) AS rci_without_config FROM report_card_item
WHERE subject_id IS NOT NULL AND config_subject_id IS NULL;
-- Attendu : 0

-- V4 : Snapshots peuplés
SELECT count(*) AS rci_without_snapshots FROM report_card_item
WHERE subject_code IS NULL OR subject_name IS NULL;
-- Attendu : 0

-- V5 : Cohérence report_card.student_id = enrollment.student_id
SELECT count(*) AS rc_student_mismatch FROM report_card rc
JOIN enrollment e ON rc.enrollment_id = e.id
WHERE rc.student_id != e.student_id;
-- Attendu : 0
```

#### Critères de sortie M6A

- [ ] `report_card.pedagogical_config_id` peuplé pour 100% des bulletins avec enrollment
- [ ] `promotion_decision` migré vers `annual_result` (0 décision orpheline)
- [ ] `report_card_item.config_subject_id` + snapshots peuplés
- [ ] Cohérence `student_id` vérifiée
- [ ] Code basculé
- [ ] Tests passés

### 9.3 Sous-phase M6B : TeacherAssignment

#### Objectif

Migrer `teacher_assignment` de `(user_id, subject_id, academic_year_id)` vers `(school_membership_id, config_subject_id, assignment_type, dates, status)`.

#### Tables affectées

- `teacher_assignment`, `school_membership`

#### Opérations

```sql
-- M6B.1 : Créer les school_membership pour les utilisateurs ayant des affectations
INSERT INTO school_membership (
  id, school_id, user_id, role, is_active, created_at, updated_at
)
SELECT DISTINCT
  gen_random_uuid(),
  c.school_id,
  ta.user_id,
  'teacher'::school_role,
  true,
  ta.created_at,
  ta.updated_at
FROM teacher_assignment ta
JOIN classroom c ON ta.classroom_id = c.id
WHERE NOT EXISTS (
  SELECT 1 FROM school_membership sm
  WHERE sm.user_id = ta.user_id AND sm.school_id = c.school_id
);

-- M6B.2 : Peupler teacher_assignment.school_membership_id
UPDATE teacher_assignment ta
SET school_membership_id = (
  SELECT sm.id
  FROM school_membership sm
  JOIN classroom c ON ta.classroom_id = c.id
  WHERE sm.user_id = ta.user_id AND sm.school_id = c.school_id
  LIMIT 1
)
WHERE ta.school_membership_id IS NULL;

-- M6B.3 : Peupler teacher_assignment.config_subject_id
-- Via assessment.subject_id → config_subject
UPDATE teacher_assignment ta
SET config_subject_id = (
  SELECT cs.id
  FROM classroom c
  JOIN level l ON c.level_id = l.id
  JOIN academic_year ay ON ta.academic_year_id = ay.id AND c.academic_year_id = ay.id
  JOIN pedagogical_config pc ON pc.level_id = l.id AND pc.academic_year_id = ay.id AND pc.status = 'active'
  JOIN config_subject cs ON cs.config_id = pc.id AND cs.subject_id = ta.subject_id
  WHERE c.id = ta.classroom_id
  LIMIT 1
)
WHERE ta.config_subject_id IS NULL AND ta.subject_id IS NOT NULL;

-- M6B.4 : Définir assignment_type = 'subject' pour toutes les affectations existantes
-- (pas d'affectation 'homeroom' existante dans les données)
UPDATE teacher_assignment
SET assignment_type = 'subject'
WHERE assignment_type IS NULL;

-- M6B.5 : Définir les dates et le statut
UPDATE teacher_assignment
SET
  start_date = ay.start_date,
  status = 'active'
FROM academic_year ay
WHERE teacher_assignment.academic_year_id = ay.id
  AND teacher_assignment.start_date IS NULL;
```

#### Vérification M6B

```sql
-- V1 : Tous les teacher_assignment ont un school_membership_id
SELECT count(*) AS ta_without_membership FROM teacher_assignment
WHERE school_membership_id IS NULL;
-- Attendu : 0

-- V2 : Tous les teacher_assignment avec subject_id ont un config_subject_id
SELECT count(*) AS ta_without_config_subject FROM teacher_assignment
WHERE subject_id IS NOT NULL AND config_subject_id IS NULL;
-- Attendu : 0

-- V3 : Tous ont un assignment_type
SELECT count(*) AS ta_without_type FROM teacher_assignment
WHERE assignment_type IS NULL;
-- Attendu : 0

-- V4 : Cohérence school_membership → user
SELECT count(*) AS membership_user_mismatch FROM teacher_assignment ta
JOIN school_membership sm ON ta.school_membership_id = sm.id
WHERE ta.user_id != sm.user_id;
-- Attendu : 0

-- V5 : Cohérence config_subject → subject
SELECT count(*) AS config_subject_mismatch FROM teacher_assignment ta
JOIN config_subject cs ON ta.config_subject_id = cs.id
WHERE ta.subject_id != cs.subject_id;
-- Attendu : 0
```

#### Critères de sortie M6B

- [ ] `school_membership` créé pour tous les utilisateurs avec affectations
- [ ] `teacher_assignment.school_membership_id` peuplé à 100%
- [ ] `teacher_assignment.config_subject_id` peuplé à 100% (pour ceux avec subject_id)
- [ ] `assignment_type` défini pour tous
- [ ] Dates et statut initialisés
- [ ] Cohérences vérifiées
- [ ] Code basculé
- [ ] Tests passés

### 9.4 Sous-phase M6C : AuditLog

#### Objectif

Ajouter les nouvelles colonnes (`school_id`, `actor_type`, `actor_identifier`, `user_agent`, `request_id`) et convertir `old_value`/`new_value`/`context` de TEXT vers JSONB.

#### Opérations

```sql
-- M6C.1 : Conversion TEXT → JSONB
-- Créer des colonnes temporaires JSONB
ALTER TABLE audit_log ADD COLUMN old_value_jsonb JSONB NULL;
ALTER TABLE audit_log ADD COLUMN new_value_jsonb JSONB NULL;
ALTER TABLE audit_log ADD COLUMN context_jsonb JSONB NULL;

-- Migrer les données existantes (essaie de parser le TEXT comme JSON)
UPDATE audit_log SET old_value_jsonb = old_value::jsonb WHERE old_value IS NOT NULL AND old_value != '';
UPDATE audit_log SET new_value_jsonb = new_value::jsonb WHERE new_value IS NOT NULL AND new_value != '';
UPDATE audit_log SET context_jsonb = context::jsonb WHERE context IS NOT NULL AND context != '';

-- Les lignes qui échouent le parsing resteront NULL dans les colonnes JSONB
-- (acceptable car la table est actuellement vide)

-- M6C.2 : Peupler actor_type
UPDATE audit_log SET actor_type = 'user' WHERE user_id IS NOT NULL;
UPDATE audit_log SET actor_type = 'system' WHERE user_id IS NULL AND actor_type IS NULL;

-- M6C.3 : Renommer les colonnes (dans CONTRACT M7, pas maintenant)
-- Pour l'instant, les colonnes JSONB coexistent avec les colonnes TEXT
```

#### Vérification M6C

```sql
-- V1 : Conversion réussie
SELECT count(*) AS failed_json_parse FROM audit_log
WHERE (old_value IS NOT NULL AND old_value != '' AND old_value_jsonb IS NULL)
   OR (new_value IS NOT NULL AND new_value != '' AND new_value_jsonb IS NULL);
-- Attendu : 0

-- V2 : actor_type assigné
SELECT count(*) AS al_without_actor FROM audit_log WHERE actor_type IS NULL;
-- Attendu : 0
```

#### Critères de sortie M6C

- [ ] Colonnes JSONB temporaires créées et peuplées
- [ ] `actor_type` assigné pour toutes les lignes
- [ ] 0 échec de parsing JSON
- [ ] Code basculé vers les colonnes JSONB
- [ ] Tests passés

### 9.5 Sous-phase M6D : User

#### Objectif

- Renommer `user.role` (enum `app_role`) en `user.platform_role` (enum `platform_role`)
- Ajouter `username`
- Supprimer l'ancien enum `app_role` (en CONTRACT M7)

#### Opérations

```sql
-- M6D.1 : Le champ platform_role a déjà été ajouté et peuplé en M1
-- Vérifier que tous les utilisateurs ont un platform_role

-- M6D.2 : Renommer app_role → calculation_policy n'est pas nécessaire
-- app_role sera supprimé en M7 quand user.role sera supprimé

-- M6D.3 : Renommer la colonne user.role → user.old_role (préparation au retrait)
ALTER TABLE "user" RENAME COLUMN role TO old_role;

-- M6D.4 : Renommer user.platform_role → user.role
ALTER TABLE "user" RENAME COLUMN platform_role TO role;

-- La colonne role a maintenant le type platform_role au lieu de app_role
-- old_role a le type app_role (ancien)
```

#### Vérification M6D

```sql
-- V1 : user.role est de type platform_role
SELECT data_type, udt_name FROM information_schema.columns
WHERE table_name = 'user' AND column_name = 'role';
-- Attendu : udt_name = 'platform_role'

-- V2 : user.old_role est de type app_role
SELECT data_type, udt_name FROM information_schema.columns
WHERE table_name = 'user' AND column_name = 'old_role';
-- Attendu : udt_name = 'app_role'

-- V3 : Tous les utilisateurs ont un role
SELECT count(*) AS user_without_role FROM "user" WHERE role IS NULL;
-- Attendu : 0

-- V4 : Cohérence des valeurs
SELECT id, name, role, old_role FROM "user";
-- Vérifier que l'admin a role='super_admin' et old_role='admin'
```

#### Critères de sortie M6D

- [ ] `user.role` est de type `platform_role` avec les bonnes valeurs
- [ ] `user.old_role` conserve l'ancien `app_role` (pour rollback)
- [ ] Tous les utilisateurs ont un `platform_role`
- [ ] Code basculé pour utiliser `user.role` comme `platform_role`
- [ ] Tests passés

---

## 10. Phase M7 : CONTRACT

### 10.1 Objectif

Supprimer toutes les colonnes, contraintes, index et enums obsolètes qui ont été remplacés pendant les phases M1-M6.

### 10.2 Prérequis GLOBALS (tous doivent être cochés)

- [ ] **M1** : Toutes les colonnes EXPAND sont en place
- [ ] **M2** : 100% des enrollments migrés vers classroom_assignment, vérifié
- [ ] **M3** : 100% des grades ont enrollment_id, 0 ambiguïté, vérifié
- [ ] **M4** : 100% des assessments ont config_subject_id, 0 ambiguïté, vérifié
- [ ] **M5** : Valeurs pédagogiques migrées vers config_subject/config_component, comparées
- [ ] **M6A** : report_card migré, annual_result peuplé, snapshots en place
- [ ] **M6B** : teacher_assignment migré, school_membership peuplé
- [ ] **M6C** : audit_log colonnes JSONB peuplées
- [ ] **M6D** : user.role renommé en platform_role
- [ ] Le code applicatif ne référence plus aucune colonne obsolète
- [ ] Tous les tests passent
- [ ] Un backup de la base a été fait

### 10.3 Opérations CONTRACT

#### 10.3.1 Colonnes à supprimer

```sql
-- C1 : enrollment.classroom_id
ALTER TABLE enrollment DROP COLUMN IF EXISTS classroom_id;
DROP INDEX IF EXISTS en_classroom_idx;

-- C2 : grade.student_id
ALTER TABLE grade DROP COLUMN IF EXISTS student_id;
DROP INDEX IF EXISTS gr_student_idx;

-- C3 : grade.original_scale
ALTER TABLE grade DROP COLUMN IF EXISTS original_scale;

-- C4 : assessment.subject_id
ALTER TABLE assessment DROP COLUMN IF EXISTS subject_id;
DROP INDEX IF EXISTS as_subject_idx;

-- C5 : report_card.student_id
ALTER TABLE report_card DROP COLUMN IF EXISTS student_id;
DROP INDEX IF EXISTS rc_student_idx;
DROP INDEX IF EXISTS ur_student_period;

-- C6 : report_card.config_version_id
ALTER TABLE report_card DROP COLUMN IF EXISTS config_version_id;

-- C7 : report_card.promotion_decision
ALTER TABLE report_card DROP COLUMN IF EXISTS promotion_decision;

-- C8 : report_card.published_by (sans FK, remplacé par published_by_user_id)
ALTER TABLE report_card DROP COLUMN IF EXISTS published_by;

-- C9 : report_card_item.subject_id
ALTER TABLE report_card_item DROP COLUMN IF EXISTS subject_id;
DROP INDEX IF EXISTS uri_rc_subject;

-- C10 : subject.coefficient
ALTER TABLE "subject" DROP COLUMN IF EXISTS coefficient;

-- C11 : subject.default_scale
ALTER TABLE "subject" DROP COLUMN IF EXISTS default_scale;

-- C12 : subject.is_optional
ALTER TABLE "subject" DROP COLUMN IF EXISTS is_optional;

-- C13 : subject.include_in_average
ALTER TABLE "subject" DROP COLUMN IF EXISTS include_in_average;

-- C14 : subject.include_in_ranking
ALTER TABLE "subject" DROP COLUMN IF EXISTS include_in_ranking;

-- C15 : subject.include_in_decision
ALTER TABLE "subject" DROP COLUMN IF EXISTS include_in_decision;

-- C16 : subject_component.coefficient
ALTER TABLE subject_component DROP COLUMN IF EXISTS coefficient;

-- C17 : subject_component.scale
ALTER TABLE subject_component DROP COLUMN IF EXISTS scale;

-- C18 : subject_component.is_required
ALTER TABLE subject_component DROP COLUMN IF EXISTS is_required;

-- C19 : teacher_assignment.user_id
ALTER TABLE teacher_assignment DROP COLUMN IF EXISTS user_id;

-- C20 : teacher_assignment.subject_id
ALTER TABLE teacher_assignment DROP COLUMN IF EXISTS subject_id;

-- C21 : teacher_assignment.academic_year_id
ALTER TABLE teacher_assignment DROP COLUMN IF EXISTS academic_year_id;

-- C22 : user.old_role
ALTER TABLE "user" DROP COLUMN IF EXISTS old_role;

-- C23 : audit_log.old_value (TEXT)
ALTER TABLE audit_log DROP COLUMN IF EXISTS old_value;

-- C24 : audit_log.new_value (TEXT)
ALTER TABLE audit_log DROP COLUMN IF EXISTS new_value;

-- C25 : audit_log.context (TEXT)
ALTER TABLE audit_log DROP COLUMN IF EXISTS context;

-- C26 : audit_log.old_value_jsonb → renommer en old_value
ALTER TABLE audit_log RENAME COLUMN old_value_jsonb TO old_value;
ALTER TABLE audit_log RENAME COLUMN new_value_jsonb TO new_value;
ALTER TABLE audit_log RENAME COLUMN context_jsonb TO context;
```

#### 10.3.2 Enums à supprimer

```sql
-- C27 : app_role (remplacé par platform_role)
DROP TYPE IF EXISTS app_role;

-- C28 : calculation_policy (remplacé par aggregation_policy)
-- D'abord retirer la colonne qui l'utilise
ALTER TABLE pedagogical_config DROP COLUMN IF EXISTS calculation_policy;
DROP TYPE IF EXISTS calculation_policy;
```

#### 10.3.3 Contraintes UNIQUE à recréer

```sql
-- grade : ancien UNIQUE(assessment_id, student_id) → UNIQUE(assessment_id, enrollment_id)
DROP INDEX IF EXISTS ug_assessment_student;
CREATE UNIQUE INDEX uga_assessment_enrollment ON grade(assessment_id, enrollment_id);

-- report_card : ancien UNIQUE(student_id, academic_period_id) → UNIQUE(enrollment_id, academic_period_id)
-- (déjà en place si créé en M1, sinon le créer)
CREATE UNIQUE INDEX IF NOT EXISTS urc_enrollment_period
  ON report_card(enrollment_id, academic_period_id);

-- report_card_item : ancien UNIQUE(report_card_id, subject_id) → UNIQUE(report_card_id, config_subject_id)
DROP INDEX IF EXISTS uri_rc_subject;
CREATE UNIQUE INDEX urci_rc_config_subject
  ON report_card_item(report_card_id, config_subject_id);

-- teacher_assignment : ancien UNIQUE(user_id, classroom_id, subject_id, academic_year_id)
-- → new index on school_membership_id
DROP INDEX IF EXISTS uta_user_class_subject_year;
CREATE INDEX ita_membership_idx ON teacher_assignment(school_membership_id);
```

#### 10.3.4 Index à supprimer

```sql
DROP INDEX IF EXISTS as_subject_idx;  -- assessment.subject_id
DROP INDEX IF EXISTS gr_student_idx;  -- grade.student_id
DROP INDEX IF EXISTS en_classroom_idx;  -- enrollment.classroom_id
```

#### 10.3.5 FK à ajouter/post-validation

```sql
-- grade.enrollment_id → enrollment.id (nullable→NOT NULL après M3 vérifié)
ALTER TABLE grade ALTER COLUMN enrollment_id SET NOT NULL;
ALTER TABLE grade ADD CONSTRAINT grade_enrollment_id_fkey
  FOREIGN KEY (enrollment_id) REFERENCES enrollment(id) ON DELETE RESTRICT;

-- assessment.config_subject_id → config_subject.id
ALTER TABLE assessment ALTER COLUMN config_subject_id SET NOT NULL;
ALTER TABLE assessment ADD CONSTRAINT assessment_config_subject_id_fkey
  FOREIGN KEY (config_subject_id) REFERENCES config_subject(id) ON DELETE RESTRICT;

-- assessment.config_component_id → config_component.id
ALTER TABLE assessment ADD CONSTRAINT assessment_config_component_id_fkey
  FOREIGN KEY (config_component_id) REFERENCES config_component(id) ON DELETE RESTRICT;

-- assessment.created_by_user_id → user.id
ALTER TABLE assessment ADD CONSTRAINT assessment_created_by_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES "user"(id) ON DELETE SET NULL;

-- grade.created_by_user_id → user.id
ALTER TABLE grade ADD CONSTRAINT grade_created_by_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES "user"(id) ON DELETE SET NULL;

-- grade.updated_by_user_id → user.id
ALTER TABLE grade ADD CONSTRAINT grade_updated_by_fkey
  FOREIGN KEY (updated_by_user_id) REFERENCES "user"(id) ON DELETE SET NULL;

-- teacher_assignment.school_membership_id → school_membership.id
ALTER TABLE teacher_assignment ALTER COLUMN school_membership_id SET NOT NULL;
ALTER TABLE teacher_assignment ADD CONSTRAINT ta_school_membership_id_fkey
  FOREIGN KEY (school_membership_id) REFERENCES school_membership(id) ON DELETE RESTRICT;

-- teacher_assignment.config_subject_id → config_subject.id (nullable)
ALTER TABLE teacher_assignment ADD CONSTRAINT ta_config_subject_id_fkey
  FOREIGN KEY (config_subject_id) REFERENCES config_subject(id) ON DELETE RESTRICT;

-- report_card.pedagogical_config_id → pedagogical_config.id
ALTER TABLE report_card ADD CONSTRAINT rc_pedagogical_config_id_fkey
  FOREIGN KEY (pedagogical_config_id) REFERENCES pedagogical_config(id) ON DELETE RESTRICT;

-- report_card.validated_by_user_id → user.id
ALTER TABLE report_card ADD CONSTRAINT rc_validated_by_fkey
  FOREIGN KEY (validated_by_user_id) REFERENCES "user"(id) ON DELETE SET NULL;

-- user.username UNIQUE
CREATE UNIQUE INDEX IF NOT EXISTS user_username_unique ON "user"(username) WHERE username IS NOT NULL;

-- audit_log.user_id → user.id (ajout de FK manquante)
ALTER TABLE audit_log ADD CONSTRAINT audit_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL;

-- audit_log CHECK actor/user cohérence
ALTER TABLE audit_log ADD CONSTRAINT ck_al_actor_user
CHECK (
  (actor_type = 'user' AND user_id IS NOT NULL)
  OR
  (actor_type IN ('ghost','system') AND user_id IS NULL)
);
```

#### 10.3.6 Contraintes teacher_assignment

```sql
-- Status CHECK
ALTER TABLE teacher_assignment ADD CONSTRAINT ck_ta_status
CHECK (status IN ('active','completed','cancelled'));

-- Dates CHECK
ALTER TABLE teacher_assignment ADD CONSTRAINT ck_ta_dates
CHECK (end_date IS NULL OR start_date IS NULL OR start_date <= end_date);

-- Homeroom/Subject coherence CHECK
ALTER TABLE teacher_assignment ADD CONSTRAINT ck_ta_assignment_type
CHECK (
  (assignment_type = 'homeroom' AND config_subject_id IS NULL)
  OR
  (assignment_type = 'subject' AND config_subject_id IS NOT NULL)
);
```

#### 10.3.7 Trigger updated_at

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer sur toutes les tables avec updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name NOT IN ('account','session')  -- gérées par Better Auth
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = tbl AND column_name = 'updated_at'
    )
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()', tbl
    );
  END LOOP;
END;
$$;
```

### 10.4 Vérification M7

```sql
-- V1 : Aucune colonne CONTRACT résiduelle
-- Vérifier que toutes les colonnes marquées « RETIRER » sont absentes
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema = 'public'
AND (
  (table_name = 'enrollment' AND column_name = 'classroom_id')
  OR (table_name = 'grade' AND column_name IN ('student_id','original_scale'))
  OR (table_name = 'assessment' AND column_name = 'subject_id')
  OR (table_name = 'report_card' AND column_name IN ('student_id','config_version_id','promotion_decision','published_by'))
  OR (table_name = 'report_card_item' AND column_name = 'subject_id')
  OR (table_name = 'subject' AND column_name IN ('coefficient','default_scale','is_optional','include_in_average','include_in_ranking','include_in_decision'))
  OR (table_name = 'subject_component' AND column_name IN ('coefficient','scale','is_required'))
  OR (table_name = 'teacher_assignment' AND column_name IN ('user_id','subject_id','academic_year_id'))
  OR (table_name = 'user' AND column_name = 'old_role')
  OR (table_name = 'audit_log' AND column_name IN ('old_value','new_value','context'))
);
-- Attendu : 0 lignes

-- V2 : Enums obsolètes supprimés
SELECT typname FROM pg_type WHERE typname IN ('app_role','calculation_policy');
-- Attendu : 0 lignes

-- V3 : Enums cibles présents
SELECT typname FROM pg_type
WHERE typname IN (
  'academic_year_status','period_status','enrollment_status',
  'classroom_assignment_status','grade_status','assessment_status',
  'report_card_status','config_status','rounding_strategy',
  'promotion_decision','platform_role','school_role',
  'teacher_assignment_type','aggregation_policy'
);
-- Attendu : 14

-- V4 : Nombre de tables
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';
-- Attendu : 26+ (26 métier + Better Auth)

-- V5 : Aucun CASCADE destructeur
SELECT tc.constraint_name, tc.table_name, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE rc.delete_rule = 'CASCADE'
AND tc.table_schema = 'public'
AND tc.table_name NOT IN ('report_card_item','report_card_component_item','account','session');
-- Attendu : 0 lignes

-- V6 : Toutes les CHECK en place
SELECT count(*) FROM information_schema.table_constraints
WHERE constraint_type = 'CHECK' AND table_schema = 'public';
-- Attendu : ≥ 22

-- V7 : Grade UNIQUE sur (assessment_id, enrollment_id)
SELECT indexname FROM pg_indexes
WHERE tablename = 'grade' AND indexname LIKE 'uga_%';
-- Attendu : 1

-- V8 : Trigger updated_at sur toutes les tables
SELECT count(DISTINCT tgname) FROM pg_trigger
WHERE tgname = 'set_updated_at';
-- Attendu : nombre de tables avec updated_at (hors Better Auth)
```

### 10.5 Critères de sortie M7

- [ ] Toutes les colonnes CONTRACT supprimées
- [ ] Tous les enums obsolètes supprimés
- [ ] Toutes les nouvelles FK en place
- [ ] Toutes les contraintes UNIQUE mises à jour
- [ ] Tous les index cibles créés
- [ ] Tous les CASCADE destructeurs éliminés (sauf exceptions documentées)
- [ ] Trigger `updated_at` fonctionnel
- [ ] `drizzle-kit push` ne signale aucune différence
- [ ] Application fonctionne correctement en V2
- [ ] Tous les tests passent

---

## 11. Matrice de vérification

| # | Vérification | Phase | Requête SQL | Attendu | Statut |
|---|-------------|-------|-------------|---------|--------|
| V-01 | Nouvelles tables créées | M1 | `SELECT count(*) FROM information_schema.tables WHERE ...` | 4 | ⬜ |
| V-02 | Nouveaux enums créés | M1 | `SELECT count(*) FROM pg_type WHERE ...` | 6 | ⬜ |
| V-03 | enrollment_status mis à jour | M1 | Enum values query | transferred_out | ⬜ |
| V-04 | classroom.school_id peuplé | M1 | `SELECT count(*) WHERE school_id IS NULL` | 0 | ⬜ |
| V-05 | enrollment.school_id peuplé | M1 | `SELECT count(*) WHERE school_id IS NULL` | 0 | ⬜ |
| V-06 | user.platform_role assigné | M1 | `SELECT count(*) WHERE platform_role IS NULL` | 0 | ⬜ |
| V-07 | CASCADE→RESTRICT | M1 | CASCADE query sur tables protégées | 0 | ⬜ |
| V-08 | CHECK constraints | M1 | Count CHECK constraints | ≥22 | ⬜ |
| V-09 | classroom_assignment count | M2 | `source_count = target_count` | Égal | ⬜ |
| V-10 | classroom_assignment orphelins | M2 | LEFT JOIN check | 0 | ⬜ |
| V-11 | grade enrollment_id résolu | M3 | `WHERE enrollment_id IS NULL` | 0 | ⬜ |
| V-12 | grade ambiguïté | M3 | Ambiguity detection | 0 | ⬜ |
| V-13 | grade cohérence student | M3 | `grade.student_id != enrollment.student_id` | 0 | ⬜ |
| V-14 | assessment config_subject_id | M4 | `WHERE config_subject_id IS NULL` | 0 | ⬜ |
| V-15 | assessment ambiguïté | M4 | Ambiguity detection | 0 | ⬜ |
| V-16 | subject→config_subject migration | M5 | Comparaison old/new | 0 mismatch | ⬜ |
| V-17 | report_card ped_config_id | M6A | `WHERE pedagogical_config_id IS NULL` | 0 | ⬜ |
| V-18 | annual_result peuplé | M6A | Unmigrated decisions | 0 | ⬜ |
| V-19 | report_card_item snapshots | M6A | `WHERE subject_code IS NULL` | 0 | ⬜ |
| V-20 | teacher_assignment membership | M6B | `WHERE school_membership_id IS NULL` | 0 | ⬜ |
| V-21 | teacher_assignment config | M6B | `WHERE config_subject_id IS NULL` | 0 | ⬜ |
| V-22 | audit_log JSONB | M6C | Failed parse count | 0 | ⬜ |
| V-23 | user.role = platform_role | M6D | Column type check | platform_role | ⬜ |
| V-24 | Colonnes CONTRACT supprimées | M7 | Residual columns | 0 | ⬜ |
| V-25 | Enums obsolètes supprimés | M7 | Enum check | 0 | ⬜ |
| V-26 | Tables totales | M7 | Count tables | 26+ | ⬜ |
| V-27 | CASCADE finaux | M7 | CASCADE query | Exceptions only | ⬜ |
| V-28 | Trigger updated_at | M7 | Trigger count | N tables | ⬜ |

---

## 12. Risques et mitigations

### 12.1 Tableau des risques

| # | Risque | Sévérité | Probabilité | Phase | Mitigation | Plan B |
|---|--------|-----------|-------------|-------|------------|--------|
| R1 | **grade.student_id → enrollment_id : ambiguïté multi-enrollments** | 🔴 Critique | Faible (0 données) | M3 | Détection préalable, rapport d'ambiguïté, STOP si >0 | Résolution manuelle par l'opérateur |
| R2 | **assessment.subject_id → config_subject_id : ambiguïté multi-config** | 🔴 Critique | Faible (0 données) | M4 | Détection préalable, STOP si 0 ou >1 candidat actif | Créer les configs manquantes avant migration |
| R3 | **Renommage enum enrollment_status : `transferred` → `transferred_out`** | 🟠 Élevé | Faible | M1 | `ALTER TYPE RENAME VALUE` est idempotent si la valeur n'existe pas | Vérifier les valeurs existantes d'abord |
| R4 | **Conversion audit_log TEXT → JSONB : échec de parsing** | 🟡 Modéré | Faible (0 données) | M6C | Les échecs laissent NULL (acceptable pour historique vide) | Script de reprise manuelle |
| R5 | **FK RESTRICT bloque des suppressions légales** | 🟡 Modéré | Moyen | M1 | C'est intentionnel — l'application doit archiver au lieu de supprimer | Ajouter des endpoints d'archivage |
| R6 | **user.role renommé : code existant casse** | 🟠 Élevé | Moyen | M6D | Renommage atomique en 2 étapes (old_role temporaire) | Revenir en arrière avec `ALTER TABLE RENAME COLUMN` |
| R7 | **pédagogical_config.general_average_policy : type enum différent** | 🟡 Modéré | Faible | M1 | `aggregation_policy` a les mêmes valeurs que `calculation_policy` | Conversion par cast `::text::aggregation_policy` |
| R8 | **school_membership non créé pour les users sans affectation** | 🟢 Faible | Moyen | M6B | Seuls les teachers avec affectations obtiennent un membership | Création manuelle via UI admin |
| R9 | **Concurrence pendant la migration** | 🟡 Modéré | Faible | Toutes | Migration hors ligne (maintenance mode) | Verrous explicites, transactions | 
| R10 | **Drizzle ORM out-of-sync pendant la migration** | 🟡 Modéré | Élevé | Toutes | Mise à jour Drizzle après chaque phase | `drizzle-kit push` après chaque phase |

### 12.2 Détail des risques CRITIQUES

#### R1 : Ambiguïté grade.student_id → enrollment_id

**Contexte** : En V1, une note est liée à un `student_id` + `assessment_id`. En V2, elle est liée à un `enrollment_id`. Si un étudiant a plusieurs enrollments dans la même année scolaire (ce qui ne devrait pas arriver grâce à `UNIQUE(student_id, academic_year_id)`), la résolution est ambiguë.

**Détection** :

```sql
-- Vérifier qu'aucun étudiant n'a plusieurs enrollments par année
SELECT student_id, academic_year_id, count(*)
FROM enrollment
GROUP BY student_id, academic_year_id
HAVING count(*) > 1;
```

**Atténuation** : La contrainte `UNIQUE(student_id, academic_year_id)` empêche cette situation. Si la contrainte est respectée, la résolution est toujours univoque.

**Action si ambiguïté** : STOP, rapporter, résolution manuelle.

#### R2 : Ambiguïté assessment.subject_id → config_subject_id

**Contexte** : En V1, une évaluation est liée à un `subject_id`. En V2, elle est liée à un `config_subject_id`. La résolution nécessite : `subject_id` + `classroom.level_id` + `academic_year_id` → `config_subject`.

**Détection** :

```sql
-- Vérifier que chaque (subject, level, year) a exactement 1 config active
SELECT s.id AS subject_id, l.id AS level_id, ay.id AS year_id,
  count(*) FILTER (WHERE pc.status = 'active') AS active_configs
FROM subject s
CROSS JOIN level l
CROSS JOIN academic_year ay
LEFT JOIN pedagogical_config pc ON pc.level_id = l.id AND pc.academic_year_id = ay.id
LEFT JOIN config_subject cs ON cs.config_id = pc.id AND cs.subject_id = s.id
WHERE pc.id IS NOT NULL
GROUP BY s.id, l.id, ay.id
HAVING count(*) FILTER (WHERE pc.status = 'active') != 1;
```

**Atténuation** : L'index unique partiel `UNIQUE(level_id, academic_year_id) WHERE status = 'active'` empêche plusieurs configs actives par niveau/année. Mais si aucune config n'existe, la migration est bloquée.

**Action si 0 config** : Créer les configs manquantes via l'UI admin avant de continuer la migration.

---

## 13. Estimation

| Phase | Description | Complexité | Effort estimé | Données | Risque |
|-------|-------------|------------|---------------|---------|--------|
| M1 | Foundations (enums, tables, colonnes, CHECK, FK) | Moyenne | 2-3h | 0 métier | Faible |
| M2 | Enrollment → ClassroomAssignment | Faible | 30min | 0 enrollment | Faible |
| M3 | Grade student_id → enrollment_id | **Critique** | 1-2h | 0 grade | Faible (0 données) mais logique complexe |
| M4 | Assessment subject_id → config_subject_id | **Critique** | 1-2h | 0 assessment | Faible (0 données) mais logique complexe |
| M5 | Subject/Component catalog cleanup | Faible | 1h | 12 subjects, 0 components | Faible |
| M6A | ReportCard + AnnualResult | Moyenne | 1-2h | 0 report_card | Faible |
| M6B | TeacherAssignment + SchoolMembership | Moyenne | 1h | 0 assignment | Faible |
| M6C | AuditLog TEXT→JSONB | Faible | 30min | 0 log | Faible |
| M6D | User role rename | Moyenne | 30min | 1 user | Faible |
| M7 | CONTRACT (suppressions) | Moyenne | 1-2h | — | Moyen (irréversible) |
| **Drizzle sync** | Mise à jour schema Drizzle + tests | Moyenne | 2-3h | — | — |
| **Total** | | | **12-18h** | | |

**Note importante** : L'estimation est favorable car la base contient 0 donnée métier. En production avec des données réelles, les phases M3 et M4 pourraient chacune prendre 4-8h supplémentaires pour la vérification et la résolution des ambiguïtés.

---

## Annexe A : Ordre d'exécution recommandé

```
M1  ──── Foundations (tout créer, ne rien détruire)
  │
  ├─ M2 ──── Enrollment → ClassroomAssignment
  │     │
  │     └─ Vérifier → Basculer code
  │
  ├─ M3 ──── Grade student_id → enrollment_id  [CRITIQUE]
  │     │
  │     └─ Vérifier → Basculer code
  │
  ├─ M4 ──── Assessment subject_id → config_subject_id  [CRITIQUE]
  │     │
  │     └─ Vérifier → Basculer code
  │
  ├─ M5 ──── Subject/Component catalog cleanup
  │     │
  │     └─ Vérifier → Basculer code
  │
  ├─ M6A ──── ReportCard + AnnualResult
  ├─ M6B ──── TeacherAssignment + SchoolMembership
  ├─ M6C ──── AuditLog
  ├─ M6D ──── User role
  │
  └─ M7  ──── CONTRACT (tout détruire, en une seule passe)
        │
        └─ Vérification finale → Drizzle sync
```

## Annexe B : Références

- R-V2-00 : Current State Audit (commit `209b077`, tag `pre-v2-migration`)
- R-V2-01 : Target Data Model FINAL — MODEL FREEZE
- Section 41 MISSION : Méthodologie de migration (Expand/Contract)
- ADR-001 : Next.js monolith
- ADR-002 : Neon PostgreSQL
- ADR-003 : No SQLite

---

*R-V2-02 — MIGRATION PLAN — STATUS : COMPLETE — AWAITING EXECUTION*
