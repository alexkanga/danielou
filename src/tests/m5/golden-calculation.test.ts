/**
 * M5 Golden Calculation Tests
 *
 * Validates the calculation engine against owner-specified scenarios:
 *   §8  CP1 Golden (SUBJECT_OFFICIAL)
 *   §9  Component Coefficient
 *   §10 Assessment Coefficient
 *   §12 Rounding strategies
 *   §14 Grade Status Semantics
 *   §6D Policy Divergence (SUBJECT_OFFICIAL ≠ SUBJECT_RAW)
 *   Ranking (competition — Daniélou canonical: 1,1,3,4)
 */

import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  calculateAssessmentResult,
  calculateComponentResult,
  calculateSubjectResultWithCoeffs,
  computeSubjectWeightedPoints,
  calculateGeneralAverage,
  calculateClassStatistics,
  calculateRanking,
  collectIncompleteness,
} from '@/lib/services/results/calculation-engine';
import { round, divide, multiply } from '@/lib/decimal';
import type {
  GradeInput,
  AssessmentResult,
  ComponentResult,
  SubjectInput,
  SubjectResult,
} from '@/lib/services/results/types';
import { GRADE_STATUS_BEHAVIOR } from '@/lib/services/results/types';

Decimal.set({ precision: 20 });

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const FR = 'subj-fr';
const MATH = 'subj-math';
const EDHC = 'subj-edhc';
const AEC = 'subj-aec';
const EPS = 'subj-eps';

function makeGrade(value: number | null, status: string, scale = 20, coefficient = '1'): GradeInput {
  return {
    id: `grade-${Math.random().toString(36).slice(2, 8)}`,
    rawValue: value !== null ? String(value) : null,
    status: status as GradeInput['status'],
    scale,
    coefficient,
  };
}

function makeCR(result: string | null, id: string, name: string): ComponentResult {
  return { componentId: id, componentName: name, result, isIncomplete: false, contributingAssessments: result ? 1 : 0, excludedAssessments: 0 };
}

function subject(
  id: string, csId: string, name: string, coef: string,
  comps: ComponentResult[], agg: 'simple_average' | 'weighted_average' = 'simple_average',
): SubjectInput {
  return { subjectId: id, configSubjectId: csId, subjectName: name, coefficient: coef, includeInAverage: true, aggregation: agg, scale: 20, componentResults: comps, assessmentResults: [] };
}

function compute(id: string, csId: string, name: string, coef: string, comps: ComponentResult[], coeffs: Map<string, string>, dp: number, rs: 'half_up' | 'half_even' | 'truncate', policy: 'SUBJECT_OFFICIAL' | 'SUBJECT_RAW'): SubjectResult {
  const sr = calculateSubjectResultWithCoeffs(subject(id, csId, name, coef, comps), coeffs, dp, rs);
  return computeSubjectWeightedPoints(sr, policy);
}

// ─────────────────────────────────────────────
// §8 — CP1 GOLDEN TEST (SUBJECT_OFFICIAL)
// ─────────────────────────────────────────────

const frenchComps = [makeCR('14','c-oral','Oral'), makeCR('12','c-lect','Lecture'), makeCR('15','c-ecr','Écriture'), makeCR('13','c-cop','Copie'), makeCR('10','c-dic','Dictée'), makeCR('16','c-poe','Poésie')];
const frenchCoefs = new Map([['c-oral','1'],['c-lect','1'],['c-ecr','1'],['c-cop','1'],['c-dic','1'],['c-poe','1']]);
const mathComps = [makeCR('15','c-m1','M1'), makeCR('12','c-m2','M2'), makeCR('12','c-m3','M3')];
const mathCoefs = new Map([['c-m1','1'],['c-m2','1'],['c-m3','1']]);

describe('CP1 Golden (§8) — SUBJECT_OFFICIAL', () => {
  it('French raw = 80/6, official = 13.33', () => {
    const sr = calculateSubjectResultWithCoeffs(subject(FR,'cs-fr','Français','5',frenchComps), frenchCoefs, 2, 'half_up');
    expect(new Decimal(sr.rawValue!).equals(new Decimal(80).div(6))).toBe(true);
    expect(sr.officialValue).toBe('13.33');
  });

  it('Math raw = 13, official = 13', () => {
    const sr = calculateSubjectResultWithCoeffs(subject(MATH,'cs-math','Math','5',mathComps), mathCoefs, 2, 'half_up');
    expect(sr.rawValue).toBe('13');
    expect(sr.officialValue).toBe('13');
  });

  it('Full CP1 general = 13.62 (HALF_UP), 13.61 (TRUNCATE)', () => {
    const fr = compute(FR,'cs-fr','Français','5',frenchComps,frenchCoefs,2,'half_up','SUBJECT_OFFICIAL');
    const ma = compute(MATH,'cs-math','Math','5',mathComps,mathCoefs,2,'half_up','SUBJECT_OFFICIAL');
    const ed = compute(EDHC,'cs-edhc','EDHC','2',[makeCR('14','c-edhc','EDHC')],new Map([['c-edhc','1']]),2,'half_up','SUBJECT_OFFICIAL');
    const ae = compute(AEC,'cs-aec','AEC','1',[makeCR('16','c-aec','AEC')],new Map([['c-aec','1']]),2,'half_up','SUBJECT_OFFICIAL');
    const ep = compute(EPS,'cs-eps','EPS','1',[makeCR('15','c-eps','EPS')],new Map([['c-eps','1']]),2,'half_up','SUBJECT_OFFICIAL');

    // SUBJECT_OFFICIAL weightedPoints: 13.33×5=66.65, 13×5=65, 14×2=28, 16×1=16, 15×1=15 = 190.65/14
    expect(fr.weightedPoints).toBe('66.65');
    const gen = calculateGeneralAverage({ subjectResults: [fr,ma,ed,ae,ep], calculationPolicy: 'weighted_average', inputPolicy: 'SUBJECT_OFFICIAL' }, 2, 'half_up');
    expect(gen.officialValue).toBe('13.62');
    expect(gen.subjectsIncluded).toBe(5);

    // Truncate
    const genT = calculateGeneralAverage({ subjectResults: [fr,ma,ed,ae,ep], calculationPolicy: 'weighted_average', inputPolicy: 'SUBJECT_OFFICIAL' }, 2, 'truncate');
    expect(genT.officialValue).toBe('13.61');
  });
});

// ─────────────────────────────────────────────
// §9 — COMPONENT COEFFICIENT
// ─────────────────────────────────────────────

describe('Component Coefficient (§9)', () => {
  it('Weighted French = 128/10 = 12.8', () => {
    const coeffs = new Map([['c-oral','2'],['c-lect','3'],['c-ecr','1'],['c-cop','1'],['c-dic','2'],['c-poe','1']]);
    const sr = calculateSubjectResultWithCoeffs(subject(FR,'cs-fr','Français','5',frenchComps,'weighted_average'), coeffs, 2, 'half_up');
    expect(sr.rawValue).toBe('12.8');
    expect(sr.officialValue).toBe('12.8');

    const simple = calculateSubjectResultWithCoeffs(subject(FR,'cs-fr','Français','5',frenchComps), frenchCoefs, 2, 'half_up');
    expect(simple.officialValue).toBe('13.33');
    expect(sr.officialValue).not.toBe(simple.officialValue);
  });
});

// ─────────────────────────────────────────────
// §10 — ASSESSMENT COEFFICIENT
// ─────────────────────────────────────────────

describe('Assessment Coefficient (§10)', () => {
  it('(14×1 + 12×1 + 16×2) / 4 = 14.5', () => {
    const r = calculateAssessmentResult([makeGrade(14,'graded',20,'1'), makeGrade(12,'graded',20,'1'), makeGrade(16,'graded',20,'2')], 'weighted_average', 20);
    expect(r.result).toBe('14.5');
    expect(r.contributingCount).toBe(3);
  });
  it('Assessment coef ≠ component coef: (10+60)/4 = 17.5', () => {
    const r = calculateAssessmentResult([makeGrade(10,'graded',20,'1'), makeGrade(20,'graded',20,'3')], 'weighted_average', 20);
    expect(r.result).toBe('17.5');
  });
  it('Simple assessment: raw no rounding', () => {
    const r = calculateAssessmentResult([makeGrade(14,'graded',20,'1'), makeGrade(15,'graded',20,'1')], 'simple_average', 20);
    expect(r.result).toBe('14.5');
  });
});

// ─────────────────────────────────────────────
// §6D — POLICY DIVERGENCE
// ─────────────────────────────────────────────

describe('Policy Divergence (§6D)', () => {
  it('SUBJECT_OFFICIAL ≠ SUBJECT_RAW', () => {
    const srA = calculateSubjectResultWithCoeffs(subject('sa','csa','A','1',[makeCR('10','ca','A')]), new Map([['ca','1']]), 2, 'half_up');
    const srB = calculateSubjectResultWithCoeffs(subject('sb','csb','B','1',[makeCR('10.0098','cb','B')]), new Map([['cb','1']]), 2, 'half_up');

    expect(srA.rawValue).toBe('10'); expect(srA.officialValue).toBe('10');
    expect(srB.rawValue).toBe('10.0098'); expect(srB.officialValue).toBe('10.01');

    const offA = computeSubjectWeightedPoints(srA, 'SUBJECT_OFFICIAL');
    const offB = computeSubjectWeightedPoints(srB, 'SUBJECT_OFFICIAL');
    expect(offA.weightedPoints).toBe('10');
    expect(offB.weightedPoints).toBe('10.01');
    const genOff = calculateGeneralAverage({ subjectResults: [offA,offB], calculationPolicy: 'weighted_average', inputPolicy: 'SUBJECT_OFFICIAL' }, 2, 'half_up');
    // (10+10.01)/2 = 10.005 → HALF_UP 2dp = 10.01
    expect(genOff.officialValue).toBe('10.01');

    const rawA = computeSubjectWeightedPoints(srA, 'SUBJECT_RAW');
    const rawB = computeSubjectWeightedPoints(srB, 'SUBJECT_RAW');
    expect(rawA.weightedPoints).toBe('10');
    expect(rawB.weightedPoints).toBe('10.0098');
    const genRaw = calculateGeneralAverage({ subjectResults: [rawA,rawB], calculationPolicy: 'weighted_average', inputPolicy: 'SUBJECT_RAW' }, 2, 'half_up');
    // (10+10.0098)/2 = 10.0049 → HALF_UP 2dp = 10.00
    expect(genRaw.officialValue).toBe('10');

    expect(genOff.officialValue).not.toBe(genRaw.officialValue);
  });
});

// ─────────────────────────────────────────────
// §14 — GRADE STATUS
// ─────────────────────────────────────────────

describe('Grade Status (§14)', () => {
  it('ABSENCE != ZERO', () => {
    const r = calculateAssessmentResult([makeGrade(14,'graded'), makeGrade(null,'absent_excused'), makeGrade(12,'graded'), makeGrade(null,'absent_unexcused'), makeGrade(16,'graded')], 'simple_average', 20);
    expect(r.result).toBe('14'); expect(r.contributingCount).toBe(3); expect(r.excludedCount).toBe(2);
  });
  it('exempt excluded', () => {
    const r = calculateAssessmentResult([makeGrade(14,'graded'), makeGrade(null,'exempt'), makeGrade(12,'graded')], 'simple_average', 20);
    expect(r.result).toBe('13'); expect(r.contributingCount).toBe(2);
  });
  it('not_evaluated excluded', () => {
    expect(calculateAssessmentResult([makeGrade(14,'graded'), makeGrade(null,'not_evaluated')], 'simple_average', 20).result).toBe('14');
  });
  it('pending → incomplete', () => {
    const r = calculateAssessmentResult([makeGrade(14,'graded'), makeGrade(null,'pending')], 'simple_average', 20);
    expect(r.result).toBe('14'); expect(r.isIncomplete).toBe(true);
  });
  it('all-absent → null', () => {
    expect(calculateAssessmentResult([makeGrade(null,'absent_excused'), makeGrade(null,'absent_unexcused')], 'simple_average', 20).result).toBeNull();
  });
  it('empty → null', () => {
    expect(calculateAssessmentResult([], 'simple_average', 20).result).toBeNull();
  });
});

// ─────────────────────────────────────────────
// §12 — ROUNDING
// ─────────────────────────────────────────────

describe('Rounding (§12)', () => {
  it('half_up: 2.345 → 2.35', () => expect(round('2.345', 2, 'HALF_UP')).toBe('2.35'));
  it('half_up: 2.335 → 2.34', () => expect(round('2.335', 2, 'HALF_UP')).toBe('2.34'));
  it('half_even: 2.345 → 2.34', () => expect(round('2.345', 2, 'HALF_EVEN')).toBe('2.34'));
  it('truncate: 2.349 → 2.34', () => expect(round('2.349', 2, 'TRUNCATE')).toBe('2.34'));
  it('truncate: 2.399 → 2.39', () => expect(round('2.399', 2, 'TRUNCATE')).toBe('2.39'));
  it('repeating 1/3', () => { const a = divide('1','3',10); expect(round(a,2,'HALF_UP')).toBe('0.33'); });
  it('1.005 → 1.01', () => expect(round('1.005', 2, 'HALF_UP')).toBe('1.01'));
});

// ─────────────────────────────────────────────
// SUBJECT WITHOUT COMPONENTS
// ─────────────────────────────────────────────

describe('Subject without components', () => {
  it('direct assessment aggregation', () => {
    const ar: AssessmentResult[] = [{ assessmentId:'a1',configComponentId:null,result:'14',isIncomplete:false,contributingCount:1,excludedCount:0 },{ assessmentId:'a2',configComponentId:null,result:'16',isIncomplete:false,contributingCount:1,excludedCount:0 }];
    const sr = calculateSubjectResultWithCoeffs({ subjectId:'st',configSubjectId:'cst',subjectName:'T',coefficient:'3',includeInAverage:true,aggregation:'simple_average',scale:20,componentResults:[],assessmentResults:ar }, new Map(), 2, 'half_up');
    expect(sr.rawValue).toBe('15'); expect(sr.officialValue).toBe('15');
  });
});

// ─────────────────────────────────────────────
// INCLUDE_IN_AVERAGE
// ─────────────────────────────────────────────

describe('include_in_average (§11)', () => {
  it('Excluded: (70+32)/(5+2) = 14.57', () => {
    const s: SubjectResult[] = [
      { subjectId:'s1',subjectName:'S1',configSubjectId:'cs1',coefficient:'5',includeInAverage:true,rawValue:'14',officialValue:'14',weightedPoints:'70',isIncomplete:false },
      { subjectId:'s2',subjectName:'S2',configSubjectId:'cs2',coefficient:'3',includeInAverage:false,rawValue:'10',officialValue:'10',weightedPoints:null,isIncomplete:false },
      { subjectId:'s3',subjectName:'S3',configSubjectId:'cs3',coefficient:'2',includeInAverage:true,rawValue:'16',officialValue:'16',weightedPoints:'32',isIncomplete:false },
    ];
    const g = calculateGeneralAverage({ subjectResults:s,calculationPolicy:'weighted_average',inputPolicy:'SUBJECT_OFFICIAL' },2,'half_up');
    expect(g.officialValue).toBe('14.57'); expect(g.subjectsIncluded).toBe(2);
  });
});

// ─────────────────────────────────────────────
// CLASS STATISTICS
// ─────────────────────────────────────────────

describe('Class Statistics', () => {
  it('basic', () => { const s = calculateClassStatistics(['14','16','12','18','10']); expect(s.classAverage).toBe('14'); expect(s.minAverage).toBe('10'); expect(s.maxAverage).toBe('18'); expect(s.studentCount).toBe(5); });
  it('empty', () => { const s = calculateClassStatistics([]); expect(s.classAverage).toBe('0'); expect(s.studentCount).toBe(0); });
});

// ─────────────────────────────────────────────
// RANKING (competition — Daniélou canonical)
// ─────────────────────────────────────────────
// Competition ranking: rank = 1 + count of students with strictly higher average.
// Ties share rank; next distinct value skips.
//   16, 16, 14, 12 → ranks 1, 1, 3, 4

describe('Ranking (competition)', () => {
  it('no ties: 18>16>14>12 → 1,2,3,4', () => {
    const r = calculateRanking([{studentId:'s1',average:'16'},{studentId:'s2',average:'14'},{studentId:'s3',average:'18'},{studentId:'s4',average:'12'}]);
    expect(r).toHaveLength(4);
    expect(r.map(x=>x.studentId)).toEqual(['s3','s1','s2','s4']);
    expect(r.map(x=>x.rank)).toEqual([1,2,3,4]);
  });
  it('2-way tie: 16,16,14,12 → 1,1,3,4', () => {
    const r = calculateRanking([{studentId:'s1',average:'16'},{studentId:'s2',average:'14'},{studentId:'s3',average:'16'},{studentId:'s4',average:'12'}]);
    expect(r).toHaveLength(4);
    const t = r.filter(x=>x.rank===1); expect(t).toHaveLength(2); expect(t[0].tiedCount).toBe(2);
    // Competition: 14 has 2 students above → rank 3
    expect(r[2].rank).toBe(3);
    // 12 has 3 students above → rank 4
    expect(r[3].rank).toBe(4);
  });
  it('3-way tie: 15,15,15,10 → 1,1,1,4', () => {
    const r = calculateRanking([{studentId:'s1',average:'15'},{studentId:'s2',average:'15'},{studentId:'s3',average:'15'},{studentId:'s4',average:'10'}]);
    expect(r).toHaveLength(4);
    expect(r[0].rank).toBe(1); expect(r[0].tiedCount).toBe(3);
    expect(r[1].rank).toBe(1); expect(r[2].rank).toBe(1);
    // Competition: 10 has 3 students above → rank 4
    expect(r[3].rank).toBe(4); expect(r[3].tiedCount).toBe(1);
  });
  it('golden: 16,16,14,12 → ranks 1,1,3,4', () => {
    const r = calculateRanking([
      {studentId:'a',average:'16'},{studentId:'b',average:'16'},
      {studentId:'c',average:'14'},{studentId:'d',average:'12'},
    ]);
    expect(r.map(x=>x.rank)).toEqual([1,1,3,4]);
  });
  it('official-value tie: hidden raw precision MUST NOT break ties', () => {
    // OWNER DECISION — RANKING INPUT VALUE = GENERAL OFFICIAL
    // Student A: raw 13.617857, official 13.62
    // Student B: raw 13.619999, official 13.62
    // Student C: raw 13.604000, official 13.60
    // Ranking uses officialValue → A and B are TIED at 13.62
    const r = calculateRanking([
      {studentId:'A', average:'13.62'}, // official value, raw was 13.617857
      {studentId:'B', average:'13.62'}, // official value, raw was 13.619999
      {studentId:'C', average:'13.60'}, // official value, raw was 13.604000
    ]);
    expect(r).toHaveLength(3);
    // A and B share rank 1 (same official average 13.62)
    expect(r[0].rank).toBe(1);
    expect(r[0].tiedCount).toBe(2);
    expect(r[1].rank).toBe(1);
    expect(r[1].tiedCount).toBe(2);
    // C has 2 students with strictly higher average → rank 3
    expect(r[2].rank).toBe(3);
    expect(r[2].tiedCount).toBe(1);
  });
});

// ─────────────────────────────────────────────
// SCALE NORMALIZATION
// ─────────────────────────────────────────────

describe('Scale normalization', () => {
  it('10→20: (8+9)/2=17', () => { expect(calculateAssessmentResult([makeGrade(8,'graded',10,'1'),makeGrade(9,'graded',10,'1')],'simple_average',20).result).toBe('17'); });
  it('same scale', () => { expect(calculateAssessmentResult([makeGrade(14,'graded'),makeGrade(16,'graded')],'simple_average',20).result).toBe('15'); });
});

// ─────────────────────────────────────────────
// SINGLE_GRADE
// ─────────────────────────────────────────────

describe('single_grade', () => {
  it('first contributing, count=1, excluded=0 (all graded)', () => {
    const r = calculateAssessmentResult([makeGrade(14,'graded'),makeGrade(16,'graded'),makeGrade(18,'graded')],'single_grade',20);
    expect(r.result).toBe('14'); expect(r.contributingCount).toBe(1); expect(r.excludedCount).toBe(0);
  });
});

// ─────────────────────────────────────────────
// GENERAL AVERAGE — SIMPLE
// ─────────────────────────────────────────────

describe('General average — simple', () => {
  it('ignores coefficients', () => {
    const s: SubjectResult[] = [
      {subjectId:'s1',subjectName:'S1',configSubjectId:'cs1',coefficient:'5',includeInAverage:true,rawValue:'14',officialValue:'14',weightedPoints:'14',isIncomplete:false},
      {subjectId:'s2',subjectName:'S2',configSubjectId:'cs2',coefficient:'3',includeInAverage:true,rawValue:'10',officialValue:'10',weightedPoints:'10',isIncomplete:false},
      {subjectId:'s3',subjectName:'S3',configSubjectId:'cs3',coefficient:'2',includeInAverage:true,rawValue:'16',officialValue:'16',weightedPoints:'16',isIncomplete:false},
    ];
    const g = calculateGeneralAverage({subjectResults:s,calculationPolicy:'simple_average',inputPolicy:'SUBJECT_OFFICIAL'},2,'half_up');
    expect(g.officialValue).toBe('13.33');
  });
});

// ─────────────────────────────────────────────
// INCOMPLETENESS
// ─────────────────────────────────────────────

describe('Incomplete flagging', () => {
  it('any incomplete → general isIncomplete', () => {
    const s: SubjectResult[] = [
      {subjectId:'s1',subjectName:'S1',configSubjectId:'cs1',coefficient:'5',includeInAverage:true,rawValue:'14',officialValue:'14',weightedPoints:'70',isIncomplete:true},
      {subjectId:'s2',subjectName:'S2',configSubjectId:'cs2',coefficient:'5',includeInAverage:true,rawValue:'12',officialValue:'12',weightedPoints:'60',isIncomplete:false},
    ];
    const g = calculateGeneralAverage({subjectResults:s,calculationPolicy:'weighted_average',inputPolicy:'SUBJECT_OFFICIAL'},2,'half_up');
    expect(g.isIncomplete).toBe(true); expect(g.officialValue).toBe('13');
  });
  it('all null → 0', () => {
    const g = calculateGeneralAverage({subjectResults:[{subjectId:'s1',subjectName:'S1',configSubjectId:'cs1',coefficient:'5',includeInAverage:true,rawValue:null,officialValue:null,weightedPoints:null,isIncomplete:false}],calculationPolicy:'weighted_average',inputPolicy:'SUBJECT_OFFICIAL'},2,'half_up');
    expect(g.officialValue).toBe('0'); expect(g.subjectsIncluded).toBe(0);
  });
});

describe('collectIncompleteness', () => {
  it('reports null and incomplete', () => {
    const info = collectIncompleteness([
      {subjectId:'s1',subjectName:'S1',configSubjectId:'cs1',coefficient:'1',includeInAverage:true,rawValue:null,officialValue:null,weightedPoints:null,isIncomplete:false},
      {subjectId:'s2',subjectName:'S2',configSubjectId:'cs2',coefficient:'1',includeInAverage:true,rawValue:'14',officialValue:'14',weightedPoints:'14',isIncomplete:true},
      {subjectId:'s3',subjectName:'S3',configSubjectId:'cs3',coefficient:'1',includeInAverage:true,rawValue:'15',officialValue:'15',weightedPoints:'15',isIncomplete:false},
    ]);
    expect(info).toHaveLength(2);
    expect(info[0].reason).toBe('No contributing grades');
    expect(info[1].reason).toBe('Pending grades');
  });
});

// ─────────────────────────────────────────────
// STATUS CONSTANTS
// ─────────────────────────────────────────────

describe('Status constants', () => {
  it('all mapped', () => {
    expect(GRADE_STATUS_BEHAVIOR.graded).toBe('CONTRIBUTES');
    expect(GRADE_STATUS_BEHAVIOR.absent_excused).toBe('EXCLUDED');
    expect(GRADE_STATUS_BEHAVIOR.absent_unexcused).toBe('EXCLUDED');
    expect(GRADE_STATUS_BEHAVIOR.exempt).toBe('EXCLUDED');
    expect(GRADE_STATUS_BEHAVIOR.not_evaluated).toBe('EXCLUDED');
    expect(GRADE_STATUS_BEHAVIOR.pending).toBe('INCOMPLETE');
  });
});

// ─────────────────────────────────────────────
// EDGE CASES
// ─────────────────────────────────────────────

describe('Edge cases (§30)', () => {
  it('large coefficient', () => { expect(calculateAssessmentResult([makeGrade(10,'graded',20,'100')],'weighted_average',20).result).toBe('10'); });
  it('single chain', () => {
    const sr = calculateSubjectResultWithCoeffs(subject('s1','cs1','O','1',[makeCR('15','c1','O')]),new Map([['c1','1']]),2,'half_up');
    expect(sr.officialValue).toBe('15');
  });
  it('all excluded → null', () => {
    const sr = calculateSubjectResultWithCoeffs(subject('s1','cs1','S','1',[makeCR(null,'c1','C')]),new Map([['c1','1']]),2,'half_up');
    expect(sr.officialValue).toBeNull();
  });
});
