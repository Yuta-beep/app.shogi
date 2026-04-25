import { normalizeBattleGameStatus, normalizeBattlePosition } from '@/ai/model';
import { computeLocalAiTurn } from '@/ai/local-engine';
import { getLocalBattleGame, updateLocalBattleGame } from '@/ai/local-battle-registry';
import { BattleAiTurn } from '@/usecases/stage-battle/game-move-contract';

export type RequestAiMoveInput = {
  gameId: string;
  moveNo?: number;
  stateHash?: string | null;
  engineConfig: Record<string, unknown>;
};

export class RequestAiMoveUseCase {
  async execute(input: RequestAiMoveInput): Promise<BattleAiTurn> {
    const record = getLocalBattleGame(input.gameId);
    if (!record) {
      throw new Error(`local battle game not found: ${input.gameId}`);
    }
    if (input.moveNo != null && record.position.moveCount + 1 !== input.moveNo) {
      throw new Error(`expected moveNo ${record.position.moveCount + 1} but got ${input.moveNo}`);
    }
    if (
      input.stateHash &&
      record.position.stateHash &&
      input.stateHash !== record.position.stateHash
    ) {
      throw new Error('stateHash does not match current position');
    }

    const turn = computeLocalAiTurn({
      position: record.position,
      pieceCatalog: record.pieceCatalog,
    });

    const normalizedGame = normalizeBattleGameStatus(turn.game);

    updateLocalBattleGame(input.gameId, (current) => ({
      ...current,
      position: normalizeBattlePosition(turn.position),
      game: normalizedGame,
    }));

    return {
      ...turn,
      game: normalizedGame,
    };
  }
}
