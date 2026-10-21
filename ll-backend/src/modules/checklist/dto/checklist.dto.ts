import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { trim } from '../../../common/utils/json';

/** Prototype message (checklist.js `checklistEditor()`). */
export const ITEM = 'Enter a title, instructions and a whole-number order of at least 1.';
const WEEK = 'Choose Week 1, Week 2 or Later weeks.';
export const REGION = 'Choose a regional learning category.';
const STATUS = 'Choose Draft or Published.';
const LIMIT = 'Enter a whole number of at least 1.';

const MODE = ['publish', 'draft'] as const;

export class ChecklistQueryDto {
  @Transform(trim) @IsString({ message: REGION }) @IsNotEmpty({ message: REGION }) regionId: string;
}

/** Add / edit an item (API_REQUESTS #25). PATCH sends the item's own `regionId`: an item stays in its category. */
export class ChecklistItemDto {
  @IsIn(MODE) mode: 'publish' | 'draft';
  @Transform(trim) @IsString({ message: REGION }) @IsNotEmpty({ message: REGION }) regionId: string;
  @IsIn([1, 2, 3], { message: WEEK }) week: 1 | 2 | 3;
  @Transform(trim) @IsString({ message: ITEM }) @IsNotEmpty({ message: ITEM }) title: string;
  @Transform(trim) @IsString({ message: ITEM }) @IsNotEmpty({ message: ITEM }) description: string;
  @IsInt({ message: ITEM }) @Min(1, { message: ITEM }) position: number;
  @IsIn(['DRAFT', 'PUBLISHED'], { message: STATUS }) status: 'DRAFT' | 'PUBLISHED';
}

export class DeleteChecklistItemDto {
  @IsIn(MODE) mode: 'publish' | 'draft';
}

/** "Maximum items visible at once" for one category. */
export class ChecklistLimitDto {
  @IsIn(MODE) mode: 'publish' | 'draft';
  @Transform(trim) @IsString({ message: REGION }) @IsNotEmpty({ message: REGION }) regionId: string;
  @IsInt({ message: LIMIT }) @Min(1, { message: LIMIT }) visibleLimit: number;
}
