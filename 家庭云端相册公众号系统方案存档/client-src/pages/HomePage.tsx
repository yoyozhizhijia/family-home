import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import PhotoWall from '../components/PhotoWall';
import UploadButton from '../components/UploadButton';
import AdminPanel from '../components/AdminPanel';
import MemberManager from '../components/MemberManager';
import StorageBadge from '../components/StorageBadge';
import TodayBanner from '../components/TodayBanner';
import { usePhotos } from '../hooks/usePhotos';
import { useAdmin } from '../hooks/useAdmin';
import type { Photo } from '../hooks/usePhotos';

interface MonthStat {
  month_key: string;
  count: number;
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${year}年${month}月`;
}

export default function HomePage() {
  const location = useLocation();
  const isArchive = location.pathname === '/archive';

  const [months, setMonths] = useState<MonthStat[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [showMembers, setShowMembers] = useState(false);

  const admin = useAdmin();

  useEffect(() => {
    fetch('/api/months')
      .then((r) => r.json())
      .then((data) => setMonths(data.stats || []))
      .catch(() => {});
  }, []);

  const { photos, total, hasMore, loading, loadMore, refresh } =
    usePhotos(selectedMonth || undefined);

  // 管理员删除
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('确定删除这张照片吗？此操作不可恢复。')) return;
    try {
      const res = await admin.authedFetch(`/api/photos/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('删除失败');
      refresh();
    } catch (err: any) {
      alert(err.message || '删除失败');
    }
  }, [admin.authedFetch, refresh]);

  // 管理员修改昵称
  const handleUpdateNickname = useCallback(async (id: string, nickname: string) => {
    try {
      const res = await admin.authedFetch(`/api/photos/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      });
      if (!res.ok) throw new Error('修改失败');
      refresh();
    } catch (err: any) {
      alert(err.message || '修改失败');
    }
  }, [admin.authedFetch, refresh]);

  return (
    <div>
      {/* 月份筛选条 */}
      <div className="mb-6 flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedMonth('')}
            className={`px-3 py-1.5 rounded-full text-sm transition ${
              selectedMonth === ''
                ? 'bg-amber-600 text-white'
                : 'bg-white text-amber-700 hover:bg-amber-100'
            }`}
          >
            全部{total ? ` (${total})` : ''}
          </button>
          {months.map((m) => (
            <button
              key={m.month_key}
              onClick={() => setSelectedMonth(m.month_key)}
              className={`px-3 py-1.5 rounded-full text-sm transition ${
                selectedMonth === m.month_key
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-amber-700 hover:bg-amber-100'
              }`}
            >
              {formatMonthLabel(m.month_key)} ({m.count})
            </button>
          ))}
        </div>

        {/* 管理员按钮 */}
        <div className="flex items-center gap-2">
          {admin.isAdmin ? (
            <>
              <button
                onClick={() => setShowMembers(true)}
                className="px-3 py-1.5 text-xs rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition"
              >
                👨‍👩‍👧‍👦 成员
              </button>
              <StorageBadge authedFetch={admin.authedFetch} />
              <button
                onClick={admin.logout}
                className="px-3 py-1.5 text-xs rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition"
              >
                退出管理
              </button>
            </>
          ) : (
            <button
              onClick={() => admin.setShowLogin(true)}
              className="px-3 py-1.5 text-xs rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition"
            >
              🔐 管理
            </button>
          )}
        </div>
      </div>

      {/* 今日动态 */}
      <TodayBanner />

      {/* 照片墙 */}
      <PhotoWall
        photos={photos}
        hasMore={hasMore}
        loading={loading}
        onLoadMore={loadMore}
        isAdmin={admin.isAdmin}
        onDelete={handleDelete}
        onUpdateNickname={handleUpdateNickname}
      />

      {/* 网页上传按钮 */}
      {admin.isAdmin && <UploadButton onUploaded={refresh} authedFetch={admin.authedFetch} />}

      {/* 管理员登录弹窗 */}
      {admin.showLogin && (
        <AdminPanel
          onLogin={admin.login}
          error={admin.error}
          onClose={() => admin.setShowLogin(false)}
        />
      )}

      {/* 成员管理弹窗 */}
      {showMembers && (
        <MemberManager
          authedFetch={admin.authedFetch}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  );
}
