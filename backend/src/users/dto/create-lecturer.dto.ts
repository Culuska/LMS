import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateLecturerDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsUUID()
  departmentId!: string;

  @IsString()
  @MinLength(1)
  staffNumber!: string;
}
