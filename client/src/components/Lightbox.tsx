import { useEffect, useCallback } from 'react';
import type { Photo } from '../hooks/usePhotos';

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ photos, currentIndex, onClose, onNavigate }: LightboxProps) {
  const photo = photos[currentIndex];
  if (!photo) return null;

  const goPrev = useCallback(() => {
    onNavigate(currentIndex > 0 ? currentIndex - 1 : photos.length - 1);
  }, [currentIndex, photos.length, onNavigate]);

  const goNext = useCallback(() => {
    onNavigate(currentIndex < photos.length - 1 ? currentIndex + 1 : 0);
  }, [currentIndex, photos.length, onNavigate]);

  // 键盘操作
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
        case 'ArrowRight':
          goNext();
          break;
      }
    };
    document.addEventListener('keydown', handleKey);
    // 禁止背景滚动
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goPrev, goNext]);

  return (
    <div
      className="lightbox-overlay fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl z-10 transition-colors"
      >
        ✕
      </button>

      {/* 上一张 */}
      {photos.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-4 text-white/80 hover:text-white text-4xl z-10 transition-colors p-2"
        >
          ‹
        </button>
      )}

      {/* 图片 */}
      <div className="max-w-[90vw] max-h-[90vh] flex flex-col items-center">
        <img
          src={photo.original_url}
          alt={`家庭照片 - ${photo.uploader_nickname}`}
          className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl"
        />
        {/* 信息栏 */}
        <div className="mt-3 text-white/70 text-sm text-center">
          <span>{photo.uploader_nickname}</span>
          <span className="mx-2">·</span>
          <span>{new Date(photo.uploaded_at).toLocaleString('zh-CN')}</span>
          <span className="mx-2">·</span>
          <span>{currentIndex + 1} / {photos.length}</span>
        </div>
      </div>

      {/* 下一张 */}
      {photos.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-4 text-white/80 hover:text-white text-4xl z-10 transition-colors p-2"
        >
          ›
        </button>
      )}
    </div>
  );
}
