# ADR-001 : Next.js Modular Monolith

## Statut

Accepté

## Contexte

La plateforme doit gérer des données scolaires sensibles (notes, bulletins, résultats) pour une école primaire. Le système doit être fiable, sécurisé et déployable sur Vercel.

## Décision

Utiliser un **monolithe modulaire Next.js** (App Router) comme architecture unique.

Un seul repository, une seule application déployable, une seule base PostgreSQL.

## Conséquences

### Positives
- Déploiement simplifié sur Vercel
- Pas de complexité réseau inter-services
- Partage de code facile
- Debugging simplifié
- CI/CD simple

### Négatives
- Couplage plus fort entre modules
- Scaling vertical uniquement
- Moins de flexibilité d'isolation

### Mitigations
- Organisation feature-first en modules
- Séparation claire domaine/infrastructure
- Moteur de calcul indépendant (testable sans Next.js)
- Autorisations vérifiées côté serveur