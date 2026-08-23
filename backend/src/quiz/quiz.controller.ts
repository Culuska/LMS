import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { QuizService } from './quiz.service';
import { CreateQuizQuestionDto } from './dto/create-quiz-question.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

const MANAGE_ROLES: RoleName[] = [
  RoleName.LECTURER,
  RoleName.SUPER_ADMIN,
  RoleName.REGISTRAR,
];

@Controller('assessment-items/:itemId')
export class QuizController {
  constructor(private readonly service: QuizService) {}

  @Get('quiz-questions')
  findQuestions(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findQuestionsForItem(itemId, user);
  }

  @Roles(...MANAGE_ROLES)
  @Post('quiz-questions')
  createQuestion(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: CreateQuizQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createQuestion(itemId, dto, user);
  }

  @Roles(...MANAGE_ROLES)
  @Delete('quiz-questions/:questionId')
  removeQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.removeQuestion(questionId, user);
  }

  @Roles(RoleName.STUDENT)
  @Get('quiz-attempts/mine')
  findMyAttempt(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findMyAttempt(itemId, user);
  }

  @Roles(RoleName.STUDENT)
  @Post('quiz-attempts')
  submitAttempt(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: SubmitQuizAttemptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.submitAttempt(itemId, dto, user);
  }

  @Roles(...MANAGE_ROLES)
  @Get('quiz-attempts')
  findAllAttempts(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findAllAttemptsForItem(itemId, user);
  }
}
