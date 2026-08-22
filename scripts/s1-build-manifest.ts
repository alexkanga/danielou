import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createRequire } from 'module';
import mammoth from 'mammoth';
import { normalizeForMatching, createMatchingKey, isBrouVariant, BROU_CANONICAL } from '../src/lib/import/normalization';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const UPLOAD_DIR = '/home/z/my-project/upload';
const PRIVATE_DIR = '/home/z/my-project/danielou/data/private';

interface RawOccurrence {
  sourceFile: string;
  lastName: string;
  firstName: string;
}

interface CanonicalStudent {
  importKey: string;
  lastName: string;
  firstName: string;
  matricule: null;
  birthDate: null;
  gender: null;
  sources: string[];
  duplicateStatus: string;
  decision: string;
}

const LEVEL_PATTERNS = [/^CP\d/i, /^CE\d/i, /^CM\d/i, /^6[eè]me/i, /^5[eè]me/i, /^4[eè]me/i, /^3[eè]me/i];
const SKIP_PATTERNS = [...LEVEL_PATTERNS, /^NOMS ET PRENOMS/i, /^Nombre de fois/i, /^fois$/i, /^\d+\s*fois$/i];

function isSkippable(line: string): boolean {
  const t = line.trim();
  if (t.length < 2) return true;
  return SKIP_PATTERNS.some(p => p.test(t));
}

/** Parse label-format files (macarons): lastName / firstName pairs */
function parseLabelPairs(lines: string[], sourceFile: string): RawOccurrence[] {
  const results: RawOccurrence[] = [];
  const nonEmpty = lines
    .map((l, i) => ({ text: l.trim(), idx: i }))
    .filter(item => item.text.length > 0 && !isSkippable(item.text));

  let i = 0;
  while (i < nonEmpty.length - 1) {
    const last = nonEmpty[i];
    const first = nonEmpty[i + 1];

    // Skip if first line looks like a repeat of lastName (all caps)
    if (last.text === first.text) { i++; continue; }
    // Skip if firstName looks like a level
    if (LEVEL_PATTERNS.some(p => p.test(first.text))) { i += 2; continue; }

    results.push({
      sourceFile,
      lastName: last.text.replace(/\s+/g, ' ').trim(),
      firstName: first.text.replace(/\s+/g, ' ').trim(),
    });
    i += 2;
  }
  return results;
}

/** Parse Commande Etiquette format: lastName / firstName / "N fois" */
function parseCommandeFormat(lines: string[], sourceFile: string): RawOccurrence[] {
  const results: RawOccurrence[] = [];
  const nonEmpty = lines
    .map((l, i) => ({ text: l.trim(), idx: i }))
    .filter(item => item.text.length > 0);

  let i = 0;
  while (i < nonEmpty.length - 1) {
    const a = nonEmpty[i];
    const b = nonEmpty[i + 1];

    // Check if 'a' is lastName and 'b' is firstName (next non-"fois" line)
    if (isSkippable(a.text)) { i++; continue; }
    if (/^\d+\s*fois$/i.test(b.text)) { i += 2; continue; }
    if (isSkippable(b.text)) { i++; continue; }

    results.push({
      sourceFile,
      lastName: a.text.replace(/\s+/g, ' ').trim(),
      firstName: b.text.replace(/\s+/g, ' ').trim(),
    });
    i += 2;
  }
  return results;
}

async function extractDocx(filePath: string): Promise<string[]> {
  const buf = readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer: buf });
  return result.value.split('\n');
}

async function extractPdfText(filePath: string): Promise<string> {
  const buf = readFileSync(filePath);
  const uint8 = new Uint8Array(buf);
  const parser = new PDFParse(uint8);
  await parser.load();
  const data = await parser.getText();
  return (data as any).text;
}

async function main() {
  mkdirSync(PRIVATE_DIR, { recursive: true });

  const allOccurrences: RawOccurrence[] = [];
  const fileStats: { file: string; raw: number; exactUnique: number }[] = [];

  // === MACARON FILES (label format) ===
  const macaronFiles = [
    'MACARON MODELE MARIE MADELEINE_LISTE1.docx',
    'MACARON MODELE MARIE MADELEINE_LISTE1_SUITE.docx',
    'MACARON MODELE MARIE MADELEINE_LISTE_17_11_23.docx',
    'MACARON MODELE MARIE MADELEINE_LISTE_17_11_23_partie2.docx',
    'MACARON MODELE MARIE MADELEINE_PAGE2.docx',
  ];

  for (const file of macaronFiles) {
    try {
      const lines = await extractDocx(`${UPLOAD_DIR}/${file}`);
      const occs = parseLabelPairs(lines, file);
      const unique = new Set(occs.map(o => createMatchingKey(o.lastName, o.firstName)));
      fileStats.push({ file, raw: occs.length, exactUnique: unique.size });
      allOccurrences.push(...occs);
      console.log(`MACARON ${file}: ${occs.length} occ, ${unique.size} unique`);
    } catch (e: any) {
      console.error(`ERROR ${file}: ${e.message}`);
    }
  }

  // === PDF (label format with CP1 level) ===
  try {
    const pdfText = await extractPdfText(`${UPLOAD_DIR}/MACARON MODELE MARIE MADELEINE.pdf`);
    const pdfLines = pdfText.split('\n');
    const pdfOccs = parseLabelPairs(pdfLines, 'MACARON MODELE MARIE MADELEINE.pdf');
    const pdfUnique = new Set(pdfOccs.map(o => createMatchingKey(o.lastName, o.firstName)));
    fileStats.push({ file: 'MACARON MODELE MARIE MADELEINE.pdf', raw: pdfOccs.length, exactUnique: pdfUnique.size });
    allOccurrences.push(...pdfOccs);
    console.log(`PDF  MACARON: ${pdfOccs.length} occ, ${pdfUnique.size} unique`);
  } catch (e: any) {
    console.error(`ERROR PDF: ${e.message}`);
  }

  // === COMMANDE ETIQUETTE 2027 (master list format) ===
  try {
    const cmdLines = await extractDocx(`${UPLOAD_DIR}/Commande Etiquette 2027.docx`);
    const cmdOccs = parseCommandeFormat(cmdLines, 'Commande Etiquette 2027.docx');
    const cmdUnique = new Set(cmdOccs.map(o => createMatchingKey(o.lastName, o.firstName)));
    fileStats.push({ file: 'Commande Etiquette 2027.docx', raw: cmdOccs.length, exactUnique: cmdUnique.size });
    allOccurrences.push(...cmdOccs);
    console.log(`CMD  Commande Etiquette 2027: ${cmdOccs.length} occ, ${cmdUnique.size} unique`);
  } catch (e: any) {
    console.error(`ERROR CMD: ${e.message}`);
  }

  // === DEDUPLICATION PIPELINE ===
  console.log(`\n${'='.repeat(60)}`);
  console.log('DEDUPLICATION PIPELINE');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total raw occurrences: ${allOccurrences.length}`);

  // Step 1: Group by matching key
  const matchingGroups = new Map<string, { lastName: string; firstName: string; occurrences: RawOccurrence[] }>();
  for (const occ of allOccurrences) {
    const key = createMatchingKey(occ.lastName, occ.firstName);
    if (!matchingGroups.has(key)) {
      matchingGroups.set(key, { lastName: occ.lastName, firstName: occ.firstName, occurrences: [] });
    }
    matchingGroups.get(key)!.occurrences.push(occ);
  }

  console.log(`After normalization: ${matchingGroups.size} unique matching keys`);

  // Step 2: Apply BROU human resolution
  const brouGroup: { lastName: string; firstName: string; occurrences: RawOccurrence[] } | undefined =
    matchingGroups.get(createMatchingKey('BROU', 'N. Marie-Gabrielle Odélia')) ||
    matchingGroups.get(createMatchingKey('BROU Nétro', 'Marie – Gabryelle Odélia')) ||
    matchingGroups.get(createMatchingKey('BROU Nétro', 'Marie–Gabryelle Odélia'));

  // Collect all BROU variants
  const brouKeysToRemove: string[] = [];
  let brouAllOccurrences: RawOccurrence[] = [];
  for (const [key, group] of matchingGroups) {
    const { lastName, firstName } = group;
    if (isBrouVariant(lastName, firstName)) {
      brouKeysToRemove.push(key);
      brouAllOccurrences.push(...group.occurrences);
    }
  }

  // Remove all BROU variant keys, add canonical
  for (const key of brouKeysToRemove) {
    matchingGroups.delete(key);
  }
  if (brouAllOccurrences.length > 0) {
    matchingGroups.set(
      createMatchingKey(BROU_CANONICAL.lastName, BROU_CANONICAL.firstName),
      { lastName: BROU_CANONICAL.lastName, firstName: BROU_CANONICAL.firstName, occurrences: brouAllOccurrences }
    );
  }

  console.log(`BROU: ${brouAllOccurrences.length} raw occurrences from ${brouKeysToRemove.length} variants → 1 canonical`);
  console.log(`After BROU resolution: ${matchingGroups.size} candidate groups`);

  // Step 3: Categorize and build canonical list
  const canonicalStudents: CanonicalStudent[] = [];
  let importCounter = 1;
  let exactDupCount = 0;
  let humanConfirmedCount = 0;
  let probableCount = 0;
  let distinctCount = 0;

  for (const [key, group] of matchingGroups) {
    const sources = [...new Set(group.occurrences.map(o => o.sourceFile))];
    const occCount = group.occurrences.length;

    // Determine duplicate status
    let duplicateStatus: string;
    if (occCount > 1) {
      // Check if all occurrences have exactly the same lastName and firstName (after trim)
      const firstLast = group.occurrences[0].lastName;
      const firstFirst = group.occurrences[0].firstName;
      const allExact = group.occurrences.every(
        o => o.lastName === firstLast && o.firstName === firstFirst
      );
      if (allExact) {
        duplicateStatus = 'EXACT_DUPLICATE';
        exactDupCount++;
      } else {
        duplicateStatus = 'EXACT_DUPLICATE'; // same matching key = exact after normalization
        exactDupCount++;
      }
    } else {
      duplicateStatus = 'DISTINCT';
      distinctCount++;
    }

    // Check for BROU
    const isBrou = isBrouVariant(group.lastName, group.firstName) ||
      (group.lastName === BROU_CANONICAL.lastName && group.firstName === BROU_CANONICAL.firstName);
    if (isBrou) {
      duplicateStatus = 'HUMAN_CONFIRMED_DUPLICATE';
      humanConfirmedCount = 1; // Only 1 BROU case
      // Recount: was counted in exactDup, now should be in humanConfirmed
      exactDupCount = Math.max(0, exactDupCount - 1);
    }

    canonicalStudents.push({
      importKey: `STUDENT-IMPORT-${String(importCounter).padStart(4, '0')}`,
      lastName: isBrou ? BROU_CANONICAL.lastName : group.lastName,
      firstName: isBrou ? BROU_CANONICAL.firstName : group.firstName,
      matricule: null,
      birthDate: null,
      gender: null,
      sources,
      duplicateStatus,
      decision: 'APPROVED',
    });
    importCounter++;
  }

  // Sort by importKey for reproducibility
  canonicalStudents.sort((a, b) => a.importKey.localeCompare(b.importKey));

  // === REPORT ===
  console.log(`\n${'='.repeat(60)}`);
  console.log('CANONICAL STUDENT CANDIDATES');
  console.log(`${'='.repeat(60)}`);
  console.log(`SOURCE_CANONICAL_COUNT: ${canonicalStudents.length}`);
  console.log(`  EXACT_DUPLICATE:        ${exactDupCount}`);
  console.log(`  HUMAN_CONFIRMED_DUPLICATE: ${humanConfirmedCount}`);
  console.log(`  PROBABLE_DUPLICATE:     ${probableCount}`);
  console.log(`  DISTINCT:               ${distinctCount}`);

  // === SAVE PRIVATE MANIFEST ===
  const manifest = {
    importVersion: 'STUDENT-IMPORT-V1',
    generatedAt: new Date().toISOString(),
    pipeline: 'RAW → NORMALIZE → DEDUP → HUMAN_RESOLUTION → CANONICAL',
    stats: {
      totalRawOccurrences: allOccurrences.length,
      sourceFiles: fileStats,
      canonicalCandidateCount: canonicalStudents.length,
      exactDuplicateGroups: exactDupCount,
      humanConfirmedGroups: humanConfirmedCount,
      probableDuplicateGroups: probableCount,
      distinctCandidates: distinctCount,
    },
    brouResolution: {
      variantsFound: brouKeysToRemove.length,
      totalRawOccurrences: brouAllOccurrences.length,
      canonicalLastName: BROU_CANONICAL.lastName,
      canonicalFirstName: BROU_CANONICAL.firstName,
    },
    students: canonicalStudents,
  };

  writeFileSync(`${PRIVATE_DIR}/students-import.json`, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest saved to data/private/students-import.json`);
  console.log(`\nVerification: ${canonicalStudents.length} importKeys`);
  const keySet = new Set(canonicalStudents.map(s => s.importKey));
  console.log(`Unique importKeys: ${keySet.size}`);
  if (keySet.size !== canonicalStudents.length) {
    console.error('ERROR: DUPLICATE IMPORT KEYS DETECTED!');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
