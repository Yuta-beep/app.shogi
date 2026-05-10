import {
  canDropPiece,
  canPromoteByMove,
  capturedToHandPieceCode,
  getLegalTargetsFromVectors,
  mustPromoteByMove,
  type Side,
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

/** カタログ欠損時でも銃・刀の合法手を生成するためのプレースホルダー */
const MINIMAL_SPECIAL_PIECE_DEF: AiPieceDefinition = {
  char: '',
  name: '',
  unlock: '',
  desc: '',
  skill: '',
  move: '',
  moveVectors: [],
  isRepeatable: false,
};

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

function normKanjiForEngineRules(ch: string): string {
  try {
    return ch.normalize('NFKC');
  } catch {
    return ch;
  }
}

function isOpaquePieceInstanceId(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^piece_[a-z0-9]+$/i.test(value.trim());
}

/** 「刀」名刀のみ。聖剣「剣」は従来の sword パターンのまま。 */
function isKatanaPiece(piece: AiBoardPiece): boolean {
  if (normKanjiForEngineRules(piece.char) === '剣') return false;
  if (normKanjiForEngineRules(piece.char) === '刀') return true;
  const code = toBasePieceCode(piece.pieceCode);
  return code === 'SWORD' || code === 'KATANA';
}

function isGunPiece(piece: AiBoardPiece): boolean {
  if (normKanjiForEngineRules(piece.char) === '銃') return true;
  const code = toBasePieceCode(piece.pieceCode);
  if (code === 'GUN') return true;
  return false;
}

function normalizedPieceCodeUpper(piece: AiBoardPiece): string {
  return (toBasePieceCode(piece.pieceCode) ?? piece.pieceCode ?? '').toUpperCase();
}

function isRedOniPiece(piece: AiBoardPiece): boolean {
  return normalizedPieceCodeUpper(piece) === 'REDONI';
}

function isBlueOniPiece(piece: AiBoardPiece): boolean {
  return normalizedPieceCodeUpper(piece) === 'BLUEONI';
}

function isBlackOniPiece(piece: AiBoardPiece): boolean {
  return normalizedPieceCodeUpper(piece) === 'BLACKONI';
}

function isAnyOniVariantPiece(piece: AiBoardPiece): boolean {
  return isRedOniPiece(piece) || isBlueOniPiece(piece) || isBlackOniPiece(piece);
}

function isDeathPieceForLegal(piece: AiBoardPiece): boolean {
  const base = toBasePieceCode(piece.pieceCode);
  return base === 'DEATH' || piece.char === '死';
}

function isSoulPieceForLegal(piece: AiBoardPiece): boolean {
  const base = toBasePieceCode(piece.pieceCode);
  return base === 'SOUL' || piece.char === '魂';
}

function hasSoulOnBoardForSide(pieces: AiBoardPiece[], side: Side): boolean {
  return pieces.some((p) => p.side === side && isSoulPieceForLegal(p));
}

function pieceRawUpperForLegal(piece: AiBoardPiece): string {
  return (piece.pieceCode ?? '').toUpperCase();
}

/** 不透明 pieceId でも盤上移動できるよう識別（カタログ moveVectors が空のときエンジンが補う） */
function isBeastPieceForLegal(piece: AiBoardPiece): boolean {
  if (normKanjiForEngineRules(piece.char) === '獣') return true;
  const raw = pieceRawUpperForLegal(piece);
  if (raw.includes('BEAST')) return true;
  if (raw.includes('05E4EFB89DAE')) return true;
  const b = toBasePieceCode(piece.pieceCode);
  return b === 'BEAST';
}

function isBirdPieceForLegal(piece: AiBoardPiece): boolean {
  if (normKanjiForEngineRules(piece.char) === '禽') return true;
  const raw = pieceRawUpperForLegal(piece);
  if (raw.includes('BIRD')) return true;
  if (raw.includes('29ECAB1EF3C3')) return true;
  const b = toBasePieceCode(piece.pieceCode);
  return b === 'BIRD';
}

function gunPieceDebugLog(label: string, payload: Record<string, unknown>): void {
  void label;
  void payload;
}

function isBookPiece(piece: AiBoardPiece): boolean {
  const ch = normKanjiForEngineRules(piece.char);
  if (ch === '書') return true;
  const code = toBasePieceCode(piece.pieceCode);
  return code === 'BOOK';
}

/** 聖者「聖」— 嶺(REI) とは別物 */
function isSaintPieceForLegal(piece: AiBoardPiece): boolean {
  if (normKanjiForEngineRules(piece.char) === '聖') return true;
  const raw = (piece.pieceCode ?? '').toUpperCase();
  if (raw.includes('A3BAB6C13DC7')) return true;
  const code = toBasePieceCode(piece.pieceCode);
  return code === 'SAINT';
}

function isMedicinePieceForLegal(piece: AiBoardPiece): boolean {
  if (normKanjiForEngineRules(piece.char) === '薬') return true;
  const raw = (piece.pieceCode ?? '').toUpperCase();
  // piece-image-registry の piece_3e3ef463eadc（薬）
  if (raw.includes('3E3EF463EADC')) return true;
  const code = toBasePieceCode(piece.pieceCode);
  return code === 'MEDICINE';
}

/** この駒が前後左右に味方の「聖」と隣接しているとき、移動ベクトル各方向の maxStep を +1 */
function hasOrthogonalAdjacentAllySaint(pieces: AiBoardPiece[], piece: AiBoardPiece): boolean {
  const ortho: ReadonlyArray<{ dr: number; dc: number }> = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];
  for (const { dr, dc } of ortho) {
    const r = piece.row + dr;
    const c = piece.col + dc;
    const ally = pieces.find((p) => p.row === r && p.col === c && p.side === piece.side);
    if (ally && isSaintPieceForLegal(ally)) return true;
  }
  return false;
}

/** この駒が周囲 8 マスに味方の「薬」と隣接しているとき、移動ベクトル各方向の maxStep を +1 */
function hasAdjacentAllyMedicine(pieces: AiBoardPiece[], piece: AiBoardPiece): boolean {
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const r = piece.row + dr;
      const c = piece.col + dc;
      const ally = pieces.find((p) => p.row === r && p.col === c && p.side === piece.side);
      if (ally && isMedicinePieceForLegal(ally)) return true;
    }
  }
  return false;
}

function applySaintAdjacentMoveRangeBuff(
  vectors: AiPieceDefinition['moveVectors'],
): AiPieceDefinition['moveVectors'] {
  return vectors.map((v) => ({
    ...v,
    maxStep: Math.max(1, (Number(v.maxStep) || 1) + 1),
  }));
}

function applyMedicineAdjacentMoveRangeBuff(
  vectors: AiPieceDefinition['moveVectors'],
): AiPieceDefinition['moveVectors'] {
  return vectors.map((v) => ({
    ...v,
    maxStep: Math.max(1, (Number(v.maxStep) || 1) + 1),
  }));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function lastMovedPieceForBook(
  position: AiBattlePosition,
  piece: AiBoardPiece,
): AiBoardPiece | null {
  const boardState = asRecord(position.boardState);
  const skillState = asRecord(boardState?.skill_state ?? boardState?.skillState);
  // 「書」は“自分が直前に動かした駒”の移動範囲を継承する。
  // 評価対象の駒 side を基準に参照することで、敵駒プレビュー時でも意図どおり解決する。
  const key = piece.side === 'player' ? 'last_player_moved_piece' : 'last_enemy_moved_piece';
  const raw = asRecord(skillState?.[key]);
  if (!raw) return null;
  const row = typeof raw.row === 'number' ? raw.row : null;
  const col = typeof raw.col === 'number' ? raw.col : null;
  if (row == null || col == null) return null;
  const side = raw.side === 'enemy' ? 'enemy' : 'player';
  if (side !== piece.side) return null;
  const pieceCode = typeof raw.pieceCode === 'string' ? raw.pieceCode : null;
  const char = typeof raw.char === 'string' ? raw.char : '';
  const copiedMoveVectors = Array.isArray(raw.copiedMoveVectors) ? raw.copiedMoveVectors : null;
  return {
    side,
    row,
    col,
    pieceCode,
    char,
    promoted: raw.promoted === true,
    ...(copiedMoveVectors ? { copiedMoveVectors } : {}),
    imageSignedUrl: null,
  };
}

/** `CHAR_TO_CODE` に無い幻駒は、カタログの漢字→pieceCode で着手の pieceCode を決める（刀が歩になる不具合の防止）。 */
function resolvePieceCodeForLegalMove(piece: AiBoardPiece, lookups: AiPieceLookups): string {
  const ch = normKanjiForEngineRules(piece.char);
  if (ch === '剣') return 'HOLY_SWORD';
  if (ch === '刀') return 'SWORD';
  const direct = toBasePieceCode(piece.pieceCode);
  if (direct && !isOpaquePieceInstanceId(direct)) return direct;
  const def = lookups.pieceDefsByChar[piece.char] ?? lookups.pieceDefsByChar[ch];
  const fromCatalog = toBasePieceCode(def?.pieceCode ?? null);
  if (fromCatalog && !isOpaquePieceInstanceId(fromCatalog)) return fromCatalog;
  if (ch === '銃') return 'GUN';
  if (ch === '書') return 'BOOK';
  if (ch === '封') return 'SEAL';
  const rawUp = (piece.pieceCode ?? '').toUpperCase();
  if (ch === '獣' || rawUp.includes('05E4EFB89DAE') || rawUp.includes('BEAST')) {
    return 'BEAST';
  }
  if (ch === '禽' || rawUp.includes('29ECAB1EF3C3') || rawUp.includes('BIRD')) {
    return 'BIRD';
  }
  const legacy = toBasePieceCode(CHAR_TO_CODE[piece.char]);
  if (legacy) return legacy;
  return 'FU';
}

function resolveCapturedPieceCodeForLegalMove(
  piece: AiBoardPiece | null | undefined,
): string | null {
  if (!piece) return null;
  const ch = normKanjiForEngineRules(piece.char);
  if (ch === '剣') return 'HOLY_SWORD';
  if (ch === '刀') return 'SWORD';
  if (ch === '盾') return 'SHIELD';
  return (
    toBasePieceCode(capturedToHandPieceCode(piece)) ?? toBasePieceCode(piece.pieceCode ?? null)
  );
}

function resolvePieceDefForBookCopy(
  piece: AiBoardPiece,
  lookups: AiPieceLookups,
): AiPieceDefinition | null {
  const ch = normKanjiForEngineRules(piece.char);
  const canonicalFromChar = toBasePieceCode(CHAR_TO_CODE[ch] ?? null);
  if (canonicalFromChar) {
    const byCanonical = lookups.pieceDefsByCode[canonicalFromChar];
    if (byCanonical) return byCanonical;
  }
  const direct = resolvePieceDef(piece, lookups);
  if (direct && Array.isArray(direct.moveVectors) && direct.moveVectors.length > 0) {
    return direct;
  }
  const code = resolvePieceCodeForLegalMove(piece, lookups);
  const byCode = lookups.pieceDefsByCode[code];
  if (byCode) return byCode;
  return lookups.pieceDefsByChar[piece.char] ?? lookups.pieceDefsByChar[ch] ?? null;
}

function isKingLikePieceForBook(piece: AiBoardPiece): boolean {
  const ch = normKanjiForEngineRules(piece.char);
  if (ch === '王' || ch === '玉') return true;
  const code = toBasePieceCode(piece.pieceCode);
  return code === 'OU' || code === 'KING';
}

function isArmorPiece(piece: AiBoardPiece): boolean {
  const code = toBasePieceCode(piece.pieceCode);
  return piece.char === '鎧' || code === 'ARMOR';
}

/** 銃: 前方のマス（1マス目）の行。player は盤上で row が小さい方が前。 */
function gunForwardRowDelta(side: 'player' | 'enemy'): number {
  return side === 'player' ? -1 : 1;
}

function kbossEffectiveLivesForGunFilter(piece: AiBoardPiece): number {
  const v = piece.kbossLivesRemaining;
  if (v === 1 || v === 2) return v;
  return 2;
}

function isKbossPieceForGun(piece: AiBoardPiece): boolean {
  if (piece.char === 'K') return true;
  return toBasePieceCode(piece.pieceCode) === 'KBOSS';
}

/** 中間マスの味方が銃の直進・貫通を完全に塞ぐか（王・鎧・K博士）。それ以外の味方は盤データの side 重複でも貫通可能。 */
function isGunFullyBlockingAllyOnMid(p: AiBoardPiece, gun: AiBoardPiece): boolean {
  if (p.side !== gun.side) return false;
  return isKingPiece(p) || isArmorPiece(p) || isKbossPieceForGun(p);
}

/** 銃の「前方ちょうど2マス」への直線移動（貫通取り用）。同一列で2マス先のみ。 */
function gunForwardTwoLandingCoords(
  piece: AiBoardPiece,
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
): { midRow: number; midCol: number } | null {
  if (!isGunPiece(piece)) return null;
  if (fromCol !== toCol) return null;
  const d = gunForwardRowDelta(piece.side);
  if (toRow - fromRow !== 2 * d) return null;
  return { midRow: fromRow + d, midCol: fromCol };
}

function generateGunForwardTargets(
  occupancy: OccupancyMap,
  piece: AiBoardPiece,
): { row: number; col: number }[] {
  const out: { row: number; col: number }[] = [];
  const seen = new Set<string>();
  const d = gunForwardRowDelta(piece.side);
  const fromRow = piece.row;
  const fromCol = piece.col;
  const r1 = fromRow + d;
  const c1 = fromCol;
  const r2 = fromRow + 2 * d;
  const c2 = fromCol;
  const r1Valid = r1 >= 0 && r1 <= 8;
  const r2Valid = r2 >= 0 && r2 <= 8;
  let p1: AiBoardPiece | null = null;
  let p2: AiBoardPiece | null = null;
  const snap = (p: AiBoardPiece | null) =>
    p
      ? {
          side: p.side,
          char: p.char,
          code: p.pieceCode,
          rock: isRockObstacleVirtualPiece(p),
        }
      : null;
  const logBlock = (reason: string, extra: Record<string, unknown> = {}) => {
    if (!isGunPiece(piece)) return;
    gunPieceDebugLog(`前方2マス: ${reason}`, {
      from: [fromRow, fromCol],
      side: piece.side,
      dRow: d,
      r1,
      r2,
      c: fromCol,
      p1: snap(p1),
      p2: snap(p2),
      ...extra,
    });
  };

  if (!r1Valid) {
    logBlock('r1 が盤外', { p1: null, p2: null });
    return out;
  }

  p1 = findPieceAtFast(occupancy, r1, c1);
  p2 = r2Valid ? findPieceAtFast(occupancy, r2, c2) : null;

  if (p1 && isRockObstacleVirtualPiece(p1)) {
    logBlock('1マス目が岩');
    return out;
  }
  if (r2Valid && p2 && isRockObstacleVirtualPiece(p2)) {
    logBlock('2マス目が岩');
    return out;
  }

  if (p1 && isGunFullyBlockingAllyOnMid(p1, piece)) {
    logBlock('1マス目が味方（王・鎧・K でブロック）');
    return out;
  }
  if (r2Valid && p2 && p2.side === piece.side) {
    logBlock('2マス目が味方');
    return out;
  }
  if (p1 && (p1.char === '王' || p1.char === '玉' || toBasePieceCode(p1.pieceCode) === 'OU')) {
    logBlock('1マス目が王/玉');
    return out;
  }
  if (
    r2Valid &&
    p2 &&
    (p2.char === '王' || p2.char === '玉' || toBasePieceCode(p2.pieceCode) === 'OU')
  ) {
    logBlock('2マス目が王/玉');
    return out;
  }
  if (p1 && isArmorPiece(p1)) {
    logBlock('1マス目が鎧');
    return out;
  }
  if (r2Valid && p2 && isArmorPiece(p2)) {
    logBlock('2マス目が鎧');
    return out;
  }
  if (p1 && isKbossPieceForGun(p1) && kbossEffectiveLivesForGunFilter(p1) > 1) {
    logBlock('1マス目がK博士耐久2');
    return out;
  }

  const push = (row: number, col: number) => {
    const key = `${row}:${col}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ row, col });
  };

  const finishForward = (): { row: number; col: number }[] => {
    if (isGunPiece(piece)) {
      gunPieceDebugLog('前方2マス: 結果', {
        from: [fromRow, fromCol],
        side: piece.side,
        targets: out,
        p1: snap(p1),
        p2: snap(p2),
        r1,
        r2,
      });
    }
    return out;
  };

  if (!p1 && (!r2Valid || !p2)) {
    push(r1, c1);
    if (r2Valid) push(r2, c2);
    return finishForward();
  }
  if (!p1 && r2Valid && p2 && p2.side !== piece.side) {
    push(r2, c2);
    return finishForward();
  }
  if (p1 && (!r2Valid || !p2)) {
    if (r2Valid) push(r2, c2);
    return finishForward();
  }
  if (p1 && r2Valid && p2 && p2.side !== piece.side) {
    push(r2, c2);
    return finishForward();
  }
  return finishForward();
}

/** 銃: 斜め後ろ最大2マス（中間に味方・王・鎧・K耐久2はブロック）。前方2マス貫通と同じルールで2マス目着地を生成。 */
function generateGunBackDiagonalTargets(
  occupancy: OccupancyMap,
  piece: AiBoardPiece,
): { row: number; col: number }[] {
  const out: { row: number; col: number }[] = [];
  const seen = new Set<string>();
  const push = (row: number, col: number) => {
    const key = `${row}:${col}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ row, col });
  };

  const dirs =
    piece.side === 'player'
      ? ([
          [1, -1],
          [1, 1],
        ] as const)
      : ([
          [-1, -1],
          [-1, 1],
        ] as const);

  for (const [ud, vd] of dirs) {
    const r1 = piece.row + ud;
    const c1 = piece.col + vd;
    const r2 = piece.row + 2 * ud;
    const c2 = piece.col + 2 * vd;
    const r1Valid = r1 >= 0 && r1 <= 8 && c1 >= 0 && c1 <= 8;
    const r2Valid = r2 >= 0 && r2 <= 8 && c2 >= 0 && c2 <= 8;
    if (!r1Valid) continue;

    const p1 = findPieceAtFast(occupancy, r1, c1);
    const p2 = r2Valid ? findPieceAtFast(occupancy, r2, c2) : null;

    if (p1 && isRockObstacleVirtualPiece(p1)) continue;
    if (r2Valid && p2 && isRockObstacleVirtualPiece(p2)) continue;

    if (p1 && isGunFullyBlockingAllyOnMid(p1, piece)) continue;
    if (r2Valid && p2 && p2.side === piece.side) continue;
    if (p1 && isKingPiece(p1)) continue;
    if (r2Valid && p2 && isKingPiece(p2)) continue;
    if (p1 && isArmorPiece(p1)) continue;
    if (r2Valid && p2 && isArmorPiece(p2)) continue;
    if (p1 && isKbossPieceForGun(p1) && kbossEffectiveLivesForGunFilter(p1) > 1) continue;

    if (!p1 && (!r2Valid || !p2)) {
      push(r1, c1);
      if (r2Valid) push(r2, c2);
      continue;
    }
    if (!p1 && r2Valid && p2 && p2.side !== piece.side) {
      push(r2, c2);
      continue;
    }
    if (p1 && (!r2Valid || !p2)) {
      if (r2Valid) push(r2, c2);
      continue;
    }
    if (p1 && r2Valid && p2 && p2.side !== piece.side) {
      push(r2, c2);
    }
  }
  return out;
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

function isRockObstacleVirtualPiece(piece: AiBoardPiece): boolean {
  return piece.pieceCode === 'ROCK_OBSTACLE' || piece.char === '岩障';
}

/** 岩仮想駒は実駒のいないマスのみ。従来は配列末尾に岩を足して Map が後勝ちし、同座標の敵を「味方の岩」に潰していた。 */
function buildPathPiecesWithRockObstaclesOnEmptyCells(
  pieces: AiBoardPiece[],
  skillView: SkillRuntimeView,
  rockSide: Side,
): AiBoardPiece[] {
  const baseOcc = buildOccupancyMap(pieces);
  const out: AiBoardPiece[] = [...pieces];
  for (const key of skillView.rockObstacleCells) {
    if (baseOcc.has(key)) continue;
    const [rowRaw, colRaw] = key.split(':');
    const row = Number(rowRaw);
    const col = Number(colRaw);
    if (!Number.isInteger(row) || !Number.isInteger(col)) continue;
    out.push({
      side: rockSide,
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

function normalizeVectorsForOniVariants(
  piece: AiBoardPiece,
  vectors: AiPieceDefinition['moveVectors'],
): AiPieceDefinition['moveVectors'] {
  if (isRedOniPiece(piece)) {
    return [
      { dx: 0, dy: -1, maxStep: 1 },
      { dx: -1, dy: 0, maxStep: 1 },
      { dx: 1, dy: 0, maxStep: 1 },
      { dx: 0, dy: 1, maxStep: 1 },
    ];
  }
  if (isBlueOniPiece(piece)) {
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
  if (isBlackOniPiece(piece)) {
    return [
      { dx: 0, dy: -1, maxStep: 8 },
      { dx: -1, dy: 0, maxStep: 8 },
      { dx: 1, dy: 0, maxStep: 8 },
      { dx: 0, dy: 1, maxStep: 8 },
    ];
  }
  return vectors;
}

function normalizeVectorsForDeath(
  piece: AiBoardPiece,
  vectors: AiPieceDefinition['moveVectors'],
): AiPieceDefinition['moveVectors'] {
  if (!isDeathPieceForLegal(piece)) return vectors;
  return [
    { dx: 0, dy: -1, maxStep: 1 },
    { dx: 0, dy: 1, maxStep: 1 },
    { dx: -1, dy: 1, maxStep: 1 },
    { dx: 1, dy: 1, maxStep: 1 },
  ];
}

/** 獣: 桂馬跳び＋その他1マス（m_piece_pattern_vector の beast と整合） */
function normalizeVectorsForBeast(
  piece: AiBoardPiece,
  vectors: AiPieceDefinition['moveVectors'],
): AiPieceDefinition['moveVectors'] {
  if (!isBeastPieceForLegal(piece)) return vectors;
  return [
    { dx: -1, dy: -2, maxStep: 1 },
    { dx: 1, dy: -2, maxStep: 1 },
    { dx: -1, dy: -1, maxStep: 1 },
    { dx: 1, dy: -1, maxStep: 1 },
    { dx: -1, dy: 0, maxStep: 1 },
    { dx: 1, dy: 0, maxStep: 1 },
    { dx: -1, dy: 1, maxStep: 1 },
    { dx: 1, dy: 1, maxStep: 1 },
  ];
}

/** 禽: 前後左右レイ（m_piece_pattern_vector の bird と整合） */
function normalizeVectorsForBird(
  piece: AiBoardPiece,
  vectors: AiPieceDefinition['moveVectors'],
): AiPieceDefinition['moveVectors'] {
  if (!isBirdPieceForLegal(piece)) return vectors;
  return [
    { dx: 0, dy: -1, maxStep: 8 },
    { dx: -1, dy: 0, maxStep: 8 },
    { dx: 1, dy: 0, maxStep: 8 },
    { dx: 0, dy: 1, maxStep: 8 },
  ];
}

function normalizeVectorsForSoul(
  piece: AiBoardPiece,
  vectors: AiPieceDefinition['moveVectors'],
): AiPieceDefinition['moveVectors'] {
  if (!isSoulPieceForLegal(piece)) return vectors;
  return [
    { dx: 0, dy: -1, maxStep: 1 },
    { dx: -1, dy: 0, maxStep: 1 },
    { dx: 1, dy: 0, maxStep: 1 },
    { dx: -1, dy: 1, maxStep: 1 },
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
  lookups: AiPieceLookups,
  depth = 0,
): AiPieceDefinition['moveVectors'] {
  const asBookMovementOnlyVectors = (vectors: AiPieceDefinition['moveVectors']) =>
    vectors.map((v) => ({ dx: v.dx, dy: v.dy, maxStep: v.maxStep }));

  let didResolveBookCopiedVectors = false;
  if (depth <= 0 && isBookPiece(piece)) {
    const boardState = asRecord(position.boardState);
    const customMoveVectors = asRecord(boardState?.custom_move_vectors);
    const marker = lastMovedPieceForBook(position, piece);
    const markerVectorsRaw = (marker as unknown as { copiedMoveVectors?: unknown })
      .copiedMoveVectors;
    if (Array.isArray(markerVectorsRaw) && markerVectorsRaw.length > 0) {
      const markerVectors = markerVectorsRaw
        .map((v) => asRecord(v))
        .filter((v): v is Record<string, unknown> => Boolean(v))
        .map((v) => {
          const dx = Number(v.dx);
          const dy = Number(v.dy);
          const maxStep = Number(v.maxStep);
          const captureMode = typeof v.captureMode === 'string' ? v.captureMode : undefined;
          return Number.isFinite(dx) && Number.isFinite(dy) && Number.isFinite(maxStep)
            ? {
                dx,
                dy,
                maxStep,
                ...(captureMode ? { captureMode } : {}),
              }
            : null;
        })
        .filter(
          (v): v is { dx: number; dy: number; maxStep: number; captureMode?: string } => v != null,
        );
      if (markerVectors.length > 0) {
        didResolveBookCopiedVectors = true;
        return asBookMovementOnlyVectors(markerVectors);
      }
    }
    const copied = marker
      ? // skill_state の side / code が壊れていても、盤上の同座標実体を最優先で使う。
        (allPieces.find((p) => p.row === marker.row && p.col === marker.col) ??
        allPieces.find(
          (p) => p.side === marker.side && p.row === marker.row && p.col === marker.col,
        ) ??
        marker)
      : null;
    if (copied && !isBookPiece(copied)) {
      const customVectorsRaw =
        customMoveVectors?.[String(copied.pieceCode ?? marker?.pieceCode ?? '').toUpperCase()];
      if (Array.isArray(customVectorsRaw) && customVectorsRaw.length > 0) {
        const customVectors = customVectorsRaw
          .map((v) => asRecord(v))
          .filter((v): v is Record<string, unknown> => Boolean(v))
          .map((v) => {
            const dc = Number(v.dc);
            const dr = Number(v.dr);
            const slide = v.slide === true;
            const captureMode = typeof v.capture_mode === 'string' ? v.capture_mode : undefined;
            if (!Number.isFinite(dc) || !Number.isFinite(dr)) return null;
            return {
              dx: dc,
              dy: dr,
              maxStep: slide ? 9 : 1,
              ...(captureMode ? { captureMode } : {}),
            };
          })
          .filter(
            (v): v is { dx: number; dy: number; maxStep: number; captureMode?: string } =>
              v != null,
          );
        if (customVectors.length > 0) {
          didResolveBookCopiedVectors = true;
          return asBookMovementOnlyVectors(customVectors);
        }
      }
      const copiedDef = resolvePieceDefForBookCopy(copied, lookups);
      if (copiedDef) {
        didResolveBookCopiedVectors = true;
        // 「書」はコピー元のベクトルをそのまま使い、向きは最終的に「書」自身の side で解決する。
        // ここで copy 元 side で正規化すると向きが逆転して合法手が空になるケースがある。
        return asBookMovementOnlyVectors(copiedDef.moveVectors);
      }
      if (isKingLikePieceForBook(copied)) {
        const kingDef = lookups.pieceDefsByCode.OU ?? lookups.pieceDefsByChar['王'] ?? null;
        if (kingDef) {
          didResolveBookCopiedVectors = true;
          return kingDef.moveVectors;
        }
      }
    }
    // 「書」はデフォルト移動を持たず、毎回「相手の直前移動駒」の移動範囲のみを継承する。
    // 参照元を解決できないターンは移動不可にする。
    if (!didResolveBookCopiedVectors) {
      return [];
    }
  }
  // 名刀「刀」: 前方ちょうど1マスのみ（テンプレは「上」基準、先手後手は getLegalTargetsFromVectors の orient で反映）
  if (isKatanaPiece(piece)) {
    return [{ dx: 0, dy: -1, maxStep: 1 }];
  }
  const bishopNormalized = normalizeVectorsForBishop(piece, pieceDef.moveVectors);
  const goldNormalized = normalizeVectorsForGold(piece, bishopNormalized);
  const fixedHouseField = normalizeVectorsForFixedHouseField(piece, goldNormalized);
  const timeNormalized = normalizeVectorsForTime(piece, fixedHouseField);
  const peopleField = normalizeVectorsForPeopleWithAllyField(piece, timeNormalized, allPieces);
  const moonNormalized = normalizeVectorsForMoon(piece, peopleField, position);
  const oniNormalized = normalizeVectorsForOniVariants(piece, moonNormalized);
  const deathNormalized = normalizeVectorsForDeath(piece, oniNormalized);
  const beastBird = normalizeVectorsForBird(piece, normalizeVectorsForBeast(piece, deathNormalized));
  return normalizeVectorsForSoul(piece, beastBird);
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
  if (isBookPiece(input.piece)) {
    const aroundAllies = input.pieces.filter((ally) => {
      if (ally.side !== input.piece.side) return false;
      if (ally.row === input.piece.row && ally.col === input.piece.col) return false;
      const dr = Math.abs(ally.row - input.piece.row);
      const dc = Math.abs(ally.col - input.piece.col);
      return dr <= 1 && dc <= 1;
    });
    const targetKeys = new Set<string>();
    const targets: { row: number; col: number }[] = [];
    for (const ally of aroundAllies) {
      // 「書」同士の相互参照ループを避けるため、隣接書は参照対象から除外する。
      if (isBookPiece(ally)) continue;
      const allyMoves = generateBoardPieceMoves({
        ...input,
        piece: ally,
      });
      for (const mv of allyMoves) {
        const row = mv.toRow;
        const col = mv.toCol;
        const key = `${row}:${col}`;
        if (targetKeys.has(key)) continue;
        targetKeys.add(key);
        targets.push({ row, col });
      }
    }
    const from = { row: input.piece.row, col: input.piece.col };
    const pieceCode = resolvePieceCodeForLegalMove(input.piece, input.lookups);
    return targets.map((to) =>
      createMove({
        from,
        to,
        pieceCode,
        promote: false,
        capturedPieceCode: resolveCapturedPieceCodeForLegalMove(
          findPieceAtFast(input.occupancy, to.row, to.col),
        ),
      }),
    );
  }

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
  if (
    !pieceDef &&
    (isGunPiece(input.piece) ||
      isKatanaPiece(input.piece) ||
      isAnyOniVariantPiece(input.piece) ||
      isBeastPieceForLegal(input.piece) ||
      isBirdPieceForLegal(input.piece))
  ) {
    pieceDef = { ...MINIMAL_SPECIAL_PIECE_DEF, char: input.piece.char };
  }
  if (!pieceDef) return [];
  // 銃・刀はエンジン側でベクトルを上書きするため、カタログの moveVectors が空でも合法手を生成する。
  if (
    pieceDef.moveVectors.length === 0 &&
    !isGunPiece(input.piece) &&
    !isKatanaPiece(input.piece) &&
    !isAnyOniVariantPiece(input.piece) &&
    !isBeastPieceForLegal(input.piece) &&
    !isBirdPieceForLegal(input.piece)
  ) {
    return [];
  }
  let effectiveVectors = resolveEffectiveVectorsForPiece(
    input.piece,
    pieceDef,
    input.position,
    input.pieces,
    input.lookups,
  );
  if (isGunPiece(input.piece)) {
    effectiveVectors = [
      { dx: 0, dy: -1, maxStep: 2 },
      { dx: -1, dy: 1, maxStep: 2 },
      { dx: 1, dy: 1, maxStep: 2 },
    ];
  }
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
          input.lookups,
        );
        effectiveCanJump = selectedDef.canJump === true;
      }
    }
  }

  if (hasOrthogonalAdjacentAllySaint(input.pieces, input.piece)) {
    effectiveVectors = applySaintAdjacentMoveRangeBuff(effectiveVectors);
  }
  if (hasAdjacentAllyMedicine(input.pieces, input.piece)) {
    effectiveVectors = applyMedicineAdjacentMoveRangeBuff(effectiveVectors);
  }

  const leapVectors = effectiveVectors.filter((v) => isLeapOverOneMode(v.captureMode));
  const normalVectors = effectiveVectors.filter((v) => {
    if (isLeapOverOneMode(v.captureMode)) return false;
    // 銃の前方ちょうど2マス（1マス目に敵がいても2マス目へ）: generateGunForwardTargets が担当する。
    // テンプレ (0,-1) maxStep 2 を getLegalTargetsFromVectors に渡すと、1マス目の敵で打ち切られ 2マス目が出ない。
    if (isGunPiece(input.piece) && v.dx === 0 && v.dy === -1) return false;
    return true;
  });
  const pathPieces = buildPathPiecesWithRockObstaclesOnEmptyCells(
    input.pieces,
    input.skillView,
    input.piece.side,
  );
  const pathOccupancy = buildOccupancyMap(pathPieces);
  const normalTargets = isCloudPiece(input.piece)
    ? generateCloudTargetsFromVectors(pathOccupancy, input.piece, normalVectors)
    : getLegalTargetsFromVectors(pathPieces, input.piece, normalVectors, 9, {
        canJump: effectiveCanJump,
      });
  const gunLineTargets =
    isGunPiece(input.piece) && !isMirrorPiece(input.piece)
      ? [
          ...generateGunForwardTargets(pathOccupancy, input.piece),
          ...generateGunBackDiagonalTargets(pathOccupancy, input.piece),
        ]
      : [];
  const gunLineKeySet =
    gunLineTargets.length > 0 ? new Set(gunLineTargets.map((t) => `${t.row}:${t.col}`)) : null;
  const leapTargets = generateLeapOverOneTargets(pathOccupancy, input.piece, leapVectors);
  const reflectiveTargets = isReflectivePiece(input.piece)
    ? generateReflectiveTargets(pathOccupancy, input.piece)
    : [];
  const targetsRaw = [...normalTargets, ...gunLineTargets, ...leapTargets, ...reflectiveTargets];
  const seenTargetKeys = new Set<string>();
  const targets = targetsRaw.filter((t) => {
    const k = `${t.row}:${t.col}`;
    if (seenTargetKeys.has(k)) return false;
    seenTargetKeys.add(k);
    return true;
  });
  // 「書」はコピー元の移動レンジをそのまま使うため、セル制約ルールの上書きは適用しない。
  const movementRule = isBookPiece(input.piece)
    ? null
    : (input.skillView.movementRulesByCell.get(
        `${input.piece.side}:${input.piece.row}:${input.piece.col}`,
      ) ?? null);
  const peopleFieldBuff = hasPeopleFieldBuffOnBoard(input.piece, input.pieces);
  let filteredTargets =
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

  // 銃の前方2マス貫通・斜め後ろ2マスは 2 歩相当のため、縦1マス／直交1マス制限だけだと誤って除外される。貫通先だけ復元する。
  if (
    gunLineKeySet &&
    isGunPiece(input.piece) &&
    !isMirrorPiece(input.piece) &&
    (movementRule === 'vertical_step_only' || movementRule === 'orthogonal_step_only')
  ) {
    const seenF = new Set(filteredTargets.map((t) => `${t.row}:${t.col}`));
    for (const t of targets) {
      const k = `${t.row}:${t.col}`;
      if (!gunLineKeySet.has(k) || seenF.has(k)) continue;
      seenF.add(k);
      filteredTargets.push(t);
    }
  }

  const captureFilteredTargets = filteredTargets.filter((target) => {
    const captured = findPieceAtFast(input.occupancy, target.row, target.col);
    if (!captured) return true;
    if (isCloudPiece(input.piece)) {
      // 雲: 敵は取れず、味方のみ取れる（ただし味方王/玉は不可）。
      return captured.side === input.piece.side && !isKingPiece(captured);
    }
    if (captured.side === input.piece.side) return false;
    if (
      isKingPiece(captured) &&
      hasSoulOnBoardForSide(input.pieces, captured.side)
    ) {
      return false;
    }
    if (isArmorPiece(captured)) return false;
    if (captured.side !== input.piece.side && isArmorPiece(input.piece)) return false;
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
  const pieceCode = resolvePieceCodeForLegalMove(input.piece, input.lookups);

  if (isGunPiece(input.piece)) {
    gunPieceDebugLog('合法手パイプライン', {
      at: [input.piece.row, input.piece.col],
      side: input.piece.side,
      char: input.piece.char,
      resolvedPieceCode: pieceCode,
      movementRule,
      gunLineTargets,
      countTargets: targets.length,
      countAfterMoveRule: filteredTargets.length,
      countAfterCapture: captureFilteredTargets.length,
      countAfterHazard: hazardFilteredTargets.length,
      countAfterBoat: boatFilteredTargets.length,
      cellsAfterBoat: boatFilteredTargets.map((t) => ({ row: t.row, col: t.col })),
    });
  }

  const moves = boatFilteredTargets.flatMap((target) => {
    const captured = findPieceAtFast(input.occupancy, target.row, target.col);
    const capturedPieceCode = resolveCapturedPieceCodeForLegalMove(captured);
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
  return moves;
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
