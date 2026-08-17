import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { AddPrerequisiteDto } from './dto/add-prerequisite.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.course.findMany({ orderBy: { code: 'asc' } });
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        prerequisitesOf: { include: { prerequisiteCourse: true } },
      },
    });
    if (!course) {
      throw new NotFoundException(`Course ${id} not found`);
    }
    return course;
  }

  async create(dto: CreateCourseDto) {
    const existing = await this.prisma.course.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Course code "${dto.code}" is already in use`,
      );
    }
    return this.prisma.course.create({ data: dto });
  }

  /**
   * See docs/00-requirements-audit.md §8 rule 2 — prerequisites are enforced at
   * registration time, not just documented. This only guards direct self-reference and
   * direct duplicates; full-cycle detection (A requires B requires A through a longer
   * chain) is not implemented yet — flagged rather than silently assumed safe.
   */
  async addPrerequisite(courseId: string, dto: AddPrerequisiteDto) {
    if (courseId === dto.prerequisiteCourseId) {
      throw new BadRequestException('A course cannot be its own prerequisite');
    }
    const [course, prerequisite] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: courseId } }),
      this.prisma.course.findUnique({
        where: { id: dto.prerequisiteCourseId },
      }),
    ]);
    if (!course) throw new NotFoundException(`Course ${courseId} not found`);
    if (!prerequisite)
      throw new NotFoundException(
        `Course ${dto.prerequisiteCourseId} not found`,
      );

    const existing = await this.prisma.coursePrerequisite.findUnique({
      where: {
        courseId_prerequisiteCourseId: {
          courseId,
          prerequisiteCourseId: dto.prerequisiteCourseId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('This prerequisite is already recorded');
    }

    return this.prisma.coursePrerequisite.create({
      data: { courseId, prerequisiteCourseId: dto.prerequisiteCourseId },
    });
  }

  getPrerequisiteCourseIds(
    courseId: string,
  ): Promise<{ prerequisiteCourseId: string }[]> {
    return this.prisma.coursePrerequisite.findMany({
      where: { courseId },
      select: { prerequisiteCourseId: true },
    });
  }
}
