import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { UiScreenShell } from '@/components/module/ui-screen-shell';

const boardImage = require('../../../../assets/stage-shogi/shogi-board.png');

export function StageShogiScreen() {
  const params = useLocalSearchParams<{ stage?: string }>();
  const stageText = params.stage ? `STAGE ${params.stage}` : 'STAGE';

  return (
    <UiScreenShell title="Stage Shogi" subtitle="バトル画面（UIモック）">
      <View className="rounded-xl border-2 border-accent bg-[#f3ead3] p-3">
        <Text className="text-sm font-bold text-[#6b4532]">TURN 12 / 99</Text>
        <Text className="text-base font-black text-ink">{`${stageText}  先手: あなた / 後手: CPU`}</Text>
      </View>

      <View className="mt-3 overflow-hidden rounded-xl border-2 border-[#a27700] bg-[#e3c690] p-2">
        <Image source={boardImage} contentFit="contain" style={{ width: '100%', height: 320 }} />
      </View>

      <View className="mt-3 rounded-xl border border-accent/60 bg-white p-3">
        <Text className="text-sm font-bold text-ink">手駒</Text>
        <Text className="mt-1 text-sm text-[#6b4532]">歩 x2 / 桂 x1 / 角 x1</Text>
      </View>
    </UiScreenShell>
  );
}
