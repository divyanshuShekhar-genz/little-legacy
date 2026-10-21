import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import type { SessionAdmin } from '../../common/types/session-admin';
import { MAX_UPLOAD_BYTES } from '../../common/rules';
import { UploadsService } from './uploads.service';
import { UploadFileDto } from './dto/upload-file.dto';

/**
 * POST /api/uploads — multipart `file` (+ optional `kind`). Any signed-in admin may upload:
 * files only become reachable from content once that content passes its own permission and
 * draft checks. Held in memory until validated (FileInterceptor's default storage).
 */
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  upload(@CurrentAdmin() admin: SessionAdmin, @UploadedFile() file: Express.Multer.File | undefined, @Body() dto: UploadFileDto) {
    return this.uploads.upload(admin, file, dto.kind);
  }
}
