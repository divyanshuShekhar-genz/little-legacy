import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PERMISSION_SECTIONS, type PermissionSection } from '../../../common/rules';
import { trim } from '../../../common/utils/json';

const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class UpdateAdminDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter an admin name.' })
  name?: string;

  @IsOptional()
  @Transform(lower)
  @IsEmail({}, { message: 'Enter a valid email.' })
  email?: string;

  @IsOptional()
  @IsArray()
  @IsIn(PERMISSION_SECTIONS, { each: true, message: 'Unknown section permission.' })
  permissions?: PermissionSection[];

  @IsOptional()
  @IsBoolean()
  directPublish?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
