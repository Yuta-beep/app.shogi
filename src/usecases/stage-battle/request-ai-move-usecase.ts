import { postJson } from '@/infra/http/api-client';

export type AiSelectedMove = {
  fromRow: number | null;
  fromCol: number | null;
  toRow: number;
  toCol: number;
  pieceCode: string;
  promote: boolean;
  dropPieceCode: string | null;
  capturedPieceCode: string | null;
  notation: string | null;
};

export type RequestAiMoveInput = {
  gameId: string;
  moveNo: number;
  position: {
    sideToMove: 'player' | 'enemy';
    turnNumber: number;
    moveCount: number;
    sfen: string;
    stateHash: string | null;
    boardState: Record<string, unknown>;
    hands: {
      player: Partial<Record<string, number>>;
      enemy: Partial<Record<string, number>>;
    };
    legalMoves: Array<{
      fromRow: number | null;
      fromCol: number | null;
      toRow: number;
      toCol: number;
      pieceCode: string;
      promote: boolean;
      dropPieceCode: string | null;
    }>;
  };
  engineConfig: Record<string, unknown>;
};

type RequestAiMoveResult = {
  selectedMove: AiSelectedMove;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function parseAiMoveResponse(raw: unknown): RequestAiMoveResult {
  const obj = asRecord(raw);
  if (!obj) {
    throw new Error('ai move response is not an object');
  }
  const moveObj = asRecord(obj.selectedMove) ?? asRecord(obj.selected_move);
  if (!moveObj) {
    const keys = Object.keys(obj).join(', ');
    throw new Error(`invalid ai move response keys: [${keys}]`);
  }
  const fromRow = moveObj.fromRow ?? moveObj.from_row ?? null;
  const fromCol = moveObj.fromCol ?? moveObj.from_col ?? null;
  const toRow = moveObj.toRow ?? moveObj.to_row;
  const toCol = moveObj.toCol ?? moveObj.to_col;
  const pieceCode = asString(moveObj.pieceCode ?? moveObj.piece_code);
  const promote = moveObj.promote ?? false;
  const dropPieceCode = (moveObj.dropPieceCode ?? moveObj.drop_piece_code ?? null) as string | null;
  const capturedPieceCode = (moveObj.capturedPieceCode ?? moveObj.captured_piece_code ?? null) as
    | string
    | null;
  const notation = (moveObj.notation ?? null) as string | null;

  if (
    typeof toRow !== 'number' ||
    typeof toCol !== 'number' ||
    !pieceCode ||
    (fromRow !== null && typeof fromRow !== 'number') ||
    (fromCol !== null && typeof fromCol !== 'number')
  ) {
    const keys = Object.keys(moveObj).join(', ');
    throw new Error(`invalid ai selected move keys: [${keys}]`);
  }

  return {
    selectedMove: {
      fromRow: fromRow as number | null,
      fromCol: fromCol as number | null,
      toRow,
      toCol,
      pieceCode,
      promote: Boolean(promote),
      dropPieceCode,
      capturedPieceCode,
      notation,
    },
  };
}

export class RequestAiMoveUseCase {
  async execute(input: RequestAiMoveInput): Promise<RequestAiMoveResult> {
    const raw = await postJson<unknown>('/api/v1/ai/move', input);
    return parseAiMoveResponse(raw);
  }
}
