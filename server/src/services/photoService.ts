import fs from 'fs';
import sharp from 'sharp';
import { insertPhoto, PhotoRecord } from '../models/photo';
import { uploadToR2 } from './r2Service';

/** 处理图片 buffer 并上传到 R2 */
export async function processImageBuffer(
  imageBuffer: Buffer,
  uploaderOpenId: string = 'unknown',
  uploaderNickname: string = '家人',
): Promise<PhotoRecord> {
  const ts = Date.now();
  const baseKey = `photos/${ts}_${uploaderOpenId.substring(0, 8)}`;

  // 生成原图 JPEG
  const originalJpeg = await sharp(imageBuffer)
    .jpeg({ quality: 92 })
    .toBuffer();

  const metadata = await sharp(originalJpeg).metadata();

  // 生成缩略图
  const thumbnailJpeg = await sharp(originalJpeg)
    .resize(400, undefined, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  // 上传到 R2
  const originalKey = `${baseKey}.jpg`;
  const thumbKey = `${baseKey}_thumb.jpg`;

  const [originalUrl, thumbnailUrl] = await Promise.all([
    uploadToR2(originalKey, originalJpeg, 'image/jpeg'),
    uploadToR2(thumbKey, thumbnailJpeg, 'image/jpeg'),
  ]);

  // 入库（路径字段改为存 R2 key）
  return insertPhoto({
    originalPath: originalKey,
    thumbnailPath: thumbKey,
    originalUrl,
    thumbnailUrl,
    uploaderOpenId,
    uploaderNickname,
    width: metadata.width || 0,
    height: metadata.height || 0,
  });
}

/** 处理 Multer 上传的文件（网页上传） */
export async function processUpload(file: Express.Multer.File): Promise<PhotoRecord> {
  const buffer = fs.readFileSync(file.path);
  // 删除 Multer 临时文件
  try { fs.unlinkSync(file.path); } catch {}

  return processImageBuffer(buffer, 'web', '家人');
}
