import { AssessmentType } from '@prisma/client';

/**
 * Which weight bucket (docs/04-grading-and-academic-policy.md §3) each AssessmentType
 * counts against. ASSIGNMENT/QUIZ/PRACTICAL all count as "continuous assessment" —
 * PRACTICAL doesn't get its own bucket in the current policy; if the university wants
 * practicals weighted separately, that's a policy change to make explicitly (docs/04),
 * not something assumed here.
 */
export type WeightBucket = 'CONTINUOUS_ASSESSMENT' | 'MIDTERM' | 'FINAL';

export function bucketForAssessmentType(type: AssessmentType): WeightBucket {
  switch (type) {
    case AssessmentType.MIDTERM:
      return 'MIDTERM';
    case AssessmentType.FINAL:
      return 'FINAL';
    case AssessmentType.ASSIGNMENT:
    case AssessmentType.QUIZ:
    case AssessmentType.PRACTICAL:
      return 'CONTINUOUS_ASSESSMENT';
  }
}
