import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PARENT_LANGUAGES, PASSWORD_MIN_LENGTH } from '../../common/rules';

/** DTO fields shared by the parent-app screens, with the messages the app shows. */

const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);
const collapse = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
/** "+91 98765-43210" → "+919876543210". */
const phoneDigits = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.replace(/[\s\-().]/g, '') : value);

export const PASSWORD_RULE = `Use at least ${PASSWORD_MIN_LENGTH} characters for your password.`;
export const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export const EmailField = () =>
  applyDecorators(Transform(lower), IsEmail({}, { message: 'Enter a valid email address.' }), MaxLength(254, { message: 'Enter a valid email address.' }));

export const PasswordField = (message = PASSWORD_RULE) =>
  applyDecorators(IsString({ message }), MinLength(PASSWORD_MIN_LENGTH, { message }), MaxLength(128, { message: 'Use 128 characters or fewer for your password.' }));

export const NameField = (message: string) =>
  applyDecorators(Transform(collapse), IsString({ message }), IsNotEmpty({ message }), MaxLength(80, { message: 'Use 80 characters or fewer for the name.' }));

/** "YYYY-MM-DD" (the app converts the DD / MM / YYYY field). Checked as a real date by the service. */
export const DateField = (message: string) => applyDecorators(IsString({ message }), Matches(DATE_FORMAT, { message }));

export const PhoneField = () =>
  applyDecorators(
    Transform(phoneDigits),
    IsString({ message: 'Enter your phone number.' }),
    Matches(/^\+[1-9]\d{6,14}$/, { message: 'Enter your phone number with the country code, e.g. +919876543210.' }),
  );

export const CountryField = () => applyDecorators(Transform(upper), IsString({ message: 'Choose your country.' }), Matches(/^[A-Z]{2}$/, { message: 'Choose your country.' }));

export const LanguageField = () =>
  applyDecorators(IsIn(PARENT_LANGUAGES.map((l) => l.code), { message: 'Choose a language from the list.' }));

/** A "YYYY-MM-DD" string as a UTC date, or null when it isn't a real calendar day (e.g. 2026-02-30). */
export function parseDay(s: string): Date | null {
  if (!DATE_FORMAT.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}

/** Today as a UTC day. */
export const today = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
