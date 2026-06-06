import { useState, useEffect } from 'react';

interface Member {
  openid: string;
  nickname: string;
  added_at: string;
}

interface MemberManagerProps {
  authedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onClose: () => void;
}

export default function MemberManager({ authedFetch, onClose }: MemberManagerProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [openid, setOpenid] = useState('');
  const [nickname, setNickname] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = async () => {
    try {
      const res = await authedFetch('/api/members');
      if (res.ok) setMembers(await res.json());
    } catch {}
  };

  useEffect(() => { loadMembers(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openid.trim() || !nickname.trim()) {
      setError('OpenID 和昵称都不能为空');
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const res = await authedFetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openid: openid.trim(), nickname: nickname.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      setOpenid('');
      setNickname('');
      loadMembers();
    } catch (err: any) {
      setError(err.message || '添加失败');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (openid: string) => {
    if (!confirm(`确定移除此成员吗？ta 发送照片将被忽略。`)) return;
    try {
      await authedFetch(`/api/members/${encodeURIComponent(openid)}`, { method: 'DELETE' });
      loadMembers();
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-[420px] max-w-[92vw] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-amber-800 mb-1">👨‍👩‍👧‍👦 家庭成员管理</h2>
        <p className="text-xs text-amber-500 mb-4">
          只有列表中的成员才能通过公众号发送照片。OpenID 可从服务端日志中获取。
        </p>

        {/* 添加表单 */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <input
            type="text"
            value={openid}
            onChange={(e) => setOpenid(e.target.value)}
            placeholder="成员 OpenID"
            className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="昵称（如：妈妈）"
            className="w-24 px-3 py-2 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="submit"
            disabled={adding}
            className="px-4 py-2 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-40 transition font-medium"
          >
            {adding ? '...' : '添加'}
          </button>
        </form>

        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

        {/* 成员列表 */}
        <div className="flex-1 overflow-y-auto">
          {members.length === 0 ? (
            <p className="text-center text-amber-400 text-sm py-6">
              还没有添加家庭成员
            </p>
          ) : (
            <div className="space-y-1.5">
              {members.map((m) => (
                <div
                  key={m.openid}
                  className="flex items-center justify-between px-3 py-2 bg-amber-50 rounded-lg text-sm"
                >
                  <div>
                    <span className="font-medium text-amber-800">{m.nickname}</span>
                    <span className="text-amber-400 text-[10px] ml-2">{m.openid.substring(0, 16)}...</span>
                  </div>
                  <button
                    onClick={() => handleDelete(m.openid)}
                    className="text-red-400 hover:text-red-600 text-xs transition"
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-amber-100">
          <p className="text-[10px] text-amber-400">
            💡 提示：让家庭成员给公众号发一条消息，服务端控制台就会打印其 OpenID，复制过来即可。
          </p>
          <button
            onClick={onClose}
            className="mt-3 w-full py-2 text-sm text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
