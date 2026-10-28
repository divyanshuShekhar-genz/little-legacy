import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CountryField, DateField, LanguageField, NameField, PasswordField, PhoneField } from '../../common/fields';

/**
 * Profile edits, and "complete your profile" after Google / Apple. Omitted fields stay as they are.
 * Changing the country never moves existing children to another category (guide §5).
 * The email can't be changed yet (it would need verifying).
 */
export class UpdateAccountDto {
  @IsOptional()
  @NameField('Enter your full name.')
  name?: string;

  @IsOptional()
  @DateField('Enter your date of birth.')
  dob?: string;

  @IsOptional()
  @PhoneField()
  phone?: string;

  @IsOptional()
  @CountryField()
  countryCode?: string;

  @IsOptional()
  @LanguageField()
  language?: string;

  /** Only `true` does anything; acceptance can't be withdrawn here (delete the account instead). */
  @IsOptional()
  @IsBoolean({ message: 'Please accept the terms and conditions and privacy policy.' })
  acceptTerms?: boolean;
}

export class ChangePasswordDto {
  /** Required when the account has a password (`hasPassword`); Google / Apple-only accounts set their first one without it. */
  @IsOptional()
  @IsString({ message: 'Enter your current password.' })
  currentPassword?: string;

  @PasswordField()
  newPassword: string;
}

export class DeleteAccountDto {
  /** Required when the account has a password. */
  @IsOptional()
  @IsString({ message: 'Enter your password to delete your account.' })
  password?: string;
}
