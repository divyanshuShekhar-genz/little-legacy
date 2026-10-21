import { IsIn, IsOptional } from 'class-validator';
import { UPLOAD_KINDS, type UploadKind } from '../../../common/rules';

/** Multipart fields besides `file`. `kind` restricts the upload (an image picker sends IMAGE). */
export class UploadFileDto {
  @IsOptional()
  @IsIn(UPLOAD_KINDS)
  kind?: UploadKind;
}
