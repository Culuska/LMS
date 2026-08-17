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
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  findAll(@Query('departmentId') departmentId?: string) {
    return this.programsService.findAll(departmentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.programsService.findOne(id);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Post()
  create(@Body() dto: CreateProgramDto) {
    return this.programsService.create(dto);
  }
}
