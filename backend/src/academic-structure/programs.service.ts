import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgramDto } from './dto/create-program.dto';

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(departmentId?: string) {
    return this.prisma.program.findMany({
      where: departmentId ? { departmentId } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const program = await this.prisma.program.findUnique({
      where: { id },
      include: { curriculumVersions: true },
    });
    if (!program) {
      throw new NotFoundException(`Program ${id} not found`);
    }
    return program;
  }

  async create(dto: CreateProgramDto) {
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new NotFoundException(`Department ${dto.departmentId} not found`);
    }
    const existing = await this.prisma.program.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Program code "${dto.code}" is already in use`,
      );
    }
    return this.prisma.program.create({ data: dto });
  }
}
