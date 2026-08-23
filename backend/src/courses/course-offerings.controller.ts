import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CourseOfferingsService } from './course-offerings.service';
import { CreateCourseOfferingDto } from './dto/create-course-offering.dto';
import { CreateCourseSimpleDto } from './dto/create-course-simple.dto';
import { UpdateCourseSimpleDto } from './dto/update-course-simple.dto';
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

  // The one-step "just name a course and go" path lecturers actually use — see
  // CourseOfferingsService.createSimple.
  @Roles(RoleName.LECTURER)
  @Post('simple')
  createSimple(
    @Body() dto: CreateCourseSimpleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createSimple(dto, user);
  }

  @Roles(RoleName.LECTURER, RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseSimpleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateSimple(id, dto, user);
  }

  @Roles(RoleName.LECTURER, RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.removeSimple(id, user);
  }
}
