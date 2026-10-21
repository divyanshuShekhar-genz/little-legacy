import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { fromBuffer } from 'file-type';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE, type StorageDriver } from '../../common/storage/storage.interface';
import { UPLOAD_RULES, uploadKindFor, type UploadKind } from '../../common/rules';
import type { SessionAdmin } from '../../common/types/session-admin';

/**
 * Stores an uploaded file. Nothing touches storage before the type check passes, and the type
 * comes from the file's bytes — never the browser-supplied name or Content-Type.
 */
@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE) private readonly storage: StorageDriver,
  ) {}

  async upload(admin: SessionAdmin, file: Express.Multer.File | undefined, expectedKind?: UploadKind) {
    if (!file) throw new BadRequestException('Choose a file to upload.');

    const detected = await fromBuffer(file.buffer);
    const kind = detected ? uploadKindFor(detected.mime) : null;
    if (!detected || !kind) throw new BadRequestException('This file type is not supported.');
    if (expectedKind && kind !== expectedKind) {
      throw new BadRequestException(`Choose a file of type: ${UPLOAD_RULES[expectedKind].label}.`);
    }
    if (file.size > UPLOAD_RULES[kind].maxBytes) {
      throw new BadRequestException(`File is too large. ${UPLOAD_RULES[kind].label}.`);
    }

    const now = new Date();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const key = `${kind.toLowerCase()}s/${now.getUTCFullYear()}/${month}/${randomUUID()}.${detected.ext}`;
    const { url } = await this.storage.put(key, file.buffer, detected.mime);

    try {
      const upload = await this.prisma.upload.create({
        data: {
          key,
          url,
          kind,
          mimeType: detected.mime,
          sizeBytes: file.size,
          originalName: file.originalname.slice(0, 255),
          driver: this.storage.name,
          uploadedById: admin.id,
        },
      });
      return { upload };
    } catch (e) {
      await this.storage.delete(key); // don't leave orphaned bytes if the row fails
      throw e;
    }
  }
}
