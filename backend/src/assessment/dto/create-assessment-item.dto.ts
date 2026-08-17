import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  Min,
} from 'class-validator';
import { AssessmentType } from '@prisma/client';

export class CreateAssessmentItemDto {
  @IsEnum(AssessmentType)
  type!: AssessmentType;

  @IsString()
  @MinLength(2)
  title!: string;

  /** Percent of the course's final grade this single item is worth — see
   * src/assessment/assessment.constants.ts for how type maps to CA/Midterm/Final bucket. */
  @IsNumber()
  @Min(0.01)
  weight!: number;

  @IsNumber()
  @Min(1)
  maxMarks!: number;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
