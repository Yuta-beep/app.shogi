import type { Side } from '@/features/stage-shogi/domain/game-rules';
import type { AiBattleMove, AiBattlePosition, AiBoardPiece } from '@/ai/model';
import { piecesFromBoardState, toBasePieceCode } from '@/ai/model';

type SkillStateRecord = {
  board_hazards: Array<Record<string, unknown>>;
  movement_modifiers: Array<Record<string, unknown>>;
  piece_statuses: Array<Record<string, unknown>>;
  piece_defenses: Array<Record<string, unknown>>;
};

const FLAME_PIECE_CODES = new Set(['ENN', 'FLAME', '炎']);
const FIRE_PIECE_CODES = new Set(['FIRE', 'FIR', '火']);
const WATER_PIECE_CODES = new Set(['WATER', 'SUI', '水']);
const TREASURE_PIECE_CODES = new Set(['TREASURE', '宝']);
const IRON_PIECE_CODES = new Set(['IRON', '鉄']);
const WAVE_PIECE_CODES = new Set(['WAVE', 'NAM', '波']);
const TIN_PIECE_CODES = new Set(['TIN', '錫']);
const ELECTRIC_PIECE_CODES = new Set(['ELECTRIC', '電']);
const THUNDER_PIECE_CODES = new Set(['THUNDER', '雷']);
const WOOD_PIECE_CODES = new Set(['WOOD', 'MOK', '木']);
const LEAF_PIECE_CODES = new Set(['LEAF', 'HAA', '葉']);
const DEMON_PIECE_CODES = new Set(['DEMON', 'MAK', '魔']);
const DARK_PIECE_CODES = new Set(['DARK', 'YAM', '闇']);
const TREASURE_REWARD_CODES = ['KI', 'GI', 'COPPER'] as const;

function normalizeSkillPieceCode(raw: string | null | undefined): string {
  if (!raw) return '';
  const upper = raw.trim().toUpperCase();
  if (!upper) return '';
  if (upper.startsWith('PIECE_SHOGI_')) return upper.slice('PIECE_SHOGI_'.length);
  if (upper.startsWith('PIECE_')) return upper.slice('PIECE_'.length);
  return upper;
}

function removeRandomAdjacentEnemyPiece(input: {
  pieces: AiBoardPiece[];
  center: AiBoardPiece;
  actorSide: Side;
}): boolean {
  const candidates = input.pieces
    .map((piece, idx) => ({ piece, idx }))
    .filter(({ piece }) => {
      if (piece.side === input.actorSide) return false;
      if (piece.char === '王' || piece.char === '玉' || toBasePieceCode(piece.pieceCode) === 'OU') {
        return false;
      }
      return (
        Math.abs(piece.row - input.center.row) <= 1 &&
        Math.abs(piece.col - input.center.col) <= 1 &&
        !(piece.row === input.center.row && piece.col === input.center.col)
      );
    });
  if (candidates.length === 0) return false;
  const selected = candidates[Math.floor(Math.random() * candidates.length)]!;
  input.pieces.splice(selected.idx, 1);
  return true;
}

function removeUpToRandomAdjacentEnemyPieces(input: {
  pieces: AiBoardPiece[];
  center: AiBoardPiece;
  actorSide: Side;
  maxRemove: number;
}): number {
  const candidates = input.pieces
    .map((piece, idx) => ({ piece, idx }))
    .filter(({ piece }) => {
      if (piece.side === input.actorSide) return false;
      if (piece.char === '王' || piece.char === '玉' || toBasePieceCode(piece.pieceCode) === 'OU') {
        return false;
      }
      return (
        Math.abs(piece.row - input.center.row) <= 1 &&
        Math.abs(piece.col - input.center.col) <= 1 &&
        !(piece.row === input.center.row && piece.col === input.center.col)
      );
    });
  if (candidates.length === 0 || input.maxRemove <= 0) return 0;
  let removed = 0;
  let pool = [...candidates];
  while (pool.length > 0 && removed < input.maxRemove) {
    const selected = pool[Math.floor(Math.random() * pool.length)]!;
    input.pieces.splice(selected.idx, 1);
    removed += 1;
    pool = pool
      .filter((entry) => entry.idx !== selected.idx)
      .map((entry) => ({
        ...entry,
        idx: entry.idx > selected.idx ? entry.idx - 1 : entry.idx,
      }));
  }
  return removed;
}

function pushAdjacentEnemyPiecesOneStep(input: {
  pieces: AiBoardPiece[];
  center: AiBoardPiece;
  actorSide: Side;
}): number {
  const occupied = new Set(input.pieces.map((piece) => `${piece.row}:${piece.col}`));
  const planned = new Map<number, { row: number; col: number }>();
  const plannedDest = new Set<string>();
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const row = input.center.row + dr;
      const col = input.center.col + dc;
      if (row < 0 || row > 8 || col < 0 || col > 8) continue;
      const idx = input.pieces.findIndex((piece) => piece.row === row && piece.col === col);
      if (idx < 0) continue;
      const target = input.pieces[idx]!;
      if (target.side === input.actorSide) continue;
      const stepR = Math.sign(target.row - input.center.row);
      const stepC = Math.sign(target.col - input.center.col);
      if (stepR === 0 && stepC === 0) continue;
      const nextRow = target.row + stepR;
      const nextCol = target.col + stepC;
      if (nextRow < 0 || nextRow > 8 || nextCol < 0 || nextCol > 8) continue;
      const destKey = `${nextRow}:${nextCol}`;
      if (occupied.has(destKey) || plannedDest.has(destKey)) continue;
      planned.set(idx, { row: nextRow, col: nextCol });
      plannedDest.add(destKey);
    }
  }
  for (const [idx, destination] of planned.entries()) {
    input.pieces[idx] = {
      ...input.pieces[idx]!,
      row: destination.row,
      col: destination.col,
    };
  }
  return planned.size;
}

function summonRandomAdjacentEmptyPiece(input: {
  pieces: AiBoardPiece[];
  center: AiBoardPiece;
  actorSide: Side;
  summonCode: string;
  summonChar: string;
}): { summoned: boolean; row: number | null; col: number | null } {
  const candidates: Array<{ row: number; col: number }> = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const row = input.center.row + dr;
      const col = input.center.col + dc;
      if (row < 0 || row > 8 || col < 0 || col > 8) continue;
      if (input.pieces.some((piece) => piece.row === row && piece.col === col)) continue;
      candidates.push({ row, col });
    }
  }
  if (candidates.length === 0) {
    return { summoned: false, row: null, col: null };
  }
  const selected = candidates[Math.floor(Math.random() * candidates.length)]!;
  input.pieces.push({
    side: input.actorSide,
    row: selected.row,
    col: selected.col,
    pieceCode: input.summonCode,
    char: input.summonChar,
    promoted: false,
    imageSignedUrl: null,
  });
  return { summoned: true, row: selected.row, col: selected.col };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sideOpposite(side: Side): Side {
  return side === 'player' ? 'enemy' : 'player';
}

function hasAdjacentPiece(input: {
  pieces: AiBoardPiece[];
  row: number;
  col: number;
  side: Side;
  match: 'ally' | 'enemy';
}): boolean {
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const row = input.row + dr;
      const col = input.col + dc;
      if (row < 0 || row > 8 || col < 0 || col > 8) continue;
      const piece = input.pieces.find((p) => p.row === row && p.col === col);
      if (!piece) continue;
      if (input.match === 'ally' && piece.side === input.side) return true;
      if (input.match === 'enemy' && piece.side !== input.side) return true;
    }
  }
  return false;
}

function hasSameRowAlly(input: {
  pieces: AiBoardPiece[];
  row: number;
  col: number;
  side: Side;
}): boolean {
  return input.pieces.some((p) => p.side === input.side && p.row === input.row && p.col !== input.col);
}

function findKingIndex(pieces: AiBoardPiece[], side: Side): number {
  return pieces.findIndex(
    (p) => p.side === side && (toBasePieceCode(p.pieceCode) === 'OU' || p.char === '王' || p.char === '玉'),
  );
}

function isCellEmpty(pieces: AiBoardPiece[], row: number, col: number): boolean {
  return !pieces.some((p) => p.row === row && p.col === col);
}

function incrementHand(
  position: AiBattlePosition,
  side: Side,
  pieceCode: string,
  delta: number,
) {
  const bag = { ...(position.hands[side] ?? {}) };
  const key = pieceCode.toUpperCase();
  const current = typeof bag[key] === 'number' ? Math.max(0, Math.floor(bag[key] as number)) : 0;
  const next = Math.max(0, current + delta);
  if (next <= 0) delete bag[key];
  else bag[key] = next;
  position.hands = {
    ...position.hands,
    [side]: bag,
  };
}

function decrementFirstHandPiece(position: AiBattlePosition, side: Side): boolean {
  const bag = { ...(position.hands[side] ?? {}) };
  const keys = Object.keys(bag).sort();
  for (const key of keys) {
    const current = typeof bag[key] === 'number' ? Math.max(0, Math.floor(bag[key] as number)) : 0;
    if (current <= 0) continue;
    const next = current - 1;
    if (next <= 0) delete bag[key];
    else bag[key] = next;
    position.hands = {
      ...position.hands,
      [side]: bag,
    };
    return true;
  }
  return false;
}

function removeRandomHandPiece(position: AiBattlePosition, side: Side): string | null {
  const bag = { ...(position.hands[side] ?? {}) };
  const keys = Object.keys(bag).filter((key) => {
    const qty = bag[key];
    return typeof qty === 'number' && Number.isFinite(qty) && qty > 0;
  });
  if (keys.length === 0) return null;
  const selectedKey = keys[Math.floor(Math.random() * keys.length)]!;
  const current = Math.max(0, Math.floor((bag[selectedKey] as number) ?? 0));
  const next = current - 1;
  if (next <= 0) delete bag[selectedKey];
  else bag[selectedKey] = next;
  position.hands = {
    ...position.hands,
    [side]: bag,
  };
  return selectedKey;
}

function readSkillState(position: AiBattlePosition): SkillStateRecord {
  const boardState = asRecord(position.boardState) ?? {};
  const skillState = asRecord(boardState.skill_state ?? boardState.skillState) ?? {};
  return {
    board_hazards: asArray(skillState.board_hazards ?? skillState.boardHazards).filter(
      (v): v is Record<string, unknown> => asRecord(v) != null,
    ) as Array<Record<string, unknown>>,
    movement_modifiers: asArray(skillState.movement_modifiers ?? skillState.movementModifiers).filter(
      (v): v is Record<string, unknown> => asRecord(v) != null,
    ) as Array<Record<string, unknown>>,
    piece_statuses: asArray(skillState.piece_statuses ?? skillState.pieceStatuses).filter(
      (v): v is Record<string, unknown> => asRecord(v) != null,
    ) as Array<Record<string, unknown>>,
    piece_defenses: asArray(skillState.piece_defenses ?? skillState.pieceDefenses).filter(
      (v): v is Record<string, unknown> => asRecord(v) != null,
    ) as Array<Record<string, unknown>>,
  };
}

function writeSkillState(position: AiBattlePosition, state: SkillStateRecord) {
  const boardState = asRecord(position.boardState) ?? {};
  position.boardState = {
    ...boardState,
    skill_state: {
      ...(asRecord(boardState.skill_state ?? boardState.skillState) ?? {}),
      board_hazards: state.board_hazards,
      movement_modifiers: state.movement_modifiers,
      piece_statuses: state.piece_statuses,
      piece_defenses: state.piece_defenses,
    },
  };
}

export function tickSkillStateDurations(position: AiBattlePosition) {
  const state = readSkillState(position);
  function tick(list: Array<Record<string, unknown>>) {
    const out: Array<Record<string, unknown>> = [];
    for (const entry of list) {
      const remaining = asNumber(entry.remaining_turns ?? entry.remainingTurns) ?? 0;
      if (remaining <= 0) continue;
      const next = remaining - 1;
      if (next <= 0) continue;
      out.push({ ...entry, remaining_turns: next });
    }
    return out;
  }
  state.board_hazards = tick(state.board_hazards);
  state.movement_modifiers = tick(state.movement_modifiers);
  state.piece_statuses = tick(state.piece_statuses);
  state.piece_defenses = tick(state.piece_defenses);
  writeSkillState(position, state);
}

export function movementRuleAt(
  position: AiBattlePosition,
  side: Side,
  row: number,
  col: number,
): string | null {
  const currentPiece = piecesFromBoardState(position).find(
    (piece) => piece.side === side && piece.row === row && piece.col === col,
  );
  if (
    currentPiece &&
    (toBasePieceCode(currentPiece.pieceCode) === 'OU' ||
      currentPiece.char === '王' ||
      currentPiece.char === '玉')
  ) {
    return null;
  }
  const state = readSkillState(position);
  for (const entry of state.movement_modifiers) {
    const eSide = (asString(entry.side) ?? 'player') === 'enemy' ? 'enemy' : 'player';
    const eRow = asNumber(entry.row);
    const eCol = asNumber(entry.col);
    const remaining = asNumber(entry.remaining_turns ?? entry.remainingTurns) ?? 0;
    const rule = asString(entry.movement_rule ?? entry.movementRule);
    if (remaining <= 0 || !rule) continue;
    if (eSide === side && eRow === row && eCol === col) return rule;
  }
  return null;
}

export function isPieceImmobilized(
  position: AiBattlePosition,
  side: Side,
  row: number,
  col: number,
): boolean {
  const currentPiece = piecesFromBoardState(position).find(
    (piece) => piece.side === side && piece.row === row && piece.col === col,
  );
  if (
    currentPiece &&
    (toBasePieceCode(currentPiece.pieceCode) === 'OU' ||
      currentPiece.char === '王' ||
      currentPiece.char === '玉')
  ) {
    return false;
  }
  const state = readSkillState(position);
  return state.piece_statuses.some((entry) => {
    const eSide = (asString(entry.side) ?? 'player') === 'enemy' ? 'enemy' : 'player';
    const eRow = asNumber(entry.row);
    const eCol = asNumber(entry.col);
    const remaining = asNumber(entry.remaining_turns ?? entry.remainingTurns) ?? 0;
    const statusType = asString(entry.status_type ?? entry.statusType) ?? '';
    if (remaining <= 0) return false;
    if (statusType !== 'stun' && statusType !== 'time_stop' && statusType !== 'dark_blind') return false;
    return eSide === side && eRow === row && eCol === col;
  });
}

export function isCaptureBlockedByDarkBlind(
  position: AiBattlePosition,
  side: Side,
  row: number,
  col: number,
): boolean {
  const state = readSkillState(position);
  return state.piece_statuses.some((entry) => {
    const eSide = (asString(entry.side) ?? 'player') === 'enemy' ? 'enemy' : 'player';
    const eRow = asNumber(entry.row);
    const eCol = asNumber(entry.col);
    const remaining = asNumber(entry.remaining_turns ?? entry.remainingTurns) ?? 0;
    const statusType = asString(entry.status_type ?? entry.statusType) ?? '';
    if (remaining <= 0) return false;
    if (statusType !== 'dark_blind') return false;
    return eSide === side && eRow === row && eCol === col;
  });
}

export function applyBoardHazardsOnLanding(input: {
  position: AiBattlePosition;
  actorSide: Side;
  movedTo: { row: number; col: number };
  pieces: AiBoardPiece[];
}) {
  const state = readSkillState(input.position);
  const lethal = state.board_hazards.some((entry) => {
    const type = asString(entry.hazard_type ?? entry.hazardType);
    const row = asNumber(entry.row);
    const col = asNumber(entry.col);
    const remaining = asNumber(entry.remaining_turns ?? entry.remainingTurns) ?? 0;
    const affectsSide = (asString(entry.affects_side ?? entry.affectsSide) ?? 'player') === 'enemy'
      ? 'enemy'
      : 'player';
    return (
      remaining > 0 &&
      affectsSide === input.actorSide &&
      row === input.movedTo.row &&
      col === input.movedTo.col &&
      type === 'poison_cell'
    );
  });
  if (!lethal) return;
  const idx = input.pieces.findIndex(
    (p) => p.side === input.actorSide && p.row === input.movedTo.row && p.col === input.movedTo.col,
  );
  if (idx >= 0) {
    input.pieces.splice(idx, 1);
  }
}

export function applyMoveSkillEffects(input: {
  position: AiBattlePosition;
  move: AiBattleMove;
  actorSide: Side;
  movedPiece: AiBoardPiece | null;
  pieces: AiBoardPiece[];
  didCapture: boolean;
}) {
  const movedCodeRaw = toBasePieceCode(input.move.pieceCode);
  const movedCode = normalizeSkillPieceCode(movedCodeRaw);
  if (!movedCode) return;
  const boardState = asRecord(input.position.boardState) ?? {};
  const defsRoot = asRecord(boardState.skill_definitions_v2 ?? boardState.skillDefinitionsV2);
  const defs = asArray(defsRoot?.definitions);
  const state = readSkillState(input.position);
  const isFlameMover =
    FLAME_PIECE_CODES.has(movedCode) || normalizeSkillPieceCode(input.move.pieceCode) === '炎';
  const isFireMover =
    FIRE_PIECE_CODES.has(movedCode) || normalizeSkillPieceCode(input.move.pieceCode) === '火';
  const isWaterMover =
    WATER_PIECE_CODES.has(movedCode) ||
    normalizeSkillPieceCode(input.move.pieceCode) === '水';
  const isTreasureMover =
    TREASURE_PIECE_CODES.has(movedCode) || normalizeSkillPieceCode(input.move.pieceCode) === '宝';
  const isIronMover =
    IRON_PIECE_CODES.has(movedCode) || normalizeSkillPieceCode(input.move.pieceCode) === '鉄';
  const isWaveMover =
    WAVE_PIECE_CODES.has(movedCode) || normalizeSkillPieceCode(input.move.pieceCode) === '波';
  const isTinMover =
    TIN_PIECE_CODES.has(movedCode) || normalizeSkillPieceCode(input.move.pieceCode) === '錫';
  const isElectricMover =
    ELECTRIC_PIECE_CODES.has(movedCode) || normalizeSkillPieceCode(input.move.pieceCode) === '電';
  const isThunderMover =
    THUNDER_PIECE_CODES.has(movedCode) || normalizeSkillPieceCode(input.move.pieceCode) === '雷';
  const isWoodMover =
    WOOD_PIECE_CODES.has(movedCode) || normalizeSkillPieceCode(input.move.pieceCode) === '木';
  const isLeafMover =
    LEAF_PIECE_CODES.has(movedCode) || normalizeSkillPieceCode(input.move.pieceCode) === '葉';
  const isDemonMover =
    DEMON_PIECE_CODES.has(movedCode) || normalizeSkillPieceCode(input.move.pieceCode) === '魔';
  const isDarkMover =
    DARK_PIECE_CODES.has(movedCode) || normalizeSkillPieceCode(input.move.pieceCode) === '闇';

  // ai.shogi の explicit override 相当: 定義読み込み失敗時でも炎スキルは発動可能にする。
  if (isFlameMover && input.move.fromRow != null && input.move.fromCol != null && input.movedPiece) {
    const procChance = 0.2;
    const roll = Math.random();
    const triggered = roll <= procChance;
    if (triggered) {
      removeRandomAdjacentEnemyPiece({
        pieces: input.pieces,
        center: input.movedPiece,
        actorSide: input.actorSide,
      });
    }
  }
  // 火: 移動時20%で敵の手持ち駒を1つ消滅。
  if (isFireMover && input.move.fromRow != null && input.move.fromCol != null) {
    const procChance = 0.2;
    const roll = Math.random();
    const triggered = roll <= procChance;
    if (triggered) {
      decrementFirstHandPiece(input.position, sideOpposite(input.actorSide));
    }
  }
  // 宝: 移動時20%で手持ちに金・銀・銅のいずれか1つを加える。
  if (isTreasureMover && input.move.fromRow != null && input.move.fromCol != null) {
    const procChance = 0.2;
    const roll = Math.random();
    const triggered = roll <= procChance;
    let grantedCode: string | null = null;
    if (triggered) {
      const idx = Math.floor(Math.random() * TREASURE_REWARD_CODES.length);
      grantedCode = TREASURE_REWARD_CODES[idx] ?? null;
      if (grantedCode) {
        incrementHand(input.position, input.actorSide, grantedCode, 1);
      }
    }
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.info('[treasure-skill-debug]', {
        moveCount: input.position.moveCount,
        turnNumber: input.position.turnNumber,
        pieceCode: movedCode,
        procChance,
        roll,
        triggered,
        grantedCode,
      });
    }
  }
  // 水: 移動時に周囲8マスの敵駒を1マス押し流す。
  if (isWaterMover && input.move.fromRow != null && input.move.fromCol != null && input.movedPiece) {
    pushAdjacentEnemyPiecesOneStep({
      pieces: input.pieces,
      center: input.movedPiece,
      actorSide: input.actorSide,
    });
  }
  // 鉄: 水と同様、移動時に周囲8マスの敵駒を1マス押し流す。
  if (isIronMover && input.move.fromRow != null && input.move.fromCol != null && input.movedPiece) {
    pushAdjacentEnemyPiecesOneStep({
      pieces: input.pieces,
      center: input.movedPiece,
      actorSide: input.actorSide,
    });
  }
  // 波: 移動時に周囲8マスの敵駒を1マス押し流す。
  if (isWaveMover && input.move.fromRow != null && input.move.fromCol != null && input.movedPiece) {
    pushAdjacentEnemyPiecesOneStep({
      pieces: input.pieces,
      center: input.movedPiece,
      actorSide: input.actorSide,
    });
  }
  // 錫: 移動時10%で周囲8マスの敵駒（玉除く）を2ターン行動不能（stun）。
  if (isTinMover && input.move.fromRow != null && input.move.fromCol != null && input.movedPiece) {
    const procChance = 0.1;
    const roll = Math.random();
    const triggered = roll <= procChance;
    if (triggered) {
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr === 0 && dc === 0) continue;
          const row = input.movedPiece.row + dr;
          const col = input.movedPiece.col + dc;
          if (row < 0 || row > 8 || col < 0 || col > 8) continue;
          const targetPiece = input.pieces.find((piece) => piece.row === row && piece.col === col);
          if (!targetPiece || targetPiece.side === input.actorSide) continue;
          if (
            targetPiece.char === '王' ||
            targetPiece.char === '玉' ||
            toBasePieceCode(targetPiece.pieceCode) === 'OU'
          ) {
            continue;
          }
          state.piece_statuses.push({
            row,
            col,
            side: targetPiece.side,
            status_type: 'stun',
            remaining_turns: 2,
          });
        }
      }
    }
  }
  // 電: 移動時20%で周囲8マスの敵駒1体（玉除く）を3ターン行動不能（stun）。
  if (
    isElectricMover &&
    input.move.fromRow != null &&
    input.move.fromCol != null &&
    input.movedPiece
  ) {
    const procChance = 0.2;
    const roll = Math.random();
    const triggered = roll <= procChance;
    let selectedTarget: { row: number; col: number; side: Side } | null = null;
    if (triggered) {
      const candidates = input.pieces.filter((piece) => {
        if (piece.side === input.actorSide) return false;
        if (Math.abs(piece.row - input.movedPiece.row) > 1 || Math.abs(piece.col - input.movedPiece.col) > 1) {
          return false;
        }
        if (piece.row === input.movedPiece.row && piece.col === input.movedPiece.col) return false;
        const base = toBasePieceCode(piece.pieceCode);
        if (base === 'OU' || piece.char === '王' || piece.char === '玉') return false;
        return true;
      });
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)]!;
        selectedTarget = { row: target.row, col: target.col, side: target.side };
        state.piece_statuses.push({
          row: target.row,
          col: target.col,
          side: target.side,
          status_type: 'stun',
          remaining_turns: 3,
        });
      }
    }
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.info('[electric-skill-debug]', {
        moveCount: input.position.moveCount,
        turnNumber: input.position.turnNumber,
        pieceCode: movedCode,
        procChance,
        roll,
        triggered,
        selectedTarget,
        stunTurns: selectedTarget ? 3 : 0,
      });
    }
  }
  // 雷: 移動時10%で相手手持ち駒を最大2つランダム消滅。
  if (isThunderMover && input.move.fromRow != null && input.move.fromCol != null) {
    const procChance = 0.1;
    const roll = Math.random();
    const triggered = roll <= procChance;
    const removedHandCodes: string[] = [];
    if (triggered) {
      const targetSide = sideOpposite(input.actorSide);
      for (let i = 0; i < 2; i += 1) {
        const removed = removeRandomHandPiece(input.position, targetSide);
        if (!removed) break;
        removedHandCodes.push(removed);
      }
    }
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.info('[thunder-skill-debug]', {
        moveCount: input.position.moveCount,
        turnNumber: input.position.turnNumber,
        pieceCode: movedCode,
        procChance,
        roll,
        triggered,
        removedHandCount: removedHandCodes.length,
        removedHandCodes,
      });
    }
  }
  // 木: 移動時10%で周囲8マスのランダム1マスに木を召喚。
  if (isWoodMover && input.move.fromRow != null && input.move.fromCol != null && input.movedPiece) {
    const procChance = 0.1;
    const roll = Math.random();
    const triggered = roll <= procChance;
    let summoned = false;
    let summonedRow: number | null = null;
    let summonedCol: number | null = null;
    if (triggered) {
      const summonedResult = summonRandomAdjacentEmptyPiece({
        pieces: input.pieces,
        center: input.movedPiece,
        actorSide: input.actorSide,
        summonCode: 'MOK',
        summonChar: '木',
      });
      summoned = summonedResult.summoned;
      summonedRow = summonedResult.row;
      summonedCol = summonedResult.col;
    }
  }
  // 葉: 移動時10%で周囲8マスのランダム1マスに葉を召喚。
  if (isLeafMover && input.move.fromRow != null && input.move.fromCol != null && input.movedPiece) {
    const procChance = 0.1;
    const roll = Math.random();
    const triggered = roll <= procChance;
    let summoned = false;
    let summonedRow: number | null = null;
    let summonedCol: number | null = null;
    if (triggered) {
      const summonedResult = summonRandomAdjacentEmptyPiece({
        pieces: input.pieces,
        center: input.movedPiece,
        actorSide: input.actorSide,
        summonCode: 'HAA',
        summonChar: '葉',
      });
      summoned = summonedResult.summoned;
      summonedRow = summonedResult.row;
      summonedCol = summonedResult.col;
    }
  }
  // 魔: 移動時10%で周囲8マスの敵駒を最大2体消滅。
  if (isDemonMover && input.move.fromRow != null && input.move.fromCol != null && input.movedPiece) {
    if (Math.random() <= 0.1) {
      removeUpToRandomAdjacentEnemyPieces({
        pieces: input.pieces,
        center: input.movedPiece,
        actorSide: input.actorSide,
        maxRemove: 2,
      });
    }
  }
  // 闇: 周囲8マスの敵を闇で覆う（移動不能・捕獲不可）。
  if (isDarkMover && input.move.fromRow != null && input.move.fromCol != null && input.movedPiece) {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const row = input.movedPiece.row + dr;
        const col = input.movedPiece.col + dc;
        if (row < 0 || row > 8 || col < 0 || col > 8) continue;
        const targetPiece = input.pieces.find((piece) => piece.row === row && piece.col === col);
        if (!targetPiece || targetPiece.side === input.actorSide) continue;
        state.piece_statuses.push({
          row,
          col,
          side: targetPiece.side,
          status_type: 'dark_blind',
          remaining_turns: 2,
        });
      }
    }
  }
  const skipGenericAdjacentSummon = isWoodMover || isLeafMover;
  const skipGenericAdjacentRemove = isDemonMover;
  if (defs.length === 0) {
    writeSkillState(input.position, state);
    return;
  }

  const matchedDefs = defs.filter((raw) => {
    const d = asRecord(raw);
    if (!d) return false;
    const pieces = asArray(d.pieceChars);
    return pieces.some((p) => normalizeSkillPieceCode(asString(p)) === movedCode);
  });
  for (const rawDef of matchedDefs) {
    const def = asRecord(rawDef);
    if (!def) continue;
    const trigger = asRecord(def.trigger);
    const triggerType = asString(trigger?.type) ?? '';
    if (
      triggerType !== 'after_move' &&
      triggerType !== 'continuous_aura' &&
      !(triggerType === 'after_capture' && input.didCapture)
    ) {
      continue;
    }
    const conditions = asArray(def.conditions);
    let blockedByCondition = false;
    for (const rawCondition of conditions) {
      const condition = asRecord(rawCondition);
      if (!condition) continue;
      const conditionType = asString(condition.type) ?? '';
      const conditionParams = asRecord(condition.params) ?? {};
      if (conditionType === 'chance_roll') {
        const procChance = asNumber(conditionParams.procChance) ?? asNumber(conditionParams.chance);
        if (procChance != null && procChance > 0 && procChance < 1) {
          const roll = Math.random();
          const triggered = roll <= procChance;
          if (!triggered) {
            blockedByCondition = true;
            break;
          }
        }
      }
    }
    if (blockedByCondition) continue;
    const effects = asArray(def.effects);
    for (const rawEffect of effects) {
      const effect = asRecord(rawEffect);
      if (!effect) continue;
      const effectType = asString(effect.type) ?? '';
      const target = asRecord(effect.target);
      const selector = asString(target?.selector) ?? '';
      const params = asRecord(effect.params) ?? {};
      const duration = Math.max(1, Math.floor(asNumber(params.durationTurns) ?? 1));

      if (effectType === 'board_hazard' && selector === 'origin_cell') {
        if (input.move.fromRow == null || input.move.fromCol == null) continue;
        const hazardType = asString(params.hazardType) ?? '';
        if (!hazardType) continue;
        state.board_hazards.push({
          row: input.move.fromRow,
          col: input.move.fromCol,
          hazard_type: hazardType,
          affects_side: hazardType === 'poison_cell' ? sideOpposite(input.actorSide) : input.actorSide,
          remaining_turns: duration,
        });
        continue;
      }

      if (effectType === 'board_hazard' && selector === 'adjacent_empty') {
        if (!input.movedPiece) continue;
        const hazardType = asString(params.hazardType) ?? '';
        if (!hazardType) continue;
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            if (dr === 0 && dc === 0) continue;
            const row = input.movedPiece.row + dr;
            const col = input.movedPiece.col + dc;
            if (row < 0 || row > 8 || col < 0 || col > 8) continue;
            if (input.pieces.some((p) => p.row === row && p.col === col)) continue;
            state.board_hazards.push({
              row,
              col,
              hazard_type: hazardType,
              affects_side: hazardType === 'poison_cell' ? sideOpposite(input.actorSide) : input.actorSide,
              remaining_turns: duration,
            });
          }
        }
        continue;
      }

      if (effectType === 'modify_movement' && selector === 'adjacent_enemy') {
        if (!input.movedPiece) continue;
        const movementRule = asString(params.movementRule) ?? '';
        if (!movementRule) continue;
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            if (dr === 0 && dc === 0) continue;
            const row = input.movedPiece.row + dr;
            const col = input.movedPiece.col + dc;
            if (row < 0 || row > 8 || col < 0 || col > 8) continue;
            const targetPiece = input.pieces.find((p) => p.row === row && p.col === col);
            if (!targetPiece || targetPiece.side === input.actorSide) continue;
            const targetCode = toBasePieceCode(targetPiece.pieceCode);
            if (targetCode === 'OU' || targetPiece.char === '王' || targetPiece.char === '玉') {
              continue;
            }
            state.movement_modifiers.push({
              row,
              col,
              side: targetPiece.side,
              movement_rule: movementRule,
              remaining_turns: duration,
            });
          }
        }
      }

      if (effectType === 'modify_movement' && selector === 'self_piece') {
        if (!input.movedPiece) continue;
        const movementRule = asString(params.movementRule) ?? '';
        if (!movementRule) continue;
        state.movement_modifiers.push({
          row: input.movedPiece.row,
          col: input.movedPiece.col,
          side: input.actorSide,
          movement_rule: movementRule,
          remaining_turns: duration,
        });
        continue;
      }

      if (effectType === 'modify_movement' && selector === 'adjacent_ally') {
        if (!input.movedPiece) continue;
        const movementRule = asString(params.movementRule) ?? '';
        if (!movementRule) continue;
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            if (dr === 0 && dc === 0) continue;
            const row = input.movedPiece.row + dr;
            const col = input.movedPiece.col + dc;
            if (row < 0 || row > 8 || col < 0 || col > 8) continue;
            const targetPiece = input.pieces.find((p) => p.row === row && p.col === col);
            if (!targetPiece || targetPiece.side !== input.actorSide) continue;
            const targetCode = toBasePieceCode(targetPiece.pieceCode);
            if (targetCode === 'OU' || targetPiece.char === '王' || targetPiece.char === '玉') {
              continue;
            }
            state.movement_modifiers.push({
              row,
              col,
              side: targetPiece.side,
              movement_rule: movementRule,
              remaining_turns: duration,
            });
          }
        }
        continue;
      }

      if (effectType === 'modify_movement' && selector === 'same_row_ally') {
        if (!input.movedPiece) continue;
        const movementRule = asString(params.movementRule) ?? '';
        if (!movementRule) continue;
        const row = input.movedPiece.row;
        for (const targetPiece of input.pieces) {
          if (targetPiece.side !== input.actorSide) continue;
          if (targetPiece.row !== row) continue;
          const targetCode = toBasePieceCode(targetPiece.pieceCode);
          if (targetCode === 'OU' || targetPiece.char === '王' || targetPiece.char === '玉') {
            continue;
          }
          state.movement_modifiers.push({
            row: targetPiece.row,
            col: targetPiece.col,
            side: targetPiece.side,
            movement_rule: movementRule,
            remaining_turns: duration,
          });
        }
        continue;
      }

      if (effectType === 'apply_status' && selector === 'adjacent_enemy') {
        if (!input.movedPiece) continue;
        const statusType = asString(params.statusType) ?? '';
        if (!statusType) continue;
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            if (dr === 0 && dc === 0) continue;
            const row = input.movedPiece.row + dr;
            const col = input.movedPiece.col + dc;
            if (row < 0 || row > 8 || col < 0 || col > 8) continue;
            const targetPiece = input.pieces.find((p) => p.row === row && p.col === col);
            if (!targetPiece || targetPiece.side === input.actorSide) continue;
            state.piece_statuses.push({
              row,
              col,
              side: targetPiece.side,
              status_type: statusType,
              remaining_turns: duration,
            });
          }
        }
        continue;
      }

      if (effectType === 'seal_skill' && selector === 'adjacent_enemy') {
        if (!input.movedPiece) continue;
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            if (dr === 0 && dc === 0) continue;
            const row = input.movedPiece.row + dr;
            const col = input.movedPiece.col + dc;
            if (row < 0 || row > 8 || col < 0 || col > 8) continue;
            const targetPiece = input.pieces.find((p) => p.row === row && p.col === col);
            if (!targetPiece || targetPiece.side === input.actorSide) continue;
            state.piece_statuses.push({
              row,
              col,
              side: targetPiece.side,
              status_type: 'skill_sealed',
              remaining_turns: duration,
            });
          }
        }
        continue;
      }

      if (effectType === 'copy_ability' && selector === 'adjacent_ally') {
        if (!input.movedPiece) continue;
        if (
          hasAdjacentPiece({
            pieces: input.pieces,
            row: input.movedPiece.row,
            col: input.movedPiece.col,
            side: input.actorSide,
            match: 'ally',
          })
        ) {
          state.piece_statuses.push({
            row: input.movedPiece.row,
            col: input.movedPiece.col,
            side: input.actorSide,
            status_type: 'copy_ability',
            remaining_turns: duration,
          });
        }
        continue;
      }

      if (effectType === 'copy_ability' && selector === 'front_enemy') {
        if (!input.movedPiece) continue;
        const forward = input.actorSide === 'player' ? -1 : 1;
        const front = input.pieces.find(
          (p) =>
            p.row === input.movedPiece!.row + forward &&
            p.col === input.movedPiece!.col &&
            p.side !== input.actorSide,
        );
        if (front) {
          state.piece_statuses.push({
            row: input.movedPiece.row,
            col: input.movedPiece.col,
            side: input.actorSide,
            status_type: 'copy_ability',
            remaining_turns: duration,
          });
        }
        continue;
      }

      if (effectType === 'copy_ability' && selector === 'self_piece') {
        if (!input.movedPiece) continue;
        state.piece_statuses.push({
          row: input.movedPiece.row,
          col: input.movedPiece.col,
          side: input.actorSide,
          status_type: 'copy_ability',
          remaining_turns: duration,
        });
        continue;
      }

      if (effectType === 'capture_with_leap' && selector === 'self_piece') {
        if (!input.movedPiece) continue;
        state.piece_statuses.push({
          row: input.movedPiece.row,
          col: input.movedPiece.col,
          side: input.actorSide,
          status_type: 'capture_with_leap',
          remaining_turns: duration,
        });
        continue;
      }

      if (effectType === 'linked_action' && selector === 'adjacent_ally') {
        if (!input.movedPiece) continue;
        if (
          hasAdjacentPiece({
            pieces: input.pieces,
            row: input.movedPiece.row,
            col: input.movedPiece.col,
            side: input.actorSide,
            match: 'ally',
          })
        ) {
          state.piece_statuses.push({
            row: input.movedPiece.row,
            col: input.movedPiece.col,
            side: input.actorSide,
            status_type: 'linked_action',
            remaining_turns: duration,
          });
        }
        continue;
      }

      if (effectType === 'linked_action' && selector === 'same_row_ally') {
        if (!input.movedPiece) continue;
        if (
          hasSameRowAlly({
            pieces: input.pieces,
            row: input.movedPiece.row,
            col: input.movedPiece.col,
            side: input.actorSide,
          })
        ) {
          state.piece_statuses.push({
            row: input.movedPiece.row,
            col: input.movedPiece.col,
            side: input.actorSide,
            status_type: 'linked_action',
            remaining_turns: duration,
          });
        }
        continue;
      }

      if (effectType === 'disable_piece' && selector === 'adjacent_enemy') {
        if (!input.movedPiece) continue;
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            if (dr === 0 && dc === 0) continue;
            const row = input.movedPiece.row + dr;
            const col = input.movedPiece.col + dc;
            if (row < 0 || row > 8 || col < 0 || col > 8) continue;
            const targetPiece = input.pieces.find((p) => p.row === row && p.col === col);
            if (!targetPiece || targetPiece.side === input.actorSide) continue;
            state.piece_statuses.push({
              row,
              col,
              side: targetPiece.side,
              status_type: 'disabled',
              remaining_turns: duration,
            });
          }
        }
        continue;
      }

      if (effectType === 'disable_piece' && selector === 'adjacent_ally') {
        if (!input.movedPiece) continue;
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            if (dr === 0 && dc === 0) continue;
            const row = input.movedPiece.row + dr;
            const col = input.movedPiece.col + dc;
            if (row < 0 || row > 8 || col < 0 || col > 8) continue;
            const targetPiece = input.pieces.find((p) => p.row === row && p.col === col);
            if (!targetPiece || targetPiece.side !== input.actorSide) continue;
            state.piece_statuses.push({
              row,
              col,
              side: targetPiece.side,
              status_type: 'disabled',
              remaining_turns: duration,
            });
          }
        }
        continue;
      }

      if (effectType === 'capture_constraint' && selector === 'self_piece') {
        if (!input.movedPiece) continue;
        state.piece_statuses.push({
          row: input.movedPiece.row,
          col: input.movedPiece.col,
          side: input.actorSide,
          status_type: 'capture_constraint',
          remaining_turns: duration,
        });
        continue;
      }

      if (effectType === 'apply_status' && selector === 'origin_cell') {
        if (input.move.fromRow == null || input.move.fromCol == null) continue;
        const statusType = asString(params.statusType) ?? '';
        if (!statusType) continue;
        state.board_hazards.push({
          row: input.move.fromRow,
          col: input.move.fromCol,
          hazard_type: `status:${statusType}`,
          affects_side: input.actorSide,
          remaining_turns: duration,
        });
        continue;
      }

      if (effectType === 'summon_piece' && selector === 'adjacent_empty') {
        if (skipGenericAdjacentSummon) continue;
        if (!input.movedPiece) continue;
        const summonCode =
          toBasePieceCode(asString(params.summonPieceCode)) ??
          toBasePieceCode(asString(params.pieceCode)) ??
          movedCode;
        const summonChar = asString(params.summonPieceChar) ?? input.movedPiece.char;
        let spawned = false;
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            if (dr === 0 && dc === 0) continue;
            const row = input.movedPiece.row + dr;
            const col = input.movedPiece.col + dc;
            if (row < 0 || row > 8 || col < 0 || col > 8) continue;
            if (input.pieces.some((p) => p.row === row && p.col === col)) continue;
            input.pieces.push({
              side: input.actorSide,
              row,
              col,
              pieceCode: summonCode,
              char: summonChar,
              promoted: false,
              imageSignedUrl: null,
            });
            spawned = true;
            break;
          }
          if (spawned) break;
        }
        continue;
      }

      if (effectType === 'remove_piece' && selector === 'adjacent_enemy') {
        if (skipGenericAdjacentRemove) continue;
        if (!input.movedPiece) continue;
        const candidates = input.pieces
          .map((p, idx) => ({ p, idx }))
          .filter(({ p }) => {
            if (p.side === input.actorSide) return false;
            if (p.char === '王' || p.char === '玉' || toBasePieceCode(p.pieceCode) === 'OU') return false;
            return Math.abs(p.row - input.movedPiece!.row) <= 1 && Math.abs(p.col - input.movedPiece!.col) <= 1;
          });
        if (candidates.length <= 0) continue;
        const randomOne = params.randomOne === true;
        const selected =
          randomOne && candidates.length > 1
            ? candidates[Math.floor(Math.random() * candidates.length)]!
            : candidates[0]!;
        input.pieces.splice(selected.idx, 1);
        continue;
      }

      if (effectType === 'multi_capture' && selector === 'adjacent_enemy') {
        if (!input.movedPiece) continue;
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            if (dr === 0 && dc === 0) continue;
            const row = input.movedPiece.row + dr;
            const col = input.movedPiece.col + dc;
            if (row < 0 || row > 8 || col < 0 || col > 8) continue;
            const idx = input.pieces.findIndex((p) => p.row === row && p.col === col);
            if (idx < 0) continue;
            const target = input.pieces[idx]!;
            if (target.side === input.actorSide) continue;
            if (target.char === '王' || target.char === '玉' || toBasePieceCode(target.pieceCode) === 'OU') {
              continue;
            }
            input.pieces.splice(idx, 1);
          }
        }
        continue;
      }

      if (effectType === 'multi_capture' && selector === 'front_enemy') {
        if (!input.movedPiece) continue;
        const forward = input.actorSide === 'player' ? -1 : 1;
        const row = input.movedPiece.row + forward;
        const col = input.movedPiece.col;
        if (row < 0 || row > 8) continue;
        const idx = input.pieces.findIndex((p) => p.row === row && p.col === col);
        if (idx < 0) continue;
        const target = input.pieces[idx]!;
        if (target.side === input.actorSide) continue;
        if (target.char === '王' || target.char === '玉' || toBasePieceCode(target.pieceCode) === 'OU') {
          continue;
        }
        input.pieces.splice(idx, 1);
        continue;
      }

      if (effectType === 'send_to_hand' && selector === 'adjacent_enemy') {
        if (!input.movedPiece) continue;
        const idx = input.pieces.findIndex((p) => {
          if (p.side === input.actorSide) return false;
          if (p.char === '王' || p.char === '玉' || toBasePieceCode(p.pieceCode) === 'OU') return false;
          return Math.abs(p.row - input.movedPiece!.row) <= 1 && Math.abs(p.col - input.movedPiece!.col) <= 1;
        });
        if (idx >= 0) {
          const target = input.pieces[idx]!;
          const code = toBasePieceCode(target.pieceCode);
          input.pieces.splice(idx, 1);
          if (code) {
            // 仕様準拠: 送られた側の手駒へ戻す。
            incrementHand(input.position, target.side, code, 1);
          }
        }
        continue;
      }

      if (effectType === 'return_to_hand' && selector === 'self_piece') {
        if (!input.movedPiece) continue;
        const handOwner = asString(params.handOwner) ?? 'self';
        const ownerSide: Side = handOwner === 'enemy' ? sideOpposite(input.actorSide) : input.actorSide;
        const code = toBasePieceCode(input.movedPiece.pieceCode);
        const idx = input.pieces.findIndex(
          (p) =>
            p.side === input.movedPiece!.side &&
            p.row === input.movedPiece!.row &&
            p.col === input.movedPiece!.col,
        );
        if (idx >= 0) input.pieces.splice(idx, 1);
        if (code) incrementHand(input.position, ownerSide, code, 1);
        continue;
      }

      if (effectType === 'transform_piece' && selector === 'adjacent_enemy') {
        if (!input.movedPiece) continue;
        const toPieceCode = toBasePieceCode(asString(params.toPieceCode));
        const toPieceChar = asString(params.toPieceChar);
        if (!toPieceCode && !toPieceChar) continue;
        const idx = input.pieces.findIndex((p) => {
          if (p.side === input.actorSide) return false;
          if (p.char === '王' || p.char === '玉' || toBasePieceCode(p.pieceCode) === 'OU') return false;
          return Math.abs(p.row - input.movedPiece!.row) <= 1 && Math.abs(p.col - input.movedPiece!.col) <= 1;
        });
        if (idx < 0) continue;
        const target = input.pieces[idx]!;
        input.pieces[idx] = {
          ...target,
          pieceCode: toPieceCode ?? target.pieceCode,
          char: toPieceChar ?? target.char,
          promoted: false,
        };
        continue;
      }

      if (effectType === 'transform_piece' && selector === 'self_piece') {
        if (!input.movedPiece) continue;
        const idx = input.pieces.findIndex(
          (p) =>
            p.side === input.actorSide &&
            p.row === input.movedPiece!.row &&
            p.col === input.movedPiece!.col,
        );
        if (idx < 0) continue;
        const toPieceCode = toBasePieceCode(asString(params.toPieceCode));
        const toPieceChar = asString(params.toPieceChar);
        const piece = input.pieces[idx]!;
        input.pieces[idx] = {
          ...piece,
          pieceCode: toPieceCode ?? piece.pieceCode,
          char: toPieceChar ?? piece.char,
          promoted: false,
        };
        continue;
      }

      if (effectType === 'transform_piece' && selector === 'all_ally') {
        const toPieceCode = toBasePieceCode(asString(params.toPieceCode));
        const toPieceChar = asString(params.toPieceChar);
        if (!toPieceCode && !toPieceChar) continue;
        const fromPieceCode = toBasePieceCode(asString(params.fromPieceCode));
        for (let i = 0; i < input.pieces.length; i += 1) {
          const piece = input.pieces[i]!;
          if (piece.side !== input.actorSide) continue;
          if (fromPieceCode && toBasePieceCode(piece.pieceCode) !== fromPieceCode) continue;
          input.pieces[i] = {
            ...piece,
            pieceCode: toPieceCode ?? piece.pieceCode,
            char: toPieceChar ?? piece.char,
            promoted: false,
          };
        }
        continue;
      }

      if (effectType === 'defense_or_immunity' && selector === 'self_piece') {
        if (!input.movedPiece) continue;
        const mode = asString(params.mode) ?? 'immunity';
        state.piece_defenses.push({
          row: input.movedPiece.row,
          col: input.movedPiece.col,
          side: input.actorSide,
          mode,
          remaining_turns: duration,
        });
        continue;
      }

      if (effectType === 'defense_or_immunity' && selector === 'adjacent_ally') {
        if (!input.movedPiece) continue;
        const mode = asString(params.mode) ?? 'immunity';
        for (let dr = -1; dr <= 1; dr += 1) {
          for (let dc = -1; dc <= 1; dc += 1) {
            if (dr === 0 && dc === 0) continue;
            const row = input.movedPiece.row + dr;
            const col = input.movedPiece.col + dc;
            if (row < 0 || row > 8 || col < 0 || col > 8) continue;
            const targetPiece = input.pieces.find((p) => p.row === row && p.col === col);
            if (!targetPiece || targetPiece.side !== input.actorSide) continue;
            state.piece_defenses.push({
              row,
              col,
              side: targetPiece.side,
              mode,
              remaining_turns: duration,
            });
          }
        }
        continue;
      }

      if (effectType === 'extra_action' && selector === 'self_piece') {
        if (!input.movedPiece) continue;
        state.piece_statuses.push({
          row: input.movedPiece.row,
          col: input.movedPiece.col,
          side: input.actorSide,
          status_type: 'extra_action',
          remaining_turns: duration,
        });
        continue;
      }

      if (effectType === 'gain_piece' && selector === 'ally_hand_piece') {
        const single = toBasePieceCode(asString(params.gainPieceCode));
        const multi = asArray(params.gainPieceCodes)
          .map((v) => toBasePieceCode(asString(v)))
          .filter((v): v is string => Boolean(v));
        const candidate = single ?? multi[0] ?? 'KI';
        incrementHand(input.position, input.actorSide, candidate, 1);
        continue;
      }

      if (effectType === 'inherit_ability' && selector === 'self_piece') {
        if (!input.movedPiece) continue;
        state.piece_statuses.push({
          row: input.movedPiece.row,
          col: input.movedPiece.col,
          side: input.actorSide,
          status_type: 'inherit_ability',
          remaining_turns: duration,
        });
        continue;
      }

      if (effectType === 'substitute' && selector === 'self_piece') {
        if (!input.movedPiece) continue;
        state.piece_defenses.push({
          row: input.movedPiece.row,
          col: input.movedPiece.col,
          side: input.actorSide,
          mode: 'substitute',
          remaining_turns: duration,
        });
        continue;
      }

      if (effectType === 'revive' && selector === 'adjacent_ally') {
        if (!input.movedPiece) continue;
        if (
          hasAdjacentPiece({
            pieces: input.pieces,
            row: input.movedPiece.row,
            col: input.movedPiece.col,
            side: input.actorSide,
            match: 'ally',
          })
        ) {
          state.piece_statuses.push({
            row: input.movedPiece.row,
            col: input.movedPiece.col,
            side: input.actorSide,
            status_type: 'revive',
            remaining_turns: duration,
          });
        }
        continue;
      }

      if (effectType === 'script_hook' && selector === 'self_piece') {
        if (!input.movedPiece) continue;
        const hook = asString(params.hook) ?? asString(params.hookName) ?? '';
        if (!hook) continue;

        if (hook === 'reflect_until_blocked') {
          state.piece_statuses.push({
            row: input.movedPiece.row,
            col: input.movedPiece.col,
            side: input.actorSide,
            status_type: 'reflect_until_blocked',
            remaining_turns: duration,
          });
          continue;
        }

        if (hook === 'bomb_explosion_push') {
          for (let dr = -1; dr <= 1; dr += 1) {
            for (let dc = -1; dc <= 1; dc += 1) {
              if (dr === 0 && dc === 0) continue;
              const row = input.movedPiece.row + dr;
              const col = input.movedPiece.col + dc;
              if (row < 0 || row > 8 || col < 0 || col > 8) continue;
              const idx = input.pieces.findIndex((p) => p.row === row && p.col === col);
              if (idx < 0) continue;
              const target = input.pieces[idx]!;
              if (target.side === input.actorSide) continue;
              const pushRow = row + dr;
              const pushCol = col + dc;
              if (pushRow < 0 || pushRow > 8 || pushCol < 0 || pushCol > 8) continue;
              if (!isCellEmpty(input.pieces, pushRow, pushCol)) continue;
              input.pieces[idx] = { ...target, row: pushRow, col: pushCol };
            }
          }
          continue;
        }

        if (hook === 'safe_room_king_relocation') {
          const kingIdx = findKingIndex(input.pieces, input.actorSide);
          if (kingIdx >= 0) {
            const targetRow = input.actorSide === 'player' ? 8 : 0;
            const targetCol = 4;
            if (isCellEmpty(input.pieces, targetRow, targetCol)) {
              const king = input.pieces[kingIdx]!;
              input.pieces[kingIdx] = { ...king, row: targetRow, col: targetCol };
            }
          }
          continue;
        }

        if (hook === 'fixed_next_turn_restriction') {
          state.piece_statuses.push({
            row: input.movedPiece.row,
            col: input.movedPiece.col,
            side: input.actorSide,
            status_type: 'fixed_next_turn_restriction',
            remaining_turns: duration,
          });
          continue;
        }

        if (hook === 'edge_line_imprison') {
          const enemyHasEdge = input.pieces.some((p) => {
            if (p.side === input.actorSide) return false;
            return p.row === 0 || p.row === 8 || p.col === 0 || p.col === 8;
          });
          if (enemyHasEdge) {
            state.piece_statuses.push({
              row: input.movedPiece.row,
              col: input.movedPiece.col,
              side: input.actorSide,
              status_type: 'edge_line_imprison',
              remaining_turns: duration,
            });
          }
          continue;
        }

        if (hook === 'escape_king_follow') {
          if (input.move.fromRow == null || input.move.fromCol == null) continue;
          const dr = Math.sign(input.move.toRow - input.move.fromRow);
          const dc = Math.sign(input.move.toCol - input.move.fromCol);
          if (dr === 0 && dc === 0) continue;
          const kingIdx = findKingIndex(input.pieces, input.actorSide);
          if (kingIdx < 0) continue;
          const king = input.pieces[kingIdx]!;
          const targetRow = king.row + dr;
          const targetCol = king.col + dc;
          if (targetRow < 0 || targetRow > 8 || targetCol < 0 || targetCol > 8) continue;
          if (!isCellEmpty(input.pieces, targetRow, targetCol)) continue;
          input.pieces[kingIdx] = { ...king, row: targetRow, col: targetCol };
          continue;
        }
      }

      if (effectType === 'remove_piece' && selector === 'enemy_hand_random') {
        decrementFirstHandPiece(input.position, sideOpposite(input.actorSide));
        continue;
      }

      if (effectType === 'destroy_hand_piece' && selector === 'enemy_hand_random') {
        decrementFirstHandPiece(input.position, sideOpposite(input.actorSide));
      }
    }
  }

  writeSkillState(input.position, state);
}
