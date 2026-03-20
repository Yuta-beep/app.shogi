/**
 * piece-conversion.ts
 *
 * 依存方向:
 * master.m_piece_mapping (DB) → backend catalog API → frontend PieceCatalogItem → この変換層
 *
 * SFEN/盤面/持ち駒の変換は DB 由来の mapping を唯一の入力とし、標準駒だけの
 * フロントハードコードへ逆流させない。
 */

import type { HandsState } from '@/features/stage-shogi/domain/game-rules';
import type { PieceCatalogItem } from '@/domain/models/piece';

export type PieceSfenMapping = {
  sfenToCode: {
    unpromoted: Readonly<Record<string, string>>;
    promoted: Readonly<Record<string, string>>;
  };
  codeToSfen: Readonly<Record<string, string>>;
  handOrder: readonly string[];
};

const LEGACY_STANDARD_HAND_ORDER = ['HI', 'KA', 'KI', 'GI', 'KE', 'KY', 'FU'];

export function createPieceSfenMapping(items: PieceCatalogItem[]): PieceSfenMapping {
  const sfenToCodeUnpromoted: Record<string, string> = {};
  const sfenToCodePromoted: Record<string, string> = {};
  const codeToSfen: Record<string, string> = {};

  for (const item of items) {
    const pieceCode = item.pieceCode?.toUpperCase();
    const sfenCode = item.sfenCode?.toUpperCase();
    if (!pieceCode || !sfenCode) continue;

    codeToSfen[pieceCode] = sfenCode;
    if (item.isPromoted) {
      sfenToCodePromoted[sfenCode] = pieceCode;
    } else {
      sfenToCodeUnpromoted[sfenCode] = pieceCode;
    }
  }

  const customHandCodes = Object.entries(codeToSfen)
    .filter(([code]) => !LEGACY_STANDARD_HAND_ORDER.includes(code))
    .sort((lhs, rhs) => codeToSfen[lhs[0]].localeCompare(codeToSfen[rhs[0]]))
    .map(([code]) => code);

  return {
    sfenToCode: {
      unpromoted: sfenToCodeUnpromoted,
      promoted: sfenToCodePromoted,
    },
    codeToSfen,
    handOrder: [...LEGACY_STANDARD_HAND_ORDER, ...customHandCodes],
  };
}

/**
 * SFEN の1文字と成りフラグから game-logic で使う displayChar を返す。
 * 未登録の場合は null。
 */
export function sfenCharToDisplayChar(
  ch: string,
  isPromoted: boolean,
  mapping: PieceSfenMapping,
): string | null {
  const upper = ch.toUpperCase();
  if (isPromoted) {
    return mapping.sfenToCode.promoted[upper] ?? null;
  }
  return mapping.sfenToCode.unpromoted[upper] ?? null;
}

// ── kanji 表示文字マップ ──────────────────────────────────────────────────────

export const CODE_TO_CHAR: Readonly<Record<string, string>> = {
  FU: '歩',
  KY: '香',
  KE: '桂',
  GI: '銀',
  KI: '金',
  KA: '角',
  HI: '飛',
  OU: '王',
  NIN: '忍',
  KAG: '影',
  HOU: '砲',
  RYU: '竜',
  HOO: '鳳',
  ENN: '炎',
  FIR: '火',
  SUI: '水',
  NAM: '波',
  MOK: '木',
  HAA: '葉',
  HIK: '光',
  HOS: '星',
  YAM: '闇',
  MAK: '魔',
};

export const PROMOTED_CODE_TO_CHAR: Readonly<Record<string, string>> = {
  FU: 'と',
  KY: '成香',
  KE: '成桂',
  GI: '成銀',
  KA: '馬',
  HI: '龍',
};

export const CHAR_TO_CODE: Readonly<Record<string, string>> = {
  歩: 'FU',
  香: 'KY',
  桂: 'KE',
  銀: 'GI',
  金: 'KI',
  角: 'KA',
  飛: 'HI',
  王: 'OU',
  玉: 'OU',
  忍: 'NIN',
  影: 'KAG',
  砲: 'HOU',
  竜: 'RYU',
  鳳: 'HOO',
  炎: 'ENN',
  火: 'FIR',
  水: 'SUI',
  波: 'NAM',
  木: 'MOK',
  葉: 'HAA',
  光: 'HIK',
  星: 'HOS',
  闇: 'YAM',
  魔: 'MAK',
};

// ── toSfenBoardPure ───────────────────────────────────────────────────────────

const BOARD_SIZE = 9;

type SfenPiece = {
  side: 'player' | 'enemy';
  row: number;
  col: number;
  pieceCode: string | null;
  char: string;
  promoted?: boolean;
};

/**
 * 盤面 placements から SFEN board 部分文字列を生成する純粋関数。
 */
export function toSfenBoardPure(placements: SfenPiece[], mapping: PieceSfenMapping): string {
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array<string | null>(BOARD_SIZE).fill(null),
  );

  for (const p of placements) {
    if (p.row < 0 || p.row >= BOARD_SIZE || p.col < 0 || p.col >= BOARD_SIZE) continue;
    const code = p.pieceCode ?? CHAR_TO_CODE[p.char];
    if (!code) continue;
    const sfen = mapping.codeToSfen[code.toUpperCase()];
    if (!sfen) continue;
    const withPromotion = p.promoted ? `+${sfen}` : sfen;
    board[p.row][p.col] = p.side === 'player' ? withPromotion : withPromotion.toLowerCase();
  }

  return board
    .map((row) => {
      let out = '';
      let empty = 0;
      for (const cell of row) {
        if (!cell) {
          empty += 1;
        } else {
          if (empty > 0) {
            out += String(empty);
            empty = 0;
          }
          out += cell;
        }
      }
      if (empty > 0) out += String(empty);
      return out;
    })
    .join('/');
}

// ── toSfenHandsPure ───────────────────────────────────────────────────────────

/**
 * 持ち駒 HandsState から SFEN hands 部分文字列を生成する純粋関数。
 */
export function toSfenHandsPure(hands: HandsState, mapping: PieceSfenMapping): string {
  const playerBySfen: Record<string, number> = {};
  const enemyBySfen: Record<string, number> = {};

  for (const code of mapping.handOrder) {
    const sfen = mapping.codeToSfen[code];
    if (!sfen) continue;
    const playerCount = hands.player[code] ?? 0;
    const enemyCount = hands.enemy[code] ?? 0;
    if (playerCount > 0) playerBySfen[sfen] = (playerBySfen[sfen] ?? 0) + playerCount;
    if (enemyCount > 0) enemyBySfen[sfen] = (enemyBySfen[sfen] ?? 0) + enemyCount;
  }

  const chunks: string[] = [];
  const sfenOrder = mapping.handOrder
    .map((code) => mapping.codeToSfen[code])
    .filter(
      (value, index, array): value is string => Boolean(value) && array.indexOf(value) === index,
    );
  for (const sfen of sfenOrder) {
    const playerCount = playerBySfen[sfen] ?? 0;
    const enemyCount = enemyBySfen[sfen] ?? 0;
    if (playerCount > 0) chunks.push(`${playerCount > 1 ? String(playerCount) : ''}${sfen}`);
    if (enemyCount > 0)
      chunks.push(`${enemyCount > 1 ? String(enemyCount) : ''}${sfen.toLowerCase()}`);
  }
  return chunks.length > 0 ? chunks.join('') : '-';
}
