import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '@/components/module/app-loading-screen';
import { homeAssets } from '@/constants/home-assets';
import { usePieceCatalogScreen } from '@/features/piece-info/ui/use-piece-catalog-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';
import { MoveVector } from '@/usecases/piece-info/load-piece-catalog-usecase';

const pieceTemplate = require('../../../../assets/piece-info/piece-template.png');
const homeBack = require('../../../../assets/shared/home-back.png');

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
    <View className="mt-3 items-center">
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
                  {canMove && !isCenter && (
                    <Text className="text-xs text-[#92400e]">●</Text>
                  )}
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
  const router = useRouter();
  const { piece, index, total, previous, next, isLoading } = usePieceCatalogScreen();
  const { isReady: areAssetsReady } = useAssetPreload([pieceTemplate, homeBack]);
  useScreenBgm('catalog');

  if (isLoading || !areAssetsReady) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8]">
      <View className="absolute inset-0">
        <Image source={pieceTemplate} contentFit="cover" style={{ width: '100%', height: '100%' }} />
      </View>

      <View className="flex-1 px-4 pb-4">
        <View className="mt-2 flex-row items-center justify-between">
          <Pressable
            onPress={() => {
              void playSe('tap');
              router.replace('/home');
            }}
            className="active:scale-95"
          >
            <Image source={homeBack} contentFit="contain" style={{ width: 140, height: 44 }} />
          </Pressable>
          <Text className="text-lg font-black text-[#2f1b14]">駒情報</Text>
        </View>

        <ScrollView className="flex-1 mt-4" showsVerticalScrollIndicator={false}>
          <View className="items-center">
            <Text className="text-6xl font-black text-[#2f1b14]">{piece.char}</Text>
            <Text className="mt-2 text-base font-black text-[#2f1b14]">{piece.name}</Text>
            <Text className="text-xs font-bold text-[#6b4532]">{`解放: ${piece.unlock}`}</Text>
          </View>

          <View className="mt-4 rounded-xl border border-[#8b0000]/50 bg-white/90 p-4">
            <Text className="text-xs font-black text-[#7f1d1d]">【駒の説明】</Text>
            <Text className="mt-1 text-sm text-[#1f2937]">{piece.desc}</Text>
            <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【スキル】</Text>
            <Text className="mt-1 text-sm text-[#1f2937]">{piece.skill}</Text>
            <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【移動名称】</Text>
            <Text className="mt-1 text-sm text-[#1f2937]">{piece.move}</Text>

            {piece.moveVectors.length > 0 && (
              <MovementGrid vectors={piece.moveVectors} isRepeatable={piece.isRepeatable} />
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
  );
}
