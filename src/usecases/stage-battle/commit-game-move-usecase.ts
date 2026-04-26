import { normalizeBattleGameStatus, normalizeBattlePosition } from '@/ai/model';
import { applyLocalMove } from '@/ai/local-engine';
import { getLocalBattleGame, updateLocalBattleGame } from '@/ai/local-battle-registry';
import {
  BattleCommittedMove,
  BattleMove,
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
    const record = getLocalBattleGame(input.gameId);
    if (!record) {
      throw new Error(`local battle game not found: ${input.gameId}`);
    }
    if (record.position.moveCount + 1 !== input.moveNo) {
      throw new Error(`expected moveNo ${record.position.moveCount + 1} but got ${input.moveNo}`);
    }
    if (record.position.sideToMove !== input.actorSide) {
      throw new Error(
        `expected actorSide ${record.position.sideToMove} but got ${input.actorSide}`,
      );
    }
    if (
      input.stateHash &&
      record.position.stateHash &&
      input.stateHash !== record.position.stateHash
    ) {
      throw new Error('stateHash does not match current position');
    }

    const committed = applyLocalMove({
      position: record.position,
      pieceCatalog: record.pieceCatalog,
      move: input.move,
    });

    updateLocalBattleGame(input.gameId, (current) => ({
      ...current,
      position: normalizeBattlePosition(committed.position),
      game: normalizeBattleGameStatus(committed.game),
    }));

    return committed;
  }
}
