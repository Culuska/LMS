import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

// Global for the same reason as PrismaModule — any module might need to record a
// sensitive action, and there should be exactly one audit-writing path, not one per module.
@Global()
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditModule {}
