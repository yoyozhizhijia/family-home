import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { config } from '../config';

// ── R2 S3 客户端（懒初始化） ───────────────────
let s3: S3Client | null = null;

function getClient(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }
  return s3;
}

/** 上传文件到 R2 并返回公开访问 URL */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string = 'image/jpeg',
): Promise<string> {
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return `${config.r2.publicUrl}/${key}`;
}

/** 从 R2 删除文件 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getClient();
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.r2.bucketName,
        Key: key,
      }),
    );
  } catch (err) {
    console.error(`[R2] 删除文件失败: ${key}`, err);
  }
}

/** 估算 R2 存储使用量（通过列出对象累积大小） */
export async function getStorageUsage(): Promise<{
  totalBytes: number;
  totalGB: string;
  percentUsed: string;
  alertGB: number;
  isAlerting: boolean;
  objectCount: number;
}> {
  const client = getClient();
  let totalBytes = 0;
  let objectCount = 0;
  let continuationToken: string | undefined;

  try {
    do {
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: config.r2.bucketName,
          ContinuationToken: continuationToken,
        }),
      );
      for (const obj of res.Contents || []) {
        if (obj.Size) totalBytes += obj.Size;
        objectCount++;
      }
      continuationToken = res.NextContinuationToken;
    } while (continuationToken);
  } catch (err) {
    console.error('[R2] 获取存储用量失败:', err);
  }

  const totalGB = (totalBytes / (1024 ** 3)).toFixed(2);
  const alertGB = config.r2.storageAlertGB;
  const percentUsed = alertGB > 0 ? ((totalBytes / (alertGB * 1024 ** 3)) * 100).toFixed(1) : '0';
  const isAlerting = alertGB > 0 && totalBytes >= alertGB * 1024 ** 3;

  return { totalBytes, totalGB, percentUsed, alertGB, isAlerting, objectCount };
}
