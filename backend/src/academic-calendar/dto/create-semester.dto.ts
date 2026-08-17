import { IsDateString, IsEnum, IsUUID } from 'class-validator';
import { SemesterTerm } from '@prisma/client';

export class CreateSemesterDto {
  @IsUUID()
  academicYearId!: string;

  @IsEnum(SemesterTerm)
  term!: SemesterTerm;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsDateString()
  registrationOpensAt!: string;

  @IsDateString()
  registrationClosesAt!: string;

  @IsDateString()
  withdrawalDeadline!: string;
}
