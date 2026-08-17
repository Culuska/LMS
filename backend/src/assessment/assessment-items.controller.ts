import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { AssessmentItemsService } from './assessment-items.service';
import { CreateAssessmentItemDto } from './dto/create-assessment-item.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('course-offerings/:offeringId/assessment-items')
export class AssessmentItemsController {
  constructor(private readonly service: AssessmentItemsService) {}

  @Get()
  findAll(@Param('offeringId', ParseUUIDPipe) offeringId: string) {
    return this.service.findAllForOffering(offeringId);
  }

  @Roles(RoleName.LECTURER, RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Post()
  create(
    @Param('offeringId', ParseUUIDPipe) offeringId: string,
    @Body() dto: CreateAssessmentItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(offeringId, dto, user);
  }
}
