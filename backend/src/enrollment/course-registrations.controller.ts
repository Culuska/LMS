import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CourseRegistrationsService } from './course-registrations.service';
import { CreateCourseRegistrationDto } from './dto/create-course-registration.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('course-registrations')
export class CourseRegistrationsController {
  constructor(private readonly service: CourseRegistrationsService) {}

  @Roles(RoleName.STUDENT)
  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findMine(user.id);
  }

  // The roster for one offering — its own lecturer (or admin), used for the gradebook.
  @Roles(RoleName.LECTURER, RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Get('offering/:offeringId')
  findForOffering(
    @Param('offeringId', ParseUUIDPipe) offeringId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findForOffering(offeringId, user);
  }

  // Registrar/Advisor/Super Admin register on a student's behalf; STUDENT self-service
  // is also allowed — the service resolves and enforces the caller's own studentId when
  // the caller isn't staff, so a student can never register anyone but themself.
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.REGISTRAR,
    RoleName.ADVISOR,
    RoleName.STUDENT,
  )
  @Post()
  create(
    @Body() dto: CreateCourseRegistrationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }
}
