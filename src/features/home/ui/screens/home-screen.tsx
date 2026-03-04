import { useRouter } from 'expo-router';
import { ImageBackground, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { homeAssets } from '@/constants/home-assets';
import { HomeActionGridSection } from '@/features/home/ui/sections/home-action-grid-section';
import { HomeBackgroundSection } from '@/features/home/ui/sections/home-background-section';
import { HomeCurrencySection } from '@/features/home/ui/sections/home-currency-section';
import { HomeHeaderSection } from '@/features/home/ui/sections/home-header-section';

export function HomeScreen() {
  const router = useRouter();

  return (
    <ImageBackground source={homeAssets.background} resizeMode="cover" className="flex-1">
      <SafeAreaView className="flex-1 bg-black/10">
        <View className="flex-1">
          <HomeBackgroundSection />
          <HomeHeaderSection onPressMatching={() => router.push('/matching')} />
          <HomeCurrencySection />
          <HomeActionGridSection />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}
