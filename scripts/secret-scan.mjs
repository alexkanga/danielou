import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

function walk(dir, exts, exclude) {
  let files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!exclude.includes(entry.name)) files.push(...walk(full, exts, exclude));
    } else if (exts.some(e => full.endsWith(e))) {
      files.push(full);
    }
  }
  return files;
}

const files = walk('src/lib', ['.ts', '.tsx'], ['node_modules', '.next']);
const patterns = [
  /password\s*[:=]\s*['"]fantomas['"]/,  /GHOST_SESSION_SECRET\s*[:=]\s*['"][^'"]{10,}['"]/,  /JSON\.stringify.*password/,  /response.*password/,
];
let found = 0;
for (const f of files) {
  const content = readFileSync(f, 'utf-8');
  for (const p of patterns) {
    if (p.test(content)) {
      console.log('FOUND in', f, ':', p.source);
      found++;
    }
  }
}
console.log(found === 0 ? 'SECRET SCAN: CLEAN (0 findings)' : 'SECRET SCAN: ' + found + ' FINDINGS');
process.exit(found > 0 ? 1 : 0);
