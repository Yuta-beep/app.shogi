import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

type PieceKey = keyof typeof shopAssets.pieces;

type ShopPiece = {
  key: PieceKey;
  desc: string;
  move: string;
  cost: number;
  costType: 'pawn' | 'gold';
};

const shopPieces: ShopPiece[] = [
  { key: '走', desc: 'なし', move: '縦横1マス', cost: 2, costType: 'pawn' },
  { key: '種', desc: '移動時30%の確率で周囲に「葉」を召喚する。', move: '歩と同じ', cost: 3, costType: 'gold' },
  { key: '麒', desc: '左右前後何マスでも移動 + 斜め1マス。', move: '全方向ロング', cost: 20, costType: 'gold' },
  { key: '舞', desc: '周囲8マスの敵駒の移動範囲を制限する。', move: '金と同じ', cost: 6, costType: 'gold' },
  { key: 'P', desc: '移動時同じ行・列の敵駒を移動不能にする。', move: '縦横1マス', cost: 40, costType: 'gold' },
  { key: '鳴', desc: '同駒3体がいればまとめて取る（ポン）。', move: '銀と同じ', cost: 50, costType: 'pawn' },
];

export function PieceShopScreen() {
  const router = useRouter();
  const [owned] = useState<PieceKey[]>(['走']);
  const [detailPiece, setDetailPiece] = useState<ShopPiece | null>(null);
  const [confirmPiece, setConfirmPiece] = useState<ShopPiece | null>(null);

  function openPurchase(piece: ShopPiece) {
    if (owned.includes(piece.key)) {
      return;
    }
    setConfirmPiece(piece);
  }

  return (
    <SafeAreaView className="flex-1 bg-[#120d0a]">
      <View className="absolute inset-0">
        <Image source={shopAssets.background} contentFit="cover" style={{ width: '100%', height: '100%' }} />
        <View className="absolute inset-0 bg-black/25" />
      </View>

      <View className="flex-1 px-4 pb-4">
        <View className="mt-2 flex-row items-center justify-between rounded-xl bg-[#2f1b14]/75 px-3 py-2">
          <Text className="text-sm font-black text-[#ffe6a5]">歩 x100</Text>
          <Text className="text-sm font-black text-[#ffe6a5]">金 x100</Text>
        </View>

        <Pressable onPress={() => router.replace('/home')} className="mt-3 self-start active:scale-95">
          <Image source={shopAssets.home} contentFit="contain" style={{ width: 140, height: 44 }} />
        </Pressable>

        <View className="mt-4 flex-row flex-wrap justify-between gap-y-4">
          {shopPieces.map((piece) => {
            const isOwned = owned.includes(piece.key);
            const priceText = piece.costType === 'pawn' ? `歩 ${piece.cost}` : `金 ${piece.cost}`;

            return (
              <View key={piece.key} className="w-[31%] items-center rounded-xl bg-[#fff8e6]/95 p-2">
                <Pressable onPress={() => setDetailPiece(piece)} className="w-full items-center active:scale-95">
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

      <Modal visible={!!detailPiece} transparent animationType="fade" onRequestClose={() => setDetailPiece(null)}>
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-sm rounded-xl bg-[#fff7e6] p-4">
            <Text className="text-xl font-black text-[#7f1d1d]">{detailPiece?.key}</Text>
            <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【スキルの説明】</Text>
            <Text className="mt-1 text-sm text-[#1f2937]">{detailPiece?.desc}</Text>
            <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【移動範囲】</Text>
            <Text className="mt-1 text-sm text-[#1f2937]">{detailPiece?.move}</Text>
            <Text className="mt-3 text-xs font-black text-[#7f1d1d]">【デッキコスト】</Text>
            <Text className="mt-1 text-sm text-[#1f2937]">
              {detailPiece ? `${detailPiece.costType === 'pawn' ? '歩' : '金'} ${detailPiece.cost}` : ''}
            </Text>
            <Pressable onPress={() => setDetailPiece(null)} className="mt-4 rounded-md bg-[#8b0000] px-3 py-2">
              <Text className="text-center font-black text-[#ffd56a]">閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!confirmPiece} transparent animationType="fade" onRequestClose={() => setConfirmPiece(null)}>
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View className="w-full max-w-xs rounded-xl bg-[#fff7e6] p-4">
            <Text className="text-center text-base font-black text-[#7f1d1d]">購入しますか</Text>
            <Text className="mt-2 text-center text-sm text-[#1f2937]">
              {confirmPiece
                ? `${confirmPiece.key} (${confirmPiece.costType === 'pawn' ? '歩' : '金'} ${confirmPiece.cost})`
                : ''}
            </Text>
            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={() => setConfirmPiece(null)}
                className="flex-1 rounded-md bg-[#8b0000] px-3 py-2"
              >
                <Text className="text-center font-black text-[#ffd56a]">はい</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmPiece(null)} className="flex-1 rounded-md border border-[#8b0000] bg-white px-3 py-2">
                <Text className="text-center font-black text-[#7f1d1d]">いいえ</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
