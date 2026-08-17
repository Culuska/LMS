import { Module } from '@nestjs/common';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { CourseRegistrationsController } from './course-registrations.controller';
import { CourseRegistrationsService } from './course-registrations.service';

@Module({
  controllers: [EnrollmentsController, CourseRegistrationsController],
  providers: [EnrollmentsService, CourseRegistrationsService],
})
export class EnrollmentModule {}
