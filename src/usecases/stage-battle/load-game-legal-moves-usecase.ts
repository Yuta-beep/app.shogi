import { ensureShinTurnMimicForBattle } from '@/ai/engine/legal-moves';
import { generateLocalLegalMoves } from '@/ai/local-engine';
import { getLocalBattleGame, updateLocalBattleGame } from '@/ai/local-battle-registry';
import { normalizeBattlePosition } from '@/ai/model';
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
    const position = normalizeBattlePosition(record.position);
    ensureShinTurnMimicForBattle(position, record.pieceCatalog);
    updateLocalBattleGame(input.gameId, (current) => ({
      ...current,
      position,
    }));
    return generateLocalLegalMoves({
      position,
      pieceCatalog: record.pieceCatalog,
    });
  }
}
