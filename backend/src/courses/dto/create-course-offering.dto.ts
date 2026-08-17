import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateCourseOfferingDto {
  @IsUUID()
  courseId!: string;

  @IsUUID()
  semesterId!: string;

  @IsUUID()
  lecturerId!: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsString()
  timetableSlot?: string;

  @IsOptional()
  @IsNumber()
  caWeight?: number;

  @IsOptional()
  @IsNumber()
  midtermWeight?: number;

  @IsOptional()
  @IsNumber()
  finalWeight?: number;
}
