import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OfferingAccessService } from '../common/offering-access.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const UNIVERSITY_WIDE_ROLES: RoleName[] = [
  RoleName.SUPER_ADMIN,
  RoleName.REGISTRAR,
];

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offeringAccess: OfferingAccessService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Omit courseOfferingId to list university-wide announcements only; the offering-scoped
   * list is fetched separately via the nested route below. */
  findUniversityWide() {
    return this.prisma.announcement.findMany({
      where: { courseOfferingId: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findForOffering(courseOfferingId: string) {
    return this.prisma.announcement.findMany({
      where: { courseOfferingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateAnnouncementDto, user: AuthenticatedUser) {
    if (dto.courseOfferingId) {
      const offering = await this.prisma.courseOffering.findUnique({
        where: { id: dto.courseOfferingId },
      });
      if (!offering) {
        throw new NotFoundException(
          `Course offering ${dto.courseOfferingId} not found`,
        );
      }
      await this.offeringAccess.assertCanManageOffering(
        dto.courseOfferingId,
        user,
      );
    } else if (!user.roles.some((r) => UNIVERSITY_WIDE_ROLES.includes(r))) {
      throw new ForbiddenException(
        'University-wide announcements require Registrar or Super Admin',
      );
    }

    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        body: dto.body,
        authorId: user.id,
        courseOfferingId: dto.courseOfferingId,
      },
    });

    // Course-scoped announcements notify registered students directly. University-wide
    // announcements deliberately do NOT fan out to every user in the system — that needs
    // a real subscription/targeting model this system doesn't have yet; they're visible
    // via the list endpoint instead. A scope decision, not an oversight — see backend/README.md.
    if (dto.courseOfferingId) {
      const registrations = await this.prisma.courseRegistration.findMany({
        where: { courseOfferingId: dto.courseOfferingId, status: 'REGISTERED' },
        include: { student: { select: { userId: true } } },
      });
      await this.notifications.createForUsers(
        registrations.map((r) => r.student.userId),
        `New announcement: ${dto.title}`,
        dto.body,
      );
    }

    return announcement;
  }
}
