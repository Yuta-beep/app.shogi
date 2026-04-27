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
import {
  isCaptureBlockedByDarkBlind,
  isPieceImmobilized,
  movementRuleAt,
} from '@/ai/engine/skill-runtime';

function isKingPiece(piece: AiBoardPiece): boolean {
  const code = toBasePieceCode(piece.pieceCode);
  return code === 'OU' || piece.char === '王' || piece.char === '玉';
}

function isReflectivePiece(piece: AiBoardPiece): boolean {
  const code = toBasePieceCode(piece.pieceCode);
  return code === 'HIK' || piece.char === '光';
}

function generateReflectiveTargets(pieces: AiBoardPiece[], piece: AiBoardPiece): Array<{ row: number; col: number }> {
  const out: Array<{ row: number; col: number }> = [];
  const seen = new Set<string>();
  const starts: Array<[number, number]> = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (const [startDr, startDc] of starts) {
    let r = piece.row;
    let c = piece.col;
    let dr = startDr;
    let dc = startDc;
    const seenState = new Set<string>();
    for (let step = 0; step < 256; step += 1) {
      const stateKey = `${r}:${c}:${dr}:${dc}`;
      if (seenState.has(stateKey)) break;
      seenState.add(stateKey);
      let nr = r + dr;
      let nc = c + dc;
      if (nr < 0 || nr > 8) {
        dr *= -1;
        nr = r + dr;
      }
      if (nc < 0 || nc > 8) {
        dc *= -1;
        nc = c + dc;
      }
      if (nr < 0 || nr > 8 || nc < 0 || nc > 8) break;
      const target = findPieceAt(pieces, nr, nc);
      if (target) {
        if (target.side !== piece.side) {
          const key = `${nr}:${nc}`;
          if (!seen.has(key)) {
            seen.add(key);
            out.push({ row: nr, col: nc });
          }
        }
        break;
      }
      const key = `${nr}:${nc}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ row: nr, col: nc });
      }
      r = nr;
      c = nc;
    }
  }
  return out;
}

function isLeapOverOneMode(mode: string | null | undefined): boolean {
  if (!mode) return false;
  const normalized = mode.trim().toLowerCase();
  return normalized === 'leapoverone' || normalized === 'leap_over_one' || normalized === 'leap-over-one';
}

function normalizeVectorsForBishop(piece: AiBoardPiece, vectors: AiPieceDefinition['moveVectors']) {
  const baseCode = toBasePieceCode(piece.pieceCode);
  if (baseCode !== 'KA') return vectors;
  // 角は常に斜め方向へ盤端まで移動可能にする。
  return vectors.map((v) =>
    Math.abs(v.dx) === 1 && Math.abs(v.dy) === 1
      ? {
          ...v,
          maxStep: 9,
        }
      : v,
  );
}

function normalizeVectorsForGold(piece: AiBoardPiece, vectors: AiPieceDefinition['moveVectors']) {
  const baseCode = toBasePieceCode(piece.pieceCode);
  if (baseCode !== 'KI') return vectors;
  // 金: 前・斜め前・左右・後ろに1マス
  return [
    { dx: -1, dy: -1, maxStep: 1 },
    { dx: 0, dy: -1, maxStep: 1 },
    { dx: 1, dy: -1, maxStep: 1 },
    { dx: -1, dy: 0, maxStep: 1 },
    { dx: 1, dy: 0, maxStep: 1 },
    { dx: 0, dy: 1, maxStep: 1 },
  ];
}

function normalizeVectorsForTime(piece: AiBoardPiece, vectors: AiPieceDefinition['moveVectors']) {
  const baseCode = toBasePieceCode(piece.pieceCode);
  if (baseCode !== 'TIME' && piece.char !== '時') return vectors;
  // 時: 全方位1マス
  return [
    { dx: -1, dy: -1, maxStep: 1 },
    { dx: 0, dy: -1, maxStep: 1 },
    { dx: 1, dy: -1, maxStep: 1 },
    { dx: -1, dy: 0, maxStep: 1 },
    { dx: 1, dy: 0, maxStep: 1 },
    { dx: -1, dy: 1, maxStep: 1 },
    { dx: 0, dy: 1, maxStep: 1 },
    { dx: 1, dy: 1, maxStep: 1 },
  ];
}

function hasAdjacentEnemyPiece(pieces: AiBoardPiece[], piece: AiBoardPiece): boolean {
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const row = piece.row + dr;
      const col = piece.col + dc;
      if (row < 0 || row > 8 || col < 0 || col > 8) continue;
      const target = findPieceAt(pieces, row, col);
      if (target && target.side !== piece.side) return true;
    }
  }
  return false;
}

function generateLeapOverOneTargets(
  pieces: AiBoardPiece[],
  piece: AiBoardPiece,
  vectors: Array<{ dx: number; dy: number }>,
): Array<{ row: number; col: number }> {
  const out: Array<{ row: number; col: number }> = [];
  const seen = new Set<string>();
  for (const vector of vectors) {
    let r = piece.row + vector.dy;
    let c = piece.col + vector.dx;
    let platformFound = false;
    while (r >= 0 && r <= 8 && c >= 0 && c <= 8) {
      const target = findPieceAt(pieces, r, c);
      if (target) {
        platformFound = true;
        r += vector.dy;
        c += vector.dx;
        break;
      }
      const key = `${r}:${c}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ row: r, col: c });
      }
      r += vector.dy;
      c += vector.dx;
    }
    if (!platformFound) continue;
    while (r >= 0 && r <= 8 && c >= 0 && c <= 8) {
      const target = findPieceAt(pieces, r, c);
      if (!target) {
        r += vector.dy;
        c += vector.dx;
        continue;
      }
      if (target.side !== piece.side) {
        const key = `${r}:${c}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ row: r, col: c });
        }
      }
      break;
    }
  }
  return out;
}

function generateBoardPieceMoves(input: {
  pieces: AiBoardPiece[];
  piece: AiBoardPiece;
  position: AiBattlePosition;
  pieceCatalog: AiPieceDefinition[];
}): AiBattleMove[] {
  const lookups = buildPieceLookups(input.pieceCatalog);
  const pieceDef = resolvePieceDef(input.piece, lookups);
  if (!pieceDef || pieceDef.moveVectors.length === 0) return [];
  const bishopNormalized = normalizeVectorsForBishop(input.piece, pieceDef.moveVectors);
  const goldNormalized = normalizeVectorsForGold(input.piece, bishopNormalized);
  const effectiveVectors = normalizeVectorsForTime(input.piece, goldNormalized);

  const leapVectors = effectiveVectors.filter((v) => isLeapOverOneMode(v.captureMode));
  const normalVectors = effectiveVectors.filter((v) => !isLeapOverOneMode(v.captureMode));
  const normalTargets = getLegalTargetsFromVectors(input.pieces, input.piece, normalVectors, 9, {
    canJump: pieceDef.canJump === true,
  });
  const leapTargets = generateLeapOverOneTargets(input.pieces, input.piece, leapVectors);
  const reflectiveTargets = isReflectivePiece(input.piece)
    ? generateReflectiveTargets(input.pieces, input.piece)
    : [];
  const targets = [...normalTargets, ...leapTargets, ...reflectiveTargets];
  const movementRule = movementRuleAt(
    input.position,
    input.piece.side,
    input.piece.row,
    input.piece.col,
  );
  const filteredTargets =
    movementRule === 'vertical_step_only'
      ? targets.filter(
          (target) =>
            target.col === input.piece.col && Math.abs(target.row - input.piece.row) === 1,
        )
      : movementRule === 'orthogonal_step_only'
        ? targets.filter(
            (target) =>
              Math.abs(target.row - input.piece.row) + Math.abs(target.col - input.piece.col) === 1,
          )
        : targets;
  const captureFilteredTargets = filteredTargets.filter((target) => {
    const captured = findPieceAt(input.pieces, target.row, target.col);
    if (!captured || captured.side === input.piece.side) return true;
    return !isCaptureBlockedByDarkBlind(
      input.position,
      captured.side,
      captured.row,
      captured.col,
    );
  });

  const from = { row: input.piece.row, col: input.piece.col };
  const pieceCode =
    toBasePieceCode(input.piece.pieceCode) ??
    toBasePieceCode(CHAR_TO_CODE[input.piece.char]) ??
    'FU';

  return captureFilteredTargets.flatMap((target) => {
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
    .filter(
      (piece) =>
        isKingPiece(piece) ||
        !isPieceImmobilized(position, piece.side, piece.row, piece.col),
    )
    .flatMap((piece) =>
      generateBoardPieceMoves({ pieces, piece, position, pieceCatalog: input.pieceCatalog }),
    );
  const timeSkillOnlyMoves = pieces
    .filter((piece) => piece.side === position.sideToMove)
    .filter((piece) => {
      const code = toBasePieceCode(piece.pieceCode);
      return code === 'TIME' || piece.char === '時';
    })
    .filter((piece) => hasAdjacentEnemyPiece(pieces, piece))
    .map((piece) =>
      createMove({
        from: { row: piece.row, col: piece.col },
        to: { row: piece.row, col: piece.col },
        pieceCode: toBasePieceCode(piece.pieceCode) ?? 'TIME',
        promote: false,
        notation: 'time_skill_only',
      }),
    );
  const dropMoves = generateDropMoves({ pieces, position });

  return {
    sideToMove: position.sideToMove,
    moveNo: position.moveCount + 1,
    stateHash: position.stateHash,
    legalMoves: [...boardMoves, ...timeSkillOnlyMoves, ...dropMoves],
  };
}
