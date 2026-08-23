import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OfferingAccessService } from '../common/offering-access.service';
import { CreateCourseOfferingDto } from './dto/create-course-offering.dto';
import { CreateCourseSimpleDto } from './dto/create-course-simple.dto';
import { UpdateCourseSimpleDto } from './dto/update-course-simple.dto';
import { ASSESSMENT_WEIGHT_BANDS, validateAssessmentWeights } from '../grading';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class CourseOfferingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offeringAccess: OfferingAccessService,
  ) {}

  findAll(semesterId?: string) {
    return this.prisma.courseOffering.findMany({
      where: semesterId ? { semesterId } : undefined,
      include: { course: true, lecturer: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMine(userId: string) {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { userId },
    });
    if (!lecturer) {
      return [];
    }
    return this.prisma.courseOffering.findMany({
      where: { lecturerId: lecturer.id },
      include: { course: true, semester: { include: { academicYear: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const offering = await this.prisma.courseOffering.findUnique({
      where: { id },
      include: {
        course: true,
        lecturer: { include: { user: true } },
        semester: true,
      },
    });
    if (!offering) {
      throw new NotFoundException(`Course offering ${id} not found`);
    }
    return offering;
  }

  async create(dto: CreateCourseOfferingDto) {
    const [course, semester, lecturer] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: dto.courseId } }),
      this.prisma.semester.findUnique({ where: { id: dto.semesterId } }),
      this.prisma.lecturer.findUnique({ where: { id: dto.lecturerId } }),
    ]);
    if (!course)
      throw new NotFoundException(`Course ${dto.courseId} not found`);
    if (!semester)
      throw new NotFoundException(`Semester ${dto.semesterId} not found`);
    if (!lecturer)
      throw new NotFoundException(`Lecturer ${dto.lecturerId} not found`);

    const caWeight =
      dto.caWeight ?? ASSESSMENT_WEIGHT_BANDS.CONTINUOUS_ASSESSMENT.default;
    const midtermWeight =
      dto.midtermWeight ?? ASSESSMENT_WEIGHT_BANDS.MIDTERM.default;
    const finalWeight =
      dto.finalWeight ?? ASSESSMENT_WEIGHT_BANDS.FINAL.default;

    // Enforced here, not just in the docs — see docs/00-requirements-audit.md §8 rule 9
    // and docs/04-grading-and-academic-policy.md §3.
    const weightErrors = validateAssessmentWeights({
      continuousAssessment: caWeight,
      midterm: midtermWeight,
      final: finalWeight,
    });
    if (weightErrors.length > 0) {
      throw new BadRequestException(weightErrors);
    }

    const existing = await this.prisma.courseOffering.findUnique({
      where: {
        courseId_semesterId_lecturerId: {
          courseId: dto.courseId,
          semesterId: dto.semesterId,
          lecturerId: dto.lecturerId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'This lecturer is already assigned to this course for this semester',
      );
    }

    return this.prisma.courseOffering.create({
      data: {
        courseId: dto.courseId,
        semesterId: dto.semesterId,
        lecturerId: dto.lecturerId,
        capacity: dto.capacity,
        room: dto.room,
        timetableSlot: dto.timetableSlot,
        caWeight,
        midtermWeight,
        finalWeight,
      },
    });
  }

  /** The one-step version a lecturer actually uses day to day: name a course and it's
   * ready to use. Fills in the semester (whichever one is currently marked active) and
   * the lecturer (the caller) automatically — see CreateCourseSimpleDto. */
  async createSimple(dto: CreateCourseSimpleDto, user: AuthenticatedUser) {
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { userId: user.id },
    });
    if (!lecturer) {
      throw new ForbiddenException(
        'Only lecturers can create courses this way',
      );
    }

    const semester = await this.prisma.semester.findFirst({
      where: { isActive: true },
    });
    if (!semester) {
      throw new BadRequestException(
        'No semester is currently marked active — ask a Super Admin or Registrar ' +
          'to set one up before creating courses.',
      );
    }

    // Reuse the course if this code already exists (e.g. re-offering "CS301" in a new
    // semester) rather than erroring — code collisions are the normal case here, not a
    // mistake. Editing an existing course's details is a separate, explicit action.
    let course = await this.prisma.course.findUnique({
      where: { code: dto.code },
    });
    if (!course) {
      course = await this.prisma.course.create({
        data: {
          code: dto.code,
          title: dto.title,
          description: dto.description,
          credits: dto.credits,
        },
      });
    }

    return this.create({
      courseId: course.id,
      semesterId: semester.id,
      lecturerId: lecturer.id,
      capacity: dto.capacity ?? 40,
    });
  }

  /** Course-level and offering-level fields in one request — see UpdateCourseSimpleDto
   * for why. Only the lecturer assigned to this offering (or an admin) may edit it,
   * enforced the same way write access is checked everywhere else in this codebase. */
  async updateSimple(
    offeringId: string,
    dto: UpdateCourseSimpleDto,
    user: AuthenticatedUser,
  ) {
    const offering = await this.offeringAccess.assertCanManageOffering(
      offeringId,
      user,
    );

    if (
      dto.title !== undefined ||
      dto.description !== undefined ||
      dto.credits !== undefined
    ) {
      await this.prisma.course.update({
        where: { id: offering.courseId },
        data: {
          title: dto.title,
          description: dto.description,
          credits: dto.credits,
        },
      });
    }

    return this.prisma.courseOffering.update({
      where: { id: offeringId },
      data: { capacity: dto.capacity, room: dto.room },
      include: { course: true },
    });
  }

  /** Removes this offering (the thing students actually see and register for) — not
   * the underlying Course, which may be shared with other semesters' offerings.
   * Blocked once there's any real activity against it: none of these relations cascade
   * on delete (by design — losing attendance/grading records silently would be worse
   * than a blocked delete), so this check turns what would otherwise be a raw foreign-
   * key-violation 500 into one clear message. */
  async removeSimple(offeringId: string, user: AuthenticatedUser) {
    await this.offeringAccess.assertCanManageOffering(offeringId, user);

    const [registrations, attendanceSessions, assessmentItems, content] =
      await Promise.all([
        this.prisma.courseRegistration.count({
          where: { courseOfferingId: offeringId },
        }),
        this.prisma.attendanceSession.count({
          where: { courseOfferingId: offeringId },
        }),
        this.prisma.assessmentItem.count({
          where: { courseOfferingId: offeringId },
        }),
        this.prisma.courseContent.count({
          where: { courseOfferingId: offeringId },
        }),
      ]);
    if (registrations + attendanceSessions + assessmentItems + content > 0) {
      throw new BadRequestException(
        'This course already has students, content, attendance, or ' +
          'assignments attached to it and cannot be deleted. Remove those first, ' +
          'or leave the course as-is if it just needs edits.',
      );
    }

    await this.prisma.courseOffering.delete({ where: { id: offeringId } });
  }
}
