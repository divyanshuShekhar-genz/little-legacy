import { IsIn, IsInt, Max, Min } from 'class-validator';

const LIMIT = 'Enter a whole number from 1 to 100.';

/** Maximum regular messages visible at once. Pinned posts are not counted or hidden by it. */
export class VisibleLimitDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @IsInt({ message: LIMIT })
  @Min(1, { message: LIMIT })
  @Max(100, { message: LIMIT })
  regularVisibleLimit: number;
}
