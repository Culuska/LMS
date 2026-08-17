import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCurriculumVersionDto } from './dto/create-curriculum-version.dto';
import { AddCurriculumCourseDto } from './dto/add-curriculum-course.dto';

@Injectable()
export class CurriculumService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCurriculumVersionDto) {
    const program = await this.prisma.program.findUnique({
      where: { id: dto.programId },
    });
    if (!program) {
      throw new NotFoundException(`Program ${dto.programId} not found`);
    }
    const existing = await this.prisma.curriculumVersion.findUnique({
      where: {
        programId_versionLabel: {
          programId: dto.programId,
          versionLabel: dto.versionLabel,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'A curriculum version with this label already exists for this program',
      );
    }
    return this.prisma.curriculumVersion.create({
      data: {
        programId: dto.programId,
        versionLabel: dto.versionLabel,
        effectiveFrom: new Date(dto.effectiveFrom),
        totalCreditsRequired: dto.totalCreditsRequired,
        minCgpaToGraduate: dto.minCgpaToGraduate ?? 2.0,
      },
    });
  }

  async findOne(id: string) {
    const version = await this.prisma.curriculumVersion.findUnique({
      where: { id },
      include: { courses: { include: { course: true } } },
    });
    if (!version) {
      throw new NotFoundException(`Curriculum version ${id} not found`);
    }
    return version;
  }

  async addCourse(curriculumVersionId: string, dto: AddCurriculumCourseDto) {
    const [version, course] = await Promise.all([
      this.prisma.curriculumVersion.findUnique({
        where: { id: curriculumVersionId },
      }),
      this.prisma.course.findUnique({ where: { id: dto.courseId } }),
    ]);
    if (!version)
      throw new NotFoundException(
        `Curriculum version ${curriculumVersionId} not found`,
      );
    if (!course)
      throw new NotFoundException(`Course ${dto.courseId} not found`);

    const existing = await this.prisma.curriculumCourse.findUnique({
      where: {
        curriculumVersionId_courseId: {
          curriculumVersionId,
          courseId: dto.courseId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'This course is already part of this curriculum version',
      );
    }

    return this.prisma.curriculumCourse.create({
      data: {
        curriculumVersionId,
        courseId: dto.courseId,
        isCore: dto.isCore ?? true,
      },
    });
  }
}
