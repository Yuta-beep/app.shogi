import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { UiScreenShell } from '@/components/module/ui-screen-shell';

const onlineBg = require('../../../../assets/online-battle/online-bg.png');

export function OnlineBattleScreen() {
  const params = useLocalSearchParams<{ opponent?: string; rating?: string }>();
  const opponent = params.opponent ?? 'searching...';
  const rating = params.rating ?? '----';

  return (
    <UiScreenShell title="Online Battle" subtitle="対戦接続状況">
      <View className="overflow-hidden rounded-xl border border-accent/60">
        <Image source={onlineBg} contentFit="cover" style={{ width: '100%', height: 170 }} />
      </View>

      <View className="mt-3 rounded-xl border-2 border-accent bg-[#fff7e6] p-4">
        <Text className="text-lg font-black text-ink">対局ルーム #A12X9</Text>
        <Text className="mt-1 text-sm text-[#6b4532]">接続状態: マッチング完了（UIモック）</Text>
      </View>

      <View className="mt-3 rounded-xl border border-accent/60 bg-white p-3">
        <Text className="text-base font-bold text-ink">プレイヤー</Text>
        <Text className="mt-1 text-sm text-[#6b4532]">あなた: プレイヤー名 (R1200)</Text>
        <Text className="text-sm text-[#6b4532]">{`相手: ${opponent} (R${rating})`}</Text>
      </View>

      <Pressable className="mt-4 rounded-lg border border-accent bg-white px-3 py-3 active:scale-95">
        <Text className="text-center font-bold text-ink">待機キャンセル</Text>
      </Pressable>
    </UiScreenShell>
  );
}
