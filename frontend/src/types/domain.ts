// Mirrors backend response shapes closely enough for the frontend's needs — not a full
// generated client (see auth/types.ts's note on that being a worthwhile follow-up).

export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
}

export interface Semester {
  id: string;
  term: 'FIRST' | 'SECOND' | 'SUMMER';
  academicYear?: { name: string };
}

export interface CourseOffering {
  id: string;
  course: Course;
  semester?: Semester;
  lecturer?: { user: { firstName: string; lastName: string } };
  capacity: number;
}

export interface CourseResult {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PUBLISHED';
  computedPercentage: string;
  countedPercentage: string;
  letterGrade: string;
  gradePoints: string;
}

export interface CourseRegistration {
  id: string;
  status: 'REGISTERED' | 'WITHDRAWN' | 'WITHDRAWN_FAIL' | 'COMPLETED';
  isRetake: boolean;
  courseOffering: CourseOffering;
  courseResult: CourseResult | null;
}

export interface RosterEntry {
  id: string;
  status: string;
  student: {
    id: string;
    studentNumber: string;
    user: { firstName: string; lastName: string; email: string };
  };
  courseResult: CourseResult | null;
}

export type AssessmentType = 'ASSIGNMENT' | 'QUIZ' | 'MIDTERM' | 'FINAL' | 'PRACTICAL';

export interface AssessmentItem {
  id: string;
  type: AssessmentType;
  title: string;
  weight: string;
  maxMarks: string;
}

export interface Mark {
  id: string;
  assessmentItemId: string;
  studentId: string;
  score: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface TranscriptCourse {
  courseCode: string;
  courseTitle: string;
  credits: number;
  letterGrade: string;
  gradePoints: number;
}

export interface TranscriptSemester {
  semesterName: string;
  courses: TranscriptCourse[];
}

export interface Transcript {
  student: { studentNumber: string; firstName: string; lastName: string; status: string };
  programs: { programName: string; curriculumVersion: string; enrollmentStatus: string }[];
  semesters: TranscriptSemester[];
  totalCreditsAttempted: number;
  totalCreditsEarned: number;
  cumulativeGpa: number | null;
  generatedAt: string;
}

export interface Faculty {
  id: string;
  code: string;
  name: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  facultyId: string;
}

export type ProgramLevel = 'UNDERGRADUATE' | 'POSTGRADUATE';

export interface Program {
  id: string;
  code: string;
  name: string;
  level: ProgramLevel;
  departmentId: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export type SemesterTerm = 'FIRST' | 'SECOND' | 'SUMMER';

export interface SemesterFull {
  id: string;
  term: SemesterTerm;
  academicYearId: string;
  startDate: string;
  endDate: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  withdrawalDeadline: string;
  academicYear?: AcademicYear;
}

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface RoleAssignment {
  id: string;
  role: string;
  facultyId: string | null;
  departmentId: string | null;
}

export interface UserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: RoleAssignment[];
}

export interface Application {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  status: ApplicationStatus;
  guardianName: string | null;
  guardianEmail: string | null;
  intendedProgramId: string | null;
  createdAt: string;
}
