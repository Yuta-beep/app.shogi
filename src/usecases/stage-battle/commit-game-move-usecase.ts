import { postJson } from '@/infra/http/api-client';
import {
  BattleCommittedMove,
  BattleMove,
  parseBattleCommittedMove,
} from '@/usecases/stage-battle/game-move-contract';

export type CommitGameMoveInput = {
  gameId: string;
  moveNo: number;
  actorSide: 'player' | 'enemy';
  move: BattleMove;
  stateHash?: string | null;
};

export class CommitGameMoveUseCase {
  async execute(input: CommitGameMoveInput): Promise<BattleCommittedMove> {
    const raw = await postJson<unknown>(`/api/v1/games/${input.gameId}/moves`, input);
    return parseBattleCommittedMove(raw);
  }
}
