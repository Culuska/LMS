import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { ACADEMIC_STANDING, computeGpa } from '../grading';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/**
 * docs/04-grading-and-academic-policy.md §7 — probation/dismissal thresholds, applied
 * automatically whenever a published result (new or corrected) changes a student's GPA.
 * Shared between CourseResultsService.publish() and GradeChangeRequestsService's
 * approval path (a grade change on an already-published result must recompute GPA and
 * standing again, exactly the same way — one implementation, not two that could drift).
 *
 * Recovery from probation back to ACTIVE is implemented (CGPA climbs back to >=2.0); the
 * harder open question — whether indefinite probation needs a hard cap — is NOT resolved
 * here, consistent with it being flagged as unresolved in docs/04.
 */
@Injectable()
export class AcademicStandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async recompute(
    studentId: string,
    semesterId: string,
    semesterName: string,
    actor: AuthenticatedUser,
  ) {
    const allEntries = await this.prisma.academicRecordEntry.findMany({
      where: { studentId },
    });
    const cumulativeGpa = computeGpa(
      allEntries.map((e) => ({
        credits: e.credits,
        gradePoints: Number(e.gradePoints),
      })),
    );

    const semesterEntries = allEntries.filter(
      (e) => e.semesterName === semesterName,
    );
    const semesterGpa = computeGpa(
      semesterEntries.map((e) => ({
        credits: e.credits,
        gradePoints: Number(e.gradePoints),
      })),
    );

    await this.prisma.gpaRecord.create({
      data: { studentId, semesterId, semesterGpa, cumulativeGpa },
    });

    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
    });
    let newStatus = student.status;
    if (semesterGpa < ACADEMIC_STANDING.DISMISSAL_SEMESTER_GPA_THRESHOLD) {
      newStatus = 'DISMISSED';
    } else if (cumulativeGpa < ACADEMIC_STANDING.PROBATION_CGPA_THRESHOLD) {
      newStatus = 'PROBATION';
    } else if (
      student.status === 'PROBATION' &&
      cumulativeGpa >= ACADEMIC_STANDING.PROBATION_CGPA_THRESHOLD
    ) {
      newStatus = 'ACTIVE'; // recovered good standing
    }

    if (newStatus !== student.status) {
      await this.prisma.student.update({
        where: { id: studentId },
        data: { status: newStatus },
      });
      await this.auditLog.record({
        actorId: actor.id,
        action: 'STUDENT_STATUS_CHANGE',
        targetType: 'Student',
        targetId: studentId,
        beforeData: { status: student.status },
        afterData: { status: newStatus, cumulativeGpa, semesterGpa },
      });
    }

    return { semesterGpa, cumulativeGpa, studentStatus: newStatus };
  }
}
