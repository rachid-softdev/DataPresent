/**
 * R2 Object Storage — Security & Usage Policy
 * =============================================
 *
 * SECURITY RULES:
 * 1. Presigned URLs expire in 600s (10 min) — DO NOT increase without security review.
 * 2. Never log full presigned URLs — they grant temporary access to objects.
 * 3. Never return raw R2 public URLs to clients — always use presigned URLs.
 * 4. Objects are private by default — bucket policy MUST NOT allow public listing.
 * 5. Uploads MUST validate file types and sizes before calling uploadToR2.
 * 6. Object keys should be UUIDs or hashs — never user-controlled paths.
 *
 * KEY ROTATION:
 * - R2 access keys should be rotated every 90 days via Cloudflare dashboard.
 * - After rotation, update R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in env.
 *
 * BUCKET CONFIGURATION:
 * - Bucket: datapresent (set via R2_BUCKET_NAME)
 * - Public URL: https://pub-r2.datapresent.com (for cached public assets only)
 * - CORS: Restrict to application origins only
 * - Lifecycle: Expire incomplete multipart uploads after 24h
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, isFeatureEnabled } from "./env.js";

let _r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!_r2Client) {
    if (!isFeatureEnabled("r2")) {
      throw new Error(
        "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.",
      );
    }
    _r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _r2Client;
}

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await getR2Client().send(command);
  return `${env.R2_PUBLIC_URL}/${key}`;
}

export async function getSignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(getR2Client(), command, { expiresIn: 600 });
}
