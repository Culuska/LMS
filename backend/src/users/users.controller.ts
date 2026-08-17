import { Body, Controller, Post } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateLecturerDto } from './dto/create-lecturer.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(RoleName.SUPER_ADMIN, RoleName.REGISTRAR, RoleName.DEPARTMENT_ADMIN)
  @Post('lecturers')
  createLecturer(@Body() dto: CreateLecturerDto) {
    return this.usersService.createLecturer(dto);
  }

  @Roles(RoleName.SUPER_ADMIN, RoleName.REGISTRAR, RoleName.ADMISSIONS_OFFICER)
  @Post('students')
  createStudent(@Body() dto: CreateStudentDto) {
    return this.usersService.createStudent(dto);
  }
}
