import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { FacultiesService } from './faculties.service';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { Roles } from '../common/decorators/roles.decorator';

// Read access: any authenticated user (per docs/00-requirements-audit.md §5 — faculty/
// department/program structure is broadly viewable). Mutation: SUPER_ADMIN + REGISTRAR
// per the same RBAC table. Scoped FACULTY_ADMIN edit-rights-to-own-faculty are a
// follow-up (needs the same resource-ownership check pattern as CourseRegistration's
// lecturer-owns-course rule) — not implemented yet, not silently assumed either.
@Controller('faculties')
export class FacultiesController {
  constructor(private readonly facultiesService: FacultiesService) {}

  @Get()
  findAll() {
    return this.facultiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.facultiesService.findOne(id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Post()
  create(@Body() dto: CreateFacultyDto) {
    return this.facultiesService.create(dto);
  }
}
