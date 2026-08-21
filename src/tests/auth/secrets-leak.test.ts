/**
 * M1 Security Gate — Secrets Leak Tests (GHOST-16)
 * 
 * Vérifie qu'aucun secret n'est exposé dans les logs,
 * les réponses API, ou le code source.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SRC_DIR = path.resolve(__dirname, '../../lib');

function readDirRecursive(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...readDirRecursive(full));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(full);
    }
  }
  return files;
}

describe('GHOST-16: Secrets absent from source code', () => {
  const files = readDirRecursive(SRC_DIR);

  // Ces chaînes NE doivent JAMAIS apparaître en dur dans le source
  const FORBIDDEN_PATTERNS = [
    // Pas de valeurs secrètes en dur
    /password\s*[:=]\s*['"]fantomas['"]/, 
    /GHOST_SESSION_SECRET\s*[:=]\s*['"][^'"]{10,}['"]/, 
  ];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relative = path.relative(SRC_DIR, file);

    for (const pattern of FORBIDDEN_PATTERNS) {
      it(`${relative}: does not match forbidden pattern`, () => {
        expect(content).not.toMatch(pattern);
      });
    }
  }

  it('ghost-auth.ts never logs password', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'ghost-auth.ts'), 'utf-8');
    expect(content).not.toContain('console.log');
    expect(content).not.toContain('console.warn');
  });

  it('ghost-config.ts never exposes secret value', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'ghost-config.ts'), 'utf-8');
    // La config stocke le secret encodé mais ne l'expose pas dans un logger
    expect(content).not.toContain('console.log');
    expect(content).not.toContain('console.warn');
  });

  it('ghost route never returns GHOST_SESSION_SECRET in response', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, '..', 'app/api/auth/ghost/route.ts'), 'utf-8');
    expect(content).not.toContain('GHOST_SESSION_SECRET');
    // Route may reference 'password' in body destructuring — that's fine,
    // as long as the value is never sent back in responses
    expect(content).not.toMatch(/JSON\.stringify.*password/);
    expect(content).not.toMatch(/response.*password/);
  });
});
