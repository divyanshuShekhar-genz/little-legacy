import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';

const MEMORY = 'Use a whole number or Unlimited for memory items.';

/**
 * "Edit plan" (prototype planEditor; API_REQUESTS #20). `prices` is the FULL map
 * { countryCode: amount }: a country left out is not purchasable there; 0 = free. Amounts are
 * checked in PlansService ("Enter a non-negative price.").
 */
export class UpdatePlanDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  /** "Status": Active / Inactive. Free is always active. Omitted = unchanged. */
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /** "Memory items allowed" per child; null = Unlimited. Omitted (undefined) = unchanged. */
  @IsOptional()
  @IsInt({ message: MEMORY })
  @Min(0, { message: MEMORY })
  @Max(2_147_483_647, { message: MEMORY })
  memoryLimit?: number | null;

  /** Omitted = unchanged. */
  @IsOptional()
  @IsObject({ message: 'Enter a non-negative price.' })
  prices?: Record<string, number | string>;
}

/**
 * "Edit prices · {country}" (prototype countryPricingEditor). Each group is optional: the UI sends
 * only what the admin can edit. null = not purchasable in this country.
 */
export class CountryPricesDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @IsOptional()
  @IsObject({ message: 'Enter prices of zero or more.' })
  plans?: Record<string, number | string | null>;

  @IsOptional()
  @IsObject({ message: 'Enter prices of zero or more.' })
  products?: Record<string, number | string | null>;
}
