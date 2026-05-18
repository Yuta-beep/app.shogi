import { Image } from 'expo-image';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageBackground, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { TapToStartScreen } from '@/components/organism/tap-to-start-screen';
import { homeAssets } from '@/constants/home-assets';
import { TITLE_TO_HOME_LOADING_MS } from '@/constants/loading';
import {
  TITLE_TUTORIAL_BUTTON_BOTTOM,
  TITLE_TUTORIAL_BUTTON_HEIGHT,
  TITLE_TUTORIAL_BUTTON_RIGHT,
  TITLE_TUTORIAL_BUTTON_WIDTH,
} from '@/features/home/ui/title-layout';
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
    return [homeAssets.titleBackground, homeAssets.tutorialButton, ...optionalTargets].filter(
      Boolean,
    );
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

  function openTutorial() {
    if (isTransitioning) {
      return;
    }
    void playSe('tap');
    router.push('/tutorial' as Href);
  }

  if (!isReady || isTransitioning) {
    return <AppLoadingScreen />;
  }

  return (
    <ImageBackground source={homeAssets.titleBackground} resizeMode="cover" className="flex-1">
      <SafeAreaView className="flex-1">
        <View className="flex-1 bg-black/20">
          <TapToStartScreen onPressStart={startHomeTransition} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="チュートリアル画面を開く"
            onPress={openTutorial}
            style={{
              bottom: TITLE_TUTORIAL_BUTTON_BOTTOM,
              right: TITLE_TUTORIAL_BUTTON_RIGHT,
              width: TITLE_TUTORIAL_BUTTON_WIDTH,
              height: TITLE_TUTORIAL_BUTTON_HEIGHT,
            }}
            className="absolute z-10 active:scale-95"
          >
            <Image
              source={homeAssets.tutorialButton}
              contentFit="contain"
              style={{ width: '100%', height: '100%' }}
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
