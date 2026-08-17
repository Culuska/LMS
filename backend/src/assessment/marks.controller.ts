import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { MarksService } from './marks.service';
import { EnterMarkDto } from './dto/enter-mark.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('assessment-items/:itemId/marks')
export class MarksController {
  constructor(private readonly service: MarksService) {}

  @Get()
  findAll(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.service.findAllForItem(itemId);
  }

  // PUT, not POST: entering a mark for a student is idempotent (re-submitting the
  // same student+item updates their score) — see MarksService.enterMark's upsert.
  @Roles(RoleName.LECTURER, RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Put()
  enterMark(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: EnterMarkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.enterMark(itemId, dto, user);
  }
}
