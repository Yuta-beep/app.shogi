import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePieceCatalogScreen } from '@/features/piece-info/ui/use-piece-catalog-screen';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';

const pieceTemplate = require('../../../../assets/piece-info/piece-template.png');
const homeBack = require('../../../../assets/shared/home-back.png');

export function PieceInfoScreen() {
  const router = useRouter();
  const { piece, index, total, previous, next } = usePieceCatalogScreen();
  useScreenBgm('catalog');

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

        <View className="mt-5 items-center">
          <Text className="text-6xl font-black text-[#2f1b14]">{piece.char}</Text>
          <Text className="mt-2 text-base font-black text-[#2f1b14]">{piece.name}</Text>
          <Text className="text-xs font-bold text-[#6b4532]">{`解放: ${piece.unlock}`}</Text>
        </View>

        <View className="mt-4 rounded-xl border border-[#8b0000]/50 bg-white/90 p-4">
          <Text className="text-xs font-black text-[#7f1d1d]">【駒の説明】</Text>
          <Text className="mt-1 text-sm text-[#1f2937]">{piece.desc}</Text>
          <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【スキル】</Text>
          <Text className="mt-1 text-sm text-[#1f2937]">{piece.skill}</Text>
          <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【移動範囲】</Text>
          <Text className="mt-1 text-sm text-[#1f2937]">{piece.move}</Text>
        </View>

        <View className="mt-auto flex-row items-center justify-center gap-3">
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
