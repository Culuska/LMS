import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MinLength,
} from 'class-validator';

export class CreateCourseContentDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  body?: string;

  /** YouTube/Vimeo/any hosted video link — not an upload. */
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  /** For nesting under a Module (e.g. Lesson under a Week/Topic) — see
   * docs/00-requirements-audit.md §7 CourseContent. Must belong to the same offering. */
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsInt()
  orderIndex?: number;
}
