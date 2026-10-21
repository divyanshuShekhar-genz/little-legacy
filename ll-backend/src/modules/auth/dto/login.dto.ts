import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { trim } from '../../../common/utils/json';

export class LoginDto {
  @Transform(trim)
  @IsEmail({}, { message: 'Enter a valid email.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Enter your password.' })
  password: string;

  /** "Remember me": a 7-day session instead of 12 hours (JWT_REMEMBER_EXPIRES_IN). */
  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}
