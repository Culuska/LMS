import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';

@Injectable()
export class AcademicYearsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
      include: { semesters: true },
    });
  }

  async findOne(id: string) {
    const year = await this.prisma.academicYear.findUnique({
      where: { id },
      include: { semesters: true },
    });
    if (!year) {
      throw new NotFoundException(`Academic year ${id} not found`);
    }
    return year;
  }

  async create(dto: CreateAcademicYearDto) {
    const existing = await this.prisma.academicYear.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Academic year "${dto.name}" already exists`);
    }
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new ConflictException('endDate must be after startDate');
    }
    return this.prisma.academicYear.create({
      data: { name: dto.name, startDate, endDate },
    });
  }
}
