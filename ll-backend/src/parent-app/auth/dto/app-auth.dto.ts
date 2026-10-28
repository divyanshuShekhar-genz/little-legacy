import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { CountryField, DateField, EmailField, LanguageField, NameField, PasswordField, PhoneField } from '../../common/fields';

/** "Grow together · Create your parent account". Confirm password is checked in the app. */
export class RegisterDto {
  @NameField('Enter your full name.')
  name: string;

  @DateField('Enter your date of birth.')
  dob: string;

  @PhoneField()
  phone: string;

  @EmailField()
  email: string;

  @PasswordField()
  password: string;

  /** Optional until the sign-up screen has a country picker; required before adding a child. */
  @IsOptional()
  @CountryField()
  countryCode?: string;

  @IsOptional()
  @LanguageField()
  language?: string;

  /** "I accept terms and conditions and privacy policy". Must be true. */
  @IsBoolean({ message: 'Please accept the terms and conditions and privacy policy.' })
  acceptTerms: boolean;
}

/** "Welcome back". */
export class AppLoginDto {
  @EmailField()
  email: string;

  @IsString({ message: 'Enter your password.' })
  @IsNotEmpty({ message: 'Enter your password.' })
  password: string;
}

/** Google / Apple: the ID token the platform SDK returned to the app. */
export class SocialLoginDto {
  @IsString({ message: 'Sign-in failed. Please try again.' })
  @IsNotEmpty({ message: 'Sign-in failed. Please try again.' })
  idToken: string;

  /** Apple gives the name to the app only on the first sign-in, never in the token; send it then. */
  @IsOptional()
  @NameField('Enter your full name.')
  name?: string;
}

export class RefreshDto {
  @IsString({ message: 'Your session has ended. Please sign in again.' })
  @IsNotEmpty({ message: 'Your session has ended. Please sign in again.' })
  refreshToken: string;
}

/** "Check your inbox" — asks for the code (and "Resend OTP"). */
export class ForgotPasswordDto {
  @EmailField()
  email: string;
}

/** "Check your inbox" → "Verify email". */
export class VerifyCodeDto {
  @EmailField()
  email: string;

  @IsString({ message: 'Enter the 6-digit code.' })
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code.' })
  code: string;
}

/** "Choose a new password". Confirm password is checked in the app. */
export class ResetPasswordDto {
  @IsString({ message: 'Your reset has expired. Please start again.' })
  @IsNotEmpty({ message: 'Your reset has expired. Please start again.' })
  resetToken: string;

  @PasswordField()
  password: string;
}
