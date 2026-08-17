import { Module } from '@nestjs/common';
import { AcademicYearsController } from './academic-years.controller';
import { AcademicYearsService } from './academic-years.service';
import { SemestersController } from './semesters.controller';
import { SemestersService } from './semesters.service';

@Module({
  controllers: [AcademicYearsController, SemestersController],
  providers: [AcademicYearsService, SemestersService],
  exports: [AcademicYearsService, SemestersService],
})
export class AcademicCalendarModule {}
