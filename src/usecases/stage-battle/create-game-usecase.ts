import { createLocalBattleGame } from '@/ai/local-battle-registry';
import type { BattleCanonicalPosition } from '@/usecases/stage-battle/game-move-contract';

type PositionPayload = Omit<BattleCanonicalPosition, 'stateHash'> & {
  stateHash?: string | null;
};

export type CreateGameInput = {
  playerId: string;
  stageNo?: number;
  initialPosition: PositionPayload;
};

export type CreateGameResult = {
  gameId: string;
  status: string;
  startedAt: string;
};

export class CreateGameUseCase {
  async execute(input: CreateGameInput): Promise<CreateGameResult> {
    const record = createLocalBattleGame({
      playerId: input.playerId,
      stageNo: input.stageNo,
      position: {
        ...input.initialPosition,
        stateHash: input.initialPosition.stateHash ?? null,
      },
    });

    return {
      gameId: record.gameId,
      status: record.game.status,
      startedAt: record.startedAt,
    };
  }
}
