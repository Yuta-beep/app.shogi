import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { UiScreenShell } from '@/components/module/ui-screen-shell';

const deckAssets = {
  bg: require('../../../../assets/deck-builder/deck-bg.png'),
  board: require('../../../../assets/deck-builder/shogi-board.png'),
} as const;

const ownedPieces = ['忍', '影', '砲', '竜', '鳳', '炎', '火', '水', '波', '木', '葉'] as const;

export function DeckBuilderScreen() {
  return (
    <UiScreenShell title="マイデッキ作成" subtitle="将棋盤に駒を配置して保存">
      <View className="overflow-hidden rounded-2xl border border-[#8b0000]/50">
        <Image source={deckAssets.bg} contentFit="cover" style={{ width: '100%', height: 180 }} />
      </View>

      <View className="mt-3 rounded-2xl border-4 border-[#a27700] bg-[#e4c58f] p-3">
        <Image source={deckAssets.board} contentFit="contain" style={{ width: '100%', height: 260 }} />
      </View>

      <View className="mt-4 rounded-xl border border-accent/50 bg-white p-3">
        <Text className="text-sm font-black text-[#2f1b14]">所持駒</Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {ownedPieces.map((piece) => (
            <Pressable key={piece} className="h-10 w-10 items-center justify-center rounded-md border border-[#8b0000]/40 bg-[#fff7e6] active:scale-95">
              <Text className="text-lg font-black text-[#2f1b14]">{piece}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mt-4 flex-row gap-2">
        <Pressable className="h-20 flex-1 items-center justify-center rounded-xl border-2 border-accent bg-white px-3 active:scale-95">
          <Text className="text-center text-lg font-black text-ink">デフォルト</Text>
        </Pressable>
        <Pressable className="h-20 flex-1 items-center justify-center rounded-xl border-2 border-accent bg-white px-3 active:scale-95">
          <Text className="text-center text-lg font-black text-ink">読込</Text>
        </Pressable>
        <Pressable className="h-20 flex-1 items-center justify-center rounded-xl bg-accent px-3 active:scale-95">
          <Text className="text-center text-lg font-black text-[#ffe6a5]">保存</Text>
        </Pressable>
      </View>
    </UiScreenShell>
  );
}
