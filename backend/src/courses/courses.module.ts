import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { CourseOfferingsController } from './course-offerings.controller';
import { CourseOfferingsService } from './course-offerings.service';
import { CurriculumController } from './curriculum.controller';
import { CurriculumService } from './curriculum.service';
import { OfferingAccessService } from '../common/offering-access.service';

@Module({
  controllers: [
    CoursesController,
    CourseOfferingsController,
    CurriculumController,
  ],
  providers: [
    CoursesService,
    CourseOfferingsService,
    CurriculumService,
    OfferingAccessService,
  ],
  exports: [CoursesService, CourseOfferingsService, CurriculumService],
})
export class CoursesModule {}
