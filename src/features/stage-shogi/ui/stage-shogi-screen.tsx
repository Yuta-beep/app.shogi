import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Crown, Shield } from 'lucide-react-native';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Modal, Pressable, Text, View } from 'react-native';
import Svg, { Line, Polygon, Rect } from 'react-native-svg';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { setLocalBattlePieceCatalog } from '@/ai/local-battle-registry';
import { homeAssets } from '@/constants/home-assets';
import { getNormalDungeonStagePreviewSource } from '@/constants/normal-dungeon-stage-previews';
import { UiScreenShell } from '@/components/organism/ui-screen-shell';
import {
  addHandPiece,
  BoardCell,
  BoardPiece as RuleBoardPiece,
  createEmptyHandsState,
  getHandCount,
  getLegalTargetsFromVectors,
  normalizeHandsStateKeys,
  Side,
  HandsState,
} from '@/features/stage-shogi/domain/game-rules';
import {
  createPieceSfenMapping,
  sfenCharToDisplayChar,
  CODE_TO_CHAR,
  PROMOTED_CODE_TO_CHAR,
  CHAR_TO_CODE,
  type PieceSfenMapping,
  toSfenBoardPure,
  toSfenHandsPure,
} from '@/features/stage-shogi/domain/piece-conversion';
import { useStageBattleScreen } from '@/features/stage-shogi/ui/use-stage-battle-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useAuthSession } from '@/hooks/common/use-auth-session';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { ApiClientError } from '@/infra/http/api-client';
import { listLocalPieceImageModules, resolvePieceImageSource } from '@/lib/piece-image';
import { createLoadPieceCatalogUseCase } from '@/usecases/piece-info/create-piece-info-usecases';
import { createClaimStageClearRewardUseCase } from '@/usecases/stage-battle/create-stage-battle-usecases';
import { CommitGameMoveUseCase } from '@/usecases/stage-battle/commit-game-move-usecase';
import { CreateGameUseCase } from '@/usecases/stage-battle/create-game-usecase';
import {
  BattleCanonicalPosition,
  BattleMove,
  BattleGameStatus,
} from '@/usecases/stage-battle/game-move-contract';
import { LoadGameStateUseCase } from '@/usecases/stage-battle/load-game-state-usecase';
import { LoadGameLegalMovesUseCase } from '@/usecases/stage-battle/load-game-legal-moves-usecase';
import { RequestAiMoveUseCase } from '@/usecases/stage-battle/request-ai-move-usecase';
import type { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';

const BOARD_SIZE = 9;
const BOARD_VIEWBOX = 900;
const BOARD_PADDING = 18;
const BOARD_INNER = BOARD_VIEWBOX - BOARD_PADDING * 2;
const BOARD_CELL = BOARD_INNER / BOARD_SIZE;
const BOARD_PADDING_RATIO = BOARD_PADDING / BOARD_VIEWBOX;
const BOARD_CELL_INNER_RATIO = 1 / BOARD_SIZE;
const NORMAL_PIECE_SIZE_PERCENT = 120;
const KING_PIECE_SIZE_PERCENT = 136;
const BOARD_PIECE_SIZE_OVERRIDES: Partial<Record<string, number>> = {
  波: 128,
};
const POISON_CELL_IMAGE_SOURCE = require('../../../../assets/cells/毒マス.png');
const STANDARD_PIECE_CODES = new Set(['FU', 'KY', 'KE', 'GI', 'KI', 'KA', 'HI', 'OU']);
const LEAF_SKILL_DESCRIPTION = '移動時10%の確率で「葉」駒を周囲1マスに召喚する。';
const ELECTRIC_SKILL_DESCRIPTION = '移動時20%の確率で周囲8マスの敵駒1体を3ターン行動不能にする。';
const ICE_SKILL_DESCRIPTION = '移動時30%の確率で周囲の敵駒1体を2ターン行動不能にする。';
const FISH_SKILL_DESCRIPTION = '移動時30%の確率で周囲の敵駒1体を3ターン行動不能にする。';
const MOSS_SKILL_DESCRIPTION = '移動時30%の確率で周囲の空きマスに「苔」駒を1体召喚する。';
const RAINBOW_SKILL_DESCRIPTION =
  'この駒の周囲8マスにいる敵駒の移動範囲は縦横1マスのみに制限される。';
/** プロジェクト直下 `assets/pieces/promoted/` の PNG（Metro の静的 require） */
const LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE: Partial<Record<string, number>> = {
  FU: require('../../../../assets/pieces/promoted/tokin.png'),
  KY: require('../../../../assets/pieces/promoted/narikyo.png'),
  KE: require('../../../../assets/pieces/promoted/narikei.png'),
  GI: require('../../../../assets/pieces/promoted/narigin.png'),
  /** 成り飛（龍王）— SFEN/内部で HI のままの場合 */
  HI: require('../../../../assets/pieces/promoted/ryuo.png'),
  /** 成り飛が RYU（竜）として渡る場合も同一画像 */
  RYU: require('../../../../assets/pieces/promoted/ryuo.png'),
  KA: require('../../../../assets/pieces/promoted/ryuma.png'),
};

/** 標準成りで `assets/pieces/promoted` に PNG があるときはカタログ URL を載せない（表示は bundled のみ） */
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
  '竜',
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
  竜: 'HI',
  龍王: 'HI',
  竜王: 'HI',
  龍馬: 'KA',
};
const PROMOTED_PIECE_CODE_TO_BASE_CODE: Record<string, string> = {
  TO: 'FU',
  NY: 'KY',
  NK: 'KE',
  NG: 'GI',
  UM: 'KA',
  RY: 'HI',
  /** `CHAR_TO_CODE` では成り飛が RYU（竜）になる */
  RYU: 'HI',
};

/** SFEN/API で promoted フラグが欠けても、駒コードだけで成りとみなす（画像切替用） */
const VISUAL_PROMOTED_PIECE_CODES = new Set(['TO', 'NY', 'NK', 'NG', 'UM', 'RY', 'RYU']);

function toBasePieceCode(pieceCode: string | null | undefined): string | null {
  if (!pieceCode) return null;
  const upper = pieceCode.toUpperCase();
  return PROMOTED_PIECE_CODE_TO_BASE_CODE[upper] ?? upper;
}

type BoardPiece = RuleBoardPiece & {
  imageSignedUrl: string | null;
  /** 闇の `dark_blind`（boardState.skill_state.piece_statuses）。2ターン持続 */
  darkVeiled?: boolean;
};
type PendingPromotion = {
  promoteMove: BattleMove;
  nonPromoteMove: BattleMove;
  /** 盤面 state 上の着手元・着手先（API の from/to が 0/1 始まり等でずれてもこちらを正とする） */
  boardFromRow: number;
  boardFromCol: number;
  boardToRow: number;
  boardToCol: number;
};

type TimeActionMode = 'skill' | 'normal';

/** 「成る」タップと同じ更新でローカル成り画像を最優先表示（RN / Expo Image の遅延を回避） */
type PromotionImageFlash = {
  row: number;
  col: number;
  side: Side;
  assetModule: number;
  flashKey: string;
};

type PreservedMovedPiece = {
  side: Side;
  toRow: number;
  toCol: number;
  pieceCode: string | null;
  char: string;
  imageSignedUrl: string | null;
  promoted?: boolean;
};

function isEnemySide(side: string) {
  const normalized = side.toLowerCase();
  return (
    normalized === 'enemy' ||
    normalized === 'cpu' ||
    normalized === 'gote' ||
    normalized === 'computer'
  );
}

function isKingChar(char: string) {
  return char === '王' || char === '玉';
}

function getPieceImageSource(piece: {
  pieceId?: number;
  pieceCode?: string | null;
  char?: string | null;
  imageSignedUrl?: string | null;
}) {
  return resolvePieceImageSource(piece);
}

function normalizeCellIndex(value: number) {
  if (Number.isInteger(value) && value >= 0 && value < BOARD_SIZE) {
    return value;
  }
  if (Number.isInteger(value) && value >= 1 && value <= BOARD_SIZE) {
    return value - 1;
  }
  return null;
}

function normalizeSide(side: string): Side {
  return isEnemySide(side) ? 'enemy' : 'player';
}

function fallbackPiecePalette(side: string) {
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

/** `master.m_piece.piece_code` が `piece_…` の実体IDで返るとき、SFEN 用の表示コードではない */
function isOpaquePieceInstanceId(code: string | null | undefined): boolean {
  if (!code) return false;
  return /^piece_[a-z0-9]+$/i.test(code.trim());
}

function pieceCodeFromPlacement(
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
  // API の pieceCode / カタログの pieceCode が共に `piece_…` のとき、漢字からエンジン用コードへ
  if (catalogItem && isOpaquePieceInstanceId(catalogItem.pieceCode)) {
    const fromKanji = CHAR_TO_CODE[char];
    if (fromKanji) return toBasePieceCode(fromKanji) ?? fromKanji;
  }
  if (PROMOTED_CHAR_TO_BASE_CODE[char]) {
    return PROMOTED_CHAR_TO_BASE_CODE[char];
  }
  const fromKanji = CHAR_TO_CODE[char];
  if (fromKanji) return toBasePieceCode(fromKanji) ?? fromKanji;
  if (pieceCode) return toBasePieceCode(pieceCode);
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

function isGameAlreadyFinishedError(error: unknown): boolean {
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

function buildSfen(
  placements: BoardPiece[],
  hands: HandsState,
  sideToMove: Side,
  moveNo: number,
  pieceSfenMapping: PieceSfenMapping,
  pieceDefsByChar: Partial<Record<string, PieceCatalogItem>>,
) {
  const normalizedPlacements = placements.map((placement) => ({
    ...placement,
    pieceCode: pieceCodeFromPlacement(placement.pieceCode, placement.char, pieceDefsByChar),
  }));
  const board = toSfenBoardPure(normalizedPlacements, pieceSfenMapping);
  const side = sideToMove === 'player' ? 'b' : 'w';
  const sfenHands = toSfenHandsPure(hands, pieceSfenMapping);
  return `${board} ${side} ${sfenHands} ${Math.max(1, moveNo)}`;
}

function buildBoardState(
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

function uniqueTargetsFromMoves(moves: BattleMove[]): BoardCell[] {
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

function hasAdjacentEnemyPiece(
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

/**
 * API／エンジンが返す駒キー（HOU / piece_… / canonical cannon 等）を、盤・手持ち・SFEN で共通の表示コードへ寄せる。
 */
function handKeyToDisplayPieceCode(rawKey: string, catalog: readonly PieceCatalogItem[]): string {
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

function remapHandsStateToDisplayPieceCodes(
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

type ConsumedDropHandPiece = {
  side: Side;
  pieceCode: string;
};

function legalMovesForBoardPiece(legalMoves: BattleMove[], row: number, col: number): BattleMove[] {
  return legalMoves.filter(
    (move) => move.dropPieceCode === null && move.fromRow === row && move.fromCol === col,
  );
}

function legalMovesForDropPiece(
  legalMoves: BattleMove[],
  pieceCode: string,
  catalog: readonly PieceCatalogItem[],
): BattleMove[] {
  const want = handKeyToDisplayPieceCode(pieceCode, catalog).toUpperCase();
  return legalMoves.filter((move) => {
    if (move.fromRow !== null || move.fromCol !== null) return false;
    const d = move.dropPieceCode;
    if (d == null) return false;
    return handKeyToDisplayPieceCode(d, catalog).toUpperCase() === want;
  });
}

function legalMovesToTarget(legalMoves: BattleMove[], to: BoardCell): BattleMove[] {
  return legalMoves.filter((move) => move.toRow === to.row && move.toCol === to.col);
}

function pieceCharFromCode(pieceCode: string, side: Side, promoted: boolean) {
  if (promoted && PROMOTED_CODE_TO_CHAR[pieceCode]) {
    return PROMOTED_CODE_TO_CHAR[pieceCode];
  }
  if (pieceCode === 'OU') {
    return side === 'enemy' ? '玉' : '王';
  }
  return CODE_TO_CHAR[pieceCode] ?? '?';
}

function handsFromCanonical(position: BattleCanonicalPosition): HandsState {
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

function patchHandsForStarReturnSkill(
  position: BattleCanonicalPosition,
  actorSide: Side,
  move: BattleMove | null | undefined,
  skillTriggered: boolean,
): BattleCanonicalPosition {
  if (!skillTriggered) return position;
  if (normalizeCapturedCodeForStarReturn(move?.capturedPieceCode) !== 'HOS') return position;
  const actorBag = { ...(position.hands[actorSide] ?? {}) };
  const actorCountRaw = actorBag.HOS;
  const actorCount =
    typeof actorCountRaw === 'number' && Number.isFinite(actorCountRaw)
      ? Math.max(0, Math.floor(actorCountRaw))
      : 0;
  if (actorCount <= 0) return position;
  const targetSide: Side = actorSide === 'player' ? 'enemy' : 'player';
  const targetBag = { ...(position.hands[targetSide] ?? {}) };
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
  return {
    ...position,
    hands: {
      ...position.hands,
      [actorSide]: actorBag,
      [targetSide]: targetBag,
    },
  };
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
    // SFEN 復元やマージで pieceCode が空でも、表示字から駒種を合わせられるようにする（特殊駒の二重計上防止）
    if (!p.pieceCode && p.char) {
      const fromChar = CHAR_TO_CODE[p.char]?.toUpperCase();
      if (fromChar === want) n += 1;
    }
  }
  return n;
}

/**
 * エンジン／永続化の不整合で、同一駒が盤上と手持ちに二重計上されることがある（特殊駒・成り駒で顕在化しやすい）。
 * 8 種の基本駒（未駒）はサーバの持ち駒カウントをそのまま使う。それ以外は盤上の枚数ぶん手持ちから減算する。
 *
 * 打ち駒の楽観更新用に負の「デット」を持たせる方式は、後から同コードの駒を取ったときにデットが残り
 * 手持ちが 0 になるため使わない（盤面実数との突合のみで二重計上を防ぐ）。
 */
function reconcileExtendedPieceHandsAgainstBoard(
  hands: HandsState,
  pieces: BoardPiece[],
): HandsState {
  function adjustBag(side: Side, bag: Record<string, number>): Record<string, number> {
    const next = { ...bag };
    for (const code of Object.keys(next)) {
      // 一部特殊駒は盤上にも同種が残ることが正常なため、盤上枚数との差分補正をかけると手駒表示が消える。
      const codeU = code.toUpperCase();
      if (codeU === 'ICE' || codeU === 'SAND' || codeU === 'WIND' || codeU === 'HIK') continue;
      if (STANDARD_PIECE_CODES.has(code.toUpperCase())) continue;
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

/** `boardState.skill_state.piece_statuses` の dark_blind を表示用マスクに反映 */
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

function applyDarkVeilFromSkillStateToPieces(
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

function poisonHazardCellsForDisplay(
  position: BattleCanonicalPosition,
): BoardCell[] {
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

function movementRuleByCellFromCanonical(position: BattleCanonicalPosition): Map<string, string> {
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

function immobilizedKeysFromCanonical(position: BattleCanonicalPosition): Set<string> {
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
    if (statusType !== 'stun' && statusType !== 'time_stop' && statusType !== 'dark_blind') continue;
    const side = normalizeSide(asString(entry.side) ?? 'player');
    const row = normalizeCellIndex(Number(entry.row));
    const col = normalizeCellIndex(Number(entry.col));
    if (row === null || col === null) continue;
    out.add(`${side}:${row}:${col}`);
  }
  return out;
}

function applyMovementRuleToTargets(
  origin: BoardCell,
  targets: BoardCell[],
  movementRule: string | null,
): BoardCell[] {
  if (!movementRule) return targets;
  if (movementRule === 'vertical_step_only') {
    return targets.filter((t) => t.col === origin.col && Math.abs(t.row - origin.row) === 1);
  }
  if (movementRule === 'orthogonal_step_only') {
    return targets.filter((t) => Math.abs(t.row - origin.row) + Math.abs(t.col - origin.col) === 1);
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
    if (!code) continue;
    const key = `${side}:${row}:${col}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const rawChar =
      asString(nested.char ?? entry.char) ?? pieceCharFromCode(code, side, rawPromoted);
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

function piecesFromCanonicalPosition(
  position: BattleCanonicalPosition,
  pieceSfenMapping: PieceSfenMapping,
  pieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
  promotedPieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
  existingPieces: BoardPiece[],
): BoardPiece[] {
  const board = position.sfen.split(' ')[0] ?? '';
  const ranks = board.split('/');
  const next: BoardPiece[] = [];

  ranks.forEach((rank, row) => {
    let col = 0;
    let promoted = false;
    for (const ch of rank) {
      if (ch === '+') {
        promoted = true;
        continue;
      }
      if (/\d/.test(ch)) {
        col += Number(ch);
        promoted = false;
        continue;
      }

      // A–Z と一部記号を先手（player）として扱う。
      let side: Side = ch >= 'A' && ch <= 'Z' ? 'player' : 'enemy';
      if (
        ch === '$' ||
        ch === '!' ||
        ch === '&' ||
        ch === '(' ||
        ch === '#' ||
        ch === '@' ||
        ch === '^' ||
        ch === '[' ||
        ch === '<' ||
        ch === '{' ||
        ch === ':' ||
        ch === '.' ||
        ch === '"' ||
        ch === '=' ||
        ch === '|'
      )
        side = 'player';
      if (
        ch === '%' ||
        ch === '?' ||
        ch === '*' ||
        ch === ')' ||
        ch === '~' ||
        ch === '`' ||
        ch === '_' ||
        ch === ']' ||
        ch === '>' ||
        ch === '}' ||
        ch === ';' ||
        ch === ',' ||
        ch === "'" ||
        ch === '-' ||
        ch === '\\'
      )
        side = 'enemy';
      // DB 由来 mapping から pieceCode を復元する（`+` プレフィックスの成り駒は第2引数が必要）。
      let pieceCode = sfenCharToDisplayChar(ch, promoted, pieceSfenMapping);
      if (!pieceCode && promoted) {
        pieceCode = sfenCharToDisplayChar(ch, false, pieceSfenMapping);
      }
      // 新規追加駒の SFEN マッピングが未同期でも、同一マスの既存駒を維持して
      // 盤面同期時に駒が消えるのを防ぐ（例: 毒・沼など）
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
      // 未知 SFEN 記号でも、同一マスに既存駒があれば side/char を既存値で維持する。
      // （初回同期で毒・沼が消える問題の抑止）
      const effectiveSide = usedPreservedCode ? (preservedAtCellAnySide?.side ?? side) : side;
      if (pieceCode && row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        // SFEN の `$`/`!`（先手）と `%`/`?`（後手）で先後は一意に判定できるため、
        // 直前手番(actorSide)での side 補正は行わない。
        // （鉄スキル等の強制移動で新マス着地した宝/鉛が敵化する不具合を防ぐ）
        const pieceDef = promoted
          ? (promotedPieceDefsByCode[pieceCode] ?? pieceDefsByCode[pieceCode])
          : pieceDefsByCode[pieceCode];
        // 既存 char の引き継ぎは「未知 SFEN を既存コードで補完したとき」のみ許可する。
        // そうしないと、移動先にいた別駒の char（例: 歩）が王へ誤って残る。
        const char =
          (usedPreservedCode ? preservedAtCellAnySide?.char : null) ??
          pieceCharFromCode(pieceCode, effectiveSide, promoted);
        const imageSignedUrl = preferBundledPromotedImageOverRemoteUrl(
          pieceCode,
          promoted,
          pieceDef?.imageSignedUrl ??
            findBestExistingImage(existingPieces, {
              side: effectiveSide,
              row,
              col,
              pieceCode,
              char,
              promoted,
            }) ??
            null,
        );

        next.push({
          side: effectiveSide,
          row,
          col,
          pieceCode,
          char,
          promoted,
          imageSignedUrl,
        });
      }

      col += 1;
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
  // boardState にだけ存在する駒（SFEN に載らない特殊駒など）を落とさない
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
        imageSignedUrl: preferBundledPromotedImageOverRemoteUrl(pieceCode, promoted, mergedUrl),
      });
    } else {
      mergedByKey.set(key, piece);
    }
  }
  return [...mergedByKey.values()];
}

function findPieceAt(placements: BoardPiece[], row: number, col: number) {
  return placements.find((piece) => piece.row === row && piece.col === col) ?? null;
}

function getDisplayChar(piece: BoardPiece) {
  if (piece.promoted && piece.pieceCode && PROMOTED_CODE_TO_CHAR[piece.pieceCode]) {
    return PROMOTED_CODE_TO_CHAR[piece.pieceCode];
  }
  return piece.char ?? (piece.pieceCode ? (CODE_TO_CHAR[piece.pieceCode] ?? '?') : '?');
}

function isPromotedVisualPiece(piece: BoardPiece) {
  // Stage 4 の「竜」(pieceCode=RYU) は成り飛ではなく通常の特殊駒。
  // promoted でない限り、ローカル成り画像(ryuo.png)へ寄せない。
  if ((piece.pieceCode?.toUpperCase() ?? '') === 'RYU' && !piece.promoted) {
    return false;
  }
  // pieceCode が欠ける同期タイミングでも、未成の「竜」は成り駒として扱わない。
  if (!piece.promoted && piece.char === '竜') {
    return false;
  }
  if (piece.promoted) return true;
  if (PROMOTED_DISPLAY_CHARS.has(piece.char)) return true;
  const pc = piece.pieceCode?.toUpperCase() ?? '';
  if (pc && VISUAL_PROMOTED_PIECE_CODES.has(pc)) return true;
  return false;
}

/** 表示用の駒から、標準ローカル成り PNG へ引く候補となる基底コードを列挙する */
function collectStandardBaseCodesForLocalPromotedImage(piece: BoardPiece): string[] {
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

/** bundled の `LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE` を候補コードから解決 */
function localPromotedModuleFromBaseCodeCandidates(candidates: Iterable<string>): number | null {
  for (const raw of candidates) {
    if (!raw) continue;
    const u = raw.toUpperCase();
    const mapped = (toBasePieceCode(u) ?? u).toUpperCase();
    const img = LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE[mapped];
    if (img != null) return img;
    if (mapped === 'RYU' || mapped === 'RY') {
      const alt = LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE.HI ?? LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE.RYU;
      if (alt != null) return alt;
    }
  }
  return null;
}

function resolvePromotedImageSource(piece: BoardPiece) {
  // Stage 4 の「竜」駒（char=竜, pieceCode=RYU）は通常の特殊駒画像を使う。
  if ((piece.pieceCode?.toUpperCase() ?? '') === 'RYU' && piece.char === '竜') {
    return null;
  }
  // pieceCode が未設定でも、未成の「竜」は通常駒画像を使う。
  if (!piece.promoted && piece.char === '竜') {
    return null;
  }
  if (!isPromotedVisualPiece(piece)) return null;

  // 成り駒はリモート URL より先に bundled PNG を確実に使う（コード表記ゆれ対策）
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
  if (!key && (piece.char === '龍' || piece.char === '竜')) {
    key = 'HI';
  }
  if (!key && (pc === 'HI' || pc === 'RYU')) {
    key = 'HI';
  }
  // API が promoted のみ true で char が未成「飛」のまま返すケース
  if (!key && piece.promoted && piece.char === '飛') {
    key = 'HI';
  }
  // char がまだ未成表記のまま（飛・角・歩…）でも CHAR_TO_CODE から基底を取りローカル画像へ
  if (!key && piece.promoted && piece.char) {
    const fromKanji = CHAR_TO_CODE[piece.char];
    if (fromKanji) {
      key = toBasePieceCode(fromKanji) ?? fromKanji;
    }
  }

  if (!key) return null;
  const fromMap = LOCAL_PROMOTED_PIECE_IMAGE_BY_CODE[key] ?? null;
  if (fromMap != null) return fromMap;

  // PROMOTED_CODE_TO_CHAR の成り字（龍・馬・と…）だけでもローカルへ
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

function isSpecialDisplayPiece(piece: BoardPiece): boolean {
  if (piece.pieceCode && !STANDARD_PIECE_CODES.has(piece.pieceCode)) return true;
  return (
    CHAR_TO_CODE[piece.char] != null && !STANDARD_PIECE_CODES.has(CHAR_TO_CODE[piece.char] ?? '')
  );
}

function preserveMovedPieceIdentity(
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

  // 着手先に駒が存在しない canonical は「移動後に消滅した」可能性があるため、
  // ここで駒を補完してしまうと毒マス侵入時の誤召喚になる。空マスはそのまま採用する。
  return nextPieces;
}

function pieceIdentityKey(piece: BoardPiece) {
  return `${piece.side}:${piece.row}:${piece.col}`;
}

/** 同一マスの同一駒か（成りで「飛」と「龍」、HI と RYU など表記ゆれを同一視） */
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

function reconcilePieceIdentity(
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

const PERSISTENT_HAZARD_CHARS = new Set(['毒', '沼']);

/**
 * canonical(SFEN/boardState) に一時的に載らないフレームが来ても、
 * 毒・沼のような持続配置駒を直前盤面から補完して表示消失を防ぐ。
 */
function restoreMissingPersistentHazardPieces(
  nextPieces: BoardPiece[],
  existingPieces: BoardPiece[],
): BoardPiece[] {
  const nextByCell = new Map<string, BoardPiece>();
  for (const p of nextPieces) {
    nextByCell.set(`${p.row}:${p.col}`, p);
  }
  for (const p of existingPieces) {
    if (!PERSISTENT_HAZARD_CHARS.has(p.char)) continue;
    const cellKey = `${p.row}:${p.col}`;
    const byCell = nextByCell.get(cellKey);
    // 持続駒補完は「欠損セルのみ」。既に何か駒がいるセルは canonical を優先する。
    // （毒/沼を取った直後に、捕獲先の味方駒が一時的に消える現象を防ぐ）
    if (!byCell) {
      nextByCell.set(cellKey, p);
    }
  }
  return [...nextByCell.values()];
}

function enforcePersistentHazardCells(
  nextPieces: BoardPiece[],
  persistentHazards: readonly BoardPiece[],
): BoardPiece[] {
  if (persistentHazards.length === 0) return nextPieces;
  const nextHazardCount = new Map<string, number>();
  for (const p of nextPieces) {
    if (!PERSISTENT_HAZARD_CHARS.has(p.char)) continue;
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
      // 既に canonical 上で占有されているセルは上書きしない（捕獲駒が沼に化けるのを防止）
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

/**
 * 合法手 API の座標が 0 始まり／1 始まりで混在しても盤上の駒と対応づける。
 * 見つからないと楽観更新がスキップされ、成り画像が遅れる原因になる。
 */
function resolveBattleMovePlacements(
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

  const variants: Array<{ fr: number; fc: number; tr: number; tc: number }> = [];
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

function isSelfCaptureLikeMove(
  prev: BoardPiece[],
  move: BattleMove,
  actorSide: Side,
  persistentHazards: readonly BoardPiece[] = [],
): boolean {
  const targetVariants: Array<{ row: number; col: number }> = [];
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

  // 同一座標へのノップ移動は除外（座標系ゆれの誤判定回避）
  if (move.fromRow != null && move.fromCol != null) {
    const fromVariants: Array<{ row: number; col: number }> = [];
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

function restorePieceAfterInvalidSelfCapture(
  nextPieces: BoardPiece[],
  resolvedBefore: { fromRow: number; fromCol: number; toRow: number; toCol: number; moving: BoardPiece },
): BoardPiece[] {
  const { fromRow, fromCol, toRow, toCol, moving } = resolvedBefore;
  const target = nextPieces.find((p) => p.row === toRow && p.col === toCol);
  if (!target || !PERSISTENT_HAZARD_CHARS.has(target.char)) {
    return nextPieces;
  }
  const fromOccupied = nextPieces.some((p) => p.row === fromRow && p.col === fromCol);
  if (fromOccupied) {
    return nextPieces;
  }
  return [...nextPieces, { ...moving, row: fromRow, col: fromCol }];
}

/** 成り選択など、盤上で確定したマスがあるときは API 座標より優先する */
type TrustedBoardEndpoints = {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
};

function buildPreservedMovedPieceForPlayer(
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
    // 成り選択の直前に「不成」で盤上へ動かしたあとでは、着手元に駒がなく着手先にだけある
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
  const resolvedPieceCode = pieceCodeFromPlacement(moved.pieceCode, moved.char, pieceDefsByChar);
  const codeKey = (resolvedPieceCode ?? moved.pieceCode ?? '').toUpperCase();
  const promoted = move.promote ? true : (moved.promoted ?? false);
  const promotedDef = move.promote ? promotedPieceDefsByCode[codeKey] : null;
  const imageSignedUrl = preferBundledPromotedImageOverRemoteUrl(
    resolvedPieceCode ?? moved.pieceCode,
    promoted,
    promotedDef?.imageSignedUrl ?? moved.imageSignedUrl,
  );
  const char = resolvedPieceCode
    ? pieceCharFromCode(resolvedPieceCode, moved.side, promoted)
    : moved.char;
  return {
    side: moved.side,
    toRow: resolved.toRow,
    toCol: resolved.toCol,
    pieceCode: resolvedPieceCode ?? moved.pieceCode,
    char,
    imageSignedUrl,
    promoted,
  };
}

/**
 * 同期直後の駒に、楽観で既に合わせた成り表示を載せる。
 * - canonical がまだ未成に見える → 楽観の promoted/char を反映
 * - 両方成りでも楽観だけローカル成り画像が効く → リモート URL で上書きしない
 */
function overlayPromotionFromOptimistic(
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
    // 楽観で imageSignedUrl を null にしている（標準駒のローカル成り画像）とき、
    // `??` で canonical の未成 URL に落ちるとリモートが一瞬／次ターンまで残る
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

/** 楽観的着手後の盤面（`setPieces` に渡す内容と同一）。同期時に `piecesRef` が未更新でも使えるようにする。 */
function computePiecesAfterOptimisticMove(
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

  const resolvedPieceCode = pieceCodeFromPlacement(moving.pieceCode, moving.char, pieceDefsByChar);
  const codeKey = (resolvedPieceCode ?? moving.pieceCode ?? '').toUpperCase();
  const promoted = move.promote ? true : (moving.promoted ?? false);
  const promotedDef = move.promote ? promotedPieceDefsByCode[codeKey] : null;
  const baseForChar =
    resolvedPieceCode ??
    (moving.pieceCode ? (toBasePieceCode(moving.pieceCode) ?? moving.pieceCode) : null);
  const char =
    baseForChar != null && baseForChar.length > 0
      ? pieceCharFromCode(baseForChar, moving.side, promoted)
      : moving.char;
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

type BoardPieceSpriteProps = {
  piece: BoardPiece;
  failed: boolean;
  onImageError: () => void;
  /** 成る直後のみ: require したローカル成り画像を `resolvePromotedImageSource` より優先 */
  instantPromotedSource?: number | null;
  instantPromotedKey?: string | null;
  /** 敵「闇」の隣接マスにいるとき、駒の文字・絵柄を判別しづらくする */
  darkVeiled?: boolean;
};

const BoardPieceSprite = memo(function BoardPieceSprite({
  piece,
  failed,
  onImageError,
  instantPromotedSource = null,
  instantPromotedKey = null,
  darkVeiled = false,
}: BoardPieceSpriteProps) {
  const rowIndex = normalizeCellIndex(piece.row);
  const colIndex = normalizeCellIndex(piece.col);
  if (rowIndex === null || colIndex === null) {
    return null;
  }

  const enemy = isEnemySide(piece.side);
  const king = piece.pieceCode === 'OU' || isKingChar(piece.char);
  const pieceScalePercent =
    BOARD_PIECE_SIZE_OVERRIDES[piece.char] ??
    (king ? KING_PIECE_SIZE_PERCENT : NORMAL_PIECE_SIZE_PERCENT);
  const isStage4DragonVisual =
    (piece.pieceCode?.toUpperCase() ?? '') === 'RYU' && piece.char === '竜';
  const bundledPromoted =
    !isStage4DragonVisual && (piece.promoted || isPromotedVisualPiece(piece))
      ? localPromotedModuleFromBaseCodeCandidates(
          collectStandardBaseCodesForLocalPromotedImage(piece),
        )
      : null;
  const localPromotedImageSource =
    instantPromotedSource != null
      ? instantPromotedSource
      : bundledPromoted != null
        ? bundledPromoted
        : resolvePromotedImageSource(piece);
  const bundledOrLocalSource =
    localPromotedImageSource ?? (failed ? null : getPieceImageSource(piece)) ?? null;
  // require() のモジュール ID をキーに含め、Expo Image の recycling で別駒テクスチャが再利用されるのを防ぐ
  const imageAssetFingerprint =
    typeof bundledOrLocalSource === 'number' ? `m${bundledOrLocalSource}` : failed ? 'fail' : 'none';
  const imageSource = bundledOrLocalSource;
  const pieceImageRecyclingKey = `${instantPromotedKey ?? 'x'}-${piece.side}-r${piece.row}-c${piece.col}-p${piece.promoted ? 1 : 0}-ch${piece.char}-pc${piece.pieceCode ?? ''}-src${imageAssetFingerprint}`;

  return (
    <View
      style={{
        position: 'absolute',
        top: `${rowIndex * BOARD_CELL_INNER_RATIO * 100}%`,
        left: `${colIndex * BOARD_CELL_INNER_RATIO * 100}%`,
        width: `${BOARD_CELL_INNER_RATIO * 100}%`,
        height: `${BOARD_CELL_INNER_RATIO * 100}%`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        className="items-center justify-center"
        style={{
          width: `${pieceScalePercent}%`,
          height: `${pieceScalePercent}%`,
          overflow: 'hidden',
          transform: [{ rotate: enemy ? '180deg' : '0deg' }],
        }}
      >
        <View style={{ width: '100%', height: '100%', position: 'relative' }}>
          {localPromotedImageSource != null ? (
            <Image
              key={`pl-${instantPromotedKey ?? 'n'}-${piece.side}-${piece.row}-${piece.col}-${piece.promoted ? 1 : 0}-${piece.char}-${piece.pieceCode ?? ''}`}
              recyclingKey={pieceImageRecyclingKey}
              source={localPromotedImageSource}
              contentFit="contain"
              transition={0}
              cachePolicy="memory-disk"
              style={{ width: '100%', height: '100%' }}
            />
          ) : imageSource ? (
            <Image
              key={`uri-${piece.side}-${piece.row}-${piece.col}-${piece.promoted ? 1 : 0}-${piece.char}-${piece.pieceCode ?? ''}-src${imageAssetFingerprint}`}
              recyclingKey={pieceImageRecyclingKey}
              source={imageSource}
              contentFit="contain"
              style={{ width: '100%', height: '100%' }}
              onError={onImageError}
            />
          ) : (
            <View style={{ width: '100%', height: '100%' }}>
              <Svg width="100%" height="100%" viewBox="0 0 100 120">
                <Polygon
                  points="50,3 97,30 83,117 17,117 3,30"
                  fill={fallbackPiecePalette(piece.side).fill}
                  stroke={fallbackPiecePalette(piece.side).stroke}
                  strokeWidth={5}
                />
              </Svg>
              <View
                style={{
                  position: 'absolute',
                  inset: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                }}
              >
                {king ? (
                  <Crown size={16} color={fallbackPiecePalette(piece.side).icon} />
                ) : (
                  <Shield size={16} color={fallbackPiecePalette(piece.side).icon} />
                )}
                <Text
                  className="text-sm font-black"
                  style={{ color: fallbackPiecePalette(piece.side).text }}
                >
                  {darkVeiled ? '' : getDisplayChar(piece)}
                </Text>
              </View>
            </View>
          )}
          {darkVeiled ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                /** 闇に包まれた駒は文字・絵柄を完全に隠す（透過なしの不透過黒） */
                backgroundColor: '#000000',
              }}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
});

const StaticBoardBackground = memo(function StaticBoardBackground() {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${BOARD_VIEWBOX} ${BOARD_VIEWBOX}`}>
      <Rect x={0} y={0} width={BOARD_VIEWBOX} height={BOARD_VIEWBOX} fill="#deb887" />
      <Rect
        x={BOARD_PADDING}
        y={BOARD_PADDING}
        width={BOARD_INNER}
        height={BOARD_INNER}
        fill="#e8c88e"
        stroke="#7a4b20"
        strokeWidth={2}
      />
      {Array.from({ length: BOARD_SIZE + 1 }).map((_, i) => {
        const p = BOARD_PADDING + BOARD_CELL * i;
        return (
          <Line
            key={`v-${i}`}
            x1={p}
            y1={BOARD_PADDING}
            x2={p}
            y2={BOARD_PADDING + BOARD_INNER}
            stroke="#6b3f1a"
            strokeWidth={1.5}
          />
        );
      })}
      {Array.from({ length: BOARD_SIZE + 1 }).map((_, i) => {
        const p = BOARD_PADDING + BOARD_CELL * i;
        return (
          <Line
            key={`h-${i}`}
            x1={BOARD_PADDING}
            y1={p}
            x2={BOARD_PADDING + BOARD_INNER}
            y2={p}
            stroke="#6b3f1a"
            strokeWidth={1.5}
          />
        );
      })}
    </Svg>
  );
});

type BoardHighlightsLayerProps = {
  selectedCell: BoardCell | null;
  legalTargets: BoardCell[];
  aiPreviewTarget: BoardCell | null;
  enemyPreviewTargets: BoardCell[];
  poisonHazards: BoardCell[];
};

type PoisonHazardLayerProps = {
  poisonHazards: BoardCell[];
};

const PoisonHazardLayer = memo(function PoisonHazardLayer({ poisonHazards }: PoisonHazardLayerProps) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
      {poisonHazards.map((cell) => (
        <View
          key={`poison-image-${cell.row}-${cell.col}`}
          style={{
            position: 'absolute',
            top: `${cell.row * BOARD_CELL_INNER_RATIO * 100}%`,
            left: `${cell.col * BOARD_CELL_INNER_RATIO * 100}%`,
            width: `${BOARD_CELL_INNER_RATIO * 100}%`,
            height: `${BOARD_CELL_INNER_RATIO * 100}%`,
            backgroundColor: '#7c3aed33',
          }}
        >
          <Image
            source={POISON_CELL_IMAGE_SOURCE}
            contentFit="cover"
            style={{ width: '100%', height: '100%' }}
          />
        </View>
      ))}
    </View>
  );
});

const BoardHighlightsLayer = memo(function BoardHighlightsLayer({
  selectedCell,
  legalTargets,
  aiPreviewTarget,
  enemyPreviewTargets,
  poisonHazards,
}: BoardHighlightsLayerProps) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${BOARD_INNER} ${BOARD_INNER}`}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      {selectedCell ? (
        <Rect
          x={selectedCell.col * BOARD_CELL}
          y={selectedCell.row * BOARD_CELL}
          width={BOARD_CELL}
          height={BOARD_CELL}
          fill="none"
          stroke="#2563eb"
          strokeWidth={4}
        />
      ) : null}
      {legalTargets.map((target) => (
        <Rect
          key={`legal-${target.row}-${target.col}`}
          x={target.col * BOARD_CELL}
          y={target.row * BOARD_CELL}
          width={BOARD_CELL}
          height={BOARD_CELL}
          fill="none"
          stroke="#16a34a"
          strokeWidth={4}
        />
      ))}
      {aiPreviewTarget ? (
        <Rect
          key={`ai-preview-${aiPreviewTarget.row}-${aiPreviewTarget.col}`}
          x={aiPreviewTarget.col * BOARD_CELL}
          y={aiPreviewTarget.row * BOARD_CELL}
          width={BOARD_CELL}
          height={BOARD_CELL}
          fill="#16a34a55"
          stroke="#16a34a"
          strokeWidth={4}
        />
      ) : null}
      {enemyPreviewTargets.map((target) => (
        <Rect
          key={`enemy-preview-${target.row}-${target.col}`}
          x={target.col * BOARD_CELL}
          y={target.row * BOARD_CELL}
          width={BOARD_CELL}
          height={BOARD_CELL}
          fill="#dc262622"
          stroke="#dc2626"
          strokeWidth={4}
        />
      ))}
      {/* 毒マスは PoisonHazardLayer の画像描画を使用 */}
    </Svg>
  );
});

type BoardTouchLayerProps = {
  onCellPress: (row: number, col: number) => void;
  onCellLongPress: (row: number, col: number) => void;
};

const BoardTouchLayer = memo(function BoardTouchLayer({
  onCellPress,
  onCellLongPress,
}: BoardTouchLayerProps) {
  return (
    <>
      {Array.from({ length: BOARD_SIZE }).map((_, rowIndex) =>
        Array.from({ length: BOARD_SIZE }).map((__, colIndex) => (
          <Pressable
            key={`cell-${rowIndex}-${colIndex}`}
            testID={`board-cell-${rowIndex}-${colIndex}`}
            className="absolute items-center justify-center"
            style={{
              top: `${rowIndex * BOARD_CELL_INNER_RATIO * 100}%`,
              left: `${colIndex * BOARD_CELL_INNER_RATIO * 100}%`,
              width: `${BOARD_CELL_INNER_RATIO * 100}%`,
              height: `${BOARD_CELL_INNER_RATIO * 100}%`,
            }}
            onPress={() => {
              onCellPress(rowIndex, colIndex);
            }}
            onLongPress={() => {
              onCellLongPress(rowIndex, colIndex);
            }}
            delayLongPress={350}
          />
        )),
      )}
    </>
  );
});

type BoardPiecesLayerProps = {
  pieces: BoardPiece[];
  failedImageKeys: Record<string, true>;
  onPieceImageError: (pieceKey: string) => void;
  /** 成り確定時などに増やして Expo Image / memo の取りこぼしを防ぐ */
  spriteEpoch?: number;
  promotionImageFlash?: PromotionImageFlash | null;
};

const BoardPiecesLayer = memo(function BoardPiecesLayer({
  pieces,
  failedImageKeys,
  onPieceImageError,
  spriteEpoch = 0,
  promotionImageFlash = null,
}: BoardPiecesLayerProps) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {pieces.map((placement) => {
        const placementKey = `${spriteEpoch}-${placement.side}-${placement.pieceCode ?? 'X'}-${placement.promoted ? 'P' : 'N'}-${getDisplayChar(placement)}-${placement.row}-${placement.col}`;
        const flash =
          promotionImageFlash &&
          promotionImageFlash.side === placement.side &&
          promotionImageFlash.row === placement.row &&
          promotionImageFlash.col === placement.col
            ? promotionImageFlash
            : null;
        return (
          <BoardPieceSprite
            key={placementKey}
            piece={placement}
            failed={Boolean(failedImageKeys[placementKey])}
            onImageError={() => {
              onPieceImageError(placementKey);
            }}
            instantPromotedSource={flash?.assetModule ?? null}
            instantPromotedKey={flash?.flashKey ?? null}
            darkVeiled={Boolean(placement.darkVeiled)}
          />
        );
      })}
    </View>
  );
});

function normalizeSkillName(skill: string | undefined): string | null {
  if (!skill) return null;
  const normalized = skill.trim();
  if (!normalized || normalized === '-' || normalized === 'なし' || normalized === '準備中') {
    return null;
  }
  return normalized;
}

function resolveInspectSkillDescription(char: string, desc: string | undefined): string {
  if (char === '葉') return LEAF_SKILL_DESCRIPTION;
  if (char === '電') return ELECTRIC_SKILL_DESCRIPTION;
  if (char === '氷') return ICE_SKILL_DESCRIPTION;
  if (char === '魚') return FISH_SKILL_DESCRIPTION;
  if (char === '苔') return MOSS_SKILL_DESCRIPTION;
  if (char === '虹') return RAINBOW_SKILL_DESCRIPTION;
  const normalized = (desc ?? '').trim();
  return normalized.length > 0 ? normalized : '詳細は準備中です。';
}

function resolveInspectMoveDescription(char: string, move: string | undefined): string {
  if (char === '闇') return '全方向に1マス';
  const normalized = (move ?? '').trim();
  return normalized.length > 0 ? normalized : '準備中';
}

function toUserFacingBattleError(error: unknown): string {
  if (error instanceof ApiClientError) {
    const rawApiMessage = error.message ?? '';
    const trimmedApiMessage = rawApiMessage.trim();
    if (trimmedApiMessage.startsWith('{') && trimmedApiMessage.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmedApiMessage) as { code?: string; message?: string };
        if (parsed.code === 'ILLEGAL_MOVE') {
          return '通信中に局面がずれました。合法手を再取得するため、もう一度操作してください。';
        }
        if (typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
          return parsed.message.trim();
        }
      } catch {
        // no-op
      }
    }
    if (error.status === 502 || error.status === 503 || error.status === 504) {
      return 'サーバーが一時的に混み合っています。少し待ってから再試行してください。';
    }
    if (error.code === 'INVALID_JSON_RESPONSE') {
      return 'サーバー応答の解析に失敗しました。通信環境を確認して再試行してください。';
    }
    return error.message;
  }
  if (error instanceof Error) {
    const raw = error.message ?? '';
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed) as { code?: string; message?: string };
        if (parsed.code === 'ILLEGAL_MOVE') {
          return '通信中に局面がずれました。合法手を再取得するため、もう一度操作してください。';
        }
        if (typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
          return parsed.message.trim();
        }
      } catch {
        // no-op: fallback to plain text handling
      }
    }
    if (/^\s*</.test(raw) || /<!DOCTYPE html>/i.test(raw)) {
      return 'サーバーエラーが発生しました。時間をおいて再試行してください。';
    }
    const compact = raw.replace(/\s+/g, ' ').trim();
    return compact.length > 160 ? `${compact.slice(0, 157)}...` : compact;
  }
  return String(error);
}

function isIllegalMoveError(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    if (error.code === 'ILLEGAL_MOVE') return true;
    const raw = (error.message ?? '').trim();
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw) as { code?: string };
        return parsed.code === 'ILLEGAL_MOVE';
      } catch {
        return false;
      }
    }
    return false;
  }
  if (error instanceof Error) {
    const raw = (error.message ?? '').trim();
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw) as { code?: string };
        return parsed.code === 'ILLEGAL_MOVE';
      } catch {
        return false;
      }
    }
  }
  return false;
}

export function StageShogiScreen() {
  const params = useLocalSearchParams<{ stage?: string }>();
  const stageParam = Array.isArray(params.stage) ? params.stage[0] : params.stage;
  const { isReady: isAuthReady, userId } = useAuthSession();
  const { snapshot, isLoading, loadError } = useStageBattleScreen(
    stageParam,
    isAuthReady ? (userId ?? 'guest') : undefined,
  );
  const { isReady: areAssetsReady } = useAssetPreload(listLocalPieceImageModules());
  const [failedImageKeys, setFailedImageKeys] = useState<Record<string, true>>({});
  const [pieces, setPieces] = useState<BoardPiece[]>([]);
  /** レンダー直後の盤（ref より state に近い）。成り選択の onPress で即時に使う */
  const piecesRenderRef = useRef<BoardPiece[]>([]);
  piecesRenderRef.current = pieces;
  const [boardSpriteEpoch, setBoardSpriteEpoch] = useState(0);
  const [sideToMove, setSideToMove] = useState<Side>('player');
  const [moveNo, setMoveNo] = useState(1);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<BoardCell | null>(null);
  const [selectedDropPieceCode, setSelectedDropPieceCode] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<BoardCell[]>([]);
  const [aiPreviewTarget, setAiPreviewTarget] = useState<BoardCell | null>(null);
  const [playerLegalMoves, setPlayerLegalMoves] = useState<BattleMove[]>([]);
  const [enemyPreviewTargets, setEnemyPreviewTargets] = useState<BoardCell[]>([]);
  const [poisonHazardCells, setPoisonHazardCells] = useState<BoardCell[]>([]);
  const [isLoadingPlayerLegalMoves, setIsLoadingPlayerLegalMoves] = useState(false);
  const [hands, setHands] = useState<HandsState>(createEmptyHandsState());
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [pendingTimeActionCell, setPendingTimeActionCell] = useState<BoardCell | null>(null);
  const [timeActionMode, setTimeActionMode] = useState<TimeActionMode | null>(null);
  const [promotionImageFlash, setPromotionImageFlash] = useState<PromotionImageFlash | null>(null);
  const [stateHash, setStateHash] = useState<string | null>(null);
  const [pieceCatalog, setPieceCatalog] = useState<PieceCatalogItem[]>([]);
  const [winner, setWinner] = useState<Side | null>(null);
  const [clearRewardText, setClearRewardText] = useState<string | null>(null);
  const [skillActivationText, setSkillActivationText] = useState<string | null>(null);
  const [inspectingPiece, setInspectingPiece] = useState<{
    char: string;
    pieceCode?: string | null;
    name: string;
    desc: string;
    move: string;
    imageSignedUrl: string | null;
  } | null>(null);
  const loadPieceCatalogUseCase = useMemo(() => createLoadPieceCatalogUseCase(), []);
  const claimStageClearRewardUseCase = useMemo(() => createClaimStageClearRewardUseCase(), []);
  const createGameUseCase = useMemo(() => new CreateGameUseCase(), []);
  const commitGameMoveUseCase = useMemo(() => new CommitGameMoveUseCase(), []);
  const loadGameStateUseCase = useMemo(() => new LoadGameStateUseCase(), []);
  const loadGameLegalMovesUseCase = useMemo(() => new LoadGameLegalMovesUseCase(), []);
  const requestAiMoveUseCase = useMemo(() => new RequestAiMoveUseCase(), []);
  const isMountedRef = useRef(true);
  const piecesRef = useRef<BoardPiece[]>([]);
  const persistentHazardsRef = useRef<BoardPiece[]>([]);
  const latestMovementRuleByCellRef = useRef<Map<string, string>>(new Map());
  const latestImmobilizedByCellRef = useRef<Set<string>>(new Set());
  /** 成りダイアログを出す直前の盤（不成で先に動かす前）。「成る」確定時はここから楽観計算する */
  const piecesBeforePromotionDialogRef = useRef<BoardPiece[] | null>(null);
  const handsRef = useRef<HandsState>(createEmptyHandsState());
  const stateHashRef = useRef<string | null>(null);
  const handleCellPressRef = useRef<(row: number, col: number) => void>(() => undefined);
  const hasEnteredBattleRef = useRef(false);
  const prevStageRef = useRef<string | undefined>(undefined);
  const aiThinkingRef = useRef(false);
  const inFlightAiKeyRef = useRef<string | null>(null);
  const lastSuccessfulAiKeyRef = useRef<string | null>(null);
  const clearRewardClaimedRef = useRef(false);
  const battleSessionSettledRef = useRef(false);
  const skillToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecoveringFromIllegalMoveRef = useRef(false);
  const pendingAiResumeRef = useRef<{ moveNo: number; side: Side } | null>(null);
  const illegalRecoverSignatureRef = useRef<string | null>(null);
  const illegalRecoverAttemptsRef = useRef(0);
  useScreenBgm('battle');

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (skillToastTimeoutRef.current) {
        clearTimeout(skillToastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    piecesRef.current = pieces;
  }, [pieces]);
  useEffect(() => {
    handsRef.current = hands;
  }, [hands]);

  useEffect(() => {
    stateHashRef.current = stateHash;
  }, [stateHash]);

  useEffect(() => {
    if (!promotionImageFlash) return;
    const hit = pieces.find(
      (p) =>
        p.row === promotionImageFlash.row &&
        p.col === promotionImageFlash.col &&
        p.side === promotionImageFlash.side,
    );
    if (hit != null && resolvePromotedImageSource(hit) != null) {
      setPromotionImageFlash(null);
      return;
    }
    const t = setTimeout(() => setPromotionImageFlash(null), 2500);
    return () => clearTimeout(t);
  }, [pieces, promotionImageFlash]);

  const pieceDefsByChar = useMemo(
    () =>
      Object.fromEntries(pieceCatalog.map((item) => [item.char, item])) as Record<
        string,
        PieceCatalogItem
      >,
    [pieceCatalog],
  );
  const pieceDefsByCode = useMemo(() => {
    const map: Record<string, PieceCatalogItem> = {};
    for (const it of pieceCatalog) {
      if (it.pieceCode) {
        map[it.pieceCode.toUpperCase()] = it;
      }
      if (it.canonicalCode) {
        map[it.canonicalCode.toUpperCase()] = it;
        map[it.canonicalCode.toLowerCase()] = it;
      }
      const codeFromChar = CHAR_TO_CODE[it.char];
      if (codeFromChar) {
        map[codeFromChar.toUpperCase()] = it;
      }
    }
    for (const [code, char] of Object.entries(CODE_TO_CHAR)) {
      const item = pieceDefsByChar[char];
      if (item) {
        map[code] = item;
      }
    }
    return map;
  }, [pieceCatalog, pieceDefsByChar]);
  const promotedPieceDefsByCode = useMemo(() => {
    const map: Record<string, PieceCatalogItem> = {};

    // 1) DBカタログで isPromoted=true の駒を最優先で採用する。
    for (const item of pieceCatalog) {
      if (!item.isPromoted) continue;
      const byPieceCode = item.pieceCode?.toUpperCase();
      if (byPieceCode) {
        map[byPieceCode] = item;
        continue;
      }
      const byChar = CHAR_TO_CODE[item.char]?.toUpperCase();
      if (byChar) {
        map[byChar] = item;
      }
    }

    // 2) 足りない分だけ従来の文字マップで補完する。
    for (const [code, char] of Object.entries(PROMOTED_CODE_TO_CHAR)) {
      if (map[code]) continue;
      const fallback = pieceDefsByChar[char];
      if (fallback) {
        map[code] = fallback;
      }
    }

    return map;
  }, [pieceCatalog, pieceDefsByChar]);
  const pieceSfenMapping = useMemo(() => createPieceSfenMapping(pieceCatalog), [pieceCatalog]);

  function resolveSkillName(move: BattleMove): string | null {
    const code = move.pieceCode || move.dropPieceCode;
    if (!code) return null;
    const base = normalizeSkillName(pieceDefsByCode[code]?.skill);
    const promoted = normalizeSkillName(promotedPieceDefsByCode[code]?.skill);
    return move.promote ? (promoted ?? base) : (base ?? promoted);
  }

  function showSkillActivation(actor: Side, move: BattleMove) {
    const actorLabel = actor === 'player' ? 'あなた' : 'CPU';
    const skillName = resolveSkillName(move);
    const message = skillName
      ? `${actorLabel} スキル発動: ${skillName}`
      : `${actorLabel} スキル発動`;
    setSkillActivationText(message);
    if (skillToastTimeoutRef.current) {
      clearTimeout(skillToastTimeoutRef.current);
    }
    skillToastTimeoutRef.current = setTimeout(() => {
      setSkillActivationText(null);
      skillToastTimeoutRef.current = null;
    }, 1400);
  }

  function syncFromCanonicalPosition(
    position: BattleCanonicalPosition,
    game: BattleGameStatus,
    preservedMovedPiece?: PreservedMovedPiece,
    /** `await` 直後は `piecesRef` が楽観更新より遅れるため、直前に計算した盤面を渡す */
    optimisticBaseline?: BoardPiece[] | null,
  ): Side | null {
    const reconcileSource = optimisticBaseline ?? piecesRef.current;
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
    const withPersistentCells = enforcePersistentHazardCells(
      withPromotionOverlay,
      persistentHazardsRef.current,
    );
    const withDarkVeil = applyDarkVeilFromSkillStateToPieces(withPersistentCells, position);
    const nextPoisonHazards = poisonHazardCellsForDisplay(position);
    latestMovementRuleByCellRef.current = movementRuleByCellFromCanonical(position);
    latestImmobilizedByCellRef.current = immobilizedKeysFromCanonical(position);
    // hands は canonical JSON を唯一の真実として扱う（SFEN 由来の手と混ぜると二重計上が起きやすい）
    const nextHands = remapHandsStateToDisplayPieceCodes(
      normalizeHandsStateKeys(handsFromCanonical(position)),
      pieceCatalog,
    );
    const reconciledHands = reconcileExtendedPieceHandsAgainstBoard(
      nextHands,
      withPromotionOverlay,
    );
    const stabilizedPieces = enforcePersistentHazardCells(withDarkVeil, persistentHazardsRef.current);
    setPromotionImageFlash(null);
    setPieces(stabilizedPieces);
    // stale な永続ハザード参照で捕獲後に「沼」へ戻るのを防ぐため、canonical 同期ごとに更新する。
    persistentHazardsRef.current = stabilizedPieces.filter((p) => PERSISTENT_HAZARD_CHARS.has(p.char));
    setPoisonHazardCells(nextPoisonHazards);
    setHands(reconciledHands);
    setSideToMove(position.sideToMove);
    setMoveNo(position.turnNumber);
    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
    setEnemyPreviewTargets([]);
    setAiPreviewTarget(null);
    setPlayerLegalMoves([]);
    setPendingPromotion(null);
    stateHashRef.current = position.stateHash;
    setStateHash(position.stateHash);

    if (game.status === 'finished') {
      const nextWinner = game.winnerSide ?? null;
      setWinner(nextWinner);
      return nextWinner;
    }

    setWinner(null);
    return null;
  }

  const isFinished = winner !== null;

  useEffect(() => {
    const next = snapshot.placements
      .map((placement) => {
        let row = normalizeCellIndex(placement.row);
        const col = normalizeCellIndex(placement.col);
        if (row === null || col === null) return null;
        const side = normalizeSide(placement.side);
        const piece: BoardPiece = {
          side,
          row,
          col,
          pieceCode: pieceCodeFromPlacement(placement.pieceCode, placement.char, pieceDefsByChar),
          char: placement.char,
          promoted: false,
          imageSignedUrl: placement.imageSignedUrl,
        };
        return piece;
      })
      .filter((value): value is BoardPiece => value !== null);
    const snapshotPersistentHazards = next.filter((p) => PERSISTENT_HAZARD_CHARS.has(p.char));
    const enemySwampCount = snapshotPersistentHazards.filter(
      (p) => p.char === '沼' && p.side === 'enemy',
    ).length;
    if (Number(stageParam) === 18 && enemySwampCount === 0) {
      console.warn('[stage18] enemy swamp is not recognized as enemy in initial snapshot');
    }

    const stageChanged = prevStageRef.current !== stageParam;
    prevStageRef.current = stageParam;
    if (!stageChanged && gameId) {
      return;
    }

    setPieces(next);
    persistentHazardsRef.current = snapshotPersistentHazards;
    setSideToMove('player');
    setMoveNo(1);
    setGameId(null);
    setAiError(null);
    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
    setEnemyPreviewTargets([]);
    setPoisonHazardCells([]);
    setAiPreviewTarget(null);
    setPlayerLegalMoves([]);
    setHands(createEmptyHandsState());
    setPendingPromotion(null);
    setStateHash(null);
    setWinner(null);
    setClearRewardText(null);
    setSkillActivationText(null);
    if (skillToastTimeoutRef.current) {
      clearTimeout(skillToastTimeoutRef.current);
      skillToastTimeoutRef.current = null;
    }
    aiThinkingRef.current = false;
    inFlightAiKeyRef.current = null;
    lastSuccessfulAiKeyRef.current = null;
    clearRewardClaimedRef.current = false;
    battleSessionSettledRef.current = false;
    hasEnteredBattleRef.current = false;
    pendingAiResumeRef.current = null;
    illegalRecoverSignatureRef.current = null;
    illegalRecoverAttemptsRef.current = 0;
  }, [gameId, pieceDefsByChar, snapshot, stageParam]);

  useEffect(() => {
    let active = true;
    loadPieceCatalogUseCase
      .execute()
      .then((items) => {
        if (active) {
          setPieceCatalog(items);
          setLocalBattlePieceCatalog(items);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setAiError(toUserFacingBattleError(error));
        }
      });
    return () => {
      active = false;
    };
  }, [loadPieceCatalogUseCase]);

  useEffect(() => {
    if (!loadError) return;
    setAiError(toUserFacingBattleError(loadError));
    setGameId(null);
    setWinner(null);
    setIsCreatingGame(false);
    setIsAiThinking(false);
    setPlayerLegalMoves([]);
  }, [loadError]);

  useEffect(() => {
    if (isLoading || loadError || isCreatingGame || gameId || !userId) return;
    if (Object.keys(pieceSfenMapping.codeToSfen).length === 0) return;
    if (snapshot.placements.length > 0 && pieces.length === 0) return;

    setIsCreatingGame(true);

    const stageNo = Number(stageParam);
    void createGameUseCase
      .execute({
        playerId: userId,
        stageNo: Number.isInteger(stageNo) && stageNo > 0 ? stageNo : undefined,
        initialPosition: {
          sideToMove,
          turnNumber: moveNo,
          moveCount: moveNo - 1,
          sfen: buildSfen(pieces, hands, sideToMove, moveNo, pieceSfenMapping, pieceDefsByChar),
          boardState: buildBoardState(pieces, pieceDefsByCode),
          hands,
        },
      })
      .then((res) => {
        if (isMountedRef.current) {
          setGameId(res.gameId);
        }
      })
      .catch((error: unknown) => {
        if (isMountedRef.current) {
          setAiError(toUserFacingBattleError(error));
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsCreatingGame(false);
        }
      });
  }, [
    gameId,
    isCreatingGame,
    loadError,
    isLoading,
    moveNo,
    stageParam,
    pieces,
    hands,
    sideToMove,
    snapshot,
    userId,
    createGameUseCase,
    pieceSfenMapping,
  ]);

  useEffect(() => {
    if (!gameId || sideToMove !== 'player' || isCreatingGame || isFinished) {
      return;
    }

    let active = true;
    setAiError(null);
    setIsLoadingPlayerLegalMoves(true);

    loadGameLegalMovesUseCase
      .execute({ gameId })
      .then((result) => {
        if (!active) return;
        if (result.sideToMove !== 'player' || result.moveNo !== moveNo) {
          setPlayerLegalMoves((prev) => (prev.length === 0 ? prev : []));
          return;
        }
        setStateHash(result.stateHash);
        if (result.legalMoves.length === 0) {
          setWinner('enemy');
          return;
        }
        setPlayerLegalMoves(result.legalMoves);
      })
      .catch((error: unknown) => {
        if (active) {
          setAiError(toUserFacingBattleError(error));
          setPlayerLegalMoves((prev) => (prev.length === 0 ? prev : []));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingPlayerLegalMoves(false);
        }
      });

    return () => {
      active = false;
    };
  }, [gameId, sideToMove, moveNo, isCreatingGame, isFinished, loadGameLegalMovesUseCase]);

  useEffect(() => {
    if (Object.keys(failedImageKeys).length === 0) {
      return;
    }
    setFailedImageKeys({});
  }, [failedImageKeys, pieces]);

  useEffect(() => {
    if (!selectedCell) return;
    const at = findPieceAt(pieces, selectedCell.row, selectedCell.col);
    // 闇に覆われた駒でも選択は維持し、緑の移動先ハイライトだけ消す
    if (at?.darkVeiled) {
      setLegalTargets([]);
      setEnemyPreviewTargets([]);
    }
  }, [pieces, selectedCell]);

  const handleAiMove = async (nextMoveNo: number, expectedSideToMove: Side = sideToMove) => {
    if (
      !gameId ||
      expectedSideToMove !== 'enemy' ||
      isAiThinking ||
      isCreatingGame ||
      aiThinkingRef.current
    )
      return;
    const requestKey = `${gameId}:${nextMoveNo}:${expectedSideToMove}`;
    if (inFlightAiKeyRef.current === requestKey) return;
    if (lastSuccessfulAiKeyRef.current === requestKey) return;
    aiThinkingRef.current = true;
    inFlightAiKeyRef.current = requestKey;
    setIsAiThinking(true);
    setAiError(null);

    try {
      const response = await requestAiMoveUseCase.execute({
        gameId,
        moveNo: nextMoveNo,
        stateHash: stateHashRef.current,
        engineConfig: {},
      });

      if (response.skillTriggered && response.selectedMove) {
        showSkillActivation('enemy', response.selectedMove);
      }
      const patchedAiPosition = patchHandsForStarReturnSkill(
        response.position,
        'enemy',
        response.selectedMove,
        response.skillTriggered,
      );

      let preservedMovedPiece: PreservedMovedPiece | undefined;
      let optimisticBaseline: BoardPiece[] | undefined;
      const selectedMove = response.selectedMove;
      const invalidSelfCaptureResolved =
        selectedMove &&
        isSelfCaptureLikeMove(piecesRef.current, selectedMove, 'enemy', persistentHazardsRef.current)
          ? resolveBattleMovePlacements(piecesRef.current, selectedMove)
          : null;
      if (invalidSelfCaptureResolved) {
        // 不正候補は盤面破壊を避けるため楽観更新に使わない。
        // canonical をそのまま同期して矛盾を作らない。
        setAiError('CPU の着手候補が不正なため、盤面同期のみ行いました。');
      }
      const selectedMoveForApply = invalidSelfCaptureResolved ? null : selectedMove;
      if (selectedMoveForApply?.fromRow != null && selectedMoveForApply?.fromCol != null) {
        const moved = findPieceAt(
          piecesRef.current,
          selectedMoveForApply.fromRow,
          selectedMoveForApply.fromCol,
        );
        if (moved && moved.side === 'enemy') {
          const resolvedPieceCode = pieceCodeFromPlacement(
            moved.pieceCode,
            moved.char,
            pieceDefsByChar,
          );
          const codeKey = (resolvedPieceCode ?? moved.pieceCode ?? '').toUpperCase();
          const promoted = selectedMoveForApply.promote ? true : (moved.promoted ?? false);
          const promotedDef = selectedMoveForApply.promote ? promotedPieceDefsByCode[codeKey] : null;
          const imageSignedUrl = preferBundledPromotedImageOverRemoteUrl(
            resolvedPieceCode ?? moved.pieceCode,
            promoted,
            promotedDef?.imageSignedUrl ?? moved.imageSignedUrl,
          );
          const char = resolvedPieceCode
            ? pieceCharFromCode(resolvedPieceCode, moved.side, promoted)
            : moved.char;
          preservedMovedPiece = {
            side: moved.side,
            toRow: selectedMoveForApply.toRow,
            toCol: selectedMoveForApply.toCol,
            pieceCode: resolvedPieceCode ?? moved.pieceCode,
            char,
            imageSignedUrl,
            promoted,
          };
        }
      }

      if (selectedMoveForApply) {
        optimisticBaseline = computePiecesAfterOptimisticMove(
          piecesRef.current,
          'enemy',
          selectedMoveForApply,
          pieceDefsByCode,
          pieceDefsByChar,
          promotedPieceDefsByCode,
        );
        // CPU の着手先を 1 秒だけ先にハイライト表示する（通常移動・持ち駒打ちの両方）
        setAiPreviewTarget({ row: selectedMoveForApply.toRow, col: selectedMoveForApply.toCol });
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 1000);
        });
        setAiPreviewTarget(null);
        applyOptimisticMove('enemy', selectedMoveForApply);
        await waitForAiMoveVisualCommit();
      }

      const nextWinner = syncFromCanonicalPosition(
        patchedAiPosition,
        response.game,
        preservedMovedPiece,
        optimisticBaseline,
      );
      lastSuccessfulAiKeyRef.current = requestKey;
      if (nextWinner === 'player') {
        void claimStageClearRewardIfNeeded();
      }
    } catch (error: unknown) {
      if (isGameAlreadyFinishedError(error)) {
        setWinner('player');
        setAiError(null);
        void claimStageClearRewardIfNeeded();
      } else {
        if (isIllegalMoveError(error)) {
          pendingAiResumeRef.current = null;
          setAiError('CPU の着手が不正だったため失敗しました。次の候補選択で継続します。');
          return;
        }
        setAiError(toUserFacingBattleError(error));
      }
    } finally {
      setAiPreviewTarget(null);
      aiThinkingRef.current = false;
      inFlightAiKeyRef.current = null;
      setIsAiThinking(false);
    }
  };

  useEffect(() => {
    const pending = pendingAiResumeRef.current;
    if (!pending) return;
    if (!gameId || isAiThinking || isCreatingGame || isFinished) return;
    if (sideToMove !== 'enemy') return;
    pendingAiResumeRef.current = null;
    void handleAiMove(pending.moveNo, pending.side);
  }, [gameId, handleAiMove, isAiThinking, isCreatingGame, isFinished, sideToMove, moveNo]);

  async function claimStageClearRewardIfNeeded() {
    if (clearRewardClaimedRef.current) return;
    clearRewardClaimedRef.current = true;
    battleSessionSettledRef.current = true;
    try {
      const result = await claimStageClearRewardUseCase.execute({ stageId: stageParam });
      if (!result) return;

      const pieceCount = result.granted.pieces.reduce((sum, piece) => sum + piece.quantity, 0);
      const pieceSummary = pieceCount > 0 ? ` / 駒+${pieceCount}` : '';
      setClearRewardText(
        `${result.firstClear ? '初回' : '周回'}報酬: 歩+${result.granted.pawn} 金+${result.granted.gold}${pieceSummary}`,
      );
    } catch (error: unknown) {
      battleSessionSettledRef.current = false;
      setAiError(toUserFacingBattleError(error));
    }
  }

  useEffect(() => {
    if (winner !== 'enemy') return;
    if (battleSessionSettledRef.current) return;
    battleSessionSettledRef.current = true;
    void claimStageClearRewardUseCase
      .execute({ stageId: stageParam, result: 'failed' })
      .catch(() => {
        if (isMountedRef.current) {
          battleSessionSettledRef.current = false;
        }
      });
  }, [claimStageClearRewardUseCase, stageParam, winner]);

  function applyOptimisticMove(actorSide: Side, move: BattleMove) {
    setPieces((prev) =>
      enforcePersistentHazardCells(
        computePiecesAfterOptimisticMove(
          prev,
          actorSide,
          move,
          pieceDefsByCode,
          pieceDefsByChar,
          promotedPieceDefsByCode,
        ),
        persistentHazardsRef.current,
      ),
    );
    if (move.dropPieceCode) {
      setHands((prev) => addHandPiece(prev, actorSide, move.dropPieceCode!, -1));
    }
  }

  async function waitForNextFrame() {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  async function waitForAiMoveVisualCommit() {
    await waitForNextFrame();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 120);
    });
  }

  async function recoverFromIllegalMoveIfNeeded(): Promise<boolean> {
    if (!gameId || isRecoveringFromIllegalMoveRef.current) return false;
    isRecoveringFromIllegalMoveRef.current = true;
    try {
      const latest = await loadGameStateUseCase.execute({ gameId });
      const recoverSignature = `${latest.position.turnNumber}:${latest.position.sideToMove}:${latest.position.stateHash ?? '-'}`;
      if (illegalRecoverSignatureRef.current !== recoverSignature) {
        illegalRecoverSignatureRef.current = recoverSignature;
        illegalRecoverAttemptsRef.current = 1;
      } else {
        illegalRecoverAttemptsRef.current += 1;
      }
      if (illegalRecoverAttemptsRef.current > 3) {
        pendingAiResumeRef.current = null;
        return false;
      }
      setStateHash(latest.position.stateHash ?? null);
      const nextWinner = syncFromCanonicalPosition(latest.position, latest.game);
      if (nextWinner) {
        illegalRecoverSignatureRef.current = null;
        illegalRecoverAttemptsRef.current = 0;
        return true;
      }

      if (latest.position.sideToMove === 'player') {
        try {
          const legal = await loadGameLegalMovesUseCase.execute({ gameId });
          setStateHash(legal.stateHash ?? latest.position.stateHash ?? null);
          setPlayerLegalMoves(legal.legalMoves);
          illegalRecoverSignatureRef.current = null;
          illegalRecoverAttemptsRef.current = 0;
        } catch {
          setPlayerLegalMoves([]);
        }
      } else {
        setPlayerLegalMoves([]);
        pendingAiResumeRef.current = {
          moveNo: latest.position.moveCount + 1,
          side: latest.position.sideToMove,
        };
      }
      setAiError(null);
      return true;
    } catch {
      return false;
    } finally {
      isRecoveringFromIllegalMoveRef.current = false;
    }
  }

  async function sendCommittedPlayerMoveToServer(
    move: BattleMove,
    optimisticBaseline: BoardPiece[],
    preservedMovedPiece: PreservedMovedPiece | undefined,
    rollbackSnapshot?: { pieces: BoardPiece[]; hands: HandsState },
  ) {
    if (!gameId) return;
    try {
      const result = await commitGameMoveUseCase.execute({
        gameId,
        moveNo,
        actorSide: 'player',
        move,
        stateHash: stateHashRef.current,
      });

      if (result.skillTriggered) {
        showSkillActivation('player', result.move);
      }
      const patchedPlayerPosition = patchHandsForStarReturnSkill(
        result.position,
        'player',
        result.move,
        result.skillTriggered,
      );

      const nextWinner = syncFromCanonicalPosition(
        patchedPlayerPosition,
        result.game,
        preservedMovedPiece,
        optimisticBaseline,
      );
      if (nextWinner === 'player') {
        void claimStageClearRewardIfNeeded();
        return;
      }
      if (result.position.sideToMove === 'enemy') {
        void handleAiMove(result.position.moveCount + 1, result.position.sideToMove);
      }
    } catch (error: unknown) {
      if (isIllegalMoveError(error)) {
        const recovered = await recoverFromIllegalMoveIfNeeded();
        if (recovered) {
          setAiError('局面を自動更新しました。対局を続行します。');
          return;
        }
        pendingAiResumeRef.current = null;
        setAiError(
          '同じ局面で自動更新を複数回試しましたが復旧できませんでした。画面を開き直してください。',
        );
        return;
      }
      if (rollbackSnapshot) {
        piecesRef.current = rollbackSnapshot.pieces;
        handsRef.current = rollbackSnapshot.hands;
        setPieces(rollbackSnapshot.pieces);
        setHands(rollbackSnapshot.hands);
      }
      setAiError(toUserFacingBattleError(error));
    }
  }

  async function commitPlayerMove(move: BattleMove) {
    const rollbackSnapshot = {
      pieces: piecesRenderRef.current,
      hands: handsRef.current,
    };

    if (!gameId || isAiThinking || isCreatingGame) return;

    const preservedMovedPiece = buildPreservedMovedPieceForPlayer(
      pieces,
      move,
      pieceDefsByChar,
      promotedPieceDefsByCode,
    );

    const optimisticBaseline = computePiecesAfterOptimisticMove(
      pieces,
      'player',
      move,
      pieceDefsByCode,
      pieceDefsByChar,
      promotedPieceDefsByCode,
    );

    const applyBoardAndClearSelection = () => {
      piecesRef.current = optimisticBaseline;
      setPieces(optimisticBaseline);
      if (move.dropPieceCode) {
        setHands((prev) => addHandPiece(prev, 'player', move.dropPieceCode!, -1));
      }
      setSelectedCell(null);
      setSelectedDropPieceCode(null);
      setLegalTargets([]);
      setEnemyPreviewTargets([]);
      setPlayerLegalMoves([]);
      setPendingPromotion(null);
      setAiError(null);
    };

    try {
      flushSync(applyBoardAndClearSelection);
    } catch {
      applyBoardAndClearSelection();
    }

    await sendCommittedPlayerMoveToServer(
      move,
      optimisticBaseline,
      preservedMovedPiece,
      rollbackSnapshot,
    );
    setTimeActionMode(null);
  }

  async function commitTimeSkillOnly(cell: BoardCell, piece: BoardPiece) {
    if (!gameId || isAiThinking || isCreatingGame || isFinished) return;
    const rollbackSnapshot = {
      pieces: piecesRenderRef.current,
      hands: handsRef.current,
    };
    const move: BattleMove = {
      fromRow: cell.row,
      fromCol: cell.col,
      toRow: cell.row,
      toCol: cell.col,
      pieceCode: (piece.pieceCode ?? 'TIME').toUpperCase(),
      promote: false,
      dropPieceCode: null,
      capturedPieceCode: null,
      notation: 'time_skill_only',
    };
    setPendingTimeActionCell(null);
    setTimeActionMode(null);
    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
    setEnemyPreviewTargets([]);
    setPlayerLegalMoves([]);
    setPendingPromotion(null);
    setAiError(null);
    await sendCommittedPlayerMoveToServer(
      move,
      piecesRenderRef.current,
      undefined,
      rollbackSnapshot,
    );
  }

  /** 成り／不成: 盤上マスを正として楽観更新し、画像キャッシュ取りこぼし用に spriteEpoch を進める */
  function commitPromotionChoice(move: BattleMove, pending: PendingPromotion) {
    if (!gameId || isAiThinking || isCreatingGame) return;
    const preBoard = piecesRenderRef.current;
    const trusted: TrustedBoardEndpoints = {
      fromRow: pending.boardFromRow,
      fromCol: pending.boardFromCol,
      toRow: pending.boardToRow,
      toCol: pending.boardToCol,
    };

    if (move.promote) {
      const atDest = findPieceAt(preBoard, pending.boardToRow, pending.boardToCol);
      if (atDest && atDest.side === 'player') {
        const mod = localPromotedModuleFromBaseCodeCandidates(
          collectStandardBaseCodesForLocalPromotedImage(atDest),
        );
        if (mod != null) {
          setPromotionImageFlash({
            row: pending.boardToRow,
            col: pending.boardToCol,
            side: 'player',
            assetModule: mod,
            flashKey: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          });
        } else {
          setPromotionImageFlash(null);
        }
      } else {
        setPromotionImageFlash(null);
      }
    } else {
      setPromotionImageFlash(null);
    }

    const snapshot = piecesBeforePromotionDialogRef.current;
    piecesBeforePromotionDialogRef.current = null;

    let optimisticBaseline: BoardPiece[];
    let preservedMovedPiece: PreservedMovedPiece | undefined;

    if (move.promote) {
      // ダイアログ中は既に「不成」で着手先に駒がある。成りはダイアログ直前の盤から計算する
      const baseForPromote = snapshot && snapshot.length > 0 ? snapshot : preBoard;
      optimisticBaseline = computePiecesAfterOptimisticMove(
        baseForPromote,
        'player',
        move,
        pieceDefsByCode,
        pieceDefsByChar,
        promotedPieceDefsByCode,
        trusted,
      );
      preservedMovedPiece = buildPreservedMovedPieceForPlayer(
        snapshot && snapshot.length > 0 ? snapshot : baseForPromote,
        move,
        pieceDefsByChar,
        promotedPieceDefsByCode,
        trusted,
      );
    } else {
      optimisticBaseline = preBoard;
      preservedMovedPiece = buildPreservedMovedPieceForPlayer(
        preBoard,
        move,
        pieceDefsByChar,
        promotedPieceDefsByCode,
        trusted,
      );
    }

    piecesRef.current = optimisticBaseline;
    setPieces(optimisticBaseline);
    if (move.promote) {
      setBoardSpriteEpoch((e) => e + 1);
    }
    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
    setEnemyPreviewTargets([]);
    setPlayerLegalMoves([]);
    setPendingPromotion(null);
    setAiError(null);

    const rollbackSnapshot = {
      pieces: snapshot && snapshot.length > 0 ? snapshot : preBoard,
      hands: handsRef.current,
    };

    void sendCommittedPlayerMoveToServer(
      move,
      optimisticBaseline,
      preservedMovedPiece,
      rollbackSnapshot,
    );
  }

  function handleCellPress(row: number, col: number) {
    if (sideToMove !== 'player' || isAiThinking || isCreatingGame || isFinished) return;
    if (pendingPromotion) return;

    const tapped = { row, col };
    if (selectedDropPieceCode) {
      const dropMoves = legalMovesToTarget(
        legalMovesForDropPiece(playerLegalMoves, selectedDropPieceCode, pieceCatalog),
        tapped,
      );
      if (dropMoves.length > 0) {
        void commitPlayerMove(dropMoves[0]);
        return;
      }
      // 無効マスでは持ち駒選択を維持し、自駒タップ時のみ通常の駒選択へ戻す
      const tappedPiece = findPieceAt(pieces, row, col);
      if (!tappedPiece || tappedPiece.side !== 'player') {
        return;
      }
      setSelectedDropPieceCode(null);
      setLegalTargets([]);
      setTimeActionMode(null);
    }

    if (selectedCell) {
      const targetMoves = legalMovesToTarget(
        legalMovesForBoardPiece(playerLegalMoves, selectedCell.row, selectedCell.col),
        tapped,
      );
      if (targetMoves.length > 0) {
        const selectedPiece = findPieceAt(pieces, selectedCell.row, selectedCell.col);
        const isTimeSelected =
          selectedPiece?.side === 'player' &&
          ((selectedPiece.pieceCode?.toUpperCase() ?? '') === 'TIME' ||
            selectedPiece.char === '時');
        const moveWithTimeAction = (m: BattleMove): BattleMove => {
          if (!isTimeSelected || !timeActionMode) return m;
          if (timeActionMode === 'normal') return { ...m, notation: null };
          return {
            ...m,
            notation: 'time_skill',
          };
        };
        const promoteMove = targetMoves.find((move) => move.promote);
        const nonPromoteMove = targetMoves.find((move) => !move.promote);
        if (promoteMove && nonPromoteMove) {
          setPromotionImageFlash(null);
          piecesBeforePromotionDialogRef.current = pieces.map((p) => ({ ...p }));
          const afterNonPromote = computePiecesAfterOptimisticMove(
            pieces,
            'player',
            nonPromoteMove,
            pieceDefsByCode,
            pieceDefsByChar,
            promotedPieceDefsByCode,
          );
          piecesRef.current = afterNonPromote;
          setPieces(afterNonPromote);
          setBoardSpriteEpoch((e) => e + 1);
          setSelectedCell(null);
          setLegalTargets([]);
          setEnemyPreviewTargets([]);
          setPendingPromotion({
            promoteMove: moveWithTimeAction(promoteMove),
            nonPromoteMove: moveWithTimeAction(nonPromoteMove),
            boardFromRow: selectedCell.row,
            boardFromCol: selectedCell.col,
            boardToRow: tapped.row,
            boardToCol: tapped.col,
          });
          return;
        }
        void commitPlayerMove(moveWithTimeAction(promoteMove ?? nonPromoteMove ?? targetMoves[0]));
        return;
      }
    }

    const piece = findPieceAt(pieces, row, col);
    if (piece?.side === 'enemy') {
      const enemyPieceDef =
        piece.promoted && piece.pieceCode
          ? (promotedPieceDefsByCode[piece.pieceCode] ?? pieceDefsByCode[piece.pieceCode])
          : ((piece.pieceCode ? pieceDefsByCode[piece.pieceCode] : null) ??
            pieceDefsByChar[piece.char] ??
            null);

      const rawTargets = enemyPieceDef?.moveVectors?.length
        ? getLegalTargetsFromVectors(pieces, piece, enemyPieceDef.moveVectors, BOARD_SIZE, {
            canJump: enemyPieceDef.canJump === true,
          })
        : [];
      const movementRule =
        latestMovementRuleByCellRef.current.get(`${piece.side}:${piece.row}:${piece.col}`) ?? null;
      const pieceKey = `${piece.side}:${piece.row}:${piece.col}`;
      const immobilizedBySkill = latestImmobilizedByCellRef.current.has(pieceKey);
      const targets = applyMovementRuleToTargets(
        { row: piece.row, col: piece.col },
        rawTargets,
        movementRule,
      );
      const previewTargets = immobilizedBySkill ? [{ row: piece.row, col: piece.col }] : targets;

      setSelectedCell(null);
      setSelectedDropPieceCode(null);
      setLegalTargets([]);
      setEnemyPreviewTargets(previewTargets);
      return;
    }

    if (!piece || piece.side !== 'player') {
      setSelectedCell(null);
      setLegalTargets([]);
      setEnemyPreviewTargets([]);
      setPendingTimeActionCell(null);
      setTimeActionMode(null);
      return;
    }

    const isTimePiece = (piece.pieceCode?.toUpperCase() ?? '') === 'TIME' || piece.char === '時';
    if (isTimePiece && !selectedCell) {
      // 周囲に敵がいない場合は通常移動のみ（選択UIを出さない）
      if (hasAdjacentEnemyPiece(pieces, row, col)) {
        setPendingTimeActionCell({ row, col });
        return;
      }
      setTimeActionMode('normal');
    }

    const targets = uniqueTargetsFromMoves(legalMovesForBoardPiece(playerLegalMoves, row, col));
    const pieceKey = `${piece.side}:${piece.row}:${piece.col}`;
    const movementRule = latestMovementRuleByCellRef.current.get(pieceKey) ?? null;
    const immobilizedBySkill = latestImmobilizedByCellRef.current.has(pieceKey);
    const affectedBySkill = movementRule != null || immobilizedBySkill || Boolean(piece.darkVeiled);
    if (targets.length === 0) {
      if (affectedBySkill) {
        setSelectedDropPieceCode(null);
        setSelectedCell({ row, col });
        setLegalTargets([]);
        // スキルによる行動不能は、タップ時に赤ハイライトで分かるようにする。
        setEnemyPreviewTargets([{ row, col }]);
        setPendingTimeActionCell(null);
        setTimeActionMode(null);
        return;
      }
      setSelectedCell(null);
      setLegalTargets([]);
      setEnemyPreviewTargets([]);
      setPendingTimeActionCell(null);
      setTimeActionMode(null);
      return;
    }

    setSelectedDropPieceCode(null);
    setSelectedCell({ row, col });
    // スキル影響下（移動制限/行動不能/闇）の駒は赤ハイライトで可視化する。
    if (affectedBySkill) {
      setLegalTargets([]);
      setEnemyPreviewTargets(targets);
    } else {
      setLegalTargets(piece.darkVeiled ? [] : targets);
      setEnemyPreviewTargets([]);
    }
    setPendingTimeActionCell(null);
  }

  function confirmTimeAction(mode: TimeActionMode) {
    const cell = pendingTimeActionCell;
    if (!cell) return;
    const piece = findPieceAt(pieces, cell.row, cell.col);
    if (!piece || piece.side !== 'player') {
      setPendingTimeActionCell(null);
      setTimeActionMode(null);
      return;
    }
    const targets = uniqueTargetsFromMoves(
      legalMovesForBoardPiece(playerLegalMoves, cell.row, cell.col),
    );
    if (targets.length === 0) {
      setPendingTimeActionCell(null);
      setTimeActionMode(null);
      return;
    }
    if (mode === 'skill') {
      void commitTimeSkillOnly(cell, piece);
      return;
    }
    setTimeActionMode(mode);
    setSelectedDropPieceCode(null);
    setSelectedCell(cell);
    setLegalTargets(piece.darkVeiled ? [] : targets);
    setEnemyPreviewTargets([]);
    setPendingTimeActionCell(null);
  }

  function handleCellLongPress(row: number, col: number) {
    const target = findPieceAt(pieces, row, col);
    if (!target) return;

    const lookupChar =
      target.promoted && target.pieceCode
        ? (PROMOTED_CODE_TO_CHAR[target.pieceCode] ?? target.char)
        : target.char;
    const detail =
      pieceDefsByChar[lookupChar] ??
      (target.pieceCode ? pieceDefsByCode[target.pieceCode] : undefined) ??
      null;

    setInspectingPiece({
      char: lookupChar,
      pieceCode: target.pieceCode,
      name: detail?.name ?? lookupChar,
      desc: resolveInspectSkillDescription(lookupChar, detail?.desc),
      move: resolveInspectMoveDescription(lookupChar, detail?.move),
      imageSignedUrl: detail?.imageSignedUrl ?? target.imageSignedUrl ?? null,
    });
  }

  function handleHandPiecePress(pieceCode: string) {
    if (sideToMove !== 'player' || isAiThinking || isCreatingGame || isFinished) return;
    if (pendingPromotion) return;
    if (getHandCount(hands, 'player', pieceCode) <= 0) return;

    const targets = uniqueTargetsFromMoves(
      legalMovesForDropPiece(playerLegalMoves, pieceCode, pieceCatalog),
    );
    setSelectedCell(null);
    setSelectedDropPieceCode(pieceCode);
    setLegalTargets(targets);
    setEnemyPreviewTargets([]);
  }

  handleCellPressRef.current = handleCellPress;

  const handleBoardCellPress = useCallback((row: number, col: number) => {
    handleCellPressRef.current(row, col);
  }, []);

  const handlePieceImageError = useCallback((placementKey: string) => {
    setFailedImageKeys((prev) => (prev[placementKey] ? prev : { ...prev, [placementKey]: true }));
  }, []);

  function renderHandsRow(side: Side, compact = false) {
    const orderedCodes = [
      ...pieceSfenMapping.handOrder,
      ...Object.keys(hands[side]).filter((code) => !pieceSfenMapping.handOrder.includes(code)),
    ];
    const entries = orderedCodes
      .map((code) => ({
        code,
        count: hands[side][code] ?? 0,
      }))
      .filter((entry) => entry.count > 0);

    if (entries.length === 0) {
      return null;
    }

    return (
      <View className={`${compact ? 'mt-0' : 'mt-1'} flex-row flex-wrap gap-0`}>
        {entries.map((entry) => {
          const isPlayer = side === 'player';
          const codeKey = entry.code.toUpperCase();
          const disabled =
            !isPlayer ||
            sideToMove !== 'player' ||
            isAiThinking ||
            isCreatingGame ||
            isFinished ||
            pendingPromotion !== null;
          const selected =
            isPlayer &&
            selectedDropPieceCode != null &&
            selectedDropPieceCode.toUpperCase() === codeKey;
          const handImageSource = getPieceImageSource({
            pieceCode: codeKey,
            char:
              pieceDefsByCode[codeKey]?.char ??
              pieceDefsByCode[entry.code]?.char ??
              CODE_TO_CHAR[codeKey] ??
              null,
            imageSignedUrl:
              pieceDefsByCode[codeKey]?.imageSignedUrl ??
              pieceDefsByCode[entry.code]?.imageSignedUrl ??
              null,
          });
          return (
            <Pressable
              key={`${side}-${codeKey}`}
              testID={`hand-${side}-${codeKey}`}
              disabled={disabled}
              onPress={() => {
                handleHandPiecePress(codeKey);
              }}
              className="px-0 py-0.5"
            >
              <View className="flex-row items-center gap-0">
                <View className="h-10 w-10 items-center justify-center">
                  {handImageSource ? (
                    <Image
                      source={handImageSource}
                      contentFit="contain"
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <Text className="text-base font-black text-[#5d3b2e]">
                      {CODE_TO_CHAR[codeKey] ?? entry.code}
                    </Text>
                  )}
                </View>
                <Text
                  className={`-ml-0.5 text-sm font-bold ${selected ? 'text-white' : 'text-white'}`}
                >
                  {`x${entry.count}`}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  const shouldBootstrapBattle =
    !isLoading &&
    !loadError &&
    areAssetsReady &&
    isAuthReady &&
    !!userId &&
    Object.keys(pieceSfenMapping.codeToSfen).length > 0 &&
    (snapshot.placements.length === 0 || pieces.length > 0) &&
    !gameId &&
    aiError === null &&
    !isFinished;

  const isWaitingForGameId =
    !isLoading && !loadError && areAssetsReady && !gameId && isCreatingGame && aiError === null;

  const isBootstrappingBattle =
    shouldBootstrapBattle ||
    isWaitingForGameId ||
    (!hasEnteredBattleRef.current &&
      gameId !== null &&
      sideToMove === 'player' &&
      playerLegalMoves.length === 0 &&
      isLoadingPlayerLegalMoves);

  if (
    !hasEnteredBattleRef.current &&
    gameId !== null &&
    !isCreatingGame &&
    sideToMove === 'player' &&
    playerLegalMoves.length > 0
  ) {
    hasEnteredBattleRef.current = true;
  }

  if (isLoading || !areAssetsReady || isBootstrappingBattle) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  const stageNo = Number(stageParam);
  const stageBattleBackgroundSource =
    Number.isFinite(stageNo) && stageNo > 0 ? getNormalDungeonStagePreviewSource(stageNo) : null;

  return (
    <UiScreenShell
      title="Stage Shogi"
      subtitle="バトル画面（AI接続）"
      hideTitleText
      plainHeader
      homeButtonTextClassName="text-white"
      fullBleedBackgroundSource={stageBattleBackgroundSource ?? undefined}
    >
      <View className="rounded-xl border-2 border-accent bg-[#f3ead3] p-3">
        <Text className="text-sm font-bold text-[#6b4532]">{`TURN ${moveNo}`}</Text>
        <Text className="text-base font-black text-ink">{`${snapshot.stageLabel}  手番: ${sideToMove === 'player' ? 'あなた' : 'CPU'}`}</Text>
        {isFinished ? (
          <Text className="mt-1 text-sm font-black text-[#7f1d1d]">{`対局終了: ${winner === 'player' ? 'あなたの勝ち' : 'CPUの勝ち'}`}</Text>
        ) : null}
        {aiError ? <Text className="mt-1 text-xs text-red-600">{aiError}</Text> : null}
      </View>

      <View className="relative -mx-2 mt-20 mb-20">
        <View className="absolute -top-16 left-0 right-1 z-10 flex-row items-center justify-between gap-2">
          <View className="flex-1">{renderHandsRow('enemy', true)}</View>
          <View className="pointer-events-none rounded-md border border-blue-700 bg-white/80 px-2 py-1">
            <Text className="text-lg font-black text-blue-700">後手</Text>
          </View>
        </View>
        <View className="absolute -bottom-16 left-0 right-1 z-10 flex-row items-center justify-between gap-2">
          <View className="flex-1">{renderHandsRow('player', true)}</View>
          <View className="pointer-events-none rounded-md border border-blue-700 bg-white/80 px-2 py-1">
            <Text className="text-lg font-black text-blue-700">先手</Text>
          </View>
        </View>
        <View className="overflow-hidden rounded-xl border-2 border-[#a27700] bg-[#e3c690]">
          <View className="relative w-full self-center" style={{ aspectRatio: 1 }}>
            <StaticBoardBackground />

            <View
              className="absolute"
              style={{
                top: `${BOARD_PADDING_RATIO * 100}%`,
                left: `${BOARD_PADDING_RATIO * 100}%`,
                width: `${(BOARD_INNER / BOARD_VIEWBOX) * 100}%`,
                height: `${(BOARD_INNER / BOARD_VIEWBOX) * 100}%`,
              }}
            >
              <BoardHighlightsLayer
                selectedCell={selectedCell}
                legalTargets={legalTargets}
                aiPreviewTarget={aiPreviewTarget}
                enemyPreviewTargets={enemyPreviewTargets}
                poisonHazards={poisonHazardCells}
              />
              <BoardPiecesLayer
                pieces={pieces}
                failedImageKeys={failedImageKeys}
                onPieceImageError={handlePieceImageError}
                spriteEpoch={boardSpriteEpoch}
                promotionImageFlash={promotionImageFlash}
              />
              <PoisonHazardLayer poisonHazards={poisonHazardCells} />
              <BoardTouchLayer
                onCellPress={handleBoardCellPress}
                onCellLongPress={handleCellLongPress}
              />
            </View>
          </View>
        </View>
      </View>

      {isFinished ? (
        <View className="absolute inset-0 items-center justify-center bg-black/50 p-6">
          <View
            className={`w-full max-w-sm rounded-2xl border-2 p-6 ${
              winner === 'player'
                ? 'border-yellow-500 bg-[#fffbeb]'
                : 'border-[#7f1d1d] bg-[#fff5f5]'
            }`}
          >
            <Text
              className={`text-center text-3xl font-black ${
                winner === 'player' ? 'text-yellow-600' : 'text-[#7f1d1d]'
              }`}
            >
              {winner === 'player' ? '勝利！' : '敗北...'}
            </Text>
            <Text className="mt-2 text-center text-sm font-bold text-gray-500">
              {winner === 'player' ? 'おめでとうございます！' : 'またチャレンジしよう'}
            </Text>
            {clearRewardText ? (
              <Text className="mt-3 text-center text-xs font-bold text-[#14532d]">
                {clearRewardText}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {pendingPromotion ? (
        <View className="absolute inset-0 items-center justify-center bg-black/35 p-6">
          <View className="w-full max-w-sm rounded-xl border border-[#8b5e34] bg-[#fffaf0] p-4">
            <Text className="text-base font-black text-ink">成りますか？</Text>
            <View className="mt-3 flex-row gap-3">
              <Pressable
                testID="promotion-yes"
                className="flex-1 rounded-md bg-[#166534] px-3 py-2"
                onPress={() => {
                  const p = pendingPromotion;
                  if (p) commitPromotionChoice(p.promoteMove, p);
                }}
              >
                <Text className="text-center font-bold text-white">成る</Text>
              </Pressable>
              <Pressable
                testID="promotion-no"
                className="flex-1 rounded-md bg-[#92400e] px-3 py-2"
                onPress={() => {
                  const p = pendingPromotion;
                  if (p) commitPromotionChoice(p.nonPromoteMove, p);
                }}
              >
                <Text className="text-center font-bold text-white">成らない</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
      {pendingTimeActionCell ? (
        <View className="absolute inset-0 items-center justify-center bg-black/35 p-6">
          <View className="w-full max-w-sm rounded-xl border border-[#8b5e34] bg-[#fffaf0] p-4">
            <Text className="text-base font-black text-ink">「時」駒の行動を選択</Text>
            <View className="mt-3 flex-row gap-3">
              <Pressable
                className="flex-1 rounded-md bg-[#166534] px-3 py-2"
                onPress={() => {
                  confirmTimeAction('skill');
                }}
              >
                <Text className="text-center font-bold text-white">スキル使用</Text>
              </Pressable>
              <Pressable
                className="flex-1 rounded-md bg-[#92400e] px-3 py-2"
                onPress={() => {
                  confirmTimeAction('normal');
                }}
              >
                <Text className="text-center font-bold text-white">通常移動</Text>
              </Pressable>
            </View>
            <Pressable
              className="mt-3 rounded-md bg-[#6b7280] px-3 py-2"
              onPress={() => {
                setPendingTimeActionCell(null);
                setTimeActionMode(null);
              }}
            >
              <Text className="text-center font-bold text-white">キャンセル</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {skillActivationText ? (
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <View className="rounded-lg bg-black/75 px-4 py-2">
            <Text className="text-sm font-black text-white">{skillActivationText}</Text>
          </View>
        </View>
      ) : null}

      {selectedDropPieceCode && legalTargets.length === 0 ? (
        <Text className="mt-2 text-xs text-red-600">その駒は打てる場所がありません。</Text>
      ) : null}
      <Modal
        visible={!!inspectingPiece}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setInspectingPiece(null);
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-sm rounded-xl bg-[#fff7e6] p-4">
            {inspectingPiece &&
            resolvePieceImageSource({
              pieceCode: inspectingPiece.pieceCode,
              char: inspectingPiece.char,
              imageSignedUrl: inspectingPiece.imageSignedUrl,
            }) ? (
              <Image
                source={
                  resolvePieceImageSource({
                    pieceCode: inspectingPiece.pieceCode,
                    char: inspectingPiece.char,
                    imageSignedUrl: inspectingPiece.imageSignedUrl,
                  })!
                }
                contentFit="contain"
                style={{ width: 56, height: 56, alignSelf: 'center' }}
              />
            ) : inspectingPiece?.imageSignedUrl ? (
              <Image
                source={{ uri: inspectingPiece.imageSignedUrl }}
                contentFit="contain"
                style={{ width: 56, height: 56, alignSelf: 'center' }}
              />
            ) : (
              <Text className="text-center text-3xl font-black text-[#2f1b14]">
                {inspectingPiece?.char}
              </Text>
            )}
            <Text className="mt-1 text-center text-base font-black text-[#2f1b14]">
              {inspectingPiece?.name}
            </Text>
            <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【スキルの説明】</Text>
            <Text className="mt-1 text-sm text-[#1f2937]">{inspectingPiece?.desc}</Text>
            <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【行動範囲】</Text>
            <Text className="mt-1 text-sm text-[#1f2937]">{inspectingPiece?.move}</Text>
            <Pressable
              onPress={() => {
                setInspectingPiece(null);
              }}
              className="mt-4 rounded-md bg-[#8b0000] px-3 py-2"
            >
              <Text className="text-center font-black text-[#ffd56a]">閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {isAiThinking ? (
        <View className="absolute bottom-3 right-3 rounded-md bg-black/65 px-2 py-1">
          <Text className="text-xs font-bold text-white">Loading...</Text>
        </View>
      ) : null}
    </UiScreenShell>
  );
}
