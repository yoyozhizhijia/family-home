import { useState } from 'react';

interface AdminPanelProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  error: string | null;
  onClose: () => void;
}

export default function AdminPanel({ onLogin, error, onClose }: AdminPanelProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setSubmitting(true);
    const ok = await onLogin(username, password);
    setSubmitting(false);
    if (ok) {
      setUsername('');
      setPassword('');
      onClose();  // 登录成功自动关闭弹窗
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 max-w-[90vw] animate-in fade-in">
        <h2 className="text-lg font-bold text-amber-800 mb-1">🔐 管理员登录</h2>
        <p className="text-xs text-amber-500 mb-4">输入密码以管理照片</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="管理员账号"
              autoFocus
              className="w-full px-3 py-2.5 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
            />
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="管理员密码"
            className="w-full px-3 py-2.5 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
          />

          {error && (
            <p className="text-red-500 text-xs mt-2">{error}</p>
          )}

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || !username.trim() || !password.trim()}
              className="flex-1 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-40 transition font-medium"
            >
              {submitting ? '验证中...' : '登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
