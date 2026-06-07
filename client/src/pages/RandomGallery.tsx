import { useState, useEffect, useCallback } from 'react';
import { usePhotos } from '../hooks/usePhotos';
import Lightbox from '../components/Lightbox';

export default function RandomGallery() {
  const [seed, setSeed] = useState(Date.now());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { photos, total, loading, loadMore, refresh } = usePhotos();

  const handleShuffle = useCallback(() => {
    setSeed(Date.now());
    refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 600 && !loading) {
        loadMore();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, loadMore]);

  const shuffled = [...photos].sort(() => Math.random() - 0.5);

  return (
    <div>
      <div className="bg-gradient-to-r from-violet-400 to-purple-500 -mx-4 -mt-6 px-4 py-7 mb-6 rounded-b-3xl shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">🔀 随便看看</h1>
            <p className="text-white/70 text-sm mt-1">随机翻阅，每一张都是惊喜</p>
          </div>
          <button onClick={handleShuffle}
            className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-full text-sm font-medium transition backdrop-blur">
            🔄 换一批
          </button>
        </div>
      </div>

      {shuffled.length === 0 && !loading ? (
        <div className="text-center py-20 text-amber-400">
          <div className="text-6xl mb-4">🎲</div>
          <p className="text-lg">还没有照片</p>
          <p className="text-sm mt-1">发照片到公众号，再来随便看看</p>
        </div>
      ) : (
        <>
          <div className="masonry-grid">
            {shuffled.map((photo, index) => (
              <div key={photo.id}
                className="masonry-item fade-in group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                style={{ animationDelay: `${(index % 12) * 50}ms` }}
                onClick={() => setLightboxIndex(index)}>
                <img src={photo.thumbnail_url} alt="随便看看" loading="lazy"
                  className="w-full h-auto block group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <p className="text-white text-xs">{photo.uploader_nickname}</p>
                </div>
              </div>
            ))}
          </div>
          {loading && <div className="py-8 text-center text-amber-400 text-sm">加载中...</div>}
          {!loading && shuffled.length >= 24 && (
            <div className="py-8 text-center">
              <button onClick={handleShuffle}
                className="px-6 py-2.5 bg-violet-100 text-violet-700 rounded-full text-sm hover:bg-violet-200 transition font-medium">
                🔄 换一批看看
              </button>
            </div>
          )}
        </>
      )}

      {lightboxIndex !== null && (
        <Lightbox photos={shuffled} currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)} onNavigate={setLightboxIndex} />
      )}
    </div>
  );
}
