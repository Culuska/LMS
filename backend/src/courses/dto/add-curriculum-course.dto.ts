import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class AddCurriculumCourseDto {
  @IsUUID()
  courseId!: string;

  @IsOptional()
  @IsBoolean()
  isCore?: boolean;
}
