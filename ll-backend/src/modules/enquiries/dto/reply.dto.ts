import { Transform } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsIn, IsNotEmpty, IsString } from 'class-validator';
import { NOTIFICATION_CHANNELS, type NotificationChannel } from '../../../common/rules';
import { trim } from '../../../common/utils/json';

const CHANNELS = 'Select Email, In-app notification, or both.';

/** "Reply to enquiry" popup (prototype admin-rebuild.js `enquiryWorkspace`). */
export class ReplyDto {
  @IsIn(['publish', 'draft'])
  mode: 'publish' | 'draft';

  @IsArray({ message: CHANNELS })
  @ArrayMinSize(1, { message: CHANNELS })
  @ArrayUnique({ message: CHANNELS })
  @IsIn(NOTIFICATION_CHANNELS, { each: true, message: CHANNELS })
  channels: NotificationChannel[];

  @Transform(trim)
  @IsString({ message: 'Enter a reply.' })
  @IsNotEmpty({ message: 'Enter a reply.' })
  body: string;
}
