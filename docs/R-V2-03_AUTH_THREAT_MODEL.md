# R-V2-03 — AUTH THREAT MODEL

**Projet** : Daniélou Abidjan — Plateforme de gestion scolaire  
**Date** : 2026-08-22  
**Companion** : R-V2-03_AUTH_GHOST_DESIGN.md  
**Statut** : THREAT MATRIX COMPLETE

---

## Méthodologie

Chaque menace est analysée selon le modèle STR (Scénario, Impact, Probabilité) avec une mitigation et un risque résiduel. Les menaces sont classées par sévérité décroissante.

**Échelle d'impact** : CRITIQUE / ÉLEVÉ / MOYEN / FAIBLE  
**Échelle de probabilité** : ÉLEVÉE / MOYENNE / FAIBLE  
**Échelle de risque résiduel** : CRITIQUE / ÉLEVÉ / MOYEN / FAIBLE / NÉGLIGEABLE

---

## T1 — Ghost Credential Exposure

**Catégorie** : Authentification  
**Impact** : CRITIQUE  
**Probabilité** : MOYENNE (pendant la construction ; FAIBLE en production après changement de credentials)

### Scénario

Les credentials Fantomas (`fantomas/fantomas`) sont actuellement codés en dur dans `src/lib/fantomas.ts` (ligne 14-17). Si le code source est exposé (repo public, fuite, développeur malveillant), n'importe qui peut se connecter en tant que Fantomas et obtenir tous les droits plateforme + Recovery.

Actuellement, le code source contient :
```typescript
const FANTOMAS_CREDENTIALS = {
  login: 'fantomas',
  password: 'fantomas',
} as const;
```

### Impact

- Accès complet à la plateforme en tant que Ghost.
- Création de SUPER_ADMIN.
- Accès au Recovery Mode.
- Potentiellement : destruction de la DB via les actions Recovery.

### Mitigation

1. **R-V2-03 design** : déplacer les credentials vers `FANTOMAS_USERNAME` / `FANTOMAS_PASSWORD` (env vars serveur uniquement).
2. **M1** : supprimer les credentials hardcodés de `fantomas.ts`.
3. **Production** : le propriétaire change les credentials pour des valeurs fortes.
4. **Monitoring** : alerte si le compte Fantomas se connecte depuis une IP inhabituelle.

### Risque résiduel

**FAIBLE** — après M1, les credentials sont dans les env vars. Le risque résiduel est la compromission des env vars (accès au dashboard Vercel, fuite par un développeur). La rotation de `GHOST_SESSION_SECRET` permet de révoquer les sessions.

---

## T2 — Ghost Session Forgery

**Catégorie** : Authentification / Session  
**Impact** : CRITIQUE  
**Probabilité** : FAIBLE

### Scénario

Un attaquant fabrique manuellement un JWT avec le payload :

```json
{
  "sub": "fantomas-ghost",
  "actorType": "ghost",
  "role": "ghost",
  "name": "Fantomas"
}
```

et tente de l'utiliser comme cookie pour se faire passer pour Fantomas.

### Impact

Même impact que T1 : accès complet plateforme + Recovery.

### Mitigation

1. Le JWT est signé avec `GHOST_SESSION_SECRET` (HMAC-SHA256 via `jose`).
2. Sans le secret, l'attaquant ne peut pas produire une signature valide.
3. Le serveur vérifie la signature cryptographique à chaque requête.
4. Le payload est vérifié (`sub === 'fantomas-ghost'`, `actorType === 'ghost'`).
5. Un token non signé ou mal signé est rejeté avec 401.

### Risque résiduel

**NÉGLIGEABLE** — la seule façon de contourner est de voler `GHOST_SESSION_SECRET`, ce qui est couvert par T10.

---

## T3 — Cookie Theft

**Catégorie** : Session  
**Impact** : ÉLEVÉ  
**Probabilité** : MOYENNE

### Scénario

Un attaquant vole le cookie `danielou_ghost_session` ou `better-auth.session_token` via :

- XSS (JavaScript malveillant dans la page).
- Network sniffing (HTTP non chiffré).
- Accès physique à la machine de l'utilisateur.
- Malware sur la machine de l'utilisateur.

### Impact

- Cookie Ghost volé → accès Fantomas complet.
- Cookie Better Auth volé → accès en tant que l'utilisateur volé.

### Mitigation

1. **HttpOnly** : les cookies sont `httpOnly = true`. JavaScript ne peut pas les lire. Contre les attaques XSS classiques.
2. **Secure** : en production, `secure = true` oblige HTTPS. Contre le network sniffing.
3. **SameSite: Lax** : le cookie n'est pas envoyé dans les requêtes cross-origin. Contre les attaques CSRF.
4. **CSP** (recommandé) : un Content-Security-Policy strict limite l'exécution de JavaScript non autorisé.
5. **Rotation d'urgence** : changer `GHOST_SESSION_SECRET` invalide toutes les sessions Ghost existantes.

### Risque résiduel

**FAIBLE** — les mitigations couvrent les vecteurs principaux. Le risque résiduel est le vol via accès physique ou malware, qui est un problème de sécurité endpoint, pas de l'application.

---

## T4 — Privilege Escalation

**Catégorie** : Autorisation  
**Impact** : ÉLEVÉ  
**Probabilité** : FAIBLE

### Scénario

Un utilisateur normal (ADMIN, TEACHER, READER) tente d'obtenir des permissions supérieures via :

- Modification du cookie pour injecter `platformRole: 'super_admin'`.
- Appel direct d'une API de gestion utilisateurs.
- Exploitation d'une page qui ne vérifie pas les permissions côté serveur.

### Impact

- ADMIN obtenant `platform:users:manage` → peut créer des utilisateurs.
- TEACHER obtenant `school:report_cards:publish` → peut publier des bulletins.
- READER obtenant des permissions d'écriture → peut modifier des données.

### Mitigation

1. Les rôles ne sont **jamais** dérivés du cookie. La session est validée cryptographiquement.
2. Pour les utilisateurs Better Auth, le rôle vient de `user.platform_role` en DB, pas du cookie.
3. Chaque Server Action / route handler appelle `requirePermission()` côté serveur.
4. Le masquage UI n'est jamais une autorisation (MISSION §19).
5. ADMIN n'a pas les permissions `platform:*` dans la matrice RBAC.
6. READER n'a que des permissions `:read`.

### Risque résiduel

**NÉGLIGEABLE** — si tous les guards sont correctement implémentés (M1), l'escalade est impossible sans compromettre la DB ou le serveur.

---

## T5 — Better Auth → Ghost Fallback Abuse

**Catégorie** : Authentification  
**Impact** : CRITIQUE  
**Probabilité** : FAIBLE

### Scénario

Un attaquant tente de provoquer un fallback automatique de Better Auth vers Ghost Auth. Par exemple :

- Se connecter avec un email qui ressemble à `fantomas` → Better Auth échoue → système tente Ghost.
- Envoyer des identifiants invalides à Better Auth → Better Auth échoue → système tente Ghost.

Si le système implémente un fallback automatique, un attaquant pourrait brute-forcer les credentials Ghost via le endpoint Better Auth (qui n'a pas de rate limiting Ghost).

### Impact

Accès Fantomas si les credentials Ghost sont devinés.

### Mitigation

1. **Design R-V2-03** : la détection Ghost est basée sur l'égalité stricte de l'identifiant avec `FANTOMAS_USERNAME`. Il n'y a **jamais** de fallback automatique.
2. Le login flow est : identifier == FANTOMAS_USERNAME ? → Ghost : → Better Auth. Pas de chemin croisé.
3. Même si Better Auth échoue pour un identifiant qui n'est pas Fantomas, le système retourne `INVALID_CREDENTIALS` sans tenter Ghost.

### Risque résiduel

**NÉGLIGEABLE** — le design élimine complètement ce vecteur. La seule façon d'accéder à Ghost Auth est d'utiliser exactement `FANTOMAS_USERNAME` comme identifiant.

---

## T6 — Direct Route Bypass

**Catégorie** : Autorisation  
**Impact** : ÉLEVÉ  
**Probabilité** : MOYENNE

### Scénario

Un utilisateur accède directement à une URL protégée sans passer par la navigation. Par exemple :

- ADMIN saisit `/dashboard/admin/utilisateurs` directement dans la barre d'adresse.
- TEACHER saisit `/dashboard/bulletins/validation` directement.
- READER saisit `/system/recovery` directement.

### Impact

- Accès non autorisé à des pages et fonctionnalités sensibles.

### Mitigation

1. Le middleware protège les routes `/dashboard/*` (vérifie un cookie valide).
2. Chaque page vérifie les permissions côté serveur via `getSession()` + `requirePermission()`.
3. Les Server Actions vérifient les permissions avant d'exécuter toute mutation.
4. Les route handlers API vérifient les permissions.
5. La navigation masque les items non autorisés (UX), mais le serveur rejette les accès non autorisés (sécurité).

### Risque résiduel

**FAIBLE** — si un développeur oublie d'ajouter un guard sur une nouvelle page ou action, la route est vulnérable. La mitigation est le code review systématique et les tests NAV-AUTH.

---

## T7 — Teacher Resource-Scope Bypass

**Catégorie** : Autorisation / Scope  
**Impact** : ÉLEVÉ  
**Probabilité** : MOYENNE

### Scénario

Un Teacher affecté à la classe CP1 A (Français) tente de :

- Accéder aux notes de la classe CP1 B (non affecté) via URL directe.
- Modifier les notes de Mathématiques dans CP1 A (non affecté à cette matière).
- Saisir des notes pour une période passée (affectation terminée).

### Impact

- Modification de notes pour des classes/matières non autorisées.
- Falsification de bulletins.

### Mitigation

1. **`requireTeacherScope(actor, classroomId, subjectId, periodId)`** : vérifie `teacher_assignment` en DB.
2. La vérification est triple : permission + school scope + resource scope.
3. Le scope est vérifié côté serveur dans chaque Server Action de mutation de notes.
4. Les IDs de ressource sont passés en paramètres de la fonction, pas dérivés du client.

### Risque résiduel

**FAIBLE** — si `requireTeacherScope` est correctement appelé dans chaque action de saisie de notes, le bypass est impossible. Le risque est un oubli d'un développeur.

---

## T8 — CSRF Recovery

**Catégorie** : Recovery  
**Impact** : CRITIQUE  
**Probabilité** : MOYENNE

### Scénario

Un attaquant crée une page malveillante qui, lorsqu'un administrateur Fantomas la visite, déclenche une action Recovery (par exemple, réinitialiser la DB) via une requête forgée.

Exemple :

```html
<img src="https://danielou-abidjan.vercel.app/api/recovery/reset?confirm=true">
```

### Impact

- Réinitialisation non autorisée de la DB.
- Exécution de migrations non contrôlées.
- Bootstrap d'un SUPER_ADMIN malveillant.

### Mitigation

1. **SameSite: Lax** sur le cookie Ghost → le cookie n'est pas envoyé dans les requêtes cross-origin POST.
2. **Toutes les mutations Recovery via POST** (Server Actions ou route handlers) → les requêtes GET sont rejetées avec 405.
3. **Origin validation** : vérification du header `Origin` pour les endpoints Recovery.
4. **Server Actions** : Next.js `use server` génère automatiquement des POST avec token CSRF intégré.
5. **Confirmation explicite** : les actions destructrices Recovery nécessitent une confirmation côté serveur (pas un simple query param).

### Risque résiduel

**FAIBLE** — la combinaison SameSite + POST-only + Origin validation + Server Actions rend le CSRF très difficile. Le risque résiduel est un navigateur avec SameSite désactivé ou une faille dans le mécanisme CSRF de Next.js.

---

## T9 — Brute Force Ghost Login

**Catégorie** : Authentification  
**Impact** : ÉLEVÉ  
**Probabilité** : MOYENNE (en dev avec `fantomas/fantomas`) ; FAIBLE (en production avec credentials forts)

### Scénario

Un attaquant tente de brute-forcer le login Fantomas en envoyant de nombreuses requêtes à `POST /api/auth/ghost` avec différents passwords.

### Impact

- Si le password est deviné → accès complet Fantomas.
- Si le password est `fantomas` (actuel) → trivial à deviner.

### Mitigation

1. **Rate limiting** : 10 tentatives par IP par fenêtre de 15 minutes (cf. R-V2-03 §22).
2. **Réponse générique** : `INVALID_CREDENTIALS` ne permet pas de distinguer username invalide de password invalide.
3. **Ne jamais logger le password** → les logs ne révèlent pas si le password était proche.
4. **Production** : le propriétaire changera les credentials pour des valeurs fortes.
5. **Lockout** : pas de lockout de compte (Fantomas n'a pas de compte DB). Le rate limiting par IP est suffisant.

### Risque résiduel

**MOYEN en dev, FAIBLE en production**. En dev, `fantomas/fantomas` est trivial. En production, avec des credentials forts + rate limiting, le bruteforce est impraticable. Le rate limiting per-instance en serverless est une limitation (cold start réinitialise le compteur), mais l'objectif est d'empêcher le bruteforce trivial, pas une attaque distribuée.

---

## T10 — Secret Leakage in Logs

**Catégorie** : Configuration / Logging  
**Impact** : CRITIQUE  
**Probabilité** : MOYENNE

### Scénario

Un secret (`GHOST_SESSION_SECRET`, `BETTER_AUTH_SECRET`, `FANTOMAS_PASSWORD`, `DATABASE_URL`) apparaît dans :

- Les logs de l'application (console.log, logger structuré).
- Les erreurs renvoyées au client (stack trace contenant un secret).
- Les métriques ou traces.
- Les logs Vercel.

### Impact

- `GHOST_SESSION_SECRET` volé → forger des sessions Ghost.
- `BETTER_AUTH_SECRET` volé → forger des sessions Better Auth.
- `DATABASE_URL` volé → accès direct à la DB.
- `FANTOMAS_PASSWORD` volé → connexion en tant que Fantomas.

### Mitigation

1. **Règle stricte** (R-V2-03 §20) : ne jamais logger les secrets listés.
2. Les objets d'erreur ne contiennent jamais les valeurs secrètes.
3. Les réponses API ne contiennent jamais les secrets.
4. Les variables `FANTOMAS_*` et `GHOST_*` ne portent pas le préfixe `NEXT_PUBLIC_`.
5. Le module `ghost-auth.ts` ne loggue que des événements (pas les valeurs).
6. Les erreurs capturées dans `catch` ne sont pas loguées avec leur contenu complet.

### Risque résiduel

**FAIBLE** — si les règles de logging sont respectées dans tout le code (actuel + futur), le risque est négligeable. Le risque résiduel est un développeur qui ajoute un `console.log` contenant un secret.

---

## T11 — DB Outage

**Catégorie** : Disponibilité  
**Impact** : ÉLEVÉ  
**Probabilité** : MOYENNE

### Scénario

PostgreSQL (Neon) devient indisponible :

- Panne Neon.
- Mauvaise configuration `DATABASE_URL`.
- Suppression accidentelle de la DB.
- Suppression des tables (DROP TABLE).

### Impact

- Les utilisateurs normaux ne peuvent plus se connecter ni utiliser la plateforme.
- Les données métier sont inaccessibles.
- La plateforme est partiellement ou totalement hors service.

### Mitigation

1. **Ghost Auth** : fonctionne sans DB. Fantomas peut toujours se connecter.
2. **Recovery Mode** : Fantomas accède à une interface minimale pour diagnostiquer et réparer.
3. **État typé** : `AVAILABLE`, `UNAVAILABLE`, `MIGRATION_REQUIRED`, `MISCONFIGURED`.
4. **UX** : les utilisateurs normaux voient une page `DATABASE_UNAVAILABLE` (déjà implémentée par R-V2-UI-02).
5. **Pas de fallback SQLite** : la plateforme ne cache pas la panne avec une base de données locale.

### Risque résiduel

**MOYEN** — la panne DB impacte tous les utilisateurs normaux. La mitigation est le Recovery Mode via Fantomas. Le risque résiduel est une panne prolongée sans accès Fantomas (par exemple, si le serveur Next.js lui-même est en panne — auquel cas Recovery Mode n'est pas non plus accessible).

---

## T12 — DATABASE_URL Misconfiguration

**Catégorie** : Configuration  
**Impact** : ÉLEVÉ  
**Probabilité** : FAIBLE

### Scénario

La variable `DATABASE_URL` est incorrecte (mauvaise URL, mauvais mot de passe, mauvais host). Le système tente de se connecter à PostgreSQL avec une configuration invalide.

### Impact

- Même impact que T11 (DB outage).
- Potentiellement : fuite du DATABASE_URL dans les logs d'erreur.

### Mitigation

1. L'état `MISCONFIGURED` est défini dans le health model.
2. Les erreurs de connexion ne sont pas loguées avec le DATABASE_URL complet.
3. Le Recovery Mode affiche l'état sans exposer la valeur de `DATABASE_URL`.
4. Fantomas peut corriger la configuration via le dashboard Vercel (hors de la plateforme).

### Risque résiduel

**FAIBLE** — la configuration est gérée via les variables d'environnement Vercel. Le risque est une erreur humaine lors de la configuration.

---

## T13 — Migration Endpoint Abuse

**Catégorie** : Recovery  
**Impact** : CRITIQUE  
**Probabilité** : FAIBLE

### Scénario

Un attaquant accède aux endpoints de migration Recovery (initialiser le schéma, exécuter les migrations, repartir le seed) sans être Fantomas, ou avec des paramètres malveillants.

### Impact

- Exécution de migrations non contrôlées.
- Écrasement de données.
- Reprovisionnement de données de référence avec des valeurs malveillantes.

### Mitigation

1. **`requireGhost()`** : chaque endpoint Recovery est protégé par ce guard.
2. **Actions prédéfinies** : il n'y a pas d'API `executeSQL(sql: string)` ou `executeCommand(cmd: string)`. Chaque action est une opération typée et whitelistée.
3. **POST only** : les mutations Recovery ne sont pas accessibles via GET.
4. **Origin validation** : vérification du header `Origin`.
5. **Audit** : chaque action Recovery est auditée (quand DB disponible).

### Risque résiduel

**NÉGLIGEABLE** — si les guards sont correctement implémentés, un non-Ghost ne peut pas accéder aux endpoints Recovery. Le risque est un guard manquant sur un nouvel endpoint.

---

## T14 — Session Fixation

**Catégorie** : Session  
**Impact** : MOYEN  
**Probabilité** : FAIBLE

### Scénario

Un attaquant fixe un cookie Ghost ou Better Auth dans le navigateur de la victime (via XSS, injection de cookie dans une URL, ou session ID prédictible). La victime se connecte avec ce cookie fixé, et l'attaquant connaît le session ID.

### Impact

- L'attaquant peut utiliser le session ID fixé pour accéder à la session de la victime.

### Mitigation

1. **Ghost JWT** : le token est signé avec un secret serveur. L'attaquant ne peut pas prédire la valeur du token ( HMAC-SHA256 avec un secret 32+ chars).
2. **Better Auth** : gère lui-même la protection contre la session fixation (nouveau session ID au login).
3. **HttpOnly** : le cookie ne peut pas être lu/modifié via JavaScript (contre l'injection par XSS).
4. **Pas de session ID dans l'URL** : les sessions sont transportées uniquement via cookie.

### Risque résiduel

**NÉGLIGEABLE** — la combinaison JWT signé + HttpOnly + pas de session ID dans l'URL élimine ce vecteur.

---

## T15 — Mixed Ghost + User Sessions

**Catégorie** : Autorisation / Session  
**Impact** : MOYEN  
**Probabilité** : FAIBLE

### Scénario

Un navigateur possède simultanément un cookie Ghost valide et un cookie Better Auth valide. Le système pourrait :

- Fusionner les rôles (ADMIN Better Auth + Ghost → droits cumulés).
- Utiliser le mauvais acteur pour une requête.
- Créer une ambiguïté dans l'interface (afficher les deux sessions).

### Impact

- Si les rôles sont fusionnés, un utilisateur Better Auth pourrait obtenir des permissions Ghost.
- Ambiguïté dans l'UX (qui suis-je ?).

### Mitigation

1. **Priorité Ghost** : `getSession()` vérifie le cookie Ghost en premier. Si valide, l'acteur est Ghost. Le cookie Better Auth est ignoré.
2. **Pas de fusion** : les deux sessions ne sont jamais combinées. L'acteur actif est soit GhostActor, soit UserActor, jamais les deux.
3. **Logout Ghost** : le logout Ghost supprime uniquement le cookie Ghost. Le logout Better Auth est séparé.
4. **Recommandation** : une connexion Ghost peut invalider la session Better Auth dans le contexte actif (supprimer le cookie Better Auth au login Ghost). Cela évite toute ambiguïté.

### Risque résiduel

**NÉGLIGEABLE** — la priorité Ghost + pas de fusion élimine le risque d'addition de permissions. Le risque résiduel est une confusion UX mineure si les deux cookies coexistent (lequel est affiché ?). La recommandation de supprimer le cookie Better Auth au login Ghost résout cela.

---

## Matrice Récapitulative

| # | Menace | Impact | Probabilité | Risque Résiduel | Mitigation Principale |
|---|-------|--------|-------------|-----------------|---------------------|
| T1 | Ghost credential exposure | CRITIQUE | MOYENNE | FAIBLE | Env vars, credentials forts en production |
| T2 | Ghost session forgery | CRITIQUE | FAIBLE | NÉGLIGEABLE | JWT HMAC-SHA256, vérification serveur |
| T3 | Cookie theft | ÉLEVÉ | MOYENNE | FAIBLE | HttpOnly, Secure, SameSite: Lax, CSP |
| T4 | Privilege escalation | ÉLEVÉ | FAIBLE | NÉGLIGEABLE | Guards serveur, RBAC centralisé |
| T5 | Better Auth → Ghost fallback | CRITIQUE | FAIBLE | NÉGLIGEABLE | Pas de fallback automatique |
| T6 | Direct route bypass | ÉLEVÉ | MOYENNE | FAIBLE | Guards serveur sur chaque page/action |
| T7 | Teacher scope bypass | ÉLEVÉ | MOYENNE | FAIBLE | requireTeacherScope triple vérification |
| T8 | CSRF Recovery | CRITIQUE | MOYENNE | FAIBLE | SameSite, POST-only, Origin validation |
| T9 | Brute force Ghost login | ÉLEVÉ | MOYENNE (dev) / FAIBLE (prod) | FAIBLE | Rate limiting, réponse générique |
| T10 | Secret leakage in logs | CRITIQUE | MOYENNE | FAIBLE | Règles de logging strictes |
| T11 | DB outage | ÉLEVÉ | MOYENNE | MOYEN | Ghost Auth + Recovery Mode |
| T12 | DATABASE_URL misconfiguration | ÉLEVÉ | FAIBLE | FAIBLE | État MISCONFIGURED, pas d'exposition |
| T13 | Migration endpoint abuse | CRITIQUE | FAIBLE | NÉGLIGEABLE | requireGhost, actions prédéfinies |
| T14 | Session fixation | MOYEN | FAIBLE | NÉGLIGEABLE | JWT signé, HttpOnly, pas de session ID URL |
| T15 | Mixed Ghost + User sessions | MOYEN | FAIBLE | NÉGLIGEABLE | Priorité Ghost, pas de fusion |

---

*Fin du document R-V2-03 — AUTH THREAT MODEL*