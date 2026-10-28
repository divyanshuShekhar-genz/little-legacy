import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { CHILD_GENDERS, type ChildGender } from '../../../common/rules';
import { DateField, NameField } from '../../common/fields';

const YEARS = "Enter your child's age in years.";
const MONTHS = 'Enter the months as a number from 0 to 11.';
const GENDER = 'Choose a gender from the list.';
const DOB = "Enter your child's date of birth.";

/** Age in years and months, for categories that don't collect the date of birth (Q24). */
export class ChildAgeDto {
  @IsInt({ message: YEARS })
  @Min(0, { message: YEARS })
  @Max(17, { message: YEARS })
  years: number;

  @IsInt({ message: MONTHS })
  @Min(0, { message: MONTHS })
  @Max(11, { message: MONTHS })
  months: number;
}

/**
 * "Add a little one". Send `dob` when the parent's `childCategory.collectDob` is true, else `age`.
 */
export class CreateChildDto {
  @NameField("Enter your child's name.")
  name: string;

  @IsOptional()
  @DateField(DOB)
  dob?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChildAgeDto)
  age?: ChildAgeDto;

  /** Optional (CR7). */
  @IsOptional()
  @IsIn(CHILD_GENDERS, { message: GENDER })
  gender?: ChildGender;
}

/**
 * Edit a child. Omitted fields stay as they are; `gender: null` clears it. A new `dob` / `age` is
 * the one-time correction (guide §7), except replacing an estimated date with the real one.
 */
export class UpdateChildDto {
  @IsOptional()
  @NameField("Enter your child's name.")
  name?: string;

  @IsOptional()
  @DateField(DOB)
  dob?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChildAgeDto)
  age?: ChildAgeDto;

  @IsOptional()
  @IsIn(CHILD_GENDERS, { message: GENDER })
  gender?: ChildGender | null;
}
