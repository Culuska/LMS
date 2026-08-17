import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSemesterDto } from './dto/create-semester.dto';

@Injectable()
export class SemestersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(academicYearId?: string) {
    return this.prisma.semester.findMany({
      where: academicYearId ? { academicYearId } : undefined,
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const semester = await this.prisma.semester.findUnique({ where: { id } });
    if (!semester) {
      throw new NotFoundException(`Semester ${id} not found`);
    }
    return semester;
  }

  async create(dto: CreateSemesterDto) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id: dto.academicYearId },
    });
    if (!year) {
      throw new NotFoundException(
        `Academic year ${dto.academicYearId} not found`,
      );
    }

    const dates = {
      start: new Date(dto.startDate),
      end: new Date(dto.endDate),
      regOpen: new Date(dto.registrationOpensAt),
      regClose: new Date(dto.registrationClosesAt),
      withdrawal: new Date(dto.withdrawalDeadline),
    };

    // Sanity-check the semester's own internal date ordering before it's ever used to
    // gate registration/withdrawal — a misconfigured semester is worse than none at all.
    if (dates.end <= dates.start) {
      throw new ConflictException('endDate must be after startDate');
    }
    if (dates.regClose <= dates.regOpen) {
      throw new ConflictException(
        'registrationClosesAt must be after registrationOpensAt',
      );
    }
    if (dates.withdrawal <= dates.start || dates.withdrawal >= dates.end) {
      throw new ConflictException(
        'withdrawalDeadline must fall between startDate and endDate',
      );
    }

    const existing = await this.prisma.semester.findUnique({
      where: {
        academicYearId_term: {
          academicYearId: dto.academicYearId,
          term: dto.term,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `A ${dto.term} semester already exists for this academic year`,
      );
    }

    return this.prisma.semester.create({
      data: {
        academicYearId: dto.academicYearId,
        term: dto.term,
        startDate: dates.start,
        endDate: dates.end,
        registrationOpensAt: dates.regOpen,
        registrationClosesAt: dates.regClose,
        withdrawalDeadline: dates.withdrawal,
      },
    });
  }
}
