import crypto from 'crypto';
import { parseStringPromise } from 'xml2js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { config } from '../config';
import { insertPhoto } from '../models/photo';

/** 验证微信签名（公众号首次接入校验 & 每次消息校验） */
export function verifySignature(
  signature: string,
  timestamp: string,
  nonce: string,
): boolean {
  if (!config.wechat.token) return false;

  const arr = [config.wechat.token, timestamp, nonce].sort();
  const str = arr.join('');
  const hash = crypto.createHash('sha1').update(str, 'utf8').digest('hex');
  return hash === signature;
}

/** 解析微信 XML 消息 */
export async function parseMessage(xml: string): Promise<WechatMessage | null> {
  try {
    const result = await parseStringPromise(xml, { explicitArray: false, trim: true });
    const msg = result.xml;
    return {
      toUserName: msg.ToUserName,
      fromUserName: msg.FromUserName,
      createTime: msg.CreateTime,
      msgType: msg.MsgType,
      msgId: msg.MsgId,
      picUrl: msg.PicUrl,
      mediaId: msg.MediaId,
    };
  } catch {
    return null;
  }
}

export interface WechatMessage {
  toUserName: string;
  fromUserName: string;
  createTime: string;
  msgType: string;
  msgId?: string;
  picUrl?: string;
  mediaId?: string;
}

/** 从微信服务器下载图片 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  return Buffer.from(response.data);
}

/** 处理图片消息：下载 → 压缩 → 存缩略图 → 入库 */
export async function handleImageMessage(
  msg: WechatMessage,
  nickname?: string,
): Promise<{
  id: string;
  thumbnailUrl: string;
  originalUrl: string;
}> {
  // 下载原图
  let imageBuffer: Buffer;
  if (msg.picUrl) {
    imageBuffer = await downloadImage(msg.picUrl);
  } else if (msg.mediaId) {
    // 如有 access_token 可调用素材接口下载，此处暂用 picUrl
    throw new Error('需要 access_token 下载临时素材，请使用 picUrl');
  } else {
    throw new Error('消息中没有图片 URL');
  }

  // 生成文件名
  const ts = Date.now();
  const fileName = `${ts}_${msg.fromUserName}`;
  const originalFileName = `${fileName}.jpg`;
  const thumbnailFileName = `${fileName}_thumb.jpg`;

  const uploadDir = config.uploadDir;
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 原图保存
  const originalPath = path.join(uploadDir, originalFileName);
  fs.writeFileSync(originalPath, imageBuffer);

  // 用 sharp 获取尺寸并生成缩略图
  const metadata = await sharp(imageBuffer).metadata();
  const thumbnailPath = path.join(uploadDir, thumbnailFileName);

  await sharp(imageBuffer)
    .resize(config.thumbnailWidth, undefined, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);

  // 入库
  const record = insertPhoto({
    originalPath,
    thumbnailPath,
    originalUrl: `/uploads/${originalFileName}`,
    thumbnailUrl: `/uploads/${thumbnailFileName}`,
    uploaderOpenId: msg.fromUserName,
    uploaderNickname: nickname || '家人',
    width: metadata.width || 0,
    height: metadata.height || 0,
  });

  return {
    id: record.id,
    thumbnailUrl: record.thumbnail_url,
    originalUrl: record.original_url,
  };
}
