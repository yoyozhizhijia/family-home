import { useState } from 'react';

interface ChangePasswordProps {
  authedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onClose: () => void;
}

export default function ChangePassword({ authedFetch, onClose }: ChangePasswordProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setMessage('账号和密码不能为空');
      return;
    }
    if (password !== confirm) {
      setMessage('两次密码不一致');
      return;
    }
    if (password.length < 4) {
      setMessage('密码至少4位');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await authedFetch('/api/admin/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (res.ok) {
        setMessage('✅ 密码已更新');
        setTimeout(onClose, 1500);
      } else {
        const d = await res.json();
        setMessage(d.error || '修改失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-amber-800 mb-1">🔐 修改密码</h2>
        <p className="text-xs text-amber-500 mb-4">更新管理员登录凭据</p>
        <form onSubmit={handleSubmit}>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="新账号" autoFocus
            className="w-full px-3 py-2.5 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 mb-3" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="新密码（至少4位）"
            className="w-full px-3 py-2.5 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 mb-3" />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="确认新密码"
            className="w-full px-3 py-2.5 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 mb-3" />
          {message && <p className={`text-xs mb-2 ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{message}</p>}
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition">取消</button>
            <button type="submit" disabled={submitting || !username.trim() || !password.trim()}
              className="flex-1 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-40 transition font-medium">
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
