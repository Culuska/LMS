import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';

@Injectable()
export class FacultiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.faculty.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const faculty = await this.prisma.faculty.findUnique({
      where: { id },
      include: { departments: true },
    });
    if (!faculty) {
      throw new NotFoundException(`Faculty ${id} not found`);
    }
    return faculty;
  }

  async create(dto: CreateFacultyDto) {
    const existing = await this.prisma.faculty.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Faculty code "${dto.code}" is already in use`,
      );
    }
    return this.prisma.faculty.create({ data: dto });
  }
}
