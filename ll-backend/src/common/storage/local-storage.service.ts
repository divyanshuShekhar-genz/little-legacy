import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { env } from '../config/env';
import type { StorageDriver } from './storage.interface';

/** Absolute folder for local uploads (also served by main.ts at UPLOAD_PUBLIC_PATH). */
export const localUploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);

/** Development driver: files on disk under ll-backend/uploads/, served as static files. */
@Injectable()
export class LocalStorageService implements StorageDriver {
  readonly name = 'local';

  private resolve(key: string) {
    const file = path.resolve(localUploadRoot, key);
    // Keys are generated server-side, but never let one escape the upload folder.
    if (!file.startsWith(localUploadRoot + path.sep)) throw new Error(`Invalid storage key: ${key}`);
    return file;
  }

  async put(key: string, body: Buffer) {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body, { flag: 'wx' }); // never overwrite an existing file
    return { url: `${env.UPLOAD_PUBLIC_PATH}/${key}` };
  }

  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }
}
