import { IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @Matches(/\d/, { message: 'newPassword must contain at least one digit' })
  newPassword!: string;
}
