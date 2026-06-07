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
  comments: PhotoComment[];
}

export interface PhotoComment {
  id: string;
  author: string;
  text: string;
  created_at: string;
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

  // 同步云端备份，最多重试 3 次
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await backupJson(BACKUP_KEY, photos);
      return; // 成功
    } catch (err: any) {
      console.error(`[数据] 云端备份失败 (第${attempt}次):`, err.message);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.error('[数据] ⚠️ 云端备份最终失败，数据仅保存在本地磁盘！下次重启可能丢失。');
}

/** 启动时从云端恢复 + 本地兜底（取数据多的那个） */
export async function initFromCloud(): Promise<void> {
  const remote = await restoreJson<PhotoRecord[]>(BACKUP_KEY);
  const hasRemote = remote && Array.isArray(remote) && remote.length > 0;

  // 读取本地文件
  let local: PhotoRecord[] = [];
  if (fs.existsSync(DATA_FILE)) {
    try { local = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch {}
  }
  if (!Array.isArray(local)) local = [];

  // 决策：用数据量更多的那个
  if (hasRemote && remote.length >= local.length) {
    photos = remote;
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(photos, null, 2), 'utf8');
    console.log(`[数据] 从云端恢复 ${photos.length} 条 (本地${local.length}条)`);
  } else if (local.length > 0) {
    photos = local;
    console.log(`[数据] 使用本地 ${local.length} 条 (云端${remote?.length || 0}条)，补备份`);
    // 本地更新，立刻同步到云端
    save().catch(() => {});
  } else {
    photos = [];
    console.log('[数据] 无数据，从零开始');
  }

  // 补齐旧记录缺失字段
  let migrated = false;
  for (const r of photos) {
    if (!r.comments) { r.comments = []; migrated = true; }
  }
  if (migrated) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(photos, null, 2), 'utf8');
    console.log('[数据] 已补齐旧记录 comments 字段');
  }
}

// 导出初始化 Promise，供 server 启动前等待
export const dataInitPromise = initFromCloud();

/** 插入照片记录 */
export async function insertPhoto(params: {
  originalPath: string;
  thumbnailPath: string;
  originalUrl: string;
  thumbnailUrl: string;
  uploaderOpenId?: string;
  uploaderNickname?: string;
  width?: number;
  height?: number;
  category?: string;
}): Promise<PhotoRecord> {
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
    comments: [],
  };

  photos.unshift(record); // 最新在前
  await save();
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
export async function deletePhoto(id: string): Promise<boolean> {
  const idx = photos.findIndex((p) => p.id === id);
  if (idx === -1) return false;

  const photo = photos[idx];

  // 从 Cloudinary 删除（public_id 存在 original_path 中）
  if (photo.original_path) {
    deleteFromCloudinary(photo.original_path).catch(() => {});
  }

  photos.splice(idx, 1);
  await save();
  return true;
}

/** 修改照片昵称 */
export async function updatePhotoNickname(id: string, nickname: string): Promise<PhotoRecord | undefined> {
  const photo = photos.find((p) => p.id === id);
  if (!photo) return undefined;

  photo.uploader_nickname = nickname;
  await save();
  return photo;
}

/** 今日统计：新增照片数 + 各作品集新增 + 贡献者 */
export function todayStats(): {
  photoCount: number;
  yoyoCount: number;
  zhizhiCount: number;
  everyoneCount: number;
  exploreCount: number;
  uploaders: string[];
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().substring(0, 10);

  const todayPhotos = photos.filter((p) => p.uploaded_at.startsWith(todayISO));

  const uploaders: string[] = [];
  let yoyoCount = 0;
  let zhizhiCount = 0;
  let everyoneCount = 0;
  let exploreCount = 0;

  for (const p of todayPhotos) {
    if (p.category === 'yoyo') yoyoCount++;
    else if (p.category === 'zhizhi') zhizhiCount++;
    else if (p.category === 'everyone') everyoneCount++;
    else if (p.category === 'explore') exploreCount++;

    if (p.uploader_nickname && !uploaders.includes(p.uploader_nickname)) {
      uploaders.push(p.uploader_nickname);
    }
  }

  return {
    photoCount: todayPhotos.length,
    yoyoCount,
    zhizhiCount,
    everyoneCount,
    exploreCount,
    uploaders,
  };
}

// ── 评论 ──────────────────────────────────────

/** 添加评论 */
export async function addComment(photoId: string, author: string, text: string): Promise<PhotoComment | null> {
  const photo = photos.find((p) => p.id === photoId);
  if (!photo) return null;
  if (!photo.comments) photo.comments = [];

  const comment: PhotoComment = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    author: author.slice(0, 20) || '家人',
    text: text.slice(0, 200),
    created_at: new Date().toISOString(),
  };
  photo.comments.push(comment);
  await save();
  return comment;
}

/** 删除评论 */
export async function deleteComment(photoId: string, commentId: string): Promise<boolean> {
  const photo = photos.find((p) => p.id === photoId);
  if (!photo?.comments) return false;
  const idx = photo.comments.findIndex((c) => c.id === commentId);
  if (idx === -1) return false;
  photo.comments.splice(idx, 1);
  await save();
  return true;
}
