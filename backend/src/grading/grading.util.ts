import { ASSESSMENT_WEIGHT_BANDS, GradeBandConfig } from './grading.constants';

export class UnresolvableGradeError extends Error {
  constructor(percentage: number) {
    super(
      `No grade band covers percentage ${percentage} — grade bands are misconfigured`,
    );
    this.name = 'UnresolvableGradeError';
  }
}

/**
 * Finds the letter grade + grade points for a given percentage score.
 * Throws rather than silently defaulting — an unresolvable percentage means the
 * grade_bands table has a gap, and that must surface loudly, not produce a wrong grade.
 */
export function resolveGradeBand(
  percentage: number,
  bands: GradeBandConfig[],
): GradeBandConfig {
  const band = bands.find(
    (b) => percentage >= b.minPercentage && percentage <= b.maxPercentage,
  );
  if (!band) {
    throw new UnresolvableGradeError(percentage);
  }
  return band;
}

/** The lowest-scoring band still flagged as a pass — i.e. "D" in the default table. */
export function lowestPassingBand(bands: GradeBandConfig[]): GradeBandConfig {
  const passing = bands.filter((b) => b.isPassing);
  if (passing.length === 0) {
    throw new Error('No passing grade band configured');
  }
  return passing.reduce((lowest, b) =>
    b.minPercentage < lowest.minPercentage ? b : lowest,
  );
}

export interface AssessmentComponent {
  weight: number; // percent, e.g. 40 for 40%
  score: number; // raw score achieved
  maxMarks: number; // raw score possible
}

/**
 * Weighted-average percentage across a course's assessment components.
 * `score/maxMarks` is normalized to a percentage before weighting, so components can use
 * different mark scales (e.g. a quiz out of 20, a final out of 100).
 */
export function computeWeightedPercentage(
  components: AssessmentComponent[],
): number {
  if (components.length === 0) {
    throw new Error(
      'Cannot compute a weighted percentage with no assessment components',
    );
  }
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new Error(
      `Assessment component weights must sum to 100% before grading is computed (got ${totalWeight}%) — see docs/00-requirements-audit.md §8 rule 9`,
    );
  }
  const weightedSum = components.reduce((sum, c) => {
    const percentageOfComponent = (c.score / c.maxMarks) * 100;
    return sum + percentageOfComponent * (c.weight / 100);
  }, 0);
  return roundTo(weightedSum, 2);
}

/** docs/04 §3 — validates a course offering's own weight configuration before use. */
export function validateAssessmentWeights(weights: {
  continuousAssessment: number;
  midterm: number;
  final: number;
}): string[] {
  const errors: string[] = [];
  const { CONTINUOUS_ASSESSMENT, MIDTERM, FINAL } = ASSESSMENT_WEIGHT_BANDS;

  if (
    weights.continuousAssessment < CONTINUOUS_ASSESSMENT.min ||
    weights.continuousAssessment > CONTINUOUS_ASSESSMENT.max
  ) {
    errors.push(
      `Continuous assessment weight ${weights.continuousAssessment}% is outside the allowed band ${CONTINUOUS_ASSESSMENT.min}-${CONTINUOUS_ASSESSMENT.max}%`,
    );
  }
  if (weights.midterm < MIDTERM.min || weights.midterm > MIDTERM.max) {
    errors.push(
      `Midterm weight ${weights.midterm}% is outside the allowed band ${MIDTERM.min}-${MIDTERM.max}%`,
    );
  }
  if (weights.final < FINAL.min || weights.final > FINAL.max) {
    errors.push(
      `Final weight ${weights.final}% is outside the allowed band ${FINAL.min}-${FINAL.max}%`,
    );
  }
  const total = weights.continuousAssessment + weights.midterm + weights.final;
  if (Math.abs(total - 100) > 0.01) {
    errors.push(`Weights must sum to exactly 100% (got ${total}%)`);
  }
  return errors;
}

/**
 * docs/04-grading-and-academic-policy.md §4 — retake scoring.
 * If this is a retake attempt AND the student passed, the counted percentage is capped
 * at the ceiling of the lowest passing band (D) regardless of the actual score — a
 * deliberate disincentive against relying on retakes to inflate GPA. A retake that is
 * still a fail is NOT capped (there's nothing to cap — it's already at the bottom).
 */
export function applyRetakeCap(
  actualPercentage: number,
  isRetake: boolean,
  bands: GradeBandConfig[],
): number {
  if (!isRetake) {
    return actualPercentage;
  }
  const band = resolveGradeBand(actualPercentage, bands);
  if (!band.isPassing) {
    return actualPercentage;
  }
  const cap = lowestPassingBand(bands);
  return Math.min(actualPercentage, cap.maxPercentage);
}

export interface CourseCredit {
  credits: number;
  gradePoints: number;
}

/**
 * Credit-weighted GPA: GPA = Σ(credits × gradePoints) / Σ(credits).
 * See docs/04-grading-and-academic-policy.md §2. Courses with a null/excluded grade
 * (e.g. a "W" withdrawal, which is GPA-neutral) must be filtered out by the caller
 * before passing the list in here — this function has no concept of grade codes,
 * only points, on purpose (keeps it trivially testable).
 */
export function computeGpa(courses: CourseCredit[]): number {
  if (courses.length === 0) {
    return 0;
  }
  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  if (totalCredits === 0) {
    return 0;
  }
  const totalPoints = courses.reduce(
    (sum, c) => sum + c.credits * c.gradePoints,
    0,
  );
  return roundTo(totalPoints / totalCredits, 2);
}

export interface AttendanceTally {
  present: number;
  absent: number;
  late: number;
  excused: number;
}

/**
 * docs/04-grading-and-academic-policy.md §11 — excused absences are excluded from the
 * denominator (proposed default, flagged as an open item pending confirmation), so a
 * student with approved medical absences isn't penalized. Late counts as attended.
 */
export function computeAttendancePercentage(tally: AttendanceTally): number {
  const countedSessions = tally.present + tally.absent + tally.late;
  if (countedSessions === 0) {
    return 100; // no sessions expected yet — don't falsely report 0%
  }
  const attended = tally.present + tally.late;
  return roundTo((attended / countedSessions) * 100, 2);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
