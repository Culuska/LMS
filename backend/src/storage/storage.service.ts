import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

/**
 * File storage for course materials and assignment submissions, backed by Cloudflare
 * R2 (an S3-compatible object store — see docs/00-requirements-audit.md §14, the
 * storage decision that was previously left open). Uses presigned URLs rather than
 * streaming uploads/downloads through this API: the browser talks to R2 directly,
 * which avoids tying up a Render free-tier instance's limited resources on large file
 * transfers and keeps this service itself stateless.
 *
 * Configured entirely via env vars (R2_*, see .env.example); if they're unset, every
 * method throws rather than silently no-op'ing, so a missing configuration fails loud
 * at the point of use instead of producing confusing empty uploads later.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger('StorageService');
  private readonly client: S3Client | null;
  private readonly bucket = process.env.R2_BUCKET_NAME;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket) {
      this.logger.warn(
        'R2 storage is not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / ' +
          'R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME) — file upload/download endpoints ' +
          'will return 503 until it is.',
      );
      this.client = null;
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private requireClient(): S3Client {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'File storage is not configured on this server yet.',
      );
    }
    return this.client;
  }

  /** A storage key that can't collide across resources and keeps the original
   * filename's extension visible (harmless, and useful for debugging in the R2
   * dashboard) without trusting the caller-supplied name for anything structural. */
  buildStorageKey(originalFileName: string): string {
    const safeExt = /\.[a-zA-Z0-9]{1,10}$/.exec(originalFileName)?.[0] ?? '';
    return `${randomUUID()}${safeExt}`;
  }

  async createUploadUrl(
    storageKey: string,
    contentType: string,
  ): Promise<string> {
    const client = this.requireClient();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: contentType,
    });
    // Short-lived: this URL only needs to survive the one upload the caller is about
    // to perform, not sit around as a standing credential.
    return getSignedUrl(client, command, { expiresIn: 5 * 60 });
  }

  async createDownloadUrl(
    storageKey: string,
    fileName: string,
  ): Promise<string> {
    const client = this.requireClient();
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      // Forces a real filename on download instead of the random storage key.
      ResponseContentDisposition: `attachment; filename="${fileName.replace(/"/g, '')}"`,
    });
    return getSignedUrl(client, command, { expiresIn: 5 * 60 });
  }
}
