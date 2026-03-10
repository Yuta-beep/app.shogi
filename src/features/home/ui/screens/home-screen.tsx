import { useRouter } from 'expo-router';
import { ImageBackground, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { homeAssets } from '@/constants/home-assets';
import { HomeActionGridSection } from '@/features/home/ui/sections/home-action-grid-section';
import { HomeBackgroundSection } from '@/features/home/ui/sections/home-background-section';
import { HomeHeaderSection } from '@/features/home/ui/sections/home-header-section';
import { useHomeScreen } from '@/features/home/ui/use-home-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';

export function HomeScreen() {
  const router = useRouter();
  const { snapshot, isLoading } = useHomeScreen();
  const { isReady: areAssetsReady } = useAssetPreload(homeAssets.preloadTargets);
  useScreenBgm('home');

  if (isLoading || !areAssetsReady) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  return (
    <ImageBackground source={homeAssets.background} resizeMode="cover" className="flex-1">
      <SafeAreaView className="flex-1 bg-black/10">
        <View className="flex-1">
          <HomeBackgroundSection />
          <HomeHeaderSection
            onPressMatching={() => {
              void playSe('tap');
              router.push('/matching');
            }}
            playerName={snapshot.playerName}
            playerRank={snapshot.playerRank}
            playerExp={snapshot.playerExp}
          />
          <HomeActionGridSection />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
