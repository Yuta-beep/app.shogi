import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { homeAssets } from '@/constants/home-assets';
import { HomeActionGridSection } from '@/features/home/ui/sections/home-action-grid-section';
import { HomeBackgroundSection } from '@/features/home/ui/sections/home-background-section';
import { gachaBallColorIndexForCurrentPeriod } from '@/features/home/lib/gacha-ball-schedule';
import { HomeHeaderSection } from '@/features/home/ui/sections/home-header-section';
import { useHomeScreen } from '@/features/home/ui/use-home-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';

const GACHA_BALL_COLOR_ROWS: { label: string; source: number }[] = [
  { label: '白', source: homeAssets.gachaBallColors.white },
  { label: '青', source: homeAssets.gachaBallColors.blue },
  { label: '赤', source: homeAssets.gachaBallColors.red },
  { label: '金', source: homeAssets.gachaBallColors.gold },
  { label: '黒', source: homeAssets.gachaBallColors.black },
];

type GachaModalPanel = 'viewer' | 'help';

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [gachaModalOpen, setGachaModalOpen] = useState(false);
  const [gachaModalPanel, setGachaModalPanel] = useState<GachaModalPanel>('viewer');
  const [viewerBallSource, setViewerBallSource] = useState<number | null>(null);
  const { snapshot, isLoading } = useHomeScreen();
  const { isReady: areAssetsReady } = useAssetPreload(homeAssets.preloadTargets);
  useScreenBgm('home');

  const closeGachaModalCompletely = useCallback(() => {
    void playSe('tap');
    setGachaModalOpen(false);
    setGachaModalPanel('viewer');
    setViewerBallSource(null);
  }, []);

  const openGachaBallViewer = useCallback(() => {
    void playSe('tap');
    const idx = gachaBallColorIndexForCurrentPeriod();
    setViewerBallSource(GACHA_BALL_COLOR_ROWS[idx]!.source);
    setGachaModalPanel('viewer');
    setGachaModalOpen(true);
  }, []);

  const openGachaHelp = useCallback(() => {
    void playSe('tap');
    setGachaModalPanel('help');
  }, []);

  const closeGachaHelpBackToViewer = useCallback(() => {
    void playSe('tap');
    setGachaModalPanel('viewer');
  }, []);

  const handleGachaModalRequestClose = useCallback(() => {
    if (gachaModalPanel === 'help') {
      setGachaModalPanel('viewer');
    } else {
      closeGachaModalCompletely();
    }
  }, [gachaModalPanel, closeGachaModalCompletely]);

  if (isLoading || !areAssetsReady) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  return (
    <View className="flex-1 bg-black">
      <SafeAreaView edges={['top']} className="bg-black" />
      <HomeHeaderSection
        onPressBackToTitle={() => {
          void playSe('tap');
          router.replace('/');
        }}
        onPressOnlineBattle={() => {
          void playSe('tap');
          router.push('/online-battle');
        }}
        onPressMatching={() => {
          void playSe('tap');
          router.push('/matching');
        }}
        onPressGachaBallIcon={openGachaBallViewer}
        playerName={snapshot.playerName}
        playerRank={snapshot.playerRank}
        playerExp={snapshot.playerExp}
        pawnCurrency={snapshot.pawnCurrency}
        goldCurrency={snapshot.goldCurrency}
        stamina={snapshot.stamina}
        maxStamina={snapshot.maxStamina}
        nextRecoveryAt={snapshot.nextRecoveryAt}
      />
      <ImageBackground source={homeAssets.background} resizeMode="stretch" className="flex-1">
        <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 bg-black/10">
          <View className="flex-1">
            <HomeBackgroundSection />
            <HomeActionGridSection />
          </View>
        </SafeAreaView>
      </ImageBackground>

      <Modal
        visible={gachaModalOpen}
        animationType="fade"
        presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
        onRequestClose={handleGachaModalRequestClose}
      >
        <View className="flex-1 bg-[#1f1410]">
          <SafeAreaView className="flex-1" edges={['top', 'left', 'right', 'bottom']}>
            {viewerBallSource !== null ? (
              <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
                <Image
                  source={viewerBallSource}
                  contentFit="contain"
                  style={StyleSheet.absoluteFillObject}
                />
              </View>
            ) : null}

            {gachaModalPanel === 'viewer' ? (
              <>
                <View className="absolute left-4 z-20" style={{ top: Math.max(insets.top, 8) + 4 }}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="ホームへ戻る"
                    onPress={closeGachaModalCompletely}
                    className="rounded-full bg-[rgba(139,0,0,0.88)] p-2.5 active:opacity-80"
                  >
                    <MaterialIcons name="arrow-back" size={28} color="#fff" />
                  </Pressable>
                </View>

                <View
                  className="absolute right-5 z-20"
                  style={{ bottom: Math.max(insets.bottom, 12) + 8 }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="ガチャ玉の色のヘルプ"
                    onPress={openGachaHelp}
                    className="rounded-lg border-2 border-[#8e6428] bg-[#d2a860] px-4 py-3 active:opacity-80"
                  >
                    <Text className="text-center text-sm font-black text-[#4b2e1f]">ヘルプ</Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            {gachaModalPanel === 'help' ? (
              <View className="z-30 justify-center bg-black/55 px-5" style={StyleSheet.absoluteFillObject}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="ヘルプを閉じてガチャ玉に戻る"
                  className="flex-1 justify-center"
                  onPress={closeGachaHelpBackToViewer}
                >
                  <Pressable
                    className="max-h-[78%] rounded-2xl border-2 border-[#8e6428] bg-[#fff7e6] p-5"
                    onPress={(e) => e.stopPropagation()}
                  >
                    <Text className="mb-3 text-lg font-black text-[#4b2e1f]">ガチャ玉の色</Text>
                    <Text className="mb-4 text-sm font-semibold leading-6 text-[#4b2e1f]">
                      ガチャにおける当たり駒の出やすさは、ガチャ玉の色で確認できます。当たる確率が低い色から、白 → 青 → 赤 → 金 → 黒 の順です。
                    </Text>
                    <ScrollView className="mb-2" showsVerticalScrollIndicator={false}>
                      <View className="flex-row flex-wrap justify-center gap-x-3 gap-y-4">
                        {GACHA_BALL_COLOR_ROWS.map(({ label, source }) => (
                          <View key={label} className="w-[28%] items-center">
                            <Image
                              source={source}
                              contentFit="contain"
                              style={{ width: 72, height: 72 }}
                            />
                            <Text className="mt-1 text-center text-xs font-black text-[#4b2e1f]">
                              {label}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="閉じる"
                      onPress={closeGachaHelpBackToViewer}
                      className="mt-5 rounded-lg border border-[#8e6428] bg-[#d2a860] py-3 active:opacity-80"
                    >
                      <Text className="text-center text-sm font-black text-[#4b2e1f]">閉じる</Text>
                    </Pressable>
                  </Pressable>
                </Pressable>
              </View>
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
