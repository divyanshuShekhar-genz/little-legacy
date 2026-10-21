import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { trim } from '../../../common/utils/json';

const AGE = 'Enter a non-negative age in years.';
const REGION = 'Choose a regional learning category.';

/** "Add age group" modal: "Age in years". Whole completed years, 0 or more; no upper age limit. */
export class CreateAgeGroupDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @Transform(trim)
  @IsString({ message: REGION })
  @IsNotEmpty({ message: REGION })
  regionId: string;

  @IsInt({ message: AGE })
  @Min(0, { message: AGE })
  @Max(2_147_483_647, { message: AGE }) // database integer limit only, not an age limit
  age: number;
}
