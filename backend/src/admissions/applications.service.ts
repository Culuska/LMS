import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { hashPassword } from '../auth/password.util';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

const MINOR_AGE_THRESHOLD = 18;

function isMinor(dateOfBirth: Date, asOf: Date = new Date()): boolean {
  let age = asOf.getFullYear() - dateOfBirth.getFullYear();
  const hasHadBirthdayThisYear =
    asOf.getMonth() > dateOfBirth.getMonth() ||
    (asOf.getMonth() === dateOfBirth.getMonth() &&
      asOf.getDate() >= dateOfBirth.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age < MINOR_AGE_THRESHOLD;
}

function generateTemporaryPassword(): string {
  return randomBytes(9).toString('base64url');
}

/**
 * docs/00-requirements-audit.md item A1 — the applicant/admissions pipeline, confirmed in
 * scope per docs/04-grading-and-academic-policy.md §14. Application -> (review) -> Offer
 * -> Accept -> Student, per the workflow in docs/00 §6.
 */
@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /** Public — an applicant isn't a User yet, so there's nothing to authenticate. */
  async submit(dto: SubmitApplicationDto) {
    const program = await this.prisma.program.findUnique({
      where: { id: dto.programId },
    });
    if (!program) {
      throw new NotFoundException(`Program ${dto.programId} not found`);
    }

    const dateOfBirth = new Date(dto.dateOfBirth);
    const applicantIsMinor = isMinor(dateOfBirth);
    if (applicantIsMinor && (!dto.guardianName || !dto.guardianEmail)) {
      throw new BadRequestException(
        'This applicant is under 18 — guardianName and guardianEmail are required (Somalia DPA Act guardian-consent requirement)',
      );
    }

    const application = await this.prisma.application.create({
      data: {
        programId: dto.programId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email.toLowerCase(),
        dateOfBirth,
      },
    });

    if (applicantIsMinor) {
      await this.prisma.consentRecord.create({
        data: {
          applicationId: application.id,
          type: 'GUARDIAN_CONSENT',
          consentedBySelf: false,
          guardianName: dto.guardianName,
          guardianEmail: dto.guardianEmail,
        },
      });
    }

    return application;
  }

  findAll(status?: ApplicationStatus) {
    return this.prisma.application.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { program: true },
    });
    if (!application) {
      throw new NotFoundException(`Application ${id} not found`);
    }
    return application;
  }

  /**
   * docs/00-requirements-audit.md §8 rule 13 — an underage application cannot progress
   * past intake without a guardian ConsentRecord on file, enforced at the workflow level.
   */
  async updateStatus(
    id: string,
    dto: UpdateApplicationStatusDto,
    reviewerId: string,
  ) {
    const application = await this.findOne(id);
    if (application.status === 'ACCEPTED') {
      throw new BadRequestException(
        'This application has already been accepted and converted to a student',
      );
    }

    if (isMinor(application.dateOfBirth)) {
      const consent = await this.prisma.consentRecord.findFirst({
        where: { applicationId: id, type: 'GUARDIAN_CONSENT' },
      });
      if (!consent) {
        throw new BadRequestException(
          'This applicant is a minor with no guardian consent on file — cannot progress this application',
        );
      }
    }

    return this.prisma.application.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedById: reviewerId,
        decisionAt: new Date(),
      },
    });
  }

  /**
   * Converts an OFFERED, accepted applicant into a real User + Student account —
   * mirrors UsersService.createStudent's temporary-password stopgap (docs/00 §20, no
   * email provider configured). Does NOT create an Enrollment — the Registrar picks the
   * specific CurriculumVersion via the existing /enrollments endpoint afterward, since
   * that decision (which curriculum year applies) isn't something admissions should guess.
   */
  async accept(id: string, reviewerId: string) {
    const application = await this.findOne(id);
    if (application.status !== 'OFFERED') {
      throw new BadRequestException(
        `Cannot accept an application that is ${application.status.toLowerCase()}, not OFFERED`,
      );
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: application.email },
    });
    if (existingEmail) {
      throw new ConflictException(
        `Email "${application.email}" is already registered to an existing account`,
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    const studentNumber = `APP-${application.id.slice(0, 8).toUpperCase()}`;

    const student = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: application.email,
          passwordHash,
          firstName: application.firstName,
          lastName: application.lastName,
          mustChangePassword: true,
        },
      });
      await tx.userRole.create({
        data: { userId: user.id, role: RoleName.STUDENT },
      });
      const newStudent = await tx.student.create({
        data: {
          userId: user.id,
          studentNumber,
          dateOfBirth: application.dateOfBirth,
        },
      });
      await tx.application.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          studentId: newStudent.id,
          reviewedById: reviewerId,
          decisionAt: new Date(),
        },
      });
      return newStudent;
    });

    await this.emailService.send({
      to: application.email,
      subject: 'Your application has been accepted',
      body: `Welcome, ${application.firstName}. Your student account has been created (student number: ${studentNumber}). Temporary password: ${temporaryPassword}\nYou will be required to change it on first login. A Registrar will complete your program enrollment next.`,
    });

    return { student, temporaryPassword, studentNumber };
  }
}
