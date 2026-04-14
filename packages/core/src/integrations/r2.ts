import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

let r2Client: S3Client | null = null;

function getR2Env() {
  return {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucketName: process.env.R2_BUCKET_NAME || "",
    publicUrl: process.env.R2_PUBLIC_URL || "",
  };
}

export function getR2Client(): S3Client {
  if (!r2Client) {
    const { accountId, accessKeyId, secretAccessKey } = getR2Env();

    if (!accessKeyId || !secretAccessKey) {
      console.warn(
        "R2 storage credentials are not properly configured in the environment variables."
      );
    }

    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return r2Client;
}

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const { bucketName } = getR2Env();

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return getR2PublicUrl(key);
}

export async function getUploadPresignedUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const { bucketName } = getR2Env();

  return getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  );
}

export async function getDownloadPresignedUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const { bucketName } = getR2Env();

  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
    { expiresIn }
  );
}

export async function deleteFromR2(key: string): Promise<void> {
  const { bucketName } = getR2Env();

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}

export function generateProfilePhotoKey(extension: string): string {
  return `profiles/profile-${nanoid(12)}.${extension}`;
}

export function generateOrgAvatarKey(extension: string): string {
  return `orgs/avatar-${nanoid(12)}.${extension}`;
}

export function getR2PublicUrl(key: string): string {
  const { publicUrl } = getR2Env();
  return `${publicUrl}/${key}`;
}

export function getR2KeyFromUrl(url: string): string | null {
  const { publicUrl } = getR2Env();

  if (!publicUrl || !url.startsWith(publicUrl)) {
    return null;
  }

  return url.replace(`${publicUrl}/`, "");
}

export { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE };

export function validateImageFile(
  contentType: string,
  size: number
): string | null {
  if (
    !ALLOWED_IMAGE_TYPES.includes(
      contentType as (typeof ALLOWED_IMAGE_TYPES)[number]
    )
  ) {
    return "Type de fichier non supporte. Utilisez JPG, PNG ou WebP.";
  }

  if (size > MAX_IMAGE_SIZE) {
    return "L'image ne doit pas depasser 5 Mo.";
  }

  return null;
}
