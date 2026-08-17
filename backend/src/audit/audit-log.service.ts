import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Append-only sensitive-action log — see docs/00-requirements-audit.md §8/§12.
 * Deliberately a thin wrapper (not a generic "log anything" helper) so every call site
 * makes explicit what it's recording and why, rather than logging becoming an
 * afterthought bolted on generically.
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  record(params: {
    actorId: string | null;
    action: string;
    targetType: string;
    targetId: string;
    beforeData?: unknown;
    afterData?: unknown;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        beforeData:
          params.beforeData === undefined
            ? undefined
            : (params.beforeData as object),
        afterData:
          params.afterData === undefined
            ? undefined
            : (params.afterData as object),
      },
    });
  }
}
