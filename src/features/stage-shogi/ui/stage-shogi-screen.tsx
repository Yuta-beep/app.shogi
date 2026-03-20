import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Crown, Shield } from 'lucide-react-native';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Line, Polygon, Rect } from 'react-native-svg';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { homeAssets } from '@/constants/home-assets';
import { UiScreenShell } from '@/components/organism/ui-screen-shell';
import {
  BoardCell,
  BoardPiece as RuleBoardPiece,
  createEmptyHandsState,
  getHandCount,
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
import { createLoadPieceCatalogUseCase } from '@/usecases/piece-info/create-piece-info-usecases';
import { createClaimStageClearRewardUseCase } from '@/usecases/stage-battle/create-stage-battle-usecases';
import { CommitGameMoveUseCase } from '@/usecases/stage-battle/commit-game-move-usecase';
import { CreateGameUseCase } from '@/usecases/stage-battle/create-game-usecase';
import {
  BattleCanonicalPosition,
  BattleMove,
  BattleGameStatus,
} from '@/usecases/stage-battle/game-move-contract';
import { LoadGameLegalMovesUseCase } from '@/usecases/stage-battle/load-game-legal-moves-usecase';
import { RequestAiMoveUseCase } from '@/usecases/stage-battle/request-ai-move-usecase';
import { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';

const BOARD_SIZE = 9;
const BOARD_VIEWBOX = 900;
const BOARD_PADDING = 18;
const BOARD_INNER = BOARD_VIEWBOX - BOARD_PADDING * 2;
const BOARD_CELL = BOARD_INNER / BOARD_SIZE;
const BOARD_PADDING_RATIO = BOARD_PADDING / BOARD_VIEWBOX;
const BOARD_CELL_INNER_RATIO = 1 / BOARD_SIZE;
const NORMAL_PIECE_SIZE_PERCENT = 120;
const KING_PIECE_SIZE_PERCENT = 136;
const ENABLE_PIECE_IMAGES = process.env.EXPO_PUBLIC_ENABLE_PIECE_IMAGES !== 'false';
const STANDARD_PIECE_CODES = new Set(['FU', 'KY', 'KE', 'GI', 'KI', 'KA', 'HI', 'OU']);

type BoardPiece = RuleBoardPiece & {
  imageSignedUrl: string | null;
};
type PendingPromotion = {
  promoteMove: BattleMove;
  nonPromoteMove: BattleMove;
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

function getPieceImageUri(imageSignedUrl: string | null) {
  if (!ENABLE_PIECE_IMAGES) {
    return null;
  }
  if (imageSignedUrl) return imageSignedUrl;
  return null;
}

function hasRemoteBoardImages(placements: Array<{ imageSignedUrl: string | null }>) {
  return placements.some((placement) => getPieceImageUri(placement.imageSignedUrl) !== null);
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

function pieceCodeFromPlacement(
  pieceCode: string | null,
  char: string,
  pieceDefsByChar: Partial<Record<string, PieceCatalogItem>>,
): string | null {
  if (pieceCode) return pieceCode;
  const fromCatalog = pieceDefsByChar[char]?.pieceCode;
  if (fromCatalog) return fromCatalog;
  return CHAR_TO_CODE[char] ?? null;
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
) {
  const board = toSfenBoardPure(placements, pieceSfenMapping);
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

function legalMovesForBoardPiece(legalMoves: BattleMove[], row: number, col: number): BattleMove[] {
  return legalMoves.filter(
    (move) => move.dropPieceCode === null && move.fromRow === row && move.fromCol === col,
  );
}

function legalMovesForDropPiece(legalMoves: BattleMove[], pieceCode: string): BattleMove[] {
  return legalMoves.filter(
    (move) => move.fromRow === null && move.fromCol === null && move.dropPieceCode === pieceCode,
  );
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
    const promoted = asBoolean(entry.promoted ?? nested.promoted) ?? false;
    const code =
      asString(nested.pieceCode ?? nested.piece_code ?? nested.code) ??
      CHAR_TO_CODE[asString(nested.char ?? entry.char) ?? ''] ??
      null;
    if (!code) continue;
    const key = `${side}:${row}:${col}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const pieceDef = promoted
      ? (promotedPieceDefsByCode[code] ?? pieceDefsByCode[code])
      : pieceDefsByCode[code];
    const char = asString(nested.char ?? entry.char) ?? pieceCharFromCode(code, side, promoted);
    const imageSignedUrl =
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
      null;

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

      const side: Side = ch === ch.toUpperCase() ? 'player' : 'enemy';
      // DB 由来 mapping から未成り基準の pieceCode を復元する。
      const pieceCode = sfenCharToDisplayChar(ch, false, pieceSfenMapping);
      if (pieceCode && row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        const pieceDef = promoted
          ? (promotedPieceDefsByCode[pieceCode] ?? pieceDefsByCode[pieceCode])
          : pieceDefsByCode[pieceCode];
        const char = pieceCharFromCode(pieceCode, side, promoted);
        const imageSignedUrl =
          pieceDef?.imageSignedUrl ??
          findBestExistingImage(existingPieces, {
            side,
            row,
            col,
            pieceCode,
            char,
            promoted,
          }) ??
          null;

        next.push({
          side,
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
  for (const piece of boardStatePieces) {
    const key = `${piece.side}:${piece.row}:${piece.col}`;
    if (!mergedByKey.has(key)) {
      continue;
    }
    mergedByKey.set(key, {
      ...mergedByKey.get(key)!,
      ...piece,
    });
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

  return [
    ...nextPieces,
    {
      side: preserved.side,
      row: preserved.toRow,
      col: preserved.toCol,
      pieceCode: preserved.pieceCode,
      char: preserved.char,
      imageSignedUrl: preserved.imageSignedUrl,
      promoted: preserved.promoted ?? false,
    },
  ];
}

function pieceIdentityKey(piece: BoardPiece) {
  return `${piece.side}:${piece.row}:${piece.col}`;
}

function sameBoardPiece(lhs: BoardPiece, rhs: BoardPiece) {
  return (
    lhs.side === rhs.side &&
    lhs.row === rhs.row &&
    lhs.col === rhs.col &&
    lhs.pieceCode === rhs.pieceCode &&
    lhs.char === rhs.char &&
    (lhs.promoted ?? false) === (rhs.promoted ?? false) &&
    lhs.imageSignedUrl === rhs.imageSignedUrl
  );
}

function reconcilePieceIdentity(
  nextPieces: BoardPiece[],
  existingPieces: BoardPiece[],
): BoardPiece[] {
  const existingByKey = new Map(existingPieces.map((piece) => [pieceIdentityKey(piece), piece]));
  return nextPieces.map((piece) => {
    const existing = existingByKey.get(pieceIdentityKey(piece));
    if (!existing) return piece;
    return sameBoardPiece(existing, piece) ? existing : piece;
  });
}

type BoardPieceSpriteProps = {
  piece: BoardPiece;
  failed: boolean;
  onImageError: () => void;
};

const BoardPieceSprite = memo(
  function BoardPieceSprite({ piece, failed, onImageError }: BoardPieceSpriteProps) {
    const rowIndex = normalizeCellIndex(piece.row);
    const colIndex = normalizeCellIndex(piece.col);
    if (rowIndex === null || colIndex === null) {
      return null;
    }

    const enemy = isEnemySide(piece.side);
    const king = piece.pieceCode === 'OU' || isKingChar(piece.char);
    const pieceScalePercent = king ? KING_PIECE_SIZE_PERCENT : NORMAL_PIECE_SIZE_PERCENT;
    const imageUri = failed ? null : getPieceImageUri(piece.imageSignedUrl);

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
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
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
                  {getDisplayChar(piece)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  },
  (prev, next) => {
    return prev.failed === next.failed && sameBoardPiece(prev.piece, next.piece);
  },
);

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

function normalizeSkillName(skill: string | undefined): string | null {
  if (!skill) return null;
  const normalized = skill.trim();
  if (!normalized || normalized === '-' || normalized === 'なし' || normalized === '準備中') {
    return null;
  }
  return normalized;
}

export function StageShogiScreen() {
  const params = useLocalSearchParams<{ stage?: string }>();
  const stageParam = Array.isArray(params.stage) ? params.stage[0] : params.stage;
  const { isReady: isAuthReady, userId } = useAuthSession();
  const { snapshot, isLoading } = useStageBattleScreen(
    stageParam,
    isAuthReady ? (userId ?? 'guest') : undefined,
  );
  const { isReady: areAssetsReady } = useAssetPreload([]);
  const [areBoardImagesReady, setAreBoardImagesReady] = useState(true);
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
  const [playerLegalMoves, setPlayerLegalMoves] = useState<BattleMove[]>([]);
  const [isLoadingPlayerLegalMoves, setIsLoadingPlayerLegalMoves] = useState(false);
  const [hands, setHands] = useState<HandsState>(createEmptyHandsState());
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [stateHash, setStateHash] = useState<string | null>(null);
  const [pieceCatalog, setPieceCatalog] = useState<PieceCatalogItem[]>([]);
  const [winner, setWinner] = useState<Side | null>(null);
  const [clearRewardText, setClearRewardText] = useState<string | null>(null);
  const [skillActivationText, setSkillActivationText] = useState<string | null>(null);
  const loadPieceCatalogUseCase = useMemo(() => createLoadPieceCatalogUseCase(), []);
  const claimStageClearRewardUseCase = useMemo(() => createClaimStageClearRewardUseCase(), []);
  const createGameUseCase = useMemo(() => new CreateGameUseCase(), []);
  const commitGameMoveUseCase = useMemo(() => new CommitGameMoveUseCase(), []);
  const loadGameLegalMovesUseCase = useMemo(() => new LoadGameLegalMovesUseCase(), []);
  const requestAiMoveUseCase = useMemo(() => new RequestAiMoveUseCase(), []);
  const isMountedRef = useRef(true);
  const piecesRef = useRef<BoardPiece[]>([]);
  const stateHashRef = useRef<string | null>(null);
  const hasEnteredBattleRef = useRef(false);
  const prevStageRef = useRef<string | undefined>(undefined);
  const aiThinkingRef = useRef(false);
  const inFlightAiKeyRef = useRef<string | null>(null);
  const lastSuccessfulAiKeyRef = useRef<string | null>(null);
  const clearRewardClaimedRef = useRef(false);
  const skillToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    stateHashRef.current = stateHash;
  }, [stateHash]);

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
  const promotedPieceDefsByCode = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(PROMOTED_CODE_TO_CHAR)
          .map(([code, char]) => [code, pieceDefsByChar[char]])
          .filter((entry): entry is [string, PieceCatalogItem] => Boolean(entry[1])),
      ),
    [pieceDefsByChar],
  );
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
  ): Side | null {
    const parsedPieces = piecesFromCanonicalPosition(
      position,
      pieceSfenMapping,
      pieceDefsByCode,
      promotedPieceDefsByCode,
      piecesRef.current,
    );
    const nextPieces = preserveMovedPieceIdentity(parsedPieces, preservedMovedPiece);
    const reconciledPieces = reconcilePieceIdentity(nextPieces, piecesRef.current);
    const nextHands = handsFromCanonical(position);
    setPieces(reconciledPieces);
    setHands(nextHands);
    setSideToMove(position.sideToMove);
    setMoveNo(position.turnNumber);
    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
    setPlayerLegalMoves([]);
    setPendingPromotion(null);
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

    const stageChanged = prevStageRef.current !== stageParam;
    prevStageRef.current = stageParam;
    if (!stageChanged && gameId) {
      return;
    }

    setAreBoardImagesReady(true);
    setPieces(next);
    setSideToMove('player');
    setMoveNo(1);
    setGameId(null);
    setAiError(null);
    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
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
    hasEnteredBattleRef.current = false;
  }, [gameId, pieceDefsByChar, snapshot, stageParam]);

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
          sfen: buildSfen(pieces, hands, sideToMove, moveNo, pieceSfenMapping),
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
          setAiError(error instanceof Error ? error.message : String(error));
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
    let active = true;

    if (remoteImageUrls.length === 0) {
      return () => {
        active = false;
      };
    }

    Image.prefetch(remoteImageUrls)
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setAreBoardImagesReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, [remoteImageUrls]);

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

      let preservedMovedPiece: PreservedMovedPiece | undefined;
      const selectedMove = response.selectedMove;
      if (selectedMove?.fromRow != null && selectedMove?.fromCol != null) {
        const moved = findPieceAt(piecesRef.current, selectedMove.fromRow, selectedMove.fromCol);
        if (moved && moved.side === 'enemy' && moved.imageSignedUrl) {
          preservedMovedPiece = {
            side: moved.side,
            toRow: selectedMove.toRow,
            toCol: selectedMove.toCol,
            pieceCode: moved.pieceCode,
            char: moved.char,
            imageSignedUrl: moved.imageSignedUrl,
            promoted: moved.promoted,
          };
        }
      }

      const nextWinner = syncFromCanonicalPosition(
        response.position,
        response.game,
        preservedMovedPiece,
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
        setAiError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      aiThinkingRef.current = false;
      inFlightAiKeyRef.current = null;
      setIsAiThinking(false);
    }
  };

  async function claimStageClearRewardIfNeeded() {
    if (clearRewardClaimedRef.current) return;
    clearRewardClaimedRef.current = true;
    try {
      const result = await claimStageClearRewardUseCase.execute({ stageId: stageParam });
      if (!result) return;

      const pieceCount = result.granted.pieces.reduce((sum, piece) => sum + piece.quantity, 0);
      const pieceSummary = pieceCount > 0 ? ` / 駒+${pieceCount}` : '';
      setClearRewardText(
        `${result.firstClear ? '初回' : '周回'}報酬: 歩+${result.granted.pawn} 金+${result.granted.gold}${pieceSummary}`,
      );
    } catch (error: unknown) {
      setAiError(error instanceof Error ? error.message : String(error));
    }
  }

  function applyOptimisticMove(move: BattleMove) {
    if (move.dropPieceCode) {
      const pieceCode = move.dropPieceCode;
      const pieceDef = pieceDefsByCode[pieceCode];
      setPieces((prev) => [
        ...prev,
        {
          side: 'player' as Side,
          row: move.toRow,
          col: move.toCol,
          pieceCode,
          char: pieceCharFromCode(pieceCode, 'player', false),
          promoted: false,
          imageSignedUrl: pieceDef?.imageSignedUrl ?? null,
        },
      ]);
      setHands((prev) => ({
        ...prev,
        player: {
          ...prev.player,
          [pieceCode]: Math.max(0, (prev.player[pieceCode] ?? 1) - 1),
        },
      }));
    } else if (move.fromRow !== null && move.fromCol !== null) {
      const fromRow = move.fromRow;
      const fromCol = move.fromCol;
      setPieces((prev) => {
        const moving = prev.find((p) => p.row === fromRow && p.col === fromCol);
        if (!moving) return prev;
        const promoted = move.promote ? true : (moving.promoted ?? false);
        const promotedDef = move.promote ? promotedPieceDefsByCode[moving.pieceCode ?? ''] : null;
        const imageSignedUrl = promotedDef?.imageSignedUrl ?? moving.imageSignedUrl;
        const char = moving.pieceCode
          ? pieceCharFromCode(moving.pieceCode, moving.side, promoted)
          : moving.char;
        return prev
          .filter((p) => !(p.row === move.toRow && p.col === move.toCol))
          .map((p) =>
            p.row === fromRow && p.col === fromCol
              ? { ...p, row: move.toRow, col: move.toCol, promoted, imageSignedUrl, char }
              : p,
          );
      });
    }
  }

  async function commitPlayerMove(move: BattleMove) {
    if (!gameId || isAiThinking || isCreatingGame) return;

    let preservedMovedPiece: PreservedMovedPiece | undefined;
    if (move.fromRow != null && move.fromCol != null) {
      const moved = findPieceAt(piecesRef.current, move.fromRow, move.fromCol);
      if (moved && moved.side === 'player' && moved.imageSignedUrl) {
        preservedMovedPiece = {
          side: moved.side,
          toRow: move.toRow,
          toCol: move.toCol,
          pieceCode: moved.pieceCode,
          char: moved.char,
          imageSignedUrl: moved.imageSignedUrl,
          promoted: move.promote ? true : moved.promoted,
        };
      }
    }

    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
    setPlayerLegalMoves([]);
    setPendingPromotion(null);
    setAiError(null);
    applyOptimisticMove(move);

    try {
      const result = await commitGameMoveUseCase.execute({
        gameId,
        moveNo,
        actorSide: 'player',
        move,
        stateHash,
      });

      if (result.skillTriggered) {
        showSkillActivation('player', result.move);
      }

      const nextWinner = syncFromCanonicalPosition(
        result.position,
        result.game,
        preservedMovedPiece,
      );
      if (nextWinner === 'player') {
        void claimStageClearRewardIfNeeded();
        return;
      }
      if (result.position.sideToMove === 'enemy') {
        void handleAiMove(result.position.moveCount + 1, result.position.sideToMove);
      }
    } catch (error: unknown) {
      setAiError(error instanceof Error ? error.message : String(error));
    }
  }

  function handleCellPress(row: number, col: number) {
    if (sideToMove !== 'player' || isAiThinking || isCreatingGame || isFinished) return;
    if (pendingPromotion) return;

    const tapped = { row, col };
    if (selectedDropPieceCode) {
      const dropMoves = legalMovesToTarget(
        legalMovesForDropPiece(playerLegalMoves, selectedDropPieceCode),
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
    }

    if (selectedCell) {
      const targetMoves = legalMovesToTarget(
        legalMovesForBoardPiece(playerLegalMoves, selectedCell.row, selectedCell.col),
        tapped,
      );
      if (targetMoves.length > 0) {
        const promoteMove = targetMoves.find((move) => move.promote);
        const nonPromoteMove = targetMoves.find((move) => !move.promote);
        if (promoteMove && nonPromoteMove) {
          setPendingPromotion({ promoteMove, nonPromoteMove });
          return;
        }
        void commitPlayerMove(promoteMove ?? nonPromoteMove ?? targetMoves[0]);
        return;
      }
    }

    const piece = findPieceAt(pieces, row, col);
    if (!piece || piece.side !== 'player') {
      setSelectedCell(null);
      setLegalTargets([]);
      return;
    }

    const targets = uniqueTargetsFromMoves(legalMovesForBoardPiece(playerLegalMoves, row, col));
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

    const targets = uniqueTargetsFromMoves(legalMovesForDropPiece(playerLegalMoves, pieceCode));
    setSelectedCell(null);
    setSelectedDropPieceCode(pieceCode);
    setLegalTargets(targets);
  }

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
          const disabled =
            !isPlayer ||
            sideToMove !== 'player' ||
            isAiThinking ||
            isCreatingGame ||
            isFinished ||
            pendingPromotion !== null;
          const selected = isPlayer && selectedDropPieceCode === entry.code;
          const handImageUri = getPieceImageUri(
            pieceDefsByCode[entry.code]?.imageSignedUrl ?? null,
          );
          return (
            <Pressable
              key={`${side}-${entry.code}`}
              testID={`hand-${side}-${entry.code}`}
              disabled={disabled}
              onPress={() => {
                handleHandPiecePress(entry.code);
              }}
              className="px-0 py-0.5"
            >
              <View className="flex-row items-center gap-0">
                <View className="h-10 w-10 items-center justify-center">
                  {handImageUri ? (
                    <Image
                      source={{ uri: handImageUri }}
                      contentFit="contain"
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <Text className="text-base font-black text-[#5d3b2e]">
                      {CODE_TO_CHAR[entry.code] ?? entry.code}
                    </Text>
                  )}
                </View>
                <Text
                  className={`-ml-0.5 text-sm font-bold ${selected ? 'text-blue-700' : 'text-[#5d3b2e]'}`}
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
    areAssetsReady &&
    isAuthReady &&
    !!userId &&
    Object.keys(pieceSfenMapping.codeToSfen).length > 0 &&
    (snapshot.placements.length === 0 || pieces.length > 0) &&
    !gameId &&
    aiError === null &&
    !isFinished;

  const isWaitingForGameId =
    !isLoading && areAssetsReady && !gameId && isCreatingGame && aiError === null;

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

  return (
    <UiScreenShell title="Stage Shogi" subtitle="バトル画面（AI接続）" hideTitleText plainHeader>
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
            void handleAiMove(moveNo);
          }}
        >
          <Text className="font-bold text-white">AI応手を再試行</Text>
        </Pressable>
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
                  const placementKey = `${placement.side}-${placement.pieceCode ?? 'X'}-${placement.promoted ? 'P' : 'N'}-${placement.row}-${placement.col}`;
                  return (
                    <BoardPieceSprite
                      key={placementKey}
                      piece={placement}
                      failed={Boolean(failedImageKeys[placementKey])}
                      onImageError={() => {
                        setFailedImageKeys((prev) => ({ ...prev, [placementKey]: true }));
                      }}
                    />
                  );
                })}
              </View>
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
                  void commitPlayerMove(pendingPromotion.promoteMove);
                }}
              >
                <Text className="text-center font-bold text-white">成る</Text>
              </Pressable>
              <Pressable
                testID="promotion-no"
                className="flex-1 rounded-md bg-[#92400e] px-3 py-2"
                onPress={() => {
                  void commitPlayerMove(pendingPromotion.nonPromoteMove);
                }}
              >
                <Text className="text-center font-bold text-white">成らない</Text>
              </Pressable>
            </View>
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
      {isAiThinking ? (
        <View className="absolute bottom-3 right-3 rounded-md bg-black/65 px-2 py-1">
          <Text className="text-xs font-bold text-white">Loading...</Text>
        </View>
      ) : null}
    </UiScreenShell>
  );
}
