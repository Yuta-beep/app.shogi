import type { BoardCell, HandsState, Side } from '@/features/stage-shogi/domain/game-rules';
import type { BattleMove } from '@/usecases/stage-battle/game-move-contract';
import type { BoardPiece } from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';

export type RollbackSnapshot = {
  pieces: BoardPiece[];
  hands: HandsState;
};

export function createBattleRollbackSnapshot(
  pieces: BoardPiece[],
  hands: HandsState,
): RollbackSnapshot {
  return { pieces, hands };
}

export function buildAiRequestKey(gameId: string, moveNo: number, side: Side): string {
  return `${gameId}:${moveNo}:${side}`;
}

export function shouldSkipAiMoveRequest(input: {
  gameId: string | null;
  expectedSideToMove: Side;
  isAiThinking: boolean;
  isCreatingGame: boolean;
  aiThinkingRef: boolean;
}): boolean {
  return (
    !input.gameId ||
    input.expectedSideToMove !== 'enemy' ||
    input.isAiThinking ||
    input.isCreatingGame ||
    input.aiThinkingRef
  );
}

export function clearInteractiveSelection(setters: {
  setSelectedCell(cell: BoardCell | null): void;
  setSelectedDropPieceCode(code: string | null): void;
  setLegalTargets(cells: BoardCell[]): void;
  setEnemyPreviewTargets(cells: BoardCell[]): void;
  setPendingSatoriEnemyPick(moves: BattleMove[] | null): void;
  setPendingHeartAllyPick(moves: BattleMove[] | null): void;
  setPendingPromotion(pending: null): void;
  setAiError(message: string | null): void;
}): void {
  setters.setSelectedCell(null);
  setters.setSelectedDropPieceCode(null);
  setters.setLegalTargets([]);
  setters.setEnemyPreviewTargets([]);
  setters.setPendingSatoriEnemyPick(null);
  setters.setPendingHeartAllyPick(null);
  setters.setPendingPromotion(null);
  setters.setAiError(null);
}
