import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurriculumService } from './curriculum.service';
import { CreateCurriculumVersionDto } from './dto/create-curriculum-version.dto';
import { AddCurriculumCourseDto } from './dto/add-curriculum-course.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('curriculum-versions')
export class CurriculumController {
  constructor(private readonly service: CurriculumService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Post()
  create(@Body() dto: CreateCurriculumVersionDto) {
    return this.service.create(dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Post(':id/courses')
  addCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCurriculumCourseDto,
  ) {
    return this.service.addCourse(id, dto);
  }
}
