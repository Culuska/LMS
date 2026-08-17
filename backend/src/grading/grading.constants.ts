/**
 * Default grading-scale seed data — mirrors docs/04-grading-and-academic-policy.md §1
 * exactly. This is the ONLY place those numbers are hard-coded; everywhere else reads
 * from the `grade_bands` database table (seeded from this file) so a future policy
 * change is a data update, not a code change. See docs/04 for the authoritative policy.
 */
export interface GradeBandConfig {
  letter: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoints: number;
  isPassing: boolean;
}

export const DEFAULT_GRADE_BANDS: GradeBandConfig[] = [
  {
    letter: 'A+',
    minPercentage: 97,
    maxPercentage: 100,
    gradePoints: 4.0,
    isPassing: true,
  },
  {
    letter: 'A',
    minPercentage: 90,
    maxPercentage: 96,
    gradePoints: 4.0,
    isPassing: true,
  },
  {
    letter: 'A-',
    minPercentage: 85,
    maxPercentage: 89,
    gradePoints: 3.7,
    isPassing: true,
  },
  {
    letter: 'B+',
    minPercentage: 82,
    maxPercentage: 84,
    gradePoints: 3.3,
    isPassing: true,
  },
  {
    letter: 'B',
    minPercentage: 78,
    maxPercentage: 81,
    gradePoints: 3.0,
    isPassing: true,
  },
  {
    letter: 'B-',
    minPercentage: 75,
    maxPercentage: 77,
    gradePoints: 2.7,
    isPassing: true,
  },
  {
    letter: 'C+',
    minPercentage: 72,
    maxPercentage: 74,
    gradePoints: 2.3,
    isPassing: true,
  },
  {
    letter: 'C',
    minPercentage: 68,
    maxPercentage: 71,
    gradePoints: 2.0,
    isPassing: true,
  },
  {
    letter: 'C-',
    minPercentage: 65,
    maxPercentage: 67,
    gradePoints: 1.7,
    isPassing: true,
  },
  {
    letter: 'D+',
    minPercentage: 60,
    maxPercentage: 64,
    gradePoints: 1.3,
    isPassing: true,
  },
  {
    letter: 'D',
    minPercentage: 50,
    maxPercentage: 59,
    gradePoints: 1.0,
    isPassing: true,
  },
  {
    letter: 'F',
    minPercentage: 0,
    maxPercentage: 49,
    gradePoints: 0.0,
    isPassing: false,
  },
];

/**
 * docs/04 §3 — assessment component weight bands (percent of final course grade).
 * NOTE: the default split is 40/20/40, not the original 40/25/35 suggestion — 35%
 * for the Final component fell below the Final band's own 40% floor. Caught by
 * grading.util.spec.ts; corrected here and in docs/04 §3. Flagged back to the
 * lecturer rather than silently changed.
 */
export const ASSESSMENT_WEIGHT_BANDS = {
  CONTINUOUS_ASSESSMENT: { min: 30, max: 50, default: 40 },
  MIDTERM: { min: 15, max: 25, default: 20 },
  FINAL: { min: 40, max: 60, default: 40 },
} as const;

/** docs/04 §2 — course load bands, in credits per semester. */
export const COURSE_LOAD = {
  MIN_FULL_TIME: 12,
  NORMAL_MAX: 18,
  ADVISOR_APPROVAL_ABOVE: 21,
} as const;

/** docs/04 §4 — retake policy. */
export const RETAKE_POLICY = {
  MAX_ATTEMPTS_INCLUDING_ORIGINAL: 3, // original + 2 retakes
} as const;

/** docs/04 §7 — probation/dismissal thresholds. */
export const ACADEMIC_STANDING = {
  PROBATION_CGPA_THRESHOLD: 2.0,
  DISMISSAL_SEMESTER_GPA_THRESHOLD: 1.5,
} as const;

/** docs/04 §11 — attendance exam-eligibility gate (configurable per faculty; this is the default). */
export const DEFAULT_ATTENDANCE_THRESHOLD_PERCENT = 75;
