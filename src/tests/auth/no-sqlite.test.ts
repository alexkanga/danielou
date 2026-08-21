      /**
     * GHOST-15 : Aucune SQLite dans le code
     * 
     * Ce test vérifie qu'aucun fichier source n'importe sqlite,
     * better-sqlite3, ou toute bibliothèque SQLite.
     */
    
    import { describe, it, expect } from 'vitest';
    import { readFileSync, readdirSync, existsSync } from 'fs';
    import { join } from 'path';
    
    describe('GHOST-15: No SQLite', () => {
      const FORBIDDEN_PATTERNS = [
        'sqlite3',
        'better-sqlite3',
        'sql.js',
        'sqlcipher',
      ];
    
      it('package.json does not depend on SQLite', () => {
        const pkg = JSON.parse(
          readFileSync(join(__dirname, '../../../package.json'), 'utf-8'),
        );
    
        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies,
        };
    
        for (const [name] of Object.entries(allDeps)) {
          const lower = name.toLowerCase();
          for (const pattern of FORBIDDEN_PATTERNS) {
            expect(lower).not.toContain(pattern);
          }
        }
      });

      it('no source file imports sqlite', () => {
        const srcDir = join(__dirname, '../../');
        const files = findTsFiles(srcDir).filter(f => !f.includes('no-sqlite.test'));
        
        const violations: string[] = [];
        for (const file of files) {
          const content = readFileSync(file, 'utf-8');
          for (const pattern of FORBIDDEN_PATTERNS) {
            if (content.toLowerCase().includes(pattern)) {
              violations.push(`${file}: contains '${pattern}'`);
            }
          }
        }
        
        expect(violations).toEqual([]);
      });
    });
    
    function findTsFiles(dir: string): string[] {
      if (!existsSync(dir)) return [];
      const results: string[] = [];
      const entries = readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.next') continue;
          results.push(...findTsFiles(fullPath));
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          results.push(fullPath);
        }
      }
      
      return results;
    }