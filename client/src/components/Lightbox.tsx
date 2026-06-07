import { useState, useEffect, useCallback } from 'react';
import type { Photo, Comment } from '../hooks/usePhotos';

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ photos, currentIndex, onClose, onNavigate }: LightboxProps) {
  const photo = photos[currentIndex];
  const [comments, setComments] = useState<Comment[]>(photo?.comments || []);
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 切换图片时刷新评论
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

  // 键盘操作
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

  return (
    <div
      className="lightbox-overlay fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* 关闭按钮 */}
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl z-10">✕</button>

      {/* 左右切换 */}
      {photos.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-4 text-white/80 hover:text-white text-4xl z-10 p-2">‹</button>
      )}

      <div className="flex gap-4 max-w-[95vw] max-h-[90vh]">
        {/* 图片 */}
        <div className="flex flex-col items-center max-w-[65vw]">
          <img
            src={photo.original_url}
            alt={`家庭照片`}
            className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl"
          />
          <div className="mt-2 text-white/70 text-sm text-center">
            <span>{photo.uploader_nickname}</span>
            <span className="mx-2">·</span>
            <span>{new Date(photo.uploaded_at).toLocaleString('zh-CN')}</span>
            <span className="mx-2">·</span>
            <span>{currentIndex + 1} / {photos.length}</span>
          </div>
        </div>

        {/* 评论区 */}
        <div className="w-64 flex flex-col bg-black/50 rounded-xl p-4 text-white overflow-y-auto max-h-[85vh]">
          <h3 className="text-sm font-semibold mb-3">💬 留言 ({comments.length})</h3>

          {comments.length === 0 && (
            <p className="text-white/40 text-xs">还没有留言，来说点什么吧～</p>
          )}

          <div className="flex-1 space-y-2 overflow-y-auto mb-3">
            {comments.map((c) => (
              <div key={c.id} className="text-xs bg-white/10 rounded-lg px-3 py-2">
                <span className="font-medium text-amber-300">{c.author}</span>
                <span className="text-white/40 ml-2">{formatTime(c.created_at)}</span>
                <p className="mt-1 text-white/80">{c.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleComment} className="space-y-2">
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="你的昵称"
              maxLength={20}
              className="w-full px-2 py-1.5 text-xs rounded-lg bg-white/10 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="写下留言..."
              maxLength={200}
              className="w-full px-2 py-1.5 text-xs rounded-lg bg-white/10 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="w-full py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-40 transition"
            >
              {submitting ? '...' : '发送'}
            </button>
          </form>
        </div>
      </div>

      {photos.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-4 text-white/80 hover:text-white text-4xl z-10 p-2">›</button>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}
