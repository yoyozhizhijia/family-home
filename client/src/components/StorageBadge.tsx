import { useState, useEffect } from 'react';

interface StorageInfo {
  totalMB: string;
  totalGB: string;
  percentUsed: string;
  alertGB: number;
  isAlerting: boolean;
  plan: string;
  credits: number;
}

interface StorageBadgeProps {
  authedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function StorageBadge({ authedFetch }: StorageBadgeProps) {
  const [info, setInfo] = useState<StorageInfo | null>(null);

  useEffect(() => {
    authedFetch('/api/admin/storage')
      .then((r) => r.json())
      .then((d) => setInfo(d))
      .catch(() => {});
  }, []);

  if (!info) return null;

  const isWarning = parseFloat(info.percentUsed) >= 90;

  return (
    <button
      onClick={() => alert(
        `📦 存储用量：${info.totalMB} MB（${info.totalGB} GB）\n` +
        `使用率：${info.percentUsed}%\n` +
        `当前方案：${info.plan}\n` +
        `告警阈值：${info.alertGB} GB\n\n` +
        `${isWarning ? '⚠️ 建议留意空间扩容！' : '🟢 存储空间充足'}\n\n` +
        `Cloudinary 免费 25GB，超出后可按需升级`
      )}
      className={`px-3 py-1.5 text-xs rounded-full transition ${
        isWarning
          ? 'bg-red-100 text-red-700 hover:bg-red-200 animate-pulse'
          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
      }`}
      title={`已用 ${info.totalGB} GB / ${info.percentUsed}%`}
    >
      {isWarning ? '⚠️ ' : '📦 '}
      {info.totalGB} GB
    </button>
  );
}
