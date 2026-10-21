import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

/** The parent's answer to the difficulty question (prototype folder-alignment.js filter). */
export const DIFFICULTY_ANSWERS = ['Just right', 'Easy', 'Challenging'] as const;

export class ListActivityReviewsQueryDto {
  /** Exact match. Blank = all. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() ? value.trim() : undefined))
  @IsIn(DIFFICULTY_ANSWERS, { message: 'Choose Just right, Easy or Challenging.' })
  difficulty?: (typeof DIFFICULTY_ANSWERS)[number];
}
