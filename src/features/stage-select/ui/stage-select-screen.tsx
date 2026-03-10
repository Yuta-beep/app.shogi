import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { homeAssets } from '@/constants/home-assets';
import { stageSelectBackgrounds } from '@/constants/stage-select-data';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useStageSelectScreen } from '@/features/stage-select/ui/use-stage-select-screen';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';

const pagePaths: Record<number, string> = {
  1: 'M 350 2350 C 375 2300, 425 2250, 500 2150 C 575 2100, 625 2050, 700 2000 C 750 1900, 775 1850, 800 1800 C 800 1700, 775 1650, 700 1600 C 625 1500, 575 1450, 500 1400 C 425 1300, 375 1250, 350 1200 C 375 1100, 425 1050, 500 1000 C 575 900, 625 850, 700 800 C 750 700, 775 650, 800 600 C 800 500, 775 450, 700 400 C 625 300, 575 250, 500 200',
  2: 'M 500 200 C 620 300, 700 450, 680 650 C 650 800, 560 950, 500 1100 C 440 1250, 350 1400, 320 1600 C 300 1800, 380 2000, 500 2350',
  3: 'M 450 100 C 650 300, 700 600, 500 850 C 320 1100, 300 1400, 500 1650 C 680 1900, 620 2200, 300 2450',
  4: 'M 300 1900 C 450 1700, 650 1500, 750 1300 C 700 1100, 600 950, 450 800 C 350 700, 300 600, 250 450',
  5: 'M 220 1800 C 230 1600, 470 1500, 510 1200 C 600 1000, 380 850, 260 650 C 300 500, 330 420, 330 360',
};

export function StageSelectScreen() {
  const router = useRouter();
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

  const preloadTargets = useMemo(() => Object.values(stageSelectBackgrounds), []);
  const { isReady } = useAssetPreload(preloadTargets);

  const currentRange = ranges.find((range) => range.page === currentPage) ?? ranges[0];

  if (!isReady || isLoading) {
    return (
      <ImageBackground source={stageSelectBackgrounds[1]} resizeMode="cover" className="flex-1">
        <SafeAreaView className="flex-1 bg-black/20">
          <AppLoadingScreen imageSource={homeAssets.loadingImage} />
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={stageSelectBackgrounds[currentPage as keyof typeof stageSelectBackgrounds]}
      resizeMode="cover"
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
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

          <ScrollView className="flex-1" contentContainerClassName="pb-44">
            <View style={{ height: currentRange.height, position: 'relative' }}>
              <Svg
                viewBox={`0 0 1000 ${currentRange.height + 150}`}
                style={{ position: 'absolute', width: '100%', height: '100%' }}
              >
                <Path
                  d={pagePaths[currentPage]}
                  fill="none"
                  stroke="rgba(0,0,0,0.22)"
                  strokeWidth={14}
                  strokeLinecap="round"
                />
                <Path
                  d={pagePaths[currentPage]}
                  fill="none"
                  stroke="#ffb300"
                  strokeWidth={9}
                  strokeLinecap="round"
                />
              </Svg>

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
      </SafeAreaView>
    </ImageBackground>
  );
}
