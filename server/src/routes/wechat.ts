import { Router, Request, Response } from 'express';
import { verifySignature, parseMessage, handleImageMessage } from '../services/wechatService';
import { isMember, getMemberNickname, upsertMember } from '../models/member';
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

      // 点击菜单「怎么用」→ 回复使用说明
      if (msg.msgType === 'event' && msg.event === 'CLICK' && msg.eventKey === 'HELP') {
        res.type('text/xml');
        res.send(helpReplyXml(msg.fromUserName, msg.toUserName));
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
      } else if (msg.msgType === 'text') {
        console.log('[微信] 收到文字消息，暂不处理');
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
  return `<xml>
<ToUserName>${from}</ToUserName>
<FromUserName>${to}</FromUserName>
<CreateTime>${now}</CreateTime>
<MsgType>text</MsgType>
<Content>📷 发送照片即可上传到家庭照片墙\n\n🔑 新家人先发暗号加入\n\n🏡 点「家庭时光」查看照片墙\n\n❤️ 记录我们的美好时光</Content>
</xml>`;
}

function welcomeReplyXml(from: string, to: string): string {
  const now = Math.floor(Date.now() / 1000);
  return `<xml>
<ToUserName>${from}</ToUserName>
<FromUserName>${to}</FromUserName>
<CreateTime>${now}</CreateTime>
<MsgType>text</MsgType>
<Content>🎉 欢迎加入家庭时光！\n\n从现在开始，你发的每张照片都会自动保存到我们的家庭照片墙。\n\n点底部菜单「🏡 家庭时光」即可查看！</Content>
</xml>`;
}

function notMemberReplyXml(from: string, to: string): string {
  const now = Math.floor(Date.now() / 1000);
  return `<xml>
<ToUserName>${from}</ToUserName>
<FromUserName>${to}</FromUserName>
<CreateTime>${now}</CreateTime>
<MsgType>text</MsgType>
<Content>👋 你好！你还不是家庭成员，无法上传照片。\n\n请发送暗号加入我们大家庭～</Content>
</xml>`;
}
