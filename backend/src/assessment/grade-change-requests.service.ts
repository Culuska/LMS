import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { AcademicStandingService } from './academic-standing.service';
import { resolveGradeBand } from '../grading';
import { CreateGradeChangeRequestDto } from './dto/create-grade-change-request.dto';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/**
 * The only path allowed to change a result once it's past DRAFT — see
 * docs/00-requirements-audit.md §5 RBAC table row "Grade change after publication" and
 * §8 rule 5 ("published examination results should not be silently changed"). Note this
 * row deliberately excludes even SUPER_ADMIN from approval — Exam Officer only — unlike
 * every other endpoint in this codebase, which is why there's no admin-override bypass
 * anywhere in this service.
 */
@Injectable()
export class GradeChangeRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly academicStanding: AcademicStandingService,
  ) {}

  async create(
    resultId: string,
    dto: CreateGradeChangeRequestDto,
    user: AuthenticatedUser,
  ) {
    const result = await this.loadResultWithContext(resultId);

    if (result.status === 'DRAFT') {
      throw new BadRequestException(
        'This result is still DRAFT — recompute/edit it directly instead of requesting a grade change',
      );
    }

    // Registrar/Dean/HoD have standing academic-oversight authority (per the RBAC table,
    // no "(own unit)" scoping is specified on this row); a Lecturer requester must be the
    // offering's own assigned lecturer — the same ownership rule as everywhere else.
    const oversightRoles: RoleName[] = [
      RoleName.REGISTRAR,
      RoleName.DEAN,
      RoleName.HEAD_OF_DEPARTMENT,
    ];
    const isBroadOversightRole = user.roles.some((r) =>
      oversightRoles.includes(r),
    );
    if (!isBroadOversightRole) {
      const lecturer = await this.prisma.lecturer.findUnique({
        where: { userId: user.id },
      });
      if (
        !lecturer ||
        lecturer.id !== result.courseRegistration.courseOffering.lecturerId
      ) {
        throw new ForbiddenException(
          'You are not the lecturer assigned to this course offering',
        );
      }
    }

    const request = await this.prisma.gradeChangeRequest.create({
      data: {
        courseResultId: resultId,
        requestedById: user.id,
        reason: dto.reason,
        oldPercentage: result.countedPercentage,
        newPercentage: dto.newPercentage,
        status: 'PENDING',
      },
    });

    await this.auditLog.record({
      actorId: user.id,
      action: 'GRADE_CHANGE_REQUESTED',
      targetType: 'GradeChangeRequest',
      targetId: request.id,
      afterData: {
        oldPercentage: result.countedPercentage,
        newPercentage: dto.newPercentage,
        reason: dto.reason,
      },
    });

    return request;
  }

  async approve(requestId: string, user: AuthenticatedUser) {
    const request = await this.loadRequestWithContext(requestId);
    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot decide a request that is already ${request.status.toLowerCase()}`,
      );
    }

    const bands = (await this.prisma.gradeBand.findMany()).map((b) => ({
      letter: b.letter,
      minPercentage: Number(b.minPercentage),
      maxPercentage: Number(b.maxPercentage),
      gradePoints: Number(b.gradePoints),
      isPassing: b.isPassing,
    }));
    // Deliberately NOT re-applying the retake cap here — an Exam Officer approving a
    // manual correction is expected to review the actual corrected percentage as given,
    // not have it silently re-capped a second time. See docs/04 §4 for the original cap.
    const newBand = resolveGradeBand(Number(request.newPercentage), bands);
    const result = request.courseResult;
    const oldLetterGrade = result.letterGrade;

    await this.prisma.$transaction([
      this.prisma.gradeChangeRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          approvedById: user.id,
          approvedAt: new Date(),
        },
      }),
      this.prisma.courseResult.update({
        where: { id: result.id },
        data: {
          countedPercentage: request.newPercentage,
          letterGrade: newBand.letter,
          gradePoints: newBand.gradePoints,
        },
      }),
    ]);

    await this.auditLog.record({
      actorId: user.id,
      action: 'GRADE_CHANGE_APPROVED',
      targetType: 'CourseResult',
      targetId: result.id,
      beforeData: {
        percentage: result.countedPercentage,
        letterGrade: oldLetterGrade,
      },
      afterData: {
        percentage: request.newPercentage,
        letterGrade: newBand.letter,
        reason: request.reason,
      },
    });

    let gpaOutcome: Awaited<
      ReturnType<AcademicStandingService['recompute']>
    > | null = null;

    // If already published, the transcript-facing AcademicRecordEntry (and GPA/standing
    // derived from it) must be corrected too — not just the internal CourseResult.
    if (result.status === 'PUBLISHED') {
      const registration = request.courseResult.courseRegistration;
      const semester = await this.prisma.semester.findUniqueOrThrow({
        where: { id: registration.semesterId },
        include: { academicYear: true },
      });
      const semesterName = `${semester.academicYear.name} ${semester.term}`;

      const entry = await this.prisma.academicRecordEntry.findFirst({
        where: {
          studentId: registration.studentId,
          courseCode: registration.courseOffering.course.code,
          semesterName,
        },
        orderBy: { recordedAt: 'desc' },
      });
      if (!entry) {
        throw new NotFoundException(
          'Result is PUBLISHED but no matching AcademicRecordEntry was found — data inconsistency, needs manual investigation',
        );
      }
      await this.prisma.academicRecordEntry.update({
        where: { id: entry.id },
        data: { letterGrade: newBand.letter, gradePoints: newBand.gradePoints },
      });

      gpaOutcome = await this.academicStanding.recompute(
        registration.studentId,
        semester.id,
        semesterName,
        user,
      );
    }

    return {
      request: { ...request, status: 'APPROVED' as const },
      newLetterGrade: newBand.letter,
      gpa: gpaOutcome,
    };
  }

  async deny(requestId: string, user: AuthenticatedUser) {
    const request = await this.loadRequestWithContext(requestId);
    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot decide a request that is already ${request.status.toLowerCase()}`,
      );
    }

    const updated = await this.prisma.gradeChangeRequest.update({
      where: { id: requestId },
      data: { status: 'DENIED', approvedById: user.id, approvedAt: new Date() },
    });

    await this.auditLog.record({
      actorId: user.id,
      action: 'GRADE_CHANGE_DENIED',
      targetType: 'GradeChangeRequest',
      targetId: requestId,
    });

    return updated;
  }

  private async loadResultWithContext(resultId: string) {
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

  private async loadRequestWithContext(requestId: string) {
    const request = await this.prisma.gradeChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        courseResult: {
          include: {
            courseRegistration: {
              include: { courseOffering: { include: { course: true } } },
            },
          },
        },
      },
    });
    if (!request) {
      throw new NotFoundException(
        `Grade change request ${requestId} not found`,
      );
    }
    return request;
  }
}
