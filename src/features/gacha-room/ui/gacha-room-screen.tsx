import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { BackButton } from '@/components/atom/back-button';
import { GlobalHomeHud } from '@/components/organism/global-home-hud';
import { homeAssets } from '@/constants/home-assets';
import { GachaRoomVM, useGachaRoomScreen } from '@/features/gacha-room/ui/use-gacha-room-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';

const gachaAssets = {
  draw1: require('../../../../assets/gacha/draw-1.png'),
  draw0: require('../../../../assets/gacha/draw-0.png'),
  drawGold: require('../../../../assets/gacha/draw-gold.png'),
  videos: {
    miss: require('../../../../assets/gacha/gacha-miss.mp4'),
    hit: require('../../../../assets/gacha/gacha-hit.mp4'),
  },
} as const;

function rarityColor(rarity: string): string {
  switch (rarity) {
    case 'SSR':
      return '#f0c040';
    case 'UR':
      return '#c084fc';
    case 'SR':
      return '#60a5fa';
    case 'R':
      return '#34d399';
    default:
      return '#94a3b8';
  }
}

function ResultCard({ vm }: { vm: GachaRoomVM }) {
  if (vm.phase === 'idle') {
    return (
      <View className="rounded-2xl border border-white/20 bg-white/10 p-4">
        <Text className="text-sm text-slate-300">
          上の各ガチャバナー右側のボタンからガチャを引けます。
        </Text>
      </View>
    );
  }

  if (vm.phase === 'done' && vm.lastResult) {
    const result = vm.lastResult;
    if (result.type === 'hit') {
      const pieceSource = result.piece.imageSignedUrl ? { uri: result.piece.imageSignedUrl } : null;
      return (
        <View className="rounded-2xl border border-amber-300/50 bg-white/10 p-4">
          <Text style={{ color: rarityColor(result.piece.rarity) }} className="text-lg font-black">
            {result.alreadyOwned
              ? `${result.piece.name}（${result.piece.rarity}）は既に所持！`
              : `${result.piece.name}（${result.piece.rarity}）を獲得！`}
          </Text>
          {pieceSource ? (
            <View className="my-3 items-center">
              <Image
                source={pieceSource}
                contentFit="contain"
                style={{ width: 120, height: 120 }}
              />
            </View>
          ) : (
            <Text className="my-3 text-center text-5xl text-white">{result.piece.char}</Text>
          )}
          <Text className="text-sm text-slate-200">{result.piece.description}</Text>
          <Text className="mt-4 text-sm text-slate-300">
            続けて引く場合は、上の各ガチャのボタンを押してください。
          </Text>
        </View>
      );
    } else {
      const label = result.currency === 'gold' ? `金 x${result.amount}` : `歩 x${result.amount}`;
      const currencyChar = result.currency === 'gold' ? '金' : '歩';
      return (
        <View className="rounded-2xl border border-white/20 bg-white/10 p-4">
          <Text className="text-lg font-black text-slate-100">{`${currencyChar}を獲得！`}</Text>
          <Text className="my-3 text-center text-5xl text-white">{currencyChar}</Text>
          <Text className="text-sm text-slate-300">{`${label} の通貨が増えました。ショップで使いましょう。`}</Text>
          <Text className="mt-4 text-sm text-slate-300">
            続けて引く場合は、上の各ガチャのボタンを押してください。
          </Text>
        </View>
      );
    }
  }

  // video / pieceOverlay 中は空カード
  return (
    <View className="rounded-2xl border border-white/20 bg-white/10 p-4">
      <Text className="text-sm text-slate-300">抽選中…</Text>
    </View>
  );
}

function GachaVideoOverlay({ isHit, onEnd }: { isHit: boolean; onEnd: () => void }) {
  const source = isHit ? gachaAssets.videos.hit : gachaAssets.videos.miss;
  const player = useVideoPlayer(source, (p) => {
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener('playingChange', ({ isPlaying }) => {
      if (!isPlaying && player.currentTime > 0) {
        onEnd();
      }
    });
    return () => sub.remove();
  }, [player, onEnd]);

  return (
    <Pressable
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onPress={onEnd}
    >
      <VideoView
        player={player}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        nativeControls={false}
      />
      <Text
        style={{ position: 'absolute', bottom: 24, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}
      >
        タップでスキップ
      </Text>
    </Pressable>
  );
}

function PieceOverlay({
  char,
  imageSignedUrl,
  onDismiss,
}: {
  char: string;
  imageSignedUrl?: string | null;
  onDismiss: () => void;
}) {
  const source = imageSignedUrl ? { uri: imageSignedUrl } : null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.95)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={onDismiss}
      >
        {source ? (
          <Image source={source} contentFit="contain" style={{ width: '80%', height: '70%' }} />
        ) : (
          <Text style={{ fontSize: 120, color: 'white' }}>{char}</Text>
        )}
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 24 }}>
          タップで閉じる
        </Text>
      </Pressable>
    </Modal>
  );
}

export function GachaRoomScreen() {
  const router = useRouter();
  const vm = useGachaRoomScreen();
  const remoteBannerUrls = useMemo(
    () =>
      vm.banners
        .map((banner) => banner.imageSignedUrl)
        .filter((url): url is string => typeof url === 'string' && url.length > 0),
    [vm.banners],
  );
  const { isReady: areAssetsReady } = useAssetPreload(
    [gachaAssets.draw1, gachaAssets.draw0, gachaAssets.drawGold, ...remoteBannerUrls],
    {
      enabled: !vm.isLoading,
    },
  );
  useScreenBgm('gacha');

  useEffect(() => {
    if (vm.lastResult?.type !== 'hit') return;
    if (!vm.lastResult.piece.imageSignedUrl) return;
    Image.prefetch(vm.lastResult.piece.imageSignedUrl)
      .catch(() => undefined)
      .finally(() => undefined);
  }, [vm.lastResult]);

  if (vm.isLoading || !areAssetsReady) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  const isHit = vm.lastResult?.type === 'hit';

  return (
    <SafeAreaView
      className="flex-1 bg-[#2f1b14]"
      edges={['left', 'right', 'bottom']}
      style={{ position: 'relative' }}
    >
      <GlobalHomeHud pawnCurrency={vm.pawnCurrency} goldCurrency={vm.goldCurrency} />
      {/* 動画オーバーレイ */}
      {vm.phase === 'video' && <GachaVideoOverlay isHit={isHit} onEnd={vm.onVideoEnd} />}

      {/* 駒イメージオーバーレイ */}
      {vm.phase === 'pieceOverlay' && vm.lastResult?.type === 'hit' && (
        <PieceOverlay
          char={vm.lastResult.piece.char}
          imageSignedUrl={vm.lastResult.piece.imageSignedUrl}
          onDismiss={vm.onPieceOverlayDismiss}
        />
      )}

      {/* ヘッダー */}
      <View className="border-b border-[#f4c86a]/30 bg-[#3a152d] px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-black text-[#ffd56a]">ガチャルーム</Text>
          <BackButton
            onPress={() => {
              void playSe('tap');
              router.back();
            }}
          />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-8">
        {vm.noticeMessage ? (
          <View className="rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2">
            <Text className="text-sm font-bold text-amber-200">{vm.noticeMessage}</Text>
          </View>
        ) : null}

        {/* バナー一覧 */}
        {vm.banners.map((banner) => {
          const active = banner.key === vm.selectedKey;
          const drawImage = banner.usesGold
            ? gachaAssets.drawGold
            : active
              ? gachaAssets.draw0
              : gachaAssets.draw1;

          return (
            <View
              key={banner.key}
              className={`overflow-hidden rounded-2xl ${active ? 'bg-white/10' : 'bg-white/5'}`}
            >
              <Pressable
                onPress={() => {
                  void playSe('tap');
                  vm.setSelectedKey(banner.key);
                }}
                className="active:scale-[0.99]"
              >
                <Image
                  source={
                    banner.imageSignedUrl ? { uri: banner.imageSignedUrl } : gachaAssets.draw1
                  }
                  contentFit="cover"
                  style={{ width: '100%', height: 120 }}
                />
              </Pressable>

              <View className="flex-row items-center justify-between px-3 py-3">
                <View>
                  <Text className="text-base font-black text-white">{banner.name}</Text>
                  <Text className="text-xs text-slate-300">{banner.rareRateText}</Text>
                  <Text className="text-xs text-slate-400">
                    {`消費: 歩 x${banner.pawnCost} / 金 x${banner.goldCost}`}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    void playSe('tap');
                    vm.setSelectedKey(banner.key);
                    if (vm.phase === 'idle' || vm.phase === 'done') {
                      void playSe('confirm');
                      void vm.roll();
                    }
                  }}
                  className="active:scale-95"
                >
                  <Image
                    source={drawImage}
                    contentFit="contain"
                    style={{ width: 140, height: 56 }}
                  />
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* 結果カード */}
        <ResultCard vm={vm} />
      </ScrollView>
    </SafeAreaView>
  );
}
