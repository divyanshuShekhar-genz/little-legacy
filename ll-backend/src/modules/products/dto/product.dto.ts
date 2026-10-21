import { Transform, Type } from 'class-transformer';
import { Allow, IsArray, IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

const blankToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
const text = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ProductImageDto {
  /** From POST /api/uploads (an image). The first image is the cover. */
  @IsString() url: string;
}

/**
 * Product modal (prototype productEditor; API_REQUESTS #21): the whole product each time.
 * Checks and their prototype messages run in ProductsService, in #21's order.
 */
export class ProductDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @Transform(text) @IsString() title: string;
  @Transform(text) @IsString() sku: string;
  @IsOptional() @Transform(blankToNull) @IsString() category?: string | null;
  @IsOptional() @Transform(blankToNull) @IsString() ageRecommendation?: string | null;
  @IsOptional() @Transform(blankToNull) @IsString() description?: string | null;
  /** "Full details / what is included". */
  @IsOptional() @Transform(blankToNull) @IsString() details?: string | null;
  /** "Materials and care / safety information". */
  @IsOptional() @Transform(blankToNull) @IsString() materials?: string | null;

  /** Shared across countries. Checked in the service ("Stock must be a non-negative whole number."). */
  @Allow()
  stock: unknown;

  /** Draft / Published / Archived (= WITHDRAWN). */
  @IsIn(['DRAFT', 'PUBLISHED', 'WITHDRAWN'], { message: 'Choose Draft, Published or Archived.' })
  status: 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN';

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductImageDto)
  images: ProductImageDto[] = [];

  /** { countryCode: amount }: a missing country = not for sale there; 0 = free. */
  @IsOptional() @IsObject({ message: 'Prices must be zero or greater.' })
  prices: Record<string, number | string> = {};
}

/** The editor's Reject (Super Admin). The reason is optional here. */
export class RejectProductDto {
  @IsOptional() @Transform(blankToNull) @IsString() reason?: string | null;
}
