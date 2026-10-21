import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { PLAN_TIERS, type PlanTier } from '../../../common/rules';
import { trim } from '../../../common/utils/json';

const collapse = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
const blankToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
const NAME = 'Enter a skill name.';
const EXPECTED = 'Use an expected score from 0 to 100.';

/** GET /api/skills?areaId= or ?regionId= (all current areas of a region). */
export class SkillQueryDto {
  @IsOptional() @Transform(blankToNull) @IsString() areaId?: string | null;
  @IsOptional() @Transform(blankToNull) @IsString() regionId?: string | null;
}

/** Expected score (%) for this skill at one age (guide §10). */
export class ExpectationDto {
  @IsInt({ message: 'Enter a non-negative age in years.' })
  @Min(0, { message: 'Enter a non-negative age in years.' })
  age: number;

  @IsInt({ message: EXPECTED })
  @Min(0, { message: EXPECTED })
  @Max(100, { message: EXPECTED })
  expectedScore: number;
}

/** Skill modal: name + area, plus the expected score per age. */
export class CreateSkillDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @Transform(trim)
  @IsString({ message: 'Choose a development area.' })
  @IsNotEmpty({ message: 'Choose a development area.' })
  areaId: string;

  @Transform(collapse)
  @IsString({ message: NAME })
  @IsNotEmpty({ message: NAME })
  name: string;

  /** The full list; ages left out have no expectation. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpectationDto)
  expected: ExpectationDto[] = [];
}

/** Omitted fields stay as they are; `expected`, when sent, replaces the whole list. */
export class UpdateSkillDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Choose a development area.' })
  @IsNotEmpty({ message: 'Choose a development area.' })
  areaId?: string;

  @IsOptional()
  @Transform(collapse)
  @IsString({ message: NAME })
  @IsNotEmpty({ message: NAME })
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpectationDto)
  expected?: ExpectationDto[];
}

/** "Preview child selection": child, area and (optionally) a subscription to try. */
export class SelectionPreviewDto {
  @Transform(trim)
  @IsString({ message: 'Choose a child.' })
  @IsNotEmpty({ message: 'Choose a child.' })
  childId: string;

  @Transform(trim)
  @IsString({ message: 'Choose a development area.' })
  @IsNotEmpty({ message: 'Choose a development area.' })
  areaId: string;

  /** Empty = the child's current subscription. */
  @IsOptional()
  @IsIn(PLAN_TIERS, { message: 'Choose a minimum plan.' })
  plan?: PlanTier;
}
