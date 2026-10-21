import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { PERMISSION_SECTIONS, type PermissionSection } from '../../../common/rules';
import { trim } from '../../../common/utils/json';

const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class CreateAdminDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter an admin name.' })
  name: string;

  @Transform(lower)
  @IsEmail({}, { message: 'Enter a valid email.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Use at least 8 characters.' })
  password: string;

  @IsOptional()
  @IsArray()
  @IsIn(PERMISSION_SECTIONS, { each: true, message: 'Unknown section permission.' })
  permissions: PermissionSection[] = [];

  /** "Allow direct publishing". Off → every change becomes a DraftApproval. */
  @IsOptional()
  @IsBoolean()
  directPublish: boolean = false;
}
