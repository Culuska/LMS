import { IsEnum, IsString, IsUUID, MinLength } from 'class-validator';
import { ProgramLevel } from '@prisma/client';

export class CreateProgramDto {
  @IsUUID()
  departmentId!: string;

  @IsString()
  @MinLength(2)
  code!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(ProgramLevel)
  level!: ProgramLevel;
}
