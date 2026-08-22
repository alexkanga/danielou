# R-V2-M2_03 — SWITCH REPORT

**Mission**: R-V2-M2 ENROLLMENT / CLASSROOM ASSIGNMENT
**Phase**: M2-06 SWITCH CODE + UI
**Date**: 2026-08-22
**Status**: PASS

---

## 1. SWITCH CODE

### Runtime references to `enrollment.classroom_id` as data source:

**0 occurrences.**

Full scan of `src/` (*.ts, *.tsx) found 4 matches — all are comments:

| File | Line | Content |
|---|---|---|
| classes/[id]/route.ts | 148 | `// V2: Check via classroom_assignment instead of enrollment.classroom_id` |
| classes/route.ts | 47 | `// V2: student count via classroom_assignment, NOT enrollment.classroom_id` |
| eleves/route.ts | 12 | `// V2 type — classroom info comes from classroom_assignment, not enrollment.classroom_id` |
| eleves/route.ts | 44 | `// V2: JOIN through classroom_assignment instead of enrollment.classroom_id` |

### Files using `classroom_assignment` as source of truth:

| File | Usage |
|---|---|
| src/lib/services/classroom-assignment.ts | All domain services |
| src/app/api/affectations/route.ts | List + assign |
| src/app/api/affectations/[id]/route.ts | Assignment history |
| src/app/api/affectations/[id]/close/route.ts | Close assignment |
| src/app/api/affectations/transfer/route.ts | Transfer between classrooms |
| src/app/api/eleves/route.ts | Student list via JOIN through classroom_assignment |
| src/app/api/eleves/[id]/route.ts | Student detail via JOIN through classroom_assignment |
| src/app/api/classes/route.ts | Student count subquery via classroom_assignment |
| src/app/api/classes/[id]/route.ts | Student count + delete check via classroom_assignment |

## 2. SWITCH UI

### Navigation

The sidebar includes the affectations section (src/lib/navigation.ts).

### Eleves Page (`/dashboard/eleves`)

- Displays classroom name and level from the V2 API response
- Create student form: selects classroom + academic year, sends `classroomId` in POST body
- POST /api/eleves creates student → enrollment → classroom_assignment in a transaction
- No reference to `enrollment.classroom_id` in the UI component

### API Routes for Affectations

- `GET /api/affectations` — list assignments with filters (classroomId, academicYearId, status)
- `POST /api/affectations` — assign enrollment to classroom (via `assignEnrollmentToClassroom` service)
- `GET /api/affectations/[id]` — assignment history for an enrollment
- `POST /api/affectations/[id]/close` — close an assignment
- `POST /api/affectations/transfer` — transfer between classrooms (atomic transaction)

### Domain Service Centralization

All business logic is in `src/lib/services/classroom-assignment.ts`:

- `assignEnrollmentToClassroom()` — validates enrollment, classroom, school, year, no active conflict, no date overlap
- `transferEnrollmentToClassroom()` — atomic transaction: close old (transferred) + create new (active)
- `closeClassroomAssignment()` — close with end_date and new status
- `getCurrentClassroomAssignment()` — get active assignment
- `getClassroomAssignmentHistory()` — full history
- `checkNoOverlap()` — date overlap validation

**No business logic duplication in React components or multiple API routes.**

## 3. PRE-CONTRACT VERIFICATION

| Check | Result |
|---|---|
| TypeCheck (`tsc --noEmit`) | 0 errors |
| Lint (`eslint .`) | 0 errors, 17 warnings (pre-existing) |
| Tests (`vitest run`) | 166/166 passed |
| Legacy ref scan | 0 runtime refs |
| Build (`next build`) | SUCCESS |

## 4. POST-CONTRACT VERIFICATION

After dropping `enrollment.classroom_id`:

| Check | Result |
|---|---|
| TypeCheck | 0 errors |
| Tests | 166/166 passed |
| Lint | 0 errors |
| Legacy ref scan | 0 runtime refs (4 comments only) |
| Build | SUCCESS |
| DB: classroom_id column | CONFIRMED REMOVED |

## 5. CONCLUSION

Code and UI are fully switched to `classroom_assignment` as the source of truth.
No runtime code reads from or writes to `enrollment.classroom_id`.
Contract (column removal) applied and verified.
