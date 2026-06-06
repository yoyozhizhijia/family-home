import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { config } from '../config';
import { listPhotos, getPhotoById, deletePhoto, updatePhotoNickname } from '../models/photo';
import { processUpload } from '../services/photoService';
import { verifyToken } from '../services/authService';

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

  const result = listPhotos({ page, pageSize, monthKey });

  // 把路径补全为完整 URL
  const photos = result.photos.map((p) => ({
    ...p,
    thumbnail_url: config.siteUrl + p.thumbnail_url,
    original_url: config.siteUrl + p.original_url,
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
    thumbnail_url: config.siteUrl + photo.thumbnail_url,
    original_url: config.siteUrl + photo.original_url,
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

    const photo = await processUpload(req.file);

    res.json({
      id: photo.id,
      thumbnail_url: config.siteUrl + photo.thumbnail_url,
      original_url: config.siteUrl + photo.original_url,
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
    thumbnail_url: config.siteUrl + photo.thumbnail_url,
    original_url: config.siteUrl + photo.original_url,
  });
});

export default router;
