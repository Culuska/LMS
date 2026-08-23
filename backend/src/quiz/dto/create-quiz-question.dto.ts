import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

class QuizChoiceInputDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateQuizQuestionDto {
  @IsString()
  @MinLength(2)
  text!: string;

  /** At least two choices, exactly one marked correct — enforced in QuizService, not
   * here, since "exactly one" isn't expressible as a single-field validator. */
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => QuizChoiceInputDto)
  choices!: QuizChoiceInputDto[];
}
