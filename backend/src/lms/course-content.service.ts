import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ResourceOwnerType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OfferingAccessService } from '../common/offering-access.service';
import { StorageService } from '../storage/storage.service';
import { CreateCourseContentDto } from './dto/create-course-content.dto';
import { AttachResourceDto } from './dto/attach-resource.dto';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/**
 * Course materials: text/markdown notes, an optional video link, and uploaded file
 * attachments (PDFs, slides, docs — see StorageService for the R2-backed upload flow).
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
    private readonly storage: StorageService,
  ) {}

  findAllForOffering(offeringId: string) {
    return this.prisma.courseContent.findMany({
      where: { courseOfferingId: offeringId },
      orderBy: [{ parentId: 'asc' }, { orderIndex: 'asc' }],
      include: { resources: true },
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
        videoUrl: dto.videoUrl,
        parentId: dto.parentId,
        orderIndex: dto.orderIndex ?? 0,
      },
    });
  }

  /** Registers the attachment's metadata and hands back a short-lived presigned URL —
   * the caller (browser) uploads the file bytes directly to R2 using that URL, so this
   * request never touches the file itself. */
  async attachResource(
    contentId: string,
    dto: AttachResourceDto,
    user: AuthenticatedUser,
  ) {
    const content = await this.prisma.courseContent.findUnique({
      where: { id: contentId },
    });
    if (!content) {
      throw new NotFoundException(`Course content ${contentId} not found`);
    }
    await this.offeringAccess.assertCanManageOffering(
      content.courseOfferingId,
      user,
    );

    const storageKey = this.storage.buildStorageKey(dto.fileName);
    const resource = await this.prisma.resource.create({
      data: {
        ownerType: ResourceOwnerType.COURSE_CONTENT,
        courseContentId: contentId,
        fileName: dto.fileName,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
        storageKey,
        uploadedById: user.id,
      },
    });
    const uploadUrl = await this.storage.createUploadUrl(
      storageKey,
      dto.contentType,
    );
    return { resource, uploadUrl };
  }

  async removeResource(resourceId: string, user: AuthenticatedUser) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    });
    if (!resource || !resource.courseContentId) {
      throw new NotFoundException(`Resource ${resourceId} not found`);
    }
    const content = await this.prisma.courseContent.findUniqueOrThrow({
      where: { id: resource.courseContentId },
    });
    await this.offeringAccess.assertCanManageOffering(
      content.courseOfferingId,
      user,
    );
    await this.prisma.resource.delete({ where: { id: resourceId } });
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
