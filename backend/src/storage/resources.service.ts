import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ResourceOwnerType, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const STAFF_OVERRIDE_ROLES: RoleName[] = [
  RoleName.SUPER_ADMIN,
  RoleName.REGISTRAR,
];

/**
 * A single download endpoint for every kind of Resource (course-content attachment,
 * assignment-submission attachment), rather than one per owner type — the authorization
 * rule is the only thing that differs, and this is where that split lives.
 */
@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getDownloadUrl(resourceId: string, user: AuthenticatedUser) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    });
    if (!resource) {
      throw new NotFoundException(`Resource ${resourceId} not found`);
    }

    switch (resource.ownerType) {
      case ResourceOwnerType.COURSE_CONTENT:
        // Matches CourseContentService.findAllForOffering's existing open-read policy —
        // any authenticated user can view course materials.
        break;
      case ResourceOwnerType.SUBMISSION:
        await this.assertCanReadSubmissionResource(
          resource.submissionId!,
          user,
        );
        break;
      default:
        // APPLICATION resources aren't served through this endpoint — the admissions
        // flow doesn't have a review UI for them yet.
        throw new ForbiddenException(
          'This resource type cannot be downloaded here',
        );
    }

    const url = await this.storage.createDownloadUrl(
      resource.storageKey,
      resource.fileName,
    );
    return { url, fileName: resource.fileName };
  }

  private async assertCanReadSubmissionResource(
    submissionId: string,
    user: AuthenticatedUser,
  ) {
    if (user.roles.some((r: RoleName) => STAFF_OVERRIDE_ROLES.includes(r))) {
      return;
    }

    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assessmentItem: { include: { courseOffering: true } } },
    });
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    const student = await this.prisma.student.findUnique({
      where: { userId: user.id },
    });
    if (student && student.id === submission.studentId) {
      return;
    }

    const lecturer = await this.prisma.lecturer.findUnique({
      where: { userId: user.id },
    });
    if (
      lecturer &&
      lecturer.id === submission.assessmentItem.courseOffering.lecturerId
    ) {
      return;
    }

    throw new ForbiddenException('You do not have access to this submission');
  }
}
