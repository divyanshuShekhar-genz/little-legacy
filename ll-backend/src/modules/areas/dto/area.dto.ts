import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { trim } from '../../../common/utils/json';

const collapse = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
const blankToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

const NAME = 'Enter a development area name.';
const REGION = 'Choose a regional learning category.';

/** `?regionId=` on list endpoints in Activity Management. */
export class RegionQueryDto {
  @Transform(trim)
  @IsString({ message: REGION })
  @IsNotEmpty({ message: REGION })
  regionId: string;
}

/** Area editor (prototype Activity Management hub): "Development area name", "Description". */
export class CreateAreaDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @Transform(trim)
  @IsString({ message: REGION })
  @IsNotEmpty({ message: REGION })
  regionId: string;

  @Transform(collapse)
  @IsString({ message: NAME })
  @IsNotEmpty({ message: NAME })
  name: string;

  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  description: string | null = null;
}

/** Omitted fields stay as they are. An area can't move to another region. */
export class UpdateAreaDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @IsOptional()
  @Transform(collapse)
  @IsString({ message: NAME })
  @IsNotEmpty({ message: NAME })
  name?: string;

  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  description?: string | null;
}

export class DeleteAreaDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';
}
