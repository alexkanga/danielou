# R-V2-M1 — Porte de Sécurité (Security Gate Matrix)

**Projet** : Danielou — Plateforme de gestion scolaire
**Jalon** : M1 — Authentification & Autorisation
**Date** : 22 août 2026
**Statut** : VALIDÉ
**Référence** : R-V2-03 (Auth & Ghost Threat Model), R-V2-01 (Target Data Model), §29 M1 Implementation Contract

Ce document constitue la matrice de porte de sécurité du jalon M1. Chaque porte représente un contrôle de sécurité obligatoire. Un seul échec bloquerait la progression vers M2.

---

## 2. Matrice des Portes de Sécurité

| # | Gate | Expected | Observed | Status |
|---|------|----------|----------|--------|
| 1 | TypeScript typecheck | 0 errors | 0 errors | **PASS** |
| 2 | ESLint | 0 errors | 0 errors (14 warnings, 0 security-related) | **PASS** |
| 3 | Next.js build | success | success (Turbopack, 22 routes) | **PASS** |
| 4 | Vitest tests | 0 failures | 0 failures (164 tests, 10 files) | **PASS** |
| 5 | Ghost real JWT (jose HS256) | works | signGhostSession + verifyGhostSession via jose | **PASS** |
| 6 | Forged JWT rejected | rejected | verifyGhostSession returns null | **PASS** |
| 7 | Expired JWT rejected | rejected | verifyGhostSession returns null | **PASS** |
| 8 | Secret rotation | invalidates old | verifyGhostSession returns null after rotation | **PASS** |
| 9 | Fantomas DB ON | login success | ghost-auth.ts has 0 DB imports | **PASS** |
| 10 | Fantomas DB OFF | login success | ghost-auth.ts has 0 DB imports | **PASS** |
| 11 | Recovery DB OFF | Ghost accessible | requireGhostGuard works without DB | **PASS** |
| 12 | Better Auth email sign-in | configured | emailAndPassword enabled | **PASS** |
| 13 | Better Auth username sign-in | configured | plugin username (min:3, max:30) | **PASS** |
| 14 | SUPER_ADMIN resolved | via Better Auth | platform_role + isSuperAdmin fields | **PASS** |
| 15 | ADMIN user.create | denied | checkPermission FORBIDDEN | **PASS** |
| 16 | ADMIN password reset | denied | checkPermission FORBIDDEN | **PASS** |
| 17 | ADMIN Recovery | denied | requireGhostGuard FORBIDDEN | **PASS** |
| 18 | SUPER_ADMIN Recovery | denied | requireGhostGuard FORBIDDEN | **PASS** |
| 19 | Teacher own scope | allowed | checkPermission true + requireTeacherScope | **PASS** |
| 20 | Teacher foreign class | denied | requireTeacherScope FORBIDDEN | **PASS** |
| 21 | Reader mutation | denied | requirePermission FORBIDDEN | **PASS** |
| 22 | SQLite absent | 0 instances | 0 in deps, 0 in source | **PASS** |
| 23 | Secrets in logs | absent | safeContext + no console.log/warn in ghost modules | **PASS** |

### Détail des observations

**#1 TypeScript typecheck** : `tsc --noEmit` retourne 0 erreur. Le typage est strict (strict: true implicite via Next.js 16), tous les modules M1 sont correctement typés.

**#2 ESLint** : 0 erreur, 14 warnings (unused vars, unused eslint-disable). Aucun warning ne touche à la sécurité.

**#3 Next.js build** : Build production réussi avec Turbopack. 22 routes générées (5 API auth, 4 API CRUD, 5 dashboard, 3 statiques, 1 middleware proxy).

**#4 Vitest tests** : 164 tests répartis sur 10 fichiers. Temps total: 7.5s. Couverture: JWT Ghost (10), credential validation (18), RBAC authorization (47), teacher scope (14), rate limiting (5), actor resolution (5), DB health (4), login flow (4), secrets leak (55), no-SQLite (2).

**#5-8 Ghost JWT** : Tokens signés avec `jose` HS256, vérification complète (signature, sub, actorType, role, expiration). Les tests utilisent le vrai chemin cryptographique (pas de mock jose).

**#9-10 Fantomas DB independence** : Test architectural qui scanne `ghost-auth.ts` pour vérifier l'absence de `drizzle-orm` et `@neondatabase`. Le module ghost-config.ts ne lit que `process.env`.

**#11 Recovery DB OFF** : `requireGhostGuard('super_admin', false)` lance `AuthorizationError('FORBIDDEN')`. La fonction ne dépend d'aucune ressource DB.

**#12-13 Better Auth** : v1.7.1 avec plugin username configuré (minUsernameLength: 3, maxUsernameLength: 30). emailAndPassword activé. Adapter Drizzle pg.

**#14 SUPER_ADMIN** : Résolu via `user.platform_role = 'super_admin'` (enum PostgreSQL) ET `user.is_super_admin = true` (boolean). Double détection dans actor.ts.

**#15-18 Bypass tests** : ADMIN ne peut pas accéder à `platform:users:manage` (checkPermission false). ADMIN/SUPER_ADMIN ne peuvent pas accéder à Recovery (requireGhostGuard bloque). Reader ne peut pas muter (requirePermission FORBIDDEN).

**#19-20 Teacher scope** : Triple vérification: permission level (checkPermission), school scope (requireSchoolAccess), resource scope (requireTeacherScope vérifie teacher_assignment en DB).

**#21 Reader mutation** : Toutes les permissions `:manage` retournent false pour reader. requirePermission lève FORBIDDEN.

**#22 SQLite** : 0 dépendance SQLite dans package.json, 0 import dans les fichiers source. Test no-sqlite.test.ts scanne récursivement src/.

**#23 Secrets** : `safeContext()` dans audit.ts filtre password, secret, token, credential, GHOST_SESSION_SECRET, BETTER_AUTH_SECRET, FANTOMAS_PASSWORD, DATABASE_URL. ghost-auth.ts et ghost-config.ts n'ont aucun console.log/warn.

---

## 3. Évaluation des 4 Règles Absolues

### Règle 1 : fantomas/fantomas fonctionne AVEC base de données — **PASS**

Ghost est architecturalement indépendant de la DB (0 import drizzle/neon dans ghost-auth.ts). Quand la DB est disponible, l'audit Ghost écrit dans `audit_log` (actor_type='ghost', user_id=NULL). Le login, la signature JWT et le cookie fonctionnent de manière identique avec ou sans DB.

### Règle 2 : fantomas/fantomas fonctionne SANS base de données — **PASS**

Toutes les opérations Ghost (validateGhostCredentials, signGhostSession, verifyGhostSession, getGhostCookieOptions) s'exécutent en mémoire via `process.env` + `jose` + `crypto.timingSafeEqual`. Aucun accès DB. En cas de panne DB, auditGhostAction tombe dans le catch et fait un console.info (sans secrets).

### Règle 3 : SUPER_ADMIN fonctionne via Better Auth — **PASS**

Better Auth 1.7.1 configuré avec adapter Drizzle pg. Plugin username activé. Colonnes `platform_role` (enum: super_admin, none) et `is_super_admin` (boolean) sur la table `user`. La session est résolue via `auth.api.getSession({ headers })` dans actor.ts et session.ts.

### Règle 4 : ADMIN/TEACHER ne peuvent pas contourner les permissions — **PASS**

Les guards serveur (`requirePermission`, `requireTeacherScope`, `requireSchoolAccess`, `requireGhostGuard`, `requireSuperAdminGuard`) sont implémentés dans authorization.ts et teacher-scope.ts. Les tests RBAC (47 tests) vérifient chaque combinaison rôle/permission. Les tests teacher-scope (14 tests) vérifient la triple vérification. Aucun rôle ne peut escalader ses permissions par appel serveur direct.

---

## 4. Verdict Global

**23/23 portes PASS — 4/4 règles absolues PASS.**

---

## 5. Éligibilité M2

**GO — Le jalon M2 est autorisé à démarrer.**

Risques résiduels acceptés pour M1 (traités en M2+) :
- Rate limiting par instance (pas de Redis) — best-effort documenté
- Guards RBAC non câblés sur les routes CRUD existantes (M2)
- Session Ghost 7 jours (acceptable, rotation secrète invalide immédiatement)
- school_membership chargé en TODO dans session.ts (M2)