import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { OfferingAccessService } from '../common/offering-access.service';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, OfferingAccessService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
