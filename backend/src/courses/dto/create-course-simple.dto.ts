import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

/** The one-step course creation a lecturer actually uses — see CourseOfferingsService
 * .createSimple(). Deliberately doesn't ask for a semesterId, lecturerId, or any of the
 * curriculum/department scaffolding CreateCourseOfferingDto exposes: this fills those
 * in automatically (the active semester, the calling lecturer) so creating a course is
 * "name it and go," not a multi-screen admin form. */
export class CreateCourseSimpleDto {
  @IsString()
  @MinLength(2)
  code!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  credits!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
