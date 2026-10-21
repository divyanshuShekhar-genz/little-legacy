import { Module } from '@nestjs/common';
import { env } from '../config/env';
import { STORAGE } from './storage.interface';
import { LocalStorageService } from './local-storage.service';

/** Picks the storage driver from STORAGE_DRIVER. Add cloud drivers (S3 etc.) here. */
@Module({
  providers: [
    {
      provide: STORAGE,
      useClass: { local: LocalStorageService }[env.STORAGE_DRIVER],
    },
  ],
  exports: [STORAGE],
})
export class StorageModule {}
