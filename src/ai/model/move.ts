import type { BattleMove } from '@/usecases/stage-battle/game-move-contract';

export type AiBattleMove = BattleMove;

export function normalizePieceCode(value: string | null | undefined): string | null {
  return value ? value.toUpperCase() : null;
}

export function toBasePieceCode(pieceCode: string | null | undefined): string | null {
  const normalized = normalizePieceCode(pieceCode);
  if (!normalized) return null;
  let code = normalized;
  if (code.startsWith('PIECE_SHOGI_')) {
    code = code.slice('PIECE_SHOGI_'.length);
  } else if (code.startsWith('PIECE_')) {
    code = code.slice('PIECE_'.length);
  }
  if (code === 'TO') return 'FU';
  if (code === 'NY') return 'KY';
  if (code === 'NK') return 'KE';
  if (code === 'NG') return 'GI';
  if (code === 'UM') return 'KA';
  if (code === 'RY' || code === 'RYU') return 'HI';
  return code;
}

export function normalizeBattleMove(move: BattleMove): AiBattleMove {
  const rawPiece = normalizePieceCode(move.pieceCode);
  const rawDrop = normalizePieceCode(move.dropPieceCode);
  const rawCaptured = normalizePieceCode(move.capturedPieceCode);
  return {
    ...move,
    pieceCode: toBasePieceCode(rawPiece) ?? rawPiece ?? 'FU',
    dropPieceCode: rawDrop == null ? null : (toBasePieceCode(rawDrop) ?? rawDrop),
    capturedPieceCode: rawCaptured == null ? null : (toBasePieceCode(rawCaptured) ?? rawCaptured),
    notation: move.notation ?? null,
  };
}
