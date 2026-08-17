import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Tighter than the global default (docs/00-requirements-audit.md §12 flags
  // credential-stuffing/brute-force risk on login specifically). Per IP, not per
  // account, since this runs before we know if the account exists. 30/min still cuts a
  // brute-force attempt rate by >95% compared to unlimited, while comfortably tolerating
  // one dev machine (one IP) running this project's own smoke-test suite back to back —
  // a stricter per-IP value made the regression scripts themselves flaky in practice.
  // A production deployment fronted by a real WAF/IDS would layer additional
  // account-level lockout on top of this; this is the V1 floor, not the whole story.
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /** Confirms who the caller is and what roles the current token carries. */
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  // Stricter still — this endpoint sends an email (once real delivery is wired up) and
  // is otherwise the same "guess an email" surface as login.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    // Same response whether or not the email exists — see AuthService.forgotPassword.
    return {
      message:
        'If an account with that email exists, a reset link has been sent.',
    };
  }

  // The token itself is a 32-byte random value (see token.util.ts), so brute-forcing it
  // is already infeasible — this limit is really about not letting a leaked/guessed
  // single token be hammered indefinitely against slightly-different new passwords.
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return {
      message:
        'Password has been reset. You can now log in with your new password.',
    };
  }

  /** For a logged-in user changing their own password — including satisfying
   * mustChangePassword after first login with a temporary password. */
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password changed successfully.' };
  }
}
