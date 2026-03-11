import { Image } from 'expo-image';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLoadingScreen } from '@/components/organism/app-loading-screen';
import { homeAssets } from '@/constants/home-assets';
import { usePieceShopScreen } from '@/features/piece-shop/ui/use-piece-shop-screen';
import { useAssetPreload } from '@/hooks/common/use-asset-preload';
import { useScreenBgm } from '@/hooks/common/use-screen-bgm';
import { playSe } from '@/lib/audio/audio-manager';
import { ShopItem } from '@/domain/models/shop';

const shopAssets = {
  background: require('../../../../assets/piece-shop/pieceShop.png'),
  pieces: {
    走: require('../../../../assets/piece-shop/piece-so.png'),
    種: require('../../../../assets/piece-shop/piece-tane.png'),
    麒: require('../../../../assets/piece-shop/piece-kirin.png'),
    舞: require('../../../../assets/piece-shop/piece-mai.png'),
    P: require('../../../../assets/piece-shop/piece-p.png'),
    鳴: require('../../../../assets/piece-shop/piece-naku.png'),
  },
} as const;

const piecePlacementByKey: Record<
  ShopItem['key'],
  { width: number; height: number; marginTop: number; offsetX?: number; offsetY?: number }
> = {
  走: { width: 170, height: 194, marginTop: 70, offsetX: 0, offsetY: 0 },
  種: { width: 168, height: 190, marginTop: 52, offsetX: 3, offsetY: 0 },
  麒: { width: 172, height: 194, marginTop: 60, offsetX: -10, offsetY: -5 },
  舞: { width: 186, height: 210, marginTop: 32, offsetX: 6, offsetY: -40 },
  P: { width: 186, height: 210, marginTop: 32, offsetX: 0, offsetY: -44 },
  鳴: { width: 186, height: 210, marginTop: 32, offsetX: -6, offsetY: -34 },
};

export function PieceShopScreen() {
  const vm = usePieceShopScreen();
  const { isReady: areAssetsReady } = useAssetPreload([
    shopAssets.background,
    ...Object.values(shopAssets.pieces),
  ]);
  useScreenBgm('shop');

  function openPurchase(piece: ShopItem) {
    if (vm.owned.includes(piece.key)) {
      void playSe('cancel');
      return;
    }
    void playSe('confirm');
    vm.openConfirm(piece);
  }

  if (vm.isLoading || !areAssetsReady) {
    return <AppLoadingScreen imageSource={homeAssets.loadingImage} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-[#140b06]">
      <View className="absolute inset-0">
        <Image
          source={shopAssets.background}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
        />
      </View>

      <View className="flex-1 px-4 pb-4">
        <ScrollView className="mt-4 flex-1" contentContainerClassName="pb-6">
          <View className="mb-4 flex-row items-center justify-between rounded-lg bg-[#1a0f09]/65 px-3 py-2">
            <Text className="text-sm font-black text-[#f7d58f]">{`歩 x${vm.pawnCurrency}`}</Text>
            <Text className="text-sm font-black text-[#f7d58f]">{`金 x${vm.goldCurrency}`}</Text>
          </View>
          <View className="mt-[-28px] flex-row flex-wrap justify-between">
            {vm.items.map((piece, index) => {
              const isOwned = vm.owned.includes(piece.key);
              const priceText = piece.costType === 'pawn' ? `歩 ${piece.cost}` : `金 ${piece.cost}`;
              const isTopRow = index < 3;
              const placement = piecePlacementByKey[piece.key];

              return (
                <View key={piece.key} className={`w-[31%] ${isTopRow ? 'mt-10' : 'mt-8'}`}>
                  <Pressable
                    onPress={() => {
                      void playSe('tap');
                      vm.openDetail(piece);
                    }}
                    className="h-[290px] items-center active:scale-95"
                  >
                    <Image
                      source={shopAssets.pieces[piece.key]}
                      contentFit="contain"
                      style={{
                        width: placement.width,
                        height: placement.height,
                        marginTop: placement.marginTop,
                        transform: [
                          { translateX: placement.offsetX ?? 0 },
                          { translateY: placement.offsetY ?? 0 },
                        ],
                      }}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => openPurchase(piece)}
                    disabled={isOwned}
                    className={`${isTopRow ? 'mt-[-12px]' : 'mt-[-30px]'} rounded-md border border-[#8B0000] px-2 py-2 ${isOwned ? 'bg-[#4b3a2f]' : 'bg-[#8f2a1a]'}`}
                  >
                    <Text
                      className={`text-center text-xs font-black ${isOwned ? 'text-[#d9c8b3]' : 'text-[#ffe1a3]'}`}
                    >
                      {isOwned ? '購入済み' : `購入 ${priceText}`}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <Modal
        visible={!!vm.detailPiece}
        transparent
        animationType="fade"
        onRequestClose={vm.closeDetail}
      >
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-sm rounded-xl border border-[#f0c98a]/45 bg-[#2a170d]/95 p-4">
            <Text className="text-xl font-black text-[#ffe2af]">{vm.detailPiece?.key}</Text>
            <Text className="mt-3 text-xs font-black text-[#f2c98b]">【スキルの説明】</Text>
            <Text className="mt-1 text-sm text-[#f4e8d6]">{vm.detailPiece?.desc}</Text>
            <Text className="mt-3 text-xs font-black text-[#f2c98b]">【移動範囲】</Text>
            <Text className="mt-1 text-sm text-[#f4e8d6]">{vm.detailPiece?.move}</Text>
            <Text className="mt-3 text-xs font-black text-[#f2c98b]">【デッキコスト】</Text>
            <Text className="mt-1 text-sm text-[#f4e8d6]">
              {vm.detailPiece
                ? `${vm.detailPiece.costType === 'pawn' ? '歩' : '金'} ${vm.detailPiece.cost}`
                : ''}
            </Text>
            <Pressable
              onPress={() => {
                void playSe('cancel');
                vm.closeDetail();
              }}
              className="mt-4 rounded-md bg-[#8f2a1a] px-3 py-2"
            >
              <Text className="text-center font-black text-[#ffe2ac]">閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!vm.confirmPiece}
        transparent
        animationType="fade"
        onRequestClose={vm.closeConfirm}
      >
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-xs rounded-xl border border-[#f0c98a]/45 bg-[#2a170d]/95 p-4">
            <Text className="text-center text-base font-black text-[#ffe2af]">購入しますか</Text>
            <Text className="mt-2 text-center text-sm text-[#f4e8d6]">
              {vm.confirmPiece
                ? `${vm.confirmPiece.key} (${vm.confirmPiece.costType === 'pawn' ? '歩' : '金'} ${vm.confirmPiece.cost})`
                : ''}
            </Text>
            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={() => {
                  void playSe('confirm');
                  void vm.purchase();
                }}
                className="flex-1 rounded-md bg-[#8f2a1a] px-3 py-2"
              >
                <Text className="text-center font-black text-[#ffe2ac]">はい</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void playSe('cancel');
                  vm.closeConfirm();
                }}
                className="flex-1 rounded-md border border-[#b37a45] bg-[#f6ead8] px-3 py-2"
              >
                <Text className="text-center font-black text-[#6b2a16]">いいえ</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
