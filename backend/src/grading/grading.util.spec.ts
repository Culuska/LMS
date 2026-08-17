import { DEFAULT_GRADE_BANDS } from './grading.constants';
import {
  applyRetakeCap,
  computeAttendancePercentage,
  computeGpa,
  computeWeightedPercentage,
  lowestPassingBand,
  resolveGradeBand,
  UnresolvableGradeError,
  validateAssessmentWeights,
} from './grading.util';

describe('resolveGradeBand', () => {
  it.each([
    [100, 'A+'],
    [97, 'A+'],
    [96, 'A'],
    [90, 'A'],
    [89, 'A-'],
    [85, 'A-'],
    [84, 'B+'],
    [78, 'B'],
    [75, 'B-'],
    [72, 'C+'],
    [68, 'C'],
    [65, 'C-'],
    [60, 'D+'],
    [59, 'D'],
    [50, 'D'],
    [49, 'F'],
    [0, 'F'],
  ])('maps %d%% to %s', (percentage, expectedLetter) => {
    expect(resolveGradeBand(percentage, DEFAULT_GRADE_BANDS).letter).toBe(
      expectedLetter,
    );
  });

  it('throws UnresolvableGradeError when no band covers the percentage (misconfigured table)', () => {
    const gappyBands = DEFAULT_GRADE_BANDS.filter((b) => b.letter !== 'D'); // punch a hole at 50-59
    expect(() => resolveGradeBand(55, gappyBands)).toThrow(
      UnresolvableGradeError,
    );
  });

  it('rejects an out-of-range percentage rather than clamping it silently', () => {
    expect(() => resolveGradeBand(101, DEFAULT_GRADE_BANDS)).toThrow(
      UnresolvableGradeError,
    );
    expect(() => resolveGradeBand(-1, DEFAULT_GRADE_BANDS)).toThrow(
      UnresolvableGradeError,
    );
  });
});

describe('lowestPassingBand', () => {
  it('is D (50-59, 1.0 points) per docs/04 §1', () => {
    const band = lowestPassingBand(DEFAULT_GRADE_BANDS);
    expect(band.letter).toBe('D');
    expect(band.gradePoints).toBe(1.0);
  });
});

describe('computeWeightedPercentage', () => {
  it('computes the standard 40/20/40 default split (docs/04 §3)', () => {
    const result = computeWeightedPercentage([
      { weight: 40, score: 80, maxMarks: 100 }, // CA: 80%
      { weight: 20, score: 60, maxMarks: 100 }, // Midterm: 60%
      { weight: 40, score: 90, maxMarks: 100 }, // Final: 90%
    ]);
    // 80*0.4 + 60*0.2 + 90*0.4 = 32 + 12 + 36 = 80
    expect(result).toBeCloseTo(80, 2);
  });

  it('normalizes components on different mark scales before weighting', () => {
    const result = computeWeightedPercentage([
      { weight: 50, score: 18, maxMarks: 20 }, // 90%
      { weight: 50, score: 40, maxMarks: 50 }, // 80%
    ]);
    expect(result).toBeCloseTo(85, 2); // (90+80)/2
  });

  it('rejects weights that do not sum to 100%', () => {
    expect(() =>
      computeWeightedPercentage([
        { weight: 40, score: 80, maxMarks: 100 },
        { weight: 40, score: 60, maxMarks: 100 },
      ]),
    ).toThrow(/must sum to 100%/);
  });

  it('rejects an empty component list', () => {
    expect(() => computeWeightedPercentage([])).toThrow();
  });
});

describe('validateAssessmentWeights', () => {
  it('accepts the documented default split with no errors', () => {
    expect(
      validateAssessmentWeights({
        continuousAssessment: 40,
        midterm: 20,
        final: 40,
      }),
    ).toEqual([]);
  });

  it('rejects a component outside its allowed band', () => {
    const errors = validateAssessmentWeights({
      continuousAssessment: 55,
      midterm: 25,
      final: 20,
    });
    expect(errors.some((e) => e.includes('Continuous assessment'))).toBe(true);
  });

  it('rejects weights that do not sum to 100', () => {
    const errors = validateAssessmentWeights({
      continuousAssessment: 40,
      midterm: 25,
      final: 40,
    });
    expect(errors.some((e) => e.includes('sum to exactly 100%'))).toBe(true);
  });
});

describe('applyRetakeCap — docs/04 §4 retake scoring', () => {
  it('does not cap a first (non-retake) attempt', () => {
    expect(applyRetakeCap(95, false, DEFAULT_GRADE_BANDS)).toBe(95);
  });

  it('caps a passing retake at the ceiling of the lowest passing band (D → 59%)', () => {
    expect(applyRetakeCap(95, true, DEFAULT_GRADE_BANDS)).toBe(59);
    expect(applyRetakeCap(60, true, DEFAULT_GRADE_BANDS)).toBe(59); // D+ retake also capped down to D
  });

  it('does not cap a retake that is exactly a bare pass — no adjustment needed', () => {
    expect(applyRetakeCap(50, true, DEFAULT_GRADE_BANDS)).toBe(50);
  });

  it('does not cap a retake that is still a fail — nothing to cap', () => {
    expect(applyRetakeCap(30, true, DEFAULT_GRADE_BANDS)).toBe(30);
  });
});

describe('computeGpa — docs/04 §2 credit-weighted formula', () => {
  it('computes a simple weighted average', () => {
    // 3 credits @ 4.0 + 3 credits @ 3.0 = (12+9)/6 = 3.5
    expect(
      computeGpa([
        { credits: 3, gradePoints: 4.0 },
        { credits: 3, gradePoints: 3.0 },
      ]),
    ).toBe(3.5);
  });

  it('weights larger courses more heavily', () => {
    // 4 credits @ 4.0 + 1 credit @ 0.0 = 16/5 = 3.2
    expect(
      computeGpa([
        { credits: 4, gradePoints: 4.0 },
        { credits: 1, gradePoints: 0.0 },
      ]),
    ).toBe(3.2);
  });

  it('returns 0 for an empty course list (no GPA to compute yet)', () => {
    expect(computeGpa([])).toBe(0);
  });

  it('a perfect record across mixed credit loads yields exactly 4.0', () => {
    expect(
      computeGpa([
        { credits: 3, gradePoints: 4.0 },
        { credits: 4, gradePoints: 4.0 },
      ]),
    ).toBe(4.0);
  });
});

describe('computeAttendancePercentage — docs/04 §11', () => {
  it('counts present and late as attended; excludes excused from the denominator', () => {
    // 10 sessions: 7 present, 1 late, 1 absent, 1 excused
    // denominator excludes the excused one -> 9; attended = 7+1 = 8 -> 88.89%
    const result = computeAttendancePercentage({
      present: 7,
      absent: 1,
      late: 1,
      excused: 1,
    });
    expect(result).toBeCloseTo(88.89, 1);
  });

  it('returns 100% when no sessions have occurred yet (does not falsely show 0%)', () => {
    expect(
      computeAttendancePercentage({
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      }),
    ).toBe(100);
  });

  it('an all-excused record does not count against the student', () => {
    expect(
      computeAttendancePercentage({
        present: 0,
        absent: 0,
        late: 0,
        excused: 5,
      }),
    ).toBe(100);
  });

  it('perfect attendance is 100%', () => {
    expect(
      computeAttendancePercentage({
        present: 10,
        absent: 0,
        late: 0,
        excused: 0,
      }),
    ).toBe(100);
  });

  it('below the 75% exam-eligibility threshold is detectable by the caller', () => {
    const pct = computeAttendancePercentage({
      present: 6,
      absent: 4,
      late: 0,
      excused: 0,
    });
    expect(pct).toBe(60);
    expect(pct).toBeLessThan(75);
  });
});
