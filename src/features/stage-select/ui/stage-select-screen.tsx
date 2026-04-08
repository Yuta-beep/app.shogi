import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { GlobalHomeHud } from '@/components/organism/global-home-hud';
import { homeAssets } from '@/constants/home-assets';
import {
  getNormalDungeonStagePreviewSource,
  normalDungeonStagePreviewPreloadTargets,
} from '@/constants/normal-dungeon-stage-previews';
import { stageSelectBackgrounds } from '@/constants/stage-select-data';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useStageSelectScreen } from '@/features/stage-select/ui/use-stage-select-screen';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';

/** マップをこの px 以上スクロールしたらステージイメージを隠す（ユーザー操作時のみ） */
const MAP_SCROLL_HIDE_PREVIEW_PX = 36;

export function StageSelectScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const mapScrollRef = useRef<ScrollView | null>(null);
  const hasAutoScrolledRef = useRef(false);
  const [mapScrollY, setMapScrollY] = useState(0);
  const [userInteractedWithMapScroll, setUserInteractedWithMapScroll] = useState(false);
  const {
    isLoading,
    currentPage,
    setCurrentPage,
    ranges,
    nodesInPage,
    selectedStageId,
    selectedStage,
    selectStage,
  } = useStageSelectScreen();
  useScreenBgm('dungeonSelect');

  const preloadTargets = useMemo(
    () => [...Object.values(stageSelectBackgrounds), ...normalDungeonStagePreviewPreloadTargets],
    [],
  );
  const { isReady } = useAssetPreload(preloadTargets);

  const currentRange = ranges.find((range) => range.page === currentPage) ?? ranges[0];

  useEffect(() => {
    hasAutoScrolledRef.current = false;
  }, [currentPage]);

  useEffect(() => {
    setUserInteractedWithMapScroll(false);
    setMapScrollY(0);
  }, [selectedStageId]);

  useEffect(() => {
    if (!isReady || isLoading) return;
    if (hasAutoScrolledRef.current) return;
    if (!selectedStage || selectedStage.page !== currentPage) return;

    const maxScrollY = Math.max(0, currentRange.height - 1);
    const targetY = Math.min(maxScrollY, Math.max(0, selectedStage.top - 320));
    const timer = setTimeout(() => {
      mapScrollRef.current?.scrollTo({ y: targetY, animated: false });
      hasAutoScrolledRef.current = true;
    }, 0);

    return () => clearTimeout(timer);
  }, [currentPage, currentRange.height, isLoading, isReady, selectedStage]);

  if (!isReady || isLoading) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  const showStagePreviewImage =
    selectedStage &&
    (!userInteractedWithMapScroll || mapScrollY < MAP_SCROLL_HIDE_PREVIEW_PX);

  const previewImageMaxHeight = Math.min(420, Math.round(windowHeight * 0.42));

  const stagePreviewSource = useMemo(
    () => (selectedStage ? getNormalDungeonStagePreviewSource(selectedStage.id) : null),
    [selectedStage],
  );

  return (
    <SafeAreaView className="flex-1" edges={['left', 'right', 'bottom']}>
      <GlobalHomeHud />
      <ImageBackground
        source={stageSelectBackgrounds[currentPage as keyof typeof stageSelectBackgrounds]}
        resizeMode="cover"
        className="flex-1"
      >
        <View className="flex-1">
          <View className="z-20 bg-[#f7f7f7]/90 px-2 py-2">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 px-1"
            >
              {ranges.map((range) => {
                const active = range.page === currentPage;
                return (
                  <Pressable
                    key={range.page}
                    onPress={() => {
                      void playSe('tap');
                      setCurrentPage(range.page);
                    }}
                    className={`rounded-lg px-3 py-2 ${active ? 'bg-[#ffc107]' : 'bg-white/75'}`}
                  >
                    <Text
                      className={`text-xs font-black ${active ? 'text-white' : 'text-[#4b5563]'}`}
                    >
                      {range.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            ref={mapScrollRef}
            className="flex-1"
            contentContainerClassName="pb-44"
            scrollEventThrottle={16}
            onScrollBeginDrag={() => setUserInteractedWithMapScroll(true)}
            onScroll={(e) => setMapScrollY(e.nativeEvent.contentOffset.y)}
          >
            <View style={{ height: currentRange.height, position: 'relative' }}>
              {nodesInPage.map((node) => (
                <View
                  key={node.id}
                  style={{
                    position: 'absolute',
                    top: node.top,
                    left: `${node.left}%`,
                    transform: [{ translateX: -28 }],
                    alignItems: 'center',
                  }}
                >
                  {node.unlockPieces.length > 0 ? (
                    <View className="mb-1 max-w-40 flex-row flex-wrap justify-center gap-1">
                      {node.unlockPieces.map((piece) => (
                        <View
                          key={`${node.id}-${piece}`}
                          className={`rounded-full border border-black/10 px-2 py-0.5 ${node.isUnlocked ? 'bg-white/90' : 'bg-gray-300/90'}`}
                        >
                          <Text
                            className={`text-[11px] font-black ${node.isUnlocked ? 'text-[#222]' : 'text-[#6b7280]'}`}
                          >
                            {piece}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <Pressable
                    onPress={() => {
                      void playSe('tap');
                      // 同じステージを再タップしたときもイメージを再度見られるようにする
                      setUserInteractedWithMapScroll(false);
                      setMapScrollY(0);
                      void selectStage(node.id);
                    }}
                    disabled={!node.isUnlocked}
                    style={{ backgroundColor: node.isUnlocked ? node.color : '#9ca3af' }}
                    className={`h-14 w-14 items-center justify-center rounded-full border-2 border-white/70 shadow ${selectedStageId === node.id ? 'scale-110' : ''} ${node.isUnlocked ? '' : 'opacity-80'}`}
                  >
                    <Text className="text-lg font-black text-white">{node.id}</Text>
                    {!node.isUnlocked ? (
                      <View className="absolute inset-0 items-center justify-center rounded-full bg-black/30">
                        <Text className="text-[9px] font-black text-white">LOCK</Text>
                      </View>
                    ) : null}
                  </Pressable>

                  {node.isCleared ? (
                    <View className="mt-1 rounded-full bg-[#16a34a] px-2 py-0.5">
                      <Text className="text-[10px] font-black text-white">CLEAR</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </ScrollView>

          <View className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-4">
            <View className="rounded-xl bg-white/95 p-4 shadow-xl">
              {selectedStage ? (
                <>
                  <Text className="text-lg font-black text-[#111]">{`ステージ${selectedStage.id}: ${selectedStage.name}`}</Text>
                  {showStagePreviewImage && stagePreviewSource !== null ? (
                    <Animated.View
                      key={`stage-preview-${selectedStage.id}`}
                      entering={FadeIn.duration(380)}
                      className="mt-2 w-full overflow-hidden rounded-lg bg-black/5"
                      style={{ height: previewImageMaxHeight }}
                    >
                      <Image
                        source={stagePreviewSource}
                        accessibilityIgnoresInvertColors
                        accessibilityLabel={`ステージ${selectedStage.id}のイメージ`}
                        contentFit="contain"
                        style={{ width: '100%', height: '100%' }}
                      />
                    </Animated.View>
                  ) : null}
                  <Pressable
                    onPress={() => {
                      void playSe('confirm');
                      router.push({
                        pathname: '/stage-shogi',
                        params: { stage: String(selectedStage.id) },
                      });
                    }}
                    className="mt-2 rounded-lg bg-[#ffc107] px-4 py-3"
                  >
                    <Text className="text-center text-base font-black text-white">開始</Text>
                  </Pressable>
                </>
              ) : (
                <Text className="text-center text-sm font-bold text-[#555]">
                  ステージを選択してください
                </Text>
              )}

              <Pressable
                onPress={() => {
                  void playSe('tap');
                  router.replace('/home');
                }}
                className="mt-3 rounded-lg border border-[#ffc107] bg-[#fff8e1] px-4 py-3"
              >
                <Text className="text-center text-sm font-black text-[#4b5563]">ホームに戻る</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}
