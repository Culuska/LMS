import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class SubmitApplicationDto {
  @IsUUID()
  programId!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsDateString()
  dateOfBirth!: string;

  // Required only if the applicant is under 18 as of submission — checked in the service,
  // not here, since "required" depends on a computed value (age), not a static rule.
  // See docs/00-requirements-audit.md §8 rule 13 (Somalia DPA Act guardian-consent gate).
  @IsOptional()
  @IsString()
  guardianName?: string;

  @IsOptional()
  @IsEmail()
  guardianEmail?: string;
}
