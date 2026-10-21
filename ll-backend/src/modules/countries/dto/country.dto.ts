import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { trim } from '../../../common/utils/json';

const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);
const blankToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

const CHARGE = 'Enter a delivery charge of 0 or more.';

/**
 * Country modal (prototype commerce: "Add country" / "Edit country & delivery").
 * Code and currency are checked against ISO lists in CountriesService.
 */
export class CreateCountryDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @Transform(trim)
  @IsString({ message: 'Enter a country name.' })
  @IsNotEmpty({ message: 'Enter a country name.' })
  name: string;

  @Transform(upper)
  @IsString({ message: 'Use a two-letter country code.' })
  code: string;

  @Transform(upper)
  @IsString({ message: 'Use a valid ISO 4217 currency code.' })
  currency: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: CHARGE })
  @Min(0, { message: CHARGE })
  @Max(9_999_999_999.99, { message: CHARGE })
  deliveryCharge: number;

  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  deliveryEstimate: string | null = null;

  /** "Availability". */
  @IsOptional()
  @IsBoolean()
  enabled: boolean = true;
}

/** Code and currency can't change after creation; sending a different value is refused. */
export class UpdateCountryDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Enter a country name.' })
  @IsNotEmpty({ message: 'Enter a country name.' })
  name?: string;

  @IsOptional()
  @Transform(upper)
  @IsString()
  code?: string;

  @IsOptional()
  @Transform(upper)
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: CHARGE })
  @Min(0, { message: CHARGE })
  @Max(9_999_999_999.99, { message: CHARGE })
  deliveryCharge?: number;

  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  deliveryEstimate?: string | null;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
