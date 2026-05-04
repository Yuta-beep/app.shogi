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
import { effectivePieceForRulesAfterSpring } from '@/ai/engine/spring-ryu-awakening';
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

function isMachinePiece(piece: AiBoardPiece): boolean {
  const code = toBasePieceCode(piece.pieceCode);
  return code === 'MACHINE' || piece.char === '機';
}

/** 機: 同一行の左隣の味方を優先し、いなければ右隣の味方の移動ベクトルを借用する */
function pickMachineDonorAlly(pieces: AiBoardPiece[], machine: AiBoardPiece): AiBoardPiece | null {
  const row = machine.row;
  const col = machine.col;
  const left = pieces.find((p) => p.side === machine.side && p.row === row && p.col === col - 1);
  const right = pieces.find((p) => p.side === machine.side && p.row === row && p.col === col + 1);
  if (left) return left;
  if (right) return right;
  return null;
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

function isBlockedByRockObstacle(skillView: SkillRuntimeView, row: number, col: number): boolean {
  return skillView.rockObstacleCells.has(`${row}:${col}`);
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

function buildRockObstacleVirtualPieces(
  side: 'player' | 'enemy',
  skillView: SkillRuntimeView,
): AiBoardPiece[] {
  const out: AiBoardPiece[] = [];
  for (const key of skillView.rockObstacleCells) {
    const [rowRaw, colRaw] = key.split(':');
    const row = Number(rowRaw);
    const col = Number(colRaw);
    if (!Number.isInteger(row) || !Number.isInteger(col)) continue;
    out.push({
      side,
      row,
      col,
      pieceCode: 'ROCK_OBSTACLE',
      char: '岩障',
      promoted: false,
      imageSignedUrl: null,
    });
  }
  return out;
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

/** 家・畑: 固定駒（移動不可） */
function normalizeVectorsForFixedHouseField(
  piece: AiBoardPiece,
  vectors: AiPieceDefinition['moveVectors'],
): AiPieceDefinition['moveVectors'] {
  const baseCode = toBasePieceCode(piece.pieceCode);
  if (baseCode === 'HOUSE' || baseCode === 'FIELD' || piece.char === '家' || piece.char === '畑') {
    return [];
  }
  return vectors;
}

function isFieldPieceForPeopleBuff(piece: AiBoardPiece): boolean {
  const code = toBasePieceCode(piece.pieceCode);
  if (code === 'FIELD') return true;
  if (piece.char === '畑') return true;
  return CHAR_TO_CODE[piece.char] === 'FIELD';
}

function isPeoplePieceForFieldBuff(piece: AiBoardPiece): boolean {
  const code = toBasePieceCode(piece.pieceCode);
  if (code === 'PEOPLE') return true;
  if (piece.char === '民') return true;
  return CHAR_TO_CODE[piece.char] === 'PEOPLE';
}

/** 畑が味方にいるとき、民は斜め4方向にも1マス進める（ベクトル定義座標。先手後手は getLegalTargetsFromVectors の orient で反映） */
function hasPeopleFieldBuffOnBoard(piece: AiBoardPiece, allPieces: AiBoardPiece[]): boolean {
  if (!isPeoplePieceForFieldBuff(piece)) return false;
  return allPieces.some((p) => p.side === piece.side && isFieldPieceForPeopleBuff(p));
}

function normalizeVectorsForPeopleWithAllyField(
  piece: AiBoardPiece,
  vectors: AiPieceDefinition['moveVectors'],
  allPieces: AiBoardPiece[],
): AiPieceDefinition['moveVectors'] {
  if (!isPeoplePieceForFieldBuff(piece)) return vectors;
  const hasAllyField = hasPeopleFieldBuffOnBoard(piece, allPieces);
  if (!hasAllyField) return vectors;
  const diagonals: AiPieceDefinition['moveVectors'] = [
    { dx: -1, dy: -1, maxStep: 1 },
    { dx: 1, dy: -1, maxStep: 1 },
    { dx: -1, dy: 1, maxStep: 1 },
    { dx: 1, dy: 1, maxStep: 1 },
  ];
  return [...vectors, ...diagonals];
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

/** 月: TURN（turnNumber）を 4 で割った余りが 0 または 1 のとき全方位 1 マス、2 または 3 のとき全方位 2 マス */
function moonOmnidirectionalMaxStep(position: AiBattlePosition): number {
  const t = Math.max(1, Math.floor(position.turnNumber));
  const r = ((t % 4) + 4) % 4;
  return r === 2 || r === 3 ? 2 : 1;
}

function normalizeVectorsForMoon(
  piece: AiBoardPiece,
  vectors: AiPieceDefinition['moveVectors'],
  position: AiBattlePosition,
): AiPieceDefinition['moveVectors'] {
  const baseCode = toBasePieceCode(piece.pieceCode);
  if (baseCode !== 'MOON' && piece.char !== '月') return vectors;
  const maxStep = moonOmnidirectionalMaxStep(position);
  return [
    { dx: -1, dy: -1, maxStep },
    { dx: 0, dy: -1, maxStep },
    { dx: 1, dy: -1, maxStep },
    { dx: -1, dy: 0, maxStep },
    { dx: 1, dy: 0, maxStep },
    { dx: -1, dy: 1, maxStep },
    { dx: 0, dy: 1, maxStep },
    { dx: 1, dy: 1, maxStep },
  ];
}

function backRowDeltaForBoatTowLegal(side: Side): number {
  return side === 'player' ? 1 : -1;
}

function isKingLikeForBoatTowLegal(piece: AiBoardPiece | null | undefined): boolean {
  if (!piece) return false;
  const base = toBasePieceCode(piece.pieceCode);
  return base === 'OU' || piece.char === '王' || piece.char === '玉';
}

/** 舟: 真後ろの味方を連れて行けるときのみ合法（玉は連れ不可、連れ先は空または舟の出発マス） */
function boatTowTargetCellAllowed(
  piece: AiBoardPiece,
  from: { row: number; col: number },
  to: { row: number; col: number },
  occupancy: OccupancyMap,
): boolean {
  const code = toBasePieceCode(piece.pieceCode);
  if (code !== 'BOAT' && piece.char !== '舟') return true;
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  const allyRow = from.row + backRowDeltaForBoatTowLegal(piece.side);
  const allyCol = from.col;
  const ally = findPieceAtFast(occupancy, allyRow, allyCol);
  if (!ally || ally.side !== piece.side) return true;
  if (isKingLikeForBoatTowLegal(ally)) return false;
  const destRow = allyRow + dr;
  const destCol = allyCol + dc;
  if (destRow < 0 || destRow > 8 || destCol < 0 || destCol > 8) return false;
  const occ = findPieceAtFast(occupancy, destRow, destCol);
  if (!occ) return true;
  return occ.row === from.row && occ.col === from.col;
}

function resolveEffectiveVectorsForPiece(
  piece: AiBoardPiece,
  pieceDef: AiPieceDefinition,
  position: AiBattlePosition,
  allPieces: AiBoardPiece[],
): AiPieceDefinition['moveVectors'] {
  const bishopNormalized = normalizeVectorsForBishop(piece, pieceDef.moveVectors);
  const goldNormalized = normalizeVectorsForGold(piece, bishopNormalized);
  const fixedHouseField = normalizeVectorsForFixedHouseField(piece, goldNormalized);
  const timeNormalized = normalizeVectorsForTime(piece, fixedHouseField);
  const peopleField = normalizeVectorsForPeopleWithAllyField(piece, timeNormalized, allPieces);
  return normalizeVectorsForMoon(piece, peopleField, position);
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

function isHousePieceForSkill(piece: AiBoardPiece): boolean {
  const code = toBasePieceCode(piece.pieceCode);
  if (code === 'HOUSE') return true;
  if (piece.char === '家') return true;
  return CHAR_TO_CODE[piece.char] === 'HOUSE';
}

function countPeoplePiecesOnBoard(pieces: AiBoardPiece[]): number {
  return pieces.filter((p) => {
    const c = toBasePieceCode(p.pieceCode);
    if (c === 'PEOPLE') return true;
    if (p.char === '民') return true;
    return CHAR_TO_CODE[p.char] === 'PEOPLE';
  }).length;
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
  const pieceForDef = effectivePieceForRulesAfterSpring(input.piece, input.pieces, input.lookups);
  let pieceDef = resolvePieceDef(pieceForDef, input.lookups);
  if (isMachinePiece(input.piece)) {
    const donor = pickMachineDonorAlly(input.pieces, input.piece);
    if (donor) {
      const donorDef = resolvePieceDef(donor, input.lookups);
      if (donorDef && donorDef.moveVectors.length > 0) {
        pieceDef = donorDef;
      }
    }
  }
  if (!pieceDef || pieceDef.moveVectors.length === 0) return [];
  let effectiveVectors = resolveEffectiveVectorsForPiece(
    input.piece,
    pieceDef,
    input.position,
    input.pieces,
  );
  let effectiveCanJump = pieceDef.canJump === true;

  if (isMirrorPiece(input.piece)) {
    const enemyCandidates = input.pieces.filter(
      (piece) => piece.side !== input.piece.side && !isMirrorPiece(piece),
    );
    const selected = selectMirrorTarget(input.position, input.piece, enemyCandidates);
    if (selected) {
      const selectedDef = resolvePieceDef(selected, input.lookups);
      if (selectedDef && selectedDef.moveVectors.length > 0) {
        effectiveVectors = resolveEffectiveVectorsForPiece(
          selected,
          selectedDef,
          input.position,
          input.pieces,
        );
        effectiveCanJump = selectedDef.canJump === true;
      }
    }
  }

  const leapVectors = effectiveVectors.filter((v) => isLeapOverOneMode(v.captureMode));
  const normalVectors = effectiveVectors.filter((v) => !isLeapOverOneMode(v.captureMode));
  const rockVirtualPieces = buildRockObstacleVirtualPieces(input.piece.side, input.skillView);
  const pathPieces = [...input.pieces, ...rockVirtualPieces];
  const pathOccupancy = buildOccupancyMap(pathPieces);
  const normalTargets = isCloudPiece(input.piece)
    ? generateCloudTargetsFromVectors(pathOccupancy, input.piece, normalVectors)
    : getLegalTargetsFromVectors(pathPieces, input.piece, normalVectors, 9, {
        canJump: effectiveCanJump,
      });
  const leapTargets = generateLeapOverOneTargets(pathOccupancy, input.piece, leapVectors);
  const reflectiveTargets = isReflectivePiece(input.piece)
    ? generateReflectiveTargets(pathOccupancy, input.piece)
    : [];
  const targets = [...normalTargets, ...leapTargets, ...reflectiveTargets];
  const movementRule =
    input.skillView.movementRulesByCell.get(
      `${input.piece.side}:${input.piece.row}:${input.piece.col}`,
    ) ?? null;
  const peopleFieldBuff = hasPeopleFieldBuffOnBoard(input.piece, input.pieces);
  const filteredTargets =
    movementRule === 'vertical_step_only'
      ? targets.filter(
          (target) =>
            target.col === input.piece.col && Math.abs(target.row - input.piece.row) === 1,
        )
      : movementRule === 'orthogonal_step_only'
        ? targets.filter((target) => {
            const adr = Math.abs(target.row - input.piece.row);
            const adc = Math.abs(target.col - input.piece.col);
            if (adr + adc === 1) return true;
            // 畑バフの斜め1マスは orthogonal 制限から除外（合法手・ハイライトと一致させる）
            if (peopleFieldBuff && adr === 1 && adc === 1) return true;
            return false;
          })
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
    (target) =>
      !isKingBlockedByPoisonCell(input.skillView, input.piece, target.row, target.col) &&
      !isBlockedByRockObstacle(input.skillView, target.row, target.col),
  );

  const from = { row: input.piece.row, col: input.piece.col };
  const boatFilteredTargets = hazardFilteredTargets.filter((target) =>
    boatTowTargetCellAllowed(input.piece, from, target, input.occupancy),
  );
  const pieceCode =
    toBasePieceCode(input.piece.pieceCode) ??
    toBasePieceCode(CHAR_TO_CODE[input.piece.char]) ??
    'FU';

  return boatFilteredTargets.flatMap((target) => {
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
  skillView: SkillRuntimeView;
}): AiBattleMove[] {
  const bag = input.position.hands[input.position.sideToMove] ?? {};
  const moves: AiBattleMove[] = [];

  for (const [pieceCodeRaw, count] of Object.entries(bag)) {
    const pieceCode = toBasePieceCode(pieceCodeRaw);
    if (!pieceCode || typeof count !== 'number' || count <= 0) continue;

    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (input.skillView.rockObstacleCells.has(`${row}:${col}`)) {
          continue;
        }
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
  const peopleCount = countPeoplePiecesOnBoard(pieces);
  const houseSkillOnlyMoves =
    peopleCount < 5
      ? activePieces
          .filter((piece) => isHousePieceForSkill(piece))
          .map((piece) =>
            createMove({
              from: { row: piece.row, col: piece.col },
              to: { row: piece.row, col: piece.col },
              pieceCode: toBasePieceCode(piece.pieceCode) ?? 'HOUSE',
              promote: false,
              notation: 'house_skill_only',
            }),
          )
      : [];
  const dropMoves = generateDropMoves({ pieces, position, skillView });

  return {
    sideToMove: position.sideToMove,
    moveNo: position.moveCount + 1,
    stateHash: position.stateHash,
    legalMoves: [...boardMoves, ...timeSkillOnlyMoves, ...houseSkillOnlyMoves, ...dropMoves],
  };
}
