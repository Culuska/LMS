import { IsOptional, IsString, MaxLength } from 'class-validator';

/** A submission can be text-only, file-only, or both — see SubmissionsService for how
 * a submission row is created up front so a subsequent file attachment always has
 * somewhere to attach to. */
export class SubmitAssignmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  content?: string;
}
