import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { trim } from '../../../common/utils/json';

export class ListChildrenQueryDto {
  /** Matches child or parent name (case-insensitive). */
  @IsOptional()
  @Transform(trim)
  @IsString()
  search?: string;

  /** Development area name: children with a recorded result in that area. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  area?: string;
}
