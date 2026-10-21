import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PLAN_TIERS, type PlanTier } from '../../../common/rules';

const blankToNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);
const text = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * The library editor's tree (API_REQUESTS #17 / #18). Ids of existing rows are sent back; new rows
 * carry ids starting with "new-" (or none). Positions follow list order. Chapter names and pages
 * may be empty in a draft — the full checks run on publish, in #17's order.
 */
export class PageImageDto {
  @IsOptional() @IsString() id?: string;
  /** From POST /api/uploads (an image). Stacked images have no description (OPEN_QUESTIONS Q4). */
  @IsString() imageUrl: string;
}

export class PageDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @Transform(blankToNull) @IsString() description?: string | null;

  @IsArray() @ValidateNested({ each: true }) @Type(() => PageImageDto)
  images: PageImageDto[] = [];
}

export class ChapterDto {
  @IsOptional() @IsString() id?: string;
  @Transform(text) @IsString() title: string;
  /** Background music for the chapter (an uploaded audio file, OPEN_QUESTIONS Q5 / Q15). */
  @IsOptional() @Transform(blankToNull) @IsString() musicUrl?: string | null;

  @IsArray() @ValidateNested({ each: true }) @Type(() => PageDto)
  pages: PageDto[] = [];
}

/** POST / PATCH /api/stories, /api/rhymes: the whole item each time. */
export class LibraryItemDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @Transform(text) @IsString() title: string;
  @IsOptional() @Transform(blankToNull) @IsString() categoryId?: string | null;
  @IsOptional() @Transform(blankToNull) @IsString() coverUrl?: string | null;
  @IsOptional() @Transform(blankToNull) @IsString() description?: string | null;

  @IsOptional() @IsIn(PLAN_TIERS, { message: 'Choose a minimum plan.' })
  minimumPlan: PlanTier = 'FREE';

  /** Rhymes only (ignored for stories): uploaded audio or video. */
  @IsOptional() @Transform(blankToNull) @IsString() mediaUrl?: string | null;
  /** Rhymes only (ignored for stories): "Lyrics / text", line breaks kept. */
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? (value.trim() ? value.replace(/\s+$/, '') : null) : value)) @IsString() lyrics?: string | null;

  @IsArray() @ValidateNested({ each: true }) @Type(() => ChapterDto)
  chapters: ChapterDto[] = [];
}

/** The editor's Reject (Super Admin). The reason is optional here. */
export class RejectItemDto {
  @IsOptional() @Transform(blankToNull) @IsString() reason?: string | null;
}

const collapse = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);

/** GET /api/library-categories?kind=STORY | RHYME */
export class CategoryKindQueryDto {
  @IsIn(['STORY', 'RHYME'], { message: 'Choose stories or rhymes.' })
  kind: 'STORY' | 'RHYME';
}

/** "Add story category" / "Add rhyme category". Name messages are checked in the service (#17). */
export class CreateLibraryCategoryDto {
  @IsIn(['publish', 'draft']) mode: 'publish' | 'draft';
  @IsIn(['STORY', 'RHYME'], { message: 'Choose stories or rhymes.' }) kind: 'STORY' | 'RHYME';
  @Transform(collapse) @IsString() name: string;
}

/** "Rename or merge": renaming to another category's name merges the two. */
export class RenameLibraryCategoryDto {
  @IsIn(['publish', 'draft']) mode: 'publish' | 'draft';
  @Transform(collapse) @IsString() name: string;
}

/** Delete; a category in use needs `replacementId` ("Move content to"). */
export class DeleteLibraryCategoryDto {
  @IsIn(['publish', 'draft']) mode: 'publish' | 'draft';
  @IsOptional() @Transform(blankToNull) @IsString() replacementId?: string | null;
}
