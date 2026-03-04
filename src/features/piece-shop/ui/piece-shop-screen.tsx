import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePieceShopScreen } from '@/features/piece-shop/ui/use-piece-shop-screen';
import { ShopItem } from '@/usecases/piece-shop/load-shop-catalog-usecase';

const shopAssets = {
  background: require('../../../../assets/piece-shop/shop-bg.png'),
  home: require('../../../../assets/shared/home-back.png'),
  pieces: {
    '走': require('../../../../assets/piece-shop/piece-so.png'),
    '種': require('../../../../assets/piece-shop/piece-tane.png'),
    '麒': require('../../../../assets/piece-shop/piece-kirin.png'),
    '舞': require('../../../../assets/piece-shop/piece-mai.png'),
    'P': require('../../../../assets/piece-shop/piece-p.png'),
    '鳴': require('../../../../assets/piece-shop/piece-naku.png'),
  },
} as const;

export function PieceShopScreen() {
  const router = useRouter();
  const vm = usePieceShopScreen();

  function openPurchase(piece: ShopItem) {
    if (vm.owned.includes(piece.key)) {
      return;
    }
    vm.openConfirm(piece);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#120d0a]">
      <View className="absolute inset-0">
        <Image source={shopAssets.background} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        <View className="absolute inset-0 bg-black/25" />
      </View>

      <View className="flex-1 px-4 pb-4">
        <View className="mt-2 flex-row items-center justify-between rounded-xl bg-[#2f1b14]/75 px-3 py-2">
          <Text className="text-sm font-black text-[#ffe6a5]">{`歩 x${vm.pawnCurrency}`}</Text>
          <Text className="text-sm font-black text-[#ffe6a5]">{`金 x${vm.goldCurrency}`}</Text>
        </View>

        <Pressable onPress={() => router.replace('/home')} className="mt-3 self-start active:scale-95">
          <Image source={shopAssets.home} contentFit="contain" style={{ width: 140, height: 44 }} />
        </Pressable>

        <View className="mt-4 flex-row flex-wrap justify-between gap-y-4">
          {vm.items.map((piece) => {
            const isOwned = vm.owned.includes(piece.key);
            const priceText = piece.costType === 'pawn' ? `歩 ${piece.cost}` : `金 ${piece.cost}`;

            return (
              <View key={piece.key} className="w-[31%] items-center rounded-xl bg-[#fff8e6]/95 p-2">
                <Pressable onPress={() => vm.openDetail(piece)} className="w-full items-center active:scale-95">
                  <Image source={shopAssets.pieces[piece.key]} contentFit="contain" style={{ width: 86, height: 100 }} />
                </Pressable>

                <Pressable
                  onPress={() => openPurchase(piece)}
                  disabled={isOwned}
                  className={`mt-2 w-full rounded-md px-2 py-2 ${isOwned ? 'bg-gray-300' : 'bg-[#8b0000]'}`}
                >
                  <Text className={`text-center text-xs font-black ${isOwned ? 'text-[#555]' : 'text-[#ffd56a]'}`}>
                    {isOwned ? '購入済み' : `購入 ${priceText}`}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      <Modal visible={!!vm.detailPiece} transparent animationType="fade" onRequestClose={vm.closeDetail}>
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-sm rounded-xl bg-[#fff7e6] p-4">
            <Text className="text-xl font-black text-[#7f1d1d]">{vm.detailPiece?.key}</Text>
            <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【スキルの説明】</Text>
            <Text className="mt-1 text-sm text-[#1f2937]">{vm.detailPiece?.desc}</Text>
            <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【移動範囲】</Text>
            <Text className="mt-1 text-sm text-[#1f2937]">{vm.detailPiece?.move}</Text>
            <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【デッキコスト】</Text>
            <Text className="mt-1 text-sm text-[#1f2937]">
              {vm.detailPiece ? `${vm.detailPiece.costType === 'pawn' ? '歩' : '金'} ${vm.detailPiece.cost}` : ''}
            </Text>
            <Pressable onPress={vm.closeDetail} className="mt-4 rounded-md bg-[#8b0000] px-3 py-2">
              <Text className="text-center font-black text-[#ffd56a]">閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!vm.confirmPiece} transparent animationType="fade" onRequestClose={vm.closeConfirm}>
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-xs rounded-xl bg-[#fff7e6] p-4">
            <Text className="text-center text-base font-black text-[#7f1d1d]">購入しますか</Text>
            <Text className="mt-2 text-center text-sm text-[#1f2937]">
              {vm.confirmPiece ? `${vm.confirmPiece.key} (${vm.confirmPiece.costType === 'pawn' ? '歩' : '金'} ${vm.confirmPiece.cost})` : ''}
            </Text>
            <View className="mt-4 flex-row gap-2">
              <Pressable onPress={() => void vm.purchase()} className="flex-1 rounded-md bg-[#8b0000] px-3 py-2">
                <Text className="text-center font-black text-[#ffd56a]">はい</Text>
              </Pressable>
              <Pressable onPress={vm.closeConfirm} className="flex-1 rounded-md border border-[#8b0000] bg-white px-3 py-2">
                <Text className="text-center font-black text-[#7f1d1d]">いいえ</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
