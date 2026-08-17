import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RoleName } from '@prisma/client';

export class AssignRoleDto {
  @IsEnum(RoleName)
  role!: RoleName;

  /** Scopes the role to one faculty (e.g. Faculty Admin for a specific faculty).
   * Omit for a university-wide role (Registrar, Exam Officer, Super Admin, etc.). */
  @IsOptional()
  @IsUUID()
  facultyId?: string;

  /** Scopes the role to one department (e.g. Department Admin for a specific department). */
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
