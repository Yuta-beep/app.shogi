import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { UiScreenShell } from '@/components/module/ui-screen-shell';
import { useStageBattleScreen } from '@/features/stage-shogi/ui/use-stage-battle-screen';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';

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

function isEnemySide(side: string) {
  const normalized = side.toLowerCase();
  return normalized === 'enemy' || normalized === 'cpu' || normalized === 'gote' || normalized === 'computer';
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

export function StageShogiScreen() {
  const params = useLocalSearchParams<{ stage?: string }>();
  const { snapshot } = useStageBattleScreen(params.stage);
  const [failedImageKeys, setFailedImageKeys] = useState<Record<string, true>>({});
  useScreenBgm('battle');

  return (
    <UiScreenShell title="Stage Shogi" subtitle="バトル画面（UIモック）">
      <View className="rounded-xl border-2 border-accent bg-[#f3ead3] p-3">
        <Text className="text-sm font-bold text-[#6b4532]">{snapshot.turnLabel}</Text>
        <Text className="text-base font-black text-ink">{`${snapshot.stageLabel}  先手: あなた / 後手: CPU`}</Text>
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

          <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
            {snapshot.placements.map((placement, index) => {
              const rowIndex = normalizeCellIndex(placement.row);
              const colIndex = normalizeCellIndex(placement.col);
              if (rowIndex === null || colIndex === null) {
                return null;
              }

              const cellPercent = 100 / (snapshot.boardSize || BOARD_SIZE);
              const innerCellPercent = cellPercent * BOARD_INNER_RATIO;
              const topPercent = BOARD_PADDING_RATIO * 100 + rowIndex * innerCellPercent;
              const leftPercent = BOARD_PADDING_RATIO * 100 + colIndex * innerCellPercent;
              const enemy = isEnemySide(placement.side);
              const king = isKingChar(placement.char);
              const pieceScalePercent = (king ? KING_RATIO : PIECE_RATIO) * 100;
              const placementKey = `${placement.side}-${placement.row}-${placement.col}-${index}`;
              const imageUri = failedImageKeys[placementKey] ? null : getPieceImageUri(placement.imageSignedUrl);

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
