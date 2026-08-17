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

@Controller('course-offerings')
export class CourseOfferingsController {
  constructor(private readonly service: CourseOfferingsService) {}

  @Get()
  findAll(@Query('semesterId') semesterId?: string) {
    return this.service.findAll(semesterId);
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
