import { getJson } from '@/infra/http/api-client';
import {
  BattleCanonicalPosition,
  BattleGameStatus,
} from '@/usecases/stage-battle/game-move-contract';

type BattleGameState = {
  gameId: string;
  position: BattleCanonicalPosition;
  game: BattleGameStatus;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parsePosition(raw: unknown): BattleCanonicalPosition {
  const obj = asRecord(raw);
  if (!obj) throw new Error('position is not an object');

  const sideToMove = (obj.sideToMove ?? obj.side_to_move) === 'enemy' ? 'enemy' : 'player';
  const turnNumber = asNumber(obj.turnNumber ?? obj.turn_number);
  const moveCount = asNumber(obj.moveCount ?? obj.move_count);
  const sfen = asString(obj.sfen);
  if (turnNumber == null || moveCount == null || !sfen) {
    throw new Error('position payload is invalid');
  }

  const handsRoot = asRecord(obj.hands) ?? {};
  return {
    sideToMove,
    turnNumber,
    moveCount,
    sfen,
    stateHash: (obj.stateHash ?? obj.state_hash ?? null) as string | null,
    boardState: (asRecord(obj.boardState ?? obj.board_state) ?? {}) as Record<string, unknown>,
    hands: {
      player: (asRecord(handsRoot.player) ?? {}) as Partial<Record<string, number>>,
      enemy: (asRecord(handsRoot.enemy) ?? {}) as Partial<Record<string, number>>,
    },
  };
}

function parseGame(raw: unknown): BattleGameStatus {
  const obj = asRecord(raw);
  if (!obj) throw new Error('game status is not an object');

  const status = asString(obj.status);
  if (status !== 'in_progress' && status !== 'finished' && status !== 'aborted') {
    throw new Error('game status is invalid');
  }
  return {
    status,
    result: (obj.result ?? null) as BattleGameStatus['result'],
    winnerSide: (obj.winnerSide ?? obj.winner_side ?? null) as BattleGameStatus['winnerSide'],
  };
}

function parseGameState(raw: unknown): BattleGameState {
  const obj = asRecord(raw);
  if (!obj) throw new Error('game state payload is invalid');
  const gameId = asString(obj.gameId ?? obj.game_id);
  if (!gameId) throw new Error('gameId is invalid');
  return {
    gameId,
    position: parsePosition(obj.position),
    game: parseGame(obj.game),
  };
}

export class LoadGameStateUseCase {
  async execute(input: { gameId: string }): Promise<BattleGameState> {
    const raw = await getJson<unknown>(`/api/v1/games/${input.gameId}/state`);
    return parseGameState(raw);
  }
}
