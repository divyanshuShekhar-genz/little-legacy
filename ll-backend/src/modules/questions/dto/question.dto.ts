import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { QUESTION_DIFFICULTIES, type QuestionDifficulty } from '../../../common/rules';
import { trim } from '../../../common/utils/json';

const blankToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
/** Prototype message for anything wrong with the answer options. */
const OPTIONS = 'Add at least two options with non-negative marks: label | marks';
const AGE = 'Enter a non-negative age in years.';
const AREA = 'Choose a development area.';

/** GET /api/questions?areaId=&age= — or ?regionId= for every current area (Questionnaire links table). */
export class QuestionQueryDto {
  @IsOptional() @Transform(blankToNull) @IsString() areaId?: string | null;
  @IsOptional() @Transform(blankToNull) @IsString() regionId?: string | null;

  /** Questions for this age, plus those for "All supported ages". */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: AGE })
  @Min(0, { message: AGE })
  age?: number;
}

/** One "label | marks" line. `id` = an existing option of this question (keeps its skill mapping). */
export class OptionDto {
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  id?: string | null;

  @Transform(trim)
  @IsString({ message: OPTIONS })
  @IsNotEmpty({ message: OPTIONS })
  label: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: OPTIONS })
  @Min(0, { message: OPTIONS })
  @Max(999_999.99, { message: OPTIONS }) // the marks column holds up to 999999.99
  marks: number;
}

/** Question modal (prototype Questionnaires & Levels). PATCH takes the whole question too. */
export class UpdateQuestionDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @Transform(trim)
  @IsString({ message: 'Enter a question.' })
  @IsNotEmpty({ message: 'Enter a question.' })
  text: string;

  /** "Difficulty · admin only". */
  @IsIn(QUESTION_DIFFICULTIES, { message: 'Choose Easy, Medium or Hard.' })
  difficulty: QuestionDifficulty;

  /** "Age in completed years". Empty = all supported ages. */
  @IsOptional()
  @IsInt({ message: AGE })
  @Min(0, { message: AGE })
  @Max(2_147_483_647, { message: AGE })
  age?: number | null;

  @IsArray({ message: OPTIONS })
  @ArrayMinSize(2, { message: OPTIONS })
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options: OptionDto[];
}

export class CreateQuestionDto extends UpdateQuestionDto {
  @Transform(trim)
  @IsString({ message: AREA })
  @IsNotEmpty({ message: AREA })
  areaId: string;
}

/**
 * "Map answers" (Skill Personalisation): the question's skill and a stage per answer option.
 * `stages` = { [optionId]: 'STARTING' | 'PRACTISING' | 'CONFIDENT' | null } (null / left out = Unknown).
 */
export class SkillMapDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  /** Empty = "Not mapped": the question's skill and every answer stage are cleared. */
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  skillId?: string | null;

  @IsOptional()
  @IsObject({ message: 'Choose a stage for each answer.' })
  stages: Record<string, 'STARTING' | 'PRACTISING' | 'CONFIDENT' | null> = {};
}

export class DeleteQuestionDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';
}
