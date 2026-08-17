import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CourseOfferingsController } from './course-offerings.controller';
import { CourseOfferingsService } from './course-offerings.service';
import { CurriculumController } from './curriculum.controller';
import { CurriculumService } from './curriculum.service';

@Module({
  controllers: [
    CoursesController,
    CourseOfferingsController,
    CurriculumController,
  ],
  providers: [CoursesService, CourseOfferingsService, CurriculumService],
  exports: [CoursesService, CourseOfferingsService, CurriculumService],
})
export class CoursesModule {}
