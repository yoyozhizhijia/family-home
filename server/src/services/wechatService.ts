import crypto from 'crypto';
import { parseStringPromise } from 'xml2js';
import axios from 'axios';
import { config } from '../config';
import { processImageBuffer } from './photoService';

// ── Access Token 缓存 ───────────────────────────
let accessToken: string | null = null;
let tokenExpiresAt: number = 0;

/** 获取微信公众号 access_token */
export async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt - 300000) {
    return accessToken;
  }

  const res = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
    params: {
      grant_type: 'client_credential',
      appid: config.wechat.appId,
      secret: config.wechat.appSecret,
    },
    timeout: 15000,
  });

  if (res.data.errcode) {
    throw new Error(`获取 access_token 失败: ${res.data.errmsg}`);
  }

  accessToken = res.data.access_token;
  tokenExpiresAt = Date.now() + (res.data.expires_in || 7200) * 1000;
  console.log('[微信] access_token 已刷新');
  return accessToken!;
}

/** 通过 API 设置自定义菜单 */
export async function setCustomMenu(): Promise<{ errcode: number; errmsg: string }> {
  const token = await getAccessToken();
  const menu = {
    button: [
      {
        type: 'view',
        name: '🏡 家庭时光',
        url: config.siteUrl,
      },
      {
        type: 'click',
        name: '📷 怎么用',
        key: 'HELP',
      },
    ],
  };

  const res = await axios.post(
    `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${token}`,
    menu,
    { timeout: 15000 },
  );

  console.log('[微信] 菜单创建响应:', JSON.stringify(res.data));

  if (res.data.errcode !== 0) {
    throw new Error(`微信返回错误: ${res.data.errmsg} (errcode=${res.data.errcode})`);
  }

  console.log('[微信] 自定义菜单已发布 ✅');
  return res.data;
}

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
      content: msg.Content,
      event: msg.Event,
      eventKey: msg.EventKey,
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
  content?: string;
  event?: string;
  eventKey?: string;
}

/** 从微信服务器下载图片 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  return Buffer.from(response.data);
}

/** 处理图片消息：下载 → R2 上传 → 入库 */
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
    throw new Error('需要 access_token 下载临时素材，请使用 picUrl');
  } else {
    throw new Error('消息中没有图片 URL');
  }

  // 处理 + 上传 R2
  const record = await processImageBuffer(
    imageBuffer,
    msg.fromUserName,
    nickname || '家人',
  );

  return {
    id: record.id,
    thumbnailUrl: record.thumbnail_url,
    originalUrl: record.original_url,
  };
}
