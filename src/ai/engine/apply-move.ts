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
  notationForMove,
  pieceChar,
} from '@/ai/engine/shared';
import { generateLegalMoves } from '@/ai/engine/legal-moves';
import {
  applyBoardHazardsOnLanding,
  applyMoveSkillEffects,
  tickSkillStateDurations,
} from '@/ai/engine/skill-runtime';

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
  let movedPieceAfterApply: (typeof nextPieces)[number] | null = null;
  let didCapture = false;
  let starReturnProcTriggered = false;

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
    movedPieceAfterApply = nextPieces[nextPieces.length - 1] ?? null;
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
      didCapture = true;
      nextPieces = nextPieces.filter(
        (piece) => !(piece.row === move.toRow && piece.col === move.toCol),
      );
      const capturedBaseCode = toBasePieceCode(captured.pieceCode);
      const isStarCaptured = capturedBaseCode === 'HOS' || captured.char === '星';
      if (isStarCaptured) {
        const procChance = 0.4;
        const roll = Math.random();
        const triggered = roll <= procChance;
        if (triggered) {
          starReturnProcTriggered = true;
          hands = addHandPiece(hands, captured.side, 'HOS', 1);
        } else {
          const capturedCode = toBasePieceCode(capturedToHandPieceCode(captured));
          if (capturedCode) {
            hands = addHandPiece(hands, actorSide, capturedCode, 1);
          }
        }
      } else {
        const capturedCode = toBasePieceCode(capturedToHandPieceCode(captured));
        if (capturedCode) {
          hands = addHandPiece(hands, actorSide, capturedCode, 1);
        }
      }
    }

    const movingIndexAfterCapture = nextPieces.findIndex(
      (piece) =>
        piece.side === actorSide && piece.row === move.fromRow && piece.col === move.fromCol,
    );
    if (movingIndexAfterCapture < 0) {
      throw new Error('moving piece not found after capture resolution');
    }
    const moving = nextPieces[movingIndexAfterCapture];
    nextPieces[movingIndexAfterCapture] = {
      ...moving,
      row: move.toRow,
      col: move.toCol,
      promoted: move.promote || moving.promoted === true,
      char: pieceChar(moving.pieceCode, move.promote || moving.promoted === true),
    };
    movedPieceAfterApply = nextPieces[movingIndexAfterCapture] ?? null;
  }

  let winnerSide: Side | null = null;
  if (!hasKing(nextPieces, 'player')) {
    winnerSide = 'enemy';
  } else if (!hasKing(nextPieces, 'enemy')) {
    winnerSide = 'player';
  }

  const nextSide: Side = actorSide === 'player' ? 'enemy' : 'player';
  let nextPosition = createPosition({
    pieces: nextPieces,
    hands,
    sideToMove: nextSide,
    moveCount: current.moveCount + 1,
    pieceCatalog: input.pieceCatalog,
  });
  nextPosition.boardState = {
    ...(current.boardState ?? {}),
    ...(nextPosition.boardState ?? {}),
  };

  // 既存ハザードの残りターンを進める。
  tickSkillStateDurations(nextPosition);
  // 着手によるスキル効果（移動制限・毒マスなど）を反映。
  applyMoveSkillEffects({
    position: nextPosition,
    move,
    actorSide,
    movedPiece: movedPieceAfterApply,
    pieces: nextPieces,
    didCapture,
  });
  // 毒マスへ侵入した駒は消滅。
  if (move.notation !== 'time_skill_only') {
    applyBoardHazardsOnLanding({
      position: nextPosition,
      actorSide,
      movedTo: { row: move.toRow, col: move.toCol },
      pieces: nextPieces,
    });
    nextPosition.boardState = {
      ...(nextPosition.boardState ?? {}),
      pieces: nextPieces.map((piece) => ({ ...piece })),
    };
  }

  // スキルで盤上座標が変わる（例: 水の押し流し）ため、
  // boardState だけでなく SFEN も同じターン内で再構築して二重表示を防ぐ。
  const latestHands = normalizeHandsStateKeys({
    player: sanitizeHandsBag(nextPosition.hands.player),
    enemy: sanitizeHandsBag(nextPosition.hands.enemy),
  });
  const recomputedPosition = createPosition({
    pieces: nextPieces,
    hands: latestHands,
    sideToMove: nextSide,
    moveCount: current.moveCount + 1,
    pieceCatalog: input.pieceCatalog,
  });
  recomputedPosition.boardState = {
    ...(recomputedPosition.boardState ?? {}),
    ...(nextPosition.boardState ?? {}),
  };
  nextPosition = recomputedPosition;

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
      starReturnProcTriggered ||
      move.notation === 'time_skill' ||
      move.notation === 'time_skill_only' ||
      Boolean(move.notation && !/^\d/.test(move.notation)),
    position: nextPosition,
    game,
  };
}
