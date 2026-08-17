import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { TranscriptService } from './transcript.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('students/:studentId/transcript')
export class TranscriptController {
  constructor(private readonly service: TranscriptService) {}

  // STUDENT is included here (coarse gate) so a student can reach this endpoint at all;
  // TranscriptService then enforces they can only ever pull their OWN transcript — the
  // fine-grained self-check the decorator alone can't express.
  @Roles(
    RoleName.SUPER_ADMIN,
    RoleName.REGISTRAR,
    RoleName.DEAN,
    RoleName.HEAD_OF_DEPARTMENT,
    RoleName.EXAM_OFFICER,
    RoleName.STUDENT,
  )
  @Get()
  getTranscript(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getForStudent(studentId, user);
  }
}
