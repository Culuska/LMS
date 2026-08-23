import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { SemestersService } from './semesters.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { Roles } from '../common/decorators/roles.decorator';

const MANAGE_ROLES: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.REGISTRAR];

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

  @Roles(...MANAGE_ROLES)
  @Post()
  create(@Body() dto: CreateSemesterDto) {
    return this.service.create(dto);
  }

  @Roles(...MANAGE_ROLES)
  @Patch(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.activate(id);
  }

  @Roles(...MANAGE_ROLES)
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deactivate(id);
  }
}
