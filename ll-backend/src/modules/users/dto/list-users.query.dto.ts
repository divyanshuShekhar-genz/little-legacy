import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { trim } from '../../../common/utils/json';

export class ListUsersQueryDto {
  /** Matches parent name, email or child name (case-insensitive). */
  @IsOptional()
  @Transform(trim)
  @IsString()
  search?: string;

  /** Completed years. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  age?: number;
}
