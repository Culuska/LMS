import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OfferingAccessService } from '../common/offering-access.service';
import { CreateCourseContentDto } from './dto/create-course-content.dto';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/**
 * Text/markdown course materials (syllabus, topics, lesson notes). File attachments
 * (Resource — PDFs, slides, etc.) are NOT implemented: that needs an object-storage
 * decision (docs/00-requirements-audit.md §14) that hasn't been made. This covers the
 * content-structure half of "course materials," not file upload.
 *
 * Read access is open to any authenticated user (consistent with the rest of this
 * codebase's current simplification — see backend/README.md); full view-scoping to only
 * registered students + staff isn't implemented for this or most other read endpoints.
 */
@Injectable()
export class CourseContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offeringAccess: OfferingAccessService,
  ) {}

  findAllForOffering(offeringId: string) {
    return this.prisma.courseContent.findMany({
      where: { courseOfferingId: offeringId },
      orderBy: [{ parentId: 'asc' }, { orderIndex: 'asc' }],
    });
  }

  async create(
    offeringId: string,
    dto: CreateCourseContentDto,
    user: AuthenticatedUser,
  ) {
    await this.offeringAccess.assertCanManageOffering(offeringId, user);

    if (dto.parentId) {
      const parent = await this.prisma.courseContent.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.courseOfferingId !== offeringId) {
        throw new BadRequestException(
          'parentId must reference existing content within the same course offering',
        );
      }
    }

    return this.prisma.courseContent.create({
      data: {
        courseOfferingId: offeringId,
        title: dto.title,
        body: dto.body,
        parentId: dto.parentId,
        orderIndex: dto.orderIndex ?? 0,
      },
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    const content = await this.prisma.courseContent.findUnique({
      where: { id },
    });
    if (!content) {
      throw new NotFoundException(`Course content ${id} not found`);
    }
    await this.offeringAccess.assertCanManageOffering(
      content.courseOfferingId,
      user,
    );

    const childCount = await this.prisma.courseContent.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new BadRequestException(
        'Cannot delete content that has nested items — delete or move those first',
      );
    }
    await this.prisma.courseContent.delete({ where: { id } });
  }
}
