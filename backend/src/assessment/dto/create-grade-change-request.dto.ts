import { IsNumber, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateGradeChangeRequestDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  newPercentage!: number;

  @IsString()
  @MinLength(10)
  reason!: string;
}
