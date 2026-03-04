import { useRouter } from 'expo-router';
import { ImageBackground, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { homeAssets } from '@/constants/home-assets';
import { HomeActionGridSection } from '@/features/home/ui/sections/home-action-grid-section';
import { HomeBackgroundSection } from '@/features/home/ui/sections/home-background-section';
import { HomeCurrencySection } from '@/features/home/ui/sections/home-currency-section';
import { HomeHeaderSection } from '@/features/home/ui/sections/home-header-section';
import { useHomeScreen } from '@/features/home/ui/use-home-screen';

export function HomeScreen() {
  const router = useRouter();
  const { snapshot } = useHomeScreen();

  return (
    <ImageBackground source={homeAssets.background} resizeMode="cover" className="flex-1">
      <SafeAreaView className="flex-1 bg-black/10">
        <View className="flex-1">
          <HomeBackgroundSection />
          <HomeHeaderSection
            onPressMatching={() => router.push('/matching')}
            playerName={snapshot.playerName}
            rating={snapshot.rating}
          />
          <HomeCurrencySection pawnCurrency={snapshot.pawnCurrency} goldCurrency={snapshot.goldCurrency} />
          <HomeActionGridSection />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
