# ADR-003 : Interdiction de SQLite

## Statut

**NON NÉGOCIABLE**

## Contexte

Le projet gère des calculs de notes et moyennes. La précision numérique et l'intégrité des données sont critiques.

## Décision

**SQLite est formellement interdit dans tout le projet**, y compris :

- Développement local
- Tests
- CI/CD
- Preview
- Staging
- Production
- Migrations
- Seeds

### Dépendances interdites

- `sqlite3`
- `better-sqlite3`
- `libsql`
- `@libsql/client`
- Turso
- Fichiers `.db`, `.sqlite`, `.sqlite3`

## Justification

1. **Précision** : SQLite utilise des types dynamiques. NUMERIC/DECIMAL de PostgreSQL garantit la précision des calculs de moyennes.
2. **Consistance dev/prod** : Éviter les écarts de comportement entre environnements.
3. **Qualité** : Les tests doivent tourner contre le même type de base qu'en production.
4. **CI** : Un script `check-no-sqlite.sh` bloque tout build contenant une référence SQLite.

## Conséquences

- Un PostgreSQL (Neon ou local) est requis même pour le développement
- Les tests d'intégration nécessitent une base PostgreSQL réelle
- Le script CI échoue si une dépendance SQLite est détectée
