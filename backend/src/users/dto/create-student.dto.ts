import { IsDateString, IsEmail, IsString, MinLength } from 'class-validator';

export class CreateStudentDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsString()
  @MinLength(1)
  studentNumber!: string;

  @IsDateString()
  dateOfBirth!: string;
}
