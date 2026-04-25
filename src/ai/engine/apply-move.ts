import {
  addHandPiece,
  capturedToHandPieceCode,
  hasKing,
  normalizeHandsStateKeys,
} from '@/features/stage-shogi/domain/game-rules';
import type { AiBattleMove, AiBattlePosition, AiPieceDefinition, Side } from '@/ai/model';
import type {
  BattleCommittedMove,
  BattleGameStatus,
} from '@/usecases/stage-battle/game-move-contract';
import {
  normalizeBattleMove,
  normalizeBattlePosition,
  piecesFromBoardState,
  sanitizeHandsBag,
  toBasePieceCode,
} from '@/ai/model';
import { assertMoveAllowedBySessionCatalog } from '@/ai/engine/guardrails';
import {
  createPosition,
  findPieceAt,
  moveEquals,
  notationForMove,
  pieceChar,
} from '@/ai/engine/shared';
import { generateLegalMoves } from '@/ai/engine/legal-moves';

function createGameStatus(winnerSide: Side | null): BattleGameStatus {
  if (winnerSide === 'player') {
    return { status: 'finished', result: 'player_win', winnerSide: 'player' };
  }
  if (winnerSide === 'enemy') {
    return { status: 'finished', result: 'enemy_win', winnerSide: 'enemy' };
  }
  return { status: 'in_progress', result: null, winnerSide: null };
}

export function applyMove(input: {
  position: AiBattlePosition;
  pieceCatalog: AiPieceDefinition[];
  move: AiBattleMove;
}): BattleCommittedMove {
  const current = normalizeBattlePosition(input.position);
  const move = normalizeBattleMove(input.move);
  const pieces = piecesFromBoardState(current);
  let hands = normalizeHandsStateKeys({
    player: sanitizeHandsBag(current.hands.player),
    enemy: sanitizeHandsBag(current.hands.enemy),
  });
  const actorSide = current.sideToMove;
  assertMoveAllowedBySessionCatalog({
    position: current,
    pieceCatalog: input.pieceCatalog,
    move,
    actor: actorSide,
  });

  let nextPieces = pieces.map((piece) => ({ ...piece }));

  if (move.notation === 'time_skill_only') {
    // no-op on board
  } else if (move.dropPieceCode) {
    const dropCode = toBasePieceCode(move.dropPieceCode);
    if (!dropCode) {
      throw new Error('dropPieceCode is invalid');
    }
    hands = addHandPiece(hands, actorSide, dropCode, -1);
    nextPieces.push({
      side: actorSide,
      row: move.toRow,
      col: move.toCol,
      pieceCode: dropCode,
      char: pieceChar(dropCode, false),
      promoted: false,
      imageSignedUrl: null,
    });
  } else {
    const movingIndex = nextPieces.findIndex(
      (piece) =>
        piece.side === actorSide && piece.row === move.fromRow && piece.col === move.fromCol,
    );
    if (movingIndex < 0) {
      throw new Error('moving piece not found');
    }

    const captured = findPieceAt(nextPieces, move.toRow, move.toCol);
    if (captured && captured.side !== actorSide) {
      nextPieces = nextPieces.filter(
        (piece) => !(piece.row === move.toRow && piece.col === move.toCol),
      );
      const capturedCode = toBasePieceCode(capturedToHandPieceCode(captured));
      if (capturedCode) {
        hands = addHandPiece(hands, actorSide, capturedCode, 1);
      }
    }

    const moving = nextPieces[movingIndex];
    nextPieces[movingIndex] = {
      ...moving,
      row: move.toRow,
      col: move.toCol,
      promoted: move.promote || moving.promoted === true,
      char: pieceChar(moving.pieceCode, move.promote || moving.promoted === true),
    };
  }

  let winnerSide: Side | null = null;
  if (!hasKing(nextPieces, 'player')) {
    winnerSide = 'enemy';
  } else if (!hasKing(nextPieces, 'enemy')) {
    winnerSide = 'player';
  }

  const nextSide: Side = actorSide === 'player' ? 'enemy' : 'player';
  const nextPosition = createPosition({
    pieces: nextPieces,
    hands,
    sideToMove: nextSide,
    moveCount: current.moveCount + 1,
    pieceCatalog: input.pieceCatalog,
  });

  if (!winnerSide) {
    const nextLegal = generateLegalMoves({
      position: nextPosition,
      pieceCatalog: input.pieceCatalog,
    });
    if (nextLegal.legalMoves.length === 0) {
      winnerSide = actorSide;
    }
  }

  const game = createGameStatus(winnerSide);

  return {
    moveNo: current.moveCount + 1,
    actorSide,
    move: { ...move, notation: notationForMove(move) },
    skillTriggered:
      move.notation === 'time_skill' ||
      move.notation === 'time_skill_only' ||
      Boolean(move.notation && !/^\d/.test(move.notation)),
    position: nextPosition,
    game,
  };
}
