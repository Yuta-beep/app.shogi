import { postJson } from '@/infra/http/api-client';
import { BattleAiTurn, parseBattleAiTurn } from '@/usecases/stage-battle/game-move-contract';

export type RequestAiMoveInput = {
  gameId: string;
  moveNo?: number;
  stateHash?: string | null;
  engineConfig: Record<string, unknown>;
};

export class RequestAiMoveUseCase {
  async execute(input: RequestAiMoveInput): Promise<BattleAiTurn> {
    const raw = await postJson<unknown>('/api/v1/ai/move', input);
    return parseBattleAiTurn(raw);
  }
}
