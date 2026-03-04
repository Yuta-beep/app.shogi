import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { UiScreenShell } from '@/components/module/ui-screen-shell';

const eventDungeon = require('../../../../assets/special-dungeon/event-dungeon.png');

const eventStages = [
  { id: 'EX-1', name: '夜叉の陣', rule: '5分切れ負け', open: true },
  { id: 'EX-2', name: '幻影の間', rule: '駒落ち戦', open: true },
  { id: 'EX-3', name: '天魔決戦', rule: '連勝制', open: false },
] as const;

export function SpecialDungeonScreen() {
  const router = useRouter();

  return (
    <UiScreenShell title="Special Dungeon" subtitle="期間限定ステージに挑戦">
      <View className="overflow-hidden rounded-xl border-2 border-[#a27700]">
        <Image source={eventDungeon} contentFit="cover" style={{ width: '100%', height: 180 }} />
      </View>

      <View className="mt-3 rounded-xl border border-[#a27700] bg-[#fff5d6] p-3">
        <Text className="text-lg font-black text-ink">期間限定イベント</Text>
        <Text className="mt-1 text-sm text-[#6b4532]">開催期間: 2026/03/01 - 2026/03/14</Text>
      </View>

      <View className="mt-4 gap-2">
        {eventStages.map((stage) => (
          <Pressable
            key={stage.id}
            onPress={() => stage.open && router.push('/stage-shogi')}
            disabled={!stage.open}
            className={`rounded-xl border px-3 py-3 ${stage.open ? 'border-[#a27700] bg-white active:scale-[0.99]' : 'border-gray-300 bg-gray-100'}`}
          >
            <Text className="text-base font-bold text-ink">{`${stage.id}  ${stage.name}`}</Text>
            <Text className="mt-1 text-sm text-[#6b4532]">{stage.rule}</Text>
            {!stage.open ? <Text className="mt-1 text-xs font-bold text-[#9f6d00]">解放条件: EX-2クリア</Text> : null}
          </Pressable>
        ))}
      </View>
    </UiScreenShell>
  );
}
