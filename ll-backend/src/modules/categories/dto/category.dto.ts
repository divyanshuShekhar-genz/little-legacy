import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { trim } from '../../../common/utils/json';

const collapse = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
const blankToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

const NAME = 'Enter a category name.';
const AREA = 'Choose a development area.';

export class AreaQueryDto {
  @Transform(trim)
  @IsString({ message: AREA })
  @IsNotEmpty({ message: AREA })
  areaId: string;
}

/** Category modal (prototype Developmental Milestones): "Category name", "Description". */
export class CreateCategoryDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @Transform(trim)
  @IsString({ message: AREA })
  @IsNotEmpty({ message: AREA })
  areaId: string;

  @Transform(collapse)
  @IsString({ message: NAME })
  @IsNotEmpty({ message: NAME })
  name: string;

  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  description: string | null = null;
}

/** Omitted fields stay as they are. A category can't move to another area. */
export class UpdateCategoryDto {
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

export class DeleteCategoryDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';
}
