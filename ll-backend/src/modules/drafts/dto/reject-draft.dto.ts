import { IsString } from 'class-validator';

export class RejectDraftDto {
  @IsString()
  reason: string;
}
