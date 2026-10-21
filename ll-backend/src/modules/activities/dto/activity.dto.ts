import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { PLAN_TIERS, type PlanTier } from '../../../common/rules';
import { trim } from '../../../common/utils/json';

const blankToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
const INT_MAX = 2_147_483_647; // database integer limit

/** Prototype activity editor messages. */
const AGE = 'Enter a non-negative age in years.';
const DURATION_MASTERY = 'Use a positive duration and at least one whole completion for mastery.';
const LEVEL = 'Choose an existing level. Add a level first if none are available.';
const STEPS = 'Keep at least one activity step.';
const AREA = 'Choose a development area.';
const MARKS = 'Enter whole-number first completion marks of 0 or more.';

/** "Difficulty within level" (Personalisation tags). */
export const SKILL_STAGES = ['STARTING', 'PRACTISING', 'CONFIDENT'] as const;
/** "Availability". WITHDRAWN is set only by Delete; the draft workflow is separate (Approve / Save in draft). */
export const AVAILABILITY = ['DRAFT', 'PUBLISHED'] as const;

export class StepDto {
  @Transform(trim)
  @IsString({ message: 'Enter a step title.' })
  @IsNotEmpty({ message: 'Enter a step title.' })
  title: string;

  @Transform(trim)
  @IsString({ message: 'Enter the step guidance description.' })
  @IsNotEmpty({ message: 'Enter the step guidance description.' })
  description: string;
}

export class PreviewDto {
  /** A URL returned by POST /api/uploads (an image). */
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  imageUrl?: string | null;

  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  caption?: string | null;
}

/** GET /api/activities filters. */
export class ActivityQueryDto {
  @Transform(trim)
  @IsString({ message: 'Choose a regional learning category.' })
  @IsNotEmpty({ message: 'Choose a regional learning category.' })
  regionId: string;

  @IsOptional() @Transform(blankToNull) @IsString() areaId?: string | null;
  @IsOptional() @Transform(blankToNull) @IsString() categoryId?: string | null;
  @IsOptional() @Transform(blankToNull) @IsString() levelId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: AGE })
  @Min(0, { message: AGE })
  age?: number;
}

/**
 * "Add New Activity" / "Edit Activity" (prototype). POST and PATCH both take the WHOLE activity;
 * steps and previews are saved in the order sent.
 */
export class ActivityDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @Transform(trim)
  @IsString({ message: 'Enter an activity title.' })
  @IsNotEmpty({ message: 'Enter an activity title.' })
  title: string;

  @Transform(trim)
  @IsString({ message: AREA })
  @IsNotEmpty({ message: AREA })
  areaId: string;

  /** Required when the area has categories; empty otherwise. */
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  categoryId?: string | null;

  @Transform(blankToNull)
  @IsString({ message: LEVEL })
  @IsNotEmpty({ message: LEVEL })
  levelId: string;

  @IsInt({ message: AGE })
  @Min(0, { message: AGE })
  @Max(INT_MAX, { message: AGE })
  age: number;

  /** Independent mode target duration — a guide, not an automatic finish. */
  @IsInt({ message: DURATION_MASTERY })
  @Min(1, { message: DURATION_MASTERY })
  @Max(INT_MAX, { message: DURATION_MASTERY })
  durationMinutes: number;

  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  materials?: string | null;

  @Transform(trim)
  @IsString({ message: 'Enter a description.' })
  @IsNotEmpty({ message: 'Enter a description.' })
  description: string;

  @IsIn(PLAN_TIERS, { message: 'Choose a minimum plan.' })
  minimumPlan: PlanTier;

  /** "First completion marks" (base marks; each later scored completion halves the award). */
  @IsInt({ message: MARKS })
  @Min(0, { message: MARKS })
  @Max(INT_MAX, { message: MARKS })
  baseMarks: number;

  /** "Independent completions for mastery" (≥ 1). */
  @IsInt({ message: DURATION_MASTERY })
  @Min(1, { message: DURATION_MASTERY })
  @Max(INT_MAX, { message: DURATION_MASTERY })
  masteryTarget: number;

  /** "Primary skill": empty = "Not tagged". Must be one of the area's skills. */
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  skillId?: string | null;

  @IsOptional()
  @IsIn(SKILL_STAGES, { message: 'Choose Starting, Practising or Confident.' })
  skillStage: (typeof SKILL_STAGES)[number] = 'STARTING';

  @IsOptional()
  @IsIn(AVAILABILITY, { message: 'Choose Draft or Published.' })
  status: (typeof AVAILABILITY)[number] = 'DRAFT';

  /** Activity Progression: the activity group this is one difficulty of (empty = not grouped). */
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  groupId?: string | null;

  /** Its difficulty level in the group (Level 1…N, no maximum). Required with `groupId`. */
  @IsOptional()
  @IsInt({ message: 'Use a unique positive whole difficulty level for this activity.' })
  @Min(1, { message: 'Use a unique positive whole difficulty level for this activity.' })
  @Max(INT_MAX, { message: 'Use a unique positive whole difficulty level for this activity.' })
  difficulty?: number | null;

  @IsArray({ message: STEPS })
  @ArrayMinSize(1, { message: STEPS })
  @ValidateNested({ each: true })
  @Type(() => StepDto)
  steps: StepDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviewDto)
  previews: PreviewDto[] = [];
}

export class DeleteActivityDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';
}
