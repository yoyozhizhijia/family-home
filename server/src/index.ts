import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import wechatRoutes from './routes/wechat';
import photoRoutes from './routes/photos';
import { listMonths, countByMonth, dataInitPromise, todayStats } from './models/photo';
import { verifyCredentials, verifyToken } from './services/authService';
import { listMembers, upsertMember, removeMember, memberInitPromise } from './models/member';
import { setCustomMenu, getMenuInfo } from './services/wechatService';
import { getStorageUsage } from './services/cloudinaryService';

// 管理员鉴权中间件
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !verifyToken(token)) {
    res.status(401).json({ error: '请先登录管理员' });
    return;
  }
  next();
}

const app = express();

// ── 中间件 ──────────────────────────────────────
app.use(cors());
app.use(express.json());

// 静态文件：本地图片（兼容过渡期，R2 启用后由 R2 直链提供）
app.use('/uploads', express.static(config.uploadDir));

// ── 路由 ────────────────────────────────────────
// 微信回调（注意：此路由不能用 express.json()，微信发的是 XML）
app.use('/api/wechat', wechatRoutes);

// 照片 API
app.use('/api/photos', photoRoutes);

// 管理员登录
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '请输入账号和密码' });
    return;
  }
  const token = verifyCredentials(username, password);
  if (!token) {
    res.status(403).json({ error: '账号或密码错误' });
    return;
  }
  res.json({ token });
});

// ── 家庭成员管理（管理员） ──────────────────────
// 列出所有成员
app.get('/api/members', requireAdmin, (_req, res) => {
  res.json(listMembers());
});

// 添加/更新成员
app.post('/api/members', requireAdmin, async (req, res) => {
  const { openid, nickname } = req.body;
  if (!openid || !nickname) {
    res.status(400).json({ error: 'openid 和 nickname 不能为空' });
    return;
  }
  const member = await upsertMember(openid, nickname);
  res.json(member);
});

// 删除成员
app.delete('/api/members/:openid', requireAdmin, async (req, res) => {
  const ok = await removeMember(req.params.openid);
  if (!ok) {
    res.status(404).json({ error: '成员不存在' });
    return;
  }
  res.json({ success: true });
});

// 修改成员昵称
app.patch('/api/members/:openid', requireAdmin, async (req, res) => {
  const { nickname } = req.body;
  if (!nickname || typeof nickname !== 'string') {
    res.status(400).json({ error: '昵称不能为空' });
    return;
  }
  const member = await upsertMember(req.params.openid, nickname.trim());
  res.json(member);
});

// 月份归档
app.get('/api/months', (_req, res) => {
  const months = listMonths();
  const stats = countByMonth();
  res.json({ months, stats });
});

// 今日统计（无需登录）
app.get('/api/today', (_req, res) => {
  const today = todayStats();
  res.json(today);
});

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 深度健康：检查备份一致性
app.get('/api/health/deep', (req, res) => {
  const { countPhotos } = require('./models/photo');
  const { listMembers } = require('./models/member');
  const memCnt = listMembers().length;
  const photoCnt = countPhotos();
  res.json({
    memory_photos: photoCnt,
    memory_members: memCnt,
    site_url: config.siteUrl,
    cloudinary_connected: !!config.cloudinary.cloudName,
  });
});

// 管理员手动触发备份（诊断用）
app.post('/api/admin/force-backup', requireAdmin, async (_req, res) => {
  try {
    const { backupJson } = require('./services/cloudinaryService');
    const { countPhotos, listPhotos } = require('./models/photo');
    const photos = listPhotos({ pageSize: 9999 }).photos;
    const url = await backupJson('photos', photos);
    const members = require('./models/member').listMembers();
    await backupJson('members', members);
    res.json({ success: true, photos_count: photos.length, members_count: members.length, url });
  } catch (err: any) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// 管理员导出备份数据 (JSON下载)
app.get('/api/admin/export', requireAdmin, (_req, res) => {
  const { listPhotos } = require('./models/photo');
  const { listMembers } = require('./models/member');
  const photos = listPhotos({ pageSize: 99999 }).photos;
  const members = listMembers();

  const exportData = {
    exported_at: new Date().toISOString(),
    stats: {
      photos: photos.length,
      members: members.length,
    },
    photos: photos.map((p: any) => ({
      id: p.id,
      uploader_nickname: p.uploader_nickname,
      category: p.category || '',
      uploaded_at: p.uploaded_at,
      original_url: p.original_url,
      comments: p.comments || [],
    })),
    members,
  };

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=family-backup-${new Date().toISOString().slice(0,10)}.json`);
  res.send(JSON.stringify(exportData, null, 2));
});

// 管理员设置公众号菜单
app.post('/api/admin/set-menu', requireAdmin, async (_req, res) => {
  try {
    const result = await setCustomMenu();
    const info = await getMenuInfo();
    res.json({ 
      success: true, 
      message: '菜单已发布',
      wechat_errcode: result.errcode,
      has_menu: !!(info.selfmenu_info?.button?.length > 0),
      button_count: info.selfmenu_info?.button?.length || 0,
      raw: info,
    });
  } catch (err: any) {
    res.status(500).json({ 
      error: err.message,
      hint: config.wechat.appId ? 'AppID已配置' : 'AppID缺失',
      secret: config.wechat.appSecret ? '已配置' : '缺失',
    });
  }
});

// 存储用量查询（管理员）
app.get('/api/admin/storage', requireAdmin, async (_req, res) => {
  try {
    const usage = await getStorageUsage();
    res.json(usage);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── 生产环境：托管前端静态文件 ─────────────────
// Docker 容器和本地开发的目录结构不同，同时兼容两者
const clientDistDocker = path.resolve(__dirname, '../client/dist');
const clientDistLocal = path.resolve(__dirname, '../../client/dist');
const clientDist = fs.existsSync(clientDistDocker) ? clientDistDocker : clientDistLocal;
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ── 启动 ────────────────────────────────────────
async function start() {
  // 等待数据从云端恢复
  await Promise.all([dataInitPromise, memberInitPromise]);
  console.log('[启动] 数据初始化完成，准备接受请求');

  app.listen(config.port, () => {
    console.log(`🏡 家庭时光机服务器已启动: http://localhost:${config.port}`);
    console.log(`   微信回调地址: ${config.siteUrl}/api/wechat/callback`);
  });
}

start();
 
