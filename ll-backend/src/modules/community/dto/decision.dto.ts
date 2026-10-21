import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { trim } from '../../../common/utils/json';

const EXPIRY = 'Use whole days and hours from 0 to 23.';

/**
 * Approve / Reject / Save in draft, shared by both editors (prototype admin-rebuild.js).
 * "Give a reason for rejection." is checked in CommunityService (it depends on `action`).
 */
export class DecisionDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter a message.' })
  message: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  reason: string = '';

  @IsInt({ message: EXPIRY })
  @Min(0, { message: EXPIRY })
  @Max(36500, { message: EXPIRY })
  expiryDays: number;

  @IsInt({ message: EXPIRY })
  @Min(0, { message: EXPIRY })
  @Max(23, { message: EXPIRY })
  expiryHours: number;

  @IsOptional()
  @IsBoolean()
  pinned: boolean = false;
}

export class TeamPostDto extends DecisionDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter a title.' })
  title: string;
}
