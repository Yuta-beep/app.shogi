import type { BattleMove } from '@/usecases/stage-battle/game-move-contract';

export type AiBattleMove = BattleMove;

export function normalizePieceCode(value: string | null | undefined): string | null {
  return value ? value.toUpperCase() : null;
}

export function toBasePieceCode(pieceCode: string | null | undefined): string | null {
  const normalized = normalizePieceCode(pieceCode);
  if (!normalized) return null;
  if (normalized === 'TO') return 'FU';
  if (normalized === 'NY') return 'KY';
  if (normalized === 'NK') return 'KE';
  if (normalized === 'NG') return 'GI';
  if (normalized === 'UM') return 'KA';
  if (normalized === 'RY' || normalized === 'RYU') return 'HI';
  return normalized;
}

export function normalizeBattleMove(move: BattleMove): AiBattleMove {
  return {
    ...move,
    pieceCode: normalizePieceCode(move.pieceCode) ?? 'FU',
    dropPieceCode: normalizePieceCode(move.dropPieceCode),
    capturedPieceCode: normalizePieceCode(move.capturedPieceCode),
    notation: move.notation ?? null,
  };
}
