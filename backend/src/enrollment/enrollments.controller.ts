import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly service: EnrollmentsService) {}

  @Get('student/:studentId')
  findForStudent(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.service.findForStudent(studentId);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.REGISTRAR)
  @Post()
  create(@Body() dto: CreateEnrollmentDto) {
    return this.service.create(dto);
  }
}
