import { Router, Request, Response } from 'express';
import express from 'express';
import { verifySignature, parseMessage, handleImageMessage } from '../services/wechatService';
import { isMember, getMemberNickname, upsertMember } from '../models/member';
import { todayStats } from '../models/photo';
import { config } from '../config';

// 昵称确认暂存：<openid, 等待昵称>
const pendingNickname = new Map<string, string>();

// 5分钟内已处理的消息 ID（防微信重试导致重复上传）
const processedMsgIds = new Set<string>();
const MSG_ID_TTL = 5 * 60 * 1000; // 5分钟过期

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
 * 接收微信推送的消息。使用 express.text() 读取原始 XML body，避免 req.on('data/end') 异步竞争。
 */
router.post('/callback', express.text({ type: 'text/xml' }), async (req: Request, res: Response) => {
    const xml = req.body || '';
    const xmlReply = (xmlStr: string) => {
      res.setHeader('Content-Type', 'text/xml; charset=utf-8');
      res.status(200).send(xmlStr);
    };
    try {
      const msg = await parseMessage(xml);
      if (!msg) {
        console.log('[微信] 消息解析失败');
        res.send('success');
        return;
      }

      console.log(`[微信] 收到消息: MsgType=${msg.msgType}, From=${msg.fromUserName}`);

      // 防重：如果 msgId 已处理过，直接忽略
      const msgId = msg.msgId;
      if (msgId && processedMsgIds.has(msgId)) {
        console.log(`[微信] 重复消息已忽略: ${msgId}`);
        res.send('success');
        return;
      }
      if (msgId) {
        processedMsgIds.add(msgId);
        setTimeout(() => processedMsgIds.delete(msgId), MSG_ID_TTL);
      }

      // ── 菜单点击事件 ──────────────────────────────
      if (msg.msgType === 'event' && msg.event === 'CLICK') {
        const replyFn: Record<string, Function> = {
          HELP: helpReplyXml,
          UPLOAD: uploadHintReplyXml,
          JOIN: joinHintReplyXml,
        };
        const fn = replyFn[msg.eventKey || ''] || helpReplyXml;
        xmlReply(fn(msg.fromUserName, msg.toUserName));
        return;
      }

      // 等待昵称的用户 → 发送文本即为其昵称
      if (pendingNickname.has(msg.fromUserName)) {
        if (msg.msgType === 'text' && msg.content) {
          const nickname = msg.content.trim().slice(0, 20) || '家人';
          pendingNickname.delete(msg.fromUserName);
          await upsertMember(msg.fromUserName, nickname);
          console.log(`[微信] 🎉 "${nickname}"(${msg.fromUserName}) 正式加入`);
        xmlReply(welcomeReplyXml(msg.fromUserName, msg.toUserName));
          return;
        }
        // 发了图片或其他 → 继续等
        res.send('success');
        return;
      }

      // 暗号匹配 → 反问昵称
      if (
        msg.msgType === 'text' &&
        msg.content &&
        config.joinPassphrase &&
        msg.content.trim() === config.joinPassphrase
      ) {
        if (isMember(msg.fromUserName)) {
          xmlReply(textHintReplyXml(msg.fromUserName, msg.toUserName));
        } else {
          pendingNickname.set(msg.fromUserName, '');
          xmlReply(askNicknameXml(msg.fromUserName, msg.toUserName));
        }
        return;
      }

      // 白名单检查：只允许家庭成员发图
      if (!isMember(msg.fromUserName)) {
        console.log(`[微信] 非家庭成员 (${msg.fromUserName})，已忽略。可发送暗号加入。`);
        xmlReply(notMemberReplyXml(msg.fromUserName, msg.toUserName));
        return;
      }

      // 处理图片消息：先回确认，再异步处理（避免微信超时丢弃回复）
      if (msg.msgType === 'image') {
        const nickname = getMemberNickname(msg.fromUserName) || '家人';
        // 立即回复确认语句
        xmlReply(photoSavedReplyXml(msg.fromUserName, msg.toUserName, nickname));
        // 后台异步处理图片下载+压缩+上传
        handleImageMessage(msg, nickname)
          .then((result) => console.log(`[微信] 图片已保存: ${result.id}`))
          .catch((err) => console.error('[微信] 图片处理失败:', err.message));
        return;
      } else if (msg.msgType === 'text') {
        // 关键词「今日动态」→ 回复今日统计
        if (msg.content && /^今日动态$/.test(msg.content.trim())) {
          xmlReply(todayStatsReplyXml(msg.fromUserName, msg.toUserName));
          return;
        }
        // 其它文字消息提示发图
        xmlReply(textHintReplyXml(msg.fromUserName, msg.toUserName));
        return;
      }

      res.send('success');
    } catch (err) {
      console.error('[微信] 处理消息出错:', err);
      res.send('success');
    }
});

export default router;

// ── 被动回复 XML 模板 ──────────────────────
function helpReplyXml(from: string, to: string): string {
  const now = Math.floor(Date.now() / 1000);
  const content = `📷 发送照片即可上传到家庭照片墙

🔑 新家人先发暗号加入
📊 发「今日动态」查看最新分享

📱 进入照片墙\n${config.siteUrl}

📖 操作手册
${config.siteUrl}/help\n\n❤️ 记录我们的美好时光`;
  return wrapTextXml(from, to, now, content);
}

function welcomeReplyXml(from: string, to: string): string {
  const now = Math.floor(Date.now() / 1000);
  const content = `🎉 欢迎加入家庭时光机！

从现在开始，你发的每张照片都会自动保存到我们的家庭照片墙。

📱 点击查看照片墙
${config.siteUrl}
✨ 悠悠作品集
${config.siteUrl}/portfolio/yoyo
🎨 之之作品集
${config.siteUrl}/portfolio/zhizhi
🌿 探索发现
${config.siteUrl}/portfolio/explore
📖 操作手册
${config.siteUrl}/help

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
    `🍀 收到${nickname}的一份心意，已珍藏到家庭时光机`,
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
    `🎪 精彩！${nickname}的这一刻已登上家庭时光机的舞台`,
  ];
  const content = `${msgs[Math.floor(Math.random() * msgs.length)]}\n\n📱 进入照片墙
${config.siteUrl}\n📖 操作手册
${config.siteUrl}/help`;
  return wrapTextXml(from, to, now, content);
}

function textHintReplyXml(from: string, to: string): string {
  const now = Math.floor(Date.now() / 1000);
  const content = `😊 直接发送照片就可以上传到家庭照片墙啦～\n\n发送「今日动态」可查看今日新增照片\n\n📱 进入照片墙
${config.siteUrl}\n📖 操作手册
${config.siteUrl}/help`;
  return wrapTextXml(from, to, now, content);
}

function todayStatsReplyXml(from: string, to: string): string {
  const now = Math.floor(Date.now() / 1000);
  const stats = todayStats();
  const parts: string[] = [];
  parts.push(`📊 今日家庭时光机播报\n`);

  if (stats.photoCount === 0) {
    parts.push(`今天还没有新的照片，期待大家的分享 ✨`);
  } else {
    parts.push(`📷 新增 ${stats.photoCount} 张照片`);
    if (stats.yoyoCount > 0) parts.push(`✨ 悠悠新作品 ${stats.yoyoCount} 件`);
    if (stats.zhizhiCount > 0) parts.push(`🎨 之之新作品 ${stats.zhizhiCount} 件`);
    if (stats.everyoneCount > 0) parts.push(`💛 大家新作品 ${stats.everyoneCount} 件`);
    if (stats.exploreCount > 0) parts.push(`🌿 探索新发现 ${stats.exploreCount} 件`);
    if (stats.uploaders.length > 0) parts.push(`👤 来自：${stats.uploaders.join('、')}`);
  }

  parts.push(`\n📱 进入照片墙
${config.siteUrl}`);
  parts.push(`✨ 悠悠作品集
${config.siteUrl}/portfolio/yoyo`);
  parts.push(`🎨 之之作品集
${config.siteUrl}/portfolio/zhizhi`);
  parts.push(`🌿 探索发现
${config.siteUrl}/portfolio/explore`);

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

📱 查看照片墙
${config.siteUrl}`;
  return wrapTextXml(from, to, now, content);
}

function joinHintReplyXml(from: string, to: string): string {
  const now = Math.floor(Date.now() / 1000);
  const content = `🔑 发送暗号即可加入家庭，之后发照片自动上墙！

（暗号由管理员告知家人）

📱 先看看照片墙
${config.siteUrl}`;
  return wrapTextXml(from, to, now, content);
}

function askNicknameXml(from: string, to: string): string {
  const now = Math.floor(Date.now() / 1000);
  const content = `🔑 暗号正确！

请问你是？（填写你的家庭昵称）

例如：妈妈、爸爸、奶奶…`;
  return wrapTextXml(from, to, now, content);
}
