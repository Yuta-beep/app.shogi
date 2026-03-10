import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageBackground, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { TapToStartScreen } from '@/components/organism/tap-to-start-screen';
import { homeAssets } from '@/constants/home-assets';
import { TITLE_TO_HOME_LOADING_MS } from '@/constants/loading';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';

export function TitleScreen() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const preloadTargets = useMemo(() => {
    const optionalTargets = Array.isArray(homeAssets.preloadTargets)
      ? homeAssets.preloadTargets
      : [];
    return [homeAssets.titleBackground, ...optionalTargets].filter(Boolean);
  }, []);

  const { isReady } = useAssetPreload(preloadTargets);
  useScreenBgm('title');

  useEffect(() => {
    return () => {
      if (transitionTimer.current) {
        clearTimeout(transitionTimer.current);
      }
    };
  }, []);

  function startHomeTransition() {
    if (isTransitioning) {
      return;
    }
    void playSe('tap');
    setIsTransitioning(true);
    transitionTimer.current = setTimeout(() => {
      router.replace('/home');
    }, TITLE_TO_HOME_LOADING_MS);
  }

  return (
    <ImageBackground source={homeAssets.titleBackground} resizeMode="cover" className="flex-1">
      <SafeAreaView className="flex-1">
        <View className="flex-1 bg-black/20">
          {isReady && !isTransitioning ? (
            <TapToStartScreen onPressStart={startHomeTransition} />
          ) : (
            <AppLoadingScreen />
          )}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
