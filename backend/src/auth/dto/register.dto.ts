import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

/** Public self-registration for students — see AuthService.register(). Deliberately
 * doesn't ask for a date of birth or require an admin-assigned student number the way
 * the staff-created CreateStudentDto flow does: a self-registering student picks their
 * own password immediately instead of being emailed a temporary one, and an optional
 * studentNumber is auto-generated when omitted rather than blocking signup on a field
 * a small single-lecturer deployment may not track. */
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(/\d/, { message: 'password must contain at least one digit' })
  password!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsOptional()
  @IsString()
  studentNumber?: string;
}
