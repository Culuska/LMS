import { IsEnum } from 'class-validator';

// ACCEPTED is deliberately excluded — that transition only happens through the dedicated
// /applications/:id/accept endpoint, which also converts the applicant to a Student.
export enum ReviewableApplicationStatus {
  UNDER_REVIEW = 'UNDER_REVIEW',
  OFFERED = 'OFFERED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export class UpdateApplicationStatusDto {
  @IsEnum(ReviewableApplicationStatus)
  status!: ReviewableApplicationStatus;
}
