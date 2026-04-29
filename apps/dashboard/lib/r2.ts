import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    const accountId = process.env.R2_ACCOUNT_ID ?? "";
    const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? "";
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? "";

    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return r2Client;
}

export async function getDocumentPresignedUrl(
  key: string,
  expiresIn = 300
): Promise<string> {
  const bucketName = process.env.R2_BUCKET_NAME ?? "";
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({ Bucket: bucketName, Key: key }),
    { expiresIn }
  );
}
