import { Module } from '@nestjs/common';
import { FacultiesController } from './faculties.controller';
import { FacultiesService } from './faculties.service';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';

@Module({
  controllers: [FacultiesController, DepartmentsController, ProgramsController],
  providers: [FacultiesService, DepartmentsService, ProgramsService],
  exports: [FacultiesService, DepartmentsService, ProgramsService],
})
export class AcademicStructureModule {}
