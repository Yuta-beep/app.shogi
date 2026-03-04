import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { UiScreenShell } from '@/components/module/ui-screen-shell';

const boardCells = Array.from({ length: 81 }, (_, i) => i);

export function StageShogiScreen() {
  const params = useLocalSearchParams<{ stage?: string }>();
  const stageText = params.stage ? `STAGE ${params.stage}` : 'STAGE';

  return (
    <UiScreenShell title="Stage Shogi" subtitle="バトル画面（UIモック）">
      <View className="rounded-xl border-2 border-accent bg-[#f3ead3] p-3">
        <Text className="text-sm font-bold text-[#6b4532]">TURN 12 / 99</Text>
        <Text className="text-base font-black text-ink">{`${stageText}  先手: あなた / 後手: CPU`}</Text>
      </View>

      <View className="mt-3 flex-row flex-wrap overflow-hidden rounded-xl border-2 border-[#a27700] bg-[#e3c690]">
        {boardCells.map((cell) => (
          <View key={cell} className="h-9 w-[11.11%] items-center justify-center border border-[#a27700]/40">
            <Text className="text-[10px] text-[#6b4532]">{(cell % 9) + 1}</Text>
          </View>
        ))}
      </View>

      <View className="mt-3 rounded-xl border border-accent/60 bg-white p-3">
        <Text className="text-sm font-bold text-ink">手駒</Text>
        <Text className="mt-1 text-sm text-[#6b4532]">歩 x2 / 桂 x1 / 角 x1</Text>
      </View>
    </UiScreenShell>
  );
}
