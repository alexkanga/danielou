# Daniélou Abidjan — Gestion scolaire

Plateforme professionnelle de gestion des résultats scolaires pour l'école primaire Daniélou Abidjan, Côte d'Ivoire.

## Stack technique

| Technologie | Version | Rôle |
|-------------|---------|------|
| Next.js | 16.3.1 | Framework full-stack (App Router) |
| React | 19.2.8 | UI |
| TypeScript | 5.9.3 | Langage (strict mode) |
| Tailwind CSS | 4.3.3 | Styles |
| Drizzle ORM | 0.45.2 | Accès données PostgreSQL |
| Neon | serverless | Base de données PostgreSQL |
| Better Auth | 1.7.1 | Authentification |
| decimal.js | 10.6.0 | Calculs précis (notes, moyennes) |
| Zod | 4.4.3 | Validation |
| Vitest | 4.1.11 | Tests unitaires |
| pnpm | 11.22.0 | Gestionnaire de paquets |

## Prérequis

- Node.js >= 20 (voir `.nvmrc`)
- pnpm 11.x
- Accès à une base Neon PostgreSQL

## Installation

```bash
cp .env.example .env.local
# Remplir les valeurs dans .env.local
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed   # Optionnel, pour les données de démo
pnpm dev
```

## Variables d'environnement

| Variable | Description | Requise |
|----------|-------------|---------|
| `DATABASE_URL` | URL de connexion Neon PostgreSQL | Oui |
| `DIRECT_URL` | URL directe Neon (pour migrations) | Oui |
| `AUTH_SECRET` | Secret pour Better Auth (min 32 car.) | Oui |
| `BETTER_AUTH_SECRET` | Alias du secret auth | Oui |
| `BETTER_AUTH_URL` | URL publique de l'application | Oui |
| `NODE_ENV` | Environnement (development/production) | Non |
| `TZ` | Fuseau horaire (Africa/Abidjan) | Non |

## Scripts

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Serveur de développement (Turbopack) |
| `pnpm build` | Build de production |
| `pnpm start` | Démarrer le serveur de production |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Vérification TypeScript |
| `pnpm test` | Tests (Vitest) |
| `pnpm test:unit` | Tests unitaires uniquement |
| `pnpm test:watch` | Tests en mode watch |
| `pnpm db:generate` | Générer les migrations Drizzle |
| `pnpm db:migrate` | Appliquer les migrations |
| `pnpm db:studio` | Drizzle Studio (admin DB) |
| `pnpm check:sqlite` | Vérifier l'absence de SQLite (CI) |

## Architecture

```
Monolithe modulaire Next.js (App Router)
├── src/
│   ├── app/              # Routes Next.js
│   │   ├── (auth)/        # Pages d'authentification
│   │   ├── (dashboard)/   # Pages protégées
│   │   └── api/           # Route Handlers
│   ├── modules/          # Modules métier
│   │   ├── school/        # Établissement
│   │   ├── academic-years/# Années scolaires
│   │   ├── classrooms/    # Classes
│   │   ├── students/      # Élèves
│   │   ├── pedagogy/      # Configuration pédagogique
│   │   ├── assessments/   # Évaluations
│   │   ├── grading/       # Notes
│   │   ├── report-cards/  # Bulletins
│   │   ├── analytics/     # Statistiques
│   │   ├── users/         # Utilisateurs
│   │   └── audit/         # Journal d'audit
│   ├── components/
│   │   ├── ui/            # Composants génériques
│   │   └── layout/        # Shell (sidebar, topbar)
│   ├── lib/
│   │   ├── db/            # Drizzle ORM + schema
│   │   ├── auth/          # Better Auth
│   │   ├── security/      # Utilitaires sécurité
│   │   ├── decimal.ts     # Moteur de calcul précis
│   │   ├── env.ts         # Validation des variables
│   │   ├── logger.ts      # Logs structurés
│   │   └── utils.ts       # Utilitaires (cn, formatage)
│   └── tests/
│       ├── unit/          # Tests unitaires
│       ├── integration/   # Tests d'intégration
│       └── e2e/           # Tests end-to-end (Playwright)
├── drizzle/               # Migrations SQL générées
├── scripts/               # Scripts utilitaires
└── .github/workflows/     # CI/CD
```

## Déploiement Vercel

1. Connecter le repository GitHub au projet Vercel
2. Configurer les variables d'environnement dans Vercel
3. Les Preview Deployments sont automatiques sur chaque PR
4. Le déploiement production se fait sur `main`
5. Région recommandée : choisir la plus proche de l'Afrique de l'Ouest

## CI/CD

- **CI** (`.github/workflows/ci.yml`) : lint + typecheck + tests + build + check SQLite
- **Preview** (`.github/workflows/deploy-preview.yml`) : build des PRs

## Règles critiques

- **SQLite est formellement interdit** (ADR-003) — seul PostgreSQL/Neon est autorisé
- Les calculs de notes utilisent `decimal.js` (pas de floating points JavaScript)
- Les règles pédagogiques sont en base de données, pas codées en dur
- Les autorisations sont vérifiées côté serveur
- Aucun secret dans Git

## Licence

Privé — Daniélou Abidjan
