import {
  addHandPiece,
  capturedToHandPieceCode,
  hasKing,
  normalizeHandsStateKeys,
} from '@/features/stage-shogi/domain/game-rules';
import type {
  AiBattleMove,
  AiBattlePosition,
  AiBoardPiece,
  AiPieceDefinition,
  Side,
} from '@/ai/model';
import type { BattleMove } from '@/usecases/stage-battle/game-move-contract';
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
  pieceHasActiveCaptureImmunityFromBoardState,
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

function isDeathPieceForApply(piece: { pieceCode: string | null; char: string }): boolean {
  const ch = normKanjiForEngineRules(piece.char);
  if (ch === '死') return true;
  const b = toBasePieceCode(piece.pieceCode);
  return b === 'DEATH';
}

function isSoulPieceForApply(piece: { pieceCode: string | null; char: string }): boolean {
  const ch = normKanjiForEngineRules(piece.char);
  if (ch === '魂') return true;
  const b = toBasePieceCode(piece.pieceCode);
  return b === 'SOUL';
}

function isKbossPiece(piece: { pieceCode: string | null; char: string }): boolean {
  const base = toBasePieceCode(piece.pieceCode);
  if (base === 'KBOSS') return true;
  if (piece.char === 'K') return true;
  return false;
}

/** K・実・異: 取っても手駒にならず消滅（霊と同系）。 */
function isVanishOnCapturePiece(piece: { pieceCode: string | null; char: string }): boolean {
  if (piece.char === 'K' || piece.char === '実' || piece.char === '異') return true;
  const base = toBasePieceCode(piece.pieceCode);
  if (base === 'KBOSS' || base === 'EXPERIMENT' || base === 'MUTANT') return true;
  return false;
}

function isHolePieceForApply(piece: { pieceCode: string | null; char: string }): boolean {
  if (normKanjiForEngineRules(piece.char) === '穴') return true;
  const base = toBasePieceCode(piece.pieceCode);
  if (base === 'HOLE') return true;
  const raw = (piece.pieceCode ?? '').toUpperCase();
  return raw.includes('E381DFA07A3D');
}

function isOtsuPieceForApply(piece: { pieceCode: string | null; char: string }): boolean {
  const ch = normKanjiForEngineRules(piece.char);
  if (ch === '乙') return true;
  const base = toBasePieceCode(piece.pieceCode);
  if (base === 'OTSU') return true;
  const raw = (piece.pieceCode ?? '').toUpperCase();
  return raw.includes('5A07CA59B158');
}

function readOtsuFollowupForSide(
  boardState: Record<string, unknown> | undefined,
  side: Side,
): { row: number; col: number } | null {
  if (!boardState) return null;
  const skillState = (boardState.skill_state ?? boardState.skillState) as
    | Record<string, unknown>
    | undefined;
  const rawStatuses = (skillState?.piece_statuses ?? skillState?.pieceStatuses) as unknown;
  if (!Array.isArray(rawStatuses)) return null;
  for (const raw of rawStatuses) {
    const st = (raw ?? {}) as Record<string, unknown>;
    const statusType = String(st.status_type ?? st.statusType ?? '');
    if (statusType !== 'otsu_followup') continue;
    const stSide = String(st.side ?? 'player') === 'enemy' ? 'enemy' : 'player';
    if (stSide !== side) continue;
    const remaining = Number(st.remaining_turns ?? st.remainingTurns ?? 0);
    if (!Number.isFinite(remaining) || remaining <= 0) continue;
    const row = Number(st.row);
    const col = Number(st.col);
    if (!Number.isFinite(row) || !Number.isFinite(col)) continue;
    return { row, col };
  }
  return null;
}

const CHRYSANTHEMUM_REVIVAL_STATUS = 'chrysanthemum_revival';

function readSkillStatePieceStatuses(
  boardState: Record<string, unknown> | undefined,
): Record<string, unknown>[] {
  if (!boardState) return [];
  const skillState = (boardState.skill_state ?? boardState.skillState) as
    | Record<string, unknown>
    | undefined;
  const raw = (skillState?.piece_statuses ?? skillState?.pieceStatuses) as unknown;
  return Array.isArray(raw) ? [...raw] : [];
}

function hasActiveChrysanthemumRevival(
  boardState: Record<string, unknown> | undefined,
  side: Side,
  row: number,
  col: number,
): boolean {
  for (const raw of readSkillStatePieceStatuses(boardState)) {
    const st = (raw ?? {}) as Record<string, unknown>;
    const statusType = String(st.status_type ?? st.statusType ?? '');
    if (statusType !== CHRYSANTHEMUM_REVIVAL_STATUS) continue;
    const stSide = String(st.side ?? 'player') === 'enemy' ? 'enemy' : 'player';
    if (stSide !== side) continue;
    const remaining = Number(st.remaining_turns ?? st.remainingTurns ?? 0);
    if (!Number.isFinite(remaining) || remaining <= 0) continue;
    const r = Number(st.row);
    const c = Number(st.col);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
    if (r === row && c === col) return true;
  }
  return false;
}

/** 盤上の復活マーカーを除去（着手後の座標追従前に呼ぶ想定でも可） */
function removeChrysanthemumRevivalAtCell(
  boardState: Record<string, unknown> | undefined,
  side: Side,
  row: number,
  col: number,
): void {
  if (!boardState) return;
  const skillStateRaw = boardState.skill_state ?? boardState.skillState;
  const skillState =
    skillStateRaw && typeof skillStateRaw === 'object'
      ? ({ ...(skillStateRaw as Record<string, unknown>) } as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  const prev = (skillState.piece_statuses ?? skillState.pieceStatuses) as unknown;
  const list = Array.isArray(prev) ? [...prev] : [];
  const filtered = list.filter((entry) => {
    const st = (entry ?? {}) as Record<string, unknown>;
    const statusType = String(st.status_type ?? st.statusType ?? '');
    if (statusType !== CHRYSANTHEMUM_REVIVAL_STATUS) return true;
    const stSide = String(st.side ?? 'player') === 'enemy' ? 'enemy' : 'player';
    const r = Number(st.row);
    const c = Number(st.col);
    if (stSide === side && r === row && c === col) return false;
    return true;
  });
  skillState.piece_statuses = filtered;
  boardState.skill_state = skillState;
}

function resolveCapturedHandCode(
  captured: AiBoardPiece,
  fallbackCapturedCode: string | null,
): string | null {
  const rawCapturedCode = (captured.pieceCode ?? '').toUpperCase();
  const capturedChar = (() => {
    try {
      return (captured.char ?? '').normalize('NFKC');
    } catch {
      return captured.char ?? '';
    }
  })();
  if (
    capturedChar === '書' ||
    capturedChar === '書物' ||
    rawCapturedCode.includes('5D848242A136')
  ) {
    return 'BOOK';
  }
  if (capturedChar === '封' || rawCapturedCode.includes('7000FED9D9D4')) {
    return 'SEAL';
  }
  if (capturedChar === '轟' || rawCapturedCode.includes('D24741D0EF18')) {
    return 'BIGNOISE';
  }
  if (capturedChar === '犇' || rawCapturedCode.includes('1275B5728D1C')) {
    return 'BULL';
  }
  if (rawCapturedCode.includes('BOOK')) {
    return 'BOOK';
  }
  if (rawCapturedCode.includes('SEAL')) {
    return 'SEAL';
  }
  if (rawCapturedCode.includes('BIGNOISE')) {
    return 'BIGNOISE';
  }
  if (rawCapturedCode.includes('BULL')) {
    return 'BULL';
  }
  if (capturedChar === '礼' || rawCapturedCode.includes('4FCDDF14D08D')) {
    return 'RITUAL';
  }
  if (capturedChar === '聖' || rawCapturedCode.includes('A3BAB6C13DC7')) {
    return 'SAINT';
  }
  if (rawCapturedCode.includes('RITUAL')) {
    return 'RITUAL';
  }
  if (rawCapturedCode.includes('SAINT')) {
    return 'SAINT';
  }
  if (capturedChar === '穴' || rawCapturedCode.includes('E381DFA07A3D')) {
    return 'HOLE';
  }
  if (capturedChar === '淵' || rawCapturedCode.includes('31CB39CC0FA8')) {
    return 'ABYSS';
  }
  if (rawCapturedCode.includes('HOLE')) {
    return 'HOLE';
  }
  if (rawCapturedCode.includes('ABYSS')) {
    return 'ABYSS';
  }
  if (capturedChar === '獣' || rawCapturedCode.includes('05E4EFB89DAE')) {
    return 'BEAST';
  }
  if (capturedChar === '禽' || rawCapturedCode.includes('29ECAB1EF3C3')) {
    return 'BIRD';
  }
  if (rawCapturedCode.includes('BEAST')) {
    return 'BEAST';
  }
  if (rawCapturedCode.includes('BIRD')) {
    return 'BIRD';
  }
  if (capturedChar === '悟' || rawCapturedCode.includes('6D4AFA9CDF1C')) {
    return 'SATORI';
  }
  if (capturedChar === '心' || rawCapturedCode.includes('CA16911978FF')) {
    return 'HEART';
  }
  if (capturedChar === '鬱' || rawCapturedCode.includes('9E27F89F65C5')) {
    return 'DEPRESSION';
  }
  if (capturedChar === '乙' || rawCapturedCode.includes('5A07CA59B158')) {
    return 'OTSU';
  }
  if (capturedChar === '薔' || rawCapturedCode.includes('A49C1E52B47A')) {
    return 'ROSE';
  }
  if (capturedChar === '菊' || rawCapturedCode.includes('8254C41BA326')) {
    return 'CHRYSANTHEMUM';
  }
  if (capturedChar === '桜' || rawCapturedCode.includes('124C31EA5D7A')) {
    return 'CHERRY';
  }
  if (rawCapturedCode.includes('SATORI')) {
    return 'SATORI';
  }
  if (rawCapturedCode.includes('HEART')) {
    return 'HEART';
  }
  if (rawCapturedCode.includes('DEPRESSION')) {
    return 'DEPRESSION';
  }
  if (rawCapturedCode.includes('OTSU')) {
    return 'OTSU';
  }
  if (rawCapturedCode.includes('ROSE')) {
    return 'ROSE';
  }
  if (rawCapturedCode.includes('CHRYSANTHEMUM')) {
    return 'CHRYSANTHEMUM';
  }
  if (rawCapturedCode.includes('CHERRY')) {
    return 'CHERRY';
  }
  const fromCaptured = toBasePieceCode(capturedToHandPieceCode(captured));
  if (fromCaptured) return fromCaptured;
  const fb = toBasePieceCode(fallbackCapturedCode);
  if (!fb) return null;
  if (fb.includes('BOOK') || fb.includes('5D848242A136')) return 'BOOK';
  if (fb.includes('SEAL') || fb.includes('7000FED9D9D4')) return 'SEAL';
  if (fb.includes('RITUAL') || fb.includes('4FCDDF14D08D')) return 'RITUAL';
  if (fb.includes('SAINT') || fb.includes('A3BAB6C13DC7')) return 'SAINT';
  if (fb.includes('HOLE') || fb.includes('E381DFA07A3D')) return 'HOLE';
  if (fb.includes('ABYSS') || fb.includes('31CB39CC0FA8')) return 'ABYSS';
  if (fb.includes('BEAST') || fb.includes('05E4EFB89DAE')) return 'BEAST';
  if (fb.includes('BIRD') || fb.includes('29ECAB1EF3C3')) return 'BIRD';
  if (fb.includes('SATORI') || fb.includes('6D4AFA9CDF1C')) return 'SATORI';
  if (fb.includes('HEART') || fb.includes('CA16911978FF')) return 'HEART';
  if (fb.includes('DEPRESSION') || fb.includes('9E27F89F65C5')) return 'DEPRESSION';
  if (fb.includes('OTSU') || fb.includes('5A07CA59B158')) return 'OTSU';
  if (fb.includes('ROSE') || fb.includes('A49C1E52B47A')) return 'ROSE';
  if (fb.includes('CHRYSANTHEMUM') || fb.includes('8254C41BA326')) return 'CHRYSANTHEMUM';
  if (fb.includes('CHERRY') || fb.includes('124C31EA5D7A')) return 'CHERRY';
  // opaque id をそのまま手駒キーにしない（手駒表示不能の原因）。
  if (/^PIECE_[A-Z0-9_]+$/i.test(fb)) return null;
  return fb;
}

function debugLogBookCaptureToHand(input: {
  actorSide: Side;
  captured: AiBoardPiece;
  resolvedCode: string | null;
  fallbackCapturedCode: string | null;
  hands: HandsBag;
}): void {
  const ch = (() => {
    try {
      return (input.captured.char ?? '').normalize('NFKC');
    } catch {
      return input.captured.char ?? '';
    }
  })();
  const rawCode = (input.captured.pieceCode ?? '').toUpperCase();
  const isBook =
    ch === '書' || ch === '書物' || rawCode.includes('BOOK') || rawCode.includes('5D848242A136');
  if (!isBook) return;
  console.info('[book-capture-debug] add-to-hand', {
    actorSide: input.actorSide,
    capturedAt: [input.captured.row, input.captured.col],
    capturedChar: input.captured.char,
    capturedCode: input.captured.pieceCode,
    fallbackCapturedCode: input.fallbackCapturedCode,
    resolvedCode: input.resolvedCode,
    actorHands: input.hands[input.actorSide],
  });
}

function kbossEffectiveLives(piece: { kbossLivesRemaining?: number }): number {
  const v = piece.kbossLivesRemaining;
  if (v === 1 || v === 2) return v;
  return 2;
}

function normKanjiForEngineRules(ch: string): string {
  try {
    return ch.normalize('NFKC');
  } catch {
    return ch;
  }
}

function isGunPieceForApply(piece: { pieceCode: string | null; char: string }): boolean {
  if (normKanjiForEngineRules(piece.char) === '銃') return true;
  const b = toBasePieceCode(piece.pieceCode);
  return b === 'GUN';
}

function gunApplyDebugLog(payload: Record<string, unknown>): void {
  void payload;
}

function isKatanaPieceForApply(piece: { pieceCode: string | null; char: string }): boolean {
  if (normKanjiForEngineRules(piece.char) === '剣') return false;
  if (normKanjiForEngineRules(piece.char) === '刀') return true;
  const b = toBasePieceCode(piece.pieceCode);
  return b === 'KATANA' || b === 'SWORD';
}

/** 聖剣「剣」。`SWORD` 基底の名刀「刀」とは `char`／opaque で区別する。 */
function isKenSwordPieceForApply(piece: { pieceCode: string | null; char: string }): boolean {
  if (normKanjiForEngineRules(piece.char) === '剣') return true;
  const b = toBasePieceCode(piece.pieceCode);
  if (b === 'HOLY_SWORD') return true;
  const raw = (piece.pieceCode ?? '').toUpperCase();
  return raw.includes('0F14ABCC6E5E');
}

function isShieldPieceForApply(piece: { pieceCode: string | null; char: string }): boolean {
  if (normKanjiForEngineRules(piece.char) === '盾') return true;
  const b = toBasePieceCode(piece.pieceCode);
  return b === 'SHIELD';
}

function isOboroPieceForApply(piece: { pieceCode: string | null; char: string }): boolean {
  if (normKanjiForEngineRules(piece.char) === '朧') return true;
  const b = toBasePieceCode(piece.pieceCode);
  return b === 'OBORO';
}

function isDeathOrSoulPieceForOboroTrigger(piece: {
  pieceCode: string | null;
  char: string;
}): boolean {
  const ch = normKanjiForEngineRules(piece.char);
  if (ch === '死' || ch === '魂') return true;
  const b = toBasePieceCode(piece.pieceCode);
  return b === 'DEATH' || b === 'SOUL';
}

function collectAllEmptyCells(
  pieces: Array<{ row: number; col: number }>,
): Array<{ row: number; col: number }> {
  const occupied = new Set(pieces.map((p) => `${p.row}:${p.col}`));
  const out: Array<{ row: number; col: number }> = [];
  for (let row = 0; row <= 8; row += 1) {
    for (let col = 0; col <= 8; col += 1) {
      if (occupied.has(`${row}:${col}`)) continue;
      out.push({ row, col });
    }
  }
  return out;
}

function resolveOboroEvadeWarpCell(input: {
  captured: AiBoardPiece;
  pieces: AiBoardPiece[];
  captureRow: number;
  captureCol: number;
}): { row: number; col: number } | null {
  if (!isOboroPieceForApply(input.captured)) return null;
  const hasTriggerPiece = input.pieces.some(
    (p) =>
      isDeathOrSoulPieceForOboroTrigger(p) &&
      !(p.row === input.captureRow && p.col === input.captureCol && p.side === input.captured.side),
  );
  if (!hasTriggerPiece) return null;
  const empties = collectAllEmptyCells(input.pieces);
  if (empties.length === 0) return null;
  return empties[Math.floor(Math.random() * empties.length)] ?? null;
}

/**
 * 同一段の左右（筋の ±1）の空きマス。剣の捕獲回避専用。
 */
function collectHorizontalAdjacentEmptyCells(
  pieces: Array<{ row: number; col: number }>,
  row: number,
  col: number,
): Array<{ row: number; col: number }> {
  const out: Array<{ row: number; col: number }> = [];
  for (const dc of [-1, 1]) {
    const c = col + dc;
    if (c < 0 || c > 8) continue;
    if (pieces.some((p) => p.row === row && p.col === c)) continue;
    out.push({ row, col: c });
  }
  return out;
}

/**
 * 味方「盾」の前方以外に隣接した味方がこの手で敵に取られるとき、50% で着手全体を無効化する。
 * （盤・手駒を着手前に戻し、手番も進めない）
 */
function tryShieldIntrinsicAbortHostileCapture(
  actorSide: Side,
  victim: AiBoardPiece,
  piecesOnBoard: AiBoardPiece[],
): boolean {
  if (victim.side === actorSide) return false;
  let hasQualifyingShield = false;
  for (const p of piecesOnBoard) {
    if (!isShieldPieceForApply(p)) continue;
    if (p.side !== victim.side) continue;
    const dr = victim.row - p.row;
    const dc = victim.col - p.col;
    if (Math.abs(dr) > 1 || Math.abs(dc) > 1 || (dr === 0 && dc === 0)) continue;
    const fwdR = p.row + katanaForwardOneDeltaRow(p.side);
    const fwdC = p.col;
    if (victim.row === fwdR && victim.col === fwdC) continue;
    hasQualifyingShield = true;
    break;
  }
  if (!hasQualifyingShield) return false;
  return Math.random() < 0.5;
}

/** 着地点から見た「前方」1マスの dRow（game-rules の orient と整合）。 */
function katanaForwardOneDeltaRow(actorSide: Side): number {
  const orient = actorSide === 'player' ? 1 : -1;
  return -1 * orient;
}

/** 前方ちょうど1マスへ進む着手（名刀の唯一の移動）か。打ちは対象外。 */
function isKatanaForwardCaptureMove(
  actorSide: Side,
  move: Pick<BattleMove, 'fromRow' | 'fromCol' | 'toRow' | 'toCol' | 'dropPieceCode'>,
): boolean {
  if (move.dropPieceCode) return false;
  if (move.fromRow == null || move.fromCol == null) return false;
  const dForward = katanaForwardOneDeltaRow(actorSide);
  return move.fromCol === move.toCol && move.toRow === move.fromRow + dForward;
}

/** skill_definitions_v2 に依存せず、名刀「刀」は前方1マスで敵を取ったとき、着地点の左右1マスにいる敵駒をまとめて処理する（鎧は斬撃で取れない）。 */
function applyIntrinsicKatanaSideCaptures(input: {
  boardState: Record<string, unknown> | undefined;
  nextPieces: AiBoardPiece[];
  hands: HandsBag;
  actorSide: Side;
  didCapture: boolean;
  movedPiece: AiBoardPiece | null;
  move: Pick<BattleMove, 'fromRow' | 'fromCol' | 'toRow' | 'toCol' | 'dropPieceCode'>;
}): {
  nextPieces: AiBoardPiece[];
  hands: HandsBag;
  starReturnProcTriggered: boolean;
  didSideSweep: boolean;
} {
  let { nextPieces, hands } = input;
  let starReturnProcTriggered = false;
  if (!input.movedPiece || !isKatanaPieceForApply(input.movedPiece)) {
    return { nextPieces, hands, starReturnProcTriggered, didSideSweep: false };
  }
  if (!input.didCapture) {
    return { nextPieces, hands, starReturnProcTriggered, didSideSweep: false };
  }
  if (!isKatanaForwardCaptureMove(input.actorSide, input.move)) {
    return { nextPieces, hands, starReturnProcTriggered, didSideSweep: false };
  }
  let didSideSweep = false;
  const r0 = input.movedPiece.row;
  const c0 = input.movedPiece.col;
  const extraTargets: [number, number][] = [
    [r0, c0 - 1],
    [r0, c0 + 1],
  ];
  for (const [row, col] of extraTargets) {
    if (row < 0 || row > 8 || col < 0 || col > 8) continue;
    const sweepTarget = findPieceAt(nextPieces, row, col);
    if (!sweepTarget || sweepTarget.side === input.actorSide) continue;
    if (isArmorPieceForApply(sweepTarget)) continue;
    const res = applyHostileCaptureAtCell({
      boardState: input.boardState,
      nextPieces,
      hands,
      actorSide: input.actorSide,
      row,
      col,
      fallbackCapturedCode: null,
    });
    nextPieces = res.nextPieces;
    hands = res.hands;
    if (res.didCapture) didSideSweep = true;
    if (res.starReturnProcTriggered) starReturnProcTriggered = true;
  }
  return { nextPieces, hands, starReturnProcTriggered, didSideSweep };
}

function isArmorPieceForApply(piece: { pieceCode: string | null; char: string }): boolean {
  const b = toBasePieceCode(piece.pieceCode);
  return piece.char === '鎧' || b === 'ARMOR';
}

function isKingPieceForApply(piece: { pieceCode: string | null; char: string }): boolean {
  const b = toBasePieceCode(piece.pieceCode);
  return b === 'OU' || piece.char === '王' || piece.char === '玉';
}

function hasSoulOnBoardForSide(pieces: AiBoardPiece[], side: Side): boolean {
  return pieces.some((p) => p.side === side && isSoulPieceForApply(p));
}

/** 礼拝者「礼」（嶺の REI コードとは別） */
function isReiRitualPiece(piece: { pieceCode: string | null; char: string }): boolean {
  const ch = normKanjiForEngineRules(piece.char);
  if (ch === '礼') return true;
  const raw = (piece.pieceCode ?? '').toUpperCase();
  if (raw.includes('4FCDDF14D08D')) return true;
  const b = toBasePieceCode(piece.pieceCode);
  return b === 'RITUAL';
}

/** 他の味方が取られたとき、盤上に別の「礼」がいれば1体を身代わりで消す */
function shouldConsumeReiSubstituteAfterAllyCapture(
  boardWithCaptured: AiBoardPiece[],
  captured: AiBoardPiece,
): boolean {
  if (isKingPieceForApply(captured)) return false;
  if (isReiRitualPiece(captured)) return false;
  const side = captured.side;
  return boardWithCaptured.some(
    (p) =>
      p.side === side && isReiRitualPiece(p) && !(p.row === captured.row && p.col === captured.col),
  );
}

function removeFirstReiRitualFromSide(pieces: AiBoardPiece[], side: Side): AiBoardPiece[] {
  const idx = pieces.findIndex((p) => p.side === side && isReiRitualPiece(p));
  if (idx < 0) return pieces;
  return pieces.filter((_, i) => i !== idx);
}

/** 「礼」身代わり時は取られた駒を相手ではなく防御側の手駒に戻す */
function targetHandSideForCapturedPiece(
  actorSide: Side,
  defenderSide: Side,
  consumeReiSubstitute: boolean,
): Side {
  return consumeReiSubstitute ? defenderSide : actorSide;
}

/** 合法手生成の isGunFullyBlockingAllyOnMid と同じ。王・鎧・K博士以外の味方は貫通で除去する。 */
function isGunFullyBlockingAllyOnMidForApply(mid: AiBoardPiece, actorSide: Side): boolean {
  if (mid.side !== actorSide) return false;
  return isKingPieceForApply(mid) || isArmorPieceForApply(mid) || isKbossPiece(mid);
}

/** 銃: 前方2マス直進、または斜め後ろ2マス。いずれも中間マスに敵がいる貫通取りの中点。 */
function computeGunPenetrationMidpoint(
  side: Side,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
): { midRow: number; midCol: number } | null {
  const dr = toRow - fromRow;
  const dc = toCol - fromCol;
  // 前方ちょうど2マス（同一筋）
  if (fromCol === toCol) {
    const d = side === 'player' ? -1 : 1;
    if (dr === 2 * d) {
      return { midRow: fromRow + d, midCol: fromCol };
    }
  }
  // 斜め後ろちょうど2マス（プレイヤーは下方向の斜め、敵は上方向の斜め）
  if (Math.abs(dr) === 2 && Math.abs(dc) === 2 && Math.abs(dr) === Math.abs(dc)) {
    const sr = dr / 2;
    const sc = dc / 2;
    if (side === 'player' && sr === 1 && Math.abs(sc) === 1) {
      return { midRow: fromRow + sr, midCol: fromCol + sc };
    }
    if (side === 'enemy' && sr === -1 && Math.abs(sc) === 1) {
      return { midRow: fromRow + sr, midCol: fromCol + sc };
    }
  }
  return null;
}

type HandsBag = ReturnType<typeof normalizeHandsStateKeys>;

function cloneCombatBoardSnapshot(input: { pieces: AiBoardPiece[]; hands: HandsBag }): {
  pieces: AiBoardPiece[];
  hands: HandsBag;
} {
  return {
    pieces: input.pieces.map((p) => ({ ...p })),
    hands: normalizeHandsStateKeys({
      player: { ...sanitizeHandsBag(input.hands.player) },
      enemy: { ...sanitizeHandsBag(input.hands.enemy) },
    }),
  };
}

function applyHostileCaptureAtCell(input: {
  boardState: Record<string, unknown> | undefined;
  nextPieces: AiBoardPiece[];
  hands: HandsBag;
  actorSide: Side;
  row: number;
  col: number;
  fallbackCapturedCode: string | null;
}): {
  nextPieces: AiBoardPiece[];
  hands: HandsBag;
  didCapture: boolean;
  starReturnProcTriggered: boolean;
  rebuffKboss: boolean;
  deathCapturedByActor: boolean;
} {
  let { nextPieces, hands } = input;
  let starReturnProcTriggered = false;
  let rebuffKboss = false;
  let deathCapturedByActor = false;
  const captured = findPieceAt(nextPieces, input.row, input.col);
  if (!captured || captured.side === input.actorSide) {
    return {
      nextPieces,
      hands,
      didCapture: false,
      starReturnProcTriggered,
      rebuffKboss,
      deathCapturedByActor,
    };
  }
  if (isArmorPieceForApply(captured)) {
    throw new Error('cannot capture armor');
  }
  if (
    pieceHasActiveCaptureImmunityFromBoardState(
      input.boardState,
      captured.side,
      input.row,
      input.col,
    )
  ) {
    throw new Error('cannot capture immunity');
  }
  if (isKingPieceForApply(captured) && hasSoulOnBoardForSide(nextPieces, captured.side)) {
    throw new Error('cannot capture king while soul remains');
  }

  if (isKenSwordPieceForApply(captured)) {
    const horiz = collectHorizontalAdjacentEmptyCells(nextPieces, input.row, input.col);
    if (horiz.length > 0) {
      const pick = horiz[Math.floor(Math.random() * horiz.length)]!;
      const ksIdx = nextPieces.findIndex(
        (p) => p.row === input.row && p.col === input.col && p.side === captured.side,
      );
      if (ksIdx >= 0) {
        const ks = nextPieces[ksIdx]!;
        nextPieces = [...nextPieces];
        nextPieces[ksIdx] = { ...ks, row: pick.row, col: pick.col };
      }
      return {
        nextPieces,
        hands,
        didCapture: false,
        starReturnProcTriggered,
        rebuffKboss,
        deathCapturedByActor,
      };
    }
  }

  const oboroEvadeTo = resolveOboroEvadeWarpCell({
    captured,
    pieces: nextPieces,
    captureRow: input.row,
    captureCol: input.col,
  });
  if (oboroEvadeTo) {
    const obIdx = nextPieces.findIndex(
      (p) => p.row === input.row && p.col === input.col && p.side === captured.side,
    );
    if (obIdx >= 0) {
      const ob = nextPieces[obIdx]!;
      nextPieces = [...nextPieces];
      nextPieces[obIdx] = { ...ob, row: oboroEvadeTo.row, col: oboroEvadeTo.col };
    }
    return {
      nextPieces,
      hands,
      didCapture: false,
      starReturnProcTriggered,
      rebuffKboss,
      deathCapturedByActor,
    };
  }

  let phantomEvaded = false;
  let adjacentEmpty: Array<{ row: number; col: number }> = [];
  const evadeChance = resolveEvadeCaptureProcChanceForPiece(input.boardState, captured);
  adjacentEmpty = collectAdjacentEmptyCells(nextPieces, input.row, input.col);
  if (evadeChance != null && adjacentEmpty.length > 0) {
    const roll = Math.random();
    phantomEvaded = roll <= evadeChance;
  }

  if (phantomEvaded) {
    const pick = adjacentEmpty[Math.floor(Math.random() * adjacentEmpty.length)]!;
    const phIdx = nextPieces.findIndex(
      (p) => p.row === input.row && p.col === input.col && p.side === captured.side,
    );
    if (phIdx >= 0) {
      const ph = nextPieces[phIdx]!;
      nextPieces = [...nextPieces];
      nextPieces[phIdx] = { ...ph, row: pick.row, col: pick.col };
    }
    return {
      nextPieces,
      hands,
      didCapture: false,
      starReturnProcTriggered,
      rebuffKboss,
      deathCapturedByActor,
    };
  }

  if (isKbossPiece(captured) && kbossEffectiveLives(captured) > 1) {
    rebuffKboss = true;
    const kIdx = nextPieces.findIndex(
      (p) => p.row === input.row && p.col === input.col && p.side === captured.side,
    );
    if (kIdx >= 0) {
      const cur = nextPieces[kIdx]!;
      nextPieces = [...nextPieces];
      nextPieces[kIdx] = {
        ...cur,
        kbossLivesRemaining: kbossEffectiveLives(cur) - 1,
      };
    }
    return {
      nextPieces,
      hands,
      didCapture: false,
      starReturnProcTriggered,
      rebuffKboss,
      deathCapturedByActor,
    };
  }

  if (isDeathPieceForApply(captured)) {
    deathCapturedByActor = true;
  }
  const consumeReiSubstitute = shouldConsumeReiSubstituteAfterAllyCapture(nextPieces, captured);
  if (hasActiveChrysanthemumRevival(input.boardState, captured.side, input.row, input.col)) {
    nextPieces = nextPieces.filter((piece) => !(piece.row === input.row && piece.col === input.col));
    removeChrysanthemumRevivalAtCell(input.boardState, captured.side, input.row, input.col);
    if (!isSpiritPiece(captured)) {
      const capturedCode = resolveCapturedHandCode(captured, input.fallbackCapturedCode);
      if (capturedCode) {
        hands = addHandPiece(hands, captured.side, capturedCode, 1);
      }
      debugLogBookCaptureToHand({
        actorSide: input.actorSide,
        captured,
        resolvedCode: capturedCode ?? null,
        fallbackCapturedCode: input.fallbackCapturedCode,
        hands,
      });
    }
    return {
      nextPieces,
      hands,
      didCapture: true,
      starReturnProcTriggered,
      rebuffKboss,
      deathCapturedByActor,
    };
  }
  nextPieces = nextPieces.filter((piece) => !(piece.row === input.row && piece.col === input.col));
  const isSpiritCaptured = isSpiritPiece(captured);
  const capturedBaseCode = toBasePieceCode(captured.pieceCode);
  const isStarCaptured = capturedBaseCode === 'HOS' || captured.char === '星';
  if (isSpiritCaptured) {
    // 手駒化しない
  } else if (isVanishOnCapturePiece(captured)) {
    // K・実・異
  } else if (isStarCaptured) {
    const procChance = 0.4;
    const roll = Math.random();
    if (roll <= procChance) {
      starReturnProcTriggered = true;
      hands = addHandPiece(hands, captured.side, 'HOS', 1);
    } else {
      const capturedCode = resolveCapturedHandCode(captured, input.fallbackCapturedCode);
      if (capturedCode) {
        const handSide = targetHandSideForCapturedPiece(
          input.actorSide,
          captured.side,
          consumeReiSubstitute,
        );
        hands = addHandPiece(hands, handSide, capturedCode, 1);
      }
      debugLogBookCaptureToHand({
        actorSide: input.actorSide,
        captured,
        resolvedCode: capturedCode,
        fallbackCapturedCode: input.fallbackCapturedCode,
        hands,
      });
    }
  } else {
    const capturedCode = resolveCapturedHandCode(captured, input.fallbackCapturedCode);
    if (capturedCode) {
      const handSide = targetHandSideForCapturedPiece(
        input.actorSide,
        captured.side,
        consumeReiSubstitute,
      );
      hands = addHandPiece(hands, handSide, capturedCode, 1);
    }
    debugLogBookCaptureToHand({
      actorSide: input.actorSide,
      captured,
      resolvedCode: capturedCode,
      fallbackCapturedCode: input.fallbackCapturedCode,
      hands,
    });
  }

  if (consumeReiSubstitute) {
    nextPieces = removeFirstReiRitualFromSide(nextPieces, captured.side);
  }

  return {
    nextPieces,
    hands,
    didCapture: true,
    starReturnProcTriggered,
    rebuffKboss,
    deathCapturedByActor,
  };
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
  const otsuFollowupBefore = readOtsuFollowupForSide(
    current.boardState as Record<string, unknown> | undefined,
    actorSide,
  );
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
  let diseaseCapturedByActor = false;
  let abyssCapturedByActor = false;
  let deathCapturedByActor = false;
  const capturedHoleCellsByActor: Array<{ row: number; col: number }> = [];
  let starReturnProcTriggered = false;
  /** 刀の隣取り・銃の貫通取りなど、エンジン内在スキル（skill_definitions_v2 の 52/54 非依存）。 */
  let intrinsicCombatSkillTriggered = false;
  /** 盾の intrinsic：着手全体を巻き戻す。 */
  let shieldAbortedMove = false;
  let movedByOtsu = false;

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
    movedByOtsu = isOtsuPieceForApply(movingPiece);
    const movingCode = toBasePieceCode(movingPiece?.pieceCode);
    const isCloudMover = movingCode === 'CLOUD' || movingPiece?.char === '雲';
    const combatBoardSnapshot = cloneCombatBoardSnapshot({ pieces: nextPieces, hands });

    // 銃: 前方ちょうど2マスへ進む手では、まず1マス目の敵を取ってから2マス目へ入る（両方敵なら同一手で連続取り）。斜め後ろ2マス貫通も同様。
    const gunPen =
      isGunPieceForApply(movingPiece) && move.fromRow != null && move.fromCol != null
        ? computeGunPenetrationMidpoint(
            actorSide,
            move.fromRow,
            move.fromCol,
            move.toRow,
            move.toCol,
          )
        : null;
    const midForGun = gunPen != null ? findPieceAt(nextPieces, gunPen.midRow, gunPen.midCol) : null;

    if (isGunPieceForApply(movingPiece)) {
      gunApplyDebugLog({
        phase: 'pre-capture',
        from: [move.fromRow, move.fromCol],
        to: [move.toRow, move.toCol],
        actorSide,
        gunPen,
        mid: midForGun
          ? {
              row: midForGun.row,
              col: midForGun.col,
              side: midForGun.side,
              char: midForGun.char,
            }
          : null,
      });
    }

    if (gunPen && midForGun) {
      if (midForGun.side === actorSide) {
        if (isGunFullyBlockingAllyOnMidForApply(midForGun, actorSide)) {
          throw new Error('gun path blocked by ally');
        }
        nextPieces = nextPieces.filter(
          (p) => !(p.row === gunPen.midRow && p.col === gunPen.midCol),
        );
        didCapture = true;
      } else {
        if (isArmorPieceForApply(movingPiece)) {
          throw new Error('armor cannot capture');
        }
        if (isArmorPieceForApply(midForGun)) {
          throw new Error('cannot capture armor piece');
        }
        const midRes = applyHostileCaptureAtCell({
          boardState: current.boardState as Record<string, unknown> | undefined,
          nextPieces,
          hands,
          actorSide,
          row: gunPen.midRow,
          col: gunPen.midCol,
          fallbackCapturedCode: null,
        });
        if (midRes.rebuffKboss) {
          throw new Error('invalid gun move: kboss midpoint');
        }
        nextPieces = midRes.nextPieces;
        hands = midRes.hands;
        if (midRes.didCapture) {
          didCapture = true;
          intrinsicCombatSkillTriggered = true;
          if (isHolePieceForApply(midForGun)) {
            capturedHoleCellsByActor.push({ row: gunPen.midRow, col: gunPen.midCol });
          }
        }
        if (midRes.starReturnProcTriggered) starReturnProcTriggered = true;
        if (midRes.deathCapturedByActor) deathCapturedByActor = true;
      }
    }

    const captured = findPieceAt(nextPieces, move.toRow, move.toCol);
    let rebuffKboss = false;
    if (captured) {
      const captureOwnPiece = captured.side === actorSide;
      if (!captureOwnPiece && !isCloudMover && isArmorPieceForApply(captured)) {
        throw new Error('cannot capture armor');
      }
      if (
        !captureOwnPiece &&
        isKingPieceForApply(captured) &&
        hasSoulOnBoardForSide(nextPieces, captured.side)
      ) {
        throw new Error('cannot capture king while soul remains');
      }
      if (!captureOwnPiece && isArmorPieceForApply(movingPiece)) {
        throw new Error('armor cannot capture enemy');
      }
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

      if (
        !captureOwnPiece &&
        tryShieldIntrinsicAbortHostileCapture(actorSide, captured, nextPieces)
      ) {
        shieldAbortedMove = true;
        intrinsicCombatSkillTriggered = true;
        const snap = cloneCombatBoardSnapshot(combatBoardSnapshot);
        nextPieces = snap.pieces;
        hands = snap.hands;
        didCapture = false;
      }

      let phantomEvaded = false;
      let adjacentEmpty: Array<{ row: number; col: number }> = [];
      let kenSwordEvadeTo: { row: number; col: number } | null = null;
      if (!shieldAbortedMove && !captureOwnPiece && isKenSwordPieceForApply(captured)) {
        const horizKen = collectHorizontalAdjacentEmptyCells(nextPieces, move.toRow, move.toCol);
        if (horizKen.length > 0) {
          kenSwordEvadeTo = horizKen[Math.floor(Math.random() * horizKen.length)]!;
          intrinsicCombatSkillTriggered = true;
        }
      }
      let oboroEvadeTo: { row: number; col: number } | null = null;
      if (!shieldAbortedMove && !captureOwnPiece && !kenSwordEvadeTo) {
        oboroEvadeTo = resolveOboroEvadeWarpCell({
          captured,
          pieces: nextPieces,
          captureRow: move.toRow,
          captureCol: move.toCol,
        });
      }
      if (!shieldAbortedMove && !captureOwnPiece && !kenSwordEvadeTo) {
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

      if (shieldAbortedMove) {
        // 盤・手駒は上で復元済み。着手駒は from のまま。
      } else if (kenSwordEvadeTo) {
        didCapture = false;
        const ksIdx = nextPieces.findIndex(
          (p) => p.row === move.toRow && p.col === move.toCol && p.side === captured.side,
        );
        if (ksIdx >= 0) {
          const ks = nextPieces[ksIdx]!;
          nextPieces[ksIdx] = { ...ks, row: kenSwordEvadeTo.row, col: kenSwordEvadeTo.col };
        }
      } else if (oboroEvadeTo) {
        didCapture = false;
        const obIdx = nextPieces.findIndex(
          (p) => p.row === move.toRow && p.col === move.toCol && p.side === captured.side,
        );
        if (obIdx >= 0) {
          const ob = nextPieces[obIdx]!;
          nextPieces[obIdx] = { ...ob, row: oboroEvadeTo.row, col: oboroEvadeTo.col };
        }
      } else if (phantomEvaded) {
        didCapture = false;
        const pick = adjacentEmpty[Math.floor(Math.random() * adjacentEmpty.length)]!;
        const phIdx = nextPieces.findIndex(
          (p) => p.row === move.toRow && p.col === move.toCol && p.side === captured.side,
        );
        if (phIdx >= 0) {
          const ph = nextPieces[phIdx]!;
          nextPieces[phIdx] = { ...ph, row: pick.row, col: pick.col };
        }
      } else if (!captureOwnPiece && isKbossPiece(captured) && kbossEffectiveLives(captured) > 1) {
        rebuffKboss = true;
        didCapture = false;
        const kIdx = nextPieces.findIndex(
          (p) => p.row === move.toRow && p.col === move.toCol && p.side === captured.side,
        );
        if (kIdx >= 0) {
          const cur = nextPieces[kIdx]!;
          nextPieces[kIdx] = {
            ...cur,
            kbossLivesRemaining: kbossEffectiveLives(cur) - 1,
          };
        }
      } else {
        didCapture = true;
        {
          const capturedChar = (() => {
            try {
              return (captured.char ?? '').normalize('NFKC');
            } catch {
              return captured.char ?? '';
            }
          })();
          const rawCode = (captured.pieceCode ?? '').toUpperCase();
          if (!captureOwnPiece && (capturedChar === '病' || rawCode.includes('151646512B2F'))) {
            diseaseCapturedByActor = true;
          }
          if (!captureOwnPiece && (capturedChar === '淵' || rawCode.includes('31CB39CC0FA8'))) {
            abyssCapturedByActor = true;
          }
          if (!captureOwnPiece && isDeathPieceForApply(captured)) {
            deathCapturedByActor = true;
          }
          if (!captureOwnPiece && isHolePieceForApply(captured)) {
            capturedHoleCellsByActor.push({ row: move.toRow, col: move.toCol });
          }
        }
        const consumeReiSubstitute =
          !captureOwnPiece && captured
            ? shouldConsumeReiSubstituteAfterAllyCapture(nextPieces, captured)
            : false;
        const chrysRevivalActive =
          !captureOwnPiece &&
          captured != null &&
          hasActiveChrysanthemumRevival(
            current.boardState as Record<string, unknown> | undefined,
            captured.side,
            move.toRow,
            move.toCol,
          );
        nextPieces = nextPieces.filter(
          (piece) => !(piece.row === move.toRow && piece.col === move.toCol),
        );
        const fallbackCapturedCode = toBasePieceCode(move.capturedPieceCode);
        if (captureOwnPiece) {
          // 雲の味方捕獲は自分の手駒に加える。
          const capturedCode = resolveCapturedHandCode(captured, fallbackCapturedCode);
          if (capturedCode) {
            hands = addHandPiece(hands, actorSide, capturedCode, 1);
          }
        } else if (chrysRevivalActive) {
          removeChrysanthemumRevivalAtCell(
            current.boardState as Record<string, unknown> | undefined,
            captured.side,
            move.toRow,
            move.toCol,
          );
          if (!isSpiritPiece(captured)) {
            const capturedCode = resolveCapturedHandCode(captured, fallbackCapturedCode);
            if (capturedCode) {
              hands = addHandPiece(hands, captured.side, capturedCode, 1);
            }
          }
        } else {
          const isSpiritCaptured = isSpiritPiece(captured);
          const capturedBaseCode = toBasePieceCode(captured.pieceCode);
          const isStarCaptured = capturedBaseCode === 'HOS' || captured.char === '星';
          if (isSpiritCaptured) {
            // 霊: 相手に取られても手駒に加わらず消滅する。
          } else if (isVanishOnCapturePiece(captured)) {
            // K 博士・実・異: 手駒に加えない。
          } else if (isStarCaptured) {
            const procChance = 0.4;
            const roll = Math.random();
            const triggered = roll <= procChance;
            if (triggered) {
              starReturnProcTriggered = true;
              hands = addHandPiece(hands, captured.side, 'HOS', 1);
            } else {
              const capturedCode = resolveCapturedHandCode(captured, fallbackCapturedCode);
              if (capturedCode) {
                const handSide = targetHandSideForCapturedPiece(
                  actorSide,
                  captured.side,
                  consumeReiSubstitute,
                );
                hands = addHandPiece(hands, handSide, capturedCode, 1);
              }
            }
          } else {
            const capturedCode = resolveCapturedHandCode(captured, fallbackCapturedCode);
            if (capturedCode) {
              const handSide = targetHandSideForCapturedPiece(
                actorSide,
                captured.side,
                consumeReiSubstitute,
              );
              hands = addHandPiece(hands, handSide, capturedCode, 1);
            }
          }
        }
        if (consumeReiSubstitute && captured && !chrysRevivalActive) {
          nextPieces = removeFirstReiRitualFromSide(nextPieces, captured.side);
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
    if (!rebuffKboss && !shieldAbortedMove) {
      const moving = nextPieces[movingIndexAfterCapture];
      const nextPromoted = move.promote || moving.promoted === true;
      const resolvedChar = pieceChar(moving.pieceCode, nextPromoted);
      // pieceCode が剣と共有（SWORD 等）のとき pieceChar が「剣」になり、刀の intrinsic が死ぬのを防ぐ。銃も同様。
      const nextChar =
        isKatanaPieceForApply(moving) || isGunPieceForApply(moving)
          ? moving.char
          : resolvedChar === '?' ||
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
    } else {
      movedPieceAfterApply = nextPieces[movingIndexAfterCapture] ?? null;
    }

    // 銃の貫通手で敵を取った（中点のみ／先のみ／両方）ときスキル発動扱いにする。
    if (gunPen != null && isGunPieceForApply(movingPiece) && didCapture) {
      intrinsicCombatSkillTriggered = true;
    }

    if (isGunPieceForApply(movingPiece)) {
      gunApplyDebugLog({
        phase: 'post-board-update',
        didCapture,
        rebuffKboss,
        hadGunPenetration: gunPen != null,
        intrinsicCombatSkillFlag: gunPen != null && isGunPieceForApply(movingPiece) && didCapture,
        landing: movedPieceAfterApply
          ? { row: movedPieceAfterApply.row, col: movedPieceAfterApply.col }
          : null,
      });
    }
  }

  let winnerSide: Side | null = null;
  if (!hasKing(nextPieces, 'player')) {
    winnerSide = 'enemy';
  } else if (!hasKing(nextPieces, 'enemy')) {
    winnerSide = 'player';
  }

  if (otsuFollowupBefore && didCapture) {
    throw new Error('otsu followup cannot capture');
  }
  let grantsOtsuFollowup = false;
  if (
    !otsuFollowupBefore &&
    movedByOtsu &&
    didCapture &&
    !shieldAbortedMove &&
    movedPieceAfterApply
  ) {
    const followupPreview = createPosition({
      pieces: nextPieces,
      hands,
      sideToMove: actorSide,
      moveCount: current.moveCount,
      pieceCatalog: input.pieceCatalog,
    });
    followupPreview.boardState = {
      ...(current.boardState ?? {}),
      ...(followupPreview.boardState ?? {}),
    };
    const previewBoard = (followupPreview.boardState ?? {}) as Record<string, unknown>;
    const previewSkillStateRaw = (previewBoard.skill_state ?? previewBoard.skillState) as
      | Record<string, unknown>
      | undefined;
    const previewSkillState =
      previewSkillStateRaw && typeof previewSkillStateRaw === 'object'
        ? { ...previewSkillStateRaw }
        : {};
    const previewStatusesRaw = (previewSkillState.piece_statuses ??
      previewSkillState.pieceStatuses) as unknown;
    const previewStatuses = Array.isArray(previewStatusesRaw) ? [...previewStatusesRaw] : [];
    previewStatuses.push({
      side: actorSide,
      row: movedPieceAfterApply.row,
      col: movedPieceAfterApply.col,
      status_type: 'otsu_followup',
      remaining_turns: 1,
    });
    (previewSkillState as Record<string, unknown>).piece_statuses = previewStatuses;
    previewBoard.skill_state = previewSkillState;
    followupPreview.boardState = previewBoard;
    grantsOtsuFollowup =
      generateLegalMoves({ position: followupPreview, pieceCatalog: input.pieceCatalog }).legalMoves
        .length > 0;
  }
  // 盾で取りが無効化されても着手は1手として消化し、攻撃側の手番を終える。
  const turnAdvanced = !grantsOtsuFollowup;
  const applyLandingDerivedEffects = !shieldAbortedMove;
  const nextSide: Side = turnAdvanced ? (actorSide === 'player' ? 'enemy' : 'player') : actorSide;
  const nextMoveCount = current.moveCount + (turnAdvanced ? 1 : 0);
  let nextPosition = createPosition({
    pieces: nextPieces,
    hands,
    sideToMove: nextSide,
    moveCount: nextMoveCount,
    pieceCatalog: input.pieceCatalog,
  });
  nextPosition.boardState = {
    ...(current.boardState ?? {}),
    ...(nextPosition.boardState ?? {}),
  };

  if (turnAdvanced) {
    // 既存ハザードの残りターンを進める。
    tickSkillStateDurations(nextPosition);
    if (applyLandingDerivedEffects) {
      // 着手によるスキル効果（移動制限・毒マスなど）を反映（実際にマスへ入ったときのみ）。
      applyMoveSkillEffects({
        position: nextPosition,
        move,
        actorSide,
        movedPiece: movedPieceAfterApply,
        pieces: nextPieces,
        didCapture,
      });
    }
    hands = nextPosition.hands;
  }

  let movedPieceForIntrinsic = movedPieceAfterApply;
  if (move.fromRow != null && move.fromCol != null && !move.dropPieceCode) {
    const refreshed = nextPieces.find(
      (p) => p.side === actorSide && p.row === move.toRow && p.col === move.toCol,
    );
    if (refreshed) movedPieceForIntrinsic = refreshed;
  }

  if (turnAdvanced && applyLandingDerivedEffects) {
    const intrinsicKatana = applyIntrinsicKatanaSideCaptures({
      boardState: current.boardState as Record<string, unknown> | undefined,
      nextPieces,
      hands,
      actorSide,
      didCapture,
      movedPiece: movedPieceForIntrinsic,
      move,
    });
    nextPieces = intrinsicKatana.nextPieces;
    hands = intrinsicKatana.hands;
    if (intrinsicKatana.starReturnProcTriggered) starReturnProcTriggered = true;
    if (intrinsicKatana.didSideSweep) {
      intrinsicCombatSkillTriggered = true;
    }
  }

  // 銃の「前方2マスへ進むと1マス目・2マス目の敵を同時に取る」は本関数前半の gun penetration（中点＋着地）で処理する。
  nextPosition.hands = hands;

  // 毒マスへ侵入した駒は消滅。
  if (
    turnAdvanced &&
    applyLandingDerivedEffects &&
    move.notation !== 'time_skill_only' &&
    move.notation !== 'house_skill_only'
  ) {
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
    moveCount: nextMoveCount,
    pieceCatalog: input.pieceCatalog,
  });
  recomputedPosition.boardState = {
    ...(recomputedPosition.boardState ?? {}),
    ...(nextPosition.boardState ?? {}),
  };
  const skillStateRaw =
    (recomputedPosition.boardState as Record<string, unknown>).skill_state ??
    (recomputedPosition.boardState as Record<string, unknown>).skillState;
  const skillState =
    skillStateRaw && typeof skillStateRaw === 'object'
      ? { ...(skillStateRaw as Record<string, unknown>) }
      : {};
  // 行動後、移動した駒に付いている座標依存ステータスを着地点へ追従させる。
  if (
    turnAdvanced &&
    applyLandingDerivedEffects &&
    move.fromRow != null &&
    move.fromCol != null &&
    movedPieceAfterApply
  ) {
    const prev = (skillState.piece_statuses ?? skillState.pieceStatuses) as unknown;
    const list = Array.isArray(prev) ? [...prev] : [];
    const relocated = list.map((raw) => {
      const st = (raw ?? {}) as Record<string, unknown>;
      const side = String(st.side ?? 'player') === 'enemy' ? 'enemy' : 'player';
      const row = Number(st.row);
      const col = Number(st.col);
      if (
        side === actorSide &&
        Number.isFinite(row) &&
        Number.isFinite(col) &&
        row === move.fromRow &&
        col === move.fromCol
      ) {
        return { ...st, row: movedPieceAfterApply.row, col: movedPieceAfterApply.col };
      }
      return st;
    });
    (skillState as Record<string, unknown>).piece_statuses = relocated;
  }
  // 病: 取った駒（攻撃側）を 3 ターン行動不能にする。
  if (
    turnAdvanced &&
    applyLandingDerivedEffects &&
    diseaseCapturedByActor &&
    movedPieceAfterApply
  ) {
    const prev = (skillState.piece_statuses ?? skillState.pieceStatuses) as unknown;
    const arr = Array.isArray(prev) ? [...prev] : [];
    arr.push({
      row: movedPieceAfterApply.row,
      col: movedPieceAfterApply.col,
      side: actorSide,
      status_type: 'stun',
      remaining_turns: 3,
    });
    (skillState as Record<string, unknown>).piece_statuses = arr;
  }
  // 死: 取った駒（攻撃側）に呪いを付与。5ターン後に消滅する。
  if (turnAdvanced && applyLandingDerivedEffects && deathCapturedByActor && movedPieceAfterApply) {
    const prev = (skillState.piece_statuses ?? skillState.pieceStatuses) as unknown;
    const arr = Array.isArray(prev) ? [...prev] : [];
    arr.push({
      row: movedPieceAfterApply.row,
      col: movedPieceAfterApply.col,
      side: actorSide,
      status_type: 'death_curse',
      remaining_turns: 5,
    });
    (skillState as Record<string, unknown>).piece_statuses = arr;
  }
  // 淵: 取った駒（攻撃側）を 3 ターン行動不能にする（紫オーラ表示は UI 側で abyss_stun を参照）。
  if (turnAdvanced && applyLandingDerivedEffects && abyssCapturedByActor && movedPieceAfterApply) {
    const prev = (skillState.piece_statuses ?? skillState.pieceStatuses) as unknown;
    const arr = Array.isArray(prev) ? [...prev] : [];
    arr.push({
      row: movedPieceAfterApply.row,
      col: movedPieceAfterApply.col,
      side: actorSide,
      status_type: 'abyss_stun',
      remaining_turns: 3,
    });
    (skillState as Record<string, unknown>).piece_statuses = arr;
  }
  // 穴: 取られたとき、その位置の周囲8マスの空きマスを4ターン侵入不可（バツマス）にする。
  if (turnAdvanced && applyLandingDerivedEffects && capturedHoleCellsByActor.length > 0) {
    const hazardsRaw = (skillState.board_hazards ?? skillState.boardHazards) as unknown;
    const hazards = Array.isArray(hazardsRaw) ? [...hazardsRaw] : [];
    const occupied = new Set(nextPieces.map((p) => `${p.row}:${p.col}`));
    for (const center of capturedHoleCellsByActor) {
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (dr === 0 && dc === 0) continue;
          const row = center.row + dr;
          const col = center.col + dc;
          if (row < 0 || row > 8 || col < 0 || col > 8) continue;
          if (occupied.has(`${row}:${col}`)) continue;
          for (let i = hazards.length - 1; i >= 0; i -= 1) {
            const raw = hazards[i] as Record<string, unknown>;
            const type = String(raw.hazard_type ?? raw.hazardType ?? '');
            const hRow = Number(raw.row);
            const hCol = Number(raw.col);
            if (type === 'pit_cell' && hRow === row && hCol === col) {
              hazards.splice(i, 1);
            }
          }
          hazards.push({
            row,
            col,
            hazard_type: 'pit_cell',
            affects_side: 'both',
            remaining_turns: 4,
          });
        }
      }
    }
    (skillState as Record<string, unknown>).board_hazards = hazards;
  }
  {
    const rawStatuses = (skillState.piece_statuses ?? skillState.pieceStatuses) as unknown;
    const statuses = Array.isArray(rawStatuses) ? [...rawStatuses] : [];
    const withoutOtsuFollowup = statuses.filter((raw) => {
      const st = (raw ?? {}) as Record<string, unknown>;
      const statusType = String(st.status_type ?? st.statusType ?? '');
      if (statusType !== 'otsu_followup') return true;
      const side = String(st.side ?? 'player') === 'enemy' ? 'enemy' : 'player';
      return side !== actorSide;
    });
    if (grantsOtsuFollowup && movedPieceAfterApply) {
      withoutOtsuFollowup.push({
        side: actorSide,
        row: movedPieceAfterApply.row,
        col: movedPieceAfterApply.col,
        status_type: 'otsu_followup',
        remaining_turns: 1,
      });
    }
    (skillState as Record<string, unknown>).piece_statuses = withoutOtsuFollowup;
  }
  if (turnAdvanced && applyLandingDerivedEffects && movedPieceAfterApply) {
    const key = actorSide === 'player' ? 'last_player_moved_piece' : 'last_enemy_moved_piece';
    skillState[key] = {
      side: actorSide,
      row: movedPieceAfterApply.row,
      col: movedPieceAfterApply.col,
      pieceCode: movedPieceAfterApply.pieceCode,
      char: movedPieceAfterApply.char,
      promoted: movedPieceAfterApply.promoted === true,
    };
  }
  (recomputedPosition.boardState as Record<string, unknown>).skill_state = skillState;
  nextPosition = recomputedPosition;
  let deathCurseVanishedAny = false;
  {
    const boardState = (nextPosition.boardState ?? {}) as Record<string, unknown>;
    const skillStateRaw = (boardState.skill_state ?? boardState.skillState) as
      | Record<string, unknown>
      | undefined;
    const statusesRaw = (skillStateRaw?.piece_statuses ?? skillStateRaw?.pieceStatuses) as unknown;
    const statuses = Array.isArray(statusesRaw) ? statusesRaw : [];
    const shouldVanish = new Set<string>();
    const survivors: Record<string, unknown>[] = [];
    for (const raw of statuses) {
      const st = (raw ?? {}) as Record<string, unknown>;
      const statusType = String(st.status_type ?? st.statusType ?? '');
      const side = String(st.side ?? 'player') === 'enemy' ? 'enemy' : 'player';
      const row = Number(st.row);
      const col = Number(st.col);
      const remaining = Number(st.remaining_turns ?? st.remainingTurns ?? 0);
      if (
        statusType === 'death_curse' &&
        Number.isFinite(row) &&
        Number.isFinite(col) &&
        remaining <= 0
      ) {
        shouldVanish.add(`${side}:${row}:${col}`);
        continue;
      }
      survivors.push(st);
    }
    if (shouldVanish.size > 0) {
      deathCurseVanishedAny = true;
      nextPieces = nextPieces.filter((p) => !shouldVanish.has(`${p.side}:${p.row}:${p.col}`));
    }
    if (skillStateRaw) {
      (skillStateRaw as Record<string, unknown>).piece_statuses = survivors;
      (boardState as Record<string, unknown>).skill_state = skillStateRaw;
    }
  }
  if (deathCurseVanishedAny) {
    const syncedHands = normalizeHandsStateKeys({
      player: sanitizeHandsBag(nextPosition.hands.player),
      enemy: sanitizeHandsBag(nextPosition.hands.enemy),
    });
    const vanishedSyncedPosition = createPosition({
      pieces: nextPieces,
      hands: syncedHands,
      sideToMove: nextSide,
      moveCount: nextMoveCount,
      pieceCatalog: input.pieceCatalog,
    });
    vanishedSyncedPosition.boardState = {
      ...(vanishedSyncedPosition.boardState ?? {}),
      ...((nextPosition.boardState as Record<string, unknown> | undefined) ?? {}),
      pieces: nextPieces.map((piece) => ({ ...piece })),
    };
    nextPosition = vanishedSyncedPosition;
  }

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
      shieldAbortedMove ||
      intrinsicCombatSkillTriggered ||
      starReturnProcTriggered ||
      move.notation === 'time_skill' ||
      move.notation === 'time_skill_only' ||
      move.notation === 'house_skill_only' ||
      Boolean(move.notation && move.notation !== 'time_normal' && !/^\d/.test(move.notation)),
    turnConsumed: turnAdvanced,
    position: nextPosition,
    game,
  };
}
