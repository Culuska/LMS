import { randomBytes } from 'crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { hashPassword } from '../auth/password.util';
import { CreateLecturerDto } from './dto/create-lecturer.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

function generateTemporaryPassword(): string {
  return randomBytes(9).toString('base64url'); // 12 chars, URL-safe
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Creates a User + role-specific record (Lecturer/Student) with a random temporary
   * password, and "emails" it (see EmailService — no real provider configured yet, so
   * this currently just logs). The temporary password is ALSO still returned once in the
   * API response, since a console-log stub isn't a real delivery channel an admin can
   * rely on — this whole path stays a V1 stopgap until a real provider is wired up
   * (docs/00-requirements-audit.md §20). mustChangePassword is forced true so it can't be
   * used past first login without being replaced.
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

    await this.emailService.send({
      to: dto.email,
      subject: 'Your university account has been created',
      body: `Welcome, ${dto.firstName}. Your temporary password is: ${temporaryPassword}\nYou will be required to change it on first login.`,
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

    await this.emailService.send({
      to: dto.email,
      subject: 'Your university account has been created',
      body: `Welcome, ${dto.firstName}. Your temporary password is: ${temporaryPassword}\nYou will be required to change it on first login.`,
    });

    return { student, temporaryPassword };
  }

  /**
   * Grants an additional role to an existing user — e.g. turning a Lecturer account into
   * one that also holds EXAM_OFFICER, or a Student-record account (rare, but used for
   * non-teaching staff who don't fit Lecturer/Student) into a Registrar. Previously this
   * had no API at all; every smoke test needing a second privileged account had to grant
   * roles via direct SQL, which is flagged in each of those scripts. This closes that gap.
   */
  async assignRole(userId: string, dto: AssignRoleDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    if (dto.facultyId) {
      const faculty = await this.prisma.faculty.findUnique({
        where: { id: dto.facultyId },
      });
      if (!faculty)
        throw new NotFoundException(`Faculty ${dto.facultyId} not found`);
    }
    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!department)
        throw new NotFoundException(`Department ${dto.departmentId} not found`);
    }

    // Not an upsert: Postgres/Prisma compound unique constraints don't reliably match
    // rows containing NULL columns (facultyId/departmentId are usually null) — same
    // reasoning as prisma/seed.ts.
    const existing = await this.prisma.userRole.findFirst({
      where: {
        userId,
        role: dto.role,
        facultyId: dto.facultyId ?? null,
        departmentId: dto.departmentId ?? null,
      },
    });
    if (existing) {
      throw new ConflictException(
        'This user already holds this exact role assignment',
      );
    }

    return this.prisma.userRole.create({
      data: {
        userId,
        role: dto.role,
        facultyId: dto.facultyId,
        departmentId: dto.departmentId,
      },
    });
  }

  listRoles(userId: string) {
    return this.prisma.userRole.findMany({ where: { userId } });
  }

  async removeRole(userId: string, userRoleId: string) {
    const userRole = await this.prisma.userRole.findUnique({
      where: { id: userRoleId },
    });
    if (!userRole || userRole.userId !== userId) {
      throw new NotFoundException(
        `Role assignment ${userRoleId} not found for this user`,
      );
    }
    await this.prisma.userRole.delete({ where: { id: userRoleId } });
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
