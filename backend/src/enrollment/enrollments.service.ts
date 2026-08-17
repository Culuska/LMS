import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEnrollmentDto) {
    const [student, curriculumVersion] = await Promise.all([
      this.prisma.student.findUnique({ where: { id: dto.studentId } }),
      this.prisma.curriculumVersion.findUnique({
        where: { id: dto.curriculumVersionId },
      }),
    ]);
    if (!student)
      throw new NotFoundException(`Student ${dto.studentId} not found`);
    if (!curriculumVersion)
      throw new NotFoundException(
        `Curriculum version ${dto.curriculumVersionId} not found`,
      );
    if (curriculumVersion.programId !== dto.programId) {
      throw new ConflictException(
        'That curriculum version does not belong to the given program',
      );
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: {
        studentId_programId: {
          studentId: dto.studentId,
          programId: dto.programId,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        'This student is already enrolled in this program',
      );
    }

    return this.prisma.enrollment.create({ data: dto });
  }

  findForStudent(studentId: string) {
    return this.prisma.enrollment.findMany({
      where: { studentId },
      include: { program: true, curriculumVersion: true },
    });
  }
}
