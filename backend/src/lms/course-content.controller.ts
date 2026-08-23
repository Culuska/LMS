import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CourseContentService } from './course-content.service';
import { CreateCourseContentDto } from './dto/create-course-content.dto';
import { AttachResourceDto } from './dto/attach-resource.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('course-offerings/:offeringId/content')
export class CourseContentController {
  constructor(private readonly service: CourseContentService) {}

  @Get()
  findAll(@Param('offeringId', ParseUUIDPipe) offeringId: string) {
    return this.service.findAllForOffering(offeringId);
  }

  @Roles(RoleName.LECTURER, RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Post()
  create(
    @Param('offeringId', ParseUUIDPipe) offeringId: string,
    @Body() dto: CreateCourseContentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(offeringId, dto, user);
  }

  // Step 1 of 2 for attaching a file: this registers the attachment and returns a
  // short-lived URL. The caller PUTs the raw file bytes to that URL directly — see
  // StorageService.
  @Roles(RoleName.LECTURER, RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Post(':contentId/resources')
  attachResource(
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @Body() dto: AttachResourceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.attachResource(contentId, dto, user);
  }

  @Roles(RoleName.LECTURER, RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Delete(':contentId/resources/:resourceId')
  removeResource(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.removeResource(resourceId, user);
  }

  @Roles(RoleName.LECTURER, RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Delete(':contentId')
  remove(
    @Param('contentId', ParseUUIDPipe) contentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(contentId, user);
  }
}
