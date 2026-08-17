import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller()
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Get('announcements')
  findUniversityWide() {
    return this.service.findUniversityWide();
  }

  @Get('course-offerings/:offeringId/announcements')
  findForOffering(@Param('offeringId', ParseUUIDPipe) offeringId: string) {
    return this.service.findForOffering(offeringId);
  }

  @Roles(RoleName.LECTURER, RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Post('announcements')
  create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }
}
