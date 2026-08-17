import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseOfferingDto } from './dto/create-course-offering.dto';
import { ASSESSMENT_WEIGHT_BANDS, validateAssessmentWeights } from '../grading';

@Injectable()
export class CourseOfferingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(semesterId?: string) {
    return this.prisma.courseOffering.findMany({
      where: semesterId ? { semesterId } : undefined,
      include: { course: true, lecturer: { include: { user: true } } },
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
}
