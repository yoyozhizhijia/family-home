import { useState, useCallback, useEffect } from 'react';

export interface Photo {
  id: string;
  thumbnail_url: string;
  original_url: string;
  uploader_nickname: string;
  uploaded_at: string;
  month_key: string;
  width: number;
  height: number;
  category: string;
}

interface UsePhotosReturn {
  photos: Photo[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
}

export function usePhotos(monthKey?: string, category?: string): UsePhotosReturn {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(
    async (pageNum: number, append: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          pageSize: '24',
        });
        if (monthKey) params.set('month', monthKey);
        if (category !== undefined) params.set('category', category);

        const res = await fetch(`/api/photos?${params}`);
        if (!res.ok) throw new Error('加载失败');

        const data = await res.json();
        setPhotos((prev) =>
          append ? [...prev, ...data.photos] : data.photos,
        );
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(pageNum);
      } catch (err: any) {
        setError(err.message || '加载失败');
      } finally {
        setLoading(false);
      }
    },
    [monthKey, category],
  );

  // 参数变化时重新加载
  useEffect(() => {
    setPhotos([]);
    setPage(1);
    setHasMore(true);
    fetchPhotos(1, false);
  }, [fetchPhotos]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPhotos(page + 1, true);
    }
  }, [loading, hasMore, page, fetchPhotos]);

  const refresh = useCallback(() => {
    setPhotos([]);
    setPage(1);
    setHasMore(true);
    fetchPhotos(1, false);
  }, [fetchPhotos]);

  return { photos, total, hasMore, loading, error, loadMore, refresh };
}
