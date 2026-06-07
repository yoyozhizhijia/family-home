import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { deleteFromCloudinary, backupJson, restoreJson } from '../services/cloudinaryService';

export interface PhotoRecord {
  id: string;
  original_path: string;
  thumbnail_path: string;
  original_url: string;
  thumbnail_url: string;
  uploader_openid: string;
  uploader_nickname: string;
  uploaded_at: string;
  month_key: string;
  width: number;
  height: number;
  category: string;  // 'yoyo' | 'zhizhi' | 'everyone' | '' 作品集分类
}

const DATA_FILE = config.db.path;
const dataDir = path.dirname(DATA_FILE);
const BACKUP_KEY = 'photos';

// 按上传时间倒序的内存索引
let photos: PhotoRecord[] = [];

/** 从文件加载数据 */
function load(): void {
  if (!fs.existsSync(DATA_FILE)) {
    photos = [];
    return;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    photos = JSON.parse(raw);
  } catch {
    photos = [];
  }
}

/** 保存数据到文件 + 同步备份到 Cloudinary */
async function save(): Promise<void> {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(photos, null, 2), 'utf8');

  // 异步备份到 Cloudinary（不阻塞）
  backupJson(BACKUP_KEY, photos).catch((err) => {
    console.error('[数据] 云端备份失败:', err.message);
  });
}

/** 启动时尝试从 Cloudinary 恢复，本地数据兜底 */
export async function initFromCloud(): Promise<void> {
  const remote = await restoreJson<PhotoRecord[]>(BACKUP_KEY);
  if (remote && Array.isArray(remote)) {
    photos = remote;
    // 同步写到本地文件
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(photos, null, 2), 'utf8');
    console.log(`[数据] 从云端恢复 ${photos.length} 条照片记录`);
  } else {
    load();
    console.log(`[数据] 使用本地数据，共 ${photos.length} 条记录`);
    // 首次启动也备份一次
    if (photos.length > 0) {
      backupJson(BACKUP_KEY, photos).catch(() => {});
    }
  }
}

// 导出初始化 Promise，供 server 启动前等待
export const dataInitPromise = initFromCloud();

/** 插入照片记录 */
export function insertPhoto(params: {
  originalPath: string;
  thumbnailPath: string;
  originalUrl: string;
  thumbnailUrl: string;
  uploaderOpenId?: string;
  uploaderNickname?: string;
  width?: number;
  height?: number;
  category?: string;
}): PhotoRecord {
  const now = new Date();
  const record: PhotoRecord = {
    id: `${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    original_path: params.originalPath,
    thumbnail_path: params.thumbnailPath,
    original_url: params.originalUrl,
    thumbnail_url: params.thumbnailUrl,
    uploader_openid: params.uploaderOpenId || '',
    uploader_nickname: params.uploaderNickname || '家人',
    uploaded_at: now.toISOString(),
    month_key: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    width: params.width || 0,
    height: params.height || 0,
    category: params.category || '',
  };

  photos.unshift(record); // 最新在前
  save();
  return record;
}

/** 按 ID 查照片 */
export function getPhotoById(id: string): PhotoRecord | undefined {
  return photos.find((p) => p.id === id);
}

export interface PhotoListParams {
  page?: number;
  pageSize?: number;
  monthKey?: string;
  uploaderOpenId?: string;
  category?: string;
}

/** 分页列表 */
export function listPhotos(params: PhotoListParams = {}): { photos: PhotoRecord[]; total: number } {
  let filtered = photos;

  if (params.monthKey) {
    filtered = filtered.filter((p) => p.month_key === params.monthKey);
  }
  if (params.uploaderOpenId) {
    filtered = filtered.filter((p) => p.uploader_openid === params.uploaderOpenId);
  }
  if (params.category !== undefined) {
    if (params.category === '') {
      // 筛选无分类的普通照片
      filtered = filtered.filter((p) => !p.category || p.category === '');
    } else {
      filtered = filtered.filter((p) => p.category === params.category);
    }
  }

  const total = filtered.length;
  const page = params.page || 1;
  const pageSize = params.pageSize || 24;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return { photos: paged, total };
}

/** 获取所有月份 */
export function listMonths(): string[] {
  const set = new Set<string>();
  for (const p of photos) {
    set.add(p.month_key);
  }
  return Array.from(set).sort().reverse();
}

/** 统计照片总数 */
export function countPhotos(): number {
  return photos.length;
}

/** 按月份统计 */
export function countByMonth(): { month_key: string; count: number }[] {
  const map = new Map<string, number>();
  for (const p of photos) {
    map.set(p.month_key, (map.get(p.month_key) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([month_key, count]) => ({ month_key, count }))
    .sort((a, b) => b.month_key.localeCompare(a.month_key));
}

/** 删除照片 */
export function deletePhoto(id: string): boolean {
  const idx = photos.findIndex((p) => p.id === id);
  if (idx === -1) return false;

  const photo = photos[idx];

  // 从 Cloudinary 删除（public_id 存在 original_path 中）
  if (photo.original_path) {
    deleteFromCloudinary(photo.original_path).catch(() => {});
  }

  photos.splice(idx, 1);
  save();
  return true;
}

/** 修改照片昵称 */
export function updatePhotoNickname(id: string, nickname: string): PhotoRecord | undefined {
  const photo = photos.find((p) => p.id === id);
  if (!photo) return undefined;

  photo.uploader_nickname = nickname;
  save();
  return photo;
}
