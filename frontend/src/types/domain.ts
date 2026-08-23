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
  dueAt: string | null;
  durationMinutes: number | null;
}

export interface Mark {
  id: string;
  assessmentItemId: string;
  studentId: string;
  score: string;
}

export interface Resource {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface CourseContentItem {
  id: string;
  title: string;
  body: string | null;
  videoUrl: string | null;
  parentId: string | null;
  orderIndex: number;
  resources: Resource[];
}

export interface Submission {
  id: string;
  content: string | null;
  isLate: boolean;
  submittedAt: string;
  resources: Resource[];
  mark?: Mark | null;
  student?: {
    studentNumber: string;
    user: { firstName: string; lastName: string; email: string };
  };
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  status: AttendanceStatus;
}

export interface AttendanceSession {
  id: string;
  sessionDate: string;
  records: AttendanceRecord[];
}

export interface QuizChoice {
  id: string;
  questionId: string;
  text: string;
  orderIndex: number;
  // Present only in the lecturer's view (QuizService hides it from students,
  // before and after they take the quiz).
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id: string;
  assessmentItemId: string;
  text: string;
  orderIndex: number;
  choices: QuizChoice[];
}

export interface QuizAnswer {
  id: string;
  questionId: string;
  choiceId: string | null;
}

export interface QuizAttempt {
  id: string;
  assessmentItemId: string;
  studentId: string;
  startedAt: string;
  submittedAt: string | null;
  isLate: boolean;
  score: string | null;
  answers: QuizAnswer[];
  totalQuestions?: number;
  correctCount?: number;
  student?: {
    studentNumber: string;
    user: { firstName: string; lastName: string; email: string };
  };
}

export interface ForumAuthor {
  firstName: string;
  lastName: string;
}

export interface ForumReply {
  id: string;
  body: string;
  createdAt: string;
  author: ForumAuthor | null;
}

export interface ForumPost {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  author: ForumAuthor | null;
  replies: ForumReply[];
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
  isActive: boolean;
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
