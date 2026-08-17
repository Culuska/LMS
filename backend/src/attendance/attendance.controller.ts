import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('course-offerings/:offeringId/attendance-sessions')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get()
  findAll(@Param('offeringId', ParseUUIDPipe) offeringId: string) {
    return this.service.findSessionsForOffering(offeringId);
  }

  @Roles(RoleName.LECTURER, RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Post()
  createSession(
    @Param('offeringId', ParseUUIDPipe) offeringId: string,
    @Body() dto: CreateAttendanceSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createSession(offeringId, dto, user);
  }

  @Roles(RoleName.LECTURER, RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Post(':sessionId/records')
  recordAttendance(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: RecordAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.recordAttendance(sessionId, dto, user);
  }

  @Get('percentage')
  getPercentage(
    @Param('offeringId', ParseUUIDPipe) offeringId: string,
    @Query('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.service
      .getAttendancePercentage(studentId, offeringId)
      .then((percentage) => ({ percentage }));
  }
}
