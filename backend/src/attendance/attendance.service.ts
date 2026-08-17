import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OfferingAccessService } from '../common/offering-access.service';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { computeAttendancePercentage } from '../grading';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offeringAccess: OfferingAccessService,
  ) {}

  async createSession(
    offeringId: string,
    dto: CreateAttendanceSessionDto,
    user: AuthenticatedUser,
  ) {
    await this.offeringAccess.assertCanManageOffering(offeringId, user);
    return this.prisma.attendanceSession.create({
      data: {
        courseOfferingId: offeringId,
        sessionDate: new Date(dto.sessionDate),
      },
    });
  }

  async recordAttendance(
    sessionId: string,
    dto: RecordAttendanceDto,
    user: AuthenticatedUser,
  ) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Attendance session ${sessionId} not found`);
    }
    await this.offeringAccess.assertCanManageOffering(
      session.courseOfferingId,
      user,
    );

    // Only registered students can be marked — catches a typo'd studentId early rather
    // than silently recording attendance for someone not even taking the course.
    const registeredStudentIds = new Set(
      (
        await this.prisma.courseRegistration.findMany({
          where: {
            courseOfferingId: session.courseOfferingId,
            status: 'REGISTERED',
          },
          select: { studentId: true },
        })
      ).map((r) => r.studentId),
    );
    const unregistered = dto.records.filter(
      (r) => !registeredStudentIds.has(r.studentId),
    );
    if (unregistered.length > 0) {
      throw new BadRequestException(
        `Not registered for this offering: ${unregistered.map((r) => r.studentId).join(', ')}`,
      );
    }

    return this.prisma.$transaction(
      dto.records.map((r) =>
        this.prisma.attendanceRecord.upsert({
          where: {
            attendanceSessionId_studentId: {
              attendanceSessionId: sessionId,
              studentId: r.studentId,
            },
          },
          update: { status: r.status },
          create: {
            attendanceSessionId: sessionId,
            studentId: r.studentId,
            status: r.status,
          },
        }),
      ),
    );
  }

  /** docs/04-grading-and-academic-policy.md §11 — excused absences excluded from the
   * denominator. Used both for the GET endpoint below and internally by the grading
   * pipeline's exam-eligibility check. */
  async getAttendancePercentage(
    studentId: string,
    courseOfferingId: string,
  ): Promise<number> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { studentId, attendanceSession: { courseOfferingId } },
      select: { status: true },
    });
    const tally = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records) {
      if (r.status === 'PRESENT') tally.present++;
      else if (r.status === 'ABSENT') tally.absent++;
      else if (r.status === 'LATE') tally.late++;
      else if (r.status === 'EXCUSED') tally.excused++;
    }
    return computeAttendancePercentage(tally);
  }

  async findSessionsForOffering(courseOfferingId: string) {
    return this.prisma.attendanceSession.findMany({
      where: { courseOfferingId },
      include: { records: true },
      orderBy: { sessionDate: 'desc' },
    });
  }
}
