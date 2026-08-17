import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { GradeChangeRequestsService } from './grade-change-requests.service';
import { CreateGradeChangeRequestDto } from './dto/create-grade-change-request.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller()
export class GradeChangeRequestsController {
  constructor(private readonly service: GradeChangeRequestsService) {}

  // docs/00-requirements-audit.md §5 RBAC table: "Grade change after publication" —
  // request only: Registrar, Dean/HoD, Lecturer.
  @Roles(
    RoleName.REGISTRAR,
    RoleName.DEAN,
    RoleName.HEAD_OF_DEPARTMENT,
    RoleName.LECTURER,
  )
  @Post('course-results/:id/grade-change-requests')
  create(
    @Param('id', ParseUUIDPipe) resultId: string,
    @Body() dto: CreateGradeChangeRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(resultId, dto, user);
  }

  // Approval: Exam Officer only — deliberately no SUPER_ADMIN override, per the same
  // RBAC row (the only "—" for Super Admin anywhere in that table).
  @Roles(RoleName.EXAM_OFFICER)
  @Patch('grade-change-requests/:id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.approve(id, user);
  }

  @Roles(RoleName.EXAM_OFFICER)
  @Patch('grade-change-requests/:id/deny')
  deny(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.deny(id, user);
  }
}
