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

const BACKUP_PREFIX = 'data-backup';

/** 备份 JSON 数据到 Cloudinary（raw 文件） */
export async function backupJson(key: string, data: object): Promise<void> {
  ensureInit();
  const json = Buffer.from(JSON.stringify(data), 'utf8');

  await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: `${BACKUP_PREFIX}/${key}`,
        resource_type: 'raw',
        overwrite: true,
        folder: 'family-home',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    const { Readable } = require('stream');
    const readable = new Readable();
    readable.push(json);
    readable.push(null);
    readable.pipe(stream);
  });
}

/** 从 Cloudinary 恢复 JSON 数据，失败返回 null */
export async function restoreJson<T>(key: string): Promise<T | null> {
  ensureInit();
  try {
    const url = cloudinary.url(`${BACKUP_PREFIX}/${key}`, {
      secure: true,
      resource_type: 'raw',
    });
    const response = await require('axios').get(url, { timeout: 15000 });
    return JSON.parse(response.data);
  } catch {
    console.log(`[Cloudinary] 未找到云端备份: ${key}，使用本地数据`);
    return null;
  }
}
