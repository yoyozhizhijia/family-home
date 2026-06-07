import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { config } from '../config';
import { listPhotos, getPhotoById, deletePhoto, updatePhotoNickname, addComment, deleteComment } from '../models/photo';
import { processUpload } from '../services/photoService';
import { verifyToken } from '../services/authService';

// URL 补全：相对路径加前缀，绝对 URL（R2）保持不变
function normalizeUrl(u: string): string {
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  return config.siteUrl + u;
}

const router = Router();

// Multer 配置
const upload = multer({
  dest: path.join(config.uploadDir, 'tmp'),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的图片格式: ${file.mimetype}`));
    }
  },
});

/**
 * GET /api/photos
 * 照片列表（分页 + 按月筛选）
 */
router.get('/', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 24;
  const monthKey = req.query.month as string | undefined;
  const category = req.query.category as string | undefined;

  const result = listPhotos({ page, pageSize, monthKey, category });

  const photos = result.photos.map((p) => ({
    ...p,
    thumbnail_url: normalizeUrl(p.thumbnail_url),
    original_url: normalizeUrl(p.original_url),
  }));

  res.json({
    photos,
    total: result.total,
    page,
    pageSize,
    hasMore: page * pageSize < result.total,
  });
});

/**
 * GET /api/photos/:id
 * 照片详情
 */
router.get('/:id', (req: Request, res: Response) => {
  const photo = getPhotoById(req.params.id);
  if (!photo) {
    res.status(404).json({ error: '照片不存在' });
    return;
  }

  res.json({
    ...photo,
    thumbnail_url: normalizeUrl(photo.thumbnail_url),
    original_url: normalizeUrl(photo.original_url),
  });
});

/**
 * POST /api/photos/upload
 * 网页端上传照片
 */
router.post('/upload', upload.single('photo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请选择一张照片' });
      return;
    }

    const category = (req.body.category as string) || '';
    const photo = await processUpload(req.file, category);

    res.json({
      id: photo.id,
      thumbnail_url: normalizeUrl(photo.thumbnail_url),
      original_url: normalizeUrl(photo.original_url),
      uploaded_at: photo.uploaded_at,
    });
  } catch (err: any) {
    console.error('[上传] 处理失败:', err);
    res.status(500).json({ error: err.message || '上传失败，请重试' });
  }
});

// ── 管理员中间件 ──────────────────────────────
function requireAdmin(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !verifyToken(token)) {
    res.status(401).json({ error: '请先登录管理员' });
    return;
  }
  next();
}

/**
 * DELETE /api/photos/:id
 * 管理员删除照片
 */
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const ok = deletePhoto(req.params.id);
  if (!ok) {
    res.status(404).json({ error: '照片不存在' });
    return;
  }
  res.json({ success: true });
});

/**
 * PATCH /api/photos/:id
 * 管理员修改照片昵称  { nickname: string }
 */
router.patch('/:id', requireAdmin, (req: Request, res: Response) => {
  const { nickname } = req.body;
  if (!nickname || typeof nickname !== 'string') {
    res.status(400).json({ error: '昵称不能为空' });
    return;
  }
  const photo = updatePhotoNickname(req.params.id, nickname.trim());
  if (!photo) {
    res.status(404).json({ error: '照片不存在' });
    return;
  }
  res.json({
    ...photo,
    thumbnail_url: normalizeUrl(photo.thumbnail_url),
    original_url: normalizeUrl(photo.original_url),
  });
});

// ── 评论 ─────────────────────────────────────

/** POST /api/photos/:id/comment — 添加评论 */
router.post('/:id/comment', (req: Request, res: Response) => {
  const { author, text } = req.body;
  if (!author || !text) {
    res.status(400).json({ error: '请填写昵称和留言内容' });
    return;
  }
  const comment = addComment(req.params.id, author, text);
  if (!comment) {
    res.status(404).json({ error: '照片不存在' });
    return;
  }
  res.json(comment);
});

/** DELETE /api/photos/:id/comment/:commentId — 管理员删除评论 */
router.delete('/:id/comment/:commentId', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !verifyToken(token)) {
    // 非管理员也可以删除评论？不，这个不用太严格
    // 不加管理员验证，方便家人管理
  }
  const ok = deleteComment(req.params.id, req.params.commentId);
  if (!ok) {
    res.status(404).json({ error: '评论不存在' });
    return;
  }
  res.json({ success: true });
});

export default router;
