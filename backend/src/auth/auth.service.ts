import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RoleName } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { comparePassword, hashPassword } from './password.util';
import { generateResetToken, hashResetToken } from './token.util';
import type { RegisterDto } from './dto/register.dto';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

export interface LoginResult {
  accessToken: string;
  user: AuthenticatedUser;
}

const RESET_TOKEN_VALID_HOURS = 1;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  /** Public self-registration for students, distinct from UsersService.createStudent
   * (the staff-initiated flow, which generates and emails a temporary password). Here
   * the student sets their own password and is logged straight in — nothing to change
   * on first login, matching how signing up for any ordinary web app works. */
  async register(dto: RegisterDto): Promise<LoginResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const studentNumber =
      dto.studentNumber?.trim() ||
      `STU-${randomUUID().slice(0, 8).toUpperCase()}`;
    const existingStudentNumber = dto.studentNumber
      ? await this.prisma.student.findUnique({ where: { studentNumber } })
      : null;
    if (existingStudentNumber) {
      throw new ConflictException(
        `Student number "${studentNumber}" is already in use`,
      );
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          mustChangePassword: false,
        },
      });
      await tx.userRole.create({
        data: { userId: created.id, role: RoleName.STUDENT },
      });
      await tx.student.create({
        data: { userId: created.id, studentNumber, dateOfBirth: null },
      });
      return created;
    });

    return this.login(user.email, dto.password);
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        roles: true,
        studentRecord: { select: { id: true } },
        lecturerRecord: { select: { id: true } },
      },
    });

    // Deliberately identical error for "no such user" and "wrong password" — do not
    // let a login attempt reveal whether an email address is registered.
    const invalidCredentials = () =>
      new UnauthorizedException('Invalid email or password');

    if (!user || !user.isActive) {
      throw invalidCredentials();
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);
    if (!passwordMatches) {
      throw invalidCredentials();
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map((r) => r.role),
      mustChangePassword: user.mustChangePassword,
      studentId: user.studentRecord?.id,
      lecturerId: user.lecturerRecord?.id,
    };

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return { accessToken, user: authenticatedUser };
  }

  /**
   * Always responds the same way whether or not the email is registered — the *response*
   * doesn't leak account existence, even though the actual token is only created and
   * "emailed" (see EmailService — no real provider configured yet) when the account exists.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.isActive) {
      return;
    }

    const { rawToken, tokenHash } = generateResetToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(
          Date.now() + RESET_TOKEN_VALID_HOURS * 60 * 60 * 1000,
        ),
      },
    });

    await this.emailService.send({
      to: user.email,
      subject: 'Password reset request',
      body:
        `A password reset was requested for this account. This token expires in ${RESET_TOKEN_VALID_HOURS} hour(s):\n\n` +
        `${rawToken}\n\n` +
        'In the real frontend this would be a link like https://<app>/reset-password?token=<token>. ' +
        'If you did not request this, no action is needed.',
    });
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashResetToken(rawToken);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    const invalidToken = () =>
      new BadRequestException('This reset link is invalid or has expired');
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw invalidToken();
    }

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, mustChangePassword: false },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const matches = await comparePassword(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
  }
}
