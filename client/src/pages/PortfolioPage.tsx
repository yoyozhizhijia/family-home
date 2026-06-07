import { useParams, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { usePhotos } from '../hooks/usePhotos';
import { useAdmin } from '../hooks/useAdmin';
import Lightbox from '../components/Lightbox';

interface PortfolioInfo {
  key: string;
  title: string;
  subtitle: string;
  emoji: string;
  gradient: string;
}

const CATEGORIES: Record<string, PortfolioInfo> = {
  yoyo: { key: 'yoyo', title: '悠悠作品集', subtitle: '悠悠的画笔与小手作 🎨', emoji: '🎨', gradient: 'from-sky-400 to-blue-500' },
  zhizhi: { key: 'zhizhi', title: '之之作品集', subtitle: '之之的创意与成长 ✨', emoji: '✨', gradient: 'from-pink-400 to-rose-500' },
  everyone: { key: 'everyone', title: '大家的作品', subtitle: '一起创作的美好时光 💛', emoji: '💛', gradient: 'from-amber-400 to-orange-500' },
};

export default function PortfolioPage() {
  const { cat } = useParams<{ cat: string }>();
  const navigate = useNavigate();
  const info = CATEGORIES[cat || ''] || CATEGORIES.everyone;
  const admin = useAdmin();

  const { photos, total, hasMore, loading, loadMore, refresh } = usePhotos(undefined, info.key);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  // 无限滚动
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loading) loadMore(); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore]);

  // 上传
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    let success = 0;
    let fail = 0;

    for (let i = 0; i < files.length; i++) {
      try {
        const formData = new FormData();
        formData.append('photo', files[i]);
        formData.append('category', info.key);
        const res = await fetch('/api/photos/upload', { method: 'POST', body: formData });
        if (res.ok) success++; else fail++;
      } catch { fail++; }
    }

    setUploading(false);
    setMessage(fail === 0
      ? `✅ ${success} 张作品上传成功！\n📱 照片墙：https://family-home.onrender.com`
      : `⚠️ 成功 ${success} 张，失败 ${fail} 张`
    );
    refresh();
    setTimeout(() => setMessage(null), 3000);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 管理员删除
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('确定移除这个作品吗？')) return;
    try {
      await admin.authedFetch(`/api/photos/${encodeURIComponent(id)}`, { method: 'DELETE' });
      refresh();
    } catch { alert('删除失败'); }
  }, [admin.authedFetch, refresh]);

  return (
    <div>
      {/* 顶部横幅 */}
      <div className={`bg-gradient-to-r ${info.gradient} -mx-4 -mt-6 px-4 py-8 mb-6 rounded-b-3xl shadow-lg`}>
        <div className="max-w-4xl mx-auto">
          {/* 导航标签 */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {Object.values(CATEGORIES).map((c) => (
              <button
                key={c.key}
                onClick={() => navigate(`/portfolio/${c.key}`)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  info.key === c.key
                    ? 'bg-white/25 text-white shadow'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {c.emoji} {c.title}
              </button>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-white">{info.title}</h1>
          <p className="text-white/80 text-sm mt-1">{info.subtitle}</p>
          <p className="text-white/50 text-xs mt-1">{total} 件作品</p>
        </div>
      </div>

      {/* 上传按钮 */}
      <div className="max-w-4xl mx-auto mb-4 flex justify-end gap-2">
        {admin.isAdmin && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 text-sm bg-white text-amber-700 rounded-full shadow hover:shadow-md transition font-medium"
          >
            {uploading ? '上传中...' : `📷 添加作品`}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
      </div>

      {/* 提示 */}
      {message && (
        <div className="max-w-4xl mx-auto mb-4 px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm text-center">
          {message}
        </div>
      )}

      {/* 作品网格 */}
      <div className="max-w-4xl mx-auto">
        {photos.length === 0 && !loading ? (
          <div className="text-center py-20 text-amber-400">
            <div className="text-6xl mb-4">{info.emoji}</div>
            <p className="text-lg">还没有作品</p>
            <p className="text-sm mt-1">管理员可以点击「添加作品」上传</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="relative group cursor-pointer rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow fade-in aspect-square bg-amber-100"
                  style={{ animationDelay: `${(index % 8) * 50}ms` }}
                >
                  <img
                    src={photo.thumbnail_url}
                    alt={`${info.title}`}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onClick={() => setLightboxIndex(index)}
                  />
                  {admin.isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                      className="absolute top-1 right-1 text-xs bg-white/80 text-red-500 rounded-full w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div ref={loaderRef} className="py-8 text-center">
              {loading && <span className="text-amber-400 text-sm">加载中...</span>}
              {!hasMore && photos.length > 0 && (
                <p className="text-amber-300 text-sm">— 共 {total} 件作品 —</p>
              )}
            </div>
          </>
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
    </div>
  );
}
