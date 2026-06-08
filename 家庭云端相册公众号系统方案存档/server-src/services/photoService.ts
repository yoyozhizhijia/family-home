import fs from 'fs';
import { insertPhoto, PhotoRecord } from '../models/photo';
import { uploadToCloudinary } from './cloudinaryService';

/** 处理图片 buffer 并上传到 Cloudinary */
export async function processImageBuffer(
  imageBuffer: Buffer,
  uploaderOpenId: string = 'unknown',
  uploaderNickname: string = '家人',
  category?: string,
): Promise<PhotoRecord> {
  // 上传到 Cloudinary（自动优化 + 生成缩略图）
  const result = await uploadToCloudinary(imageBuffer);

  // 入库
  return insertPhoto({
    originalPath: result.publicId,
    thumbnailPath: result.publicId,
    originalUrl: result.originalUrl,
    thumbnailUrl: result.thumbnailUrl,
    uploaderOpenId,
    uploaderNickname,
    width: result.width,
    height: result.height,
    category: category || '',
  });
}

/** 处理 Multer 上传的文件（网页上传） */
export async function processUpload(
  file: Express.Multer.File,
  category?: string,
  nickname?: string,
): Promise<PhotoRecord> {
  const buffer = fs.readFileSync(file.path);
  try { fs.unlinkSync(file.path); } catch {}

  return processImageBuffer(buffer, 'web', nickname || '家人', category);
}
