import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ImageBackground, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '@/components/module/app-loading-screen';
import { TapToStartScreen } from '@/components/module/tap-to-start-screen';
import { homeAssets } from '@/constants/home-assets';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';

export function TitleScreen() {
  const router = useRouter();

  const preloadTargets = useMemo(() => {
    const optionalTargets = Array.isArray(homeAssets.preloadTargets) ? homeAssets.preloadTargets : [];
    return [homeAssets.titleBackground, ...optionalTargets].filter(Boolean);
  }, []);

  const { isReady } = useAssetPreload(preloadTargets);

  return (
    <ImageBackground source={homeAssets.titleBackground} resizeMode="cover" className="flex-1">
      <SafeAreaView className="flex-1">
        <View className="flex-1 bg-black/20">
          {isReady ? <TapToStartScreen onPressStart={() => router.replace('/home')} /> : <AppLoadingScreen imageSource={homeAssets.loadingImage} />}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
