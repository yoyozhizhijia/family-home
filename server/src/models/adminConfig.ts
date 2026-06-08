import fs from 'fs';
import path from 'path';
import { config } from '../config';

const ADMIN_FILE = path.resolve(path.dirname(config.db.path), 'admin.json');

interface AdminConfig {
  username: string;
  password: string;
}

let adminConfig: AdminConfig | null = null;

function load(): AdminConfig | null {
  if (!fs.existsSync(ADMIN_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function save(cfg: AdminConfig) {
  const dir = path.dirname(ADMIN_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

export function getCredentials(): { username: string; password: string } {
  if (adminConfig) return adminConfig;
  adminConfig = load();
  return {
    username: adminConfig?.username || config.adminUsername,
    password: adminConfig?.password || config.accessPassword,
  };
}

export function updateCredentials(username: string, password: string): void {
  adminConfig = { username, password };
  save(adminConfig);
}
