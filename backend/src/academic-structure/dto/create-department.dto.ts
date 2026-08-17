import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsUUID()
  facultyId!: string;

  @IsString()
  @MinLength(2)
  code!: string;

  @IsString()
  @MinLength(2)
  name!: string;
}
