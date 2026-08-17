import { IsNumber, IsUUID, Min } from 'class-validator';

export class EnterMarkDto {
  @IsUUID()
  studentId!: string;

  @IsNumber()
  @Min(0)
  score!: number;
}
