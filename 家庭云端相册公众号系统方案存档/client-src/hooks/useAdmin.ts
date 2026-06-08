import { useState, useCallback, useEffect } from 'react';

const TOKEN_KEY = 'family_admin_token';

export function useAdmin() {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });
  const [showLogin, setShowLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 登录
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '登录失败');
        return false;
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      return true;
    } catch {
      setError('网络错误，请重试');
      return false;
    }
  }, []);

  // 登出
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  // 带 token 的 fetch
  const authedFetch = useCallback(
    (url: string, options: RequestInit = {}) => {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    },
    [token],
  );

  return {
    token,
    isAdmin: !!token,
    showLogin,
    setShowLogin,
    login,
    logout,
    error,
    authedFetch,
  };
}
