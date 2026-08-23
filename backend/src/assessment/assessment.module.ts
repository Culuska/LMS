import { Module } from '@nestjs/common';
import { AssessmentItemsController } from './assessment-items.controller';
import { AssessmentItemsService } from './assessment-items.service';
import { MarksController } from './marks.controller';
import { MarksService } from './marks.service';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { CourseResultsController } from './course-results.controller';
import { CourseResultsService } from './course-results.service';
import { GradeChangeRequestsController } from './grade-change-requests.controller';
import { GradeChangeRequestsService } from './grade-change-requests.service';
import { AcademicStandingService } from './academic-standing.service';
import { OfferingAccessService } from '../common/offering-access.service';
import { AttendanceModule } from '../attendance/attendance.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AttendanceModule, StorageModule],
  controllers: [
    AssessmentItemsController,
    MarksController,
    SubmissionsController,
    CourseResultsController,
    GradeChangeRequestsController,
  ],
  providers: [
    AssessmentItemsService,
    MarksService,
    SubmissionsService,
    CourseResultsService,
    GradeChangeRequestsService,
    AcademicStandingService,
    OfferingAccessService,
  ],
})
export class AssessmentModule {}
