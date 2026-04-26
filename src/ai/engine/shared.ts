import type { BoardCell } from '@/features/stage-shogi/domain/game-rules';
import {
  CHAR_TO_CODE,
  CODE_TO_CHAR,
  PROMOTED_CODE_TO_CHAR,
  createPieceSfenMapping,
  toSfenBoardPure,
  toSfenHandsPure,
} from '@/features/stage-shogi/domain/piece-conversion';
import type {
  AiBattleMove,
  AiBattlePosition,
  AiBoardPiece,
  AiHandsState,
  AiPieceDefinition,
  AiPieceLookups,
} from '@/ai/model';
import { buildPieceLookups, normalizePieceCode, toBasePieceCode } from '@/ai/model';

export const PIECE_VALUES: Readonly<Record<string, number>> = {
  OU: 100000,
  HI: 900,
  KA: 800,
  KI: 600,
  GI: 500,
  KE: 350,
  KY: 300,
  FU: 100,
  TIME: 400,
};

export function pieceChar(pieceCode: string | null, promoted = false): string {
  const normalized = toBasePieceCode(pieceCode);
  if (!normalized) return '?';
  if (promoted) {
    return PROMOTED_CODE_TO_CHAR[normalized] ?? CODE_TO_CHAR[normalized] ?? normalized;
  }
  return CODE_TO_CHAR[normalized] ?? normalized;
}

export function findPieceAt(placements: AiBoardPiece[], row: number, col: number) {
  return placements.find((piece) => piece.row === row && piece.col === col) ?? null;
}

export function createMove(base: {
  from: BoardCell | null;
  to: BoardCell;
  pieceCode: string;
  promote: boolean;
  dropPieceCode?: string | null;
  capturedPieceCode?: string | null;
  notation?: string | null;
}): AiBattleMove {
  return {
    fromRow: base.from?.row ?? null,
    fromCol: base.from?.col ?? null,
    toRow: base.to.row,
    toCol: base.to.col,
    pieceCode: base.pieceCode,
    promote: base.promote,
    dropPieceCode: base.dropPieceCode ?? null,
    capturedPieceCode: base.capturedPieceCode ?? null,
    notation: base.notation ?? null,
  };
}

export function moveEquals(lhs: AiBattleMove, rhs: AiBattleMove) {
  return (
    lhs.fromRow === rhs.fromRow &&
    lhs.fromCol === rhs.fromCol &&
    lhs.toRow === rhs.toRow &&
    lhs.toCol === rhs.toCol &&
    lhs.promote === rhs.promote &&
    normalizePieceCode(lhs.pieceCode) === normalizePieceCode(rhs.pieceCode) &&
    normalizePieceCode(lhs.dropPieceCode) === normalizePieceCode(rhs.dropPieceCode) &&
    normalizePieceCode(lhs.capturedPieceCode) === normalizePieceCode(rhs.capturedPieceCode) &&
    (lhs.notation ?? null) === (rhs.notation ?? null)
  );
}

export function notationForMove(move: AiBattleMove): string {
  if (move.notation) return move.notation;
  if (move.dropPieceCode) {
    return `${move.dropPieceCode.toUpperCase()}*${move.toRow}${move.toCol}`;
  }
  const from =
    move.fromRow == null || move.fromCol == null ? '--' : `${move.fromRow}${move.fromCol}`;
  return `${from}${move.toRow}${move.toCol}${move.promote ? '+' : ''}`;
}

export function buildStateHash(position: AiBattlePosition): string {
  const serialized = stableSerialize({
    sideToMove: position.sideToMove,
    turnNumber: position.turnNumber,
    moveCount: position.moveCount,
    sfen: position.sfen,
    hands: position.hands,
    boardState: position.boardState,
  });

  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }
  if (!value || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(',')}}`;
}

export function buildBoardState(
  placements: AiBoardPiece[],
  pieceDefsByCode: Record<string, AiPieceDefinition>,
): Record<string, unknown> {
  return {
    pieces: placements.map((piece) => ({
      side: piece.side,
      row: piece.row,
      col: piece.col,
      pieceCode: piece.pieceCode,
      char: piece.char,
      promoted: Boolean(piece.promoted),
      imageSignedUrl: piece.imageSignedUrl ?? null,
    })),
    custom_move_vectors: Object.fromEntries(
      Object.entries(pieceDefsByCode)
        .filter(([, item]) => item.moveVectors.length > 0)
        .map(([code, item]) => [
          code,
          item.moveVectors.map((vector) => ({
            dr: vector.dy,
            dc: vector.dx,
            slide: vector.maxStep > 1,
            ...(vector.captureMode ? { capture_mode: vector.captureMode } : {}),
          })),
        ]),
    ),
  };
}

export function createPosition(input: {
  pieces: AiBoardPiece[];
  hands: AiHandsState;
  sideToMove: 'player' | 'enemy';
  moveCount: number;
  pieceCatalog: AiPieceDefinition[];
}): AiBattlePosition {
  const lookups = buildPieceLookups(input.pieceCatalog);
  const mapping = createPieceSfenMapping(input.pieceCatalog);
  const position: AiBattlePosition = {
    sideToMove: input.sideToMove,
    moveCount: input.moveCount,
    turnNumber: input.moveCount + 1,
    boardState: buildBoardState(input.pieces, lookups.pieceDefsByCode),
    hands: input.hands,
    sfen: `${toSfenBoardPure(input.pieces, mapping)} ${input.sideToMove === 'player' ? 'b' : 'w'} ${toSfenHandsPure(input.hands, mapping)} ${Math.max(1, input.moveCount + 1)}`,
    stateHash: null,
  };
  position.stateHash = buildStateHash(position);
  return position;
}

export function resolvePieceDef(
  piece: AiBoardPiece,
  lookups: AiPieceLookups,
): AiPieceDefinition | null {
  const normalized = normalizePieceCode(piece.pieceCode);
  if (piece.promoted && normalized && lookups.promotedPieceDefsByCode[normalized]) {
    return lookups.promotedPieceDefsByCode[normalized];
  }
  if (normalized && lookups.pieceDefsByCode[normalized]) {
    return lookups.pieceDefsByCode[normalized];
  }
  if (piece.char === '玉') {
    return lookups.pieceDefsByChar['玉'] ?? lookups.pieceDefsByChar['王'] ?? null;
  }
  if (piece.char === '王') {
    return lookups.pieceDefsByChar['王'] ?? lookups.pieceDefsByChar['玉'] ?? null;
  }
  return lookups.pieceDefsByChar[piece.char] ?? null;
}
