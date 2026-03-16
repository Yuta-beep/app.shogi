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
  BoardCell,
  BoardPiece as RuleBoardPiece,
  createEmptyHandsState,
  getHandCount,
  Side,
  HandsState,
} from '@/features/stage-shogi/domain/game-rules';
import { useStageBattleScreen } from '@/features/stage-shogi/ui/use-stage-battle-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useAuthSession } from '@/hooks/common/use-auth-session';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
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
  promoteMove: BattleMove;
  nonPromoteMove: BattleMove;
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

function sfenCharToPieceCode(ch: string): string | null {
  switch (ch.toUpperCase()) {
    case 'P':
      return 'FU';
    case 'L':
      return 'KY';
    case 'N':
      return 'KE';
    case 'S':
      return 'GI';
    case 'G':
      return 'KI';
    case 'B':
      return 'KA';
    case 'R':
      return 'HI';
    case 'K':
      return 'OU';
    default:
      return null;
  }
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

function piecesFromCanonicalPosition(
  position: BattleCanonicalPosition,
  pieceDefsByCode: Partial<Record<string, PieceCatalogItem>>,
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
      const pieceCode = sfenCharToPieceCode(ch);
      if (pieceCode && row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE) {
        const imageSignedUrl =
          pieceDefsByCode[pieceCode]?.imageSignedUrl ??
          existingPieces.find(
            (piece) =>
              piece.pieceCode === pieceCode &&
              piece.side === side &&
              piece.imageSignedUrl &&
              piece.promoted === promoted,
          )?.imageSignedUrl ??
          null;

        next.push({
          side,
          row,
          col,
          pieceCode,
          char: pieceCharFromCode(pieceCode, side, promoted),
          promoted,
          imageSignedUrl,
        });
      }

      col += 1;
      promoted = false;
    }
  });

  return next;
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

export function StageShogiScreen() {
  const params = useLocalSearchParams<{ stage?: string }>();
  const stageParam = Array.isArray(params.stage) ? params.stage[0] : params.stage;
  const { isReady: isAuthReady, userId } = useAuthSession();
  const { snapshot, isLoading } = useStageBattleScreen(
    stageParam,
    isAuthReady ? (userId ?? 'guest') : 'auth-pending',
  );
  const { isReady: areAssetsReady } = useAssetPreload([]);
  const [areBoardImagesReady, setAreBoardImagesReady] = useState(false);
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
  const [hands, setHands] = useState<HandsState>(createEmptyHandsState());
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [pieceCatalog, setPieceCatalog] = useState<PieceCatalogItem[]>([]);
  const [winner, setWinner] = useState<Side | null>(null);
  const [clearRewardText, setClearRewardText] = useState<string | null>(null);
  const loadPieceCatalogUseCase = useMemo(() => createLoadPieceCatalogUseCase(), []);
  const claimStageClearRewardUseCase = useMemo(() => createClaimStageClearRewardUseCase(), []);
  const createGameUseCase = useMemo(() => new CreateGameUseCase(), []);
  const commitGameMoveUseCase = useMemo(() => new CommitGameMoveUseCase(), []);
  const loadGameLegalMovesUseCase = useMemo(() => new LoadGameLegalMovesUseCase(), []);
  const requestAiMoveUseCase = useMemo(() => new RequestAiMoveUseCase(), []);
  const isMountedRef = useRef(true);
  const prevStageRef = useRef<string | undefined>(undefined);
  const aiThinkingRef = useRef(false);
  const inFlightAiKeyRef = useRef<string | null>(null);
  const lastSuccessfulAiKeyRef = useRef<string | null>(null);
  const clearRewardClaimedRef = useRef(false);
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

  function syncFromCanonicalPosition(
    position: BattleCanonicalPosition,
    game: BattleGameStatus,
  ): Side | null {
    const nextPieces = piecesFromCanonicalPosition(position, pieceDefsByCode, pieces);
    const nextHands = handsFromCanonical(position);
    setPieces(nextPieces);
    setHands(nextHands);
    setSideToMove(position.sideToMove);
    setMoveNo(position.turnNumber);
    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
    setPlayerLegalMoves([]);
    setPendingPromotion(null);

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

    setAreBoardImagesReady(false);
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
    setWinner(null);
    setClearRewardText(null);
    aiThinkingRef.current = false;
    inFlightAiKeyRef.current = null;
    lastSuccessfulAiKeyRef.current = null;
    clearRewardClaimedRef.current = false;
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

  useEffect(() => {
    if (!gameId || sideToMove !== 'player' || isCreatingGame || isFinished) {
      setPlayerLegalMoves([]);
      return;
    }

    let active = true;
    setAiError(null);

    loadGameLegalMovesUseCase
      .execute({ gameId })
      .then((result) => {
        if (!active) return;
        if (result.sideToMove !== 'player' || result.moveNo !== moveNo) {
          setPlayerLegalMoves([]);
          return;
        }
        setPlayerLegalMoves(result.legalMoves);
      })
      .catch((error: unknown) => {
        if (active) {
          setAiError(error instanceof Error ? error.message : String(error));
          setPlayerLegalMoves([]);
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
      setAreBoardImagesReady(true);
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
        engineConfig: {},
      });

      const nextWinner = syncFromCanonicalPosition(response.position, response.game);
      lastSuccessfulAiKeyRef.current = requestKey;
      if (nextWinner === 'player') {
        void claimStageClearRewardIfNeeded();
      }
    } catch (error: unknown) {
      setAiError(error instanceof Error ? error.message : String(error));
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

  async function commitPlayerMove(move: BattleMove) {
    if (!gameId || isAiThinking || isCreatingGame) return;

    setSelectedCell(null);
    setSelectedDropPieceCode(null);
    setLegalTargets([]);
    setPlayerLegalMoves([]);
    setPendingPromotion(null);
    setAiError(null);

    try {
      const result = await commitGameMoveUseCase.execute({
        gameId,
        moveNo,
        actorSide: 'player',
        move,
      });

      const nextWinner = syncFromCanonicalPosition(result.position, result.game);
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
      }
      return;
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
    !isLoading &&
    areAssetsReady &&
    areBoardImagesReady &&
    !gameId &&
    isCreatingGame &&
    aiError === null;

  if (isLoading || !areAssetsReady || !areBoardImagesReady || isWaitingForGameId) {
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
        {clearRewardText ? (
          <Text className="mt-1 text-xs text-[#14532d]">{clearRewardText}</Text>
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
