import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ImageBackground, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '@/components/module/app-loading-screen';
import { TapToStartScreen } from '@/components/module/tap-to-start-screen';
import { homeAssets } from '@/constants/home-assets';

export function TitleScreen() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  const preloadTargets = useMemo(() => {
    const optionalTargets = Array.isArray(homeAssets.preloadTargets) ? homeAssets.preloadTargets : [];
    return [homeAssets.titleBackground, ...optionalTargets].filter(Boolean);
  }, []);

  useEffect(() => {
    let active = true;

    async function preloadAssets() {
      await Promise.all(preloadTargets.map((asset) => Asset.fromModule(asset).downloadAsync()));
      if (active) {
        setIsReady(true);
      }
    }

    preloadAssets().catch(() => {
      if (active) {
        setIsReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [preloadTargets]);

  return (
    <ImageBackground source={homeAssets.titleBackground} resizeMode="cover" className="flex-1">
      <SafeAreaView className="flex-1">
        <View className="flex-1 bg-black/20">{isReady ? <TapToStartScreen onPressStart={() => router.replace('/home')} /> : <AppLoadingScreen />}</View>
      </SafeAreaView>
    </ImageBackground>
  );
}
