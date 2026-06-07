import { Router, Request, Response } from 'express';
import { verifySignature, parseMessage, handleImageMessage } from '../services/wechatService';
import { isMember, getMemberNickname, upsertMember } from '../models/member';
import { todayStats } from '../models/photo';
import { config } from '../config';

const router = Router();

/**
 * GET /api/wechat/callback
 * 微信公众号服务器配置校验：微信会发 GET 请求，需返回 echostr
 */
router.get('/callback', (req: Request, res: Response) => {
  const { signature, timestamp, nonce, echostr } = req.query;

  if (
    typeof signature === 'string' &&
    typeof timestamp === 'string' &&
    typeof nonce === 'string' &&
    verifySignature(signature, timestamp, nonce)
  ) {
    console.log('[微信] 签名验证成功');
    res.send(echostr || '');
  } else {
    console.log('[微信] 签名验证失败');
    res.status(403).send('Forbidden');
  }
});

/**
 * POST /api/wechat/callback
 * 接收微信推送的消息（包括图片消息）
 */
router.post('/callback', async (req: Request, res: Response) => {
  let xml = '';

  req.on('data', (chunk: Buffer) => {
    xml += chunk.toString('utf8');
  });

  req.on('end', async () => {
    try {
      const msg = await parseMessage(xml);
      if (!msg) {
        console.log('[微信] 消息解析失败');
        res.send('success');
        return;
      }

      console.log(`[微信] 收到消息: MsgType=${msg.msgType}, From=${msg.fromUserName}`);

      // ── 菜单点击事件 ──────────────────────────────
      if (msg.msgType === 'event' && msg.event === 'CLICK') {
        res.type('text/xml');
        if (msg.eventKey === 'HELP') {
          res.send(helpReplyXml(msg.fromUserName, msg.toUserName));
        } else if (msg.eventKey === 'UPLOAD') {
          res.send(uploadHintReplyXml(msg.fromUserName, msg.toUserName));
        } else if (msg.eventKey === 'JOIN') {
          res.send(joinHintReplyXml(msg.fromUserName, msg.toUserName));
        } else {
          // 未知菜单，回欢迎
          res.send(helpReplyXml(msg.fromUserName, msg.toUserName));
        }
        return;
      }

      // 检测暗号：文字消息匹配暗号 → 自动加入白名单
      if (
        msg.msgType === 'text' &&
        msg.content &&
        config.joinPassphrase &&
        msg.content.trim() === config.joinPassphrase
      ) {
        upsertMember(msg.fromUserName, '新家人');
        console.log(`[微信] 🎉 暗号匹配! ${msg.fromUserName} 已自动加入家庭成员`);
        res.type('text/xml');
        res.send(welcomeReplyXml(msg.fromUserName, msg.toUserName));
        return;
      }

      // 白名单检查：只允许家庭成员发图
      if (!isMember(msg.fromUserName)) {
        console.log(`[微信] 非家庭成员 (${msg.fromUserName})，已忽略。可发送暗号加入。`);
        res.type('text/xml');
        res.send(notMemberReplyXml(msg.fromUserName, msg.toUserName));
        return;
      }

      // 处理图片消息
      if (msg.msgType === 'image') {
        const nickname = getMemberNickname(msg.fromUserName) || '家人';
        const result = await handleImageMessage(msg, nickname);
        console.log(`[微信] 图片已保存: ${result.id}`);
        res.type('text/xml');
        res.send(photoSavedReplyXml(msg.fromUserName, msg.toUserName, nickname));
        return;
      } else if (msg.msgType === 'text') {
        // 关键词「今日动态」→ 回复今日统计
        if (msg.content && /^今日动态$/.test(msg.content.trim())) {
          res.type('text/xml');
          res.send(todayStatsReplyXml(msg.fromUserName, msg.toUserName));
          return;
        }
        // 其它文字消息提示发图
        res.type('text/xml');
        res.send(textHintReplyXml(msg.fromUserName, msg.toUserName));
        return;
      }

      res.send('success');
    } catch (err) {
      console.error('[微信] 处理消息出错:', err);
      res.send('success');
    }
  });
});

export default router;

// ── 被动回复 XML 模板 ──────────────────────
function helpReplyXml(from: string, to: string): string {
  const now = Math.floor(Date.now() / 1000);
  const content = `📷 发送照片即可上传到家庭照片墙

🔑 新家人先发暗号加入
📊 发「今日动态」查看最新分享

📱 <a href="${config.siteUrl}">进入照片墙</a>

❤️ 记录我们的美好时光`;
  return wrapTextXml(from, to, now, content);
}

function welcomeReplyXml(from: string, to: string): string {
  const now = Math.floor(Date.now() / 1000);
  const content = `🎉 欢迎加入家庭时光！

从现在开始，你发的每张照片都会自动保存到我们的家庭照片墙。

📱 <a href="${config.siteUrl}">点击查看照片墙</a>
🎨 <a href="${config.siteUrl}/portfolio/yoyo">悠悠作品集</a>
✨ <a href="${config.siteUrl}/portfolio/zhizhi">之之作品集</a>

发「今日动态」随时了解最新分享 ❤️`;
  return wrapTextXml(from, to, now, content);
}

function notMemberReplyXml(from: string, to: string): string {
  const now = Math.floor(Date.now() / 1000);
  const content = `👋 你好！你还不是家庭成员，无法上传照片。

请向管理员索取暗号加入我们大家庭～`;
  return wrapTextXml(from, to, now, content);
}

function photoSavedReplyXml(from: string, to: string, nickname: string): string {
  const now = Math.floor(Date.now() / 1000);
  const msgs = [
    `🎞️ 咔嚓！${nickname}的时光碎片已保存，每一张都值得珍藏`,
    `📸 收到${nickname}的美照！已安全存入家庭相册啦～`,
    `💕 记录下来了！${nickname}的温暖瞬间已上墙，去看看吧`,
    `🌷 ${nickname}的回忆又添了一页，点链接查看照片墙`,
    `✨ 太好了！${nickname}的这张照片真好看，已经保存好了`,
    `🏡 ${nickname}的时光已存入我们的家庭记忆库 💛`,
    `🎁 ${nickname}又分享了一张美好瞬间，大家快来看看`,
    `🌈 ${nickname}的照片已上墙，像彩虹一样温暖`,
    `🍀 收到${nickname}的一份心意，已珍藏到家庭时光`,
    `🖼️ ${nickname}的画布又添了一笔，照片墙更丰富了`,
    `💎 如获至宝！${nickname}的这张照片太珍贵了`,
    `🌻 ${nickname}的分享让今天的照片墙更明亮了`,
    `🎀 ${nickname}的美好已打包存入时光胶囊`,
    `📖 家庭相册翻到新一页，感谢${nickname}的分享`,
    `🕊️ ${nickname}的回忆已轻轻地放在了照片墙上`,
    `🎵 叮！${nickname}的时光音符已加入家庭乐章`,
    `⭐ ${nickname}又点亮了照片墙的一颗星`,
    `🌸 ${nickname}的瞬间已绽放，去照片墙闻闻花香吧`,
    `🔮 ${nickname}的魔法时刻已封印在照片墙中`,
    `🎪 精彩！${nickname}的这一刻已登上家庭时光的舞台`,
  ];
  const content = `${msgs[Math.floor(Math.random() * msgs.length)]}\n\n📱 照片墙：\n${config.siteUrl}`;
  return wrapTextXml(from, to, now, content);
}

function textHintReplyXml(from: string, to: string): string {
  const now = Math.floor(Date.now() / 1000);
  const content = `😊 直接发送照片就可以上传到家庭照片墙啦～\n\n发送「今日动态」可查看今日新增照片\n\n📱 <a href="${config.siteUrl}">点我看照片墙</a>`;
  return wrapTextXml(from, to, now, content);
}

function todayStatsReplyXml(from: string, to: string): string {
  const now = Math.floor(Date.now() / 1000);
  const stats = todayStats();
  const parts: string[] = [];
  parts.push(`📊 今日家庭时光播报\n`);

  if (stats.photoCount === 0) {
    parts.push(`今天还没有新的照片，期待大家的分享 ✨`);
  } else {
    parts.push(`📷 新增 ${stats.photoCount} 张照片`);
    if (stats.yoyoCount > 0) parts.push(`✨ 悠悠新作品 ${stats.yoyoCount} 件`);
    if (stats.zhizhiCount > 0) parts.push(`🎨 之之新作品 ${stats.zhizhiCount} 件`);
    if (stats.everyoneCount > 0) parts.push(`💛 大家新作品 ${stats.everyoneCount} 件`);
    if (stats.uploaders.length > 0) parts.push(`👤 来自：${stats.uploaders.join('、')}`);
  }

  parts.push(`\n📱 <a href="${config.siteUrl}">进入照片墙</a>`);
  parts.push(`🎨 <a href="${config.siteUrl}/portfolio/yoyo">悠悠作品集</a>`);
  parts.push(`✨ <a href="${config.siteUrl}/portfolio/zhizhi">之之作品集</a>`);

  return wrapTextXml(from, to, now, parts.join('\n'));
}

function wrapTextXml(from: string, to: string, ts: number, content: string): string {
  return `<xml>
<ToUserName><![CDATA[${from}]]></ToUserName>
<FromUserName><![CDATA[${to}]]></FromUserName>
<CreateTime>${ts}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${content}]]></Content>
</xml>`;
}

function uploadHintReplyXml(from: string, to: string): string {
  const now = Math.floor(Date.now() / 1000);
  const content = `📷 直接发送照片到对话框，就能自动保存到我们的家庭照片墙！

📱 <a href="${config.siteUrl}">查看照片墙</a>`;
  return wrapTextXml(from, to, now, content);
}

function joinHintReplyXml(from: string, to: string): string {
  const now = Math.floor(Date.now() / 1000);
  const content = `🔑 发送暗号即可加入家庭，之后发照片自动上墙！

（暗号由管理员告知家人）

📱 <a href="${config.siteUrl}">先看看照片墙</a>`;
  return wrapTextXml(from, to, now, content);
}
