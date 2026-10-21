/**
 * Storage drivers hold the bytes of uploaded files. Modules never touch the disk or a cloud SDK
 * directly — they inject `STORAGE` — so switching to S3/GCS/Azure is a new service class plus an
 * env change (STORAGE_DRIVER), not code changes across modules.
 */
export const STORAGE = 'STORAGE';

export interface StorageDriver {
  readonly name: string;
  /** Store bytes under `key` and return the public URL. */
  put(key: string, body: Buffer, mimeType: string): Promise<{ url: string }>;
  delete(key: string): Promise<void>;
}
