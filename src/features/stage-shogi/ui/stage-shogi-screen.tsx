import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Crown, Shield } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Line, Polygon, Rect } from 'react-native-svg';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { homeAssets } from '@/constants/home-assets';
import { UiScreenShell } from '@/components/organism/ui-screen-shell';
import {
  addHandPiece,
  applyPlayerMove,
  BoardCell,
  BoardPiece as RuleBoardPiece,
  canDropPiece,
  canPromoteByMove,
  createEmptyHandsState,
  getHandCount,
  getLegalTargetsFromVectors,
  hasKing,
  mustPromoteByMove,
  sameCell,
  Side,
  HandsState,
} from '@/features/stage-shogi/domain/game-rules';
import { useStageBattleScreen } from '@/features/stage-shogi/ui/use-stage-battle-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useAuthSession } from '@/hooks/common/use-auth-session';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { createLoadPieceCatalogUseCase } from '@/usecases/piece-info/create-piece-info-usecases';
import { CreateGameUseCase } from '@/usecases/stage-battle/create-game-usecase';
import {
  AiSelectedMove,
  RequestAiMoveUseCase,
} from '@/usecases/stage-battle/request-ai-move-usecase';
import { MoveVector, PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';

const BOARD_SIZE = 9;
const BOARD_VIEWBOX = 900;
const BOARD_PADDING = 36;
const BOARD_INNER = BOARD_VIEWBOX - BOARD_PADDING * 2;
const BOARD_CELL = BOARD_INNER / BOARD_SIZE;
const BOARD_PADDING_RATIO = BOARD_PADDING / BOARD_VIEWBOX;
const BOARD_CELL_INNER_RATIO = 1 / BOARD_SIZE;
const NORMAL_PIECE_SIZE_PERCENT = 120;
const KING_PIECE_SIZE_PERCENT = 136;
const ENABLE_PIECE_IMAGES = process.env.EXPO_PUBLIC_ENABLE_PIECE_IMAGES !== 'false';

type BoardPiece = RuleBoardPiece & {
  imageSignedUrl: string | null;
};
type PendingPromotion = {
  from: BoardCell;
  to: BoardCell;
};

const CODE_TO_CHAR: Record<string, string> = {
  FU: '歩',
  KY: '香',
  KE: '桂',
  GI: '銀',
  KI: '金',
  KA: '角',
  HI: '飛',
  OU: '王',
};
const PROMOTED_CODE_TO_CHAR: Record<string, string> = {
  FU: 'と',
  KY: '杏',
  KE: '圭',
  GI: '全',
  KA: '馬',
  HI: '龍',
};

const CHAR_TO_CODE: Record<string, string> = {
  歩: 'FU',
  香: 'KY',
  桂: 'KE',
  銀: 'GI',
  金: 'KI',
  角: 'KA',
  飛: 'HI',
  王: 'OU',
  玉: 'OU',
};

const CODE_TO_SFEN: Record<string, string> = {
  FU: 'P',
  KY: 'L',
  KE: 'N',
  GI: 'S',
  KI: 'G',
  KA: 'B',
  HI: 'R',
  OU: 'K',
};
const HAND_CODES_IN_SFEN_ORDER = ['HI', 'KA', 'KI', 'GI', 'KE', 'KY', 'FU'];
const GOLD_MOVE_VECTORS: MoveVector[] = [
  { dx: 0, dy: -1, maxStep: 1 },
  { dx: -1, dy: -1, maxStep: 1 },
  { dx: 1, dy: -1, maxStep: 1 },
  { dx: -1, dy: 0, maxStep: 1 },
  { dx: 1, dy: 0, maxStep: 1 },
  { dx: 0, dy: 1, maxStep: 1 },
];
const KING_DIAGONAL_VECTORS: MoveVector[] = [
  { dx: 1, dy: 1, maxStep: 1 },
  { dx: 1, dy: -1, maxStep: 1 },
  { dx: -1, dy: 1, maxStep: 1 },
  { dx: -1, dy: -1, maxStep: 1 },
];
const KING_ORTHOGONAL_VECTORS: MoveVector[] = [
  { dx: 1, dy: 0, maxStep: 1 },
  { dx: -1, dy: 0, maxStep: 1 },
  { dx: 0, dy: 1, maxStep: 1 },
  { dx: 0, dy: -1, maxStep: 1 },
];
const DEFAULT_MOVE_VECTORS_BY_CODE: Record<string, MoveVector[]> = {
  FU: [{ dx: 0, dy: -1, maxStep: 1 }],
  KY: [{ dx: 0, dy: -1, maxStep: 8 }],
  KE: [
    { dx: -1, dy: -2, maxStep: 1 },
    { dx: 1, dy: -2, maxStep: 1 },
  ],
  GI: [
    { dx: 0, dy: -1, maxStep: 1 },
    { dx: -1, dy: -1, maxStep: 1 },
    { dx: 1, dy: -1, maxStep: 1 },
    { dx: -1, dy: 1, maxStep: 1 },
    { dx: 1, dy: 1, maxStep: 1 },
  ],
  KI: GOLD_MOVE_VECTORS,
  KA: [
    { dx: 1, dy: 1, maxStep: 8 },
    { dx: 1, dy: -1, maxStep: 8 },
    { dx: -1, dy: 1, maxStep: 8 },
    { dx: -1, dy: -1, maxStep: 8 },
  ],
  HI: [
    { dx: 1, dy: 0, maxStep: 8 },
    { dx: -1, dy: 0, maxStep: 8 },
    { dx: 0, dy: 1, maxStep: 8 },
    { dx: 0, dy: -1, maxStep: 8 },
  ],
  OU: [...KING_ORTHOGONAL_VECTORS, ...KING_DIAGONAL_VECTORS],
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

function getPieceImageUri(imageSignedUrl: string | null) {
  if (!ENABLE_PIECE_IMAGES) {
    return null;
  }
  if (imageSignedUrl) return imageSignedUrl;
  return null;
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

function pieceCodeFromPlacement(pieceCode: string | null, char: string): string | null {
  if (pieceCode && CODE_TO_SFEN[pieceCode]) return pieceCode;
  return CHAR_TO_CODE[char] ?? null;
}

function toSfenBoard(placements: BoardPiece[]) {
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array<string | null>(BOARD_SIZE).fill(null),
  );
  for (const p of placements) {
    if (p.row < 0 || p.row >= BOARD_SIZE || p.col < 0 || p.col >= BOARD_SIZE) continue;
    const code = p.pieceCode ?? CHAR_TO_CODE[p.char];
    if (!code) continue;
    const sfen = CODE_TO_SFEN[code];
    if (!sfen) continue;
    const withPromotion = p.promoted ? `+${sfen}` : sfen;
    board[p.row][p.col] = p.side === 'player' ? withPromotion : withPromotion.toLowerCase();
  }

  return board
    .map((row) => {
      let out = '';
      let empty = 0;
      for (const cell of row) {
        if (!cell) {
          empty += 1;
        } else {
          if (empty > 0) {
            out += String(empty);
            empty = 0;
          }
          out += cell;
        }
      }
      if (empty > 0) out += String(empty);
      return out;
    })
    .join('/');
}

function toSfenHands(hands: HandsState) {
  const chunks: string[] = [];
  for (const code of HAND_CODES_IN_SFEN_ORDER) {
    const sfen = CODE_TO_SFEN[code];
    if (!sfen) continue;
    const playerCount = hands.player[code] ?? 0;
    const enemyCount = hands.enemy[code] ?? 0;
    if (playerCount > 0) {
      chunks.push(`${playerCount > 1 ? String(playerCount) : ''}${sfen}`);
    }
    if (enemyCount > 0) {
      chunks.push(`${enemyCount > 1 ? String(enemyCount) : ''}${sfen.toLowerCase()}`);
    }
  }
  return chunks.length > 0 ? chunks.join('') : '-';
}

function buildSfen(placements: BoardPiece[], hands: HandsState, sideToMove: Side, moveNo: number) {
  const board = toSfenBoard(placements);
  const side = sideToMove === 'player' ? 'b' : 'w';
  const sfenHands = toSfenHands(hands);
  return `${board} ${side} ${sfenHands} ${Math.max(1, moveNo)}`;
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

function resolveMoveVectors(
  piece: BoardPiece,
  pieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
) {
  const code = piece.pieceCode ?? null;
  if (!code) return [];
  const baseVectors =
    pieceDefsByCode[code]?.moveVectors ?? DEFAULT_MOVE_VECTORS_BY_CODE[code] ?? [];
  if (!piece.promoted) return baseVectors;
  if (code === 'FU' || code === 'KY' || code === 'KE' || code === 'GI') {
    return GOLD_MOVE_VECTORS;
  }
  if (code === 'KA') {
    return [...baseVectors, ...KING_ORTHOGONAL_VECTORS];
  }
  if (code === 'HI') {
    return [...baseVectors, ...KING_DIAGONAL_VECTORS];
  }
  return baseVectors;
}

function isImmobilePiece(def: PieceCatalogItem | undefined) {
  return (def?.moveRules ?? []).some((rule) => rule.ruleType === 'immobile');
}

function resolveStepOverrides(
  def: PieceCatalogItem | undefined,
  moveNo: number,
): { minStepByVectorKey: Record<string, number>; maxStepByVectorKey: Record<string, number> } {
  const out = {
    minStepByVectorKey: {} as Record<string, number>,
    maxStepByVectorKey: {} as Record<string, number>,
  };

  const parityRule = (def?.moveRules ?? []).find(
    (rule) => rule.ruleType === 'turn_parity_override',
  );
  if (!parityRule || !parityRule.params) return out;

  const side = moveNo % 2 === 1 ? 'odd' : 'even';
  const scoped = (parityRule.params as Record<string, unknown>)[side];
  if (!scoped || typeof scoped !== 'object') return out;

  const rule = scoped as Record<string, unknown>;
  if (rule.type !== 'step_limit' || rule.rays !== 'queen') return out;

  const minStep = Number(rule.min_step ?? 1);
  const maxStep = Number(rule.max_step ?? Number.MAX_SAFE_INTEGER);
  const normalizedMin = Number.isFinite(minStep) ? Math.max(1, minStep) : 1;
  const normalizedMax = Number.isFinite(maxStep)
    ? Math.max(normalizedMin, maxStep)
    : Number.MAX_SAFE_INTEGER;

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const key = `${dx}:${dy}`;
      out.minStepByVectorKey[key] = normalizedMin;
      out.maxStepByVectorKey[key] = normalizedMax;
    }
  }

  return out;
}

function applyMoveWithHands(
  placements: BoardPiece[],
  hands: HandsState,
  side: Side,
  from: BoardCell,
  to: BoardCell,
  promote: boolean,
) {
  const captured = findPieceAt(placements, to.row, to.col);
  let nextHands = hands;
  if (captured?.pieceCode && captured.pieceCode !== 'OU') {
    nextHands = addHandPiece(nextHands, side, captured.pieceCode, 1);
  }

  const moved = applyPlayerMove(placements as RuleBoardPiece[], from, to, promote) as BoardPiece[];
  if (side === 'player') {
    return { pieces: moved, hands: nextHands };
  }
  const next = placements.filter((p) => !(p.row === to.row && p.col === to.col));
  const pieceIndex = next.findIndex(
    (p) => p.side === side && p.row === from.row && p.col === from.col,
  );
  if (pieceIndex >= 0) {
    const moving = next[pieceIndex] as BoardPiece;
    next[pieceIndex] = {
      ...moving,
      row: to.row,
      col: to.col,
      promoted: promote || moving.promoted === true,
    };
    return { pieces: next, hands: nextHands };
  }
  return { pieces: placements, hands: nextHands };
}

function applyDropWithHands(
  placements: BoardPiece[],
  hands: HandsState,
  side: Side,
  to: BoardCell,
  pieceCode: string,
  visuals?: {
    char?: string;
    imageSignedUrl?: string | null;
  },
) {
  const char = visuals?.char ?? CODE_TO_CHAR[pieceCode] ?? '?';
  const nextHands = addHandPiece(hands, side, pieceCode, -1);
  const next: BoardPiece[] = [...placements];
  next.push({
    side,
    row: to.row,
    col: to.col,
    pieceCode,
    char,
    promoted: false,
    imageSignedUrl: visuals?.imageSignedUrl ?? null,
  });
  return { pieces: next, hands: nextHands };
}

function resolveDropPieceVisual(
  pieceCode: string,
  pieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
  placements: BoardPiece[],
) {
  const fromCatalog = pieceDefsByCode[pieceCode];
  const char = fromCatalog?.char ?? CODE_TO_CHAR[pieceCode] ?? '?';
  if (fromCatalog?.imageSignedUrl) {
    return { char, imageSignedUrl: fromCatalog.imageSignedUrl };
  }
  const fromBoard = placements.find(
    (piece) => piece.pieceCode === pieceCode && piece.imageSignedUrl,
  );
  return { char, imageSignedUrl: fromBoard?.imageSignedUrl ?? null };
}

function buildLegalMoves(
  placements: BoardPiece[],
  hands: HandsState,
  sideToMove: Side,
  pieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
  moveNo: number,
) {
  const moves: {
    fromRow: number | null;
    fromCol: number | null;
    toRow: number;
    toCol: number;
    pieceCode: string;
    promote: boolean;
    dropPieceCode: string | null;
  }[] = [];

  for (const piece of placements) {
    if (piece.side !== sideToMove || !piece.pieceCode) continue;
    const pieceDef = pieceDefsByCode[piece.pieceCode];
    if (isImmobilePiece(pieceDef)) continue;
    const vectors = resolveMoveVectors(piece, pieceDefsByCode);
    if (vectors.length === 0) continue;
    const stepOverrides = resolveStepOverrides(pieceDef, moveNo);
    const targets = getLegalTargetsFromVectors(placements, piece, vectors, BOARD_SIZE, {
      canJump: pieceDef?.canJump ?? false,
      ...stepOverrides,
    });
    for (const to of targets) {
      const from = { row: piece.row, col: piece.col };
      const optionalPromotion = canPromoteByMove(piece, from, to, BOARD_SIZE);
      const forcedPromotion = mustPromoteByMove(piece, to, BOARD_SIZE);
      if (forcedPromotion) {
        moves.push({
          fromRow: piece.row,
          fromCol: piece.col,
          toRow: to.row,
          toCol: to.col,
          pieceCode: piece.pieceCode,
          promote: true,
          dropPieceCode: null,
        });
      } else {
        moves.push({
          fromRow: piece.row,
          fromCol: piece.col,
          toRow: to.row,
          toCol: to.col,
          pieceCode: piece.pieceCode,
          promote: false,
          dropPieceCode: null,
        });
        if (optionalPromotion) {
          moves.push({
            fromRow: piece.row,
            fromCol: piece.col,
            toRow: to.row,
            toCol: to.col,
            pieceCode: piece.pieceCode,
            promote: true,
            dropPieceCode: null,
          });
        }
      }
    }
  }

  const hand = hands[sideToMove];
  for (const [pieceCode, count] of Object.entries(hand)) {
    if (count <= 0) continue;
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (!canDropPiece(placements, hands, sideToMove, pieceCode, { row, col }, BOARD_SIZE)) {
          continue;
        }
        moves.push({
          fromRow: null,
          fromCol: null,
          toRow: row,
          toCol: col,
          pieceCode,
          promote: false,
          dropPieceCode: pieceCode,
        });
      }
    }
  }

  return moves;
}

function applyAiMove(
  placements: BoardPiece[],
  hands: HandsState,
  move: AiSelectedMove,
  pieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
) {
  if (move.fromRow === null || move.fromCol === null) {
    const pieceCode = move.dropPieceCode ?? move.pieceCode;
    if (!pieceCode) return { pieces: placements, hands };
    const visuals = resolveDropPieceVisual(pieceCode, pieceDefsByCode, placements);
    return applyDropWithHands(
      placements,
      hands,
      'enemy',
      { row: move.toRow, col: move.toCol },
      pieceCode,
      visuals,
    );
  }
  return applyMoveWithHands(
    placements,
    hands,
    'enemy',
    { row: move.fromRow, col: move.fromCol },
    { row: move.toRow, col: move.toCol },
    move.promote,
  );
}

export function StageShogiScreen() {
  const params = useLocalSearchParams<{ stage?: string }>();
  const stageParam = Array.isArray(params.stage) ? params.stage[0] : params.stage;
  const { isReady: isAuthReady, userId } = useAuthSession();
  const { snapshot, isLoading } = useStageBattleScreen(
    stageParam,
    isAuthReady ? (userId ?? 'guest') : 'auth-pending',
  );
  const { isReady: areAssetsReady } = useAssetPreload([]);
  const [failedImageKeys, setFailedImageKeys] = useState<Record<string, true>>({});
  const [pieces, setPieces] = useState<BoardPiece[]>([]);
  const [sideToMove, setSideToMove] = useState<Side>('player');
  const [moveNo, setMoveNo] = useState(1);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<BoardCell | null>(null);
  const [selectedDropPieceCode, setSelectedDropPieceCode] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<BoardCell[]>([]);
  const [hands, setHands] = useState<HandsState>(createEmptyHandsState());
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [pieceCatalog, setPieceCatalog] = useState<PieceCatalogItem[]>([]);
  const [winner, setWinner] = useState<Side | null>(null);
  const loadPieceCatalogUseCase = useMemo(() => createLoadPieceCatalogUseCase(), []);
  const createGameUseCase = useMemo(() => new CreateGameUseCase(), []);
  const requestAiMoveUseCase = useMemo(() => new RequestAiMoveUseCase(), []);
  const isMountedRef = useRef(true);
  const prevStageRef = useRef<string | undefined>(undefined);
  const aiThinkingRef = useRef(false);
  const inFlightAiKeyRef = useRef<string | null>(null);
  const lastSuccessfulAiKeyRef = useRef<string | null>(null);
  useScreenBgm('battle');

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const pieceDefsByChar = useMemo(
    () =>
      Object.fromEntries(pieceCatalog.map((item) => [item.char, item])) as Record<
        string,
        PieceCatalogItem
      >,
    [pieceCatalog],
  );
  const pieceDefsByCode = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(CODE_TO_CHAR)
          .map(([code, char]) => [code, pieceDefsByChar[char]])
          .filter((entry): entry is [string, PieceCatalogItem] => Boolean(entry[1])),
      ),
    [pieceDefsByChar],
  );

  const isFinished = winner !== null;

  useEffect(() => {
    const next = snapshot.placements
      .map((placement) => {
        let row = normalizeCellIndex(placement.row);
        const col = normalizeCellIndex(placement.col);
        if (row === null || col === null) return null;
        const side = normalizeSide(placement.side);
        return {
          side,
          row,
          col,
          pieceCode: pieceCodeFromPlacement(placement.pieceCode, placement.char),
          char: placement.char,
          imageSignedUrl: placement.imageSignedUrl,
        } satisfies BoardPiece;
      })
      .filter((value): value is BoardPiece => value !== null);

    const stageChanged = prevStageRef.current !== stageParam;
    prevStageRef.current = stageParam;
    if (!stageChanged && gameId) {
      return;
    }

    setPieces(next);
    setSideToMove('player');
    setMoveNo(1);
    setGameId(null);
    setAiError(null);
    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
    setHands(createEmptyHandsState());
    setPendingPromotion(null);
    setWinner(null);
    aiThinkingRef.current = false;
    inFlightAiKeyRef.current = null;
    lastSuccessfulAiKeyRef.current = null;
  }, [gameId, snapshot, stageParam]);

  useEffect(() => {
    let active = true;
    loadPieceCatalogUseCase
      .execute()
      .then((items) => {
        if (active) {
          setPieceCatalog(items);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setAiError(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      active = false;
    };
  }, [loadPieceCatalogUseCase]);

  useEffect(() => {
    if (isLoading || isCreatingGame || gameId || !userId) return;
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
          sfen: buildSfen(pieces, hands, sideToMove, moveNo),
          boardState: {},
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
          setAiError(error instanceof Error ? error.message : String(error));
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
    isLoading,
    moveNo,
    stageParam,
    pieces,
    hands,
    sideToMove,
    snapshot,
    userId,
    createGameUseCase,
  ]);

  const remoteImageUrls = useMemo(
    () =>
      pieces
        .map((placement) => getPieceImageUri(placement.imageSignedUrl))
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    [pieces],
  );

  useEffect(() => {
    if (Object.keys(failedImageKeys).length === 0) {
      return;
    }
    setFailedImageKeys({});
  }, [failedImageKeys, remoteImageUrls]);

  useEffect(() => {
    if (remoteImageUrls.length === 0) {
      return;
    }
    Image.prefetch(remoteImageUrls)
      .catch(() => undefined)
      .finally(() => undefined);

    return () => undefined;
  }, [remoteImageUrls]);

  const handleAiMove = async (
    nextPieces: BoardPiece[],
    nextHands: HandsState,
    nextMoveNo: number,
    nextSideToMove: Side,
  ) => {
    if (!gameId || isAiThinking || isCreatingGame || aiThinkingRef.current) return;
    const requestKey = `${gameId}:${nextMoveNo}:${nextSideToMove}`;
    if (inFlightAiKeyRef.current === requestKey) return;
    if (lastSuccessfulAiKeyRef.current === requestKey) return;
    aiThinkingRef.current = true;
    inFlightAiKeyRef.current = requestKey;
    setIsAiThinking(true);
    setAiError(null);

    try {
      const payload = {
        gameId,
        moveNo: nextMoveNo,
        position: {
          sideToMove: nextSideToMove,
          turnNumber: nextMoveNo,
          moveCount: nextMoveNo - 1,
          sfen: buildSfen(nextPieces, nextHands, nextSideToMove, nextMoveNo),
          stateHash: null,
          boardState: {},
          hands: nextHands,
          legalMoves: buildLegalMoves(
            nextPieces,
            nextHands,
            nextSideToMove,
            pieceDefsByCode,
            nextMoveNo,
          ),
        },
        engineConfig: {},
      };

      const response = await requestAiMoveUseCase.execute(payload);

      const { pieces: afterAiPieces, hands: afterAiHands } = applyAiMove(
        nextPieces,
        nextHands,
        response.selectedMove,
        pieceDefsByCode,
      );
      setPieces(afterAiPieces);
      setHands(afterAiHands);
      setSideToMove('player');
      setMoveNo((prev) => prev + 1);
      lastSuccessfulAiKeyRef.current = requestKey;
      if (!hasKing(afterAiPieces, 'player')) {
        setWinner('enemy');
      } else if (!hasKing(afterAiPieces, 'enemy')) {
        setWinner('player');
      }
    } catch (error: unknown) {
      setAiError(error instanceof Error ? error.message : String(error));
      setSideToMove('enemy');
    } finally {
      aiThinkingRef.current = false;
      inFlightAiKeyRef.current = null;
      setIsAiThinking(false);
    }
  };

  function legalTargetsForCell(row: number, col: number, board: BoardPiece[] = pieces) {
    const piece = findPieceAt(board, row, col);
    if (!piece || piece.side !== 'player') return [];
    const pieceDef = piece.pieceCode ? pieceDefsByCode[piece.pieceCode] : undefined;
    if (isImmobilePiece(pieceDef)) return [];
    const vectors = resolveMoveVectors(piece, pieceDefsByCode);
    if (vectors.length === 0) return [];
    const stepOverrides = resolveStepOverrides(pieceDef, moveNo);
    return getLegalTargetsFromVectors(board, piece, vectors, BOARD_SIZE, {
      canJump: pieceDef?.canJump ?? false,
      ...stepOverrides,
    });
  }

  function commitPlayerMove(from: BoardCell, to: BoardCell, promote: boolean) {
    const { pieces: movedPieces, hands: movedHands } = applyMoveWithHands(
      pieces,
      hands,
      'player',
      from,
      to,
      promote,
    );
    setPieces(movedPieces);
    setHands(movedHands);
    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
    setPendingPromotion(null);
    setAiError(null);
    if (!hasKing(movedPieces, 'enemy')) {
      setWinner('player');
      return;
    }
    setSideToMove('enemy');
    setMoveNo((prev) => prev + 1);
    void handleAiMove(movedPieces, movedHands, moveNo + 1, 'enemy');
  }

  function commitPlayerDrop(pieceCode: string, to: BoardCell) {
    if (!canDropPiece(pieces, hands, 'player', pieceCode, to, BOARD_SIZE)) return;
    const visuals = resolveDropPieceVisual(pieceCode, pieceDefsByCode, pieces);
    const { pieces: droppedPieces, hands: droppedHands } = applyDropWithHands(
      pieces,
      hands,
      'player',
      to,
      pieceCode,
      visuals,
    );
    setPieces(droppedPieces);
    setHands(droppedHands);
    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
    setPendingPromotion(null);
    setAiError(null);
    if (!hasKing(droppedPieces, 'enemy')) {
      setWinner('player');
      return;
    }
    setSideToMove('enemy');
    setMoveNo((prev) => prev + 1);
    void handleAiMove(droppedPieces, droppedHands, moveNo + 1, 'enemy');
  }

  function handleCellPress(row: number, col: number) {
    if (sideToMove !== 'player' || isAiThinking || isCreatingGame || isFinished) return;
    if (pendingPromotion) return;

    const tapped = { row, col };
    if (selectedDropPieceCode) {
      const canDrop = legalTargets.some((target) => sameCell(target, tapped));
      if (canDrop) {
        commitPlayerDrop(selectedDropPieceCode, tapped);
      }
      return;
    }

    if (selectedCell) {
      const canMove = legalTargets.some((target) => sameCell(target, tapped));
      if (canMove) {
        const movingPiece = findPieceAt(pieces, selectedCell.row, selectedCell.col);
        if (!movingPiece) {
          setSelectedCell(null);
          setLegalTargets([]);
          return;
        }

        const force = mustPromoteByMove(movingPiece, tapped, BOARD_SIZE);
        const can = canPromoteByMove(movingPiece, selectedCell, tapped, BOARD_SIZE);
        if (force) {
          commitPlayerMove(selectedCell, tapped, true);
          return;
        }
        if (can) {
          setPendingPromotion({ from: selectedCell, to: tapped });
          return;
        }
        commitPlayerMove(selectedCell, tapped, false);
        return;
      }
    }

    const piece = findPieceAt(pieces, row, col);
    if (!piece || piece.side !== 'player') {
      setSelectedCell(null);
      setLegalTargets([]);
      return;
    }

    const targets = legalTargetsForCell(row, col);
    if (targets.length === 0) {
      setSelectedCell(null);
      setLegalTargets([]);
      return;
    }

    setSelectedDropPieceCode(null);
    setSelectedCell({ row, col });
    setLegalTargets(targets);
  }

  function handleHandPiecePress(pieceCode: string) {
    if (sideToMove !== 'player' || isAiThinking || isCreatingGame || isFinished) return;
    if (pendingPromotion) return;
    if (getHandCount(hands, 'player', pieceCode) <= 0) return;

    const targets: BoardCell[] = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (canDropPiece(pieces, hands, 'player', pieceCode, { row, col }, BOARD_SIZE)) {
          targets.push({ row, col });
        }
      }
    }
    setSelectedCell(null);
    setSelectedDropPieceCode(pieceCode);
    setLegalTargets(targets);
  }

  function renderHandsRow(side: Side) {
    const entries = HAND_CODES_IN_SFEN_ORDER.map((code) => ({
      code,
      count: hands[side][code] ?? 0,
    })).filter((entry) => entry.count > 0);

    if (entries.length === 0) {
      return <Text className="text-xs text-[#6b4532]">なし</Text>;
    }

    return (
      <View className="mt-1 flex-row flex-wrap gap-2">
        {entries.map((entry) => {
          const isPlayer = side === 'player';
          const disabled =
            !isPlayer ||
            sideToMove !== 'player' ||
            isAiThinking ||
            isCreatingGame ||
            isFinished ||
            pendingPromotion !== null;
          const selected = isPlayer && selectedDropPieceCode === entry.code;
          return (
            <Pressable
              key={`${side}-${entry.code}`}
              testID={`hand-${side}-${entry.code}`}
              disabled={disabled}
              onPress={() => {
                handleHandPiecePress(entry.code);
              }}
              className={`rounded-md border px-2 py-1 ${selected ? 'border-blue-700 bg-blue-100' : 'border-[#b08b5a] bg-[#f9f1e0]'} ${disabled ? 'opacity-60' : ''}`}
            >
              <Text className="text-sm font-bold text-[#5d3b2e]">{`${CODE_TO_CHAR[entry.code] ?? entry.code} x${entry.count}`}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  const isWaitingForGameId =
    !isLoading && areAssetsReady && !gameId && isCreatingGame && aiError === null;

  if (isLoading || !areAssetsReady || isWaitingForGameId) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  return (
    <UiScreenShell title="Stage Shogi" subtitle="バトル画面（AI接続）">
      <View className="rounded-xl border-2 border-accent bg-[#f3ead3] p-3">
        <Text className="text-sm font-bold text-[#6b4532]">{`TURN ${moveNo}`}</Text>
        <Text className="text-base font-black text-ink">{`${snapshot.stageLabel}  手番: ${sideToMove === 'player' ? 'あなた' : 'CPU'}`}</Text>
        {isFinished ? (
          <Text className="mt-1 text-sm font-black text-[#7f1d1d]">{`対局終了: ${winner === 'player' ? 'あなたの勝ち' : 'CPUの勝ち'}`}</Text>
        ) : null}
        {aiError ? <Text className="mt-1 text-xs text-red-600">{aiError}</Text> : null}
      </View>

      <View className="mt-3 flex-row items-center gap-2">
        <Pressable
          className={`rounded-lg px-4 py-2 ${isAiThinking || isCreatingGame || !gameId || sideToMove !== 'enemy' || isFinished ? 'bg-gray-400' : 'bg-[#1e40af]'}`}
          disabled={
            isAiThinking || isCreatingGame || !gameId || sideToMove !== 'enemy' || isFinished
          }
          onPress={() => {
            void handleAiMove(pieces, hands, moveNo, sideToMove);
          }}
        >
          <Text className="font-bold text-white">AI応手を再試行</Text>
        </Pressable>
      </View>

      <View className="mt-3 overflow-hidden rounded-xl border-2 border-[#a27700] bg-[#e3c690]">
        <View className="relative w-full self-center" style={{ aspectRatio: 1 }}>
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

          <View
            className="absolute"
            style={{
              top: `${BOARD_PADDING_RATIO * 100}%`,
              left: `${BOARD_PADDING_RATIO * 100}%`,
              width: `${(BOARD_INNER / BOARD_VIEWBOX) * 100}%`,
              height: `${(BOARD_INNER / BOARD_VIEWBOX) * 100}%`,
            }}
          >
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
            </Svg>

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
                    handleCellPress(rowIndex, colIndex);
                  }}
                />
              )),
            )}

            <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
              {pieces.map((placement) => {
                const rowIndex = normalizeCellIndex(placement.row);
                const colIndex = normalizeCellIndex(placement.col);
                if (rowIndex === null || colIndex === null) {
                  return null;
                }

                const enemy = isEnemySide(placement.side);
                const king = placement.pieceCode === 'OU' || isKingChar(placement.char);
                const pieceScalePercent = king
                  ? KING_PIECE_SIZE_PERCENT
                  : NORMAL_PIECE_SIZE_PERCENT;
                const placementKey = `${placement.side}-${placement.pieceCode ?? 'X'}-${placement.row}-${placement.col}`;
                const imageUri = failedImageKeys[placementKey]
                  ? null
                  : getPieceImageUri(placement.imageSignedUrl);

                return (
                  <View
                    key={placementKey}
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
                      {imageUri ? (
                        <Image
                          source={{ uri: imageUri }}
                          contentFit="contain"
                          style={{ width: '100%', height: '100%' }}
                          onError={() => {
                            setFailedImageKeys((prev) => ({ ...prev, [placementKey]: true }));
                          }}
                        />
                      ) : (
                        <View style={{ width: '100%', height: '100%' }}>
                          <Svg width="100%" height="100%" viewBox="0 0 100 120">
                            <Polygon
                              points="50,3 97,30 83,117 17,117 3,30"
                              fill={fallbackPiecePalette(placement.side).fill}
                              stroke={fallbackPiecePalette(placement.side).stroke}
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
                              <Crown size={16} color={fallbackPiecePalette(placement.side).icon} />
                            ) : (
                              <Shield size={16} color={fallbackPiecePalette(placement.side).icon} />
                            )}
                            <Text
                              className="text-sm font-black"
                              style={{ color: fallbackPiecePalette(placement.side).text }}
                            >
                              {getDisplayChar(placement)}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      <View className="mt-3 rounded-xl border border-accent/60 bg-white p-3">
        <Text className="text-sm font-bold text-ink">CPU持ち駒</Text>
        {renderHandsRow('enemy')}
        <View className="my-2 h-px bg-[#e5d1ae]" />
        <Text className="text-sm font-bold text-ink">あなたの持ち駒</Text>
        {renderHandsRow('player')}
      </View>

      {pendingPromotion ? (
        <View className="absolute inset-0 items-center justify-center bg-black/35 p-6">
          <View className="w-full max-w-sm rounded-xl border border-[#8b5e34] bg-[#fffaf0] p-4">
            <Text className="text-base font-black text-ink">成りますか？</Text>
            <View className="mt-3 flex-row gap-3">
              <Pressable
                testID="promotion-yes"
                className="flex-1 rounded-md bg-[#166534] px-3 py-2"
                onPress={() => {
                  commitPlayerMove(pendingPromotion.from, pendingPromotion.to, true);
                }}
              >
                <Text className="text-center font-bold text-white">成る</Text>
              </Pressable>
              <Pressable
                testID="promotion-no"
                className="flex-1 rounded-md bg-[#92400e] px-3 py-2"
                onPress={() => {
                  commitPlayerMove(pendingPromotion.from, pendingPromotion.to, false);
                }}
              >
                <Text className="text-center font-bold text-white">成らない</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {selectedDropPieceCode && legalTargets.length === 0 ? (
        <Text className="mt-2 text-xs text-red-600">その駒は打てる場所がありません。</Text>
      ) : null}
      {snapshot.handLabel ? (
        <Text className="mt-2 text-xs text-[#6b4532]">{snapshot.handLabel}</Text>
      ) : null}

      {isAiThinking ? (
        <View className="absolute bottom-3 right-3 rounded-md bg-black/65 px-2 py-1">
          <Text className="text-xs font-bold text-white">Loading...</Text>
        </View>
      ) : null}
    </UiScreenShell>
  );
}
