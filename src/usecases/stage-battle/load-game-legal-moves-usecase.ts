import { getJson } from '@/infra/http/api-client';
import {
  BattleLegalMoves,
  parseBattleLegalMoves,
} from '@/usecases/stage-battle/game-move-contract';

export type LoadGameLegalMovesInput = {
  gameId: string;
};

export class LoadGameLegalMovesUseCase {
  async execute(input: LoadGameLegalMovesInput): Promise<BattleLegalMoves> {
    const raw = await getJson<unknown>(`/api/v1/games/${input.gameId}/legal-moves`);
    return parseBattleLegalMoves(raw);
  }
}
