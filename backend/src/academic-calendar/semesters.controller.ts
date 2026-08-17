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
import { SemestersService } from './semesters.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('semesters')
export class SemestersController {
  constructor(private readonly service: SemestersService) {}

  @Get()
  findAll(@Query('academicYearId') academicYearId?: string) {
    return this.service.findAll(academicYearId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Post()
  create(@Body() dto: CreateSemesterDto) {
    return this.service.create(dto);
  }
}
