import fs from 'fs';
import path from 'path';
import { config } from '../config';

export interface Member {
  openid: string;
  nickname: string;
  added_at: string;
}

const MEMBER_FILE = path.resolve(path.dirname(config.db.path), 'members.json');
let members: Member[] = [];

function load() {
  if (!fs.existsSync(MEMBER_FILE)) {
    members = [];
  } else {
    try { members = JSON.parse(fs.readFileSync(MEMBER_FILE, 'utf8')); }
    catch { members = []; }
  }
}

function save() {
  const dir = path.dirname(MEMBER_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(MEMBER_FILE, JSON.stringify(members, null, 2), 'utf8');
}

load();

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
export function upsertMember(openid: string, nickname: string): Member {
  const existing = members.find((m) => m.openid === openid);
  if (existing) {
    existing.nickname = nickname;
    save();
    return existing;
  }
  const m: Member = {
    openid,
    nickname,
    added_at: new Date().toISOString(),
  };
  members.push(m);
  save();
  return m;
}

/** 删除成员 */
export function removeMember(openid: string): boolean {
  const idx = members.findIndex((m) => m.openid === openid);
  if (idx === -1) return false;
  members.splice(idx, 1);
  save();
  return true;
}

/** 列出所有成员 */
export function listMembers(): Member[] {
  return [...members];
}
