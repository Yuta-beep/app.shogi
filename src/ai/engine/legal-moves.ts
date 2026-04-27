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
  AiPieceLookups,
} from '@/ai/model';
import {
  buildPieceLookups,
  normalizeBattlePosition,
  piecesFromBoardState,
  sanitizeHandsBag,
  toBasePieceCode,
} from '@/ai/model';
import { CHAR_TO_CODE } from '@/features/stage-shogi/domain/piece-conversion';
import { createMove, resolvePieceDef } from '@/ai/engine/shared';
import { createSkillRuntimeView, type SkillRuntimeView } from '@/ai/engine/skill-runtime';

function isKingPiece(piece: AiBoardPiece): boolean {
  const code = toBasePieceCode(piece.pieceCode);
  return code === 'OU' || piece.char === '王' || piece.char === '玉';
}

function isReflectivePiece(piece: AiBoardPiece): boolean {
  const code = toBasePieceCode(piece.pieceCode);
  return code === 'HIK' || piece.char === '光';
}

function isCloudPiece(piece: AiBoardPiece): boolean {
  const code = toBasePieceCode(piece.pieceCode);
  return code === 'CLOUD' || piece.char === '雲';
}

function isMirrorPiece(piece: AiBoardPiece): boolean {
  const code = toBasePieceCode(piece.pieceCode);
  return (
    piece.char === '映' ||
    piece.char === '鏡' ||
    code === 'EI' ||
    code === 'KAGAMI' ||
    code === 'MIRROR'
  );
}

function isKingBlockedByPoisonCell(
  skillView: SkillRuntimeView,
  piece: AiBoardPiece,
  row: number,
  col: number,
): boolean {
  if (!isKingPiece(piece)) return false;
  return skillView.kingPoisonBlockedCells.has(`${piece.side}:${row}:${col}`);
}

function isATransformedPawn(skillView: SkillRuntimeView, piece: AiBoardPiece): boolean {
  const baseCode = toBasePieceCode(piece.pieceCode);
  if (!(baseCode === 'FU' || piece.char === '歩')) return false;
  return skillView.aTransformCells.has(`${piece.side}:${piece.row}:${piece.col}`);
}

type OccupancyMap = Map<string, AiBoardPiece>;

function occupancyKey(row: number, col: number): string {
  return `${row}:${col}`;
}

function buildOccupancyMap(pieces: AiBoardPiece[]): OccupancyMap {
  return new Map(pieces.map((piece) => [occupancyKey(piece.row, piece.col), piece]));
}

function findPieceAtFast(occupancy: OccupancyMap, row: number, col: number): AiBoardPiece | null {
  return occupancy.get(occupancyKey(row, col)) ?? null;
}

function generateReflectiveTargets(
  occupancy: OccupancyMap,
  piece: AiBoardPiece,
): { row: number; col: number }[] {
  const out: { row: number; col: number }[] = [];
  const seen = new Set<string>();
  const starts: [number, number][] = [
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
      const target = findPieceAtFast(occupancy, nr, nc);
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
  return (
    normalized === 'leapoverone' || normalized === 'leap_over_one' || normalized === 'leap-over-one'
  );
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

function resolveEffectiveVectorsForPiece(
  piece: AiBoardPiece,
  pieceDef: AiPieceDefinition,
): AiPieceDefinition['moveVectors'] {
  const bishopNormalized = normalizeVectorsForBishop(piece, pieceDef.moveVectors);
  const goldNormalized = normalizeVectorsForGold(piece, bishopNormalized);
  return normalizeVectorsForTime(piece, goldNormalized);
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function selectMirrorTarget(
  position: AiBattlePosition,
  mover: AiBoardPiece,
  candidates: AiBoardPiece[],
): AiBoardPiece | null {
  if (candidates.length === 0) return null;
  const seed = `${position.stateHash ?? ''}:${position.turnNumber}:${position.moveCount}:${mover.row}:${mover.col}:${mover.side}`;
  const idx = stableHash(seed) % candidates.length;
  return candidates[idx] ?? null;
}

function hasAdjacentEnemyPiece(occupancy: OccupancyMap, piece: AiBoardPiece): boolean {
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const row = piece.row + dr;
      const col = piece.col + dc;
      if (row < 0 || row > 8 || col < 0 || col > 8) continue;
      const target = findPieceAtFast(occupancy, row, col);
      if (target && target.side !== piece.side) return true;
    }
  }
  return false;
}

function generateLeapOverOneTargets(
  occupancy: OccupancyMap,
  piece: AiBoardPiece,
  vectors: { dx: number; dy: number }[],
): { row: number; col: number }[] {
  const out: { row: number; col: number }[] = [];
  const seen = new Set<string>();
  for (const vector of vectors) {
    let r = piece.row + vector.dy;
    let c = piece.col + vector.dx;
    let platformFound = false;
    while (r >= 0 && r <= 8 && c >= 0 && c <= 8) {
      const target = findPieceAtFast(occupancy, r, c);
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
      const target = findPieceAtFast(occupancy, r, c);
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

function generateCloudTargetsFromVectors(
  occupancy: OccupancyMap,
  piece: AiBoardPiece,
  vectors: AiPieceDefinition['moveVectors'],
): { row: number; col: number }[] {
  const out: { row: number; col: number }[] = [];
  const seen = new Set<string>();
  const orient = piece.side === 'player' ? 1 : -1;
  for (const vector of vectors) {
    const maxStep = Math.max(1, vector.maxStep);
    const dx = vector.dx * orient;
    const dy = vector.dy * orient;
    for (let step = 1; step <= maxStep; step += 1) {
      const row = piece.row + dy * step;
      const col = piece.col + dx * step;
      if (row < 0 || row > 8 || col < 0 || col > 8) break;
      const occupied = findPieceAtFast(occupancy, row, col);
      if (occupied && occupied.side !== piece.side) {
        // 雲は敵駒を取れないため、敵駒マスは移動不可。
        break;
      }
      if (occupied && isKingPiece(occupied)) {
        // 雲でも味方の王/玉は取れない。
        break;
      }
      const key = `${row}:${col}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ row, col });
      }
      if (occupied) {
        // 味方駒を取った地点で停止。
        break;
      }
    }
  }
  return out;
}

function generateBoardPieceMoves(input: {
  pieces: AiBoardPiece[];
  piece: AiBoardPiece;
  position: AiBattlePosition;
  lookups: AiPieceLookups;
  occupancy: OccupancyMap;
  skillView: SkillRuntimeView;
}): AiBattleMove[] {
  const pieceDef = resolvePieceDef(input.piece, input.lookups);
  if (!pieceDef || pieceDef.moveVectors.length === 0) return [];
  let effectiveVectors = resolveEffectiveVectorsForPiece(input.piece, pieceDef);
  let effectiveCanJump = pieceDef.canJump === true;

  if (isMirrorPiece(input.piece)) {
    const enemyCandidates = input.pieces.filter(
      (piece) => piece.side !== input.piece.side && !isMirrorPiece(piece),
    );
    const selected = selectMirrorTarget(input.position, input.piece, enemyCandidates);
    if (selected) {
      const selectedDef = resolvePieceDef(selected, input.lookups);
      if (selectedDef && selectedDef.moveVectors.length > 0) {
        effectiveVectors = resolveEffectiveVectorsForPiece(selected, selectedDef);
        effectiveCanJump = selectedDef.canJump === true;
      }
    }
  }

  const leapVectors = effectiveVectors.filter((v) => isLeapOverOneMode(v.captureMode));
  const normalVectors = effectiveVectors.filter((v) => !isLeapOverOneMode(v.captureMode));
  const normalTargets = isCloudPiece(input.piece)
    ? generateCloudTargetsFromVectors(input.occupancy, input.piece, normalVectors)
    : getLegalTargetsFromVectors(input.pieces, input.piece, normalVectors, 9, {
        canJump: effectiveCanJump,
      });
  const leapTargets = generateLeapOverOneTargets(input.occupancy, input.piece, leapVectors);
  const reflectiveTargets = isReflectivePiece(input.piece)
    ? generateReflectiveTargets(input.occupancy, input.piece)
    : [];
  const targets = [...normalTargets, ...leapTargets, ...reflectiveTargets];
  const movementRule =
    input.skillView.movementRulesByCell.get(
      `${input.piece.side}:${input.piece.row}:${input.piece.col}`,
    ) ?? null;
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
    const captured = findPieceAtFast(input.occupancy, target.row, target.col);
    if (!captured) return true;
    if (isCloudPiece(input.piece)) {
      // 雲: 敵は取れず、味方のみ取れる（ただし味方王/玉は不可）。
      return captured.side === input.piece.side && !isKingPiece(captured);
    }
    if (captured.side === input.piece.side) return false;
    return !input.skillView.darkBlindCells.has(`${captured.side}:${captured.row}:${captured.col}`);
  });

  const hazardFilteredTargets = captureFilteredTargets.filter(
    (target) => !isKingBlockedByPoisonCell(input.skillView, input.piece, target.row, target.col),
  );

  const from = { row: input.piece.row, col: input.piece.col };
  const pieceCode =
    toBasePieceCode(input.piece.pieceCode) ??
    toBasePieceCode(CHAR_TO_CODE[input.piece.char]) ??
    'FU';

  return hazardFilteredTargets.flatMap((target) => {
    const captured = findPieceAtFast(input.occupancy, target.row, target.col);
    const capturedPieceCode = toBasePieceCode(captured?.pieceCode ?? null);
    const transformedByA = isATransformedPawn(input.skillView, input.piece);
    const promote = transformedByA ? false : canPromoteByMove(input.piece, from, target, 9);
    const mustPromote = transformedByA ? false : mustPromoteByMove(input.piece, target, 9);
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
  const occupancy = buildOccupancyMap(pieces);
  const lookups = buildPieceLookups(input.pieceCatalog);
  const skillView = createSkillRuntimeView(position);
  const activePieces = pieces.filter((piece) => piece.side === position.sideToMove);

  const boardMoves = activePieces
    .filter(
      (piece) =>
        isKingPiece(piece) ||
        !skillView.immobilizedCells.has(`${piece.side}:${piece.row}:${piece.col}`),
    )
    .flatMap((piece) =>
      generateBoardPieceMoves({ pieces, piece, position, lookups, occupancy, skillView }),
    );
  const timeSkillOnlyMoves = activePieces
    .filter((piece) => {
      const code = toBasePieceCode(piece.pieceCode);
      return code === 'TIME' || piece.char === '時';
    })
    .filter((piece) => hasAdjacentEnemyPiece(occupancy, piece))
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
