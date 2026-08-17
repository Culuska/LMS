import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OfferingAccessService } from '../common/offering-access.service';
import { CreateAssessmentItemDto } from './dto/create-assessment-item.dto';
import { bucketForAssessmentType } from './assessment.constants';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class AssessmentItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offeringAccess: OfferingAccessService,
  ) {}

  async create(
    offeringId: string,
    dto: CreateAssessmentItemDto,
    user: AuthenticatedUser,
  ) {
    const offering = await this.offeringAccess.assertCanManageOffering(
      offeringId,
      user,
    );
    if (offering.gradingLocked) {
      throw new BadRequestException(
        'Grading is locked for this course offering',
      );
    }

    const bucket = bucketForAssessmentType(dto.type);
    const bucketWeightLimit =
      bucket === 'CONTINUOUS_ASSESSMENT'
        ? Number(offering.caWeight)
        : bucket === 'MIDTERM'
          ? Number(offering.midtermWeight)
          : Number(offering.finalWeight);

    const existingItems = await this.prisma.assessmentItem.findMany({
      where: { courseOfferingId: offeringId },
      select: { type: true, weight: true },
    });
    const existingBucketTotal = existingItems
      .filter((i) => bucketForAssessmentType(i.type) === bucket)
      .reduce((sum, i) => sum + Number(i.weight), 0);

    if (existingBucketTotal + dto.weight > bucketWeightLimit + 0.01) {
      throw new BadRequestException(
        `This item's weight (${dto.weight}%) would push the ${bucket} bucket to ${(existingBucketTotal + dto.weight).toFixed(2)}%, exceeding this course's configured ${bucketWeightLimit}% for that component`,
      );
    }

    return this.prisma.assessmentItem.create({
      data: {
        courseOfferingId: offeringId,
        type: dto.type,
        title: dto.title,
        weight: dto.weight,
        maxMarks: dto.maxMarks,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });
  }

  findAllForOffering(offeringId: string) {
    return this.prisma.assessmentItem.findMany({
      where: { courseOfferingId: offeringId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.assessmentItem.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Assessment item ${id} not found`);
    }
    return item;
  }
}
