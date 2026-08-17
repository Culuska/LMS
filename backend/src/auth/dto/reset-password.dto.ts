import { IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token!: string;

  // Minimum bar for V1 — see docs/00-requirements-audit.md §12 (password security).
  // A configurable complexity policy is a reasonable V2 follow-up, not required now.
  @IsString()
  @MinLength(8)
  @Matches(/\d/, { message: 'newPassword must contain at least one digit' })
  newPassword!: string;
}
