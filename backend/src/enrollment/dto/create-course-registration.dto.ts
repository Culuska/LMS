import { IsOptional, IsUUID } from 'class-validator';

export class CreateCourseRegistrationDto {
  @IsUUID()
  studentId!: string;

  @IsUUID()
  courseOfferingId!: string;

  /** Lecturer id of the advisor who approved this registration — required only when
   * the business rules below determine approval is needed (over credit limit, or the
   * student is on probation). See docs/04-grading-and-academic-policy.md §9. */
  @IsOptional()
  @IsUUID()
  advisorApprovedBy?: string;
}
