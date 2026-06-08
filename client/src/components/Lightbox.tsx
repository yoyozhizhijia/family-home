import { useState, useEffect, useCallback, useRef } from 'react';
import type { Photo, Comment } from '../hooks/usePhotos';

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ photos, currentIndex, onClose, onNavigate }: LightboxProps) {
  const photo = photos[currentIndex];
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 触摸滑动检测
  const touchRef = useRef<{ startX: number; startY: number } | null>(null);

  useEffect(() => {
    setComments(photo?.comments || []);
    setText('');
  }, [currentIndex, photo]);

  if (!photo) return null;

  const goPrev = useCallback(() => {
    onNavigate(currentIndex > 0 ? currentIndex - 1 : photos.length - 1);
  }, [currentIndex, photos.length, onNavigate]);

  const goNext = useCallback(() => {
    onNavigate(currentIndex < photos.length - 1 ? currentIndex + 1 : 0);
  }, [currentIndex, photos.length, onNavigate]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/photos/${encodeURIComponent(photo.id)}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: author.trim() || '家人', text: text.trim() }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments((prev) => [...prev, c]);
        setText('');
      }
    } catch {}
    setSubmitting(false);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowLeft': goPrev(); break;
        case 'ArrowRight': goNext(); break;
      }
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goPrev, goNext]);

  const handleSave = async () => {
    try {
      const res = await fetch(photo.original_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `家庭时光_${photo.uploader_nickname}_${new Date(photo.uploaded_at).toLocaleDateString('zh-CN')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(photo.original_url, '_blank');
    }
  };

  return (
    <div
      className="lightbox-overlay fixed inset-0 z-50 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={(e) => { touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY }; }}
      onTouchEnd={(e) => {
        if (!touchRef.current) return;
        const dx = e.changedTouches[0].clientX - touchRef.current.startX;
        const dy = e.changedTouches[0].clientY - touchRef.current.startY;
        // 水平滑动超过50px且不是垂直滚动时，关闭灯箱
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          onClose();
        }
        touchRef.current = null;
      }}
    >
      <div className="min-h-screen flex flex-col items-center py-6 px-4">
        {/* 顶栏 */}
        <div className="w-full max-w-2xl flex items-center justify-between mb-3">
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">✕</button>
          <span className="text-white/40 text-sm">{currentIndex + 1} / {photos.length}</span>
          <button
            onClick={handleSave}
            className="text-white/80 hover:text-white text-xs flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full"
          >
            ⬇ 保存
          </button>
        </div>

        {/* 图片 + 箭头 */}
        <div className="flex items-center justify-center gap-2 w-full max-w-5xl">
          {photos.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="text-white/70 hover:text-white text-4xl px-1 flex-shrink-0">‹</button>
          )}
          <img
            src={photo.original_url}
            alt="家庭照片"
            className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-2xl"
          />
          {photos.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="text-white/70 hover:text-white text-4xl px-1 flex-shrink-0">›</button>
          )}
        </div>

        {/* 照片信息 */}
        <div className="w-full max-w-2xl text-center mt-3 text-white/60 text-sm">
          {photo.uploader_nickname} · {new Date(photo.uploaded_at).toLocaleString('zh-CN')}
          {photo.category && <span className="text-white/40"> · {categoryLabel(photo.category)}</span>}
        </div>

        {/* 评论区 —— 放在照片下方 */}
        <div className="w-full max-w-lg mt-5 bg-black/40 rounded-2xl p-4 text-white">
          <h3 className="text-sm font-semibold mb-3">💬 留言 ({comments.length})</h3>

          {comments.length === 0 && (
            <p className="text-white/30 text-xs mb-3">还没有留言，来说点什么吧～</p>
          )}

          {comments.length > 0 && (
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="text-xs bg-white/10 rounded-lg px-3 py-2">
                  <span className="font-medium text-amber-300">{c.author}</span>
                  <span className="text-white/30 ml-2">{formatTime(c.created_at)}</span>
                  <p className="mt-1 text-white/70">{c.text}</p>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleComment} className="flex gap-2">
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="昵称"
              maxLength={20}
              className="w-20 px-2 py-1.5 text-xs rounded-lg bg-white/10 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="写留言..."
              maxLength={200}
              className="flex-1 px-2 py-1.5 text-xs rounded-lg bg-white/10 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="px-4 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-40 transition"
            >
              发送
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
