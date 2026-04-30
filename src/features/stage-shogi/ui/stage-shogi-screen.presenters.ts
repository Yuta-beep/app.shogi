import { ApiClientError } from '@/infra/http/api-client';

const LEAF_SKILL_DESCRIPTION = '移動時10%の確率で「葉」駒を周囲1マスに召喚する。';
const ELECTRIC_SKILL_DESCRIPTION = '移動時20%の確率で周囲8マスの敵駒1体を3ターン行動不能にする。';
const ICE_SKILL_DESCRIPTION = '移動時30%の確率で周囲の敵駒1体を2ターン行動不能にする。';
const FISH_SKILL_DESCRIPTION = '移動時30%の確率で周囲の敵駒1体を3ターン行動不能にする。';
const MOSS_SKILL_DESCRIPTION = '移動時30%の確率で周囲の空きマスに「苔」駒を1体召喚する。';
const RAINBOW_SKILL_DESCRIPTION =
  'この駒の周囲8マスにいる敵駒の移動範囲は縦横1マスのみに制限される。';
const SWAMP_SKILL_DESCRIPTION =
  'この駒の周囲8マスにいる敵駒の移動範囲は上下1マスのみに制限される。';
const POISON_SKILL_DESCRIPTION =
  'この駒が移動したとき移動前のマスは4ターン毒マスになる。毒マスを敵駒が通るとその駒は消滅する。';
const PRISON_FENCE_SKILL_DESCRIPTION =
  '移動時、盤上の敵駒のうちランダムで1体を2ターン行動不能にする。';

export type InspectingPieceState = {
  char: string;
  pieceCode?: string | null;
  name: string;
  desc: string;
  move: string;
  imageSignedUrl: string | null;
} | null;

export function normalizeSkillName(skill: string | undefined): string | null {
  if (!skill) return null;
  const normalized = skill.trim();
  if (!normalized || normalized === '-' || normalized === 'なし' || normalized === '準備中') {
    return null;
  }
  return normalized;
}

export function resolveInspectSkillDescription(char: string, desc: string | undefined): string {
  if (char === '葉') return LEAF_SKILL_DESCRIPTION;
  if (char === '電') return ELECTRIC_SKILL_DESCRIPTION;
  if (char === '氷') return ICE_SKILL_DESCRIPTION;
  if (char === '魚') return FISH_SKILL_DESCRIPTION;
  if (char === '苔') return MOSS_SKILL_DESCRIPTION;
  if (char === '虹') return RAINBOW_SKILL_DESCRIPTION;
  if (char === '沼') return SWAMP_SKILL_DESCRIPTION;
  if (char === '毒') return POISON_SKILL_DESCRIPTION;
  if (char === '牢' || char === '柵') return PRISON_FENCE_SKILL_DESCRIPTION;
  const normalized = (desc ?? '').trim();
  return normalized.length > 0 ? normalized : '詳細は準備中です。';
}

export function resolveInspectMoveDescription(char: string, move: string | undefined): string {
  if (char === '闇') return '全方向に1マス';
  const normalized = (move ?? '').trim();
  return normalized.length > 0 ? normalized : '準備中';
}

export function toUserFacingBattleError(error: unknown): string {
  if (error instanceof ApiClientError) {
    const rawApiMessage = error.message ?? '';
    const trimmedApiMessage = rawApiMessage.trim();
    if (trimmedApiMessage.startsWith('{') && trimmedApiMessage.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmedApiMessage) as { code?: string; message?: string };
        if (parsed.code === 'ILLEGAL_MOVE') {
          return '通信中に局面がずれました。合法手を再取得するため、もう一度操作してください。';
        }
        if (typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
          return parsed.message.trim();
        }
      } catch {
        // no-op
      }
    }
    if (error.status === 502 || error.status === 503 || error.status === 504) {
      return 'サーバーが一時的に混み合っています。少し待ってから再試行してください。';
    }
    if (error.code === 'INVALID_JSON_RESPONSE') {
      return 'サーバー応答の解析に失敗しました。通信環境を確認して再試行してください。';
    }
    return error.message;
  }
  if (error instanceof Error) {
    const raw = error.message ?? '';
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed) as { code?: string; message?: string };
        if (parsed.code === 'ILLEGAL_MOVE') {
          return '通信中に局面がずれました。合法手を再取得するため、もう一度操作してください。';
        }
        if (typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
          return parsed.message.trim();
        }
      } catch {
        // no-op
      }
    }
    if (/^\s*</.test(raw) || /<!DOCTYPE html>/i.test(raw)) {
      return 'サーバーエラーが発生しました。時間をおいて再試行してください。';
    }
    const compact = raw.replace(/\s+/g, ' ').trim();
    return compact.length > 160 ? `${compact.slice(0, 157)}...` : compact;
  }
  return String(error);
}

export function isIllegalMoveError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    if (error.code === 'ILLEGAL_MOVE') return true;
    const raw = (error.message ?? '').trim();
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw) as { code?: string };
        return parsed.code === 'ILLEGAL_MOVE';
      } catch {
        return false;
      }
    }
    return false;
  }
  if (error instanceof Error) {
    const raw = (error.message ?? '').trim();
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw) as { code?: string };
        return parsed.code === 'ILLEGAL_MOVE';
      } catch {
        return false;
      }
    }
  }
  return false;
}
