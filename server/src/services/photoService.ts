import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { config } from '../config';
import { insertPhoto, PhotoRecord } from '../models/photo';

/** 处理上传的图片文件 */
export async function processUpload(file: Express.Multer.File): Promise<PhotoRecord> {
  const ts = Date.now();
  const fileName = `${ts}_webupload`;
  const originalFileName = `${fileName}.jpg`;
  const thumbnailFileName = `${fileName}_thumb.jpg`;

  const uploadDir = config.uploadDir;
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 读取上传文件 buffer
  const imageBuffer = fs.readFileSync(file.path);

  // 重新保存为统一命名的 JPG
  const originalPath = path.join(uploadDir, originalFileName);
  await sharp(imageBuffer)
    .jpeg({ quality: 92 })
    .toFile(originalPath);

  // 删除 Multer 临时文件
  fs.unlinkSync(file.path);

  // 生成缩略图
  const metadata = await sharp(originalPath).metadata();
  const thumbnailPath = path.join(uploadDir, thumbnailFileName);

  await sharp(originalPath)
    .resize(config.thumbnailWidth, undefined, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);

  // 入库
  return insertPhoto({
    originalPath,
    thumbnailPath,
    originalUrl: `/uploads/${originalFileName}`,
    thumbnailUrl: `/uploads/${thumbnailFileName}`,
    uploaderOpenId: 'web',
    uploaderNickname: '家人',
    width: metadata.width || 0,
    height: metadata.height || 0,
  });
}
