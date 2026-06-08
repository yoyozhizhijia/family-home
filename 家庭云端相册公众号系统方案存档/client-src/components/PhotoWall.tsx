import { useState, useRef, useEffect } from 'react';
import type { Photo } from '../hooks/usePhotos';
import Lightbox from './Lightbox';

interface PhotoWallProps {
  photos: Photo[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  onUpdateNickname?: (id: string, nickname: string) => void;
}

export default function PhotoWall({ photos, hasMore, loading, onLoadMore, isAdmin, onDelete, onUpdateNickname }: PhotoWallProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const loaderRef = useRef<HTMLDivElement>(null);

  // 无限滚动
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (photos.length === 0 && !loading) {
    return (
      <div className="text-center py-20 text-amber-500">
        <div className="text-7xl mb-5">📷</div>
        <p className="text-xl font-medium text-amber-700 mb-2">欢迎来到家庭时光机</p>
        <p className="text-sm text-amber-400">
          向公众号发送照片，或用右下角按钮上传
        </p>
        <p className="text-xs mt-4 text-amber-300">记录每一个温暖瞬间 💛</p>
      </div>
    );
  }

  return (
    <>
      {/* 瀑布流 */}
      <div className="masonry-grid">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="masonry-item fade-in group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow"
            style={{ animationDelay: `${(index % 12) * 50}ms` }}
          >
            <img
              src={photo.thumbnail_url}
              alt={`家庭照片 ${photo.uploaded_at}`}
              loading="lazy"
              className="w-full h-auto block group-hover:scale-105 transition-transform duration-300 cursor-pointer"
              onClick={() => setLightboxIndex(index)}
            />

            {/* 底部信息：始终可见 */}
            {!isAdmin && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-2.5 flex items-end justify-between">
                <p className="text-white text-[11px] drop-shadow-sm">
                  {photo.uploader_nickname} · {formatDate(photo.uploaded_at)}
                  {photo.category && <span className="ml-1 text-white/70">· {categoryLabel(photo.category)}</span>}
                </p>
                {(photo.comments?.length ?? 0) > 0 && (
                  <span className="text-white/80 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">💬 {photo.comments?.length}</span>
                )}
              </div>
            )}

            {/* 管理员模式：显示操作按钮 */}
            {isAdmin && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors">
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* 编辑昵称按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(photo.id);
                      setEditNickname(photo.uploader_nickname);
                    }}
                    className="px-2 py-1 text-[10px] bg-white/90 text-amber-700 rounded hover:bg-white transition"
                    title="修改昵称"
                  >
                    ✏️
                  </button>
                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(photo.id);
                    }}
                    className="px-2 py-1 text-[10px] bg-white/90 text-red-500 rounded hover:bg-white transition"
                    title="删除照片"
                  >
                    🗑
                  </button>
                </div>
                {/* 底部信息始终可见 */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 flex items-end justify-between">
                  <p className="text-white text-[10px]">
                    {photo.uploader_nickname} · {formatDate(photo.uploaded_at)}
                    {photo.category && <span className="ml-1 text-white/70">· {categoryLabel(photo.category)}</span>}
                  </p>
                  {(photo.comments?.length ?? 0) > 0 && (
                    <span className="text-white/80 text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">💬 {photo.comments?.length ?? 0}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 编辑昵称弹窗 */}
      {editingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setEditingId(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-5 w-72 max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-amber-800 mb-3">修改昵称</h3>
            <input
              type="text"
              value={editNickname}
              onChange={(e) => setEditNickname(e.target.value)}
              className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onUpdateNickname?.(editingId, editNickname);
                  setEditingId(null);
                }
              }}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setEditingId(null)}
                className="flex-1 py-1.5 text-xs text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onUpdateNickname?.(editingId, editNickname);
                  setEditingId(null);
                }}
                className="flex-1 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 加载触发器 */}
      <div ref={loaderRef} className="py-8 text-center">
        {loading && (
          <div className="flex items-center justify-center gap-2 text-amber-600">
            <span className="inline-block w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            加载中...
          </div>
        )}
        {!hasMore && photos.length > 0 && (
          <p className="text-amber-400 text-sm">— 已加载全部 {photos.length} 张照片 —</p>
        )}
      </div>

      {/* 灯箱 */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function categoryLabel(cat: string): string {
  switch (cat) {
    case 'yoyo': return '✨悠悠';
    case 'zhizhi': return '🎨之之';
    case 'everyone': return '💛大家';
    case 'explore': return '🌿探索';
    default: return '';
  }
}
