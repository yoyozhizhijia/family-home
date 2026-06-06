import crypto from 'crypto';
import { config } from '../config';

// 简单的 token 存储（服务重启后失效，对家庭场景足够）
const validTokens = new Set<string>();

/** 校验管理员账号密码，成功返回 token */
export function verifyCredentials(username: string, password: string): string | null {
  const expectedUser = config.adminUsername;
  const expectedPwd = config.accessPassword;
  if (!expectedPwd) return null;
  if (username !== expectedUser || password !== expectedPwd) return null;

  const token = crypto.randomBytes(32).toString('hex');
  validTokens.add(token);

  // 1 小时后过期
  setTimeout(() => validTokens.delete(token), 60 * 60 * 1000);

  return token;
}

/** 验证 token 是否有效 */
export function verifyToken(token: string): boolean {
  return validTokens.has(token);
}

/** 登出（清除 token） */
export function revokeToken(token: string): void {
  validTokens.delete(token);
}
