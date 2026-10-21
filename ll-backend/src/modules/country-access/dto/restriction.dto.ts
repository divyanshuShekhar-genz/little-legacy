import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { RESTRICTION_TYPE_KEYS, type RestrictionType } from '../../../common/rules';
import { trim } from '../../../common/utils/json';

// One message for every field problem, as in the prototype (country-access.js).
const INVALID = 'Choose a valid country, target and message.';

export class RestrictionDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString({ message: INVALID })
  @Length(2, 2, { message: INVALID })
  countryCode: string;

  @IsIn(RESTRICTION_TYPE_KEYS, { message: INVALID })
  type: RestrictionType;

  /** Activity / Level id for item rules; omit (or null) for "Entire section". */
  @IsOptional()
  @IsString({ message: INVALID })
  targetId?: string | null;

  @Transform(trim)
  @IsString({ message: INVALID })
  @IsNotEmpty({ message: INVALID })
  message: string;

  @IsBoolean()
  enabled: boolean;
}

export class DeleteRestrictionDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';
}
