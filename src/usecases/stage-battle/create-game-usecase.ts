import { postJson } from '@/infra/http/api-client';

type PositionPayload = {
  sideToMove: 'player' | 'enemy';
  turnNumber: number;
  moveCount: number;
  sfen: string;
  boardState: Record<string, unknown>;
  hands: {
    player: Partial<Record<string, number>>;
    enemy: Partial<Record<string, number>>;
  };
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function parseCreateGameResponse(raw: unknown): CreateGameResult {
  const obj = asRecord(raw);
  if (!obj) {
    throw new Error('create game response is not an object');
  }
  const gameId = asString(obj.gameId) ?? asString(obj.game_id) ?? asString(obj.id);
  const status = asString(obj.status);
  const startedAt = asString(obj.startedAt) ?? asString(obj.started_at);
  if (!gameId || !status || !startedAt) {
    const keys = Object.keys(obj).join(', ');
    throw new Error(`invalid create game response keys: [${keys}]`);
  }
  return { gameId, status, startedAt };
}

export class CreateGameUseCase {
  async execute(input: CreateGameInput): Promise<CreateGameResult> {
    const raw = await postJson<unknown>('/api/v1/games', input);
    return parseCreateGameResponse(raw);
  }
}
