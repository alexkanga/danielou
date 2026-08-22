# S1 — Student Source Deduplication Audit

## 1. Source Files

| # | File | Type | Raw Occurrences | Exact Unique | Role |
|---|------|------|----------------:|-------------:|------|
| 1 | MACARON MODELE MARIE MADELEINE_LISTE1.docx | DOCX | 42 | 9 | Label sheet — CP1 class
| 2 | MACARON MODELE MARIE MADELEINE_LISTE1_SUITE.docx | DOCX | 24 | 4 | Label sheet — CP1 class (continuation)
| 3 | MACARON MODELE MARIE MADELEINE_LISTE_17_11_23.docx | DOCX | 42 | 6 | Label sheet — historical (Nov 2023)
| 4 | MACARON MODELE MARIE MADELEINE_LISTE_17_11_23_partie2.docx | DOCX | 4 | 1 | Label sheet — historical (continuation)
| 5 | MACARON MODELE MARIE MADELEINE_PAGE2.docx | DOCX | 164 | 1 | Label sheet — single student, heavy duplication
| 6 | MACARON MODELE MARIE MADELEINE.pdf | PDF | 41 | 1 | Label sheet — same student as PAGE2
| 7 | Commande Etiquette 2027.docx | DOCX | 52 | 52 | Master list with label counts |
| | **TOTAL** | | **369** | | |

## 2. Source Format Analysis

### Label Sheets (files 1–6)
- Format: lastName on one line, firstName on the next, separated by blank lines
- Each student label is repeated 3, 6, or 9 times per sheet
- PDF adds a third line with level (e.g., CP1) which is ignored
- PAGE2 contains 164 occurrences of a single student (label printing order)

### Master List (file 7)
- Format: lastName / firstName / "N fois" (number of labels to print)
- 4 sections separated by blank page breaks
- Each entry appears exactly once with its print count
- This is the authoritative source for the 2027 label order

## 3. Deduplication Pipeline

```
RAW OCCURRENCES (369)
       ↓
NORMALIZE FOR MATCHING
  - lowercase, NFC unicode
  - apostrophe ' → '
  - en-dash/em-dash → hyphen
  - collapse spaces, trim
       ↓
MATCHING KEY GROUPING (70 unique keys)
       ↓
HUMAN RESOLUTION — BROU
  - 2 variant keys → 1 canonical
       ↓
CANONICAL CANDIDATES (69)
```

## 4. Deduplication Categories

| Category | Count | Description |
|----------|------:|-------------|
| EXACT_DUPLICATE | 17 | Same matching key, multiple label occurrences across files |
| HUMAN_CONFIRMED_DUPLICATE | 1 | BROU — 2 typographic variants resolved to 1 canonical identity |
| PROBABLE_DUPLICATE | 0 | No probable duplicates detected |
| DISTINCT | 51 | Single-occurrence entries from master list |
| **TOTAL** | **69** | |

## 5. Cross-File Duplicates

Several students appear in multiple source files:

- **SISSOKO**: appears in LISTE1 (3×) and LISTE1_SUITE (3×)
- **BROU**: appears in LISTE1 (3×), LISTE1_SUITE (3×), PAGE2 (164×), PDF (41×), and Commande (1× as variant A)
- **AKOU, ANGUI**: appear in LISTE1 and LISTE1_SUITE

## 6. Human Resolution — BROU Case

### Variants Detected

| Variant | lastName | firstName | Source |
|---------|----------|-----------|--------|
| A | BROU | N. Marie-Gabrielle Odélia | Commande Etiquette 2027 |
| B | BROU Nétro | Marie – Gabryelle Odélia | Macaron LISTE1, PAGE2, PDF |

### Decision: HUMAN_CONFIRMED_DUPLICATE

Both variants represent the same student. Total raw occurrences: 212.

### Canonical Identity

- **lastName**: `BROU Nétro`
- **firstName**: `Marie–Gabryelle Odélia`

### Resolution Method

The `isBrouVariant()` function detects both patterns:
1. lastName=`BROU` + firstName containing `marie-gabrielle` and `odélia`
2. lastName containing `nétro` + firstName containing `marie` and `gabryelle`

All variants are replaced with the canonical identity in the manifest.

## 7. Normalization Function

`normalizeForMatching()` handles:
- Multiple spaces → single space
- Case normalization → lowercase
- Unicode NFC normalization
- Apostrophe: `'` (U+2019) → `'` (U+0027)
- En-dash (U+2013) and em-dash (U+2014) → hyphen (U+002D)
- Spaces around dashes removed

**Critical distinction**: normalization is for **matching only**. The canonical display value is preserved exactly as provided by the source.

## 8. Same Name, Different People

The pipeline correctly handles students sharing the same last name:

- **AKA** (3 distinct students: Guela Ilia, Esther, Maylis Keren)
- **BAH** (2 distinct students: Deskane Prielle Shana, Houliyet Priscilla Joyce)
- **ECRABE** (2 distinct students: Asse Elvina Marie-Ginette, Akissi Iris-Michael)
- **KONAN** (2 distinct students: Naelle Amirah Enimo, Elyna Marie-Kanny)
- **OUATTARA** (2 distinct students: Katiene Ayèla Myra, Safiyah Imane)
- **KOUADIO** (2 distinct students: Kyria Somah, Fiéni Abran Ivy-Regina)

No automatic merge is performed based on last name alone.

## 9. Final Count

```
RAW OCCURRENCES:                    369
  ↓ normalize
UNIQUE MATCHING KEYS:                70
  ↓ BROU human resolution
CANONICAL CANDIDATES:                69
  ↓ DB preflight (0 existing)
READY TO INSERT:                     69
  ↓ PostgreSQL import
INSERTED:                            69
FINAL DB COUNT:                      69
```
