import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OfferingAccessService } from '../common/offering-access.service';
import { AttendanceService } from '../attendance/attendance.service';
import { AuditLogService } from '../audit/audit-log.service';
import {
  ACADEMIC_STANDING,
  applyRetakeCap,
  computeGpa,
  computeWeightedPercentage,
  DEFAULT_ATTENDANCE_THRESHOLD_PERCENT,
  resolveGradeBand,
} from '../grading';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/**
 * The grading pipeline: compute (from Marks) -> submit -> approve -> publish.
 * See docs/00-requirements-audit.md §8 rule 5 and §5 (dangerous permission conflict #1:
 * a lecturer must never be able to publish their own course's results — enforced by
 * the role split below, submit vs. approve/publish requiring different roles, plus an
 * explicit anti-self-approval check).
 */
@Injectable()
export class CourseResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offeringAccess: OfferingAccessService,
    private readonly attendanceService: AttendanceService,
    private readonly auditLog: AuditLogService,
  ) {}

  async compute(registrationId: string, user: AuthenticatedUser) {
    const registration = await this.prisma.courseRegistration.findUnique({
      where: { id: registrationId },
      include: {
        courseOffering: { include: { course: true } },
        courseResult: true,
      },
    });
    if (!registration) {
      throw new NotFoundException(
        `Course registration ${registrationId} not found`,
      );
    }
    await this.offeringAccess.assertCanManageOffering(
      registration.courseOfferingId,
      user,
    );

    if (
      registration.courseResult &&
      registration.courseResult.status !== 'DRAFT'
    ) {
      throw new BadRequestException(
        `Result is already ${registration.courseResult.status.toLowerCase()} — cannot recompute`,
      );
    }

    const items = await this.prisma.assessmentItem.findMany({
      where: { courseOfferingId: registration.courseOfferingId },
    });
    if (items.length === 0) {
      throw new BadRequestException(
        'No assessment items exist for this course offering yet',
      );
    }
    const marks = await this.prisma.mark.findMany({
      where: {
        studentId: registration.studentId,
        assessmentItemId: { in: items.map((i) => i.id) },
      },
    });
    const markByItem = new Map(marks.map((m) => [m.assessmentItemId, m]));
    const missing = items.filter((i) => !markByItem.has(i.id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing marks for: ${missing.map((i) => i.title).join(', ')}`,
      );
    }

    // docs/04-grading-and-academic-policy.md §11 — exam eligibility gate.
    const attendancePercentage =
      await this.attendanceService.getAttendancePercentage(
        registration.studentId,
        registration.courseOfferingId,
      );
    if (attendancePercentage < DEFAULT_ATTENDANCE_THRESHOLD_PERCENT) {
      throw new BadRequestException(
        `Student's attendance (${attendancePercentage}%) is below the ${DEFAULT_ATTENDANCE_THRESHOLD_PERCENT}% exam-eligibility threshold`,
      );
    }

    const computedPercentage = computeWeightedPercentage(
      items.map((i) => ({
        weight: Number(i.weight),
        score: Number(markByItem.get(i.id)!.score),
        maxMarks: Number(i.maxMarks),
      })),
    );

    const bands = (await this.prisma.gradeBand.findMany()).map((b) => ({
      letter: b.letter,
      minPercentage: Number(b.minPercentage),
      maxPercentage: Number(b.maxPercentage),
      gradePoints: Number(b.gradePoints),
      isPassing: b.isPassing,
    }));
    const countedPercentage = applyRetakeCap(
      computedPercentage,
      registration.isRetake,
      bands,
    );
    const band = resolveGradeBand(countedPercentage, bands);

    return this.prisma.courseResult.upsert({
      where: { courseRegistrationId: registrationId },
      update: {
        computedPercentage,
        countedPercentage,
        letterGrade: band.letter,
        gradePoints: band.gradePoints,
      },
      create: {
        courseRegistrationId: registrationId,
        computedPercentage,
        countedPercentage,
        letterGrade: band.letter,
        gradePoints: band.gradePoints,
      },
    });
  }

  async submit(resultId: string, user: AuthenticatedUser) {
    const result = await this.loadResultWithOffering(resultId);
    await this.offeringAccess.assertCanManageOffering(
      result.courseRegistration.courseOfferingId,
      user,
    );
    if (result.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot submit a result that is already ${result.status.toLowerCase()}`,
      );
    }
    return this.prisma.courseResult.update({
      where: { id: resultId },
      data: {
        status: 'SUBMITTED',
        submittedById: user.id,
        submittedAt: new Date(),
      },
    });
  }

  async approve(resultId: string, user: AuthenticatedUser) {
    const result = await this.loadResultWithOffering(resultId);
    if (result.status !== 'SUBMITTED') {
      throw new BadRequestException(
        `Cannot approve a result that is ${result.status.toLowerCase()}, not submitted`,
      );
    }
    // Anti-self-approval — the same person who submitted a result must not also approve
    // it, even if their role would technically permit both actions.
    if (result.submittedById === user.id) {
      throw new ForbiddenException(
        'The submitter of a result cannot also approve it',
      );
    }
    return this.prisma.courseResult.update({
      where: { id: resultId },
      data: {
        status: 'APPROVED',
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });
  }

  async publish(resultId: string, user: AuthenticatedUser) {
    const result = await this.loadResultWithOffering(resultId);
    if (result.status !== 'APPROVED') {
      throw new BadRequestException(
        `Cannot publish a result that is ${result.status.toLowerCase()}, not approved`,
      );
    }

    const registration = result.courseRegistration;
    const offering = registration.courseOffering;
    const semester = await this.prisma.semester.findUnique({
      where: { id: registration.semesterId },
      include: { academicYear: true },
    });
    if (!semester) {
      throw new NotFoundException(
        `Semester ${registration.semesterId} not found`,
      );
    }
    const semesterName = `${semester.academicYear.name} ${semester.term}`;

    const [published] = await this.prisma.$transaction([
      this.prisma.courseResult.update({
        where: { id: resultId },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      }),
      this.prisma.courseRegistration.update({
        where: { id: registration.id },
        data: { status: 'COMPLETED' },
      }),
      this.prisma.academicRecordEntry.create({
        data: {
          studentId: registration.studentId,
          courseCode: offering.course.code,
          courseTitle: offering.course.title,
          credits: offering.course.credits,
          letterGrade: result.letterGrade,
          gradePoints: result.gradePoints,
          semesterName,
        },
      }),
    ]);

    await this.auditLog.record({
      actorId: user.id,
      action: 'COURSE_RESULT_PUBLISHED',
      targetType: 'CourseResult',
      targetId: resultId,
      afterData: {
        letterGrade: result.letterGrade,
        gradePoints: result.gradePoints,
        studentId: registration.studentId,
      },
    });

    const gpaOutcome = await this.recomputeGpaAndStanding(
      registration.studentId,
      semester.id,
      semesterName,
      user,
    );

    return { result: published, gpa: gpaOutcome };
  }

  /**
   * docs/04-grading-and-academic-policy.md §7 — probation/dismissal thresholds, applied
   * automatically whenever a result publication changes a student's GPA. Recovery from
   * probation back to ACTIVE is implemented (CGPA climbs back to >=2.0); the harder open
   * question — whether indefinite probation needs a hard cap — is NOT resolved here,
   * consistent with it being flagged as unresolved in docs/04.
   */
  private async recomputeGpaAndStanding(
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

  private async loadResultWithOffering(resultId: string) {
    const result = await this.prisma.courseResult.findUnique({
      where: { id: resultId },
      include: {
        courseRegistration: {
          include: { courseOffering: { include: { course: true } } },
        },
      },
    });
    if (!result) {
      throw new NotFoundException(`Course result ${resultId} not found`);
    }
    return result;
  }
}
