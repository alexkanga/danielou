# R-V2-01 — CORRECTION REPORT

**Date** : 2026-08-21  
**Document corrigé** : R-V2-01_TARGET_DATA_MODEL.md (v1) → R-V2-01_TARGET_DATA_MODEL_FINAL.md (v2)  
**Statut** : 22 corrections appliquées

---

## Corrections appliquées

| # | Élément | Ancienne définition | Nouvelle définition | Raison | Impact | Statut |
|---|---------|---------------------|--------------------|--------|--------|--------|
| 1 | `user.username` | Absent du contrat utilisateur | `username TEXT UNIQUE` ajouté à `user` | Login username+password requis par la MISSION | Ajout colonne + index UNIQUE | CORRIGÉ |
| 2 | `username UNIQUE` | Non spécifié | `username TEXT UNIQUE` | Identification métier des comptes | Contrainte DB | CORRIGÉ |
| 3 | Fantomas dans `platform_role` | `platform_role = {ghost, super_admin, none}` | `platform_role = {super_admin, none}` — Fantomas est GhostActor hors DB | Fantomas ne doit jamais dépendre d'une ligne PostgreSQL | Enum réduit à 2 valeurs | CORRIGÉ |
| 4 | `platform_role` valeurs | Contenait `ghost` | Contient uniquement `super_admin`, `none` | Séparation Ghost/Auth | Enum PG modifié | CORRIGÉ |
| 5 | Better Auth figé manuellement | `account` et `session` décrites en détail | Contrat fonctionnel Daniélou seulement ; schéma interne déclaré dynamique pour R-V2-02 | Ne pas inventer le schéma Better Auth | Détail supprimé, reporté à R-V2-02 | CORRIGÉ |
| 6 | Nombre de tables | « 29 tables (+7 nouvelles) » | **26 tables métier/Auth** + tables Better Auth dynamiques | La MISSION explicite 26 tables | Comptage corrigé | CORRIGÉ |
| 7 | Nombre d'enums | « 14 actifs » mais liste incorrecte | **14 actifs** avec `enrollment_status` corrigé, `assessment_status` ajouté, `aggregation_policy` typé | 4 nouveaux + corrections | Liste corrigée | CORRIGÉ |
| 8 | `aggregation_policy` | Absent, `calculation_policy` conservé | Nouvel enum `aggregation_policy = {simple_average, weighted_average, single_grade}` | Remplace `calculation_policy`, utilisé dans `pedagogical_config`, `config_subject`, `config_component` | Nouvel enum PG | CORRIGÉ |
| 9 | `assessment_status` | Absent | Nouvel enum `assessment_status = {draft, open, closed, cancelled}` | Contrôle de cycle de vie des évaluations | Nouvel enum PG | CORRIGÉ |
| 10 | `enrollment_status` | `{active, transferred, withdrawn}` | `{active, completed, withdrawn, transferred_out, cancelled}` | `transferred` → `transferred_out` (sortie hors établissement). Changement de classe interne = `classroom_assignment`, PAS enrollment | Enum PG modifié | CORRIGÉ |
| 11 | Config ACTIVE unique | Règle métier seulement | `UNIQUE(level_id, academic_year_id) WHERE status = 'active'` | Garantie DB d'une seule config active par niveau/année | Index unique partiel | CORRIGÉ |
| 12 | `grade.enrollment_id` FK | Mentionné sans FK explicite | `enrollment_id UUID NOT NULL FK → enrollment.id RESTRICT` | FK explicite avec politique de suppression | FK ajoutée | CORRIGÉ |
| 13 | `teacher_assignment` CHECK | Aucun CHECK | `CHECK(homeroom/subject)` + `CHECK(dates)` + `status TEXT + CHECK` | Cohérence type/affectation et dates | CHECK constraints ajoutées | CORRIGÉ |
| 14 | `student.sort_order` CHECK | `CHECK(sort_order >= 0)` mentionné | Supprimé — `student` n'a pas de `sort_order` | La table `student` n'a jamais eu de colonne `sort_order` dans le schéma V1 ni dans la cible V2 | Erreur supprimée | CORRIGÉ |
| 15 | `audit_log.entity_id` | `entity_id UUID NOT NULL` | `entity_id UUID NULL` | Certaines actions d'audit (ex: login) n'ont pas d'entité ciblée | Nullable | CORRIGÉ |
| 16 | Delete Policy ReportCard | « DRAFT: CASCADE, PUBLISHED: RESTRICT » (dynamique) | CASCADE vers enfants constant ; `published` protégé par **service métier** avant suppression | PostgreSQL ne peut pas changer dynamiquement une FK selon le statut | Explication corrigée | CORRIGÉ |
| 17 | Diagramme relationnel | Incohérent, référençait des colonnes retirées | Diagramme aligné sur le modèle FINAL avec les vraies FK | Cohérence document | Diagramme réécrit | CORRIGÉ |
| 18 | SUPER_ADMIN droits globaux | « tous les droits fonctionnels ADMIN » | Droits scolaires + accès global aux écoles, sans faux `school_membership` | SUPER_ADMIN a les droits scolaires directement via son platform_role | Matrice corrigée | CORRIGÉ |
| 19 | `annual_result.pedagogical_config_id` | Absent | `pedagogical_config_id UUID NOT NULL FK → pedagogical_config.id RESTRICT` | Reproductibilité de la décision annuelle | Colonne + FK ajoutées | CORRIGÉ |
| 20 | `report_card.pedagogical_config_id` | nullable | `pedagogical_config_id UUID NOT NULL` dans la cible finale | Un bulletin est toujours produit avec une configuration pédagogique | NOT NULL dans cible finale | CORRIGÉ |
| 21 | Fantomas dépendance DB | Fantomas = ligne `user` + `platform_role = ghost` | Fantomas = GhostActor hors DB, fonctionne sans PostgreSQL | Exigence non négociable de la MISSION | Architecture séparée | CORRIGÉ |
| 22 | Aucune SQLite | Mentionné mais pas vérifié dans quality gate | Quality gate explicite `[PASS] aucune SQLite` + principes verrouillés | Règle absolue | Quality gate ajouté | CORRIGÉ |

---

## Éléments non corrigés (inapplicables)

Aucun. Les 22 corrections identifiées ont toutes été appliquées.

---

## Contradictions nouvelles identifiées

Aucune contradiction bloquante identifiée lors de la correction.

---

## Verdict

```text
R-V2-01 — TARGET DATA MODEL
STATUS: PASS
MODEL: FROZEN
```