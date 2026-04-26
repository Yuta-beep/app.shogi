import {
  BattleCanonicalPosition,
  BattleGameStatus,
} from '@/usecases/stage-battle/game-move-contract';
import { getLocalBattleGame } from '@/ai/local-battle-registry';

type BattleGameState = {
  gameId: string;
  position: BattleCanonicalPosition;
  game: BattleGameStatus;
};

export class LoadGameStateUseCase {
  async execute(input: { gameId: string }): Promise<BattleGameState> {
    const record = getLocalBattleGame(input.gameId);
    if (!record) {
      throw new Error(`local battle game not found: ${input.gameId}`);
    }
    return {
      gameId: record.gameId,
      position: record.position,
      game: record.game,
    };
  }
}
