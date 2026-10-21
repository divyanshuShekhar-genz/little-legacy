import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { trim } from '../../../common/utils/json';

/** Prototype message for any weight problem. */
const WEIGHTS = 'Use non-negative weights and at least one positive weight.';
const SAMPLE = 'Enter sample values of 0 or more.';
const COUNT = 'Use a whole number of 0 or more for required completed activities.';
const REGION = 'Choose a regional learning category.';
const MAX_WEIGHT = 1_000_000;

export class RegionQueryDto {
  @Transform(trim)
  @IsString({ message: REGION })
  @IsNotEmpty({ message: REGION })
  regionId: string;
}

export class QuestionWeightsDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: WEIGHTS }) @Min(0, { message: WEIGHTS }) @Max(MAX_WEIGHT, { message: WEIGHTS }) EASY: number;
  @IsNumber({ maxDecimalPlaces: 2 }, { message: WEIGHTS }) @Min(0, { message: WEIGHTS }) @Max(MAX_WEIGHT, { message: WEIGHTS }) MEDIUM: number;
  @IsNumber({ maxDecimalPlaces: 2 }, { message: WEIGHTS }) @Min(0, { message: WEIGHTS }) @Max(MAX_WEIGHT, { message: WEIGHTS }) HARD: number;
}

/** One row of "Development formulas & weights". */
export class AreaRuleDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  areaId: string;

  /** Checked by the formula engine (length, syntax, sample values and all zeros). */
  @IsString({ message: 'Enter a formula.' })
  formula: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: WEIGHTS })
  @Min(0, { message: WEIGHTS })
  @Max(MAX_WEIGHT, { message: WEIGHTS })
  weight: number;

  @ValidateNested()
  @Type(() => QuestionWeightsDto)
  questionWeights: QuestionWeightsDto;
}

/** "Test formulas with sample values". `activity` is worked out: mandatory + regular. */
export class SampleValuesDto {
  @IsOptional() @IsNumber({}, { message: SAMPLE }) @Min(0, { message: SAMPLE }) questionnaire: number = 0;
  @IsOptional() @IsNumber({}, { message: SAMPLE }) @Min(0, { message: SAMPLE }) mandatory: number = 0;
  @IsOptional() @IsNumber({}, { message: SAMPLE }) @Min(0, { message: SAMPLE }) regular: number = 0;
  @IsOptional() @IsNumber({}, { message: SAMPLE }) @Min(0, { message: SAMPLE }) mastery: number = 0;
  @IsOptional() @IsNumber({}, { message: SAMPLE }) @Min(0, { message: SAMPLE }) target: number = 40;
}

/** One "Age N" × area fieldset of "Mandatory activities by age". */
export class MandatoryPickDto {
  @IsInt() @Min(0) age: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  areaId: string;

  @IsArray()
  @IsString({ each: true })
  activityIds: string[];

  /** "Required completed activities" (0 = the count shortcut is off). */
  @IsInt({ message: COUNT })
  @Min(0, { message: COUNT })
  @Max(10_000, { message: COUNT })
  requiredCount: number;
}

/** POST /api/assessment-rules/preview — "Calculate preview". Saves nothing. */
export class PreviewDto {
  @Transform(trim)
  @IsString({ message: REGION })
  @IsNotEmpty({ message: REGION })
  regionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AreaRuleDto)
  areas: AreaRuleDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SampleValuesDto)
  sample: SampleValuesDto = new SampleValuesDto();
}

/** PUT /api/assessment-rules — the whole page; approving creates the next revision. */
export class SaveRulesDto extends PreviewDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MandatoryPickDto)
  mandatory: MandatoryPickDto[] = [];
}
