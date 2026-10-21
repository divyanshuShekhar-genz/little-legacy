import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Trims and collapses inner whitespace, like the prototype's category names. */
const collapse = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);

const NAME = 'Enter a category name.';
const CODES = 'Use two-letter country codes.';

/** "Add regional category" modal: "Category name" + "Country codes separated by spaces". */
export class CreateRegionDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @Transform(collapse)
  @IsString({ message: NAME })
  @IsNotEmpty({ message: NAME })
  name: string;

  /** e.g. ["JP", "KR"]. Each entry may also hold several codes separated by spaces or commas. */
  @IsOptional()
  @IsArray({ message: CODES })
  @IsString({ each: true, message: CODES })
  countryCodes: string[] = [];

  /** New categories start inactive (empty catalogue) unless set; see RegionsService. */
  @IsOptional()
  @IsBoolean()
  active: boolean = false;
}

/** "Edit countries", rename, make default, activate / deactivate. Omitted fields stay as they are. */
export class UpdateRegionDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @IsOptional()
  @Transform(collapse)
  @IsString({ message: NAME })
  @IsNotEmpty({ message: NAME })
  name?: string;

  @IsOptional()
  @IsArray({ message: CODES })
  @IsString({ each: true, message: CODES })
  countryCodes?: string[];

  /** Only `true` does anything: the default moves here. Unset it by making another region the default. */
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class DeleteRegionDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';
}

/** "Export regional learning": every category, or one. */
export class RegionExportQueryDto {
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value)) @IsString() regionId?: string;
}
