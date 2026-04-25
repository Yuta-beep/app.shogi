import type { Side } from '@/features/stage-shogi/domain/game-rules';
import type { BattleGameStatus } from '@/usecases/stage-battle/game-move-contract';

export type AiBattleGameStatus = BattleGameStatus;
export type { Side };

export function normalizeBattleGameStatus(
  game?: Partial<BattleGameStatus> | null,
): AiBattleGameStatus {
  const status = game?.status;
  if (status === 'finished' || status === 'aborted' || status === 'in_progress') {
    return {
      status,
      result: game?.result ?? null,
      winnerSide: game?.winnerSide ?? null,
    };
  }
  return {
    status: 'in_progress',
    result: null,
    winnerSide: null,
  };
}
