import { IsDateString } from 'class-validator';

export class CreateAttendanceSessionDto {
  @IsDateString()
  sessionDate!: string;
}
