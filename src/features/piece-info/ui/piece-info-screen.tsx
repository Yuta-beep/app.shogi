import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const homeBack = require('../../../../assets/shared/home-back.png');

const pieces = [
  { char: '香', name: '香車', unlock: '初期', desc: '直線的な攻撃力が高い。', skill: 'なし', move: '前方に何マスでも移動' },
  { char: '桂', name: '桂馬', unlock: '初期', desc: '他の駒を飛び越える。', skill: 'なし', move: '前方2マス+横1マス' },
  { char: '銀', name: '銀将', unlock: '初期', desc: '防御力に優れた普通駒。', skill: 'なし', move: '斜め4方向+前' },
  { char: '忍', name: '忍者', unlock: 'Stage 2', desc: '機動力に優れる特殊駒。', skill: 'なし', move: '桂+銀の複合' },
  { char: '竜', name: '小竜', unlock: 'Stage 4', desc: '覚醒前の竜駒。', skill: '「泉」で覚醒して辰になる', move: '前後左右2マス' },
  { char: '炎', name: '炎魔', unlock: 'Stage 5', desc: '炎の力を操る。', skill: '10%で周囲の敵駒を消滅', move: '斜め前後+前' },
  { char: '雲', name: '雲', unlock: 'Stage 17', desc: '味方駒を輸送する。', skill: '敵は取れないが味方を運べる', move: '縦横1マス' },
  { char: '鬼', name: '赤鬼', unlock: 'Stage 39', desc: '鬼ヶ島のボス駒。', skill: '周囲を押し出し、盤面を封鎖', move: '全方向2マス' },
] as const;

export function PieceInfoScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const piece = pieces[index];

  function previousPiece() {
    setIndex((prev) => (prev - 1 + pieces.length) % pieces.length);
  }

  function nextPiece() {
    setIndex((prev) => (prev + 1) % pieces.length);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8f3e8] px-4 pb-4">
      <View className="mt-2 flex-row items-center justify-between">
        <Pressable onPress={() => router.replace('/home')} className="active:scale-95">
          <Image source={homeBack} contentFit="contain" style={{ width: 140, height: 44 }} />
        </Pressable>
        <Text className="text-lg font-black text-[#2f1b14]">駒情報</Text>
      </View>

      <View className="mt-3 items-center">
        <View className="h-24 w-24 items-center justify-center rounded-2xl border-2 border-[#8b0000] bg-white">
          <Text className="text-5xl font-black text-[#2f1b14]">{piece.char}</Text>
        </View>
        <Text className="mt-2 text-base font-black text-[#2f1b14]">{piece.name}</Text>
        <Text className="text-xs font-bold text-[#6b4532]">{`解放: ${piece.unlock}`}</Text>
      </View>

      <View className="mt-4 rounded-xl border border-[#8b0000]/50 bg-white p-4">
        <Text className="text-xs font-black text-[#7f1d1d]">【駒の説明】</Text>
        <Text className="mt-1 text-sm text-[#1f2937]">{piece.desc}</Text>

        <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【スキル】</Text>
        <Text className="mt-1 text-sm text-[#1f2937]">{piece.skill}</Text>

        <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【移動範囲】</Text>
        <Text className="mt-1 text-sm text-[#1f2937]">{piece.move}</Text>
      </View>

      <View className="mt-auto flex-row items-center justify-center gap-3">
        <Pressable onPress={previousPiece} className="h-12 w-12 items-center justify-center rounded-full border border-[#8b0000] bg-white active:scale-95">
          <Text className="text-xl font-black text-[#8b0000]">←</Text>
        </Pressable>
        <Text className="text-sm font-bold text-[#6b4532]">{`${index + 1} / ${pieces.length}`}</Text>
        <Pressable onPress={nextPiece} className="h-12 w-12 items-center justify-center rounded-full border border-[#8b0000] bg-white active:scale-95">
          <Text className="text-xl font-black text-[#8b0000]">→</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
