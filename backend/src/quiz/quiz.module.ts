import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { OfferingAccessService } from '../common/offering-access.service';

@Module({
  controllers: [QuizController],
  providers: [QuizService, OfferingAccessService],
})
export class QuizModule {}
