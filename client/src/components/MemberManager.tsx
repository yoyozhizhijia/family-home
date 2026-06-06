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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNick, setEditNick] = useState('');

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

  const handleEditStart = (m: Member) => {
    setEditingId(m.openid);
    setEditNick(m.nickname);
  };

  const handleEditSave = async (openid: string) => {
    if (!editNick.trim()) return;
    try {
      await authedFetch(`/api/members/${encodeURIComponent(openid)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: editNick.trim() }),
      });
      setEditingId(null);
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
        <h2 className="text-lg font-bold text-amber-800 mb-1">👨‍👩‍👧‍👦 家庭成员</h2>
        <p className="text-xs text-amber-500 mb-4">
          添加后可发照片上墙。暗号加入的成员会自动出现在这里。
        </p>

        {/* 添加表单 */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <input
            type="text"
            value={openid}
            onChange={(e) => setOpenid(e.target.value)}
            placeholder="OpenID（自动填入）"
            className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="昵称"
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
                  {editingId === m.openid ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="text"
                        value={editNick}
                        onChange={(e) => setEditNick(e.target.value)}
                        className="flex-1 px-2 py-1 border border-amber-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSave(m.openid);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <button onClick={() => handleEditSave(m.openid)} className="text-green-600 hover:text-green-800 text-xs px-1">✓</button>
                      <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                    </div>
                  ) : (
                    <div>
                      <span className="font-medium text-amber-800">{m.nickname}</span>
                      <span className="text-amber-400 text-[10px] ml-2">{m.openid.substring(0, 16)}...</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {editingId !== m.openid && (
                      <button
                        onClick={() => handleEditStart(m)}
                        className="text-blue-400 hover:text-blue-600 text-xs transition"
                      >
                        ✏️
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(m.openid)}
                      className="text-red-400 hover:text-red-600 text-xs transition"
                    >
                      移除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-amber-100">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
