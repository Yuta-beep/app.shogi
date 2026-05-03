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
import { createPosition, findPieceAt, notationForMove, pieceChar } from '@/ai/engine/shared';
import { generateLegalMoves } from '@/ai/engine/legal-moves';
import {
  createSkillRuntimeView,
  applyBoardHazardsOnLanding,
  applyMoveSkillEffects,
  tickSkillStateDurations,
  resolveEvadeCaptureProcChanceForPiece,
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

function isSpiritPiece(piece: { pieceCode: string | null; char: string }): boolean {
  if (piece.char === '霊') return true;
  const base = toBasePieceCode(piece.pieceCode);
  if (base === 'SPIRIT') return true;
  const raw = (piece.pieceCode ?? '').toUpperCase();
  return raw.includes('9D7397390E77');
}

function collectAdjacentEmptyCells(
  pieces: Array<{ row: number; col: number }>,
  row: number,
  col: number,
): Array<{ row: number; col: number }> {
  const out: Array<{ row: number; col: number }> = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r > 8 || c < 0 || c > 8) continue;
      if (pieces.some((p) => p.row === r && p.col === c)) continue;
      out.push({ row: r, col: c });
    }
  }
  return out;
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
  const preMoveSkillView = createSkillRuntimeView(current);
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

  if (move.notation === 'time_skill_only' || move.notation === 'house_skill_only') {
    // no-op on board（スキルのみ）
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
    if (preMoveSkillView.rockObstacleCells.has(`${move.toRow}:${move.toCol}`)) {
      throw new Error('cannot move onto rock obstacle');
    }
    const movingIndex = nextPieces.findIndex(
      (piece) =>
        piece.side === actorSide && piece.row === move.fromRow && piece.col === move.fromCol,
    );
    if (movingIndex < 0) {
      throw new Error('moving piece not found');
    }
    const movingPiece = nextPieces[movingIndex];
    const movingCode = toBasePieceCode(movingPiece?.pieceCode);
    const isCloudMover = movingCode === 'CLOUD' || movingPiece?.char === '雲';

    const captured = findPieceAt(nextPieces, move.toRow, move.toCol);
    if (captured) {
      const captureOwnPiece = captured.side === actorSide;
      if (captureOwnPiece && !isCloudMover) {
        throw new Error('friendly capture is only allowed for CLOUD');
      }
      if (isCloudMover && !captureOwnPiece) {
        throw new Error('CLOUD cannot capture enemy pieces');
      }
      if (isCloudMover && captureOwnPiece) {
        const capturedBase = toBasePieceCode(captured.pieceCode);
        if (capturedBase === 'OU' || captured.char === '王' || captured.char === '玉') {
          throw new Error('CLOUD cannot capture allied king');
        }
      }

      let phantomEvaded = false;
      let adjacentEmpty: Array<{ row: number; col: number }> = [];
      if (!captureOwnPiece) {
        const evadeChance = resolveEvadeCaptureProcChanceForPiece(
          current.boardState as Record<string, unknown> | undefined,
          captured,
        );
        adjacentEmpty = collectAdjacentEmptyCells(nextPieces, move.toRow, move.toCol);
        if (evadeChance != null) {
          if (adjacentEmpty.length > 0) {
            const roll = Math.random();
            phantomEvaded = roll <= evadeChance;
          }
        }
      }

      if (phantomEvaded) {
        didCapture = false;
        const pick = adjacentEmpty[Math.floor(Math.random() * adjacentEmpty.length)]!;
        const phIdx = nextPieces.findIndex(
          (p) => p.row === move.toRow && p.col === move.toCol && p.side === captured.side,
        );
        if (phIdx >= 0) {
          const ph = nextPieces[phIdx]!;
          nextPieces[phIdx] = { ...ph, row: pick.row, col: pick.col };
        }
      } else {
        didCapture = true;
        nextPieces = nextPieces.filter(
          (piece) => !(piece.row === move.toRow && piece.col === move.toCol),
        );
        const fallbackCapturedCode = toBasePieceCode(move.capturedPieceCode);
        if (captureOwnPiece) {
          // 雲の味方捕獲は自分の手駒に加える。
          const capturedCode =
            toBasePieceCode(capturedToHandPieceCode(captured)) ?? fallbackCapturedCode;
          if (capturedCode) {
            hands = addHandPiece(hands, actorSide, capturedCode, 1);
          }
        } else {
          const isSpiritCaptured = isSpiritPiece(captured);
          const capturedBaseCode = toBasePieceCode(captured.pieceCode);
          const isStarCaptured = capturedBaseCode === 'HOS' || captured.char === '星';
          if (isSpiritCaptured) {
            // 霊: 相手に取られても手駒に加わらず消滅する。
          } else if (isStarCaptured) {
            const procChance = 0.4;
            const roll = Math.random();
            const triggered = roll <= procChance;
            if (triggered) {
              starReturnProcTriggered = true;
              hands = addHandPiece(hands, captured.side, 'HOS', 1);
            } else {
              const capturedCode =
                toBasePieceCode(capturedToHandPieceCode(captured)) ?? fallbackCapturedCode;
              if (capturedCode) {
                hands = addHandPiece(hands, actorSide, capturedCode, 1);
              }
            }
          } else {
            const capturedCode =
              toBasePieceCode(capturedToHandPieceCode(captured)) ?? fallbackCapturedCode;
            if (capturedCode) {
              hands = addHandPiece(hands, actorSide, capturedCode, 1);
            }
          }
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
    const nextPromoted = move.promote || moving.promoted === true;
    const resolvedChar = pieceChar(moving.pieceCode, nextPromoted);
    const nextChar =
      resolvedChar === '?' ||
      (toBasePieceCode(moving.pieceCode) != null &&
        resolvedChar === toBasePieceCode(moving.pieceCode))
        ? moving.char
        : resolvedChar;
    nextPieces[movingIndexAfterCapture] = {
      ...moving,
      row: move.toRow,
      col: move.toCol,
      promoted: nextPromoted,
      char: nextChar,
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
  if (move.notation !== 'time_skill_only' && move.notation !== 'house_skill_only') {
    applyBoardHazardsOnLanding({
      position: nextPosition,
      actorSide,
      movedTo: { row: move.toRow, col: move.toCol },
      pieces: nextPieces,
    });
  }
  // スキルで駒数が変わる（家の召喚など）ため、常に nextPieces を board_state.pieces に反映する。
  nextPosition.boardState = {
    ...(nextPosition.boardState ?? {}),
    pieces: nextPieces.map((piece) => ({ ...piece })),
  };

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
      move.notation === 'house_skill_only' ||
      Boolean(move.notation && move.notation !== 'time_normal' && !/^\d/.test(move.notation)),
    position: nextPosition,
    game,
  };
}
