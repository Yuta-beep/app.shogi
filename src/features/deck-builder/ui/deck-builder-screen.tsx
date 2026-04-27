import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  ScrollView,
  PanResponder,
} from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { BackButton } from '@/components/atom/back-button';
import { homeAssets } from '@/constants/home-assets';
import { UiScreenShell } from '@/components/organism/ui-screen-shell';
import { getDeckBuilderPieceCost } from '@/features/deck-builder/lib/deck-builder-piece-cost';
import { useDeckBuilderScreen } from '@/features/deck-builder/ui/use-deck-builder-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { listLocalPieceImageModules, resolvePieceImageSource } from '@/lib/piece-image';
import { playSe } from '@/lib/audio/audio-manager';

const deckAssets = {
  bg: require('../../../../assets/deck-builder/deck-bg.png'),
} as const;
const BOARD_SIZE = 9;
const BOARD_VIEWBOX = 900;
const BOARD_PADDING = 36;
const BOARD_INNER = BOARD_VIEWBOX - BOARD_PADDING * 2;
const BOARD_CELL = BOARD_INNER / BOARD_SIZE;
const BOARD_PADDING_RATIO = BOARD_PADDING / BOARD_VIEWBOX;
const BOARD_CELL_INNER_RATIO = 1 / BOARD_SIZE;
const PLACED_PIECE_OFFSET_X = 0;
const PLACED_PIECE_OFFSET_Y = -2;
const STANDARD_DECK_PIECE_CHARS = new Set(['歩', '香', '桂', '銀', '金', '角', '飛', '玉', '王']);
const STANDARD_DECK_PIECE_SIZE_PERCENT = 140;
const SPECIAL_DECK_PIECE_SIZE_PERCENT = 96;
const DECK_PIECE_SIZE_OVERRIDES: Partial<Record<string, number>> = {
  忍: 104,
};
const LEAF_SKILL_DESCRIPTION = '移動時10%の確率で「葉」駒を周囲1マスに召喚する。';
const ELECTRIC_SKILL_DESCRIPTION = '移動時20%の確率で周囲8マスの敵駒1体を3ターン行動不能にする。';
const ICE_SKILL_DESCRIPTION = '移動時30%の確率で周囲の敵駒1体を2ターン行動不能にする。';
const FISH_SKILL_DESCRIPTION = '移動時30%の確率で周囲の敵駒1体を3ターン行動不能にする。';
const MOSS_SKILL_DESCRIPTION = '移動時30%の確率で周囲の空きマスに「苔」駒を1体召喚する。';
const RAINBOW_SKILL_DESCRIPTION =
  'この駒の周囲8マスにいる敵駒の移動範囲は縦横1マスのみに制限される。';
const SWAMP_SKILL_DESCRIPTION =
  'この駒の周囲8マスにいる敵駒の移動範囲は上下1マスのみに制限される。';
const POISON_SKILL_DESCRIPTION =
  'この駒が移動したとき移動前のマスは4ターン毒マスになる。毒マスを敵駒が通るとその駒は消滅する。';

function resolveInspectSkillDescription(char: string, desc: string | undefined): string {
  if (char === '葉') return LEAF_SKILL_DESCRIPTION;
  if (char === '電') return ELECTRIC_SKILL_DESCRIPTION;
  if (char === '氷') return ICE_SKILL_DESCRIPTION;
  if (char === '魚') return FISH_SKILL_DESCRIPTION;
  if (char === '苔') return MOSS_SKILL_DESCRIPTION;
  if (char === '虹') return RAINBOW_SKILL_DESCRIPTION;
  if (char === '沼') return SWAMP_SKILL_DESCRIPTION;
  if (char === '毒') return POISON_SKILL_DESCRIPTION;
  const normalized = (desc ?? '').trim();
  return normalized.length > 0 ? normalized : 'スキル説明は個別設定されていません。';
}

function resolveInspectMoveDescription(char: string, move: string | undefined): string {
  if (char === '闇') return '全方向に1マス';
  const normalized = (move ?? '').trim();
  return normalized.length > 0 ? normalized : '行動範囲の個別説明はありません。';
}

function pieceSelectionKey(piece: { pieceId?: number; char: string }): string {
  if (typeof piece.pieceId === 'number') return `id:${piece.pieceId}`;
  return `char:${piece.char}`;
}

export function DeckBuilderScreen() {
  const router = useRouter();
  const vm = useDeckBuilderScreen();
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [boardTouchArea, setBoardTouchArea] = useState({ width: 0, height: 0 });
  const dragLastCellKeyRef = useRef<string | null>(null);
  const longPressTriggeredRef = useRef(false);
  const startTouchRef = useRef({ x: 0, y: 0 });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isReady: areAssetsReady } = useAssetPreload(
    [deckAssets.bg, ...listLocalPieceImageModules()],
    {
      enabled: !vm.isLoading,
    },
  );
  useScreenBgm('deckBuilder');

  const getCellFromTouch = useCallback(
    (x: number, y: number): { row: number; col: number } | null => {
      if (boardTouchArea.width <= 0 || boardTouchArea.height <= 0) return null;
      if (x < 0 || y < 0 || x >= boardTouchArea.width || y >= boardTouchArea.height) return null;
      const col = Math.floor((x / boardTouchArea.width) * BOARD_SIZE);
      const row = Math.floor((y / boardTouchArea.height) * BOARD_SIZE);
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
      return { row, col };
    },
    [boardTouchArea.height, boardTouchArea.width],
  );

  const getPlacementAt = useCallback(
    (row: number, col: number) =>
      vm.boardPlacements.find((placement) => placement.row === row && placement.col === col) ??
      null,
    [vm.boardPlacements],
  );

  const applyCellAction = useCallback(
    (row: number, col: number) => {
      setActiveCell({ row, col });
      vm.placeSelectedPieceAt(row, col);
    },
    [vm],
  );

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const beginLongPressDetection = useCallback(
    (row: number, col: number) => {
      const placement = getPlacementAt(row, col);
      if (!placement) return;
      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        vm.openPieceDetail(placement.piece);
      }, 420);
    },
    [clearLongPressTimer, getPlacementAt, vm],
  );

  const boardPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (event) => {
          longPressTriggeredRef.current = false;
          const { locationX, locationY } = event.nativeEvent;
          startTouchRef.current = { x: locationX, y: locationY };
          const cell = getCellFromTouch(locationX, locationY);
          dragLastCellKeyRef.current = cell ? `${cell.row}-${cell.col}` : null;
          if (cell) beginLongPressDetection(cell.row, cell.col);
        },
        onPanResponderMove: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          const dx = locationX - startTouchRef.current.x;
          const dy = locationY - startTouchRef.current.y;
          if (Math.hypot(dx, dy) > 6) {
            clearLongPressTimer();
          }
          const cell = getCellFromTouch(locationX, locationY);
          if (!cell) return;
          const key = `${cell.row}-${cell.col}`;
          if (dragLastCellKeyRef.current === key) return;
          dragLastCellKeyRef.current = key;
          applyCellAction(cell.row, cell.col);
        },
        onPanResponderRelease: (event) => {
          clearLongPressTimer();
          const { locationX, locationY } = event.nativeEvent;
          const cell = getCellFromTouch(locationX, locationY);
          if (!cell) return;
          if (!longPressTriggeredRef.current) {
            applyCellAction(cell.row, cell.col);
          }
        },
        onPanResponderTerminate: () => {
          clearLongPressTimer();
        },
      }),
    [applyCellAction, beginLongPressDetection, clearLongPressTimer, getCellFromTouch],
  );

  const validPlacementCells = useMemo(() => {
    if (!vm.selectedPieceForPlacement) return [] as Array<{ row: number; col: number }>;
    const cells: Array<{ row: number; col: number }> = [];
    for (let row = 6; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (vm.isValidPlacementAt(row, col)) {
          cells.push({ row, col });
        }
      }
    }
    return cells;
  }, [vm.selectedPieceForPlacement, vm.boardPlacements, vm.isValidPlacementAt]);

  if (vm.isLoading || !areAssetsReady) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  return (
    <UiScreenShell
      title="マイデッキ作成"
      subtitle="将棋盤に駒を配置して保存"
      hideBackButton
      fullBleedBackgroundSource={deckAssets.bg}
      rightAction={
        <BackButton
          onPress={() => {
            void playSe('tap');
            router.back();
          }}
        />
      }
    >
      <View>
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
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setBoardTouchArea({ width, height });
            }}
          >
            <Svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${BOARD_INNER} ${BOARD_INNER}`}
              style={{ position: 'absolute', top: 0, left: 0 }}
              pointerEvents="none"
            >
              {validPlacementCells.map((cell) => (
                <Rect
                  key={`valid-${cell.row}-${cell.col}`}
                  x={cell.col * BOARD_CELL}
                  y={cell.row * BOARD_CELL}
                  width={BOARD_CELL}
                  height={BOARD_CELL}
                  fill="#22c55e33"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                />
              ))}
              {activeCell ? (
                <Rect
                  x={activeCell.col * BOARD_CELL}
                  y={activeCell.row * BOARD_CELL}
                  width={BOARD_CELL}
                  height={BOARD_CELL}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={4}
                />
              ) : null}
            </Svg>
            {Array.from({ length: BOARD_SIZE }).map((_, row) =>
              Array.from({ length: BOARD_SIZE }).map((__, col) => {
                const placement =
                  vm.boardPlacements.find((cell) => cell.row === row && cell.col === col) ?? null;
                const pieceSizePercent =
                  placement && DECK_PIECE_SIZE_OVERRIDES[placement.piece.char] != null
                    ? (DECK_PIECE_SIZE_OVERRIDES[placement.piece.char] as number)
                    : placement && STANDARD_DECK_PIECE_CHARS.has(placement.piece.char)
                      ? STANDARD_DECK_PIECE_SIZE_PERCENT
                      : SPECIAL_DECK_PIECE_SIZE_PERCENT;
                return (
                  <Pressable
                    key={`cell-${row}-${col}`}
                    className="absolute items-center justify-center overflow-visible"
                    onPress={() => {
                      applyCellAction(row, col);
                    }}
                    onLongPress={() => {
                      if (placement) {
                        vm.openPieceDetail(placement.piece);
                      }
                    }}
                    style={{
                      top: `${row * BOARD_CELL_INNER_RATIO * 100}%`,
                      left: `${col * BOARD_CELL_INNER_RATIO * 100}%`,
                      width: `${BOARD_CELL_INNER_RATIO * 100}%`,
                      height: `${BOARD_CELL_INNER_RATIO * 100}%`,
                    }}
                  >
                    {placement ? (
                      resolvePieceImageSource(placement.piece) ? (
                        <Image
                          pointerEvents="none"
                          source={resolvePieceImageSource(placement.piece)!}
                          contentFit="contain"
                          style={{
                            width: `${pieceSizePercent}%`,
                            height: `${pieceSizePercent}%`,
                            transform: [
                              { translateX: PLACED_PIECE_OFFSET_X },
                              { translateY: PLACED_PIECE_OFFSET_Y },
                            ],
                          }}
                        />
                      ) : (
                        <Text className="text-base font-black text-[#2f1b14]">
                          {placement.piece.char}
                        </Text>
                      )
                    ) : null}
                  </Pressable>
                );
              }),
            )}
          </View>
        </View>
        <View className="mt-2 items-end">
          <Text className="text-right text-xs font-black text-white">{`合計コスト ${vm.deckTotalCost} / ${vm.deckCostLimit}`}</Text>
          <Text className="mt-0.5 text-right text-xs font-black text-white">
            {`特殊駒 ${vm.deckSpecialPieceCount}個`}
          </Text>
        </View>
      </View>

      {/* 所持駒パレット */}
      <View className="mt-4 rounded-xl border border-[#8b0000]/30 bg-white p-3">
        <Text className="text-sm font-black text-[#2f1b14]">
          所持駒（駒を選択して盤面マスをタップで配置・未選択ならマスの駒を削除）
        </Text>
        <View className="mt-2 flex-row flex-wrap gap-x-2 gap-y-1">
          {vm.ownedPieces.map((piece) => {
            const paletteKey =
              typeof piece.pieceId === 'number' ? `piece-${piece.pieceId}` : `char-${piece.char}`;
            return (
              <View key={paletteKey} className="mb-1 items-center">
                <Pressable
                  onPress={() => {
                    void playSe('tap');
                    vm.selectPieceForPlacement(piece);
                  }}
                  onLongPress={() => {
                    vm.openPieceDetail(piece);
                  }}
                  className={`relative h-16 w-16 items-center justify-center active:scale-95 ${
                    vm.selectedPieceForPlacement &&
                    pieceSelectionKey(vm.selectedPieceForPlacement) === pieceSelectionKey(piece)
                      ? 'rounded-md border border-[#8b0000]/50 bg-[#fff7e6]'
                      : ''
                  }`}
                >
                  {resolvePieceImageSource(piece) ? (
                    <Image
                      pointerEvents="none"
                      source={resolvePieceImageSource(piece)!}
                      contentFit="contain"
                      style={{ width: 60, height: 60 }}
                    />
                  ) : (
                    <Text className="text-lg font-black text-[#2f1b14]">{piece.char}</Text>
                  )}
                </Pressable>
                <Text className="mt-0.5 text-[10px] font-black text-[#6b4532]">
                  {`コスト ${getDeckBuilderPieceCost(piece.char, piece.name)}`}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 操作ボタン */}
      <View className="mt-4 flex-row gap-2">
        <Pressable
          onPress={() => {
            void playSe('confirm');
            void vm.applyAsBattleDeck().then((ok) => {
              if (ok) {
                Alert.alert('デッキ反映', '現在の配置をバトルデッキ（マイデッキ）に反映しました。');
              } else {
                Alert.alert('デッキ反映', 'デッキ反映に失敗しました。');
              }
            });
          }}
          className="h-20 flex-1 items-center justify-center rounded-xl bg-[#166534] px-3 active:scale-95"
        >
          <Text className="text-center text-base font-black text-white">デッキ反映</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void playSe('tap');
            vm.openDefaultModal();
          }}
          className="h-20 flex-1 items-center justify-center rounded-xl border-2 border-[#8b0000]/40 bg-white px-3 active:scale-95"
        >
          <Text className="text-center text-base font-black text-[#2f1b14]">デフォルト</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void playSe('tap');
            vm.openLoadModal();
          }}
          className="h-20 flex-1 items-center justify-center rounded-xl border-2 border-[#8b0000]/40 bg-white px-3 active:scale-95"
        >
          <Text className="text-center text-base font-black text-[#2f1b14]">読込</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void playSe('confirm');
            vm.openSaveModal();
          }}
          className="h-20 flex-1 items-center justify-center rounded-xl bg-[#8b0000] px-3 active:scale-95"
        >
          <Text className="text-center text-base font-black text-[#ffe6a5]">保存</Text>
        </Pressable>
      </View>

      {/* 駒詳細モーダル */}
      <Modal
        visible={!!vm.selectedPiece}
        transparent
        animationType="fade"
        onRequestClose={vm.closePieceDetail}
      >
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-sm rounded-xl bg-[#fff7e6] p-4">
            {vm.selectedPiece && resolvePieceImageSource(vm.selectedPiece) ? (
              <Image
                pointerEvents="none"
                source={resolvePieceImageSource(vm.selectedPiece)!}
                contentFit="contain"
                style={{ width: 56, height: 56, alignSelf: 'center' }}
              />
            ) : (
              <Text className="text-3xl font-black text-[#2f1b14] text-center">
                {vm.selectedPiece?.char}
              </Text>
            )}
            <Text className="mt-1 text-base font-black text-[#2f1b14] text-center">
              {vm.selectedPiece?.name}
            </Text>
            <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【スキルの説明】</Text>
            <Text className="mt-1 text-sm text-[#1f2937]">
              {resolveInspectSkillDescription(
                vm.selectedPiece?.char ?? '',
                vm.selectedPiece?.skill ?? vm.selectedPiece?.desc,
              )}
            </Text>
            <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【行動範囲】</Text>
            <Text className="mt-1 text-sm text-[#1f2937]">
              {resolveInspectMoveDescription(vm.selectedPiece?.char ?? '', vm.selectedPiece?.move)}
            </Text>
            <Pressable
              onPress={() => {
                void playSe('cancel');
                vm.closePieceDetail();
              }}
              className="mt-4 rounded-md bg-[#8b0000] px-3 py-2"
            >
              <Text className="text-center font-black text-[#ffd56a]">閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* デッキ保存モーダル */}
      <Modal
        visible={vm.saveModalOpen}
        transparent
        animationType="fade"
        onRequestClose={vm.closeSaveModal}
      >
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-sm rounded-xl bg-[#fff7e6] p-4">
            <Text className="text-base font-black text-[#2f1b14]">デッキを保存</Text>
            <TextInput
              value={vm.deckName}
              onChangeText={vm.setDeckName}
              placeholder="デッキ名を入力"
              placeholderTextColor="#9ca3af"
              className="mt-3 rounded-md border border-[#8b0000]/30 bg-white px-3 py-2 text-sm text-[#1f2937]"
            />
            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={() => {
                  void playSe('confirm');
                  vm.saveDeck();
                }}
                className="flex-1 rounded-md bg-[#8b0000] px-3 py-2"
              >
                <Text className="text-center font-black text-[#ffd56a]">保存</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void playSe('cancel');
                  vm.closeSaveModal();
                }}
                className="flex-1 rounded-md border border-[#8b0000] bg-white px-3 py-2"
              >
                <Text className="text-center font-black text-[#7f1d1d]">キャンセル</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* デッキ読込モーダル */}
      <Modal
        visible={vm.loadModalOpen}
        transparent
        animationType="fade"
        onRequestClose={vm.closeLoadModal}
      >
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-sm rounded-xl bg-[#fff7e6] p-4">
            <Text className="text-base font-black text-[#2f1b14]">デッキを読込</Text>
            <ScrollView className="mt-3 max-h-64">
              {vm.savedDecks.length === 0 ? (
                <Text className="text-sm text-[#6b4532]">保存済みデッキがありません。</Text>
              ) : (
                vm.savedDecks.map((deck) => (
                  <View
                    key={deck.id}
                    className="mb-2 flex-row items-center justify-between rounded-lg border border-[#8b0000]/20 bg-white px-3 py-2"
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-black text-[#2f1b14]">{deck.name}</Text>
                      <Text className="text-xs text-[#6b4532]">{deck.savedAt}</Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        void playSe('confirm');
                        vm.loadDeck(deck.id);
                      }}
                      className="ml-2 rounded px-2 py-1 active:opacity-70"
                      style={{ backgroundColor: '#dcfce7' }}
                    >
                      <Text className="text-xs font-black text-[#166534]">読込</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        void playSe('cancel');
                        vm.deleteDeck(deck.id);
                      }}
                      className="ml-2 rounded px-2 py-1 active:opacity-70"
                      style={{ backgroundColor: '#fee2e2' }}
                    >
                      <Text className="text-xs font-black text-[#b91c1c]">削除</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
            <Pressable
              onPress={() => {
                void playSe('cancel');
                vm.closeLoadModal();
              }}
              className="mt-3 rounded-md border border-[#8b0000] bg-white px-3 py-2"
            >
              <Text className="text-center font-black text-[#7f1d1d]">閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* デフォルト読込確認モーダル */}
      <Modal
        visible={vm.defaultModalOpen}
        transparent
        animationType="fade"
        onRequestClose={vm.closeDefaultModal}
      >
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-xs rounded-xl bg-[#fff7e6] p-4">
            <Text className="text-center text-base font-black text-[#2f1b14]">
              デフォルトデッキを読込みますか？
            </Text>
            <Text className="mt-1 text-center text-xs text-[#6b4532]">
              現在の配置がリセットされます。
            </Text>
            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={() => {
                  void playSe('confirm');
                  vm.loadDefault();
                }}
                className="flex-1 rounded-md bg-[#8b0000] px-3 py-2"
              >
                <Text className="text-center font-black text-[#ffd56a]">はい</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void playSe('cancel');
                  vm.closeDefaultModal();
                }}
                className="flex-1 rounded-md border border-[#8b0000] bg-white px-3 py-2"
              >
                <Text className="text-center font-black text-[#7f1d1d]">いいえ</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </UiScreenShell>
  );
}
