import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  body!: string;

  /** Omit for a university-wide announcement (Registrar/Super Admin only); provide to
   * scope it to one course offering (that offering's own lecturer, or admin). */
  @IsOptional()
  @IsUUID()
  courseOfferingId?: string;
}
