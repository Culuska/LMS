import { randomBytes } from 'crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../auth/password.util';
import { CreateLecturerDto } from './dto/create-lecturer.dto';
import { CreateStudentDto } from './dto/create-student.dto';

function generateTemporaryPassword(): string {
  return randomBytes(9).toString('base64url'); // 12 chars, URL-safe
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a User + role-specific record (Lecturer/Student) with a random temporary
   * password. Email delivery of that password isn't wired up yet (no email provider
   * chosen — see docs/00-requirements-audit.md §20), so it's returned once in the API
   * response for an administrator to hand over manually. THIS IS A V1 STOPGAP, not the
   * final flow — flagged here rather than silently treated as done. mustChangePassword
   * is forced true so it can't be used past first login without being replaced.
   */
  async createLecturer(dto: CreateLecturerDto) {
    await this.assertEmailAvailable(dto.email);
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new NotFoundException(`Department ${dto.departmentId} not found`);
    }
    const existingStaffNumber = await this.prisma.lecturer.findUnique({
      where: { staffNumber: dto.staffNumber },
    });
    if (existingStaffNumber) {
      throw new ConflictException(
        `Staff number "${dto.staffNumber}" is already in use`,
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const lecturer = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          mustChangePassword: true,
        },
      });
      await tx.userRole.create({
        data: { userId: user.id, role: RoleName.LECTURER },
      });
      return tx.lecturer.create({
        data: {
          userId: user.id,
          departmentId: dto.departmentId,
          staffNumber: dto.staffNumber,
        },
        include: { user: true },
      });
    });

    return { lecturer, temporaryPassword };
  }

  async createStudent(dto: CreateStudentDto) {
    await this.assertEmailAvailable(dto.email);
    const existingStudentNumber = await this.prisma.student.findUnique({
      where: { studentNumber: dto.studentNumber },
    });
    if (existingStudentNumber) {
      throw new ConflictException(
        `Student number "${dto.studentNumber}" is already in use`,
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const student = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          mustChangePassword: true,
        },
      });
      await tx.userRole.create({
        data: { userId: user.id, role: RoleName.STUDENT },
      });
      return tx.student.create({
        data: {
          userId: user.id,
          studentNumber: dto.studentNumber,
          dateOfBirth: new Date(dto.dateOfBirth),
        },
        include: { user: true },
      });
    });

    return { student, temporaryPassword };
  }

  private async assertEmailAvailable(email: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException(`Email "${email}" is already registered`);
    }
  }
}
