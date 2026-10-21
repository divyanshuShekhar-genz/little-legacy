import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import { trim } from '../../../common/utils/json';

/** Icons offered in the prototype's level modal. */
export const LEVEL_ICONS = ['Brain', 'Smile', 'Moon', 'Target', 'Footprints', 'Palette', 'Heart', 'Users', 'Eye', 'Lightbulb'] as const;
export const DEFAULT_ICON_COLOUR = '#5B4DB4';

const blankToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
const WHOLE = 'Level and mastery count must be whole numbers.';
const SCORE = 'Enter a whole-number required score of 0 or more.';
const AREA = 'Choose a development area.';
const INT_MAX = 2_147_483_647; // database integer limit

/** GET /api/levels?areaId=&categoryId=&age= */
export class LevelQueryDto {
  @Transform(trim)
  @IsString({ message: AREA })
  @IsNotEmpty({ message: AREA })
  areaId: string;

  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  categoryId?: string | null;

  /** The age tab: only changes each level's activity count. Levels are shared by all ages. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Enter a non-negative age in years.' })
  @Min(0, { message: 'Enter a non-negative age in years.' })
  age?: number;
}

class LevelFields {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  title?: string | null;

  @IsOptional()
  @Transform(blankToNull)
  @IsIn([...LEVEL_ICONS, null], { message: 'Choose one of the level icons.' })
  icon?: (typeof LEVEL_ICONS)[number] | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^#[0-9A-F]{6}$/, { message: 'Choose an icon colour.' })
  iconColor?: string;
}

/** Level modal (prototype): number, name / title, icon, icon colour, required score, required mastered activities. */
export class CreateLevelDto extends LevelFields {
  @Transform(trim)
  @IsString({ message: AREA })
  @IsNotEmpty({ message: AREA })
  areaId: string;

  /** Required once the area has categories; must be empty while it has none. */
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  categoryId?: string | null;

  @IsInt({ message: WHOLE })
  @Min(1, { message: WHOLE })
  @Max(INT_MAX, { message: WHOLE })
  number: number;

  @IsInt({ message: SCORE })
  @Min(0, { message: SCORE })
  @Max(INT_MAX, { message: SCORE })
  requiredScore: number;

  @IsInt({ message: WHOLE })
  @Min(0, { message: WHOLE })
  @Max(INT_MAX, { message: WHOLE })
  requiredMastered: number;
}

/** Omitted fields stay as they are. A level can't move to another area or category. */
export class UpdateLevelDto extends LevelFields {
  @IsOptional()
  @IsInt({ message: WHOLE })
  @Min(1, { message: WHOLE })
  @Max(INT_MAX, { message: WHOLE })
  number?: number;

  @IsOptional()
  @IsInt({ message: SCORE })
  @Min(0, { message: SCORE })
  @Max(INT_MAX, { message: SCORE })
  requiredScore?: number;

  @IsOptional()
  @IsInt({ message: WHOLE })
  @Min(0, { message: WHOLE })
  @Max(INT_MAX, { message: WHOLE })
  requiredMastered?: number;
}

export class DeleteLevelDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';
}
