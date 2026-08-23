import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { SubmissionsService } from './submissions.service';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { RequestUploadDto } from '../storage/dto/request-upload.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('assessment-items/:itemId/submissions')
export class SubmissionsController {
  constructor(private readonly service: SubmissionsService) {}

  @Roles(RoleName.STUDENT)
  @Post()
  submit(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: SubmitAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.submit(itemId, dto, user);
  }

  @Roles(RoleName.STUDENT)
  @Post('mine/resources')
  attachResource(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: RequestUploadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.attachResource(itemId, dto, user);
  }

  @Roles(RoleName.STUDENT)
  @Get('mine')
  findMine(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findMine(itemId, user);
  }

  @Roles(RoleName.LECTURER, RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Get()
  findAll(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findAllForItem(itemId, user);
  }
}
