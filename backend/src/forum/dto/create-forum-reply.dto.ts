import { IsString, MinLength } from 'class-validator';

export class CreateForumReplyDto {
  @IsString()
  @MinLength(1)
  body!: string;
}
