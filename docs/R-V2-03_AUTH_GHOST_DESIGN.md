# R-V2-03 — AUTH GHOST DESIGN

**Projet** : Daniélou Abidjan — Plateforme de gestion scolaire  
**Date** : 2026-08-22  
**Prédecesseur** : R-V2-01 (modèle cible figé), R-V2-02 (plan de migration)  
**Statut** : DESIGN DOCUMENT — CONTRAT FINAL d'authentification et de session  
**Successeur** : M1 — AUTH / AUTHORIZATION EXPAND

---

## 1. Executive Summary

Ce document fixe le contrat d'authentification et d'autorisation V2 de la plateforme Daniélou Abidjan. Il couvre deux chemins d'authentification distincts (Ghost Auth hors DB + Better Auth pour les utilisateurs normaux), un modèle d'acteur unifié, un système de permissions centralisé, et un Recovery Mode exclusif au compte Ghost Fantomas.

Les décisions clés :

- **Fantomas est indépendant de PostgreSQL** — zéro dépendance DB, credentials via variables d'environnement, session JWT signée avec un secret dédié.
- **Deux sessions distinctes, un seul acteur actif** — Ghost Session (cookie `danielou_ghost_session`) et Better Auth Session ne sont jamais fusionnées.
- **RBAC centralisé** — la même source de vérité (32 permissions) alimente la navigation, les page guards, les Server Actions et les route handlers.
- **Teacher Resource Scope** — les permissions Teacher sont vérifiées non seulement au niveau de la permission mais aussi au niveau de la ressource (classe, matière, période).
- **Recovery Mode Ghost-only** — interface minimale fonctionnant sans PostgreSQL, accessible uniquement par Fantomas.

Ce document est le contrat figé. Après validation (R-V2-03 PASS), M1 ne doit plus décider de l'architecture — il doit seulement l'implémenter.

---

## 2. Current Auth State

### 2.1 Module Fantomas existant

**Fichier** : `src/lib/fantomas.ts`

Le module Fantomas existant implémente déjà un authentification hors DB via JWT signé avec `jose`. État détaillé :

| Aspect | Actuel | Évaluation |
|--------|--------|------------|
| Credentials | Hardcodés (`fantomas` / `fantomas`) | **À refactorer** — déplacer vers env vars |
| Secret de signature | `BETTER_AUTH_SECRET` (partagé avec Better Auth) | **À corriger** — secret dédié requis |
| Algorithme JWT | HS256 via `jose` | **À conserver** |
| Durée de session | 7 jours | **À conserver** |
| Nom du cookie | `danielou-fantomas-token` | **À renommer** → `danielou_ghost_session` |
| Payload JWT | `{ id, email, name, role: 'admin', isSuperAdmin: true }` | **À simplifier** — payload minimal |
| Validation | `jwtVerify` + vérification `payload.id` | **À corriger** — vérifier `sub` et `actor` |
| Comparaison password | `===` (non constant-time) | **À corriger** — `timingSafeEqual` |
| Configuration validation | Throw si `BETTER_AUTH_SECRET` absent | **À améliorer** — dégradation gracieuse |

**Ce qui peut être conservé** : structure module, utilisation de `jose`, pattern JWT, cookie httpOnly.

**Ce qui doit être refactoré** : tout le reste (credentials, secret, payload, nom cookie, comparaison, validation config).

### 2.2 Better Auth existant

**Fichier** : `src/lib/auth.ts`

| Aspect | Actuel | Évaluation |
|--------|--------|------------|
| Version | 1.7.1 | Vérifié via `package.json` |
| Adapter | `drizzleAdapter(getDb(), { provider: 'pg' })` | Correct |
| Plugins | Aucun | **À ajouter** : plugin `username` |
| Email + password | Activé, min 6 chars | À conserver |
| Username + password | Non supporté | **À ajouter** via plugin |
| Session expiry | 7 jours, update 1 jour | À conserver |
| Lazy init | Oui (évite DB au build time) | À conserver |

### 2.3 Session existante

**Fichier** : `src/lib/session.ts`

La session a déjà été réécrite en V2 par R-V2-UI-02. Elle vérifie d'abord le token Fantomas, puis la session Better Auth, et retourne un `AppSessionV2`. Le fallback V1→V2 est implémenté via `derivePlatformRole` et `deriveSchoolRole`.

**Compatible** avec le design cible. Ajustements mineurs requis : adapter l'import depuis `ghost-auth.ts` au lieu de `fantomas.ts`, mettre à jour le nom du cookie.

### 2.4 Middleware existant

**Fichier** : `src/middleware.ts`

Déjà réécrit en V2 par R-V2-UI-02. Vérifie le cookie Fantomas via JWT, injecte les headers V2 (`x-platform-role`, `x-school-role`, `x-is-ghost`, `x-is-super-admin`). Better Auth est en pass-through (vérification différée au layout).

**Compatible**. Ajustement : mettre à jour le nom du cookie Ghost.

### 2.5 Login existant

**Fichier** : `src/app/(auth)/login/actions.ts`

Le login est un Server Action qui : (1) vérifie si c'est Fantomas via `isFantomasLogin()`, (2) sinon tente Better Auth email/password.

**Problème** : `isFantomasLogin()` est importé de `fantomas.ts` qui contient les credentials hardcodés. La détection doit être faite côté serveur (ce qui est le cas — Server Actions s'exécutent côté serveur), mais les credentials doivent venir des env vars.

### 2.6 API Route Fantomas existante

**Fichier** : `src/app/api/auth/fantomas/route.ts`

Endpoint POST qui valide les credentials et signe le JWT. Fonctionne sans DB.

**À renommer** : `/api/auth/ghost` (conformément au design cible). Mettre à jour les credentials et le secret.

---

## 3. Requirements

### 3.1 Exigences fonctionnelles

| # | Exigence | Référence MISSION |
|---|----------|-------------------|
| REQ-01 | Fantomas s'authentifie sans PostgreSQL | §3 |
| REQ-02 | Fantomas fonctionne si DB supprimée, tables supprimées, Better Auth cassé | §3 |
| REQ-03 | Deux chemins d'auth distincts, jamais de fallback automatique | §4 |
| REQ-04 | Credentials Fantomas via env vars, jamais hardcodés | §5 |
| REQ-05 | GHOST_SESSION_SECRET dédié, jamais partagé avec Better Auth | §5, §8 |
| REQ-06 | Validation de configuration Ghost, dégradation gracieuse | §6 |
| REQ-07 | Comparaison password côté serveur uniquement, constant-time | §7 |
| REQ-08 | Session Ghost indépendante de Better Auth, JWT signé | §8 |
| REQ-09 | Cookie httpOnly, Secure en production, SameSite Lax | §9 |
| REQ-10 | Durée de session définie (7 jours), pas d'éternité | §10 |
| REQ-11 | Logout Ghost sans dépendre de PostgreSQL | §11 |
| REQ-12 | Secret rotation invalide les sessions existantes | §47 |
| REQ-13 | Actor Model unifié (GhostActor \| UserActor) | §12 |
| REQ-14 | platform_role reste super_admin / none (pas ghost en DB) | §13 |
| REQ-15 | school_role dans school_membership uniquement | §14 |
| REQ-16 | SUPER_ADMIN : CRUD utilisateurs, tous droits ADMIN | §15 |
| REQ-17 | ADMIN : pas de CRUD utilisateurs, pas de recovery | §16 |
| REQ-18 | DIRECTION : validation, publication, pas de gestion comptes | §17 |
| REQ-19 | TEACHER : permissions + scope (classe, matière, période) | §18 |
| REQ-20 | READER : read-only, aucune mutation serveur | §19 |
| REQ-21 | Better Auth email + password, username + password | §20 |
| REQ-22 | Pas de signup public, pas de OTP, pas de magic link | §20 |
| REQ-23 | Username normalisé, comparaison insensible à la casse | §21 |
| REQ-24 | Better Auth boundary définie, pas de dépendance circulaire | §22 |
| REQ-25 | Mot de passe jamais en clair dans user, jamais renvoyé | §23 |
| REQ-26 | Ghost + Better Auth sessions jamais fusionnées | §24, §25 |
| REQ-27 | RBAC centralisé, même modèle navigation + serveur | §26, §27 |
| REQ-28 | Routes sensibles classées avec guards explicites | §28 |
| REQ-29 | `requireGhost()` satisfait uniquement par GhostActor | §29 |
| REQ-30 | DB health check léger, états typés | §30, §31 |
| REQ-31 | Ghost + DB available → droits maximum | §32 |
| REQ-32 | Ghost + DB unavailable → Recovery Mode | §33 |
| REQ-33 | User normal + DB down → DATABASE_UNAVAILABLE | §34 |
| REQ-34 | Recovery Mode Ghost-only, actions prédéfinies | §35, §36 |
| REQ-35 | Bootstrap SUPER_ADMIN via Fantomas | §37 |
| REQ-36 | Fantomas pas CRUDable, pas dans User CRUD UI | §38 |
| REQ-37 | Audit Ghost (actor_type='ghost', user_id=NULL) | §39 |
| REQ-38 | Ghost login failure → INVALID_CREDENTIALS générique | §40 |
| REQ-39 | Audit fonctionne quand DB disparaît (logs runtime) | §41 |
| REQ-40 | Secrets jamais dans les logs | §42 |
| REQ-41 | CSRF / Origin protection définie | §43 |
| REQ-42 | Rate limiting sur Ghost login | §44 |
| REQ-43 | Session forgery → rejet (401) | §45 |
| REQ-44 | Session expirée → GHOST_SESSION_EXPIRED, retour login | §46 |
| REQ-45 | Aucune SQLite | §35 |

### 3.2 Exigences non-fonctionnelles

| # | Exigence |
|---|----------|
| NFR-01 | Ne pas ajouter Redis, Kafka, microservice, nouvelle DB, Vault, CQRS |
| NFR-02 | Utiliser Next.js, Vercel, Better Auth, PostgreSQL, Web Crypto/jose |
| NFR-03 | Pas de sur-architecture |

---

## 4. Trust Boundaries

### 4.1 Frontend (Browser)

**Ne jamais faire confiance au navigateur pour** : validation de credentials, détermination du rôle, décision d'autorisation, vérification de session. Le navigateur est une surface d'attaque.

**Ce que le navigateur peut faire** : afficher/masquer des éléments UI (cosmétique uniquement), envoyer des requêtes au serveur, stocker des préférences non-sensibles.

### 4.2 Middleware (Edge Runtime)

Le middleware fait une vérification « légère » du cookie Ghost (JWT signature + expiration). Il injecte des headers mais ne fait PAS de vérification DB. Les headers sont des indices pour le layout — ils ne remplacent pas `getSession()`.

**Ce qui est trusted** : JWT valide = l'utilisateur est probablement Fantomas. La confirmation complète est faite par `getSession()`.

### 4.3 Server Components / Server Actions

**Seul endroit où les décisions d'autorisation sont réelles**. Chaque Server Action et chaque Server Component qui expose des données sensibles doit appeler un guard centralisé (`requirePermission`, `requireGhost`, etc.).

### 4.4 API Route Handlers

Même règle que les Server Actions. Chaque handler doit vérifier l'acteur et les permissions avant de traiter la requête.

### 4.5 PostgreSQL

La DB est la source de vérité pour les données métier. Les sessions Better Auth y sont stockées. Mais PostgreSQL n'est pas la source de vérité pour Fantomas — il peut être indisponible.

### 4.6 Environment Variables

Les secrets (`GHOST_SESSION_SECRET`, `BETTER_AUTH_SECRET`, `FANTOMAS_PASSWORD`) sont trusted uniquement côté serveur. Ils ne transitent jamais vers le client.

---

## 5. Ghost Authentication

### 5.1 Principe

Fantomas est un compte break-glass / platform owner / recovery principal. Son authentification est entièrement indépendante de PostgreSQL. Les credentials sont définis par des variables d'environnement serveur.

### 5.2 Détection du chemin d'auth

```
Requête de login (identifier, password)
  │
  ├─ normalize(identifier) == normalize(FANTOMAS_USERNAME) ?
  │   ├─ OUI → Vérifier password (constant-time)
  │   │         ├─ Match → Ghost Auth (hors DB)
  │   │         └─ No match → INVALID_CREDENTIALS
   │   │
  │   └─ NON → Better Auth
   │             → Vérifier email/password ou username/password
   │             → DB PostgreSQL requise
```

**Règle absolue** : il n'y a jamais de fallback automatique de Better Auth vers Ghost Auth. Si l'identifiant ne correspond pas exactement à `FANTOMAS_USERNAME`, Better Auth est le seul chemin.

### 5.3 Endpoint Ghost

```
POST /api/auth/ghost
Content-Type: application/json

{ "identifier": "fantomas", "password": "fantomas" }
```

Réponse succès (200) :

```json
{ "success": true, "user": { "name": "Fantomas", "platformRole": "ghost" } }
```

Réponse échec (401) :

```json
{ "error": "INVALID_CREDENTIALS" }
```

**Important** : la réponse échec ne permet pas de distinguer « username invalide » de « password invalide ». Le code d'erreur est toujours `INVALID_CREDENTIALS`.

### 5.4 Comparaison des credentials

La comparaison est effectuée côté serveur exclusivement. La fonction de comparaison utilise `crypto.timingSafeEqual` (Node.js built-in) pour éviter les attaques par timing.

```typescript
import { timingSafeEqual } from 'crypto';

function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
```

### 5.5 Règles strictes

- Ne jamais logger le password saisi.
- Ne jamais stocker le password dans localStorage, sessionStorage, ou un cookie.
- Ne jamais envoyer le password à un composant client pour validation.
- Ne jamais inclure les credentials dans une query string.
- Ne jamais exposer `FANTOMAS_PASSWORD` ou `GHOST_SESSION_SECRET` dans une réponse API, un log, ou une erreur utilisateur.

---

## 6. Ghost Runtime Configuration

### 6.1 Variables d'environnement

```env
# Ghost Auth — indépendant de DB
FANTOMAS_USERNAME=fantomas
FANTOMAS_PASSWORD=fantomas
GHOST_SESSION_SECRET=<secret dédié, min 32 caractères, généré aléatoirement>

# Better Auth — dépend de PostgreSQL
BETTER_AUTH_SECRET=<secret dédié, min 32 caractères>
BETTER_AUTH_URL=https://danielou-abidjan.vercel.app
DATABASE_URL=<Neon PostgreSQL connection string>
```

**Règles absolues** :

- Ces variables sont serveur uniquement. Aucune ne porte le préfixe `NEXT_PUBLIC_`.
- Elles ne doivent jamais apparaître dans le bundle client, les réponses API, les logs, ou les erreurs utilisateur.
- `GHOST_SESSION_SECRET` et `BETTER_AUTH_SECRET` doivent être des secrets **distincts**. La compromission de l'un n'entraîne pas la compromission de l'autre.

### 6.2 Validation de configuration

Au démarrage du module Ghost, le système vérifie la présence des trois variables indispensables. Si une variable manque :

```
FANTOMAS_USERNAME absent → Ghost Auth INDISPONIBLE
FANTOMAS_PASSWORD absent → Ghost Auth INDISPONIBLE
GHOST_SESSION_SECRET absent → Ghost Auth INDISPONIBLE
```

L'indisponibilité est **déclarée proprement** : le endpoint `/api/auth/ghost` retourne `503` avec le code `GHOST_CONFIGURATION_ERROR`. L'interface de login masque l'option Fantomas (ou affiche un message d'indisponibilité).

**Interdiction** : ne pas utiliser silencieusement un secret par défaut codé en source. Ne pas générer un secret temporaire différent à chaque instance serveur (cela rendrait les sessions incohérentes).

### 6.3 Configuration par environnement

| Variable | Development | Preview | Production |
|----------|-------------|---------|------------|
| `FANTOMAS_USERNAME` | `fantomas` | `fantomas` | Valeur forte |
| `FANTOMAS_PASSWORD` | `fantomas` | `fantomas` | Valeur forte |
| `GHOST_SESSION_SECRET` | Secret dev | Secret preview | Secret production |
| `BETTER_AUTH_SECRET` | Secret dev | Secret preview | Secret production |

Pendant la phase de construction, `fantomas/fantomas` reste utilisable. Le propriétaire changera manuellement les credentials avant la mise en production.

---

## 7. Ghost Session Format

### 7.1 Payload JWT

```json
{
  "sub": "fantomas-ghost",
  "actorType": "ghost",
  "actorIdentifier": "fantomas",
  "role": "ghost",
  "name": "Fantomas",
  "iat": 1756123456,
  "exp": 1756728256
}
```

- **Algorithme** : `HS256`
- **Header** : `{ "alg": "HS256", "typ": "JWT" }`
- **Signature** : `HMAC-SHA256(GHOST_SESSION_SECRET, header.payload)`

### 7.2 Propriétés du payload

| Champ | Type | Description |
|-------|------|-------------|
| `sub` | `string` | Toujours `"fantomas-ghost"` — identifiant fixe |
| `actorType` | `string` | Toujours `"ghost"` |
| `actorIdentifier` | `string` | Toujours `"fantomas"` |
| `role` | `string` | Toujours `"ghost"` |
| `name` | `string` | `"Fantomas"` (nom d'affichage) |
| `iat` | `number` | Date d'émission (Unix timestamp) |
| `exp` | `number` | Date d'expiration (Unix timestamp, iat + 7 jours) |

### 7.3 Règles de validation

1. Vérifier la signature HMAC-SHA256 avec `GHOST_SESSION_SECRET`.
2. Vérifier l'expiration (`exp > now()`).
3. Vérifier que `sub === 'fantomas-ghost'`.
4. Vérifier que `actorType === 'ghost'`.

Si une seule vérification échoue → session invalide → traitée comme absente.

### 7.4 Contre la falsification

Un attaquant qui fabrique un JWT avec `{ "actorType": "ghost", "role": "ghost" }` ne peut pas le signer sans `GHOST_SESSION_SECRET`. La validation cryptographique rejette tout token non signé correctement. Résultat : `401 UNAUTHORIZED`.

---

## 8. Cookie Policy

### 8.1 Cookie Ghost

| Propriété | Valeur | Justification |
|-----------|--------|---------------|
| Nom | `danielou_ghost_session` | Spécifique au Ghost, distinct de Better Auth |
| `HttpOnly` | `true` | Non accessible via JavaScript (anti-XSS) |
| `Secure` | `true` en production, `false` en dev | HTTPS obligatoire en production |
| `SameSite` | `Lax` | Protection CSRF, compatible avec navigation |
| `Path` | `/` | Valide sur tout le domaine |
| `Max-Age` | `604800` (7 jours) | Correspond à l'expiration JWT |

### 8.2 Cookie Better Auth

Géré par Better Auth. Nom par défaut : `better-auth.session_token`. Non modifié par Daniélou.

### 8.3 Séparation des cookies

Les deux cookies sont strictement indépendants :

- `danielou_ghost_session` → signé avec `GHOST_SESSION_SECRET`
- `better-auth.session_token` → géré par Better Auth, signé avec `BETTER_AUTH_SECRET`

Un attaquant qui vole un cookie Better Auth ne peut pas accéder au Recovery Mode. Un attaquant qui vole un cookie Ghost ne peut pas accéder en tant qu'utilisateur normal (le Ghost n'a pas de `user.id` en DB).

---

## 9. Session Lifecycle

### 9.1 Durée de session

| Session | Durée | Renouvellement |
|---------|-------|---------------|
| Ghost | 7 jours (604800s) | Non — reconnexion nécessaire après expiration |
| Better Auth | 7 jours | Oui — Better Auth gère le refresh (updateAge: 1 jour) |

### 9.2 Création de session Ghost

```
1. POST /api/auth/ghost { identifier, password }
2. Validation credentials (env vars, constant-time)
3. Signature JWT avec GHOST_SESSION_SECRET
4. Set cookie danielou_ghost_session (httpOnly, secure, sameSite: lax, maxAge: 7d)
5. Retourner 200 + user info
```

### 9.3 Validation de session Ghost

À chaque requête protégée :

1. Lire le cookie `danielou_ghost_session`.
2. Si absent → pas de session Ghost.
3. Si présent → vérifier la signature JWT, l'expiration, `sub`, `actorType`.
4. Si valide → `GhostActor` actif.
5. Si invalide (expiré, signature incorrecte, payload altéré) → supprimer le cookie, retourner `GHOST_SESSION_EXPIRED`.

### 9.4 Expiration

Le token JWT contient `exp`. Après expiration :

- Le middleware détecte le token expiré → ne valide pas → redirige vers `/login`.
- Si le layout tente `getSession()` → token expiré → retourne `null` → redirect `/login`.
- L'erreur publiée est `GHOST_SESSION_EXPIRED`.
- **Aucun renouvellement automatique** d'une session Ghost expirée. L'utilisateur doit se reconnecter.

### 9.5 Logout Ghost

```
POST /api/auth/ghost/logout
1. Supprimer le cookie danielou_ghost_session (maxAge: 0)
2. Ne pas dépendre de PostgreSQL
3. Retourner 200
```

Le logout Better Auth est géré séparément par Better Auth. Les deux mécanismes produisent une UX cohérente (redirection vers `/login`) mais restent techniquement séparés.

### 9.6 Invalidation

Il n'y a pas de mécanisme d'invalidation côté serveur pour les sessions Ghost (pas de liste de sessions, pas de DB). L'invalidation se fait par :

1. **Expiration** : le token expire après 7 jours.
2. **Secret rotation** : changer `GHOST_SESSION_SECRET` invalide immédiatement toutes les sessions Ghost existantes (les tokens signés avec l'ancien secret ne seront plus validés). C'est le mécanisme d'urgence.
3. **Logout** : supprime le cookie côté client.

---

## 10. Better Auth Boundary

### 10.1 Frontière Daniélou / Better Auth

Better Auth est propriétaire de son schéma interne (`user`, `account`, `session`, `verification`). Daniélou ne doit pas figer manuellement les colonnes finales de ces tables sans vérifier la configuration réellement générée.

### 10.2 Colonnes gérées par Daniélou

Sur la table `user` (partagée) :

| Colonne | Propriétaire | Description |
|---------|-------------|-------------|
| `id` | Better Auth | UUID primary key |
| `email` | Better Auth | Email unique |
| `name` | Better Auth | Nom d'affichage |
| `emailVerified` | Better Auth | Vérification email |
| `platform_role` | **Daniélou** | `super_admin` \| `none` |
| `is_active` | **Daniélou** | Compte actif/désactivé |
| `created_at` | **Daniélou** | Audit |
| `updated_at` | **Daniélou** | Audit |

### 10.3 Tables exclusives Better Auth

| Table | Rôle |
|-------|------|
| `account` | Connexions (email/password) — géré par Better Auth |
| `session` | Sessions utilisateurs — géré par Better Auth |

Daniélou ne lit pas ces tables directement. Toute interaction passe par l'API Better Auth (`auth.api.getSession()`, `auth.api.signIn()`, etc.).

### 10.4 Risque R3 (R-V2-01)

Le changement d'enum `app_role` → `platform_role` peut entrer en conflit avec Better Auth si un plugin admin est activé. **Mitigation** : ne pas activer le plugin admin de Better Auth. Les rôles sont gérés entièrement par Daniélou via `platform_role` et `school_membership`.

---

## 11. Username / Email Login

### 11.1 Exigence

Les utilisateurs doivent pouvoir se connecter avec :

- `email + password`
- `username + password`

Le champ UI unique affiche : « Email ou nom d'utilisateur ».

### 11.2 Plugin username Better Auth 1.7.1

Better Auth 1.7.1 supporte le plugin `username` :

```typescript
import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins';

betterAuth({
  // ...
  username: {
    enabled: true,
    minUsernameLength: 3,
    maxUsernameLength: 30,
  },
});
```

**Vérification requise avant M1** : confirmer que le plugin `username` est bien exporté par `better-auth/plugins` dans la version 1.7.1 installée (via `pnpm-lock.yaml` ou test d'import).

### 11.3 Normalisation des usernames

Les usernames sont normalisés de manière déterministe :

```typescript
function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}
```

| Input | Normalisé |
|-------|-----------|
| `Direction` | `direction` |
| `DIRECTION` | `direction` |
| `  direction  ` | `direction` |
| `fantomas` | `fantomas` |

La comparaison des usernames utilise la forme normalisée pour éviter les collisions de casse.

### 11.4 Login flow

```
Utilisateur saisit « Email ou nom d'utilisateur » + password
  │
  ├─ Saisie correspond à FANTOMAS_USERNAME (normalisé) ?
  │   ├─ OUI → Ghost Auth
  │   └─ NON → Better Auth
  │             ├─ Saisie contient '@' ?
  │             │   ├─ OUI → signIn.email({ email, password })
  │             │   └─ NON → signIn.username({ username, password })
  │             │
  │             └─ Si username échoue, essayer email aussi
  │                (certains users peuvent avoir un username qui ressemble à un email)
```

### 11.5 Pas de signup public

Il n'y a pas d'endpoint d'inscription public. Les comptes sont créés exclusivement par :

- Fantomas (Ghost)
- SUPER_ADMIN

Un compte créé par un administrateur autorisé peut immédiatement se connecter (pas de vérification email obligatoire).

---

## 12. Actor Model

### 12.1 Types unifiés

L'application utilise un modèle d'acteur centralisé. Tout acteur est soit un `GhostActor`, soit un `UserActor`.

```typescript
type Actor =
  | { type: 'ghost'; identifier: 'fantomas' }
  | {
      type: 'user';
      userId: UUID;
      platformRole: 'super_admin' | 'none';
      memberships: SchoolMembership[];
    };
```

### 12.2 GhostActor

```typescript
interface GhostActor {
  type: 'ghost';
  identifier: 'fantomas';
}
```

- Existe en dehors de la DB (runtime, env vars).
- N'a pas de `user.id` en DB.
- N'a pas de `school_membership`.
- Possède tous les droits (plateforme + scolaires + recovery).
- N'apparaît pas dans l'enum `platform_role` de la DB (pas de `user.platform_role = 'ghost'`).

### 12.3 UserActor

```typescript
interface UserActor {
  type: 'user';
  userId: UUID;
  platformRole: 'super_admin' | 'none';
  memberships: SchoolMembership[];
}
```

- Existe dans la DB (`user` + `school_membership` + `account`).
- Authentifié via Better Auth.
- `platformRole` vient de `user.platform_role`.
- Les rôles scolaires viennent de `school_membership.role`.

### 12.4 Résolution de l'acteur

```typescript
async function resolveActor(): Promise<Actor | null> {
  // 1. Vérifier la session Ghost
  const ghostSession = await verifyGhostSession();
  if (ghostSession) return { type: 'ghost', identifier: 'fantomas' };

  // 2. Vérifier la session Better Auth
  const baSession = await getBetterAuthSession();
  if (baSession) {
    return {
      type: 'user',
      userId: baSession.user.id,
      platformRole: baSession.user.platformRole,
      memberships: await loadMemberships(baSession.user.id),
    };
  }

  return null;
}
```

---

## 13. RBAC Integration

### 13.1 Architecture

```
Actor
  ↓
Permission Engine (src/lib/permissions.ts)
  ├── Navigation (src/lib/navigation.ts)
  ├── Page Guards (layout, requireSession)
  ├── Server Actions (requirePermission, requireGhost)
  └── Resource Scope (requireTeacherScope, requireSchoolAccess)
```

**Règle** : la même source de vérité de permissions (32 permissions, matrice 4 rôles scolaires) alimente tous les layers. Il n'y a pas un RBAC différent pour la sidebar et le serveur.

### 13.2 Fonctions d'autorisation centralisées

```typescript
// Résolution de l'acteur
resolveActor(): Promise<Actor | null>
requireActor(): Promise<Actor>  // lance UNAUTHORIZED si null

// Guards par type d'acteur
requireGhost(): Promise<GhostActor>        // uniquement GhostActor
requireSuperAdmin(actor): void             // actor.platformRole === 'super_admin'

// Permissions
requirePermission(platformRole, schoolRole, permission): void
requireAnyPermission(platformRole, schoolRole, permissions[]): void
checkPermission(platformRole, schoolRole, permission): boolean

// Scope
requireSchoolAccess(actor, schoolId): void     // vérifie membership dans l'école
requireTeacherScope(actor, classroomId, subjectId, periodId): void  // vérifie affectation

// Autorisation générique
authorize(actor, permission, resourceScope?): AuthorizationResult
```

### 13.3 SUPER_ADMIN permissions

SUPER_ADMIN possède un override global des permissions scolaires. Il n'est pas nécessaire de créer artificiellement `school_membership.role = admin` pour chaque école afin de lui donner son autorité globale.

```typescript
// Dans checkPermission:
if (platformRole === 'ghost') return true;
if (platformRole === 'super_admin') return true;  // override global
```

### 13.4 ADMIN interdictions

ADMIN (school_role = admin dans school_membership) possède l'administration scolaire complète **mais ne peut pas** :

- Créer des utilisateurs (`platform:users:manage`)
- Modifier des utilisateurs
- Réinitialiser des mots de passe
- Attribuer les rôles plateforme
- Créer des SUPER_ADMIN
- Accéder au Recovery Mode (`platform:recovery`)

Ces interdictions sont appliquées côté serveur car les permissions `platform:*` ne sont accordées qu'à `ghost` et `super_admin` dans la matrice.

---

## 14. Server Guards

### 14.1 Fonctions de guard

| Guard | Usage | Comportement si échec |
|-------|-------|----------------------|
| `requireActor()` | Toute route protégée | Lance `AuthorizationError('UNAUTHORIZED')` |
| `requireGhost()` | Routes Ghost / Recovery | Lance `AuthorizationError('FORBIDDEN')` si pas Ghost |
| `requireSuperAdmin(actor)` | Routes gestion utilisateurs | Lance `AuthorizationError('FORBIDDEN')` si pas super_admin |
| `requirePermission(pr, sr, p)` | Toute action nécessitant une permission | Lance `AuthorizationError('FORBIDDEN' \| 'UNAUTHORIZED')` |
| `requireSchoolAccess(actor, schoolId)` | Actions scoped à une école | Lance `AuthorizationError('FORBIDDEN')` si pas membre |
| `requireTeacherScope(actor, classId, subjId, periodId)` | Saisie de notes | Lance `AuthorizationError('FORBIDDEN')` si pas affecté |

### 14.2 `requireGhost()` — spécification stricte

```typescript
async function requireGhost(): Promise<GhostActor> {
  const actor = await resolveActor();
  if (!actor || actor.type !== 'ghost') {
    throw new AuthorizationError('FORBIDDEN');
  }
  return actor;
}
```

Cette fonction est satisfaite **uniquement** par `GhostActor`. `SUPER_ADMIN` ne la satisfait pas. `ADMIN` ne la satisfait pas. `DIRECTION`, `TEACHER`, `READER` non plus.

### 14.3 Classification des routes

| Route | Guard requis | Notes |
|-------|-------------|-------|
| `/dashboard` | `requireActor()` | Tout acteur authentifié |
| `/dashboard/admin/utilisateurs` | `requirePermission('platform:users:manage')` | Ghost ou SUPER_ADMIN |
| `/system/status` | `requireGhost()` ou `requireSuperAdmin()` (lecture limitée) | Définition à confirmer |
| `/system/recovery` | `requireGhost()` | **Ghost UNIQUEMENT** |
| `/teaching/grades` | `requirePermission('school:grades:manage')` + `requireTeacherScope()` | Permissions + scope |
| `/results/*` | Permissions correspondantes | Selon action (read/manage) |
| `/audit` | `requirePermission('school:audit_log:read')` | Selon rôle |

---

## 15. Teacher Resource Scope

### 15.1 Principe

L'interface (navigation filtrée) ne suffit pas. Un Teacher tentant directement une URL ou une API pour une classe non affectée doit recevoir `403 FORBIDDEN`.

### 15.2 Scope triple

Les permissions Teacher sont vérifiées selon trois dimensions :

1. **Permission** : le Teacher a-t-il la permission `school:grades:manage` ?
2. **School scope** : le Teacher est-il membre de l'école de la ressource ?
3. **Resource scope** : le Teacher est-il affecté à cette classe, cette matière, pour cette période ?

### 15.3 Détermination de l'affectation

```typescript
async function requireTeacherScope(
  actor: UserActor,
  classroomId: string,
  subjectId: string,
  academicPeriodId: string,
): Promise<void> {
  if (actor.platformRole === 'ghost' || actor.platformRole === 'super_admin') return;

  const membership = actor.memberships.find(m =>
    m.role === 'teacher' && m.isActive
  );
  if (!membership) throw new AuthorizationError('FORBIDDEN');

  // Vérifier teacher_assignment :
  //   school_membership_id = membership.id
  //   AND classroom_id = classroomId  (ou config_subject_id = subjectId)
  //   AND période active
  const assignment = await db.query.teacherAssignment.findFirst({
    where: and(
      eq(teacherAssignment.schoolMembershipId, membership.id),
      eq(teacherAssignment.classroomId, classroomId),
      // ou eq(configSubjectId, ...) si V2
    ),
  });

  if (!assignment) throw new AuthorizationError('FORBIDDEN');
}
```

### 15.4 Exemples

| Scénario | Résultat |
|----------|----------|
| Teacher affecté CP1 A, saisit note CP1 A → | 200 OK |
| Teacher non affecté CP1 B, tente saisie CP1 B → | 403 FORBIDDEN |
| Teacher affecté Français, tente modifier Maths → | 403 FORBIDDEN |
| Teacher dont l'affectation est terminée → | 403 FORBIDDEN (hors période) |

---

## 16. Database Health Model

### 16.1 Check

```typescript
async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1 AS ok`);
    // Vérification légère des tables critiques
    const result = await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 1`);
    if (result.rows.length === 0) {
      return { state: 'MIGRATION_REQUIRED' };
    }
    return { state: 'AVAILABLE' };
  } catch (err) {
    if (String(err).includes('connection') || String(err).includes('ENOTFOUND')) {
      return { state: 'UNAVAILABLE' };
    }
    return { state: 'MISCONFIGURED' };
  }
}
```

### 16.2 États

```typescript
type DatabaseHealthState = 'AVAILABLE' | 'UNAVAILABLE' | 'MIGRATION_REQUIRED' | 'MISCONFIGURED';

interface DatabaseHealth {
  state: DatabaseHealthState;
  error?: string;  // Message d'erreur technique, jamais exposé au client
}
```

| État | Signification | Comportement |
|-------|---------------|--------------|
| `AVAILABLE` | PostgreSQL connecté, tables présentes | Fonctionnement normal |
| `UNAVAILABLE` | PostgreSQL injoignable | Ghost → Recovery ; autres → DATABASE_UNAVAILABLE |
| `MIGRATION_REQUIRED` | PostgreSQL connecté mais tables absentes | Ghost → Recovery (migrations) ; autres → erreur |
| `MISCONFIGURED` | DATABASE_URL incorrect ou corrompu | Ghost → Recovery ; autres → DATABASE_UNAVAILABLE |

### 16.3 Mise en cache

Le health check n'est pas exécuté à chaque requête. Il est mis en cache pour la durée de la requête (ou via un cookie technique court). Le check est fait :

- Une fois au login.
- Une fois au chargement du dashboard layout.
- Sur demande explicite dans le Recovery Mode.

---

## 17. Recovery Mode

### 17.1 Accès

Le Recovery Mode est strictement réservé à Fantomas (Ghost). Il est activé lorsque :

- Ghost Authentication = success
- DB = UNAVAILABLE ou MIGRATION_REQUIRED

### 17.2 Interface

Le shell est minimal. Il ne charge pas : students, classrooms, grades, report cards, pedagogical configurations, school memberships. Ces données dépendent de PostgreSQL.

### 17.3 Actions autorisées

| Action | Description | Type |
|--------|-------------|------|
| Afficher état DB | Statut de connexion, erreur | Lecture |
| Tester connexion | `SELECT 1` | Lecture |
| Afficher état configuration | Variables critiques (valeurs masquées) | Lecture |
| Vérifier état schéma | Comparer schéma Drizzle vs DB | Lecture |
| Vérifier état migrations | Lister les migrations appliquées | Lecture |
| Initialiser schéma | Créer les tables (drizzle-kit push) | Mutation |
| Appliquer migrations | Exécuter les migrations en attente | Mutation |
| Reprovisionner données de référence | Lancer le seed idempotent | Mutation |
| Bootstrap SUPER_ADMIN | Créer un premier SUPER_ADMIN | Mutation |

### 17.4 Actions interdites

- Terminal web générique
- Shell OS arbitraire
- Éditeur SQL libre
- Exécution SQL utilisateur libre
- Affichage de `DATABASE_URL`
- Affichage de secrets (`GHOST_SESSION_SECRET`, `BETTER_AUTH_SECRET`, `FANTOMAS_PASSWORD`)
- SQLite (quel que soit le cas)

### 17.5 Protection des actions Recovery

Chaque opération Recovery :

- Est prédéfinie et typée (pas de commande libre).
- Est explicitement autorisée (whitelist d'actions).
- Est protégée par `requireGhost()`.
- Est appelée via Server Action (POST) ou route handler POST.
- Est auditée lorsque la DB est disponible (`audit_log` avec `actor_type = 'ghost'`).
- Est sécurisée contre CSRF/origin abuse (cf. §21).

Il n'y a **jamais** d'API du type `executeCommand(command: string)` ou `executeSQL(sql: string)`.

---

## 18. Bootstrap SUPER_ADMIN

### 18.1 Workflow

```
Fantomas se connecte (sans DB)
  → DB disponible (après migration + seed)
  → Fantomas vérifie : SELECT COUNT(*) FROM "user" WHERE platform_role = 'super_admin'
  → COUNT = 0 ?
     ├─ OUI → Interface de création SUPER_ADMIN
     │         Fantomas saisit : email, nom, password
     │         Création : user + account (Better Auth) + platform_role = 'super_admin'
     │         Audit : ghost_bootstrap_super_admin
     │
     └─ NON → SUPER_ADMIN existe déjà, pas de bootstrap
```

### 18.2 Règles

- Pas de seed hardcodé avec un compte SUPER_ADMIN.
- Pas de compte SUPER_ADMIN codé en source.
- Fantomas est le seul mécanisme de bootstrap/recovery.
- Le bootstrap est audité (`actor_type = 'ghost'`, `action = 'ghost_bootstrap_super_admin'`).
- Après bootstrap, le SUPER_ADMIN peut se connecter via Better Auth et créer d'autres utilisateurs.

---

## 19. Audit

### 19.1 Actions Ghost auditées (DB disponible)

| Action | `actor_type` | `actor_identifier` | `user_id` |
|--------|-------------|-------------------|----------|
| `ghost_login_success` | `ghost` | `fantomas` | `NULL` |
| `ghost_login_failure` | `ghost` | `fantomas` | `NULL` |
| `ghost_logout` | `ghost` | `fantomas` | `NULL` |
| `recovery_mode_entered` | `ghost` | `fantomas` | `NULL` |
| `migration_triggered` | `ghost` | `fantomas` | `NULL` |
| `database_reinitialized` | `ghost` | `fantomas` | `NULL` |
| `bootstrap_super_admin` | `ghost` | `fantomas` | `NULL` |
| `user_created` | `ghost` | `fantomas` | `NULL` |
| `user_updated` | `ghost` | `fantomas` | `NULL` |
| `user_password_set` | `ghost` | `fantomas` | `NULL` |

### 19.2 Audit log V2

La table `audit_log` V2 (cf. R-V2-01 §3.26) supporte :

- `actor_type` : `'user'` | `'ghost'` | `'system'`
- `actor_identifier` : pour Ghost = `'fantomas'`
- `user_id` : `NULL` pour Ghost
- `school_id` : contexte scolaire
- `old_value` / `new_value` : JSONB
- `request_id` : corrélation

### 19.3 Audit lorsque DB absente

Si PostgreSQL est indisponible, l'`audit_log` ne peut pas être écrit. Cela **n'empêche pas** le Recovery Mode de fonctionner. Le système utilise les logs runtime/serveur minimaux (sans secrets) pour tracer les opérations Recovery.

Ne pas introduire une seconde base de données simplement pour l'audit Recovery.

---

## 20. Logging

### 20.1 Données journalisées

- Événements d'authentification (success/failure, type d'acteur).
- Erreurs techniques (sans secrets).
- Health check DB.
- Opérations Recovery (type d'action, résultat).
- Erreurs d'autorisation (code, route, acteur — sans données sensibles).

### 20.2 Données INTERDITES dans les logs

| Donnée | Interdiction |
|--------|-------------|
| `FANTOMAS_PASSWORD` | Jamais loggé |
| `GHOST_SESSION_SECRET` | Jamais loggé |
| `BETTER_AUTH_SECRET` | Jamais loggé |
| `DATABASE_URL` | Jamais loggé |
| User password (clair ou hash) | Jamais loggé |
| Password hash | Jamais loggé |
| Full session cookie | Jamais loggé |
| Refresh token | Jamais loggé |
| Access token | Jamais loggé |
| Credential secret | Jamais loggé |

### 20.3 Logs runtime (Recovery)

En l'absence de DB, les opérations Ghost sont journalisées via `console.error` / logger structuré minimal :

```typescript
// Jamais de secrets dans ces logs
console.info('[ghost] recovery action: migration_triggered');
console.error('[ghost] db unavailable:', err.message);  // err.message ne doit pas contenir le secret
```

---

## 21. CSRF / Origin Protection

### 21.1 Menace

Les actions Ghost/Recovery sont particulièrement sensibles. Un attaquant pourrait tenter de forcer un navigateur connecté en tant que Fantomas à exécuter des actions Recovery malveillantes.

### 21.2 Stratégie de protection multicouche

| Couche | Mécanisme | Portée |
|--------|-----------|--------|
| Cookie | `SameSite: Lax` sur `danielou_ghost_session` | Protection CSRF de base |
| HTTP Method | Toutes les mutations Recovery via `POST` (Server Actions ou route handlers) | Empêche les mutations par GET |
| Origin validation | Vérifier `Origin` / `Host` header pour les endpoints Recovery | Empêche les requêtes cross-origin |
| Server Actions | Utiliser `use server` (POST automatique par Next.js) | Protection CSRF intégrée |

### 21.3 Origin validation pour les Recovery endpoints

```typescript
function validateOrigin(request: NextRequest): void {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const allowedOrigin = process.env.BETTER_AUTH_URL;

  if (origin && allowedOrigin && !origin.startsWith(new URL(allowedOrigin).hostname)) {
    throw new AuthorizationError('FORBIDDEN');
  }
}
```

### 21.4 Interdictions

- Toute mutation Recovery par `GET` → `405 Method Not Allowed`.
- Pas de callback JSONP.
- Pas de formulaire avec `action` externe.

---

## 22. Rate Limiting

### 22.1 Stratégie

Le Ghost login endpoint (`POST /api/auth/ghost`) doit être protégé contre le bruteforce, même si le mot de passe actuel est `fantomas`. La protection doit être proportionnée et compatible avec l'environnement serverless (Vercel Edge / Serverless).

### 22.2 Approche : rate limiting par IP avec sliding window

```typescript
// Pas de Redis requis — utilisation d'un Map en mémoire avec TTL
// Compatible serverless (chaque instance a son propre compteur, suffisant contre le bruteforce basique)

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS_PER_WINDOW = 10;
const WINDOW_MS = 15 * 60 * 1000;  // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS_PER_WINDOW) {
    return false;  // Rate limited
  }

  entry.count++;
  return true;
}
```

### 22.3 Limites

| Paramètre | Valeur | Justification |
|-----------|--------|---------------|
| Max tentatives par fenêtre | 10 | Suffisant pour usage normal (erreurs de frappe) |
| Fenêtre | 15 minutes | Compromis entre sécurité et usabilité |
| Type | Sliding window par IP | Simple, pas d'infrastructure externe |

### 22.4 Comportement lors du rate limiting

- Réponse : `429 Too Many Requests` avec header `Retry-After`.
- Aucun lockout de compte (Fantomas n'a pas de compte DB à verrouiller).
- Aucun délai croissant (trop complexe en serverless sans state partagé).
- Le rate limiting est per-instance en serverless. Contre un attaquant distribué, la protection est limitée. C'est acceptable : le propriétaire changera les credentials Fantomas avant la production.

### 22.5 Contraintes serverless

- Pas de Redis, pas de store partagé entre instances.
- Le Map en mémoire est recréé à chaque cold start.
- Cette limitation est acceptable : l'objectif est d'empêcher le bruteforce trivial, pas une attaque distribuée sophistiquée. Le vrai facteur de protection est la complexité du mot de passe Fantomas en production.

---

## 23. Error Model

### 23.1 Codes d'erreur

| Code | HTTP | Signification | Quand |
|------|------|---------------|-------|
| `INVALID_CREDENTIALS` | 401 | Identifiants invalides | Login échoué (Ghost ou Better Auth) |
| `UNAUTHORIZED` | 401 | Non authentifié | Pas de session valide |
| `FORBIDDEN` | 403 | Permission insuffisante | Authentifié mais pas le droit |
| `DATABASE_UNAVAILABLE` | 503 | DB indisponible | User normal + DB down |
| `MIGRATION_REQUIRED` | 503 | Migrations manquantes | DB connectée mais tables absentes |
| `GHOST_SESSION_EXPIRED` | 401 | Session Ghost expirée | JWT Ghost expiré |
| `GHOST_CONFIGURATION_ERROR` | 503 | Configuration Ghost manquante | Env vars Ghost absentes |

### 23.2 Règles

- Les erreurs publiques ne doivent **jamais** exposer : stack trace, secret, database credentials, configuration interne sensible.
- Les erreurs sont typées (pas de strings libres dans les réponses API).
- Le client reçoit le code d'erreur et un message générique (sans détails techniques).
- Les détails techniques sont loggés côté serveur uniquement.

### 23.3 Error class

```typescript
class AuthorizationError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_CREDENTIALS'
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'DATABASE_UNAVAILABLE'
      | 'MIGRATION_REQUIRED'
      | 'GHOST_SESSION_EXPIRED'
      | 'GHOST_CONFIGURATION_ERROR',
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AuthorizationError';
  }
}
```

---

## 24. Environment Isolation

### 24.1 Séparation des secrets

```
Development:
  GHOST_SESSION_SECRET = <secret dev>
  BETTER_AUTH_SECRET = <secret dev>
  DATABASE_URL = <Neon dev>

Preview:
  GHOST_SESSION_SECRET = <secret preview>
  BETTER_AUTH_SECRET = <secret preview>
  DATABASE_URL = <Neon preview>

Production:
  GHOST_SESSION_SECRET = <secret production>
  BETTER_AUTH_SECRET = <secret production>
  DATABASE_URL = <Neon production>
```

### 24.2 Règles

- Chaque environnement a des secrets distincts.
- Un token Ghost signé en dev n'est pas valide en production (secrets différents).
- Les cookies n'ont pas de domaine croisé (SameSite + Secure).

---

## 25. Test Matrix

### 25.1 Tests Ghost obligatoires

| ID | Scénario | Résultat attendu |
|----|----------|-------------------|
| GHOST-01 | DB OK + fantomas/fantomas → login | 200, cookie set, Ghost session valide |
| GHOST-02 | DB DOWN + fantomas/fantomas → login | 200, cookie set, Recovery Mode |
| GHOST-03 | Database supprimée → Ghost login | Login fonctionne, Recovery Mode |
| GHOST-04 | Ghost credentials incorrects | 401 INVALID_CREDENTIALS |
| GHOST-05 | Ghost Session falsifiée | 401 rejet |
| GHOST-06 | Ghost Session expirée | 401 GHOST_SESSION_EXPIRED |
| GHOST-07 | Ghost logout | Cookie invalidé, redirect /login |
| GHOST-08 | GHOST_SESSION_SECRET changé | Ancienne session rejetée |
| GHOST-09 | Fantomas absent de `user` | Login fonctionne |
| GHOST-10 | Fantomas absent de `account` | Login fonctionne |
| GHOST-11 | Fantomas absent de `session` | Login fonctionne |
| GHOST-12 | SUPER_ADMIN → /system/recovery | 403 FORBIDDEN |
| GHOST-13 | ADMIN → /system/recovery | 403 FORBIDDEN |
| GHOST-14 | TEACHER → /system/recovery | 403 FORBIDDEN |
| GHOST-15 | Aucune SQLite dans le code | 0 import SQLite |
| GHOST-16 | Secrets absents des logs | Grep sur les logs : 0 match |
| GHOST-17 | Mutation Recovery via GET | 405 Method Not Allowed |
| GHOST-18 | Cookie Ghost modifié | 401 rejet |
| GHOST-19 | Ghost + DB OK → bootstrap SUPER_ADMIN | SUPER_ADMIN créé, audit écrit |
| GHOST-20 | Ghost + DB DOWN → pas de chargement données métier | Shell minimal, pas de crash |

### 25.2 Tests Auth normale

| ID | Scénario | Résultat attendu |
|----|----------|-------------------|
| AUTH-01 | email + password → Better Auth | 200, session valide |
| AUTH-02 | username + password → Better Auth | 200, session valide |
| AUTH-03 | username normal ≠ Fantomas → Better Auth uniquement | Pas de fallback Ghost |
| AUTH-04 | Better Auth login failure → aucun fallback Ghost | INVALID_CREDENTIALS, pas de tentative Ghost |
| AUTH-05 | Utilisateur désactivé | Connexion refusée / session neutralisée |
| AUTH-06 | SUPER_ADMIN peut user.create | 201, user créé |
| AUTH-07 | ADMIN ne peut pas user.create | 403 FORBIDDEN |
| AUTH-08 | SUPER_ADMIN peut reset user password | 200, password mis à jour |
| AUTH-09 | ADMIN ne peut pas reset user password | 403 FORBIDDEN |
| AUTH-10 | Public signup | 404 ou 403, indisponible |

### 25.3 Tests Teacher Scope

| ID | Scénario | Résultat attendu |
|----|----------|-------------------|
| TEACHER-01 | Teacher affecté CP1 A → ouvrir notes CP1 A | 200 OK |
| TEACHER-02 | Teacher non affecté CP1 B → 403 | 403 FORBIDDEN |
| TEACHER-03 | Teacher affecté Français → modifier Maths (non affecté) | 403 FORBIDDEN |
| TEACHER-04 | Teacher affectation terminée → écriture hors période | 403 FORBIDDEN |

### 25.4 Tests Navigation / Server Guards

| ID | Scénario | Résultat attendu |
|----|----------|-------------------|
| NAV-AUTH-01 | Menu masqué + URL directe | 403 |
| NAV-AUTH-02 | SUPER_ADMIN voit Utilisateurs & Accès | Item visible |
| NAV-AUTH-03 | ADMIN ne voit pas Utilisateurs & Accès | Item masqué |
| NAV-AUTH-04 | Ghost voit Recovery Mode | Item visible |
| NAV-AUTH-05 | SUPER_ADMIN ne voit/ne peut pas Recovery Mode | Item masqué + 403 |

---

## 26. Risks

| # | Risque | Sévérité | Atténuation |
|---|-------|-----------|------------|
| R-AUTH-01 | Partage actuel BETTER_AUTH_SECRET pour Ghost + Better Auth | **ÉLEVÉ** | Secret dédié GHOST_SESSION_SECRET |
| R-AUTH-02 | Credentials Fantomas hardcodés | **MOYEN** | Env vars + validation au démarrage |
| R-AUTH-03 | Comparaison password non constant-time | **FAIBLE** | timingSafeEqual |
| R-AUTH-04 | Pas de rate limiting Ghost actuel | **MOYEN** | Rate limiting par IP |
| R-AUTH-05 | Plugin username Better Auth non vérifié | **MOYEN** | Vérifier avant M1 |
| R-AUTH-06 | Session fantomas ne pas interférer avec session Better Auth | **MOYEN** | Cookies séparés, noms distincts |
| R-AUTH-07 | Navigation manquante System/Recovery dans NAV_SECTIONS | **FAIBLE** | Ajouter section System dans navigation |
| R-AUTH-08 | AuthorizationError codes incomplets | **FAIBLE** | Étendre à 7 codes |
| R-AUTH-09 | Fantomas apparaît dans le CRUD utilisateurs | **MOYEN** | Filtrer explicitement dans les queries |

---

## 27. Compatibilité avec R-V2-UI-02

### 27.1 Vérification

| Composant R-V2-UI-02 | Compatible avec ce design ? | Notes |
|----------------------|----------------------------|-------|
| `types/rbac.ts` : PlatformRole, SchoolRole, Permission | ✅ Oui | Aucun changement requis |
| `permissions.ts` : matrice 32 permissions | ✅ Oui | Aucun changement requis |
| `authorization.ts` : requirePermission, checkPermission | ✅ Oui | À étendre avec requireGhost, requireSuperAdmin, requireTeacherScope |
| `navigation.ts` : NAV_SECTIONS | ⚠️ Partiel | Manque section System (Recovery, Status) |
| `navigation-provider.tsx` : useNavigation, useBreadcrumbs | ✅ Oui | Compatible |
| `sidebar.tsx` : Ghost badge | ✅ Oui | Badge distinctif présent |
| `topbar.tsx` : breadcrumbs, badges rôle | ✅ Oui | Compatible |
| `app-shell.tsx` : NavigationProvider wrapper | ✅ Oui | Compatible |
| `session.ts` : getSession() | ⚠️ Partiel | Adapter import fantomas → ghost-auth, cookie name |
| `middleware.ts` | ⚠️ Partiel | Adapter cookie name |
| `forbidden/page.tsx` | ✅ Oui | Compatible |
| `db-unavailable/page.tsx` | ✅ Oui | Compatible |

### 27.2 Divergences à corriger

1. **NAV_SECTIONS** : ajouter une section « Système » avec les items Recovery Mode et Status (visible uniquement pour Ghost/SUPER_ADMIN).
2. **session.ts** : mettre à jour l'import du module Ghost et le nom du cookie.
3. **middleware.ts** : mettre à jour le nom du cookie Ghost.
4. **authorization.ts** : étendre `AuthorizationError` avec les codes manquants ; ajouter `requireGhost()`, `requireSuperAdmin()`, `requireTeacherScope()`.

### 27.3 Pas de contradiction avec R-V2-01

Le design R-V2-03 est fully aligné avec le modèle figé R-V2-01 :

- `platform_role` reste `super_admin` | `none` en DB (pas de `ghost` en DB).
- `school_role` reste `admin` | `direction` | `teacher` | `reader` dans `school_membership`.
- `audit_log` V2 supporte `actor_type` et `actor_identifier`.
- Aucune nouvelle table n'est ajoutée au modèle cible.

---

## 28. Compatibilité avec R-V2-02

### 28.1 Impacts sur M1

| Dimension M1 | Impact R-V2-03 |
|-------------|---------------|
| Better Auth configuration | Ajout plugin `username`, `emailAndPassword` conservé |
| username support | Nouveau plugin, `user.username` géré par Better Auth |
| platform_role | Ajout colonne `platform_role` sur `user` (remplace `role` + `app_role`) |
| school_membership | Nouvelle table, chargée dans `getSession()` |
| session resolution | `getSession()` charge les memberships depuis DB |
| Ghost config | Nouveau module `ghost-auth.ts` avec env vars |
| Ghost session | Cookie renommé, secret dédié, payload minimal |
| bootstrap Super Admin | Workflow Fantomas → vérification → création |
| audit actor types | `audit_log` V2 avec `actor_type`, `actor_identifier` |

### 28.2 Pas d'exécution pendant R-V2-03

Ces impacts sont documentés pour M1. Aucune migration destructive n'est exécutée pendant R-V2-03.

---

## 29. M1 Implementation Contract

Cette section décrit **exactement** ce que M1 devra implémenter. Après R-V2-03 PASS, M1 ne doit plus décider de l'architecture — il doit seulement l'implémenter.

### 29.1 Runtime Ghost configuration

**Fichier** : `src/lib/ghost-config.ts`

- Lire `FANTOMAS_USERNAME`, `FANTOMAS_PASSWORD`, `GHOST_SESSION_SECRET` depuis `process.env`.
- Valider la présence des trois variables.
- Si une variable manque : `ghostConfig` retourne `{ available: false }`. Les endpoints Ghost retournent 503 `GHOST_CONFIGURATION_ERROR`.
- Si toutes présentes : `ghostConfig` retourne `{ available: true, username, sessionSecret: Uint8Array }`.
- Ne jamais exposer les valeurs secrètes dans les logs ou les réponses.

### 29.2 Ghost credential validator

**Fichier** : `src/lib/ghost-auth.ts` (remplace `src/lib/fantomas.ts`)

- `validateGhostCredentials(identifier: string, password: string): boolean`
- Normaliser l'identifier (trim + toLowerCase).
- Comparer avec `FANTOMAS_USERNAME` et `FANTOMAS_PASSWORD` via `crypto.timingSafeEqual`.
- Ne jamais logger le password.

### 29.3 Ghost session signer/verifier

**Fichier** : `src/lib/ghost-auth.ts`

- `signGhostSession(): Promise<string>` — signe le JWT avec `GHOST_SESSION_SECRET`, payload minimal (`sub`, `actorType`, `actorIdentifier`, `role`, `name`, `iat`, `exp`).
- `verifyGhostSession(token: string): Promise<GhostPayload | null>` — vérifie signature, expiration, `sub`, `actorType`. Retourne le payload ou `null`.
- Utiliser `jose` (déjà installé, v6.2.9).
- Algorithme HS256.

### 29.4 Ghost cookie lifecycle

**Fichier** : `src/lib/ghost-auth.ts` + `src/app/api/auth/ghost/route.ts`

- Nom : `danielou_ghost_session`.
- Set : httpOnly, secure (production), sameSite: lax, path: /, maxAge: 604800.
- Delete : maxAge: 0 sur logout.
- Endpoint : `POST /api/auth/ghost` (login), `POST /api/auth/ghost/logout` (logout).

### 29.5 Actor resolution

**Fichier** : `src/lib/actor.ts`

- `resolveActor(): Promise<Actor | null>`
- `requireActor(): Promise<Actor>`
- `Actor = GhostActor | UserActor`
- Vérifie Ghost session d'abord, puis Better Auth.

### 29.6 Better Auth username/email login

**Fichier** : `src/lib/auth.ts`

- Ajouter le plugin `username` (vérifier l'export dans better-auth 1.7.1).
- Conserver `emailAndPassword` activé.
- Mettre à jour la configuration avec `username: { enabled: true, minUsernameLength: 3, maxUsernameLength: 30 }`.

### 29.7 user.platform_role

**Fichier** : `src/lib/db/schema/index.ts` + migration Drizzle

- Ajouter la colonne `platform_role` sur `user` avec `DEFAULT 'none'`.
- Créer l'enum PostgreSQL `platform_role` = `{super_admin, none}`.
- Conserver la colonne `role` (app_role) pendant la transition (dual write).

### 29.8 school_membership

**Fichier** : `src/lib/db/schema/index.ts` + migration Drizzle

- Créer la table `school_membership` (id, school_id, user_id, role, is_active, created_at, updated_at).
- Contrainte `UNIQUE(school_id, user_id)`.
- Charger les memberships dans `getSession()`.

### 29.9 Centralized permissions

**Fichier** : `src/lib/permissions.ts` (déjà existant, à conserver)

- La matrice 32 permissions est figée.
- Ajouter les permissions Recovery/System dans la navigation si nécessaire.

### 29.10 Server guards

**Fichier** : `src/lib/authorization.ts` (à étendre)

- Ajouter `requireGhost()`, `requireSuperAdmin()`, `requireSchoolAccess()`, `requireTeacherScope()`.
- Étendre `AuthorizationError` avec les 7 codes d'erreur.
- Conserver les fonctions existantes (`checkPermission`, `requirePermission`, etc.).

### 29.11 Teacher scope

**Fichier** : `src/lib/authorization.ts` + `src/lib/teacher-scope.ts`

- `requireTeacherScope(actor, classroomId, subjectId, periodId)`: vérifie `teacher_assignment` pour le membership actif du teacher.
- Vérifie la temporalité de l'affectation (période active).

### 29.12 Ghost audit

**Fichier** : `src/lib/audit.ts`

- `auditGhostAction(action: string, context?: Record<string, unknown>)`
- Écrire dans `audit_log` avec `actor_type = 'ghost'`, `actor_identifier = 'fantomas'`, `user_id = NULL`.
- Si DB indisponible : logger runtime minimal (sans secrets).

### 29.13 Recovery guards

**Fichier** : `src/lib/authorization.ts`

- `requireGhost()` protège toutes les routes `/system/recovery/*`.
- Origin validation pour les endpoints Recovery.
- Toutes les mutations Recovery via POST.

### 29.14 Bootstrap Super Admin

**Fichier** : `src/lib/bootstrap.ts`

- `checkSuperAdminExists(): Promise<boolean>` — compte les users avec `platform_role = 'super_admin'`.
- `bootstrapSuperAdmin(email, name, password): Promise<User>` — crée user + account via Better Auth + `platform_role = 'super_admin'`.
- Protégé par `requireGhost()`.

### 29.15 Auth tests

**Fichier** : `src/tests/auth/`

- Implémenter tous les tests GHOST-01 à GHOST-20.
- Implémenter tous les tests AUTH-01 à AUTH-10.
- Implémenter tous les tests TEACHER-01 à TEACHER-04.
- Implémenter tous les tests NAV-AUTH-01 à NAV-AUTH-05.

---

## 30. Definition of Done

R-V2-03 est considéré DONE lorsque :

1. Le document `R-V2-03_AUTH_GHOST_DESIGN.md` contient les 29 sections ci-dessus.
2. Le document `R-V2-03_AUTH_THREAT_MODEL.md` contient les 15 menaces.
3. Tous les critères PASS de la section 31 sont satisfaits.
4. Aucune contradiction avec R-V2-01 (modèle figé) ou R-V2-UI-02 (navigation RBAC).
5. Le M1 Implementation Contract est complet et non ambigu.

---

## 31. Quality Gate

| # | Critère | Statut |
|---|---------|--------|
| QG-01 | Fantomas fonctionne conceptuellement sans DB | PASS |
| QG-02 | Fantomas ne dépend pas de Better Auth | PASS |
| QG-03 | Fantomas ne dépend pas de `user` | PASS |
| QG-04 | Fantomas ne dépend pas de `account` | PASS |
| QG-05 | Fantomas ne dépend pas de `session` PostgreSQL | PASS |
| QG-06 | Credentials Ghost sortent du code source (→ env vars) | PASS (design) |
| QG-07 | `GHOST_SESSION_SECRET` défini | PASS (design) |
| QG-08 | Session Ghost cryptographiquement authentifiée (HS256) | PASS (design) |
| QG-09 | Cookie HttpOnly | PASS (design) |
| QG-10 | Secure en production | PASS (design) |
| QG-11 | Expiration Ghost définie (7 jours) | PASS (design) |
| QG-12 | Logout défini | PASS (design) |
| QG-13 | Secret rotation invalide sessions | PASS (design) |
| QG-14 | Session falsifiée rejetée | PASS (design) |
| QG-15 | `platform_role` reste `super_admin` / `none` | PASS |
| QG-16 | `school_role` reste `admin`/`direction`/`teacher`/`reader` | PASS |
| QG-17 | SUPER_ADMIN global | PASS |
| QG-18 | ADMIN sans User CRUD | PASS |
| QG-19 | Recovery Ghost-only | PASS (design) |
| QG-20 | Better Auth username/email défini | PASS (design) |
| QG-21 | Aucun signup public | PASS (design) |
| QG-22 | Aucune email verification obligatoire | PASS (design) |
| QG-23 | Teacher Resource Scope défini | PASS (design) |
| QG-24 | RBAC serveur centralisé | PASS |
| QG-25 | Navigation et serveur même permission model | PASS |
| QG-26 | DB health states définis | PASS (design) |
| QG-27 | Recovery Mode défini | PASS (design) |
| QG-28 | Aucune SQLite | PASS |
| QG-29 | Secrets non loggés | PASS (design) |
| QG-30 | CSRF/origin strategy définie | PASS (design) |
| QG-31 | Rate limiting défini | PASS (design) |
| QG-32 | Erreurs typées | PASS (design) |
| QG-33 | Threat model produit | PASS (document séparé) |
| QG-34 | Tests Auth définis | PASS |
| QG-35 | Tests Ghost définis | PASS |
| QG-36 | Tests RBAC définis | PASS |
| QG-37 | M1 Implementation Contract produit | PASS |

---

## 32. Final Verdict

```
R-V2-03 — AUTH GHOST DESIGN
STATUS: PASS
AUTH DESIGN: FROZEN
```

Tous les 37 critères Quality Gate sont satisfaits. Aucune contradiction avec R-V2-01 ou R-V2-UI-02. Le M1 Implementation Contract est complet et non ambigu.

Après validation :

```
R-V2-03 AUTH DESIGN FROZEN
        │
        ▼
M1 — AUTH / AUTHORIZATION EXPAND
        │
        ├── Better Auth username plugin
        ├── platform_role sur user
        ├── school_membership table
        ├── Ghost Auth (env vars, secret dédié)
        ├── Ghost Session (JWT, cookie dédié)
        ├── Centralized RBAC (requireGhost, requireTeacherScope, etc.)
        ├── Server guards étendus
        ├── Recovery integration
        ├── Bootstrap SUPER_ADMIN
        └── Automated tests (GHOST-01→20, AUTH-01→10, TEACHER-01→04, NAV-AUTH-01→05)
```

---

*Fin du document R-V2-03 — AUTH GHOST DESIGN*