import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const gachaAssets = {
  home: require('../../../../assets/shared/home-back.png'),
  draw1: require('../../../../assets/gacha/draw-1.png'),
  draw0: require('../../../../assets/gacha/draw-0.png'),
  drawGold: require('../../../../assets/gacha/draw-gold.png'),
  banners: {
    ukanmuri: require('../../../../assets/gacha/ukanmuri.png'),
    hihen: require('../../../../assets/gacha/hihen.png'),
    shinnyo: require('../../../../assets/gacha/shinnyo.png'),
    kanken1: require('../../../../assets/gacha/kanken1.png'),
  },
} as const;

type BannerKey = keyof typeof gachaAssets.banners;

type GachaDef = {
  key: BannerKey;
  name: string;
  rareRateText: string;
  usesGold?: boolean;
  pool: { char: string; rarity: 'UR' | 'SSR' | 'SR' | 'R' }[];
};

const gachaDefs: GachaDef[] = [
  {
    key: 'ukanmuri',
    name: 'うかんむりガチャ',
    rareRateText: 'UR 3% / SSR 8%',
    pool: [
      { char: '安', rarity: 'R' },
      { char: '空', rarity: 'SR' },
      { char: '宇', rarity: 'SSR' },
      { char: '守', rarity: 'UR' },
    ],
  },
  {
    key: 'hihen',
    name: 'ひへんガチャ',
    rareRateText: 'UR 4% / SSR 10%',
    pool: [
      { char: '爆', rarity: 'UR' },
      { char: '炎', rarity: 'SSR' },
      { char: '火', rarity: 'SR' },
      { char: '灯', rarity: 'R' },
    ],
  },
  {
    key: 'shinnyo',
    name: 'しんにょうガチャ',
    rareRateText: 'UR 3% / SSR 9%',
    pool: [
      { char: '逸', rarity: 'R' },
      { char: '迅', rarity: 'SR' },
      { char: '逃', rarity: 'UR' },
      { char: '巡', rarity: 'SSR' },
    ],
  },
  {
    key: 'kanken1',
    name: '漢検1級ガチャ',
    rareRateText: 'UR 7% / SSR 15%',
    usesGold: true,
    pool: [
      { char: '艸', rarity: 'UR' },
      { char: '閹', rarity: 'UR' },
      { char: '賚', rarity: 'SSR' },
      { char: '殲', rarity: 'SSR' },
    ],
  },
];

export function GachaRoomScreen() {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState<BannerKey>('ukanmuri');
  const history = ['UR 爆', 'SSR 宇', 'R 安'];
  const statusText = 'ガチャ球を回して結果を確認しよう！';

  const selected = useMemo(() => gachaDefs.find((def) => def.key === selectedKey) ?? gachaDefs[0], [selectedKey]);

  return (
    <SafeAreaView className="flex-1 bg-[#0f172a]">
      <View className="border-b border-white/15 bg-[#111827] px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-black text-white">ガチャルーム</Text>
          <Pressable onPress={() => router.replace('/home')} className="active:scale-95">
            <Image source={gachaAssets.home} contentFit="contain" style={{ width: 128, height: 40 }} />
          </Pressable>
        </View>
        <View className="mt-2 flex-row gap-2">
          <View className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5">
            <Text className="text-xs font-black text-white">歩 x3000</Text>
          </View>
          <View className="rounded-lg border border-amber-300/40 bg-white/10 px-3 py-1.5">
            <Text className="text-xs font-black text-amber-200">金 x20</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-8">
        {gachaDefs.map((def) => {
          const active = def.key === selectedKey;
          const drawImage = def.usesGold ? gachaAssets.drawGold : active ? gachaAssets.draw0 : gachaAssets.draw1;

          return (
            <View key={def.key} className={`rounded-2xl border p-3 ${active ? 'border-amber-300 bg-white/10' : 'border-white/20 bg-white/5'}`}>
              <Pressable onPress={() => setSelectedKey(def.key)} className="active:scale-[0.99]">
                <Image source={gachaAssets.banners[def.key]} contentFit="contain" style={{ width: '100%', height: 120 }} />
              </Pressable>

              <View className="mt-2 flex-row items-center justify-between">
                <View>
                  <Text className="text-base font-black text-white">{def.name}</Text>
                  <Text className="text-xs text-slate-300">{def.rareRateText}</Text>
                </View>
                <Pressable onPress={() => setSelectedKey(def.key)} className="active:scale-95">
                  <Image source={drawImage} contentFit="contain" style={{ width: 100, height: 40 }} />
                </Pressable>
              </View>
            </View>
          );
        })}

        <View className="rounded-2xl border border-white/20 bg-white/10 p-4">
          <Text className="text-sm font-black text-white">{selected.name}</Text>
          <Text className="mt-1 text-xs text-slate-300">{statusText}</Text>
          <Pressable
            onPress={() => {}}
            className="mt-3 rounded-xl bg-[#ec4899] px-4 py-3"
          >
            <Text className="text-center text-base font-black text-white">ガチャを引く</Text>
          </Pressable>
        </View>

        <View className="rounded-2xl border border-white/20 bg-white/10 p-4">
          <Text className="text-sm font-black text-white">ガチャ履歴</Text>
          {history.length === 0 ? (
            <Text className="mt-2 text-xs text-slate-300">まだガチャを引いていません。</Text>
          ) : (
            history.map((item, index) => (
              <Text key={`${item}-${index}`} className="mt-1 text-xs text-slate-200">{`・${item}`}</Text>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
