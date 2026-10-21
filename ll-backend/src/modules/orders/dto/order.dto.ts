import { Transform, Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { ORDER_STATUSES, type OrderStatus } from '../../../common/rules';
import { trim } from '../../../common/utils/json';

const blankToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

const STATUS = 'Choose an order status.';
const ADDRESS = 'Enter the recipient, address line 1, city and postcode.';
const LINK = 'Enter a valid tracking link.';

/** Order.address, edited as separate fields in the order modal. */
export class OrderAddressDto {
  @Transform(trim) @IsString({ message: ADDRESS }) @IsNotEmpty({ message: ADDRESS }) recipient: string;
  @Transform(trim) @IsString({ message: ADDRESS }) @IsNotEmpty({ message: ADDRESS }) line1: string;
  @IsOptional() @Transform(blankToNull) @IsString({ message: ADDRESS }) line2?: string | null;
  @Transform(trim) @IsString({ message: ADDRESS }) @IsNotEmpty({ message: ADDRESS }) city: string;
  @IsOptional() @Transform(blankToNull) @IsString({ message: ADDRESS }) state?: string | null;
  @Transform(trim) @IsString({ message: ADDRESS }) @IsNotEmpty({ message: ADDRESS }) postcode: string;
  @IsOptional() @Transform(blankToNull) @IsString({ message: ADDRESS }) phone?: string | null;
}

/** The order modal's Save (API_REQUESTS #22). Fields left out keep their value; blank tracking fields clear them. */
export class UpdateOrderDto {
  @IsOptional() @IsIn(ORDER_STATUSES, { message: STATUS }) status?: OrderStatus;

  @IsOptional() @Transform(blankToNull) @IsString() @MaxLength(200) trackingRef?: string | null;

  @IsOptional() @Transform(blankToNull) @IsString({ message: LINK }) @MaxLength(2000, { message: LINK }) @Matches(/^https?:\/\/\S+$/i, { message: LINK })
  trackingUrl?: string | null;

  @IsOptional() @IsObject({ message: ADDRESS }) @ValidateNested() @Type(() => OrderAddressDto) address?: OrderAddressDto;
}

export class ListOrdersDto {
  @IsOptional() @Transform(blankToNull) @IsIn(ORDER_STATUSES, { message: STATUS }) status?: OrderStatus | null;
  @IsOptional() @Transform(blankToNull) @IsString() country?: string | null;
  @IsOptional() @Transform(blankToNull) @IsString() search?: string | null;
}
