import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

// docs/00-requirements-audit.md §5 RBAC table row "Transcripts (official)" — deliberately
// narrower than most academic-data rows: no ADVISOR, no LECTURER, even though both can
// view a student's academic profile elsewhere. Matched exactly, not generalized from the
// broader "who can see student data" pattern used in other modules.
const TRANSCRIPT_STAFF_ROLES: RoleName[] = [
  RoleName.SUPER_ADMIN,
  RoleName.REGISTRAR,
  RoleName.DEAN,
  RoleName.HEAD_OF_DEPARTMENT,
  RoleName.EXAM_OFFICER,
];

export interface TranscriptSemesterSection {
  semesterName: string;
  courses: {
    courseCode: string;
    courseTitle: string;
    credits: number;
    letterGrade: string;
    gradePoints: number;
  }[];
}

@Injectable()
export class TranscriptService {
  constructor(private readonly prisma: PrismaService) {}

  async getForStudent(studentId: string, user: AuthenticatedUser) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        enrollments: { include: { program: true, curriculumVersion: true } },
      },
    });
    if (!student) {
      throw new NotFoundException(`Student ${studentId} not found`);
    }

    const isStaff = user.roles.some((r) => TRANSCRIPT_STAFF_ROLES.includes(r));
    if (!isStaff) {
      if (student.userId !== user.id) {
        throw new ForbiddenException('You can only view your own transcript');
      }
    }

    const entries = await this.prisma.academicRecordEntry.findMany({
      where: { studentId },
      orderBy: { recordedAt: 'asc' },
    });

    const passingBands = await this.prisma.gradeBand.findMany({
      where: { isPassing: true },
    });
    const passingLetters = new Set(passingBands.map((b) => b.letter));

    const bySemester = new Map<string, TranscriptSemesterSection>();
    let totalCreditsAttempted = 0;
    let totalCreditsEarned = 0;

    for (const entry of entries) {
      totalCreditsAttempted += entry.credits;
      if (passingLetters.has(entry.letterGrade)) {
        totalCreditsEarned += entry.credits;
      }
      if (!bySemester.has(entry.semesterName)) {
        bySemester.set(entry.semesterName, {
          semesterName: entry.semesterName,
          courses: [],
        });
      }
      bySemester.get(entry.semesterName)!.courses.push({
        courseCode: entry.courseCode,
        courseTitle: entry.courseTitle,
        credits: entry.credits,
        letterGrade: entry.letterGrade,
        gradePoints: Number(entry.gradePoints),
      });
    }

    const latestGpaRecord = await this.prisma.gpaRecord.findFirst({
      where: { studentId },
      orderBy: { computedAt: 'desc' },
    });

    return {
      student: {
        studentNumber: student.studentNumber,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        status: student.status,
      },
      programs: student.enrollments.map((e) => ({
        programName: e.program.name,
        curriculumVersion: e.curriculumVersion.versionLabel,
        enrollmentStatus: e.status,
      })),
      semesters: Array.from(bySemester.values()),
      totalCreditsAttempted,
      totalCreditsEarned,
      cumulativeGpa: latestGpaRecord
        ? Number(latestGpaRecord.cumulativeGpa)
        : null,
      generatedAt: new Date().toISOString(),
    };
  }
}
