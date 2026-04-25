import {
  canDropPiece,
  canPromoteByMove,
  getLegalTargetsFromVectors,
  mustPromoteByMove,
} from '@/features/stage-shogi/domain/game-rules';
import type {
  AiBattleMove,
  AiHandsState,
  AiBattlePosition,
  AiBoardPiece,
  AiPieceDefinition,
} from '@/ai/model';
import {
  buildPieceLookups,
  normalizeBattlePosition,
  piecesFromBoardState,
  sanitizeHandsBag,
  toBasePieceCode,
} from '@/ai/model';
import { CHAR_TO_CODE } from '@/features/stage-shogi/domain/piece-conversion';
import { createMove, findPieceAt, resolvePieceDef } from '@/ai/engine/shared';

function generateBoardPieceMoves(input: {
  pieces: AiBoardPiece[];
  piece: AiBoardPiece;
  pieceCatalog: AiPieceDefinition[];
}): AiBattleMove[] {
  const lookups = buildPieceLookups(input.pieceCatalog);
  const pieceDef = resolvePieceDef(input.piece, lookups);
  if (!pieceDef || pieceDef.moveVectors.length === 0) return [];

  const targets = getLegalTargetsFromVectors(input.pieces, input.piece, pieceDef.moveVectors, 9, {
    canJump: pieceDef.canJump === true,
  });

  const from = { row: input.piece.row, col: input.piece.col };
  const pieceCode =
    toBasePieceCode(input.piece.pieceCode) ??
    toBasePieceCode(CHAR_TO_CODE[input.piece.char]) ??
    'FU';

  return targets.flatMap((target) => {
    const captured = findPieceAt(input.pieces, target.row, target.col);
    const capturedPieceCode = toBasePieceCode(captured?.pieceCode ?? null);
    const promote = canPromoteByMove(input.piece, from, target, 9);
    const mustPromote = mustPromoteByMove(input.piece, target, 9);
    if (!promote) {
      return [createMove({ from, to: target, pieceCode, promote: false, capturedPieceCode })];
    }
    if (mustPromote) {
      return [createMove({ from, to: target, pieceCode, promote: true, capturedPieceCode })];
    }
    return [
      createMove({ from, to: target, pieceCode, promote: false, capturedPieceCode }),
      createMove({ from, to: target, pieceCode, promote: true, capturedPieceCode }),
    ];
  });
}

function generateDropMoves(input: {
  pieces: AiBoardPiece[];
  position: AiBattlePosition;
}): AiBattleMove[] {
  const bag = input.position.hands[input.position.sideToMove] ?? {};
  const moves: AiBattleMove[] = [];

  for (const [pieceCodeRaw, count] of Object.entries(bag)) {
    const pieceCode = toBasePieceCode(pieceCodeRaw);
    if (!pieceCode || typeof count !== 'number' || count <= 0) continue;

    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (
          !canDropPiece(
            input.pieces,
            input.position.hands,
            input.position.sideToMove,
            pieceCode,
            { row, col },
            9,
          )
        ) {
          continue;
        }
        moves.push(
          createMove({
            from: null,
            to: { row, col },
            pieceCode,
            promote: false,
            dropPieceCode: pieceCode,
            notation: `${pieceCode}*${row}${col}`,
          }),
        );
      }
    }
  }

  return moves;
}

export function generateLegalMoves(input: {
  position: AiBattlePosition;
  pieceCatalog: AiPieceDefinition[];
}) {
  const position = normalizeBattlePosition(input.position);
  position.hands = {
    player: sanitizeHandsBag(position.hands.player),
    enemy: sanitizeHandsBag(position.hands.enemy),
  } satisfies AiHandsState;
  const pieces = piecesFromBoardState(position);

  const boardMoves = pieces
    .filter((piece) => piece.side === position.sideToMove)
    .flatMap((piece) =>
      generateBoardPieceMoves({ pieces, piece, pieceCatalog: input.pieceCatalog }),
    );
  const dropMoves = generateDropMoves({ pieces, position });

  return {
    sideToMove: position.sideToMove,
    moveNo: position.moveCount + 1,
    stateHash: position.stateHash,
    legalMoves: [...boardMoves, ...dropMoves],
  };
}
