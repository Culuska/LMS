import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

/**
 * Shared "can this caller manage this CourseOffering's content?" check, used by
 * attendance, assessment items, and marks. A LECTURER may only act on offerings they
 * are actually assigned to teach (docs/00-requirements-audit.md §8 rule 4 — enforced
 * server-side, never just hidden in the UI); SUPER_ADMIN/REGISTRAR can act on any
 * offering for administrative/correction purposes.
 */
@Injectable()
export class OfferingAccessService {
  constructor(private readonly prisma: PrismaService) {}

  private static readonly ADMIN_OVERRIDE_ROLES: RoleName[] = [
    RoleName.SUPER_ADMIN,
    RoleName.REGISTRAR,
  ];

  async assertCanManageOffering(offeringId: string, user: AuthenticatedUser) {
    const offering = await this.prisma.courseOffering.findUnique({
      where: { id: offeringId },
    });
    if (!offering) {
      throw new NotFoundException(`Course offering ${offeringId} not found`);
    }

    if (
      user.roles.some((r: RoleName) =>
        OfferingAccessService.ADMIN_OVERRIDE_ROLES.includes(r),
      )
    ) {
      return offering;
    }

    const lecturer = await this.prisma.lecturer.findUnique({
      where: { userId: user.id },
    });
    if (!lecturer || lecturer.id !== offering.lecturerId) {
      throw new ForbiddenException(
        'You are not the lecturer assigned to this course offering',
      );
    }
    return offering;
  }
}
