import { Body, Controller, Post } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CourseRegistrationsService } from './course-registrations.service';
import { CreateCourseRegistrationDto } from './dto/create-course-registration.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('course-registrations')
export class CourseRegistrationsController {
  constructor(private readonly service: CourseRegistrationsService) {}

  // In V1, registration is entered by Registrar/Advisor staff on the student's behalf
  // through this endpoint. A STUDENT self-service registration endpoint (constrained to
  // dto.studentId === the caller's own student record) is a near-term follow-up, not
  // yet implemented — flagged rather than silently left to look done.
  @Roles(RoleName.SUPER_ADMIN, RoleName.REGISTRAR, RoleName.ADVISOR)
  @Post()
  create(@Body() dto: CreateCourseRegistrationDto) {
    return this.service.create(dto);
  }
}
