import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateLecturerDto } from './dto/create-lecturer.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
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

  // Role assignment is a governance action — see docs/00-requirements-audit.md §5
  // "dangerous permission conflict #3": Super Admin should be the only one handing out
  // roles, and even that should be rare/audited (mustChangePassword-style scrutiny isn't
  // enough here — this literally decides who can approve grades, publish results, etc.).
  @Roles(RoleName.SUPER_ADMIN)
  @Get(':userId/roles')
  listRoles(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.usersService.listRoles(userId);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Post(':userId/roles')
  assignRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.usersService.assignRole(userId, dto);
  }

  @Roles(RoleName.SUPER_ADMIN)
  @Delete(':userId/roles/:roleId')
  removeRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.usersService.removeRole(userId, roleId);
  }
}
