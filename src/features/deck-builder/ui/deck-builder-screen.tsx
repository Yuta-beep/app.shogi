import { Pressable, Text, View } from 'react-native';

import { UiScreenShell } from '@/components/module/ui-screen-shell';

const boardSlots = [
  ['香', '桂', '銀', '金', '王', '金', '銀', '桂', '香'],
  ['・', '飛', '・', '・', '・', '・', '・', '角', '・'],
  ['歩', '歩', '歩', '歩', '歩', '歩', '歩', '歩', '歩'],
] as const;

const ownedPieces = ['忍', '影', '砲', '竜', '鳳', '炎', '火', '水', '波', '木', '葉'] as const;

export function DeckBuilderScreen() {
  return (
    <UiScreenShell title="マイデッキ作成" subtitle="将棋盤に駒を配置して保存">
      <View className="rounded-2xl border-4 border-[#a27700] bg-[#e4c58f] p-3">
        {boardSlots.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row">
            {row.map((cell, colIndex) => (
              <View key={`${rowIndex}-${colIndex}`} className="h-11 w-11 items-center justify-center border border-[#8b5a2b] bg-[#f2deb8]">
                <Text className={`text-lg font-black ${cell === '・' ? 'text-[#b08968]' : 'text-[#2f1b14]'}`}>{cell}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      <View className="mt-4 rounded-xl border border-accent/50 bg-white p-3">
        <Text className="text-sm font-black text-[#2f1b14]">編成情報</Text>
        <Text className="mt-1 text-xs text-[#6b4532]">デッキ名: スタンダード</Text>
        <Text className="text-xs text-[#6b4532]">コスト: 28 / 30</Text>
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
