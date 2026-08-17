import { Module } from '@nestjs/common';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { CourseRegistrationsController } from './course-registrations.controller';
import { CourseRegistrationsService } from './course-registrations.service';
import { OfferingAccessService } from '../common/offering-access.service';

@Module({
  controllers: [EnrollmentsController, CourseRegistrationsController],
  providers: [
    EnrollmentsService,
    CourseRegistrationsService,
    OfferingAccessService,
  ],
})
export class EnrollmentModule {}
