import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const pieceTemplate = require('../../../../assets/piece-info/piece-template.png');
const homeBack = require('../../../../assets/shared/home-back.png');

const pieces = [
  { char: '香', name: '香車', unlock: '初期', desc: '直線的な攻撃力が高い。', skill: 'なし', move: '前方に何マスでも移動' },
  { char: '桂', name: '桂馬', unlock: '初期', desc: '他の駒を飛び越える。', skill: 'なし', move: '前方2マス+横1マス' },
  { char: '銀', name: '銀将', unlock: '初期', desc: '防御力に優れた普通駒。', skill: 'なし', move: '斜め4方向+前' },
  { char: '忍', name: '忍者', unlock: 'Stage 2', desc: '機動力に優れる特殊駒。', skill: 'なし', move: '桂+銀の複合' },
  { char: '竜', name: '小竜', unlock: 'Stage 4', desc: '覚醒前の竜駒。', skill: '「泉」で覚醒して辰になる', move: '前後左右2マス' },
] as const;

export function PieceInfoScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const piece = pieces[index];

  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8]">
      <View className="absolute inset-0">
        <Image source={pieceTemplate} contentFit="cover" style={{ width: '100%', height: '100%' }} />
      </View>

      <View className="flex-1 px-4 pb-4">
        <View className="mt-2 flex-row items-center justify-between">
          <Pressable onPress={() => router.replace('/home')} className="active:scale-95">
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
          <Pressable onPress={() => setIndex((prev) => (prev - 1 + pieces.length) % pieces.length)} className="h-12 w-12 items-center justify-center rounded-full border border-[#8b0000] bg-white active:scale-95">
            <Text className="text-xl font-black text-[#8b0000]">←</Text>
          </Pressable>
          <Text className="text-sm font-bold text-[#6b4532]">{`${index + 1} / ${pieces.length}`}</Text>
          <Pressable onPress={() => setIndex((prev) => (prev + 1) % pieces.length)} className="h-12 w-12 items-center justify-center rounded-full border border-[#8b0000] bg-white active:scale-95">
            <Text className="text-xl font-black text-[#8b0000]">→</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
