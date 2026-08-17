import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApplicationStatus, RoleName } from '@prisma/client';
import { ApplicationsService } from './applications.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const STAFF_ROLES = [
  RoleName.ADMISSIONS_OFFICER,
  RoleName.REGISTRAR,
  RoleName.SUPER_ADMIN,
];

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  /** Public — the applicant does not have an account yet. */
  @Public()
  @Post()
  submit(@Body() dto: SubmitApplicationDto) {
    return this.service.submit(dto);
  }

  @Roles(...STAFF_ROLES)
  @Get()
  findAll(@Query('status') status?: string) {
    if (
      status &&
      !Object.values(ApplicationStatus).includes(status as ApplicationStatus)
    ) {
      throw new BadRequestException(`Invalid status "${status}"`);
    }
    return this.service.findAll(status as ApplicationStatus | undefined);
  }

  @Roles(...STAFF_ROLES)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Roles(...STAFF_ROLES)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatus(id, dto, user.id);
  }

  @Roles(...STAFF_ROLES)
  @Post(':id/accept')
  accept(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.accept(id, user.id);
  }
}
