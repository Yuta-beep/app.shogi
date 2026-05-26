import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { GlobalHomeHud } from '@/components/organism/global-home-hud';
import { homeAssets } from '@/constants/home-assets';
import { onlineMatchAssets } from '@/constants/online-match-assets';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';

export function OnlineMatchModeScreen() {
  const router = useRouter();
  const { isReady: areAssetsReady } = useAssetPreload([onlineMatchAssets.modeBackground]);

  useScreenBgm('onlineBattle');

  if (!areAssetsReady) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['left', 'right', 'bottom']}>
      <GlobalHomeHud />
      <View className="flex-1">
        <View className="absolute inset-0">
          <Image
            source={onlineMatchAssets.modeBackground}
            contentFit="cover"
            style={{ width: '100%', height: '100%' }}
          />
          <View className="absolute inset-0 bg-black/45" />
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <View className="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-2xl">
            <Text className="text-center text-2xl font-black text-[#1f2937]">対戦モードを選択</Text>

            <View className="mt-5 gap-3">
              <Pressable
                onPress={() => {
                  void playSe('confirm');
                  router.push('/online-match-setup');
                }}
                className="items-center rounded-xl px-4 py-3 active:scale-95"
                style={{ backgroundColor: '#3b82f6' }}
              >
                <Text className="text-base font-black text-white">インターネット対戦</Text>
                <Text className="mt-1 text-center text-xs font-bold text-white/90">
                  対戦準備のあとマッチングへ
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  void playSe('cancel');
                  Alert.alert('準備中', 'LAN対戦は今後追加予定です。');
                }}
                className="items-center rounded-xl px-4 py-3 active:scale-95"
                style={{ backgroundColor: '#059669' }}
              >
                <Text className="text-base font-black text-white">LAN対戦（同じWi‑Fi内）</Text>
                <Text className="mt-1 text-center text-xs font-bold text-white/90">準備中</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                void playSe('tap');
                router.replace('/home');
              }}
              className="mt-6 self-center rounded-lg bg-neutral-700 px-5 py-2 active:scale-95"
            >
              <Text className="text-sm font-black text-white">ホームに戻る</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
