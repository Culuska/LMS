import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OfferingAccessService } from '../common/offering-access.service';
import { CreateCourseRegistrationDto } from './dto/create-course-registration.dto';
import { COURSE_LOAD, RETAKE_POLICY } from '../grading';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const STAFF_ROLES: RoleName[] = [
  RoleName.SUPER_ADMIN,
  RoleName.REGISTRAR,
  RoleName.ADVISOR,
];

/**
 * All the business rules a course registration must satisfy before it's created —
 * enforced here, server-side, on every write. See:
 *  - docs/00-requirements-audit.md §8 (data integrity rules 1-3)
 *  - docs/04-grading-and-academic-policy.md §4 (retakes) and §9 (registration rules)
 */
@Injectable()
export class CourseRegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offeringAccess: OfferingAccessService,
  ) {}

  async findMine(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) {
      return [];
    }
    return this.prisma.courseRegistration.findMany({
      where: { studentId: student.id },
      include: {
        courseOffering: {
          include: { course: true, lecturer: { include: { user: true } } },
        },
        courseResult: true,
      },
      orderBy: { registeredAt: 'desc' },
    });
  }

  async findForOffering(offeringId: string, user: AuthenticatedUser) {
    await this.offeringAccess.assertCanManageOffering(offeringId, user);
    return this.prisma.courseRegistration.findMany({
      where: { courseOfferingId: offeringId },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        courseResult: true,
      },
      orderBy: { registeredAt: 'asc' },
    });
  }

  async create(dto: CreateCourseRegistrationDto, user: AuthenticatedUser) {
    const studentId = await this.resolveTargetStudentId(dto.studentId, user);

    const [student, offering] = await Promise.all([
      this.prisma.student.findUnique({ where: { id: studentId } }),
      this.prisma.courseOffering.findUnique({
        where: { id: dto.courseOfferingId },
        include: { course: true, semester: true },
      }),
    ]);
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);
    if (!offering)
      throw new NotFoundException(
        `Course offering ${dto.courseOfferingId} not found`,
      );

    this.assertRegistrationWindowOpen(offering.semester);
    await this.assertNotAlreadyRegisteredThisSemester(
      studentId,
      offering.courseId,
      offering.semesterId,
    );
    await this.assertCurriculumIncludesCourse(studentId, offering.courseId);
    await this.assertPrerequisitesMet(studentId, offering.courseId);

    const { isRetake, retakeAttemptNumber } = await this.resolveRetakeStatus(
      studentId,
      offering.courseId,
    );

    const requiresAdvisorApproval = await this.assertApprovalRulesSatisfied(
      student,
      offering,
      dto.advisorApprovedBy,
    );

    return this.prisma.courseRegistration.create({
      data: {
        studentId,
        courseOfferingId: dto.courseOfferingId,
        semesterId: offering.semesterId,
        isRetake,
        retakeAttemptNumber,
        advisorApprovedBy: requiresAdvisorApproval
          ? dto.advisorApprovedBy
          : undefined,
      },
    });
  }

  /**
   * A STUDENT caller may only ever register themself — dto.studentId is ignored
   * entirely for them and their own Student record is resolved from the JWT, so there's
   * no way to spoof a different student's registration by passing a different ID in the
   * body. Staff roles (Registrar/Advisor/Super Admin) use dto.studentId as given.
   */
  private async resolveTargetStudentId(
    dtoStudentId: string,
    user: AuthenticatedUser,
  ): Promise<string> {
    if (user.roles.some((r) => STAFF_ROLES.includes(r))) {
      return dtoStudentId;
    }
    const ownRecord = await this.prisma.student.findUnique({
      where: { userId: user.id },
    });
    if (!ownRecord) {
      throw new ForbiddenException(
        'No student record is associated with this account',
      );
    }
    return ownRecord.id;
  }

  private assertRegistrationWindowOpen(semester: {
    registrationOpensAt: Date;
    registrationClosesAt: Date;
  }) {
    const now = new Date();
    if (
      now < semester.registrationOpensAt ||
      now > semester.registrationClosesAt
    ) {
      throw new BadRequestException(
        'Registration is not currently open for this semester',
      );
    }
  }

  private async assertNotAlreadyRegisteredThisSemester(
    studentId: string,
    courseId: string,
    semesterId: string,
  ) {
    const existing = await this.prisma.courseRegistration.findFirst({
      where: {
        studentId,
        semesterId,
        status: { in: ['REGISTERED', 'COMPLETED'] },
        courseOffering: { courseId },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Student is already registered for this course this semester (possibly a different section)',
      );
    }
  }

  /** docs/00-requirements-audit.md §8 rule 1. */
  private async assertCurriculumIncludesCourse(
    studentId: string,
    courseId: string,
  ) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, status: 'ACTIVE' },
      select: { curriculumVersionId: true },
    });
    if (enrollments.length === 0) {
      throw new BadRequestException('Student has no active program enrollment');
    }
    const match = await this.prisma.curriculumCourse.findFirst({
      where: {
        courseId,
        curriculumVersionId: {
          in: enrollments.map((e) => e.curriculumVersionId),
        },
      },
    });
    if (!match) {
      throw new BadRequestException(
        'This course is not part of the curriculum for any program the student is enrolled in',
      );
    }
  }

  /** docs/00-requirements-audit.md §8 rule 2. */
  private async assertPrerequisitesMet(studentId: string, courseId: string) {
    const prerequisites = await this.prisma.coursePrerequisite.findMany({
      where: { courseId },
      include: { prerequisiteCourse: true },
    });
    if (prerequisites.length === 0) {
      return;
    }

    const passingBands = await this.prisma.gradeBand.findMany({
      where: { isPassing: true },
    });
    const passingLetters = new Set(passingBands.map((b) => b.letter));

    const unmet: string[] = [];
    for (const prereq of prerequisites) {
      const record = await this.prisma.academicRecordEntry.findFirst({
        where: { studentId, courseCode: prereq.prerequisiteCourse.code },
        orderBy: { recordedAt: 'desc' },
      });
      if (!record || !passingLetters.has(record.letterGrade)) {
        unmet.push(prereq.prerequisiteCourse.code);
      }
    }
    if (unmet.length > 0) {
      throw new BadRequestException(
        `Missing prerequisite(s): ${unmet.join(', ')}`,
      );
    }
  }

  /** docs/04-grading-and-academic-policy.md §4 — up to 2 retakes (3 attempts total). */
  private async resolveRetakeStatus(studentId: string, courseId: string) {
    const priorAttempts = await this.prisma.courseRegistration.count({
      where: {
        studentId,
        status: { in: ['REGISTERED', 'COMPLETED'] },
        courseOffering: { courseId },
      },
    });
    if (priorAttempts === 0) {
      return { isRetake: false, retakeAttemptNumber: 1 };
    }
    if (priorAttempts >= RETAKE_POLICY.MAX_ATTEMPTS_INCLUDING_ORIGINAL) {
      throw new ConflictException(
        `This student has exhausted all ${RETAKE_POLICY.MAX_ATTEMPTS_INCLUDING_ORIGINAL} attempts for this course — ` +
          'escalate to Registrar/Dean review (docs/04-grading-and-academic-policy.md §4, open item).',
      );
    }
    return { isRetake: true, retakeAttemptNumber: priorAttempts + 1 };
  }

  /**
   * docs/04-grading-and-academic-policy.md §9 — advisor sign-off required for: exceeding
   * the 21-credit maximum, or a student on probation. Returns whether approval was required
   * (so the caller knows whether to persist advisorApprovedBy or ignore a stray value).
   */
  private async assertApprovalRulesSatisfied(
    student: { id: string; status: string; advisorId: string | null },
    offering: {
      courseId: string;
      semesterId: string;
      course: { credits: number };
    },
    advisorApprovedBy: string | undefined,
  ): Promise<boolean> {
    // Prisma's aggregate _sum can't reach across a relation to CourseOffering.course.credits,
    // so the current credit load is computed manually here instead.
    const registrations = await this.prisma.courseRegistration.findMany({
      where: {
        studentId: student.id,
        semesterId: offering.semesterId,
        status: 'REGISTERED',
      },
      include: { courseOffering: { include: { course: true } } },
    });
    const currentCredits = registrations.reduce(
      (sum, r) => sum + r.courseOffering.course.credits,
      0,
    );
    const projectedCredits = currentCredits + offering.course.credits;

    const exceedsCreditLimit =
      projectedCredits > COURSE_LOAD.ADVISOR_APPROVAL_ABOVE;
    const isOnProbation = student.status === 'PROBATION';
    const approvalRequired = exceedsCreditLimit || isOnProbation;

    if (!approvalRequired) {
      return false;
    }

    if (!student.advisorId) {
      throw new BadRequestException(
        'This registration requires advisor approval (credit limit or probation), but the student has no assigned advisor',
      );
    }
    if (!advisorApprovedBy || advisorApprovedBy !== student.advisorId) {
      const reason = exceedsCreditLimit
        ? `exceeds the ${COURSE_LOAD.ADVISOR_APPROVAL_ABOVE}-credit limit`
        : 'student is on academic probation';
      throw new BadRequestException(
        `This registration requires approval from the student's assigned advisor (${reason})`,
      );
    }
    return true;
  }
}
