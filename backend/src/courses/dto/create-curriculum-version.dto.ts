import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateCurriculumVersionDto {
  @IsUUID()
  programId!: string;

  @IsString()
  versionLabel!: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsInt()
  @Min(1)
  totalCreditsRequired!: number;

  @IsOptional()
  @IsNumber()
  minCgpaToGraduate?: number; // defaults to 2.0 per docs/04 §8
}
