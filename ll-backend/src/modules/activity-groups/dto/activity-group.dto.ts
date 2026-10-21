import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { trim } from '../../../common/utils/json';

const blankToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
const collapse = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
/** API_REQUESTS #14 message for any of these fields. */
const GROUP = 'Enter a name, whole age, benchmark from 0–100 and at least one Base.';

/** "Activity group" modal (prototype progressionFamily). */
export class ActivityGroupDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @Transform(collapse)
  @IsString({ message: GROUP })
  @IsNotEmpty({ message: GROUP })
  name: string;

  @Transform(trim)
  @IsString({ message: 'Choose a development area.' })
  @IsNotEmpty({ message: 'Choose a development area.' })
  areaId: string;

  @IsInt({ message: GROUP })
  @Min(0, { message: GROUP })
  @Max(2_147_483_647, { message: GROUP })
  age: number;

  /** Required when the area has categories; empty otherwise. */
  @IsOptional() @Transform(blankToNull) @IsString() categoryId?: string | null;

  /** "Primary skill" (empty = not tagged). */
  @IsOptional() @Transform(blankToNull) @IsString() skillId?: string | null;

  /** "Expected skill score %" used to prioritise selection (default 50). */
  @IsOptional()
  @IsInt({ message: GROUP })
  @Min(0, { message: GROUP })
  @Max(100, { message: GROUP })
  benchmark: number = 50;

  /** "Mandatory during initial assessment". */
  @IsOptional() @IsBoolean() mandatory: boolean = false;

  /** "Starting Base eligibility": at least one of 'Base 1' | 'Base 2' | 'Base 3'. */
  @IsArray({ message: GROUP })
  @ArrayMinSize(1, { message: GROUP })
  @IsIn(['Base 1', 'Base 2', 'Base 3'], { each: true, message: GROUP })
  bases: string[];
}

export class GroupModeDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';
}

/** "Link existing content": an ungrouped activity becomes one of the group's difficulties. */
export class LinkActivityDto extends GroupModeDto {
  @Transform(trim)
  @IsString({ message: 'Choose an activity.' })
  @IsNotEmpty({ message: 'Choose an activity.' })
  activityId: string;
}
