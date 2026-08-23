import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

/** Everything a lecturer can reasonably change about their own course after creating
 * it — course-level fields (title/description/credits) and offering-level fields
 * (capacity/room) in one request, since the split between "Course" and "Course
 * Offering" is an implementation detail a lecturer shouldn't need to think about. */
export class UpdateCourseSimpleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  credits?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsString()
  room?: string;
}
