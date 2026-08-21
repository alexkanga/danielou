# ADR-002 : Neon PostgreSQL

## Statut

Accepté

## Contexte

La plateforme nécessite une base de données relationnelle fiable, hébergée, compatible Vercel.

## Décision

Utiliser **Neon PostgreSQL** comme seule base de données du projet.

## Justification

- Intégration native Vercel
- Serverless driver HTTP (pas de connexion persistante nécessaire)
- Branching de base de données pour les Preview Deployments
- Backup PITR inclus
- Région configurable

## Conséquences

- Toutes les requêtes passent par le driver HTTP Neon
- Le pooling est géré par Neon
- Les migrations utilisent `drizzle-kit` en mode standard
