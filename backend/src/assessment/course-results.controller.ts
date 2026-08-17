import { Controller, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CourseResultsService } from './course-results.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('course-results')
export class CourseResultsController {
  constructor(private readonly service: CourseResultsService) {}

  // The lecturer (or admin) computes/recomputes a DRAFT result directly from Marks.
  @Roles(RoleName.LECTURER, RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Post('compute/:registrationId')
  compute(
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.compute(registrationId, user);
  }

  @Roles(RoleName.LECTURER, RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Patch(':id/submit')
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.submit(id, user);
  }

  // Result approval — see docs/00-requirements-audit.md §5 RBAC table. Deliberately
  // excludes LECTURER: entering/submitting a mark and certifying it final must be
  // different people (dangerous permission conflict #1).
  @Roles(
    RoleName.EXAM_OFFICER,
    RoleName.REGISTRAR,
    RoleName.HEAD_OF_DEPARTMENT,
    RoleName.DEAN,
    RoleName.SUPER_ADMIN,
  )
  @Patch(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.approve(id, user);
  }

  // Publication is narrower still — only the Exam Officer (or Super Admin override)
  // per docs/00 §5: "Result publication ... P: Exam Officer" only.
  @Roles(RoleName.EXAM_OFFICER, RoleName.SUPER_ADMIN)
  @Patch(':id/publish')
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.publish(id, user);
  }
}
