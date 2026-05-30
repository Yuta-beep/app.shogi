import { toBasePieceCode as toAiBasePieceCode } from '@/ai/model/move';
import type { BoardPiece, HandsState, Side } from '@/features/stage-shogi/domain/game-rules';
import { CHAR_TO_CODE } from '@/features/stage-shogi/domain/piece-conversion';
import {
  pieceCodeFromPlacement,
  pieceCharFromCode,
  findPieceAt,
} from '@/features/stage-shogi/ui/stage-shogi-screen.helpers';
import type { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';
import type {
  BattleCanonicalPosition,
  BattleMove,
} from '@/usecases/stage-battle/game-move-contract';

type PieceDefsByCode = Record<string, PieceCatalogItem>;
type PieceDefsByChar = Record<string, PieceCatalogItem>;

function cloneMoveVectors(
  movedDef: PieceCatalogItem | undefined,
): { dx: number; dy: number; maxStep: number; captureMode?: string }[] {
  return Array.isArray(movedDef?.moveVectors)
    ? movedDef.moveVectors.map((v) => ({
        dx: v.dx,
        dy: v.dy,
        maxStep: v.maxStep,
        ...(v.captureMode ? { captureMode: v.captureMode } : {}),
      }))
    : [];
}

function resolveMovedPieceIdentity(
  board: BoardPiece[],
  move: BattleMove,
  actorSide: Side,
  pieceDefsByCode: PieceDefsByCode,
  pieceDefsByChar: PieceDefsByChar,
) {
  const movedAtSource =
    move.fromRow != null && move.fromCol != null
      ? findPieceAt(board, move.fromRow, move.fromCol)
      : null;
  const movedAtTarget = findPieceAt(board, move.toRow, move.toCol);
  const movedCodeFromBoard = movedAtSource
    ? pieceCodeFromPlacement(movedAtSource.pieceCode ?? null, movedAtSource.char, pieceDefsByChar)
    : movedAtTarget
      ? pieceCodeFromPlacement(movedAtTarget.pieceCode ?? null, movedAtTarget.char, pieceDefsByChar)
      : null;
  const rawMovedCode = (movedCodeFromBoard ?? move.pieceCode ?? '').toUpperCase() || null;
  const movedCodeFromChar = movedAtSource?.char
    ? toAiBasePieceCode(CHAR_TO_CODE[movedAtSource.char] ?? null)
    : movedAtTarget?.char
      ? toAiBasePieceCode(CHAR_TO_CODE[movedAtTarget.char] ?? null)
      : null;
  const movedCode =
    (rawMovedCode && !/^PIECE_[A-Z0-9_]+$/i.test(rawMovedCode)
      ? rawMovedCode
      : (movedCodeFromChar ?? rawMovedCode)) || null;
  const movedCharRaw =
    movedAtSource?.char && !/^piece_[a-z0-9]+$/i.test(movedAtSource.char)
      ? movedAtSource.char
      : movedAtTarget?.char && !/^piece_[a-z0-9]+$/i.test(movedAtTarget.char)
        ? movedAtTarget.char
        : movedCode
          ? pieceCharFromCode(movedCode, actorSide, move.promote === true)
          : '?';
  const movedChar =
    movedCharRaw && movedCharRaw !== '?' && movedCharRaw !== movedCode ? movedCharRaw : null;
  const movedDef =
    (movedCode ? pieceDefsByCode[movedCode] : undefined) ??
    (movedChar ? pieceDefsByChar[movedChar] : undefined);

  return {
    movedCode,
    movedChar,
    copiedMoveVectors: cloneMoveVectors(movedDef),
  };
}

export function attachLastMovedPieceSkillState(input: {
  position: BattleCanonicalPosition;
  board: BoardPiece[];
  move: BattleMove;
  actorSide: Side;
  skillStateKey: 'last_player_moved_piece' | 'last_enemy_moved_piece';
  pieceDefsByCode: PieceDefsByCode;
  pieceDefsByChar: PieceDefsByChar;
}): BattleCanonicalPosition {
  const { movedCode, movedChar, copiedMoveVectors } = resolveMovedPieceIdentity(
    input.board,
    input.move,
    input.actorSide,
    input.pieceDefsByCode,
    input.pieceDefsByChar,
  );

  const boardState = (input.position.boardState ?? {}) as Record<string, unknown>;
  const skillStateRaw =
    (boardState.skill_state as Record<string, unknown> | undefined) ??
    (boardState.skillState as Record<string, unknown> | undefined) ??
    {};

  return {
    ...input.position,
    boardState: {
      ...boardState,
      skill_state: {
        ...skillStateRaw,
        [input.skillStateKey]: {
          side: input.actorSide,
          row: input.move.toRow,
          col: input.move.toCol,
          pieceCode: movedCode,
          char: movedChar,
          promoted: input.move.promote === true,
          copiedMoveVectors,
        },
      },
    },
  };
}

export function patchBookCaptureHand(input: {
  position: BattleCanonicalPosition;
  move: BattleMove;
  rollbackSnapshot?: { pieces: BoardPiece[]; hands: HandsState };
}): BattleCanonicalPosition {
  const capturedBefore = input.rollbackSnapshot
    ? findPieceAt(input.rollbackSnapshot.pieces, input.move.toRow, input.move.toCol)
    : null;
  const capturedCodeUpper = (capturedBefore?.pieceCode ?? '').toUpperCase();
  const capturedCharNorm = (() => {
    try {
      return (capturedBefore?.char ?? '').normalize('NFKC');
    } catch {
      return capturedBefore?.char ?? '';
    }
  })();
  const capturedBook =
    capturedBefore?.side === 'enemy' &&
    (capturedCharNorm === '書' ||
      capturedCharNorm === '書物' ||
      capturedCodeUpper.includes('BOOK') ||
      capturedCodeUpper.includes('5D848242A136'));
  if (!capturedBook) return input.position;

  const handsRoot = {
    player: { ...(input.position.hands?.player ?? {}) },
    enemy: { ...(input.position.hands?.enemy ?? {}) },
  };
  const beforeCount = Math.max(
    0,
    Math.floor((input.rollbackSnapshot?.hands.player?.BOOK as number) ?? 0),
  );
  const afterCount = Math.max(0, Math.floor((handsRoot.player.BOOK as number) ?? 0));
  if (afterCount > beforeCount) return input.position;

  handsRoot.player.BOOK = afterCount + 1;
  return {
    ...input.position,
    hands: handsRoot,
  };
}
