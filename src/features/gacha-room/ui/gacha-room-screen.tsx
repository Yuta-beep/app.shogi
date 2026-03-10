import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { homeAssets } from '@/constants/home-assets';
import { GachaRoomVM, useGachaRoomScreen } from '@/features/gacha-room/ui/use-gacha-room-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';

const gachaAssets = {
  home: require('../../../../assets/shared/home-back.png'),
  draw1: require('../../../../assets/gacha/draw-1.png'),
  draw0: require('../../../../assets/gacha/draw-0.png'),
  drawGold: require('../../../../assets/gacha/draw-gold.png'),
  banners: {
    ukanmuri: require('../../../../assets/gacha/ukanmuri.png'),
    hihen: require('../../../../assets/gacha/hihen.png'),
    shinnyo: require('../../../../assets/gacha/shinnyo.png'),
    kanken1: require('../../../../assets/gacha/kanken1.png'),
  },
  videos: {
    miss: require('../../../../assets/gacha/gacha-miss.mp4'),
    hit: require('../../../../assets/gacha/gacha-hit.mp4'),
  },
} as const;

// 駒画像マップ（存在する駒のみ）
const PIECE_IMAGES: Record<string, ReturnType<typeof require>> = {
  爆: require('../../../../assets/gacha/pieces/爆.png'),
  煽: require('../../../../assets/gacha/pieces/煽.png'),
  定: require('../../../../assets/gacha/pieces/定.png'),
  安: require('../../../../assets/gacha/pieces/安.png'),
  宋: require('../../../../assets/gacha/pieces/宋.png'),
  歩: require('../../../../assets/gacha/pieces/歩.png'),
  金: require('../../../../assets/gacha/pieces/金.png'),
};

function rarityColor(rarity: string): string {
  switch (rarity) {
    case 'SSR': return '#f0c040';
    case 'UR': return '#c084fc';
    case 'SR': return '#60a5fa';
    case 'R': return '#34d399';
    default: return '#94a3b8';
  }
}

function ResultCard({ vm }: { vm: GachaRoomVM }) {
  if (vm.phase === 'idle') {
    return (
      <View className="rounded-2xl border border-white/20 bg-white/10 p-4">
        <Text className="text-sm text-slate-300">ガチャを引いて結果を確認しよう！</Text>
        <Pressable
          onPress={() => {
            void playSe('confirm');
            void vm.roll();
          }}
          className="mt-3 items-center rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 py-3 active:opacity-80"
          style={{ backgroundColor: '#ec4899' }}
        >
          <Text className="text-base font-black text-white">ガチャを引く</Text>
        </Pressable>
      </View>
    );
  }

  if (vm.phase === 'done' && vm.lastResult) {
    const result = vm.lastResult;
    if (result.type === 'hit') {
      const pieceImg = PIECE_IMAGES[result.piece.char];
      return (
        <View className="rounded-2xl border border-amber-300/50 bg-white/10 p-4">
          <Text style={{ color: rarityColor(result.piece.rarity) }} className="text-lg font-black">
            {result.alreadyOwned
              ? `${result.piece.name}（${result.piece.rarity}）は既に所持！`
              : `${result.piece.name}（${result.piece.rarity}）を獲得！`}
          </Text>
          {pieceImg != null && (
            <View className="my-3 items-center">
              <Image source={pieceImg} contentFit="contain" style={{ width: 120, height: 120 }} />
            </View>
          )}
          <Text className="text-sm text-slate-200">{result.piece.description}</Text>
          <Pressable
            onPress={() => {
              void playSe('confirm');
              void vm.roll();
            }}
            className="mt-4 items-center rounded-xl py-3 active:opacity-80"
            style={{ backgroundColor: '#ec4899' }}
          >
            <Text className="text-base font-black text-white">もう一度引く</Text>
          </Pressable>
        </View>
      );
    } else {
      const label = result.currency === 'gold' ? `金 x${result.amount}` : `歩 x${result.amount}`;
      const currencyChar = result.currency === 'gold' ? '金' : '歩';
      const currencyImg = PIECE_IMAGES[currencyChar];
      return (
        <View className="rounded-2xl border border-white/20 bg-white/10 p-4">
          <Text className="text-lg font-black text-slate-100">{`${currencyChar}を獲得！`}</Text>
          {currencyImg != null && (
            <View className="my-3 items-center">
              <Image source={currencyImg} contentFit="contain" style={{ width: 100, height: 100 }} />
            </View>
          )}
          <Text className="text-sm text-slate-300">{`${label} の通貨が増えました。ショップで使いましょう。`}</Text>
          <Pressable
            onPress={() => {
              void playSe('confirm');
              void vm.roll();
            }}
            className="mt-4 items-center rounded-xl py-3 active:opacity-80"
            style={{ backgroundColor: '#ec4899' }}
          >
            <Text className="text-base font-black text-white">もう一度引く</Text>
          </Pressable>
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
      style={{ position: 'absolute', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }}
      onPress={onEnd}
    >
      <VideoView
        player={player}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        nativeControls={false}
      />
      <Text style={{ position: 'absolute', bottom: 24, color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
        タップでスキップ
      </Text>
    </Pressable>
  );
}

function PieceOverlay({ char, onDismiss }: { char: string; onDismiss: () => void }) {
  const pieceImg = PIECE_IMAGES[char];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' }}
        onPress={onDismiss}
      >
        {pieceImg ? (
          <Image source={pieceImg} contentFit="contain" style={{ width: '80%', height: '70%' }} />
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
  const { isReady: areAssetsReady } = useAssetPreload([
    gachaAssets.home,
    gachaAssets.draw1,
    gachaAssets.draw0,
    gachaAssets.drawGold,
    ...Object.values(gachaAssets.banners),
  ]);
  useScreenBgm('gacha');

  if (vm.isLoading || !areAssetsReady) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  const isHit = vm.lastResult?.type === 'hit';

  return (
    <SafeAreaView className="flex-1 bg-[#0f172a]" style={{ position: 'relative' }}>
      {/* 動画オーバーレイ */}
      {vm.phase === 'video' && (
        <GachaVideoOverlay isHit={isHit} onEnd={vm.onVideoEnd} />
      )}

      {/* 駒イメージオーバーレイ */}
      {vm.phase === 'pieceOverlay' && vm.lastResult?.type === 'hit' && (
        <PieceOverlay char={vm.lastResult.piece.char} onDismiss={vm.onPieceOverlayDismiss} />
      )}

      {/* ヘッダー */}
      <View className="border-b border-white/15 bg-[#111827] px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-black text-white">ガチャルーム</Text>
          <Pressable
            onPress={() => {
              void playSe('tap');
              router.replace('/home');
            }}
            className="active:scale-95"
          >
            <Image source={gachaAssets.home} contentFit="contain" style={{ width: 128, height: 40 }} />
          </Pressable>
        </View>
        <View className="mt-2 flex-row gap-2">
          <View className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5">
            <Text className="text-xs font-black text-white">{`歩 x${vm.pawnCurrency}`}</Text>
          </View>
          <View className="rounded-lg border border-amber-300/40 bg-white/10 px-3 py-1.5">
            <Text className="text-xs font-black text-amber-200">{`金 x${vm.goldCurrency}`}</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-8">
        {/* バナー一覧 */}
        {vm.banners.map((banner) => {
          const active = banner.key === vm.selectedKey;
          const drawImage = banner.usesGold ? gachaAssets.drawGold : active ? gachaAssets.draw0 : gachaAssets.draw1;

          return (
            <View
              key={banner.key}
              className={`rounded-2xl border p-3 ${active ? 'border-amber-300 bg-white/10' : 'border-white/20 bg-white/5'}`}
            >
              <Pressable
                onPress={() => {
                  void playSe('tap');
                  vm.setSelectedKey(banner.key);
                }}
                className="active:scale-[0.99]"
              >
                <Image
                  source={gachaAssets.banners[banner.key]}
                  contentFit="contain"
                  style={{ width: '100%', height: 120 }}
                />
              </Pressable>

              <View className="mt-2 flex-row items-center justify-between">
                <View>
                  <Text className="text-base font-black text-white">{banner.name}</Text>
                  <Text className="text-xs text-slate-300">{banner.rareRateText}</Text>
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
                  <Image source={drawImage} contentFit="contain" style={{ width: 100, height: 40 }} />
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
