import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { GlobalHomeHud } from '@/components/organism/global-home-hud';
import { homeAssets } from '@/constants/home-assets';
import { onlineMatchAssets } from '@/constants/online-match-assets';
import {
  ONLINE_MATCH_MODE_CONTENT_PADDING_BOTTOM,
  ONLINE_MATCH_MODE_CONTENT_PADDING_TOP,
  ONLINE_MATCH_MODE_HORIZONTAL_INSET,
  ONLINE_MATCH_MODE_INTERNET_BUTTON,
  ONLINE_MATCH_MODE_LAN_BUTTON,
  ONLINE_MATCH_MODE_RANKING_OFFSET_Y,
  type OnlineMatchButtonLayout,
  resolveOnlineMatchButtonMetrics,
} from '@/features/online-match/ui/online-match-mode-layout';
import { PvpRatingRankingPanel } from '@/features/online-match/ui/pvp-rating-ranking-panel';
import { usePvpRatingRanking } from '@/features/online-match/ui/use-pvp-rating-ranking';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';

type OnlineMatchImageButtonProps = {
  source: number;
  layout: OnlineMatchButtonLayout;
  contentWidth: number;
  onPress: () => void;
  dimmed?: boolean;
};

function OnlineMatchImageButton({
  source,
  layout,
  contentWidth,
  onPress,
  dimmed = false,
}: OnlineMatchImageButtonProps) {
  const { displayWidth, displayHeight, hitWidth, hitHeight } = resolveOnlineMatchButtonMetrics(
    source,
    contentWidth,
    layout,
  );

  return (
    <View
      pointerEvents="box-none"
      style={[styles.buttonSlot, layout.offsetY != null ? { marginTop: layout.offsetY } : null]}
    >
      <View
        pointerEvents="box-none"
        style={{ width: displayWidth, height: displayHeight, alignItems: 'center', justifyContent: 'center' }}
      >
        <Image
          pointerEvents="none"
          source={source}
          contentFit="contain"
          style={{ width: displayWidth, height: displayHeight, opacity: dimmed ? 0.85 : 1 }}
        />
        <Pressable
          onPress={onPress}
          style={{ position: 'absolute', width: hitWidth, height: hitHeight }}
          className="active:scale-95"
          accessibilityRole="button"
        >
          {dimmed ? <View pointerEvents="none" style={styles.lanDimOverlay} /> : null}
        </Pressable>
      </View>
    </View>
  );
}

export function OnlineMatchModeScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const contentWidth = screenWidth - ONLINE_MATCH_MODE_HORIZONTAL_INSET * 2;
  const { isReady: areAssetsReady } = useAssetPreload([
    onlineMatchAssets.modeBackground,
    onlineMatchAssets.internetBattleButton,
    onlineMatchAssets.lanBattleButton,
  ]);
  const ranking = usePvpRatingRanking();

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

        <ScrollView
          className="flex-1"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          <OnlineMatchImageButton
            source={onlineMatchAssets.internetBattleButton}
            layout={ONLINE_MATCH_MODE_INTERNET_BUTTON}
            contentWidth={contentWidth}
            onPress={() => {
              void playSe('confirm');
              router.push('/online-match-setup');
            }}
          />

          <OnlineMatchImageButton
            source={onlineMatchAssets.lanBattleButton}
            layout={ONLINE_MATCH_MODE_LAN_BUTTON}
            contentWidth={contentWidth}
            dimmed
            onPress={() => {
              void playSe('cancel');
              Alert.alert('準備中', 'LAN対戦は今後追加予定です。');
            }}
          />

          <View style={styles.rankingSection}>
            <PvpRatingRankingPanel
              entries={ranking.entries}
              loading={ranking.loading}
              error={ranking.error}
              fetchedAt={ranking.fetchedAt}
              nextRefreshAt={ranking.nextRefreshAt}
              fromCache={ranking.fromCache}
              onRefresh={() => {
                void playSe('tap');
                void ranking.refresh();
              }}
            />
          </View>

          <Pressable
            onPress={() => {
              void playSe('tap');
              router.replace('/home');
            }}
            style={styles.homeButton}
            className="active:scale-95"
          >
            <Text className="text-sm font-black text-white">ホームに戻る</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: ONLINE_MATCH_MODE_CONTENT_PADDING_TOP,
    paddingBottom: ONLINE_MATCH_MODE_CONTENT_PADDING_BOTTOM,
    paddingHorizontal: ONLINE_MATCH_MODE_HORIZONTAL_INSET,
    alignItems: 'center',
  },
  buttonSlot: {
    alignItems: 'center',
  },
  lanDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(75, 85, 99, 0.28)',
  },
  rankingSection: {
    alignSelf: 'stretch',
    width: '100%',
    marginTop: ONLINE_MATCH_MODE_RANKING_OFFSET_Y,
  },
  homeButton: {
    marginTop: 20,
    borderRadius: 8,
    backgroundColor: '#404040',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
});
