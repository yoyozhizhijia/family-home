import { useState, useEffect } from 'react';

interface StorageInfo {
  totalGB: string;
  percentUsed: string;
  alertGB: number;
  isAlerting: boolean;
  objectCount: number;
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
        `📦 存储用量：${info.totalGB} GB\n` +
        `使用率：${info.percentUsed}%\n` +
        `文件数：${info.objectCount}\n` +
        `告警阈值：${info.alertGB} GB\n\n` +
        `${isWarning ? '⚠️ 已超过 90%，建议扩容！' : '🟢 存储空间充足'}`
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
