import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * In-app notifications only (docs/00-requirements-audit.md §12 lists email/SMS/push as
 * V2+ — see docs/00 §12 "Notifications" and the email stopgap already in src/email/).
 * Every call site that "notifies" a user right now means this: a row the user sees when
 * they check /notifications, not a push alert. Intentional scope, not an oversight.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  createForUser(userId: string, title: string, body: string) {
    return this.prisma.notification.create({ data: { userId, title, body } });
  }

  createForUsers(userIds: string[], title: string, body: string) {
    if (userIds.length === 0) {
      return Promise.resolve({ count: 0 });
    }
    return this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ userId, title, body })),
    });
  }

  listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('This notification does not belong to you');
    }
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }
}
