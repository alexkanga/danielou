# WS-003 — Period Results Functional Contract

**STATUS**: FROZEN / IMPLEMENTATION PENDING

**DATE FROZEN**: 2025-07-14

**OWNER**: APPROVED

---

## 1. User Label

**Résultats par période**

---

## 2. Module Mode

READ-ONLY.

No mutation of academic data through this module.

---

## 3. Context Hierarchy (Required, All Three)

```
Academic Year
  → Classroom (belonging to that year)
    → Period (belonging to that year)
```

All three levels are required. Cross-year combinations are forbidden.

---

## 4. Viewing Results — Prohibited Side Effects

When viewing period results, the module:

**MUST NOT:**
- POST to /api/bulletins
- Generate a bulletin
- Overwrite a bulletin
- Mutate any academic data

Viewing is a pure read operation.

---

## 5. Architectural Separation

```
Résultats par période  ≠  Résultats annuels  ≠  Bulletins
```

These are three distinct modules with separate concerns:
- **Résultats par période**: Per-period student results viewing
- **Résultats annuels**: Annual calculation, ranking, decision (M4 — WS-002, CLOSED)
- **Bulletins**: Official bulletin generation workflow (separate module)

---

## 6. Authoritative Calculation

Server-side authoritative period calculation.

No independent client-side calculation engine.
All period averages, class averages, ranks, and statuses are computed server-side.

---

## 7. Grade Status Semantics

| Status | Code | Earned Value | Max Value | Effect on Average |
|---|---|---|---|---|
| Graded | — | Recorded score | Recorded max | Contributes normally |
| Absent unexcused | AI | 0 | Full max retained | Penalizing zero |
| Absent excused | AJ | Neutral | Neutral | Excluded from denominator |
| Exempt | — | Neutral | Neutral | Excluded from denominator |
| Not evaluated | NE | Neutral | Neutral | Excluded from denominator |
| Pending | — | — | — | **INCOMPLETE** status |
| Missing required grade | — | — | — | **INCOMPLETE** status |

**Zero effective denominator** after neutral exclusions → **NON_COMPUTABLE**.

**Never fabricate a zero** for non-computable.

---

## 8. Period General Average

Uses configured pedagogy and existing `general_average_input_policy`.

No hardcoded denominator.

---

## 9. Period Rank

Competition ranking.

Tie handling: `1, 2, 2, 4` (dense/competition — tied students share the same rank, next rank skips).

**Incomplete / Non-computable students**: No fake rank assigned.

---

## 10. Search / Filter / Sort

View-only.

**Must NEVER recompute** when filtering:
- Period average
- Class average
- Rank
- Status

These values remain the authoritative full-class values regardless of client-side filtering.

---

## 11. Class Average

Authoritative full-class value computed server-side.

**Never recalculated from filtered rows** on the client.

---

## 12. Annual Logic — Excluded

**No annual logic** in period results.

Prohibited in this module:
- Annual average
- Annual rank
- Promotion threshold
- Admissibilité
- Redoublement (annual recommendation)
- Conseil requis (annual)
- Décision du conseil
- Admis sur dérogation
- Passage ×2

---

## 13. Bulletin Workflow

**SEPARATE MODULE.**

Period results viewing does not trigger, generate, or modify bulletins.

---

## 14. User-Facing Rename

```
Résultats  →  Résultats par période
```

**Scope of rename (P2 — later):**
- UI-visible labels only

**Do NOT rename (unless later technically proven necessary):**
- Database model names
- Internal enums
- `/dashboard/resultats` route
- Stable API endpoints

---

## Implementation Priority

### P0 — Critical

1. Pure READ flow for period results
2. Populate actual class results table
3. Remove bulletin-generation side effect from viewing
4. Enforce Year → Classroom → Period integrity
5. Align AI (absent unexcused) semantics with approved composition semantics

### P1 — Important

6. Authoritative student detail
7. Dedicated period-results tests
8. Class-average / rank integrity

### P2 — Standard

9. Rename UI to "Résultats par période"
10. Search / filter / sort / reset
11. UI consistency / responsiveness

### P3 — Backlog

12. N+1 query optimization (only if materially necessary)
13. Cosmetic refinements

---

## Invariants

1. **READ-ONLY**: No data mutation through this module
2. **NO BULLETIN SIDE EFFECT**: Viewing results never generates or overwrites a bulletin
3. **SERVER-SIDE CALCULATION**: All averages, ranks, statuses computed server-side
4. **AUTHORITATIVE VALUES**: Filter/sort never recomputes period average, class average, rank, or status
5. **YEAR → CLASS → PERIOD**: All three required; cross-year forbidden
6. **AI = 0 + FULL MAX**: Absent unexcused is a penalizing zero
7. **AJ / EXEMPT / NE = NEUTRAL**: Excluded from denominator
8. **PENDING / MISSING = INCOMPLETE**: Never fabricate values
9. **NON_COMPUTABLE**: Never fabricate zero when no valid grades exist
10. **NO ANNUAL LOGIC**: Complete separation from annual results module
11. **COMPETITION RANK**: Ties share rank, next rank skips; no fake rank for incomplete/non-computable
