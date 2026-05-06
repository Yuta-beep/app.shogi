import { MoveVector } from '@/usecases/piece-info/load-piece-catalog-usecase';

export type Side = 'player' | 'enemy';
export type Hands = Record<string, number>;
export type HandsState = {
  player: Hands;
  enemy: Hands;
};

export type BoardCell = {
  row: number;
  col: number;
};

export type BoardPiece = {
  side: Side;
  row: number;
  col: number;
  pieceCode: string | null;
  char: string;
  promoted?: boolean;
  /** K 博士: 2 で初回捕獲を耐える。1 のとき 2 回目の捕獲で消える。 */
  kbossLivesRemaining?: number;
  /** 「実」スキルで異化した駒を元に戻すためのスナップショット（未設定なら生来の「異」） */
  mutantRevertPieceCode?: string | null;
  mutantRevertChar?: string;
  mutantRevertPromoted?: boolean;
  mutantRevertImageSignedUrl?: string | null;
};

const PROMOTABLE_PIECES = new Set(['FU', 'KY', 'KE', 'GI', 'KA', 'HI']);
const KING_CODES = new Set(['OU']);
const PLAYER_LAST_ROW = 0;
const ENEMY_LAST_ROW = 8;

function isInsideBoard(row: number, col: number, boardSize: number) {
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

function findPieceAt<T extends BoardPiece>(placements: T[], row: number, col: number) {
  return placements.find((piece) => piece.row === row && piece.col === col) ?? null;
}

function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

function isGoldPiece(piece: BoardPiece): boolean {
  if (piece.pieceCode?.toUpperCase() === 'KI') return true;
  return piece.char === '金';
}

function isBackwardDiagonalForSide(
  piece: BoardPiece,
  targetRow: number,
  targetCol: number,
): boolean {
  const rowDelta = targetRow - piece.row;
  const colDelta = targetCol - piece.col;
  if (Math.abs(colDelta) !== 1) return false;
  if (piece.side === 'enemy') {
    // enemy の後ろ方向は -row。金は斜め後ろ不可
    return rowDelta < 0;
  }
  // player の後ろ方向は +row。金は斜め後ろ不可
  return rowDelta > 0;
}

export function sameCell(a: BoardCell, b: BoardCell) {
  return a.row === b.row && a.col === b.col;
}

export function createEmptyHandsState(): HandsState {
  return { player: {}, enemy: {} };
}

function normalizePieceCode(pieceCode: string | null) {
  return pieceCode ?? null;
}

export function isPromotablePieceCode(pieceCode: string | null) {
  if (!pieceCode) return false;
  return PROMOTABLE_PIECES.has(pieceCode);
}

export function inPromotionZone(side: Side, row: number, boardSize = 9) {
  const zoneDepth = 3;
  if (side === 'player') return row < zoneDepth;
  return row >= boardSize - zoneDepth;
}

export function canPromoteByMove(piece: BoardPiece, from: BoardCell, to: BoardCell, boardSize = 9) {
  if (piece.promoted) return false;
  if (!isPromotablePieceCode(piece.pieceCode)) return false;
  return (
    inPromotionZone(piece.side, from.row, boardSize) ||
    inPromotionZone(piece.side, to.row, boardSize)
  );
}

export function mustPromoteByMove(piece: BoardPiece, to: BoardCell, boardSize = 9) {
  const code = normalizePieceCode(piece.pieceCode);
  if (!code) return false;
  if (piece.promoted) return false;
  if (code === 'FU' || code === 'KY') {
    return piece.side === 'player' ? to.row === PLAYER_LAST_ROW : to.row === ENEMY_LAST_ROW;
  }
  if (code === 'KE') {
    if (piece.side === 'player') return to.row <= 1;
    return to.row >= boardSize - 2;
  }
  return false;
}

export function getHandCount(hands: HandsState, side: Side, pieceCode: string) {
  const want = pieceCode.toUpperCase();
  let sum = 0;
  for (const [k, v] of Object.entries(hands[side])) {
    if (k.toUpperCase() === want && typeof v === 'number' && Number.isFinite(v)) {
      sum += Math.max(0, Math.floor(v));
    }
  }
  return sum;
}

/** API／SFEN マージで混在しうる駒コードの大文字小文字をまとめる */
export function normalizeHandsStateKeys(hands: HandsState): HandsState {
  function normBag(bag: Record<string, number>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(bag)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      const n = Math.max(0, Math.floor(v));
      if (n <= 0) continue;
      const u = k.toUpperCase();
      out[u] = (out[u] ?? 0) + n;
    }
    return out;
  }
  return { player: normBag(hands.player), enemy: normBag(hands.enemy) };
}

export function addHandPiece(
  hands: HandsState,
  side: Side,
  pieceCode: string,
  delta = 1,
): HandsState {
  const key = pieceCode.toUpperCase();
  const next: HandsState = {
    player: { ...hands.player },
    enemy: { ...hands.enemy },
  };
  const bag = next[side];
  let current = 0;
  const toDelete: string[] = [];
  for (const k of Object.keys(bag)) {
    if (k.toUpperCase() === key) {
      const v = bag[k];
      if (typeof v === 'number' && Number.isFinite(v)) {
        current += Math.max(0, Math.floor(v));
      }
      toDelete.push(k);
    }
  }
  for (const k of toDelete) {
    delete bag[k];
  }
  const updated = current + delta;
  if (updated <= 0) {
    return next;
  }
  bag[key] = updated;
  return next;
}

/** pieceCode が欠けた盤面でも手駒キーに落とせるよう、漢字から canonical を補う（piece-conversion と値を揃える）。 */
const CAPTURE_CHAR_TO_HAND_CODE: Readonly<Record<string, string>> = {
  刀: 'SWORD',
  剣: 'SWORD',
  銃: 'GUN',
  鎧: 'ARMOR',
  盾: 'SHIELD',
  書: 'BOOK',
  書物: 'BOOK',
  封: 'SEAL',
  轟: 'BIGNOISE',
  犇: 'BULL',
  礼: 'RITUAL',
  聖: 'SAINT',
};

const OPAQUE_CAPTURE_CODE_TO_HAND_CODE: Readonly<Record<string, string>> = {
  PIECE_5D848242A136: 'BOOK',
  PIECE_7000FED9D9D4: 'SEAL',
  PIECE_D24741D0EF18: 'BIGNOISE',
  PIECE_1275B5728D1C: 'BULL',
  PIECE_4FCDDF14D08D: 'RITUAL',
  PIECE_A3BAB6C13DC7: 'SAINT',
};

function opaqueCapturedCodeToHandCode(rawCode: string | null): string | null {
  if (!rawCode) return null;
  const upper = rawCode.toUpperCase();
  if (OPAQUE_CAPTURE_CODE_TO_HAND_CODE[upper]) {
    return OPAQUE_CAPTURE_CODE_TO_HAND_CODE[upper]!;
  }
  // 文字列揺れ（PIECE_SHOGI_*, 余計な接頭辞など）でも「書」ID なら BOOK に寄せる。
  if (upper.includes('5D848242A136')) return 'BOOK';
  if (upper.includes('7000FED9D9D4')) return 'SEAL';
  if (upper.includes('D24741D0EF18')) return 'BIGNOISE';
  if (upper.includes('1275B5728D1C')) return 'BULL';
  if (upper.includes('4FCDDF14D08D')) return 'RITUAL';
  if (upper.includes('A3BAB6C13DC7')) return 'SAINT';
  if (upper.includes('BOOK')) return 'BOOK';
  if (upper.includes('SEAL')) return 'SEAL';
  if (upper.includes('BIGNOISE')) return 'BIGNOISE';
  if (upper.includes('BULL')) return 'BULL';
  if (upper.includes('RITUAL')) return 'RITUAL';
  if (upper.includes('SAINT')) return 'SAINT';
  return null;
}

function isKingLikePiece(piece: BoardPiece): boolean {
  const code = (piece.pieceCode ?? '').toUpperCase();
  return piece.char === '王' || piece.char === '玉' || code === 'OU';
}

function isSealCode(pieceCode: string): boolean {
  const code = pieceCode.toUpperCase();
  return code === 'SEAL';
}

function hasAdjacentEnemyKing(
  placements: BoardPiece[],
  side: Side,
  row: number,
  col: number,
  boardSize: number,
): boolean {
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (!isInsideBoard(r, c, boardSize)) continue;
      const piece = findPieceAt(placements, r, c);
      if (!piece) continue;
      if (piece.side === side) continue;
      if (isKingLikePiece(piece)) return true;
    }
  }
  return false;
}

export function capturedToHandPieceCode(piece: BoardPiece) {
  const normalizedChar = (() => {
    try {
      return piece.char?.normalize('NFKC') ?? '';
    } catch {
      return piece.char ?? '';
    }
  })();
  const codeFromChar =
    normalizedChar === '牢'
      ? 'PRISON'
      : normalizedChar === '柵'
        ? 'FENCE'
        : normalizedChar === '岩'
          ? 'ROCK'
          : normalizedChar === '鉱'
            ? 'ORE'
            : normalizedChar === '墓'
              ? 'GRAVE'
              : normalizedChar === '霊'
                ? 'SPIRIT'
                : (CAPTURE_CHAR_TO_HAND_CODE[normalizedChar] ?? null);
  const rawCode = normalizePieceCode(piece.pieceCode);
  const isOpaque = Boolean(rawCode && /^PIECE_[A-Z0-9_]+$/i.test(rawCode));
  const mappedOpaque = opaqueCapturedCodeToHandCode(rawCode);
  const code =
    rawCode && !isOpaque
      ? rawCode
      : (codeFromChar ?? mappedOpaque);
  if (!code) return null;
  if (KING_CODES.has(code)) return null;
  return code;
}

export function hasUnpromotedPawnInFile(placements: BoardPiece[], side: Side, fileCol: number) {
  return placements.some(
    (piece) =>
      piece.side === side &&
      piece.col === fileCol &&
      piece.pieceCode === 'FU' &&
      piece.promoted !== true,
  );
}

export function isDropDeadEnd(pieceCode: string, side: Side, toRow: number, boardSize = 9) {
  if (pieceCode === 'FU' || pieceCode === 'KY') {
    return side === 'player' ? toRow === PLAYER_LAST_ROW : toRow === ENEMY_LAST_ROW;
  }
  if (pieceCode === 'KE') {
    if (side === 'player') return toRow <= 1;
    return toRow >= boardSize - 2;
  }
  return false;
}

export function canDropPiece(
  placements: BoardPiece[],
  hands: HandsState,
  side: Side,
  pieceCode: string,
  to: BoardCell,
  boardSize = 9,
) {
  if (!isInsideBoard(to.row, to.col, boardSize)) return false;
  if (findPieceAt(placements, to.row, to.col)) return false;
  if (getHandCount(hands, side, pieceCode) <= 0) return false;
  if (isDropDeadEnd(pieceCode, side, to.row, boardSize)) return false;
  if (pieceCode === 'FU' && hasUnpromotedPawnInFile(placements, side, to.col)) return false;
  if (isSealCode(pieceCode) && hasAdjacentEnemyKing(placements, side, to.row, to.col, boardSize)) {
    return false;
  }
  return true;
}

export function hasKing(placements: BoardPiece[], side: Side) {
  return placements.some(
    (piece) => piece.side === side && (piece.char === '王' || piece.char === '玉'),
  );
}

export function applyBoardMove<T extends BoardPiece>(
  placements: T[],
  side: Side,
  from: BoardCell,
  to: BoardCell,
  promote = false,
): T[] {
  const captured = findPieceAt(placements, to.row, to.col);
  const next = placements.filter((piece) => !(piece.row === to.row && piece.col === to.col));
  const movingIndex = next.findIndex(
    (piece) => piece.side === side && piece.row === from.row && piece.col === from.col,
  );
  if (movingIndex < 0) return placements;

  const moving = next[movingIndex];
  const shouldPromote = promote || moving.promoted === true;
  next[movingIndex] = {
    ...moving,
    row: to.row,
    col: to.col,
    promoted: shouldPromote,
  };
  if (captured && KING_CODES.has(captured.pieceCode ?? '')) {
    return next;
  }
  return next;
}

export function applyPlayerMove<T extends BoardPiece>(
  placements: T[],
  from: BoardCell,
  to: BoardCell,
  promote = false,
): T[] {
  return applyBoardMove(placements, 'player', from, to, promote);
}

export function getLegalTargetsFromVectors<T extends BoardPiece>(
  placements: T[],
  piece: T,
  vectors: MoveVector[],
  boardSize = 9,
  options?: {
    canJump?: boolean;
    minStepByVectorKey?: Record<string, number>;
    maxStepByVectorKey?: Record<string, number>;
  },
) {
  const results: BoardCell[] = [];
  const seen = new Set<string>();
  const orient = piece.side === 'player' ? 1 : -1;
  const canJump = options?.canJump === true;
  const minStepByVectorKey = options?.minStepByVectorKey ?? {};
  const maxStepByVectorKey = options?.maxStepByVectorKey ?? {};

  for (const vector of vectors) {
    const vectorKey = `${vector.dx}:${vector.dy}`;
    const maxStep = Math.max(1, vector.maxStep);
    const minStep = Math.max(1, minStepByVectorKey[vectorKey] ?? 1);
    const cappedMaxStep = Math.max(
      minStep,
      Math.min(maxStep, maxStepByVectorKey[vectorKey] ?? maxStep),
    );
    const dx = vector.dx * orient;
    const dy = vector.dy * orient;

    for (let step = 1; step <= cappedMaxStep; step += 1) {
      const targetRow = piece.row + dy * step;
      const targetCol = piece.col + dx * step;
      if (!isInsideBoard(targetRow, targetCol, boardSize)) break;

      const occupied = findPieceAt(placements, targetRow, targetCol);
      if (occupied && occupied.side === piece.side) {
        if (canJump) continue;
        break;
      }

      if (step < minStep) {
        if (occupied && !canJump) break;
        continue;
      }

      // ベクトル定義の取り違えがあっても、金の「斜め後ろ」は必ず禁止する。
      if (isGoldPiece(piece) && isBackwardDiagonalForSide(piece, targetRow, targetCol)) {
        if (occupied && !canJump) break;
        continue;
      }

      const key = cellKey(targetRow, targetCol);
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ row: targetRow, col: targetCol });
      }

      if (occupied && !canJump) break;
    }
  }

  return results;
}
