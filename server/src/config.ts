import dotenv from 'dotenv';
import path from 'path';

// 加载 .env（若存在）
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  uploadDir: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads'),
  thumbnailWidth: parseInt(process.env.THUMBNAIL_WIDTH || '400', 10),
  siteUrl: process.env.SITE_URL || 'http://localhost:3000',
  accessPassword: process.env.ACCESS_PASSWORD || '',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  joinPassphrase: process.env.JOIN_PASSPHRASE || '',

  wechat: {
    token: (process.env.WECHAT_TOKEN || '').trim(),
    appId: (process.env.WECHAT_APP_ID || '').trim(),
    appSecret: (process.env.WECHAT_APP_SECRET || '').trim(),
    encodingAESKey: (process.env.WECHAT_ENCODING_AES_KEY || '').trim(),
  },

  r2: {
    accountId: (process.env.R2_ACCOUNT_ID || '').trim(),
    accessKeyId: (process.env.R2_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || '').trim(),
    bucketName: (process.env.R2_BUCKET_NAME || 'family-home').trim(),
    publicUrl: (process.env.R2_PUBLIC_URL || '').trim(),
    // 存储容量告警阈值 (GB)，达到后提示扩容
    storageAlertGB: parseFloat(process.env.R2_STORAGE_ALERT_GB || '9'),
  },

  db: {
    path: path.resolve(__dirname, '../../data/photos.json'),
  },
};
