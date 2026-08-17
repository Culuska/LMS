// Mirrors backend/src/auth/strategies/jwt.strategy.ts AuthenticatedUser and
// backend/prisma/schema.prisma RoleName — kept in sync manually for now. Once the API
// contract stabilizes, generating this from the backend's OpenAPI spec is a worthwhile
// follow-up (see docs/00-requirements-audit.md §18, API architecture).
export type RoleName =
  | 'SUPER_ADMIN'
  | 'IT_ADMIN'
  | 'REGISTRAR'
  | 'DEAN'
  | 'HEAD_OF_DEPARTMENT'
  | 'FACULTY_ADMIN'
  | 'DEPARTMENT_ADMIN'
  | 'EXAM_OFFICER'
  | 'ADMISSIONS_OFFICER'
  | 'ADVISOR'
  | 'LECTURER'
  | 'STUDENT'
  | 'AUDITOR';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: RoleName[];
  mustChangePassword: boolean;
  studentId?: string;
  lecturerId?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthenticatedUser;
}
