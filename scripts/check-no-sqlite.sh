#!/usr/bin/env bash
# SQLite Blocker — ADR-003: SQLite est formellement interdit
# Ce script échoue si une dépendance SQLite est détectée.

set -euo pipefail

FORBIDDEN_PATTERNS=(
  "sqlite3"
  "better-sqlite3"
  "libsql"
  ":memory:"
  "@libsql/client"
  "drizzle-orm/sqlite"
  "drizzle-orm/better-sqlite3"
  "drizzle-orm/libsql"
)

ERRORS=0

# Check package.json dependencies
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  if grep -q "$pattern" "$PROJECT_ROOT/package.json" 2>/dev/null; then
    echo "BLOCKED: Found '$pattern' in package.json"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check source files for SQLite imports
if find "$PROJECT_ROOT/src" -name '*.ts' -o -name '*.tsx' | xargs grep -l -E 'sqlite|libsql|better-sqlite' 2>/dev/null; then
  echo "BLOCKED: SQLite references found in source files"
  ERRORS=$((ERRORS + 1))
fi

# Check for .db / .sqlite files
if find "$PROJECT_ROOT" -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' 2>/dev/null | grep -q .; then
  echo "BLOCKED: SQLite database files found"
  ERRORS=$((ERRORS + 1))
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "BUILD BLOCKER: $ERRORS SQLite violation(s) detected."
  echo "See ADR-003: SQLite is forbidden in this project."
  exit 1
fi

echo "OK: No SQLite dependencies or files detected."
exit 0
