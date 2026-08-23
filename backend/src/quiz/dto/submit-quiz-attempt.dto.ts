import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';

class QuizAnswerInputDto {
  @IsUUID()
  questionId!: string;

  @IsUUID()
  choiceId!: string;
}

export class SubmitQuizAttemptDto {
  /** One entry per answered question — a question with no entry here is left ungraded
   * (counts as incorrect), so a student can submit with some questions skipped. */
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerInputDto)
  answers!: QuizAnswerInputDto[];
}
