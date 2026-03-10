import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { homeAssets } from '@/constants/home-assets';
import { UiScreenShell } from '@/components/organism/ui-screen-shell';
import {
  applyPlayerMove,
  BoardCell,
  BoardPiece as RuleBoardPiece,
  getLegalTargetsFromVectors,
  hasKing,
  sameCell,
  Side,
} from '@/features/stage-shogi/domain/game-rules';
import { createLoadPieceCatalogUseCase } from '@/infra/di/usecase-factory';
import { useStageBattleScreen } from '@/features/stage-shogi/ui/use-stage-battle-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useAuthSession } from '@/hooks/common/use-auth-session';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { postJson } from '@/infra/http/api-client';
import { PieceCatalogItem } from '@/usecases/piece-info/load-piece-catalog-usecase';

const boardImage = require('../../../../assets/stage-shogi/shogi-board.png');
const BOARD_SIZE = 9;
const SHOGI_GAME_BOARD_PX = 540;
const SHOGI_GAME_BOARD_PADDING_PX = 6;
const SHOGI_GAME_BACKGROUND_SCALE = 1.07;
const SHOGI_GAME_CELL_PX = (SHOGI_GAME_BOARD_PX - SHOGI_GAME_BOARD_PADDING_PX * 2) / BOARD_SIZE;
const SHOGI_GAME_PIECE_PX = 72;
const SHOGI_GAME_KING_PX = 88;
const BOARD_INNER_RATIO = 1 - (SHOGI_GAME_BOARD_PADDING_PX * 2) / SHOGI_GAME_BOARD_PX;
const BOARD_PADDING_RATIO = SHOGI_GAME_BOARD_PADDING_PX / SHOGI_GAME_BOARD_PX;
const PIECE_RATIO = SHOGI_GAME_PIECE_PX / SHOGI_GAME_CELL_PX;
const KING_RATIO = SHOGI_GAME_KING_PX / SHOGI_GAME_CELL_PX;
const ENABLE_PIECE_IMAGES = process.env.EXPO_PUBLIC_ENABLE_PIECE_IMAGES !== 'false';

type BoardPiece = RuleBoardPiece & {
  imageSignedUrl: string | null;
};

type CreateGameResponse = {
  gameId: string;
  status: string;
  startedAt: string;
};

type AiMoveResponse = {
  selectedMove: {
    fromRow: number | null;
    fromCol: number | null;
    toRow: number;
    toCol: number;
    pieceCode: string;
    promote: boolean;
    dropPieceCode: string | null;
    capturedPieceCode: string | null;
    notation: string | null;
  };
  meta: {
    engineVersion: string;
    thinkMs: number;
    searchedNodes: number;
    searchDepth: number;
    evalCp: number;
    candidateCount: number;
    configApplied: Record<string, unknown>;
  };
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

function sideBadgeClass(side: string) {
  if (isEnemySide(side)) {
    return 'bg-[#7f1d1d] text-white';
  }
  return 'bg-[#14532d] text-white';
}

function normalizeSide(side: string): Side {
  return isEnemySide(side) ? 'enemy' : 'player';
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
    board[p.row][p.col] = p.side === 'player' ? sfen : sfen.toLowerCase();
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

function buildSfen(placements: BoardPiece[], sideToMove: Side, moveNo: number) {
  const board = toSfenBoard(placements);
  const side = sideToMove === 'player' ? 'b' : 'w';
  return `${board} ${side} - ${Math.max(1, moveNo)}`;
}

function findPieceAt(placements: BoardPiece[], row: number, col: number) {
  return placements.find((piece) => piece.row === row && piece.col === col) ?? null;
}

function cellKey(row: number, col: number) {
  return `${row}:${col}`;
}

function normalizePieceChar(piece: BoardPiece) {
  return piece.char ?? (piece.pieceCode ? (CODE_TO_CHAR[piece.pieceCode] ?? '?') : '?');
}

function applyAiMove(
  placements: BoardPiece[],
  side: Side,
  move: AiMoveResponse['selectedMove'],
): BoardPiece[] {
  const next = placements.filter((p) => !(p.row === move.toRow && p.col === move.toCol));

  const code = move.dropPieceCode ?? move.pieceCode;
  const char = CODE_TO_CHAR[code] ?? '?';

  if (move.fromRow === null || move.fromCol === null) {
    next.push({
      side,
      row: move.toRow,
      col: move.toCol,
      pieceCode: code,
      char,
      imageSignedUrl: null,
    });
    return next;
  }

  const pieceIndex = next.findIndex(
    (p) => p.side === side && p.row === move.fromRow && p.col === move.fromCol,
  );
  if (pieceIndex >= 0) {
    const moving = next[pieceIndex];
    next[pieceIndex] = {
      ...moving,
      row: move.toRow,
      col: move.toCol,
      pieceCode: move.pieceCode,
      char: CODE_TO_CHAR[move.pieceCode] ?? moving.char,
    };
    return next;
  }

  next.push({
    side,
    row: move.toRow,
    col: move.toCol,
    pieceCode: move.pieceCode,
    char: CODE_TO_CHAR[move.pieceCode] ?? '?',
    imageSignedUrl: null,
  });

  return next;
}

export function StageShogiScreen() {
  const params = useLocalSearchParams<{ stage?: string }>();
  const { snapshot, isLoading } = useStageBattleScreen(params.stage);
  const { userId } = useAuthSession();
  const { isReady: areAssetsReady } = useAssetPreload([boardImage]);
  const [failedImageKeys, setFailedImageKeys] = useState<Record<string, true>>({});
  const [arePieceImagesReady, setArePieceImagesReady] = useState(true);
  const [pieces, setPieces] = useState<BoardPiece[]>([]);
  const [sideToMove, setSideToMove] = useState<Side>('player');
  const [moveNo, setMoveNo] = useState(1);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<BoardCell | null>(null);
  const [legalTargets, setLegalTargets] = useState<BoardCell[]>([]);
  const [pieceCatalog, setPieceCatalog] = useState<PieceCatalogItem[]>([]);
  const [winner, setWinner] = useState<Side | null>(null);
  const loadPieceCatalogUseCase = useMemo(() => createLoadPieceCatalogUseCase(), []);
  const isMountedRef = useRef(true);
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

  const isFinished = winner !== null;

  useEffect(() => {
    const next = snapshot.placements
      .map((placement) => {
        const row = normalizeCellIndex(placement.row);
        const col = normalizeCellIndex(placement.col);
        if (row === null || col === null) return null;
        return {
          side: normalizeSide(placement.side),
          row,
          col,
          pieceCode: pieceCodeFromPlacement(placement.pieceCode, placement.char),
          char: placement.char,
          imageSignedUrl: placement.imageSignedUrl,
        } satisfies BoardPiece;
      })
      .filter((value): value is BoardPiece => value !== null);

    setPieces(next);
    setSideToMove('player');
    setMoveNo(1);
    setGameId(null);
    setAiError(null);
    setSelectedCell(null);
    setLegalTargets([]);
    setWinner(null);
  }, [snapshot]);

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

    const stageNo = Number(params.stage);
    void postJson<CreateGameResponse>('/api/v1/games', {
      playerId: userId,
      stageNo: Number.isInteger(stageNo) && stageNo > 0 ? stageNo : undefined,
      initialPosition: {
        sideToMove,
        turnNumber: moveNo,
        moveCount: moveNo - 1,
        sfen: buildSfen(pieces, sideToMove, moveNo),
        boardState: {},
        hands: {},
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
    params.stage,
    pieces,
    sideToMove,
    snapshot,
    userId,
  ]);

  const remoteImageUrls = useMemo(
    () =>
      pieces
        .map((placement) => getPieceImageUri(placement.imageSignedUrl))
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    [pieces],
  );

  useEffect(() => {
    if (remoteImageUrls.length === 0) {
      if (Object.keys(failedImageKeys).length > 0) {
        setFailedImageKeys({});
      }
      if (!arePieceImagesReady) {
        setArePieceImagesReady(true);
      }
      return;
    }

    if (Object.keys(failedImageKeys).length > 0) {
      setFailedImageKeys({});
    }

    let active = true;
    if (arePieceImagesReady) {
      setArePieceImagesReady(false);
    }
    Image.prefetch(remoteImageUrls)
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setArePieceImagesReady((prev) => (prev ? prev : true));
        }
      });

    return () => {
      active = false;
    };
  }, [arePieceImagesReady, failedImageKeys, remoteImageUrls]);

  const handleAiMove = async (
    nextPieces: BoardPiece[],
    nextMoveNo: number,
    nextSideToMove: Side,
  ) => {
    if (!gameId || isAiThinking || isCreatingGame) return;
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
          sfen: buildSfen(nextPieces, nextSideToMove, nextMoveNo),
          stateHash: null,
          boardState: {},
          hands: {},
          legalMoves: [],
        },
        engineConfig: {},
      };

      const response = await postJson<AiMoveResponse>('/api/v1/ai/move', payload);

      const afterAi = applyAiMove(nextPieces, 'enemy', response.selectedMove);
      setPieces(afterAi);
      setSideToMove('player');
      setMoveNo((prev) => prev + 1);
      if (!hasKing(afterAi, 'player')) {
        setWinner('enemy');
      } else if (!hasKing(afterAi, 'enemy')) {
        setWinner('player');
      }
    } catch (error: unknown) {
      setAiError(error instanceof Error ? error.message : String(error));
      setSideToMove('enemy');
    } finally {
      setIsAiThinking(false);
    }
  };

  function legalTargetsForCell(row: number, col: number) {
    const piece = findPieceAt(pieces, row, col);
    if (!piece || piece.side !== 'player') return [];
    const pieceDef = pieceDefsByChar[normalizePieceChar(piece)];
    if (!pieceDef || pieceDef.moveVectors.length === 0) return [];
    return getLegalTargetsFromVectors(pieces, piece, pieceDef.moveVectors);
  }

  function handleCellPress(row: number, col: number) {
    if (sideToMove !== 'player' || isAiThinking || isCreatingGame || isFinished) return;

    const tapped = { row, col };
    if (selectedCell) {
      const canMove = legalTargets.some((target) => sameCell(target, tapped));
      if (canMove) {
        const moved = applyPlayerMove(pieces, selectedCell, tapped);
        setPieces(moved);
        setSelectedCell(null);
        setLegalTargets([]);
        setAiError(null);
        if (!hasKing(moved, 'enemy')) {
          setWinner('player');
          return;
        }
        setSideToMove('enemy');
        setMoveNo((prev) => prev + 1);
        void handleAiMove(moved, moveNo + 1, 'enemy');
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

    setSelectedCell({ row, col });
    setLegalTargets(targets);
  }

  const legalTargetSet = useMemo(
    () => new Set(legalTargets.map((target) => cellKey(target.row, target.col))),
    [legalTargets],
  );

  if (isLoading || !areAssetsReady || !arePieceImagesReady) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  return (
    <UiScreenShell title="Stage Shogi" subtitle="バトル画面（AI接続）">
      <View className="rounded-xl border-2 border-accent bg-[#f3ead3] p-3">
        <Text className="text-sm font-bold text-[#6b4532]">{`TURN ${moveNo}`}</Text>
        <Text className="text-base font-black text-ink">{`${snapshot.stageLabel}  手番: ${sideToMove === 'player' ? 'あなた' : 'CPU'}`}</Text>
        <Text className="text-xs text-[#6b4532]">{`gameId: ${gameId ?? '(作成中...)'}`}</Text>
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
            void handleAiMove(pieces, moveNo, sideToMove);
          }}
        >
          <Text className="font-bold text-white">
            {isAiThinking ? 'AI思考中...' : 'AI応手を再試行'}
          </Text>
        </Pressable>
      </View>

      <View className="mt-3 overflow-hidden rounded-xl border-2 border-[#a27700] bg-[#e3c690] p-2">
        <View style={{ width: '100%', aspectRatio: 1 }}>
          <Image
            source={boardImage}
            contentFit="cover"
            style={{
              position: 'absolute',
              top: `${((1 - SHOGI_GAME_BACKGROUND_SCALE) / 2) * 100}%`,
              left: `${((1 - SHOGI_GAME_BACKGROUND_SCALE) / 2) * 100}%`,
              width: `${SHOGI_GAME_BACKGROUND_SCALE * 100}%`,
              height: `${SHOGI_GAME_BACKGROUND_SCALE * 100}%`,
            }}
          />

          <View style={{ position: 'absolute', inset: 0 }}>
            {Array.from({ length: BOARD_SIZE }).map((_, rowIndex) =>
              Array.from({ length: BOARD_SIZE }).map((__, colIndex) => {
                const cellPercent = 100 / BOARD_SIZE;
                const innerCellPercent = cellPercent * BOARD_INNER_RATIO;
                const topPercent = BOARD_PADDING_RATIO * 100 + rowIndex * innerCellPercent;
                const leftPercent = BOARD_PADDING_RATIO * 100 + colIndex * innerCellPercent;
                const selected =
                  selectedCell !== null &&
                  selectedCell.row === rowIndex &&
                  selectedCell.col === colIndex;
                const legalTarget = legalTargetSet.has(cellKey(rowIndex, colIndex));
                return (
                  <Pressable
                    key={`cell-${rowIndex}-${colIndex}`}
                    testID={`board-cell-${rowIndex}-${colIndex}`}
                    onPress={() => {
                      handleCellPress(rowIndex, colIndex);
                    }}
                    style={{
                      position: 'absolute',
                      top: `${topPercent}%`,
                      left: `${leftPercent}%`,
                      width: `${innerCellPercent}%`,
                      height: `${innerCellPercent}%`,
                      backgroundColor: selected
                        ? 'rgba(37, 99, 235, 0.30)'
                        : legalTarget
                          ? 'rgba(16, 185, 129, 0.24)'
                          : 'transparent',
                    }}
                  />
                );
              }),
            )}
          </View>

          <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
            {pieces.map((placement, index) => {
              const rowIndex = normalizeCellIndex(placement.row);
              const colIndex = normalizeCellIndex(placement.col);
              if (rowIndex === null || colIndex === null) {
                return null;
              }

              const cellPercent = 100 / BOARD_SIZE;
              const innerCellPercent = cellPercent * BOARD_INNER_RATIO;
              const topPercent = BOARD_PADDING_RATIO * 100 + rowIndex * innerCellPercent;
              const leftPercent = BOARD_PADDING_RATIO * 100 + colIndex * innerCellPercent;
              const enemy = isEnemySide(placement.side);
              const king = isKingChar(placement.char);
              const pieceScalePercent = (king ? KING_RATIO : PIECE_RATIO) * 100;
              const placementKey = `${placement.side}-${placement.row}-${placement.col}-${index}`;
              const imageUri = failedImageKeys[placementKey]
                ? null
                : getPieceImageUri(placement.imageSignedUrl);

              return (
                <View
                  key={placementKey}
                  style={{
                    position: 'absolute',
                    top: `${topPercent}%`,
                    left: `${leftPercent}%`,
                    width: `${innerCellPercent}%`,
                    height: `${innerCellPercent}%`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    className={`items-center justify-center ${imageUri ? '' : sideBadgeClass(placement.side)}`}
                    style={{
                      width: `${pieceScalePercent}%`,
                      height: `${pieceScalePercent}%`,
                      borderRadius: imageUri ? 0 : 999,
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
                      <Text className="text-sm font-black">{placement.char}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View className="mt-3 rounded-xl border border-accent/60 bg-white p-3">
        <Text className="text-sm font-bold text-ink">手駒</Text>
        <Text className="mt-1 text-sm text-[#6b4532]">{snapshot.handLabel}</Text>
      </View>
    </UiScreenShell>
  );
}
