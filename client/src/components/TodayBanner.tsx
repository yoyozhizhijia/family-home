import { useState, useEffect } from 'react';

interface TodayData {
  photoCount: number;
  yoyoCount: number;
  zhizhiCount: number;
  everyoneCount: number;
  uploaders: string[];
}

export default function TodayBanner() {
  const [data, setData] = useState<TodayData | null>(null);

  useEffect(() => {
    fetch('/api/today')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <div className="mb-6 px-5 py-4 bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 rounded-2xl border border-amber-200 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-amber-700">📊 今日家庭播报</span>
      </div>

      {data.photoCount === 0 ? (
        <p className="text-sm text-amber-500">今天还没有新照片，期待大家的分享 ✨</p>
      ) : (
        <div className="space-y-1 text-sm text-amber-700">
          <p>
            📷 今日新增 <strong>{data.photoCount}</strong> 张照片
            {data.uploaders.length > 0 && (
              <span className="text-amber-500"> · 来自 {data.uploaders.join('、')}</span>
            )}
          </p>
          <div className="flex gap-4 text-xs">
            {data.yoyoCount > 0 && (
              <a href="/portfolio/yoyo" className="text-pink-600 hover:underline">🎨 悠悠 +{data.yoyoCount}</a>
            )}
            {data.zhizhiCount > 0 && (
              <a href="/portfolio/zhizhi" className="text-sky-600 hover:underline">✨ 之之 +{data.zhizhiCount}</a>
            )}
            {data.everyoneCount > 0 && (
              <a href="/portfolio/everyone" className="text-orange-600 hover:underline">💛 大家 +{data.everyoneCount}</a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
