import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OfferingAccessService } from '../common/offering-access.service';
import { EnterMarkDto } from './dto/enter-mark.dto';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class MarksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offeringAccess: OfferingAccessService,
  ) {}

  /** docs/00-requirements-audit.md §8 rule 4 — only the assigned lecturer (or admin) may
   * enter/edit marks, enforced here server-side via OfferingAccessService, not just hidden
   * in the UI. */
  async enterMark(
    assessmentItemId: string,
    dto: EnterMarkDto,
    user: AuthenticatedUser,
  ) {
    const item = await this.prisma.assessmentItem.findUnique({
      where: { id: assessmentItemId },
    });
    if (!item) {
      throw new NotFoundException(
        `Assessment item ${assessmentItemId} not found`,
      );
    }
    const offering = await this.offeringAccess.assertCanManageOffering(
      item.courseOfferingId,
      user,
    );
    if (offering.gradingLocked) {
      throw new BadRequestException(
        'Grading is locked for this course offering',
      );
    }
    const maxMarks = Number(item.maxMarks);
    if (dto.score > maxMarks) {
      throw new BadRequestException(
        `Score ${dto.score} exceeds this item's maximum of ${maxMarks}`,
      );
    }

    const registration = await this.prisma.courseRegistration.findFirst({
      where: {
        studentId: dto.studentId,
        courseOfferingId: item.courseOfferingId,
      },
      include: { courseResult: true },
    });
    if (!registration || registration.status !== 'REGISTERED') {
      throw new BadRequestException(
        'This student is not currently registered for this course offering',
      );
    }
    if (
      registration.courseResult &&
      registration.courseResult.status !== 'DRAFT'
    ) {
      throw new BadRequestException(
        `This student's result is already ${registration.courseResult.status.toLowerCase()} — ` +
          'editing marks past this point requires the grade-change workflow (not yet implemented).',
      );
    }

    return this.prisma.mark.upsert({
      where: {
        assessmentItemId_studentId: {
          assessmentItemId,
          studentId: dto.studentId,
        },
      },
      update: { score: dto.score, enteredById: user.id, enteredAt: new Date() },
      create: {
        assessmentItemId,
        studentId: dto.studentId,
        score: dto.score,
        enteredById: user.id,
      },
    });
  }

  findAllForItem(assessmentItemId: string) {
    return this.prisma.mark.findMany({ where: { assessmentItemId } });
  }
}
