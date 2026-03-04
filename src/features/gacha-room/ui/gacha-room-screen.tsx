import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGachaRoomScreen } from '@/features/gacha-room/ui/use-gacha-room-screen';

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

export function GachaRoomScreen() {
  const router = useRouter();
  const vm = useGachaRoomScreen();

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
            <Text className="text-xs font-black text-white">{`歩 x${vm.pawnCurrency}`}</Text>
          </View>
          <View className="rounded-lg border border-amber-300/40 bg-white/10 px-3 py-1.5">
            <Text className="text-xs font-black text-amber-200">{`金 x${vm.goldCurrency}`}</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-8">
        {vm.banners.map((banner) => {
          const active = banner.key === vm.selectedKey;
          const drawImage = banner.usesGold ? gachaAssets.drawGold : active ? gachaAssets.draw0 : gachaAssets.draw1;

          return (
            <View key={banner.key} className={`rounded-2xl border p-3 ${active ? 'border-amber-300 bg-white/10' : 'border-white/20 bg-white/5'}`}>
              <Pressable onPress={() => vm.setSelectedKey(banner.key)} className="active:scale-[0.99]">
                <Image source={gachaAssets.banners[banner.key]} contentFit="contain" style={{ width: '100%', height: 120 }} />
              </Pressable>

              <View className="mt-2 flex-row items-center justify-between">
                <View>
                  <Text className="text-base font-black text-white">{banner.name}</Text>
                  <Text className="text-xs text-slate-300">{banner.rareRateText}</Text>
                </View>
                <Pressable onPress={() => vm.setSelectedKey(banner.key)} className="active:scale-95">
                  <Image source={drawImage} contentFit="contain" style={{ width: 100, height: 40 }} />
                </Pressable>
              </View>
            </View>
          );
        })}

        <View className="rounded-2xl border border-white/20 bg-white/10 p-4">
          <Text className="text-sm font-black text-white">
            {vm.banners.find((banner) => banner.key === vm.selectedKey)?.name ?? 'ガチャ'}
          </Text>
          <Text className="mt-1 text-xs text-slate-300">{vm.statusText}</Text>
          <Pressable onPress={() => void vm.roll()} className="mt-3 rounded-xl bg-[#ec4899] px-4 py-3">
            <Text className="text-center text-base font-black text-white">ガチャを引く</Text>
          </Pressable>
        </View>

        <View className="rounded-2xl border border-white/20 bg-white/10 p-4">
          <Text className="text-sm font-black text-white">ガチャ履歴</Text>
          {vm.history.length === 0 ? (
            <Text className="mt-2 text-xs text-slate-300">まだガチャを引いていません。</Text>
          ) : (
            vm.history.map((item, index) => (
              <Text key={`${item}-${index}`} className="mt-1 text-xs text-slate-200">{`・${item}`}</Text>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
