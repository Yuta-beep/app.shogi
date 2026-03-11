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
  return hands[side][pieceCode] ?? 0;
}

export function addHandPiece(
  hands: HandsState,
  side: Side,
  pieceCode: string,
  delta = 1,
): HandsState {
  const next: HandsState = {
    player: { ...hands.player },
    enemy: { ...hands.enemy },
  };
  const current = next[side][pieceCode] ?? 0;
  const updated = current + delta;
  if (updated <= 0) {
    delete next[side][pieceCode];
  } else {
    next[side][pieceCode] = updated;
  }
  return next;
}

export function capturedToHandPieceCode(piece: BoardPiece) {
  const code = normalizePieceCode(piece.pieceCode);
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
