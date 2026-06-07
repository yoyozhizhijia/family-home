import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import { config } from '../config';

// ── 初始化 ──────────────────────────────────────
let initialized = false;

function ensureInit() {
  if (initialized) return;
  if (!config.cloudinary.cloudName) return;

  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
  initialized = true;
}

/** 上传图片到 Cloudinary，返回 secure_url 和 public_id */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string = 'family-home',
): Promise<{
  publicId: string;
  originalUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}> {
  ensureInit();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // 缩略图通过 URL transformation 动态生成，无需预生成
        transformation: { quality: 'auto', fetch_format: 'auto' },
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('上传失败'));
          return;
        }

        const publicId = result.public_id;
        const originalUrl = result.secure_url;

        // 缩略图：裁剪 + 限定宽度 + 自动优化
        const thumbnailUrl = cloudinary.url(publicId, {
          secure: true,
          width: 400,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto',
        });

        resolve({
          publicId,
          originalUrl,
          thumbnailUrl,
          width: result.width || 0,
          height: result.height || 0,
        });
      },
    );

    // 将 buffer 写入 stream
    const { Readable } = require('stream');
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
}

/** 从 Cloudinary 删除图片 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  ensureInit();
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('[Cloudinary] 删除失败:', err);
  }
}

/** 查询 Cloudinary 存储用量 */
export async function getStorageUsage(): Promise<{
  totalMB: string;
  totalGB: string;
  percentUsed: string;
  alertGB: number;
  isAlerting: boolean;
  plan: string;
  credits: number;
}> {
  ensureInit();

  try {
    const result = await cloudinary.api.usage();

    const bytes = result.storage?.usage || 0;
    const totalMB = (bytes / (1024 ** 2)).toFixed(1);
    const totalGB = (bytes / (1024 ** 3)).toFixed(2);
    const alertGB = config.cloudinary.storageAlertGB;
    const percentUsed = alertGB > 0 ? ((bytes / (alertGB * 1024 ** 3)) * 100).toFixed(1) : '0';
    const isAlerting = alertGB > 0 && bytes >= alertGB * 1024 ** 3;

    return {
      totalMB,
      totalGB,
      percentUsed,
      alertGB,
      isAlerting,
      plan: result.plan || 'Free',
      credits: result.credits?.usage || 0,
    };
  } catch (err) {
    console.error('[Cloudinary] 查询用量失败:', err);
    throw err;
  }
}

// ── 数据持久化：备份/恢复 JSON 数据 ──────────

const BACKUP_PREFIX = 'family-home-data-backup';

/** 备份 JSON 数据到 Cloudinary（raw 文件），返回访问 URL */
export async function backupJson(key: string, data: object): Promise<string> {
  ensureInit();
  const jsonStr = JSON.stringify(data);
  const base64 = Buffer.from(jsonStr).toString('base64');
  const dataUri = `data:application/json;base64,${base64}`;

  const result: any = await cloudinary.uploader.upload(dataUri, {
    public_id: `${BACKUP_PREFIX}-${key}`,
    resource_type: 'raw',
    overwrite: true,
    format: 'json',
    invalidate: true,
  });

  console.log(`[Cloudinary] 备份 ${key} 成功 (${jsonStr.length} 字节)`);
  return result.secure_url;
}

/** 从 Cloudinary 恢复 JSON 数据，失败返回 null */
export async function restoreJson<T>(key: string): Promise<T | null> {
  ensureInit();
  const url = `https://res.cloudinary.com/${config.cloudinary.cloudName}/raw/upload/${BACKUP_PREFIX}-${key}.json`;
  try {
    console.log(`[Cloudinary] 尝试恢复: ${key}`);
    const response = await axios.get(url, { timeout: 15000, responseType: 'text' });
    const data = JSON.parse(response.data);
    console.log(`[Cloudinary] ✓ 恢复 ${key} 成功 (${JSON.stringify(data).length} 字节)`);
    return data;
  } catch (err: any) {
    const status = err.response?.status || err.code || '?';
    console.log(`[Cloudinary] ✗ 恢复 ${key} 失败 (${status}): ${err.message}`);
    return null;
  }
}
