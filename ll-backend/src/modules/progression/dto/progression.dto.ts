import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { trim } from '../../../common/utils/json';

/** API_REQUESTS #14 messages. */
export const COUNTS = 'Counts and days must be whole numbers; weekly count must be positive.';
export const BASES = 'Base ranges must start at 0 and increase up to 100; starting levels must be positive whole numbers.';
export const OVERRIDE_NUMBERS = 'Override limits and starting levels must be positive whole numbers.';
const INT_MAX = 2_147_483_647;

export class RegionQueryDto {
  @Transform(trim)
  @IsString({ message: 'Choose a regional learning category.' })
  @IsNotEmpty({ message: 'Choose a regional learning category.' })
  regionId: string;
}

/** One Development Base: "starts at (%)" and "starting activity difficulty". */
export class BaseDto {
  @IsIn(['Base 1', 'Base 2', 'Base 3'], { message: BASES })
  name: 'Base 1' | 'Base 2' | 'Base 3';

  @IsInt({ message: BASES }) @Min(0, { message: BASES }) @Max(100, { message: BASES })
  from: number;

  @IsInt({ message: BASES }) @Min(1, { message: BASES }) @Max(INT_MAX, { message: BASES })
  start: number;
}

/** An allocation rule. 'All' matches anything; the most specific match wins. */
export class OverrideDto {
  /** 'All' or an age, e.g. '4'. */
  @IsString() age: string;
  /** 'All' or 'Base 1' … 'Base 3'. */
  @IsString() base: string;
  /** 'All' or a development area id. */
  @IsString() area: string;
  /** 'All' or 'FREE' | 'PLUS' | 'PREMIUM'. */
  @IsString() plan: string;

  @IsInt({ message: OVERRIDE_NUMBERS }) @Min(1, { message: OVERRIDE_NUMBERS }) @Max(INT_MAX, { message: OVERRIDE_NUMBERS })
  limit: number;

  @IsInt({ message: OVERRIDE_NUMBERS }) @Min(1, { message: OVERRIDE_NUMBERS }) @Max(INT_MAX, { message: OVERRIDE_NUMBERS })
  start: number;
}

/** "Base & weekly settings" + "Allocation overrides" (Activity Flow §17), saved together. */
export class ProgressionDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @IsArray({ message: BASES })
  @ArrayMinSize(3, { message: BASES })
  @ArrayMaxSize(3, { message: BASES })
  @ValidateNested({ each: true })
  @Type(() => BaseDto)
  bases: BaseDto[];

  /** New activities per week (Activity Flow §3, default 20). */
  @IsInt({ message: COUNTS }) @Min(1, { message: COUNTS }) @Max(INT_MAX, { message: COUNTS })
  weekly: number;

  /** Guide §11: next week = last week's completions + 5, capped here. Empty = not used (OPEN_QUESTIONS Q1). */
  @IsOptional()
  @IsInt({ message: COUNTS }) @Min(1, { message: COUNTS }) @Max(INT_MAX, { message: COUNTS })
  maxVisible?: number | null;

  @IsBoolean() pendingEnabled: boolean;

  @IsInt({ message: COUNTS }) @Min(0, { message: COUNTS }) @Max(INT_MAX, { message: COUNTS })
  pendingLimit: number;

  /** 0 = never expires. */
  @IsInt({ message: COUNTS }) @Min(0, { message: COUNTS }) @Max(INT_MAX, { message: COUNTS })
  pendingDays: number;

  @IsBoolean() pendingCounts: boolean;

  @IsInt({ message: COUNTS }) @Min(0, { message: COUNTS }) @Max(INT_MAX, { message: COUNTS })
  recent: number;

  @IsInt({ message: COUNTS }) @Min(0, { message: COUNTS }) @Max(INT_MAX, { message: COUNTS })
  continueCount: number;

  @IsIn(['same', 'easier'], { message: 'Choose same or easier.' })
  reinforcement: 'same' | 'easier';

  @IsIn(['anniversary', '0', '1', '2', '3', '4', '5', '6'], { message: 'Choose a weekly boundary.' })
  resetDay: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OverrideDto)
  overrides: OverrideDto[] = [];
}

/** One recorded outcome on a preview card (`id` = "<week>:<activityId>"). */
export class PreviewOutcomeDto {
  @IsString() assignmentId: string;

  @IsIn(['INDEPENDENT', 'WITH_HELP', 'UNABLE'], { message: 'Choose Independently, With help or Could not complete.' })
  outcome: 'INDEPENDENT' | 'WITH_HELP' | 'UNABLE';
}

/** "Preview a child's week": a SAMPLE child — never a real record (API_REQUESTS #14). */
export class WeekPreviewDto {
  @IsInt({ message: 'Enter a non-negative age in years.' })
  @Min(0, { message: 'Enter a non-negative age in years.' })
  age: number;

  @IsIn(['FREE', 'PLUS', 'PREMIUM'], { message: 'Choose a minimum plan.' })
  plan: 'FREE' | 'PLUS' | 'PREMIUM';

  @IsIn(['COMPLETED', 'NOT_SUBMITTED'], { message: 'Choose whether the questionnaire was completed.' })
  questionnaire: 'COMPLETED' | 'NOT_SUBMITTED';

  /** Assessment % (decides the Base). */
  @IsOptional()
  @IsNumber({}, { message: 'Enter an assessment score from 0 to 100.' })
  @Min(0, { message: 'Enter an assessment score from 0 to 100.' })
  @Max(100, { message: 'Enter an assessment score from 0 to 100.' })
  score: number = 0;

  /** Country code; empty = "Unknown / not provided" (country-blocked content is then never offered). */
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() || null : value)) @IsString() country?: string | null;

  /** Skill % by skill id (null = unknown). */
  @IsOptional() @IsObject({ message: 'Enter skill scores from 0 to 100.' }) skills: Record<string, number | null> = {};

  /** Which week to show (1 = the first). Earlier weeks are replayed with `outcomes`. */
  @IsOptional()
  @IsInt({ message: 'Choose a week from 1 to 52.' })
  @Min(1, { message: 'Choose a week from 1 to 52.' })
  @Max(52, { message: 'Choose a week from 1 to 52.' })
  week: number = 1;

  /** Added (decision 2026-10-13): the sample child's unlocked area Level. Default 1. */
  @IsOptional()
  @IsInt({ message: 'Enter a level of 1 or more.' })
  @Min(1, { message: 'Enter a level of 1 or more.' })
  @Max(INT_MAX, { message: 'Enter a level of 1 or more.' })
  level: number = 1;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviewOutcomeDto)
  outcomes: PreviewOutcomeDto[] = [];
}
