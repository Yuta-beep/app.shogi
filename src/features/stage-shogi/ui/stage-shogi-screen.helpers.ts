import { ImageSourcePropType } from 'react-native';

import { mapPiecesForSpringDragonAwakeningDisplay } from '@/ai/engine/spring-ryu-awakening';
import { assembleSkillDefinitionsV2ForSession } from '@/ai/engine/session-skill-definitions-v2';
import { ApiClientError } from '@/infra/http/api-client';
import { resolvePieceImageSource } from '@/lib/piece-image';
import type {
  MoveVector,
  PieceCatalogItem,
} from '@/usecases/piece-info/load-piece-catalog-usecase';
import { BattleCanonicalPosition, BattleMove } from '@/usecases/stage-battle/game-move-contract';

import {
  BoardCell,
  HandsState,
  Side,
  normalizeHandsStateKeys,
} from '@/features/stage-shogi/domain/game-rules';
import {
  CHAR_TO_CODE,
  CODE_TO_CHAR,
  PROMOTED_CODE_TO_CHAR,
  PieceSfenMapping,
  sfenCharToDisplayChar,
  toSfenBoardPure,
  toSfenHandsPure,
} from '@/features/stage-shogi/domain/piece-conversion';

export const BOARD_SIZE = 9;
export const BOARD_VIEWBOX = 900;
export const BOARD_PADDING = 18;
export const BOARD_INNER = BOARD_VIEWBOX - BOARD_PADDING * 2;
export const BOARD_CELL = BOARD_INNER / BOARD_SIZE;
export const BOARD_PADDING_RATIO = BOARD_PADDING / BOARD_VIEWBOX;
export const BOARD_CELL_INNER_RATIO = 1 / BOARD_SIZE;
export const NORMAL_PIECE_SIZE_PERCENT = 120;
export const KING_PIECE_SIZE_PERCENT = 136;
export const BOARD_PIECE_SIZE_OVERRIDES: Partial<Record<string, number>> = {
  波: 128,
};
export const POISON_CELL_IMAGE_SOURCE = require('../../../../assets/cells/毒マス.png');
/** 牢・柵スキルで行動不能になった駒の上に重ねる */
export const PRISON_CHAIN_IMAGE_SOURCE = require('../../../../assets/cells/鎖.png');
/** 岩スキルの障害物セル表示 */
export const ROCK_OBSTACLE_IMAGE_SOURCE = require('../../../../assets/pieces/岩の障害物.png');

const STANDARD_PIECE_CODES = new Set(['FU', 'KY', 'KE', 'GI', 'KI', 'KA', 'HI', 'OU']);
const LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE: Partial<Record<string, number>> = {
  FU: require('../../../../assets/pieces/promoted/tokin.png'),
  KY: require('../../../../assets/pieces/promoted/narikyo.png'),
  KE: require('../../../../assets/pieces/promoted/narikei.png'),
  GI: require('../../../../assets/pieces/promoted/narigin.png'),
  HI: require('../../../../assets/pieces/promoted/ryuo.png'),
  RYU: require('../../../../assets/pieces/promoted/ryuo.png'),
  KA: require('../../../../assets/pieces/promoted/ryuma.png'),
};
/** 飛車の成りの表示（龍・竜王・龍王 …）。単独の「竜」は小竜駒でここには含めない（成り駒と誤認しない）。 */
const PROMOTED_DISPLAY_CHARS = new Set([
  'と',
  'と金',
  '杏',
  '圭',
  '全',
  '成香',
  '成桂',
  '成銀',
  '馬',
  '龍',
  '龍王',
  '竜王',
  '龍馬',
]);
const PROMOTED_CHAR_TO_BASE_CODE: Record<string, string> = {
  と: 'FU',
  と金: 'FU',
  杏: 'KY',
  圭: 'KE',
  全: 'GI',
  成香: 'KY',
  成桂: 'KE',
  成銀: 'GI',
  馬: 'KA',
  龍: 'HI',
  龍王: 'HI',
  竜王: 'HI',
  龍馬: 'KA',
};
/** 成り駒コード → 不成の土台。`RYU` は小竜の canonical のため含めない（`toBasePieceCode('RYU')` が飛になるのを防ぐ）。飛の成りは `RY`（+R 系）と `HI`。 */
const PROMOTED_PIECE_CODE_TO_BASE_CODE: Record<string, string> = {
  TO: 'FU',
  NY: 'KY',
  NK: 'KE',
  NG: 'GI',
  UM: 'KA',
  RY: 'HI',
};
const VISUAL_PROMOTED_PIECE_CODES = new Set(['TO', 'NY', 'NK', 'NG', 'UM', 'RY']);
const PERSISTENT_HAZARD_CHARS = new Set(['毒', '沼']);
export const PERSISTENT_SYNC_GUARD_CHARS = new Set([
  '毒',
  '沼',
  '映',
  '鏡',
  'あ',
  '牢',
  '柵',
  '峰',
  '嶺',
  '岩',
  '鉱',
  '墓',
  '霊',
]);

export type BoardPiece = {
  side: Side;
  row: number;
  col: number;
  pieceCode: string | null;
  char: string;
  promoted?: boolean;
  imageSignedUrl: string | null;
  darkVeiled?: boolean;
  aTransformed?: boolean;
  /** 牢・柵スキル由来の行動不能（鎖.png） */
  prisonChained?: boolean;
};

export type PreservedMovedPiece = {
  side: Side;
  toRow: number;
  toCol: number;
  pieceCode: string | null;
  char: string;
  imageSignedUrl: string | null;
  promoted?: boolean;
};

export type TrustedBoardEndpoints = {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
};

function preferBundledPromotedImageOverRemoteUrl(
  pieceCode: string | null,
  promoted: boolean,
  remoteOrFallback: string | null,
): string | null {
  if (!promoted || !pieceCode) return remoteOrFallback;
  const base = (toBasePieceCode(pieceCode) ?? pieceCode).toUpperCase();
  if (LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE[base] != null) {
    return null;
  }
  return remoteOrFallback;
}

export function toBasePieceCode(pieceCode: string | null | undefined): string | null {
  if (!pieceCode) return null;
  const upper = pieceCode.toUpperCase();
  return PROMOTED_PIECE_CODE_TO_BASE_CODE[upper] ?? upper;
}

const PEOPLE_FIELD_DIAGONAL_BUFF_VECTORS: MoveVector[] = [
  { dx: -1, dy: -1, maxStep: 1 },
  { dx: 1, dy: -1, maxStep: 1 },
  { dx: -1, dy: 1, maxStep: 1 },
  { dx: 1, dy: 1, maxStep: 1 },
];

function isFieldPieceForPeopleMovePreview(piece: BoardPiece): boolean {
  const code = toBasePieceCode(piece.pieceCode ?? null);
  if (code === 'FIELD') return true;
  if (piece.char === '畑') return true;
  return CHAR_TO_CODE[piece.char] === 'FIELD';
}

function isPeoplePieceForFieldMovePreview(piece: BoardPiece): boolean {
  const code = toBasePieceCode(piece.pieceCode ?? null);
  if (code === 'PEOPLE') return true;
  if (piece.char === '民') return true;
  return CHAR_TO_CODE[piece.char] === 'PEOPLE';
}

/** 敵駒タップ時の移動範囲表示など：味方に畑があるとき民の斜め1マスをカタログベクトルに足す（合法手エンジンと同条件） */
export function mergePeopleFieldDiagonalMoveVectors(
  piece: BoardPiece,
  baseVectors: readonly MoveVector[],
  allPieces: BoardPiece[],
): MoveVector[] {
  if (!isPeoplePieceForFieldMovePreview(piece)) return [...baseVectors];
  const hasAllyField = allPieces.some(
    (p) => p.side === piece.side && isFieldPieceForPeopleMovePreview(p),
  );
  if (!hasAllyField) return [...baseVectors];
  return [...baseVectors, ...PEOPLE_FIELD_DIAGONAL_BUFF_VECTORS];
}

export function isEnemySide(side: string) {
  const normalized = side.toLowerCase();
  return (
    normalized === 'enemy' ||
    normalized === 'cpu' ||
    normalized === 'gote' ||
    normalized === 'computer'
  );
}

export function isKingChar(char: string) {
  return char === '王' || char === '玉';
}

export function getPieceImageSource(piece: {
  pieceId?: number;
  pieceCode?: string | null;
  char?: string | null;
  imageSignedUrl?: string | null;
}): ImageSourcePropType | null {
  return resolvePieceImageSource(piece);
}

export function normalizeCellIndex(value: number) {
  if (Number.isInteger(value) && value >= 0 && value < BOARD_SIZE) {
    return value;
  }
  if (Number.isInteger(value) && value >= 1 && value <= BOARD_SIZE) {
    return value - 1;
  }
  return null;
}

export function normalizeSide(side: string): Side {
  return isEnemySide(side) ? 'enemy' : 'player';
}

export function fallbackPiecePalette(side: string) {
  if (isEnemySide(side)) {
    return {
      fill: '#fee2e2',
      stroke: '#991b1b',
      icon: '#7f1d1d',
      text: '#7f1d1d',
    };
  }
  return {
    fill: '#dcfce7',
    stroke: '#166534',
    icon: '#14532d',
    text: '#14532d',
  };
}

function isOpaquePieceInstanceId(code: string | null | undefined): boolean {
  if (!code) return false;
  return /^piece_[a-z0-9]+$/i.test(code.trim());
}

export function pieceCodeFromPlacement(
  pieceCode: string | null,
  char: string,
  pieceDefsByChar: Partial<Record<string, PieceCatalogItem>>,
): string | null {
  if (!isOpaquePieceInstanceId(pieceCode) && pieceCode) {
    return toBasePieceCode(pieceCode);
  }
  const catalogItem = pieceDefsByChar[char];
  if (catalogItem?.pieceCode && !isOpaquePieceInstanceId(catalogItem.pieceCode)) {
    return toBasePieceCode(catalogItem.pieceCode) ?? catalogItem.pieceCode;
  }
  if (catalogItem && isOpaquePieceInstanceId(catalogItem.pieceCode)) {
    if (char === '刀') return 'SWORD';
    if (char === '銃') return 'GUN';
    if (char === '鎧') return 'ARMOR';
    if (char === '盾') return 'SHIELD';
    const fromKanji = CHAR_TO_CODE[char];
    if (fromKanji) return toBasePieceCode(fromKanji) ?? fromKanji;
    return catalogItem.pieceCode;
  }
  if (PROMOTED_CHAR_TO_BASE_CODE[char]) {
    return PROMOTED_CHAR_TO_BASE_CODE[char];
  }
  const fromKanji = CHAR_TO_CODE[char];
  if (fromKanji) return toBasePieceCode(fromKanji) ?? fromKanji;
  if (pieceCode && !isOpaquePieceInstanceId(pieceCode)) return toBasePieceCode(pieceCode);
  if (pieceCode && isOpaquePieceInstanceId(pieceCode)) return pieceCode;
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

export function isGameAlreadyFinishedError(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  const code = error.code.toUpperCase();
  const message = error.message.toLowerCase();
  return (
    code === 'GAME_ALREADY_FINISHED' ||
    code === 'GAME_FINISHED' ||
    code === 'INVALID_POSITION' ||
    message.includes('already finished')
  );
}

export function buildSfen(
  placements: BoardPiece[],
  hands: HandsState,
  sideToMove: Side,
  moveNo: number,
  pieceSfenMapping: PieceSfenMapping,
  pieceDefsByChar: Partial<Record<string, PieceCatalogItem>>,
) {
  const normalizedPlacements = placements.map((placement) => ({
    ...placement,
    pieceCode: pieceCodeFromPlacement(placement.pieceCode ?? null, placement.char, pieceDefsByChar),
  }));
  const board = toSfenBoardPure(normalizedPlacements, pieceSfenMapping);
  const side = sideToMove === 'player' ? 'b' : 'w';
  const sfenHands = toSfenHandsPure(hands, pieceSfenMapping);
  return `${board} ${side} ${sfenHands} ${Math.max(1, moveNo)}`;
}

export function buildBoardState(
  placements: BoardPiece[],
  pieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
): Record<string, unknown> {
  const pieces = placements.map((placement) => ({
    side: placement.side,
    row: placement.row,
    col: placement.col,
    pieceCode: placement.pieceCode,
    char: placement.char,
    promoted: Boolean(placement.promoted),
    imageSignedUrl: placement.imageSignedUrl,
  }));

  return {
    pieces,
    skill_definitions_v2: assembleSkillDefinitionsV2ForSession(pieceDefsByCode),
    custom_move_vectors: Object.fromEntries(
      Object.entries(pieceDefsByCode)
        .filter((entry): entry is [string, PieceCatalogItem] => Boolean(entry[1]))
        .map(([code, item]) => [
          code,
          item.moveVectors.map((vector) => ({
            dr: vector.dy,
            dc: vector.dx,
            slide: vector.maxStep > 1,
            ...(vector.captureMode ? { capture_mode: vector.captureMode } : {}),
          })),
        ])
        .filter(([, vectors]) => vectors.length > 0),
    ),
    placements: pieces.map((piece) => ({
      side: piece.side,
      row: piece.row,
      col: piece.col,
      piece: {
        code: piece.pieceCode,
        char: piece.char,
        promoted: piece.promoted,
        imageSignedUrl: piece.imageSignedUrl,
      },
    })),
  };
}

export function uniqueTargetsFromMoves(moves: BattleMove[]): BoardCell[] {
  const seen = new Set<string>();
  const out: BoardCell[] = [];
  for (const move of moves) {
    const key = `${move.toRow}:${move.toCol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ row: move.toRow, col: move.toCol });
  }
  return out;
}

export function hasAdjacentEnemyPiece(
  pieces: BoardPiece[],
  centerRow: number,
  centerCol: number,
): boolean {
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const row = centerRow + dr;
      const col = centerCol + dc;
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) continue;
      const target = findPieceAt(pieces, row, col);
      if (target?.side === 'enemy') return true;
    }
  }
  return false;
}

export function handKeyToDisplayPieceCode(
  rawKey: string,
  catalog: readonly PieceCatalogItem[],
): string {
  const trimmed = rawKey.trim();
  if (!trimmed) return rawKey;
  const upper = trimmed.toUpperCase();
  if (Object.prototype.hasOwnProperty.call(CODE_TO_CHAR, upper)) return upper;
  const fromChar = CHAR_TO_CODE[trimmed];
  if (fromChar) return fromChar.toUpperCase();
  const promotedCharToBaseCode: Record<string, string> = {
    と: 'FU',
    成香: 'KY',
    成桂: 'KE',
    成銀: 'GI',
    馬: 'KA',
    龍: 'HI',
  };
  const fromPromotedChar = promotedCharToBaseCode[trimmed];
  if (fromPromotedChar) return fromPromotedChar;

  for (const it of catalog) {
    const pc = it.pieceCode;
    if (pc && pc.toUpperCase() === upper) {
      const c = CHAR_TO_CODE[it.char];
      return c ? c.toUpperCase() : upper;
    }
  }
  const tl = trimmed.toLowerCase();
  for (const it of catalog) {
    const cc = it.canonicalCode;
    if (cc && cc.toLowerCase() === tl) {
      const c = CHAR_TO_CODE[it.char];
      return c ? c.toUpperCase() : upper;
    }
  }
  return upper;
}

export function remapHandsStateToDisplayPieceCodes(
  hands: HandsState,
  catalog: readonly PieceCatalogItem[],
): HandsState {
  function remapBag(bag: Record<string, number>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(bag)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      const n = Math.max(0, Math.floor(v));
      if (n <= 0) continue;
      const display = handKeyToDisplayPieceCode(k, catalog).toUpperCase();
      out[display] = (out[display] ?? 0) + n;
    }
    return out;
  }
  return { player: remapBag(hands.player), enemy: remapBag(hands.enemy) };
}

export function legalMovesForBoardPiece(legalMoves: BattleMove[], row: number, col: number) {
  return legalMoves.filter(
    (move) => move.dropPieceCode === null && move.fromRow === row && move.fromCol === col,
  );
}

export function legalMovesForDropPiece(
  legalMoves: BattleMove[],
  pieceCode: string,
  catalog: readonly PieceCatalogItem[],
) {
  const want = handKeyToDisplayPieceCode(pieceCode, catalog).toUpperCase();
  return legalMoves.filter((move) => {
    if (move.fromRow !== null || move.fromCol !== null) return false;
    const d = move.dropPieceCode;
    if (d == null) return false;
    return handKeyToDisplayPieceCode(d, catalog).toUpperCase() === want;
  });
}

export function legalMovesToTarget(legalMoves: BattleMove[], to: BoardCell) {
  return legalMoves.filter((move) => move.toRow === to.row && move.toCol === to.col);
}

export function pieceCharFromCode(pieceCode: string, side: Side, promoted: boolean) {
  if (promoted && PROMOTED_CODE_TO_CHAR[pieceCode]) {
    return PROMOTED_CODE_TO_CHAR[pieceCode];
  }
  if (pieceCode === 'OU') {
    return side === 'enemy' ? '玉' : '王';
  }
  return CODE_TO_CHAR[pieceCode] ?? '?';
}

export function handsFromCanonical(position: BattleCanonicalPosition): HandsState {
  return {
    player: Object.fromEntries(
      Object.entries(position.hands.player ?? {}).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number',
      ),
    ),
    enemy: Object.fromEntries(
      Object.entries(position.hands.enemy ?? {}).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number',
      ),
    ),
  };
}

function normalizeCapturedCodeForStarReturn(code: string | null | undefined): string | null {
  if (!code) return null;
  const normalized = code.toUpperCase();
  if (normalized === 'HOS' || code === '星') return 'HOS';
  return normalized;
}

export function patchHandsForStarReturnSkill(
  position: BattleCanonicalPosition,
  actorSide: Side,
  move: BattleMove | null | undefined,
  skillTriggered: boolean,
  handsBeforeMove?: HandsState,
): BattleCanonicalPosition {
  const targetSide: Side = actorSide === 'player' ? 'enemy' : 'player';
  let nextPosition = position;
  if (skillTriggered && normalizeCapturedCodeForStarReturn(move?.capturedPieceCode) === 'HOS') {
    const actorBag = { ...(nextPosition.hands[actorSide] ?? {}) };
    const actorCountRaw = actorBag.HOS;
    const actorCount =
      typeof actorCountRaw === 'number' && Number.isFinite(actorCountRaw)
        ? Math.max(0, Math.floor(actorCountRaw))
        : 0;
    if (actorCount > 0) {
      const targetBag = { ...(nextPosition.hands[targetSide] ?? {}) };
      const targetCountRaw = targetBag.HOS;
      const targetCount =
        typeof targetCountRaw === 'number' && Number.isFinite(targetCountRaw)
          ? Math.max(0, Math.floor(targetCountRaw))
          : 0;
      actorBag.HOS = Math.max(0, actorCount - 1);
      if (actorBag.HOS <= 0) {
        delete actorBag.HOS;
      }
      targetBag.HOS = targetCount + 1;
      nextPosition = {
        ...nextPosition,
        hands: {
          ...nextPosition.hands,
          [actorSide]: actorBag,
          [targetSide]: targetBag,
        },
      };
    }
  }

  const capturedCode = normalizeCapturedCodeForStarReturn(move?.capturedPieceCode);
  if (capturedCode !== 'SWAMP' || !handsBeforeMove) return nextPosition;

  const beforeActor = Math.max(0, Math.floor(handsBeforeMove[actorSide]?.SWAMP ?? 0));
  const beforeTarget = Math.max(0, Math.floor(handsBeforeMove[targetSide]?.SWAMP ?? 0));
  const afterActor = Math.max(0, Math.floor(nextPosition.hands[actorSide]?.SWAMP ?? 0));
  const afterTarget = Math.max(0, Math.floor(nextPosition.hands[targetSide]?.SWAMP ?? 0));

  if (afterActor === beforeActor && afterTarget === beforeTarget + 1) {
    const actorBag = { ...(nextPosition.hands[actorSide] ?? {}) };
    const targetBag = { ...(nextPosition.hands[targetSide] ?? {}) };
    targetBag.SWAMP = Math.max(0, afterTarget - 1);
    if (targetBag.SWAMP <= 0) delete targetBag.SWAMP;
    actorBag.SWAMP = afterActor + 1;
    return {
      ...nextPosition,
      hands: {
        ...nextPosition.hands,
        [actorSide]: actorBag,
        [targetSide]: targetBag,
      },
    };
  }

  return nextPosition;
}

function countPiecesOnBoardWithCode(pieces: BoardPiece[], side: Side, pieceCode: string): number {
  const want = pieceCode.toUpperCase();
  let n = 0;
  for (const p of pieces) {
    if (p.side !== side) continue;
    const pc = p.pieceCode?.toUpperCase() ?? '';
    if (pc === want) {
      n += 1;
      continue;
    }
    if (!p.pieceCode && p.char) {
      const fromChar = CHAR_TO_CODE[p.char]?.toUpperCase();
      if (fromChar === want) n += 1;
    }
  }
  return n;
}

export function reconcileExtendedPieceHandsAgainstBoard(
  hands: HandsState,
  pieces: BoardPiece[],
): HandsState {
  function adjustBag(side: Side, bag: Record<string, number>): Record<string, number> {
    const next = { ...bag };
    for (const code of Object.keys(next)) {
      const codeU = code.toUpperCase();
      if (
        codeU === 'ICE' ||
        codeU === 'SAND' ||
        codeU === 'WIND' ||
        codeU === 'HIK' ||
        codeU === 'SWAMP' ||
        codeU === 'GEAR' ||
        codeU === 'MACHINE' ||
        codeU === 'HOUSE' ||
        codeU === 'PEOPLE' ||
        codeU === 'FIELD' ||
        codeU === 'BOOK' ||
        codeU === 'SEAL'
      ) {
        continue;
      }
      if (STANDARD_PIECE_CODES.has(codeU)) continue;
      const raw = next[code];
      const hc = typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
      if (hc <= 0) {
        delete next[code];
        continue;
      }
      const bc = countPiecesOnBoardWithCode(pieces, side, code);
      if (bc <= 0) continue;
      const adjusted = Math.max(0, hc - bc);
      if (adjusted <= 0) delete next[code];
      else next[code] = adjusted;
    }
    return next;
  }
  return {
    player: adjustBag('player', hands.player),
    enemy: adjustBag('enemy', hands.enemy),
  };
}

function darkBlindDisplayKeysFromCanonical(position: BattleCanonicalPosition): Set<string> {
  const keys = new Set<string>();
  const boardState = asRecord(position.boardState);
  if (!boardState) return keys;
  const skillState = asRecord(boardState.skill_state ?? boardState.skillState);
  const rawList = (skillState?.piece_statuses ??
    skillState?.pieceStatuses ??
    boardState.piece_statuses ??
    boardState.pieceStatuses) as unknown;
  if (!Array.isArray(rawList)) return keys;
  for (const raw of rawList) {
    const st = asRecord(raw);
    if (!st) continue;
    const statusType = asString(st.status_type ?? st.statusType) ?? '';
    if (statusType !== 'dark_blind') continue;
    const turns = Number(st.remaining_turns ?? st.remainingTurns ?? 1);
    if (!Number.isFinite(turns) || turns <= 0) continue;
    const row = normalizeCellIndex(Number(st.row));
    const col = normalizeCellIndex(Number(st.col));
    if (row === null || col === null) continue;
    const side = normalizeSide(asString(st.side) ?? 'player');
    keys.add(`${side}:${row}:${col}`);
  }
  return keys;
}

export function applyDarkVeilFromSkillStateToPieces(
  pieces: BoardPiece[],
  position: BattleCanonicalPosition,
): BoardPiece[] {
  const keys = darkBlindDisplayKeysFromCanonical(position);
  if (keys.size === 0) {
    return pieces.map((p) => ({ ...p, darkVeiled: false }));
  }
  return pieces.map((p) => ({
    ...p,
    darkVeiled: keys.has(`${p.side}:${p.row}:${p.col}`),
  }));
}

function aTransformDisplayKeysFromCanonical(position: BattleCanonicalPosition): Set<string> {
  const keys = new Set<string>();
  const boardState = asRecord(position.boardState);
  if (!boardState) return keys;
  const skillState = asRecord(boardState.skill_state ?? boardState.skillState);
  const rawList = (skillState?.piece_statuses ??
    skillState?.pieceStatuses ??
    boardState.piece_statuses ??
    boardState.pieceStatuses) as unknown;
  if (!Array.isArray(rawList)) return keys;
  for (const raw of rawList) {
    const st = asRecord(raw);
    if (!st) continue;
    const statusType = asString(st.status_type ?? st.statusType) ?? '';
    if (statusType !== 'a_transform') continue;
    const turns = Number(st.remaining_turns ?? st.remainingTurns ?? 1);
    if (!Number.isFinite(turns) || turns <= 0) continue;
    const row = normalizeCellIndex(Number(st.row));
    const col = normalizeCellIndex(Number(st.col));
    if (row === null || col === null) continue;
    const side = normalizeSide(asString(st.side) ?? 'player');
    keys.add(`${side}:${row}:${col}`);
  }
  return keys;
}

export function applyATransformEffectToPieces(
  pieces: BoardPiece[],
  position: BattleCanonicalPosition,
): BoardPiece[] {
  const keys = aTransformDisplayKeysFromCanonical(position);
  if (keys.size === 0) {
    return pieces.map((p) => ({ ...p, aTransformed: false }));
  }
  return pieces.map((p) => ({
    ...p,
    aTransformed: keys.has(`${p.side}:${p.row}:${p.col}`),
  }));
}

function prisonChainDisplayKeysFromCanonical(position: BattleCanonicalPosition): Set<string> {
  const keys = new Set<string>();
  const boardState = asRecord(position.boardState);
  if (!boardState) return keys;
  const skillState = asRecord(boardState.skill_state ?? boardState.skillState);
  const rawList = (skillState?.piece_statuses ??
    skillState?.pieceStatuses ??
    boardState.piece_statuses ??
    boardState.pieceStatuses) as unknown;
  if (!Array.isArray(rawList)) return keys;
  for (const raw of rawList) {
    const st = asRecord(raw);
    if (!st) continue;
    const statusType = asString(st.status_type ?? st.statusType) ?? '';
    if (statusType !== 'prison_fence_stun') continue;
    const turns = Number(st.remaining_turns ?? st.remainingTurns ?? 1);
    if (!Number.isFinite(turns) || turns <= 0) continue;
    const row = normalizeCellIndex(Number(st.row));
    const col = normalizeCellIndex(Number(st.col));
    if (row === null || col === null) continue;
    const side = normalizeSide(asString(st.side) ?? 'player');
    keys.add(`${side}:${row}:${col}`);
  }
  return keys;
}

export function applyPrisonChainEffectToPieces(
  pieces: BoardPiece[],
  position: BattleCanonicalPosition,
): BoardPiece[] {
  const keys = prisonChainDisplayKeysFromCanonical(position);
  if (keys.size === 0) {
    return pieces.map((p) => ({ ...p, prisonChained: false }));
  }
  return pieces.map((p) => ({
    ...p,
    prisonChained: keys.has(`${p.side}:${p.row}:${p.col}`),
  }));
}

export function poisonHazardCellsForDisplay(position: BattleCanonicalPosition): BoardCell[] {
  const boardState = asRecord(position.boardState);
  if (!boardState) return [];
  const skillState = asRecord(boardState.skill_state ?? boardState.skillState);
  const rawList = (skillState?.board_hazards ??
    skillState?.boardHazards ??
    boardState.board_hazards ??
    boardState.boardHazards) as unknown;
  if (!Array.isArray(rawList)) return [];

  const out: BoardCell[] = [];
  const seen = new Set<string>();
  for (const raw of rawList) {
    const hazard = asRecord(raw);
    if (!hazard) continue;
    const hazardType = asString(hazard.hazard_type ?? hazard.hazardType) ?? '';
    const remaining = Number(hazard.remaining_turns ?? hazard.remainingTurns ?? 1);
    const row = normalizeCellIndex(Number(hazard.row));
    const col = normalizeCellIndex(Number(hazard.col));
    if (hazardType !== 'poison_cell' && hazardType !== 'poison') continue;
    if (!Number.isFinite(remaining) || remaining <= 0) continue;
    if (row === null || col === null) continue;
    const key = `${row}:${col}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ row, col });
  }
  return out;
}

export function rockObstacleCellsForDisplay(position: BattleCanonicalPosition): BoardCell[] {
  const boardState = asRecord(position.boardState);
  if (!boardState) return [];
  const skillState = asRecord(boardState.skill_state ?? boardState.skillState);
  const rawList = (skillState?.board_hazards ??
    skillState?.boardHazards ??
    boardState.board_hazards ??
    boardState.boardHazards) as unknown;
  if (!Array.isArray(rawList)) return [];

  const out: BoardCell[] = [];
  const seen = new Set<string>();
  for (const raw of rawList) {
    const hazard = asRecord(raw);
    if (!hazard) continue;
    const hazardType = asString(hazard.hazard_type ?? hazard.hazardType) ?? '';
    const remaining = Number(hazard.remaining_turns ?? hazard.remainingTurns ?? 1);
    const row = normalizeCellIndex(Number(hazard.row));
    const col = normalizeCellIndex(Number(hazard.col));
    if (hazardType !== 'rock_obstacle') continue;
    if (!Number.isFinite(remaining) || remaining <= 0) continue;
    if (row === null || col === null) continue;
    const key = `${row}:${col}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ row, col });
  }
  return out;
}

export function movementRuleByCellFromCanonical(position: BattleCanonicalPosition) {
  const out = new Map<string, string>();
  const boardState = asRecord(position.boardState);
  if (!boardState) return out;
  const skillState = asRecord(boardState.skill_state ?? boardState.skillState);
  const rawList = (skillState?.movement_modifiers ??
    skillState?.movementModifiers ??
    boardState.movement_modifiers ??
    boardState.movementModifiers) as unknown;
  if (!Array.isArray(rawList)) return out;
  for (const raw of rawList) {
    const entry = asRecord(raw);
    if (!entry) continue;
    const remaining = Number(entry.remaining_turns ?? entry.remainingTurns ?? 1);
    if (!Number.isFinite(remaining) || remaining <= 0) continue;
    const side = normalizeSide(asString(entry.side) ?? 'player');
    const row = normalizeCellIndex(Number(entry.row));
    const col = normalizeCellIndex(Number(entry.col));
    const movementRule = asString(entry.movement_rule ?? entry.movementRule);
    if (row === null || col === null || !movementRule) continue;
    out.set(`${side}:${row}:${col}`, movementRule);
  }
  return out;
}

export function immobilizedKeysFromCanonical(position: BattleCanonicalPosition) {
  const out = new Set<string>();
  const boardState = asRecord(position.boardState);
  if (!boardState) return out;
  const skillState = asRecord(boardState.skill_state ?? boardState.skillState);
  const rawList = (skillState?.piece_statuses ??
    skillState?.pieceStatuses ??
    boardState.piece_statuses ??
    boardState.pieceStatuses) as unknown;
  if (!Array.isArray(rawList)) return out;
  for (const raw of rawList) {
    const entry = asRecord(raw);
    if (!entry) continue;
    const remaining = Number(entry.remaining_turns ?? entry.remainingTurns ?? 1);
    if (!Number.isFinite(remaining) || remaining <= 0) continue;
    const statusType = asString(entry.status_type ?? entry.statusType) ?? '';
    if (
      statusType !== 'stun' &&
      statusType !== 'time_stop' &&
      statusType !== 'dark_blind' &&
      statusType !== 'prison_fence_stun' &&
      statusType !== 'peak_lock'
    ) {
      continue;
    }
    const side = normalizeSide(asString(entry.side) ?? 'player');
    const row = normalizeCellIndex(Number(entry.row));
    const col = normalizeCellIndex(Number(entry.col));
    if (row === null || col === null) continue;
    out.add(`${side}:${row}:${col}`);
  }
  return out;
}

export function applyMovementRuleToTargets(
  origin: BoardCell,
  targets: BoardCell[],
  movementRule: string | null,
  context?: { movingPiece: BoardPiece; allPieces: BoardPiece[] },
): BoardCell[] {
  if (!movementRule) return targets;
  if (movementRule === 'vertical_step_only') {
    return targets.filter((t) => t.col === origin.col && Math.abs(t.row - origin.row) === 1);
  }
  if (movementRule === 'orthogonal_step_only') {
    const peopleFieldBuff =
      context != null &&
      isPeoplePieceForFieldMovePreview(context.movingPiece) &&
      context.allPieces.some(
        (p) => p.side === context.movingPiece.side && isFieldPieceForPeopleMovePreview(p),
      );
    return targets.filter((t) => {
      const adr = Math.abs(t.row - origin.row);
      const adc = Math.abs(t.col - origin.col);
      if (adr + adc === 1) return true;
      if (peopleFieldBuff && adr === 1 && adc === 1) return true;
      return false;
    });
  }
  return targets;
}

function piecesFromCanonicalBoardState(
  position: BattleCanonicalPosition,
  pieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
  promotedPieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
  existingPieces: BoardPiece[],
): BoardPiece[] | null {
  const boardState = asRecord(position.boardState);
  if (!boardState) return null;
  const rawPieces = [
    boardState.pieces,
    boardState.placements,
    boardState.boardPieces,
    boardState.board_pieces,
  ].find((value) => Array.isArray(value)) as unknown[] | undefined;
  if (!rawPieces || rawPieces.length === 0) return null;

  const next: BoardPiece[] = [];
  const seen = new Set<string>();
  for (const raw of rawPieces) {
    const entry = asRecord(raw);
    if (!entry) continue;
    const nested = asRecord(entry.piece) ?? entry;
    const row = normalizeCellIndex(Number(entry.row));
    const col = normalizeCellIndex(Number(entry.col));
    if (row === null || col === null) continue;
    const side = normalizeSide(asString(entry.side ?? nested.side) ?? 'player');
    const rawPromoted = asBoolean(entry.promoted ?? nested.promoted) ?? false;
    const rawCharForCode = asString(nested.char ?? entry.char) ?? '';
    let code =
      asString(nested.pieceCode ?? nested.piece_code ?? nested.code) ??
      CHAR_TO_CODE[rawCharForCode] ??
      null;
    if (code && isOpaquePieceInstanceId(code)) {
      const fromKanji = CHAR_TO_CODE[rawCharForCode];
      if (fromKanji) code = fromKanji;
    }
    if (!code) {
      const existingAtCell = existingPieces.find(
        (piece) => piece.side === side && piece.row === row && piece.col === col,
      );
      if (existingAtCell?.pieceCode) {
        code = existingAtCell.pieceCode;
      }
    }
    if (!code) continue;
    const key = `${side}:${row}:${col}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const fallbackExistingChar =
      existingPieces.find((piece) => piece.side === side && piece.pieceCode === code)?.char ?? null;
    const resolvedCharFromCode = pieceCharFromCode(code, side, rawPromoted);
    const rawChar =
      asString(nested.char ?? entry.char) ??
      fallbackExistingChar ??
      (resolvedCharFromCode === '?' ? code : resolvedCharFromCode);
    const promoted = rawPromoted || PROMOTED_DISPLAY_CHARS.has(rawChar);
    const char = rawChar;
    const pieceDef = promoted
      ? (promotedPieceDefsByCode[code] ?? pieceDefsByCode[code])
      : pieceDefsByCode[code];
    const imageSignedUrl = preferBundledPromotedImageOverRemoteUrl(
      code,
      promoted,
      asString(nested.imageSignedUrl ?? nested.image_signed_url ?? entry.imageSignedUrl) ??
        pieceDef?.imageSignedUrl ??
        findBestExistingImage(existingPieces, {
          side,
          row,
          col,
          pieceCode: code,
          char,
          promoted,
        }) ??
        null,
    );

    next.push({
      side,
      row,
      col,
      pieceCode: code,
      char,
      promoted,
      imageSignedUrl,
    });
  }

  return next.length > 0 ? next : null;
}

/** 拡張 SFEN（多文字トークン）を最長一致で読むため、未成り sfen キーを長い順に並べる */
function sortedUnpromotedSfenTokens(mapping: PieceSfenMapping): string[] {
  return Object.keys(mapping.sfenToCode.unpromoted).sort(
    (a, b) => b.length - a.length || a.localeCompare(b),
  );
}

export function piecesFromCanonicalPosition(
  position: BattleCanonicalPosition,
  pieceSfenMapping: PieceSfenMapping,
  pieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
  promotedPieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
  existingPieces: BoardPiece[],
): BoardPiece[] {
  const board = position.sfen.split(' ')[0] ?? '';
  const ranks = board.split('/');
  const next: BoardPiece[] = [];
  const tokensByLenDesc = sortedUnpromotedSfenTokens(pieceSfenMapping);

  ranks.forEach((rank, row) => {
    let col = 0;
    let promoted = false;
    let i = 0;
    while (i < rank.length) {
      const ch = rank[i] ?? '';
      if (ch === '+') {
        promoted = true;
        i += 1;
        continue;
      }
      if (/\d/.test(ch)) {
        col += Number(ch);
        i += 1;
        promoted = false;
        continue;
      }

      if (promoted) {
        let side: Side = ch >= 'A' && ch <= 'Z' ? 'player' : 'enemy';
        if ('$!&(#@^[<{:.\"=|'.includes(ch)) side = 'player';
        if ("%?*)~`_]>};,'-\\".includes(ch)) side = 'enemy';
        let pieceCode = sfenCharToDisplayChar(ch, true, pieceSfenMapping);
        if (!pieceCode) {
          pieceCode = sfenCharToDisplayChar(ch, false, pieceSfenMapping);
        }
        const preservedAtCellSameSide = existingPieces.find(
          (p) => p.side === side && p.row === row && p.col === col,
        );
        const preservedAtCellAnySide =
          preservedAtCellSameSide ??
          existingPieces.find((p) => p.row === row && p.col === col) ??
          null;
        const usedPreservedCode = !pieceCode && preservedAtCellAnySide?.pieceCode != null;
        if (usedPreservedCode && preservedAtCellAnySide?.pieceCode) {
          pieceCode = preservedAtCellAnySide.pieceCode;
        }
        const effectiveSide = usedPreservedCode ? (preservedAtCellAnySide?.side ?? side) : side;
        if (pieceCode && row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
          const pieceDef = promotedPieceDefsByCode[pieceCode] ?? pieceDefsByCode[pieceCode];
          const char =
            (usedPreservedCode ? preservedAtCellAnySide?.char : null) ??
            pieceCharFromCode(pieceCode, effectiveSide, true);
          const imageSignedUrl = preferBundledPromotedImageOverRemoteUrl(
            pieceCode,
            true,
            pieceDef?.imageSignedUrl ??
              findBestExistingImage(existingPieces, {
                side: effectiveSide,
                row,
                col,
                pieceCode,
                char,
                promoted: true,
              }) ??
              null,
          );

          next.push({
            side: effectiveSide,
            row,
            col,
            pieceCode,
            char,
            promoted: true,
            imageSignedUrl,
          });
        }

        col += 1;
        i += 1;
        promoted = false;
        continue;
      }

      const rest = rank.slice(i);
      let consume = 0;
      let pieceCode: string | null = null;
      for (const token of tokensByLenDesc) {
        if (rest.length < token.length) continue;
        const slice = rest.slice(0, token.length);
        if (slice.toUpperCase() !== token.toUpperCase()) continue;
        const code = pieceSfenMapping.sfenToCode.unpromoted[token];
        if (!code) continue;
        pieceCode = code;
        consume = token.length;
        break;
      }

      if (consume === 0) {
        pieceCode = sfenCharToDisplayChar(ch, false, pieceSfenMapping);
        consume = 1;
      }

      const rawToken = rest.slice(0, consume);
      const sideCh = rawToken[0] ?? ch;
      let side: Side = sideCh >= 'A' && sideCh <= 'Z' ? 'player' : 'enemy';
      if ('$!&(#@^[<{:.\"=|'.includes(sideCh)) side = 'player';
      if ("%?*)~`_]>};,'-\\".includes(sideCh)) side = 'enemy';

      const preservedAtCellSameSide = existingPieces.find(
        (p) => p.side === side && p.row === row && p.col === col,
      );
      const preservedAtCellAnySide =
        preservedAtCellSameSide ??
        existingPieces.find((p) => p.row === row && p.col === col) ??
        null;
      const usedPreservedCode = !pieceCode && preservedAtCellAnySide?.pieceCode != null;
      if (usedPreservedCode && preservedAtCellAnySide?.pieceCode) {
        pieceCode = preservedAtCellAnySide.pieceCode;
      }
      const effectiveSide = usedPreservedCode ? (preservedAtCellAnySide?.side ?? side) : side;
      if (pieceCode && row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        const pieceDef = pieceDefsByCode[pieceCode];
        const char =
          (usedPreservedCode ? preservedAtCellAnySide?.char : null) ??
          pieceCharFromCode(pieceCode, effectiveSide, false);
        const imageSignedUrl = preferBundledPromotedImageOverRemoteUrl(
          pieceCode,
          false,
          pieceDef?.imageSignedUrl ??
            findBestExistingImage(existingPieces, {
              side: effectiveSide,
              row,
              col,
              pieceCode,
              char,
              promoted: false,
            }) ??
            null,
        );

        next.push({
          side: effectiveSide,
          row,
          col,
          pieceCode,
          char,
          promoted: false,
          imageSignedUrl,
        });
      }

      col += 1;
      i += consume;
      promoted = false;
    }
  });

  const boardStatePieces = piecesFromCanonicalBoardState(
    position,
    pieceDefsByCode,
    promotedPieceDefsByCode,
    existingPieces,
  );
  if (!boardStatePieces) {
    return next;
  }

  if (next.length === 0) {
    return boardStatePieces;
  }

  const mergedByKey = new Map<string, BoardPiece>();
  for (const piece of next) {
    mergedByKey.set(`${piece.side}:${piece.row}:${piece.col}`, piece);
  }
  for (const piece of boardStatePieces) {
    const key = `${piece.side}:${piece.row}:${piece.col}`;
    const existing = mergedByKey.get(key);
    if (existing) {
      const promoted = (existing.promoted ?? false) || (piece.promoted ?? false);
      const pieceCode = existing.pieceCode ?? piece.pieceCode;
      const side = existing.side ?? piece.side;
      const char =
        promoted && pieceCode
          ? pieceCharFromCode(pieceCode, side, true)
          : (existing.char ?? piece.char);
      const mergedUrl = existing.imageSignedUrl ?? piece.imageSignedUrl ?? null;
      mergedByKey.set(key, {
        ...piece,
        ...existing,
        promoted,
        pieceCode,
        char,
        imageSignedUrl: preferBundledPromotedImageOverRemoteUrl(
          pieceCode ?? null,
          promoted,
          mergedUrl,
        ),
      });
    } else {
      mergedByKey.set(key, piece);
    }
  }
  return [...mergedByKey.values()];
}

export function findPieceAt(placements: BoardPiece[], row: number, col: number) {
  return placements.find((piece) => piece.row === row && piece.col === col) ?? null;
}

export function getDisplayChar(piece: BoardPiece) {
  if (piece.promoted && piece.pieceCode && PROMOTED_CODE_TO_CHAR[piece.pieceCode]) {
    return PROMOTED_CODE_TO_CHAR[piece.pieceCode];
  }
  return piece.char ?? (piece.pieceCode ? (CODE_TO_CHAR[piece.pieceCode] ?? '?') : '?');
}

export function isPromotedVisualPiece(piece: BoardPiece) {
  if ((piece.pieceCode?.toUpperCase() ?? '') === 'RYU' && !piece.promoted) {
    return false;
  }
  if (!piece.promoted && piece.char === '竜') {
    return false;
  }
  if (piece.promoted) return true;
  if (PROMOTED_DISPLAY_CHARS.has(piece.char)) return true;
  const pc = piece.pieceCode?.toUpperCase() ?? '';
  if (pc && VISUAL_PROMOTED_PIECE_CODES.has(pc)) return true;
  return false;
}

export function collectStandardBaseCodesForLocalPromotedImage(piece: BoardPiece): string[] {
  const out: string[] = [];
  if (piece.pieceCode) {
    const u = piece.pieceCode.toUpperCase();
    out.push(u);
    const b = toBasePieceCode(u);
    if (b) out.push(b);
  }
  if (piece.char) {
    const fromKanji = CHAR_TO_CODE[piece.char];
    if (fromKanji) {
      out.push(fromKanji);
      const bb = toBasePieceCode(fromKanji);
      if (bb) out.push(bb);
    }
    const fromPromotedKanji = PROMOTED_CHAR_TO_BASE_CODE[piece.char];
    if (fromPromotedKanji) out.push(fromPromotedKanji);
  }
  return out;
}

export function localPromotedModuleFromBaseCodeCandidates(
  candidates: Iterable<string>,
): number | null {
  for (const raw of candidates) {
    if (!raw) continue;
    const u = raw.toUpperCase();
    const mapped = (toBasePieceCode(u) ?? u).toUpperCase();
    const img = LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE[mapped];
    if (img != null) return img;
    // RYU は小竜の canonical のため竜王画像へは寄せない。飛成りは RY（+R 系）や HI。
    if (mapped === 'RY') {
      const alt = LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE.HI ?? LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE.RYU;
      if (alt != null) return alt;
    }
  }
  return null;
}

export function resolvePromotedImageSource(piece: BoardPiece) {
  if ((piece.pieceCode?.toUpperCase() ?? '') === 'RYU' && piece.char === '竜') {
    return null;
  }
  if (!piece.promoted && piece.char === '竜') {
    return null;
  }
  if (!isPromotedVisualPiece(piece)) return null;

  if (piece.promoted) {
    const quick = localPromotedModuleFromBaseCodeCandidates(
      collectStandardBaseCodesForLocalPromotedImage(piece),
    );
    if (quick != null) return quick;
  }

  const pc = piece.pieceCode?.toUpperCase() ?? '';
  const codeFromPiece = toBasePieceCode(piece.pieceCode);
  const codeFromChar = PROMOTED_CHAR_TO_BASE_CODE[piece.char] ?? null;

  let key = codeFromPiece ?? codeFromChar;
  // 飛成りは「龍」「竜王」等。単独「竜」は小竜駒（pieceCode RYU）のため HI（竜王画像）に寄せない。
  if (!key && (piece.char === '龍' || piece.char === '竜王' || piece.char === '龍王')) {
    key = 'HI';
  }
  // RYU は本ゲームでは小竜の canonical。飛の成りは HI / RY のみここで竜王画像へ寄せる。
  if (!key && (pc === 'HI' || pc === 'RY')) {
    key = 'HI';
  }
  if (!key && piece.promoted && piece.char === '飛') {
    key = 'HI';
  }
  if (!key && piece.promoted && piece.char) {
    const fromKanji = CHAR_TO_CODE[piece.char];
    if (fromKanji) {
      key = toBasePieceCode(fromKanji) ?? fromKanji;
    }
  }

  if (!key) return null;
  const fromMap = LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE[key] ?? null;
  if (fromMap != null) return fromMap;

  if (isPromotedVisualPiece(piece) && piece.char) {
    for (const [code, kanji] of Object.entries(PROMOTED_CODE_TO_CHAR)) {
      if (piece.char === kanji) {
        const m = LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE[code];
        if (m != null) return m;
      }
    }
  }

  return null;
}

function findBestExistingImage(
  existingPieces: BoardPiece[],
  target: {
    side: Side;
    row: number;
    col: number;
    pieceCode: string | null;
    char: string;
    promoted: boolean;
  },
) {
  const samePromotion = (piece: BoardPiece) => (piece.promoted ?? false) === target.promoted;

  return (
    existingPieces.find(
      (piece) =>
        piece.side === target.side &&
        piece.row === target.row &&
        piece.col === target.col &&
        piece.imageSignedUrl &&
        samePromotion(piece),
    )?.imageSignedUrl ??
    existingPieces.find(
      (piece) =>
        piece.side === target.side &&
        piece.pieceCode === target.pieceCode &&
        piece.imageSignedUrl &&
        samePromotion(piece),
    )?.imageSignedUrl ??
    existingPieces.find(
      (piece) =>
        piece.side === target.side &&
        piece.char === target.char &&
        piece.imageSignedUrl &&
        samePromotion(piece),
    )?.imageSignedUrl ??
    null
  );
}

export function preserveMovedPieceIdentity(
  nextPieces: BoardPiece[],
  preserved?: PreservedMovedPiece,
): BoardPiece[] {
  if (!preserved) return nextPieces;
  const index = nextPieces.findIndex(
    (piece) =>
      piece.side === preserved.side &&
      piece.row === preserved.toRow &&
      piece.col === preserved.toCol,
  );
  if (index >= 0) {
    const updated = [...nextPieces];
    updated[index] = {
      ...updated[index],
      pieceCode: preserved.pieceCode,
      char: preserved.char,
      imageSignedUrl: preserved.imageSignedUrl,
      promoted: preserved.promoted ?? false,
    };
    return updated;
  }

  return nextPieces;
}

export function pieceIdentityKey(piece: BoardPiece) {
  return `${piece.side}:${piece.row}:${piece.col}`;
}

function basePieceKeyForReconcile(p: BoardPiece): string | null {
  if (p.pieceCode) {
    return toBasePieceCode(p.pieceCode) ?? p.pieceCode.toUpperCase();
  }
  if (p.char && CHAR_TO_CODE[p.char]) {
    const c = CHAR_TO_CODE[p.char];
    return toBasePieceCode(c) ?? c;
  }
  return null;
}

function sameBoardPieceForReconcile(lhs: BoardPiece, rhs: BoardPiece) {
  if (lhs.side !== rhs.side || lhs.row !== rhs.row || lhs.col !== rhs.col) return false;
  if ((lhs.promoted ?? false) !== (rhs.promoted ?? false)) return false;
  const lk = basePieceKeyForReconcile(lhs);
  const rk = basePieceKeyForReconcile(rhs);
  if (lk && rk) return lk === rk;
  return lhs.pieceCode === rhs.pieceCode && lhs.char === rhs.char;
}

export function reconcilePieceIdentity(
  nextPieces: BoardPiece[],
  existingPieces: BoardPiece[],
): BoardPiece[] {
  const existingByKey = new Map(existingPieces.map((piece) => [pieceIdentityKey(piece), piece]));
  return nextPieces.map((piece) => {
    const existing = existingByKey.get(pieceIdentityKey(piece));
    if (!existing) return piece;
    if (!sameBoardPieceForReconcile(existing, piece)) return piece;
    if (isPromotedVisualPiece(piece) !== isPromotedVisualPiece(existing)) return piece;
    return existing;
  });
}

export function restoreMissingPersistentHazardPieces(
  nextPieces: BoardPiece[],
  existingPieces: BoardPiece[],
): BoardPiece[] {
  const nextByCell = new Map<string, BoardPiece>();
  for (const p of nextPieces) {
    nextByCell.set(`${p.row}:${p.col}`, p);
  }
  for (const p of existingPieces) {
    if (!PERSISTENT_SYNC_GUARD_CHARS.has(p.char)) continue;
    const cellKey = `${p.row}:${p.col}`;
    const byCell = nextByCell.get(cellKey);
    if (!byCell) {
      nextByCell.set(cellKey, p);
    }
  }
  return [...nextByCell.values()];
}

export function enforcePersistentHazardCells(
  nextPieces: BoardPiece[],
  persistentHazards: readonly BoardPiece[],
): BoardPiece[] {
  if (persistentHazards.length === 0) return nextPieces;
  const nextHazardCount = new Map<string, number>();
  for (const p of nextPieces) {
    if (!PERSISTENT_SYNC_GUARD_CHARS.has(p.char)) continue;
    const key = `${p.side}:${p.char}`;
    nextHazardCount.set(key, (nextHazardCount.get(key) ?? 0) + 1);
  }
  const byCell = new Map<string, BoardPiece>();
  for (const p of nextPieces) {
    byCell.set(`${p.row}:${p.col}`, p);
  }
  for (const hz of persistentHazards) {
    const cellKey = `${hz.row}:${hz.col}`;
    if (byCell.has(cellKey)) {
      continue;
    }
    const kindKey = `${hz.side}:${hz.char}`;
    const remaining = nextHazardCount.get(kindKey) ?? 0;
    if (remaining > 0) {
      nextHazardCount.set(kindKey, remaining - 1);
      continue;
    }
    byCell.set(cellKey, hz);
  }
  return [...byCell.values()];
}

export function resolveBattleMovePlacements(
  prev: BoardPiece[],
  move: BattleMove,
): { fromRow: number; fromCol: number; toRow: number; toCol: number; moving: BoardPiece } | null {
  if (move.fromRow === null || move.fromCol === null) return null;

  const rawFr = move.fromRow;
  const rawFc = move.fromCol;
  const rawTr = move.toRow;
  const rawTc = move.toCol;

  const nFr = normalizeCellIndex(move.fromRow);
  const nFc = normalizeCellIndex(move.fromCol);
  const nTr = normalizeCellIndex(move.toRow);
  const nTc = normalizeCellIndex(move.toCol);

  const variants: { fr: number; fc: number; tr: number; tc: number }[] = [];
  if (nFr !== null && nFc !== null && nTr !== null && nTc !== null) {
    variants.push({ fr: nFr, fc: nFc, tr: nTr, tc: nTc });
  }
  variants.push({ fr: rawFr, fc: rawFc, tr: rawTr, tc: rawTc });

  const seen = new Set<string>();
  for (const v of variants) {
    const key = `${v.fr},${v.fc},${v.tr},${v.tc}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const moving = prev.find((p) => p.row === v.fr && p.col === v.fc);
    if (moving) {
      return {
        fromRow: v.fr,
        fromCol: v.fc,
        toRow: v.tr,
        toCol: v.tc,
        moving,
      };
    }
  }
  return null;
}

export function isSelfCaptureLikeMove(
  prev: BoardPiece[],
  move: BattleMove,
  actorSide: Side,
  persistentHazards: readonly BoardPiece[] = [],
): boolean {
  const targetVariants: { row: number; col: number }[] = [];
  const nRow = normalizeCellIndex(move.toRow);
  const nCol = normalizeCellIndex(move.toCol);
  if (nRow !== null && nCol !== null) {
    targetVariants.push({ row: nRow, col: nCol });
  }
  targetVariants.push({ row: move.toRow, col: move.toCol });

  const hasAllyAtTarget = targetVariants.some(
    ({ row, col }) =>
      prev.some((p) => p.side === actorSide && p.row === row && p.col === col) ||
      persistentHazards.some((p) => p.side === actorSide && p.row === row && p.col === col),
  );
  if (!hasAllyAtTarget) return false;

  if (move.fromRow != null && move.fromCol != null) {
    const fromVariants: { row: number; col: number }[] = [];
    const nFr = normalizeCellIndex(move.fromRow);
    const nFc = normalizeCellIndex(move.fromCol);
    if (nFr !== null && nFc !== null) {
      fromVariants.push({ row: nFr, col: nFc });
    }
    fromVariants.push({ row: move.fromRow, col: move.fromCol });
    const isSameCell = fromVariants.some((f) =>
      targetVariants.some((t) => f.row === t.row && f.col === t.col),
    );
    if (isSameCell) return false;
  }

  return true;
}

export function buildPreservedMovedPieceForPlayer(
  sourceBoard: BoardPiece[],
  move: BattleMove,
  pieceDefsByChar: Partial<Record<string, PieceCatalogItem>>,
  promotedPieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
  trustedBoard?: TrustedBoardEndpoints,
): PreservedMovedPiece | undefined {
  let resolved: {
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
    moving: BoardPiece;
  } | null = null;

  if (trustedBoard) {
    let moving = sourceBoard.find(
      (p) => p.row === trustedBoard.fromRow && p.col === trustedBoard.fromCol,
    );
    if (!moving || moving.side !== 'player') {
      moving = sourceBoard.find(
        (p) => p.row === trustedBoard.toRow && p.col === trustedBoard.toCol && p.side === 'player',
      );
    }
    if (moving && moving.side === 'player') {
      resolved = {
        fromRow: trustedBoard.fromRow,
        fromCol: trustedBoard.fromCol,
        toRow: trustedBoard.toRow,
        toCol: trustedBoard.toCol,
        moving,
      };
    }
  }
  if (!resolved) {
    resolved = resolveBattleMovePlacements(sourceBoard, move);
  }
  if (!resolved || resolved.moving.side !== 'player') return undefined;
  const moved = resolved.moving;
  const resolvedPieceCode = pieceCodeFromPlacement(
    moved.pieceCode ?? null,
    moved.char,
    pieceDefsByChar,
  );
  const codeKey = (resolvedPieceCode ?? moved.pieceCode ?? '').toUpperCase();
  const promoted = move.promote ? true : (moved.promoted ?? false);
  const promotedDef = move.promote ? promotedPieceDefsByCode[codeKey] : null;
  const imageSignedUrl = preferBundledPromotedImageOverRemoteUrl(
    resolvedPieceCode ?? moved.pieceCode ?? null,
    promoted,
    promotedDef?.imageSignedUrl ?? moved.imageSignedUrl,
  );
  const resolvedChar = resolvedPieceCode
    ? pieceCharFromCode(resolvedPieceCode, moved.side, promoted)
    : moved.char;
  const char =
    resolvedChar === '?' || (resolvedPieceCode != null && resolvedChar === resolvedPieceCode)
      ? moved.char
      : resolvedChar;
  return {
    side: moved.side,
    toRow: resolved.toRow,
    toCol: resolved.toCol,
    pieceCode: resolvedPieceCode ?? moved.pieceCode ?? null,
    char,
    imageSignedUrl,
    promoted,
  };
}

export function overlayPromotionFromOptimistic(
  canonical: BoardPiece[],
  optimistic: BoardPiece[],
): BoardPiece[] {
  const optByKey = new Map(optimistic.map((p) => [pieceIdentityKey(p), p]));
  return canonical.map((p) => {
    const o = optByKey.get(pieceIdentityKey(p));
    if (!o || !isPromotedVisualPiece(o)) return p;

    const optHasLocalPromoted = resolvePromotedImageSource(o) != null;
    const canHasLocalPromoted = resolvePromotedImageSource(p) != null;
    if (optHasLocalPromoted && !canHasLocalPromoted) {
      return {
        ...p,
        promoted: (p.promoted ?? false) || (o.promoted ?? false),
        pieceCode: o.pieceCode ?? p.pieceCode,
        char: o.char,
        imageSignedUrl: o.imageSignedUrl,
      };
    }

    if (isPromotedVisualPiece(p)) return p;
    const preferLocalPromoted =
      resolvePromotedImageSource(o) != null || (o.promoted && o.imageSignedUrl == null);
    return {
      ...p,
      promoted: o.promoted ?? true,
      pieceCode: o.pieceCode ?? p.pieceCode,
      char: o.char,
      imageSignedUrl: preferLocalPromoted ? null : (o.imageSignedUrl ?? p.imageSignedUrl),
    };
  });
}

export function computePiecesAfterOptimisticMove(
  prev: BoardPiece[],
  actorSide: Side,
  move: BattleMove,
  pieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
  pieceDefsByChar: Partial<Record<string, PieceCatalogItem>>,
  promotedPieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
  trustedBoard?: TrustedBoardEndpoints,
): BoardPiece[] {
  if (move.dropPieceCode) {
    const rawCode = move.dropPieceCode;
    const pieceCode = rawCode.toUpperCase();
    const pieceDef = pieceDefsByCode[pieceCode] ?? pieceDefsByCode[rawCode];
    const tr = normalizeCellIndex(move.toRow) ?? move.toRow;
    const tc = normalizeCellIndex(move.toCol) ?? move.toCol;
    const occupiedHazard = prev.find(
      (p) => p.row === tr && p.col === tc && PERSISTENT_HAZARD_CHARS.has(p.char),
    );
    if (occupiedHazard) return prev;
    const occupiedByAlly = prev.some((p) => p.row === tr && p.col === tc && p.side === actorSide);
    if (occupiedByAlly) return prev;
    return [
      ...prev,
      {
        side: actorSide,
        row: tr,
        col: tc,
        pieceCode,
        char: pieceCharFromCode(pieceCode, actorSide, false),
        promoted: false,
        imageSignedUrl: pieceDef?.imageSignedUrl ?? null,
      },
    ];
  }
  if (move.fromRow === null || move.fromCol === null) {
    return prev;
  }

  let resolved: {
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
    moving: BoardPiece;
  } | null = null;

  if (trustedBoard) {
    const moving = prev.find(
      (p) => p.row === trustedBoard.fromRow && p.col === trustedBoard.fromCol,
    );
    if (moving && moving.side === actorSide) {
      resolved = {
        fromRow: trustedBoard.fromRow,
        fromCol: trustedBoard.fromCol,
        toRow: trustedBoard.toRow,
        toCol: trustedBoard.toCol,
        moving,
      };
    }
  }
  if (!resolved) {
    resolved = resolveBattleMovePlacements(prev, move);
  }
  if (!resolved) return prev;
  const { fromRow, fromCol, toRow, toCol, moving } = resolved;
  if (moving.side !== actorSide) return prev;
  const targetAtDestination = prev.find((p) => p.row === toRow && p.col === toCol);
  const movingIsHazard = PERSISTENT_HAZARD_CHARS.has(moving.char);
  if (
    targetAtDestination &&
    targetAtDestination.side === actorSide &&
    PERSISTENT_HAZARD_CHARS.has(targetAtDestination.char) &&
    !movingIsHazard
  ) {
    return prev;
  }
  if (targetAtDestination && targetAtDestination.side === actorSide) {
    return prev;
  }

  const resolvedPieceCode = pieceCodeFromPlacement(
    moving.pieceCode ?? null,
    moving.char,
    pieceDefsByChar,
  );
  const codeKey = (resolvedPieceCode ?? moving.pieceCode ?? '').toUpperCase();
  const promoted = move.promote ? true : (moving.promoted ?? false);
  const promotedDef = move.promote ? promotedPieceDefsByCode[codeKey] : null;
  const baseForChar =
    resolvedPieceCode ??
    (moving.pieceCode ? (toBasePieceCode(moving.pieceCode) ?? moving.pieceCode) : null);
  const resolvedChar =
    baseForChar != null && baseForChar.length > 0
      ? pieceCharFromCode(baseForChar, moving.side, promoted)
      : moving.char;
  const char =
    resolvedChar === '?' || (baseForChar != null && resolvedChar === baseForChar)
      ? moving.char
      : resolvedChar;
  const baseForLocalKey = (toBasePieceCode(codeKey) ?? codeKey).toUpperCase();
  const imageSignedUrl =
    move.promote && LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE[baseForLocalKey]
      ? null
      : (promotedDef?.imageSignedUrl ?? moving.imageSignedUrl);
  return prev
    .filter((p) => !(p.row === toRow && p.col === toCol && p.side !== actorSide))
    .map((p) =>
      p.row === fromRow && p.col === fromCol
        ? {
            ...p,
            row: toRow,
            col: toCol,
            pieceCode: baseForChar ?? resolvedPieceCode ?? p.pieceCode,
            promoted,
            imageSignedUrl,
            char,
          }
        : p,
    );
}

export function syncCanonicalState(params: {
  position: BattleCanonicalPosition;
  existingPieces: BoardPiece[];
  persistentHazards: readonly BoardPiece[];
  pieceCatalog: readonly PieceCatalogItem[];
  pieceSfenMapping: PieceSfenMapping;
  pieceDefsByCode: Partial<Record<string, PieceCatalogItem>>;
  promotedPieceDefsByCode: Partial<Record<string, PieceCatalogItem>>;
  preservedMovedPiece?: PreservedMovedPiece;
  optimisticBaseline?: BoardPiece[] | null;
}) {
  const {
    position,
    existingPieces,
    persistentHazards,
    pieceCatalog,
    pieceSfenMapping,
    pieceDefsByCode,
    promotedPieceDefsByCode,
    preservedMovedPiece,
    optimisticBaseline,
  } = params;
  const reconcileSource = optimisticBaseline ?? existingPieces;
  const parsedPieces = piecesFromCanonicalPosition(
    position,
    pieceSfenMapping,
    pieceDefsByCode,
    promotedPieceDefsByCode,
    reconcileSource,
  );
  const nextPieces = preserveMovedPieceIdentity(parsedPieces, preservedMovedPiece);
  const reconciledPieces = reconcilePieceIdentity(nextPieces, reconcileSource);
  const withPersistentHazards = restoreMissingPersistentHazardPieces(
    reconciledPieces,
    reconcileSource,
  );
  const withPromotionOverlay =
    optimisticBaseline && optimisticBaseline.length > 0
      ? overlayPromotionFromOptimistic(withPersistentHazards, optimisticBaseline)
      : withPersistentHazards;
  const withPersistentCells = enforcePersistentHazardCells(withPromotionOverlay, persistentHazards);
  const withDarkVeil = applyDarkVeilFromSkillStateToPieces(withPersistentCells, position);
  const withATransformEffect = applyATransformEffectToPieces(withDarkVeil, position);
  const withPrisonChain = applyPrisonChainEffectToPieces(withATransformEffect, position);
  const poisonHazardCells = poisonHazardCellsForDisplay(position);
  const rockObstacleCells = rockObstacleCellsForDisplay(position);
  const movementRuleByCell = movementRuleByCellFromCanonical(position);
  const immobilizedKeys = immobilizedKeysFromCanonical(position);
  const nextHands = remapHandsStateToDisplayPieceCodes(
    normalizeHandsStateKeys(handsFromCanonical(position)),
    pieceCatalog,
  );
  const reconciledHands = reconcileExtendedPieceHandsAgainstBoard(nextHands, withPromotionOverlay);
  const stabilizedPieces = enforcePersistentHazardCells(withPrisonChain, persistentHazards);
  const pieceDefsByChar = Object.fromEntries(
    pieceCatalog.filter((it) => it.char).map((item) => [item.char, item]),
  ) as Partial<Record<string, PieceCatalogItem>>;
  const withSpringDragonAwakening = mapPiecesForSpringDragonAwakeningDisplay(
    stabilizedPieces,
    pieceDefsByChar,
  );
  const nextPersistentHazards = withSpringDragonAwakening.filter((p) =>
    PERSISTENT_SYNC_GUARD_CHARS.has(p.char),
  );

  return {
    pieces: withSpringDragonAwakening,
    persistentHazards: nextPersistentHazards,
    poisonHazardCells,
    rockObstacleCells,
    hands: reconciledHands,
    sideToMove: position.sideToMove,
    moveNo: position.turnNumber,
    stateHash: position.stateHash,
    movementRuleByCell,
    immobilizedKeys,
  };
}
