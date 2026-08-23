import { IsIn, IsInt, IsString, Max, MinLength } from 'class-validator';

/** Course materials and assignment submissions both accept the same practical set of
 * document types a university course actually uses — see docs/00-requirements-audit.md
 * §14. Deliberately not "any file type": an unrestricted upload endpoint is an easy way
 * to turn a course-materials feature into a general file host. */
export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // legacy .ppt
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // legacy .doc
  'text/plain',
  'image/png',
  'image/jpeg',
] as const;

// 25 MB — comfortably covers lecture slides/documents without letting a free-tier
// worker instance or R2's free storage tier get eaten by a handful of uploads.
export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

export class RequestUploadDto {
  @IsString()
  @MinLength(1)
  fileName!: string;

  @IsIn(ALLOWED_UPLOAD_CONTENT_TYPES)
  contentType!: (typeof ALLOWED_UPLOAD_CONTENT_TYPES)[number];

  @IsInt()
  @Max(MAX_UPLOAD_SIZE_BYTES)
  sizeBytes!: number;
}
