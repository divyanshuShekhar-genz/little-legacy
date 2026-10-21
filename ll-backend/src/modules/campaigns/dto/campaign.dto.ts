import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { NOTIFICATION_CHANNELS, PLAN_TIERS, type NotificationChannel, type PlanTier } from '../../../common/rules';
import { trim } from '../../../common/utils/json';

const FILTERS = 'Choose filters from the lists.';
const TEXT = 'Enter a notification title and message.';
const RECIPIENTS = 'Choose recipients and at least one channel.';

/** Blank → left out ("All"). */
const blankToUndefined = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value === null ? undefined : value);

/** Campaign.filters (API_REQUESTS #23). Every field left out means "All"; the given ones combine with AND. */
export class CampaignFiltersDto {
  @IsOptional() @IsArray({ message: FILTERS }) @IsString({ each: true, message: FILTERS }) regionIds?: string[];
  @IsOptional() @IsArray({ message: FILTERS }) @IsString({ each: true, message: FILTERS }) countryCodes?: string[];
  @IsOptional() @Transform(blankToUndefined) @IsString({ message: FILTERS }) areaId?: string;
  @IsOptional() @Transform(blankToUndefined) @IsInt({ message: FILTERS }) @Min(0, { message: FILTERS }) age?: number;
  @IsOptional() @Transform(blankToUndefined) @IsInt({ message: FILTERS }) @Min(1, { message: FILTERS }) level?: number;
  @IsOptional() @Transform(blankToUndefined) @IsIn(PLAN_TIERS, { message: FILTERS }) plan?: PlanTier;
  @IsOptional() @Transform(blankToUndefined) @IsString({ message: FILTERS }) storyCategoryId?: string;
  @IsOptional() @Transform(blankToUndefined) @IsString({ message: FILTERS }) rhymeCategoryId?: string;
}

export class AudienceDto {
  @IsOptional() @IsObject({ message: FILTERS }) @ValidateNested() @Type(() => CampaignFiltersDto) filters?: CampaignFiltersDto;
}

/** "Preview notification" → Approve, or "Save in draft". `draftId` = the saved campaign being edited. */
export class SaveCampaignDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @Transform(trim) @IsString({ message: TEXT }) @IsNotEmpty({ message: TEXT }) title: string;
  @Transform(trim) @IsString({ message: TEXT }) @IsNotEmpty({ message: TEXT }) message: string;

  @IsArray({ message: RECIPIENTS })
  @ArrayMinSize(1, { message: RECIPIENTS })
  @ArrayUnique({ message: RECIPIENTS })
  @IsIn(NOTIFICATION_CHANNELS, { each: true, message: RECIPIENTS })
  channels: NotificationChannel[];

  @IsOptional() @IsObject({ message: FILTERS }) @ValidateNested() @Type(() => CampaignFiltersDto) filters?: CampaignFiltersDto;

  @IsOptional() @Transform(blankToUndefined) @IsString() draftId?: string;
}
