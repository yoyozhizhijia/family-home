import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { backupJson, restoreJson } from '../services/cloudinaryService';

export interface Member {
  openid: string;
  nickname: string;
  added_at: string;
}

const MEMBER_FILE = path.resolve(path.dirname(config.db.path), 'members.json');
const BACKUP_KEY = 'members';
let members: Member[] = [];

function load() {
  if (!fs.existsSync(MEMBER_FILE)) {
    members = [];
  } else {
    try { members = JSON.parse(fs.readFileSync(MEMBER_FILE, 'utf8')); }
    catch { members = []; }
  }
}

async function save() {
  const dir = path.dirname(MEMBER_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MEMBER_FILE, JSON.stringify(members, null, 2), 'utf8');

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await backupJson(BACKUP_KEY, members);
      return;
    } catch (err: any) {
      console.error(`[成员] 云端备份失败 (第${attempt}次):`, err.message);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.error('[成员] ⚠️ 云端备份最终失败！');
}

/** 启动时从云端恢复 */
export async function initFromCloud() {
  const remote = await restoreJson<Member[]>(BACKUP_KEY);
  const hasRemote = remote && Array.isArray(remote) && remote.length > 0;

  let local: Member[] = [];
  if (fs.existsSync(MEMBER_FILE)) {
    try { local = JSON.parse(fs.readFileSync(MEMBER_FILE, 'utf8')); } catch {}
  }
  if (!Array.isArray(local)) local = [];

  if (hasRemote && remote.length >= local.length) {
    members = remote;
    const dir = path.dirname(MEMBER_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MEMBER_FILE, JSON.stringify(members, null, 2), 'utf8');
    console.log(`[成员] 从云端恢复 ${members.length} 位 (本地${local.length}位)`);
  } else if (local.length > 0) {
    members = local;
    console.log(`[成员] 使用本地 ${local.length} 位 (云端${remote?.length || 0}位)，补备份`);
    save().catch(() => {});
  } else {
    members = [];
    console.log('[成员] 无数据，从零开始');
  }
}

export const memberInitPromise = initFromCloud();

/** 判断 openid 是否在白名单中 */
export function isMember(openid: string): boolean {
  return members.some((m) => m.openid === openid);
}

/** 获取成员昵称（白名单里的），未找到返回空 */
export function getMemberNickname(openid: string): string {
  const m = members.find((m) => m.openid === openid);
  return m?.nickname || '';
}

/** 添加/更新成员 */
export async function upsertMember(openid: string, nickname: string): Promise<Member> {
  const existing = members.find((m) => m.openid === openid);
  if (existing) {
    existing.nickname = nickname;
    await save();
    return existing;
  }
  const m: Member = {
    openid,
    nickname,
    added_at: new Date().toISOString(),
  };
  members.push(m);
  await save();
  return m;
}

/** 删除成员 */
export async function removeMember(openid: string): Promise<boolean> {
  const idx = members.findIndex((m) => m.openid === openid);
  if (idx === -1) return false;
  members.splice(idx, 1);
  await save();
  return true;
}

/** 列出所有成员 */
export function listMembers(): Member[] {
  return [...members];
}
