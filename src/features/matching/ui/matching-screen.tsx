import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { GlobalHomeHud } from '@/components/organism/global-home-hud';
import { homeAssets } from '@/constants/home-assets';
import { useMatchingScreen } from '@/features/matching/ui/use-matching-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';

const matchingBg = require('../../../../assets/matching/matching-bg.png');

export function MatchingScreen() {
  const router = useRouter();
  const { snapshot, isLoading, cancel } = useMatchingScreen();
  const { isReady: areAssetsReady } = useAssetPreload([matchingBg]);
  useScreenBgm('matching');

  if (isLoading || !areAssetsReady) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['left', 'right', 'bottom']}>
      <GlobalHomeHud />
      <View className="flex-1">
        <View className="absolute inset-0">
          <Image source={matchingBg} contentFit="cover" style={{ width: '100%', height: '100%' }} />
          <View className="absolute inset-0 bg-black/40" />
        </View>

        <View className="flex-1 items-center justify-center px-4">
          <View className="w-full max-w-[240px] rounded-xl bg-white/90 p-4 shadow-lg">
            <Text className="text-center text-base font-black text-[#1f2937]">マッチング中</Text>
            <Text className="mt-2 text-center text-sm text-[#4b5563]">{snapshot.status}</Text>

            <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
              <View
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${snapshot.progress}%` }}
              />
            </View>

            <Pressable
              onPress={async () => {
                void playSe('cancel');
                await cancel();
                router.replace('/home');
              }}
              className="mt-4 self-center rounded-lg bg-red-500 px-4 py-2 active:scale-95"
            >
              <Text className="text-sm font-black text-white">キャンセル</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
