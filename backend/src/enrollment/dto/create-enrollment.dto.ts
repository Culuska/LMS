import { IsUUID } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  studentId!: string;

  @IsUUID()
  programId!: string;

  @IsUUID()
  curriculumVersionId!: string;
}
