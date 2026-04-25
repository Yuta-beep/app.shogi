import { generateLocalLegalMoves } from '@/ai/local-engine';
import { getLocalBattleGame } from '@/ai/local-battle-registry';
import { BattleLegalMoves } from '@/usecases/stage-battle/game-move-contract';

export type LoadGameLegalMovesInput = {
  gameId: string;
};

export class LoadGameLegalMovesUseCase {
  async execute(input: LoadGameLegalMovesInput): Promise<BattleLegalMoves> {
    const record = getLocalBattleGame(input.gameId);
    if (!record) {
      throw new Error(`local battle game not found: ${input.gameId}`);
    }
    return generateLocalLegalMoves({
      position: record.position,
      pieceCatalog: record.pieceCatalog,
    });
  }
}
