import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { trim } from '../../../common/utils/json';

// Prototype messages (parent-content.js `appEntryEditor()`).
const KEY = 'Use a unique key with letters, numbers, dots, underscores or hyphens.';
const TEXT = 'Enter a title and body.';
const SURFACE = 'Choose Terms, Privacy, Help / enquiry or Page FAQs.';

export const SURFACES = ['TERMS', 'PRIVACY', 'HELP', 'PAGE_FAQ'] as const;
export type Surface = (typeof SURFACES)[number];

/** Edit a working-draft entry (no approval: parents never see the draft). */
export class UpdateEntryDto {
  @IsIn(SURFACES, { message: SURFACE }) surface: Surface;
  /** Parent-app route; only kept for PAGE_FAQ (checked in the service). */
  @IsOptional() @Transform(trim) page?: string | null;
  @Transform(trim) @IsString({ message: TEXT }) @IsNotEmpty({ message: TEXT }) title: string;
  @Transform(trim) @IsString({ message: TEXT }) @IsNotEmpty({ message: TEXT }) body: string;
}

/** Add an entry. The key can't change afterwards. */
export class CreateEntryDto extends UpdateEntryDto {
  @Transform(trim) @IsString({ message: KEY }) @Matches(/^[a-zA-Z][\w.-]*$/, { message: KEY }) key: string;
}

export class PublishDto {
  @IsIn(['publish', 'draft']) mode: 'publish' | 'draft';
}
