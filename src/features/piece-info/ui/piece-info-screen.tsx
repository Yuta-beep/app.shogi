import { Image } from 'expo-image';
import { ScrollView, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { homeAssets } from '@/constants/home-assets';
import { usePieceCatalogScreen } from '@/features/piece-info/ui/use-piece-catalog-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';
import { MoveVector } from '@/domain/models/piece';

const pieceInfoBackground = require('../../../../assets/piece-info/piece-info-bg.png');
const boardHeader = require('../../../../assets/piece-info/board.png');
const pieceImages: Record<string, number> = {
  香: require('../../../../assets/piece-info/pieces/香.png'),
  桂: require('../../../../assets/piece-info/pieces/桂.png'),
  銀: require('../../../../assets/piece-info/pieces/銀.png'),
  忍: require('../../../../assets/piece-info/pieces/忍.png'),
  竜: require('../../../../assets/piece-info/pieces/竜.png'),
};

// 5x5グリッド（中心 [2][2] = 駒位置）
const GRID_SIZE = 5;
const CENTER = 2;

function MovementGrid({ vectors, isRepeatable }: { vectors: MoveVector[]; isRepeatable: boolean }) {
  // グリッドセルに移動可能かどうかをマーク
  const grid: boolean[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false));

  for (const { dx, dy, maxStep } of vectors) {
    const steps = isRepeatable ? GRID_SIZE - 1 : Math.min(maxStep, CENTER);
    for (let s = 1; s <= steps; s++) {
      const row = CENTER + dy * s;
      const col = CENTER + dx * s;
      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        grid[row][col] = true;
      }
    }
  }

  return (
    <View className="items-center">
      <Text className="text-xs font-black text-[#7f1d1d]">【移動範囲】</Text>
      <View className="mt-2 border border-[#8b0000]/30">
        {grid.map((row, rowIdx) => (
          <View key={rowIdx} className="flex-row">
            {row.map((canMove, colIdx) => {
              const isCenter = rowIdx === CENTER && colIdx === CENTER;
              return (
                <View
                  key={colIdx}
                  style={{ width: 36, height: 36 }}
                  className={`items-center justify-center border border-[#8b0000]/20 ${
                    isCenter ? 'bg-[#8b0000]' : canMove ? 'bg-[#fcd34d]/70' : 'bg-white/60'
                  }`}
                >
                  {isCenter && <Text className="text-xs font-black text-white">駒</Text>}
                  {canMove && !isCenter && <Text className="text-xs text-[#92400e]">●</Text>}
                </View>
              );
            })}
          </View>
        ))}
      </View>
      {isRepeatable && (
        <Text className="mt-1 text-[10px] text-[#6b4532]">● = 何マスでも移動可</Text>
      )}
    </View>
  );
}

export function PieceInfoScreen() {
  const { piece, index, total, previous, next, isLoading } = usePieceCatalogScreen();
  const currentPieceImage = piece.imageSignedUrl
    ? { uri: piece.imageSignedUrl }
    : (pieceImages[piece.char] ?? null);
  const { isReady: areAssetsReady } = useAssetPreload([
    pieceInfoBackground,
    boardHeader,
    ...Object.values(pieceImages),
  ]);
  useScreenBgm('catalog');

  if (isLoading || !areAssetsReady) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  return (
    <View className="flex-1">
      <View className="absolute inset-0">
        <Image
          source={pieceInfoBackground}
          contentFit="fill"
          style={{ width: '100%', height: '108%', transform: [{ translateY: -24 }] }}
        />
      </View>

      <SafeAreaView className="flex-1" edges={['left', 'right', 'bottom']}>
        <View className="flex-1 px-4 pb-4">
          <View className="flex-row items-center justify-end">
            <Text className="text-lg font-black text-[#2f1b14]">駒情報</Text>
          </View>

          <View
            className="-mt-1 h-24 w-full overflow-hidden rounded-xl"
            style={{ transform: [{ translateY: 3 }] }}
          >
            <Image
              source={boardHeader}
              contentFit="cover"
              style={{ width: '100%', height: '100%' }}
            />
            <View className="absolute inset-x-0 bottom-3 items-center justify-center">
              <Text
                className="text-[32px] text-[#2f1b14]"
                style={{
                  fontFamily: 'ShipporiMincho_700Bold',
                  textShadowColor: 'rgba(47, 27, 20, 0.22)',
                  textShadowOffset: { width: 0.6, height: 0.6 },
                  textShadowRadius: 0.4,
                }}
              >
                駒図鑑
              </Text>
            </View>
          </View>

          <ScrollView
            className="mt-1 flex-1"
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          >
            <View className="items-center">
              {currentPieceImage ? (
                <Image
                  source={currentPieceImage}
                  contentFit="contain"
                  style={{ width: 260, height: 260 }}
                />
              ) : (
                <Text className="text-6xl font-black text-[#2f1b14]">{piece.char}</Text>
              )}
            </View>

            <View className="rounded-xl border border-[#8b0000]/50 bg-white/90 p-4">
              {piece.moveVectors.length > 0 && (
                <MovementGrid vectors={piece.moveVectors} isRepeatable={piece.isRepeatable} />
              )}

              <Text className="mt-3 text-sm font-black text-[#7f1d1d]">【スキル】</Text>
              <Text className="mt-1 text-base leading-6 text-[#1f2937]">{piece.skill}</Text>

              <Text className="mt-3 text-sm font-black text-[#7f1d1d]">【移動】</Text>
              <Text className="mt-1 text-base leading-6 text-[#1f2937]">{piece.move}</Text>
              {piece.canJump && (
                <Text className="mt-1 text-xs font-bold text-[#92400e]">
                  障害物を飛び越えて移動可能
                </Text>
              )}
            </View>

            <View className="h-6" />
          </ScrollView>

          <View className="flex-row items-center justify-center gap-3 pt-3">
            <Pressable
              onPress={() => {
                void playSe('tap');
                previous();
              }}
              className="h-12 w-12 items-center justify-center rounded-full border border-[#8b0000] bg-white active:scale-95"
            >
              <Text className="text-xl font-black text-[#8b0000]">←</Text>
            </Pressable>
            <Text className="text-sm font-bold text-[#6b4532]">{`${index + 1} / ${total}`}</Text>
            <Pressable
              onPress={() => {
                void playSe('tap');
                next();
              }}
              className="h-12 w-12 items-center justify-center rounded-full border border-[#8b0000] bg-white active:scale-95"
            >
              <Text className="text-xl font-black text-[#8b0000]">→</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
