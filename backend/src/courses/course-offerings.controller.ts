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
import { CourseOfferingsService } from './course-offerings.service';
import { CreateCourseOfferingDto } from './dto/create-course-offering.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('course-offerings')
export class CourseOfferingsController {
  constructor(private readonly service: CourseOfferingsService) {}

  @Get()
  findAll(@Query('semesterId') semesterId?: string) {
    return this.service.findAll(semesterId);
  }

  // Must come before ':id' — otherwise "mine" would be parsed as a UUID param and 400.
  @Roles(RoleName.LECTURER)
  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findMine(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.REGISTRAR, RoleName.DEPARTMENT_ADMIN)
  @Post()
  create(@Body() dto: CreateCourseOfferingDto) {
    return this.service.create(dto);
  }
}
