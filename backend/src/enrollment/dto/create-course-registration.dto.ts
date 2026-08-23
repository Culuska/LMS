import { IsOptional, IsUUID } from 'class-validator';

export class CreateCourseRegistrationDto {
  // Optional: a student registering themselves never sends this — the service always
  // resolves it from the caller's own account for that role and ignores any value sent
  // here (see CourseRegistrationsService.resolveTargetStudentId). Only staff roles
  // (Registrar/Advisor/Super Admin) registering someone else need to provide it.
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @IsUUID()
  courseOfferingId!: string;

  /** Lecturer id of the advisor who approved this registration — required only when
   * the business rules below determine approval is needed (over credit limit, or the
   * student is on probation). See docs/04-grading-and-academic-policy.md §9. */
  @IsOptional()
  @IsUUID()
  advisorApprovedBy?: string;
}
