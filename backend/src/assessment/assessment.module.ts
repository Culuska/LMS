import { Module } from '@nestjs/common';
import { AssessmentItemsController } from './assessment-items.controller';
import { AssessmentItemsService } from './assessment-items.service';
import { MarksController } from './marks.controller';
import { MarksService } from './marks.service';
import { CourseResultsController } from './course-results.controller';
import { CourseResultsService } from './course-results.service';
import { OfferingAccessService } from '../common/offering-access.service';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [AttendanceModule],
  controllers: [
    AssessmentItemsController,
    MarksController,
    CourseResultsController,
  ],
  providers: [
    AssessmentItemsService,
    MarksService,
    CourseResultsService,
    OfferingAccessService,
  ],
})
export class AssessmentModule {}
